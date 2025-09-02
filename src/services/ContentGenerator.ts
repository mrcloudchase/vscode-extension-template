import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  ExtensionContext,
  ContentRequest,
  PatternSelection,
  GeneratedContent,
} from '../types/ExtensionContext';
import { InputProcessor } from './InputProcessor';

/**
 * Main content generation service using simplified 2-step workflow
 */
export class ContentGenerator {
  private inputProcessor: InputProcessor;
  private contentStandards: any;

  constructor(private context: ExtensionContext) {
    this.inputProcessor = new InputProcessor(context);
    this.loadContentStandards();
  }

  /**
   * Load content standards from JSON file
   */
  private loadContentStandards(): void {
    try {
      const standardsPath = path.join(
        this.context.vscodeContext.extensionPath,
        'content-standards.json'
      );

      if (fs.existsSync(standardsPath)) {
        const content = fs.readFileSync(standardsPath, 'utf8');
        this.contentStandards = JSON.parse(content);
        this.context.logger.info('Content standards loaded successfully');
      } else {
        this.context.logger.warn('Content standards file not found');
        this.contentStandards = { contentTypes: [] };
      }
    } catch (error) {
      this.context.logger.error('Failed to load content standards', error);
      this.contentStandards = { contentTypes: [] };
    }
  }

  /**
   * Generate content using 2-step workflow
   */
  public async generateContent(
    request: ContentRequest,
    onProgress?: (step: string, message: string) => void
  ): Promise<GeneratedContent> {
    this.context.logger.info(`Starting content generation: ${request.contentGoal}`);

    try {
      // Step 1: Process input files
      onProgress?.('processing', 'Processing input files...');
      const processedInputs = await this.inputProcessor.processInputs(request.inputs);

      // Step 2: Select pattern using Copilot
      onProgress?.('pattern', 'Selecting content pattern...');
      const patternSelection = await this.selectPattern(request, processedInputs);

      // Step 3: Generate content using Copilot
      onProgress?.('generating', 'Generating content...');
      const generatedContent = await this.generateContentWithPattern(
        request,
        processedInputs,
        patternSelection
      );

      // Step 4: Save to default location
      onProgress?.('saving', 'Saving generated content...');
      await this.saveContent(generatedContent);

      this.context.logger.info('Content generation completed successfully');
      return generatedContent;
    } catch (error) {
      this.context.logger.error('Content generation failed', error);
      throw error;
    }
  }

  /**
   * Step 1: Select appropriate content pattern
   */
  private async selectPattern(
    request: ContentRequest,
    processedInputs: string
  ): Promise<PatternSelection> {
    const prompt = this.buildPatternSelectionPrompt(request, processedInputs);
    const result = await this.callLanguageModel(prompt);

    try {
      return JSON.parse(result) as PatternSelection;
    } catch (error) {
      throw new Error(`Failed to parse pattern selection result: ${error}`);
    }
  }

  /**
   * Step 2: Generate content with selected pattern
   */
  private async generateContentWithPattern(
    request: ContentRequest,
    processedInputs: string,
    patternSelection: PatternSelection
  ): Promise<GeneratedContent> {
    const prompt = this.buildContentGenerationPrompt(request, processedInputs, patternSelection);
    const result = await this.callLanguageModel(prompt);

    try {
      return JSON.parse(result) as GeneratedContent;
    } catch (error) {
      throw new Error(`Failed to parse content generation result: ${error}`);
    }
  }

