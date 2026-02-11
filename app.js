// ===============================
// CONFIGURATION
// ===============================
const CONFIG = {
    BACKEND_URL: "https://hate-speach-detection-model.onrender.com/analyze",
    MAX_INPUT_LENGTH: 2000,
    REQUEST_TIMEOUT: 30000 // 30 seconds for backend response
};

// ===============================
// DOM ELEMENTS
// ===============================
const DOM = {
    inputText: document.getElementById("inputText"),
    analyzeBtn: document.getElementById("analyzeBtn"),
    loader: document.getElementById("loader"),
    resultBox: document.getElementById("resultBox"),
    verdictText: document.getElementById("verdict"),
    
    // Category bars
    categories: {
        hate: document.getElementById("hate"),
        harassment: document.getElementById("harassment"),
        selfHarm: document.getElementById("self-harm"),
        sexual: document.getElementById("sexual"),
        violence: document.getElementById("violence")
    }
};

// ===============================
// INITIALIZATION
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Hate Speech Detector Initialized');
    console.log('📡 Backend URL:', CONFIG.BACKEND_URL);
    
    // Set up event listeners
    initializeEventListeners();
    
    // Initial UI state
    resetUI();
});

// ===============================
// EVENT LISTENERS
// ===============================
function initializeEventListeners() {
    // Analyze button click
    DOM.analyzeBtn.addEventListener("click", handleAnalyzeClick);
    
    // Enter key in textarea
    DOM.inputText.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            handleAnalyzeClick();
        }
    });
    
    // Character counter (if you want to add it)
    DOM.inputText.addEventListener("input", () => {
        const length = DOM.inputText.value.length;
        if (length > CONFIG.MAX_INPUT_LENGTH) {
            DOM.inputText.value = DOM.inputText.value.substring(0, CONFIG.MAX_INPUT_LENGTH);
        }
    });
}

// ===============================
// MAIN ANALYSIS HANDLER
// ===============================
async function handleAnalyzeClick() {
    const text = DOM.inputText.value.trim();

    // Validation
    if (!text) {
        showError("Please enter some text to analyze.");
        return;
    }

    if (text.length > CONFIG.MAX_INPUT_LENGTH) {
        showError(`Text is too long. Maximum ${CONFIG.MAX_INPUT_LENGTH} characters allowed.`);
        return;
    }

    // Start analysis
    showLoader(true);
    resetUI();
    setButtonState(true);

    try {
        console.log('📤 Sending request to backend...');
        const data = await analyzeText(text);
        console.log('📥 Received response:', data);
        
        processApiResponse(data);
    } catch (error) {
        console.error('❌ Analysis failed:', error);
        handleError(error);
    } finally {
        showLoader(false);
        setButtonState(false);
    }
}

// ===============================
// API CALL
// ===============================
async function analyzeText(text) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    try {
        const response = await fetch(CONFIG.BACKEND_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Check if response is ok
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        return await response.json();
        
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error('Request timeout. The server took too long to respond. Please try again.');
        }
        
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Cannot connect to server. Please check your internet connection.');
        }
        
        throw error;
    }
}

// ===============================
// RESPONSE PROCESSING
// ===============================
function processApiResponse(data) {
    // Validate response structure
    if (!data || !data.results || !data.results[0]) {
        throw new Error("Invalid response format from server");
    }

    const result = data.results[0];
    const flagged = result.flagged;
    const categories = result.categories; // boolean flags
    const scores = result.category_scores; // actual scores (0-1)

    console.log('Analysis Results:', {
        flagged,
        categories,
        scores
    });

    // Display overall verdict
    displayVerdict(flagged);

    // Update category bars with scores
    updateCategoryBar("hate", scores.hate, categories.hate);
    updateCategoryBar("harassment", scores.harassment, categories.harassment);
    updateCategoryBar("selfHarm", scores["self-harm"], categories["self-harm"]);
    updateCategoryBar("sexual", scores.sexual, categories.sexual);
    updateCategoryBar("violence", scores.violence, categories.violence);

    // Show results
    DOM.resultBox.style.display = "block";
}

