
// API Configuration
const HUGGING_FACE_TOKEN = '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'; // Get this from huggingface.co
const API_ENDPOINT = 'https://api-inference.huggingface.co/models/microsoft/ResNet-50';  // This is a general image analysis model

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    resetApp();
});

function setupEventListeners() {
    const imageInput = document.getElementById('imageInput');
    const uploadForm = document.getElementById('uploadForm');

    if (imageInput) {
        imageInput.addEventListener('change', handleImageSelection);
    }

    if (uploadForm) {
        uploadForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            await initiateScanProcess();
        });
    }
}

function handleImageSelection() {
    const imageInput = document.getElementById("imageInput");
    const filePathInput = document.querySelector(".file-path");
    const scanBtn = document.getElementById("scanBtn");

    if (imageInput && filePathInput && scanBtn) {
        if (imageInput.files.length > 0) {
            const fileName = imageInput.files[0].name;
            filePathInput.value = fileName;
            displayImage(imageInput.files[0]);
            scanBtn.disabled = false;
        } else {
            filePathInput.value = '';
            scanBtn.disabled = true;
        }
    }
}

function displayImage(file) {
    const imagePreview = document.getElementById("imagePreview");
    if (!imagePreview) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        imagePreview.innerHTML = `<img src="${event.target.result}" alt="Uploaded Image" class="preview-image" />`;
    };
    reader.readAsDataURL(file);
}

async function initiateScanProcess() {
    const scanBtn = document.getElementById("scanBtn");
    const resultDiv = document.getElementById("result");
    const imageInput = document.getElementById("imageInput");

    if (!imageInput.files.length) {
        showError("Please upload an image first.");
        return;
    }

    scanBtn.disabled = true;
    resultDiv.innerHTML = "<p>Analyzing image, please wait...</p>";

    try {
        const imageData = await readFileAsArrayBuffer(imageInput.files[0]);
        const result = await analyzeImage(imageData);
        displayResults(result);
    } catch (error) {
        console.error("Analysis error:", error);
        showError("Error analyzing the image. Please try again.");
    } finally {
        scanBtn.disabled = false;
    }
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

async function analyzeImage(imageData) {
    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`
        },
        body: imageData
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

function displayResults(results) {
    const resultDiv = document.getElementById("result");
    if (!resultDiv) return;

    // Sort results by confidence score
    const sortedResults = results.sort((a, b) => b.score - a.score);
    
    const resultHTML = `
        <div class="result-card">
            <h5><i class="fas fa-notes-medical"></i> Analysis Results</h5>
            ${sortedResults.slice(0, 5).map(result => `
                <div class="result-item">
                    <p><strong>Finding:</strong> ${formatLabel(result.label)}</p>
                    <p><strong>Confidence:</strong> ${(result.score * 100).toFixed(2)}%</p>
                </div>
            `).join('')}
            <div class="disclaimer">
                <p><i class="fas fa-exclamation-triangle"></i> This is an AI-assisted analysis and should not be used as a substitute for professional medical advice.</p>
            </div>
        </div>
    `;

    resultDiv.innerHTML = resultHTML;
}

function formatLabel(label) {
    return label
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function showError(message) {
    const resultDiv = document.getElementById("result");
    if (!resultDiv) return;

    resultDiv.innerHTML = `
        <div class="error-card">
            <h5><i class="fas fa-exclamation-triangle"></i> Error</h5>
            <p>${message}</p>
        </div>
    `;
}

function resetApp() {
    const uploadForm = document.getElementById("uploadForm");
    const imagePreview = document.getElementById("imagePreview");
    const resultDiv = document.getElementById("result");
    const scanBtn = document.getElementById("scanBtn");

    if (uploadForm) uploadForm.reset();
    if (imagePreview) imagePreview.innerHTML = '';
    if (resultDiv) resultDiv.innerHTML = '';
    if (scanBtn) scanBtn.disabled = true;
}
