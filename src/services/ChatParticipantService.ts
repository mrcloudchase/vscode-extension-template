import * as vscode from 'vscode';
import { ExtensionContext } from '../types/ExtensionContext';
import { PromptService } from './PromptService';
import { InputHandlerService } from './InputHandlerService';
import { ContentPatternService } from './ContentPatternService';
import { 
  DirectorySelectionSchema, 
  ContentStrategySchema, 
  PatternSelectionSchema, 
  ContentGenerationSchema,
  OrchestrationResult
} from '../models/OrchestrationModels';
import * as fs from 'fs/promises';
import * as path from 'path';

interface RepositoryStructure {
  rootPath: string;
  structure: DirectoryNode[];
  documentationDirectories: string[];
  configFiles: string[];
  markdownFiles: string[];
  totalFiles: number;
}

interface DirectoryNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DirectoryNode[];
  size?: number;
}

/**
 * Chat Participant Service using VS Code's official Chat Participant API
 * Implements sequential workflow with request.model.sendRequest()
 */
export class ChatParticipantService {
  private participant: vscode.ChatParticipant | undefined;
  private promptService: PromptService;
  private inputHandler: InputHandlerService;
  private patternService: ContentPatternService;

  constructor(private context: ExtensionContext) {
    this.promptService = new PromptService(context);
    this.inputHandler = new InputHandlerService(context);
    this.patternService = new ContentPatternService(context);
  }

  /**
   * Register the chat participant using VS Code's official API
   */
  public registerChatParticipant(): void {
    try {
      if (!vscode.chat || !vscode.chat.createChatParticipant) {
        this.context.logger.warn('Chat Participant API not available in this VS Code version');
        return;
      }

      this.participant = vscode.chat.createChatParticipant(
        'vscode-webview-extension.content-creator',
        this.handleChatRequest.bind(this)
      );

      this.participant.iconPath = new vscode.ThemeIcon('file-text');
      
      this.context.vscodeContext.subscriptions.push(this.participant);
      this.context.logger.info('Chat Participant registered successfully');

    } catch (error) {
      this.context.logger.error('Failed to register chat participant:', error);
    }
  }

  /**
   * Handle chat requests using the sequential workflow with Language Model API
   */
  private async handleChatRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
    
    this.context.logger.info(`Chat Participant received request: ${request.prompt}`);

