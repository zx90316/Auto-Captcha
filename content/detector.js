/**
 * 驗證碼偵測模組
 * 自動掃描頁面尋找驗證碼圖片和輸入框
 */

const CaptchaDetector = {
    // 常見驗證碼圖片的特徵
    imagePatterns: {
        // ID/Class 名稱關鍵字
        keywords: [
            'captcha', 'verify', 'code', 'vcode', 'checkcode', 'authcode',
            'seccode', 'validcode', 'imgcode', 'piccode', 'yzm', 'yanzhengma',
            'verification', 'security'
        ],
        // 常見尺寸範圍 (寬x高)
        sizeRange: {
            minWidth: 50,
            maxWidth: 300,
            minHeight: 20,
            maxHeight: 100
        }
    },

    // 常見驗證碼輸入框的特徵
    inputPatterns: {
        keywords: [
            'captcha', 'verify', 'code', 'vcode', 'checkcode', 'authcode',
            'seccode', 'validcode', 'yzm', 'yanzhengma', 'verification'
        ],
        // 常見 placeholder
        placeholders: [
            '驗證碼', '验证码', 'captcha', 'verification code', '請輸入驗證碼',
            '请输入验证码', 'enter code', 'security code'
        ]
    },

    /**
     * 偵測頁面上的驗證碼
     * @returns {{images: Element[], inputs: Element[], pairs: Array<{image: Element, input: Element}>}}
     */
    detect() {
        const images = this.findCaptchaImages();
        const inputs = this.findCaptchaInputs();
        const pairs = this.matchImageInputPairs(images, inputs);

        return {
            images,
            inputs,
            pairs
        };
    },

    /**
     * 尋找驗證碼圖片
     * @returns {Element[]}
     */
    findCaptchaImages() {
        const candidates = [];

        // 1. 搜尋所有 img 標籤
        const allImages = document.querySelectorAll('img');
        allImages.forEach(img => {
            if (this.isLikelyCaptchaImage(img)) {
                candidates.push(img);
            }
        });

        // 2. 搜尋 canvas 元素 (某些驗證碼使用 canvas 繪製)
        const allCanvas = document.querySelectorAll('canvas');
        allCanvas.forEach(canvas => {
            if (this.isLikelyCaptchaCanvas(canvas)) {
                candidates.push(canvas);
            }
        });

        // 3. 搜尋有背景圖片的元素
        const elementsWithBg = document.querySelectorAll('[style*="background"]');
        elementsWithBg.forEach(el => {
            if (this.isLikelyCaptchaBackground(el)) {
                candidates.push(el);
            }
        });

        return candidates;
    },

    /**
     * 判斷圖片是否可能是驗證碼
     */
    isLikelyCaptchaImage(img) {
        // 檢查 src
        const src = (img.src || '').toLowerCase();
        const id = (img.id || '').toLowerCase();
        const className = (img.className || '').toLowerCase();
        const alt = (img.alt || '').toLowerCase();
        const name = (img.name || '').toLowerCase();

        // 關鍵字匹配
        const textToCheck = `${src} ${id} ${className} ${alt} ${name}`;
        const hasKeyword = this.imagePatterns.keywords.some(kw => textToCheck.includes(kw));

        // 尺寸檢查
        const width = img.naturalWidth || img.width || img.offsetWidth;
        const height = img.naturalHeight || img.height || img.offsetHeight;
        const sizeMatch = this.checkImageSize(width, height);

        // 如果有關鍵字，權重較高
        if (hasKeyword) {
            return true;
        }

        // 如果尺寸符合且不是太大的圖片
        if (sizeMatch && width < 400 && height < 150) {
            // 額外檢查：是否靠近輸入框
            const nearInput = this.isNearInput(img);
            if (nearInput) {
                return true;
            }
        }

        return false;
    },

    /**
     * 判斷 canvas 是否可能是驗證碼
     */
    isLikelyCaptchaCanvas(canvas) {
        const id = (canvas.id || '').toLowerCase();
        const className = (canvas.className || '').toLowerCase();

        const textToCheck = `${id} ${className}`;
        const hasKeyword = this.imagePatterns.keywords.some(kw => textToCheck.includes(kw));

        if (hasKeyword) {
            return true;
        }

        // 檢查尺寸
        const width = canvas.width || canvas.offsetWidth;
        const height = canvas.height || canvas.offsetHeight;

        if (this.checkImageSize(width, height) && this.isNearInput(canvas)) {
            return true;
        }

        return false;
    },

    /**
     * 判斷背景圖元素是否可能是驗證碼
     */
    isLikelyCaptchaBackground(el) {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;

        if (!bgImage || bgImage === 'none') {
            return false;
        }

        const id = (el.id || '').toLowerCase();
        const className = (el.className || '').toLowerCase();

        const textToCheck = `${id} ${className} ${bgImage}`;
        const hasKeyword = this.imagePatterns.keywords.some(kw => textToCheck.includes(kw));

        if (hasKeyword) {
            const width = el.offsetWidth;
            const height = el.offsetHeight;
            return this.checkImageSize(width, height);
        }

        return false;
    },

    /**
     * 檢查尺寸是否在驗證碼範圍內
     */
    checkImageSize(width, height) {
        const { minWidth, maxWidth, minHeight, maxHeight } = this.imagePatterns.sizeRange;
        return width >= minWidth && width <= maxWidth && height >= minHeight && height <= maxHeight;
    },

    /**
     * 檢查元素是否靠近輸入框
     */
    isNearInput(element) {
        const rect = element.getBoundingClientRect();
        const inputs = document.querySelectorAll('input[type="text"], input:not([type])');

        for (const input of inputs) {
            const inputRect = input.getBoundingClientRect();
            const distance = Math.sqrt(
                Math.pow(rect.left - inputRect.left, 2) +
                Math.pow(rect.top - inputRect.top, 2)
            );

            // 如果距離小於 300px，認為是靠近的
            if (distance < 300) {
                return true;
            }
        }

        return false;
    },

    /**
     * 尋找驗證碼輸入框
     * @returns {Element[]}
     */
    findCaptchaInputs() {
        const candidates = [];
        const allInputs = document.querySelectorAll('input[type="text"], input:not([type])');

        allInputs.forEach(input => {
            if (this.isLikelyCaptchaInput(input)) {
                candidates.push(input);
            }
        });

        return candidates;
    },

    /**
     * 判斷輸入框是否可能是驗證碼輸入框
     */
    isLikelyCaptchaInput(input) {
        const id = (input.id || '').toLowerCase();
        const name = (input.name || '').toLowerCase();
        const className = (input.className || '').toLowerCase();
        const placeholder = (input.placeholder || '').toLowerCase();

        // 檢查關鍵字
        const textToCheck = `${id} ${name} ${className}`;
        const hasKeyword = this.inputPatterns.keywords.some(kw => textToCheck.includes(kw));

        if (hasKeyword) {
            return true;
        }

        // 檢查 placeholder
        const hasPlaceholder = this.inputPatterns.placeholders.some(ph =>
            placeholder.includes(ph.toLowerCase())
        );

        if (hasPlaceholder) {
            return true;
        }

        // 檢查 label
        const label = this.findLabelForInput(input);
        if (label) {
            const labelText = label.textContent.toLowerCase();
            const hasLabelKeyword = this.inputPatterns.keywords.some(kw => labelText.includes(kw)) ||
                this.inputPatterns.placeholders.some(ph => labelText.includes(ph.toLowerCase()));
            if (hasLabelKeyword) {
                return true;
            }
        }

        return false;
    },

    /**
     * 尋找輸入框對應的 label
     */
    findLabelForInput(input) {
        // 透過 for 屬性
        if (input.id) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) return label;
        }

        // 透過父元素
        let parent = input.parentElement;
        while (parent) {
            if (parent.tagName === 'LABEL') {
                return parent;
            }
            const label = parent.querySelector('label');
            if (label) return label;
            parent = parent.parentElement;

            // 只向上查找 3 層
            if (parent && parent.parentElement && parent.parentElement.parentElement) {
                break;
            }
        }

        return null;
    },

    /**
     * 配對圖片和輸入框
     */
    matchImageInputPairs(images, inputs) {
        const pairs = [];

        images.forEach(image => {
            const imageRect = image.getBoundingClientRect();
            let closestInput = null;
            let minDistance = Infinity;

            inputs.forEach(input => {
                const inputRect = input.getBoundingClientRect();
                const distance = Math.sqrt(
                    Math.pow(imageRect.left - inputRect.left, 2) +
                    Math.pow(imageRect.top - inputRect.top, 2)
                );

                if (distance < minDistance && distance < 500) {
                    minDistance = distance;
                    closestInput = input;
                }
            });

            if (closestInput) {
                pairs.push({
                    image,
                    input: closestInput,
                    distance: minDistance
                });
            }
        });

        // 按距離排序
        pairs.sort((a, b) => a.distance - b.distance);

        return pairs;
    },

    /**
     * 取得元素的唯一 CSS 選擇器
     */
    getUniqueSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }

        const path = [];
        let current = element;

        while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();

            if (current.className && typeof current.className === 'string') {
                const classes = current.className.trim().split(/\s+/).filter(c => c);
                if (classes.length > 0) {
                    selector += '.' + classes.join('.');
                }
            }

            // 加上 nth-child 確保唯一性
            const parent = current.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
                if (siblings.length > 1) {
                    const index = siblings.indexOf(current) + 1;
                    selector += `:nth-of-type(${index})`;
                }
            }

            path.unshift(selector);
            current = current.parentElement;
        }

        return path.join(' > ');
    }
};

// 匯出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CaptchaDetector;
}
