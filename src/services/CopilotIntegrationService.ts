import * as vscode from 'vscode';
import { ExtensionContext } from '../types/ExtensionContext';
import { 
  InputFile, 
  ProcessedContent, 
  ChatRequest, 
  ChatResponse 
} from '../models/InputModels';
import { InputHandlerService } from './InputHandlerService';
import { WorkflowOrchestratorService, WorkflowResult } from './WorkflowOrchestratorService';
import { RepositoryContextService, RepositoryStructure } from './RepositoryContextService';
import { DirectorySelectionService, DirectorySelection } from './DirectorySelectionService';
import { ContentCreationService, ContentCreationRequest, ContentCreationResult } from './ContentCreationService';
import { ContentPatternService } from './ContentPatternService';
import { ContentPattern } from '../models/ContentPattern';
import { ChatParticipantService } from './ChatParticipantService';
import { CopilotOrchestrationService, CopilotWorkflowRequest, CopilotContentResult } from './CopilotOrchestrationService';

/**
 * Main service for integrating with Copilot Chat
 */
export default class CopilotIntegrationService {
  private inputHandler: InputHandlerService;
  private workflowOrchestrator: WorkflowOrchestratorService;
  private repositoryContext: RepositoryContextService;
  private directorySelector: DirectorySelectionService;
  private contentCreator: ContentCreationService;
  private patternService: ContentPatternService;
  private chatParticipant: ChatParticipantService;
  private copilotOrchestrator: CopilotOrchestrationService;
  private processedContents: ProcessedContent[] = [];

  constructor(private context: ExtensionContext) {
    this.inputHandler = new InputHandlerService(context);
    this.workflowOrchestrator = new WorkflowOrchestratorService(context, this);
    this.repositoryContext = new RepositoryContextService(context);
    this.directorySelector = new DirectorySelectionService(context);
    this.contentCreator = new ContentCreationService(context);
    this.patternService = new ContentPatternService(context);
    this.chatParticipant = new ChatParticipantService(context);
    this.copilotOrchestrator = new CopilotOrchestrationService(context);
    
    // Register chat participant if supported
    this.chatParticipant.registerChatParticipant();
  }

  /**
   * Process all inputs and prepare for Copilot
   */
  async processInputs(inputs: InputFile[]): Promise<ProcessedContent[]> {
    const results = await this.inputHandler.processInputs(inputs);
    this.processedContents = results;
    return results;
  }

  /**
   * Execute a structured workflow for document creation
   */
  async executeWorkflow(
    workflowId: string,
    goal: string,
    inputs: InputFile[],
    onStepComplete?: (stepId: string, result: string) => void
  ): Promise<WorkflowResult> {
    // First process all inputs
    const processedContents = await this.processInputs(inputs);
    
    // Execute the workflow
    return await this.workflowOrchestrator.executeWorkflow(
      workflowId,
      goal,
      processedContents,
      onStepComplete
    );
  }

