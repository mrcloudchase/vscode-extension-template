# AI Content Developer - Data Flow Documentation

## Modern AI Workflow Data Flow

This document illustrates how data flows through the AI Content Developer extension from user input via modern webview to AI-generated documentation, showing the streamlined 2-step workflow with Language Model API integration.

```mermaid
graph TD
    subgraph "Modern User Interface"
        UI[Glass-morphism Webview<br/>webview.html]
        UserGoal[Content Goal<br/>"Create OAuth quickstart guide"]
        UserFiles[Multi-File Selection<br/>MD, Word, PDF, PPT, Images]
        UserURLs[URL Input<br/>https://docs.oauth.com/guide]
        
        UserGoal --> UI
        UserFiles --> UI
        UserURLs --> UI
    end

    subgraph "WebView Communication"
        UIEvents[UI Events<br/>Generate Button Click]
        MsgSend[Message Sending<br/>GENERATE_CONTENT]
        MsgReceive[Message Handling<br/>WebviewProvider]
        
        UI --> UIEvents
        UIEvents --> MsgSend
        MsgSend --> MsgReceive
    end

    subgraph "Input Processing Pipeline"
        ContentGen[ContentGenerator<br/>Main Orchestrator]
        InputProc[InputProcessor<br/>Type Router]
        TypeDetect[Type Detection<br/>Extension/URL Analysis]
        
        MsgReceive --> ContentGen
        ContentGen --> InputProc
        InputProc --> TypeDetect
    end

    subgraph "Type-Specific Handlers"
        MarkdownH[MarkdownHandler<br/>Full Content + Metadata]
        WordH[WordHandler<br/>File Info + AI Instruction]
        PDFH[PDFHandler<br/>File Info + AI Instruction]
        PowerPointH[PowerPointHandler<br/>File Info + AI Instruction]
        ImageH[ImageHandler<br/>File Info + AI Analysis]
        URLH[URLHandler<br/>URL Info + AI Fetch]
        TextH[TextHandler<br/>Full Content + Metadata]
        
        TypeDetect --> MarkdownH
        TypeDetect --> WordH
        TypeDetect --> PDFH
        TypeDetect --> PowerPointH
        TypeDetect --> ImageH
        TypeDetect --> URLH
        TypeDetect --> TextH
    end

    subgraph "AI Workflow Orchestration"
        Step1[Step 1: Pattern Selection<br/>AI Chooses Microsoft Pattern]
        Step2[Step 2: Content Generation<br/>AI Creates Documentation]
        JSONExtract[JSON Extraction<br/>Parse AI Responses]
        
        ContentGen --> Step1
        Step1 --> JSONExtract
        JSONExtract --> Step2
        Step2 --> JSONExtract
    end

    subgraph "Language Model Integration"
        LangModelAPI[VS Code Language Model<br/>Direct Copilot Access]
        PromptSend[Prompt Transmission<br/>Template-based Prompts]
        ResponseStream[Response Streaming<br/>Real-time Processing]
        
        Step1 --> PromptSend
        Step2 --> PromptSend
        PromptSend --> LangModelAPI
        LangModelAPI --> ResponseStream
        ResponseStream --> JSONExtract
    end

    subgraph "Microsoft Standards Engine"
        ContentStandards[content-standards.json<br/>Microsoft Documentation Standards]
        PatternTemplates[Pattern Templates<br/>5 Microsoft Patterns]
        FormattingRules[Formatting Rules<br/>Notes, Warnings, Code Blocks]
        
        ContentStandards --> PatternTemplates
        ContentStandards --> FormattingRules
        Step1 --> ContentStandards
        Step2 --> PatternTemplates
        Step2 --> FormattingRules
    end

    subgraph "Model Communication Monitor"
        PromptCapture[Prompt Capture<br/>Real-time Logging]
        ResponseCapture[Response Capture<br/>Complete Responses]
        MonitorCallback[Monitor Callback<br/>WebView Updates]
        
        PromptSend --> PromptCapture
        ResponseStream --> ResponseCapture
        PromptCapture --> MonitorCallback
        ResponseCapture --> MonitorCallback
        MonitorCallback --> UI
    end

    subgraph "Output Generation"
        FileGeneration[File Generation<br/>Microsoft-Standard Markdown]
        FileSave[Save to docs/<br/>Automatic File Placement]
        AutoOpen[Auto Open<br/>Display Generated Content]
        
        JSONExtract --> FileGeneration
        FileGeneration --> FileSave
        FileSave --> AutoOpen
    end

    style ContentGen fill:#e1f5fe
    style InputProc fill:#f3e5f5
    style LangModelAPI fill:#e8f5e8
    style ContentStandards fill:#fff3e0
    style JSONExtract fill:#ffebee
```

## Detailed Data Flow Steps

### 1. User Input Collection (Modern Webview Interface)
```
User Actions → UI State → Message Creation
├── File Selection (VS Code file dialog) - Multiple files, various types
├── URL Addition (Inline input) - Web pages and documentation
├── Goal Definition (Enhanced textarea) - "Create OAuth quickstart", "Document REST API"
└── GENERATE_CONTENT Message - Triggers AI workflow
```

