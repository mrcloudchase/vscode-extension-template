import * as vscode from 'vscode';
import { ExtensionContext } from '../types/ExtensionContext';
import { 
  InputFile, 
  ProcessedContent,
  ChatRequest, 
  ChatResponse 
} from '../models/InputModels';
import { InputHandlerService } from './InputHandlerService';



import { ContentPatternService } from './ContentPatternService';
import { ContentPattern } from '../models/ContentPattern';
import { ChatParticipantService } from './ChatParticipantService';
import { SequentialOrchestrationService } from './SequentialOrchestrationService';
import { OrchestrationResult } from '../models/OrchestrationModels';

/**
 * Main service for integrating with Copilot Chat using systematic workflow
 */
export default class CopilotIntegrationService {
  private inputHandler: InputHandlerService;
  private patternService: ContentPatternService;
  private chatParticipant: ChatParticipantService;
  private sequentialOrchestrator: SequentialOrchestrationService;
  private processedContents: ProcessedContent[] = [];

  constructor(private context: ExtensionContext) {
    this.inputHandler = new InputHandlerService(context);
    this.patternService = new ContentPatternService(context);
    this.chatParticipant = new ChatParticipantService(context);
    this.sequentialOrchestrator = new SequentialOrchestrationService(context);
    
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
  ): Promise<OrchestrationResult> {
    try {
      // Use the new sequential orchestration workflow with deterministic schemas
      return await this.sequentialOrchestrator.executeWorkflow(
        contentRequest,
        inputs,
        {
          audience: options?.audience,
          contentType: options?.contentType,
          onProgress: options?.onProgress
        }
      );
      
    } catch (error) {
      this.context.logger.error('Failed to execute sequential workflow:', error);
      return {
        success: false,
        action: 'CREATED',
        steps: {},
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
   * Get Chat Participant status for debugging
   */
  getChatParticipantStatus() {
    return this.chatParticipant.getParticipantStatus();
  }
}