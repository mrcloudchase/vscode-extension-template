# AI Content Developer 🤖

A sophisticated VS Code extension that creates professional technical documentation using AI-powered workflows with the VS Code Chat Participant API. Transform your files and ideas into structured, professional documentation with intelligent content generation.

## ✨ Features

- **AI-Powered Documentation**: Create professional technical docs using VS Code's Chat Participant API
- **Multi-Format Input Support**: Process Word docs, PDFs, PowerPoint, text files, URLs, and GitHub PRs
- **Sequential Workflow Orchestration**: Deterministic 5-step AI workflow for optimal content creation
- **Intelligent Content Strategy**: AI decides whether to create new content or update existing files
- **Microsoft Documentation Standards**: Follows official content patterns (Overview, Quickstart, How-to, Tutorial, Concept)
- **Real-time Progress Streaming**: Live updates during AI processing with interactive chat interface
- **Smart Repository Analysis**: Analyzes your workspace to select optimal content placement
- **Dual Interface Design**: Webview for file uploads + Chat Participant for AI workflow execution
- **Context Handoff System**: Seamless transition from webview to chat with preserved context

## 📁 Project Structure

```
ai-content-developer/
├── src/                      # Source code
│   ├── extension.ts          # Extension entry point & activation
│   ├── commands/             # Command handlers
│   │   └── CommandManager.ts
│   ├── config/               # Configuration management
│   │   └── ConfigurationManager.ts
│   ├── providers/            # WebView and UI providers
│   │   └── WebviewProvider.ts
│   ├── services/             # Core business logic
│   │   ├── ChatParticipantService.ts      # Main AI workflow orchestrator
│   │   ├── CopilotIntegrationService.ts   # Chat participant integration
│   │   ├── InputHandlerService.ts         # File processing router
│   │   ├── WorkflowContextManager.ts      # Context handoff management
│   │   ├── PromptService.ts               # Template management
│   │   ├── ContentPatternService.ts       # Documentation standards
│   │   ├── BaseService.ts                 # Abstract service base
│   │   ├── WordDocumentService.ts         # Word document processing
│   │   ├── PDFService.ts                  # PDF processing
│   │   ├── PowerPointService.ts           # PowerPoint processing
│   │   ├── TextService.ts                 # Text file processing
│   │   ├── URLService.ts                  # Web content processing
│   │   └── GitHubService.ts               # GitHub PR processing
│   ├── models/               # Data models and schemas
│   │   ├── InputModels.ts                 # Input processing models
│   │   ├── OrchestrationModels.ts         # Workflow step schemas
│   │   └── ContentPattern.ts              # Content pattern definitions
│   ├── prompts/              # AI prompt templates
│   │   └── orchestration/                 # Sequential workflow prompts
│   │       ├── 01-directory-selection.md
│   │       ├── 02-content-strategy.md
│   │       ├── 03-pattern-selection.md
│   │       ├── 04-content-generation.md
│   │       └── 05-content-update.md
│   ├── content-standards/    # Documentation standards
│   │   └── content_standards.json         # Microsoft docs standards
│   ├── types/                # TypeScript type definitions
│   │   └── ExtensionContext.ts
│   └── utils/                # Utility functions
│       └── Logger.ts
├── media/                    # WebView assets
│   ├── webview.js           # WebView JavaScript
│   ├── webview.css          # WebView styles
│   ├── codicon.css          # VS Code icons
│   └── icon*.svg            # Extension icons
├── docs/                     # Documentation
│   ├── architecture.md      # System architecture
│   ├── dataflow.md          # Data flow documentation
│   └── README.md            # Documentation overview
├── dist/                     # Compiled output (generated)
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript configuration
└── webpack.config.js        # Webpack configuration
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Visual Studio Code](https://code.visualstudio.com/) v1.90.0 or higher
- [GitHub Copilot](https://copilot.github.com/) subscription (for AI functionality)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/doveychase/ai-content-developer.git
   cd ai-content-developer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the extension:**
   ```bash
   npm run compile
   ```

### Usage

1. **Install the extension** in VS Code (development mode):
   - Press `F5` to open a new VS Code window with the extension loaded

2. **Open the AI Content Developer:**
   - Run command: `AI Content Developer: Open AI Content Developer` from Command Palette (`Ctrl+Shift+P`)

3. **Create documentation:**
   - **Upload source materials**: Word docs, PDFs, URLs, GitHub PRs
   - **Describe your goal**: What documentation you need
   - **Click "Create Documentation"**: Launches AI workflow in Chat

4. **Follow the AI workflow:**
   - The `@content-creator` chat participant will guide you through the process
   - Watch real-time progress as AI analyzes your repository and creates content
   - Review and open the generated documentation files

## 🤖 AI Workflow Process

### Sequential Orchestration Steps

The extension uses a streamlined 4-step AI workflow:

1. **📁 Directory Selection**: AI explores your workspace to find the optimal location for new content
2. **🎯 Content Strategy**: AI decides whether to create new content or update existing files
3. **🎨 Pattern Selection**: AI chooses the appropriate documentation pattern (Overview, Quickstart, How-to, Tutorial, Concept)
4. **✍️ Content Generation**: AI creates professional documentation following Microsoft standards

### Supported Input Types

- **📄 Word Documents** (`.docx`, `.doc`) - Extracted using mammoth.js
- **📑 PDF Files** (`.pdf`) - Parsed using pdf-parse
- **📊 PowerPoint** (`.pptx`, `.ppt`) - XML content extraction
- **📝 Text Files** (`.txt`, `.md`) - Direct text processing
- **🌐 Web URLs** - Content scraped using cheerio
- **🐙 GitHub PRs** - Full PR data via Octokit API

### Content Patterns

Based on Microsoft documentation standards:
- **Overview**: Service/product introductions
- **Concept**: Deep technical explanations
- **Quickstart**: < 10 minute implementations
- **How-to**: Step-by-step procedures
- **Tutorial**: Guided learning experiences

## ⚙️ Configuration

### Optional Settings

```json
{
  "ai-content-developer.enableDebugMode": false,
  "ai-content-developer.theme": "auto",
  "ai-content-developer.githubToken": "your-github-token"
}
```

### GitHub Integration

For GitHub PR processing, optionally configure a personal access token:
1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Create a token with `repo` scope
3. Add to VS Code settings: `ai-content-developer.githubToken`

## 🔧 Available Scripts

- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and recompile
- `npm run package` - Package extension for production
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
- `npm run vscode:prepublish` - Pre-publish hook

## 🧪 Testing the Extension

### Manual Testing

1. **Launch Extension Development Host:**
   - Press `F5` in VS Code to open a new window with the extension loaded

2. **Test the Webview Interface:**
   - Run `AI Content Developer: Open AI Content Developer` from Command Palette
   - Upload test files (Word doc, PDF, or text file)
   - Enter a content goal like "Create a getting started guide"
   - Click "Create Documentation"

3. **Test the Chat Participant:**
   - Open VS Code Chat (`Ctrl+Shift+I` or `Cmd+Shift+I`)
   - Type: `@content-creator Create API documentation for user authentication`
   - Watch the sequential workflow execute

4. **Verify Output:**
   - Check that files are created in appropriate directories
   - Verify content follows Microsoft documentation standards
   - Test the "Open Created File" buttons

### Debugging

- **Extension Logs**: Check Output panel → "AI Content Developer"
- **Chat Participant**: Monitor streaming responses in chat
- **WebView**: Use Developer Tools (`Help > Toggle Developer Tools`)
- **File Processing**: Check individual service logs for detailed processing info

## 📦 Building and Publishing

### Build for Production

```bash
npm run package
```

This creates a `.vsix` file in the project root.

### Publishing to Marketplace

1. **Get a Personal Access Token:**
   - Visit [Azure DevOps](https://dev.azure.com/)
   - Create a PAT with Marketplace publish scope

2. **Install vsce:**
   ```bash
   npm install -g @vscode/vsce
   ```

3. **Create a publisher:**
   ```bash
   vsce create-publisher your-publisher-name
   ```

4. **Publish:**
   ```bash
   vsce publish
   ```

## 🔧 Technical Architecture

### Core Components

- **`ChatParticipantService`**: Main AI workflow orchestrator using VS Code Chat Participant API
- **`CopilotIntegrationService`**: Manages webview-to-chat handoff with context preservation
- **`InputHandlerService`**: Routes different file types to appropriate processing services
- **`WorkflowContextManager`**: Handles context storage and retrieval for seamless handoffs
- **`PromptService`**: Manages AI prompt templates with variable substitution
- **`ContentPatternService`**: Enforces Microsoft documentation standards and patterns

### File Processing Pipeline

Each input type has a dedicated service:
- **`WordDocumentService`**: Uses mammoth.js for .docx/.doc processing
- **`PDFService`**: Uses pdf-parse for PDF text extraction
- **`PowerPointService`**: XML parsing for .pptx/.ppt slide content
- **`URLService`**: Web scraping with cheerio for HTML content
- **`GitHubService`**: Octokit integration for PR data and diff analysis
- **`TextService`**: Direct file reading for text and markdown files

### AI Integration

- **Language Model API**: Uses `request.model.sendRequest()` for direct Copilot integration
- **Streaming Responses**: Real-time progress updates via `stream.progress()` and `stream.markdown()`
- **Structured Outputs**: JSON schema validation for consistent AI responses
- **Context Preservation**: 30-minute TTL context storage for complex workflows

## 🐛 Troubleshooting

### Common Issues

1. **Chat Participant not appearing:**
   - Ensure VS Code version 1.90.0 or higher
   - Check that GitHub Copilot is active
   - Verify extension is properly loaded

2. **File processing errors:**
   - Check file permissions and formats
   - Verify internet connectivity for URLs
   - Ensure GitHub token is configured for PR access

3. **Workflow interruptions:**
   - Check VS Code Chat for error messages
   - Review extension logs in Output panel
   - Verify Copilot subscription is active

### Debugging Tools

- **Extension Logs**: Output panel → "AI Content Developer"
- **Chat Logs**: Monitor real-time workflow progress in Chat
- **Context Debugging**: Use `getActiveContexts()` for context management issues

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [VS Code Chat Participant API](https://code.visualstudio.com/api/extension-guides/chat)
- [VS Code Language Model API](https://code.visualstudio.com/api/references/vscode-api#LanguageModel)
- [WebView API Guide](https://code.visualstudio.com/api/extension-guides/webview)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Microsoft Documentation Standards](https://docs.microsoft.com/en-us/contribute/)
- [VS Code Icons](https://microsoft.github.io/vscode-codicons/dist/codicon.html)

## 📚 Documentation

For detailed technical information:
- **[Architecture Overview](docs/architecture.md)** - Complete system design
- **[Data Flow](docs/dataflow.md)** - Processing pipeline details
- **[Quickstart Guide](QUICKSTART.md)** - Quick setup instructions

## 💡 Use Cases

Perfect for creating:

- **📋 Getting Started Guides**: Onboard new team members with comprehensive setup instructions
- **🔧 API Documentation**: Generate complete API references from code and specs
- **📖 How-to Guides**: Step-by-step procedures for common tasks
- **🎓 Tutorials**: Learning-focused content with examples and exercises
- **📊 Technical Overviews**: High-level service and architecture explanations
- **🐛 Troubleshooting Guides**: Problem-solving documentation from support tickets

## 🚀 Example Workflows

```bash
# Create documentation from GitHub PR
@content-creator Analyze PR #123 and create deployment documentation

# Generate guide from multiple sources
Upload: [design-spec.pdf, api-endpoints.md, user-feedback.docx]
Goal: "Create a complete integration guide for developers"

# Update existing documentation
@content-creator Update the authentication guide with OAuth 2.0 PKCE flow
```

---

**Transform your documentation workflow with AI!** 🚀

If you find this extension helpful, please consider giving it a ⭐ on GitHub!