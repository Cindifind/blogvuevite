<template>
  <div class="fp-tablecell">
  <div class="music-tool" id="music-tool-container">
    <div class="music-header">
      <h1>音乐</h1>
      <p>免费音乐在线音乐播放</p>
      <p>各种音乐播放id以网易云id为准</p>
    </div>

    <!-- 搜索区域 -->
    <div class="search-section">
      <div class="search-tabs">
        <el-tabs v-model="activeSearchTab" @tab-change="handleTabChange">
          <el-tab-pane label="关键词搜索" name="keyword">
            <div class="search-box" id="keyword-search-box">
              <el-input
                v-model="searchKeyword"
                placeholder="输入歌曲名称、歌手名..."
                size="large"
                @keyup.enter="searchMusic"
                :loading="searching"
              >
                <template #append>
                  <el-button @click="searchMusic" :loading="searching" type="primary">
                    <el-icon v-if="!searching"><Search /></el-icon>
                    搜索歌曲
                  </el-button>
                </template>
              </el-input>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="单曲ID搜索" name="songId">
            <div class="search-box" id="songid-search-box">
              <el-input
                v-model="songId"
                placeholder="输入单曲ID..."
                size="large"
                @keyup.enter="searchBySongId"
                :loading="searchingSongId"
              >
                <template #append>
                  <el-button @click="searchBySongId" :loading="searchingSongId" type="primary">
                    <el-icon v-if="!searchingSongId"><Search /></el-icon>
                    获取单曲
                  </el-button>
                </template>
              </el-input>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="歌单搜索" name="playlist">
            <div class="search-box" id="playlist-search-box">
              <el-input
                v-model="playlistId"
                placeholder="输入歌单ID..."
                size="large"
                @keyup.enter="searchByPlaylist"
                :loading="loadingPlaylist"
              >
                <template #append>
                  <el-button @click="searchByPlaylist" :loading="loadingPlaylist" type="primary">
                    <el-icon v-if="!loadingPlaylist"><List /></el-icon>
                    搜索歌单
                  </el-button>
                </template>
              </el-input>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 内容区域 - 根据选项卡显示不同内容 -->
    <div class="content-area">
      <!-- 关键词搜索结果 -->
      <div v-if="activeSearchTab === 'keyword' && keywordResults.length > 0" class="search-results">
        <SongList
          :songs="keywordResults"
          :title="'搜索结果'"
          :list-type="'search'"
          :current-song="currentSong"
          :loading-info="loadingInfo"
          @play-song="playMusic"
          @download-song="downloadMusic"
        />
      </div>

      <!-- 单曲ID搜索结果 -->
      <div v-if="activeSearchTab === 'songId' && songIdResults.length > 0" class="search-results">
        <SongList
          :songs="songIdResults"
          :title="'单曲信息'"
          :list-type="'search'"
          :current-song="currentSong"
          :loading-info="loadingInfo"
          @play-song="playMusic"
          @download-song="downloadMusic"
        />
      </div>

      <!-- 歌单内容 - 歌单搜索 -->
      <div v-if="activeSearchTab === 'playlist' && playlist.length > 0" class="playlist-section">
        <SongList
          :songs="playlist"
          :title="'歌单内容'"
          :list-type="'playlist'"
          :current-song="currentSong"
          :selected-songs="selectedSongs"
          :loading-info="loadingInfo"
          :loading-playlist-info="loadingPlaylistInfo"
          @play-song="playMusic"
          @get-playlist-info="getPlaylistInfo"
          @update-selected-songs="updateSelectedSongs"
          @download-song="downloadMusic"
        />
      </div>

      </div>
    </div>
  </div>

  <!-- 固定底部播放器 -->
  <div v-if="currentSong" class="fixed-player">
    <div class="player-container">
      <div class="player-left">
        <div class="song-cover">
          <el-image
            :src="currentSong.cover || '/default-music-cover.jpg'"
            fit="cover"
            :alt="currentSong.name"
          />
        </div>
        <div class="song-info">
          <div class="song-name">{{ currentSong.name }}</div>
          <div class="song-artist">{{ currentSong.artist }}</div>
        </div>
      </div>
      
      <div class="player-center">
        <div class="player-controls">
          <!-- 播放模式切换按钮 -->
          <el-button 
            size="small" 
            @click="switchPlayMode" 
            :title="playModeOptions.find(m => m.value === playMode)?.label"
            class="play-mode-btn"
          >
            <el-icon>
               <List v-if="playMode === 'sequence'" />
               <Refresh v-else-if="playMode === 'loop'" />
               <VideoPlay v-else />
             </el-icon>
          </el-button>
          
          <!-- 上一首按钮 -->
          <el-button size="small" @click="playPrevious" :disabled="currentPlaylist.length <= 1">
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          
          <!-- 自定义音频播放器 -->
          <div class="custom-audio-player" v-if="currentMusicUrl">
            <!-- 隐藏的原生audio元素 -->
            <audio
              ref="audioPlayer"
              :src="currentMusicUrl"
              @loadstart="onAudioLoadStart"
              @canplay="onAudioCanPlay"
              @error="onAudioError"
              @ended="onAudioEnded"
              @timeupdate="onTimeUpdate"
              @loadedmetadata="onLoadedMetadata"
            ></audio>
            
            <!-- 自定义播放控件 -->
            <div class="custom-controls">
              <!-- 播放/暂停按钮 -->
              <button class="play-pause-btn" @click="togglePlayPause" :disabled="!canPlay">
                <el-icon v-if="isPlaying">
                  <VideoPause />
                </el-icon>
                <el-icon v-else>
                  <VideoPlay />
                </el-icon>
              </button>
              
              <!-- 进度条容器 -->
              <div class="progress-container">
                <!-- 时间显示 -->
                <span class="time-display">{{ formatTime(currentTime) }}</span>
                
                <!-- 进度条 -->
                <div class="progress-bar" @click="seekTo" ref="progressBar">
                  <div class="progress-track">
                    <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
                    <div class="progress-thumb" :style="{ left: progressPercentage + '%' }"></div>
                  </div>
                </div>
                
                <!-- 总时长 -->
                <span class="time-display">{{ formatTime(duration) }}</span>
              </div>
              
              <!-- 音量控制 -->
              <div class="volume-control">
                <button class="volume-btn" @click="toggleVolumeSlider">
                  <VolumeIcons 
                    :type="isMuted || volume === 0 ? 'mute' : 
                           volume < 0.3 ? 'low' : 
                           volume < 0.7 ? 'medium' : 'high'" 
                  />
                </button>
                <div class="volume-slider" v-show="showVolumeSlider" @click.stop>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    v-model="volume"
                    @input="updateVolume"
                    class="volume-range"
                    style="writing-mode: vertical-lr; direction: rtl;"
                  />
                  <!-- 添加静音按钮在滑块旁边 -->
                  <button class="mute-btn" @click="toggleMute" title="静音/取消静音">
                    <VolumeIcons 
                      :type="isMuted || volume === 0 ? 'mute' : 
                             volume < 0.3 ? 'low' : 
                             volume < 0.7 ? 'medium' : 'high'" 
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 下一首按钮 -->
          <el-button size="small" @click="playNext" :disabled="currentPlaylist.length <= 1">
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>
      
      <div class="player-right">
        <el-select v-model="selectedQuality" size="small" style="width: 120px;">
          <el-option
            v-for="option in qualityOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>
    </div>
  </div>
  
  <!-- 下载音质选择对话框 -->
  <el-dialog
    v-model="downloadDialogVisible"
    title="下载音乐"
    width="400px"
    :before-close="handleDownloadDialogClose"
  >
    <div class="download-dialog-content">
      <p>请选择下载音质：</p>
      <el-select v-model="downloadQuality" style="width: 100%;" size="large">
        <el-option label="标准音质" value="standard" />
        <el-option label="极高音质" value="exhigh" />
        <el-option label="无损音质" value="lossless" />
        <el-option label="Hi-Res音质" value="hires" />
        <el-option label="臻品音效" value="jyeffect" />
        <el-option label="天空音质" value="sky" />
        <el-option label="大师音质" value="jymaster " />
      </el-select>
      <p style="margin-top: 15px; color: #666; font-size: 14px;">
        歌曲：{{ downloadingSong?.name || '' }}
      </p>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="downloadDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDownload">下载</el-button>
      </span>
    </template>
  </el-dialog>
 
