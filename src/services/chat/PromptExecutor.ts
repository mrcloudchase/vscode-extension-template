import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ExtensionContext, WorkflowOptions } from '../../types/ExtensionContext';

/**
 * Executes prompts sequentially through Copilot
 */
export class PromptExecutor {
  private promptsPath: string;
  private prompts: Map<number, { name: string; content: string }> = new Map();
  private updateCallback?: (type: string, data: any) => void;

  constructor(private context: ExtensionContext) {
    this.promptsPath = path.join(
      this.context.vscodeContext.extensionPath,
      'src',
      'prompts',
      'orchestration'
    );
    this.loadPrompts();
  }

  /**
   * Set callback for real-time updates
   */
  public setUpdateCallback(callback: (type: string, data: any) => void): void {
    this.updateCallback = callback;
  }

  /**
   * Load all prompts from the orchestration directory
   */
  private loadPrompts(): void {
    try {
      const files = fs.readdirSync(this.promptsPath);
      const promptFiles = files.filter((f) => f.endsWith('.md')).sort();

      promptFiles.forEach((file) => {
        const match = file.match(/^(\d+)-(.+)\.md$/);
        if (match) {
          const order = parseInt(match[1], 10);
          const name = match[2].replace(/-/g, ' ');
          const content = fs.readFileSync(path.join(this.promptsPath, file), 'utf8');
          this.prompts.set(order, { name, content });
        }
      });

      this.context.logger.info(`Loaded ${this.prompts.size} prompts`);
    } catch (error) {
      this.context.logger.error('Failed to load prompts', error);
    }
  }

