<script setup>
import { ref, reactive, computed, watch, h, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage, ElMessageBox, ElPagination } from 'element-plus'
import { Search, InfoFilled, Document, VideoPlay, VideoPause, List, Refresh, ArrowLeft, ArrowRight, Star, Delete } from '@element-plus/icons-vue'
import VolumeIcons from './VolumeIcons.vue'
import { useAuth } from '../composables/useAuth'
import SongList from './SongList.vue'

// 使用用户认证
const { isLoggedIn, token } = useAuth()

// 用户收藏歌单相关
const userPlaylistIds = ref([])
const loadingUserPlaylist = ref(false)

// 响应式数据
const searchKeyword = ref('')
const songId = ref('')
const activeSearchTab = ref('playlist')
const searchingSongId = ref(false)
const keywordResults = ref([]) // 关键词搜索结果
const songIdResults = ref([]) // 单曲ID搜索结果
const searchResults = ref([]) // 保持兼容性，将在后续移除
const searching = ref(false)
const loadingInfo = ref(null)
const loadingUrl = ref(null)
const loadingPlaylist = ref(false)
const loadingPlaylistInfo = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(20)
const totalSongs = ref(0)
const totalPages = ref(0)

const currentSong = ref(null)
const currentMusicUrl = ref('')

const playlistId = ref('')
const playlist = ref([])
const selectedSongs = ref([])

// 音质选择相关
const selectedQuality = ref('standard')
const qualityOptions = [
  { label: '标准音质', value: 'standard' },
  { label: '极高音质', value: 'exhigh' },
  { label: '无损音质', value: 'lossless' },
  { label: 'Hi-Res音质', value: 'hires' },
  { label: '臻品音效', value: 'jyeffect' },
  { label: '天空音质', value: 'sky' },
  { label: '大师音质', value: 'jymaster' }
]

// 下载对话框相关
const downloadDialogVisible = ref(false)
const downloadQuality = ref('standard')
const downloadingSong = ref(null)

const audioPlayer = ref(null)
const progressBar = ref(null)
const fixedPlayerEl = ref(null)
const floatingLyricContent = ref(null)
const musicToolRoot = ref(null)
let globalAudioBound = false

// 自定义播放器状态
const isPlaying = ref(false)
const canPlay = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(1)
const isMuted = ref(false)
const showVolumeSlider = ref(false)
const isPlayerOpen = ref(true)
const isPlaylistOpen = ref(false)
const selectedTheme = ref('gui-girlPink')
const themeOptions = [
  { label: '原版紫', value: 'gui-original' },
  { label: '天空蓝', value: 'gui-sky' },
  { label: '橙色', value: 'gui-orange' },
  { label: '深绿', value: 'gui-darkGreen' },
  { label: '酒红', value: 'gui-wineRed' },
  { label: '少女粉', value: 'gui-girlPink' }
] 
const THEME_STORAGE_KEY = 'musictool-theme'

const getStoredTheme = () => {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    if (!v) return null
    const ok = themeOptions.some(t => t.value === v)
    return ok ? v : null
  } catch (e) {
    return null
  }
}

const setStoredTheme = (themeClass) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeClass)
  } catch (e) {}
}

const PLUGIN_PLAYLIST_ID_KEY = 'musictool-plugin-playlist'

const storePluginPlaylistId = (id) => {
  const v = String(id || '').trim()
  if (!v) return
  try {
    localStorage.setItem(PLUGIN_PLAYLIST_ID_KEY, v)
  } catch (e) {}
}

const loadPluginPlaylistId = () => {
  try {
    const raw = localStorage.getItem(PLUGIN_PLAYLIST_ID_KEY)
    if (!raw) return null
    const v = String(raw).trim()
    if (!v) return null
    if (v.startsWith('{')) {
      const obj = JSON.parse(v)
      const id = String(obj?.playlistId || '').trim()
      if (!id) return null
      localStorage.setItem(PLUGIN_PLAYLIST_ID_KEY, id)
      return id
    }
    return v
  } catch (e) {
    return null
  }
}

const renderSongDurationText = (song) => {
  const raw = song?.musicDuration ?? song?.dt ?? song?.duration ?? 0
  if (raw === null || raw === undefined) return '00:00'

  const text = String(raw).trim().replace(/`/g, '')
  if (text.includes(':')) {
    const parts = text.split(':').map(p => p.trim())
    if (parts.length === 3) {
      const hh = parts[0].padStart(2, '0')
      const mm = parts[1].padStart(2, '0')
      const ss = parts[2].padStart(2, '0')
      return hh === '00' ? `${mm}:${ss}` : `${hh}:${mm}:${ss}`
    }
    if (parts.length === 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
    }
  }

  const n = Number(text)
  if (!Number.isFinite(n) || n <= 0) return '00:00'
  const seconds = n / 1000
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const setGlobalPlayerPlaylistActive = (activeIdx) => {
  const root = document.querySelector('#gui-MusicPlayer')
  if (!root) return
  const items = root.querySelectorAll('.gui-listOfSongs .gui-songsItem')
  items.forEach((el, idx) => {
    el.classList.toggle('gui-inExecution', idx === activeIdx)
    const icon = el.querySelector('.gui-songIcon')
    if (icon) {
      icon.classList.remove('icon-zantingtingzhi', 'icon-bofang')
      icon.classList.add(idx === activeIdx ? 'icon-zantingtingzhi' : 'icon-bofang')
    }
  })
}

const updateGlobalPlayerPlaylist = (songs) => {
  const root = document.querySelector('#gui-MusicPlayer')
  if (!root) return
  const list = root.querySelector('.gui-listOfSongs')
  if (!list) return

  const safeSongs = Array.isArray(songs) ? songs : []
  list.innerHTML = safeSongs.map(song => {
    const songId = song?.id ?? ''
    const title = song?.name ?? ''
    const author = (song?.artistsname || song?.artist || song?.artists || song?.ar?.[0]?.name || '未知艺术家')
    const rawPicture = (song?.picurl || song?.cover || song?.al?.picUrl || '/default-music-cover.jpg')
    const picture = String(rawPicture).trim().replace(/`/g, '')
    const durationText = renderSongDurationText(song)
    const mp3 = `song:${songId}`
    return `<li class="gui-songsItem" data-index="${songId}" data-mp3url="${mp3}">
      <div class="gui-songListSongPictures">
        <i class="gui-songIcon iconfont icon-bofang"></i>
        <img data-musicLjz-src="${picture}?param=200x200" src="${picture}?param=200x200" alt="songPicture" class="gui-playlistImg">
      </div>
      <div class="gui-playlistSongInformation">
        <div class="gui-songTitle">
          <h5 class="gui-songName">${title}</h5>
          <p class="gui-authorAndDuration">
            <sapn class="gui-songAuthor">${author}</sapn>
            <span class="gui-songLength iconfont icon-shijian">\t${durationText}</span>
          </p>
        </div>
      </div>
    </li>`
  }).join('')

  const items = list.querySelectorAll('.gui-songsItem')
  items.forEach((item, index) => {
    item.addEventListener('click', () => {
      const song = safeSongs[index]
      currentPlaylist.value = [...safeSongs]
      currentIndex.value = index
      setGlobalPlayerPlaylistActive(index)
      playMusic(song, null, true)
    })
  })

  if (safeSongs.length) {
    setGlobalPlayerPlaylistActive(0)
  }
}

