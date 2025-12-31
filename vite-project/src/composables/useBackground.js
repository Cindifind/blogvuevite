// 背景轮播相关逻辑
export function setupBackgroundCarousel() {
    return new Promise((resolve) => {
        const section1 = document.getElementById('section1')
        const currentLayer = document.getElementById('current-layer')
        const nextLayer = document.getElementById('next-layer')

        if (!section1 || !currentLayer || !nextLayer) {
            console.error('缺少必要的DOM元素')
            resolve(false)
            return
        }

        const transitionDuration = 2000 // 过渡动画时长（2秒）
        const displayDuration = 10000 // 每张图片显示10秒
        const totalCycle = transitionDuration + displayDuration
        let isTransitioning = false

        // 生成图片URL（避免缓存）
        function getNewImageUrl() {
            return `https://eopageapi.2x.nz/pic?img=ua&t=${Date.now()}`
        }

        // 预加载图片
        function preloadImage(url) {
            return new Promise((resolve, reject) => {
                const img = new Image()
                img.onload = () => resolve(url)
                img.onerror = () => reject(url)
                img.src = url
            })
        }

        // 切换图片（核心修复）
        async function switchImage() {
            if (isTransitioning) return
            isTransitioning = true

            try {
                // 1. 预加载下一张图片（确保完全加载）
                const nextImageUrl = getNewImageUrl()
                await preloadImage(nextImageUrl)
                nextLayer.style.backgroundImage = `url('${nextImageUrl}')`

                // 2. 开始过渡：当前层淡出，下一层淡入（同步执行）
                currentLayer.style.opacity = '0'
                nextLayer.style.opacity = '1'

                // 3. 等待过渡完全结束
                await new Promise(resolve => setTimeout(resolve, transitionDuration))

                // 4. 重置状态（关键修复：先禁用过渡，避免重置时触发动画）
                currentLayer.style.transition = 'none' // 临时禁用过渡
                nextLayer.style.transition = 'none'

                // 同步更新状态：当前层接管下一层的图片，下一层隐藏
                currentLayer.style.backgroundImage = nextLayer.style.backgroundImage
                currentLayer.style.opacity = '1' // 立即显示，无过渡
                nextLayer.style.opacity = '0' // 立即隐藏，无过渡

                // 5. 恢复过渡效果（为下一次切换做准备）
                setTimeout(() => {
                    currentLayer.style.transition = '' // 恢复默认过渡
                    nextLayer.style.transition = ''
                    isTransitioning = false
                }, 50) // 微小延迟确保样式已生效

            } catch (error) {
                console.error('切换失败，重试中...')
                isTransitioning = false
                setTimeout(switchImage, 3000)
            }
        }

        // 初始化
        async function init() {
            try {
                // 初始加载第一张图（当前层）
                const firstUrl = getNewImageUrl()
                await preloadImage(firstUrl)
                currentLayer.style.backgroundImage = `url('${firstUrl}')`
                currentLayer.style.opacity = '1'

                // 预加载第二张图（下一层）
                const secondUrl = getNewImageUrl()
                await preloadImage(secondUrl)
                nextLayer.style.backgroundImage = `url('${secondUrl}')`
                nextLayer.style.opacity = '0'

                // 启动轮播
                setTimeout(function cycle() {
                    switchImage().then(() => {
                        setTimeout(cycle, totalCycle)
                    })
                }, displayDuration)

                resolve(true)
            } catch (error) {
                console.error('初始化失败，重试中...')
                setTimeout(init, 3000)
            }
        }

        init()
        resolve(true)
    })
}

// 导出其他可能需要的背景相关函数
export function updateBackground() {
    // 可以添加手动更新背景的逻辑
    return setupBackgroundCarousel()
}