// ===============================
// UI UPDATES
// ===============================
function displayVerdict(flagged) {
    if (flagged) {
        DOM.verdictText.innerHTML = `
            <span style="color: #ef4444; font-weight: 600;">
                🚨 Potentially Harmful Content Detected
            </span>
        `;
    } else {
        DOM.verdictText.innerHTML = `
            <span style="color: #10b981; font-weight: 600;">
                ✅ Content Appears Safe
            </span>
        `;
    }
}

function updateCategoryBar(categoryKey, score, flagged) {
    const element = DOM.categories[categoryKey];
    if (!element) {
        console.warn(`Category element not found: ${categoryKey}`);
        return;
    }

    // Convert score from 0-1 to 0-100
    const percentage = Math.round(score * 100);
    
    // Update bar width
    element.style.width = `${Math.max(percentage, 2)}%`; // Minimum 2% for visibility
    
    // Update bar text and color
    if (flagged) {
        element.innerText = `⚠️ ${percentage}% - FLAGGED`;
        element.style.backgroundColor = "#ef4444"; // red
    } else if (percentage > 50) {
        element.innerText = `${percentage}% - High Risk`;
        element.style.backgroundColor = "#f59e0b"; // orange
    } else if (percentage > 20) {
        element.innerText = `${percentage}% - Medium`;
        element.style.backgroundColor = "#fbbf24"; // yellow
    } else {
        element.innerText = `${percentage}% - Low`;
        element.style.backgroundColor = "#10b981"; // green
    }
}

function showLoader(show) {
    DOM.loader.style.display = show ? "block" : "none";
}

function setButtonState(analyzing) {
    if (analyzing) {
        DOM.analyzeBtn.disabled = true;
        DOM.analyzeBtn.innerHTML = `
            <span style="display: flex; align-items: center; gap: 8px;">
                <span class="spinner"></span>
                Analyzing...
            </span>
        `;
    } else {
        DOM.analyzeBtn.disabled = false;
        DOM.analyzeBtn.innerHTML = "Analyze Text";
    }
}

function resetUI() {
    DOM.verdictText.innerHTML = "";
    DOM.resultBox.style.display = "none";

    // Reset all category bars
    Object.values(DOM.categories).forEach(bar => {
        if (bar) {
            bar.style.width = "0%";
            bar.innerText = "";
            bar.style.backgroundColor = "#cbd5e1";
        }
    });
}

// ===============================
// ERROR HANDLING
// ===============================
function handleError(error) {
    let message = "⚠️ Error: " + error.message;
    
    // Add helpful context
    if (error.message.includes('timeout')) {
        message += "\n\n💡 Tip: The backend might be sleeping (Render free tier). Please wait 30 seconds and try again.";
    } else if (error.message.includes('connect')) {
        message += "\n\n💡 Tip: Check if the backend URL is correct and the server is running.";
    }
    
    DOM.verdictText.innerHTML = `
        <div style="color: #ef4444; white-space: pre-line;">
            ${message}
        </div>
    `;
    DOM.resultBox.style.display = "block";
}

function showError(message) {
    alert(message);
}

// ===============================
// UTILITY FUNCTIONS
// ===============================
function testBackendConnection() {
    console.log('🔍 Testing backend connection...');
    fetch(CONFIG.BACKEND_URL.replace('/analyze', '/'))
        .then(response => response.text())
        .then(data => console.log('✅ Backend is running:', data))
        .catch(error => console.error('❌ Backend connection failed:', error));
}

// Optional: Test connection on load
// testBackendConnection();

// ===============================
// CONSOLE STYLING
// ===============================
console.log('%c🛡️ SafeGuard Hate Speech Detector', 'font-size: 16px; font-weight: bold; color: #6366f1;');
console.log('%cBackend: ' + CONFIG.BACKEND_URL, 'color: #94a3b8;');
console.log('%cPress Ctrl+Enter in the text area to analyze quickly!', 'color: #10b981;');