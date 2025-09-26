<template>
  <div class="course-detail" v-if="course">
    <!-- 課程標題區 -->
    <header class="course-header card">
      <div class="header-content">
        <router-link to="/training" class="back-btn">
          ← 返回課程列表
        </router-link>
        <h1 class="course-title">{{ course.title }}</h1>
        <p class="course-desc">{{ course.description }}</p>
        <div class="course-meta">
          <span class="pill" :class="course.required ? 'red' : 'green'">
            {{ course.required ? '必修' : '選修' }}
          </span>
          <span class="meta-item">⏱️ {{ training.getCourseDurationMin(course) }} 分鐘</span>
          <span class="meta-item">🏷️ {{ course.category }}</span>
        </div>
      </div>
      <div class="progress-info">
        <div class="progress-circle">
          <div class="circle-progress" :style="circleStyle">
            <span class="progress-text">{{ currentProgress }}%</span>
          </div>
        </div>
        <div class="progress-details">
          <div class="progress-label">完成進度</div>
          <div class="time-info">
            觀看時間：{{ formatTime(watchedTime) }} / {{ formatTime(videoDuration || course.durationMin * 60) }}
          </div>
        </div>
      </div>
    </header>

    <!-- 影片播放區 -->
    <section class="video-section card">
      <div class="video-container" ref="videoContainer">
        <video
          ref="videoPlayer"
          :src="course.videoUrl"
          class="video-player"
          preload="metadata"
          @loadedmetadata="onVideoLoaded"
          @timeupdate="onTimeUpdate"
          @play="onVideoPlay"
          @pause="onVideoPause"
          @ended="onVideoEnded"
          @seeking="onVideoSeeking"
          @seeked="onVideoSeeked"
          :controls="isWatching && !showFastForwardWarning"
          controlslist="nodownload noplaybackrate"
          disablePictureInPicture
        >
          您的瀏覽器不支援 video 標籤。
        </video>
        
        <!-- 防快轉遮罩 -->
        <div v-if="showFastForwardWarning" class="fast-forward-warning">
          <div class="warning-content">
            <h3>⚠️ 請勿快轉</h3>
            <p>為確保學習效果，請按順序觀看課程內容</p>
            <p>系統偵測到您嘗試跳到 {{ formatTime(seekToTime) }}</p>
            <p>請從 {{ formatTime(maxWatchedTime) }} 繼續觀看</p>
            <button @click="handleWarningClose" class="btn">我知道了</button>
          </div>
        </div>

        <!-- 開始學習覆蓋層 -->
        <div class="start-overlay" v-if="!isWatching && !isCompleted">
          <div class="overlay-content">
            <h3>📺 開始學習課程</h3>
            <p>{{ course.title }}</p>
            <p class="warning-text">⚠️ 請勿快轉，必須完整觀看才能完成課程</p>
            <button @click="startWatching" class="btn start-btn">開始學習</button>
          </div>
        </div>

        <!-- 已完成覆蓋層 -->
        <div class="completion-overlay" v-if="isCompleted">
          <div class="overlay-content success">
            <h3>🎉 課程已完成</h3>
            <p>恭喜您完成了《{{ course.title }}》！</p>
            <div class="completion-stats">
              <div class="stat">
                <span class="stat-value">{{ formatTime(watchedTime) }}</span>
                <span class="stat-label">總觀看時間</span>
              </div>
              <div class="stat">
                <span class="stat-value">100%</span>
                <span class="stat-label">完成度</span>
              </div>
            </div>
            <div class="completion-actions">
              <router-link to="/training" class="btn">返回課程列表</router-link>
              <button @click="restartCourse" class="btn secondary">重新學習</button>
            </div>
          </div>
        </div>

        
        
        <!-- 登入狀態丟失彈窗 -->
        <div v-if="showAuthLostModal" class="auth-lost-overlay">
          <div class="auth-lost-modal">
            <div class="modal-header">
              <h3>🔒 登入狀態已過期</h3>
            </div>
            <div class="modal-body">
              <p>為了保護您的學習進度，系統偵測到您的登入狀態已過期。</p>
              <p>影片已自動暫停，請重新登入後繼續學習。</p>
            </div>
            <div class="modal-actions">
              <button @click="handleRelogin" class="btn primary">重新登入</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 播放控制資訊 -->
      <div class="video-info">
        <div class="video-stats">
          <div class="stat">
            <span class="stat-label">學習狀態：</span>
            <span class="stat-value" :class="{ 'active': isWatching, 'completed': isCompleted }">
              {{ isCompleted ? '已完成' : (isWatching ? '學習中' : '尚未開始') }}
            </span>
          </div>
          <div class="stat">
            <span class="stat-label">最遠觀看進度：</span>
            <span class="stat-value">{{ formatTime(maxWatchedTime) }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">影片總長度：</span>
            <span class="stat-value">{{ formatTime(videoDuration) }}</span>
          </div>
        </div>
        <div class="learning-controls" v-if="isWatching && !isCompleted">
          <div class="auto-complete-info">
            <span class="info-icon">ℹ️</span>
            <span>系統將在您完整觀看後自動標記完成</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 學習說明 -->
    <section class="learning-guide card">
      <h2>學習指南</h2>
      <div class="guide-content">
        <div class="guide-item">
          <span class="guide-icon">🎯</span>
          <div>
            <h4>學習目標</h4>
            <p>完整觀看影片內容，理解課程重點</p>
          </div>
        </div>
        <div class="guide-item">
          <span class="guide-icon">⚠️</span>
          <div>
            <h4>重要提醒</h4>
            <p>系統會偵測快轉行為，請按順序觀看以確保學習效果</p>
          </div>
        </div>
        <div class="guide-item">
          <span class="guide-icon">⏱️</span>
          <div>
            <h4>時間安排</h4>
            <p>預計學習時間：{{ training.getCourseDurationMin(course) }} 分鐘</p>
          </div>
        </div>
        <div class="guide-item">
          <span class="guide-icon">📝</span>
          <div>
            <h4>學習建議</h4>
            <p>可以暫停做筆記，但請確保完整觀看所有內容</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 課程內容 -->
    <section class="course-content card">
      <h2>課程內容</h2>
      <p>{{ course.description }}</p>
      <div class="tags" v-if="course.tags && course.tags.length">
        <span class="tag" v-for="tag in course.tags" :key="tag">#{{ tag }}</span>
      </div>
    </section>
  </div>
  
  <div v-else class="loading card">
    <div>載入課程資料中...</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import training from '../router/training'

const route = useRoute()
const router = useRouter()

// 響應式數據
const course = ref(null)
const videoPlayer = ref(null)
const watchedTime = ref(0)
const maxWatchedTime = ref(0)
const currentVideoTime = ref(0)
const videoDuration = ref(0)
const isWatching = ref(false)
const showFastForwardWarning = ref(false)
const seekToTime = ref(0)
const progressInterval = ref(null)
const lastAuthCheck = ref(0)
const showAuthLostModal = ref(false)

// 計算屬性
const currentProgress = computed(() => {
  if (!course.value || !videoDuration.value || videoDuration.value === 0) return 0
  return Math.min(100, Math.round((watchedTime.value / videoDuration.value) * 100))
})

const circleStyle = computed(() => {
  const progress = currentProgress.value
  const circumference = 2 * Math.PI * 45 // 半徑 45px
  const offset = circumference - (progress / 100) * circumference
  return {
    strokeDasharray: `${circumference}`,
    strokeDashoffset: `${offset}`
  }
})

const isCompleted = computed(() => currentProgress.value >= 100)

// 工具函數
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 影片事件處理
const onVideoLoaded = () => {
  if (videoPlayer.value && videoPlayer.value.duration) {
    videoDuration.value = videoPlayer.value.duration
    
    // 儲存實際影片長度
    training.updateVideoDuration(course.value.id, videoDuration.value)
    
    console.log('影片載入完成，實際長度：', formatTime(videoDuration.value))
    console.log('設定長度：', formatTime(course.value.durationMin * 60))
    
    // 如果實際影片長度與設定不符，發出警告
    const settingDuration = course.value.durationMin * 60
    const timeDifference = Math.abs(videoDuration.value - settingDuration)
    if (timeDifference > 60) { // 差異超過1分鐘
      console.warn(`影片長度不符：實際 ${formatTime(videoDuration.value)}，設定 ${formatTime(settingDuration)}`)
    }
  } else {
    // 嘗試從儲存中取得之前記錄的影片長度
    const savedDuration = training.getVideoDuration(course.value.id)
    if (savedDuration > 0) {
      videoDuration.value = savedDuration
      console.log('使用已儲存的影片長度：', formatTime(videoDuration.value))
    } else {
      // 如果無法取得影片長度，使用設定值作為備用
      videoDuration.value = course.value.durationMin * 60
      console.warn('無法取得影片實際長度，使用設定值：', formatTime(videoDuration.value))
    }
  }
}

const onTimeUpdate = async () => {
  if (!videoPlayer.value || !isWatching.value) return
  
  currentVideoTime.value = videoPlayer.value.currentTime
  
  // 每 5 分鐘檢查一次登入狀態（避免過於頻繁）
  const now = Date.now()
  if (!lastAuthCheck.value || now - lastAuthCheck.value > 300000) { // 5 分鐘 = 300000ms
    lastAuthCheck.value = now
    try {
      const isStillLoggedIn = await training.checkAuthStatus()
      if (!isStillLoggedIn) {
        handleAuthLost()
        return
      }
    } catch (error) {
      console.warn('登入狀態檢查出錯，但不中斷播放:', error.message)
      // 不要因為網路問題就中斷播放
    }
  }
  
  // 防快轉檢查
  if (currentVideoTime.value > maxWatchedTime.value + 3) { // 允許 3 秒緩衝
    showFastForwardWarning.value = true
    seekToTime.value = currentVideoTime.value
    videoPlayer.value.pause()
    return
  }
  
  // 正常更新觀看進度
  if (currentVideoTime.value > watchedTime.value) {
    watchedTime.value = currentVideoTime.value
    maxWatchedTime.value = Math.max(maxWatchedTime.value, watchedTime.value)
    
    // 儲存進度（使用實際觀看時間）
    try {
      await training.updateWatchTime(course.value.id, watchedTime.value)
      
      // 計算進度（基於實際影片長度）
      if (videoDuration.value > 0) {
        const progress = Math.min(100, Math.round((watchedTime.value / videoDuration.value) * 100))
        await training.updateProgress(course.value.id, progress)
      }
    } catch (error) {
      console.warn('進度更新失敗:', error.message)
      // 只有在明確是認證錯誤時才中斷播放
      if (error.message.includes('401') || error.message.includes('未登入') || error.message.includes('登入逾期')) {
        console.log('偵測到認證問題，執行登入狀態檢查...')
        // 再次確認登入狀態
        const isStillLoggedIn = await training.checkAuthStatus()
        if (!isStillLoggedIn) {
          handleAuthLost()
        }
      }
      // 其他錯誤（如網路問題）不中斷播放
    }
  }
}

const onVideoPlay = () => {
  console.log('影片開始播放')
}

const onVideoPause = () => {
  console.log('影片暫停')
}

const onVideoEnded = () => {
  console.log('影片播放結束')
  // 確保標記為完成（使用實際影片長度）
  if (videoDuration.value > 0) {
    watchedTime.value = videoDuration.value
    maxWatchedTime.value = videoDuration.value
    training.updateWatchTime(course.value.id, watchedTime.value)
    training.updateProgress(course.value.id, 100)
    
    setTimeout(() => {
      alert('🎉 恭喜！您已完成本課程學習！')
    }, 500)
  }
}

const onVideoSeeking = () => {
  if (!isWatching.value) return
  
  const seekTime = videoPlayer.value.currentTime
  
  // 如果試圖快轉到未觀看的部分
  if (seekTime > maxWatchedTime.value + 3) {
    showFastForwardWarning.value = true
    seekToTime.value = seekTime
  }
}

const onVideoSeeked = () => {
  if (showFastForwardWarning.value) {
    // 強制回到最遠觀看位置
    videoPlayer.value.currentTime = maxWatchedTime.value
  }
}

// 開始觀看
const startWatching = async () => {
  isWatching.value = true
  await nextTick()
  
  if (videoPlayer.value) {
    // 從最遠觀看位置開始
    videoPlayer.value.currentTime = maxWatchedTime.value
    videoPlayer.value.play().catch(error => {
      console.error('播放失敗：', error)
      alert('影片播放失敗，請檢查影片檔案是否存在')
    })
  }
}

// 處理警告關閉
const handleWarningClose = () => {
  showFastForwardWarning.value = false
  
  if (videoPlayer.value) {
    // 回到最遠觀看位置
    videoPlayer.value.currentTime = maxWatchedTime.value
    videoPlayer.value.play().catch(error => {
      console.error('播放失敗：', error)
    })
  }
}

// 重新開始課程
const restartCourse = async () => {
  if (confirm('確定要重新開始學習這門課程嗎？這將清除目前的學習進度。')) {
    try {
      // 重設所有進度相關變數
      watchedTime.value = 0
      maxWatchedTime.value = 0
      currentVideoTime.value = 0
      isWatching.value = false
      showFastForwardWarning.value = false
      
      // 清除伺服器上的進度
      await training.resetCourseProgress(course.value.id)
      
      // 重設影片播放位置
      if (videoPlayer.value) {
        videoPlayer.value.currentTime = 0
        videoPlayer.value.pause()
      }
      
      alert('課程進度已重設')
    } catch (error) {
      console.error('重設課程失敗：', error)
      alert('重設課程失敗，請稍後再試')
    }
  }
}

// 處理登入狀態丟失
const handleAuthLost = () => {
  // 立即暫停影片
  if (videoPlayer.value) {
    videoPlayer.value.pause()
  }
  
  // 停止觀看狀態
  isWatching.value = false
  showAuthLostModal.value = true
  
  console.warn('偵測到登入狀態已過期，影片已暫停')
}

// 處理重新登入
const handleRelogin = () => {
  showAuthLostModal.value = false
  // 直接刷新頁面到登入頁，確保清除所有狀態
  window.location.href = '/login'
}

// 初始化
onMounted(async () => {
  const courseId = route.params.id
  course.value = training.getCourseById(courseId)
  
  if (!course.value) {
    router.push('/training')
    return
  }

  // 檢查登入狀態
  const isLoggedIn = await training.checkAuthStatus()
  if (!isLoggedIn) {
    alert('請先登入才能觀看課程')
    router.push('/login')
    return
  }

  // 載入進度資料
  try {
    await training.loadProgress()
    
    // 載入已觀看的時間和影片長度
    watchedTime.value = training.getWatchTime(course.value.id)
    maxWatchedTime.value = watchedTime.value
    
    // 嘗試載入已儲存的影片長度
    const savedDuration = training.getVideoDuration(course.value.id)
    if (savedDuration > 0) {
      videoDuration.value = savedDuration
      console.log('載入已儲存的影片長度：', formatTime(videoDuration.value))
    }
    
    // 載入當前課程的實際影片時間長度
    try {
      await training.loadVideoActualDuration(course.value.id, course.value.videoUrl)
      console.log('當前課程影片時間長度載入完成')
    } catch (error) {
      console.warn('載入當前課程影片時間長度失敗:', error)
    }
  } catch (error) {
    console.error('載入課程資料失敗：', error)
    alert('載入課程資料失敗，請重新登入')
    router.push('/login')
  }
})

// 清理
onUnmounted(() => {
  if (progressInterval.value) {
    clearInterval(progressInterval.value)
  }
})

// 監聽路由變化
watch(() => route.params.id, (newId) => {
  if (newId) {
    course.value = training.getCourseById(newId)
    if (course.value) {
      watchedTime.value = training.getWatchTime(course.value.id)
      maxWatchedTime.value = watchedTime.value
      isWatching.value = false
      showFastForwardWarning.value = false
      
      if (videoPlayer.value) {
        videoPlayer.value.pause()
        videoPlayer.value.currentTime = maxWatchedTime.value
      }
    }
  }
})
</script>

<style scoped>
.course-detail {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 課程標題區 */
.course-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 20px;
}

.back-btn {
  color: var(--info);
  text-decoration: none;
  font-weight: 600;
  margin-bottom: 10px;
  display: inline-block;
}

.back-btn:hover {
  text-decoration: underline;
}

.course-title {
  margin: 0 0 10px 0;
  color: var(--text);
  font-size: 28px;
}

.course-desc {
  color: var(--text-light);
  margin: 0 0 15px 0;
  font-size: 16px;
  line-height: 1.5;
}

.course-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.pill {
  padding: 4px 12px;
  border-radius: 999px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.pill.red { background: var(--info); }
.pill.green { background: var(--success); }

.meta-item {
  font-size: 14px;
  color: var(--text-light);
}

/* 進度資訊 */
.progress-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.progress-circle {
  position: relative;
  width: 100px;
  height: 100px;
}

.circle-progress {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: conic-gradient(var(--primary) 0deg, #e0e0e0 0deg);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.circle-progress::before {
  content: '';
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #fff;
}

.progress-text {
  position: relative;
  z-index: 1;
  font-weight: bold;
  font-size: 16px;
  color: var(--text);
}

.progress-details {
  text-align: left;
}

.progress-label {
  font-size: 14px;
  color: var(--text-light);
  margin-bottom: 5px;
}

.time-info {
  font-size: 13px;
  color: var(--text-light);
}

/* 影片區域 */
.video-section {
  margin-bottom: 20px;
}

.video-container {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 比例 */
  height: 0;
  margin-bottom: 15px;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
}

.video-player {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 8px;
}

/* 覆蓋層樣式 */
.start-overlay,
.completion-overlay,
.fast-forward-warning {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 8px;
}

.start-overlay {
  background: rgba(0, 0, 0, 0.8);
}

.completion-overlay {
  background: rgba(76, 175, 80, 0.95);
}

.fast-forward-warning {
  background: rgba(0, 0, 0, 0.9);
  z-index: 15;
}

.overlay-content {
  background: #fff;
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  max-width: 450px;
}

.overlay-content h3 {
  margin: 0 0 15px 0;
  color: var(--text);
  font-size: 22px;
}

.overlay-content p {
  margin: 0 0 10px 0;
  color: var(--text-light);
  line-height: 1.5;
}

.warning-text {
  color: #ff6b35 !important;
  font-weight: 600;
  font-size: 14px;
}

.overlay-content.success {
  border: 3px solid var(--success);
}

.overlay-content.success h3 {
  color: var(--success);
  font-size: 24px;
}

.fast-forward-warning .overlay-content {
  border: 3px solid #ff6b35;
}

.fast-forward-warning h3 {
  color: #ff6b35 !important;
}

.completion-stats {
  display: flex;
  gap: 30px;
  justify-content: center;
  margin: 20px 0;
}

.completion-stats .stat {
  text-align: center;
}

.completion-stats .stat-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: var(--success);
  margin-bottom: 5px;
}

.completion-stats .stat-label {
  font-size: 12px;
  color: var(--text-light);
}

.completion-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
}

/* 已移除影片上方進度指示器樣式 */

/* 影片資訊 */
.video-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  flex-wrap: wrap;
  gap: 15px;
}

