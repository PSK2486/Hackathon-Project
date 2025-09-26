import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { db } from '../index.js'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d'

async function findUserByEmail(email) {
	const [rows] = await db.query('SELECT id, name, email, password_hash, role, dept, avatar_url FROM users WHERE email = ?', [email])
	return rows[0] || null
}

async function findUserById(id) {
	const [rows] = await db.query('SELECT id, name, email, role, dept, avatar_url FROM users WHERE id = ?', [id])
	return rows[0] || null
}

function signToken(payload) {
	return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })
}

function setAuthCookie(res, token) {
	res.cookie('token', token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: false,
		maxAge: 7 * 24 * 60 * 60 * 1000
	})
}

router.post('/register', async (req, res) => {
	try {
		const { name, email, password, role = 'Member', dept = 'General' } = req.body || {}
		if (!name || !email || !password) return res.status(400).json({ error: '缺少必要欄位' })

		const existing = await findUserByEmail(email)
		if (existing) return res.status(409).json({ error: 'Email 已被註冊' })

		const passwordHash = await bcrypt.hash(password, 10)
		const [result] = await db.query(
			'INSERT INTO users (name, email, password_hash, role, dept) VALUES (?,?,?,?,?)',
			[name, email, passwordHash, role, dept]
		)

		const user = { id: result.insertId, name, email, role, dept }
		const token = signToken({ uid: user.id })
		setAuthCookie(res, token)
		res.status(201).json({ user })
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: '伺服器錯誤' })
	}
})

router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body || {}
		if (!email || !password) return res.status(400).json({ error: '缺少帳密' })

		const userRow = await findUserByEmail(email)
		if (!userRow) return res.status(401).json({ error: '帳號或密碼錯誤' })
		const ok = await bcrypt.compare(password, userRow.password_hash)
		if (!ok) return res.status(401).json({ error: '帳號或密碼錯誤' })

		const user = {
			id: userRow.id,
			name: userRow.name,
			email: userRow.email,
			role: userRow.role,
			dept: userRow.dept,
			avatarUrl: userRow.avatar_url || null
		}
		const token = signToken({ uid: user.id })
		setAuthCookie(res, token)
		res.json({ user })
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: '伺服器錯誤' })
	}
})

router.post('/logout', (req, res) => {
	res.clearCookie('token')
	res.json({ ok: true })
})

router.get('/me', async (req, res) => {
	try {
		console.log('檢查 /auth/me 請求...')
		const token = req.cookies?.token
		console.log('Token 存在:', !!token)
		if (!token) return res.status(401).json({ error: '未登入' })
		let payload
		try {
			payload = jwt.verify(token, JWT_SECRET)
			console.log('Token 驗證成功，payload:', payload)
		} catch (err) {
			console.log('Token 驗證失敗:', err.message)
			return res.status(401).json({ error: '登入逾期' })
		}
		const user = await findUserById(payload.uid)
		console.log('使用者查詢結果:', !!user)
		if (!user) return res.status(401).json({ error: '無此使用者' })
		res.json({ user })
	} catch (err) {
		console.error('伺服器錯誤:', err)
		res.status(500).json({ error: '伺服器錯誤' })
	}
})

export default router 