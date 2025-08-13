import * as vscode from 'vscode';
import { ExtensionContext } from '../types/ExtensionContext';
import { 
  InputFile, 
  InputType, 
  ProcessedContent, 
  ProcessingResult 
} from '../models/InputModels';
import { BaseService } from './BaseService';

/**
 * Service responsible for input type detection, routing, and orchestrating processing
 */
export class InputHandlerService {
  private services: Map<InputType, BaseService> = new Map();

  constructor(private context: ExtensionContext) {}

  /**
   * Process multiple inputs and return processed contents
   */
  async processInputs(inputs: InputFile[]): Promise<ProcessedContent[]> {
    const results: ProcessedContent[] = [];
    const errors: string[] = [];

    this.context.logger.info(`Processing ${inputs.length} inputs`);

    for (const input of inputs) {
      try {
        // Determine input type if not specified
        if (input.type === InputType.UNKNOWN || !input.type) {
          input.type = this.detectInputType(input);
        }

        this.context.logger.debug(`Processing input: ${input.name} as type: ${input.type}`);

        // Get appropriate service (lazy initialization)
        const service = await this.getServiceForType(input.type);
        
        if (!service) {
          errors.push(`No service available for input type: ${input.type}`);
          continue;
        }

        // Process the input
        const result = await service.process(input);
        
        if (result.success && result.content) {
          results.push(result.content);
          this.context.logger.info(`Successfully processed: ${input.name}`);
        } else {
          errors.push(result.error || `Failed to process: ${input.name}`);
        }
      } catch (error) {
        const errorMsg = `Error processing ${input.name}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        this.context.logger.error(errorMsg);
      }
    }

    // Show errors if any
    if (errors.length > 0) {
      const errorMessage = errors.join('\n');
      void vscode.window.showWarningMessage(`Some inputs could not be processed:\n${errorMessage}`);
    }

    return results;
  }

  /**
   * Detect input type based on file extension or URL pattern
   */
  private detectInputType(input: InputFile): InputType {
    const name = input.name.toLowerCase();
    const uri = input.uri.toLowerCase();

    // Check URLs first (before file extensions) since URLs might contain file extensions
    if (uri.includes('github.com') && uri.includes('/pull/')) {
      return InputType.GITHUB_PR;
    } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
      return InputType.URL;
    } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
      return InputType.WORD_DOC;
    } else if (name.endsWith('.pdf')) {
      return InputType.PDF;
    } else if (name.endsWith('.pptx') || name.endsWith('.ppt')) {
      return InputType.POWERPOINT;
    } else if (name.endsWith('.txt') || name.endsWith('.md')) {
      return InputType.TEXT;
    }

    return InputType.UNKNOWN;
  }

  /**
   * Get service for input type with lazy initialization
   */
  private async getServiceForType(type: InputType): Promise<BaseService | null> {
    // Check if service is already initialized
    let service = this.services.get(type);
    
    if (!service) {
      // Lazy initialize the service with dynamic imports
      try {
        switch (type) {
          case InputType.WORD_DOC:
            const { WordDocumentService } = await import('./WordDocumentService');
            service = new WordDocumentService(this.context);
            break;
          case InputType.PDF:
            const { PDFService } = await import('./PDFService');
            service = new PDFService(this.context);
            break;
          case InputType.POWERPOINT:
            const { PowerPointService } = await import('./PowerPointService');
            service = new PowerPointService(this.context);
            break;
          case InputType.GITHUB_PR:
            const { GitHubService } = await import('./GitHubService');
            service = new GitHubService(this.context);
            break;
          case InputType.URL:
            const { URLService } = await import('./URLService');
            service = new URLService(this.context);
            break;
          case InputType.TEXT:
            const { TextService } = await import('./TextService');
            service = new TextService(this.context);
            break;
          default:
            return null;
        }
        
        // Cache the service
        this.services.set(type, service);
        this.context.logger.debug(`Lazy loaded service for type: ${type}`);
      } catch (error) {
        this.context.logger.error(`Failed to initialize service for type ${type}:`, error);
        return null;
      }
    }
    
    return service || null;
  }

  /**
   * Check if a specific input type is supported
   */
  public isTypeSupported(type: InputType): boolean {
    return type !== InputType.UNKNOWN;
  }

  /**
   * Get all supported input types
   */
  public getSupportedTypes(): InputType[] {
    return [
      InputType.WORD_DOC,
      InputType.PDF,
      InputType.POWERPOINT,
      InputType.GITHUB_PR,
      InputType.URL,
      InputType.TEXT
    ];
  }

  /**
   * Validate input before processing
   */
  private validateInput(input: InputFile): void {
    if (!input.uri) {
      throw new Error('Input URI is required');
    }
    if (!input.name) {
      throw new Error('Input name is required');
    }
  }
}
