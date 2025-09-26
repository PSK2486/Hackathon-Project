import { Router } from 'express'
import { db } from '../index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// 所有通知路由都需要認證
router.use(requireAuth)

// 獲取用戶的所有通知
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id

    const [rows] = await db.query(`
      SELECT
        id,
        user_id,
        title,
        message,
        type,
        is_read as 'read',
        created_at,
        CASE
          WHEN TIMESTAMPDIFF(MINUTE, created_at, NOW()) < 1
            THEN '剛剛'
          WHEN TIMESTAMPDIFF(MINUTE, created_at, NOW()) < 60
            THEN CONCAT(TIMESTAMPDIFF(MINUTE, created_at, NOW()), ' 分鐘前')
          WHEN TIMESTAMPDIFF(HOUR, created_at, NOW()) < 24
            THEN CONCAT(TIMESTAMPDIFF(HOUR, created_at, NOW()), ' 小時前')
          ELSE CONCAT(TIMESTAMPDIFF(DAY, created_at, NOW()), ' 天前')
        END as time
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId])

    res.json({ notifications: rows })
  } catch (error) {
    console.error('查詢通知失敗:', error)
    res.status(500).json({ error: '查詢通知時發生錯誤' })
  }
})

// 創建新通知
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id
    const { title, message, type = 'info' } = req.body

    if (!title || !message) {
      return res.status(400).json({ error: '標題和訊息為必填欄位' })
    }

    const [result] = await db.query(`
      INSERT INTO notifications (user_id, title, message, type, is_read)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, title, message, type, false])

    res.json({
      id: result.insertId,
      message: '通知創建成功'
    })
  } catch (error) {
    console.error('創建通知失敗:', error)
    res.status(500).json({ error: '創建通知時發生錯誤' })
  }
})

// 更新通知狀態（標記已讀）
router.put('/:id', async (req, res) => {
  try {
    const notificationId = req.params.id
    const { read = true } = req.body

    const [result] = await db.query(`
      UPDATE notifications
      SET is_read = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [read, notificationId])

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '通知未找到' })
    }

    res.json({ message: '通知更新成功' })
  } catch (error) {
    console.error('更新通知失敗:', error)
    res.status(500).json({ error: '更新通知時發生錯誤' })
  }
})

// 標記所有通知為已讀
router.put('/mark-all-read', async (req, res) => {
  try {
    const userId = req.user.id

    const [result] = await db.query(`
      UPDATE notifications
      SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND is_read = FALSE
    `, [userId])

    res.json({
      message: `已標記 ${result.affectedRows} 個通知為已讀`
    })
  } catch (error) {
    console.error('更新通知失敗:', error)
    res.status(500).json({ error: '更新通知時發生錯誤' })
  }
})

// 獲取未讀通知數量
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id

    const [rows] = await db.query(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND is_read = FALSE
    `, [userId])

    res.json({ unread_count: rows[0].count })
  } catch (error) {
    console.error('查詢未讀通知數量失敗:', error)
    res.status(500).json({ error: '查詢未讀通知數量時發生錯誤' })
  }
})

// 刪除通知
router.delete('/:id', async (req, res) => {
  try {
    const notificationId = req.params.id

    const [result] = await db.query(`
      DELETE FROM notifications WHERE id = ?
    `, [notificationId])

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '通知未找到' })
    }

    res.json({ message: '通知刪除成功' })
  } catch (error) {
    console.error('刪除通知失敗:', error)
    res.status(500).json({ error: '刪除通知時發生錯誤' })
  }
})

// 檢查並發送訓練提醒通知
router.post('/check-training-progress', async (req, res) => {
  try {
    const userId = req.user.id
    const { requiredAvg } = req.body

    if (requiredAvg >= 30) {
      return res.json({ message: '訓練進度良好，無需發送提醒' })
    }

    // 每次登入都允許發送一次提醒，移除 24 小時限制

    // 創建新的訓練提醒通知
    const [result] = await db.query(`
      INSERT INTO notifications (user_id, title, message, type, is_read)
      VALUES (?, ?, ?, ?, ?)
    `, [
      userId,
      '課程進度提醒',
      `目前必修課程平均完成度為 ${requiredAvg}%，建議儘快完成必修課程以達到基本要求。`,
      'warning',
      false
    ])

    res.json({
      id: result.insertId,
      message: '訓練提醒通知已發送'
    })
  } catch (error) {
    console.error('檢查訓練進度失敗:', error)
    res.status(500).json({ error: '檢查訓練進度時發生錯誤' })
  }
})

export default router