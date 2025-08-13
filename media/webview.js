// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly

(function() {
    // Get VS Code API
    const vscode = acquireVsCodeApi();
    
    // State management
    let state = {
        data: null,
        theme: 'light'
    };

    // Message types enum (matching the extension)
    const MessageType = {
        // From extension to webview
        UPDATE_CONTENT: 'updateContent',
        UPDATE_THEME: 'updateTheme',
        UPDATE_CONFIG: 'updateConfig',
        SHOW_MESSAGE: 'showMessage',
        
        // From webview to extension
        REQUEST_DATA: 'requestData',
        SAVE_DATA: 'saveData',
        EXECUTE_COMMAND: 'executeCommand',
        LOG_MESSAGE: 'logMessage',
        READY: 'ready'
    };

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        initialize();
        setupEventListeners();
        
        // Notify extension that webview is ready
        sendMessage({
            type: MessageType.READY
        });
    });

    /**
     * Initialize the webview
     */
    function initialize() {
        // Restore previous state if available
        const previousState = vscode.getState();
        if (previousState) {
            state = { ...state, ...previousState };
            updateUI();
        }

        log('info', 'Webview initialized');
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Button event listeners
        const refreshBtn = document.getElementById('refresh-btn');
        const settingsBtn = document.getElementById('settings-btn');
        const loadDataBtn = document.getElementById('load-data-btn');
        const saveDataBtn = document.getElementById('save-data-btn');
        const showNotificationBtn = document.getElementById('show-notification-btn');
        const documentationLink = document.getElementById('documentation-link');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', handleRefresh);
        }

        if (settingsBtn) {
            settingsBtn.addEventListener('click', handleSettings);
        }

        if (loadDataBtn) {
            loadDataBtn.addEventListener('click', handleLoadData);
        }

        if (saveDataBtn) {
            saveDataBtn.addEventListener('click', handleSaveData);
        }

        if (showNotificationBtn) {
            showNotificationBtn.addEventListener('click', handleShowNotification);
        }

        if (documentationLink) {
            documentationLink.addEventListener('click', (e) => {
                e.preventDefault();
                handleOpenDocumentation();
            });
        }

        // Listen for messages from the extension
        window.addEventListener('message', handleMessage);
    }

    /**
     * Handle messages from the extension
     */
    function handleMessage(event) {
        const message = event.data;
        
        log('debug', 'Received message:', message);

        switch (message.type) {
            case MessageType.UPDATE_CONTENT:
                handleUpdateContent(message.payload);
                break;
            
            case MessageType.UPDATE_THEME:
                handleUpdateTheme(message.payload);
                break;
            
            case MessageType.UPDATE_CONFIG:
                handleUpdateConfig(message.payload);
                break;
            
            case MessageType.SHOW_MESSAGE:
                handleShowMessage(message.payload);
                break;
            
            default:
                log('warn', 'Unknown message type:', message.type);
        }
    }

    /**
     * Send message to extension
     */
    function sendMessage(message) {
        vscode.postMessage(message);
    }

    /**
     * Log message (sends to extension)
     */
    function log(level, text, data = null) {
        sendMessage({
            type: MessageType.LOG_MESSAGE,
            payload: { level, text, data }
        });
        
        // Also log to console for debugging
        console.log(`[${level.toUpperCase()}] ${text}`, data || '');
    }

    /**
     * Handle refresh button click
     */
    function handleRefresh() {
        log('info', 'Refresh button clicked');
        
        // Clear current data
        state.data = null;
        updateUI();
        
        // Request fresh data
        sendMessage({
            type: MessageType.REQUEST_DATA,
            id: generateId()
        });
    }

    /**
     * Handle settings button click
     */
    function handleSettings() {
        log('info', 'Settings button clicked');
        
        // Execute VS Code command to open settings
        sendMessage({
            type: MessageType.EXECUTE_COMMAND,
            payload: {
                command: 'workbench.action.openSettings',
                args: ['vscode-webview-extension']
            }
        });
    }

    /**
     * Handle load data button click
     */
    function handleLoadData() {
        log('info', 'Load data button clicked');
        
        // Show loading state
        const loadDataBtn = document.getElementById('load-data-btn');
        if (loadDataBtn) {
            loadDataBtn.classList.add('loading');
            loadDataBtn.textContent = 'Loading...';
        }
        
        // Request data from extension
        sendMessage({
            type: MessageType.REQUEST_DATA,
            id: generateId()
        });
    }

    /**
     * Handle save data button click
     */
    function handleSaveData() {
        log('info', 'Save data button clicked');
        
        // Example data to save
        const dataToSave = {
            timestamp: new Date().toISOString(),
            content: 'Sample data from webview',
            state: state
        };
        
        // Send save request to extension
        sendMessage({
            type: MessageType.SAVE_DATA,
            payload: dataToSave
        });
    }

    /**
     * Handle show notification button click
     */
    function handleShowNotification() {
        log('info', 'Show notification button clicked');
        
        // Show a notification through VS Code
        sendMessage({
            type: MessageType.EXECUTE_COMMAND,
            payload: {
                command: 'vscode-webview-extension.showNotification',
                args: ['Hello from the webview!']
            }
        });
        
        // Also show local message
        showLocalMessage('Notification sent to VS Code!', 'success');
    }

    /**
     * Handle open documentation link
     */
    function handleOpenDocumentation() {
        log('info', 'Documentation link clicked');
        
        // Open external link
        sendMessage({
            type: MessageType.EXECUTE_COMMAND,
            payload: {
                command: 'vscode.open',
                args: ['https://code.visualstudio.com/api/extension-guides/webview']
            }
        });
    }

    /**
     * Handle content update from extension
     */
    function handleUpdateContent(payload) {
        log('info', 'Content updated', payload);
        
        state.data = payload;
        
        // Update UI
        const dataDisplay = document.getElementById('data-display');
        const dataContent = document.getElementById('data-content');
        
        if (dataDisplay && dataContent) {
            dataDisplay.classList.remove('hidden');
            dataDisplay.classList.add('fade-in');
            dataContent.textContent = JSON.stringify(payload, null, 2);
        }
        
        // Reset load button state
        const loadDataBtn = document.getElementById('load-data-btn');
        if (loadDataBtn) {
            loadDataBtn.classList.remove('loading');
            loadDataBtn.textContent = 'Load Data';
        }
        
        // Save state
        vscode.setState(state);
    }

    /**
     * Handle theme update from extension
     */
    function handleUpdateTheme(payload) {
        log('info', 'Theme updated', payload);
        
        state.theme = payload.theme;
        document.body.className = `theme-${payload.theme}`;
        
        // Save state
        vscode.setState(state);
    }

    /**
     * Handle configuration update from extension
     */
    function handleUpdateConfig(payload) {
        log('info', 'Configuration updated', payload);
        
        // Apply configuration changes
        if (payload.enableDebugMode) {
            document.body.classList.add('debug-mode');
        } else {
            document.body.classList.remove('debug-mode');
        }
    }

    /**
     * Handle show message from extension
     */
    function handleShowMessage(payload) {
        showLocalMessage(payload.text, payload.type);
    }

    /**
     * Show local message in the webview
     */
    function showLocalMessage(text, type = 'info') {
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type} fade-in`;
        messageEl.textContent = text;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: var(--vscode-notifications-background);
            color: var(--vscode-notifications-foreground);
            border: 1px solid var(--vscode-notifications-border);
            border-radius: 6px;
            z-index: 1000;
            max-width: 300px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        `;
        
        // Add type-specific styling
        if (type === 'error') {
            messageEl.style.borderColor = 'var(--vscode-inputValidation-errorBorder)';
            messageEl.style.background = 'var(--vscode-inputValidation-errorBackground)';
        } else if (type === 'success') {
            messageEl.style.borderColor = 'var(--vscode-terminal-ansiGreen)';
        }
        
        document.body.appendChild(messageEl);
        
        // Remove after 3 seconds
        setTimeout(() => {
            messageEl.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(messageEl);
            }, 300);
        }, 3000);
    }

    /**
     * Update UI based on state
     */
    function updateUI() {
        if (state.data) {
            const dataDisplay = document.getElementById('data-display');
            const dataContent = document.getElementById('data-content');
            
            if (dataDisplay && dataContent) {
                dataDisplay.classList.remove('hidden');
                dataContent.textContent = JSON.stringify(state.data, null, 2);
            }
        }
        
        if (state.theme) {
            document.body.className = `theme-${state.theme}`;
        }
    }

    /**
     * Generate unique ID for request-response pattern
     */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
})();
