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

      // Check for workflow options stored globally (from webview)
      const workflowOptions = (global as any).currentWorkflowOptions as WorkflowOptions | undefined;
      
      if (workflowOptions) {
        // Clear the global options after retrieving
        (global as any).currentWorkflowOptions = undefined;
        
        // Execute workflow with options from webview
        const result = await this.promptExecutor.executeSequential(
          workflowOptions,
          request,
          stream,
          token
        );
        
        return this.handleWorkflowResult(result, stream);
      } else {
        // Direct chat request - use the prompt as the content goal
        const options: WorkflowOptions = {
          contentGoal: userPrompt,
          inputs: [], // No inputs for direct chat requests
          interactiveMode: false, // Default to automated mode for direct requests
        };
        
        const result = await this.promptExecutor.executeSequential(
          options,
          request,
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
