# CHANGELOG

All notable changes to Auto-Captcha will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-03-04

### Fixed
- 修正 Ollama API 呼叫方式，改用 `/api/chat` 端點並加入 `[img-0]` 圖片標記，相容 Ollama v0.17.1+ ([ollama/ollama#14584](https://github.com/ollama/ollama/pull/14584))

### Changed
- README 新增 Ollama CORS 永久設定教學（Windows / macOS / Linux）
- README 新增實測環境資訊（i7-14700, 32GB RAM）

## [1.0.0] - 2026-02-10

### Added
- Initial release
- Automatic CAPTCHA detection on web pages
- Support for multiple AI APIs:
  - OpenAI (GPT-4 Vision)
  - Google Gemini
  - Ollama (local)
  - LM Studio (local)
  - Custom API endpoints
- Manual element selection mode for custom CAPTCHA locations
- Site-specific rules management
- Auto-fill functionality
- Auto-recognition option (detect and recognize automatically)
- Refresh button next to CAPTCHA input fields
- Dark theme settings UI
- Right-click context menu integration
- Notification system for recognition results

### Security
- All settings stored locally using Chrome's secure storage
- HTTPS encryption for all API communications
- Support for local AI providers (Ollama, LM Studio) for privacy-conscious users
