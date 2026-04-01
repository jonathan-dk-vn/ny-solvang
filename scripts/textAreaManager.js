// textAreaManager.js - Updated module to manage single text area
/**
 * @module textAreaManager
 * Manages fancy text areas for audio dictation with enhanced features
 * Cross-platform support for macOS and Windows/Linux
 * UPDATED: Uses a wrapper div to contain layout shifts.
 */

import { elements } from "./domElements.js";
import debugLog from "./util/debug.js";

// Constants for text area management
const TEXTAREA_MIN_HEIGHT = 120;
const TEXTAREA_MAX_HEIGHT = 400;
const HEIGHT_PER_MINUTE = 30;
const AUDIO_BASE_URL = "https://pub-972fa9cd102b4f668be539d1ad1f76e3.r2.dev/";
const ANIMATION_TIMEOUT = 1000; // Safety net timeout in ms

// Global state for text areas
let audioTextAreas = new Map();
let currentAudioWrapper = null; // NEW: Track the wrapper div

// DEBUG FUNCTION: Helper to log the position of an element
function logElementPosition(element, eventName) {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    debugLog(`%c[DEBUG] Vị trí nút audio tại sự kiện '${eventName}':`, 'color: #007acc;', {
        top: rect.top.toFixed(2),
        left: rect.left.toFixed(2),
        height: rect.height.toFixed(2)
    });
}


/**
 * Detect operating system for proper keyboard shortcuts
 */
function isMacOS() {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
           navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
}

/**
 * Get the appropriate modifier key text for the current OS
 */
function getModifierKeyText() {
    return isMacOS() ? 'Cmd' : 'Ctrl';
}

/**
 * Calculate optimal textarea height based on audio duration
 */
function calculateTextAreaHeight(duration) {
    if (!duration || duration <= 0) return TEXTAREA_MIN_HEIGHT;
    
    const durationMinutes = duration / 60;
    const calculatedHeight = durationMinutes * HEIGHT_PER_MINUTE;
    
    return Math.min(
        TEXTAREA_MAX_HEIGHT,
        Math.max(TEXTAREA_MIN_HEIGHT, calculatedHeight)
    );
}

/**
 * Format duration for display
 */
function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return 'Unknown duration';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Create enhanced text area with OS-aware shortcuts in placeholder
 */
function createEnhancedTextArea(audioButton, audioDuration = null) {
    const container = document.createElement('div');
    container.className = 'audio-textarea-container';
    
    const textareaHeight = calculateTextAreaHeight(audioDuration);
    const audioTitle = audioButton.querySelector('span')?.textContent || 'Audio';
    const audioSrc = audioButton.dataset.audiosrc;
    
    container.innerHTML = `
        <div class="textarea-header">
            <div class="textarea-title">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Dictation: ${audioTitle}
            </div>
            <div class="textarea-actions">
                <button class="textarea-btn textarea-btn-expand active" title="Toggle auto-expand" data-action="expand">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clip-rule="evenodd" />
                    </svg>
                </button>
                <button class="textarea-btn textarea-btn-timestamp" title="Insert timestamp (Tab)" data-action="timestamp">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                    </svg>
                </button>
                <button class="textarea-btn textarea-btn-clear" title="Clear text" data-action="clear">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
                <button class="textarea-btn textarea-btn-copy" title="Copy text" data-action="copy">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                </button>
                <button class="textarea-btn textarea-btn-save" title="Save/Download text" data-action="save">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
        <div class="textarea-wrapper">
            <textarea 
                class="fancy-textarea auto-expand" 
                placeholder="🎧 Start typing what you hear...\n\n✨ Don't worry about space - just keep typing!"
                style="height: ${textareaHeight}px; min-height: ${textareaHeight}px;"
                data-audio-src="${audioSrc}"
                data-original-height="${textareaHeight}"
                data-auto-expand="true"
                spellcheck="true"
                autocomplete="off"
                rows="10"
            ></textarea>
            <div class="textarea-stats">
                <span class="word-count">0 words</span>
                <span class="char-count">0 characters</span>
                <span class="line-count">1 lines</span>
                <span class="typing-speed">0 wpm</span>
                <span class="audio-duration">${formatDuration(audioDuration)}</span>
            </div>
        </div>
    `;
    
    return container;
}

/**
 * Initialize textarea with all functionality
 */
