<template>
  <div class="page">
    <h1>🔔 通知中心</h1>
    <p>查看你的最新通知，保持與課程、社群的即時連結。</p>

    <!-- 工具列 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <div v-if="loading" class="loading-text">載入中...</div>
        <div v-if="error" class="error-text">{{ error }}</div>
      </div>
      <div class="toolbar-right">
        <button @click="markAllRead" class="toolbar-btn" :disabled="loading">
          全部標記已讀
        </button>
      </div>
    </div>

    <div class="notification-list">
      <div
        v-for="n in notificationList"
        :key="n.id"
        class="notification-item"
        :class="{ unread: !n.read }"
      >
        <div class="notification-content">
          <div class="title-with-dot">
            <h3>{{ n.title }}</h3>
            <span v-if="!n.read" class="red-dot"></span>
          </div>
          <p>{{ n.message }}</p>
          <small class="time">{{ n.time }}</small>
        </div>
        <div class="notification-actions">
          <button class="mark-btn" v-if="!n.read" @click="markRead(n.id)">
            標記已讀
          </button>
          <button class="delete-btn" @click="deleteNotification(n.id)">
            刪除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { notifications, notificationUtils } from '../utils/notifications'
import auth from '../router/auth'

const router = useRouter()
const loading = ref(false)
const error = ref('')

// 使用全局通知狀態
const notificationList = computed(() => notifications.value)

async function markRead(id) {
  try {
    await notificationUtils.markAsRead(id)
  } catch (err) {
    error.value = err.message
  }
}

async function deleteNotification(id) {
  try {
    await notificationUtils.removeNotification(id)
  } catch (err) {
    error.value = err.message
  }
}

// 測試函數 - 添加新通知
async function addTestNotification() {
  try {
    loading.value = true
    await notificationUtils.addNotification(
      '測試通知',
      '這是一個測試通知訊息',
      'info'
    )
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function addCourseNotification() {
  try {
    loading.value = true
    await notificationUtils.addCourseNotification('Vue.js 基礎課程', 'completed')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function addCommunityNotification() {
  try {
    loading.value = true
    await notificationUtils.addCommunityNotification('comment', {
      postTitle: '職場新手指南',
      count: 3
    })
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function markAllRead() {
  try {
    loading.value = true
    await notificationUtils.markAllAsRead()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(async () => {
  // 檢查登入狀態
  if (!auth.isAuthed.value) {
    router.push('/login')
    return
  }

  try {
    loading.value = true
    await notificationUtils.loadNotifications()
  } catch (err) {
    error.value = err.message
    if (err.message.includes('登入已過期')) {
      router.push('/login')
    }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page {
  padding: 20px;
}

.notification-list {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-item {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  transition: background 0.2s;
}

.notification-item.unread {
  background: #f0f7ff;
  border-left: 4px solid #1976d2;
}

.notification-content h3 {
  margin: 0;
  font-size: 16px;
}

.notification-content p {
  margin: 4px 0;
  font-size: 14px;
  color: #555;
}

.time {
  font-size: 12px;
  color: #888;
}

.notification-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.mark-btn, .delete-btn {
  font-size: 12px;
  border: none;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  min-width: 60px;
}

.mark-btn {
  background: #1976d2;
  color: white;
}
.mark-btn:hover {
  background: #1565c0;
}

.delete-btn {
  background: #f44336;
  color: white;
}
.delete-btn:hover {
  background: #d32f2f;
}

.title-with-dot {
  display: flex;
  align-items: center;
  gap: 8px;
}

.red-dot {
  width: 8px;
  height: 8px;
  background: #f44336;
  border-radius: 50%;
  display: inline-block;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

.toolbar {
  display: flex;
  justify-content: flex-end; /* 推到最右 */
  align-items: center;
  margin: 20px 0;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.toolbar-btn {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: #f5f5f5;
  border-color: #bbb;
}

.toolbar-btn.test {
  background: #e3f2fd;
  border-color: #1976d2;
  color: #1976d2;
}

.toolbar-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-text {
  color: #666;
  font-size: 14px;
}

.error-text {
  color: #f44336;
  font-size: 14px;
}
</style>