import { ContentPattern } from '../../models/ContentPattern';

/**
 * Validates content against pattern requirements
 * Single responsibility: Content validation and compliance checking
 */
export class ContentValidator {
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
    const headings = this.extractHeadings(content);
    const missingRequired = pattern.requiredSections.filter(
      (section) =>
        !headings.some((heading) => heading.toLowerCase().includes(section.toLowerCase()))
    );

    const suggestions: string[] = [];

    if (missingRequired.length > 0) {
      suggestions.push(`Add missing required sections: ${missingRequired.join(', ')}`);
    }

    // Check terminal section placement
    const hasTerminalSection = pattern.terminalSections.some((section) =>
      headings.some((heading) => heading.toLowerCase().includes(section.toLowerCase()))
    );

    if (!hasTerminalSection) {
      suggestions.push(`Add a terminal section: ${pattern.terminalSections.join(' or ')}`);
    }

    return {
      valid: missingRequired.length === 0 && hasTerminalSection,
      missingRequired,
      suggestions,
    };
  }

  /**
   * Extract headings from markdown content
   */
  private extractHeadings(content: string): string[] {
    const headingRegex = /^#+\s+(.+)$/gm;
    const headings: string[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      headings.push(match[1]);
    }

    return headings;
  }
}
