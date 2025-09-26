// src/stores/auth.js
import { reactive, computed } from 'vue'

const LS_KEY = 'auth_user_v1'

const state = reactive({
	user: null // { id, name, email, role, dept, avatarUrl? }
})

function load() {
	try {
		const raw = localStorage.getItem(LS_KEY)
		if (raw) state.user = JSON.parse(raw)
	} catch {}
}
load()

function save() {
	localStorage.setItem(LS_KEY, JSON.stringify(state.user))
}

async function api(path, options = {}) {
	const res = await fetch(`/api${path}`, {
		method: 'GET',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		...options
	})
	const data = await res.json().catch(() => ({}))
	if (!res.ok) throw new Error(data?.error || 'Request failed')
	return data
}

async function register(payload) {
	const data = await api('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
	state.user = data.user
	save()
	return data.user
}

async function login({ email, password }) {
	const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
	state.user = data.user
	save()
	return data.user
}

async function fetchMe() {
	try {
		const data = await api('/auth/me')
		state.user = data.user
		save()
		return data.user
	} catch (e) {
		state.user = null
		localStorage.removeItem(LS_KEY)
		return null
	}
}

async function logout() {
	try {
		await api('/auth/logout', { method: 'POST' })
		state.user = null
		localStorage.removeItem(LS_KEY)
		
		// 登出後刷新頁面，確保清除所有狀態
		console.log('登出成功，即將刷新頁面...')
		window.location.reload()
	} catch (error) {
		console.error('登出時發生錯誤:', error)
		// 即使 API 呼叫失敗，也要清除本地狀態並刷新頁面
		state.user = null
		localStorage.removeItem(LS_KEY)
		window.location.reload()
	}
}

const isAuthed = computed(() => !!state.user)
const initials = computed(() => {
	if (!state.user?.name) return '?'
	const parts = state.user.name.trim().split(/\s+/)
	const first = parts[0]?.[0] || ''
	const last = parts[1]?.[0] || ''
	return (first + last || first).toUpperCase()
})

export default { state, isAuthed, login, logout, initials, register, fetchMe }