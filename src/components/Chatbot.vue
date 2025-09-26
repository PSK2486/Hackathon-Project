<template>
  <div class="chat-window">
    <div class="cat-avatar">
      <img :src="currentImage" alt="Assistant Avatar" />
    </div>

    <div v-if="chatState === 'chatting'" class="points-display">
      您的積分：{{ totalPoints }} ✨
    </div>

    <div v-if="!isLoggedIn" class="login-prompt">
      <div class="login-message">
        <h3>🔒 請先登入</h3>
        <p>使用聊天機器人需要先登入您的帳號<br>以便為您提供個人化的積分和心情記錄服務</p>
        <router-link to="/login" class="login-button">前往登入</router-link>
      </div>
    </div>

    <div v-else-if="chatState === 'moodSelection'" class="mood-selection">
      <div class="mood-prompt">您好，{{ currentUser?.name || '用戶' }}！我是您的 AI 助理松坂烤肉。<br>在開始前，可以先告訴我您今天的心情嗎？</div>
      <div class="mood-emojis">
        <span @click="selectMood('Very Happy', '😀')">😀</span>
        <span @click="selectMood('Pretty Good', '🙂')">🙂</span>
        <span @click="selectMood('Okay', '😐')">😐</span>
        <span @click="selectMood('Not So Good', '🙁')">🙁</span>
        <span @click="selectMood('Very Sad', '😢')">😢</span>
      </div>
    </div>

    <div v-if="chatState === 'chatting'" class="messages-container" ref="messagesContainer">
      <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.sender]">
        <div class="message-content" v-html="marked(msg.text)"></div>
      </div>
    </div>

    <div v-if="chatState === 'chatting'" class="input-area">
      <input
        v-model="userInput"
        @keyup.enter="sendMessage"
        placeholder="說點什麼..."
        :disabled="isLoading"
      />
      <button @click="sendMessage" :disabled="isLoading">傳送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';
import axios from 'axios';
import { marked } from 'marked';
import auth from '@/router/auth';

// --- 圖片載入 (維持不變) ---
import img1 from '@/assets/images/1.png';
import img2 from '@/assets/images/2.png';
import img3 from '@/assets/images/3.png';
import img4 from '@/assets/images/4.png';
import img5 from '@/assets/images/5.png';
import img6 from '@/assets/images/6.png';
import img7 from '@/assets/images/7.png';
import img8 from '@/assets/images/8.png';
import img9 from '@/assets/images/9.png';

const talkingImages = [img1, img2, img3, img4, img5, img6];
const idleImages = [img7, img8, img9];

// --- 常數設定 (維持不變) ---
const TALKING_FRAME_RATE = 100;
const IDLE_SWITCH_RATE = 200;
const TYPING_SPEED_MS = 50;

// --- Vue Refs (狀態) ---
const userInput = ref('');
const messages = ref([]);
const isLoading = ref(false);
const currentImage = ref(null); // 初始值設為 null
const botState = ref('idle');
const messagesContainer = ref(null);
const sessionId = ref('');
const chatState = ref('moodSelection');
const totalPoints = ref(0);

// 登入狀態檢查
const currentUser = computed(() => auth.state.user);
const isLoggedIn = computed(() => auth.isAuthed.value);

let animationInterval = null;
let pointsUpdateInterval = null;
let talkingFrameIndex = 0;

// --- 動畫與打字機效果函式 (維持不變) ---
const playAnimation = () => {
  if (animationInterval) clearInterval(animationInterval);
  if (botState.value === 'talking') {
    animationInterval = setInterval(() => {
      talkingFrameIndex = (talkingFrameIndex + 1) % talkingImages.length;
      currentImage.value = talkingImages[talkingFrameIndex];
    }, TALKING_FRAME_RATE);
  } else {
    animationInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * idleImages.length);
      currentImage.value = idleImages[randomIndex];
    }, IDLE_SWITCH_RATE);
  }
};

const typewriterEffect = (fullText) => {
  botState.value = 'talking';
  playAnimation();
  const botMessage = { sender: 'bot', text: '' };
  messages.value.push(botMessage);
  scrollToBottom();
  let charIndex = 0;
  const typingInterval = setInterval(() => {
    if (charIndex < fullText.length) {
      botMessage.text += fullText.charAt(charIndex);
      charIndex++;
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botState.value = 'idle';
      playAnimation();
      isLoading.value = false;
    }
  }, TYPING_SPEED_MS);
};

const fetchTotalPoints = async () => {
  if (!currentUser.value?.id) return;

  try {
    const response = await axios.get('http://localhost:8000/api/points', {
      params: { user_id: currentUser.value.id }
    });
    totalPoints.value = response.data.total_points;
  } catch (error) {
    console.error("獲取總積分失敗:", error);
  }
};

