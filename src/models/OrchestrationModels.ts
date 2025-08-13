/**
 * Deterministic schemas for Copilot orchestration workflow
 */

/**
 * Content request input schema
 */
export interface ContentRequestSchema {
  goal: string;
  audience: string;
  contentType: string;
  inputMaterials: Array<{
    source: string;
    type: string;
    preview: string;
  }>;
  timestamp: string;
}

/**
 * Step 1: Directory selection output schema
 */
export interface DirectorySelectionSchema {
  selectedDirectory: string;
  reasoning: string;
  confidence: number;
  existingFiles: string[];
  directoryPurpose: string;
  alternativeOptions: Array<{
    directory: string;
    reason: string;
  }>;
}

/**
 * Step 2: Content strategy output schema
 */
export interface ContentStrategySchema {
  action: 'CREATE' | 'UPDATE';
  targetFile?: string; // Required if UPDATE
  reasoning: string;
  contentOverlap: number; // Percentage
  existingContentSummary?: string;
  userJourneyContext: string;
}

/**
 * Step 3: Pattern selection output schema (for CREATE)
 */
export interface PatternSelectionSchema {
  patternId: string;
  patternName: string;
  reasoning: string;
  requiredSections: string[];
  audienceAlignment: string;
  alternativePatterns: Array<{
    patternId: string;
    reason: string;
  }>;
}

/**
 * Step 4: Content generation output schema
 */
export interface ContentGenerationSchema {
  content: string;
  title: string;
  filename: string;
  frontMatter: Record<string, string>;
  sections: Array<{
    heading: string;
    content: string;
  }>;
  metadata: {
    wordCount: number;
    readingTime: number;
    technicalLevel: string;
  };
}

/**
 * Repository analysis schema
 */
export interface RepositoryAnalysisSchema {
  rootPath: string;
  projectType: string;
  documentationDirs: string[];
  markdownFileCount: number;
  configFiles: string[];
  organizationPattern: string;
}

/**
 * Workflow step result
 */
export interface WorkflowStepResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  prompt: string;
  response: string;
}

/**
 * Complete workflow result
 */
export interface OrchestrationResult {
  success: boolean;
  filePath?: string;
  action: 'CREATED' | 'UPDATED' | 'INITIATED' | 'FAILED';
  steps: {
    directorySelection?: WorkflowStepResult<DirectorySelectionSchema>;
    contentStrategy?: WorkflowStepResult<ContentStrategySchema>;
    patternSelection?: WorkflowStepResult<PatternSelectionSchema>;
    contentGeneration?: WorkflowStepResult<ContentGenerationSchema>;
  };
  error?: string;
  message?: string;
}
