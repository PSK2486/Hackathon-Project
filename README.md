# 🌱 iGrow & iCare - 職場學習與支持平台

一個基於 **Vue 3** 和 **Vite** 架構的現代化職場訓練與社群平台，提供智能聊天機器人、積分系統、地圖導覽等多元功能，助你在職場持續成長、互動交流！

---

## 🚀 功能特色

- **📚 職涯訓練系統**  
  課程管理、進度追蹤，讓學習更有效率
- **💬 AI 聊天機器人**  
  智能對話 & RAG 知識問答
- **🎯 積分與心情系統**  
  互動式積分獎勵 & 心情紀錄
- **🗺️ 地圖導覽**  
  位置服務 & 導航功能
- **👥 社群互動**  
  用戶社群、通知系統
- **🔐 用戶認證**  
  JWT 身份驗證 & 權限管理

---

## 🛠️ 技術架構

### 前端
- **Vue 3**、**Vue Router 4**
- **Vite** - 快速建構工具
- **Tailwind CSS 4** - 現代化 CSS
- **Axios** - HTTP 請求
- **Marked** - Markdown 渲染

### 後端
- **Express.js** (Node.js 框架)
- **MySQL** - 關聯式資料庫
- **JWT** - 身份驗證
- **bcrypt** - 密碼加密

---

## 📋 環境需求

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **MySQL** >= 8.0

---

## ⚡ 快速開始

### 1. 專案安裝

```bash
# 克隆專案
git clone [your-repository-url]
cd workmate

# 安裝前端依賴
npm install
```

### 2. 資料庫設定

建立 MySQL 資料庫：

```sql
CREATE DATABASE IF NOT EXISTS workmate DEFAULT CHARACTER SET utf8mb4;
USE workmate;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(60) DEFAULT 'Member',
  dept VARCHAR(60) DEFAULT 'General',
  avatar_url VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. 後端設定

```bash
# 進入伺服器目錄
cd server

# 安裝後端依賴
npm install

# 建立環境變數檔案
cp .env.example .env
```

編輯 `.env`：

```
PORT=5174
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=workmate
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES=7d
```

### 4. 啟動應用

```bash
# 啟動後端服務
cd server
npm run dev

# 新終端啟動前端
cd ..
npm run dev
```

- 前端：http://localhost:5173  
- 後端 API：http://localhost:5174

---

## 📱 使用指南

### 用戶註冊與登入
- 訪問 `/register` 建立新帳號
- 使用 `/login` 登入系統，登入後可使用完整功能

### 主要功能

- **📚 職涯訓練**  
  - 進入「職涯訓練」頁面查看課程
  - 點擊課程查看詳情，完成課程獲得積分

- **💬 AI 聊天機器人**  
  - 點擊右下角聊天按鈕開啟對話
  - 首次需選擇心情狀態，與 AI 助理互動可獲積分

- **🗺️ 地圖功能**  
  - 地圖頁查看位置資訊，啟用導航

- **👥 社群互動**  
  - 社群頁與用戶互動，查看通知與動態

---

## 🗂️ 專案結構

```
workmate/
├── src/
│   ├── components/
│   │   ├── NavBar.vue
│   │   └── Chatbot.vue
│   ├── views/
│   │   ├── Dashboard.vue
│   │   ├── Training.vue
│   │   ├── CourseDetail.vue
│   │   ├── Community.vue
│   │   ├── MapView.vue
│   │   ├── Login.vue
│   │   ├── Register.vue
│   │   └── Notifications.vue
│   ├── router/
│   │   ├── index.js
│   │   ├── auth.js
│   │   └── training.js
│   ├── utils/
│   ├── assets/
│   ├── App.vue
│   ├── main.js
│   └── style.css
├── server/
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## 🔌 API 接口

### 身份驗證
- `POST /api/auth/register` - 用戶註冊
- `POST /api/auth/login` - 用戶登入
- `GET /api/auth/me` - 獲取當前用戶
- `POST /api/auth/logout` - 用戶登出

### 訓練系統
- `GET /api/training/courses` - 課程列表
- `GET /api/training/course/:id` - 課程詳情
- `POST /api/training/progress` - 更新學習進度

### 聊天機器人
- `POST /api/chat/message` - 發送訊息
- `GET /api/chat/history` - 聊天記錄

---

## 🎨 自定義配置

- **樣式自定義**  
  - 修改 `src/style.css` 全域樣式  
  - 使用 Tailwind CSS 類別快速套用  
  - 組件內 `<style>` 局部樣式

- **路由配置**  
  - 在 `src/router/index.js` 添加新路由  
  - 模組化路由配置於 `src/router/`

---

## 🐛 故障排除

- **無法連接資料庫**  
  - 確認 MySQL 服務運行  
  - 檢查 `.env` 資料庫設定

- **JWT 認證失敗**  
  - 確認 `JWT_SECRET` 設定正確  
  - 檢查 httpOnly cookies 支援

- **前端無法訪問 API**  
  - 確認後端在 5174 port 運行  
  - 檢查 Vite 代理

---

## 🤝 貢獻指南

1. Fork 本專案
2. 建立分支 `git checkout -b feature/AmazingFeature`
3. 提交更改 `git commit -m 'Add some AmazingFeature'`
4. 推送分支 `git push origin feature/AmazingFeature`
5. 開啟 Pull Request

---

## 📄 授權

本專案由「黑客松板烤肉團隊」開發製作。

---

## 📞 聯絡支援

如有任何問題或建議，歡迎聯絡開發團隊。

---

感謝使用 **iGrow & iCare** 平台！🎉