const selectMood = async (moodText, moodEmoji) => {
  if (!currentUser.value?.id) {
    alert('請先登入後再使用聊天機器人');
    return;
  }

  // 再次檢查今天是否已記錄心情（防止重複提交）
  try {
    const checkResponse = await axios.get('http://localhost:8000/api/mood/check', {
      params: { user_id: currentUser.value.id }
    });

    if (checkResponse.data.has_recorded) {
      chatState.value = 'chatting';
      typewriterEffect(`您今天已經記錄過心情了！讓我們開始聊天吧，有什麼我可以幫忙的嗎？`);
      return;
    }
  } catch (error) {
    console.error("檢查心情記錄失敗:", error);
  }

  chatState.value = 'chatting';
  messages.value.push({ sender: 'user', text: moodEmoji });
  scrollToBottom();
  isLoading.value = true;
  const firstMessage = `Today I'm feeling: ${moodText}.`;

  try {
    const response = await axios.post('http://localhost:8000/api/chat', {
      message: firstMessage,
      session_id: sessionId.value,
      user_id: currentUser.value.id,
      mood: moodText,
      chat_history: messages.value
    });

    let finalReply = response.data.reply || response.data.error;

    // 更新積分顯示
    if (response.data.total_points !== null && response.data.total_points !== undefined) {
      totalPoints.value = response.data.total_points;
      console.log(`積分已更新: ${totalPoints.value}`);
    }

    // 首次記錄心情的積分獎勵訊息
    if (finalReply && response.data.points_earned > 0) {
      const pointsMessage = `\n\n✨ 您今天首次記錄心情，獲得 ${response.data.points_earned} 點積分！總積分：${totalPoints.value} `;
      finalReply += pointsMessage;
      console.log(`用戶獲得 ${response.data.points_earned} 積分`);
    }

    typewriterEffect(finalReply);

  } catch (error) {
    console.error("心情記錄失敗:", error);
    const errorMessage = '抱歉，心情記錄時發生問題，請稍後再試。';
    typewriterEffect(errorMessage);
    chatState.value = 'moodSelection'; // 失敗時回到心情選擇
  }
};

const sendMessage = async () => {
  if (!currentUser.value?.id) {
    alert('請先登入後再使用聊天機器人');
    return;
  }

  if (userInput.value.trim() === '' || isLoading.value) return;
  const userMessageText = userInput.value;
  messages.value.push({ sender: 'user', text: userMessageText });
  userInput.value = '';
  scrollToBottom();
  isLoading.value = true;
  try {
    const response = await axios.post('http://localhost:8000/api/chat', {
      message: userMessageText,
      session_id: sessionId.value,
      user_id: currentUser.value.id,
      chat_history: messages.value
    });

    let reply = response.data.reply || response.data.error;

    // 更新積分顯示
    if (response.data.total_points !== null && response.data.total_points !== undefined) {
      totalPoints.value = response.data.total_points;
      console.log(`積分已更新: ${totalPoints.value}`);
    }

    // 如果獲得積分，在回覆中添加積分訊息
    if (response.data.points_earned && response.data.points_earned > 0) {
      const pointsMessage = `\n\n✨ 您獲得了 ${response.data.points_earned} 點積分！總積分：${totalPoints.value}`;
      reply += pointsMessage;
      console.log(`用戶獲得 ${response.data.points_earned} 積分`);
    }

    typewriterEffect(reply);
  } catch (error) {
    console.error("API call failed:", error);
    const errorMessage = '抱歉，連線好像有點問題，請稍後再試。';
    typewriterEffect(errorMessage);
  }
};

// --- 畫面滾動函式 (維持不變) ---
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

const startPointsUpdate = () => {
  // 每30秒更新一次積分
  if (pointsUpdateInterval) clearInterval(pointsUpdateInterval);
  pointsUpdateInterval = setInterval(async () => {
    if (currentUser.value?.id && chatState.value === 'chatting') {
      await fetchTotalPoints();
    }
  }, 30000);
};

const initializeChatbot = async () => {
  sessionId.value = crypto.randomUUID();
  console.log(`New chat session started with ID: ${sessionId.value}`);
  playAnimation();

  // 檢查登入狀態
  if (!currentUser.value?.id) {
    console.log("用戶未登入，顯示登入提示");
    chatState.value = 'loginRequired';
    return;
  }

  console.log(`用戶已登入: ${currentUser.value.name} (ID: ${currentUser.value.id})`);

  try {
    // 預先獲取積分
    await fetchTotalPoints();
    console.log(`當前積分: ${totalPoints.value}`);

    // 開始定期更新積分
    startPointsUpdate();

    // 檢查今天是否已記錄心情
    console.log(`DEBUG: 即將檢查用戶 ${currentUser.value.id} 的心情記錄`);
    const response = await axios.get('http://localhost:8000/api/mood/check', {
        params: { user_id: currentUser.value.id }
    });

    console.log(`DEBUG: 心情檢查回應:`, response.data);

    if (response.data.has_recorded) {
      console.log("DEBUG: 用戶已記錄心情，進入聊天狀態");
      chatState.value = 'chatting';
      typewriterEffect(`歡迎回來，${currentUser.value.name}！很高興再次見到您，今天有什麼我可以協助您的嗎？`);
    } else {
      console.log("DEBUG: 用戶未記錄心情，顯示心情選擇");
      chatState.value = 'moodSelection';
    }
  } catch (error) {
    console.error("初始化聊天機器人失敗:", error);
    // 當無法檢查心情記錄狀態時，直接進入聊天模式，避免卡在心情選擇
    chatState.value = 'chatting';
    typewriterEffect(`歡迎回來，${currentUser.value.name}！系統初始化時遇到小問題，讓我們直接開始聊天吧！`);
  }
};