</template>

<script setup>
import { ref, reactive, computed, watch, h } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, InfoFilled, Document, VideoPlay, VideoPause, List, Refresh, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import VolumeIcons from './VolumeIcons.vue'
import { useAuth } from '../composables/useAuth'
import SongList from './SongList.vue'

// 使用用户认证
const { isLoggedIn, token } = useAuth()

// 响应式数据
const searchKeyword = ref('')
const songId = ref('')
const activeSearchTab = ref('keyword')
const searchingSongId = ref(false)
const keywordResults = ref([]) // 关键词搜索结果
const songIdResults = ref([]) // 单曲ID搜索结果
const searchResults = ref([]) // 保持兼容性，将在后续移除
const searching = ref(false)
const loadingInfo = ref(null)
const loadingUrl = ref(null)
const loadingPlaylist = ref(false)
const loadingPlaylistInfo = ref(false)

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

// 自定义播放器状态
const isPlaying = ref(false)
const canPlay = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(1)
const isMuted = ref(false)
const showVolumeSlider = ref(false)

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
const searchMusic = async () => {
  if (!searchKeyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  searching.value = true
  try {
    // 第一步：搜索获取歌曲ID列表
    const searchResponse = await fetch(`${API_BASE_URL}/proxy/userMusicSearch?name=${encodeURIComponent(searchKeyword.value)}`, {
      method: 'GET',
      headers: getApiHeaders()
    })
    
    const searchData = await searchResponse.json()
    
    // 使用统一错误处理
    if (!handleApiError(searchData, '搜索失败')) {
      return
    }
    
    if (searchData.list && searchData.list.length > 0) {
      // 第二步：根据ID列表获取详细歌曲信息
      const infoResponse = await fetch(`${API_BASE_URL}/proxy/musicListInfo`, {
        method: 'POST',
        headers: {
          ...getApiHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchData.list)
      })
      
      const infoData = await infoResponse.json()
      
      // 使用统一错误处理
      if (!handleApiError(infoData, '获取歌曲信息失败')) {
        return
      }
      
      searchResults.value = infoData.list || []
      keywordResults.value = infoData.list || [] // 保存到关键词搜索结果
      // 保存到对应标签页的搜索结果
      tabSearchResults.value.keyword = [...keywordResults.value]
      ElMessage.success(`找到 ${keywordResults.value.length} 首歌曲`)
    } else {
      searchResults.value = []
      keywordResults.value = []
      tabSearchResults.value.keyword = []
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
        artist: song.artistsname || (song.ar && song.ar[0]?.name) || '未知艺术家'
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
      setTimeout(() => {
        if (audioPlayer.value) {
          audioPlayer.value.play().then(() => {
            isPlaying.value = true
          }).catch(error => {
            console.error('自动播放失败:', error)
            ElMessage.warning('自动播放失败，请手动点击播放')
            isPlaying.value = false
          })
        }
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
      link.download = `${song.name} - ${song.artistsname || song.artist || '未知艺术家'}.mp3`
      
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
// 歌单搜索
const searchByPlaylist = async () => {
  if (!playlistId.value.trim()) {
    ElMessage.warning('请输入歌单ID')
    return
  }

  loadingPlaylist.value = true
  try {
    // 第一步：获取歌单ID列表
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
      // 第二步：根据ID列表获取详细歌曲信息
      const infoResponse = await fetch(`${API_BASE_URL}/proxy/musicListInfo`, {
        method: 'POST',
        headers: {
          ...getApiHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data.list)
      })
      
      const infoData = await infoResponse.json()
      
      // 使用统一错误处理
      if (!handleApiError(infoData, '获取歌单详情失败')) {
        return
      }
      
      playlist.value = infoData.list || []
      selectedSongs.value = []
      // 保存到对应标签页的歌单结果
      tabPlaylistResults.value.playlist = [...playlist.value]
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
    const infoText = data.list.map(song => `${song.name} - ${song.artistsname}`).join('\n')
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
}

// 音频播放结束事件
const onAudioEnded = () => {
  isPlaying.value = false
  if (playMode.value === 'loop') {
    // 单曲循环
    if (audioPlayer.value) {
      audioPlayer.value.currentTime = 0
      audioPlayer.value.play()
      isPlaying.value = true
    }
  } else {
    // 播放下一首
    playNext()
  }
}

const onTimeUpdate = () => {
  if (audioPlayer.value) {
    currentTime.value = audioPlayer.value.currentTime
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
  } else {
    audioPlayer.value.play().then(() => {
      isPlaying.value = true
    }).catch(error => {
      console.error('播放失败:', error)
      ElMessage.error('播放失败')
      isPlaying.value = false
    })
  }
}

const seekTo = (event) => {
  if (!audioPlayer.value || !canPlay.value) return
  
  const rect = progressBar.value.getBoundingClientRect()
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
</script>

<style scoped>
/* 全局变量定义 */
:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --secondary-gradient: linear-gradient(135deg, #6bc30d 0%, #00C2FF 100%);
  --glass-bg: rgba(0, 0, 0, 0.7);
  --glass-border: rgba(255, 255, 255, 0.2);
  --text-primary: rgba(255, 255, 255, 0.95);
  --text-secondary: rgba(255, 255, 255, 0.8);
  --text-muted: rgba(255, 255, 255, 0.6);
  --shadow-light: 0 8px 32px rgba(0, 0, 0, 0.3);
  --shadow-medium: 0 12px 40px rgba(0, 0, 0, 0.4);
  --shadow-heavy: 0 20px 60px rgba(0, 0, 0, 0.5);
  --border-radius: 20px;
  --border-radius-small: 12px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 主容器 */
.music-tool {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 40px);
  margin-top: 20px;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}

/* 头部区域现代化设计 */
.music-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 40px 20px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-medium);
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.8s ease-out;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.music-header::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  animation: rotate 20s linear infinite;
}

.music-header h1 {
  font-size: 3rem;
  margin-bottom: 15px;
  font-weight: 700;
  background: linear-gradient(45deg, #fff, #f0f0f0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
  position: relative;
  z-index: 1;
  animation: glow 2s ease-in-out infinite alternate;
}

.music-header p {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 300;
  position: relative;
  z-index: 1;
}

/* 搜索区域现代化 */
.search-section {
  margin-bottom: 40px;
}

.search-section :deep(.el-tabs) {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: var(--border-radius);
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: var(--shadow-light);
}

.search-section :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.search-section :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.search-section :deep(.el-tabs__item) {
  color: var(--text-secondary);
  font-weight: 500;
  padding: 12px 24px;
  border-radius: var(--border-radius-small);
  margin-right: 8px;
  transition: var(--transition);
  border: none;
}

.search-section :deep(.el-tabs__item:hover) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.search-section :deep(.el-tabs__item.is-active) {
  background: var(--secondary-gradient);
  color: white;
  box-shadow: var(--shadow-light);
}

.search-section :deep(.el-tabs__active-bar) {
  display: none;
}

.search-box {
  max-width: 700px;
  margin: 0 auto;
}

/* 使用ID选择器避免样式污染 - 搜索框样式 */
#music-tool-container .search-box :deep(.el-input) {
  border-radius: var(--border-radius-small);
  overflow: hidden;
  box-shadow: var(--shadow-light);
  transition: var(--transition);
}

#music-tool-container .search-box :deep(.el-input:hover) {
  box-shadow: 0 8px 32px rgba(240, 147, 251, 0.2);
  transform: translateY(-1px);
}

#music-tool-container .search-box :deep(.el-input__wrapper) {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 147, 251, 0.1) 100%);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(240, 147, 251, 0.2);
  box-shadow: inset 0 2px 8px rgba(240, 147, 251, 0.1);
  transition: var(--transition);
  border-radius: var(--border-radius-small);
}

#music-tool-container .search-box :deep(.el-input__wrapper:hover) {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 147, 251, 0.15) 100%);
  border-color: rgba(240, 147, 251, 0.4);
  box-shadow: inset 0 2px 8px rgba(240, 147, 251, 0.15), 0 0 20px rgba(240, 147, 251, 0.1);
  transform: translateY(-1px);
}

#music-tool-container .search-box :deep(.el-input__wrapper:focus-within) {
  background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(240, 147, 251, 0.2) 100%);
  border-color: rgba(240, 147, 251, 0.6);
  box-shadow: inset 0 2px 8px rgba(240, 147, 251, 0.2), 0 0 25px rgba(240, 147, 251, 0.15);
  transform: translateY(-1px);
}

#music-tool-container .search-box :deep(.el-input-group__append) {
  background: linear-gradient(135deg, #6bc30d 0%, #00C2FF 100%);
  border: 1px solid rgba(107, 195, 13, 0.3);
  border-left: none;
  color: white;
  font-weight: 600;
  padding: 0; /* 移除padding，让按钮填满整个区域 */
  transition: var(--transition);
  position: relative;
  overflow: hidden;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.9rem;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 0 var(--border-radius-small) var(--border-radius-small) 0;
  min-width: 120px; /* 固定按钮最小宽度，防止变长 */
  white-space: nowrap; /* 防止文字换行 */
  cursor: pointer;
}

#music-tool-container .search-box :deep(.el-input-group__append .el-button) {
  background: transparent !important;
  border: none !important;
  color: inherit !important;
  padding: 12px 20px !important; /* 将padding移到按钮上 */
  margin: 0 !important;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: auto !important; /* 重置按钮最小宽度 */
  white-space: nowrap !important; /* 防止文字换行 */
  position: relative;
  z-index: 1;
  cursor: pointer;
}

