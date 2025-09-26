import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { createPool } from 'mysql2/promise'

const app = express()
const PORT = process.env.PORT || 5174

// DB pool
export const db = createPool({
	host: process.env.DB_HOST || 'localhost',
	user: process.env.DB_USER || 'root',
	password: process.env.DB_PASSWORD || '',
	database: process.env.DB_NAME || 'workmate',
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0
})

async function initTables() {
	const DB_NAME = process.env.DB_NAME || 'workmate'

	// users 表（若不存在則建立）。若已存在，不會改變其現有引擎與結構。
	await db.query(`CREATE TABLE IF NOT EXISTS users (
		id INT AUTO_INCREMENT PRIMARY KEY,
		name VARCHAR(100) NOT NULL,
		email VARCHAR(255) NOT NULL UNIQUE,
		password_hash VARCHAR(255) NOT NULL,
		role VARCHAR(50) DEFAULT 'Member',
		dept VARCHAR(100) DEFAULT 'General',
		avatar_url VARCHAR(500) NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

	// 讀取 users.id 型別與 users 表的引擎
	const [colRows] = await db.query(
		"SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id'",
		[DB_NAME]
	)
	const authorColumnType = colRows[0]?.COLUMN_TYPE || 'INT'

	const [tblRows] = await db.query(
		"SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
		[DB_NAME]
	)
	const usersEngine = (tblRows[0]?.ENGINE || 'InnoDB').toUpperCase()
	const useForeignKey = usersEngine === 'INNODB'
	const engineClause = `ENGINE=${usersEngine} DEFAULT CHARSET=utf8mb4`

	const baseCreate = `CREATE TABLE IF NOT EXISTS posts (
		id INT AUTO_INCREMENT PRIMARY KEY,
		author_id ${authorColumnType} NOT NULL,
		content TEXT NOT NULL,
		image_url VARCHAR(500) NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`

	const fkOrIndex = useForeignKey
		? ', FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE'
		: ', INDEX idx_posts_author_id (author_id)'

	const createSql = baseCreate + fkOrIndex + `) ${engineClause}`

	try {
		await db.query(createSql)
	} catch (err) {
		console.warn('建立 posts（含外鍵）失敗，改用無外鍵版本：', err?.code || err)
		const fallbackSql = baseCreate + ', INDEX idx_posts_author_id (author_id)) ' + engineClause
		await db.query(fallbackSql)
	}

	// course_progress 表（課程進度）
	const progressCreate = `CREATE TABLE IF NOT EXISTS course_progress (
		id INT AUTO_INCREMENT PRIMARY KEY,
		user_id ${authorColumnType} NOT NULL,
		course_id INT NOT NULL,
		watched_time DECIMAL(10,2) DEFAULT 0,
		video_duration DECIMAL(10,2) DEFAULT 0,
		progress_percentage INT DEFAULT 0,
		is_completed BOOLEAN DEFAULT FALSE,
		last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE KEY unique_user_course (user_id, course_id)`

	const progressFkOrIndex = useForeignKey
		? ', FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
		: ', INDEX idx_progress_user_id (user_id)'

	const progressSql = progressCreate + progressFkOrIndex + `) ${engineClause}`

	try {
		await db.query(progressSql)
	} catch (err) {
		console.warn('建立 course_progress（含外鍵）失敗，改用無外鍵版本：', err?.code || err)
		const fallbackProgressSql = progressCreate + ', INDEX idx_progress_user_id (user_id)) ' + engineClause
		await db.query(fallbackProgressSql)
	}

	// notifications 表（通知系統）
	const notificationCreate = `CREATE TABLE IF NOT EXISTS notifications (
		id INT AUTO_INCREMENT PRIMARY KEY,
		user_id ${authorColumnType} NOT NULL,
		title VARCHAR(255) NOT NULL,
		message TEXT NOT NULL,
		type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
		is_read BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		INDEX idx_user_id (user_id),
		INDEX idx_is_read (is_read),
		INDEX idx_created_at (created_at)`

	const notificationFkOrIndex = useForeignKey
		? ', FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
		: ', INDEX idx_notifications_user_id (user_id)'

	const notificationSql = notificationCreate + notificationFkOrIndex + `) ${engineClause}`

	try {
		await db.query(notificationSql)
	} catch (err) {
		console.warn('建立 notifications（含外鍵）失敗，改用無外鍵版本：', err?.code || err)
		const fallbackNotificationSql = notificationCreate + ', INDEX idx_notifications_user_id (user_id)) ' + engineClause
		await db.query(fallbackNotificationSql)
	}

	// post_likes 表（點讚系統）
	const likesCreate = `CREATE TABLE IF NOT EXISTS post_likes (
		id INT AUTO_INCREMENT PRIMARY KEY,
		post_id INT NOT NULL,
		user_id ${authorColumnType} NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE KEY unique_user_post_like (post_id, user_id),
		INDEX idx_post_id (post_id),
		INDEX idx_user_id (user_id)`

	const likesFkOrIndex = useForeignKey
		? ', FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
		: ', INDEX idx_likes_post_id (post_id), INDEX idx_likes_user_id (user_id)'

	const likesSql = likesCreate + likesFkOrIndex + `) ${engineClause}`

	try {
		await db.query(likesSql)
	} catch (err) {
		console.warn('建立 post_likes（含外鍵）失敗，改用無外鍵版本：', err?.code || err)
		const fallbackLikesSql = likesCreate + ', INDEX idx_likes_post_id (post_id), INDEX idx_likes_user_id (user_id)) ' + engineClause
		await db.query(fallbackLikesSql)
	}

	// post_comments 表（留言系統）
	const commentsCreate = `CREATE TABLE IF NOT EXISTS post_comments (
		id INT AUTO_INCREMENT PRIMARY KEY,
		post_id INT NOT NULL,
		user_id ${authorColumnType} NOT NULL,
		content TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		INDEX idx_post_id (post_id),
		INDEX idx_user_id (user_id)`

	const commentsFkOrIndex = useForeignKey
		? ', FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
		: ', INDEX idx_comments_post_id (post_id), INDEX idx_comments_user_id (user_id)'

	const commentsSql = commentsCreate + commentsFkOrIndex + `) ${engineClause}`

	try {
		await db.query(commentsSql)
	} catch (err) {
		console.warn('建立 post_comments（含外鍵）失敗，改用無外鍵版本：', err?.code || err)
		const fallbackCommentsSql = commentsCreate + ', INDEX idx_comments_post_id (post_id), INDEX idx_comments_user_id (user_id)) ' + engineClause
		await db.query(fallbackCommentsSql)
	}

	// 為 posts 表添加計數欄位（如果不存在）
	try {
		await db.query('ALTER TABLE posts ADD COLUMN likes_count INT DEFAULT 0')
	} catch (err) {
		// 欄位可能已存在，忽略錯誤
	}

	try {
		await db.query('ALTER TABLE posts ADD COLUMN comments_count INT DEFAULT 0')
	} catch (err) {
		// 欄位可能已存在，忽略錯誤
	}

	// 為 posts 表新增 board 欄位（分版），若不存在
	try {
		await db.query("ALTER TABLE posts ADD COLUMN board VARCHAR(50) DEFAULT 'general'")
	} catch (err) {
		// 欄位可能已存在，忽略錯誤
	}

	// 為 posts 表新增 tag 欄位（標籤），若不存在
	try {
		await db.query("ALTER TABLE posts ADD COLUMN tag VARCHAR(50) DEFAULT '生活'")
	} catch (err) {
		// 欄位可能已存在，忽略錯誤
	}
}

// middlewares
app.use(cors({
	origin: (origin, cb) => cb(null, true),
	credentials: true
}))
app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (req, res) => {
	res.json({ ok: true })
})

// auth routes
import authRouter from './routes/auth.js'
app.use('/api/auth', authRouter)

// posts routes
import postsRouter from './routes/posts.js'

// progress routes
import progressRouter from './routes/progress.js'

// notifications routes
import notificationsRouter from './routes/notifications.js'

await initTables().catch(err => {
	console.error('資料表初始化失敗', err)
	process.exit(1)
})

app.use('/api/posts', postsRouter)
app.use('/api/progress', progressRouter)
app.use('/api/notifications', notificationsRouter)

app.listen(PORT, () => {
	console.log(`[server] listening on http://localhost:${PORT}`)
}) 