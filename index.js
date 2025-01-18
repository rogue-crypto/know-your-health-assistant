// API Configuration
const API_KEY = 'AIzaSyBCy_XXLemCxYoaQgaz_YaneyHXWCJgk8k'; // Replace with your actual API key
const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';

// DOM Elements
const elements = {
    form: document.getElementById('uploadForm'),
    imageInput: document.getElementById('imageInput'),
    filePathDisplay: document.querySelector('.file-path'),
    scanButton: document.getElementById('scanBtn'),
    imagePreview: document.getElementById('imagePreview'),
    resultContainer: document.getElementById('result'),
    loadingOverlay: document.getElementById('loadingOverlay')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    resetUI();
});

function setupEventListeners() {
    elements.imageInput?.addEventListener('change', handleImageSelection);
    elements.form?.addEventListener('submit', handleFormSubmission);
}

function handleImageSelection(event) {
    const file = event.target.files[0];
    if (file) {
        elements.filePathDisplay.value = file.name;
        displayImagePreview(file);
        elements.scanButton.disabled = false;
    } else {
        resetUI();
    }
}

function displayImagePreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        elements.imagePreview.innerHTML = `
            <div class="preview-container">
                <img src="${e.target.result}" alt="Preview" class="preview-image"/>
                <button type="button" class="remove-image" onclick="resetUI()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    };
    reader.readAsDataURL(file);
}

async function handleFormSubmission(event) {
    event.preventDefault();
    
    const file = elements.imageInput.files[0];
    if (!file) {
        showError('Please select an image first.');
        return;
    }

    try {
        showLoading(true);
        const result = await analyzeImage(file);
        displayResults(result);
    } catch (error) {
        console.error('Analysis error:', error);
        showError('Failed to analyze image. Please make sure your API key is valid and try again.');
    } finally {
        showLoading(false);
    }
}

async function analyzeImage(file) {
    const base64Image = await convertToBase64(file);
    
    // New Gemini API payload structure
    const payload = {
        contents: [
            {
                parts: [
                    {
                        text: "Analyze this medical image and provide a detailed assessment. Include condition name, confidence level, symptoms observed, and recommendations."
                    },
                    {
                        inlineData: {
                            mimeType: file.type,
                            data: base64Image
                        }
                    }
                ]
            }
        ]
    };

    const response = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return await response.json();
}

function displayResults(data) {
    try {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            throw new Error('Invalid response format');
        }

        elements.resultContainer.innerHTML = `
            <div class="result-card">
                <div class="result-header">
                    <h3><i class="fas fa-clipboard-check"></i> Analysis Results</h3>
                </div>
                
                <div class="result-body">
                    <div class="result-section">
                        ${formatAnalysisText(text)}
                    </div>
                </div>

                <div class="result-footer">
                    <p class="disclaimer">
                        <i class="fas fa-exclamation-triangle"></i>
                        This is an AI-generated assessment and should not replace professional medical advice.
                    </p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Parsing error:', error);
        showError('Error processing the analysis results.');
    }
}

function formatAnalysisText(text) {
    // Split the text into paragraphs and format them
    return text.split('\n')
        .filter(line => line.trim())
        .map(line => `<p>${line}</p>`)
        .join('');
}

async function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function showLoading(show) {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    }
    if (elements.scanButton) {
        elements.scanButton.disabled = show;
    }
}

function showError(message) {
    if (elements.resultContainer) {
        elements.resultContainer.innerHTML = `
            <div class="error-card">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;
    }
}

function resetUI() {
    if (elements.form) elements.form.reset();
    if (elements.filePathDisplay) elements.filePathDisplay.value = '';
    if (elements.imagePreview) elements.imagePreview.innerHTML = '';
    if (elements.resultContainer) elements.resultContainer.innerHTML = '';
    if (elements.scanButton) elements.scanButton.disabled = true;
}
