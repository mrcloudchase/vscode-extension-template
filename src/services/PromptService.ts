import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext } from '../types/ExtensionContext';

/**
 * Interface for prompt metadata
 */
export interface PromptMetadata {
  id: string;
  category: string;
  name: string;
  description: string;
  variables: string[];
}

/**
 * Interface for prompt template
 */
export interface PromptTemplate {
  metadata: PromptMetadata;
  content: string;
}

/**
 * Service for managing and retrieving prompt templates
 */
export class PromptService {
  private prompts: Map<string, PromptTemplate> = new Map();
  private promptsPath: string;

  constructor(private context: ExtensionContext) {
    // Get the prompts directory path relative to the extension
    this.promptsPath = path.join(context.vscodeContext.extensionPath, 'src', 'prompts');
    this.loadAllPrompts();
  }

  /**
   * Load all prompts from the prompts directory
   */
  private loadAllPrompts(): void {
    try {
      const categories = fs.readdirSync(this.promptsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const category of categories) {
        this.loadCategoryPrompts(category);
      }

      this.context.logger.info(`Loaded ${this.prompts.size} prompts from ${categories.length} categories`);
    } catch (error) {
      this.context.logger.error('Failed to load prompts:', error);
    }
  }

  /**
   * Load prompts from a specific category
   */
  private loadCategoryPrompts(category: string): void {
    const categoryPath = path.join(this.promptsPath, category);
    
    try {
      const files = fs.readdirSync(categoryPath)
        .filter(file => file.endsWith('.md'));

      for (const file of files) {
        const promptId = `${category}/${path.basename(file, '.md')}`;
        const promptPath = path.join(categoryPath, file);
        
        try {
          const content = fs.readFileSync(promptPath, 'utf-8');
          const metadata = this.extractMetadata(promptId, category, content);
          
          this.prompts.set(promptId, {
            metadata,
            content
          });
        } catch (error) {
          this.context.logger.error(`Failed to load prompt ${promptId}:`, error);
        }
      }
    } catch (error) {
      this.context.logger.error(`Failed to load category ${category}:`, error);
    }
  }



  /**
   * Extract metadata from prompt content
   */
  private extractMetadata(id: string, category: string, content: string): PromptMetadata {
    const lines = content.split('\n');
    const titleLine = lines.find(line => line.startsWith('# '));
    const name = titleLine ? titleLine.substring(2).trim() : id;
    
    // Extract variables (placeholders like {{variable}})
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = variableRegex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return {
      id,
      category,
      name,
      description: `${category} prompt: ${name}`,
      variables
    };
  }

  /**
   * Get a prompt by ID
   */
  public getPrompt(promptId: string): PromptTemplate | undefined {
    return this.prompts.get(promptId);
  }

  /**
   * Get all prompts in a category
   */
  public getPromptsByCategory(category: string): PromptTemplate[] {
    return Array.from(this.prompts.values())
      .filter(prompt => prompt.metadata.category === category);
  }

  /**
   * Get all available categories
   */
  public getCategories(): string[] {
    const categories = new Set<string>();
    this.prompts.forEach(prompt => categories.add(prompt.metadata.category));
    return Array.from(categories);
  }

  /**
   * Get all available prompts
   */
  public getAllPrompts(): PromptTemplate[] {
    return Array.from(this.prompts.values());
  }

  /**
   * Render a prompt with variables
   * Can accept either a promptId or a template string
   */
  public renderPrompt(promptIdOrTemplate: string, variables: Record<string, string>): string {
    let template: string;
    
    // Check if it's a prompt ID (contains slash) or a template (contains {{)
    if (promptIdOrTemplate.includes('/') && !promptIdOrTemplate.includes('{{')) {
      // It's a prompt ID
      const prompt = this.getPrompt(promptIdOrTemplate);
      if (!prompt) {
        throw new Error(`Prompt not found: ${promptIdOrTemplate}`);
      }
      template = prompt.content;
    } else {
      // It's a template string
      template = promptIdOrTemplate;
    }
    
    // Replace all variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      template = template.replace(regex, value);
    }

    // Check for unreplaced variables
    const unReplacedVars = template.match(/\{\{\w+\}\}/g);
    if (unReplacedVars) {
      this.context.logger.warn(`Unreplaced variables:`, unReplacedVars);
    }

    return template;
  }

  /**
   * Validate that all required variables are provided
   */
  public validateVariables(promptId: string, variables: Record<string, string>): {
    valid: boolean;
    missing: string[];
    extra: string[];
  } {
    const prompt = this.getPrompt(promptId);
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`);
    }

    const required = new Set(prompt.metadata.variables);
    const provided = new Set(Object.keys(variables));
    
    const missing = Array.from(required).filter(v => !provided.has(v));
    const extra = Array.from(provided).filter(v => !required.has(v));

    return {
      valid: missing.length === 0,
      missing,
      extra
    };
  }

  /**
   * Get prompt metadata without loading content
   */
  public getPromptMetadata(promptId: string): PromptMetadata | undefined {
    const prompt = this.getPrompt(promptId);
    return prompt?.metadata;
  }

  /**
   * Search prompts by name or description
   */
  public searchPrompts(query: string): PromptTemplate[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.prompts.values()).filter(prompt => 
      prompt.metadata.name.toLowerCase().includes(lowerQuery) ||
      prompt.metadata.description.toLowerCase().includes(lowerQuery) ||
      prompt.metadata.category.toLowerCase().includes(lowerQuery)
    );
  }
}
