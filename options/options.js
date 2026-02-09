/**
 * Options 設定頁面邏輯
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 標籤頁切換
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });

    // API 類型選擇
    const apiTypeInputs = document.querySelectorAll('input[name="apiType"]');
    const apiConfigs = document.querySelectorAll('.api-config');

    apiTypeInputs.forEach(input => {
        input.addEventListener('change', () => {
            apiConfigs.forEach(c => c.style.display = 'none');
            document.getElementById(`config-${input.value}`).style.display = 'block';
        });
    });

    // 載入設定
    await loadSettings();

    // 按鈕事件
    document.getElementById('btnTest').addEventListener('click', testConnection);
    document.getElementById('btnSaveApi').addEventListener('click', saveApiSettings);
    document.getElementById('btnSaveGeneral').addEventListener('click', saveGeneralSettings);

    // 載入模型按鈕事件
    document.getElementById('btnLoadOpenaiModels').addEventListener('click', () => loadModels('openai'));
    document.getElementById('btnLoadGeminiModels').addEventListener('click', () => loadModels('gemini'));
    document.getElementById('btnLoadOllamaModels').addEventListener('click', () => loadModels('ollama'));
    document.getElementById('btnLoadLmstudioModels').addEventListener('click', () => loadModels('lmstudio'));

    // 載入規則
    await loadRules();
});

/**
 * 載入設定
 */
async function loadSettings() {
    try {
        // 載入 API 設定
        const apiConfig = await chrome.runtime.sendMessage({ action: 'getApiConfig' });
        console.log('載入的 API 設定:', apiConfig);

        // 設定 API 類型
        const apiTypeInput = document.querySelector(`input[name="apiType"][value="${apiConfig.type}"]`);
        if (apiTypeInput) {
            apiTypeInput.checked = true;
            document.getElementById(`config-${apiConfig.type}`).style.display = 'block';
        } else {
            // 預設選擇 openai
            document.querySelector('input[name="apiType"][value="openai"]').checked = true;
            document.getElementById('config-openai').style.display = 'block';
        }

        // 填入各 API 設定
        // OpenAI
        document.getElementById('openai-apiKey').value = apiConfig.openai?.apiKey || '';
        document.getElementById('openai-endpoint').value = apiConfig.openai?.endpoint || 'https://api.openai.com/v1/chat/completions';
        setSelectValue('openai-model', apiConfig.openai?.model || 'gpt-4o-mini');

        // Gemini
        document.getElementById('gemini-apiKey').value = apiConfig.gemini?.apiKey || '';
        document.getElementById('gemini-endpoint').value = apiConfig.gemini?.endpoint || 'https://generativelanguage.googleapis.com/v1beta/models';
        setSelectValue('gemini-model', apiConfig.gemini?.model || 'gemini-1.5-flash');

        // Ollama
        document.getElementById('ollama-endpoint').value = apiConfig.ollama?.endpoint || 'http://localhost:11434';
        if (apiConfig.ollama?.model) {
            const ollamaSelect = document.getElementById('ollama-model');
            // 添加已保存的模型選項
            if (!Array.from(ollamaSelect.options).some(opt => opt.value === apiConfig.ollama.model)) {
                ollamaSelect.innerHTML = `<option value="${apiConfig.ollama.model}">${apiConfig.ollama.model}</option>`;
            }
            ollamaSelect.value = apiConfig.ollama.model;
        }

        // LM Studio
        document.getElementById('lmstudio-endpoint').value = apiConfig.lmstudio?.endpoint || 'http://localhost:1234/v1';
        if (apiConfig.lmstudio?.model) {
            const lmstudioSelect = document.getElementById('lmstudio-model');
            if (!Array.from(lmstudioSelect.options).some(opt => opt.value === apiConfig.lmstudio.model)) {
                lmstudioSelect.innerHTML = `<option value="${apiConfig.lmstudio.model}">${apiConfig.lmstudio.model}</option>`;
            }
            lmstudioSelect.value = apiConfig.lmstudio.model;
        }

        // Custom
        document.getElementById('custom-endpoint').value = apiConfig.custom?.endpoint || '';
        document.getElementById('custom-apiKey').value = apiConfig.custom?.apiKey || '';
        document.getElementById('custom-model').value = apiConfig.custom?.model || '';
        document.getElementById('custom-requestFormat').value = apiConfig.custom?.requestFormat || 'openai';

        // 載入一般設定
        const generalSettings = await chrome.runtime.sendMessage({ action: 'getGeneralSettings' });
        console.log('載入的一般設定:', generalSettings);

        document.getElementById('autoDetect').checked = generalSettings.autoDetect ?? true;
        document.getElementById('autoFill').checked = generalSettings.autoFill ?? true;
        document.getElementById('autoRecognize').checked = generalSettings.autoRecognize ?? false;
        document.getElementById('showRefreshButton').checked = generalSettings.showRefreshButton ?? true;
        document.getElementById('showNotifications').checked = generalSettings.showNotifications ?? true;
        document.getElementById('debugMode').checked = generalSettings.debugMode ?? false;
    } catch (error) {
        console.error('載入設定失敗:', error);
        showToast('載入設定失敗: ' + error.message, 'error');
    }
}

