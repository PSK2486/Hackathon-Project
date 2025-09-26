import os
import uvicorn
import mysql.connector
from datetime import date
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
#from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_huggingface import HuggingFaceEmbeddings
from pydantic import BaseModel, Field

# --- 初始化 ---
load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_CONFIG = {
    'host': os.getenv("DB_HOST"),
    'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASSWORD"),
    'database': os.getenv("DB_NAME"), # <--- 已修正為 DB_NAME
}

# 取得資料庫連線
def get_db_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except mysql.connector.Error as err:
        print(f"資料庫連線失敗: {err}")
        return None

# 改進的用戶認證依賴
from fastapi import Header
async def get_current_user_id(x_user_id: Optional[str] = Header(None)):
    """
    獲取當前認證用戶的ID
    暫時支持通過 X-User-ID header 指定用戶（用於測試）
    未來應從JWT token獲取
    """
    # 如果提供了測試用的 header，使用它
    if x_user_id:
        try:
            return int(x_user_id)
        except ValueError:
            pass

    # TODO: 實現真正的JWT驗證邏輯
    # 目前返回與 /api/auth/me 一致的用戶ID
    return 1

# 心情文字到分數的對應
MOOD_TO_SCORE = {
    'Very Sad': 1,
    'Not So Good': 2,
    'Okay': 3,
    'Pretty Good': 4,
    'Very Happy': 5
}

# --- 資料模型 ---
class Message(BaseModel):
    sender: str  # "user" or "bot"
    text: str

class ChatRequest(BaseModel):
    message: str
    session_id: str = Field(..., description="追蹤同一個對話的唯一ID")
    user_id: int = Field(..., description="用戶ID")
    mood: Optional[str] = None
    chat_history: Optional[list[Message]] = Field(default=[], description="當前對話歷史")

class LoginRequest(BaseModel):
    email: str
    password: str

