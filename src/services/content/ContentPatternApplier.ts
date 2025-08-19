import { ContentPattern } from '../../models/ContentPattern';

/**
 * Applies content patterns to generated content
 * Single responsibility: Pattern application and content formatting
 */
export class ContentPatternApplier {
  /**
   * Apply pattern to content generation
   */
  public applyPatternToContent(
    pattern: ContentPattern,
    content: string,
    variables: Record<string, string> = {}
  ): string {
    let processedContent = content;

    // Apply pattern template if content is empty or minimal
    if (!content || content.trim().length < 100) {
      processedContent = this.generateFromTemplate(pattern, variables);
    }

    // Ensure required sections are present
    processedContent = this.ensureRequiredSections(processedContent, pattern);

    // Apply formatting guidelines
    processedContent = this.applyFormattingGuidelines(processedContent);

    return processedContent;
  }

  /**
   * Generate content from pattern template
   */
  private generateFromTemplate(pattern: ContentPattern, variables: Record<string, string>): string {
    let template = pattern.markdownTemplate;

    // Replace template variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      template = template.replace(regex, value);
    });

    return template;
  }

  /**
   * Ensure all required sections are present in content
   */
  private ensureRequiredSections(content: string, pattern: ContentPattern): string {
    const existingHeadings = this.extractHeadings(content);
    const missingRequired = pattern.requiredSections.filter(
      (section) =>
        !existingHeadings.some((heading) => heading.toLowerCase().includes(section.toLowerCase()))
    );

    if (missingRequired.length > 0) {
      // Add missing sections based on pattern order
      const sectionsToAdd = missingRequired.map(
        (section) => `\n## ${section}\n\n[Content for ${section}]\n`
      );

      // Find insertion point (before terminal sections)
      const terminalHeadingIndex = this.findTerminalSectionIndex(content, pattern.terminalSections);

      if (terminalHeadingIndex !== -1) {
        // Insert before terminal sections
        const beforeTerminal = content.substring(0, terminalHeadingIndex);
        const afterTerminal = content.substring(terminalHeadingIndex);
        return beforeTerminal + sectionsToAdd.join('') + afterTerminal;
      } else {
        // Append at end
        return content + sectionsToAdd.join('');
      }
    }

    return content;
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

  /**
   * Find index of terminal section in content
   */
  private findTerminalSectionIndex(content: string, terminalSections: string[]): number {
    for (const section of terminalSections) {
      const regex = new RegExp(`^#+\\s+${section}`, 'mi');
      const match = regex.exec(content);
      if (match) {
        return match.index;
      }
    }
    return -1;
  }

  /**
   * Apply formatting guidelines to content
   */
  private applyFormattingGuidelines(content: string): string {
    // Basic formatting improvements
    let formatted = content;

    // Ensure proper spacing around headings
    formatted = formatted.replace(/^(#+\s+.+)$/gm, '\n$1\n');

    // Clean up multiple consecutive newlines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    // Ensure final newline
    if (!formatted.endsWith('\n')) {
      formatted += '\n';
    }

    return formatted.trim() + '\n';
  }
}
