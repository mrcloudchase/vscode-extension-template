# VSCode WebView Extension Template 🚀

A modern, production-ready template for building Visual Studio Code extensions with WebView support. This template provides a solid foundation with TypeScript, best practices, and modular architecture.

## ✨ Features

- **TypeScript Support**: Full TypeScript support for type safety and better development experience
- **WebView Integration**: Complete WebView setup with bi-directional communication
- **Modular Architecture**: Clean separation of concerns with organized file structure
- **Modern Build System**: Webpack configuration for optimized bundling
- **Development Tools**: ESLint, Prettier, and VS Code debugging setup
- **Theme Support**: Automatic adaptation to VS Code themes (light/dark)
- **Configuration Management**: Built-in settings and configuration handling
- **Logging System**: Comprehensive logging utility for debugging
- **Message Protocol**: Type-safe message passing between extension and webview

## 📁 Project Structure

```
vscode-extension-template/
├── src/                      # Source code
│   ├── extension.ts          # Extension entry point
│   ├── commands/             # Command handlers
│   │   └── CommandManager.ts
│   ├── config/               # Configuration management
│   │   └── ConfigurationManager.ts
│   ├── providers/            # WebView and other providers
│   │   └── WebviewProvider.ts
│   ├── types/                # TypeScript type definitions
│   │   └── ExtensionContext.ts
│   └── utils/                # Utility functions
│       └── Logger.ts
├── media/                    # WebView assets
│   ├── webview.js           # WebView JavaScript
│   ├── webview.css          # WebView styles
│   ├── codicon.css          # VS Code icons
│   └── icon*.svg            # Extension icons
├── dist/                     # Compiled output (generated)
├── .vscode/                  # VS Code workspace settings
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript configuration
├── webpack.config.js        # Webpack configuration
├── .eslintrc.json           # ESLint configuration
└── .prettierrc.json         # Prettier configuration
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Visual Studio Code](https://code.visualstudio.com/)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/vscode-extension-template.git
   cd vscode-extension-template
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the extension:**
   ```bash
   npm run compile
   ```

### Development

1. **Open in VS Code:**
   ```bash
   code .
   ```

2. **Start watching for changes:**
   ```bash
   npm run watch
   ```

3. **Launch the extension:**
   - Press `F5` to open a new VS Code window with your extension loaded
   - Run the command `WebView Extension: Open WebView` from the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)

## 📝 Customization Guide

### 1. Update Extension Metadata

Edit `package.json`:
```json
{
  "name": "your-extension-name",
  "displayName": "Your Extension Display Name",
  "description": "Your extension description",
  "publisher": "your-publisher-name",
  "repository": {
    "url": "https://github.com/yourusername/your-repo"
  }
}
```

### 2. Add Custom Commands

In `package.json`, add to `contributes.commands`:
```json
{
  "command": "your-extension.newCommand",
  "title": "Your Command Title",
  "category": "Your Category"
}
```

Then register in `CommandManager.ts`:
```typescript
this.registerCommand('your-extension.newCommand', () => this.yourHandler());
```

### 3. Customize WebView Content

Edit `src/providers/WebviewProvider.ts`:
- Modify `getHtmlContent()` method for HTML structure
- Update message handlers in `handleWebviewMessage()`

Edit `media/webview.js` and `media/webview.css`:
- Customize the WebView UI and behavior
- Add event listeners and styling

### 4. Add Configuration Options

In `package.json`, add to `contributes.configuration.properties`:
```json
"your-extension.yourSetting": {
  "type": "string",
  "default": "value",
  "description": "Setting description"
}
```

Update `ExtensionContext.ts` interface and `ConfigurationManager.ts` accordingly.

## 🔧 Available Scripts

- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and recompile
- `npm run package` - Package extension for production
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
- `npm run vscode:prepublish` - Pre-publish hook

## 🧪 Testing

### Unit Tests

Place your test files in `src/test/` directory:
```typescript
// src/test/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  test('Sample test', () => {
    assert.strictEqual(1 + 1, 2);
  });
});
```

Run tests:
```bash
npm test
```

### Manual Testing

1. Press `F5` to launch extension development host
2. Test your commands and WebView functionality
3. Check the output channel for logs
4. Use VS Code's Developer Tools (`Help > Toggle Developer Tools`) for WebView debugging

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

## 🎯 Best Practices

### Code Organization

- Keep components modular and single-purpose
- Use TypeScript interfaces for type safety
- Implement proper error handling
- Add comprehensive logging

### WebView Security

- Always use Content Security Policy
- Validate all messages from WebView
- Use nonces for inline scripts
- Sanitize user input

### Performance

- Lazy load WebView content
- Dispose resources properly
- Use webpack for bundling
- Minimize extension activation time

### User Experience

- Provide clear command names
- Add keyboard shortcuts for common actions
- Support VS Code themes
- Show progress for long operations

## 🐛 Debugging

### Extension Debugging

1. Set breakpoints in TypeScript files
2. Press `F5` to start debugging
3. Use Debug Console for output

### WebView Debugging

1. Open Developer Tools in the extension host
2. Find your WebView in the Elements tab
3. Use Console for JavaScript debugging

### Logging

The template includes a Logger utility:
```typescript
logger.info('Information message');
logger.debug('Debug message');
logger.warn('Warning message');
logger.error('Error message', error);
```

View logs in the Output panel: `View > Output > VSCode WebView Extension`

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

- [VS Code Extension API](https://code.visualstudio.com/api)
- [WebView API Guide](https://code.visualstudio.com/api/extension-guides/webview)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [VS Code Icons](https://microsoft.github.io/vscode-codicons/dist/codicon.html)

## 💡 Tips

- Use the VS Code Extension Generator for quick setup: `npm install -g yo generator-code`
- Test your extension on different VS Code themes
- Consider adding telemetry for usage insights (with user consent)
- Keep your extension size small for faster installation
- Document your API if other extensions might use it

## 🎉 Examples

Here are some ideas for extensions you can build with this template:

- **Data Visualizer**: Display charts and graphs from workspace data
- **API Client**: Interactive REST API testing tool
- **Documentation Browser**: Browse and search project documentation
- **Task Manager**: Manage and track project tasks
- **Database Explorer**: Connect and browse databases
- **Code Metrics**: Display code quality metrics and statistics
- **Learning Platform**: Interactive coding tutorials

---

**Happy Coding!** 🚀

If you find this template helpful, please consider giving it a ⭐ on GitHub!