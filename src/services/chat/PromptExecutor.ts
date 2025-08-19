import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ExtensionContext, WorkflowOptions } from '../../types/ExtensionContext';

/**
 * Executes prompts in a true multi-turn conversation with Copilot
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
   * Execute a single turn of the multi-turn conversation
   * This allows for true back-and-forth between chat participant and Copilot
   */
  public async executeSingleTurn(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<any> {
    // Get the active workflow state
    const workflow = (global as any).activeWorkflow;
    if (!workflow) {
      throw new Error('No active workflow found');
    }

    const { options, currentTurn, totalTurns, previousOutputs } = workflow;
    const { contentGoal, inputs, interactiveMode } = options;

    // Get the prompt for current turn
    const prompt = this.prompts.get(currentTurn);
    if (!prompt) {
      throw new Error(`No prompt found for turn ${currentTurn}`);
    }

    stream.markdown(`## 💬 Turn ${currentTurn} of ${totalTurns}: ${prompt.name}\n\n`);

    // Process inputs on first turn
    let contextForPrompt = contentGoal;
    if (currentTurn === 1 && inputs && inputs.length > 0) {
      const { InputHandlerService } = await import('../InputHandlerService');
      const inputHandler = new InputHandlerService(this.context);
      
      stream.markdown('### 📁 Processing Input Files\n\n');
      
      const inputSources = inputs.map((input: any) => ({
        id: input.id,
        name: input.name,
        type: input.type as any,
        uri: input.uri
      }));
      
      const processedInputs = await inputHandler.processInputs(inputSources);
      const inputContext = processedInputs.map(p => 
        `### ${p.source.name}\n\`\`\`\n${p.extractedContent}\n\`\`\`\n`
      ).join('\n---\n');
      
      contextForPrompt = `${contentGoal}\n\n## Input Sources:\n${inputContext}`;
      stream.markdown(`✅ Processed ${inputs.length} input(s)\n\n`);
    }

    // Get previous output for context (if not first turn)
    const previousOutput = currentTurn > 1 && previousOutputs.length > 0 
      ? previousOutputs[previousOutputs.length - 1]
      : contextForPrompt;

    // Build and send the prompt
    let promptContent = prompt.content;
    promptContent = promptContent.replace(/\{\{CONTENT_REQUEST\}\}/g, contextForPrompt);
    promptContent = promptContent.replace(/\{\{PREVIOUS_OUTPUT\}\}/g, previousOutput);

    // Send prompt to monitor if callback is set
    if (this.updateCallback) {
      this.updateCallback('copilotInput', {
        step: currentTurn,
        content: promptContent
      });
    }

    // Show what we're sending
    stream.markdown('### 📤 Sending to Copilot:\n\n');
    
    // In interactive mode, show the prompt and wait for confirmation
    if (interactiveMode) {
      stream.markdown('```markdown\n' + promptContent.substring(0, 500) + '...\n```\n\n');
      stream.markdown('**Interactive Mode**: Review the prompt above.\n\n');
      
      // Add buttons for user control
      stream.button({
        command: 'ai-content-developer.continueWorkflow',
        title: '▶️ Continue with this prompt',
      });
      
      stream.button({
        command: 'ai-content-developer.modifyPrompt',
        title: '✏️ Modify prompt',
      });
      
      stream.button({
        command: 'ai-content-developer.skipStep',
        title: '⏭️ Skip this step',
      });
      
      return { success: true, waitingForUser: true };
    }

    // Send prompt to Copilot
    stream.markdown('### 🧠 Copilot Response:\n\n');
    
    const result = await this.executeSinglePrompt(
      promptContent,
      request,
      stream,
      token,
      currentTurn
    );

    // Store the result for next turn
    workflow.previousOutputs.push(result);
    workflow.currentTurn++;

    // Check if we need to continue
    if (currentTurn < totalTurns) {
      stream.markdown('\n---\n');
      stream.markdown(`✅ **Turn ${currentTurn} Complete**\n\n`);
      
      if (!interactiveMode) {
        // Automatically trigger next turn
        stream.markdown('🔄 *Continuing to next turn...*\n\n');
        
        // Schedule the next turn - THIS IS THE KEY TO TRUE MULTI-TURN
        setTimeout(async () => {
          await vscode.commands.executeCommand('type', { 
            text: '@content-creator [WORKFLOW CONTINUE]\nContinue with turn ' + (currentTurn + 1) 
          });
          await vscode.commands.executeCommand('workbench.action.chat.submit');
        }, 1000);
      } else {
        stream.markdown('**Interactive Mode**: Ready for next turn.\n\n');
        stream.button({
          command: 'ai-content-developer.nextTurn',
          title: '➡️ Proceed to Turn ' + (currentTurn + 1),
        });
      }
    } else {
      // Workflow complete - generate final documentation
      await this.completeWorkflow(stream, contentGoal, result);
      // Clear the workflow state
      (global as any).activeWorkflow = null;
    }

    return { success: true };
  }

  /**
   * Complete the workflow and save documentation
   */
  private async completeWorkflow(
    stream: vscode.ChatResponseStream,
    contentGoal: string,
    finalContent: string
  ): Promise<void> {
    const fileName = this.generateFileName(contentGoal);
    const filePath = await this.saveDocumentation(fileName, finalContent);

    stream.markdown('\n---\n\n');
    stream.markdown('## 🎉 Workflow Complete!\n\n');
    stream.markdown(`📄 **Documentation saved to:** \`${filePath}\`\n\n`);

    // Add action buttons
    stream.button({
      command: 'vscode.open',
      arguments: [vscode.Uri.file(filePath)],
      title: '📖 Open Documentation',
    });

    stream.button({
      command: 'ai-content-developer.openWebview',
      title: '➕ Start New Workflow',
    });

    // Add follow-up suggestions
    stream.markdown('\n### 💡 Suggested Follow-ups:\n\n');
    
    stream.button({
      command: 'ai-content-developer.enhance',
      arguments: ['add-examples'],
      title: '📝 Add code examples',
    });
    
    stream.button({
      command: 'ai-content-developer.enhance',
      arguments: ['add-diagrams'],
      title: '📊 Add diagrams',
    });
  }

  /**
   * Execute a single prompt and wait for complete response
   */
  private async executeSinglePrompt(
    prompt: string,
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
    step?: number
  ): Promise<string> {
    // Use Copilot's language model
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

    this.context.logger.info(`[Turn ${step}] Sending prompt to Copilot...`);

    const chatResponse = await model[0].sendRequest(messages, {}, token);
    let result = '';

    // Stream the response
    for await (const fragment of chatResponse.text) {
      result += fragment;
      stream.markdown(fragment);
      
      // Send to monitor if callback is set
      if (this.updateCallback) {
        this.updateCallback('copilotOutput', {
          step,
          content: fragment,
          streaming: true
        });
      }
    }

    // Send complete signal to monitor
    if (this.updateCallback) {
      this.updateCallback('copilotOutput', {
        step,
        content: '',
        streaming: false
      });
    }

    this.context.logger.info(`[Turn ${step}] Response complete. Length: ${result.length} chars`);

    return result;
  }

  /**
   * DEPRECATED: Use executeSingleTurn for true multi-turn conversation
   * This method is kept for backward compatibility only
   */
  public async executeSequential(
    options: WorkflowOptions,
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<any> {
    // Set up workflow state and execute first turn
    (global as any).activeWorkflow = {
      options,
      currentTurn: 1,
      totalTurns: this.prompts.size,
      previousOutputs: [],
      startTime: Date.now()
    };
    
    return this.executeSingleTurn(request, chatContext, stream, token);
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

    const docsFolder = path.join(workspaceFolders[0].uri.fsPath, 'generated-docs');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(docsFolder)) {
      fs.mkdirSync(docsFolder, { recursive: true });
    }

    const filePath = path.join(docsFolder, fileName);
    fs.writeFileSync(filePath, content, 'utf8');

    this.context.logger.info(`Documentation saved to: ${filePath}`);
    return filePath;
  }
}