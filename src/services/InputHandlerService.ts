import * as vscode from 'vscode';
import { ExtensionContext } from '../types/ExtensionContext';
import { InputFile, InputType, ProcessedContent, ProcessingResult } from '../models/InputModels';
import { ServiceFactory } from '../factories/ServiceFactory';
import { FILE_EXTENSIONS } from '../constants';

/**
 * Service responsible for input type detection, routing, and orchestrating processing
 */
export class InputHandlerService {
  private serviceFactory: ServiceFactory;

  constructor(private context: ExtensionContext) {
    this.serviceFactory = new ServiceFactory(context);
  }

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
        const service = await this.serviceFactory.getServiceForType(input.type);

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
    } else if (FILE_EXTENSIONS.WORD.some((ext) => name.endsWith(ext))) {
      return InputType.WORD_DOC;
    } else if (FILE_EXTENSIONS.PDF.some((ext) => name.endsWith(ext))) {
      return InputType.PDF;
    } else if (FILE_EXTENSIONS.POWERPOINT.some((ext) => name.endsWith(ext))) {
      return InputType.POWERPOINT;
    } else if (FILE_EXTENSIONS.TEXT.some((ext) => name.endsWith(ext))) {
      return InputType.TEXT;
    }

    return InputType.UNKNOWN;
  }

  /**
   * Check if a specific input type is supported
   */
  public isTypeSupported(type: InputType): boolean {
    return this.serviceFactory.isTypeSupported(type);
  }

  /**
   * Get all supported input types
   */
  public getSupportedTypes(): InputType[] {
    return this.serviceFactory.getSupportedTypes();
  }
}
