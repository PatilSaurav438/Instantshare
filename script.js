// script.js (FINAL VERSION with Code Sharing Feature)

// DOM Elements
const uploadZone = document.getElementById('upload-zone');
const progressZone = document.getElementById('progress-zone');
const successZone = document.getElementById('success-zone');

const dropArea = document.getElementById('drop-area');
// IMPORTANT: file-input की जगह imageInput का उपयोग करें, जैसा कि index.html में दिया गया है
const fileInput = document.getElementById('imageInput'); 
const uploadBtn = document.getElementById('upload-btn');

const progressBar = document.getElementById('progress-bar');
const progressStatus = document.getElementById('progress-status');

// Code View Elements
const codeInput = document.getElementById('codeInput');
const viewButton = document.getElementById('viewButton');
const codeResult = document.getElementById('codeResult');

// NOTE: uploadUrl फ़ाइल के बाहर परिभाषित होना चाहिए (जैसे कि इस फ़ंक्शन के ऊपर)
// लेकिन हम इसे यहाँ रखते हैं क्योंकि आपने इसे अपने अपलोड फ़ंक्शन के अंदर रखा था।
const uploadUrl = 'https://instantshare-bh9q.onrender.com/upload';
const uploadUrlBase = uploadUrl.replace('/upload', ''); // यह कोड व्यू के लिए बेस URL है

// --- 1. Event Listeners (कोई बदलाव नहीं) ---
uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
    }
});

// Drag-and-Drop Event Handling
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

dropArea.addEventListener('drop', handleDrop, false);

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    dropArea.classList.add('drag-over');
}

function unhighlight() {
    dropArea.classList.remove('drag-over');
}

function handleDrop(e) {
    let dt = e.dataTransfer;
    let files = dt.files;

    if (files.length > 0) {
        handleFileUpload(files[0]);
    }
}

// --- 2. File Upload Logic (Updated API Call) ---
async function handleFileUpload(file) {
    // A. Validation Checks (कोई बदलाव नहीं)
    if (!file.type.startsWith('image/')) {
        alert('Sorry, only image files (JPG, PNG, GIF) are allowed.');
        return;
    }

    const maxSizeMB = 10; 
    if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`File size is too large. Max limit is ${maxSizeMB}MB.`);
        return;
    }
    
    // B. Switch to Progress Mode (कोई बदलाव नहीं)
    uploadZone.classList.add('hidden');
    progressZone.classList.remove('hidden');
    successZone.classList.add('hidden');
    codeResult.innerHTML = ''; // कोड रिजल्ट को साफ़ करें
    
    progressBar.style.width = '0%';
    progressStatus.textContent = '0%';

    // C. Actual API Call using XMLHttpRequest for progress tracking
    const formData = new FormData();
    formData.append('imageFile', file); // Field name 'imageFile' server.js से मेल खाता है
    
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl, true);
        
        // Progress Event Handler (कोई बदलाव नहीं)
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = `${percent}%`;
                progressStatus.textContent = `${percent}%`;
            }
        });
        
        // V. UPDATED ONLOAD HANDLER
        xhr.onload = function() {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                
                // नए {url, code} आउटपुट की जाँच करें
                if (data.url && data.code) { 
                    showResult(data.url, data.code); // URL और CODE दोनों भेजें
                } else {
                    alert(`Upload Failed: Invalid response from server.`);
                    resetUI();
                }
            } else {
                // Handle non-200 status codes (e.g., 400 from Multer validation)
                let errorMessage = 'Upload Failed! Server error.';
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    errorMessage = errorResponse.message || errorMessage;
                } catch (e) {
                    // Ignore JSON parsing error if response is plain text
                }
                alert(`Upload Failed! Status ${xhr.status}. Message: ${errorMessage}`);
                resetUI();
            }
        };

        xhr.onerror = function() {
            alert('A network error occurred during upload. Check if the server is running.');
            resetUI();
        };

        xhr.send(formData);

    } catch (error) {
        console.error('Upload Error:', error);
        alert('An unexpected error occurred.');
        resetUI();
    }
}

