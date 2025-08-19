// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly

(function() {
    // Get VS Code API
    const vscode = acquireVsCodeApi();
    
    // State management
    let state = {
        theme: 'light',
        inputs: [],
        goal: ''
    };

    // Message types enum (matching the extension)
    const MessageType = {
        // From extension to webview
        UPDATE_CONTENT: 'updateContent',
        UPDATE_THEME: 'updateTheme',
        UPDATE_CONFIG: 'updateConfig',
        SHOW_MESSAGE: 'showMessage',
        PROCESSING_STATUS: 'processingStatus',
        COPILOT_RESPONSE: 'copilotResponse',
        
        // From webview to extension
        LOG_MESSAGE: 'logMessage',
        READY: 'ready',
        PROCESS_INPUTS: 'processInputs',
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

        // New input processing event listeners
        const selectFilesBtn = document.getElementById('select-files-btn');
        const addUrlBtn = document.getElementById('add-url-btn');
        const addGithubBtn = document.getElementById('add-github-pr-btn');
        const processBtn = document.getElementById('process-btn');
        const clearBtn = document.getElementById('clear-btn');
        const goalInput = document.getElementById('goal-input');
        
        if (selectFilesBtn) {
            selectFilesBtn.addEventListener('click', handleSelectFiles);
        }

        if (addUrlBtn) {
            addUrlBtn.addEventListener('click', showUrlInput);
        }

        if (addGithubBtn) {
            addGithubBtn.addEventListener('click', showGithubInput);
        }

        if (processBtn) {
            processBtn.addEventListener('click', handleProcessInputs);
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', handleClearAll);
        }

        if (goalInput) {
            goalInput.addEventListener('input', updateProcessButton);
        }

        // URL input handlers
        const addUrlConfirm = document.getElementById('add-url-confirm');
        const urlInput = document.getElementById('url-input');
        
        if (addUrlConfirm) {
            addUrlConfirm.addEventListener('click', handleAddUrl);
        }
        
        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleAddUrl();
                }
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
                if (e.key === 'Enter') {
                    handleAddGithub();
                }
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
            
            case MessageType.PROCESSING_STATUS:
                handleProcessingStatus(message.payload);
                break;
            
            case MessageType.COPILOT_RESPONSE:
                handleCopilotResponse(message.payload);
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
     * Handle content update from extension
     */
    function handleUpdateContent(payload) {
        if (payload.files) {
            // Add files to inputs
            payload.files.forEach(file => {
                state.inputs.push(file);
            });
            
            updateInputList();
            updateProcessButton();
        }
        // Save state for any content updates
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
        if (state.theme) {
            document.body.className = `theme-${state.theme}`;
        }
        
        // Update input list and process button
        updateInputList();
        updateProcessButton();
    }

    /**
     * Generate unique ID for request-response pattern
     */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
        const container = document.getElementById('url-input-container');
        const githubContainer = document.getElementById('github-input-container');
        
        if (container) {
            container.classList.remove('hidden');
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
        const container = document.getElementById('github-input-container');
        const urlContainer = document.getElementById('url-input-container');
        
        if (container) {
            container.classList.remove('hidden');
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
            
            // Add to inputs
            state.inputs.push({
                uri: url,
                name: url,
                type: 'url'
            });
            
            updateInputList();
            updateProcessButton();
            
            // Clear and hide input
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
            
            // Add to inputs
            state.inputs.push({
                uri: url,
                name: `GitHub PR: ${url.split('/').pop()}`,
                type: 'github_pr'
            });
            
            updateInputList();
            updateProcessButton();
            
            // Clear and hide input
            input.value = '';
            container.classList.add('hidden');
        }
    }

    /**
     * Handle process inputs
     */
    function handleProcessInputs() {
        const goalInput = document.getElementById('goal-input');
        const goal = goalInput ? goalInput.value.trim() : '';
        
        if (state.inputs.length === 0 || !goal) {
            showLocalMessage('Please add inputs and describe your goal', 'error');
            return;
        }
        
        log('info', 'Processing inputs with goal:', goal);
        state.goal = goal;
        
        // Disable process button
        const processBtn = document.getElementById('process-btn');
        if (processBtn) {
            processBtn.disabled = true;
            processBtn.textContent = 'Processing...';
        }
        
        // Send process request
        sendMessage({
            type: MessageType.PROCESS_INPUTS,
            payload: {
                goal: goal,
                inputs: state.inputs
            },
            id: generateId()
        });
    }

    /**
     * Handle clear all
     */
    function handleClearAll() {
        state.inputs = [];
        state.goal = '';
        
        const goalInput = document.getElementById('goal-input');
        if (goalInput) {
            goalInput.value = '';
        }
        
        updateInputList();
        updateProcessButton();
        
        // Hide response section
        const responseSection = document.getElementById('response-section');
        if (responseSection) {
            responseSection.classList.add('hidden');
        }
        
        // Clear processing status
        const statusEl = document.getElementById('processing-status');
        if (statusEl) {
            statusEl.classList.add('hidden');
            statusEl.textContent = '';
        }
    }

    /**
     * Update input list display
     */
    function updateInputList() {
        const listEl = document.getElementById('input-list');
        if (!listEl) return;
        
        if (state.inputs.length === 0) {
            listEl.innerHTML = '<div style="color: var(--vscode-descriptionForeground); text-align: center; padding: 20px;">No inputs added yet</div>';
        } else {
            listEl.innerHTML = state.inputs.map((input, index) => `
                <div class="input-item">
                    <span class="input-item-name">${input.name}</span>
                    <span class="input-item-type">${input.type}</span>
                    <button class="input-item-remove" onclick="removeInput(${index})">✕</button>
                </div>
            `).join('');
        }
        
        // Save state
        vscode.setState(state);
    }

    /**
     * Remove input item
     */
    window.removeInput = function(index) {
        state.inputs.splice(index, 1);
        updateInputList();
        updateProcessButton();
    };

    /**
     * Update process button state
     */
    function updateProcessButton() {
        const processBtn = document.getElementById('process-btn');
        const goalInput = document.getElementById('goal-input');
        
        if (processBtn) {
            const hasInputs = state.inputs.length > 0;
            const hasGoal = goalInput && goalInput.value.trim().length > 0;
            
            processBtn.disabled = !(hasInputs && hasGoal);
            processBtn.textContent = 'Process with Copilot';
        }
    }

    /**
     * Handle processing status
     */
    function handleProcessingStatus(payload) {
        const statusEl = document.getElementById('processing-status');
        const processBtn = document.getElementById('process-btn');
        
        if (statusEl) {
            statusEl.classList.remove('hidden', 'processing', 'complete', 'error');
            statusEl.classList.add(payload.status);
            statusEl.textContent = payload.message;
            
            if (payload.status === 'complete' || payload.status === 'error') {
                // Re-enable process button
                if (processBtn) {
                    processBtn.disabled = false;
                    processBtn.textContent = 'Process with Copilot';
                    updateProcessButton();
                }
                
                // Hide status after 5 seconds if complete
                if (payload.status === 'complete') {
                    setTimeout(() => {
                        statusEl.classList.add('hidden');
                    }, 5000);
                }
            }
        }
    }

    /**
     * Handle Copilot response
     */
    function handleCopilotResponse(payload) {
        const responseSection = document.getElementById('response-section');
        const responseContent = document.getElementById('response-content');
        
        if (responseSection && responseContent) {
            responseSection.classList.remove('hidden');
            responseContent.textContent = payload.response;
            
            // Add sources if available
            if (payload.sources && payload.sources.length > 0) {
                const sourcesHtml = `\n\n---\nSources:\n${payload.sources.map(s => `• ${s}`).join('\n')}`;
                responseContent.textContent += sourcesHtml;
            }
            
            // Scroll to response
            responseSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
})();