#music-tool-container .search-box :deep(.el-input-group__append .el-button::before) {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.6s ease;
  z-index: -1;
  pointer-events: none;
}

#music-tool-container .search-box :deep(.el-input-group__append .el-button:hover::before) {
  left: 100%;
}

#music-tool-container .search-box :deep(.el-input-group__append .el-button:hover) {
  background: transparent !important;
  transform: none !important;
  box-shadow: none !important;
  border: none !important;
}

#music-tool-container .search-box :deep(.el-input-group__append:hover) {
  background: linear-gradient(135deg, #5ba80b 0%, #0099cc 100%);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(107, 195, 13, 0.4);
  border-color: rgba(107, 195, 13, 0.5);
}

#music-tool-container .search-box :deep(.el-input-group__append:active) {
  transform: translateY(-1px);
  box-shadow: 0 2px 10px rgba(107, 195, 13, 0.6);
}

/* 当整个输入框组合悬停时的统一效果 */
#music-tool-container .search-box :deep(.el-input:hover .el-input-group__append) {
  background: linear-gradient(135deg, #5ba80b 0%, #0099cc 100%);
  border-color: rgba(107, 195, 13, 0.4);
  transform: translateY(-1px);
}

#music-tool-container .search-box :deep(.el-input:hover .el-input-group__append .el-button) {
  transform: translateY(0);
}

