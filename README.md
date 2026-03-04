# Auto-Captcha Chrome Extension

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Chrome](https://img.shields.io/badge/Chrome-Manifest%20V3-orange)

自動偵測並識別網頁驗證碼的 Chrome 擴充功能，支援多種 AI API。

## ✨ 功能特色

- **🔍 智能偵測** - 自動掃描頁面尋找驗證碼圖片和輸入框
- **🤖 多 API 支援** - ChatGPT、Gemini、Ollama、LM Studio
- **📌 手動配置** - 可手動指定驗證碼元素位置
- **⚡ 自動填入** - 識別結果自動填入輸入框
- **🔄 自動識別** - 頁面載入後自動偵測並識別驗證碼
- **🔘 重新識別按鈕** - 在輸入框旁顯示便捷按鈕
- **🌙 暗色主題** - 精美的設定介面

## 📦 安裝方式

### 從 Chrome Web Store 安裝
*（即將上架）*

### 從源碼安裝
1. 下載或 clone 此專案
2. 開啟 Chrome，前往 `chrome://extensions/`
3. 開啟右上角「開發人員模式」
4. 點擊「載入未封裝項目」
5. 選擇 `Auto-Captcha` 資料夾

## ⚙️ API 設定

### 雲端 API

#### OpenAI (ChatGPT)
1. 前往 [OpenAI API Keys](https://platform.openai.com/api-keys)
2. 建立 API Key
3. 在擴充功能設定中填入 API Key

#### Gemini (Google AI)
1. 前往 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 建立 API Key
3. 在擴充功能設定中填入 API Key

### 本地 API

#### Ollama
1. 安裝 [Ollama](https://ollama.ai/)
2. 下載支援視覺的模型：`ollama pull glm-ocr:latest`
3. 設定 CORS 允許擴充功能存取（擇一方式）：

   **方式 A：永久設定（推薦）**

   透過系統環境變數永久生效，設定後 Ollama 每次啟動都會自動允許瀏覽器擴充功能存取：

   - **Windows**
     1. 開啟「系統」→「進階系統設定」→「環境變數」
     2. 在「使用者變數」或「系統變數」中新增：
        - 變數名稱：`OLLAMA_ORIGINS`
        - 變數值：`chrome-extension://*`
     3. 確定後重新啟動 Ollama

     或透過 PowerShell 一行設定：
     ```powershell
     [Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "chrome-extension://*", "User")
     ```
     設定完成後需重新啟動 Ollama 才會生效。

   - **macOS**
     ```bash
     launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"
     ```
     設定後重新啟動 Ollama。

   - **Linux (systemd)**
     ```bash
     sudo systemctl edit ollama
     ```
     在 `[Service]` 區塊中加入：
     ```ini
     [Service]
     Environment="OLLAMA_ORIGINS=chrome-extension://*"
     ```
     儲存後重新載入並重啟：
     ```bash
     sudo systemctl daemon-reload
     sudo systemctl restart ollama
     ```

   **方式 B：臨時設定（僅當次有效）**
   ```powershell
   $env:OLLAMA_ORIGINS="chrome-extension://*"
   ollama serve
   ```

4. 預設端點：`http://localhost:11434`

> **實測環境**：Intel Core i7-14700 / 32GB RAM搭配 `glm-ocr:latest` 模型，驗證碼辨識功能運作正常。

#### LM Studio
1. 安裝 [LM Studio](https://lmstudio.ai/)
2. 下載並載入支援視覺的模型
3. 啟動本地伺服器（預設端點：`http://localhost:1234`）

## 🚀 使用方式

### 自動模式
1. 開啟包含驗證碼的網頁
2. 擴充功能會自動偵測驗證碼
3. 點擊擴充功能圖示
4. 點擊「識別驗證碼」按鈕
5. 結果會自動填入輸入框

### 全自動模式
在設定中開啟「偵測到驗證碼時自動識別」，頁面載入後會自動識別並填入。

### 手動模式
若自動偵測失敗：
1. 點擊擴充功能圖示
2. 點擊「選擇圖片」或「選擇輸入框」
3. 在頁面上點擊對應元素
4. 規則會自動儲存供下次使用

### 右鍵選單
- 在驗證碼圖片上右鍵 → 「識別此驗證碼」
- 在驗證碼圖片上右鍵 → 「設定為驗證碼圖片」
- 在輸入框上右鍵 → 「設定為驗證碼輸入框」

## 📁 專案結構

```
Auto-Captcha/
├── manifest.json           # 擴充功能設定
├── background/
│   └── service-worker.js   # 背景服務（含 Storage 和 API 處理）
├── content/
│   ├── detector.js         # 驗證碼偵測
│   ├── selector.js         # 元素選擇器
│   └── content.js          # Content Script
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── options/
│   ├── options.html
│   ├── options.css
│   └── options.js
├── lib/
│   ├── api-handler.js      # API 處理（參考用）
│   └── storage.js          # 儲存管理（參考用）
├── styles/
│   └── content.css
└── icons/
    └── icon*.png
```

## 🔧 開發

此專案使用純 JavaScript 開發，無需編譯即可使用。

如需修改後測試：
1. 在 `chrome://extensions/` 頁面
2. 點擊擴充功能的「重新載入」按鈕

## 🔒 隱私權

- 所有設定儲存在本地
- 不收集任何個人資訊
- 支援本地 AI（Ollama/LM Studio）完全離線運作
- 詳見 [隱私權政策](PRIVACY.md)

## 📝 更新紀錄

詳見 [CHANGELOG.md](CHANGELOG.md)

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

[MIT License](LICENSE)

