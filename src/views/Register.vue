<template>
  <div class="auth-wrap">
    <h1 class="title">註冊</h1>
    <form class="card" @submit.prevent="onSubmit">
      <label class="field">
        <span>姓名</span>
        <input v-model.trim="name" type="text" required placeholder="您的姓名" />
      </label>
      <label class="field">
        <span>Email</span>
        <input v-model.trim="email" type="email" required placeholder="you@example.com" />
      </label>
      <label class="field">
        <span>密碼</span>
        <input v-model.trim="password" type="password" required placeholder="至少 6 碼" />
      </label>
      <button class="btn primary" :disabled="loading">{{ loading ? '處理中...' : '建立帳號' }}</button>
      <p class="help">已經有帳號？<router-link to="/login">登入</router-link></p>
      <p class="error" v-if="error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import auth from '../router/auth'

const router = useRouter()
const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await auth.register({ name: name.value, email: email.value, password: password.value })
    router.push('/')
  } catch (e) {
    error.value = e.message || '註冊失敗'
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