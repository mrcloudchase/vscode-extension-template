import * as vscode from 'vscode';
import { ExtensionContext } from '../types/ExtensionContext';
import { InputFile } from '../models/InputModels';
import { OrchestrationResult } from '../models/OrchestrationModels';

/**
 * Automated Chat Participant for full sequential workflow automation
 * Provides multi-turn conversation experience with automatic orchestration
 */
export class AutomatedChatParticipantService {
  private participant?: vscode.ChatParticipant;
  private sequentialOrchestrator: any; // Injected dependency

  constructor(private context: ExtensionContext) {}

  /**
   * Set the orchestrator dependency
   */
  public setOrchestrator(orchestrator: any): void {
    this.sequentialOrchestrator = orchestrator;
  }

  /**
   * Register the automated chat participant
   */
  public registerChatParticipant(): void {
    try {
      if (!vscode.chat || !vscode.chat.createChatParticipant) {
        this.context.logger.warn('Chat Participant API not available');
        return;
      }

      this.participant = vscode.chat.createChatParticipant(
        'content-creator',
        this.handleAutomatedChatRequest.bind(this)
      );

      this.participant.iconPath = new vscode.ThemeIcon('file-text');

      this.context.vscodeContext.subscriptions.push(this.participant);
      this.context.logger.info('Automated Chat Participant registered successfully');

    } catch (error) {
      this.context.logger.error('Failed to register automated chat participant:', error);
    }
  }

  /**
   * Handle automated chat requests with full workflow execution
   */
  private async handleAutomatedChatRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<any> {
    try {
      const userPrompt = request.prompt.trim();
      
      if (!userPrompt || userPrompt.toLowerCase().includes('help')) {
        return this.showHelp(stream);
      }

      // Start automated workflow
      stream.markdown('🚀 **Starting Automated Content Creation Workflow**\n\n');
      stream.markdown(`**Goal**: ${userPrompt}\n\n`);

      // Execute the full automated sequential workflow
      await this.executeAutomatedWorkflow(userPrompt, stream, token);

    } catch (error) {
      stream.markdown(`❌ **Error**: ${error instanceof Error ? error.message : String(error)}\n\n`);
      this.context.logger.error('Automated chat request failed:', error);
    }
  }

  /**
   * Execute the full automated sequential workflow with live updates
   */
  private async executeAutomatedWorkflow(
    goal: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    try {
      if (!this.sequentialOrchestrator) {
        throw new Error('Sequential orchestrator not available');
      }

      // Step progress tracking
      const steps = [
        'Analyzing repository structure',
        'Selecting optimal directory',
        'Determining content strategy',
        'Choosing content pattern',
        'Generating professional content'
      ];

      let currentStep = 0;

      // Execute workflow with progress updates
      const result = await this.sequentialOrchestrator.executeWorkflow(
        goal,
        [], // No input files for chat-based requests
        {
          onProgress: (step: string, message: string) => {
            if (token.isCancellationRequested) return;
            
            currentStep++;
            stream.markdown(`### Step ${currentStep}: ${steps[currentStep - 1] || step}\n`);
            stream.markdown(`${message}\n\n`);
          }
        }
      );

      // Show final results
      await this.showWorkflowResults(result, stream);

    } catch (error) {
      stream.markdown(`❌ **Workflow failed**: ${error instanceof Error ? error.message : String(error)}\n\n`);
      stream.markdown('💡 **Tip**: Try opening the Content Creator webview for file uploads and more detailed control.\n\n');
      
      stream.button({
        command: 'vscode-webview-extension.openWebview',
        title: 'Open Content Creator Webview',
        tooltip: 'Open full interface for advanced features'
      });
    }
  }

