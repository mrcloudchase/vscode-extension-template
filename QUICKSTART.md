# AI Content Developer - Quick Start Guide 🚀

Get up and running with AI-powered technical documentation creation in minutes!

## 📋 Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js v16+ installed (`node --version`)
- ✅ Visual Studio Code v1.90.0+ installed
- ✅ GitHub Copilot subscription active
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

### Step 3: Launch Extension
Press `F5` to open a new VS Code window with the extension loaded.

### Step 4: Test the AI Content Developer
In the new VS Code window:
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type: `AI Content Developer: Open AI Content Developer`
3. Press Enter

🎉 **Congratulations!** You should now see the AI Content Developer interface!

## 🤖 First Documentation Creation

### Quick Test Workflow

1. **In the webview interface:**
   - Click "Select Files" and choose a text file or document
   - In the "Content Goal" field, type: `Create a getting started guide`
   - Click "Create Documentation"

2. **In the chat interface:**
   - Watch as the `@content-creator` participant analyzes your repository
   - See real-time progress through the 5-step workflow
   - Click "Open Created File" when complete

3. **Verify the result:**
   - Check that a new markdown file was created in an appropriate directory
   - Review the generated content for structure and quality

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
2. **Chat Participant**: Monitor responses in VS Code Chat interface
3. **WebView Code**: Use Developer Tools (`Help > Toggle Developer Tools`)
4. **View Logs**: Check Output panel (`View > Output > AI Content Developer`)

## 🎯 Understanding the AI Workflow

### Sequential Steps Explained

1. **📁 Directory Selection**:
   - AI explores your workspace using built-in tools
   - Finds optimal location for new content
   - Considers existing documentation organization
   - Provides reasoning for placement decision

2. **🎯 Content Strategy**:
   - AI decides: CREATE new content vs UPDATE existing
   - Analyzes content overlap and user journey
   - Ensures coherent documentation experience

3. **🎨 Pattern Selection**:
   - AI chooses appropriate Microsoft documentation pattern
   - Matches user intent with optimal structure
   - Considers audience and technical complexity

4. **✍️ Content Generation**:
   - AI creates professional, structured content
   - Follows Microsoft documentation standards
   - Includes proper front matter and formatting

### Chat Participant Commands

You can also interact directly with the chat participant:

```bash
# Create new documentation
@content-creator Create a deployment guide for containerized applications

# Update existing content  
@content-creator Update the API authentication guide with PKCE flow

# Analyze and document
@content-creator Review this GitHub PR and create release notes
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
3. Verify VS Code version is 1.90.0 or higher
4. Try `npm run compile` manually

### Chat Participant Not Available?
1. Ensure GitHub Copilot extension is installed and active
2. Check that you have a valid Copilot subscription
3. Verify VS Code Chat is available (`Ctrl+Shift+I`)
4. Check extension logs for registration errors

### File Processing Errors?
1. Verify file permissions and formats
2. Check internet connectivity for URLs
3. Configure GitHub token for PR access in settings
4. Review file size limits (10MB max for URLs)

### Workflow Interruptions?
1. Check VS Code Chat for error messages
2. Review extension logs in Output panel
3. Verify context hasn't expired (30-minute limit)
4. Restart workflow from webview if needed

## 📖 Next Steps

1. **Read the Main README**: Complete feature overview and technical details
2. **Explore the Architecture**: Check `docs/architecture.md` for system design
3. **Review Data Flow**: See `docs/dataflow.md` for processing pipeline
4. **Try Advanced Features**: Test GitHub PR analysis and multi-file workflows

## 💬 Need Help?

- 📋 Check the [troubleshooting section](README.md#troubleshooting) in main README
- 🤖 Review chat participant logs for workflow issues
- 📚 Consult [VS Code Chat Participant API docs](https://code.visualstudio.com/api/extension-guides/chat)
- 🐛 Report issues with detailed logs and reproduction steps

---

**Start creating professional documentation with AI!** 🚀

The extension is designed to be intuitive - upload your materials, describe your goal, and let AI handle the rest!
