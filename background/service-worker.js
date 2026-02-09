/**
 * Background Service Worker
 * 處理擴充功能的背景邏輯和 API 呼叫
 * 
 * 注意：Manifest V3 Service Worker 不支援外部 importScripts，
 * 所以所有程式碼都整合在此檔案中
 */

// ============================================================
// Storage 管理模組
// ============================================================

const STORAGE_KEYS = {
    API_CONFIG: 'apiConfig',
    SITE_RULES: 'siteRules',
    GENERAL_SETTINGS: 'generalSettings'
};

const DEFAULT_API_CONFIG = {
    type: 'openai',
    openai: {
        apiKey: '',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini'
    },
    gemini: {
        apiKey: '',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        model: 'gemini-1.5-flash'
    },
    ollama: {
        endpoint: 'http://localhost:11434',
        model: 'llava'
    },
    lmstudio: {
        endpoint: 'http://localhost:1234/v1',
        model: 'local-model'
    },
    custom: {
        endpoint: '',
        apiKey: '',
        model: '',
        requestFormat: 'openai'
    }
};

const DEFAULT_GENERAL_SETTINGS = {
    autoDetect: true,
    autoFill: true,
    autoRecognize: false,
    showRefreshButton: true,
    showNotifications: true,
    debugMode: false
};

const Storage = {
    async getApiConfig() {
        const result = await chrome.storage.sync.get(STORAGE_KEYS.API_CONFIG);
        return { ...DEFAULT_API_CONFIG, ...result[STORAGE_KEYS.API_CONFIG] };
    },

    async saveApiConfig(config) {
        await chrome.storage.sync.set({
            [STORAGE_KEYS.API_CONFIG]: { ...DEFAULT_API_CONFIG, ...config }
        });
    },

    async getSiteRules() {
        const result = await chrome.storage.sync.get(STORAGE_KEYS.SITE_RULES);
        return result[STORAGE_KEYS.SITE_RULES] || {};
    },

    async saveSiteRule(hostname, rule) {
        const rules = await this.getSiteRules();
        rules[hostname] = { ...rule, updatedAt: Date.now() };
        await chrome.storage.sync.set({
            [STORAGE_KEYS.SITE_RULES]: rules
        });
    },

    async deleteSiteRule(hostname) {
        const rules = await this.getSiteRules();
        delete rules[hostname];
        await chrome.storage.sync.set({
            [STORAGE_KEYS.SITE_RULES]: rules
        });
    },

    async getSiteRule(hostname) {
        const rules = await this.getSiteRules();
        return rules[hostname] || null;
    },

    async getGeneralSettings() {
        const result = await chrome.storage.sync.get(STORAGE_KEYS.GENERAL_SETTINGS);
        return { ...DEFAULT_GENERAL_SETTINGS, ...result[STORAGE_KEYS.GENERAL_SETTINGS] };
    },

    async saveGeneralSettings(settings) {
        await chrome.storage.sync.set({
            [STORAGE_KEYS.GENERAL_SETTINGS]: { ...DEFAULT_GENERAL_SETTINGS, ...settings }
        });
    }
};

// ============================================================
// API 處理模組
// ============================================================

const OCR_PROMPT = '請識別這個驗證碼圖片中的文字或數字，只回傳純文字結果，不要包含任何解釋或其他內容。如果有多個字符，請連續輸出，不要加空格。';

