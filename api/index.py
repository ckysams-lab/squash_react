import os
import sys

# 將根目錄加入路徑以便導入
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 獲取原始文件名 (注意空格和括號的處理)
target_file = "squash (13).py"

if __name__ == "__main__":
    # 使用 os.system 啟動 streamlit
    # 這是在 Vercel 環境中啟動外部 Streamlit 文件的標準做法之一
    os.system(f"streamlit run '{target_file}' --server.port 8080 --server.address 0.0.0.0")
