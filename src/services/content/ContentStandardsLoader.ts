import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext } from '../../types/ExtensionContext';
import { ContentStandards, ContentPattern } from '../../models/ContentPattern';

/**
 * Loads and manages content standards from JSON configuration
 * Single responsibility: Content standards file loading and management
 */
export class ContentStandardsLoader {
  private contentStandards: ContentStandards | null = null;
  private standardsPath: string;

  constructor(private context: ExtensionContext) {
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
        this.context.logger.info(
          `Loaded content standards: ${this.contentStandards.contentTypes.length} patterns`
        );
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
      version: '1.0',
      documentPurpose: 'Default content standards for technical documentation',
      contentTypes: [
        {
          name: 'Technical Guide',
          id: 'technical-guide',
          purpose: 'Comprehensive technical documentation for developers and technical users',
          description:
            'In-depth technical guide covering implementation, configuration, and best practices',
          frontMatter: {
            title: 'Technical guide title',
            description: 'Brief description of the guide',
            author: 'author-name',
          },
          requiredSections: [
            'Introduction',
            'Prerequisites',
            'Implementation',
            'Best Practices',
            'Related Resources',
          ],
          sectionOrder: [
            { name: 'Introduction', position: 1, required: true },
            { name: 'Prerequisites', position: 2, required: true },
            { name: 'Implementation', position: 3, required: true, allowMultiple: true },
            { name: 'Best Practices', position: 4, required: false },
            { name: 'Related Resources', position: 99, required: true, terminal: true },
          ],
          terminalSections: ['Related Resources'],
          markdownTemplate:
            '# {{title}}\n\n{{description}}\n\n## Prerequisites\n\n## Implementation\n\n## Best Practices\n\n## Related Resources',
        },
      ],
      requiredFrontMatter: [],
      coreGuidelines: [],
      customerIntent: {
        format: 'As a <role>, I want <what> so that <why>.',
        location: 'In front matter as comment',
        examples: [],
      },
      formattingElements: [],
      commonTabGroups: [],
      seoGuidelines: {
        title: { pattern: 'Clear, descriptive title', example: 'API Integration Guide' },
        description: {
          pattern: 'Brief, informative description',
          example: 'Learn how to integrate with our API',
        },
        keywords: {
          pattern: 'Include relevant keywords',
          example: 'API, integration, authentication',
        },
        links: {
          pattern: 'Descriptive link text',
          example: '[Integration guide](./integration.md)',
        },
      },
      imageGuidelines: {
        naming: {
          fileNames: 'lowercase-hyphenated.png',
          folderStructure: './media/',
          screenshotPrefix: 'screenshot-',
          diagramPrefix: 'diagram-',
        },
        bestPractices: [],
        syntax: '![Alt text](./media/image.png)',
      },
      codeGuidelines: {
        languages: [],
        bestPractices: [],
      },
      securityGuidelines: [],
      processingInstructions: [],
      templateEnforcementRules: [],
      sectionPlacementGuidelines: {
        forUpdates: [],
        forCreation: [],
      },
    };
  }

  /**
   * Get loaded content standards
   */
  public getContentStandards(): ContentStandards | null {
    return this.contentStandards;
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
    return this.contentStandards?.contentTypes.find((pattern) => pattern.id === id);
  }
}
