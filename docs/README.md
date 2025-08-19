# AI Content Developer - Technical Documentation

Welcome to the comprehensive technical documentation for the AI Content Developer extension - a sophisticated AI-powered technical documentation creation system using VS Code's Chat Participant API.

## 📚 Documentation Overview

This documentation provides detailed insights into the architecture, AI workflow orchestration, and implementation details of the extension.

### Available Documentation

| Document | Description | Purpose |
|----------|-------------|---------|
| [**Architecture**](./architecture.md) | Complete system architecture with AI workflow components | Understanding the overall system design and Chat Participant integration |
| [**Data Flow**](./dataflow.md) | Detailed data flow from webview input to AI-generated documentation | Understanding how data moves through the sequential orchestration process |

## 🤖 AI-Powered Architecture Highlights

- **Chat Participant Integration**: Uses official VS Code Chat Participant API for AI workflows
- **Sequential Orchestration**: Deterministic 5-step AI workflow with structured JSON outputs
- **Context Handoff System**: Seamless webview-to-chat transition with preserved context
- **Microsoft Documentation Standards**: Enforces official content patterns and formatting
- **Multi-Format Processing**: Intelligent handling of diverse input types with specialized services
- **Real-time Streaming**: Live progress updates during AI processing

## 🔄 Key AI Workflow Features

- **Repository Intelligence**: Deep analysis of workspace structure and existing documentation
- **Smart Content Strategy**: AI decides create vs. update based on content overlap analysis
- **Pattern-Based Generation**: Uses Microsoft's official documentation templates (Overview, Quickstart, How-to, Tutorial, Concept)
- **Deterministic Decision Making**: Structured schemas ensure consistent, reliable AI outputs
- **Context Preservation**: 30-minute TTL context storage for complex multi-step workflows
- **Error Recovery**: Graceful handling of AI processing failures with retry capabilities

## 🚀 Quick Start

To understand the AI Content Developer system:

1. **Read the [Architecture](./architecture.md)** to understand the Chat Participant integration and component structure
2. **Review the [Data Flow](./dataflow.md)** to see how inputs flow through the AI workflow pipeline
3. **Examine the orchestration prompts** in `src/prompts/orchestration/` to understand AI decision-making
4. **Test the sequential workflow** using the quickstart guide

## 🎯 Target Audience

This technical documentation is designed for:

- **Extension Developers** extending or maintaining the AI workflow system
- **Technical Writers** understanding the AI-powered content creation capabilities
- **AI Engineers** reviewing the Chat Participant API integration and prompt engineering
- **Contributors** looking to add new content patterns or file processing services

## 📋 System Requirements

- **VS Code**: Version 1.90.0 or higher (for Chat Participant API)
- **GitHub Copilot**: Active subscription required for AI functionality
- **Node.js**: Version 16 or higher
- **TypeScript**: Version 5.6 or higher

## 🔧 Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Compile the extension: `npm run compile`
4. Run in debug mode: Press `F5` in VS Code
5. Test chat participant: Open Chat and type `@content-creator help`

## 📊 AI Workflow Performance

The extension is optimized for AI-powered workflows:

- **Lazy Service Loading**: File processing services loaded only when needed
- **Context Management**: 30-minute TTL with automatic cleanup
- **Streaming Responses**: Real-time AI progress updates
- **Memory Efficiency**: Proper cleanup of processed content and contexts
- **Timeout Handling**: Appropriate limits for AI model requests

## 🔍 Troubleshooting AI Workflows

Common AI workflow issues and solutions:

1. **Chat participant not registering**: Check VS Code version and Copilot subscription
2. **Workflow step failures**: Review structured JSON schema validation in logs
3. **Context handoff issues**: Verify context ID generation and retrieval
4. **AI response parsing errors**: Check JSON extraction from streaming responses

## 🤝 Contributing to AI Workflows

When contributing to the AI Content Developer:

1. **Understand the sequential orchestration** pattern used throughout
2. **Follow the prompt engineering** guidelines in orchestration templates
3. **Maintain JSON schema consistency** for AI response validation
4. **Test with various input combinations** to ensure robustness
5. **Update both code and documentation** to reflect AI workflow changes

## 📝 Version History

- **v0.0.1**: Chat Participant API implementation with sequential orchestration
- **Current**: Full AI workflow with Microsoft documentation standards integration

---

For detailed technical implementation, please refer to the specific documentation files linked above.
