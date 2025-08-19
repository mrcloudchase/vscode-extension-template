// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly

(function() {
    // Get VS Code API
    const vscode = acquireVsCodeApi();
    
    // State management
    let state = {
        theme: 'light',
        contentGoal: '',
        inputs: [],
        interactiveMode: false
    };

    // Message types enum (matching the extension)
    const MessageType = {
        // From extension to webview
        UPDATE_CONTENT: 'updateContent',
        UPDATE_THEME: 'updateTheme',
        UPDATE_CONFIG: 'updateConfig',
        SHOW_MESSAGE: 'showMessage',
        WORKFLOW_STATUS: 'workflowStatus',
        WORKFLOW_COMPLETE: 'workflowComplete',
        
        // From webview to extension
        LOG_MESSAGE: 'logMessage',
        READY: 'ready',
        EXECUTE_WORKFLOW: 'executeWorkflow',
        SELECT_FILES: 'selectFiles'
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
        // Header button event listeners
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', handleRefresh);
        }

        // Input event listeners
        const selectFilesBtn = document.getElementById('select-files-btn');
        const addUrlBtn = document.getElementById('add-url-btn');
        const addGithubBtn = document.getElementById('add-github-btn');
        
        if (selectFilesBtn) {
            selectFilesBtn.addEventListener('click', handleSelectFiles);
        }
        if (addUrlBtn) {
            addUrlBtn.addEventListener('click', showUrlInput);
        }
        if (addGithubBtn) {
            addGithubBtn.addEventListener('click', showGithubInput);
        }

        // URL input handlers
        const addUrlConfirm = document.getElementById('add-url-confirm');
        const urlInput = document.getElementById('url-input');
        if (addUrlConfirm) {
            addUrlConfirm.addEventListener('click', handleAddUrl);
        }
        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleAddUrl();
            });
        }

        // GitHub input handlers
        const addGithubConfirm = document.getElementById('add-github-confirm');
        const githubInput = document.getElementById('github-input');
        if (addGithubConfirm) {
            addGithubConfirm.addEventListener('click', handleAddGithub);
        }
        if (githubInput) {
            githubInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleAddGithub();
            });
        }

        // Content goal and action listeners
        const executeBtn = document.getElementById('execute-btn');
        const clearBtn = document.getElementById('clear-btn');
        const contentGoalInput = document.getElementById('content-goal');
        const interactiveModeCheckbox = document.getElementById('interactive-mode');
        
        if (executeBtn) {
            executeBtn.addEventListener('click', handleExecuteWorkflow);
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', handleClearAll);
        }

        if (contentGoalInput) {
            contentGoalInput.addEventListener('input', updateExecuteButton);
        }

        if (interactiveModeCheckbox) {
            interactiveModeCheckbox.addEventListener('change', (e) => {
                state.interactiveMode = e.target.checked;
                vscode.setState(state);
                log('info', `Interactive mode: ${state.interactiveMode}`);
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
            case MessageType.UPDATE_THEME:
                handleUpdateTheme(message.payload);
                break;
            
            case MessageType.UPDATE_CONFIG:
                handleUpdateConfig(message.payload);
                break;
            
            case MessageType.SHOW_MESSAGE:
                handleShowMessage(message.payload);
                break;
            
            case MessageType.WORKFLOW_STATUS:
                handleWorkflowStatus(message.payload);
                break;
            
            case MessageType.WORKFLOW_COMPLETE:
                handleWorkflowComplete(message.payload);
                break;
            
            case MessageType.UPDATE_CONTENT:
                handleUpdateContent(message.payload);
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
        location.reload();
    }

    /**
     * Handle file selection
     */
    function handleSelectFiles() {
        log('info', 'Requesting file selection');
        sendMessage({
            type: MessageType.SELECT_FILES,
            id: generateId()
        });
    }

    /**
     * Show URL input
     */
    function showUrlInput() {
        const urlContainer = document.getElementById('url-input-container');
        const githubContainer = document.getElementById('github-input-container');
        if (urlContainer) {
            urlContainer.classList.remove('hidden');
            document.getElementById('url-input').focus();
        }
        if (githubContainer) {
            githubContainer.classList.add('hidden');
        }
    }

    /**
     * Show GitHub input
     */
    function showGithubInput() {
        const githubContainer = document.getElementById('github-input-container');
        const urlContainer = document.getElementById('url-input-container');
        if (githubContainer) {
            githubContainer.classList.remove('hidden');
            document.getElementById('github-input').focus();
        }
        if (urlContainer) {
            urlContainer.classList.add('hidden');
        }
    }

    /**
     * Handle adding URL
     */
    function handleAddUrl() {
        const input = document.getElementById('url-input');
        const container = document.getElementById('url-input-container');
        
        if (input && input.value.trim()) {
            const url = input.value.trim();
            state.inputs.push({
                id: generateId(),
                name: url,
                type: 'url',
                uri: url
            });
            
            updateInputList();
            updateExecuteButton();
            
            input.value = '';
            container.classList.add('hidden');
        }
    }

    /**
     * Handle adding GitHub PR
     */
    function handleAddGithub() {
        const input = document.getElementById('github-input');
        const container = document.getElementById('github-input-container');
        
        if (input && input.value.trim()) {
            const url = input.value.trim();
            state.inputs.push({
                id: generateId(),
                name: `GitHub: ${url.split('/').pop()}`,
                type: 'github_pr',
                uri: url
            });
            
            updateInputList();
            updateExecuteButton();
            
            input.value = '';
            container.classList.add('hidden');
        }
    }

    /**
     * Update input list display
     */
    function updateInputList() {
        const listEl = document.getElementById('input-list');
        if (!listEl) return;
        
        if (state.inputs.length === 0) {
            listEl.innerHTML = '<div class="empty-state">No inputs added yet</div>';
        } else {
            listEl.innerHTML = state.inputs.map((input, index) => {
                // Map file types to appropriate icons
                let iconClass = 'file';
                if (input.type === 'url') iconClass = 'globe';
                else if (input.type === 'github_pr') iconClass = 'github';
                else if (input.type === 'markdown') iconClass = 'markdown';
                else if (input.type === 'word') iconClass = 'file-text';
                else if (input.type === 'pdf') iconClass = 'file-pdf';
                else if (input.type === 'powerpoint') iconClass = 'file-media';
                else if (input.type === 'text') iconClass = 'file-code';
                else if (input.type === 'image') iconClass = 'file-media';
                
                return `
                    <div class="input-item">
                        <span class="input-icon codicon codicon-${iconClass}"></span>
                        <span class="input-name" title="${input.name}">${input.name}</span>
                        <button class="remove-btn" onclick="removeInput(${index})" title="Remove">
                            <span class="codicon codicon-close"></span>
                        </button>
                    </div>
                `;
            }).join('');
        }
        
        vscode.setState(state);
    }

    /**
     * Remove input
     */
    window.removeInput = function(index) {
        state.inputs.splice(index, 1);
        updateInputList();
        updateExecuteButton();
    };

    /**
     * Handle execute workflow
     */
    function handleExecuteWorkflow() {
        const contentGoalInput = document.getElementById('content-goal');
        const contentGoal = contentGoalInput ? contentGoalInput.value.trim() : '';
        
        if (!contentGoal) {
            showLocalMessage('Please enter a content goal', 'error');
            return;
        }
        
        log('info', 'Executing workflow with goal:', contentGoal);
        log('info', 'Inputs:', state.inputs);
        state.contentGoal = contentGoal;
        
        // Disable execute button
        const executeBtn = document.getElementById('execute-btn');
        if (executeBtn) {
            executeBtn.disabled = true;
            executeBtn.textContent = 'Executing...';
        }
        
        // Send execute request
        sendMessage({
            type: MessageType.EXECUTE_WORKFLOW,
            payload: {
                contentGoal: contentGoal,
                inputs: state.inputs,
                interactiveMode: state.interactiveMode
            },
            id: generateId()
        });
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
        
        // Add icon based on type
        const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
        messageEl.innerHTML = `<span style="margin-right: 8px; font-weight: bold;">${icon}</span>${text}`;
        
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: var(--vscode-notifications-background);
            color: var(--vscode-notifications-foreground);
            border: 1px solid var(--vscode-notifications-border);
            border-radius: 8px;
            z-index: 1000;
            max-width: 350px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            animation: slideInRight 0.3s ease-out;
        `;
        
        // Add type-specific styling
        if (type === 'error') {
            messageEl.style.borderColor = 'var(--vscode-errorForeground)';
            messageEl.style.background = 'rgba(255, 0, 0, 0.1)';
            messageEl.style.color = 'var(--vscode-errorForeground)';
        } else if (type === 'success') {
            messageEl.style.borderColor = 'var(--vscode-terminal-ansiGreen)';
            messageEl.style.background = 'rgba(0, 255, 0, 0.1)';
            messageEl.style.color = 'var(--vscode-terminal-ansiGreen)';
        } else if (type === 'warning') {
            messageEl.style.borderColor = 'var(--vscode-editorWarning-foreground)';
            messageEl.style.background = 'rgba(255, 200, 0, 0.1)';
            messageEl.style.color = 'var(--vscode-editorWarning-foreground)';
        }
        
        document.body.appendChild(messageEl);
        
        // Remove after 3 seconds
        setTimeout(() => {
            messageEl.style.opacity = '0';
            messageEl.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    document.body.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Handle content update (for file selections)
     */
    function handleUpdateContent(payload) {
        if (payload.files) {
            // Add files to inputs
            const addedCount = payload.files.length;
            payload.files.forEach(file => {
                state.inputs.push({
                    id: generateId(),
                    name: file.name,
                    type: file.type,
                    uri: file.uri
                });
            });
            
            updateInputList();
            updateExecuteButton();
            
            // Show success message
            showLocalMessage(`Successfully added ${addedCount} file(s)`, 'success');
        }
    }

    /**
     * Update UI based on state
     */
    function updateUI() {
        if (state.theme) {
            document.body.className = `theme-${state.theme}`;
        }
        
        // Update content goal and interactive mode
        const contentGoalInput = document.getElementById('content-goal');
        if (contentGoalInput && state.contentGoal) {
            contentGoalInput.value = state.contentGoal;
        }
        
        const interactiveModeCheckbox = document.getElementById('interactive-mode');
        if (interactiveModeCheckbox) {
            interactiveModeCheckbox.checked = state.interactiveMode;
        }
        
        updateInputList();
        updateExecuteButton();
    }

    /**
     * Generate unique ID for request-response pattern
     */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Handle workflow status updates
     */
    function handleWorkflowStatus(payload) {
        const statusEl = document.getElementById('workflow-status');
        const statusText = document.getElementById('status-text');
        const currentStep = document.getElementById('current-step');
        
        if (statusEl && statusText) {
            statusEl.classList.remove('hidden');
            statusText.textContent = payload.message || '';
            
            if (currentStep && payload.step) {
                currentStep.textContent = `Step ${payload.step}: ${payload.stepName || ''}`;
                currentStep.classList.remove('hidden');
            }
        }
        
        // Log the status
        log('info', `Workflow status: ${payload.message}`);
    }

    /**
     * Handle workflow completion
     */
    function handleWorkflowComplete(payload) {
        const executeBtn = document.getElementById('execute-btn');
        const statusEl = document.getElementById('workflow-status');
        const responseSection = document.getElementById('response-section');
        const responseContent = document.getElementById('response-content');
        
        // Re-enable execute button
        if (executeBtn) {
            executeBtn.disabled = false;
            executeBtn.textContent = 'Execute Workflow';
            updateExecuteButton();
        }
        
        // Show completion message
        if (responseSection && responseContent) {
            responseSection.classList.remove('hidden');
            
            if (payload.success) {
                responseContent.innerHTML = `
                    <div class="success-message">
                        <h3>✅ Workflow Complete!</h3>
                        <p>${payload.message || 'Documentation created successfully.'}</p>
                        ${payload.filePath ? `<p><strong>File:</strong> <code>${payload.filePath}</code></p>` : ''}
                    </div>
                `;
            } else {
                responseContent.innerHTML = `
                    <div class="error-message">
                        <h3>❌ Workflow Failed</h3>
                        <p>${payload.error || 'An error occurred during workflow execution.'}</p>
                    </div>
                `;
            }
            
            // Scroll to response
            responseSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Hide status after a moment
        if (statusEl) {
            setTimeout(() => {
                statusEl.classList.add('hidden');
            }, 3000);
        }
    }

    /**
     * Handle clear all
     */
    function handleClearAll() {
        state.contentGoal = '';
        state.inputs = [];
        
        const contentGoalInput = document.getElementById('content-goal');
        if (contentGoalInput) {
            contentGoalInput.value = '';
        }
        
        updateInputList();
        updateExecuteButton();
        
        // Hide response section
        const responseSection = document.getElementById('response-section');
        if (responseSection) {
            responseSection.classList.add('hidden');
        }
        
        // Clear workflow status
        const statusEl = document.getElementById('workflow-status');
        if (statusEl) {
            statusEl.classList.add('hidden');
        }
        
        // Save state
        vscode.setState(state);
    }

    /**
     * Update execute button state
     */
    function updateExecuteButton() {
        const executeBtn = document.getElementById('execute-btn');
        const contentGoalInput = document.getElementById('content-goal');
        
        if (executeBtn) {
            const hasGoal = contentGoalInput && contentGoalInput.value.trim().length > 0;
            
            executeBtn.disabled = !hasGoal;
            executeBtn.textContent = 'Execute Workflow';
        }
    }


})();
