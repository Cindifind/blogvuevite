// src/stores/music.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 音乐共享状态 store
 * GuiMusicPlayer.vue 与 MusicTool.vue 通过此 store 共享同一份歌单数据，
 * 避免重复拉取，并保证两个视图（全局播放器列表 / 工具页列表）始终保持同步。
 */
export const useMusicStore = defineStore('music', () => {
    /** 共享歌单列表（同一份） */
    const playlist = ref([])
    /** 当前播放歌曲 */
    const currentSong = ref(null)
    /** 当前播放索引 */
    const currentIndex = ref(0)
    /** 播放状态 */
    const isPlaying = ref(false)
    /** 歌单 ID */
    const playlistId = ref('')
    /** 音质 */
    const selectedQuality = ref('standard')
    /** 主题 */
    const selectedTheme = ref('gui-girlPink')
    /** 歌词 */
    const lyricLines = ref([])
    /** 当前播放列表（可能与 playlist 不同，如搜索结果） */
    const currentPlaylist = ref([])

    const hasPlaylist = computed(() => playlist.value.length > 0)

    /** 设置歌单（共享同一份数据） */
    function setPlaylist(songs, id = '') {
        playlist.value = Array.isArray(songs) ? [...songs] : []
        currentPlaylist.value = [...playlist.value]
        if (id) {
            playlistId.value = String(id)
        }
    }

    /** 设置当前歌曲 */
    function setCurrentSong(song, index = -1) {
        currentSong.value = song
        if (index >= 0) {
            currentIndex.value = index
        } else if (song && currentPlaylist.value.length) {
            const found = currentPlaylist.value.findIndex(s => s?.id === song?.id)
            if (found >= 0) currentIndex.value = found
        }
    }

    /** 设置当前播放列表（用于搜索结果等场景） */
    function setCurrentPlaylist(songs) {
        currentPlaylist.value = Array.isArray(songs) ? [...songs] : []
    }

    function setPlaying(playing) {
        isPlaying.value = !!playing
    }

    function setPlaylistId(id) {
        playlistId.value = String(id || '')
    }

    function setQuality(quality) {
        selectedQuality.value = quality
    }

    function setTheme(theme) {
        selectedTheme.value = theme
    }

    function setLyricLines(lines) {
        lyricLines.value = Array.isArray(lines) ? lines : []
    }

    /** 清空歌单 */
    function clearPlaylist() {
        playlist.value = []
        currentPlaylist.value = []
        currentSong.value = null
        currentIndex.value = 0
        isPlaying.value = false
        lyricLines.value = []
    }

    return {
        // state
        playlist,
        currentSong,
        currentIndex,
        isPlaying,
        playlistId,
        selectedQuality,
        selectedTheme,
        lyricLines,
        currentPlaylist,
        // getters
        hasPlaylist,
        // actions
        setPlaylist,
        setCurrentSong,
        setCurrentPlaylist,
        setPlaying,
        setPlaylistId,
        setQuality,
        setTheme,
        setLyricLines,
        clearPlaylist
    }
})