const ApiHandler = {
    async recognizeCaptcha(imageBase64, apiConfig) {
        try {
            const apiType = apiConfig.type;
            let result;

            switch (apiType) {
                case 'openai':
                    result = await this.callOpenAI(imageBase64, apiConfig.openai);
                    break;
                case 'gemini':
                    result = await this.callGemini(imageBase64, apiConfig.gemini);
                    break;
                case 'ollama':
                    result = await this.callOllama(imageBase64, apiConfig.ollama);
                    break;
                case 'lmstudio':
                    result = await this.callLMStudio(imageBase64, apiConfig.lmstudio);
                    break;
                case 'custom':
                    result = await this.callCustomAPI(imageBase64, apiConfig.custom);
                    break;
                default:
                    throw new Error(`不支援的 API 類型: ${apiType}`);
            }

            const cleanedResult = result.trim().replace(/\s+/g, '');
            return { success: true, result: cleanedResult };
        } catch (error) {
            console.error('驗證碼識別失敗:', error);
            return { success: false, error: error.message };
        }
    },

    async callOpenAI(imageBase64, config) {
        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: OCR_PROMPT },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`
                            }
                        }
                    ]
                }],
                max_tokens: 100
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API 錯誤: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    },

    async callGemini(imageBase64, config) {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const url = `${config.endpoint}/${config.model}:generateContent?key=${config.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: OCR_PROMPT },
                        { inline_data: { mime_type: 'image/png', data: base64Data } }
                    ]
                }],
                generationConfig: { maxOutputTokens: 100 }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Gemini API 錯誤: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    },

    async callOllama(imageBase64, config) {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        let endpoint = config.endpoint.replace(/\/$/, '');
        if (!endpoint.includes('/api/')) {
            endpoint = `${endpoint}/api/generate`;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: config.model,
                prompt: OCR_PROMPT,
                images: [base64Data],
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API 錯誤: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        return data.response;
    },

    async callLMStudio(imageBase64, config) {
        let endpoint = config.endpoint.replace(/\/$/, '');
        if (!endpoint.includes('/chat/completions')) {
            endpoint = `${endpoint}/chat/completions`;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: config.model,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: OCR_PROMPT },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`
                            }
                        }
                    ]
                }],
                max_tokens: 100,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`LM Studio API 錯誤: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    },

    async callCustomAPI(imageBase64, config) {
        const headers = { 'Content-Type': 'application/json' };
        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        let body;
        if (config.requestFormat === 'openai') {
            body = JSON.stringify({
                model: config.model,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: OCR_PROMPT },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`
                            }
                        }
                    ]
                }],
                max_tokens: 100
            });
        } else {
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
            body = JSON.stringify({
                model: config.model,
                prompt: OCR_PROMPT,
                images: [base64Data],
                stream: false
            });
        }

        const response = await fetch(config.endpoint, { method: 'POST', headers, body });

        if (!response.ok) {
            throw new Error(`自訂 API 錯誤: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        return config.requestFormat === 'openai' ? data.choices[0].message.content : data.response;
    },

    async testApiConnection(apiConfig) {
        try {
            const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            const result = await this.recognizeCaptcha(testImage, apiConfig);

            if (result.success) {
                return { success: true, message: 'API 連線成功！' };
            } else {
                return { success: false, message: `API 連線失敗: ${result.error}` };
            }
        } catch (error) {
            return { success: false, message: `連線測試失敗: ${error.message}` };
        }
    }
};

// ============================================================
// Service Worker 主邏輯
// ============================================================

// 監聽安裝事件
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Auto-Captcha 擴充功能已安裝', details.reason);

    // 建立右鍵選單
    chrome.contextMenus.create({
        id: 'auto-captcha-recognize',
        title: '識別此驗證碼',
        contexts: ['image']
    });

    chrome.contextMenus.create({
        id: 'auto-captcha-select-image',
        title: '設定為驗證碼圖片',
        contexts: ['image']
    });

    chrome.contextMenus.create({
        id: 'auto-captcha-select-input',
        title: '設定為驗證碼輸入框',
        contexts: ['editable']
    });
});

// 監聽右鍵選單點擊
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'auto-captcha-recognize') {
        try {
            const imageUrl = info.srcUrl;
            const base64 = await fetchImageAsBase64(imageUrl);
            const apiConfig = await Storage.getApiConfig();
            const result = await ApiHandler.recognizeCaptcha(base64, apiConfig);

            chrome.tabs.sendMessage(tab.id, {
                action: 'captchaResult',
                result: result
            });
        } catch (error) {
            console.error('識別失敗:', error);
            chrome.tabs.sendMessage(tab.id, {
                action: 'captchaResult',
                result: { success: false, error: error.message }
            });
        }
    } else if (info.menuItemId === 'auto-captcha-select-image') {
        chrome.tabs.sendMessage(tab.id, {
            action: 'setImageSelector',
            srcUrl: info.srcUrl
        });
    } else if (info.menuItemId === 'auto-captcha-select-input') {
        chrome.tabs.sendMessage(tab.id, {
            action: 'setInputSelector'
        });
    }
});

// 監聽來自 content script 和 popup 的訊息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse);
    return true;
});

async function handleMessage(message, sender) {
    console.log('收到訊息:', message.action);

    try {
        switch (message.action) {
            case 'recognizeCaptcha':
                return await handleRecognizeCaptcha(message.imageData);

            case 'getApiConfig':
                return await Storage.getApiConfig();

            case 'saveApiConfig':
                await Storage.saveApiConfig(message.config);
                return { success: true };

            case 'getSiteRule':
                return await Storage.getSiteRule(message.hostname);

            case 'saveSiteRule':
                await Storage.saveSiteRule(message.hostname, message.rule);
                return { success: true };

            case 'deleteSiteRule':
                await Storage.deleteSiteRule(message.hostname);
                return { success: true };

            case 'getSiteRules':
                return await Storage.getSiteRules();

            case 'getGeneralSettings':
                return await Storage.getGeneralSettings();

            case 'saveGeneralSettings':
                await Storage.saveGeneralSettings(message.settings);
                return { success: true };

            case 'testApiConnection':
                return await ApiHandler.testApiConnection(message.config);

            case 'fetchImageAsBase64':
                return await fetchImageAsBase64(message.url);

            default:
                return { error: '未知的操作' };
        }
    } catch (error) {
        console.error('處理訊息錯誤:', error);
        return { success: false, error: error.message };
    }
}

async function handleRecognizeCaptcha(imageData) {
    try {
        const apiConfig = await Storage.getApiConfig();
        const result = await ApiHandler.recognizeCaptcha(imageData, apiConfig);
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function fetchImageAsBase64(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        throw new Error(`無法擷取圖片: ${error.message}`);
    }
}

console.log('Auto-Captcha Service Worker 已啟動');