function initializeTextArea(textAreaContainer, audioButton) {
    const textarea = textAreaContainer.querySelector('.fancy-textarea');
    const audioSrc = audioButton.dataset.audiosrc;
    const saveKey = `dictation_${audioSrc}`;
    
    // Store reference
    audioTextAreas.set(audioSrc, {
        container: textAreaContainer,
        textarea,
        audioButton,
        saveKey,
        stats: {
            wordCount: textAreaContainer.querySelector('.word-count'),
            charCount: textAreaContainer.querySelector('.char-count'),
            lineCount: textAreaContainer.querySelector('.line-count'),
            typingSpeed: textAreaContainer.querySelector('.typing-speed'),
            audioDuration: textAreaContainer.querySelector('.audio-duration')
        },
        typingData: {
            startTime: null,
            totalChars: 0,
            intervals: []
        }
    });
    
    // Load saved content
    const savedText = localStorage.getItem(saveKey);
    if (savedText) {
        textarea.value = savedText;
        updateStats(audioSrc);
    }
    
    // Set up event listeners
    setupTextAreaEvents(audioSrc);
    setupButtonEvents(textAreaContainer, audioSrc);
    
    // Initialize stats
    updateStats(audioSrc);
}

/**
 * Auto-resize textarea functionality
 */
function autoResizeTextarea(textarea) {
    if (textarea.dataset.autoExpand !== 'true') return;
    
    const scrollTop = textarea.scrollTop;
    textarea.style.height = 'auto';
    const originalHeight = parseInt(textarea.dataset.originalHeight) || TEXTAREA_MIN_HEIGHT;
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 24;
    const contentHeight = Math.max(originalHeight, scrollHeight);
    const extraPadding = lineHeight * 3;
    const newHeight = Math.min(TEXTAREA_MAX_HEIGHT, contentHeight + extraPadding);
    textarea.style.height = newHeight + 'px';
    
    if (scrollTop > 0) {
        textarea.scrollTop = scrollTop;
    }
}

/**
 * Set up textarea event listeners with auto-resize functionality
 */
function setupTextAreaEvents(audioSrc) {
    const textAreaData = audioTextAreas.get(audioSrc);
    if (!textAreaData) return;
    
    const { textarea, typingData } = textAreaData;
    let saveTimeout;
    let resizeTimeout;
    
    textarea.addEventListener('input', (e) => {
        updateStats(audioSrc);
        updateTypingSpeed(audioSrc, e);
        
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => autoResizeTextarea(textarea), 100);
        
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            localStorage.setItem(textAreaData.saveKey, textarea.value);
            debugLog(`💾 Auto-saved dictation for ${audioSrc}`);
        }, 2000);
    });
    
    textarea.addEventListener('paste', () => {
        setTimeout(() => autoResizeTextarea(textarea), 50);
    });
    
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            setTimeout(() => autoResizeTextarea(textarea), 10);
        }
        handleKeyboardShortcuts(e, audioSrc);
    });
    
    textarea.addEventListener('focus', () => {
        typingData.startTime = Date.now();
        typingData.totalChars = textarea.value.length;
        autoResizeTextarea(textarea);
    });
    
    textarea.addEventListener('blur', () => {
        typingData.startTime = null;
    });
    
    setTimeout(() => autoResizeTextarea(textarea), 100);
}

/**
 * Handle enhanced keyboard shortcuts with cross-platform support
 */
function handleKeyboardShortcuts(event, audioSrc) {
    const textAreaData = audioTextAreas.get(audioSrc);
    if (!textAreaData) return;
    
    const { audioButton } = textAreaData;
    const gp = elements.globalPlayer;
    const isCurrentAudio = gp.audio.src === AUDIO_BASE_URL + audioSrc;
    const modifierPressed = isMacOS() ? (event.metaKey || event.cmdKey) : event.ctrlKey;
    
    if (modifierPressed && event.code === 'Space') {
        event.preventDefault();
        if (!isCurrentAudio) {
            audioButton.click();
        } else {
            gp.audio.paused ? gp.audio.play() : gp.audio.pause();
        }
    }
    
    if (modifierPressed && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        if (isCurrentAudio) {
            const newTime = event.key === 'ArrowLeft' 
                ? Math.max(0, gp.audio.currentTime - 5)
                : Math.min(gp.audio.duration || 0, gp.audio.currentTime + 5);
            gp.audio.currentTime = newTime;
        }
    }
    
    if (modifierPressed && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        if (isCurrentAudio) {
            gp.audio.currentTime = Math.max(0, gp.audio.currentTime - 10);
        }
    }
    
    if (event.key === 'Tab' && !event.shiftKey && !modifierPressed) {
        event.preventDefault();
        insertTimestamp(audioSrc);
    }
    
    if (modifierPressed && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveTextAsFile(audioSrc);
    }
}

