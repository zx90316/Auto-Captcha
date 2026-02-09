# Privacy Policy for Auto-Captcha

Last updated: February 2026

## Overview

Auto-Captcha is a browser extension designed to help users automatically detect and recognize CAPTCHA images on web pages. We are committed to protecting your privacy and being transparent about our data practices.

## Data Collection

### What We Collect
- **CAPTCHA Images**: When you use the recognition feature, CAPTCHA images are sent to your configured AI API provider for text recognition.
- **Site Rules**: Custom CAPTCHA detection rules you create are stored locally in your browser.
- **Extension Settings**: Your preferences and API configurations are stored locally.

### What We Don't Collect
- We do **NOT** collect any personal information
- We do **NOT** track your browsing history
- We do **NOT** store CAPTCHA images on any server we control
- We do **NOT** sell or share any data with third parties

## Data Storage

All data is stored locally in your browser using Chrome's `storage.sync` API:
- API keys and endpoints
- Detection preferences
- Site-specific rules

This data syncs across your Chrome browsers if you're signed into Chrome, but is never sent to our servers.

## Third-Party Services

When using the CAPTCHA recognition feature, images are sent to your chosen AI provider:

- **OpenAI**: Subject to [OpenAI Privacy Policy](https://openai.com/privacy/)
- **Google Gemini**: Subject to [Google Privacy Policy](https://policies.google.com/privacy)
- **Ollama/LM Studio**: Local processing, no external data transfer

You are responsible for reviewing and agreeing to the privacy policies of these third-party services.

## Permissions

This extension requires the following permissions:

| Permission | Purpose |
|------------|---------|
| `activeTab` | Access current tab to detect CAPTCHA elements |
| `storage` | Save your settings and rules locally |
| `scripting` | Inject content scripts for CAPTCHA detection |
| `contextMenus` | Provide right-click menu options |
| `<all_urls>` | Detect CAPTCHAs on any website you visit |

## Data Security

- API keys are stored in Chrome's secure storage
- All API communication uses HTTPS encryption
- Local AI options (Ollama, LM Studio) keep your data on your machine

## Your Rights

You can:
- View and modify all stored data through the extension settings
- Delete all stored data by uninstalling the extension
- Choose to use local AI providers to avoid external data transfer

## Changes to This Policy

We may update this Privacy Policy from time to time. We will notify users of any material changes by updating the "Last updated" date.

## Contact

If you have questions about this Privacy Policy, please open an issue on our [GitHub repository](https://github.com/zx90316/Auto-Captcha).

---

By using Auto-Captcha, you agree to this Privacy Policy.
