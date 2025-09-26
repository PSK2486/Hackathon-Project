# iGrow & iCare - 職場學習與支持平台

一個基於 Vue 3 和 Vite 的現代化職場訓練與社群平台，提供智能聊天機器人、積分系統、地圖導覽等功能。

## 🌟 功能特色

- **📚 職涯訓練系統** - 課程管理與進度追蹤
- **💬 AI 聊天機器人** - 智能對話與 RAG 知識問答
- **🎯 積分與心情系統** - 互動式積分獎勵與心情記錄
- **🗺️ 地圖導覽** - 位置服務與導航功能
- **👥 社群互動** - 用戶社群與通知系統
- **🔐 用戶認證** - JWT 身份驗證與權限管理

## 🛠️ 技術架構

### 前端技術棧
- **Vue 3** - 響應式前端框架
- **Vue Router 4** - 單頁應用路由
- **Vite** - 快速建構工具
- **Tailwind CSS 4** - 現代化 CSS 框架
- **Axios** - HTTP 請求庫
- **Marked** - Markdown 渲染

### 後端技術棧
- **Express.js** - Node.js 後端框架
- **MySQL** - 關聯式資料庫
- **JWT** - 身份驗證
- **bcrypt** - 密碼加密

## 📋 環境需求

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **MySQL** >= 8.0

## 🚀 快速開始

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

### 3. 後端設定（如果有後端伺服器）

```bash
# 進入伺服器目錄
cd server

# 安裝後端依賴
npm install

# 建立環境變數檔案
cp .env.example .env
```

編輯 `.env` 檔案：

```env
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
# 啟動後端服務（如適用）
cd server
npm run dev

# 在新終端啟動前端開發服務
cd ..
npm run dev
```

前端將在 `http://localhost:5173` 啟動
後端 API 將在 `http://localhost:5174` 啟動

## 📱 使用指南

### 用戶註冊與登入
1. 訪問 `/register` 建立新帳號
2. 使用 `/login` 登入系統
3. 登入後可使用完整功能

### 主要功能使用

#### 📚 職涯訓練
- 進入「職涯訓練」頁面查看所有課程
- 點擊課程查看詳細內容
- 完成課程獲得積分獎勵

#### 💬 AI 聊天機器人
- 點擊右下角聊天按鈕開啟對話
- 首次使用需選擇心情狀態
- 與 AI 助理松坂烤肉互動獲得積分

#### 🗺️ 地圖功能
- 在地圖頁面查看位置資訊
- 使用導覽功能

#### 👥 社群互動
- 在社群頁面與其他用戶互動
- 查看最新通知與動態

## 🔧 開發指令

```bash
# 啟動開發伺服器
npm run dev

# 建構生產版本
npm run build

# 預覽生產版本
npm run preview
```

## 📁 專案結構

```
workmate/
├── src/
│   ├── components/          # 可複用組件
│   │   ├── NavBar.vue      # 導航欄
│   │   └── Chatbot.vue     # 聊天機器人
│   ├── views/              # 頁面組件
│   │   ├── Dashboard.vue   # 儀表板
│   │   ├── Training.vue    # 訓練頁面
│   │   ├── CourseDetail.vue # 課程詳情
│   │   ├── Community.vue   # 社群頁面
│   │   ├── MapView.vue     # 地圖頁面
│   │   ├── Login.vue       # 登入頁面
│   │   ├── Register.vue    # 註冊頁面
│   │   └── Notifications.vue # 通知頁面
│   ├── router/             # 路由設定
│   │   ├── index.js        # 主路由
│   │   ├── auth.js         # 身份驗證
│   │   └── training.js     # 訓練模組
│   ├── utils/              # 工具函數
│   ├── assets/             # 靜態資源
│   ├── App.vue             # 根組件
│   ├── main.js             # 應用入口
│   └── style.css           # 全域樣式
├── server/                 # 後端伺服器（如適用）
├── package.json            # 專案配置
├── vite.config.js          # Vite 配置
├── tailwind.config.js      # Tailwind 配置
└── README.md               # 專案說明
```

## 🔌 API 接口

### 身份驗證
- `POST /api/auth/register` - 用戶註冊
- `POST /api/auth/login` - 用戶登入
- `GET /api/auth/me` - 獲取當前用戶
- `POST /api/auth/logout` - 用戶登出

### 訓練系統
- `GET /api/training/courses` - 獲取課程列表
- `GET /api/training/course/:id` - 獲取課程詳情
- `POST /api/training/progress` - 更新學習進度

### 聊天機器人
- `POST /api/chat/message` - 發送聊天訊息
- `GET /api/chat/history` - 獲取聊天記錄

## 🎨 自定義配置

### 樣式自定義
- 修改 `src/style.css` 調整全域樣式
- 使用 Tailwind CSS 類別進行快速樣式設定
- 組件內 `<style>` 區塊進行局部樣式調整

### 路由配置
- 在 `src/router/index.js` 添加新路由
- 模組化路由配置在 `src/router/` 目錄下

## 🐛 故障排除

### 常見問題

1. **無法連接資料庫**
   - 確認 MySQL 服務正在運行
   - 檢查 `.env` 檔案中的資料庫配置

2. **JWT 認證失敗**
   - 確認 JWT_SECRET 已正確設定
   - 檢查瀏覽器是否支援 httpOnly cookies

3. **前端無法訪問 API**
   - 確認後端服務正在 port 5174 運行
   - 檢查 Vite 代理配置

## 🤝 貢獻指南

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 授權

本專案由黑客松板烤肉團隊開發製作。

## 📞 聯絡支援

如有任何問題或建議，請聯絡開發團隊。

---

**感謝使用 iGrow & iCare 平台！** 🎉