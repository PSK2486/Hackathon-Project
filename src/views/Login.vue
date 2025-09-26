<template>
  <div class="auth-wrap">
    <h1 class="title">登入</h1>
    <form class="card" @submit.prevent="onSubmit">
      <label class="field">
        <span>Email</span>
        <input v-model.trim="email" type="email" required placeholder="you@example.com" />
      </label>
      <label class="field">
        <span>密碼</span>
        <input v-model.trim="password" type="password" required placeholder="••••••••" />
      </label>
      <button class="btn primary" :disabled="loading">{{ loading ? '處理中...' : '登入' }}</button>
      <p class="help">沒有帳號？<router-link to="/register">註冊</router-link></p>
      <p class="error" v-if="error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import auth from '../router/auth'
import { checkTrainingProgress } from '../utils/notifications'
import training from '../router/training'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login({ email: email.value, password: password.value })
    // 重新載入進度資料，並在登入後觸發訓練提醒
    try {
      await training.loadProgress()
      await checkTrainingProgress(training)
    } catch (e) {
      // 提醒失敗不影響登入流程
      console.warn('登入後檢查訓練提醒失敗：', e)
    }
    router.push('/')
  } catch (e) {
    error.value = e.message || '登入失敗'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-wrap { max-width: 420px; margin: 40px auto; padding: 0 12px; }
.title { font-size: 22px; font-weight: 800; margin-bottom: 12px; color: var(--text); }
.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.field span { color: var(--text-light); font-size: 14px; }
.field input { padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: #fff; }
.btn.primary { width: 100%; padding: 10px 12px; border-radius: 8px; border: none; background: var(--primary); color: #fff; font-weight: 700; cursor: pointer; }
.btn.primary:disabled { opacity: .6; cursor: not-allowed; }
.help { margin-top: 10px; font-size: 14px; color: var(--text-light); }
.error { color: #c0392b; margin-top: 8px; }
</style> 