// DOM Elements
const uploadZone = document.getElementById('upload-zone');
const progressZone = document.getElementById('progress-zone');
const successZone = document.getElementById('success-zone');

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');

const progressBar = document.getElementById('progress-bar');
const progressStatus = document.getElementById('progress-status');

const shareLinkInput = document.getElementById('share-link');
const copyBtn = document.getElementById('copy-btn');

// --- 1. Event Listeners ---
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

// --- 2. File Upload Logic (API Call) ---
async function handleFileUpload(file) {
    // A. Validation Checks
    if (!file.type.startsWith('image/')) {
        alert('Sorry, only image files (JPG, PNG, GIF) are allowed.');
        return;
    }

    const maxSizeMB = 10; 
    if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`File size is too large. Max limit is ${maxSizeMB}MB.`);
        return;
    }
    
    // B. Switch to Progress Mode
    uploadZone.classList.add('hidden');
    progressZone.classList.remove('hidden');
    successZone.classList.add('hidden');
    
    progressBar.style.width = '0%';
    progressStatus.textContent = '0%';

    // C. Actual API Call using XMLHttpRequest for progress tracking
    const formData = new FormData();
    formData.append('imageFile', file); 

    // IMPORTANT: Replace 'http://localhost:3000' with your deployed backend URL (Render URL)
    const uploadUrl = 'http://localhost:3000/upload'; 

    try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl, true);
        
        // Progress Event Handler
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = `${percent}%`;
                progressStatus.textContent = `${percent}%`;
            }
        });
        
        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    showSuccess(response.shareLink);
                } else {
                    alert(`Upload Failed: ${response.message}`);
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

// Reset UI Function
function resetUI() {
    uploadZone.classList.remove('hidden');
    progressZone.classList.add('hidden');
    successZone.classList.add('hidden');
}

// --- 3. Success UI Handling ---
function showSuccess(link) {
    progressZone.classList.add('hidden');
    successZone.classList.remove('hidden');
    
    shareLinkInput.value = link;
    shareLinkInput.select();
}

// --- 4. Copy Link Logic ---
copyBtn.addEventListener('click', () => {
    shareLinkInput.select();
    try {
        navigator.clipboard.writeText(shareLinkInput.value)
            .then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied! ✅';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            })
            .catch(err => {
                document.execCommand('copy');
            });
    } catch (err) {
        document.execCommand('copy');
    }
});

// Initial UI setup on page load
document.addEventListener('DOMContentLoaded', () => {
    resetUI();
});
