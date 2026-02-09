/**
 * 手動元素選擇器模組
 * 讓用戶可以手動選擇驗證碼圖片和輸入框
 */

const ElementSelector = {
    isActive: false,
    mode: null, // 'image' 或 'input'
    highlightedElement: null,
    overlay: null,
    tooltip: null,
    onSelect: null,

    /**
     * 啟動選擇模式
     * @param {'image'|'input'} mode - 選擇模式
     * @param {Function} callback - 選擇完成回調
     */
    start(mode, callback) {
        this.mode = mode;
        this.onSelect = callback;
        this.isActive = true;

        // 建立覆蓋層
        this.createOverlay();

        // 建立提示框
        this.createTooltip();

        // 綁定事件
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('click', this.handleClick, true);
        document.addEventListener('keydown', this.handleKeyDown);

        this.updateTooltip();
    },

    /**
     * 停止選擇模式
     */
    stop() {
        this.isActive = false;
        this.mode = null;

        // 移除高亮
        if (this.highlightedElement) {
            this.highlightedElement.style.outline = '';
            this.highlightedElement = null;
        }

        // 移除覆蓋層
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }

        // 移除提示框
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }

        // 解綁事件
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('click', this.handleClick, true);
        document.removeEventListener('keydown', this.handleKeyDown);
    },

    /**
     * 建立覆蓋層
     */
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'auto-captcha-selector-overlay';
        this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2147483646;
      pointer-events: none;
    `;
        document.body.appendChild(this.overlay);
    },

    /**
     * 建立提示框
     */
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.id = 'auto-captcha-selector-tooltip';
        this.tooltip.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 2147483647;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      pointer-events: none;
    `;
        document.body.appendChild(this.tooltip);
    },

    /**
     * 更新提示框內容
     */
    updateTooltip() {
        if (!this.tooltip) return;

        const modeText = this.mode === 'image' ? '驗證碼圖片' : '驗證碼輸入框';
        this.tooltip.innerHTML = `
      <strong>🎯 選擇模式</strong><br>
      請點擊頁面上的<strong>${modeText}</strong><br>
      <small>按 ESC 取消</small>
    `;
    },

    /**
     * 處理滑鼠移動
     */
    handleMouseMove: function (e) {
        if (!ElementSelector.isActive) return;

        const element = document.elementFromPoint(e.clientX, e.clientY);

        if (element && element !== ElementSelector.highlightedElement) {
            // 移除舊的高亮
            if (ElementSelector.highlightedElement) {
                ElementSelector.highlightedElement.style.outline = '';
            }

            // 檢查是否是我們自己的元素
            if (element.id && element.id.startsWith('auto-captcha-')) {
                return;
            }

            // 根據模式過濾元素
            let isValidTarget = false;
            if (ElementSelector.mode === 'image') {
                isValidTarget = element.tagName === 'IMG' ||
                    element.tagName === 'CANVAS' ||
                    window.getComputedStyle(element).backgroundImage !== 'none';
            } else if (ElementSelector.mode === 'input') {
                isValidTarget = element.tagName === 'INPUT' &&
                    (element.type === 'text' || !element.type);
            }

            if (isValidTarget) {
                // 添加新的高亮
                element.style.outline = '3px solid #667eea';
                ElementSelector.highlightedElement = element;
            }
        }
    },

    /**
     * 處理點擊
     */
    handleClick: function (e) {
        if (!ElementSelector.isActive) return;

        e.preventDefault();
        e.stopPropagation();

        const element = ElementSelector.highlightedElement;

        if (element) {
            // 取得選擇器
            const selector = CaptchaDetector.getUniqueSelector(element);

            // 回調
            if (ElementSelector.onSelect) {
                ElementSelector.onSelect({
                    element,
                    selector,
                    mode: ElementSelector.mode
                });
            }
        }

        ElementSelector.stop();
    },

    /**
     * 處理按鍵
     */
    handleKeyDown: function (e) {
        if (e.key === 'Escape') {
            ElementSelector.stop();
            if (ElementSelector.onSelect) {
                ElementSelector.onSelect(null);
            }
        }
    }
};

// 匯出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElementSelector;
}
