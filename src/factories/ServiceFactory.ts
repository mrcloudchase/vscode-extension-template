import { ExtensionContext } from '../types/ExtensionContext';
import { InputType } from '../models/InputModels';
import { BaseService } from '../services/BaseService';
import {
  WordDocumentService,
  PDFService,
  PowerPointService,
  TextService,
  URLService,
  GitHubService,
} from '../services';

/**
 * Factory for creating file processing services
 * Implements lazy loading and service caching
 */
export class ServiceFactory {
  private serviceCache = new Map<InputType, BaseService>();

  constructor(private context: ExtensionContext) {}

  /**
   * Get service for input type with lazy initialization
   */
  public async getServiceForType(type: InputType): Promise<BaseService | undefined> {
    // Check cache first
    let service = this.serviceCache.get(type);

    if (!service) {
      // Create service based on type
      service = this.createService(type);

      if (service) {
        // Cache the service
        this.serviceCache.set(type, service);
        this.context.logger.debug(`Created and cached service for type: ${type}`);
      }
    }

    return service;
  }

  /**
   * Create service instance for the given type
   */
  private createService(type: InputType): BaseService | undefined {
    try {
      switch (type) {
        case InputType.WORD_DOC:
          return new WordDocumentService(this.context);
        case InputType.PDF:
          return new PDFService(this.context);
        case InputType.POWERPOINT:
          return new PowerPointService(this.context);
        case InputType.GITHUB_PR:
          return new GitHubService(this.context);
        case InputType.URL:
          return new URLService(this.context);
        case InputType.TEXT:
          return new TextService(this.context);
        default:
          return undefined;
      }
    } catch (error) {
      this.context.logger.error(`Failed to create service for type ${type}:`, error);
      return undefined;
    }
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
      InputType.TEXT,
    ];
  }

  /**
   * Clear service cache (useful for testing)
   */
  public clearCache(): void {
    this.serviceCache.clear();
  }
}