/**
 * Insert timestamp at cursor position
 */
function insertTimestamp(audioSrc) {
    const textAreaData = audioTextAreas.get(audioSrc);
    if (!textAreaData) return;
    
    const { textarea } = textAreaData;
    const gp = elements.globalPlayer;
    const isCurrentAudio = gp.audio.src === AUDIO_BASE_URL + audioSrc;
    
    if (!isCurrentAudio) {
        debugLog('warn', "Cannot insert timestamp: audio not loaded.");
        return;
    }
    
    const currentTime = gp.audio.currentTime;
    const timestamp = `[${formatDuration(currentTime)}] `;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    textarea.value = textarea.value.substring(0, start) + timestamp + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + timestamp.length;
    
    updateStats(audioSrc);
    localStorage.setItem(textAreaData.saveKey, textarea.value);
}

/**
 * Set up button event listeners
 */
function setupButtonEvents(container, audioSrc) {
    container.querySelectorAll('.textarea-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const action = button.dataset.action;
            handleButtonAction(action, audioSrc, button);
        });
    });
}

/**
 * Handle button actions
 */
async function handleButtonAction(action, audioSrc, button) {
    const textAreaData = audioTextAreas.get(audioSrc);
    if (!textAreaData) return;
    
    const { textarea } = textAreaData;
    
    switch (action) {
        case 'expand':
            toggleAutoExpand(audioSrc, button);
            break;
            
        case 'timestamp':
            insertTimestamp(audioSrc);
            break;
            
        case 'clear':
            if (textarea.value.trim() && confirm('Are you sure you want to clear all text?')) {
                textarea.value = '';
                localStorage.removeItem(textAreaData.saveKey);
                updateStats(audioSrc);
                const originalHeight = parseInt(textarea.dataset.originalHeight) || TEXTAREA_MIN_HEIGHT;
                textarea.style.height = originalHeight + 'px';
                textarea.focus();
            }
            break;
            
        case 'copy':
            if (!textarea.value.trim()) return;
            try {
                await navigator.clipboard.writeText(textarea.value);
            } catch (err) {
                textarea.select();
                document.execCommand('copy');
            }
            break;
            
        case 'save':
            await saveTextAsFile(audioSrc, button);
            break;
    }
}

/**
 * Toggle auto-expand functionality
 */
function toggleAutoExpand(audioSrc, button) {
    const textAreaData = audioTextAreas.get(audioSrc);
    if (!textAreaData) return;
    
    const { textarea } = textAreaData;
    const isAutoExpand = textarea.dataset.autoExpand === 'true';
    
    if (isAutoExpand) {
        textarea.dataset.autoExpand = 'false';
        textarea.classList.remove('auto-expand');
        const originalHeight = parseInt(textarea.dataset.originalHeight) || TEXTAREA_MIN_HEIGHT;
        textarea.style.height = originalHeight + 'px';
        textarea.style.resize = 'vertical';
        button.classList.remove('active');
        button.title = 'Enable auto-expand';
    } else {
        textarea.dataset.autoExpand = 'true';
        textarea.classList.add('auto-expand');
        textarea.style.resize = 'none';
        setTimeout(() => autoResizeTextarea(textarea), 10);
        button.classList.add('active');
        button.title = 'Disable auto-expand';
    }
}

/**
 * Save text as downloadable file
 */
