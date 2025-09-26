import os
import re
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.schema import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

load_dotenv()

DATA_PATH = "data"
DB_PATH = "chroma_db"

def qa_splitter(documents):
    """
    將文件依照 Q: / A: 的格式切分成問答對
    """
    qa_docs = []
    for doc in documents:
        text = doc.page_content
        # 找出所有 Q&A pair (支援中英文冒號)
        pairs = re.findall(r"(Q[:：].*?)(A[:：].*?)(?=Q[:：]|$)", text, re.S)
        for q, a in pairs:
            content = q.strip() + "\n" + a.strip()
            qa_docs.append(Document(page_content=content, metadata=doc.metadata))
    return qa_docs


def build_database():
    """
    建立以 Q&A 問答對為單位的向量資料庫
    """
    print("開始建立向量資料庫...")

    documents = []
    for filename in os.listdir(DATA_PATH):
        filepath = os.path.join(DATA_PATH, filename)
        if filename.endswith('.pdf'):
            loader = PyPDFLoader(filepath)
            documents.extend(loader.load())
        elif filename.endswith('.txt'):
            loader = TextLoader(filepath, encoding='utf-8')
            documents.extend(loader.load())
        if documents:
            print(f"已成功載入文件: {filename}")

    if not documents:
        print(f"在 '{DATA_PATH}' 資料夾中找不到任何可讀取的文件。")
        return

    # 用自製的 Q&A Splitter
    chunked_documents = qa_splitter(documents)
    print(f"文件已成功切分為 {len(chunked_documents)} 個 Q&A 區塊。")

    print("正在初始化 Hugging Face Embedding Model...")
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    embeddings = HuggingFaceEmbeddings(model_name=model_name)
    print("模型初始化成功。")

    print("正在生成嵌入向量並建立資料庫...")
    db = Chroma.from_documents(
        documents=chunked_documents,
        embedding=embeddings,
        persist_directory=DB_PATH
    )
    print(f"向量資料庫已成功建立！儲存路徑: '{DB_PATH}'")


if __name__ == "__main__":
    build_database()
