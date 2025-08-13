import * as vscode from 'vscode';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel = LogLevel.INFO;

  constructor(channelName: string) {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
  }

  /**
   * Set the minimum log level
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Log debug message
   */
  public debug(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.log('DEBUG', message, ...(args as unknown[]));
    }
  }

  /**
   * Log info message
   */
  public info(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.log('INFO', message, ...(args as unknown[]));
    }
  }

  /**
   * Log warning message
   */
  public warn(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.log('WARN', message, ...(args as unknown[]));
    }
  }

  /**
   * Log error message
   */
  public error(message: string, error?: any): void {
    if (this.logLevel <= LogLevel.ERROR) {
      this.log('ERROR', message, error);

      // Also log to console for debugging
      console.error(message, error);
    }
  }

  /**
   * Show the output channel
   */
  public show(): void {
    this.outputChannel.show();
  }

  /**
   * Hide the output channel
   */
  public hide(): void {
    this.outputChannel.hide();
  }

  /**
   * Clear the output channel
   */
  public clear(): void {
    this.outputChannel.clear();
  }

  /**
   * Internal log method
   */
  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;

    // Append additional arguments if any
    if (args.length > 0) {
      const additionalInfo = args
        .map((arg) => {
          if (arg instanceof Error) {
            return `\n  Error: ${arg.message}\n  Stack: ${arg.stack}`;
          }
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join('\n  ');

      this.outputChannel.appendLine(`${formattedMessage}\n  ${additionalInfo}`);
    } else {
      this.outputChannel.appendLine(formattedMessage);
    }
  }

  /**
   * Dispose the logger
   */
  public dispose(): void {
    this.outputChannel.dispose();
  }
}
