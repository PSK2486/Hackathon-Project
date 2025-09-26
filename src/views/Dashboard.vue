<template>
  <div class="page">
    <h1>iGrow & iCare</h1>
    <p>歡迎回來，這裡是你的學習與職場支持總覽。</p>

    <div class="grid">
      <!-- 職涯訓練總覽 -->
      <section class="card">
        <h2>📚 職涯訓練</h2>
        <p>必修完成率：<strong>{{ trainingProgress }}%</strong></p>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: trainingProgress + '%' }"></div>
        </div>
        <p class="link"><router-link to="/training">查看課程 →</router-link></p>
      </section>

      <!-- 通知預覽 -->
      <section class="card">
        <h2>🔔 最新通知</h2>
        <ul>
          <li v-for="n in notifications" :key="n.id">
            <span>{{ n.title }}</span>
            <small class="time">{{ n.time }}</small>
          </li>
        </ul>
        <p class="link"><router-link to="/notifications">更多通知 →</router-link></p>
      </section>

      <!-- 社群精選 -->
      <section class="card">
        <h2>👥 社群精選</h2>
        <ul>
          <li v-for="p in posts" :key="p.id">
            <strong>{{ p.user }}：</strong> {{ p.content }}
          </li>
        </ul>
        <p class="link"><router-link to="/community">前往社群 →</router-link></p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import training from '../router/training'
import auth from '../router/auth'

const router = useRouter()
const trainingProgress = computed(() => training.summary.requiredAvg)

const notifications = ref([])
const posts = ref([])

// 從API獲取最新通知
const fetchNotifications = async () => {
  try {
    const headers = {}
    // 如果有當前用戶且不是預設用戶，添加 header 用於測試
    if (auth.state.user?.id && auth.state.user.id !== 1) {
      headers['X-User-ID'] = auth.state.user.id.toString()
    }

    const response = await fetch('http://localhost:8000/api/dashboard/notifications?limit=3', {
      headers
    })
    if (response.ok) {
      const data = await response.json()
      notifications.value = data.notifications
    }
  } catch (error) {
    console.error('獲取通知失敗:', error)
    // 如果API失敗，使用預設資料
    notifications.value = [
      { id: 1, title: '新人導向課程已完成 80%', time: '2 小時前' },
      { id: 2, title: '本週心理健康 Check-in 開放填寫', time: '1 天前' },
    ]
  }
}

// 從API獲取熱門貼文
const fetchPopularPosts = async () => {
  try {
    const response = await fetch('http://localhost:8000/api/dashboard/popular-posts?limit=3')
    if (response.ok) {
      const data = await response.json()
      posts.value = data.posts
    }
  } catch (error) {
    console.error('獲取熱門貼文失敗:', error)
    // 如果API失敗，使用預設資料
    posts.value = [
      { id: 1, user: 'Ivy', content: '竹科租屋小技巧分享～' },
      { id: 2, user: 'Ben', content: '溝通技巧課程好實用！' },
    ]
  }
}


onMounted(async () => {
  // 檢查登入狀態並載入進度
  const isLoggedIn = await training.checkAuthStatus()
  if (isLoggedIn) {
    await training.loadProgress()
  }

  // 載入Dashboard資料
  await fetchNotifications()
  await fetchPopularPosts()
})
</script>

<style scoped>
.page {
  padding: 20px;
}

.grid {
  margin-top: 20px;
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.card {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.card h2 {
  margin-top: 0;
  font-size: 18px;
  margin-bottom: 8px;
}

.progress-bar {
  background: #eee;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  margin: 8px 0;
}
.progress-fill {
  height: 100%;
  background: #1976d2;
  transition: width 0.3s ease;
}

.link {
  margin-top: 10px;
  font-size: 14px;
}
.link a {
  color: #1976d2;
  text-decoration: none;
}
.link a:hover {
  text-decoration: underline;
}

.time {
  font-size: 12px;
  color: #666;
  margin-left: 6px;
}
</style>