// Reset UI Function (कोई बदलाव नहीं)
function resetUI() {
    uploadZone.classList.remove('hidden');
    progressZone.classList.add('hidden');
    successZone.classList.add('hidden');
    codeResult.innerHTML = ''; // कोड रिजल्ट को साफ़ करें
}

// --- 3. Success UI Handling (UPDATED) ---
// OLD showSuccess(link) is replaced by showResult(url, code)
function showResult(url, code) { 
    // प्रोग्रेस ज़ोन को छुपाएं
    progressZone.classList.add('hidden');
    
    // success-zone को दिखाएं
    const successZone = document.getElementById('success-zone');
    successZone.classList.remove('hidden');

    // success-zone के content को अपडेट करके कोड दिखाएं
    successZone.innerHTML = `
        <h2>Upload Successful! 🎉</h2>
        
        <p>Your Access Code (Expires in 10 minutes):</p>
        <div class="code-display">${code}</div> 
        
        <p>Direct Share Link:</p>
        <div class="share-box">
            <input type="text" id="share-link-final" value="${url}" readonly>
            <button onclick="copyToClipboard('${url}')" class="cta-button">Copy Link</button>
        </div>
        <p class="deletion-note">Both link and code will *automatically delete* in 10 minutes.</p>
    `;
    // सुनिश्चित करें कि अपलोड ज़ोन छुपा हुआ रहे
    uploadZone.classList.add('hidden');
}


// --- 4. Copy Link Logic (UPDATED: अब यह एक अलग फंक्शन है) ---
// Note: copyBtn.addEventListener हटा दिया गया है, अब यह onclick के माध्यम से चलता है
function copyToClipboard(text) {
    try {
        navigator.clipboard.writeText(text)
            .then(() => {
                alert('Link copied to clipboard!');
            })
            .catch(err => {
                // Fallback for older browsers
                const tempInput = document.createElement('input');
                tempInput.value = text;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                alert('Link copied to clipboard! (Fallback)');
            });
    } catch (err) {
        // Fallback for older browsers
        const tempInput = document.createElement('input');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        alert('Link copied to clipboard! (Fallback)');
    }
}


// --- 5. Code View Logic (NEW) ---
viewButton.addEventListener('click', async () => {
    // अन्य क्षेत्रों को छुपाएं
    uploadZone.classList.add('hidden');
    progressZone.classList.add('hidden');
    successZone.classList.add('hidden');

    const code = codeInput.value.trim();
    if (code.length !== 5) {
        codeResult.innerHTML = '<span class="error">Please enter a 5-digit code.</span>';
        uploadZone.classList.remove('hidden'); // वापस अपलोड ज़ोन दिखाएं
        return;
    }

    codeResult.innerHTML = '<span class="loading-text">Fetching image...</span>';

    try {
        // Render के नए /code रूट पर कॉल करें
        const response = await fetch(`${uploadUrlBase}/code/${code}`);
        const data = await response.json();

        if (response.ok) {
            codeResult.innerHTML = `
                <p>Image found! Direct Link:</p>
                <a href="${data.url}" target="_blank">${data.url}</a>
                <p class="deletion-note">This image will expire in 10 minutes.</p>
                <img src="${data.url}" alt="Shared Image" style="max-width: 100%; margin-top: 10px;">
            `;
        } else {
            codeResult.innerHTML = `<span class="error">${data.error || 'Code not found or expired.'}</span>`;
            // Code डालने पर इमेज न मिलने पर वापस अपलोड ज़ोन दिखाएं
            uploadZone.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error fetching image by code:', error);
        codeResult.innerHTML = '<span class="error">An error occurred while fetching the image.</span>';
        uploadZone.classList.remove('hidden');
    }
});


// Initial UI setup on page load
document.addEventListener('DOMContentLoaded', () => {
    resetUI();
});