.video-stats {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-light);
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.stat-value.active {
  color: var(--info);
}

.stat-value.completed {
  color: var(--success);
}

.auto-complete-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #e3f2fd;
  border: 1px solid #bbdefb;
  border-radius: 6px;
  font-size: 14px;
  color: var(--info);
}

.info-icon {
  font-size: 16px;
}

/* 學習指南 */
.learning-guide h2 {
  margin: 0 0 20px 0;
  color: var(--text);
}

.guide-content {
  display: grid;
  gap: 15px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.guide-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.guide-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.guide-item h4 {
  margin: 0 0 5px 0;
  color: var(--text);
  font-size: 16px;
}

.guide-item p {
  margin: 0;
  color: var(--text-light);
  font-size: 14px;
  line-height: 1.5;
}

/* 課程內容 */
.course-content h2 {
  margin: 0 0 15px 0;
  color: var(--text);
}

.course-content p {
  color: var(--text-light);
  line-height: 1.6;
  margin-bottom: 15px;
}

.tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  background: #f1f1f1;
  color: var(--text);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
}

/* 載入狀態 */
.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: var(--text-light);
}

/* 按鈕 */
.btn {
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition: background 0.3s;
}

.btn:hover {
  background: var(--primary-dark);
}

.btn.secondary {
  background: #6c757d;
}

