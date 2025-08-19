/**
 * Application constants
 */

export const EXTENSION_CONSTANTS = {
  // Context management
  CONTEXT_TTL_MS: 30 * 60 * 1000, // 30 minutes
  CONTEXT_CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  CONTEXT_ID_LENGTH: 12,

  // File processing limits
  MAX_URL_CONTENT_LENGTH: 10 * 1024 * 1024, // 10MB
  MAX_DIFF_LENGTH: 50000, // 50KB for PR diffs
  MAX_MARKDOWN_SAMPLE_FILES: 20, // For pattern analysis

  // Network timeouts
  URL_FETCH_TIMEOUT_MS: 30000, // 30 seconds
  GITHUB_API_TIMEOUT_MS: 10000, // 10 seconds

  // Documentation analysis
  FRONT_MATTER_THRESHOLD: 0.3, // 30% threshold for front matter usage
  MAX_DIRECTORY_DEPTH: 4,
  MAX_RECENT_FILES: 10,

  // UI constants
  NOTIFICATION_DISPLAY_DURATION_MS: 3000, // 3 seconds
  FADE_OUT_DURATION_MS: 300, // 0.3 seconds

  // Repository analysis
  MAX_COMMON_DIRECTORIES: 10,
  DIRECTORY_TREE_MAX_DEPTH: 4,
} as const;

export const FILE_EXTENSIONS = {
  WORD: ['.docx', '.doc'],
  PDF: ['.pdf'],
  POWERPOINT: ['.pptx', '.ppt'],
  TEXT: ['.txt', '.md'],
  CONFIG: ['.json', '.yaml', '.yml', '.toml', '.ini', '.conf'],
} as const;

export const COMMAND_IDS = {
  OPEN_WEBVIEW: 'ai-content-developer.openWebview',
  REFRESH: 'ai-content-developer.refresh',
  OPEN_CHAT: 'workbench.action.chat.open',
  OPEN_FILE: 'vscode.open',
  OPEN_SETTINGS: 'workbench.action.openSettings',
} as const;

export const CONFIGURATION_KEYS = {
  ENABLE_DEBUG_MODE: 'ai-content-developer.enableDebugMode',
  THEME: 'ai-content-developer.theme',
  GITHUB_TOKEN: 'ai-content-developer.githubToken',
} as const;

export const CHAT_PARTICIPANT = {
  ID: 'ai-content-developer.content-creator',
  NAME: 'content-creator',
  FULL_NAME: 'AI Content Developer',
  DESCRIPTION: 'Create professional technical documentation with AI assistance',
} as const;