  /**
   * Build pattern selection prompt
   */
  private buildPatternSelectionPrompt(request: ContentRequest, processedInputs: string): string {
    const availablePatterns = this.contentStandards.contentTypes.map((type: any) => ({
      id: type.id,
      name: type.name,
      purpose: type.purpose,
      description: type.description,
    }));

    return `# Content Pattern Selection

## Your Role
You are a technical documentation specialist selecting the optimal content pattern for new documentation.

## Original Content Request
${request.contentGoal}

## Input Materials
${processedInputs}

## Available Content Patterns
${JSON.stringify(availablePatterns, null, 2)}

## Task
Select the most appropriate content pattern based on user intent and content requirements.

## Pattern Selection Criteria
1. **User Intent**: What is the user trying to achieve?
2. **Time Investment**: How quickly does the user need results?
3. **Content Depth**: How detailed should the content be?
4. **Audience Level**: Technical expertise of readers
5. **Learning Style**: Step-by-step vs conceptual understanding

## Required Output Format
You MUST respond with ONLY a valid JSON object in this exact format:

{
  "patternId": "string - Must match exactly one of the available pattern IDs",
  "patternName": "string - Human-readable name of the selected pattern", 
  "reasoning": "string - Detailed explanation of why this pattern best serves user intent",
  "requiredSections": ["string array - Section headings required by this pattern"],
  "audienceAlignment": "string - Description of how pattern aligns with target audience",
  "alternativePatterns": [
    {
      "patternId": "string - Alternative pattern ID",
      "reason": "string - Why this alternative was considered but not selected"
    }
  ]
}

Return ONLY the JSON object, no additional text.`;
  }

  /**
   * Build content generation prompt
   */
  private buildContentGenerationPrompt(
    request: ContentRequest,
    processedInputs: string,
    patternSelection: PatternSelection
  ): string {
    const selectedPattern = this.contentStandards.contentTypes.find(
      (type: any) => type.id === patternSelection.patternId
    );

    return `# Content Generation

## Your Role
You are a technical writer creating professional documentation following Microsoft documentation standards.

## Original Content Request
${request.contentGoal}

## Input Materials
${processedInputs}

## Selected Pattern
${JSON.stringify(patternSelection, null, 2)}

## Content Standards
${JSON.stringify(selectedPattern, null, 2)}

## Task
Generate complete, professional documentation following the specified pattern and Microsoft standards.

## Content Requirements
- Follow the exact pattern structure provided
- Include all required sections in order
- Use proper Markdown formatting
- Include code examples where appropriate
- Follow Microsoft documentation formatting standards
- Use active voice and present tense
- Include proper front matter with current date

## Required Output Format
You MUST respond with ONLY a valid JSON object in this exact format:

{
  "content": "string - Complete Markdown document with proper formatting",
  "title": "string - Clear, descriptive document title",
  "filename": "string - Suggested filename ending in .md",
  "frontMatter": {
    "title": "string - Document title for YAML front matter",
    "description": "string - Brief description for metadata",
    "author": "string - Use 'content-creator'",
    "ms.topic": "string - Topic type matching the content pattern",
    "ms.date": "string - Current date in YYYY-MM-DD format"
  },
  "metadata": {
    "wordCount": "number - Estimated word count",
    "readingTime": "number - Estimated reading time in minutes",
    "technicalLevel": "string - beginner|intermediate|advanced"
  }
}

Return ONLY the JSON object, no additional text.`;
  }

  /**
   * Call Copilot language model
   */
  private async callLanguageModel(prompt: string): Promise<string> {
    try {
      const models = await vscode.lm.selectChatModels({
        vendor: 'copilot',
        family: 'gpt-4',
      });

      if (models.length === 0) {
        throw new Error('No Copilot model available');
      }

      const messages = [vscode.LanguageModelChatMessage.User(prompt)];
      const response = await models[0].sendRequest(messages, {});

      let result = '';
      for await (const fragment of response.text) {
        result += fragment;
      }

      return result.trim();
    } catch (error) {
      throw new Error(`Language model call failed: ${error}`);
    }
  }

  /**
   * Save generated content to default location
   */
  private async saveContent(content: GeneratedContent): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace folder open');
    }

    const docsFolder = path.join(workspaceFolders[0].uri.fsPath, 'docs');

    // Create directory if it doesn't exist
    if (!fs.existsSync(docsFolder)) {
      fs.mkdirSync(docsFolder, { recursive: true });
    }

    const filePath = path.join(docsFolder, content.filename);
    fs.writeFileSync(filePath, content.content, 'utf8');

    this.context.logger.info(`Content saved to: ${filePath}`);

    // Open the generated file
    const uri = vscode.Uri.file(filePath);
    await vscode.window.showTextDocument(uri);

    return filePath;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    // Clean up if needed
  }
}
