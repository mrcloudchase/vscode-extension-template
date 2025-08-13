import { ExtensionContext } from '../types/ExtensionContext';
import { ProcessingResult, InputFile } from '../models/InputModels';

/**
 * Base service class for all services
 */
export abstract class BaseService {
  constructor(protected context: ExtensionContext) {}

  /**
   * Process an input file and extract text content
   */
  abstract process(input: InputFile): Promise<ProcessingResult>;



  /**
   * Validate input before processing
   */
  protected validateInput(input: InputFile): void {
    if (!input.uri) {
      throw new Error('Input URI is required');
    }
    if (!input.name) {
      throw new Error('Input name is required');
    }
  }

  /**
   * Convert content to UTF-8
   */
  protected ensureUtf8(content: string | Buffer): string {
    if (Buffer.isBuffer(content)) {
      return content.toString('utf-8');
    }
    return content;
  }

  /**
   * Log debug information
   */
  protected log(message: string, ...args: any[]): void {
    this.context.logger.debug(`[${this.constructor.name}] ${message}`, ...args);
  }

  /**
   * Log error information
   */
  protected logError(message: string, error?: any): void {
    this.context.logger.error(`[${this.constructor.name}] ${message}`, error);
  }
}
