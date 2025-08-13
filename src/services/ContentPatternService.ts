import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext } from '../types/ExtensionContext';
import { 
  ContentStandards, 
  ContentPattern, 
  PatternSelectionRequest, 
  PatternSelectionResult 
} from '../models/ContentPattern';
import { ChatRequest, ChatResponse } from '../models/InputModels';

/**
 * Service for managing content patterns and standards
 */
export class ContentPatternService {
  private contentStandards: ContentStandards | null = null;
  private standardsPath: string;

  constructor(private context: ExtensionContext) {
    // Path to content standards file in extension
    this.standardsPath = path.join(
      context.vscodeContext.extensionPath, 
      'src', 
      'content-standards', 
      'content_standards.json'
    );
    this.loadContentStandards();
  }

  /**
   * Load content standards from JSON file
   */
  private loadContentStandards(): void {
    try {
      if (fs.existsSync(this.standardsPath)) {
        const content = fs.readFileSync(this.standardsPath, 'utf-8');
        this.contentStandards = JSON.parse(content) as ContentStandards;
        this.context.logger.info(`Loaded content standards: ${this.contentStandards.contentTypes.length} patterns`);
      } else {
        this.context.logger.warn(`Content standards file not found: ${this.standardsPath}`);
        this.createDefaultStandards();
      }
    } catch (error) {
      this.context.logger.error('Failed to load content standards:', error);
      this.createDefaultStandards();
    }
  }

  /**
   * Create default content standards if file is not found
   */
  private createDefaultStandards(): void {
    this.contentStandards = {
      version: "1.0",
      documentPurpose: "Default content standards for technical documentation",
      contentTypes: [
        {
          name: "Technical Guide",
          id: "technical-guide",
          purpose: "Comprehensive technical documentation for developers and technical users",
          description: "In-depth technical guide covering implementation, configuration, and best practices",
          frontMatter: {
            title: "Technical guide title",
            description: "Brief description of the guide",
            author: "author-name"
          },
          requiredSections: ["Introduction", "Prerequisites", "Implementation", "Best Practices", "Related Resources"],
          sectionOrder: [
            { name: "Introduction", position: 1, required: true },
            { name: "Prerequisites", position: 2, required: true },
            { name: "Implementation", position: 3, required: true, allowMultiple: true },
            { name: "Best Practices", position: 4, required: false },
            { name: "Related Resources", position: 99, required: true, terminal: true }
          ],
          terminalSections: ["Related Resources"],
          markdownTemplate: "# {{title}}\n\n{{description}}\n\n## Prerequisites\n\n## Implementation\n\n## Best Practices\n\n## Related Resources"
        },
        {
          name: "API Documentation",
          id: "api-docs",
          purpose: "Document APIs, endpoints, and integration guides",
          description: "Comprehensive API documentation with examples and integration guides",
          frontMatter: {
            title: "API documentation title",
            description: "API overview and usage guide",
            author: "author-name"
          },
          requiredSections: ["Overview", "Authentication", "Endpoints", "Examples", "Error Handling"],
          sectionOrder: [
            { name: "Overview", position: 1, required: true },
            { name: "Authentication", position: 2, required: true },
            { name: "Endpoints", position: 3, required: true, allowMultiple: true },
            { name: "Examples", position: 4, required: true },
            { name: "Error Handling", position: 5, required: true },
            { name: "References", position: 99, required: true, terminal: true }
          ],
          terminalSections: ["References"],
          markdownTemplate: "# {{title}}\n\n{{description}}\n\n## Overview\n\n## Authentication\n\n## Endpoints\n\n## Examples\n\n## Error Handling\n\n## References"
        }
      ],
      requiredFrontMatter: [],
      coreGuidelines: [],
      customerIntent: {
        format: "As a <role>, I want <what> so that <why>.",
        location: "In front matter as comment",
        examples: []
      },
      formattingElements: [],
      commonTabGroups: [],
      seoGuidelines: {
        title: { pattern: "Clear, descriptive title", example: "API Integration Guide" },
        description: { pattern: "Brief, informative description", example: "Learn how to integrate with our API" },
        keywords: { pattern: "Include relevant keywords", example: "API, integration, authentication" },
        links: { pattern: "Descriptive link text", example: "[Integration guide](./integration.md)" }
      },
      imageGuidelines: {
        naming: {
          fileNames: "lowercase-hyphenated.png",
          folderStructure: "./media/",
          screenshotPrefix: "screenshot-",
          diagramPrefix: "diagram-"
        },
        bestPractices: [],
        syntax: "![Alt text](./media/image.png)"
      },
      codeGuidelines: {
        languages: [],
        bestPractices: []
      },
      securityGuidelines: [],
      processingInstructions: [],
      templateEnforcementRules: [],
      sectionPlacementGuidelines: {
        forUpdates: [],
        forCreation: []
      }
    };
  }