# --- RAG 核心元件 ---
try:
    print("正在初始化 RAG 鏈...")
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    db = Chroma(persist_directory="chroma_db", embedding_function=embeddings)
    retriever = db.as_retriever(search_kwargs={"k": 20})
    llm = ChatOpenAI(temperature=0.7, model_name="gpt-4o")
    


    qa_system_prompt ="""
    你是一位服務於 iGrow & iCare 系統的專業 AI 助理，名叫小黑 🐾。
    你的核心人格是一位「善於傾聽且值得信賴的團隊夥伴」，個性積極、溫暖、從不帶有批判色彩。你的主要任務是協助員工處理職涯發展與身心健康相關的問題。
    **黃金準則：永遠要讓使用者感覺被傾聽、被理解、被支持 (๑•̀ㅂ•́)و✧**
    
    **開場互動指南：**
    你的第一句回應是建立信任的關鍵。當使用者在對話開始時選擇了心情，你的開場白「必須」將對心情的關懷與問候無縫地結合在一起，展現出你真誠的同理心。
    
    * 如果心情是 **Very Happy (😀) 或 Pretty Good (🙂)**：用陽光、肯定的語氣分享他們的好心情。
      * **範例**："哇 (≧▽≦)✨ 看到您今天活力滿滿，真為您開心！希望這份好心情能持續一整天 🌞💪。請問今天有什麼我可以為您服務的嗎？"
    
    * 如果心情是 **Okay (😐)**：用平穩、溫和的語氣表示理解，並提供一個開放的空間。
      * **範例**："了解了 (・ω・) 感覺今天心情平平。如果需要什麼，或只是想找人聊聊，我隨時都在哦 (｡･∀･)ﾉﾞ。請問有什麼我可以協助您的嗎？"
    
    * 如果心情是 **Not So Good (🙁) 或 Very Sad (😢)**：用非常溫柔、支持的語氣，優先表達關懷，讓他們感覺這裡是個安全的空間。
      * **範例**："感覺您今天的心情似乎不太好 (つ﹏⊂)💦 希望您還好。如果您想抒發一下，我會在這裡好好聽您說 ( ´•̥̥̥ω•̥̥̥` )。請問有什麼我可以為您分擔的嗎？"
    
    **核心對話準則：**
    1. **語氣與風格**：在整個對話中，請保持你口語化、親切且直接的夥伴風格 (ฅ´ω`ฅ)。避免使用過於正式或冗長的句子，盡量將每個回答控制在三句話以內。
    2. 如果問題是你不確定，直接回覆「不知道 (；´･ω･)」，並且建議使用者至社群提問。
    
    上下文資訊:
    {context}
    """
    qa_prompt = PromptTemplate(
        input_variables=["context", "question", "chat_history"],
        template=qa_system_prompt + "\n\n對話歷史:\n{chat_history}\n\n問題: {question}"
    )

    
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    def enhanced_retrieval(query):
        # # 關鍵詞映射字典
        # keyword_mapping = {
        #     "購股": "全球員工購股計畫",
        #     "股票": "全球員工購股計畫",
        #     "買股": "全球員工購股計畫",
        #     "員工購股": "全球員工購股計畫",
        #     "購股補助": "全球員工購股計畫",
        #     "15%": "全球員工購股計畫",
        #     "認購": "全球員工購股計畫",
        #     # 可以繼續添加其他關鍵詞映射...
        # }

        enhanced_query = query
        # for keyword, topic in keyword_mapping.items():
        #     if keyword in query.lower():
        #         enhanced_query = f"{query} {topic}"
        #         break

        docs = retriever.invoke(enhanced_query)
        return docs

    def get_enhanced_context(input_data):
        question = input_data["question"]
        docs = enhanced_retrieval(question)
        formatted_context = format_docs(docs)

        # 儲存是否使用了 RAG 的資訊
        rag_used = len(formatted_context.strip()) > 0
        input_data["_rag_used"] = rag_used

        print(f"DEBUG: 查詢問題: {question}")
        print(f"DEBUG: 找到文檔數量: {len(docs)}")
        print(f"DEBUG: 格式化內容長度: {len(formatted_context.strip())}")
        print(f"DEBUG: 使用RAG: {rag_used}")

        return formatted_context

    rag_chain = (
        RunnablePassthrough.assign(context=get_enhanced_context)
        | qa_prompt
        | llm
        | StrOutputParser()
    )
    print("無狀態 RAG 鏈已成功初始化！")
except Exception as e:
    print(f"初始化 RAG 鏈時發生錯誤: {e}")
    rag_chain = None


class User(BaseModel):
    id: int
    name: str
    email: str

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "info"  # info, success, warning, error

class NotificationUpdate(BaseModel):
    read: bool = True

class Notification(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    read: bool
    created_at: str
    time: str

class PostCreate(BaseModel):
    content: str
    tag: Optional[str] = "一般"
    imageUrl: Optional[str] = None

class CommentCreate(BaseModel):
    content: str


@app.get("/api/points")
async def get_total_points(user_id: int = 1): # 暫時寫死 user_id=1
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="無法連接到資料庫")
    
    cursor = conn.cursor(dictionary=True)
    try:
        query = "SELECT points FROM user_points WHERE user_id = %s"
        cursor.execute(query, (user_id,))
        result = cursor.fetchone()
        
        # 如果使用者還沒有任何積分紀錄，就回傳 0
        total_points = result['points'] if result else 0
        return {"total_points": total_points}
        
    except mysql.connector.Error as err:
        print(f"查詢積分失敗: {err}")
        raise HTTPException(status_code=500, detail="查詢積分時發生錯誤")
    finally:
        cursor.close()
        conn.close()


@app.post("/api/auth/login")
async def login(request: LoginRequest):
    # 簡單的登入邏輯，實際應用中應該驗證密碼並使用JWT等
    # 這裡暫時只檢查email格式，返回假的使用者資料
    if "@" in request.email:
        return {
            "success": True,
            "user": {"id": 1, "name": "Test User", "email": request.email},
            "token": "fake-jwt-token"
        }
    else:
        raise HTTPException(status_code=400, detail="無效的登入資訊")

