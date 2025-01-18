// API Configuration
const API_KEY = 'YOUR_API_KEY'; // Replace with your actual API key
const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v2/models/gemini-pro-vision:generateContent';

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
        showError('Failed to analyze image. Please try again.');
    } finally {
        showLoading(false);
    }
}

async function analyzeImage(file) {
    const base64Image = await convertToBase64(file);
    
    const payload = {
        contents: [{
            parts: [{
                text: `Please analyze this medical image and provide a detailed assessment in the following JSON format:
                {
                    "condition": {
                        "name": "Name of the identified condition or 'No significant findings'",
                        "confidence": "Confidence level as percentage",
                        "severity": "Mild/Moderate/Severe or 'Not applicable'"
                    },
                    "observations": {
                        "primarySymptoms": ["List of visible symptoms"],
                        "characteristics": ["Notable characteristics observed"],
                        "recommendations": ["General recommendations"]
                    },
                    "additionalInfo": {
                        "commonCauses": ["Common causes"],
                        "riskFactors": ["Known risk factors"],
                        "preventiveMeasures": ["Preventive measures"]
                    }
                }`
            }, {
                inline_data: {
                    mime_type: file.type,
                    data: base64Image
                }
            }]
        }],
        safety_settings: {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
    };

    const response = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
}

function displayResults(data) {
    try {
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) throw new Error('Invalid response format');

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');

        const analysis = JSON.parse(jsonMatch[0]);
        
        elements.resultContainer.innerHTML = `
            <div class="result-card">
                <div class="result-header ${getHeaderClass(analysis.condition.severity)}">
                    <h3><i class="fas fa-clipboard-check"></i> Analysis Results</h3>
                    <span class="confidence-badge">${analysis.condition.confidence}</span>
                </div>
                
                <div class="result-body">
                    <div class="result-section">
                        <h4><i class="fas fa-stethoscope"></i> Condition</h4>
                        <p class="condition-name">${analysis.condition.name}</p>
                        <p class="severity-label">Severity: ${analysis.condition.severity}</p>
                    </div>

                    <div class="result-section">
                        <h4><i class="fas fa-list-ul"></i> Key Observations</h4>
                        <ul>
                            ${analysis.observations.primarySymptoms.map(symptom => 
                                `<li>${symptom}</li>`).join('')}
                        </ul>
                    </div>

                    <div class="result-section">
                        <h4><i class="fas fa-comment-medical"></i> Recommendations</h4>
                        <ul>
                            ${analysis.observations.recommendations.map(rec => 
                                `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>

                    <div class="result-section">
                        <h4><i class="fas fa-shield-alt"></i> Prevention</h4>
                        <ul>
                            ${analysis.additionalInfo.preventiveMeasures.map(measure => 
                                `<li>${measure}</li>`).join('')}
                        </ul>
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

function getHeaderClass(severity) {
    const severityMap = {
        'Mild': 'severity-mild',
        'Moderate': 'severity-moderate',
        'Severe': 'severity-severe',
        'Not applicable': 'severity-none'
    };
    return severityMap[severity] || 'severity-none';
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
    elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    elements.scanButton.disabled = show;
}

function showError(message) {
    elements.resultContainer.innerHTML = `
        <div class="error-card">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        </div>
    `;
}

function resetUI() {
    elements.form.reset();
    elements.filePathDisplay.value = '';
    elements.imagePreview.innerHTML = '';
    elements.resultContainer.innerHTML = '';
    elements.scanButton.disabled = true;
}