  /**
   * Get all available content patterns
   */
  public getAvailablePatterns(): ContentPattern[] {
    return this.contentStandards?.contentTypes || [];
  }

  /**
   * Get content pattern by ID
   */
  public getPatternById(id: string): ContentPattern | undefined {
    return this.contentStandards?.contentTypes.find(pattern => pattern.id === id);
  }

  /**
   * Select optimal content pattern using AI analysis
   */
  public async selectOptimalPattern(
    request: PatternSelectionRequest,
    copilotService: any
  ): Promise<PatternSelectionResult> {
    this.context.logger.info(`Selecting optimal content pattern for: ${request.goal}`);

    const availablePatterns = this.getAvailablePatterns();
    if (availablePatterns.length === 0) {
      throw new Error('No content patterns available');
    }

    // Create pattern selection prompt
    const selectionPrompt = this.createPatternSelectionPrompt(request, availablePatterns);

    // Use Copilot to analyze and select pattern
    const chatRequest: ChatRequest = {
      goal: selectionPrompt,
      inputs: [],
      processedContents: []
    };

    const response = await copilotService.sendToCopilot(chatRequest);
    
    // Parse the selection result
    return this.parsePatternSelection(response, availablePatterns);
  }

  /**
   * Create prompt for pattern selection
   */
  private createPatternSelectionPrompt(
    request: PatternSelectionRequest,
    patterns: ContentPattern[]
  ): string {
    const patternsDescription = patterns.map((pattern, index) => {
      return `**${index + 1}. ${pattern.name} (${pattern.id})**
Purpose: ${pattern.purpose}
Description: ${pattern.description}
Required Sections: ${pattern.requiredSections.join(', ')}
Best For: ${this.getPatternUseCase(pattern)}`;
    }).join('\n\n');

    return `# Content Pattern Selection for Technical Documentation

## Content Request Analysis
**Goal**: ${request.goal}
**Target Audience**: ${request.audience}
**Content Context**: ${request.contentContext}
${request.suggestedType ? `**Suggested Type**: ${request.suggestedType}` : ''}

## Available Content Patterns
${patternsDescription}

## Selection Criteria
Analyze the content request and select the most appropriate pattern based on:

1. **Content Purpose**: What is the primary goal of this documentation?
2. **Audience Needs**: Who will use this content and how?
3. **Content Complexity**: How detailed and structured should it be?
4. **Use Case Match**: Which pattern best serves the intended use case?

## Response Format
Provide your analysis in the following JSON format:

\`\`\`json
{
  "selectedPatternId": "pattern-id",
  "confidence": 0.95,
  "reasoning": "Detailed explanation of why this pattern is optimal",
  "alternatives": [
    {
      "patternId": "alternative-pattern-id",
      "confidence": 0.75,
      "reason": "Why this could also work but is less optimal"
    }
  ],
  "customizations": [
    "Specific adaptations needed for this content request"
  ]
}
\`\`\`

## Analysis Guidelines
- Consider the primary intent behind the content request
- Match the complexity level to the audience
- Think about how users will consume this content
- Consider maintenance and update requirements
- Factor in the existing content ecosystem

Select the pattern that best serves the user's needs and provides the most value.`;
  }