.search-box :deep(.el-input-group__append .el-button .el-icon) {
  margin-right: 8px;
  font-size: 1.1rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.search-box :deep(.el-input-group__append .el-button:hover .el-icon) {
  animation: spin 0.8s ease-in-out;
}

@keyframes spin {
  0% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(180deg) scale(1.2);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
}

/* 修复loading状态下按钮变长的问题 */
#music-tool-container .search-box :deep(.el-input-group__append .el-button.is-loading) {
  background: transparent !important;
  cursor: not-allowed;
  animation: none !important;
  box-shadow: none !important;
  border: none !important;
  width: 100% !important;
  min-width: auto !important;
  padding: 0 !important;
  margin: 0 !important;
}

#music-tool-container .search-box :deep(.el-input-group__append.is-loading),
#music-tool-container .search-box :deep(.el-input-group__append:has(.el-button.is-loading)) {
  background: linear-gradient(135deg, #6bc30d 0%, #00C2FF 100%);
  cursor: not-allowed;
  animation: loading-pulse 1.5s infinite;
  min-width: 120px !important; /* 确保loading时宽度不变 */
  width: auto !important;
}

/* loading状态下的脉冲动画 */
@keyframes loading-pulse {
  0%, 100% {
    box-shadow: 0 4px 15px rgba(107, 195, 13, 0.3);
  }
  50% {
    box-shadow: 0 4px 25px rgba(107, 195, 13, 0.6);
  }
}

/* loading状态下禁用悬停效果 */
#music-tool-container .search-box :deep(.el-input-group__append.is-loading:hover),
#music-tool-container .search-box :deep(.el-input-group__append:has(.el-button.is-loading):hover) {
  transform: none !important;
  background: linear-gradient(135deg, #6bc30d 0%, #00C2FF 100%) !important;
}

#music-tool-container .search-box :deep(.el-input-group__append .el-button.is-loading .el-icon) {
  animation: loading-spin 1s linear infinite !important;
}

@keyframes loading-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 内容区域通用样式 */
.search-results,
.current-playing,
.lyric-section,
.playlist-section {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: var(--border-radius);
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: var(--shadow-medium);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
  animation: slideInUp 0.6s ease-out;
}

.search-results::before,
.current-playing::before,
.lyric-section::before,
.playlist-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--secondary-gradient);
}

.search-results h3,
.current-playing h3,
.lyric-section h3,
.playlist-section h3 {
  color: var(--text-primary);
  margin-bottom: 25px;
  font-size: 1.5rem;
  font-weight: 600;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-results h3::before,
.current-playing h3::before,
.lyric-section h3::before,
.playlist-section h3::before {
  content: '';
  width: 4px;
  height: 24px;
  background: var(--secondary-gradient);
  border-radius: 2px;
}

/* 音乐列表现代化 */
.music-list {
  display: grid;
  gap: 20px;
}

.music-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: var(--border-radius-small);
  transition: var(--transition);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.music-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  transition: left 0.6s ease;
}

.music-item:hover::before {
  left: 100%;
}

.music-item:hover {
  background: rgba(0, 0, 0, 0.7);
  transform: translateY(-3px) scale(1.02);
  box-shadow: var(--shadow-heavy);
  border-color: rgba(255, 255, 255, 0.3);
}

.music-item.active {
  border-color: rgba(107, 195, 13, 0.8);
  background: linear-gradient(135deg, rgba(107, 195, 13, 0.2), rgba(0, 194, 255, 0.2));
  box-shadow: 0 8px 32px rgba(107, 195, 13, 0.3);
}

.playlist-item.active {
  border-color: rgba(107, 195, 13, 0.8);
  background: linear-gradient(135deg, rgba(107, 195, 13, 0.2), rgba(0, 194, 255, 0.2));
  box-shadow: 0 8px 32px rgba(107, 195, 13, 0.3);
}

.song-info {
  flex: 1;
  padding-right: 20px;
}

.song-title {
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--text-primary);
  margin-bottom: 8px;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
  line-height: 1.3;
}

.song-artist {
  color: var(--text-secondary);
  margin-bottom: 5px;
  font-weight: 500;
  font-size: 0.95rem;
}

.song-album {
  color: var(--text-muted);
  font-size: 0.9rem;
  font-style: italic;
}

