# Change Log

All notable changes to the "ai-content-developer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added
- AI-powered technical documentation creation using VS Code Chat Participant API
- Sequential workflow orchestration with 5-step deterministic process
- Multi-format input support (Word, PDF, PowerPoint, text, URLs, GitHub PRs)
- Context handoff system for seamless webview-to-chat transitions
- Microsoft documentation standards integration with official content patterns
- Real-time streaming progress updates during AI processing
- Smart repository analysis for optimal content placement decisions
- Professional content pattern enforcement (Overview, Concept, Quickstart, How-to, Tutorial)
- Intelligent content strategy (CREATE vs UPDATE) based on overlap analysis
- Comprehensive file processing pipeline with specialized services
- Template-based AI prompt system with variable substitution
- 30-minute TTL context management with automatic cleanup

### Changed
- Completely rebranded from generic template to AI Content Developer
- Replaced manual workflows with AI-powered sequential orchestration
- Updated all command IDs and configuration keys to ai-content-developer namespace
- Enhanced webview UI for professional documentation creation workflow

### Removed
- Legacy template placeholder content and generic examples
- Manual workflow orchestration in favor of AI automation
- Generic webview template features replaced with AI-specific functionality

## [0.0.1] - 2024-12-19

### Added
- Initial release of AI Content Developer extension
- Chat Participant API integration with @content-creator participant
- Sequential AI workflow with Language Model API integration
- Professional documentation creation with Microsoft standards compliance
- Multi-format file processing and intelligent content generation

---

## Version Guidelines

When releasing a new version:

### Versioning Format
- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
- **MAJOR**: Incompatible API changes
- **MINOR**: Backwards-compatible functionality additions
- **PATCH**: Backwards-compatible bug fixes

### Categories to Use
- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Vulnerability fixes

### Example Entry
```markdown
## [1.0.0] - 2024-MM-DD

### Added
- New feature X with Y capability
- Support for Z configuration

### Fixed
- Issue with WebView not loading on first activation
- Memory leak in message handler

### Changed
- Updated minimum VS Code version to 1.75.0
- Improved WebView performance by 30%
```

Remember to:
1. Keep entries concise but descriptive
2. Include issue/PR numbers when applicable
3. Credit contributors
4. Update version in package.json before release