const lyricLines = ref([])
const activeLyricIndex = ref(-1)

// 播放模式相关
const playMode = ref('sequence') // sequence: 顺序播放, loop: 循环播放, random: 随机播放
const playModeOptions = [
  { label: '顺序播放', value: 'sequence', icon: 'List' },
  { label: '循环播放', value: 'loop', icon: 'Refresh' },
  { label: '随机播放', value: 'random', icon: 'Shuffle' }
]
const currentPlaylist = ref([]) // 当前播放列表
const currentIndex = ref(0) // 当前播放索引

// 计算进度百分比
const progressPercentage = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

// 格式化时间显示
const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
const API_BASE_URL = 'https://luren.online:2345'

const parseLrc = (lrcText) => {
  if (!lrcText || typeof lrcText !== 'string') return []

  const result = []
  const rawLines = lrcText.split('\n')

  rawLines.forEach(rawLine => {
    const line = rawLine.trim()
    if (!line) return

    const timeTagRegex = /\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g
    const matches = Array.from(line.matchAll(timeTagRegex))
    const text = line.replace(timeTagRegex, '').trim()
    if (!text) return

    if (matches.length === 0) return

    matches.forEach(match => {
      const minutes = Number(match[1])
      const seconds = Number(match[2])
      const fraction = match[3] ? Number(match[3]) : 0
      const time = minutes * 60 + seconds + (match[3] ? fraction / (match[3].length === 3 ? 1000 : 100) : 0)
      result.push({ time, text })
    })
  })

  result.sort((a, b) => a.time - b.time)
  return result
}

const updateActiveLyric = () => {
  if (lyricLines.value.length === 0) {
    activeLyricIndex.value = -1
    return
  }

  const t = currentTime.value
  let idx = -1
  for (let i = 0; i < lyricLines.value.length; i++) {
    if (lyricLines.value[i].time <= t) idx = i
    else break
  }

  const nextIndex = idx === -1 ? 0 : idx
  if (nextIndex === activeLyricIndex.value) return

  activeLyricIndex.value = nextIndex
  nextTick(() => {
    const container = floatingLyricContent.value
    if (!container) return
    const activeEl = container.querySelector('.floating-lyric-line.is-active')
    activeEl?.scrollIntoView({ block: 'center' })
  })
}

const fetchLyricForSong = async (songId) => {
  if (!songId) {
    lyricLines.value = []
    activeLyricIndex.value = -1
    renderLyricsToGlobalPlayer()
    return
  }

  try {
    const response = await fetch(`${API_BASE_URL}/proxy/getLyric?id=${songId}`, {
      method: 'GET',
      headers: getApiHeaders()
    })
    const data = await response.json()
    const ok = data?.code === 200 || data?.code === '200'
    const lrcText = data?.lrc?.lyric
    lyricLines.value = ok && lrcText ? parseLrc(lrcText) : []
    updateActiveLyric()
    renderLyricsToGlobalPlayer()
  } catch (e) {
    lyricLines.value = []
    activeLyricIndex.value = -1
    renderLyricsToGlobalPlayer()
  }
}

const updateFixedPlayerHeightVar = () => {
  const el = fixedPlayerEl.value
  if (!el) return
  const height = el.getBoundingClientRect().height
  document.documentElement.style.setProperty('--musictool-fixed-player-height', `${height}px`)
}

// 动态获取API请求头
const getApiHeaders = () => {
  const userToken = localStorage.getItem('userToken')
  return {
    'authorization': userToken || ''
  }
}

// 统一的API错误处理函数
const handleApiError = (data, defaultMessage = '操作失败') => {
  if (data.code === 403) {
    ElMessage.error('用户不存在或未登录，请先登录')
    // 可以在这里添加跳转到登录页面的逻辑
    // router.push('/login')
    return false
  } else if (data.code !== 200) {
    ElMessage.error(data.message || defaultMessage)
    return false
  }
  return true
}