.song-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.song-actions :deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  transition: var(--transition);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.song-actions :deep(.el-button:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* 歌词区域 */
.lyric-content {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: var(--border-radius-small);
  padding: 25px;
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.lyric-content::-webkit-scrollbar {
  width: 8px;
}

.lyric-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.lyric-content::-webkit-scrollbar-thumb {
  background: var(--secondary-gradient);
  border-radius: 4px;
}

.lyric-content pre {
  white-space: pre-wrap;
  font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.8;
  color: var(--text-primary);
  margin: 0;
  font-size: 1rem;
}

/* 歌单区域 */
.playlist-controls {
  display: flex;
  align-items: center;
  margin-bottom: 25px;
  flex-wrap: wrap;
  gap: 15px;
}

.playlist-items {
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-height: 500px;
  overflow-y: auto;
  padding-right: 10px;
}

.playlist-items::-webkit-scrollbar {
  width: 8px;
}

.playlist-items::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.playlist-items::-webkit-scrollbar-thumb {
  background: var(--secondary-gradient);
  border-radius: 4px;
}

.playlist-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: var(--border-radius-small);
  transition: var(--transition);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.playlist-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  transition: left 0.6s ease;
}

.playlist-item:hover::before {
  left: 100%;
}

.playlist-item:hover {
  background: rgba(0, 0, 0, 0.7);
  transform: translateY(-3px) scale(1.02);
  box-shadow: var(--shadow-heavy);
  border-color: rgba(255, 255, 255, 0.3);
}

.playlist-item.active {
  border-color: rgba(107, 195, 13, 0.8);
  background: linear-gradient(135deg, rgba(107, 195, 13, 0.2), rgba(0, 194, 255, 0.2));
  box-shadow: 0 8px 32px rgba(107, 195, 13, 0.3);
}

.playlist-song-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.playlist-song-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
}

.playlist-song-artist {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* 音乐信息弹窗 */
.music-info-detail :deep(.el-descriptions) {
  background: transparent;
}

.music-info-detail :deep(.el-descriptions__body) {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: var(--border-radius-small);
}

.music-cover {
  text-align: center;
  margin-top: 20px;
}

.cover-image {
  width: 200px;
  height: 200px;
  border-radius: var(--border-radius-small);
  box-shadow: var(--shadow-medium);
  transition: var(--transition);
}

.cover-image:hover {
  transform: scale(1.05);
}

/* 音乐信息弹窗移动端优化 */
@media (max-width: 768px) {
  .music-info-dialog :deep(.el-dialog) {
    width: 95% !important;
    max-width: 400px;
    margin: 5vh auto;
  }
  
  .music-info-dialog :deep(.el-dialog__header) {
    padding: 15px 20px;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border-radius: 15px 15px 0 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .music-info-dialog :deep(.el-dialog__title) {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .music-info-dialog :deep(.el-dialog__body) {
    padding: 20px;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 0 0 15px 15px;
  }
  
  .music-descriptions :deep(.el-descriptions__table) {
    background: transparent;
  }
  
  .music-descriptions :deep(.el-descriptions__label) {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-secondary);
    font-size: 0.9rem;
    padding: 12px 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .music-descriptions :deep(.el-descriptions__content) {
    background: rgba(255, 255, 255, 0.03);
    color: var(--text-primary);
    font-size: 0.9rem;
    padding: 12px 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    word-break: break-all;
  }
  
  .music-cover {
    margin-top: 25px;
    padding: 15px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .cover-image {
    width: 150px;
    height: 150px;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
  }
  
  .cover-image:hover {
    transform: scale(1.02);
  }
}

@media (max-width: 480px) {
  .music-info-dialog :deep(.el-dialog) {
    width: 98% !important;
    margin: 2vh auto;
  }
  
  .music-descriptions :deep(.el-descriptions__table) {
    display: block;
  }
  
  .music-descriptions :deep(.el-descriptions__row) {
    display: block;
    margin-bottom: 10px;
  }
  
  .music-descriptions :deep(.el-descriptions__cell) {
    display: block;
    width: 100% !important;
  }
  
  .music-descriptions :deep(.el-descriptions__label) {
    border-radius: 8px 8px 0 0;
    border-bottom: none;
  }
  
  .music-descriptions :deep(.el-descriptions__content) {
    border-radius: 0 0 8px 8px;
    border-top: none;
  }
  
  .cover-image {
    width: 120px;
    height: 120px;
  }
}

/* 固定底部播放器现代化 */
.fixed-player {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-top: 1px solid rgba(107, 195, 13, 0.3);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  animation: slideInUp 0.5s ease-out;
}

.player-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  padding: 15px 20px;
  gap: 20px;
}

.player-left {
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 250px;
}

.song-cover {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--shadow-light);
  flex-shrink: 0;
}

.song-cover :deep(.el-image) {
  width: 100%;
  height: 100%;
  transition: var(--transition);
}

.song-cover:hover :deep(.el-image) {
  transform: scale(1.1);
}

.player-left .song-info {
  flex: 1;
  min-width: 0;
}

.player-left .song-name {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-left .song-artist {
  color: var(--text-secondary);
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-center {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 600px;
  justify-content: center;
}

.play-mode-btn {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: var(--text-primary) !important;
  transition: var(--transition);
}

.play-mode-btn:hover {
  background: rgba(255, 255, 255, 0.2) !important;
  transform: translateY(-2px);
}

.play-mode-btn.active {
  background: linear-gradient(135deg, #6bc30d 0%, #00C2FF 100%) !important;
  color: white !important;
  box-shadow: 0 4px 15px rgba(107, 195, 13, 0.4);
}

.player-controls .el-button {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: var(--text-primary) !important;
  transition: var(--transition);
}

.player-controls .el-button:hover:not(:disabled) {
  background: rgba(107, 195, 13, 0.3) !important;
  transform: scale(1.05);
}

/* 自定义音频播放器样式 */
.custom-audio-player {
  flex: 1;
  max-width: 500px;
  margin: 0 15px;
}

.custom-audio-player audio {
  display: none; /* 隐藏原生audio元素 */
}

.custom-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: 25px;
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

/* 播放/暂停按钮 */
.play-pause-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6bc30d 0%, #00C2FF 100%);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition);
  box-shadow: 0 4px 15px rgba(107, 195, 13, 0.3);
  flex-shrink: 0;
}

.play-pause-btn:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(107, 195, 13, 0.5);
}

.play-pause-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.play-pause-btn .el-icon {
  font-size: 18px;
}

/* 进度条容器 */
.progress-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.time-display {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 40px;
  text-align: center;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
}

/* 进度条 */
.progress-bar {
  flex: 1;
  height: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 8px 0;
  min-width: 100px;
}

.progress-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6bc30d 0%, #00C2FF 100%);
  border-radius: 2px;
  transition: width 0.1s ease;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3));
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: left 0.1s ease;
  opacity: 0;
}

.progress-bar:hover .progress-thumb {
  opacity: 1;
}

