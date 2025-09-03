# AI Content Developer

A modern VS Code extension that leverages GitHub Copilot to create professional technical documentation using Microsoft documentation standards.

## ✨ Features

### 🎯 **Intelligent 2-Step Workflow**
- **Pattern Selection**: AI analyzes your request to select the optimal Microsoft documentation pattern
- **Content Generation**: AI creates professional documentation using your materials and Microsoft standards

### 📁 **Multi-Input Support**
Accept various input sources to inform documentation creation:
- **Files**: Markdown, Word documents, PDFs, PowerPoint presentations, Images, Text files
- **URLs**: Web pages and online documentation  
- **Multiple inputs**: Select multiple files and add multiple URLs for comprehensive context

### 🎨 **Modern UI Experience**
- **Beautiful glass-morphism interface** with smooth animations
- **Interactive suggestion chips** for quick content ideas
- **Visual workflow preview** showing the 2-step process
- **Drag-and-drop file handling** with type detection
- **Real-time status updates** with progress indicators

### 🔍 **Model Communication Monitor**
- **Real-time observability** into LLM interactions
- **Side-by-side prompt/response windows** with timestamps
- **Copy and export functionality** for debugging and optimization
- **Step-by-step tracking** of the AI workflow

### 📋 **Microsoft Standards Compliance**
- **Built-in content standards** for professional documentation
- **Pattern-based generation** (Overview, Concept, Quickstart, How-to, Tutorial)
- **Proper front matter** and metadata generation
- **Microsoft formatting elements** (notes, warnings, code blocks)

## 🔧 Prerequisites

- **VS Code**: Version 1.102.0 or higher
- **GitHub Copilot**: Active subscription required
- **Language Model API**: Supported in VS Code 1.102.0+

## 📦 Installation

### Option 1: Install from VSIX (Recommended)
1. Download `ai-content-developer-0.0.1.vsix`
2. Open VS Code
3. Press `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
4. Type "Extensions: Install from VSIX"
5. Select the downloaded .vsix file
6. Restart VS Code

### Option 2: Development Setup
1. Clone this repository
2. Open in VS Code
3. Run `npm install`
4. Press `F5` to launch a new VS Code window with the extension loaded

## 🚀 Usage

### Quick Start
1. **Open the extension**: Press `Ctrl+Shift+P` → "AI Content Developer: Open AI Content Developer"
2. **Describe your goal**: Enter what documentation you want to create
3. **Add materials** (optional): Select files or add URLs for context
4. **Generate**: Click "Generate Documentation"
5. **View results**: Documentation is saved to `docs/` folder and opened automatically

### Example Workflow
```
User Input: "Create a quickstart guide for OAuth authentication setup"
    ↓
AI selects "Quickstart" pattern based on request
    ↓  
AI generates complete documentation with:
- Proper Microsoft front matter
- Step-by-step procedures
- Code examples
- Prerequisites and validation steps
- Next steps and related links
```

## 📊 Supported Input Types

| Type | Extensions | Processing |
|------|------------|------------|
| **Markdown** | `.md`, `.markdown` | Full content extraction + metadata |
| **Word Documents** | `.doc`, `.docx` | File info + AI extraction |
| **PDF Documents** | `.pdf` | File info + AI extraction |
| **PowerPoint** | `.ppt`, `.pptx` | File info + AI extraction |
| **Images** | `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp` | File info + AI analysis |
| **Text Files** | `.txt`, `.log`, `.config` | Full content + metadata |
| **Web URLs** | `http://`, `https://` | URL info + AI fetch |

## 🔍 Model Communication Monitor

The built-in monitor provides complete transparency into AI interactions:

- **Real-time visibility** into prompts sent to Copilot
- **Complete response capture** from the language model
- **Step identification** (pattern-selection vs content-generation)
- **Timestamps** for performance analysis
- **Export capability** for debugging and optimization

To access: Click the "👁️ Model Communication Monitor" dropdown in the interface.

## 📋 Microsoft Documentation Patterns

The extension uses official Microsoft documentation standards with 5 pattern types:

- **Overview**: High-level service/product introduction for new customers
- **Concept**: In-depth explanation of functionality fundamental to understanding
- **Quickstart**: Get users working with the technology in under 10 minutes
- **How-to Guide**: Procedural articles showing how to complete specific tasks
- **Tutorial**: Scenario-based procedures for guided learning experiences

## 🎯 Generated Content Features

All generated documentation includes:
- ✅ **Proper front matter** with metadata
- ✅ **Microsoft-standard formatting** (notes, warnings, code blocks)
- ✅ **Customer intent statements** in front matter
- ✅ **Structured sections** following pattern requirements
- ✅ **Professional tone** and technical accuracy
- ✅ **Ready-to-publish** Markdown files

## 🔧 Architecture

```
Webview UI → ContentGenerator → Pattern Selection → Content Generation → docs/ folder
     ↓              ↓                    ↓                  ↓              ↓
[User Input] → [Input Processing] → [AI Analysis] → [AI Generation] → [Save & Open]
```

### Core Components
- **ContentGenerator**: Main workflow orchestrator
- **InputProcessor**: Routes files to type-specific handlers
- **WebviewProvider**: Modern UI with monitoring capabilities
- **Handler Services**: Specialized processors for each input type

## 🚀 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **GitHub Copilot** for AI-powered content generation
- **Microsoft** for documentation standards and VS Code extensibility
- **VS Code team** for the Language Model API and extension platform

---

**Ready to create professional documentation with AI assistance? Install the extension and start generating!**