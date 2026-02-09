/**
 * Popup 彈出視窗邏輯
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 元素引用
    const statusCard = document.getElementById('statusCard');
    const statusIcon = document.getElementById('statusIcon');
    const statusTitle = document.getElementById('statusTitle');
    const statusDesc = document.getElementById('statusDesc');
    const btnRecognize = document.getElementById('btnRecognize');
    const btnRefresh = document.getElementById('btnRefresh');
    const btnSelectImage = document.getElementById('btnSelectImage');
    const btnSelectInput = document.getElementById('btnSelectInput');
    const ruleSection = document.getElementById('ruleSection');
    const btnDeleteRule = document.getElementById('btnDeleteRule');
    const btnSettings = document.getElementById('btnSettings');
    const btnHelp = document.getElementById('btnHelp');

    let currentTab = null;

    /**
     * 初始化
     */
    async function init() {
        // 取得當前標籤頁
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        currentTab = tabs[0];

        // 檢查是否是有效頁面
        if (!currentTab || !currentTab.url || currentTab.url.startsWith('chrome://')) {
            showStatus('error', '⚠️', '無法在此頁面使用', '請開啟一般網頁');
            return;
        }

        // 偵測驗證碼
        await detectCaptcha();
    }

    /**
     * 偵測驗證碼
     */
    async function detectCaptcha() {
        showStatus('loading', '🔍', '正在偵測...', '檢查頁面中的驗證碼');

        try {
            const response = await sendToTab({ action: 'getStatus' });

            if (response.detected) {
                showStatus('found', '✅', '偵測到驗證碼', '點擊下方按鈕開始識別');
                btnRecognize.disabled = false;
            } else {
                showStatus('not-found', '🔎', '未偵測到驗證碼', '您可以手動選擇驗證碼元素');
                btnRecognize.disabled = true;
            }

            // 檢查是否有規則
            if (response.hasRule) {
                ruleSection.style.display = 'block';
            } else {
                ruleSection.style.display = 'none';
            }
        } catch (error) {
            console.error('偵測失敗:', error);
            showStatus('error', '❌', '偵測失敗', error.message);
        }
    }

    /**
     * 顯示狀態
     */
    function showStatus(type, icon, title, desc) {
        statusCard.className = 'status-card ' + type;
        statusIcon.textContent = icon;
        statusIcon.style.animation = type === 'loading' ? 'pulse 2s infinite' : 'none';
        statusTitle.textContent = title;
        statusDesc.textContent = desc;
    }

    /**
     * 識別驗證碼
     */
    async function recognizeCaptcha() {
        btnRecognize.disabled = true;
        showStatus('loading', '🤖', '正在識別...', '請稍候');

        try {
            await sendToTab({ action: 'recognize' });
            showStatus('found', '✅', '識別完成', '結果已填入輸入框');

            // 關閉 popup
            setTimeout(() => window.close(), 1500);
        } catch (error) {
            console.error('識別失敗:', error);
            showStatus('error', '❌', '識別失敗', error.message);
            btnRecognize.disabled = false;
        }
    }

    /**
     * 開始選擇圖片
     */
    async function selectImage() {
        try {
            await sendToTab({ action: 'startSelectImage' });
            window.close();
        } catch (error) {
            console.error('選擇圖片失敗:', error);
        }
    }

    /**
     * 開始選擇輸入框
     */
    async function selectInput() {
        try {
            await sendToTab({ action: 'startSelectInput' });
            window.close();
        } catch (error) {
            console.error('選擇輸入框失敗:', error);
        }
    }

    /**
     * 刪除規則
     */
    async function deleteRule() {
        if (!currentTab) return;

        const hostname = new URL(currentTab.url).hostname;

        try {
            await chrome.runtime.sendMessage({
                action: 'deleteSiteRule',
                hostname
            });

            ruleSection.style.display = 'none';
            await detectCaptcha();
        } catch (error) {
            console.error('刪除規則失敗:', error);
        }
    }

    /**
     * 開啟設定頁面
     */
    function openSettings() {
        chrome.runtime.openOptionsPage();
    }

    /**
     * 開啟說明頁面
     */
    function openHelp() {
        chrome.tabs.create({
            url: 'https://github.com/zx90316/auto-captcha#readme'
        });
    }

    /**
     * 傳送訊息到當前標籤頁
     */
    async function sendToTab(message) {
        if (!currentTab) throw new Error('無法取得當前標籤頁');
        return await chrome.tabs.sendMessage(currentTab.id, message);
    }

    // 綁定事件
    btnRecognize.addEventListener('click', recognizeCaptcha);
    btnRefresh.addEventListener('click', detectCaptcha);
    btnSelectImage.addEventListener('click', selectImage);
    btnSelectInput.addEventListener('click', selectInput);
    btnDeleteRule.addEventListener('click', deleteRule);
    btnSettings.addEventListener('click', (e) => {
        e.preventDefault();
        openSettings();
    });
    btnHelp.addEventListener('click', (e) => {
        e.preventDefault();
        openHelp();
    });

    // 初始化
    init();
});
