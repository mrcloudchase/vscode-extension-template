import * as vscode from 'vscode';
import { ExtensionContext } from '../types/ExtensionContext';
import { ChatRequest, ChatResponse } from '../models/InputModels';

/**
 * Service for integrating with VSCode Chat Participants (for bidirectional communication)
 */
export class ChatParticipantService {
  private participant: vscode.ChatParticipant | undefined;

  constructor(private context: ExtensionContext) {}

  /**
   * Register this extension as a Chat Participant
   */
  public registerChatParticipant(): void {
    try {
      // Check if Chat API is available (VSCode 1.90+)
      if (!vscode.chat || !vscode.chat.createChatParticipant) {
        this.context.logger.warn('Chat Participant API not available in this VSCode version');
        return;
      }

      this.participant = vscode.chat.createChatParticipant(
        'content-creator',
        this.handleChatRequest.bind(this)
      );

      this.participant.iconPath = new vscode.ThemeIcon('file-text');
      this.participant.followupProvider = {
        provideFollowups: this.provideFollowups.bind(this)
      };

      this.context.vscodeContext.subscriptions.push(this.participant);
      this.context.logger.info('Chat Participant registered successfully');

    } catch (error) {
      this.context.logger.warn('Failed to register Chat Participant:', error);
    }
  }

  /**
   * Handle chat requests to our participant
   */
  private async handleChatRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    try {
      stream.progress('Processing your request...');

      // Parse the user's request
      const userPrompt = request.prompt;
      
      if (userPrompt.toLowerCase().includes('create') || userPrompt.toLowerCase().includes('document')) {
        stream.markdown('I can help you create technical documentation! Here are some options:\n\n');
        stream.markdown('- **Upload files**: Use the webview to upload Word docs, PDFs, or other materials\n');
        stream.markdown('- **GitHub PR**: I can analyze GitHub Pull Requests\n');
        stream.markdown('- **Content patterns**: Choose from Overview, Quickstart, How-to, Tutorial, or Concept patterns\n\n');
        
        stream.button({
          command: 'vscode-webview-extension.openWebview',
          title: 'Open Content Creator',
          tooltip: 'Open the Content Creator webview'
        });

      } else if (userPrompt.toLowerCase().includes('help') || userPrompt.toLowerCase().includes('what')) {
        stream.markdown('# Content Creator Assistant\n\n');
        stream.markdown('I help create professional technical documentation using AI. Here\'s what I can do:\n\n');
        stream.markdown('## Features\n');
        stream.markdown('- 📄 **Document Processing**: Extract text from Word docs, PDFs, PowerPoint files\n');
        stream.markdown('- 🔗 **GitHub Integration**: Analyze Pull Requests and repository content\n');
        stream.markdown('- 🌐 **Web Content**: Extract content from URLs\n');
        stream.markdown('- 📋 **Content Patterns**: Professional templates (Overview, Quickstart, How-to, Tutorial, Concept)\n');
        stream.markdown('- 🎯 **Smart Placement**: AI-driven directory selection in your workspace\n\n');
        stream.markdown('## Getting Started\n');
        stream.markdown('1. Use `@content-creator create [description]` to start\n');
        stream.markdown('2. Or click the button below to open the full interface\n\n');
        
        stream.button({
          command: 'vscode-webview-extension.openWebview',
          title: 'Open Content Creator',
          tooltip: 'Open the full Content Creator interface'
        });

      } else {
        // General content creation request
        stream.markdown(`I'll help you create: "${userPrompt}"\n\n`);
        stream.markdown('To get started, I need some source materials. You can:\n\n');
        stream.markdown('- Upload documents in the webview\n');
        stream.markdown('- Provide a GitHub PR URL\n');
        stream.markdown('- Share relevant URLs\n\n');
        
        stream.button({
          command: 'vscode-webview-extension.openWebview',
          title: 'Upload Materials & Create Content',
          tooltip: 'Open webview to upload materials and create content'
        });
      }

    } catch (error) {
      stream.markdown(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Provide follow-up suggestions
   */
  private provideFollowups(
    result: vscode.ChatResult,
    context: vscode.ChatContext,
    token: vscode.CancellationToken
  ): vscode.ChatFollowup[] {
    return [
      {
        prompt: 'create a quickstart guide',
        label: '⚡ Create Quickstart',
        command: 'content-creator'
      },
      {
        prompt: 'create API documentation',
        label: '🔌 Create API Docs',
        command: 'content-creator'
      },
      {
        prompt: 'create a tutorial',
        label: '📚 Create Tutorial',
        command: 'content-creator'
      },
      {
        prompt: 'help with content patterns',
        label: '📋 Content Patterns',
        command: 'content-creator'
      }
    ];
  }

  /**
   * Send a message to Copilot Chat (improved method)
   */
  public async sendToCopilotChat(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Check if Chat API is available
      if (!vscode.chat) {
        throw new Error('Chat API not available');
      }

      // Use the current stable method to open chat
      const message = this.formatMessageForCopilot(request);
      
      // Open Copilot Chat with the formatted message
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: message
      });

      // Since we can't get direct responses from Copilot via API, 
      // we return a status message
      return {
        response: `Request sent to Copilot Chat: "${request.goal}"`,
        sources: request.processedContents?.map(content => content.source) || [],
        timestamp: new Date()
      };

    } catch (error) {
      this.context.logger.error('Failed to send to Copilot Chat:', error);
      throw error;
    }
  }

  /**
   * Format message for Copilot with context
   */
  private formatMessageForCopilot(request: ChatRequest): string {
    let message = `# Content Creation Request\n\n**Goal**: ${request.goal}\n\n`;

    if (request.processedContents && request.processedContents.length > 0) {
      message += `## Source Materials (${request.processedContents.length} items)\n\n`;
      
      request.processedContents.forEach((content, index) => {
        message += `### ${index + 1}. ${content.source} (${content.type})\n`;
        message += `**Source**: ${content.source}\n\n`;
        
        // Include a preview of the content (truncated)
        const preview = content.text.substring(0, 500);
        message += `**Content Preview**:\n\`\`\`\n${preview}${content.text.length > 500 ? '...' : ''}\n\`\`\`\n\n`;
      });
    }

    message += `## Instructions\n`;
    message += `Please help create professional technical documentation based on the goal and source materials provided above. `;
    message += `Consider using appropriate content patterns (Overview, Quickstart, How-to, Tutorial, or Concept) and `;
    message += `follow best practices for technical writing, including clear structure, proper headings, and actionable content.`;

    return message;
  }

  /**
   * Check if Chat Participant is supported
   */
  public isChatParticipantSupported(): boolean {
    return !!(vscode.chat && vscode.chat.createChatParticipant);
  }

  /**
   * Get participant status
   */
  public getParticipantStatus(): {
    supported: boolean;
    registered: boolean;
    version: string;
  } {
    return {
      supported: this.isChatParticipantSupported(),
      registered: !!this.participant,
      version: vscode.version
    };
  }
}