    try {
      // Parse the user's request
      const userPrompt = request.prompt.trim();
      
      if (userPrompt.toLowerCase().includes('help')) {
        await this.sendHelpResponse(stream);
        return {};
      }

      // Start the sequential workflow
      stream.markdown('🤖 **Starting Content Creation Workflow**\n\n');
      
      const result = await this.executeSequentialWorkflow(
        userPrompt,
        request,
        stream,
        token
      );

      if (result.success) {
        stream.markdown(`\n✅ **Workflow Complete!**\n`);
        stream.markdown(`📄 Created: \`${result.filePath}\`\n\n`);
        
        stream.button({
          command: 'vscode.open',
          arguments: [vscode.Uri.file(result.filePath!)],
          title: 'Open Created File'
        });
        
        stream.button({
          command: 'vscode-webview-extension.openWebview',
          title: 'Create More Content'
        });
      } else {
        stream.markdown(`\n❌ **Workflow Failed:** ${result.error}\n`);
      }

      return {};

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      stream.markdown(`\n❌ **Unexpected Error:** ${errorMessage}\n`);
      this.context.logger.error('Error in chat participant:', error);
      return { errorDetails: { message: errorMessage } };
    }
  }

  /**
   * Execute the sequential workflow using Language Model API
   */
  private async executeSequentialWorkflow(
    contentRequest: string,
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<OrchestrationResult> {
    
    try {
      // Step 1: Analyze Repository Structure
      stream.progress('🔍 Analyzing repository structure...');
      const repoStructure = await this.getRepositoryStructure();
      
      // Step 2: Directory Selection
      stream.progress('📁 Selecting optimal directory...');
      const directoryData = await this.selectDirectory(
        contentRequest,
        repoStructure,
        request,
        token
      );
      
      stream.markdown(`📁 **Selected Directory:** \`${directoryData.selectedDirectory}\`\n`);
      stream.markdown(`💡 **Reasoning:** ${directoryData.reasoning}\n\n`);

      // Step 3: Read Directory Contents
      const existingContent = await this.readDirectoryContents(directoryData.selectedDirectory);
      
      // Step 4: Content Strategy
      stream.progress('🎯 Determining content strategy...');
      const strategyData = await this.determineStrategy(
        contentRequest,
        directoryData,
        existingContent,
        request,
        token
      );
      
      stream.markdown(`📋 **Strategy:** ${strategyData.action}\n`);
      stream.markdown(`💭 **Reasoning:** ${strategyData.reasoning}\n\n`);

      let result: OrchestrationResult;

      if (strategyData.action === 'CREATE') {
        // Step 5: Pattern Selection
        stream.progress('🎨 Selecting content pattern...');
        const patternData = await this.selectPattern(
          contentRequest,
          strategyData,
          request,
          token
        );
        
        stream.markdown(`🎨 **Content Pattern:** ${patternData.patternName}\n`);
        stream.markdown(`📝 **Pattern Purpose:** ${patternData.reasoning}\n\n`);

        // Step 6: Content Generation
        stream.progress('✍️ Generating new content...');
        result = await this.generateContent(
          contentRequest,
          directoryData,
          strategyData,
          patternData,
          request,
          stream,
          token
        );
      } else {
        // Step 6: Content Update
        stream.progress('📝 Updating existing content...');
        result = await this.updateContent(
          contentRequest,
          directoryData,
          strategyData,
          existingContent,
          request,
          stream,
          token
        );
      }

      return result;

    } catch (error) {
      this.context.logger.error('Sequential workflow failed:', error);
      return {
        success: false,
        action: 'CREATED',
        steps: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Step 1: Directory Selection using Language Model
   */
  private async selectDirectory(
    contentRequest: string,
    repoStructure: RepositoryStructure,
    request: vscode.ChatRequest,
    token: vscode.CancellationToken
  ): Promise<DirectorySelectionSchema> {
    
    const prompt = this.promptService.renderPrompt('orchestration/01-directory-selection', {
      repositoryStructure: JSON.stringify(repoStructure, null, 2),
      contentRequest: contentRequest,
      workspaceName: path.basename(repoStructure.rootPath)
    });

    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const response = await request.model.sendRequest(messages, {}, token);
    
    let responseText = '';
    for await (const fragment of response.text) {
      responseText += fragment;
    }

    return this.extractJSON<DirectorySelectionSchema>(responseText);
  }

  /**
   * Step 2: Content Strategy using Language Model
   */
  private async determineStrategy(
    contentRequest: string,
    directoryData: DirectorySelectionSchema,
    existingContent: string[],
    request: vscode.ChatRequest,
    token: vscode.CancellationToken
  ): Promise<ContentStrategySchema> {
    
    const prompt = this.promptService.renderPrompt('orchestration/02-content-strategy', {
      contentRequest: contentRequest,
      selectedDirectory: directoryData.selectedDirectory,
      existingFiles: JSON.stringify(existingContent),
      directoryPurpose: directoryData.directoryPurpose
    });

    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const response = await request.model.sendRequest(messages, {}, token);
    
    let responseText = '';
    for await (const fragment of response.text) {
      responseText += fragment;
    }

    return this.extractJSON<ContentStrategySchema>(responseText);
  }

  /**
   * Step 3: Pattern Selection using Language Model
   */
  private async selectPattern(
    contentRequest: string,
    strategyData: ContentStrategySchema,
    request: vscode.ChatRequest,
    token: vscode.CancellationToken
  ): Promise<PatternSelectionSchema> {
    
    const availablePatterns = this.patternService.getAvailablePatterns();
    
    const prompt = this.promptService.renderPrompt('orchestration/03-pattern-selection', {
      contentRequest: contentRequest,
      contentStrategy: JSON.stringify(strategyData),
      availablePatterns: JSON.stringify(availablePatterns, null, 2)
    });

    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const response = await request.model.sendRequest(messages, {}, token);
    
    let responseText = '';
    for await (const fragment of response.text) {
      responseText += fragment;
    }

    return this.extractJSON<PatternSelectionSchema>(responseText);
  }

  /**
   * Step 4: Content Generation using Language Model
   */
  private async generateContent(
    contentRequest: string,
    directoryData: DirectorySelectionSchema,
    strategyData: ContentStrategySchema,
    patternData: PatternSelectionSchema,
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<OrchestrationResult> {
    
    const selectedPattern = this.patternService.getPatternById(patternData.patternId);
    if (!selectedPattern) {
      throw new Error(`Pattern not found: ${patternData.patternId}`);
    }

    const prompt = this.promptService.renderPrompt('orchestration/04-content-generation', {
      contentRequest: contentRequest,
      selectedDirectory: directoryData.selectedDirectory,
      contentStrategy: JSON.stringify(strategyData),
      patternSelection: JSON.stringify(patternData),
      contentPattern: JSON.stringify(selectedPattern, null, 2)
    });

    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const response = await request.model.sendRequest(messages, {}, token);
    
    let responseText = '';
    for await (const fragment of response.text) {
      responseText += fragment;
      // Stream progress to user
      if (fragment.includes('```') || fragment.includes('#')) {
        stream.markdown('📝 ');
      }
    }

    const generationData = this.extractJSON<ContentGenerationSchema>(responseText);
    
    // Write the file
    const filePath = await this.writeFile(
      directoryData.selectedDirectory,
      generationData.filename,
      generationData.content
    );

    return {
      success: true,
      action: 'CREATED',
      filePath: filePath,
      steps: {
        directorySelection: { success: true, data: directoryData, prompt: '', response: '' },
        contentStrategy: { success: true, data: strategyData, prompt: '', response: '' },
        patternSelection: { success: true, data: patternData, prompt: '', response: '' },
        contentGeneration: { success: true, data: generationData, prompt: '', response: '' }
      }
    };
  }

  /**
   * Step 4 (Alternative): Content Update using Language Model
   */
  private async updateContent(
    contentRequest: string,
    directoryData: DirectorySelectionSchema,
    strategyData: ContentStrategySchema,
    existingContent: string[],
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<OrchestrationResult> {
    
    const targetFile = strategyData.targetFile!;
    const currentContent = await this.readFile(
      path.join(directoryData.selectedDirectory, targetFile)
    );

    const prompt = this.promptService.renderPrompt('orchestration/05-content-update', {
      contentRequest: contentRequest,
      targetFilename: targetFile,
      currentContent: currentContent,
      contentStrategy: JSON.stringify(strategyData)
    });

    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const response = await request.model.sendRequest(messages, {}, token);
    
    let responseText = '';
    for await (const fragment of response.text) {
      responseText += fragment;
      // Stream progress to user
      if (fragment.includes('```') || fragment.includes('#')) {
        stream.markdown('📝 ');
      }
    }

    const updateData = this.extractJSON<ContentGenerationSchema>(responseText);
    
    // Write the updated file
    const filePath = await this.writeFile(
      directoryData.selectedDirectory,
      updateData.filename,
      updateData.content
    );

    return {
      success: true,
      action: 'UPDATED',
      filePath: filePath,
      steps: {
        directorySelection: { success: true, data: directoryData, prompt: '', response: '' },
        contentStrategy: { success: true, data: strategyData, prompt: '', response: '' },
        contentGeneration: { success: true, data: updateData, prompt: '', response: '' }
      }
    };
  }

  /**
   * Helper: Extract JSON from LLM response
   */
  private extractJSON<T>(responseText: string): T {
    try {
      // Look for JSON blocks in the response
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                       responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonText) as T;
      
    } catch (error) {
      this.context.logger.error('Failed to extract JSON from response:', responseText);
      throw new Error(`Invalid JSON response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Helper: Get repository structure
   */
  private async getRepositoryStructure(): Promise<RepositoryStructure> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace folder found');
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const structure = await this.buildDirectoryTree(rootPath);
    const documentationDirectories = this.findDocumentationDirectories(structure);
    const configFiles = this.findConfigFiles(structure);
    const markdownFiles = this.findMarkdownFiles(structure);

    return {
      rootPath,
      structure,
      documentationDirectories,
      configFiles,
      markdownFiles,
      totalFiles: this.countFiles(structure)
    };
  }

  private async buildDirectoryTree(dirPath: string, maxDepth: number = 3, currentDepth: number = 0): Promise<DirectoryNode[]> {
    if (currentDepth >= maxDepth) return [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const nodes: DirectoryNode[] = [];

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, fullPath);

        if (entry.isDirectory()) {
          const children = await this.buildDirectoryTree(fullPath, maxDepth, currentDepth + 1);
          nodes.push({
            name: entry.name,
            path: relativePath,
            type: 'directory',
            children
          });
        } else {
          nodes.push({
            name: entry.name,
            path: relativePath,
            type: 'file'
          });
        }
      }

      return nodes;
    } catch (error) {
      this.context.logger.warn(`Failed to read directory ${dirPath}:`, error);
      return [];
    }
  }

  private findDocumentationDirectories(structure: DirectoryNode[]): string[] {
    const docDirs: string[] = [];
    const docKeywords = ['docs', 'documentation', 'guide', 'tutorial', 'help'];

    const traverse = (nodes: DirectoryNode[]) => {
      for (const node of nodes) {
        if (node.type === 'directory') {
          if (docKeywords.some(keyword => node.name.toLowerCase().includes(keyword))) {
            docDirs.push(node.path);
          }
          if (node.children) {
            traverse(node.children);
          }
        }
      }
    };

    traverse(structure);
    return docDirs;
  }

  private findConfigFiles(structure: DirectoryNode[]): string[] {
    const configFiles: string[] = [];
    const configPatterns = /\.(json|yaml|yml|toml|ini|conf)$/;

    const traverse = (nodes: DirectoryNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file' && configPatterns.test(node.name)) {
          configFiles.push(node.path);
        } else if (node.type === 'directory' && node.children) {
          traverse(node.children);
        }
      }
    };

    traverse(structure);
    return configFiles;
  }

  private findMarkdownFiles(structure: DirectoryNode[]): string[] {
    const mdFiles: string[] = [];

    const traverse = (nodes: DirectoryNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file' && node.name.endsWith('.md')) {
          mdFiles.push(node.path);
        } else if (node.type === 'directory' && node.children) {
          traverse(node.children);
        }
      }
    };

    traverse(structure);
    return mdFiles;
  }

  private countFiles(structure: DirectoryNode[]): number {
    let count = 0;
    const traverse = (nodes: DirectoryNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          count++;
        } else if (node.children) {
          traverse(node.children);
        }
      }
    };
    traverse(structure);
    return count;
  }

  /**
   * Helper: Read directory contents
   */
  private async readDirectoryContents(directory: string): Promise<string[]> {
    const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const fullPath = path.join(workspaceRoot, directory);

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isFile())
        .map(entry => entry.name);
    } catch (error) {
      this.context.logger.warn(`Failed to read directory ${fullPath}:`, error);
      return [];
    }
  }

  /**
   * Helper: Read file content
   */
  private async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Helper: Write file
   */
  private async writeFile(directory: string, filename: string, content: string): Promise<string> {
    const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const dirPath = path.join(workspaceRoot, directory);
    const filePath = path.join(dirPath, filename);

    try {
      // Ensure directory exists
      await fs.mkdir(dirPath, { recursive: true });
      
      // Write file
      await fs.writeFile(filePath, content, 'utf-8');
      
      this.context.logger.info(`File written successfully: ${filePath}`);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send help response
   */
  private async sendHelpResponse(stream: vscode.ChatResponseStream): Promise<void> {
    stream.markdown('# 🤖 Content Creator Assistant\n\n');
    stream.markdown('I help create professional technical documentation using AI-driven workflows.\n\n');
    
    stream.markdown('## ✨ What I Do\n');
    stream.markdown('- 📄 **Smart Content Creation**: Analyze your repository and create contextually appropriate documentation\n');
    stream.markdown('- 🎯 **Intelligent Placement**: Select the optimal directory for your new content\n');
    stream.markdown('- 📋 **Professional Patterns**: Use proven templates (Overview, Quickstart, How-to, Tutorial, Concept)\n');
    stream.markdown('- 🔄 **Content Strategy**: Decide whether to create new content or update existing files\n\n');
    
    stream.markdown('## 🚀 How to Use\n');
    stream.markdown('Simply describe what content you want to create:\n\n');
    stream.markdown('- `@content-creator Create a getting started guide for new contributors`\n');
    stream.markdown('- `@content-creator I need API documentation for the authentication module`\n');
    stream.markdown('- `@content-creator Write a troubleshooting guide for common deployment issues`\n\n');
    
    stream.markdown('## 🔄 Workflow Steps\n');
    stream.markdown('1. 🔍 **Repository Analysis** - Understanding your project structure\n');
    stream.markdown('2. 📁 **Directory Selection** - Finding the best location for content\n');
    stream.markdown('3. 🎯 **Content Strategy** - Deciding create vs. update approach\n');
    stream.markdown('4. 🎨 **Pattern Selection** - Choosing the right documentation template\n');
    stream.markdown('5. ✍️ **Content Generation** - Creating professional, structured content\n\n');
    
    stream.button({
      command: 'vscode-webview-extension.openWebview',
      title: 'Open Full Interface',
      tooltip: 'Open the complete Content Creator interface for file uploads and detailed requests'
    });
  }

  /**
   * Get participant status
   */
  public getParticipantStatus(): { isSupported: boolean; isRegistered: boolean } {
    return {
      isSupported: !!(vscode.chat && vscode.chat.createChatParticipant),
      isRegistered: !!this.participant,
    };
  }
}
