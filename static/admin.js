class AdminPanel {
    constructor() {
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // File upload validation
        const fileInput = document.getElementById('file');
        if (fileInput) {
            fileInput.addEventListener('change', this.validateFileUpload.bind(this));
        }
    }
    
    validateFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const maxSize = 16 * 1024 * 1024; // 16MB
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        
        if (file.size > maxSize) {
            alert('File size exceeds 16MB limit. Please choose a smaller file.');
            event.target.value = '';
            return;
        }
        
        if (!allowedTypes.includes(file.type)) {
            alert('File type not supported. Please choose a PDF, image, or document file.');
            event.target.value = '';
            return;
        }
        
        // Show file info
        const fileInfo = document.createElement('div');
        fileInfo.className = 'alert alert-info mt-2';
        fileInfo.innerHTML = `
            <i class="bi bi-info-circle"></i> 
            Selected: ${file.name} (${this.formatFileSize(file.size)})
        `;
        
        // Remove existing file info
        const existingInfo = document.querySelector('.file-info');
        if (existingInfo) {
            existingInfo.remove();
        }
        
        fileInfo.classList.add('file-info');
        event.target.closest('.mb-3').appendChild(fileInfo);
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Global functions for admin panel interactions
async function shareFile(filename) {
    try {
        const response = await fetch(`/share/${filename}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            document.getElementById('shareUrl').value = result.share_url;
            const shareModal = new bootstrap.Modal(document.getElementById('shareModal'));
            shareModal.show();
        } else {
            alert('Error generating share link: ' + result.message);
        }
    } catch (error) {
        console.error('Error sharing file:', error);
        alert('Error sharing file. Please try again.');
    }
}

function copyToClipboard() {
    const shareUrl = document.getElementById('shareUrl');
    shareUrl.select();
    shareUrl.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        document.execCommand('copy');
        
        // Show success feedback
        const copyBtn = event.target;
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="bi bi-check"></i> Copied!';
        copyBtn.classList.add('btn-success');
        copyBtn.classList.remove('btn-outline-secondary');
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.classList.remove('btn-success');
            copyBtn.classList.add('btn-outline-secondary');
        }, 2000);
        
    } catch (err) {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy to clipboard. Please copy manually.');
    }
}

function refreshFiles() {
    location.reload();
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new AdminPanel();
});

// Handle file upload form submission
document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.querySelector('form[action*="upload_file"]');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            const fileInput = document.getElementById('file');
            const submitBtn = uploadForm.querySelector('button[type="submit"]');
            
            if (fileInput.files.length === 0) {
                e.preventDefault();
                alert('Please select a file to upload.');
                return;
            }
            
            // Show loading state
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Uploading...';
            submitBtn.disabled = true;
            
            // Re-enable button after 10 seconds (in case of error)
            setTimeout(() => {
                submitBtn.innerHTML = '<i class="bi bi-upload"></i> Upload File';
                submitBtn.disabled = false;
            }, 10000);
        });
    }
});
