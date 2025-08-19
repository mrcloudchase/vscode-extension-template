import * as vscode from 'vscode';
import { ExtensionContext, WorkflowOptions } from '../../types/ExtensionContext';
import { ChatHelpResponder } from './ChatHelpResponder';
import { PromptExecutor } from './PromptExecutor';

/**
 * Routes and handles different types of chat requests
 * Single responsibility: Request parsing and routing
 */
export class ChatRequestRouter {
  private helpResponder: ChatHelpResponder;
  private promptExecutor: PromptExecutor;
  private updateCallback?: (type: string, data: any) => void;

  constructor(private context: ExtensionContext) {
    this.helpResponder = new ChatHelpResponder();
    this.promptExecutor = new PromptExecutor(context);
  }

  /**
   * Set callback for real-time updates to webview
   */
  public setUpdateCallback(callback: (type: string, data: any) => void): void {
    this.updateCallback = callback;
    this.promptExecutor.setUpdateCallback(callback);
  }

  /**
   * Handle incoming chat requests and route to appropriate handler
   */
  public async handleRequest(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
    this.context.logger.info(`Chat Participant received request: ${request.prompt}`);

    try {
      const userPrompt = request.prompt.trim();

      // Handle help requests
      if (userPrompt.toLowerCase() === 'help' || userPrompt.toLowerCase() === '/help') {
        return await this.helpResponder.sendHelpResponse(stream);
      }

      // Check if this is a workflow start or continuation
      const isWorkflowStart = userPrompt.includes('[WORKFLOW START]');
      const isWorkflowContinue = userPrompt.includes('[WORKFLOW CONTINUE]');
      
      // Check for workflow options stored globally (from webview)
      const workflowOptions = (global as any).currentWorkflowOptions as WorkflowOptions | undefined;
      
      if (workflowOptions || isWorkflowStart) {
        // This is the start of a new workflow
        if (workflowOptions) {
          // Store in global state for persistence across turns
          (global as any).activeWorkflow = {
            options: workflowOptions,
            currentTurn: 1,
            totalTurns: 4,
            previousOutputs: [],
            startTime: Date.now()
          };
          // Clear the initial options
          (global as any).currentWorkflowOptions = undefined;
        }
        
        // Execute the current turn
        const result = await this.promptExecutor.executeSingleTurn(
          request,
          chatContext,
          stream,
          token
        );
        
        return this.handleWorkflowResult(result, stream);
      } else if (isWorkflowContinue) {
        // This is a continuation of an existing workflow
        const result = await this.promptExecutor.executeSingleTurn(
          request,
          chatContext,
          stream,
          token
        );
        
        return this.handleWorkflowResult(result, stream);
      } else {
        // Direct chat request without workflow markers
        // Set up as a simple single-prompt workflow
        (global as any).activeWorkflow = {
          options: {
            contentGoal: userPrompt,
            inputs: [],
            interactiveMode: false
          },
          currentTurn: 1,
          totalTurns: 4,
          previousOutputs: [],
          startTime: Date.now()
        };
        
        const result = await this.promptExecutor.executeSingleTurn(
          request,
          chatContext,
          stream,
          token
        );
        
        return this.handleWorkflowResult(result, stream);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      stream.markdown(`\n❌ **Unexpected Error:** ${errorMessage}\n`);
      this.context.logger.error('Error in chat participant:', error);
      return { errorDetails: { message: errorMessage } };
    }
  }

  /**
   * Handle workflow execution result
   */
  private handleWorkflowResult(
    result: any,
    stream: vscode.ChatResponseStream
  ): vscode.ChatResult {
    if (!result.success && result.error) {
      stream.markdown(`\n❌ **Workflow Failed:** ${result.error}\n`);
    }
    
    // Success message is already handled by PromptExecutor
    return {};
  }
}
