/**
 * Storage 管理模組
 * 處理 API 設定和網站規則的儲存
 */

const STORAGE_KEYS = {
  API_CONFIG: 'apiConfig',
  SITE_RULES: 'siteRules',
  GENERAL_SETTINGS: 'generalSettings'
};

// 預設 API 設定
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
    endpoint: 'http://localhost:11434/api/generate',
    model: 'glm-ocr:latest'
  },
  lmstudio: {
    endpoint: 'http://localhost:1234/v1/chat/completions',
    model: 'local-model'
  },
  custom: {
    endpoint: '',
    apiKey: '',
    model: '',
    requestFormat: 'openai'
  }
};

// 預設一般設定
const DEFAULT_GENERAL_SETTINGS = {
  autoDetect: true,
  autoFill: true,
  showNotifications: true,
  debugMode: false
};

/**
 * 取得 API 設定
 * @returns {Promise<object>}
 */
async function getApiConfig() {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.API_CONFIG);
  return result[STORAGE_KEYS.API_CONFIG] || DEFAULT_API_CONFIG;
}

/**
 * 儲存 API 設定
 * @param {object} config 
 * @returns {Promise<void>}
 */
async function saveApiConfig(config) {
  await chrome.storage.sync.set({
    [STORAGE_KEYS.API_CONFIG]: { ...DEFAULT_API_CONFIG, ...config }
  });
}

/**
 * 取得網站規則
 * @returns {Promise<object>}
 */
async function getSiteRules() {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.SITE_RULES);
  return result[STORAGE_KEYS.SITE_RULES] || {};
}

/**
 * 儲存網站規則
 * @param {string} hostname 
 * @param {object} rule 
 * @returns {Promise<void>}
 */
async function saveSiteRule(hostname, rule) {
  const rules = await getSiteRules();
  rules[hostname] = {
    ...rule,
    updatedAt: Date.now()
  };
  await chrome.storage.sync.set({
    [STORAGE_KEYS.SITE_RULES]: rules
  });
}

/**
 * 刪除網站規則
 * @param {string} hostname 
 * @returns {Promise<void>}
 */
async function deleteSiteRule(hostname) {
  const rules = await getSiteRules();
  delete rules[hostname];
  await chrome.storage.sync.set({
    [STORAGE_KEYS.SITE_RULES]: rules
  });
}

/**
 * 取得特定網站的規則
 * @param {string} hostname 
 * @returns {Promise<object|null>}
 */
async function getSiteRule(hostname) {
  const rules = await getSiteRules();
  return rules[hostname] || null;
}

/**
 * 取得一般設定
 * @returns {Promise<object>}
 */
async function getGeneralSettings() {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.GENERAL_SETTINGS);
  return result[STORAGE_KEYS.GENERAL_SETTINGS] || DEFAULT_GENERAL_SETTINGS;
}

/**
 * 儲存一般設定
 * @param {object} settings 
 * @returns {Promise<void>}
 */
async function saveGeneralSettings(settings) {
  await chrome.storage.sync.set({
    [STORAGE_KEYS.GENERAL_SETTINGS]: { ...DEFAULT_GENERAL_SETTINGS, ...settings }
  });
}

// 匯出模組 (兼容不同載入方式)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STORAGE_KEYS,
    DEFAULT_API_CONFIG,
    DEFAULT_GENERAL_SETTINGS,
    getApiConfig,
    saveApiConfig,
    getSiteRules,
    saveSiteRule,
    deleteSiteRule,
    getSiteRule,
    getGeneralSettings,
    saveGeneralSettings
  };
}

// 全域匯出
const Storage = {
  STORAGE_KEYS,
  DEFAULT_API_CONFIG,
  DEFAULT_GENERAL_SETTINGS,
  getApiConfig,
  saveApiConfig,
  getSiteRules,
  saveSiteRule,
  deleteSiteRule,
  getSiteRule,
  getGeneralSettings,
  saveGeneralSettings
};