### 2. Multi-Input Processing Pipeline
```
Raw Inputs → Type Detection → Handler Routing → Content Extraction
├── InputProcessor.detectInputType() - Analyzes file extensions and URL patterns
├── Handler Routing - Routes to appropriate type-specific handler
├── Content Extraction - Handler-specific processing with metadata
└── Formatted Context - Standardized output with rich metadata
```

### 3. AI Workflow Execution (2-Step Process)
```
Formatted Context → Pattern Selection → Content Generation → File Output
├── Step 1: Pattern Selection - AI analyzes request and selects Microsoft pattern
├── Step 2: Content Generation - AI creates documentation using pattern template
├── JSON Extraction - Robust parsing of AI responses from various formats
└── File Generation - Microsoft-standard Markdown with proper structure
```

### 4. Language Model API Integration
```
Template Prompts → Variable Substitution → AI Processing → JSON Responses
├── Pattern Selection Prompt - Optimized context with pattern options only
├── Content Generation Prompt - Full template + standards + guidelines
├── Direct API Calls - vscode.lm.selectChatModels() with Copilot
└── Response Processing - Streaming with real-time monitor capture
```

### 5. Microsoft Standards Application
```
Selected Pattern → Template Retrieval → Standards Application → Compliant Output
├── Pattern Template - Exact Microsoft markdown template structure
├── Core Guidelines - Professional writing and structure requirements
├── Formatting Elements - Microsoft-specific notes, warnings, code blocks
└── Customer Intent - Required "As a <role>, I want <what> so that <why>" format
```

### 6. Real-Time Monitoring System
```
AI Interactions → Monitor Callbacks → WebView Updates → User Visibility
├── Prompt Capture - Every request sent to Language Model API
├── Response Capture - Complete AI responses with timestamps
├── Step Tracking - Pattern-selection vs content-generation identification
└── Export Capability - JSON download for debugging and optimization
```

## Detailed Component Data Flow

### ContentGenerator Workflow
```typescript
generateContent(request: ContentRequest)
    ↓
1. processInputs(request.inputs) → InputProcessor
    ↓
2. selectPattern(request, processedInputs) → Language Model API
    ↓ (Returns: PatternSelection JSON)
3. generateContentWithPattern(request, processedInputs, pattern) → Language Model API  
    ↓ (Returns: GeneratedContent JSON)
4. saveContent(generatedContent) → File System
    ↓
5. Auto-open generated file
```

### Input Processing Flow
```typescript
InputProcessor.processInputs(inputs: InputFile[])
    ↓
For each input:
1. detectInputType(name, uri) → string
2. Route to appropriate handler
3. handler.process(uri) → ProcessedContent
4. formatProcessedInputs(results) → string
    ↓
Returns: Formatted context string with metadata
```

### Handler Processing Examples

#### Markdown Handler
```typescript
MarkdownHandler.process(uri)
    ↓
1. Read file content via VS Code File System API
2. Extract metadata (word count, headings, code blocks)
3. Return: { content: fullText, metadata: analysis }
```

#### URL Handler
```typescript
URLHandler.process(uri)
    ↓
1. Validate URL format
2. Extract domain and path information
3. Return: { content: urlInfo + aiInstruction, metadata: urlData }
```

#### Word/PDF/PowerPoint Handlers
```typescript
DocumentHandler.process(uri)
    ↓
1. Get file metadata (size, name)
2. Create AI processing instruction
3. Return: { content: fileInfo + aiInstruction, metadata: fileData }
```

## Model Communication Monitoring

### Monitor Data Capture
```typescript
ContentGenerator.callLanguageModel(prompt, step)
    ↓
1. monitorCallback('modelInput', { step, content: prompt, timestamp })
2. Send prompt to Language Model API
3. Collect streaming response
4. monitorCallback('modelOutput', { step, content: response, timestamp })
    ↓
WebviewProvider.forwardMonitorMessage() → WebView UI
```

### Monitor UI Updates
```javascript
// In webview.js
handleModelInput(payload) → Add to prompts window with timestamp
handleModelOutput(payload) → Add to responses window with timestamp
updateMessageCount() → Update counter badges
```

## Error Handling & Resilience

### JSON Response Processing
```typescript
extractJsonFromResponse(response: string)
    ↓
1. Check for markdown code blocks (```json...```)
2. Extract JSON from mixed text responses
3. Fallback to direct JSON parsing
4. Comprehensive error logging for debugging
```

### Input Processing Error Handling
```typescript
processInputs(inputs)
    ↓
For each input:
1. Try type-specific handler
2. On error: Log details + create error placeholder
3. Continue processing remaining inputs
4. Return: Partial results with error indicators
```

## Performance Characteristics

### Optimization Strategies
- **Context Reduction**: Pattern selection gets minimal context (60% token reduction)
- **Template Caching**: Content standards loaded once at startup
- **Handler Efficiency**: Type-specific processing avoids unnecessary operations
- **Streaming Responses**: Real-time display without blocking UI

### Memory Management
- **Lazy Handler Loading**: Handlers created only when needed
- **Efficient File Reading**: VS Code File System API with proper disposal
- **State Management**: Minimal webview state with VS Code persistence
- **Monitor Cleanup**: Built-in clear functionality to prevent memory buildup

---

This data flow architecture enables efficient, transparent, and robust AI-powered documentation generation while maintaining professional Microsoft standards and providing complete observability into the AI workflow.