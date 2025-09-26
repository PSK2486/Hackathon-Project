import jwt from 'jsonwebtoken'
import { db } from '../index.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'

// 查找用戶
async function findUserById(id) {
  const [rows] = await db.query('SELECT id, name, email, role, dept, avatar_url FROM users WHERE id = ?', [id])
  return rows[0] || null
}

// JWT 認證中間件
export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token

    if (!token) {
      return res.status(401).json({ error: '需要登入' })
    }

    let payload
    try {
      payload = jwt.verify(token, JWT_SECRET)
    } catch (err) {
      return res.status(401).json({ error: '登入逾期，請重新登入' })
    }

    const user = await findUserById(payload.uid)
    if (!user) {
      return res.status(401).json({ error: '無此使用者' })
    }

    // 將用戶資訊附加到 request 中
    req.user = user
    next()
  } catch (error) {
    console.error('認證中間件錯誤:', error)
    res.status(500).json({ error: '伺服器錯誤' })
  }
}

// 可選認證中間件（不強制登入，但如果有 token 會驗證）
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token

    if (!token) {
      req.user = null
      return next()
    }

    let payload
    try {
      payload = jwt.verify(token, JWT_SECRET)
    } catch (err) {
      req.user = null
      return next()
    }

    const user = await findUserById(payload.uid)
    req.user = user || null
    next()
  } catch (error) {
    console.error('可選認證中間件錯誤:', error)
    req.user = null
    next()
  }
}