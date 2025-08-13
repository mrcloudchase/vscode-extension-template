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


import { ContentPatternService } from './ContentPatternService';
import { ContentPattern } from '../models/ContentPattern';
import { ChatParticipantService } from './ChatParticipantService';
import { CopilotOrchestrationService, CopilotWorkflowRequest, CopilotContentResult } from './CopilotOrchestrationService';

/**
 * Main service for integrating with Copilot Chat using systematic workflow
 */
export default class CopilotIntegrationService {
  private inputHandler: InputHandlerService;
  private workflowOrchestrator: WorkflowOrchestratorService;
  private patternService: ContentPatternService;
  private chatParticipant: ChatParticipantService;
  private copilotOrchestrator: CopilotOrchestrationService;
  private processedContents: ProcessedContent[] = [];

  constructor(private context: ExtensionContext) {
    this.inputHandler = new InputHandlerService(context);
    this.workflowOrchestrator = new WorkflowOrchestratorService(context, this);
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
    this.context.logger.info(`Processing ${inputs.length} input files`);
    this.processedContents = await this.inputHandler.processInputs(inputs);
    return this.processedContents;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    goal: string,
    processedContents?: ProcessedContent[],
    onStepComplete?: (step: string, result: any) => void
  ): Promise<WorkflowResult> {
    return await this.workflowOrchestrator.executeWorkflow(
      workflowId,
      goal,
      processedContents || [],
      onStepComplete
    );
  }

  /**
   * Create new content using Copilot-driven workflow  
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
}