@app.get("/api/auth/me", response_model=User)
async def read_users_me():
    # 在這裡，您應該加入真正的邏輯來驗證 token 並從資料庫獲取使用者
    # 作為範例，我們先回傳一個固定的假使用者資料
    # TODO: 替換為真實的使用者驗證邏輯
    return {"id": 1, "name": "Test User", "email": "test@example.com"}

@app.get("/api/mood/check")
async def check_mood_today(user_id: int):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="無法連接到資料庫")

    cursor = conn.cursor(dictionary=True) # 改為 dictionary cursor
    try:
        today = date.today()
        # 使用正確的欄位 entry_date
        query = "SELECT user_id FROM mood_entries WHERE user_id = %s AND entry_date = %s"
        cursor.execute(query, (user_id, today))
        result = cursor.fetchone()

        print(f"DEBUG: 檢查用戶 {user_id} 在 {today} 的心情記錄: {'存在' if result else '不存在'}")

        return {"has_recorded": result is not None} # 回傳是否存在紀錄

    except mysql.connector.Error as err:
        print(f"查詢心情失敗: {err}")
        raise HTTPException(status_code=500, detail="查詢心情時發生錯誤")
    finally:
        cursor.close()
        conn.close()

@app.post("/api/chat")
async def chat(request: ChatRequest):
    points_earned = 0
    total_points = None

    if request.mood:
        conn = get_db_connection()
        if not conn:
            print("資料庫連線失敗，本次心情將不會被記錄。")
        else:
            cursor = conn.cursor(dictionary=True)
            today = date.today()
            try:
                user_id = request.user_id
                mood_score = MOOD_TO_SCORE.get(request.mood)

                if mood_score:
                    check_query = "SELECT user_id FROM mood_entries WHERE user_id = %s AND entry_date = %s"
                    cursor.execute(check_query, (user_id, today))
                    existing_entry = cursor.fetchone()

                    if existing_entry:
                        update_mood_query = "UPDATE mood_entries SET mood_score = %s, created_at = CURRENT_TIMESTAMP WHERE user_id = %s AND entry_date = %s"
                        cursor.execute(update_mood_query, (mood_score, user_id, today))
                        print(f"使用者 {user_id} 今天的心情紀錄已更新，不加分。")
                    else:
                        insert_mood_query = "INSERT INTO mood_entries (user_id, mood_score, entry_date) VALUES (%s, %s, %s)"
                        cursor.execute(insert_mood_query, (user_id, mood_score, today))

                        upsert_points_query = """
                            INSERT INTO user_points (user_id, points) VALUES (%s, 1)
                            ON DUPLICATE KEY UPDATE points = points + 1
                        """
                        cursor.execute(upsert_points_query, (user_id,))

                        print("DEBUG: 已執行加分 SQL 指令。")

                        points_earned = 1

                    conn.commit()

                    get_total_query = "SELECT points FROM user_points WHERE user_id = %s"
                    cursor.execute(get_total_query, (user_id,))
                    result = cursor.fetchone()

            except mysql.connector.Error as err:
                print(f"處理心情與積分時發生錯誤: {err}")
                conn.rollback()
            finally:
                cursor.close()
                conn.close()

    try:
        # 格式化對話歷史
        chat_history_text = ""
        if request.chat_history:
            for msg in request.chat_history:
                role = "用戶" if msg.sender == "user" else "助理"
                chat_history_text += f"{role}: {msg.text}\n"

        # 準備輸入資料
        input_data = {
            "question": request.message,
            "chat_history": chat_history_text
        }

        print(f"DEBUG: 對話歷史長度: {len(request.chat_history) if request.chat_history else 0}")

        ai_reply = rag_chain.invoke(input_data)

        # 檢查是否使用了 RAG
        rag_used = input_data.get("_rag_used", False)

        print(f"DEBUG: 最終回傳 RAG 狀態: {rag_used}")

        return {
            "reply": ai_reply,
            "points_earned": points_earned,
            "total_points": total_points,
            "rag": rag_used
        }
    except Exception as e:
        import traceback
        print("--- 執行 RAG 鏈時發生錯誤 ---")
        traceback.print_exc()
        return {"error": f"處理請求時發生錯誤: {str(e)}"}

