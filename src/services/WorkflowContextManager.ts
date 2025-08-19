import * as vscode from 'vscode';
import { ExtensionContext } from '../types/ExtensionContext';
import { ProcessedContent, InputFile } from '../models/InputModels';
import { nanoid } from 'nanoid';

/**
 * Context data stored for workflow handoff between webview and chat participant
 */
export interface WorkflowContext {
  contextId: string;
  timestamp: number;
  goal: string;
  processedFiles: ProcessedContent[];
  originalInputs: InputFile[];
  options: {
    workspaceRoot?: string;
    [key: string]: any;
  };
  metadata: {
    userAgent: string;
    vscodeVersion: string;
    extensionVersion: string;
  };
}

/**
 * Manages workflow contexts for handoff between webview and chat participant
 * Provides temporary storage with automatic cleanup
 */
export class WorkflowContextManager {
  private contexts = new Map<string, WorkflowContext>();
  private readonly CONTEXT_TTL = 30 * 60 * 1000; // 30 minutes
  private cleanupInterval: NodeJS.Timeout;

  constructor(private context: ExtensionContext) {
    // Start periodic cleanup of expired contexts
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredContexts();
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Cleanup on extension deactivation
    this.context.vscodeContext.subscriptions.push({
      dispose: () => {
        clearInterval(this.cleanupInterval);
        this.contexts.clear();
      }
    });
  }

  /**
   * Store a new workflow context and return the context ID
   */
  public storeContext(
    goal: string,
    processedFiles: ProcessedContent[],
    originalInputs: InputFile[],
    options: {
      [key: string]: any;
    } = {}
  ): string {
    const contextId = nanoid(12); // Short, URL-safe unique ID
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

    const workflowContext: WorkflowContext = {
      contextId,
      timestamp: Date.now(),
      goal,
      processedFiles,
      originalInputs,
      options: {
        ...options,
        workspaceRoot
      },
      metadata: {
        userAgent: 'VSCode Extension',
        vscodeVersion: vscode.version,
        extensionVersion: this.context.vscodeContext.extension.packageJSON.version || '0.0.1'
      }
    };

    this.contexts.set(contextId, workflowContext);
    
    this.context.logger.info(`Stored workflow context: ${contextId} with ${processedFiles.length} files`);
    this.context.logger.debug(`Context goal: ${goal}`);

    return contextId;
  }

  /**
   * Retrieve a workflow context by ID
   */
  public retrieveContext(contextId: string): WorkflowContext | undefined {
    const context = this.contexts.get(contextId);
    
    if (!context) {
      this.context.logger.warn(`Context not found: ${contextId}`);
      return undefined;
    }

    // Check if context has expired
    if (Date.now() - context.timestamp > this.CONTEXT_TTL) {
      this.context.logger.warn(`Context expired: ${contextId}`);
      this.contexts.delete(contextId);
      return undefined;
    }

    this.context.logger.info(`Retrieved workflow context: ${contextId}`);
    return context;
  }

  /**
   * Remove a specific context (e.g., after successful processing)
   */
  public removeContext(contextId: string): boolean {
    const removed = this.contexts.delete(contextId);
    if (removed) {
      this.context.logger.info(`Removed workflow context: ${contextId}`);
    }
    return removed;
  }

  /**
   * Get all active context IDs (for debugging)
   */
  public getActiveContexts(): string[] {
    return Array.from(this.contexts.keys());
  }

  /**
   * Get context summary for display
   */
  public getContextSummary(contextId: string): string | undefined {
    const context = this.contexts.get(contextId);
    if (!context) return undefined;

    const age = Math.round((Date.now() - context.timestamp) / 1000);
    const fileCount = context.processedFiles.length;
    const goalPreview = context.goal.length > 50 
      ? context.goal.substring(0, 50) + '...' 
      : context.goal;

    return `Context ${contextId}: "${goalPreview}" (${fileCount} files, ${age}s ago)`;
  }

  /**
   * Cleanup expired contexts
   */
  private cleanupExpiredContexts(): void {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [contextId, context] of this.contexts.entries()) {
      if (now - context.timestamp > this.CONTEXT_TTL) {
        expiredIds.push(contextId);
      }
    }

    for (const contextId of expiredIds) {
      this.contexts.delete(contextId);
    }

    if (expiredIds.length > 0) {
      this.context.logger.info(`Cleaned up ${expiredIds.length} expired contexts`);
    }
  }

  /**
   * Generate a chat query with context ID
   */
  public generateChatQuery(contextId: string, additionalPrompt?: string): string {
    const baseQuery = `@content-creator context:${contextId}`;
    return additionalPrompt ? `${baseQuery} ${additionalPrompt}` : baseQuery;
  }

  /**
   * Parse context ID from chat prompt
   */
  public parseContextFromPrompt(prompt: string): { contextId: string; remainingPrompt: string } | null {
    const contextMatch = prompt.match(/context:([a-zA-Z0-9_-]+)/);
    if (!contextMatch) return null;

    const contextId = contextMatch[1];
    const remainingPrompt = prompt.replace(/context:[a-zA-Z0-9_-]+\s*/, '').trim();

    return { contextId, remainingPrompt };
  }

  /**
   * Get statistics about stored contexts
   */
  public getStats(): {
    totalContexts: number;
    totalFiles: number;
    averageAge: number;
    oldestContext: number;
  } {
    const contexts = Array.from(this.contexts.values());
    const now = Date.now();

    if (contexts.length === 0) {
      return { totalContexts: 0, totalFiles: 0, averageAge: 0, oldestContext: 0 };
    }

    const totalFiles = contexts.reduce((sum, ctx) => sum + ctx.processedFiles.length, 0);
    const ages = contexts.map(ctx => now - ctx.timestamp);
    const averageAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;
    const oldestContext = Math.max(...ages);

    return {
      totalContexts: contexts.length,
      totalFiles,
      averageAge: Math.round(averageAge / 1000), // Convert to seconds
      oldestContext: Math.round(oldestContext / 1000)
    };
  }
}
