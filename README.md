# AI Content Developer

A streamlined VSCode extension that leverages GitHub Copilot to create professional technical documentation through sequential prompt execution.

## Features

- **Multi-Input Support**: Accept various input sources to inform documentation creation:
  - Files: Markdown, Word documents, Text files, PDFs, PowerPoint presentations, Images (PNG, JPG, etc.)
  - URLs: Web pages and online documentation
  - GitHub Pull Requests: Analyze PRs for documentation needs
- **Sequential Prompt Execution**: Automatically executes a series of prompts through Copilot to generate comprehensive documentation
- **Smart Input Processing**: Routes different input types to appropriate handlers
- **Content Goal Interface**: Define what documentation you want to create with context from multiple sources
- **Execution Modes**:
  - **Automated Mode (Default)**: Runs all prompts continuously without interruption
  - **Interactive Mode**: Pauses between prompts for review and modification
- **Copilot Integration**: Uses your existing Copilot subscription for AI-powered content generation
- **Chat Participant API**: Seamlessly integrates with VS Code's chat interface

## Prerequisites

- VS Code version 1.90.0 or higher
- Active GitHub Copilot subscription
- Chat Participant API support

## Installation

1. Clone this repository
2. Open in VS Code
3. Run `npm install`
4. Press `F5` to launch a new VS Code window with the extension loaded

## Usage

### Via Webview Interface (Recommended)

1. Open the command palette (`Cmd/Ctrl + Shift + P`)
2. Run `AI Content Developer: Open AI Content Developer`
3. **Add Input Sources** (optional but recommended):
   - Click "Select Files" to choose documents (MD, Word, PDF, PowerPoint, text, images)
   - Click "Add URL" to include web resources
   - Click "Add GitHub PR" to analyze pull requests
4. **Define Your Content Goal**: Describe what documentation you want to create
5. **Choose Execution Mode**:
   - Leave unchecked for automated execution
   - Check "Interactive Mode" to review/modify prompts between steps
6. Click "Execute Workflow"
7. The extension will:
   - Process all input sources
   - Open the chat panel
   - Execute prompts sequentially with Copilot
   - Save documentation in the `docs` folder

### Via Chat Participant

You can also interact directly with the chat participant:

1. Open the VS Code Chat panel
2. Type `@content-creator` followed by your documentation request
3. The workflow will execute in automated mode

## How It Works

1. **Input Collection**: Add files, URLs, or GitHub PRs as context sources
2. **Content Goal**: Describe the documentation you want to create
3. **Input Processing**: The extension processes inputs through specialized handlers
4. **Copilot Execution**: Sequential prompts are executed through Copilot Chat
5. **Context Chaining**: Each prompt's output feeds into the next one
6. **Documentation Creation**: Final output is saved as a markdown file

## Workflow Prompts

The extension executes the following prompts in sequence:

1. **Directory Selection**: Determines the optimal location for documentation
2. **Content Strategy**: Decides whether to create new content or update existing
3. **Pattern Selection**: Chooses the appropriate documentation pattern
4. **Content Generation**: Creates the actual documentation content
5. **Content Update**: Updates existing documentation when needed

## Project Structure

```
src/
├── extension.ts                 # Extension entry point
├── commands/                    # Command handlers
├── config/                      # Configuration management
├── models/
│   └── InputModels.ts          # Input type definitions
├── providers/
│   └── webview/                # Webview components
│       ├── WebviewProvider.ts
│       ├── WebviewMessageHandler.ts
│       └── InputProcessor.ts
├── services/
│   ├── CopilotIntegrationService.ts
│   ├── InputHandlerService.ts  # Routes inputs to handlers
│   ├── chat/                   # Chat participant services
│   │   ├── ChatParticipantService.ts
│   │   ├── ChatRequestRouter.ts
│   │   └── PromptExecutor.ts
│   └── workflow/
│       └── FileOperations.ts
├── prompts/
│   └── orchestration/          # Sequential prompts
└── types/                      # TypeScript definitions
```

## Configuration

The extension can be configured through VS Code settings:

- `ai-content-developer.enableDebugMode`: Enable debug logging
- `ai-content-developer.theme`: Color theme for the webview (auto/light/dark)

## Development

### Building

   ```bash
   npm run compile
   ```

### Testing

```bash
npm test
```

### Packaging

```bash
npm run package
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and feature requests, please use the GitHub issue tracker.