  /**
   * Execute prompts sequentially
   */
  public async executeSequential(
    options: WorkflowOptions,
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<any> {
    const { contentGoal, inputs, interactiveMode } = options;
    
    // Process inputs first if any
    let inputContext = '';
    if (inputs && inputs.length > 0) {
      const { InputHandlerService } = await import('../InputHandlerService');
      const { InputType } = await import('../../models/InputModels');
      const inputHandler = new InputHandlerService(this.context);
      
      stream.markdown('## 📁 Processing Inputs\n\n');
      
      // Convert inputs to InputSource format
      const inputSources = inputs.map(input => ({
        id: input.id,
        name: input.name,
        type: input.type as any, // Type will be handled by InputHandlerService
        uri: input.uri
      }));
      
      const processedInputs = await inputHandler.processInputs(inputSources);
      
      inputContext = processedInputs.map(p => 
        `### ${p.source.name}\n${p.extractedContent}\n`
      ).join('\n---\n');
      
      stream.markdown(`✅ Processed ${inputs.length} input(s)\n\n`);
    }
    
    // Combine content goal with input context
    const fullContext = inputContext 
      ? `${contentGoal}\n\n## Input Sources:\n${inputContext}`
      : contentGoal;
    
    let previousOutput = fullContext;
    let results: any = {};

    stream.markdown('## 🚀 Starting Sequential Workflow Execution\n\n');
    stream.markdown(`**Content Goal:** ${contentGoal}\n`);
    if (inputs.length > 0) {
      stream.markdown(`**Inputs:** ${inputs.length} source(s)\n`);
    }
    stream.markdown(`**Mode:** ${interactiveMode ? 'Interactive' : 'Automated'}\n\n`);
    stream.markdown('---\n\n');

    // Sort prompts by order and execute
    const sortedPrompts = Array.from(this.prompts.entries()).sort((a, b) => a[0] - b[0]);

    for (const [order, prompt] of sortedPrompts) {
      if (token.isCancellationRequested) {
        stream.markdown('\n⚠️ **Workflow cancelled by user**\n');
        break;
      }

      stream.markdown(`### Step ${order}: ${prompt.name}\n\n`);
      stream.progress(`Executing: ${prompt.name}...`);

      // Replace placeholders in prompt
      let promptContent = prompt.content;
      promptContent = promptContent.replace(/\{\{CONTENT_REQUEST\}\}/g, contentGoal);
      promptContent = promptContent.replace(/\{\{PREVIOUS_OUTPUT\}\}/g, previousOutput);

      // Send prompt to monitor
      if (this.updateCallback) {
        this.updateCallback('copilotInput', {
          step: order,
          content: promptContent
        });
      }

      // In interactive mode, allow user to modify the prompt
      if (interactiveMode) {
        stream.markdown('**Current Prompt:**\n');
        stream.markdown('```markdown\n' + promptContent + '\n```\n');
        
        // Create a button to continue or modify
        stream.button({
          command: 'ai-content-developer.continueWorkflow',
          title: 'Continue with this prompt',
        });
        
        stream.button({
          command: 'ai-content-developer.modifyPrompt',
          title: 'Modify prompt',
        });
        
        stream.markdown('\n**Waiting for user input...**\n\n');
        
        // Wait for user interaction (simplified for now)
        await this.waitForUserInteraction();
      }

      // Execute the prompt using Copilot
      try {
        const result = await this.executeSinglePrompt(
          promptContent,
          request,
          stream,
          token,
          order
        );

        // Store result
        results[`step${order}`] = {
          name: prompt.name,
          output: result,
        };

        // Update previous output for next prompt
        previousOutput = result;

        stream.markdown(`✅ **Completed:** ${prompt.name}\n\n`);
        stream.markdown('---\n\n');
      } catch (error) {
        stream.markdown(`❌ **Failed:** ${prompt.name}\n`);
        stream.markdown(`Error: ${error instanceof Error ? error.message : String(error)}\n\n`);
        
        if (!interactiveMode) {
          // In automated mode, stop on error
          throw error;
        }
        
        // In interactive mode, allow retry
        stream.button({
          command: 'ai-content-developer.retryStep',
          arguments: [order],
          title: 'Retry this step',
        });
        
        stream.button({
          command: 'ai-content-developer.skipStep',
          arguments: [order],
          title: 'Skip this step',
        });
      }
    }

    // Generate final documentation
    const finalContent = previousOutput;
    const fileName = this.generateFileName(contentGoal);
    const filePath = await this.saveDocumentation(fileName, finalContent);

    stream.markdown('## ✨ Workflow Complete!\n\n');
    stream.markdown(`📄 **Documentation saved to:** \`${filePath}\`\n\n`);

    // Add action buttons
    stream.button({
      command: 'vscode.open',
      arguments: [vscode.Uri.file(filePath)],
      title: 'Open Documentation',
    });

    stream.button({
      command: 'ai-content-developer.openWebview',
      title: 'Create More Content',
    });

    return {
      success: true,
      filePath,
      results,
    };
  }

  /**
   * Execute a single prompt using Copilot
   */
  private async executeSinglePrompt(
    prompt: string,
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
    step?: number
  ): Promise<string> {
    // Use Copilot's language model via the chat request
    const messages = [
      vscode.LanguageModelChatMessage.User(prompt)
    ];

    const model = await vscode.lm.selectChatModels({
      vendor: 'copilot',
      family: 'gpt-4',
    });

    if (model.length === 0) {
      throw new Error('No Copilot model available');
    }

    const chatResponse = await model[0].sendRequest(messages, {}, token);
    let result = '';

    for await (const fragment of chatResponse.text) {
      result += fragment;
      stream.markdown(fragment);
      
      // Send streaming output to monitor
      if (this.updateCallback) {
        this.updateCallback('copilotOutput', {
          step,
          content: fragment,
          streaming: true
        });
      }
    }

    // Send final complete signal
    if (this.updateCallback) {
      this.updateCallback('copilotOutput', {
        step,
        content: '',
        streaming: false
      });
    }

    return result;
  }

  /**
   * Wait for user interaction in interactive mode
   */
  private async waitForUserInteraction(): Promise<void> {
    // This is a simplified version - in production, you'd implement proper event handling
    return new Promise((resolve) => {
      setTimeout(resolve, 100); // Short delay for now
    });
  }

  /**
   * Generate a file name based on the content request
   */
  private generateFileName(contentRequest: string): string {
    const sanitized = contentRequest
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitized}-${timestamp}.md`;
  }

  /**
   * Save the generated documentation
   */
  private async saveDocumentation(fileName: string, content: string): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace folder open');
    }

    const docsPath = path.join(workspaceFolders[0].uri.fsPath, 'docs');
    
    // Create docs directory if it doesn't exist
    if (!fs.existsSync(docsPath)) {
      fs.mkdirSync(docsPath, { recursive: true });
    }

    const filePath = path.join(docsPath, fileName);
    fs.writeFileSync(filePath, content, 'utf8');
    
    return filePath;
  }
}