  /**
   * Display workflow results with actionable options
   */
  private async showWorkflowResults(
    result: OrchestrationResult,
    stream: vscode.ChatResponseStream
  ): Promise<void> {
    if (result.success) {
      stream.markdown('✅ **Content Creation Complete!**\n\n');
      
      if (result.filePath) {
        stream.markdown(`📄 **Created**: \`${result.filePath}\`\n\n`);
      }

      // Show workflow decision summary
      stream.markdown('### 🎯 **Workflow Decisions**\n');
      
      if (result.steps.directorySelection?.success) {
        const data = result.steps.directorySelection.data;
        stream.markdown(`**Directory**: ${data?.selectedDirectory}\n`);
        stream.markdown(`**Reasoning**: ${data?.reasoning}\n\n`);
      }

      if (result.steps.contentStrategy?.success) {
        const data = result.steps.contentStrategy.data;
        stream.markdown(`**Action**: ${data?.action}\n`);
        stream.markdown(`**Strategy**: ${data?.reasoning}\n\n`);
      }

      if (result.steps.patternSelection?.success) {
        const data = result.steps.patternSelection.data;
        stream.markdown(`**Pattern**: ${data?.patternName}\n`);
        stream.markdown(`**Why**: ${data?.reasoning}\n\n`);
      }

      // Action buttons
      if (result.filePath) {
        stream.button({
          command: 'vscode.open',
          title: 'Open Created File',
          arguments: [vscode.Uri.file(result.filePath)]
        });
      }

      stream.button({
        command: 'vscode-webview-extension.openWebview',
        title: 'Create More Content',
        tooltip: 'Open webview for additional content creation'
      });

    } else {
      stream.markdown('❌ **Content Creation Failed**\n\n');
      stream.markdown(`**Error**: ${result.error}\n\n`);
      
      // Show partial results if available
      if (result.steps.directorySelection?.success) {
        stream.markdown('✅ Directory selection completed successfully\n');
      }
      if (result.steps.contentStrategy?.success) {
        stream.markdown('✅ Content strategy determined successfully\n');
      }
      if (result.steps.patternSelection?.success) {
        stream.markdown('✅ Content pattern selected successfully\n');
      }

      stream.markdown('\n💡 **Try again with a more specific request or use the webview for detailed control.**\n\n');
      
      stream.button({
        command: 'vscode-webview-extension.openWebview',
        title: 'Open Advanced Interface',
        tooltip: 'Use webview for file uploads and detailed configuration'
      });
    }
  }

  /**
   * Show help information
   */
  private showHelp(stream: vscode.ChatResponseStream): any {
    stream.markdown('# 🎯 **Content Creator - Automated Workflow**\n\n');
    stream.markdown('I create professional technical documentation using an automated 5-step AI workflow.\n\n');
    
    stream.markdown('## ✨ **Features**\n');
    stream.markdown('- 🤖 **Fully Automated**: No manual steps required\n');
    stream.markdown('- 📋 **Smart Decisions**: AI selects directory, strategy, and patterns\n');
    stream.markdown('- 📝 **Professional Output**: Industry-standard documentation\n');
    stream.markdown('- 🔄 **Multi-turn Conversation**: Interactive workflow with live updates\n\n');
    
    stream.markdown('## 🚀 **How to Use**\n');
    stream.markdown('Simply describe what documentation you need:\n\n');
    stream.markdown('- `@content-creator Create a quickstart guide for authentication`\n');
    stream.markdown('- `@content-creator Write an API overview for our payment system`\n');
    stream.markdown('- `@content-creator Document the deployment process`\n\n');
    
    stream.markdown('## 🔧 **Advanced Features**\n');
    stream.markdown('For file uploads and detailed control, use the full interface:\n\n');
    
    stream.button({
      command: 'vscode-webview-extension.openWebview',
      title: 'Open Content Creator Webview',
      tooltip: 'Access advanced features like file uploads'
    });

    return {};
  }

  /**
   * Check if Chat Participant API is supported
   */
  public isChatParticipantSupported(): boolean {
    return !!(vscode as any).chat && !!(vscode as any).chat.createChatParticipant;
  }

  /**
   * Get status of the automated chat participant
   */
  public getParticipantStatus(): { isSupported: boolean; isRegistered: boolean } {
    return {
      isSupported: this.isChatParticipantSupported(),
      isRegistered: !!this.participant,
    };
  }
}
