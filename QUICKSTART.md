# Quick Start Guide 🚀

Welcome to the VSCode WebView Extension Template! This guide will help you get up and running in minutes.

## 📋 Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js v16+ installed (`node --version`)
- ✅ npm or yarn installed (`npm --version`)
- ✅ Visual Studio Code installed
- ✅ Git installed (`git --version`)

## 🎯 5-Minute Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Open in VS Code
```bash
code .
```

### Step 3: Start Development
Press `F5` to launch the extension in a new VS Code window.

### Step 4: Test the Extension
In the new VS Code window:
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type: `WebView Extension: Open WebView`
3. Press Enter

🎉 **Congratulations!** You should now see your webview panel!

## 🛠️ Development Workflow

### Watch Mode (Recommended)
```bash
npm run watch
```
Keep this running in a terminal while developing. It will automatically recompile your code on changes.

### Manual Compilation
```bash
npm run compile
```

### Debugging Tips
1. **Extension Code**: Set breakpoints in `.ts` files and debug with F5
2. **WebView Code**: Use Developer Tools (`Help > Toggle Developer Tools`)
3. **View Logs**: Check Output panel (`View > Output > VSCode WebView Extension`)

## 📝 First Customizations

### 1. Change Extension Name
Edit `package.json`:
```json
{
  "name": "my-awesome-extension",
  "displayName": "My Awesome Extension"
}
```

### 2. Modify WebView Content
Edit `src/providers/WebviewProvider.ts` - Look for the `getHtmlContent()` method.

### 3. Add a New Command
1. Add to `package.json`:
```json
"commands": [{
  "command": "myExtension.helloWorld",
  "title": "Hello World"
}]
```

2. Register in `src/commands/CommandManager.ts`:
```typescript
this.registerCommand('myExtension.helloWorld', () => {
  vscode.window.showInformationMessage('Hello World!');
});
```

## 🔍 Project Structure Overview

```
📦 Your Extension
├── 📂 src/              # TypeScript source code
│   ├── 📄 extension.ts  # Entry point
│   └── 📂 providers/    # WebView logic
├── 📂 media/            # WebView assets (HTML/CSS/JS)
├── 📂 dist/             # Compiled JavaScript (generated)
└── 📄 package.json      # Extension manifest
```

## 🧪 Testing Your Changes

### Quick Test
1. Make your changes
2. Press `Ctrl+R` / `Cmd+R` in the Extension Development Host window
3. Test your changes

### Run Tests
```bash
npm test
```

## 📚 Common Tasks

### Add npm Package
```bash
npm install package-name
```

### Format Code
```bash
npm run format
```

### Lint Code
```bash
npm run lint
```

### Build for Production
```bash
npm run package
```

## 🆘 Troubleshooting

### Extension Not Loading?
1. Check for errors in Debug Console
2. Ensure `npm install` completed successfully
3. Try `npm run compile` manually

### WebView Not Showing?
1. Check browser console for errors (Developer Tools)
2. Verify CSP settings in `WebviewProvider.ts`
3. Check Output panel for logs

### Changes Not Reflecting?
1. Ensure `npm run watch` is running
2. Reload window (`Ctrl+R` / `Cmd+R`)
3. Restart Extension Host (`Ctrl+Shift+F5` / `Cmd+Shift+F5`)

## 📖 Next Steps

1. **Read the Main README**: Detailed documentation and best practices
2. **Explore the Code**: Start with `src/extension.ts`
3. **Check VS Code API Docs**: https://code.visualstudio.com/api
4. **Join the Community**: https://github.com/microsoft/vscode-discussions

## 💬 Need Help?

- 📋 Check existing issues on GitHub
- 💡 Read VS Code Extension samples
- 🤝 Ask in VS Code Discord/Slack communities
- 📚 Review WebView documentation

---

**Happy Coding!** 🎉

Remember: The best way to learn is by experimenting. Don't be afraid to break things - that's what version control is for!
