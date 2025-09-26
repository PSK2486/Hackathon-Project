<template>
  <div>
    <NavBar />
    <div class="app">
      <main class="main">
        <router-view />
      </main>

      <footer class="site-footer">
        ＠黑客松板烤肉出版
      </footer>
    </div>

    <div class="floating-button" @click="toggleChat">
      <span>💬</span>
    </div>

    <transition name="chat-window">
      <div v-if="isChatOpen" class="chatbot-container">
        <Chatbot />
      </div>
    </transition>
    </div>
</template>

<script setup>
import NavBar from './components/NavBar.vue'
import { ref } from 'vue';
import Chatbot from './components/Chatbot.vue'; 

const isChatOpen = ref(false);

const toggleChat = () => {
  isChatOpen.value = !isChatOpen.value;
};
</script>

<style>
/* 讓頁尾固定在視窗底部（內容不足時），內容多時會被推到最下方 */
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.main {
  flex: 1;
}

/* 頁尾樣式（沿用你現有的配色變數） */
.site-footer {
  text-align: center;
  padding: 10px 12px;
  font-size: 12px;
  color: var(--text-light);
  border-top: 1px solid var(--border);
  background: var(--bg-card);
}

.floating-button {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  background-color: #007bff; 
  color: white;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 30px;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  z-index: 1000;
  transition: transform 0.2s ease-in-out;
}
.floating-button:hover {
  transform: scale(1.1);
}

.chatbot-container {
  position: fixed;
  bottom: 100px;
  right: 30px;
  z-index: 999;
}

.chat-window-enter-active,
.chat-window-leave-active {
  transition: all 0.4s ease;
}

.chat-window-enter-from,
.chat-window-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>