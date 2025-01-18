const apiKey = 'AIzaSyB2rYYcVdfLcoN3Gwc-dd96YY4R5Gj1dqs';

document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    resetApp();
}

function setupEventListeners() {
    const imageInput = document.getElementById('imageInput');
    const scanBtn = document.getElementById('scanBtn');
    const filePathDisplay = document.querySelector('.file-path');

    if (imageInput) {
        imageInput.addEventListener('change', (e) => handleImageSelection(e, filePathDisplay, scanBtn));
    }

    // Add click event for the scan button
    if (scanBtn) {
        scanBtn.addEventListener('click', initiateScanProcess);
    }
}

function handleImageSelection(event, filePathDisplay, scanBtn) {
    const file = event.target.files[0];
    
    if (file) {
        // Update file name display
        filePathDisplay.textContent = file.name;
        
        // Enable scan button
        scanBtn.disabled = false;
        
        // Display image preview
        displayImage(file);
    } else {
        filePathDisplay.textContent = 'No file chosen';
        scanBtn.disabled = true;
        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview) {
            imagePreview.innerHTML = '';
        }
    }
}

function displayImage(file) {
    const imagePreview = document.getElementById('imagePreview');
    if (!imagePreview) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        imagePreview.innerHTML = `
            <img src="${event.target.result}" 
                alt="Preview" 
                class="preview-image" 
                style="max-width: 100%; max-height: 300px; border-radius: 8px;"
            />
        `;
    };
    reader.readAsDataURL(file);
}

async function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = (error) => {
            console.error("Error converting image to Base64:", error);
            reject(error);
        };
        reader.readAsDataURL(file);
    });
}

async function initiateScanProcess() {
    const scanBtn = document.getElementById('scanBtn');
    const resultDiv = document.getElementById('result');
    const imageInput = document.getElementById('imageInput');

    if (!imageInput?.files.length) {
        alert('Please upload an image.');
        return;
    }

    // Disable scan button and show loading state
    scanBtn.disabled = true;
    resultDiv.innerHTML = `
        <div class="loading" style="text-align: center; padding: 20px;">
            <p>Analyzing image, please wait...</p>
        </div>
    `;

    const file = imageInput.files[0];
    try {
        const base64Image = await convertToBase64(file);
        await sendImageForAnalysis(base64Image, resultDiv);
    } catch (error) {
        displayError(error.message || 'Failed to process the image. Please try again.');
    } finally {
        scanBtn.disabled = false;
    }
}

async function sendImageForAnalysis(base64Image, resultDiv) {
    const payload = {
        contents: [{
            parts: [
                {
                    text: "You are an AI healthcare assistant specializing in dermatology. Analyze the uploaded image and return a response in JSON format with the fields: {\"diseaseName\":\"Detected disease name\",\"type\":\"Disease categorization\",\"confidenceLevel\":\"Confidence level (%)\",\"symptoms\":[\"Symptom list\"],\"yearlyCases\":\"Estimated yearly cases\",\"likelyCause\":\"Probable cause\"}"
                },
                {
                    inline_data: {
                        mime_type: "image/jpeg",
                        data: base64Image
                    }
                }
            ]
        }]
    };

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to analyze image');
        }

        const data = await response.json();
        displayAnalysisResult(data, resultDiv);
    } catch (error) {
        throw new Error('Failed to analyze image: ' + error.message);
    }
}

function displayAnalysisResult(data, resultDiv) {
    try {
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
        const analysis = JSON.parse(responseText);

        const diseaseInfo = {
            name: analysis.diseaseName || "No Disease Detected",
            type: analysis.type || "Not Available",
            confidenceLevel: analysis.confidenceLevel || "Not Available",
            symptoms: analysis.symptoms?.join(", ") || "Not Available",
            yearlyCases: analysis.yearlyCases || "Unknown",
            cause: analysis.likelyCause || "Not Available"
        };

        resultDiv.innerHTML = `
            <div class="result-card">
                <h3>Analysis Result</h3>
                <p><strong>Disease Name:</strong> ${diseaseInfo.name}</p>
                <p><strong>Type:</strong> ${diseaseInfo.type}</p>
                <p><strong>Confidence Level:</strong> ${diseaseInfo.confidenceLevel}</p>
                <p><strong>Symptoms:</strong> ${diseaseInfo.symptoms}</p>
                <p><strong>Yearly Cases:</strong> ${diseaseInfo.yearlyCases}</p>
                <p><strong>Likely Cause:</strong> ${diseaseInfo.cause}</p>
            </div>
        `;
    } catch (error) {
        displayError("Error processing AI response. Please try again.");
    }
}

function displayError(message) {
    const resultDiv = document.getElementById('result');
    if (!resultDiv) return;

    resultDiv.innerHTML = `
        <div class="error-card">
            <h3>Error</h3>
            <p>${message}</p>
        </div>
    `;
}

function resetApp() {
    const imagePreview = document.getElementById('imagePreview');
    const resultDiv = document.getElementById('result');
    const scanBtn = document.getElementById('scanBtn');
    const filePathDisplay = document.querySelector('.file-path');

    if (imagePreview) imagePreview.innerHTML = '';
    if (resultDiv) resultDiv.innerHTML = '';
    if (scanBtn) scanBtn.disabled = true;
    if (filePathDisplay) filePathDisplay.textContent = 'No file chosen';
}
