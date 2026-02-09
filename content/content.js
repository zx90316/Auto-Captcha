/**
 * Content Script 主程式
 * 負責頁面內的驗證碼偵測、選擇和填入
 */

// 載入其他模組 (透過 manifest.json 的 web_accessible_resources)
// detector.js 和 selector.js 會在同一個執行環境

(function () {
    'use strict';

    // 狀態
    let detectedCaptchas = null;
    let currentRule = null;
    let isProcessing = false;
    let currentSettings = null;

    /**
     * 初始化
     */
    async function init() {
        console.log('Auto-Captcha: Content Script 已載入');

        // 載入網站規則
        await loadSiteRule();

        // 載入設定
        currentSettings = await sendMessage({ action: 'getGeneralSettings' });

        // 如果啟用自動偵測
        if (currentSettings.autoDetect) {
            // 延遲偵測，確保頁面完全載入
            setTimeout(async () => {
                const result = detectCaptcha();

                // 如果啟用自動識別且偵測到驗證碼
                if (currentSettings.autoRecognize && result && result.pairs.length > 0) {
                    console.log('Auto-Captcha: 自動識別驗證碼...');
                    await recognizeAndFill();
                }
            }, 1000);
        }

        // 監聽來自 background 的訊息
        chrome.runtime.onMessage.addListener(handleMessage);

        // 監聯 DOM 變化 (動態載入的驗證碼)
        observeDOM();
    }

    /**
     * 載入網站規則
     */
    async function loadSiteRule() {
        const hostname = window.location.hostname;
        currentRule = await sendMessage({ action: 'getSiteRule', hostname });

        if (currentRule) {
            console.log('Auto-Captcha: 已載入網站規則', currentRule);
        }
    }

    /**
     * 偵測驗證碼
     */
    function detectCaptcha() {
        // 如果有手動規則，使用規則
        if (currentRule && currentRule.imageSelector && currentRule.inputSelector) {
            const image = document.querySelector(currentRule.imageSelector);
            const input = document.querySelector(currentRule.inputSelector);

            if (image && input) {
                detectedCaptchas = {
                    images: [image],
                    inputs: [input],
                    pairs: [{ image, input }]
                };
                console.log('Auto-Captcha: 使用手動規則偵測到驗證碼');
                highlightDetected();
                return detectedCaptchas;
            }
        }

        // 使用自動偵測
        detectedCaptchas = CaptchaDetector.detect();

        if (detectedCaptchas.pairs.length > 0) {
            console.log('Auto-Captcha: 自動偵測到驗證碼', detectedCaptchas);
            highlightDetected();
        } else {
            console.log('Auto-Captcha: 未偵測到驗證碼');
        }

        return detectedCaptchas;
    }

    /**
     * 高亮顯示偵測到的元素並添加操作按鈕
     */
    function highlightDetected() {
        if (!detectedCaptchas) return;

        detectedCaptchas.pairs.forEach(pair => {
            // 為圖片添加標記
            pair.image.dataset.autoCaptchaImage = 'true';

            // 為輸入框添加標記
            pair.input.dataset.autoCaptchaInput = 'true';

            // 如果啟用了顯示按鈕選項，添加重新偵測按鈕
            if (currentSettings && currentSettings.showRefreshButton) {
                addRefreshButton(pair.input, pair.image);
            }
        });
    }

    /**
     * 添加重新偵測按鈕到輸入框旁邊
     */
    function addRefreshButton(input, image) {
        // 檢查是否已經添加過按鈕
        if (input.dataset.autoCaptchaButtonAdded === 'true') {
            return;
        }

        // 建立按鈕容器
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'auto-captcha-buttons';
        buttonContainer.style.cssText = `
            display: inline-flex;
            gap: 4px;
            margin-left: 8px;
            vertical-align: middle;
        `;

        // 重新識別按鈕
        const refreshBtn = document.createElement('button');
        refreshBtn.type = 'button';
        refreshBtn.innerHTML = '🔄';
        refreshBtn.title = '重新識別驗證碼';
        refreshBtn.style.cssText = `
            width: 28px;
            height: 28px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s, box-shadow 0.2s;
        `;
        refreshBtn.addEventListener('mouseenter', () => {
            refreshBtn.style.transform = 'scale(1.1)';
            refreshBtn.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.4)';
        });
        refreshBtn.addEventListener('mouseleave', () => {
            refreshBtn.style.transform = 'scale(1)';
            refreshBtn.style.boxShadow = 'none';
        });
        refreshBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // 顯示載入狀態
            const originalContent = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '⏳';
            refreshBtn.disabled = true;

            try {
                await recognizeAndFill();
            } finally {
                refreshBtn.innerHTML = originalContent;
                refreshBtn.disabled = false;
            }
        });

        buttonContainer.appendChild(refreshBtn);

        // 插入按鈕到輸入框後面
        if (input.parentNode) {
            input.parentNode.insertBefore(buttonContainer, input.nextSibling);
        }

        input.dataset.autoCaptchaButtonAdded = 'true';
    }

    /**
     * 移除所有添加的按鈕
     */
    function removeAllButtons() {
        document.querySelectorAll('.auto-captcha-buttons').forEach(btn => btn.remove());
        document.querySelectorAll('[data-auto-captcha-button-added]').forEach(el => {
            delete el.dataset.autoCaptchaButtonAdded;
        });
    }

    /**
     * 處理來自 background 的訊息
     */
    async function handleMessage(message, sender, sendResponse) {
        console.log('Auto-Captcha: 收到訊息', message);

        switch (message.action) {
            case 'detect':
                const result = detectCaptcha();
                sendResponse({
                    found: result.pairs.length > 0,
                    count: result.pairs.length
                });
                break;

            case 'recognize':
                await recognizeAndFill();
                sendResponse({ success: true });
                break;

            case 'startSelectImage':
                startSelection('image');
                sendResponse({ success: true });
                break;

            case 'startSelectInput':
                startSelection('input');
                sendResponse({ success: true });
                break;

            case 'getStatus':
                sendResponse({
                    detected: detectedCaptchas ? detectedCaptchas.pairs.length > 0 : false,
                    hasRule: !!currentRule,
                    hostname: window.location.hostname
                });
                break;

            case 'captchaResult':
                handleCaptchaResult(message.result);
                sendResponse({ success: true });
                break;

            case 'setImageSelector':
                // 從右鍵選單設定圖片
                const imgElement = document.querySelector(`img[src="${message.srcUrl}"]`);
                if (imgElement) {
                    saveSelectionAsRule('image', CaptchaDetector.getUniqueSelector(imgElement));
                }
                sendResponse({ success: true });
                break;

            case 'setInputSelector':
                // 開始選擇輸入框
                startSelection('input');
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ error: '未知的操作' });
        }

        return true;
    }

    /**
     * 開始選擇模式
     */
    function startSelection(mode) {
        ElementSelector.start(mode, (result) => {
            if (result) {
                saveSelectionAsRule(mode, result.selector);
                showNotification(`已設定${mode === 'image' ? '驗證碼圖片' : '輸入框'}選擇器`);
            }
        });
    }

    /**
     * 儲存選擇作為規則
     */
    async function saveSelectionAsRule(mode, selector) {
        const hostname = window.location.hostname;

        // 取得現有規則或建立新規則
        const existingRule = await sendMessage({ action: 'getSiteRule', hostname });
        const rule = existingRule || {};

        if (mode === 'image') {
            rule.imageSelector = selector;
        } else if (mode === 'input') {
            rule.inputSelector = selector;
        }

        rule.url = window.location.href;
        rule.createdAt = rule.createdAt || Date.now();

        await sendMessage({
            action: 'saveSiteRule',
            hostname,
            rule
        });

        currentRule = rule;

        // 重新偵測
        detectCaptcha();
    }

    /**
     * 識別並填入驗證碼
     */
    async function recognizeAndFill() {
        if (isProcessing) {
            showNotification('正在處理中，請稍候...');
            return;
        }

        // 確保已偵測
        if (!detectedCaptchas || detectedCaptchas.pairs.length === 0) {
            detectCaptcha();
        }

        if (!detectedCaptchas || detectedCaptchas.pairs.length === 0) {
            showNotification('未偵測到驗證碼');
            return;
        }

        isProcessing = true;
        showNotification('正在識別驗證碼...');

        try {
            const pair = detectedCaptchas.pairs[0];
            const imageData = await getImageData(pair.image);

            // 傳送到 background 進行識別
            const result = await sendMessage({
                action: 'recognizeCaptcha',
                imageData
            });

            if (result.success) {
                // 填入結果
                fillInput(pair.input, result.result);
                showNotification(`識別成功: ${result.result}`);
            } else {
                showNotification(`識別失敗: ${result.error}`);
            }
        } catch (error) {
            console.error('Auto-Captcha: 識別錯誤', error);
            showNotification(`錯誤: ${error.message}`);
        } finally {
            isProcessing = false;
        }
    }

    /**
     * 取得圖片資料 (Base64)
     * 重要：優先使用 Canvas 直接擷取頁面上的圖片，避免重新 GET 導致驗證碼刷新
     */
    async function getImageData(element) {
        // 如果是 canvas 標籤，直接取得
        if (element.tagName === 'CANVAS') {
            try {
                return element.toDataURL('image/png');
            } catch (e) {
                console.error('Auto-Captcha: Canvas toDataURL 失敗 (可能是跨域)', e);
            }
        }

        // 如果是 img 標籤，使用 canvas 繪製當前顯示的圖片
        if (element.tagName === 'IMG') {
            try {
                // 確保圖片已載入
                if (!element.complete || element.naturalWidth === 0) {
                    await new Promise((resolve, reject) => {
                        element.onload = resolve;
                        element.onerror = reject;
                        // 如果已經載入完成，直接 resolve
                        if (element.complete && element.naturalWidth > 0) {
                            resolve();
                        }
                    });
                }

                const canvas = document.createElement('canvas');
                const width = element.naturalWidth || element.width || element.offsetWidth;
                const height = element.naturalHeight || element.height || element.offsetHeight;

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');

                // 設定白色背景 (某些驗證碼圖片可能有透明背景)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);

                // 繪製圖片
                ctx.drawImage(element, 0, 0, width, height);

                return canvas.toDataURL('image/png');
            } catch (e) {
                console.error('Auto-Captcha: Canvas 繪製失敗 (可能是跨域圖片)', e);
                // 跨域圖片無法使用 canvas，這是瀏覽器安全限制
                throw new Error('無法擷取跨域圖片。請確認驗證碼圖片和網頁在同一網域。');
            }
        }

        // 如果是 SVG 標籤
        if (element.tagName === 'SVG' || element.tagName === 'svg') {
            try {
                const svgData = new XMLSerializer().serializeToString(element);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                const img = new Image();
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = url;
                });

                const canvas = document.createElement('canvas');
                canvas.width = element.clientWidth || 200;
                canvas.height = element.clientHeight || 100;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                URL.revokeObjectURL(url);
                return canvas.toDataURL('image/png');
            } catch (e) {
                console.error('Auto-Captcha: SVG 轉換失敗', e);
            }
        }

        // 如果是其他元素，嘗試擷取背景圖片
        const bgImage = window.getComputedStyle(element).backgroundImage;
        if (bgImage && bgImage !== 'none') {
            console.warn('Auto-Captcha: 背景圖片無法直接擷取，可能導致驗證碼刷新');
            const urlMatch = bgImage.match(/url\(['"]?(.+?)['"]?\)/);
            if (urlMatch) {
                // 注意：這裡會重新請求圖片，可能導致驗證碼刷新
                // 但對於背景圖片，這是唯一的方法
                try {
                    return await sendMessage({
                        action: 'fetchImageAsBase64',
                        url: urlMatch[1]
                    });
                } catch (e) {
                    throw new Error('無法取得背景圖片');
                }
            }
        }

        // 嘗試使用 html2canvas 的方式擷取元素
        try {
            const rect = element.getBoundingClientRect();
            const canvas = document.createElement('canvas');
            canvas.width = rect.width;
            canvas.height = rect.height;
            const ctx = canvas.getContext('2d');

            // 擷取元素截圖 (簡易版本)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, rect.width, rect.height);

            // 如果元素有子圖片
            const childImg = element.querySelector('img');
            if (childImg) {
                ctx.drawImage(childImg, 0, 0, rect.width, rect.height);
                return canvas.toDataURL('image/png');
            }
        } catch (e) {
            console.error('Auto-Captcha: 元素擷取失敗', e);
        }

        throw new Error('無法取得圖片資料，不支援的元素類型');
    }

    /**
     * 填入輸入框
     */
    function fillInput(input, value) {
        input.value = value;

        // 觸發事件 (某些網站需要)
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    }

    /**
     * 處理識別結果
     */
    function handleCaptchaResult(result) {
        if (!detectedCaptchas || detectedCaptchas.pairs.length === 0) {
            detectCaptcha();
        }

        if (result.success && detectedCaptchas && detectedCaptchas.pairs.length > 0) {
            fillInput(detectedCaptchas.pairs[0].input, result.result);
            showNotification(`識別成功: ${result.result}`);
        } else if (!result.success) {
            showNotification(`識別失敗: ${result.error}`);
        }
    }

    /**
     * 顯示通知
     */
    function showNotification(message) {
        // 移除舊的通知
        const oldNotification = document.getElementById('auto-captcha-notification');
        if (oldNotification) {
            oldNotification.remove();
        }

        const notification = document.createElement('div');
        notification.id = 'auto-captcha-notification';
        notification.textContent = message;
        notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 2147483647;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease;
    `;

        document.body.appendChild(notification);

        // 3 秒後自動消失
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * 監聽 DOM 變化
     */
    function observeDOM() {
        const observer = new MutationObserver((mutations) => {
            // 檢查是否有新增的圖片或輸入框
            let shouldRedetect = false;

            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'IMG' || node.tagName === 'CANVAS' || node.tagName === 'INPUT') {
                            shouldRedetect = true;
                        } else if (node.querySelector && (node.querySelector('img') || node.querySelector('canvas') || node.querySelector('input'))) {
                            shouldRedetect = true;
                        }
                    }
                });
            });

            if (shouldRedetect) {
                // 防抖
                clearTimeout(observeDOM.debounceTimer);
                observeDOM.debounceTimer = setTimeout(() => {
                    detectCaptcha();
                }, 500);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * 傳送訊息到 background
     */
    function sendMessage(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, response => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    // 初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
