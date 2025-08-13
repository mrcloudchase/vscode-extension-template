import * as vscode from 'vscode';
import { ExtensionConfiguration } from '../types/ExtensionContext';

export class ConfigurationManager {
  private configuration: ExtensionConfiguration;
  private readonly configSection = 'vscode-webview-extension';

  constructor() {
    this.configuration = this.loadConfiguration();
  }

  /**
   * Get current configuration
   */
  public getConfiguration(): ExtensionConfiguration {
    return { ...this.configuration };
  }

  /**
   * Get a specific configuration value
   */
  public get<K extends keyof ExtensionConfiguration>(key: K): ExtensionConfiguration[K] {
    return this.configuration[key];
  }

  /**
   * Update a configuration value
   */
  public async set<K extends keyof ExtensionConfiguration>(
    key: K,
    value: ExtensionConfiguration[K],
    global = false
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.configSection);
    await config.update(key, value, global);
    this.configuration[key] = value;
  }

  /**
   * Reload configuration from settings
   */
  public reload(): void {
    this.configuration = this.loadConfiguration();
  }

  /**
   * Load configuration from VSCode settings
   */
  private loadConfiguration(): ExtensionConfiguration {
    const config = vscode.workspace.getConfiguration(this.configSection);

    return {
      enableDebugMode: config.get<boolean>('enableDebugMode', false),
      theme: config.get<'auto' | 'light' | 'dark'>('theme', 'auto'),
    };
  }

  /**
   * Reset configuration to defaults
   */
  public async resetToDefaults(): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.configSection);

    // Get all configuration keys
    const inspection = config.inspect('enableDebugMode');
    if (inspection) {
      await config.update('enableDebugMode', undefined, true);
      await config.update('enableDebugMode', undefined, false);
    }

    const themeInspection = config.inspect('theme');
    if (themeInspection) {
      await config.update('theme', undefined, true);
      await config.update('theme', undefined, false);
    }

    this.reload();
  }
}
