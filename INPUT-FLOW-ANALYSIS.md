# Input Flow Analysis: From Webview to Chat Participant

## 📥 What Gets Captured from the Webview

When a user submits a content request, the following data is captured:

### 1. **From the Webview Form (webview.js line 392-400)**
```javascript
{
  type: 'executeWorkflow',
  payload: {
    contentGoal: "Create API documentation for authentication module", // Text from textarea
    inputs: [
      {
        id: "generated-id-123",
        name: "auth.md",              // File name or URL
        type: "markdown",             // Type: markdown, word, pdf, url, github_pr, etc.
        uri: "file:///path/to/auth.md" // File path or URL
      },
      // ... more input files/URLs if added
    ],
    interactiveMode: false // or true if checkbox is checked
  }
}
```

### 2. **Data Structure (WorkflowOptions)**
```typescript
interface WorkflowOptions {
  contentGoal: string;        // The main documentation request
  inputs: Array<{
    id: string;               // Unique identifier
    name: string;             // Display name
    type: string;             // Input type (file type or url/github_pr)
    uri: string;              // Location of the resource
  }>;
  interactiveMode: boolean;   // Whether to pause between prompts
}
```

## 🔄 How It Flows Through the System

### Step 1: Webview → Extension Backend
```
webview.js (handleExecuteWorkflow) 
  ↓ sends message
WebviewMessageHandler (handleExecuteWorkflow)
  ↓ delegates to
InputProcessor (executeWorkflow)
```

### Step 2: Extension → Chat Participant
```
CopilotIntegrationService (executeWorkflow)
  ↓ stores options globally: (global as any).currentWorkflowOptions = options
  ↓ opens chat and types: "@content-creator [contentGoal]"
ChatRequestRouter (handleRequest)
  ↓ retrieves global options
  ↓ passes to
PromptExecutor (executeSequential)
```

## 📝 What Actually Gets Sent to Copilot

### First Prompt (Turn 1)
When the workflow starts, the first prompt sent to Copilot looks like this:

**If no input files provided:**
```markdown
# Directory Selection for Technical Documentation

## Your Role
You're a senior technical documentation specialist.

## Content Request
Create API documentation for authentication module

## Task
Use your built-in workspace tools to recursively explore...
[rest of prompt template]
```

**If input files were provided:**
The `{{CONTENT_REQUEST}}` placeholder is replaced with:
```markdown
Create API documentation for authentication module

## Input Sources:
### auth.md
[Extracted content from auth.md file]

---
### config.yaml
[Extracted content from config.yaml file]
```

### Subsequent Prompts (Turns 2-4)
Each subsequent prompt includes:
1. The original content request (with inputs if provided)
2. The complete response from the previous turn

Example for Turn 2:
```markdown
# Content Strategy Decision

## Your Role
You are a technical documentation specialist...

## Original Content Request
Create API documentation for authentication module

## Previous Analysis (Directory Selection Results)
[Complete response from Turn 1, including directory selection, reasoning, etc.]

## Task
Analyze the content request and existing documentation...
```

## 🎯 Key Points

1. **User Inputs Captured:**
   - Content goal (text description)
   - Optional file attachments (with type and URI)
   - Interactive mode preference

2. **What Copilot Sees:**
   - In chat: `@content-creator Create API documentation for authentication module`
   - In prompts: Full context including goal, input file contents, and previous responses

3. **Multi-Turn Context:**
   - Turn 1: Receives content goal + input file contents
   - Turn 2: Receives content goal + Turn 1's complete response
   - Turn 3: Receives content goal + Turn 2's complete response
   - Turn 4: Receives content goal + Turn 3's complete response

4. **Input Processing:**
   - Files are read and their content extracted (InputHandlerService)
   - URLs are fetched and content extracted
   - GitHub PRs are fetched via API
   - All extracted content becomes part of the initial context

## 📊 Example Flow

User submits:
- Goal: "Create API documentation for authentication module"
- Files: auth.js, auth.test.js
- Mode: Automated

What happens:
1. Files are processed, content extracted
2. Chat opens with: `@content-creator Create API documentation for authentication module`
3. Turn 1 prompt includes goal + file contents
4. Turn 1 response (directory selection) becomes input for Turn 2
5. Turn 2 response (content strategy) becomes input for Turn 3
6. Turn 3 response (pattern selection) becomes input for Turn 4
7. Turn 4 generates final documentation using all previous context