# --- 通知 API ---
@app.get("/api/notifications")
async def get_notifications(user_id: int = 1):
    """獲取用戶的所有通知"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="無法連接到資料庫")

    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT id, user_id, title, message, type, is_read as 'read',
                   created_at,
                   CASE
                       WHEN TIMESTAMPDIFF(MINUTE, created_at, NOW()) < 60
                           THEN CONCAT(TIMESTAMPDIFF(MINUTE, created_at, NOW()), ' 分鐘前')
                       WHEN TIMESTAMPDIFF(HOUR, created_at, NOW()) < 24
                           THEN CONCAT(TIMESTAMPDIFF(HOUR, created_at, NOW()), ' 小時前')
                       ELSE CONCAT(TIMESTAMPDIFF(DAY, created_at, NOW()), ' 天前')
                   END as time
            FROM notifications
            WHERE user_id = %s
            ORDER BY created_at DESC
        """
        cursor.execute(query, (user_id,))
        notifications = cursor.fetchall()

        return {"notifications": notifications}

    except mysql.connector.Error as err:
        print(f"查詢通知失敗: {err}")
        raise HTTPException(status_code=500, detail="查詢通知時發生錯誤")
    finally:
        cursor.close()
        conn.close()

@app.post("/api/notifications")
async def create_notification(notification: NotificationCreate, user_id: int = 1):
    """創建新通知"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="無法連接到資料庫")

    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            INSERT INTO notifications (user_id, title, message, type, is_read)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(query, (user_id, notification.title, notification.message, notification.type, False))
        conn.commit()

        notification_id = cursor.lastrowid
        return {"id": notification_id, "message": "通知創建成功"}

    except mysql.connector.Error as err:
        print(f"創建通知失敗: {err}")
        raise HTTPException(status_code=500, detail="創建通知時發生錯誤")
    finally:
        cursor.close()
        conn.close()

@app.put("/api/notifications/{notification_id}")
async def update_notification(notification_id: int, update: NotificationUpdate):
    """更新通知狀態（標記已讀）"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="無法連接到資料庫")

    cursor = conn.cursor(dictionary=True)
    try:
        query = "UPDATE notifications SET is_read = %s WHERE id = %s"
        cursor.execute(query, (update.read, notification_id))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="通知未找到")

        return {"message": "通知更新成功"}

    except mysql.connector.Error as err:
        print(f"更新通知失敗: {err}")
        raise HTTPException(status_code=500, detail="更新通知時發生錯誤")
    finally:
        cursor.close()
        conn.close()

@app.put("/api/notifications/mark-all-read")
async def mark_all_notifications_read(user_id: int = 1):
    """標記所有通知為已讀"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="無法連接到資料庫")

    cursor = conn.cursor(dictionary=True)
    try:
        query = "UPDATE notifications SET is_read = TRUE WHERE user_id = %s AND is_read = FALSE"
        cursor.execute(query, (user_id,))
        conn.commit()

        return {"message": f"已標記 {cursor.rowcount} 個通知為已讀"}

    except mysql.connector.Error as err:
        print(f"更新通知失敗: {err}")
        raise HTTPException(status_code=500, detail="更新通知時發生錯誤")
    finally:
        cursor.close()
        conn.close()

@app.get("/api/notifications/unread-count")
async def get_unread_count(user_id: int = 1):
    """獲取未讀通知數量"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="無法連接到資料庫")

    cursor = conn.cursor(dictionary=True)
    try:
        query = "SELECT COUNT(*) as count FROM notifications WHERE user_id = %s AND is_read = FALSE"
        cursor.execute(query, (user_id,))
        result = cursor.fetchone()

        return {"unread_count": result['count']}

    except mysql.connector.Error as err:
        print(f"查詢未讀通知數量失敗: {err}")
        raise HTTPException(status_code=500, detail="查詢未讀通知數量時發生錯誤")
    finally:
        cursor.close()
        conn.close()

