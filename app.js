// ===============================
// CONFIG
// ===============================
const BACKEND_URL = "https://hate-speach-detection-model.onrender.com/analyze";

// ===============================
// DOM ELEMENTS
// ===============================
const inputText = document.getElementById("inputText");
const analyzeBtn = document.getElementById("analyzeBtn");
const loader = document.getElementById("loader");
const resultBox = document.getElementById("resultBox");
const verdictText = document.getElementById("verdict");

// Category bars (optional but recommended)
const categories = {
    hate: document.getElementById("hate"),
    harassment: document.getElementById("harassment"),
    selfHarm: document.getElementById("self-harm"),
    sexual: document.getElementById("sexual"),
    violence: document.getElementById("violence")
};

// ===============================
// EVENT LISTENER
// ===============================
analyzeBtn.addEventListener("click", async () => {
    const text = inputText.value.trim();

    if (!text) {
        alert("Please enter some text to analyze.");
        return;
    }

    showLoader(true);
    resetUI();

    try {
        const data = await analyzeText(text);
        processApiResponse(data);
    } catch (error) {
        console.error(error);
        verdictText.innerText = "⚠️ Error analyzing text. Try again.";
    } finally {
        showLoader(false);
    }
});

// ===============================
// API CALL
// ===============================
async function analyzeText(text) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ text }),
        signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
        throw new Error("Backend request failed");
    }

    return response.json();
}

// ===============================
// RESPONSE HANDLING
// ===============================
function processApiResponse(data) {
    if (!data.results || !data.results[0]) {
        verdictText.innerText = "Invalid response from server.";
        return;
    }

    const result = data.results[0];
    const flagged = result.flagged;

    verdictText.innerText = flagged
        ? "🚨 Hate / Toxic Content Detected"
        : "✅ Content Appears Safe";

    updateCategory("hate", result.categories.hate);
    updateCategory("harassment", result.categories.harassment);
    updateCategory("selfHarm", result.categories["self-harm"]);
    updateCategory("sexual", result.categories.sexual);
    updateCategory("violence", result.categories.violence);

    resultBox.style.display = "block";
}

// ===============================
// UI HELPERS
// ===============================
function updateCategory(category, value) {
    if (!categories[category]) return;

    categories[category].style.width = value ? "100%" : "5%";
    categories[category].innerText = value ? "Detected" : "Clean";
}

function showLoader(show) {
    loader.style.display = show ? "block" : "none";
}

function resetUI() {
    verdictText.innerText = "";
    resultBox.style.display = "none";

    Object.values(categories).forEach(bar => {
        if (bar) {
            bar.style.width = "0%";
            bar.innerText = "";
        }
    });
}
