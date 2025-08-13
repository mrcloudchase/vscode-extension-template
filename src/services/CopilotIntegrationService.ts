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

import { AutomatedOrchestrationService } from './AutomatedOrchestrationService';
import { AutomatedChatParticipantService } from './AutomatedChatParticipantService';
import { OrchestrationResult } from '../models/OrchestrationModels';

/**
 * Main service for integrating with Copilot Chat using systematic workflow
 */
export default class CopilotIntegrationService {
  private inputHandler: InputHandlerService;
  private patternService: ContentPatternService;
  private automatedOrchestrator: AutomatedOrchestrationService;
  private automatedChatParticipant: AutomatedChatParticipantService;
  private processedContents: ProcessedContent[] = [];

  constructor(private context: ExtensionContext) {
    this.inputHandler = new InputHandlerService(context);
    this.patternService = new ContentPatternService(context);
    this.automatedOrchestrator = new AutomatedOrchestrationService(context);
    this.automatedChatParticipant = new AutomatedChatParticipantService(context);
    
    // Set up bidirectional dependency
    this.automatedChatParticipant.setOrchestrator(this.automatedOrchestrator);
    
    // Register automated chat participant
    this.automatedChatParticipant.registerChatParticipant();
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
   * Create new content using fully automated workflow  
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
      // Use the fully automated orchestration workflow
      return await this.automatedOrchestrator.executeWorkflow(
        contentRequest,
        inputs,
        {
          audience: options?.audience,
          contentType: options?.contentType,
          onProgress: options?.onProgress
        }
      );
      
    } catch (error) {
      this.context.logger.error('Failed to execute automated workflow:', error);
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
   * Get Automated Chat Participant status for debugging
   */
  getChatParticipantStatus() {
    return this.automatedChatParticipant.getParticipantStatus();
  }
}