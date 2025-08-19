import { ExtensionContext } from '../../types/ExtensionContext';
import { ContentStandards, ContentPattern } from '../../models/ContentPattern';
import { ContentStandardsLoader } from './ContentStandardsLoader';
import { ContentPatternApplier } from './ContentPatternApplier';
import { ContentValidator } from './ContentValidator';

/**
 * Main Content Pattern Service - coordinates pattern-related functionality
 * Single responsibility: Content pattern coordination and management
 */
export class ContentPatternService {
  private standardsLoader: ContentStandardsLoader;
  private patternApplier: ContentPatternApplier;
  private validator: ContentValidator;

  constructor(private context: ExtensionContext) {
    this.standardsLoader = new ContentStandardsLoader(context);
    this.patternApplier = new ContentPatternApplier();
    this.validator = new ContentValidator();
  }

  /**
   * Get all available content patterns
   */
  public getAvailablePatterns(): ContentPattern[] {
    return this.standardsLoader.getAvailablePatterns();
  }

  /**
   * Get content pattern by ID
   */
  public getPatternById(id: string): ContentPattern | undefined {
    return this.standardsLoader.getPatternById(id);
  }

  /**
   * Apply pattern to content generation
   */
  public applyPatternToContent(
    pattern: ContentPattern,
    content: string,
    variables: Record<string, string> = {}
  ): string {
    return this.patternApplier.applyPatternToContent(pattern, content, variables);
  }

  /**
   * Get content standards
   */
  public getContentStandards(): ContentStandards | null {
    return this.standardsLoader.getContentStandards();
  }

  /**
   * Validate content against pattern requirements
   */
  public validateContentAgainstPattern(
    content: string,
    pattern: ContentPattern
  ): {
    valid: boolean;
    missingRequired: string[];
    suggestions: string[];
  } {
    return this.validator.validateContentAgainstPattern(content, pattern);
  }
}