async function saveTextAsFile(audioSrc, button = null) {
    const textAreaData = audioTextAreas.get(audioSrc);
    if (!textAreaData) return;
    
    const { textarea, audioButton } = textAreaData;
    if (!textarea.value.trim()) return;
    
    if (button) {
        button.classList.add('loading');
        button.disabled = true;
    }
    
    try {
        const audioTitle = audioButton.querySelector('span')?.textContent || 'Audio';
        const cleanTitle = audioTitle.replace(/[^a-z0-9]/gi, '_');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const filename = `dictation_${cleanTitle}_${timestamp}.txt`;
        const metadata = `\n=== METADATA ===\nAudio: ${audioTitle}\nDate: ${new Date().toLocaleString()}\nWords: ${textarea.value.trim().split(/\s+/).length}\nChars: ${textarea.value.length}\nPlatform: ${isMacOS() ? 'macOS' : 'Windows/Linux'}\n`;
        
        const fullContent = textarea.value + metadata;
        const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        if (button) {
            button.classList.add('success');
            setTimeout(() => button.classList.remove('success'), 2000);
        }
    } catch (error) {
        debugLog('error', 'Save error:', error);
    } finally {
        if (button) {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }
}

/**
 * Update statistics display
 */
function updateStats(audioSrc) {
    const textAreaData = audioTextAreas.get(audioSrc);
    if (!textAreaData) return;
    
    const { textarea, stats } = textAreaData;
    const text = textarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = textarea.value.length;
    const lines = textarea.value.split('\n').length;
    
    stats.wordCount.textContent = `${words} words`;
    stats.charCount.textContent = `${chars} characters`;
    stats.lineCount.textContent = `${lines} lines`;
}

/**
 * Update typing speed calculation
 */
function updateTypingSpeed(audioSrc, event) {
    const textAreaData = audioTextAreas.get(audioSrc);
    if (!textAreaData || !textAreaData.typingData.startTime) return;
    
    const { typingData, stats } = textAreaData;
    const now = Date.now();
    const elapsed = (now - typingData.startTime) / 60000; // minutes
    const currentChars = event.target.value.length;
    const charsTyped = currentChars - typingData.totalChars;
    
    if (elapsed > 0 && charsTyped > 0) {
        const wordsPerMinute = Math.round((charsTyped / 5) / elapsed);
        stats.typingSpeed.textContent = `${wordsPerMinute} wpm`;
    }
}

/**
 * Get text area for specific audio source
 */
export function getTextAreaForAudio(audioSrc) {
    return audioTextAreas.get(audioSrc);
}

/**
 * Focus text area for currently playing audio
 */
export function focusCurrentAudioTextArea() {
    if (!currentAudioWrapper) return;
    const textarea = currentAudioWrapper.querySelector('.fancy-textarea');
    if (textarea) {
        textarea.focus();
    }
}

/**
 * Auto-focus textarea when audio starts playing
 */
export function setupAudioTextAreaSync() {
    elements.globalPlayer.audio.addEventListener('play', () => {
        setTimeout(focusCurrentAudioTextArea, 500);
    });
}

/**
 * Export saved dictations
 */
export async function exportAllDictations() {
    const savedDictations = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('dictation_')) {
            const content = localStorage.getItem(key);
            if (content && content.trim()) {
                savedDictations.push({ filename: key.replace('dictation_', '') + '.txt', content });
            }
        }
    }
    
    if (savedDictations.length === 0) return;
    
    for (const dictation of savedDictations) {
        const blob = new Blob([dictation.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_${dictation.filename}`;
        a.click();
        URL.revokeObjectURL(url);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

/**
 * Clear all saved dictations
 */
export function clearAllDictations() {
    const dictationKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('dictation_')) {
            dictationKeys.push(key);
        }
    }
    
    if (dictationKeys.length === 0) return;
    
    if (confirm(`Clear ${dictationKeys.length} saved dictations? This cannot be undone.`)) {
        dictationKeys.forEach(key => localStorage.removeItem(key));
        audioTextAreas.forEach(({ textarea }) => { textarea.value = ''; });
    }
}

/**
 * Set up global keyboard shortcuts for text area management
 */
export function setupGlobalTextAreaKeyboards() {
    document.addEventListener('keydown', (e) => {
        const modifier = e.ctrlKey || e.metaKey;
        if (modifier && e.shiftKey) {
            if (e.key === 'D') { e.preventDefault(); focusCurrentAudioTextArea(); }
            if (e.key === 'E') { e.preventDefault(); exportAllDictations(); }
            if (e.key === 'Delete') { e.preventDefault(); clearAllDictations(); }
        }
    });
}

/**
 * Initialize the text area system
 */
export function initializeTextAreaSystem() {
    setupGlobalTextAreaKeyboards();
    debugLog('✅ Text Area System initialized.');
}

/**
 * Create text area for a single audio button using the wrapper method.
 */
export async function createTextAreaForAudioButton(audioButton) {
    if (!audioButton) {
        debugLog('error', "⛔ [createTextArea] Lỗi: audioButton không tồn tại.");
        return;
    }

    const audioSrcPath = audioButton.dataset.audiosrc;
    const startTime = performance.now();
    debugLog(`🎬 [${startTime.toFixed(2)}ms] [createTextArea] Bắt đầu tạo Text Area cho: ${audioSrcPath}`);

    // Get the paragraph containing the button
    const p = audioButton.closest('p');
    if (!p) {
        debugLog('error', "⛔ [createTextArea] Không tìm thấy thẻ <p> chứa nút audio.");
        return;
    }

    // Create wrapper and move paragraph into it
    const wrapper = document.createElement('div');
    wrapper.className = 'audio-wrapper';
    p.parentNode.insertBefore(wrapper, p);
    wrapper.appendChild(p);
    
    currentAudioWrapper = wrapper;
    logElementPosition(audioButton, 'Sau khi tạo Wrapper');


    // Fetch audio duration to calculate height
    const audioDuration = await getAudioDuration(audioSrcPath);

    const textAreaContainer = createEnhancedTextArea(audioButton, audioDuration);

    // Set initial state for animation
    textAreaContainer.style.opacity = '0';
    textAreaContainer.style.transform = 'translateY(-20px)';
    textAreaContainer.classList.add('transition-in');

    // Insert into wrapper
    wrapper.appendChild(textAreaContainer);
    initializeTextArea(textAreaContainer, audioButton);
    logElementPosition(audioButton, 'Sau khi chèn Text Area');


    const domInsertTime = performance.now();
    debugLog(`🎬 [${domInsertTime.toFixed(2)}ms] [createTextArea] Đã chèn vào DOM. Bắt đầu animation...`);

    // Trigger the animation
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            textAreaContainer.style.opacity = '1';
            textAreaContainer.style.transform = 'translateY(0)';
            
            // Resolve after the transition ends or a timeout occurs
            const onTransitionEnd = () => {
                logElementPosition(audioButton, 'Animation Text Area hoàn tất');
                debugLog(`✅ [${performance.now().toFixed(2)}ms] [createTextArea] Animation hoàn tất.`);
                textAreaContainer.removeEventListener('transitionend', onTransitionEnd);
                resolve();
            };
            textAreaContainer.addEventListener('transitionend', onTransitionEnd, { once: true });
            setTimeout(() => { // Safety net
                onTransitionEnd(); 
            }, ANIMATION_TIMEOUT);
        });
    });
}

export function removeCurrentTextArea() {
    if (!currentAudioWrapper) {
        debugLog("🤔 [removeTextArea] Không có Text Area/Wrapper nào để xóa.");
        return Promise.resolve();
    }

    const wrapperToRemove = currentAudioWrapper;
    const p = wrapperToRemove.querySelector('p');
    const textAreaContainer = wrapperToRemove.querySelector('.audio-textarea-container');
    const audioSrc = textAreaContainer?.querySelector('.fancy-textarea')?.dataset.audioSrc || 'unknown';

    const startTime = performance.now();
    debugLog(`🎬 [${startTime.toFixed(2)}ms] [removeTextArea] Bắt đầu xóa Text Area cho: ${audioSrc}`);

    currentAudioWrapper = null;
    if (audioSrc !== 'unknown') {
        audioTextAreas.delete(audioSrc);
    }
    
    // Animate out
    wrapperToRemove.style.transition = 'opacity 0.3s ease-out';
    wrapperToRemove.style.opacity = '0';

    return new Promise(resolve => {
        setTimeout(() => {
            if (p) {
                // Move paragraph back out of the wrapper
                wrapperToRemove.parentNode.insertBefore(p, wrapperToRemove);
            }
            // Remove the now-empty wrapper
            wrapperToRemove.remove();
            
            const endTime = performance.now();
            debugLog(`✅ [${endTime.toFixed(2)}ms] [removeTextArea] Đã xóa khỏi DOM. Tổng thời gian: ${(endTime - startTime).toFixed(2)}ms`);
            resolve();
        }, 300); // Wait for opacity animation
    });
}

function getAudioDuration(audioSrcPath) {
    return new Promise(resolve => {
        const audio = new Audio(AUDIO_BASE_URL + audioSrcPath);
        audio.addEventListener('loadedmetadata', () => resolve(audio.duration), { once: true });
        audio.addEventListener('error', () => resolve(null), { once: true });
    });
}