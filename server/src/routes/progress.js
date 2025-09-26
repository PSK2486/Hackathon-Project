import express from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../index.js'

const router = express.Router()

// JWT 驗證中間件
function requireAuth(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ error: '需要登入才能訪問' })
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret' // 與 auth.js 保持一致
    const decoded = jwt.verify(token, JWT_SECRET)
    // 將 uid 映射到 id，以保持向後相容性
    req.user = { 
      id: decoded.uid || decoded.id,
      ...decoded 
    }
    next()
  } catch (error) {
    return res.status(401).json({ error: '無效的登入令牌' })
  }
}

// 取得用戶的所有課程進度
router.get('/all', requireAuth, async (req, res) => {
  try {
    // 定義所有可用的課程 ID（與前端 training.js 保持一致）
    const allCourseIds = [1, 2, 3, 4, 5]
    
    const [rows] = await db.query(
      'SELECT * FROM course_progress WHERE user_id = ?',
      [req.user.id]
    )
    
    // 轉換成前端期望的格式
    const progress = {}
    const watchTime = {}
    const videoDurations = {}
    
    // 初始化所有課程為 0 進度
    allCourseIds.forEach(courseId => {
      progress[courseId] = 0
      watchTime[courseId] = 0
      videoDurations[courseId] = 0
    })
    
    // 覆蓋實際的進度資料
    rows.forEach(row => {
      progress[row.course_id] = row.progress_percentage || 0
      watchTime[row.course_id] = parseFloat(row.watched_time) || 0
      if (row.video_duration > 0) {
        videoDurations[row.course_id] = parseFloat(row.video_duration)
      }
    })
    
    res.json({
      progress,
      watchTime,
      videoDurations
    })
  } catch (error) {
    console.error('取得進度失敗：', error)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// 取得特定課程進度
router.get('/:courseId', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM course_progress WHERE user_id = ? AND course_id = ?',
      [req.user.id, req.params.courseId]
    )
    
    if (rows.length === 0) {
      return res.json({
        progress: 0,
        watchTime: 0,
        videoDuration: 0,
        isCompleted: false
      })
    }
    
    const row = rows[0]
    res.json({
      progress: row.progress_percentage,
      watchTime: parseFloat(row.watched_time),
      videoDuration: parseFloat(row.video_duration),
      isCompleted: row.is_completed
    })
  } catch (error) {
    console.error('取得課程進度失敗：', error)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// 更新課程進度
router.post('/update', requireAuth, async (req, res) => {
  try {
    const { courseId, watchedTime, videoDuration, progressPercentage } = req.body
    
    if (!courseId || watchedTime === undefined) {
      return res.status(400).json({ error: '缺少必要參數' })
    }
    
    const isCompleted = progressPercentage >= 100
    
    // 使用 ON DUPLICATE KEY UPDATE 來處理插入或更新
    await db.query(`
      INSERT INTO course_progress (
        user_id, course_id, watched_time, video_duration, progress_percentage, is_completed, last_watched_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        watched_time = VALUES(watched_time),
        video_duration = VALUES(video_duration),
        progress_percentage = VALUES(progress_percentage),
        is_completed = VALUES(is_completed),
        last_watched_at = VALUES(last_watched_at)
    `, [
      req.user.id,
      courseId,
      watchedTime,
      videoDuration || 0,
      progressPercentage || 0,
      isCompleted
    ])
    
    res.json({ success: true })
  } catch (error) {
    console.error('更新進度失敗：', error)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// 更新影片長度
router.post('/duration', requireAuth, async (req, res) => {
  try {
    const { courseId, duration } = req.body
    
    if (!courseId || !duration) {
      return res.status(400).json({ error: '缺少必要參數' })
    }
    
    // 檢查是否已有記錄
    const [existing] = await db.query(
      'SELECT id FROM course_progress WHERE user_id = ? AND course_id = ?',
      [req.user.id, courseId]
    )
    
    if (existing.length > 0) {
      // 更新現有記錄
      await db.query(
        'UPDATE course_progress SET video_duration = ? WHERE user_id = ? AND course_id = ?',
        [duration, req.user.id, courseId]
      )
    } else {
      // 創建新記錄
      await db.query(
        'INSERT INTO course_progress (user_id, course_id, video_duration) VALUES (?, ?, ?)',
        [req.user.id, courseId, duration]
      )
    }
    
    res.json({ success: true })
  } catch (error) {
    console.error('更新影片長度失敗：', error)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// 重設課程進度
router.post('/reset/:courseId', requireAuth, async (req, res) => {
  try {
    await db.query(
      'UPDATE course_progress SET watched_time = 0, progress_percentage = 0, is_completed = FALSE WHERE user_id = ? AND course_id = ?',
      [req.user.id, req.params.courseId]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('重設進度失敗：', error)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// 取得用戶學習統計
router.get('/stats/summary', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_courses,
        COUNT(CASE WHEN is_completed = TRUE THEN 1 END) as completed_courses,
        AVG(progress_percentage) as avg_progress,
        SUM(watched_time) as total_watch_time
      FROM course_progress 
      WHERE user_id = ?
    `, [req.user.id])
    
    const stats = rows[0] || {
      total_courses: 0,
      completed_courses: 0,
      avg_progress: 0,
      total_watch_time: 0
    }
    
    res.json({
      totalCourses: stats.total_courses,
      completedCourses: stats.completed_courses,
      avgProgress: Math.round(stats.avg_progress || 0),
      totalWatchTime: parseFloat(stats.total_watch_time || 0)
    })
  } catch (error) {
    console.error('取得學習統計失敗：', error)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

// 取得所有課程基本資訊（不需要登入）
router.get('/courses/list', async (req, res) => {
  try {
    // 返回與前端 training.js 一致的課程清單
    const courses = [
      {
        id: 1,
        title: '新人導向',
        description: '了解公司文化、願景與基本規範',
        category: '基礎訓練',
        required: true,
        durationMin: 60,
        tags: ['入職', '公司文化'],
        videoUrl: '/videos/course-1.mp4'
      },
      {
        id: 2,
        title: '資訊安全訓練',
        description: '學習密碼管理、釣魚郵件防範、社交工程意識',
        category: '基礎訓練',
        required: true,
        durationMin: 90,
        tags: ['資安', '必修'],
        videoUrl: '/videos/course-2.mp4'
      },
      {
        id: 3,
        title: '半導體製程基礎',
        description: '晶圓、光刻、蝕刻等核心流程入門課程',
        category: '專業技能',
        required: false,
        durationMin: 120,
        tags: ['半導體', '製程'],
        videoUrl: '/videos/course-3.mp4'
      },
      {
        id: 4,
        title: 'EUV 基礎安全',
        description: '極紫外光曝光機的操作安全規範',
        category: '專業技能',
        required: false,
        durationMin: 45,
        tags: ['EUV', '安全'],
        videoUrl: '/videos/course-4.mp4'
      },
      {
        id: 5,
        title: '職涯規劃與發展',
        description: '如何設定個人職涯目標與發展路徑',
        category: '職涯發展',
        required: false,
        durationMin: 75,
        tags: ['職涯', '發展'],
        videoUrl: '/videos/course-5.mp4'
      }
    ]
    
    res.json({ courses })
  } catch (error) {
    console.error('取得課程清單失敗：', error)
    res.status(500).json({ error: '伺服器錯誤' })
  }
})

export default router