/**
 * 設定 select 的值
 */
function setSelectValue(selectId, value) {
    const select = document.getElementById(selectId);
    const option = Array.from(select.options).find(opt => opt.value === value);
    if (option) {
        select.value = value;
    } else if (value) {
        // 如果選項不存在，添加新選項
        const newOption = document.createElement('option');
        newOption.value = value;
        newOption.textContent = value;
        select.appendChild(newOption);
        select.value = value;
    }
}

/**
 * 載入模型列表
 */
async function loadModels(apiType) {
    const button = document.getElementById(`btnLoad${capitalizeFirst(apiType)}Models`);
    const originalText = button.innerHTML;
    button.innerHTML = '⏳ 載入中...';
    button.disabled = true;

    try {
        let models = [];
        let endpoint = '';

        switch (apiType) {
            case 'openai':
                endpoint = document.getElementById('openai-endpoint').value;
                const apiKey = document.getElementById('openai-apiKey').value;
                models = await fetchOpenAIModels(endpoint, apiKey);
                break;
            case 'gemini':
                endpoint = document.getElementById('gemini-endpoint').value;
                const geminiKey = document.getElementById('gemini-apiKey').value;
                models = await fetchGeminiModels(endpoint, geminiKey);
                break;
            case 'ollama':
                endpoint = document.getElementById('ollama-endpoint').value;
                models = await fetchOllamaModels(endpoint);
                break;
            case 'lmstudio':
                endpoint = document.getElementById('lmstudio-endpoint').value;
                models = await fetchLMStudioModels(endpoint);
                break;
        }

        if (models.length > 0) {
            updateModelSelect(apiType, models);
            showToast(`已載入 ${models.length} 個模型`);
        } else {
            showToast('未找到任何模型', 'error');
        }
    } catch (error) {
        console.error('載入模型失敗:', error);
        showToast('載入模型失敗: ' + error.message, 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

/**
 * 首字母大寫
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 獲取 OpenAI 模型列表
 */
async function fetchOpenAIModels(endpoint, apiKey) {
    if (!apiKey) {
        throw new Error('請先輸入 API Key');
    }

    // 從 chat completions 端點推算 models 端點
    const baseUrl = endpoint.replace('/chat/completions', '').replace(/\/$/, '');
    const modelsUrl = `${baseUrl}/models`;

    const response = await fetch(modelsUrl, {
        headers: {
            'Authorization': `Bearer ${apiKey}`
        }
    });

    if (!response.ok) {
        throw new Error(`API 錯誤: ${response.status}`);
    }

    const data = await response.json();
    // 過濾出支援視覺的模型
    const visionModels = data.data
        .filter(model => model.id.includes('gpt-4') || model.id.includes('vision'))
        .map(model => ({
            id: model.id,
            name: model.id
        }));

    return visionModels.length > 0 ? visionModels : data.data.slice(0, 20).map(m => ({ id: m.id, name: m.id }));
}

/**
 * 獲取 Gemini 模型列表
 */
async function fetchGeminiModels(endpoint, apiKey) {
    if (!apiKey) {
        throw new Error('請先輸入 API Key');
    }

    const response = await fetch(`${endpoint}?key=${apiKey}`);

    if (!response.ok) {
        throw new Error(`API 錯誤: ${response.status}`);
    }

    const data = await response.json();
    return data.models
        .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
        .map(model => ({
            id: model.name.replace('models/', ''),
            name: model.displayName || model.name.replace('models/', '')
        }));
}

/**
 * 獲取 Ollama 模型列表
 */
async function fetchOllamaModels(endpoint) {
    const baseUrl = endpoint.replace(/\/api.*$/, '').replace(/\/$/, '');
    const tagsUrl = `${baseUrl}/api/tags`;

    const response = await fetch(tagsUrl);

    if (!response.ok) {
        throw new Error(`無法連接 Ollama: ${response.status}`);
    }

    const data = await response.json();
    return data.models.map(model => ({
        id: model.name,
        name: `${model.name} (${formatSize(model.size)})`
    }));
}

/**
 * 獲取 LM Studio 模型列表
 */
async function fetchLMStudioModels(endpoint) {
    const baseUrl = endpoint.replace(/\/chat.*$/, '').replace(/\/$/, '');
    const modelsUrl = `${baseUrl}/models`;

    const response = await fetch(modelsUrl);

    if (!response.ok) {
        throw new Error(`無法連接 LM Studio: ${response.status}`);
    }

    const data = await response.json();
    return data.data.map(model => ({
        id: model.id,
        name: model.id
    }));
}

/**
 * 格式化檔案大小
 */
function formatSize(bytes) {
    if (bytes < 1024 * 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(0) + ' MB';
    }
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

/**
 * 更新模型下拉選單
 */
function updateModelSelect(apiType, models) {
    const select = document.getElementById(`${apiType}-model`);
    const currentValue = select.value;

    select.innerHTML = models.map(model =>
        `<option value="${model.id}">${model.name}</option>`
    ).join('');

    // 嘗試保留原來的選擇
    if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
        select.value = currentValue;
    }
}

/**
 * 收集 API 設定
 */
function collectApiConfig() {
    const selectedType = document.querySelector('input[name="apiType"]:checked')?.value || 'openai';

    return {
        type: selectedType,
        openai: {
            apiKey: document.getElementById('openai-apiKey').value,
            endpoint: document.getElementById('openai-endpoint').value,
            model: document.getElementById('openai-model').value
        },
        gemini: {
            apiKey: document.getElementById('gemini-apiKey').value,
            endpoint: document.getElementById('gemini-endpoint').value,
            model: document.getElementById('gemini-model').value
        },
        ollama: {
            endpoint: document.getElementById('ollama-endpoint').value,
            model: document.getElementById('ollama-model').value
        },
        lmstudio: {
            endpoint: document.getElementById('lmstudio-endpoint').value,
            model: document.getElementById('lmstudio-model').value
        },
        custom: {
            endpoint: document.getElementById('custom-endpoint').value,
            apiKey: document.getElementById('custom-apiKey').value,
            model: document.getElementById('custom-model').value,
            requestFormat: document.getElementById('custom-requestFormat').value
        }
    };
}

/**
 * 測試連線
 */
async function testConnection() {
    const testResult = document.getElementById('testResult');
    testResult.style.display = 'block';
    testResult.className = 'test-result';
    testResult.textContent = '🔄 測試中...';

    const config = collectApiConfig();
    console.log('測試連線配置:', config);

    try {
        const result = await chrome.runtime.sendMessage({
            action: 'testApiConnection',
            config
        });

        console.log('測試結果:', result);

        if (result && result.success) {
            testResult.className = 'test-result success';
            testResult.textContent = '✅ ' + result.message;
        } else {
            testResult.className = 'test-result error';
            testResult.textContent = '❌ ' + (result?.message || '連線失敗');
        }
    } catch (error) {
        console.error('測試連線錯誤:', error);
        testResult.className = 'test-result error';
        testResult.textContent = '❌ 測試失敗: ' + error.message;
    }
}

/**
 * 儲存 API 設定
 */
async function saveApiSettings() {
    const config = collectApiConfig();
    console.log('儲存 API 設定:', config);

    try {
        const result = await chrome.runtime.sendMessage({
            action: 'saveApiConfig',
            config
        });

        console.log('儲存結果:', result);

        if (result && result.success) {
            showToast('✅ 設定已儲存');
        } else {
            showToast('儲存失敗', 'error');
        }
    } catch (error) {
        console.error('儲存設定錯誤:', error);
        showToast('儲存失敗: ' + error.message, 'error');
    }
}

/**
 * 儲存一般設定
 */
async function saveGeneralSettings() {
    const settings = {
        autoDetect: document.getElementById('autoDetect').checked,
        autoFill: document.getElementById('autoFill').checked,
        autoRecognize: document.getElementById('autoRecognize').checked,
        showRefreshButton: document.getElementById('showRefreshButton').checked,
        showNotifications: document.getElementById('showNotifications').checked,
        debugMode: document.getElementById('debugMode').checked
    };

    console.log('儲存一般設定:', settings);

    try {
        const result = await chrome.runtime.sendMessage({
            action: 'saveGeneralSettings',
            settings
        });

        console.log('儲存結果:', result);

        if (result && result.success) {
            showToast('✅ 設定已儲存');
        } else {
            showToast('儲存失敗', 'error');
        }
    } catch (error) {
        console.error('儲存設定錯誤:', error);
        showToast('儲存失敗: ' + error.message, 'error');
    }
}

/**
 * 載入規則
 */
async function loadRules() {
    const rulesList = document.getElementById('rulesList');

    try {
        const rules = await chrome.runtime.sendMessage({ action: 'getSiteRules' });
        const hostnames = Object.keys(rules || {});

        if (hostnames.length === 0) {
            rulesList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📋</span>
                    <p>尚無任何規則</p>
                    <small>在網頁上使用手動選擇功能來新增規則</small>
                </div>
            `;
            return;
        }

        rulesList.innerHTML = hostnames.map(hostname => {
            const rule = rules[hostname];
            return `
                <div class="rule-item" data-hostname="${hostname}">
                    <div class="rule-info">
                        <div class="rule-hostname">${hostname}</div>
                        <div class="rule-selectors">
                            ${rule.imageSelector ? `圖片: <code>${truncate(rule.imageSelector, 30)}</code>` : ''}
                            ${rule.inputSelector ? `輸入框: <code>${truncate(rule.inputSelector, 30)}</code>` : ''}
                        </div>
                    </div>
                    <button class="btn btn-small btn-danger btn-delete-rule" data-hostname="${hostname}">刪除</button>
                </div>
            `;
        }).join('');

        // 綁定刪除事件
        rulesList.querySelectorAll('.btn-delete-rule').forEach(btn => {
            btn.addEventListener('click', async () => {
                const hostname = btn.dataset.hostname;
                await chrome.runtime.sendMessage({
                    action: 'deleteSiteRule',
                    hostname
                });
                await loadRules();
                showToast('規則已刪除');
            });
        });
    } catch (error) {
        console.error('載入規則失敗:', error);
    }
}

/**
 * 截斷字串
 */
function truncate(str, maxLength) {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
}

/**
 * 顯示 Toast 提示
 */
function showToast(message, type = 'success') {
    // 移除舊的 toast
    const oldToast = document.querySelector('.toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 12px 24px;
        background: ${type === 'success' ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)'};
        color: white;
        border-radius: 8px;
        font-size: 14px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// 動畫樣式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