  /**
   * Get use case description for a pattern
   */
  private getPatternUseCase(pattern: ContentPattern): string {
    const useCases: Record<string, string> = {
      'overview': 'High-level service introductions and feature comparisons',
      'concept': 'Deep-dive explanations of how things work',
      'quickstart': 'Getting users up and running quickly (under 10 minutes)',
      'howto': 'Step-by-step task completion with options and decisions',
      'tutorial': 'Guided learning experiences with specific scenarios',
      'technical-guide': 'Comprehensive implementation and configuration guides',
      'api-docs': 'API reference, integration guides, and developer resources'
    };

    return useCases[pattern.id] || 'General technical documentation';
  }

  /**
   * Parse Copilot's pattern selection response
   */
  private parsePatternSelection(
    response: ChatResponse,
    availablePatterns: ContentPattern[]
  ): PatternSelectionResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.response.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        throw new Error('No JSON found in pattern selection response');
      }

      const parsedResponse = JSON.parse(jsonMatch[1]);
      
      // Find the selected pattern
      const selectedPattern = availablePatterns.find(p => p.id === parsedResponse.selectedPatternId);
      if (!selectedPattern) {
        throw new Error(`Selected pattern not found: ${parsedResponse.selectedPatternId}`);
      }

      // Build alternatives list
      const alternatives = (parsedResponse.alternatives || [])
        .map((alt: any) => {
          const pattern = availablePatterns.find(p => p.id === alt.patternId);
          return pattern ? {
            pattern,
            confidence: alt.confidence || 0.5,
            reason: alt.reason || 'Alternative option'
          } : null;
        })
        .filter(Boolean);

      return {
        selectedPattern,
        confidence: parsedResponse.confidence || 0.8,
        reasoning: parsedResponse.reasoning || 'Pattern selected based on content analysis',
        alternatives
      };

    } catch (error) {
      this.context.logger.error('Failed to parse pattern selection response:', error);
      
      // Fallback: return first available pattern
      return {
        selectedPattern: availablePatterns[0],
        confidence: 0.5,
        reasoning: 'Fallback selection due to parsing error',
        alternatives: []
      };
    }
  }

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
  private generateFromTemplate(
    pattern: ContentPattern,
    variables: Record<string, string>
  ): string {
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
    const missingRequired = pattern.requiredSections.filter(section => 
      !existingHeadings.some(heading => 
        heading.toLowerCase().includes(section.toLowerCase())
      )
    );

    if (missingRequired.length > 0) {
      // Add missing sections based on pattern order
      const sectionsToAdd = missingRequired.map(section => `\n## ${section}\n\n[Content for ${section}]\n`);
      
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

  /**
   * Get content standards
   */
  public getContentStandards(): ContentStandards | null {
    return this.contentStandards;
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
    const headings = this.extractHeadings(content);
    const missingRequired = pattern.requiredSections.filter(section =>
      !headings.some(heading => 
        heading.toLowerCase().includes(section.toLowerCase())
      )
    );

    const suggestions: string[] = [];
    
    if (missingRequired.length > 0) {
      suggestions.push(`Add missing required sections: ${missingRequired.join(', ')}`);
    }

    // Check terminal section placement
    const hasTerminalSection = pattern.terminalSections.some(section =>
      headings.some(heading => heading.toLowerCase().includes(section.toLowerCase()))
    );

    if (!hasTerminalSection) {
      suggestions.push(`Add a terminal section: ${pattern.terminalSections.join(' or ')}`);
    }

    return {
      valid: missingRequired.length === 0 && hasTerminalSection,
      missingRequired,
      suggestions
    };
  }
}
