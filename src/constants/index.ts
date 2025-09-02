/**
 * Application constants
 */

export const EXTENSION_CONSTANTS = {
  // UI constants
  NOTIFICATION_DISPLAY_DURATION_MS: 3000, // 3 seconds
  FADE_OUT_DURATION_MS: 300, // 0.3 seconds
} as const;

export const COMMAND_IDS = {
  OPEN_WEBVIEW: 'ai-content-developer.openWebview',
  REFRESH: 'ai-content-developer.refresh',
} as const;

export const CONFIGURATION_KEYS = {
  ENABLE_DEBUG_MODE: 'ai-content-developer.enableDebugMode',
  THEME: 'ai-content-developer.theme',
} as const;