// 搜索音乐
const searchMusic = async (page = 1) => {
  if (!searchKeyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  searching.value = true
  try {
    // 直接获取完整搜索结果，包含分页信息
    const searchResponse = await fetch(`${API_BASE_URL}/proxy/userMusicSearch?name=${encodeURIComponent(searchKeyword.value)}&t=${page - 1}&l=${pageSize.value}`, {
      method: 'GET',
      headers: getApiHeaders()
    })
    
    const searchData = await searchResponse.json()
    
    // 使用统一错误处理
    if (!handleApiError(searchData, '搜索失败')) {
      return
    }
    
    if (searchData.lists && searchData.lists.length > 0) {
      // 直接使用返回的歌曲数据
      keywordResults.value = searchData.lists || []
      searchResults.value = searchData.lists || []
      
      // 设置分页信息
      totalSongs.value = searchData.songCount || 0
      totalPages.value = Math.ceil(totalSongs.value / pageSize.value)
      currentPage.value = page
      
      // 保存到对应标签页的搜索结果
      tabSearchResults.value.keyword = [...keywordResults.value]
      
      ElMessage.success(`找到 ${searchData.songCount} 首歌曲，当前显示第 ${page} 页，共 ${totalPages.value} 页`)
    } else {
      keywordResults.value = []
      searchResults.value = []
      tabSearchResults.value.keyword = []
      totalSongs.value = 0
      totalPages.value = 0
      currentPage.value = 1
      ElMessage.info('未找到相关歌曲')
    }
  } catch (error) {
    console.error('搜索失败:', error)
    ElMessage.error('搜索失败，请检查网络连接')
  } finally {
    searching.value = false
  }
}

// 单曲ID搜索
const searchBySongId = async () => {
  if (!songId.value.trim()) {
    ElMessage.warning('请输入歌曲ID')
    return
  }

  searchingSongId.value = true
  try {
    const response = await fetch(`${API_BASE_URL}/proxy/musicListInfo`, {
      method: 'POST',
      headers: {
        ...getApiHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([songId.value])
    })
    
    const data = await response.json()
    
    if (!handleApiError(data, '获取歌曲信息失败')) {
      return
    }
    
    if (data.list && data.list.length > 0) {
      searchResults.value = data.list
      songIdResults.value = data.list // 保存到单曲ID搜索结果
      // 保存到对应标签页的搜索结果
      tabSearchResults.value.songId = [...songIdResults.value]
      ElMessage.success('歌曲信息获取成功')
    } else {
      searchResults.value = []
      songIdResults.value = []
      tabSearchResults.value.songId = []
      ElMessage.info('未找到该歌曲')
    }
  } catch (error) {
    console.error('获取歌曲信息失败:', error)
    ElMessage.error('获取歌曲信息失败，请检查网络连接')
  } finally {
    searchingSongId.value = false
  }
}

// 播放音乐
const playMusic = async (song, quality = null, fromPlaylist = false) => {
  loadingUrl.value = song.id
  try {
    // 使用传入的音质或当前选择的音质
    const level = quality || selectedQuality.value
    
    // 获取音乐URL
    const response = await fetch(`${API_BASE_URL}/proxy/musicUrl?id=${song.id}&level=${level}`, {
      method: 'GET',
      headers: getApiHeaders()
    })
    
    const data = await response.json()
    
    // 使用统一错误处理
    if (!handleApiError(data, '获取播放链接失败')) {
      return
    }
    
    if (data.url) {
      // 设置当前播放歌曲，确保专辑图片正确显示
      currentSong.value = {
        ...song,
        cover: song.picurl || song.al?.picUrl || '/default-music-cover.jpg',
        artist: song.artistsname || song.artists || (song.ar && song.ar[0]?.name) || '未知艺术家'
      }
      currentMusicUrl.value = data.url
      
      // 如果不是从播放列表播放，则更新播放列表
      if (!fromPlaylist) {
        // 从搜索结果或歌单中设置播放列表
        if (searchResults.value.length > 0) {
          currentPlaylist.value = [...searchResults.value]
          currentIndex.value = currentPlaylist.value.findIndex(s => s.id === song.id)
        } else if (playlist.value.length > 0) {
          currentPlaylist.value = [...playlist.value]
          currentIndex.value = currentPlaylist.value.findIndex(s => s.id === song.id)
        } else {
          currentPlaylist.value = [song]
          currentIndex.value = 0
        }
      }
      
      // 自动播放
      const ensureAudio = async () => {
        if (audioPlayer.value) return audioPlayer.value
        const audioEl = await waitForGlobalPlayerReady()
        if (!audioEl) return null
        audioPlayer.value = audioEl
        if (!globalAudioBound) {
          globalAudioBound = true
          audioEl.addEventListener('loadstart', onAudioLoadStart)
          audioEl.addEventListener('canplay', onAudioCanPlay)
          audioEl.addEventListener('timeupdate', onTimeUpdate)
          audioEl.addEventListener('loadedmetadata', onLoadedMetadata)
          audioEl.addEventListener('ended', onAudioEnded)
          audioEl.addEventListener('error', onAudioError)
        }
        return audioEl
      }

      const audioEl = await ensureAudio()
      if (!audioEl) {
        ElMessage.warning('播放器插件尚未就绪')
        return
      }

      audioEl.src = data.url
      syncGlobalPlayerInfo(currentSong.value)
      syncGlobalPlayerPlayingUI(false)

      setTimeout(() => {
        audioEl.play().then(() => {
          isPlaying.value = true
          syncGlobalPlayerPlayingUI(true)
        }).catch(error => {
          console.error('自动播放失败:', error)
          ElMessage.warning('自动播放失败，请手动点击播放')
          isPlaying.value = false
          syncGlobalPlayerPlayingUI(false)
        })
      }, 100)
      
      // 显示当前音质信息
      const qualityLabel = qualityOptions.find(q => q.value === level)?.label || level
      ElMessage.success(`开始播放: ${song.name} (${qualityLabel})`)
    } else {
      ElMessage.error('获取播放链接失败: 播放链接为空')
    }
  } catch (error) {
    console.error('获取播放链接失败:', error)
    ElMessage.error('获取播放链接失败，请检查网络连接')
  } finally {
    loadingUrl.value = null
  }
}

// 下载音乐
const downloadMusic = async (song) => {
  console.log('下载音乐函数被调用:', song.name)
  
  // 设置要下载的歌曲信息并显示对话框
  downloadingSong.value = song
  downloadQuality.value = selectedQuality.value || 'standard'
  downloadDialogVisible.value = true
}

// 处理下载对话框关闭
const handleDownloadDialogClose = () => {
  downloadDialogVisible.value = false
  downloadingSong.value = null
}

// 确认下载
const confirmDownload = async () => {
  if (!downloadingSong.value) return
  
  const song = downloadingSong.value
  const level = downloadQuality.value
  
  console.log('开始下载，音质:', level)
  
  try {
    // 获取音乐URL
    const response = await fetch(`${API_BASE_URL}/proxy/musicUrl?id=${song.id}&level=${level}`, {
      method: 'GET',
      headers: getApiHeaders()
    })
    
    const data = await response.json()
    
    // 使用统一错误处理
    if (!handleApiError(data, '获取下载链接失败')) {
      return
    }
    
    if (data.url) {
      // 使用fetch获取文件数据，然后创建blob下载
      const fileResponse = await fetch(data.url)
      const blob = await fileResponse.blob()
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${song.name} - ${song.artistsname || song.artists || song.artist || '未知艺术家'}.mp3`
      
      // 触发下载
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // 清理URL对象
      window.URL.revokeObjectURL(url)
      
      const qualityLabel = qualityOptions.find(q => q.value === level)?.label || level
      ElMessage.success(`开始下载: ${song.name} (${qualityLabel})`)
    } else {
      ElMessage.error('获取下载链接失败: 下载链接为空')
    }
  } catch (error) {
    console.error('下载音乐失败:', error)
    ElMessage.error('下载音乐失败，请检查网络连接')
  } finally {
    // 关闭对话框
    downloadDialogVisible.value = false
    downloadingSong.value = null
  }
}

// 获取歌单
const searchByPlaylist = async () => {
  if (!playlistId.value.trim()) {
    ElMessage.warning('请输入歌单ID')
    return
  }

  loadingPlaylist.value = true
  try {
    // 直接调用新的API接口获取歌单信息
    const response = await fetch(`${API_BASE_URL}/proxy/musicList?id=${playlistId.value}`, {
      method: 'GET',
      headers: getApiHeaders()
    })
    
    const data = await response.json()
    
    // 使用统一错误处理
    if (!handleApiError(data, '获取歌单失败')) {
      return
    }
    
    if (data.list && data.list.length > 0) {
      playlist.value = data.list || []
      selectedSongs.value = []
      // 保存到对应标签页的歌单结果
      tabPlaylistResults.value.playlist = [...playlist.value]
      currentPlaylist.value = [...playlist.value]
      currentIndex.value = 0
      storePluginPlaylistId(playlistId.value)
      updateGlobalPlayerPlaylist(currentPlaylist.value)
      ElMessage.success(`获取歌单成功，共 ${playlist.value.length} 首歌曲`)
    } else {
      playlist.value = []
      ElMessage.warning('歌单为空或获取失败')
    }
  } catch (error) {
    console.error('获取歌单失败:', error)
    ElMessage.error('获取歌单失败，请检查网络连接')
  } finally {
    loadingPlaylist.value = false
  }
}

// 获取歌单信息
const getPlaylistInfo = async () => {
  if (selectedSongs.value.length === 0) {
    ElMessage.warning('请先选择歌曲')
    return
  }

  loadingPlaylistInfo.value = true
  try {
    const response = await fetch(`${API_BASE_URL}/proxy/musicListInfo`, {
      method: 'POST',
      headers: {
        ...getApiHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(selectedSongs.value)
    })
    
    const data = await response.json()
    
    // 使用统一错误处理
    if (!handleApiError(data, '获取歌单信息失败')) {
      return
    }
    
    // 显示歌单信息
    const infoText = data.list.map(song => `${song.name} - ${song.artistsname || song.artists || song.artist || '未知艺术家'}`).join('\n')
    ElMessageBox.alert(infoText, '选中歌曲信息', {
      confirmButtonText: '确定'
    })
    ElMessage.success(data.message)
  } catch (error) {
    console.error('获取歌单信息失败:', error)
    ElMessage.error('获取歌单信息失败，请检查网络连接')
  } finally {
    loadingPlaylistInfo.value = false
  }
}

// 音频事件处理
const onAudioLoadStart = () => {
  canPlay.value = false
}

const onAudioCanPlay = () => {
  canPlay.value = true
}

const onAudioError = (error) => {
  console.error('音频播放错误:', error)
  ElMessage.error('音频播放失败，可能是链接已过期')
  canPlay.value = false
  isPlaying.value = false
  syncGlobalPlayerPlayingUI(false)
}

// 音频播放结束事件
const onAudioEnded = () => {
  isPlaying.value = false
  syncGlobalPlayerPlayingUI(false)
  if (playMode.value === 'loop') {
    // 单曲循环
    if (audioPlayer.value) {
      audioPlayer.value.currentTime = 0
      audioPlayer.value.play()
      isPlaying.value = true
      syncGlobalPlayerPlayingUI(true)
    }
  } else {
    // 播放下一首
    playNext()
  }
}

const onTimeUpdate = () => {
  if (audioPlayer.value) {
    currentTime.value = audioPlayer.value.currentTime
    updateActiveLyric()
  }
}

const onLoadedMetadata = () => {
  if (audioPlayer.value) {
    duration.value = audioPlayer.value.duration
    volume.value = audioPlayer.value.volume
  }
}

// 自定义播放器控制方法
const togglePlayPause = () => {
  if (!audioPlayer.value || !canPlay.value) return
  
  if (isPlaying.value) {
    audioPlayer.value.pause()
    isPlaying.value = false
    syncGlobalPlayerPlayingUI(false)
  } else {
    audioPlayer.value.play().then(() => {
      isPlaying.value = true
      syncGlobalPlayerPlayingUI(true)
    }).catch(error => {
      console.error('播放失败:', error)
      ElMessage.error('播放失败')
      isPlaying.value = false
      syncGlobalPlayerPlayingUI(false)
    })
  }
}

const seekTo = (event) => {
  if (!audioPlayer.value || !canPlay.value) return
  
  const target = event?.currentTarget || progressBar.value
  if (!target) return

  const rect = target.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = clickX / rect.width
  const newTime = percentage * duration.value
  
  audioPlayer.value.currentTime = newTime
  currentTime.value = newTime
}

const toggleMute = () => {
  if (!audioPlayer.value) return
  
  if (isMuted.value) {
    audioPlayer.value.volume = volume.value
    isMuted.value = false
  } else {
    audioPlayer.value.volume = 0
    isMuted.value = true
  }
}

const toggleVolumeSlider = () => {
  showVolumeSlider.value = !showVolumeSlider.value
}

const updateVolume = () => {
  if (!audioPlayer.value) return
  
  audioPlayer.value.volume = volume.value
  isMuted.value = volume.value === 0
}

const togglePlayerOpen = () => {
  const mainEl = document.querySelector('#gui-MusicPlayer .gui-MusicPlayer-Main')
  if (!mainEl) return
  const next = !mainEl.classList.contains('gui-playerShow')
  mainEl.classList.toggle('gui-playerShow', next)
  isPlayerOpen.value = next
}

const togglePlaylistOpen = () => {
  const listEl = document.querySelector('#gui-MusicPlayer .gui-outsideSongList')
  if (!listEl) return
  const next = !listEl.classList.contains('gui-outsideSongListShow')
  listEl.classList.toggle('gui-outsideSongListShow', next)
  isPlaylistOpen.value = next
}

const getSongArtistText = (song) => {
  if (!song) return '—'
  return song.artist || song.artistsname || song.artists || song.ar?.[0]?.name || '未知艺术家'
}

const getSongCoverUrl = (song) => {
  if (!song) return '/gui-MusicPlayer/images/playerLoad.gif'
  return song.cover || song.picurl || song.al?.picUrl || '/default-music-cover.jpg'
}

const ensureGuiMusicPlayerAssets = () => {
  const hrefList = [
    '/gui-MusicPlayer/icon/guiplayIcon.css',
    '/gui-MusicPlayer/css/gui-MusicPlayer.css'
  ]
  hrefList.forEach(href => {
    if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  })
}

const syncThemeVarsFromGlobalPlayer = () => {
  const target = musicToolRoot.value
  if (!target) return

  const source = document.querySelector('#gui-MusicPlayer .gui-MusicPlayer-Main') || document.querySelector('#gui-MusicPlayer')
  if (!source) return

  const style = getComputedStyle(source)
  const varNames = [
    '--playerColor-1',
    '--playerColor-2',
    '--playerColor-3',
    '--playerColor-4',
    '--playerColor-5',
    '--playerColor-6',
    '--playerColor-7',
    '--playerColor-8',
    '--playerColor-9',
    '--playerColor-10',
    '--playerColor-11',
    '--playerColor-12',
    '--playerColor-rgab-1',
    '--playerColor-rgab-2',
    '--playerShadow-1',
    '--playerShadow-2',
    '--playerTextShadow-1',
    '--playerTextShadow-2'
  ]

  varNames.forEach(name => {
    const value = style.getPropertyValue(name)
    if (value) target.style.setProperty(name, value.trim())
  })
}

const handleThemeChange = (themeClass) => {
  setStoredTheme(themeClass)
  applyThemeToGlobalPlayer(themeClass)
  nextTick(() => syncThemeVarsFromGlobalPlayer())
}

const applyThemeToGlobalPlayer = (themeClass) => {
  const playerRoot = document.querySelector('#gui-MusicPlayer')
  if (playerRoot) {
    playerRoot.setAttribute('data-themeColor', themeClass)
  }

  const mainEl = document.querySelector('#gui-MusicPlayer .gui-MusicPlayer-Main')
  if (!mainEl) return

  themeOptions.forEach(t => mainEl.classList.remove(t.value))
  mainEl.classList.add(themeClass)
}

const detectGlobalPlayerTheme = () => {
  const mainEl = document.querySelector('#gui-MusicPlayer .gui-MusicPlayer-Main')
  if (!mainEl) return null
  const found = themeOptions.find(t => mainEl.classList.contains(t.value))
  return found?.value || null
}

const renderLyricsToGlobalPlayer = () => {
  const lyricBox = document.querySelector('#gui-lyric .gui-AllLyric-box')
  if (!lyricBox) return
  lyricBox.innerHTML = ''
  lyricLines.value.forEach(line => {
    const li = document.createElement('li')
    li.className = 'gui-ly'
    li.dataset.time = String(line.time)
    li.textContent = line.text
    lyricBox.appendChild(li)
  })
}

const syncGlobalPlayerInfo = (song) => {
  const root = document.querySelector('#gui-MusicPlayer')
  if (!root) return

  const nameEl = root.querySelector('.gui-songName')
  const singerEl = root.querySelector('.gui-singer')
  const picEl = root.querySelector('.gui-musicPicture')

  if (nameEl) nameEl.textContent = song?.name || '未选择歌曲'
  if (singerEl) singerEl.textContent = getSongArtistText(song)
  if (picEl && song) picEl.setAttribute('src', getSongCoverUrl(song))
}

const syncGlobalPlayerPlayingUI = (playing) => {
  const root = document.querySelector('#gui-MusicPlayer')
  if (!root) return

  const playback = root.querySelector('.gui-playbackControl')
  const pauseEl = playback?.querySelector('.gui-pause')
  const playEl = playback?.querySelector('.gui-playBack')
  const picEl = root.querySelector('.gui-musicPicture')
  const notes = root.querySelectorAll('.gui-musicalNote')
  const lyricEl = document.querySelector('#gui-lyric')

  if (pauseEl) pauseEl.style.display = playing ? 'block' : 'none'
  if (playEl) playEl.style.display = playing ? 'none' : 'block'
  if (playback) playback.classList.toggle('gui-bePlaying', playing)
  if (picEl) picEl.classList.toggle('gui-pauseRotation', !playing)
  if (notes?.length) notes.forEach(n => n.classList.toggle('gui-pausePdyMove', !playing))
  if (lyricEl) {
    lyricEl.classList.toggle('gui-lyricShow', playing)
    lyricEl.classList.toggle('gui-lyricHidden', !playing)
  }
}

const waitForGlobalPlayerReady = async () => {
  for (let i = 0; i < 80; i++) {
    const audioEl = document.getElementById('gui-musicAudio')
    if (audioEl) return audioEl
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return null
}

// 播放模式切换
const switchPlayMode = () => {
  const modes = ['sequence', 'loop', 'random']
  const currentIndex = modes.indexOf(playMode.value)
  const nextIndex = (currentIndex + 1) % modes.length
  playMode.value = modes[nextIndex]
  
  const modeLabels = {
    sequence: '顺序播放',
    loop: '循环播放', 
    random: '随机播放'
  }
  ElMessage.info(`切换到: ${modeLabels[playMode.value]}`)
}

// 播放下一首
const playNext = () => {
  if (currentPlaylist.value.length <= 1) return
  
  let nextIndex
  if (playMode.value === 'random') {
    // 随机播放
    do {
      nextIndex = Math.floor(Math.random() * currentPlaylist.value.length)
    } while (nextIndex === currentIndex.value && currentPlaylist.value.length > 1)
  } else {
    // 顺序播放或循环播放
    nextIndex = (currentIndex.value + 1) % currentPlaylist.value.length
  }
  
  currentIndex.value = nextIndex
  const nextSong = currentPlaylist.value[nextIndex]
  playMusic(nextSong, null, true)
}

// 播放上一首
const playPrevious = () => {
  if (currentPlaylist.value.length <= 1) return
  
  let prevIndex
  if (playMode.value === 'random') {
    // 随机播放
    do {
      prevIndex = Math.floor(Math.random() * currentPlaylist.value.length)
    } while (prevIndex === currentIndex.value && currentPlaylist.value.length > 1)
  } else {
    // 顺序播放或循环播放
    prevIndex = currentIndex.value - 1
    if (prevIndex < 0) {
      prevIndex = currentPlaylist.value.length - 1
    }
  }
  
  currentIndex.value = prevIndex
  const prevSong = currentPlaylist.value[prevIndex]
  playMusic(prevSong, null, true)
}

// 处理标签页切换
// 为每个标签页保存搜索结果
const tabSearchResults = ref({
  keyword: [],
  songId: [],
  playlist: []
})

// 为每个标签页保存歌单结果
const tabPlaylistResults = ref({
  keyword: [],
  songId: [],
  playlist: []
})

// 标签切换处理
const handleTabChange = (tabName) => {
  console.log('切换到标签页:', tabName)
  
  // 保存当前标签页的搜索结果和歌单结果
  const currentTab = activeSearchTab.value
  if (currentTab) {
    if (currentTab === 'keyword' && keywordResults.value.length > 0) {
      tabSearchResults.value[currentTab] = [...keywordResults.value]
    } else if (currentTab === 'songId' && songIdResults.value.length > 0) {
      tabSearchResults.value[currentTab] = [...songIdResults.value]
    }
    if (playlist.value.length > 0) {
      tabPlaylistResults.value[currentTab] = [...playlist.value]
    }
  }
  
  // 恢复新标签页的搜索结果和歌单结果
  if (tabName === 'keyword') {
    keywordResults.value = tabSearchResults.value[tabName] || []
  } else if (tabName === 'songId') {
    songIdResults.value = tabSearchResults.value[tabName] || []
  }
  playlist.value = tabPlaylistResults.value[tabName] || []
  
  // 重置选中的歌曲
  selectedSongs.value = []
  
  // 重置加载状态
  searching.value = false
  searchingSongId.value = false
  loadingPlaylist.value = false
}

// 更新选中歌曲列表
const updateSelectedSongs = (newSelectedSongs) => {
  selectedSongs.value = newSelectedSongs
}

// 监听音质切换，自动重新获取当前歌曲并播放
watch(selectedQuality, async (newQuality, oldQuality) => {
  if (currentSong.value && newQuality !== oldQuality) {
    // 重新获取当前歌曲的播放链接并播放
    await playMusic(currentSong.value, newQuality, true)
  }
})

// 分页处理函数
const handlePageChange = (page) => {
  console.log('页码改变:', page)
  currentPage.value = page
  searchMusic(page) // 重新搜索并获取新页面的数据
}

const handleSizeChange = (size) => {
  console.log('每页大小改变:', size)
  pageSize.value = size
  currentPage.value = 1 // 每页大小改变时重置为第一页
  searchMusic(1) // 重新搜索第一页数据
}

// 获取用户收藏歌单
const fetchUserFavoritePlaylist = async () => {
  if (!isLoggedIn.value) return
  
  loadingUserPlaylist.value = true
  try {
    const response = await fetch(`${API_BASE_URL}/proxy/userMusicList`, {
      method: 'GET',
      headers: getApiHeaders()
    })
    
    const data = await response.json()
    
    if (data.code === 200 && data.list) {
      // 解析歌单ID列表
      let playlistIds = []
      try {
        playlistIds = JSON.parse(data.list)
      } catch (e) {
        // 如果不是JSON格式，尝试按字符串解析
        const match = data.list.match(/\d+/g)
        if (match) {
          playlistIds = match.map(id => parseInt(id))
        }
      }
      
      if (playlistIds && playlistIds.length > 0) {
        // 保存所有歌单ID
        userPlaylistIds.value = playlistIds
        if (!playlistId.value.trim()) {
          // 自动加载第一个歌单
          playlistId.value = playlistIds[0].toString()
          await searchByPlaylist()
          ElMessage.success('已自动加载您的收藏歌单')
        }
      }
    }
  } catch (error) {
    console.error('获取用户收藏歌单失败:', error)
  } finally {
    loadingUserPlaylist.value = false
  }
}

// 收藏当前歌单
const favoriteCurrentPlaylist = async () => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再收藏歌单')
    return
  }
  
  if (!playlistId.value.trim()) {
    ElMessage.warning('当前没有可收藏的歌单')
    return
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/proxy/updateUserMusicList`, {
      method: 'POST',
      headers: {
        ...getApiHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([playlistId.value])
    })
    
    const data = await response.json()
    
    if (data.code === 200) {
      // 将新歌单ID添加到列表
      const newId = parseInt(playlistId.value)
      if (!userPlaylistIds.value.includes(newId)) {
        userPlaylistIds.value.push(newId)
      }
      ElMessage.success('歌单收藏成功')
    } else {
      ElMessage.error(data.message || '收藏失败')
    }
  } catch (error) {
    console.error('收藏歌单失败:', error)
    ElMessage.error('收藏歌单失败，请检查网络连接')
  }
}

// 切换到指定歌单
const switchToPlaylist = async (id) => {
  playlistId.value = id.toString()
  await searchByPlaylist()
}

// 删除收藏歌单
const deleteFavoritePlaylist = async (id) => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录')
    return
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/proxy/deleteUserMusicList`, {
      method: 'POST',
      headers: {
        ...getApiHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([id.toString()])
    })
    
    const data = await response.json()
    
    if (data.code === 200) {
      // 从列表中移除
      userPlaylistIds.value = userPlaylistIds.value.filter(playlistId => playlistId !== id)
      ElMessage.success('歌单删除成功')
    } else {
      ElMessage.error(data.message || '删除失败')
    }
  } catch (error) {
    console.error('删除歌单失败:', error)
    ElMessage.error('删除歌单失败，请检查网络连接')
  }
}

const handleResize = () => updateFixedPlayerHeightVar()

watch(
  () => currentSong.value?.id,
  (songId) => {
    fetchLyricForSong(songId)
    nextTick(() => updateFixedPlayerHeightVar())
  }
)

// 组件挂载时获取用户收藏歌单
onMounted(() => {
  ensureGuiMusicPlayerAssets()
  const storedTheme = getStoredTheme()
  const currentTheme = detectGlobalPlayerTheme()
  selectedTheme.value = storedTheme || currentTheme || 'gui-original'
  applyThemeToGlobalPlayer(selectedTheme.value)
  nextTick(() => syncThemeVarsFromGlobalPlayer())

  const cachedPlaylistId = loadPluginPlaylistId()
  if (cachedPlaylistId && !playlistId.value.trim()) {
    playlistId.value = cachedPlaylistId
    searchByPlaylist()
  }

  waitForGlobalPlayerReady().then((audioEl) => {
    if (!audioEl) return
    audioPlayer.value = audioEl
    if (!globalAudioBound) {
      globalAudioBound = true
      audioEl.addEventListener('loadstart', onAudioLoadStart)
      audioEl.addEventListener('canplay', onAudioCanPlay)
      audioEl.addEventListener('timeupdate', onTimeUpdate)
      audioEl.addEventListener('loadedmetadata', onLoadedMetadata)
      audioEl.addEventListener('ended', onAudioEnded)
      audioEl.addEventListener('error', onAudioError)
    }
    renderLyricsToGlobalPlayer()
    syncGlobalPlayerInfo(currentSong.value)
    syncThemeVarsFromGlobalPlayer()
  })

  fetchUserFavoritePlaylist()
  nextTick(() => updateFixedPlayerHeightVar())
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  const audioEl = audioPlayer.value
  if (audioEl) {
    audioEl.removeEventListener('loadstart', onAudioLoadStart)
    audioEl.removeEventListener('canplay', onAudioCanPlay)
    audioEl.removeEventListener('timeupdate', onTimeUpdate)
    audioEl.removeEventListener('loadedmetadata', onLoadedMetadata)
    audioEl.removeEventListener('ended', onAudioEnded)
    audioEl.removeEventListener('error', onAudioError)
  }
})
</script>

<template>
    <div class="section">
    <div class="fp-tablecell">
      <div id="content-containers">
  <div ref="musicToolRoot" class="music-tool" :class="selectedTheme">
    <div class="music-tool-bg"></div>

    <div class="music-tool-shell">
      <div class="music-tool-top">
        <div class="music-tool-brand">
          <div class="music-tool-title">Music</div>
          <div class="music-tool-subtitle">搜索、播放、歌词、歌单</div>
        </div>
        <div class="music-tool-top-right">
        <div class="music-tool-quality">
          <div class="music-tool-quality-label">主题</div>
          <el-select v-model="selectedTheme" size="small" class="music-tool-theme-select" @change="handleThemeChange">
            <el-option v-for="t in themeOptions" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </div>
        <div class="music-tool-quality">
          <div class="music-tool-quality-label">音质</div>
          <el-select v-model="selectedQuality" size="small" class="music-tool-quality-select">
            <el-option v-for="q in qualityOptions" :key="q.value" :label="q.label" :value="q.value" />
          </el-select>
        </div>
        </div>
      </div>

      <div class="music-tool-layout">
        <div class="music-tool-content">
          <el-tabs v-model="activeSearchTab" class="music-tool-tabs" @tab-change="handleTabChange">
            <el-tab-pane label="歌单" name="playlist">
              <div class="music-tool-row">
                <el-input v-model="playlistId" clearable placeholder="输入歌单ID" @keyup.enter="searchByPlaylist">
                  <template #append>
                    <el-button :icon="Search" :loading="loadingPlaylist" @click="searchByPlaylist">加载</el-button>
                  </template>
                </el-input>
              </div>

              <div class="music-tool-row music-tool-actions">
                <el-button :icon="Star" :disabled="!playlistId" @click="favoriteCurrentPlaylist">收藏歌单</el-button>
                <el-button :icon="InfoFilled" :disabled="selectedSongs.length === 0" :loading="loadingPlaylistInfo" @click="getPlaylistInfo">
                  选中信息
                </el-button>
              </div>

              <SongList
                :songs="playlist"
                title="歌单歌曲"
                listType="playlist"
                :currentSong="currentSong"
                @playSong="(song) => playMusic(song, null, true)"
                @download-song="downloadMusic"
              />
            </el-tab-pane>

            <el-tab-pane label="关键词搜索" name="keyword">
              <div class="music-tool-row">
                <el-input
                  v-model="searchKeyword"
                  clearable
                  placeholder="输入关键词（歌名 / 歌手）"
                  @keyup.enter="searchMusic(1)"
                >
                  <template #append>
                    <el-button :icon="Search" :loading="searching" @click="searchMusic(1)">搜索</el-button>
                  </template>
                </el-input>
              </div>

              <SongList
                v-if="keywordResults.length"
                :songs="keywordResults"
                title="搜索结果"
                listType="search"
                :currentSong="currentSong"
                @playSong="(song) => playMusic(song)"
                @download-song="downloadMusic"
              />

              <div v-if="totalPages > 1" class="music-tool-pager">
                <el-pagination
                  background
                  layout="total, sizes, prev, pager, next"
                  :total="totalSongs"
                  :current-page="currentPage"
                  :page-size="pageSize"
                  :page-sizes="[10, 20, 30, 50]"
                  @current-change="handlePageChange"
                  @size-change="handleSizeChange"
                />
              </div>
            </el-tab-pane>

            <el-tab-pane label="单曲ID" name="songId">
              <div class="music-tool-row">
                <el-input v-model="songId" clearable placeholder="输入歌曲ID" @keyup.enter="searchBySongId">
                  <template #append>
                    <el-button :icon="Search" :loading="searchingSongId" @click="searchBySongId">查询</el-button>
                  </template>
                </el-input>
              </div>

              <SongList
                v-if="songIdResults.length"
                :songs="songIdResults"
                title="查询结果"
                listType="search"
                :currentSong="currentSong"
                @playSong="(song) => playMusic(song)"
                @download-song="downloadMusic"
              />
            </el-tab-pane>
          </el-tabs>
        </div>

        <div class="music-tool-aside">
          <div class="music-tool-card music-tool-now">
            <div class="music-tool-now-cover">
              <img :src="getSongCoverUrl(currentSong)" alt="cover">
            </div>
            <div class="music-tool-now-meta">
              <div class="music-tool-now-title">{{ currentSong?.name || '未选择歌曲' }}</div>
              <div class="music-tool-now-artist">{{ getSongArtistText(currentSong) }}</div>
              <div class="music-tool-now-progress" @click="seekTo">
                <div class="music-tool-now-track">
                  <div class="music-tool-now-bar" :style="{ width: `${progressPercentage}%` }"></div>
                </div>
                <div class="music-tool-now-time">
                  <span>{{ formatTime(currentTime) }}</span>
                  <span>{{ formatTime(duration) }}</span>
                </div>
              </div>
              <div class="music-tool-now-actions">
                <el-button :icon="ArrowLeft" @click="playPrevious"></el-button>
                <el-button :icon="isPlaying ? VideoPause : VideoPlay" :disabled="!canPlay" type="primary" @click="togglePlayPause">
                  <!-- {{ isPlaying ? '暂停' : '播放' }} -->
                </el-button>
                <el-button :icon="ArrowRight" @click="playNext"></el-button>
                <el-button :icon="List" @click="togglePlaylistOpen"></el-button>
                <el-button :icon="Refresh" @click="switchPlayMode"></el-button>
              </div>
            </div>
          </div>

          <div v-if="isLoggedIn && userPlaylistIds.length" class="music-tool-card">
            <div class="music-tool-card-title">我的收藏歌单</div>
            <div class="music-tool-fav-list">
              <div v-for="id in userPlaylistIds" :key="id" class="music-tool-fav-item">
                <el-button text @click="switchToPlaylist(id)">{{ id }}</el-button>
                <el-button text :icon="Delete" @click="deleteFavoritePlaylist(id)" />
              </div>
            </div>
          </div>

          <div v-if="lyricLines.length" class="music-tool-card">
            <div class="music-tool-card-title">歌词</div>
            <div class="music-tool-lyric-mini">
              <div
                v-for="(line, idx) in lyricLines"
                :key="idx"
                class="music-tool-lyric-line"
                :class="{ 'is-active': idx === activeLyricIndex }"
              >
                {{ line.text }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="downloadDialogVisible" title="下载音乐" width="420px" @close="handleDownloadDialogClose">
      <div v-if="downloadingSong" class="music-tool-download">
        <div class="music-tool-download-title">{{ downloadingSong.name }}</div>
        <div class="music-tool-download-sub">{{ getSongArtistText(downloadingSong) }}</div>
        <el-select v-model="downloadQuality" class="music-tool-download-select">
          <el-option v-for="q in qualityOptions" :key="q.value" :label="q.label" :value="q.value" />
        </el-select>
      </div>
      <template #footer>
        <el-button @click="downloadDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDownload">下载</el-button>
      </template>
    </el-dialog>
  </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.music-tool {
  --mt-text-1: rgba(0, 0, 0, 0.92);
  --mt-text-2: rgba(0, 0, 0, 0.64);
  --mt-text-3: rgba(0, 0, 0, 0.42);
  --mt-card: rgba(255, 255, 255, 0.62);
  --mt-card-border: rgba(255, 255, 255, 0.38);
  --mt-shadow: 0 16px 60px rgba(0, 0, 0, 0.12);
  --mt-radius: 16px;
  --mt-radius-sm: 12px;
  --text-primary: var(--mt-text-1);
  --text-secondary: var(--mt-text-2);
  --text-muted: var(--mt-text-3);
  --glass-bg: var(--mt-card);
  --glass-border: var(--mt-card-border);
  --border-radius: var(--mt-radius);
  --border-radius-small: var(--mt-radius-sm);
  --shadow-medium: var(--mt-shadow);
  padding: 22px 18px 76px;
  font-family: '仿宋', 'FangSong', '微软雅黑', 'Microsoft YaHei';
  position: relative;
}

.music-tool-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(800px 360px at 10% 0%, color-mix(in srgb, var(--playerColor-3) 26%, transparent) 0%, transparent 60%),
    radial-gradient(900px 420px at 90% 20%, color-mix(in srgb, var(--playerColor-7) 22%, transparent) 0%, transparent 62%),
    radial-gradient(760px 420px at 60% 100%, color-mix(in srgb, var(--playerColor-10) 22%, transparent) 0%, transparent 60%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.76) 55%, rgba(255, 255, 255, 0.88) 100%);
  filter: saturate(1.05);
  border-radius: 18px;
  z-index: 0;
}

.music-tool-shell {
  position: relative;
  z-index: 1;
  max-width: 1180px;
  margin: 0 auto;
}

.music-tool-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.music-tool-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--mt-text-1);
  letter-spacing: 0.5px;
}

.music-tool-subtitle {
  margin-top: 2px;
  font-size: 13px;
  color: var(--mt-text-2);
}

.music-tool-brand {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.music-tool-top-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.music-tool-quality {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--mt-radius);
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(14px);
}

.music-tool-quality-label {
  color: var(--text-secondary);
  font-size: 14px;
}

.music-tool-quality-select {
  width: 160px;
}

.music-tool-theme-select {
  width: 140px;
}

.music-tool-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
  align-items: start;
}

.music-tool-content {
  border-radius: var(--mt-radius);
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(16px);
  box-shadow: var(--mt-shadow);
  padding: 14px 14px 10px;
}

.music-tool-aside {
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: sticky;
  top: 16px;
}

.music-tool-card {
  border-radius: var(--mt-radius);
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(16px);
  box-shadow: var(--mt-shadow);
  padding: 14px;
}

.music-tool-card-title {
  font-size: 13px;
  color: var(--mt-text-2);
  margin-bottom: 10px;
  font-weight: 700;
}

.music-tool-now {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 12px;
  padding: 16px;
}

.music-tool-now-cover {
  width: 86px;
  height: 86px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.4);
}

.music-tool-now-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.music-tool-now-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--mt-text-1);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-tool-now-artist {
  margin-top: 2px;
  font-size: 13px;
  color: var(--mt-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-tool-now-progress {
  margin-top: 10px;
  cursor: pointer;
  user-select: none;
}

.music-tool-now-track {
  height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--playerColor-4) 55%, transparent);
  overflow: hidden;
}

.music-tool-now-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--playerColor-3), var(--playerColor-6));
}

.music-tool-now-time {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--mt-text-3);
}

.music-tool-now-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.music-tool-lyric-mini {
  max-height: 260px;
  overflow: auto;
  padding-right: 0;
  scrollbar-width: none;
}

.music-tool-lyric-mini::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.music-tool-lyric-mini::-webkit-scrollbar-thumb {
  background: transparent;
}

.music-tool-lyric-line {
  padding: 6px 8px;
  border-radius: 10px;
  color: var(--mt-text-2);
  font-size: 13px;
  line-height: 1.35;
}

.music-tool-lyric-line.is-active {
  color: var(--playerColor-3);
  background: color-mix(in srgb, var(--playerColor-7) 28%, transparent);
  font-weight: 800;
}

.music-tool-tabs :deep(.el-tabs__header) {
  margin: 0 0 10px;
}

.music-tool-row {
  margin: 10px 0 16px;
}

.music-tool-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.music-tool-pager {
  display: flex;
  justify-content: center;
  padding: 10px 0 18px;
}

.music-tool-fav-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.music-tool-fav-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.32);
}

.music-tool-audio {
  display: none;
}

.music-tool-download-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
}

.music-tool-download-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.music-tool-download-select {
  width: 100%;
}

.music-tool :deep(.el-input__wrapper),
.music-tool :deep(.el-select__wrapper) {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: none;
}

.music-tool :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: rgba(0, 0, 0, 0.06);
}

.music-tool :deep(.el-tabs__item) {
  color: var(--mt-text-2);
  font-weight: 700;
}

.music-tool :deep(.el-tabs__item.is-active) {
  color: var(--playerColor-3);
}

.music-tool :deep(.el-tabs__active-bar) {
  background: linear-gradient(90deg, var(--playerColor-3), var(--playerColor-6));
}

.music-tool :deep(.el-button) {
  border-radius: 12px;
}

.music-tool :deep(.el-button--primary) {
  border: none;
  background: linear-gradient(135deg, var(--playerColor-3), var(--playerColor-6));
}

.music-tool :deep(.el-pagination.is-background .el-pager li:not(.is-disabled).is-active) {
  background: linear-gradient(135deg, var(--playerColor-3), var(--playerColor-6));
}

@media (max-width: 1024px) {
  .music-tool-layout {
    grid-template-columns: 1fr;
  }

  .music-tool-aside {
    position: static;
  }
}
</style>
