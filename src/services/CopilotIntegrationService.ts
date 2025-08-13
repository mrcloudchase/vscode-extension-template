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
  private processedContents: ProcessedContent[] = [];

  constructor(private context: ExtensionContext) {
    this.inputHandler = new InputHandlerService(context);
    this.workflowOrchestrator = new WorkflowOrchestratorService(context, this);
    this.repositoryContext = new RepositoryContextService(context);
    this.directorySelector = new DirectorySelectionService(context);
    this.contentCreator = new ContentCreationService(context);
    this.patternService = new ContentPatternService(context);
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
  ): Promise<ContentCreationResult> {
    const progress = options?.onProgress;
    
    try {
      // Step 1: Process inputs
      progress?.('processing', 'Processing input materials...');
      const processedInputs = await this.processInputs(inputs);
      
      // Step 2: Analyze repository structure
      progress?.('analyzing', 'Analyzing repository structure...');
      const repositoryStructure = await this.repositoryContext.getRepositoryStructure();
      
      // Step 3: Select optimal directory
      progress?.('selecting', 'Selecting optimal directory placement...');
      const directorySelection = await this.directorySelector.selectOptimalDirectory(
        contentRequest,
        processedInputs,
        repositoryStructure,
        this
      );
      
      // Step 4: Get selected pattern (if specified)
      let selectedPattern: ContentPattern | undefined;
      if (options?.selectedPatternId) {
        selectedPattern = this.patternService.getPatternById(options.selectedPatternId);
        if (selectedPattern) {
          progress?.('pattern', `Using pattern: ${selectedPattern.name}`);
        }
      }

      // Step 5: Create content
      progress?.('generating', 'Generating new content...');
      const creationRequest: ContentCreationRequest = {
        goal: contentRequest,
        processedInputs,
        directorySelection,
        repositoryStructure,
        contentType: options?.contentType,
        audience: options?.audience,
        selectedPattern
      };
      
      const result = await this.contentCreator.createContent(creationRequest, this);
      
      // Step 6: Open created file
      if (result.success && result.filePath) {
        progress?.('opening', 'Opening created file...');
        await this.contentCreator.openCreatedFile(result.filePath);
      }
      
      progress?.('complete', 'Content creation completed successfully!');
      return result;
      
    } catch (error) {
      this.context.logger.error('Content creation failed:', error);
      progress?.('error', `Content creation failed: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        success: false,
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
   * Send processed content to Copilot Chat
   */
  async sendToCopilot(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Process inputs if not already processed
      if (!request.processedContents || request.processedContents.length === 0) {
        request.processedContents = await this.processInputs(request.inputs);
      }

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
      // Check if GitHub Copilot extension is installed and active
      const copilotExtension = vscode.extensions.getExtension('GitHub.copilot-chat');
      
      if (!copilotExtension) {
        this.context.logger.warn('GitHub Copilot Chat extension not found');
        return false;
      }

      if (!copilotExtension.isActive) {
        await copilotExtension.activate();
      }

      return true;
    } catch (error) {
      this.context.logger.error('Error checking Copilot availability', error);
      return false;
    }
  }

  /**
   * Invoke Copilot Chat
   */
  private async invokeCopilotChat(message: string): Promise<string> {
    try {
      // Try to use VS Code's chat API if available
      const chatAPI = (vscode as any).chat;
      
      if (chatAPI && chatAPI.sendMessage) {
        const response = await chatAPI.sendMessage({
          message,
          participant: 'copilot',
        });
        return response.text || 'No response from Copilot';
      }

      // Alternative: Open Copilot chat with pre-filled message
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        message,
      });

      return 'Message sent to Copilot Chat. Please check the chat panel for the response.';
    } catch (error) {
      throw new Error(`Failed to invoke Copilot: ${error instanceof Error ? error.message : String(error)}`);
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
