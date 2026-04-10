"use strict";
function initMusicPlayer() {
    var playerEle = document.querySelectorAll('#gui-MusicPlayer, .gui-MusicPlayer')
    if (playerEle.length === 0) return

    // 浏览器兼容性检查（保持不变）
    if (
        typeof Symbol !== 'function' ||
        typeof Promise !== 'function' ||
        typeof Object.assign !== 'function' ||
        typeof Array.from !== 'function' ||
        typeof Array.prototype.includes !== 'function' ||
        typeof (() => {
        }) !== 'function' ||
        typeof `template ${'string'}` !== 'string' ||
        ({}).toString.call({...{}}) !== '[object Object]' ||
        Array.isArray([]) !== true
    ) {
        alert('当前浏览器不支持解析 ES6 语法，请升级浏览器！')
        window.location.href = 'http://support.dmeng.net/upgrade-your-browser.html?referrer=' + encodeURIComponent(window.location.href)
        return
    }

    const guiHead = document.head
    const playerBody = document.body

    // 添加viewport元标签（保持不变）
    const metaViewport = document.querySelector('meta[name="viewport"]')
    if (!metaViewport) {
        let newMeta = document.createElement('meta')
        newMeta.setAttribute('name', 'viewport')
        newMeta.setAttribute('content', 'width=device-width, initial-scale=1.0')
        guiHead.appendChild(newMeta)
    }

    let MusicPlayer = [...playerEle][0]  // 简化获取播放器元素

    // 获取播放器配置属性
    let interfaceAndLocal = MusicPlayer.getAttribute('data-localMusic')
    const guiSongList = MusicPlayer.getAttribute('data-songList')
    let musicApi = `${location.protocol}//${MusicPlayer.getAttribute('data-musicApi')}`.trim()

    // 加载样式文件（保持不变）
    customFile()

    function customFile() {
        const cdnName = MusicPlayer.getAttribute('data-cdnName')
        const wl = window.location
        let guiDomainName = cdnName === null ? `${wl.protocol}//${wl.hostname}${wl.port ? ':' + wl.port : ''}` : cdnName.trim()

        if (wl.protocol === 'https:') {
            const metaTag = document.createElement('meta')
            metaTag.setAttribute('http-equiv', 'Content-Security-Policy')
            metaTag.setAttribute('content', 'upgrade-insecure-requests')
            guiHead.appendChild(metaTag)
        }

        const removeDotAndSlash = str => str.replace(/(^[^a-zA-Z0-9]+)|([^a-zA-Z0-9]+$)/g, '')
        const filePath = MusicPlayer.getAttribute('data-filePath')

        if (filePath !== null) {
            guiDomainName += `/${removeDotAndSlash(filePath)}`
        }

        const appendStylesheet = href => {
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = href

            if (cdnName !== null && cdnName !== '') {
                return guiHead.appendChild(link)
            } else {
                return new Promise((resolve, reject) => {
                    fetch(href)
                        .then(response => {
                            if (response.ok) {
                                guiHead.appendChild(link)
                                resolve()
                            } else {
                                reject(`链接不可用: ${href}`)
                            }
                        })
                        .catch(error => {
                            reject(`发生错误：${error}`)
                        })
                })
            }
        }

        const guiCssOne = 'guiplayIcon.css'
        const guiCssTow = 'gui-MusicPlayer.css'
        let guiplayIconCSS = `${guiDomainName}/gui-MusicPlayer/icon/${guiCssOne}`
        let MusicPlayerCSS = `${guiDomainName}/gui-MusicPlayer/css/${guiCssTow}`



        Promise.all([
            appendStylesheet(guiplayIconCSS),
            appendStylesheet(MusicPlayerCSS),
        ])
            .catch(error => {
                MusicPlayer.remove()
                console.error(error)
                alert('请把插件放在网页根目录，否则无法运行【gui-MusicPlayer.js】插件！')
                return
            })
    }

    // 初始化播放器结构
    startExecutionPlayer()

    function startExecutionPlayer() {
        // 创建DOM元素的工具函数
        const characterToElement = (str, mainBox) => {
            const parser = new DOMParser()
            let ele = parser.parseFromString(str, 'text/html')
            ele = ele.body.firstChild
            mainBox.appendChild(ele)
        }

        // 播放器HTML结构
        let musicStr = `<div class="gui-MusicPlayer-Main">
    <div class="gui-switchPlayer">
        <i class="iconfont icon-jiantou2"></i>
    </div>

    <div class="gui-insideSong">
        <div class="gui-songPicture">
            <img
                src="./gui-MusicPlayer/images/playerLoad.gif"
                alt="加载中..."
                class="gui-musicPicture"
            >
            <i class="gui-musicalNote iconfont icon-yinle"></i>
            <i class="gui-musicalNote iconfont icon-yinle"></i>
            <i class="gui-musicalNote iconfont icon-yinle"></i>
        </div>

        <div class="gui-musicControl">
            <div class="gui-topControl">
                <div class="gui-introduce">
                    <h3 class="gui-songName"></h3>
                    <p class="gui-singer"></p>
                </div>

                <ul class="gui-playerControl">
                    <li class="gui-previousSong"><i class="iconfont icon-shangyishou"></i></li>
                    <li class="gui-playbackControl">
                        <i class="gui-pause iconfont icon-zantingtingzhi" style="display: none;"></i>
                        <i class="gui-playBack iconfont icon-bofang" style="display: block;"></i>
                    </li>
                    <li class="gui-nextSong"><i class="iconfont icon-xiayishou"></i></li>
                </ul>
            </div>

            <ul class="gui-bottomControl">
                <li class="gui-audioFrequency"><i class="iconfont icon-shengyin-kai"></i></li>
                <li class="gui-progressBar">
                    <h5 class="gui-totalAudioProgress"><p class="gui-audioProgress" style="width: 0;"></p></h5>
                </li>
                <li class="gui-playlistBtn"><i class="iconfont icon-gedan"></i></li>
            </ul>
        </div>
    </div>

    <div class="gui-outsideSongList">
        <ul class="gui-listOfSongs"></ul>
    </div>
</div>`

        // 歌词HTML结构
        let lyricStr = `<div id="gui-lyric"><ul class="gui-AllLyric-box"></ul></div>`
        characterToElement(musicStr, MusicPlayer)

        // 所有播放器功能
        allPlayerFeatures()

        function allPlayerFeatures() {
            // 创建音频元素
            const guiMusicAudio = document.createElement('audio')
            guiMusicAudio.id = 'gui-musicAudio'
            playerBody.appendChild(guiMusicAudio)
            guiMusicAudio.controls = 0

            // 创建歌词元素 - 总是创建歌词元素，不管是否使用本地音乐
            characterToElement(lyricStr, playerBody)

            // 工具函数
            const setTimeoutPromise = delay => new Promise(resolve => setTimeout(resolve, delay))
            const playMusic = () => guiMusicAudio.play()
            const pauseMusic = () => guiMusicAudio.pause()
            let desiredAutoPlay = false

            const waitForPlayable = () => {
                return new Promise(resolve => {
                    if (guiMusicAudio.readyState >= 3) return resolve()

                    let settled = false
                    const cleanup = () => {
                        guiMusicAudio.removeEventListener('canplay', onReady)
                        guiMusicAudio.removeEventListener('loadeddata', onReady)
                        guiMusicAudio.removeEventListener('error', onReady)
                    }
                    const onReady = () => {
                        if (settled) return
                        settled = true
                        cleanup()
                        resolve()
                    }
                    guiMusicAudio.addEventListener('canplay', onReady)
                    guiMusicAudio.addEventListener('loadeddata', onReady)
                    guiMusicAudio.addEventListener('error', onReady)
                    setTimeout(onReady, 3000)
                })
            }

            const tryPlayMusic = async (reason) => {
                try {
                    await playMusic()
                    addPlaying()
                } catch (error) {
                    console.warn(`无法播放（${reason}）：${error}`)
                    desiredAutoPlay = false
                    removebePlaying()
                }
            }

            // 获取DOM元素引用
            const MusicPlayerMain = MusicPlayer.querySelector('.gui-MusicPlayer-Main')
                , switchPlayer = MusicPlayer.querySelector('.gui-switchPlayer')
                , switchArrow = switchPlayer.querySelector('.icon-jiantou2')
                , musicPicture = MusicPlayer.querySelector('.gui-musicPicture')
                , songName = MusicPlayer.querySelector('.gui-songName')
                , singer = MusicPlayer.querySelector('.gui-singer')
                , previousSong = MusicPlayer.querySelector('.gui-previousSong')
                , playbackControl = MusicPlayer.querySelector('.gui-playbackControl')
                , pause = playbackControl.querySelector('.gui-pause')
                , playBack = playbackControl.querySelector('.gui-playBack')
                , nextSong = MusicPlayer.querySelector('.gui-nextSong')
                , audioFrequency = MusicPlayer.querySelector('.gui-audioFrequency')
                , totalAudioProgress = MusicPlayer.querySelector('.gui-totalAudioProgress')
                , audioProgress = MusicPlayer.querySelector('.gui-audioProgress')
                , playlistBtn = MusicPlayer.querySelector('.gui-playlistBtn')
                , outsideSongList = MusicPlayer.querySelector('.gui-outsideSongList')
                , listOfSongs = MusicPlayer.querySelector('.gui-listOfSongs')
                , musicalNote = MusicPlayer.querySelectorAll('.gui-musicalNote')
                , guiLyric = playerBody.querySelector('#gui-lyric')

            // 设置主题样式（支持从 localStorage 读取）
            let themeStyle = MusicPlayer.getAttribute('data-themeColor')
            try {
                const storedTheme = localStorage.getItem('musictool-theme')
                if (storedTheme) {
                    themeStyle = storedTheme
                    MusicPlayer.setAttribute('data-themeColor', storedTheme)
                }
            } catch (e) {}
            themeStyle = themeStyle || 'gui-original'
            MusicPlayerMain.classList.add(themeStyle)

            // 图片懒加载
            const lazyLoadImages = () => {
                const images = playerBody.querySelectorAll('img[data-musicLjz-src]')
                const observer = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target
                            const src = img.getAttribute('data-musicLjz-src')
                            img.setAttribute('src', src)
                            img.onload = () => {
                                observer.unobserve(img)
                                img.removeAttribute('data-musicLjz-src')
                            }
                        }
                    })
                })
                images.forEach(image => observer.observe(image))
            }

            // 播放/暂停状态切换 - 修改条件判断
            const removebePlaying = () => {
                pause.style.display = 'none'
                playBack.style.display = 'block'
                playbackControl.classList.remove('gui-bePlaying')
                musicPicture.classList.add('gui-pauseRotation')
                musicalNote.forEach(ele => ele.classList.add('gui-pausePdyMove'))
                // 修改为检查guiLyric是否存在
                if (guiLyric) {
                    guiLyric.classList.add('gui-lyricHidden')
                    guiLyric.classList.remove('gui-lyricShow')
                }
            }

            const addPlaying = () => {
                pause.style.display = 'block'
                playBack.style.display = 'none'
                playbackControl.classList.add('gui-bePlaying')
                musicPicture.classList.remove('gui-pauseRotation')
                musicalNote.forEach(ele => ele.classList.remove('gui-pausePdyMove'))
                // 修改为检查guiLyric是否存在
                if (guiLyric) {
                    guiLyric.classList.remove('gui-lyricHidden')
                    guiLyric.classList.add('gui-lyricShow')
                }
            }

            // 弹出提示
            const backgroundColors = ['rgba(85, 0, 255, .35)', 'rgba(0, 225, 255, .35)', 'rgba(255, 165, 0, .35)', 'rgba(0, 100, 0, .35)', 'rgba(80, 0, 0, .35)', 'rgba(255, 192, 203, .35)']
            const themeIndex = {
                'gui-original': 0,
                'gui-sky': 1,
                'gui-orange': 2,
                'gui-darkGreen': 3,
                'gui-wineRed': 4,
                'gui-girlPink': 5
            }
            const bgIndex = themeIndex[themeStyle] ?? 0
            let guiMusicPop
            let isAnimationInProgress = 0

            const displayPopup = async musicName => {
                if (isAnimationInProgress) return
                if (!guiMusicPop) {
                    guiMusicPop = document.createElement('div')
                    guiMusicPop.classList.add('gui-music-pop')
                    playerBody.appendChild(guiMusicPop)
                }
                guiMusicPop.textContent = musicName
                const randomColor = backgroundColors[bgIndex]
                Object.assign(guiMusicPop.style, {backgroundColor: randomColor})
                isAnimationInProgress = 1
                guiMusicPop.style.left = '-100%'
                await setTimeoutPromise(500)
                guiMusicPop.style.left = 0
                await setTimeoutPromise(2500)
                guiMusicPop.style.left = '-100%'
                isAnimationInProgress = 0
            }

            // 播放检测
            const detectionPlay = async () => {
                await setTimeoutPromise(2000)
                if (guiMusicAudio.paused) {
                    console.warn('您的浏览器不支持自动播放音乐，请手动点击播放器继续欣赏歌曲吧~')
                    removebePlaying()
                } else {
                    displayPopup(`正在播放：${songName.textContent}`)
                    addPlaying()
                }
            }

            // 播放器淡出效果
            const fadeOutPlayer = async () => {
                if (MusicPlayer.getAttribute('data-fadeOutAutoplay') !== null) {
                    // guiMusicAudio.autoplay = true - 已禁用自动播放
                    await setTimeoutPromise(1000)
                    // detectionPlay() - 已禁用自动播放检测
                    switchArrow.classList.add('gui-jiantou1')
                    MusicPlayerMain.classList.add('gui-playerShow')
                    // playMusic() - 已禁用默认自动播放
                } else {
                    removebePlaying()
                }
            }
            fadeOutPlayer()

            // 清除列表（保留其他元素）
            const clearSongList = () => {
                listOfSongs.innerHTML = ''
                if (guiLyric) {
                    guiLyric.querySelector('.gui-AllLyric-box').innerHTML = ''
                }
            }

            // 创建列表项
            const playerMusicItem = (index, music, picture, Title, Author, loadingTime) => {
                let lis = `<li class="gui-songsItem"data-index="${index}"data-mp3url="${music}"><div class="gui-songListSongPictures"><i class="gui-songIcon iconfont icon-bofang"></i><img data-musicLjz-src="${picture + '?param=200x200'}"src="./gui-MusicPlayer/images/playerLoad.gif"alt="songPicture"class="gui-playlistImg"></div><div class="gui-playlistSongInformation"><div class="gui-songTitle"><h5 class="gui-songName">${Title}</h5><p class="gui-authorAndDuration"><sapn class="gui-songAuthor">${Author}</sapn><span class="gui-songLength iconfont icon-shijian">\t${loadingTime}</span></p></div></div></li>`
                characterToElement(lis, listOfSongs)
            }

            // 数据请求函数
            async function fetchData(url, method = 'GET') {
                try {
                    const res = await fetch(url, {method, headers: getOptionalAuthHeaders()})
                    return await res.json()
                } catch (error) {
                    throw error
                }
            }

            const getOptionalAuthHeaders = () => {
                try {
                    const token = localStorage.getItem('userToken')
                    if (!token) return {}
                    return {Authorization: `Bearer ${token}`}
                } catch (e) {
                    return {}
                }
            }

            // 时间转换函数
            const addLeadingZero = num => num < 10 ? `0${num}` : num

            function convertTime(duration) {
                const minutes = Math.floor(duration / 60)
                const seconds = Math.floor(duration % 60)
                return `${addLeadingZero(minutes)}:${addLeadingZero(seconds)}`
            }

            function millisecondConversion(milliseconds) {
                const minutes = addLeadingZero(Math.floor(milliseconds / 60000))
                const seconds = addLeadingZero(Math.floor((milliseconds % 60000) / 1000))
                return `${minutes}:${seconds} `
            }

            // 全局变量 - 当前播放索引
            let currentSongIndex = 0
            const playlistIdKey = 'musictool-plugin-playlist'

            const loadCachedPlaylistId = () => {
                try {
                    const raw = localStorage.getItem(playlistIdKey)
                    if (!raw) return null
                    const text = String(raw).trim()
                    if (!text) return null
                    if (text.startsWith('{')) {
                        const obj = JSON.parse(text)
                        const id = String(obj && obj.playlistId ? obj.playlistId : '').trim()
                        if (!id) return null
                        localStorage.setItem(playlistIdKey, id)
                        return id
                    }
                    return text
                } catch (e) {
                    return null
                }
            }

            const renderSongList = async (dataUrl) => {
                try {
                    clearSongList()
                    displayPopup('加载歌曲列表...')

                    // 获取歌曲数据
                    let res
                    const cachedPlaylistId = loadCachedPlaylistId()
                    if (cachedPlaylistId) {
                        const playlistRes = await fetchData(`https://luren.online:2345/proxy/musicList?id=${cachedPlaylistId}`)
                        res = playlistRes && Array.isArray(playlistRes.list) ? playlistRes.list : []
                    } else {
                        res = await fetchData(dataUrl)
                        if (interfaceAndLocal === null && guiSongList !== null) {
                            res = res.playlist.tracks
                        }
                    }

                    // 生成列表项
                    await Promise.all(
                        res.map(async data => {
                            const musicId = data.id
                            const musicName = data.name
                            const artistsname = data.artistsname || data.artist || data.artists || (data.ar && data.ar[0] && data.ar[0].name) || (data.al && data.al.name) || '未知艺术家'
                            const rawPicurl = data.picurl || (data.al && data.al.picUrl) || './gui-MusicPlayer/images/playerLoad.gif'
                            const picurl = String(rawPicurl).trim().replace(/`/g, '')
                            // 使用歌曲ID作为标识符，实际播放时再获取URL
                            const mp3 = `song:${musicId}`
                            const normalizeDurationText = (value) => {
                                if (value === null || value === undefined) return '00:00'
                                const text = String(value).trim().replace(/`/g, '')
                                if (text.includes(':')) {
                                    const parts = text.split(':').map(p => p.trim())
                                    if (parts.length === 3 && parts[0] === '00') return `${parts[1]}:${parts[2]}`
                                    if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
                                    return text
                                }
                                const n = Number(text)
                                if (Number.isFinite(n)) return millisecondConversion(n)
                                return '00:00'
                            }

                            const duration = cachedPlaylistId
                                ? normalizeDurationText(data.musicDuration || data.duration || data.dt || 0)
                                : interfaceAndLocal === null
                                    ? data.duration !== undefined
                                        ? convertTime(data.duration)
                                        : millisecondConversion(data.dt)
                                    : normalizeDurationText(data.musicDuration)
                            playerMusicItem(musicId, mp3, picurl, musicName, artistsname, duration)
                        })
                    )

                    // 等待列表渲染完成
                    const checkSongsItemLength = () => {
                        return new Promise(resolve => {
                            const intervalId = setInterval(() => {
                                const lisNum = MusicPlayer.querySelectorAll('.gui-songsItem').length
                                const analyticQuantity = res.length
                                if (lisNum === analyticQuantity) {
                                    clearInterval(intervalId)
                                    resolve()
                                }
                            }, 30)
                        })
                    }
                    await checkSongsItemLength()

                    // 获取列表项并绑定事件
                    const songsItem = MusicPlayer.querySelectorAll('.gui-songsItem')
                    if (songsItem.length === 0) {
                        displayPopup('没有找到歌曲')
                        return
                    }

                    // 绑定列表项事件
                    bindSongEvents(songsItem)

                    updateSong(0)

                    lazyLoadImages()
                    displayPopup(`加载完成，共 ${songsItem.length} 首歌曲`)
                } catch (error) {
                    console.error(`列表加载错误：${error}`)
                    displayPopup('加载失败，请重试')
                }
            }

            // 绑定歌曲事件
            const bindSongEvents = (songsItem) => {
                // 列表项点击事件
                songsItem.forEach((item, index) => {
                    item.addEventListener('click', () => {
                        currentSongIndex = index
                        updateSong(index)
                    })
                })
            }

            // 更新播放歌曲 - 修改此函数以使用新接口
            const updateSong = async index => {
                const songsItem = MusicPlayer.querySelectorAll('.gui-songsItem')
                if (index >= songsItem.length) return

                // 更新列表选中状态
                songsItem.forEach((ele, i) => {
                    ele.classList.toggle('gui-inExecution', i === index)
                    const icon = ele.querySelector('.gui-songIcon')
                    icon.classList.remove('icon-zantingtingzhi', 'icon-bofang')
                    icon.classList.add(i === index ? 'icon-zantingtingzhi' : 'icon-bofang')
                })

                // 更新播放信息
                const item = songsItem[index]
                const musicId = item.dataset.index // 获取歌曲ID
                const itemPic = item.querySelector('.gui-playlistImg').getAttribute('data-musicljz-src') || item.querySelector('.gui-playlistImg').src
                const itemName = item.querySelector('.gui-songName').textContent
                const itemAuto = item.querySelector('.gui-songAuthor').textContent

                // 通过新接口获取音乐URL
                try {
                    const urlResponse = await fetch(`https://luren.online:2345/proxy/getMusicUrl?id=${musicId}`, {headers: getOptionalAuthHeaders()});
                    const urlData = await urlResponse.json();

                    if (urlData.code === "200") {
                        guiMusicAudio.src = urlData.url;
                    } else {
                        console.error("获取音乐URL失败:", urlData.message);
                        displayPopup('获取音乐URL失败');
                        return;
                    }
                } catch (error) {
                    console.error("获取音乐URL时发生错误:", error);
                    displayPopup('获取音乐URL时发生错误');
                    return;
                }

                musicPicture.src = itemPic
                musicPicture.alt = itemName
                songName.textContent = itemName
                singer.textContent = itemAuto

                if (desiredAutoPlay) {
                    await waitForPlayable()
                    await tryPlayMusic('切歌自动播放')
                }

                // 加载歌词
                if (guiLyric) {
                    guiLyric.style.backgroundColor = backgroundColors[bgIndex];
                    const guiAllLyri = guiLyric.querySelector('.gui-AllLyric-box');

                    // 使用新的歌词接口
                    try {
                        const lyricResponse = await fetch(`https://luren.online:2345/proxy/getLyric?id=${musicId}`, {headers: getOptionalAuthHeaders()});
                        const lyricData = await lyricResponse.json();

                        guiAllLyri.innerHTML = '';
                        if (lyricData.code === "200" && lyricData.lrc?.lyric) {
                            const lines = lyricData.lrc.lyric.split('\n');

                            lines.forEach(line => {
                                // 处理时间标签行
                                const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
                                const match = line.match(timeRegex);
                                if (match) {
                                    const minutes = parseInt(match[1]);
                                    const seconds = parseInt(match[2]);
                                    const milliseconds = parseInt(match[3]);
                                    const text = match[4].trim();

                                    // 转换时间为秒
                                    let time;
                                    if (match[3].length === 3) {
                                        // 3位数是毫秒
                                        time = minutes * 60 + seconds + milliseconds / 1000;
                                    } else {
                                        // 2位数是厘秒
                                        time = minutes * 60 + seconds + milliseconds / 100;
                                    }

                                    // 只有当文本不为空时才添加歌词项
                                    if (text) {
                                        const li = document.createElement('li');
                                        li.classList.add('gui-ly');
                                        li.dataset.time = time;
                                        li.textContent = text;
                                        guiAllLyri.appendChild(li);
                                    }
                                } else if (line.trim() !== '') {
                                    // 处理没有时间标签但有内容的行
                                    const text = line.trim();
                                    if (text) {
                                        const li = document.createElement('li');
                                        li.classList.add('gui-ly');
                                        li.dataset.time = -1; // 没有时间的行设置为-1
                                        li.textContent = text;
                                        guiAllLyri.appendChild(li);
                                    }
                                }
                            });
                        } else {
                            console.error("获取歌词失败:", lyricData.message);
                        }

                        highlightLyric();
                    } catch (error) {
                        console.error("获取歌词时发生错误:", error);
                    }
                }
            }

            // 歌词高亮显示功能
            let activeLyricItem = null
            function highlightLyric() {
                // 检查guiLyric是否存在
                if (guiLyric) {
                    const currentTime = guiMusicAudio.currentTime;
                    const lyricItems = guiLyric.querySelectorAll('.gui-ly');

                    // 如果没有歌词项，直接返回
                    if (lyricItems.length === 0) {
                        return;
                    }

                    lyricItems.forEach(item => item.classList.remove('gui-currentLyric'));

                    // 找到当前应该高亮的歌词
                    let currentLyric = null;
                    let lastTime = -1;

                    lyricItems.forEach(item => {
                        const time = parseFloat(item.dataset.time);
                        // 确保时间是有效数字且不为-1（表示无时间标签的行）
                        if (!isNaN(time) && time !== -1 && time <= currentTime && time > lastTime) {
                            currentLyric = item;
                            lastTime = time;
                        }
                    });

                    // 高亮当前歌词
                    if (!currentLyric) {
                        currentLyric = Array.from(lyricItems).find(item => parseFloat(item.dataset.time) !== -1) || lyricItems[0]
                    }

                    if (currentLyric) {
                        currentLyric.classList.add('gui-currentLyric');
                        if (activeLyricItem !== currentLyric) {
                            activeLyricItem = currentLyric
                            currentLyric.scrollIntoView({behavior: 'smooth', block: 'center'});
                        }
                    }
                }
            }

            // 播放/暂停切换
            const togglePlayback = () => {
                if (playbackControl.classList.contains('gui-bePlaying')) {
                    displayPopup('音乐已暂停')
                    pauseMusic()
                    removebePlaying()
                    desiredAutoPlay = false
                } else {
                    if (guiMusicAudio.src) {
                        displayPopup(`正在播放：${songName.textContent}`)
                        desiredAutoPlay = true
                        tryPlayMusic('用户点击播放')
                    } else {
                        displayPopup('请先选择歌曲')
                    }
                }
            }
            playbackControl.addEventListener('click', togglePlayback)

            // 音量控制
            audioFrequency.addEventListener('click', function () {
                guiMusicAudio.muted = !guiMusicAudio.muted
                if (guiMusicAudio.muted) {
                    displayPopup('开启静音')
                    this.children[0].classList.remove('icon-shengyin-kai')
                    this.children[0].classList.add('icon-shengyin-guan')
                } else {
                    displayPopup('取消静音')
                    this.children[0].classList.add('icon-shengyin-kai')
                    this.children[0].classList.remove('icon-shengyin-guan')
                }
            })

            // 上一首/下一首控制
            const prevMusic = () => {
                const songsItem = MusicPlayer.querySelectorAll('.gui-songsItem')
                if (songsItem.length === 0) return
                currentSongIndex = (currentSongIndex - 1 + songsItem.length) % songsItem.length
                updateSong(currentSongIndex)
            }

            const nextMusic = () => {
                const songsItem = MusicPlayer.querySelectorAll('.gui-songsItem')
                if (songsItem.length === 0) return
                currentSongIndex = (currentSongIndex + 1) % songsItem.length
                updateSong(currentSongIndex)
            }

            // 绑定上/下一首事件
            nextSong.addEventListener('click', nextMusic)
            previousSong.addEventListener('click', prevMusic)

            // 键盘左右箭头控制
            window.addEventListener('keyup', e => {
                const songsItem = MusicPlayer.querySelectorAll('.gui-songsItem')
                if (songsItem.length === 0) return

                if (e.key === 'ArrowRight' || e.keyCode === 39) {
                    nextMusic()
                } else if (e.key === 'ArrowLeft' || e.keyCode === 37) {
                    prevMusic()
                }
            })

            // 进度条控制和歌词高亮
            guiMusicAudio.addEventListener('timeupdate', () => {
                const currentTime = guiMusicAudio.currentTime
                const duration = guiMusicAudio.duration
                if (duration) {
                    const progress = (currentTime / duration) * 100
                    audioProgress.style.width = `${progress}%`
                    // 歌词高亮显示
                    highlightLyric();
                }
            })

            guiMusicAudio.addEventListener('ended', () => {
                if (!desiredAutoPlay) return
                nextMusic()
            })

            // 进度条拖动
            let isSliding = false
            totalAudioProgress.addEventListener('mousedown', () => isSliding = true)
            totalAudioProgress.addEventListener('mousemove', (e) => {
                if (!isSliding) return
                const rect = totalAudioProgress.getBoundingClientRect()
                const progress = (e.clientX - rect.left) / rect.width * 100
                const duration = guiMusicAudio.duration
                if (duration) {
                    guiMusicAudio.currentTime = (progress / 100) * duration
                    audioProgress.style.width = `${progress}%`
                }
            })
            document.addEventListener('mouseup', () => isSliding = false)
            document.addEventListener('mouseleave', () => isSliding = false)

            // 歌单显示切换
            playlistBtn.addEventListener('click', () => {
                outsideSongList.classList.toggle('gui-outsideSongListShow')
            })

            // 播放器展开/收起
            const switchPlayerFun = () => {
                const toggle = () => {
                    switchArrow.classList.toggle('gui-jiantou1')
                    MusicPlayerMain.classList.toggle('gui-playerShow')
                }
                switchPlayer.addEventListener('click', toggle)
                document.addEventListener('click', (e) => {
                    if (!MusicPlayer.contains(e.target)) {
                        switchArrow.classList.remove('gui-jiantou1')
                        MusicPlayerMain.classList.remove('gui-playerShow')
                    }
                })
            }
            switchPlayerFun()

            // 初始音乐链接
            const musicUrl = musicLinks()

            function musicLinks() {
                if (interfaceAndLocal === null && guiSongList === null) {
                    return `${musicApi}/musicAll/?sortAll=${(MusicPlayer.getAttribute('data-songChart') || '热歌榜').trim()}`
                } else if (interfaceAndLocal === null && guiSongList !== null) {
                    return `${musicApi}/musicAll/?playlistId=${guiSongList.trim()}`
                } else {
                    return interfaceAndLocal.trim()
                }
            }

            // 初始加载歌曲列表
            renderSongList(musicUrl)
        }
    }
}

// 检查是否需要自动初始化
if (!window.disableAutoInit) {
    window.addEventListener('DOMContentLoaded', initMusicPlayer);
}
// 添加异步加载支持
if (typeof define === 'function' && define.amd) {
    // AMD支持
    define(function() {
        return { init: initMusicPlayer };
    });
} else if (typeof module === 'object' && module.exports) {
    // CommonJS支持
    module.exports = { init: initMusicPlayer };
} else if (typeof window !== 'undefined') {
    // 浏览器全局变量支持
    window.GuiMusicPlayer = {
        init: initMusicPlayer,
        // 添加手动初始化方法
        initialize: function() {
            initMusicPlayer();
        }
    };
}

// 提供异步初始化方法
window.initMusicPlayerAsync = function() {
    return new Promise((resolve, reject) => {
        try {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    initMusicPlayer();
                    resolve();
                });
            } else {
                initMusicPlayer();
                resolve();
            }
        } catch (error) {
            reject(error);
        }
    });
};