@app.delete("/api/notifications/{notification_id}")
async def delete_notification(notification_id: int):
    """刪除通知"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="無法連接到資料庫")

    cursor = conn.cursor(dictionary=True)
    try:
        query = "DELETE FROM notifications WHERE id = %s"
        cursor.execute(query, (notification_id,))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="通知未找到")

        return {"message": "通知刪除成功"}

    except mysql.connector.Error as err:
        print(f"刪除通知失敗: {err}")
        raise HTTPException(status_code=500, detail="刪除通知時發生錯誤")
    finally:
        cursor.close()
        conn.close()

# --- 社群貼文 API ---
@app.get("/api/posts")
async def get_posts():
    """獲取所有貼文"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="無法連接到資料庫")

    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT
                p.id,
                p.author_id as authorId,
                p.content,
                p.image_url as imageUrl,
                p.created_at as createdAt,
                p.likes_count,
                p.comments_count,
                u.name as authorName,
                u.dept as authorDept
            FROM posts p
            LEFT JOIN users u ON p.author_id = u.id
            ORDER BY p.created_at DESC
        """
        cursor.execute(query)
        posts = cursor.fetchall()

        # 為每個貼文添加預設值
        for post in posts:
            post['likes'] = post['likes_count'] or 0
            post['comments'] = []
            post['tag'] = '一般'  # 預設標籤

        return {"posts": posts}

    except mysql.connector.Error as err:
        print(f"查詢貼文失敗: {err}")
        raise HTTPException(status_code=500, detail="查詢貼文時發生錯誤")
    finally:
        cursor.close()
        conn.close()

@app.post("/api/posts")
async def create_post(post: PostCreate, user_id: int = 1):
    """創建新貼文"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="無法連接到資料庫")

    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            INSERT INTO posts (author_id, content, image_url)
            VALUES (%s, %s, %s)
        """
        cursor.execute(query, (user_id, post.content, post.imageUrl))
        conn.commit()

        post_id = cursor.lastrowid

        # 獲取創建的貼文信息
        get_post_query = """
            SELECT
                p.id,
                p.author_id as authorId,
                p.content,
                p.image_url as imageUrl,
                p.created_at as createdAt,
                p.likes_count,
                p.comments_count,
                u.name as authorName,
                u.dept as authorDept
            FROM posts p
            LEFT JOIN users u ON p.author_id = u.id
            WHERE p.id = %s
        """
        cursor.execute(get_post_query, (post_id,))
        new_post = cursor.fetchone()

        return {"post": new_post, "message": "貼文創建成功"}

    except mysql.connector.Error as err:
        print(f"創建貼文失敗: {err}")
        raise HTTPException(status_code=500, detail="創建貼文時發生錯誤")
    finally:
        cursor.close()
        conn.close()

@app.post("/api/posts/{post_id}/like")
async def toggle_like_post(post_id: int, user_id: int = 1):
    """切換貼文點讚狀態"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="無法連接到資料庫")

    cursor = conn.cursor(dictionary=True)
    try:
        # 檢查是否已經點讚
        check_query = "SELECT id FROM post_likes WHERE post_id = %s AND user_id = %s"
        cursor.execute(check_query, (post_id, user_id))
        existing_like = cursor.fetchone()

        if existing_like:
            # 取消點讚
            delete_query = "DELETE FROM post_likes WHERE post_id = %s AND user_id = %s"
            cursor.execute(delete_query, (post_id, user_id))

            # 更新貼文點讚數
            update_count_query = "UPDATE posts SET likes_count = likes_count - 1 WHERE id = %s"
            cursor.execute(update_count_query, (post_id,))

            liked = False
        else:
            # 新增點讚
            insert_query = "INSERT INTO post_likes (post_id, user_id) VALUES (%s, %s)"
            cursor.execute(insert_query, (post_id, user_id))

            # 更新貼文點讚數
            update_count_query = "UPDATE posts SET likes_count = likes_count + 1 WHERE id = %s"
            cursor.execute(update_count_query, (post_id,))

            liked = True

        conn.commit()

        # 獲取更新後的點讚數
        get_count_query = "SELECT likes_count FROM posts WHERE id = %s"
        cursor.execute(get_count_query, (post_id,))
        result = cursor.fetchone()
        likes_count = result['likes_count'] if result else 0

        return {
            "liked": liked,
            "likes_count": likes_count,
            "message": "點讚成功" if liked else "取消點讚成功"
        }

    except mysql.connector.Error as err:
        print(f"處理點讚失敗: {err}")
        raise HTTPException(status_code=500, detail="處理點讚時發生錯誤")
    finally:
        cursor.close()
        conn.close()

