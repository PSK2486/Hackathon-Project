import { reactive, computed } from 'vue'

// API 基礎 URL
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5174/api'

// HTTP 請求工具函數
async function apiRequest(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    credentials: 'include', // 包含 cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '請求失敗' }))
    throw new Error(error.error || '請求失敗')
  }
  
  return response.json()
}

// 假資料課程清單
const state = reactive({
  courses: [
    {
      id: 1,
      title: '新人導向',
      description: '了解公司文化、願景與基本規範',
      category: '基礎訓練',
      required: true,
      durationMin: 60,
      tags: ['入職', '公司文化'],
      videoUrl: '/videos/course-1.mp4' // 本地影片檔案路徑
    },
    {
      id: 2,
      title: '資訊安全訓練',
      description: '學習密碼管理、釣魚郵件防範、社交工程意識',
      category: '基礎訓練',
      required: true,
      durationMin: 90,
      tags: ['資安', '必修'],
      videoUrl: '/videos/course-2.mp4' // 本地影片檔案路徑
    },
    {
      id: 3,
      title: '半導體製程基礎',
      description: '晶圓、光刻、蝕刻等核心流程入門課程',
      category: '專業技能',
      required: false,
      durationMin: 120,
      tags: ['半導體', '製程'],
      videoUrl: '/videos/course-3.mp4' // 本地影片檔案路徑
    },
    {
      id: 4,
      title: 'EUV 基礎安全',
      description: '極紫外光曝光機的操作安全規範',
      category: '專業技能',
      required: false,
      durationMin: 45,
      tags: ['EUV', '安全'],
      videoUrl: '/videos/course-4.mp4' // 本地影片檔案路徑
    },
    {
      id: 5,
      title: '職涯規劃與發展',
      description: '如何設定個人職涯目標與發展路徑',
      category: '職涯發展',
      required: false,
      durationMin: 75,
      tags: ['職涯', '發展'],
      videoUrl: '/videos/course-5.mp4' // 本地影片檔案路徑
    }
  ],
  // 紀錄每門課進度：0~100（從 API 載入）
  progress: {},
  // 紀錄每門課觀看時間（秒）（從 API 載入）
  watchTime: {},
  // 紀錄每門課實際影片長度（秒）（從 API 載入）
  videoDurations: {},
  // 載入狀態
  isLoading: false,
  isLoggedIn: false
})

// 取得單一課程進度
function courseProgress(c) {
  return state.progress[c.id] || 0
}

// 載入所有進度資料
async function loadProgress() {
  try {
    state.isLoading = true
    const data = await apiRequest('/progress/all')
    state.progress = data.progress || {}
    state.watchTime = data.watchTime || {}
    state.videoDurations = data.videoDurations || {}
    state.isLoggedIn = true
  } catch (error) {
    console.error('載入進度失敗：', error)
    state.isLoggedIn = false
    // 如果未登入，清空資料
    clearProgressData()
  } finally {
    state.isLoading = false
  }
}

// 清空進度資料
function clearProgressData() {
  state.progress = {}
  state.watchTime = {}
  state.videoDurations = {}
  state.isLoggedIn = false
}

// 載入影片實際長度並更新課程資料
async function loadVideoActualDuration(courseId, videoUrl) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    
    video.onloadedmetadata = () => {
      const durationSeconds = video.duration
      const durationMinutes = Math.ceil(durationSeconds / 60)
      
      console.log(`課程 ${courseId} 實際影片長度: ${durationSeconds} 秒 (${durationMinutes} 分鐘)`)
      
      // 更新課程的 durationMin
      const course = state.courses.find(c => c.id === courseId)
      if (course) {
        course.actualDurationMin = durationMinutes
        course.actualDurationSeconds = durationSeconds
      }
      
      // 同時更新到 videoDurations 狀態中
      state.videoDurations[courseId] = durationSeconds
      
      resolve(durationSeconds)
    }
    
    video.onerror = () => {
      console.warn(`無法載入課程 ${courseId} 的影片: ${videoUrl}`)
      reject(new Error('影片載入失敗'))
    }
    
    // 設置影片來源
    video.src = videoUrl
  })
}

// 載入所有課程的實際影片長度
async function loadAllVideosDuration() {
  console.log('開始載入所有課程的實際影片長度...')
  
  const loadPromises = state.courses.map(async (course) => {
    try {
      await loadVideoActualDuration(course.id, course.videoUrl)
    } catch (error) {
      console.warn(`課程 ${course.id} 影片長度載入失敗:`, error.message)
    }
  })
  
  await Promise.allSettled(loadPromises)
  console.log('所有課程影片長度載入完成')
}

