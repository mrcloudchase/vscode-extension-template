/**
 * Content pattern models based on content_standards.json structure
 */

export interface ContentPattern {
  name: string;
  id: string;
  purpose: string;
  description: string;
  frontMatter: Record<string, string>;
  requiredSections: string[];
  sectionOrder: SectionDefinition[];
  terminalSections: string[];
  markdownTemplate: string;
}

export interface SectionDefinition {
  name: string;
  position: number;
  required: boolean;
  allowMultiple?: boolean;
  terminal?: boolean;
  alternateNames?: string[];
}

export interface ContentStandards {
  version: string;
  documentPurpose: string;
  contentTypes: ContentPattern[];
  requiredFrontMatter: FrontMatterField[];
  coreGuidelines: string[];
  customerIntent: CustomerIntentGuidelines;
  formattingElements: FormattingElement[];
  commonTabGroups: TabGroup[];
  seoGuidelines: SEOGuidelines;
  imageGuidelines: ImageGuidelines;
  codeGuidelines: CodeGuidelines;
  securityGuidelines: string[];
  processingInstructions: string[];
  templateEnforcementRules: EnforcementRule[];
  sectionPlacementGuidelines: SectionPlacementGuidelines;
}

export interface FrontMatterField {
  name: string;
  description: string;
  value?: string;
}

export interface CustomerIntentGuidelines {
  format: string;
  location: string;
  examples: string[];
}

export interface FormattingElement {
  name: string;
  format: string;
  example: string;
}

export interface TabGroup {
  name: string;
  purpose: string;
  tabs?: string[];
  example?: string[];
}

export interface SEOGuidelines {
  title: {
    pattern: string;
    example: string;
  };
  description: {
    pattern: string;
    example: string;
  };
  keywords: {
    pattern: string;
    example: string;
  };
  links: {
    pattern: string;
    example: string;
  };
}

export interface ImageGuidelines {
  naming: {
    fileNames: string;
    folderStructure: string;
    screenshotPrefix: string;
    diagramPrefix: string;
  };
  bestPractices: string[];
  syntax: string;
}

export interface CodeGuidelines {
  languages: Array<{
    name: string;
    syntax: string;
    useFor: string;
  }>;
  bestPractices: string[];
}

export interface EnforcementRule {
  rule: string;
  description: string;
  enforcement: 'strict' | 'recommended';
  terminalSections?: string[];
}

export interface SectionPlacementGuidelines {
  forUpdates: string[];
  forCreation: string[];
}

/**
 * Content pattern selection request
 */
export interface PatternSelectionRequest {
  goal: string;
  audience: string;
  contentContext: string;
  suggestedType?: string;
}

/**
 * Content pattern selection result
 */
export interface PatternSelectionResult {
  selectedPattern: ContentPattern;
  confidence: number;
  reasoning: string;
  alternatives: Array<{
    pattern: ContentPattern;
    confidence: number;
    reason: string;
  }>;
}
