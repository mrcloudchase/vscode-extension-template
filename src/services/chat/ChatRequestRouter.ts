import * as vscode from 'vscode';
import { ExtensionContext } from '../../types/ExtensionContext';
import { WorkflowContextManager } from '../WorkflowContextManager';
import { ChatHelpResponder } from './ChatHelpResponder';
import { SequentialWorkflowExecutor } from '../workflow/SequentialWorkflowExecutor';

/**
 * Routes and handles different types of chat requests
 * Single responsibility: Request parsing and routing
 */
export class ChatRequestRouter {
  private helpResponder: ChatHelpResponder;
  private workflowExecutor: SequentialWorkflowExecutor;

  constructor(
    private context: ExtensionContext,
    private contextManager: WorkflowContextManager
  ) {
    this.helpResponder = new ChatHelpResponder();
    this.workflowExecutor = new SequentialWorkflowExecutor(context, contextManager);
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
      if (userPrompt.toLowerCase().includes('help')) {
        return await this.helpResponder.sendHelpResponse(stream);
      }

      // Check if this is a context-based request (from webview)
      const contextInfo = this.contextManager.parseContextFromPrompt(userPrompt);

      if (contextInfo) {
        return await this.handleContextBasedRequest(
          contextInfo.contextId,
          contextInfo.remainingPrompt,
          request,
          stream,
          token
        );
      } else {
        return await this.handleDirectChatRequest(userPrompt, request, stream, token);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      stream.markdown(`\n❌ **Unexpected Error:** ${errorMessage}\n`);
      this.context.logger.error('Error in chat participant:', error);
      return { errorDetails: { message: errorMessage } };
    }
  }

  /**
   * Handle context-based request (from webview handoff)
   */
  private async handleContextBasedRequest(
    contextId: string,
    remainingPrompt: string,
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
    // Retrieve context
    const workflowContext = this.contextManager.retrieveContext(contextId);
    if (!workflowContext) {
      stream.markdown(
        `❌ **Context Not Found**\n\nContext ID \`${contextId}\` has expired or doesn't exist. Please submit your request again from the webview.`
      );
      return {};
    }

    // Display context information
    stream.markdown(`🔗 **Context Retrieved**\n`);
    stream.markdown(`📝 **Goal:** ${workflowContext.goal}\n`);
    stream.markdown(`📄 **Files:** ${workflowContext.processedFiles.length} processed\n`);
    stream.markdown('\n---\n\n');

    // Execute workflow with context
    const result = await this.workflowExecutor.execute(
      workflowContext.goal,
      workflowContext,
      request,
      stream,
      token
    );

    // Clean up context and provide feedback
    return this.handleWorkflowResult(result, contextId, stream);
  }

  /**
   * Handle direct chat request (user typed directly)
   */
  private async handleDirectChatRequest(
    userPrompt: string,
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
    stream.markdown('🤖 **Starting Content Creation Workflow**\n\n');
    stream.markdown('💡 *For best results with file inputs, use the webview interface first.*\n\n');

    const result = await this.workflowExecutor.execute(
      userPrompt,
      null, // No context from webview
      request,
      stream,
      token
    );

    return this.handleWorkflowResult(result, null, stream);
  }

  /**
   * Handle workflow execution result
   */
  private handleWorkflowResult(
    result: any,
    contextId: string | null,
    stream: vscode.ChatResponseStream
  ): vscode.ChatResult {
    if (result.success) {
      // Clean up context after successful processing
      if (contextId) {
        this.contextManager.removeContext(contextId);
      }

      stream.markdown(`\n✅ **Workflow Complete!**\n`);
      stream.markdown(`📄 Created: \`${result.filePath}\`\n\n`);

      stream.button({
        command: 'vscode.open',
        arguments: [vscode.Uri.file(result.filePath!)],
        title: 'Open Created File',
      });

      stream.button({
        command: 'ai-content-developer.openWebview',
        title: 'Create More Content',
      });
    } else {
      stream.markdown(`\n❌ **Workflow Failed:** ${result.error}\n`);
    }

    return {};
  }
}