// 更新進度（同時更新本地狀態和伺服器）
async function updateProgress(id, value) {
  state.progress[id] = value
  
  try {
    const watchedTime = state.watchTime[id] || 0
    const videoDuration = state.videoDurations[id] || 0
    
    await apiRequest('/progress/update', {
      method: 'POST',
      body: JSON.stringify({
        courseId: id,
        watchedTime,
        videoDuration,
        progressPercentage: value
      })
    })
  } catch (error) {
    console.error('更新進度失敗：', error)
    throw error
  }
}

// 更新觀看時間
async function updateWatchTime(id, seconds) {
  state.watchTime[id] = seconds
  
  try {
    const videoDuration = state.videoDurations[id] || 0
    const progressPercentage = videoDuration > 0 
      ? Math.min(100, Math.round((seconds / videoDuration) * 100))
      : 0
    
    await apiRequest('/progress/update', {
      method: 'POST',
      body: JSON.stringify({
        courseId: id,
        watchedTime: seconds,
        videoDuration,
        progressPercentage
      })
    })
    
    // 同時更新進度
    state.progress[id] = progressPercentage
  } catch (error) {
    console.error('更新觀看時間失敗：', error)
    throw error
  }
}

// 取得觀看時間
function getWatchTime(id) {
  return state.watchTime[id] || 0
}

// 更新影片實際長度
async function updateVideoDuration(id, duration) {
  state.videoDurations[id] = duration
  
  try {
    await apiRequest('/progress/duration', {
      method: 'POST',
      body: JSON.stringify({
        courseId: id,
        duration
      })
    })
  } catch (error) {
    console.error('更新影片長度失敗：', error)
    throw error
  }
}

// 取得影片實際長度
function getVideoDuration(id) {
  return state.videoDurations[id] || 0
}

// 重設課程進度
async function resetCourseProgress(id) {
  try {
    await apiRequest(`/progress/reset/${id}`, {
      method: 'POST'
    })
    
    // 更新本地狀態
    state.progress[id] = 0
    state.watchTime[id] = 0
  } catch (error) {
    console.error('重設進度失敗：', error)
    throw error
  }
}

// 檢查登入狀態
async function checkAuthStatus() {
  try {
    console.log('檢查登入狀態...')
    const response = await apiRequest('/auth/me')
    console.log('登入狀態檢查成功:', response)
    state.isLoggedIn = true
    return true
  } catch (error) {
    console.log('登入狀態檢查失敗:', error.message)
    state.isLoggedIn = false
    return false
  }
}

// 根據觀看時間計算進度（優先使用實際影片長度）
function calculateProgressFromWatchTime(course) {
  const watchedSeconds = getWatchTime(course.id)
  // 優先使用實際影片長度，如果沒有則使用設定值
  const actualDuration = getVideoDuration(course.id)
  const totalSeconds = actualDuration > 0 ? actualDuration : course.durationMin * 60
  
  if (totalSeconds <= 0) return 0
  const progress = Math.min(100, Math.round((watchedSeconds / totalSeconds) * 100))
  return progress
}

// 根據 ID 找課程
function getCourseById(id) {
  return state.courses.find(c => c.id === parseInt(id))
}

// 取得課程的實際時間長度（分鐘）
function getCourseDurationMin(course) {
  // 優先使用實際影片長度，如果沒有則使用預設值
  if (course.actualDurationMin) {
    return course.actualDurationMin
  }
  
  // 如果有從資料庫載入的影片長度，使用它
  const savedDuration = state.videoDurations[course.id]
  if (savedDuration > 0) {
    return Math.ceil(savedDuration / 60)
  }
  
  // 最後使用預設值
  return course.durationMin
}

// 取得課程的實際時間長度（秒）
function getCourseDurationSeconds(course) {
  // 優先使用實際影片長度
  if (course.actualDurationSeconds) {
    return course.actualDurationSeconds
  }
  
  // 如果有從資料庫載入的影片長度，使用它
  const savedDuration = state.videoDurations[course.id]
  if (savedDuration > 0) {
    return savedDuration
  }
  
  // 最後使用預設值轉換為秒
  return course.durationMin * 60
}

// 計算摘要（必修平均完成度）
const summary = reactive({
  requiredAvg: computed(() => {
    const requiredCourses = state.courses.filter(c => c.required)
    if (!requiredCourses.length) return 0
    const total = requiredCourses.reduce((acc, c) => acc + courseProgress(c), 0)
    return Math.round(total / requiredCourses.length)
  })
})

export default {
  state,
  summary,
  courseProgress,
  loadProgress,
  updateProgress,
  updateWatchTime,
  getWatchTime,
  updateVideoDuration,
  getVideoDuration,
  resetCourseProgress,
  checkAuthStatus,
  calculateProgressFromWatchTime,
  getCourseById,
  clearProgressData,
  loadVideoActualDuration,
  loadAllVideosDuration,
  getCourseDurationMin,
  getCourseDurationSeconds
}