  /**
   * Create new content using repository-aware workflow
   */
  async createNewContent(
    contentRequest: string,
    inputs: InputFile[],
    options?: {
      audience?: string;
      contentType?: string;
      selectedPatternId?: string;
      onProgress?: (step: string, message: string) => void;
    }
  ): Promise<CopilotContentResult> {
    try {
      // Use the new Copilot-driven orchestration workflow
      const workflowRequest: CopilotWorkflowRequest = {
        goal: contentRequest,
        inputs,
        audience: options?.audience,
        contentType: options?.contentType
      };

      return await this.copilotOrchestrator.executeWorkflow(
        workflowRequest,
        options?.onProgress
      );
      
    } catch (error) {
      this.context.logger.error('Failed to execute Copilot workflow:', error);
      return {
        success: false,
        action: 'created',
        pattern: 'unknown',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get available content patterns
   */
  getAvailableContentPatterns(): ContentPattern[] {
    return this.patternService.getAvailablePatterns();
  }

  /**
   * Get content pattern by ID
   */
  getContentPatternById(id: string): ContentPattern | undefined {
    return this.patternService.getPatternById(id);
  }

  /**
   * Get available workflows
   */
  getAvailableWorkflows() {
    return this.workflowOrchestrator.getWorkflows();
  }

  /**
   * Get Chat Participant status for debugging
   */
  getChatParticipantStatus() {
    return this.chatParticipant.getParticipantStatus();
  }

  /**
   * Send processed content to Copilot Chat
   */
  async sendToCopilot(request: ChatRequest): Promise<ChatResponse> {
    this.context.logger.info(`Sending content to Copilot: ${request.goal}`);

    try {
      // Process inputs if not already processed
      if (!request.processedContents || request.processedContents.length === 0) {
        request.processedContents = await this.processInputs(request.inputs);
      }

      // First try to use the Chat Participant service if available
      if (this.chatParticipant.isChatParticipantSupported()) {
        this.context.logger.info('Using Chat Participant API');
        return await this.chatParticipant.sendToCopilotChat(request);
      }

      // Fallback to command-based approach
      this.context.logger.info('Using command-based approach');

      // Combine all text content
      const combinedContent = this.combineContents(request.processedContents);
      
      // Prepare the message for Copilot
      const copilotMessage = this.prepareCopilotMessage(request.goal, combinedContent);

      // Check if Copilot is available
      const copilotAvailable = await this.checkCopilotAvailability();
      
      if (!copilotAvailable) {
        // Fallback: Show the prepared content in output channel
        return this.fallbackResponse(copilotMessage);
      }

      // Send to Copilot Chat using VS Code API
      const response = await this.invokeCopilotChat(copilotMessage);

      return {
        response,
        sources: request.processedContents.map(c => c.source),
        timestamp: new Date(),
      };
    } catch (error) {
      this.context.logger.error('Failed to send to Copilot', error);
      throw new Error(`Failed to send to Copilot: ${error instanceof Error ? error.message : String(error)}`);
    }
  }



  /**
   * Combine all processed contents into a single text
   */
  private combineContents(contents: ProcessedContent[]): string {
    const sections: string[] = [];

    sections.push('# Combined Input Contents\n');
    sections.push(`Total sources: ${contents.length}\n`);
    sections.push('---\n');

    contents.forEach((content, index) => {
      sections.push(`\n## Source ${index + 1}: ${content.source}`);
      sections.push(`Type: ${content.type}`);
      
      if (content.metadata) {
        sections.push(`Metadata: ${JSON.stringify(content.metadata, null, 2)}`);
      }
      
      sections.push('\n### Content:');
      sections.push(content.text);
      sections.push('\n---\n');
    });

    return sections.join('\n');
  }

  /**
   * Prepare message for Copilot
   */
  private prepareCopilotMessage(goal: string, content: string): string {
    const message = `
# User Goal
${goal}

# Provided Context
${content}

Please analyze the provided content and help achieve the stated goal.
`;
    return message;
  }

  /**
   * Check if Copilot is available
   */
  private async checkCopilotAvailability(): Promise<boolean> {
    try {
      // Check if GitHub Copilot Chat extension is installed and active
      const copilotChatExtension = vscode.extensions.getExtension('GitHub.copilot-chat');
      const copilotExtension = vscode.extensions.getExtension('GitHub.copilot');
      
      if (!copilotChatExtension && !copilotExtension) {
        this.context.logger.warn('GitHub Copilot extensions not found');
        return false;
      }

      // Activate Copilot Chat if available
      if (copilotChatExtension && !copilotChatExtension.isActive) {
        await copilotChatExtension.activate();
      }

      // Activate base Copilot if available
      if (copilotExtension && !copilotExtension.isActive) {
        await copilotExtension.activate();
      }

      return true;
    } catch (error) {
      this.context.logger.error('Error checking Copilot availability', error);
      return false;
    }
  }

  /**
   * Invoke Copilot Chat using current stable API
   */
  private async invokeCopilotChat(message: string): Promise<string> {
    try {
      this.context.logger.info('Sending message to Copilot Chat...');
      
      // Use the current stable method: open chat with prompt
      // This opens the Copilot Chat panel and sends the message
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: message
      });

      // For now, we return a confirmation message since we can't directly get the response
      // In a real implementation, you might want to use Chat Participants for interactive responses
      return `Message sent to Copilot Chat: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`;
      
    } catch (error) {
      this.context.logger.error('Failed to invoke Copilot Chat', error);
      
      // Fallback: try alternative command formats
      try {
        await vscode.commands.executeCommand('workbench.action.chat.openInSidebar');
        await vscode.commands.executeCommand('workbench.action.chat.clear');
        await vscode.commands.executeCommand('workbench.action.chat.insertText', message);
        
        return `Copilot Chat opened with message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`;
      } catch (fallbackError) {
        throw new Error(`Failed to invoke Copilot Chat: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Fallback response when Copilot is not available
   */
  private fallbackResponse(message: string): ChatResponse {
    // Create output channel if not exists
    const outputChannel = vscode.window.createOutputChannel('Input Processor');
    outputChannel.clear();
    outputChannel.appendLine(message);
    outputChannel.show();

    vscode.window.showInformationMessage(
      'Copilot Chat is not available. The processed content has been shown in the Output panel.'
    );

    return {
      response: 'Content processed and displayed in Output panel. Copilot Chat is not available.',
      sources: this.processedContents.map(c => c.source),
      timestamp: new Date(),
    };
  }

  /**
   * Clear processed contents
   */
  clearProcessedContents(): void {
    this.processedContents = [];
  }

  /**
   * Get processed contents
   */
  getProcessedContents(): ProcessedContent[] {
    return [...this.processedContents];
  }
}
