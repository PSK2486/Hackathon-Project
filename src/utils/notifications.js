import { ref } from 'vue'
import auth from '../router/auth'

// API 基礎 URL
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5174/api'

// 全局通知狀態
export const notifications = ref([])
export const unreadCount = ref(0)

// HTTP 請求工具函數
async function apiRequest(url, options = {}) {
  // 檢查用戶是否已登入
  if (!auth.isAuthed.value) {
    throw new Error('請先登入才能使用通知功能')
  }

  const response = await fetch(`${API_BASE}${url}`, {
    credentials: 'include', // 包含 cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })

  if (response.status === 401) {
    // Token 過期或無效，清除本地認證狀態
    await auth.logout()
    throw new Error('登入已過期，請重新登入')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '請求失敗' }))
    throw new Error(error.error || error.detail || '請求失敗')
  }

  return response.json()
}

// 通知工具類
export const notificationUtils = {
  // 載入所有通知
  async loadNotifications() {
    try {
      const data = await apiRequest('/notifications')
      notifications.value = data.notifications || []
      this.updateUnreadCount()
      return notifications.value
    } catch (error) {
      console.error('載入通知失敗:', error)
      throw error
    }
  },

  // 更新未讀數量（本地計算）
  updateUnreadCount() {
    unreadCount.value = notifications.value.filter(n => !n.read).length
  },

  // 創建新通知
  async addNotification(title, message, type = 'info') {
    try {
      const data = await apiRequest('/notifications', {
        method: 'POST',
        body: JSON.stringify({ title, message, type })
      })

      // 重新載入通知列表（會自動更新未讀數量）
      await this.loadNotifications()
      return data.id
    } catch (error) {
      console.error('創建通知失敗:', error)
      throw error
    }
  },

  // 標記通知為已讀
  async markAsRead(id) {
    try {
      await apiRequest(`/notifications/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ read: true })
      })

      // 更新本地狀態
      const notification = notifications.value.find(n => n.id === id)
      if (notification) {
        notification.read = true
        this.updateUnreadCount()
      }
    } catch (error) {
      console.error('標記通知已讀失敗:', error)
      throw error
    }
  },

  // 標記所有通知為已讀
  async markAllAsRead() {
    try {
      await apiRequest('/notifications/mark-all-read', {
        method: 'PUT'
      })

      // 更新本地狀態
      notifications.value.forEach(n => n.read = true)
      this.updateUnreadCount()
    } catch (error) {
      console.error('標記所有通知已讀失敗:', error)
      throw error
    }
  },

  // 刪除通知
  async removeNotification(id) {
    try {
      await apiRequest(`/notifications/${id}`, {
        method: 'DELETE'
      })

      // 更新本地狀態
      const index = notifications.value.findIndex(n => n.id === id)
      if (index > -1) {
        notifications.value.splice(index, 1)
        this.updateUnreadCount() // 刪除後立即更新未讀數量
      }
    } catch (error) {
      console.error('刪除通知失敗:', error)
      throw error
    }
  },

  // 獲取未讀通知數量
  async getUnreadCount() {
    try {
      const data = await apiRequest('/notifications/unread-count')
      return data.unread_count
    } catch (error) {
      console.error('獲取未讀數量失敗:', error)
      // 如果 API 失敗，回退到本地計算
      return notifications.value.filter(n => !n.read).length
    }
  },

  // 獲取最新通知（用於預覽）
  getLatestNotifications(limit = 3) {
    return notifications.value.slice(0, limit)
  },

  // 課程相關通知
  async addCourseNotification(courseTitle, type = 'progress') {
    let title, message

    switch (type) {
      case 'completed':
        title = '課程完成'
        message = `恭喜！你已完成「${courseTitle}」課程。`
        break
      case 'progress':
        title = '課程進度提醒'
        message = `「${courseTitle}」課程尚未完成，記得繼續學習。`
        break
      case 'new':
        title = '新課程上線'
        message = `新課程「${courseTitle}」已上線，快來學習吧！`
        break
      default:
        title = '課程通知'
        message = `關於「${courseTitle}」的通知。`
    }

    return await this.addNotification(title, message, 'info')
  },

  // 社群相關通知
  async addCommunityNotification(action, details) {
    let title, message

    switch (action) {
      case 'comment':
        title = '社群互動'
        message = `你的貼文「${details.postTitle}」有 ${details.count} 則新留言。`
        break
      case 'like':
        title = '社群互動'
        message = `你的貼文「${details.postTitle}」獲得了 ${details.count} 個讚。`
        break
      case 'mention':
        title = '被提及'
        message = `${details.user} 在貼文中提及了你。`
        break
      default:
        title = '社群通知'
        message = details.message || '你有新的社群活動。'
    }

    return await this.addNotification(title, message, 'info')
  },

  // 系統通知
  async addSystemNotification(message, type = 'info') {
    return await this.addNotification('系統通知', message, type)
  },

  // 檢查並發送訓練提醒通知
  async checkTrainingProgress(requiredAvg) {
    if (requiredAvg >= 30) {
      return null // 已達到30%，不需要發送提醒
    }

    try {
      const data = await apiRequest('/notifications/check-training-progress', {
        method: 'POST',
        body: JSON.stringify({ requiredAvg })
      })

      // 重新載入通知列表
      await this.loadNotifications()
      return data.id
    } catch (error) {
      console.error('檢查訓練進度失敗:', error)
      throw error
    }
  }
}

// 格式化時間
export function formatNotificationTime(time) {
  if (time === '剛剛') return time

  // 這裡可以加入更複雜的時間格式化邏輯
  return time
}

// 檢查並發送訓練提醒通知（已整合到 notificationUtils 中）
export async function checkTrainingProgress(trainingModule) {
  const requiredAvg = trainingModule.summary.requiredAvg

  try {
    await notificationUtils.checkTrainingProgress(requiredAvg)
  } catch (error) {
    console.error('檢查訓練進度失敗:', error)
  }
}