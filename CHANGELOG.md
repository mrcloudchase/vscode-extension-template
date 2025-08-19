# Change Log

All notable changes to the "AI Content Developer" extension will be documented in this file.

## [1.0.0] - 2024

### Major Refactoring
- **Simplified Architecture**: Focused on sequential prompt execution via Copilot
- **Streamlined Workflow**: All heuristics handled by Copilot instead of programmatic logic
- **Clean Codebase**: Removed unnecessary services and dependencies

### Added
- ✨ Sequential prompt execution through Copilot Chat API
- 🎯 Automated and Interactive execution modes
- 🔗 Direct Copilot integration for all AI processing
- 📝 Simplified content request interface
- 🔄 Output chaining between prompts
- 💬 Chat participant for direct interaction

### Changed
- Webview now only collects content requests and execution mode
- Workflow execution delegated entirely to Copilot
- Prompts are executed sequentially with output feeding to next prompt

### Removed
- All file processing services (PDF, Word, PowerPoint, Text)
- URL and GitHub PR processing
- Service factories and dependency injection
- Content patterns and validators
- Complex input handling and models
- All npm dependencies (now zero dependencies)

## [0.1.0] - Initial Concept

### Added
- Initial prototype with complex multi-service architecture
- File processing capabilities
- Content pattern system
- Multiple input types support

---

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).