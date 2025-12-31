<template>
  <div class="song-list">
    <h3 v-if="title">{{ title }}</h3>
    
    <!-- 歌曲列表 -->
    <div class="song-items" :class="listType">
      <div
        v-for="(song, index) in songs"
        :key="index"
        class="song-item"
        :class="{ active: currentSong?.id === song.id }"
        @click="$emit('playSong', song)"
      >
        <!-- 歌曲信息 -->
        <div class="song-info">
          <div class="song-title">{{ song.name }}</div>
          <div class="song-artist">{{ getArtistName(song) }}</div>
          <div v-if="song.album" class="song-album">{{ song.album }}</div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="song-actions">
          <!-- 下载按钮 -->
          <el-button 
            type="primary" 
            size="small" 
            :icon="Download" 
            @click="$emit('download-song', song)"
            title="下载音乐"
          >
            下载
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 删除不再需要的图标导入
import { Download } from '@element-plus/icons-vue'

// Props
const props = defineProps({
  songs: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    default: ''
  },
  listType: {
    type: String,
    default: 'search', // 'search' | 'playlist'
    validator: (value) => ['search', 'playlist'].includes(value)
  },
  currentSong: {
    type: Object,
    default: null
  },
  loadingInfo: {
    type: [String, Number],
    default: null
  },
  loadingPlaylistInfo: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits([
  'playSong',
  'download-song'
])

// Methods
const getArtistName = (song) => {
  // 统一使用artistsname字段，如果不存在则使用artist字段作为备选
  return song.artistsname || song.artist || '未知艺术家'
}
</script>

<style scoped>
.song-list {
  margin-bottom: 30px;
}

.song-list h3 {
  color: var(--text-primary);
  margin-bottom: 20px;
  font-size: 1.4rem;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.playlist-controls {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.song-items {
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-height: 500px;
  overflow-y: auto;
  padding-right: 10px;
}

.song-items::-webkit-scrollbar {
  width: 8px;
}

.song-items::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.song-items::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  transition: var(--transition);
}

.song-items::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
}

.song-item {
  display: flex;
  align-items: flex-start;
  padding: 20px;
  background: var(--glass-bg);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: var(--transition);
  position: relative;
  overflow: hidden;
  min-height: 80px;
}

.song-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.6s ease;
}

.song-item:hover::before {
  left: 100%;
}

.song-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
  border-color: rgba(255, 255, 255, 0.3);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
}

.song-item.active {
  border: 2px solid #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
}

.song-info {
  flex: 1;
  margin-left: 15px;
  min-width: 0;
  padding-top: 5px;
}

.song-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 5px;
  word-wrap: break-word;
  word-break: break-all;
  line-height: 1.4;
}

.song-artist {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 3px;
  word-wrap: break-word;
  word-break: break-all;
  line-height: 1.3;
}

.song-album {
  font-size: 0.8rem;
  color: var(--text-muted);
  word-wrap: break-word;
  word-break: break-all;
  line-height: 1.3;
}

.song-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 5px;
}

.song-actions .el-button {
  border-radius: var(--border-radius-small);
  transition: var(--transition);
}

.song-actions .el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .song-item {
    padding: 15px;
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .song-info {
    margin-left: 0;
    width: 100%;
  }
  
  .song-actions {
    width: 100%;
    justify-content: center;
  }
  
  .playlist-controls {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .song-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .song-actions .el-button {
    width: 100%;
  }
}
</style>