.btn.secondary:hover {
  background: #545b62;
}

.start-btn {
  background: var(--success);
  font-size: 16px;
  padding: 12px 24px;
}

.start-btn:hover {
  background: #218838;
}

/* 登入狀態丟失彈窗樣式 */
.auth-lost-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.auth-lost-modal {
  background: white;
  border-radius: 12px;
  padding: 0;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
}

.modal-header {
  background: linear-gradient(135deg, #dc3545, #c82333);
  color: white;
  padding: 20px 24px;
  border-radius: 12px 12px 0 0;
  text-align: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.modal-body {
  padding: 24px;
  text-align: center;
  color: #333;
  line-height: 1.6;
}

.modal-body p {
  margin: 0 0 12px 0;
}

.modal-actions {
  padding: 0 24px 24px 24px;
  text-align: center;
}

.modal-actions .btn.primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 32px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.modal-actions .btn.primary:hover {
  background: #0056b3;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-50px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 響應式設計 */
@media (max-width: 768px) {
  .course-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .progress-info {
    width: 100%;
    justify-content: center;
  }
  
  .video-info {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
  
  .video-stats {
    flex-direction: column;
    gap: 10px;
  }

  .guide-content {
    grid-template-columns: 1fr;
  }

  .completion-actions {
    flex-direction: column;
  }

  .completion-stats {
    gap: 20px;
  }
}
</style>