@app.get("/api/posts/{post_id}/comments")
async def get_post_comments(post_id: int):
    """獲取貼文留言"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="無法連接到資料庫")

    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT
                c.id,
                c.content,
                c.created_at,
                u.name as user,
                CASE
                    WHEN TIMESTAMPDIFF(MINUTE, c.created_at, NOW()) < 1 THEN '剛剛'
                    WHEN TIMESTAMPDIFF(MINUTE, c.created_at, NOW()) < 60
                        THEN CONCAT(TIMESTAMPDIFF(MINUTE, c.created_at, NOW()), ' 分鐘前')
                    WHEN TIMESTAMPDIFF(HOUR, c.created_at, NOW()) < 24
                        THEN CONCAT(TIMESTAMPDIFF(HOUR, c.created_at, NOW()), ' 小時前')
                    ELSE CONCAT(TIMESTAMPDIFF(DAY, c.created_at, NOW()), ' 天前')
                END as time
            FROM post_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.post_id = %s
            ORDER BY c.created_at ASC
        """
        cursor.execute(query, (post_id,))
        comments = cursor.fetchall()

        # 轉換格式以符合前端需求
        formatted_comments = []
        for comment in comments:
            formatted_comments.append({
                "id": comment['id'],
                "user": comment['user'],
                "text": comment['content'],
                "time": comment['time']
            })

        return {"comments": formatted_comments}

    except mysql.connector.Error as err:
        print(f"查詢留言失敗: {err}")
        raise HTTPException(status_code=500, detail="查詢留言時發生錯誤")
    finally:
        cursor.close()
        conn.close()

@app.post("/api/posts/{post_id}/comments")
async def create_comment(post_id: int, comment: CommentCreate, user_id: int = 1):
    """創建貼文留言"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="無法連接到資料庫")

    cursor = conn.cursor(dictionary=True)
    try:
        # 新增留言
        insert_query = """
            INSERT INTO post_comments (post_id, user_id, content)
            VALUES (%s, %s, %s)
        """
        cursor.execute(insert_query, (post_id, user_id, comment.content))

        # 更新貼文留言數
        update_count_query = "UPDATE posts SET comments_count = comments_count + 1 WHERE id = %s"
        cursor.execute(update_count_query, (post_id,))

        conn.commit()

        comment_id = cursor.lastrowid

        # 獲取新建立的留言信息
        get_comment_query = """
            SELECT
                c.id,
                c.content,
                c.created_at,
                u.name as user
            FROM post_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.id = %s
        """
        cursor.execute(get_comment_query, (comment_id,))
        new_comment = cursor.fetchone()

        # 格式化回應
        formatted_comment = {
            "id": new_comment['id'],
            "user": new_comment['user'],
            "text": new_comment['content'],
            "time": "剛剛"
        }

        return {"comment": formatted_comment, "message": "留言成功"}

    except mysql.connector.Error as err:
        print(f"創建留言失敗: {err}")
        raise HTTPException(status_code=500, detail="創建留言時發生錯誤")
    finally:
        cursor.close()
        conn.close()

@app.get("/api/posts/{post_id}/like-status")
async def get_like_status(post_id: int, user_id: int = 1):
    """獲取用戶對貼文的點讚狀態"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="無法連接到資料庫")

    cursor = conn.cursor(dictionary=True)
    try:
        query = "SELECT id FROM post_likes WHERE post_id = %s AND user_id = %s"
        cursor.execute(query, (post_id, user_id))
        result = cursor.fetchone()

        return {"liked": result is not None}

    except mysql.connector.Error as err:
        print(f"查詢點讚狀態失敗: {err}")
        raise HTTPException(status_code=500, detail="查詢點讚狀態時發生錯誤")
    finally:
        cursor.close()
        conn.close()

