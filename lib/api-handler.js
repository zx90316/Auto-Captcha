/**
 * API 處理模組
 * 統一處理各種 AI API 的驗證碼識別請求
 */

const API_TYPES = {
    OPENAI: 'openai',
    GEMINI: 'gemini',
    OLLAMA: 'ollama',
    LMSTUDIO: 'lmstudio',
    CUSTOM: 'custom'
};

// OCR 提示詞
const OCR_PROMPT = '請識別這個驗證碼圖片中的文字或數字，只回傳純文字結果，不要包含任何解釋或其他內容。如果有多個字符，請連續輸出，不要加空格。';

/**
 * 統一的驗證碼識別介面
 * @param {string} imageBase64 - Base64 編碼的圖片
 * @param {object} apiConfig - API 設定
 * @returns {Promise<{success: boolean, result?: string, error?: string}>}
 */
async function recognizeCaptcha(imageBase64, apiConfig) {
    try {
        const apiType = apiConfig.type;
        let result;

        switch (apiType) {
            case API_TYPES.OPENAI:
                result = await callOpenAI(imageBase64, apiConfig.openai);
                break;
            case API_TYPES.GEMINI:
                result = await callGemini(imageBase64, apiConfig.gemini);
                break;
            case API_TYPES.OLLAMA:
                result = await callOllama(imageBase64, apiConfig.ollama);
                break;
            case API_TYPES.LMSTUDIO:
                result = await callLMStudio(imageBase64, apiConfig.lmstudio);
                break;
            case API_TYPES.CUSTOM:
                result = await callCustomAPI(imageBase64, apiConfig.custom);
                break;
            default:
                throw new Error(`不支援的 API 類型: ${apiType}`);
        }

        // 清理結果 (移除空白、換行等)
        const cleanedResult = result.trim().replace(/\s+/g, '');

        return {
            success: true,
            result: cleanedResult
        };
    } catch (error) {
        console.error('驗證碼識別失敗:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 呼叫 OpenAI Vision API
 */
async function callOpenAI(imageBase64, config) {
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
}

/**
 * 呼叫 Google Gemini API
 */
async function callGemini(imageBase64, config) {
    // 移除 base64 前綴 (如果有)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const url = `${config.endpoint}/${config.model}:generateContent?key=${config.apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: OCR_PROMPT },
                    {
                        inline_data: {
                            mime_type: 'image/png',
                            data: base64Data
                        }
                    }
                ]
            }],
            generationConfig: {
                maxOutputTokens: 100
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API 錯誤: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

/**
 * 呼叫 Ollama API (本地)
 */
async function callOllama(imageBase64, config) {
    // 移除 base64 前綴 (如果有)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // 確保端點格式正確
    let endpoint = config.endpoint.replace(/\/$/, '');
    if (!endpoint.includes('/api/')) {
        endpoint = `${endpoint}/api/generate`;
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
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
}

/**
 * 呼叫 LM Studio API (本地，OpenAI 相容格式)
 */
async function callLMStudio(imageBase64, config) {
    // 確保端點格式正確
    let endpoint = config.endpoint.replace(/\/$/, '');
    if (!endpoint.includes('/chat/completions')) {
        endpoint = `${endpoint}/chat/completions`;
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
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
            max_tokens: 100,
            stream: false
        })
    });

    if (!response.ok) {
        throw new Error(`LM Studio API 錯誤: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * 呼叫自訂 API
 */
async function callCustomAPI(imageBase64, config) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    let body;

    // 根據請求格式構建不同的請求體
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
    } else if (config.requestFormat === 'ollama') {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        body = JSON.stringify({
            model: config.model,
            prompt: OCR_PROMPT,
            images: [base64Data],
            stream: false
        });
    } else {
        throw new Error('不支援的自訂 API 請求格式');
    }

    const response = await fetch(config.endpoint, {
        method: 'POST',
        headers,
        body
    });

    if (!response.ok) {
        throw new Error(`自訂 API 錯誤: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    // 根據格式解析回應
    if (config.requestFormat === 'openai') {
        return data.choices[0].message.content;
    } else if (config.requestFormat === 'ollama') {
        return data.response;
    }
}

/**
 * 測試 API 連線
 * @param {object} apiConfig - API 設定
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function testApiConnection(apiConfig) {
    try {
        const apiType = apiConfig.type;
        const config = apiConfig[apiType];

        // 建立一個簡單的測試圖片 (1x1 白色像素)
        const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        const result = await recognizeCaptcha(testImage, apiConfig);

        if (result.success) {
            return { success: true, message: 'API 連線成功！' };
        } else {
            return { success: false, message: `API 連線失敗: ${result.error}` };
        }
    } catch (error) {
        return { success: false, message: `連線測試失敗: ${error.message}` };
    }
}

// 匯出模組
const ApiHandler = {
    API_TYPES,
    recognizeCaptcha,
    testApiConnection
};
