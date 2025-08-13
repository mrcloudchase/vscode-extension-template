# VSCode WebView Extension - Architecture Overview

## System Architecture

This extension implements a sophisticated document processing and technical writing workflow system with clear separation of concerns and modular design.

```mermaid
graph TB
    subgraph "VS Code Environment"
        VSCode[VS Code IDE]
        ExtCtx[Extension Context]
        VSCode --> ExtCtx
    end

    subgraph "Extension Core"
        Ext[Extension.ts<br/>Entry Point]
        ExtCtx --> Ext
    end

    subgraph "Command Management"
        CmdMgr[CommandManager<br/>Command Registration]
        Ext --> CmdMgr
    end

    subgraph "Configuration & Utilities"
        Config[ConfigurationManager<br/>Settings Management]
        Logger[Logger<br/>Logging System]
        ExtCtx --> Config
        ExtCtx --> Logger
    end

    subgraph "Presentation Layer"
        WebView[WebviewProvider<br/>UI Management]
        HTML[webview.html<br/>User Interface]
        CSS[webview.css<br/>Styling]
        JS[webview.js<br/>Client Logic]
        
        CmdMgr --> WebView
        WebView --> HTML
        HTML --> CSS
        HTML --> JS
    end

    subgraph "Core Services Layer"
        CopilotSvc[CopilotIntegrationService<br/>Main Orchestrator]
        InputHandler[InputHandlerService<br/>Input Routing & Type Detection]
        WorkflowOrch[WorkflowOrchestratorService<br/>Workflow Execution]
        PromptSvc[PromptService<br/>Template Management]
        
        WebView --> CopilotSvc
        CopilotSvc --> InputHandler
        CopilotSvc --> WorkflowOrch
        WorkflowOrch --> PromptSvc
    end

    subgraph "File Processing Services"
        BaseSvc[BaseService<br/>Abstract Base Class]
        WordSvc[WordDocumentService<br/>.docx, .doc Processing]
        PDFSvc[PDFService<br/>.pdf Processing]
        PPTSvc[PowerPointService<br/>.pptx, .ppt Processing]
        TextSvc[TextService<br/>.txt, .md Processing]
        URLSvc[URLService<br/>Web Content Fetching]
        GitHubSvc[GitHubService<br/>GitHub PR Processing]
        
        InputHandler --> BaseSvc
        BaseSvc --> WordSvc
        BaseSvc --> PDFSvc
        BaseSvc --> PPTSvc
        BaseSvc --> TextSvc
        BaseSvc --> URLSvc
        BaseSvc --> GitHubSvc
    end

    subgraph "Data Models"
        Models[InputModels.ts<br/>Data Structures]
        Types[ExtensionContext.ts<br/>Type Definitions]
        
        CopilotSvc --> Models
        WorkflowOrch --> Models
        InputHandler --> Models
        WebView --> Types
    end

    subgraph "Prompts Library"
        TechWriting[technical-writing/<br/>Content Analysis<br/>Outline Creation<br/>Section Writing]
        Validation[validation/<br/>Accuracy Review<br/>Quality Assurance]
        Formatting[formatting/<br/>Document Finalization<br/>Style Application]
        
        PromptSvc --> TechWriting
        PromptSvc --> Validation
        PromptSvc --> Formatting
    end

    subgraph "External Services"
        CopilotAPI[Copilot Chat API<br/>AI Processing]
        GitHub[GitHub API<br/>PR Data]
        WebAPIs[Web APIs<br/>Content Fetching]
        
        CopilotSvc --> CopilotAPI
        GitHubSvc --> GitHub
        URLSvc --> WebAPIs
    end

    style CopilotSvc fill:#e1f5fe
    style WorkflowOrch fill:#f3e5f5
    style PromptSvc fill:#e8f5e8
    style InputHandler fill:#fff3e0
    style WebView fill:#ffebee
```

## Architecture Principles

### 1. **Separation of Concerns**
- **Presentation Layer**: WebView handles UI and user interactions
- **Service Layer**: Business logic separated into focused services
- **Data Layer**: Clear data models and type definitions

### 2. **Modular Design**
- Each service has a single responsibility
- Services are loosely coupled and highly cohesive
- Easy to test, maintain, and extend

### 3. **Lazy Loading**
- Services are instantiated only when needed
- Improves extension activation performance
- Reduces memory footprint

### 4. **Template-Based Workflows**
- Prompts are externalized into template files
- Workflows are configurable and reusable
- Easy to modify without code changes

## Key Components

### Core Services

| Service | Responsibility | Key Features |
|---------|---------------|--------------|
| `CopilotIntegrationService` | Main orchestrator for Copilot interactions | Workflow execution, content combination |
| `InputHandlerService` | Input type detection and routing | Dynamic service loading, type inference |
| `WorkflowOrchestratorService` | Deterministic workflow execution | Step management, dependency resolution |
| `PromptService` | Template management and rendering | Variable substitution, metadata extraction |

### File Processing Services

| Service | File Types | Key Features |
|---------|------------|--------------|
| `WordDocumentService` | .docx, .doc | mammoth.js integration, text extraction |
| `PDFService` | .pdf | pdf-parse integration, content extraction |
| `PowerPointService` | .pptx, .ppt | XML parsing, slide content extraction |
| `TextService` | .txt, .md | UTF-8 processing, markdown support |
| `URLService` | HTTP/HTTPS URLs | Web scraping, content fetching |
| `GitHubService` | GitHub PRs | API integration, PR data extraction |

### Prompts Library Structure

```
src/prompts/
├── technical-writing/
│   ├── analyze-content.md
│   ├── create-outline.md
│   └── write-section.md
├── validation/
│   └── review-accuracy.md
└── formatting/
    └── finalize-document.md
```

## Extension Lifecycle

1. **Activation**: Extension activates on command execution
2. **Initialization**: Services are registered and configured
3. **UI Creation**: WebView panel is created when requested
4. **User Interaction**: Files are selected and goals are defined
5. **Processing**: Workflow execution begins
6. **Output**: Final document is generated and displayed

## Design Patterns Used

- **Service Locator**: Central service registry
- **Template Method**: Base service class with common behavior
- **Strategy Pattern**: Different processing strategies for file types
- **Observer Pattern**: Progress callbacks for workflow steps
- **Factory Pattern**: Dynamic service instantiation
- **Command Pattern**: VS Code command handling

## Error Handling Strategy

- **Graceful Degradation**: Failed steps don't break entire workflow
- **Comprehensive Logging**: All errors are logged with context
- **User Feedback**: Clear error messages in the UI
- **Recovery Options**: Users can retry failed operations

## Performance Considerations

- **Lazy Loading**: Services loaded on demand
- **Streaming Processing**: Large files processed in chunks
- **Caching**: Processed content cached for reuse
- **Timeout Handling**: Network requests have appropriate timeouts
- **Memory Management**: Buffers released after processing
