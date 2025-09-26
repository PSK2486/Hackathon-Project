import express from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../index.js'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'

async function authRequired(req, res, next) {
	try {
		const token = req.cookies?.token
		if (!token) return res.status(401).json({ error: '未登入' })
		let payload
		try {
			payload = jwt.verify(token, JWT_SECRET)
		} catch {
			return res.status(401).json({ error: '登入逾期' })
		}
		req.userId = payload.uid
		next()
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: '伺服器錯誤' })
	}
}

router.post('/', authRequired, async (req, res) => {
	try {
		const { content, imageUrl = null, board: rawBoard, tag: rawTag } = req.body || {}
		if (!content || typeof content !== 'string' || content.trim().length === 0) {
			return res.status(400).json({ error: '內容不可為空' })
		}

		// 分版
		const allowedBoards = new Set(['general', 'chat', 'work', 'family', 'sports'])
		const board = allowedBoards.has(String(rawBoard || '').toLowerCase())
			? String(rawBoard).toLowerCase()
			: 'general'

		// 標籤
		const allowedTags = new Set(['生活', '租屋', '美食', '心情', '技術'])
		const tag = allowedTags.has(String(rawTag || ''))
			? String(rawTag)
			: '生活'

		const [result] = await db.query(
			'INSERT INTO posts (author_id, content, image_url, board, tag) VALUES (?,?,?,?,?)',
			[req.userId, content.trim(), imageUrl, board, tag]
		)
		const [rows] = await db.query(
			`SELECT p.id, p.content, p.image_url AS imageUrl, p.board, p.tag, p.created_at AS createdAt, p.updated_at AS updatedAt,
				u.id AS authorId, u.name AS authorName, u.avatar_url AS authorAvatarUrl, u.dept AS authorDept
				FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = ?`,
			[result.insertId]
		)
		res.status(201).json({ post: rows[0] })
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: '伺服器錯誤' })
	}
})

router.get('/', async (req, res) => {
	try {
		const { board: rawBoard, tag: rawTag } = req.query
		let sql = `SELECT p.id, p.content, p.image_url AS imageUrl, p.board, p.tag, p.created_at AS createdAt, p.updated_at AS updatedAt,
			p.likes_count, p.comments_count,
			u.id AS authorId, u.name AS authorName, u.avatar_url AS authorAvatarUrl, u.dept AS authorDept
			FROM posts p JOIN users u ON u.id = p.author_id`
		const params = []
		const conditions = []

		if (rawBoard && String(rawBoard).toLowerCase() !== 'all') {
			conditions.push('p.board = ?')
			params.push(String(rawBoard).toLowerCase())
		}

		if (rawTag && String(rawTag) !== 'all') {
			conditions.push('p.tag = ?')
			params.push(String(rawTag))
		}

		if (conditions.length > 0) {
			sql += ' WHERE ' + conditions.join(' AND ')
		}

		sql += ' ORDER BY p.created_at DESC'
		const [rows] = await db.query(sql, params)
		res.json({ posts: rows })
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: '伺服器錯誤' })
	}
})

// 點讚/取消點讚
router.post('/:postId/like', authRequired, async (req, res) => {
	try {
		const postId = parseInt(req.params.postId)
		const userId = req.userId

		if (!postId || isNaN(postId)) {
			return res.status(400).json({ error: '無效的貼文ID' })
		}

		// 檢查是否已經點讚
		const [existingLike] = await db.query(
			'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?',
			[postId, userId]
		)

		if (existingLike.length > 0) {
			// 取消點讚
			await db.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId])
			await db.query('UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?', [postId])

			// 獲取更新後的點讚數
			const [result] = await db.query('SELECT likes_count FROM posts WHERE id = ?', [postId])
			const likesCount = result[0]?.likes_count || 0

			res.json({ liked: false, likes_count: likesCount, message: '取消點讚成功' })
		} else {
			// 新增點讚
			await db.query('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId])
			await db.query('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?', [postId])

			// 獲取更新後的點讚數
			const [result] = await db.query('SELECT likes_count FROM posts WHERE id = ?', [postId])
			const likesCount = result[0]?.likes_count || 0

			res.json({ liked: true, likes_count: likesCount, message: '點讚成功' })
		}
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: '伺服器錯誤' })
	}
})

// 獲取點讚狀態
router.get('/:postId/like-status', authRequired, async (req, res) => {
	try {
		const postId = parseInt(req.params.postId)
		const userId = req.userId

		if (!postId || isNaN(postId)) {
			return res.status(400).json({ error: '無效的貼文ID' })
		}

		const [result] = await db.query(
			'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?',
			[postId, userId]
		)

		res.json({ liked: result.length > 0 })
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: '伺服器錯誤' })
	}
})

// 獲取貼文留言
router.get('/:postId/comments', async (req, res) => {
	try {
		const postId = parseInt(req.params.postId)

		if (!postId || isNaN(postId)) {
			return res.status(400).json({ error: '無效的貼文ID' })
		}

		const [rows] = await db.query(
			`SELECT c.id, c.content, c.created_at,
				u.name as user,
				CASE
					WHEN TIMESTAMPDIFF(MINUTE, c.created_at, NOW()) < 1 THEN '剛剛'
					WHEN TIMESTAMPDIFF(MINUTE, c.created_at, NOW()) < 60
						THEN CONCAT(TIMESTAMPDIFF(MINUTE, c.created_at, NOW()), ' 分鐘前')
					WHEN TIMESTAMPDIFF(HOUR, c.created_at, NOW()) < 24
						THEN CONCAT(TIMESTAMPDIFF(HOUR, c.created_at, NOW()), ' 小時前')
					ELSE CONCAT(TIMESTAMPDIFF(DAY, c.created_at, NOW()), ' 天前')
				END as time
			FROM post_comments c
			LEFT JOIN users u ON c.user_id = u.id
			WHERE c.post_id = ?
			ORDER BY c.created_at ASC`,
			[postId]
		)

		// 轉換格式以符合前端需求
		const comments = rows.map(comment => ({
			id: comment.id,
			user: comment.user,
			text: comment.content,
			time: comment.time
		}))

		res.json({ comments })
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: '伺服器錯誤' })
	}
})

// 新增留言
router.post('/:postId/comments', authRequired, async (req, res) => {
	try {
		const postId = parseInt(req.params.postId)
		const userId = req.userId
		const { content } = req.body || {}

		if (!postId || isNaN(postId)) {
			return res.status(400).json({ error: '無效的貼文ID' })
		}

		if (!content || typeof content !== 'string' || content.trim().length === 0) {
			return res.status(400).json({ error: '留言內容不可為空' })
		}

		// 新增留言
		const [result] = await db.query(
			'INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)',
			[postId, userId, content.trim()]
		)

		// 更新貼文留言數
		await db.query('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?', [postId])

		// 獲取新建立的留言信息
		const [commentRows] = await db.query(
			`SELECT c.id, c.content, c.created_at, u.name as user
			FROM post_comments c
			LEFT JOIN users u ON c.user_id = u.id
			WHERE c.id = ?`,
			[result.insertId]
		)

		const newComment = commentRows[0]
		const formattedComment = {
			id: newComment.id,
			user: newComment.user,
			text: newComment.content,
			time: '剛剛'
		}

		res.status(201).json({ comment: formattedComment, message: '留言成功' })
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: '伺服器錯誤' })
	}
})

export default router 