/* 音量控制 */
.volume-control {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.volume-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition);
}

.volume-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.volume-btn .el-icon {
  font-size: 16px;
}

.volume-slider {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: 20px;
  padding: 15px 8px;
  margin-bottom: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.mute-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mute-btn:hover {
  color: #6bc30d;
  background: rgba(255, 255, 255, 0.1);
}

.volume-range {
  -webkit-appearance: slider-vertical;
  -moz-appearance: slider-vertical;
  appearance: slider-vertical;
  writing-mode: bt-lr; /* IE */
  width: 20px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  border-radius: 10px;
  cursor: pointer;
}

.volume-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6bc30d 0%, #00C2FF 100%);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.volume-range::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6bc30d 0%, #00C2FF 100%);
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.player-right {
  min-width: 150px;
  display: flex;
  justify-content: flex-end;
}

.player-right :deep(.el-select) {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(107, 195, 13, 0.2);
}

.player-right :deep(.el-input__wrapper) {
  background: transparent;
  border: 1px solid rgba(107, 195, 13, 0.3);
  color: var(--text-primary);
}

/* 动画定义 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes glow {
  from {
    filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.3));
  }
  to {
    filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.6));
  }
}

/* 移动端响应式优化 */
@media (max-width: 768px) {
  .music-tool {
    margin: 8px;
    padding: 12px;
  }
  
  .music-header {
    padding: 25px 12px;
    margin-bottom: 25px;
  }
  
  .music-header h1 {
    font-size: 1.8rem;
    margin-bottom: 15px;
  }
  
  .music-header p {
    font-size: 0.95rem;
  }
  
  .search-section {
    margin-bottom: 18px;
  }
  
  .search-section :deep(.el-tabs__content) {
    padding: 15px;
  }
  
  .search-box {
    max-width: 100%;
    margin-bottom: 15px;
  }
  
  /* 搜索结果列表移动端优化 */
  .search-results,
  .current-playing,
  .lyric-section,
  .playlist-section {
    padding: 12px;
    margin-bottom: 12px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  
  .search-results h3,
  .current-playing h3,
  .lyric-section h3,
  .playlist-section h3 {
    font-size: 1.3rem;
    margin-bottom: 20px;
    text-align: center;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  /* 音乐项目移动端布局 */
  .music-item {
    padding: 8px 12px;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    margin-bottom: 6px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    min-height: 58px;
    position: relative;
    overflow: hidden;
  }
  
  .music-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(107, 195, 13, 0.1), rgba(64, 158, 255, 0.1));
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: -1;
  }
  
  .music-item:hover::before,
  .music-item:active::before {
    opacity: 1;
  }
  
  .music-item:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(107, 195, 13, 0.5);
    box-shadow: 0 8px 32px rgba(107, 195, 13, 0.2);
  }
  
  .music-item:active {
    transform: scale(0.98);
    transition-duration: 0.1s;
  }
  
  .music-item.active {
    background: rgba(107, 195, 13, 0.15);
    border-color: rgba(107, 195, 13, 0.6);
    box-shadow: 0 0 20px rgba(107, 195, 13, 0.3);
  }
  
  .music-item.active::before {
    opacity: 1;
    background: linear-gradient(135deg, rgba(107, 195, 13, 0.2), rgba(107, 195, 13, 0.1));
  }
  
  /* 歌曲信息移动端样式 */
  .song-info {
    flex: 1;
    padding: 0;
    text-align: left;
    background: transparent;
    border: none;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  
  .song-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 3px;
    line-height: 1.2;
    color: var(--text-primary);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  
  .song-artist {
    font-size: 0.82rem;
    color: var(--text-secondary);
    margin-bottom: 1px;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.85;
  }
  
  .song-album {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-style: italic;
    opacity: 0.65;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  /* 操作按钮移动端优化 */
  .song-actions {
    flex-shrink: 0;
    display: flex;
    flex-direction: row;
    gap: 6px;
    width: auto;
    min-width: 90px;
    align-items: center;
  }
  
  .song-actions :deep(.el-button) {
    width: 36px;
    height: 36px;
    min-width: 36px;
    padding: 0;
    border-radius: 50%;
    font-size: 0.8rem;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: var(--text-primary);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .song-actions :deep(.el-button .el-icon) {
    margin: 0;
    font-size: 14px;
  }
  
  .song-actions :deep(.el-button span) {
    display: none;
  }
  
  .song-actions :deep(.el-button:hover) {
    background: rgba(107, 195, 13, 0.25);
    border-color: rgba(107, 195, 13, 0.4);
    transform: scale(1.05);
    box-shadow: 0 3px 12px rgba(107, 195, 13, 0.25);
  }
  
  .song-actions :deep(.el-button:active) {
    transform: scale(0.95);
    transition-duration: 0.1s;
  }
  
  /* 播放列表项目移动端优化 */
  .playlist-item {
    padding: 15px;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 10px;
    transition: all 0.3s ease;
  }
  
  .playlist-item:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(107, 195, 13, 0.3);
    transform: translateY(-1px);
  }
  
  .playlist-song-info {
    width: 100%;
    text-align: center;
    padding: 10px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 8px;
  }
  
  .playlist-song-info .song-title {
    font-size: 1rem;
    margin-bottom: 5px;
  }
  
  .playlist-song-info .song-artist {
    font-size: 0.85rem;
    margin-bottom: 3px;
  }
  
  .playlist-song-info .song-album {
    font-size: 0.8rem;
  }
  
  /* 固定播放器移动端优化 */
  .fixed-player {
    padding: 8px 0;
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    border-top: 2px solid rgba(107, 195, 13, 0.3);
  }
  
  .player-container {
    flex-direction: column;
    gap: 16px;
    padding: 16px 18px 20px;
    max-width: 100%;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    border-radius: 20px 20px 0 0;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.4);
  }
  
  .player-left {
    justify-content: center;
    min-width: auto;
    order: 1;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .player-left .song-cover {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    object-fit: cover;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  .player-left .song-info {
    flex: 1;
    min-width: 0;
  }
  
  .player-left .song-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: white;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .player-left .song-artist {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .player-center {
    width: 100%;
    min-width: auto;
    justify-content: center;
    order: 3;
  }
  
  .player-right {
    width: 100%;
    min-width: auto;
    justify-content: center;
    order: 2;
  }
  
  .player-controls {
    flex-direction: row;
    gap: 8px;
    max-width: 100%;
    justify-content: center;
    align-items: center;
    flex-wrap: nowrap;
    padding: 0 8px;
  }
  
  .player-controls .el-button {
    min-width: 44px;
    height: 44px;
    border-radius: 22px;
    font-size: 16px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .player-controls .el-button:hover {
    background: rgba(107, 195, 13, 0.3);
    border-color: rgba(107, 195, 13, 0.5);
    transform: scale(1.05);
  }
  
  /* 自定义播放器移动端适配 */
  .custom-audio-player {
    width: 100%;
    max-width: 100%;
    margin: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  
  .custom-controls {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    border-radius: 16px;
  }
  
  .progress-container {
    width: 100%;
    order: 1;
    gap: 12px;
  }
  
  .play-pause-btn {
    order: 2;
    width: 52px;
    height: 52px;
    border-radius: 26px;
    background: linear-gradient(135deg, #6bc30d 0%, #00C2FF 100%);
    border: none;
    box-shadow: 0 6px 20px rgba(107, 195, 13, 0.4);
    transition: all 0.3s ease;
    align-self: center;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .play-pause-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 8px 25px rgba(107, 195, 13, 0.6);
  }
  
  .play-pause-btn .el-icon {
    font-size: 24px;
    color: white;
  }
  
  .volume-control {
    order: 3;
    align-self: center;
  }
  
  .volume-btn {
    width: 44px;
    height: 44px;
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  
  .progress-bar {
    height: 36px;
    padding: 16px 0;
    cursor: pointer;
  }
  
  .progress-track {
    height: 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
  
  .progress-fill {
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(90deg, #6bc30d 0%, #00C2FF 100%);
  }
  
  .progress-thumb {
    width: 20px;
    height: 20px;
    opacity: 1;
    background: white;
    border: 3px solid #6bc30d;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  .time-display {
    font-size: 0.9rem;
    min-width: 50px;
    font-weight: 600;
    color: var(--text-primary);
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }
  
  .volume-slider {
    position: fixed;
    bottom: 140px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1001;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    padding: 16px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }
}

@media (max-width: 480px) {
  .music-header h1 {
    font-size: 1.8rem;
  }
  
  .search-section :deep(.el-tabs) {
    padding: 15px;
  }
  
  .search-results,
  .current-playing,
  .lyric-section,
  .playlist-section {
    padding: 20px;
  }
  
  .song-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .song-actions :deep(.el-button) {
    width: 100%;
  }
  
  /* 超小屏幕播放器优化 */
  .custom-controls {
    padding: 10px;
    gap: 10px;
  }
  
  .play-pause-btn {
    width: 45px;
    height: 45px;
  }
  
  .progress-container {
    gap: 8px;
  }
  
  .time-display {
    font-size: 0.8rem;
    min-width: 38px;
  }
  
  .progress-bar {
    height: 25px;
    padding: 10px 0;
  }
  
  .progress-track {
    height: 5px;
  }
  
  .progress-thumb {
    width: 14px;
    height: 14px;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  /* 进度条触摸优化 */
  .progress-thumb {
    opacity: 1 !important;
    width: 24px;
    height: 24px;
    background: white;
    border: 3px solid #6bc30d;
    box-shadow: 0 6px 20px rgba(107, 195, 13, 0.4);
    cursor: grab;
  }
  
  .progress-thumb:active {
    cursor: grabbing;
    transform: scale(1.2);
    box-shadow: 0 8px 25px rgba(107, 195, 13, 0.6);
  }
  
  .progress-bar {
    padding: 25px 0;
    cursor: pointer;
    touch-action: manipulation;
  }
  
  .progress-track {
    height: 6px;
    border-radius: 3px;
  }
  
  .progress-fill {
    height: 6px;
    border-radius: 3px;
  }
  
  /* 按钮触摸优化 */
  .play-pause-btn {
    min-width: 52px;
    min-height: 52px;
    touch-action: manipulation;
    border-radius: 50%;
    background: rgba(107, 195, 13, 0.9);
    border: 2px solid rgba(107, 195, 13, 0.6);
    box-shadow: 0 4px 16px rgba(107, 195, 13, 0.3);
    transition: all 0.2s ease;
  }
  
  .play-pause-btn:active {
    transform: scale(0.95);
    box-shadow: 0 2px 12px rgba(107, 195, 13, 0.5);
  }
  
  .volume-btn,
  .player-controls .el-button {
    min-width: 48px;
    min-height: 48px;
    touch-action: manipulation;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.25);
    transition: all 0.2s ease;
  }
  
  .volume-btn:active,
  .player-controls .el-button:active {
    transform: scale(0.95);
    background: rgba(107, 195, 13, 0.2);
    border-color: rgba(107, 195, 13, 0.4);
  }
  
  .song-actions :deep(.el-button) {
    width: 42px;
    height: 42px;
    min-width: 42px;
    min-height: 42px;
    touch-action: manipulation;
    border-radius: 50%;
  }
  
  /* 音乐项目触摸优化 */
  .music-item {
    padding: 16px 14px;
    touch-action: manipulation;
    min-height: 75px;
    margin-bottom: 12px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  
  .music-item:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(107, 195, 13, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  }
  
  .music-item:active {
    transform: scale(0.98) translateY(0);
    background: rgba(107, 195, 13, 0.08);
    border-color: rgba(107, 195, 13, 0.3);
    transition-duration: 0.1s;
  }
  
  /* 音量控制触摸优化 */
  .volume-control {
    position: relative;
  }
  
  .volume-control:hover .volume-slider {
    display: none;
  }
  
  .volume-control:active .volume-slider,
  .volume-control:focus-within .volume-slider,
  .volume-control.show-slider .volume-slider {
    display: block;
    opacity: 1;
    transform: translateX(-50%) scale(1);
    z-index: 1000;
  }
  
  .volume-slider {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateX(-50%) scale(0.9);
    opacity: 0;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(20px);
    border-radius: 12px;
    padding: 15px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  /* 搜索框触摸优化 */
  .search-box :deep(.el-input__inner) {
    min-height: 50px;
    font-size: 16px;
    border-radius: 25px;
    padding: 0 20px;
  }
  
  .search-box :deep(.el-input-group__append .el-button) {
    min-height: 50px;
    min-width: 70px;
    border-radius: 0 25px 25px 0;
  }
  
  /* 标签页触摸优化 */
  .search-section :deep(.el-tabs) {
    padding: 12px;
    border-radius: 15px;
  }
  
  .search-section :deep(.el-tabs__header) {
    margin-bottom: 15px;
  }
  
  .search-section :deep(.el-tabs__nav) {
    display: flex;
    justify-content: space-between;
    width: 100%;
    gap: 8px;
  }
  
  .search-section :deep(.el-tabs__item) {
    flex: 1;
    text-align: center;
    min-height: 48px;
    padding: 12px 8px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 12px;
    margin-right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  }
  
  .search-section :deep(.el-tabs__item:hover) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(107, 195, 13, 0.3);
    transform: translateY(-1px);
  }
  
  .search-section :deep(.el-tabs__item.is-active) {
    background: linear-gradient(135deg, #6bc30d 0%, #00C2FF 100%);
    color: white;
    border-color: transparent;
    box-shadow: 0 4px 15px rgba(107, 195, 13, 0.3);
    transform: translateY(-2px);
  }
  
  .search-section :deep(.el-tabs__active-bar) {
    display: none;
  }
  
  .search-section :deep(.el-tabs__content) {
    padding-top: 20px;
  }
  
  /* 时间显示触摸优化 */
  .time-display {
    font-size: 0.9rem;
    min-width: 45px;
    font-weight: 500;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
}

/* 横屏模式优化 */
@media (max-width: 768px) and (orientation: landscape) {
  .player-container {
    flex-direction: row;
    gap: 10px;
    padding: 10px 15px;
  }
  
  .player-left {
    min-width: 200px;
  }
  
  .player-center {
    order: 2;
  }
  
  .player-right {
    order: 3;
    min-width: 120px;
  }
  
  .custom-controls {
    flex-direction: row;
    gap: 10px;
    padding: 8px 12px;
  }
  
  .progress-container {
    order: 2;
  }
  
  .play-pause-btn {
    order: 1;
    width: 40px;
    height: 40px;
  }
  
  .volume-control {
    order: 3;
  }
}

/* 超小屏幕优化 */
@media (max-width: 320px) {
  .custom-controls {
    gap: 8px;
    padding: 8px;
  }
  
  .play-pause-btn {
    width: 40px;
    height: 40px;
  }
  
  .play-pause-btn .el-icon {
    font-size: 18px;
  }
  
  .progress-container {
    gap: 6px;
  }
  
  .time-display {
    font-size: 0.75rem;
    min-width: 35px;
  }
  
  .progress-track {
    height: 4px;
  }
  
  .progress-thumb {
    width: 12px;
    height: 12px;
  }
}

/* 高分辨率屏幕优化 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .progress-track,
  .progress-fill {
    border-radius: 3px;
  }
  
  .progress-thumb {
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.4);
  }
  
  .play-pause-btn,
  .volume-btn {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
  
  .custom-controls {
    box-shadow: 0 6px 30px rgba(0, 0, 0, 0.4);
  }
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  :root {
    --glass-bg: rgba(255, 255, 255, 0.05);
    --glass-border: rgba(255, 255, 255, 0.1);
  }
  
  .custom-controls {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.15);
  }
  
  .play-pause-btn {
    box-shadow: 0 4px 15px rgba(107, 195, 13, 0.4);
  }
  
  .progress-track {
    background: rgba(255, 255, 255, 0.15);
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .music-item,
  .playlist-item {
    border-width: 2px;
  }
  
  .music-header h1 {
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
  }
  
  .custom-controls {
    border-width: 2px;
  }
  
  .progress-track {
    background: rgba(255, 255, 255, 0.4);
  }
  
  .progress-thumb {
    border: 2px solid rgba(0, 0, 0, 0.8);
  }
}

/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  .progress-fill::after {
    animation: none;
  }
  
  .play-pause-btn .el-icon {
    animation: none;
  }
}

/* Element Plus 消息提示框移动端优化 */
@media (max-width: 768px) {
  /* 全局消息提示框样式优化 */
  :global(.el-message) {
    position: fixed !important;
    top: 20px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    width: auto !important;
    min-width: 200px !important;
    max-width: calc(100vw - 40px) !important;
    padding: 10px 16px !important;
    border-radius: 6px !important;
    font-size: 13px !important;
    line-height: 1.5 !important;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1) !important;
    z-index: 9999 !important;
    margin: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }
  
  :global(.el-message--success) {
    background: #67c23a !important;
    color: white !important;
    border: 1px solid #67c23a !important;
  }
  
  :global(.el-message--info) {
    background: #909399 !important;
    color: white !important;
    border: 1px solid #909399 !important;
  }
  
  :global(.el-message--warning) {
    background: #e6a23c !important;
    color: white !important;
    border: 1px solid #e6a23c !important;
  }
  
  :global(.el-message--error) {
    background: #f56c6c !important;
    color: white !important;
    border: 1px solid #f56c6c !important;
  }
  
  :global(.el-message__icon) {
    font-size: 14px !important;
    margin-right: 6px !important;
    flex-shrink: 0 !important;
  }
  
  :global(.el-message__content) {
    flex: 1 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }
  
  :global(.el-message__content) {
    font-weight: 500 !important;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
  }
  
  :global(.el-message .el-message__closeBtn) {
    font-size: 14px !important;
    color: rgba(255, 255, 255, 0.7) !important;
    right: 8px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    width: 20px !important;
    height: 20px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  
  :global(.el-message .el-message__closeBtn:hover) {
    color: white !important;
    background: rgba(255, 255, 255, 0.1) !important;
    border-radius: 50% !important;
  }
}
</style>