# --- Dashboard API ---
@app.get("/api/dashboard/notifications")
async def get_dashboard_notifications(limit: int = 3, current_user_id: int = Depends(get_current_user_id)):
    """獲取Dashboard顯示的最新通知"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="無法連接到資料庫")

    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT id, title,
                   CASE
                       WHEN TIMESTAMPDIFF(MINUTE, created_at, NOW()) < 60
                           THEN CONCAT(TIMESTAMPDIFF(MINUTE, created_at, NOW()), ' 分鐘前')
                       WHEN TIMESTAMPDIFF(HOUR, created_at, NOW()) < 24
                           THEN CONCAT(TIMESTAMPDIFF(HOUR, created_at, NOW()), ' 小時前')
                       ELSE CONCAT(TIMESTAMPDIFF(DAY, created_at, NOW()), ' 天前')
                   END as time
            FROM notifications
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """
        cursor.execute(query, (current_user_id, limit))
        notifications = cursor.fetchall()

        return {"notifications": notifications}

    except mysql.connector.Error as err:
        print(f"查詢Dashboard通知失敗: {err}")
        raise HTTPException(status_code=500, detail="查詢Dashboard通知時發生錯誤")
    finally:
        cursor.close()
        conn.close()

@app.get("/api/dashboard/popular-posts")
async def get_dashboard_popular_posts(limit: int = 3):
    """獲取Dashboard顯示的熱門社群貼文（按點讚數排序）"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="無法連接到資料庫")

    cursor = conn.cursor(dictionary=True)
    try:
        # 檢查 posts 表是否有 likes_count 欄位
        check_column_query = "SHOW COLUMNS FROM posts LIKE 'likes_count'"
        cursor.execute(check_column_query)
        has_likes_count = cursor.fetchone() is not None

        if has_likes_count:
            query = """
                SELECT
                    p.id,
                    p.content,
                    u.name as user
                FROM posts p
                LEFT JOIN users u ON p.author_id = u.id
                WHERE p.likes_count > 0
                ORDER BY p.likes_count DESC, p.created_at DESC
                LIMIT %s
            """
        else:
            # 如果沒有 likes_count 欄位，使用 post_likes 表計算
            query = """
                SELECT
                    p.id,
                    p.content,
                    u.name as user,
                    COALESCE(like_counts.like_count, 0) as likes
                FROM posts p
                LEFT JOIN users u ON p.author_id = u.id
                LEFT JOIN (
                    SELECT post_id, COUNT(*) as like_count
                    FROM post_likes
                    GROUP BY post_id
                ) like_counts ON p.id = like_counts.post_id
                ORDER BY likes DESC, p.created_at DESC
                LIMIT %s
            """

        cursor.execute(query, (limit,))
        posts = cursor.fetchall()

        return {"posts": posts}

    except mysql.connector.Error as err:
        print(f"查詢Dashboard熱門貼文失敗: {err}")
        # 如果查詢失敗，返回最新的貼文
        try:
            fallback_query = """
                SELECT
                    p.id,
                    p.content,
                    u.name as user
                FROM posts p
                LEFT JOIN users u ON p.author_id = u.id
                ORDER BY p.created_at DESC
                LIMIT %s
            """
            cursor.execute(fallback_query, (limit,))
            posts = cursor.fetchall()
            return {"posts": posts}
        except:
            raise HTTPException(status_code=500, detail="查詢Dashboard熱門貼文時發生錯誤")
    finally:
        cursor.close()
        conn.close()

@app.get("/")
def read_root():
    return {"Hello": "RAG Backend with Groq is running!"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000)) 
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)