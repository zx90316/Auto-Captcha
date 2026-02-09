# 發布指南 - Auto-Captcha

本文件說明如何將 Auto-Captcha 擴充功能發布到 Chrome Web Store 和 GitHub。

---

## 📦 發布前準備

### 1. 檢查必要檔案

確認專案包含以下檔案：

```
Auto-Captcha/
├── manifest.json          ✅ 擴充功能設定
├── README.md              ✅ 說明文件
├── LICENSE                ✅ 授權條款
├── PRIVACY.md             ✅ 隱私權政策
├── CHANGELOG.md           ✅ 版本紀錄
├── .gitignore             ✅ Git 忽略檔案
├── icons/
│   ├── icon16.png         ⚠️ 需要 PNG 格式
│   ├── icon48.png         ⚠️ 需要 PNG 格式
│   └── icon128.png        ⚠️ 需要 PNG 格式
├── background/
├── content/
├── popup/
├── options/
├── lib/
└── styles/
```


### 3. 更新 manifest.json

將圖示路徑改為 PNG：
```json
"icons": {
  "16": "icons/icon16.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
},
"action": {
  "default_icon": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 4. 建立 ZIP 壓縮檔

```powershell
# 在專案根目錄執行
Compress-Archive -Path * -DestinationPath ../Auto-Captcha-v1.0.0.zip -Force
```

排除不必要的檔案：
```powershell
# 使用 7-Zip（推薦）
7z a -tzip ../Auto-Captcha-v1.0.0.zip * -x!.git -x!.gitignore -x!*.md -x!node_modules
```

---

## 🏪 Chrome Web Store 發布

### 步驟 1：建立開發者帳號

1. 前往 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. 使用 Google 帳號登入
3. 支付一次性註冊費 **$5 USD**
4. 完成開發者驗證

### 步驟 2：準備商店資料

需要準備以下內容：

| 項目 | 說明 | 要求 |
|------|------|------|
| 擴充功能名稱 | Auto-Captcha | 最多 45 字元 |
| 簡短描述 | 自動偵測並識別網頁驗證碼 | 最多 132 字元 |
| 詳細描述 | 完整功能說明 | 最多 16,000 字元 |
| 圖示 | 128x128 PNG | 必需 |
| 宣傳圖片 (小) | 440x280 PNG | 選填 |
| 宣傳圖片 (大) | 920x680 PNG | 選填 |
| 截圖 | 1280x800 或 640x400 | 至少 1 張 |
| 隱私權政策 URL | 公開可訪問的網址 | 必需 |

### 步驟 3：詳細描述範本

```
Auto-Captcha - 自動驗證碼識別擴充功能

🔍 功能特色：
• 自動偵測網頁上的驗證碼圖片和輸入框
• 支援手動指定驗證碼元素位置
• 一鍵識別並自動填入
• 右鍵選單快速操作

🤖 支援的 AI 服務：
• OpenAI (GPT-4 Vision)
• Google Gemini
• Ollama (本地部署)
• LM Studio (本地部署)
• 自訂 API 端點

⚡ 主要功能：
• 自動識別：頁面載入後自動偵測並識別驗證碼
• 重新識別按鈕：在輸入框旁顯示便捷按鈕
• 網站規則：為特定網站儲存偵測規則
• 暗色主題：精美的設定介面

🔒 隱私保護：
• 所有設定儲存在本地
• 支援本地 AI（Ollama/LM Studio）完全離線運作
• 不收集任何個人資訊

使用方法：
1. 安裝擴充功能
2. 點擊設定，選擇 API 類型並輸入 API Key
3. 瀏覽含有驗證碼的網頁
4. 點擊擴充功能圖示並按下「識別驗證碼」
```

### 步驟 4：上傳擴充功能

1. 前往 [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. 點擊「新增項目」
3. 上傳 ZIP 檔案
4. 填寫商店資訊
5. 上傳截圖和宣傳圖片
6. 設定隱私權政策 URL
7. 選擇目標受眾
8. 點擊「提交審核」

### 步驟 5：審核等待

- 審核時間：通常 1-3 個工作天
- 首次發布可能需要更長時間
- 審核通過後會收到電子郵件通知

---

## 🐙 GitHub 發布

### 步驟 1：建立 Repository

1. 前往 [GitHub](https://github.com) 並登入
2. 點擊右上角「+」→「New repository」
3. 設定：
   - Repository name: `Auto-Captcha`
   - Description: `自動偵測並識別網頁驗證碼的 Chrome 擴充功能`
   - Public/Private: 選擇公開或私人
   - 不要初始化 README（專案已有）

### 步驟 2：初始化 Git 並推送

```powershell
# 初始化 Git（如果尚未初始化）
cd c:\Users\zx020\project\Auto-Captcha
git init

# 添加所有檔案
git add .

# 建立初始提交
git commit -m "Initial release v1.0.0"

# 添加遠端倉庫（替換 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/Auto-Captcha.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 步驟 3：建立 Release

1. 在 GitHub 專案頁面點擊「Releases」
2. 點擊「Create a new release」
3. 設定：
   - Tag version: `v1.0.0`
   - Release title: `Auto-Captcha v1.0.0`
   - Description: 複製 CHANGELOG.md 內容
4. 附加 ZIP 檔案
5. 點擊「Publish release」

### 步驟 4：設定 GitHub Pages（選填）

為隱私權政策建立公開網址：

1. 前往 Settings → Pages
2. Source 選擇「main branch」
3. 隱私權政策網址將為：`https://YOUR_USERNAME.github.io/Auto-Captcha/PRIVACY`

---

## ✅ 發布檢查清單

### Chrome Web Store
- [ ] 圖示已轉換為 PNG 格式
- [ ] manifest.json 圖示路徑已更新
- [ ] ZIP 檔案已建立
- [ ] 開發者帳號已註冊（$5 USD）
- [ ] 商店描述已準備
- [ ] 截圖已準備（至少 1 張）
- [ ] 隱私權政策 URL 已設定

### GitHub
- [ ] .gitignore 已設定
- [ ] LICENSE 已添加
- [ ] README.md 已完善
- [ ] CHANGELOG.md 已建立
- [ ] Repository 已建立
- [ ] 程式碼已推送
- [ ] Release 已建立

---

## 🔗 相關連結

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Chrome 擴充功能開發文件](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 遷移指南](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Web Store 政策](https://developer.chrome.com/docs/webstore/program-policies/)