// 監聽登入狀態變化：登入後自動初始化聊天機器人；未登入顯示登入提示
watch(isLoggedIn, async (val) => {
  if (val) {
    chatState.value = 'moodSelection'
    try {
      await initializeChatbot()
    } catch (e) {
      console.warn('初始化聊天機器人失敗：', e)
    }
  } else {
    chatState.value = 'loginRequired'
  }
})

onMounted(initializeChatbot);

onUnmounted(() => {
  if (animationInterval) clearInterval(animationInterval);
});

</script>

<style scoped>
.login-prompt {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex-grow: 1;
  padding: 20px;
  text-align: center;
}

.login-message h3 {
  margin-bottom: 15px;
  color: #333;
  font-size: 18px;
}

.login-message p {
  margin-bottom: 20px;
  color: #666;
  line-height: 1.6;
}

.login-button {
  display: inline-block;
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 20px;
  transition: background-color 0.2s;
}

.login-button:hover {
  background-color: #0056b3;
}

.mood-selection {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex-grow: 1;
  padding: 20px;
  text-align: center;
}
.mood-prompt {
  font-size: 16px;
  color: #333;
  margin-bottom: 25px;
  line-height: 1.6;
}
.mood-emojis {
  display: flex;
  gap: 15px;
}
.mood-emojis span {
  font-size: 36px;
  cursor: pointer;
  transition: transform 0.2s ease;
}
.mood-emojis span:hover {
  transform: scale(1.3);
}
.chat-window {
  width: 400px;
  height: 500px;
  background: white;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Microsoft JhengHei', '微軟正黑體', sans-serif;
}
.cat-avatar {
  text-align: center;
  padding: 10px;
  background-color: #f1f1f1;
  border-bottom: 1px solid #ddd;
}
.cat-avatar img {
  width: 100px; 
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  background-color: #fff;
}
.points-display {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 5px 15px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  font-weight: bold;
  color: #333;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 10;
}
.chat-window {
  position: relative; 
}
.messages-container {
  flex-grow: 1;
  padding: 15px;
  overflow-y: auto;
  background-color: #fafafa;
  display: flex;
  flex-direction: column;
}
.message {
  margin-bottom: 12px;
  padding: 10px 15px;
  border-radius: 18px;
  max-width: 85%;
  word-wrap: break-word;
  line-height: 1.5;
}
.message.user {
  background-color: #007bff;
  color: white;
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}
.message.bot {
  background-color: #e9e9eb;
  color: black;
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}
.message-content :deep(p) {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.message-content :deep(h1),
.message-content :deep(h2),
.message-content :deep(h3) {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  line-height: 1.25;
}

.message-content :deep(hr) {
  border-top: 1px solid #ddd;
  margin: 1rem 0;
}

.message-content :deep(ul),
.message-content :deep(ol) {
  padding-left: 20px;
  margin-bottom: 0.5rem;
}

.message-content :deep(blockquote) {
  margin: 0 0 1rem 0;
  padding: 0.5rem 1rem;
  border-left: 4px solid #ccc;
  background-color: #f8f8f8;
  color: #555;
}

/* 表格樣式 */
.message-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
  display: block;
  overflow-x: auto; /* 讓表格可以在手機上滑動 */
}

.message-content :deep(th),
.message-content :deep(td) {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}

.message-content :deep(th) {
  background-color: #f2f2f2;
  font-weight: bold;
}
.input-area {
  display: flex;
  padding: 10px;
  border-top: 1px solid #ddd;
  background-color: #fff;
}
.input-area input {
  flex-grow: 1;
  border: 1px solid #ccc;
  border-radius: 20px;
  padding: 10px 15px;
  margin-right: 10px;
  font-size: 14px;
}
.input-area input:focus {
  outline: none;
  border-color: #007bff;
}
.input-area button {
  border: none;
  background-color: #007bff;
  color: white;
  border-radius: 20px;
  padding: 10px 15px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s;
}
.input-area button:hover {
  background-color: #0056b3;
}
.input-area button:disabled {
  background-color: #aaa;
  cursor: not-allowed;
}
</style>