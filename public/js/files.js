/* ========================================
   Media2026 - Files Page JavaScript (Enhanced)
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
    
    // DOM Elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadPreview = document.getElementById('uploadPreview');
    const submitBtn = document.getElementById('submitBtn');
    const uploadForm = document.getElementById('uploadForm');
    const uploadLoading = document.getElementById('uploadLoading');
    const searchInput = document.getElementById('searchInput');
    const attachmentDetails = document.getElementById('attachmentDetails');
    const filesContainer = document.getElementById('filesContainer');
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    
    // ============================
    // Create Folder Functions
    // ============================
    
    window.showNewFolderModal = function() {
        const modal = new bootstrap.Modal(document.getElementById('newFolderModal'));
        modal.show();
        setTimeout(() => {
            document.getElementById('newFolderName').focus();
        }, 300);
    };
    
    window.createFolder = function() {
        const folderNameInput = document.getElementById('newFolderName');
        const folderName = folderNameInput ? folderNameInput.value.trim() : '';
        
        if (!folderName) {
            alert('Por favor ingresa un nombre para la carpeta');
            return;
        }
        
        fetch('/create-folder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ folderName: folderName })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close modal first
                const modalEl = document.getElementById('newFolderModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                
                // Show success briefly then reload
                showToast('Carpeta creada exitosamente', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                alert(data.error || 'Error al crear la carpeta');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al crear la carpeta');
        });
    };
    
    // Close modal on Enter key in folder name input
    const newFolderNameInput = document.getElementById('newFolderName');
    if (newFolderNameInput) {
        newFolderNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                window.createFolder();
            }
        });
    }
    
    // ============================
    // Upload with Progress
    // ============================
    
    // Auto upload when files are selected
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                // Show preview
                showUploadPreview(this.files);
                // Auto upload
                uploadFiles(this.files);
            }
        });
    }
    
    function showUploadPreview(files) {
        if (!uploadPreview) return;
        
        uploadPreview.innerHTML = '';
        
        Array.from(files).forEach((file, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.style.animationDelay = (index * 0.05) + 's';
            
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.onload = () => URL.revokeObjectURL(img.src);
                previewItem.appendChild(img);
            } else {
                const icon = document.createElement('i');
                icon.className = 'bi bi-file-earmark-fill';
                icon.style.fontSize = '2rem';
                icon.style.color = '#8a8a8a';
                icon.style.display = 'flex';
                icon.style.alignItems = 'center';
                icon.style.justifyContent = 'center';
                icon.style.height = '100%';
                previewItem.appendChild(icon);
            }
            
            // Add remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '<i class="bi bi-x"></i>';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                previewItem.remove();
            };
            previewItem.appendChild(removeBtn);
            
            uploadPreview.appendChild(previewItem);
        });
        
        // Show submit button if needed (currently hidden for auto-upload)
    }
    
    function uploadFiles(files) {
        if (!files || files.length === 0) return;
        
        const formData = new FormData();
        const folderInput = document.querySelector('input[name="folder"]');
        if (folderInput && folderInput.value) {
            formData.append('folder', folderInput.value);
        }
        
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }
        
        const progressBar = document.getElementById('uploadProgress');
        if (!progressBar) return;
        
        const progress = progressBar.querySelector('.progress-bar');
        
        progressBar.style.display = 'block';
        progress.style.width = '0%';
        progress.textContent = '0%';
        
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                progress.style.width = percentComplete + '%';
                progress.textContent = percentComplete + '%';
            }
        });
        
        xhr.addEventListener('load', function() {
            progressBar.style.display = 'none';
            if (xhr.status === 200) {
                // Success - reload page
                window.location.reload();
            } else {
                showToast('Error al subir archivos', 'error');
            }
        });
        
        xhr.addEventListener('error', function() {
            progressBar.style.display = 'none';
            showToast('Error al subir archivos', 'error');
        });
        
        // Get current folder from URL
        const urlParams = new URLSearchParams(window.location.search);
        const folder = urlParams.get('folder') || '';
        
        xhr.open('POST', '/upload' + (folder ? '?folder=' + encodeURIComponent(folder) : ''));
        xhr.send(formData);
    }
    
    // ============================
    // View Toggle (Grid/List)
    // ============================
    
    function setGridView() {
        if (!filesContainer || !gridViewBtn || !listViewBtn) return;
        
        filesContainer.classList.remove('files-list-view');
        filesContainer.classList.add('files-grid-view');
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        localStorage.setItem('mediaViewMode', 'grid');
    }
    
    function setListView() {
        if (!filesContainer || !gridViewBtn || !listViewBtn) return;
        
        filesContainer.classList.remove('files-grid-view');
        filesContainer.classList.add('files-list-view');
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        localStorage.setItem('mediaViewMode', 'list');
    }
    
    if (gridViewBtn && listViewBtn) {
        gridViewBtn.addEventListener('click', setGridView);
        listViewBtn.addEventListener('click', setListView);
        
        // Load saved view preference
        const savedView = localStorage.getItem('mediaViewMode');
        if (savedView === 'list') {
            setListView();
        } else {
            setGridView();
        }
    }
    
    // ============================
    // Drag and Drop Functionality
    // ============================
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Click to open file dialog
    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput && fileInput.click());
        
        // Drag events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        
        // Highlight drop zone
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('dragover');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('dragover');
            }, false);
        });
        
        // Handle dropped files - upload immediately
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                uploadFiles(files);
            }
        });
    }
    
    // ============================
    // Form Submit
    // ============================
    
    if (uploadForm) {
        uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (fileInput && fileInput.files.length > 0) {
                uploadFiles(fileInput.files);
            }
        });
    }
    
    // ============================
    // Search Functionality
    // ============================
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const fileItems = document.querySelectorAll('.file-item');
            
            fileItems.forEach((item, index) => {
                const name = item.dataset.name ? item.dataset.name.toLowerCase() : '';
                if (name.includes(searchTerm)) {
                    item.style.display = '';
                    item.style.animationDelay = (index * 0.02) + 's';
                } else {
                    item.style.display = 'none';
                }
            });
            
            // Show/hide empty search results
            const visibleItems = document.querySelectorAll('.file-item[style="display: none;"]');
            const totalItems = fileItems.length;
            
            if (visibleItems.length === totalItems && searchTerm) {
                // Could show a "no results" message here
            }
        });
        
        // Clear search on Escape
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            }
        });
    }
    
    // ============================
    // Delete File Function
    // ============================
    
    window.deleteFile = function(filename) {
        if (!filename) return;
        
        if (confirm('¿Estás seguro de que quieres eliminar "' + filename + '"?')) {
            fetch('/delete/' + encodeURIComponent(filename), {
                method: 'DELETE'
            })
            .then(response => {
                if (response.ok) {
                    showToast('Archivo eliminado', 'success');
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                } else {
                    showToast('Error al eliminar archivo', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error al eliminar archivo', 'error');
            });
        }
    };
    
    // ============================
    // Attachment Details Sidebar
    // ============================
    
    window.openAttachmentDetails = function(fileData) {
        const preview = document.getElementById('attachmentPreview');
        if (!preview || !fileData) return;
        
        // Set file details
        const detailName = document.getElementById('detailName');
        const detailType = document.getElementById('detailType');
        const detailSize = document.getElementById('detailSize');
        const detailDate = document.getElementById('detailDate');
        const detailUrl = document.getElementById('detailUrl');
        const detailDownload = document.getElementById('detailDownload');
        const detailDelete = document.getElementById('detailDelete');
        
        if (detailName) detailName.textContent = fileData.name || '-';
        if (detailType) detailType.textContent = fileData.type || '-';
        if (detailSize) detailSize.textContent = fileData.size || '-';
        if (detailDate) detailDate.textContent = fileData.date || '-';
        
        if (detailUrl) {
            detailUrl.textContent = 'Copiar enlace';
            detailUrl.href = fileData.url || '#';
        }
        
        if (detailDownload) {
            detailDownload.href = (fileData.url || '#') + '?download=1';
        }
        
        // Set delete handler
        if (detailDelete) {
            detailDelete.onclick = function() {
                closeAttachmentDetails();
                setTimeout(() => deleteFile(fileData.name), 100);
            };
        }
        
        // Show preview based on type
        if (fileData.type === 'image') {
            preview.innerHTML = '<img src="' + (fileData.url || '') + '" alt="' + (fileData.name || '') + '">';
        } else if (fileData.type === 'video') {
            preview.innerHTML = '<video controls playsinline><source src="' + (fileData.url || '') + '" type="video/mp4"></video>';
        } else if (fileData.type === 'audio') {
            preview.innerHTML = '<audio controls class="w-100"><source src="' + (fileData.url || '') + '" type="audio/mpeg"></audio>';
        } else if (fileData.type === 'folder') {
            preview.innerHTML = '<i class="bi bi-folder-fill" style="font-size: 5rem; color: #f6a235;"></i>';
        } else {
            preview.innerHTML = '<i class="bi bi-file-earmark-fill" style="font-size: 5rem; color: #8a8a8a;"></i>';
        }
        
        // Open sidebar with animation
        if (attachmentDetails) {
            attachmentDetails.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    };
    
    window.closeAttachmentDetails = function() {
        if (attachmentDetails) {
            attachmentDetails.classList.remove('open');
            document.body.style.overflow = '';
        }
    };
    
    // Close sidebar on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && attachmentDetails && attachmentDetails.classList.contains('open')) {
            closeAttachmentDetails();
        }
    });
    
    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (attachmentDetails && attachmentDetails.classList.contains('open')) {
            if (!attachmentDetails.contains(e.target) && !e.target.closest('.file-card') && !e.target.closest('.file-list-row')) {
                // Only close if not clicking on a file item
                const isFileItem = e.target.closest('.file-item');
                if (!isFileItem) {
                    // closeAttachmentDetails();
                }
            }
        }
    });
    
    // ============================
    // Click Handlers for File Cards (Grid View)
    // ============================
    
    document.querySelectorAll('.file-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // Don't open if clicking on buttons or links
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('button') || e.target.closest('a')) {
                return;
            }
            
            // Get file data from data attributes
            const fileItem = this.closest('.file-item');
            if (!fileItem) return;
            
            const fileType = fileItem.dataset.type;
            
            // If it's a folder, navigate to it instead of opening sidebar
            if (fileType === 'folder') {
                const folderName = fileItem.dataset.name;
                if (folderName) {
                    window.location.href = '/files?folder=' + encodeURIComponent(folderName);
                }
                return;
            }
            
            // Remove selected class from all
            document.querySelectorAll('.file-card').forEach(c => c.classList.remove('selected'));
            document.querySelectorAll('.file-list-row').forEach(r => r.classList.remove('selected'));
            
            // Add selected class to this card
            this.classList.add('selected');
            
            const fileDetails = {
                name: fileItem.dataset.name,
                type: fileType,
                size: fileItem.dataset.size,
                date: fileItem.dataset.date,
                url: fileItem.dataset.url
            };
            
            openAttachmentDetails(fileDetails);
        });
        
        // Double-click to download (for non-folder files)
        card.addEventListener('dblclick', function(e) {
            const fileItem = this.closest('.file-item');
            if (!fileItem) return;
            
            const fileType = fileItem.dataset.type;
            const fileUrl = fileItem.dataset.url;
            
            if (fileType !== 'folder' && fileUrl) {
                window.open(fileUrl, '_blank');
            }
        });
    });
    
    // Add click handlers to list rows
    document.querySelectorAll('.file-list-row').forEach(row => {
        row.addEventListener('click', function(e) {
            // Don't open if clicking on buttons or links
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('button') || e.target.closest('a')) {
                return;
            }
            
            const fileType = this.dataset.type;
            
            // If it's a folder, navigate to it
            if (fileType === 'folder') {
                const folderName = this.dataset.name;
                if (folderName) {
                    window.location.href = '/files?folder=' + encodeURIComponent(folderName);
                }
                return;
            }
            
            // Remove selected class from all
            document.querySelectorAll('.file-list-row').forEach(r => r.classList.remove('selected'));
            document.querySelectorAll('.file-card').forEach(c => c.classList.remove('selected'));
            
            // Add selected class to this row
            this.classList.add('selected');
            
            const fileDetails = {
                name: this.dataset.name,
                type: fileType,
                size: this.dataset.size,
                date: this.dataset.date,
                url: this.dataset.url
            };
            
            openAttachmentDetails(fileDetails);
        });
        
        // Double-click to download
        row.addEventListener('dblclick', function(e) {
            const fileType = this.dataset.type;
            const fileUrl = this.dataset.url;
            
            if (fileType !== 'folder' && fileUrl) {
                window.open(fileUrl, '_blank');
            }
        });
    });
    
    // ============================
    // Copy URL to Clipboard
    // ============================
    
    const detailUrl = document.getElementById('detailUrl');
    if (detailUrl) {
        detailUrl.addEventListener('click', function(e) {
            e.preventDefault();
            const url = this.href;
            
            if (url && url !== '#') {
                navigator.clipboard.writeText(url).then(() => {
                    this.textContent = '¡Copiado!';
                    showToast('Enlace copiado al portapapeles', 'success');
                    setTimeout(() => {
                        this.textContent = 'Copiar enlace';
                    }, 2000);
                }).catch(() => {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = url;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    this.textContent = '¡Copiado!';
                    setTimeout(() => {
                        this.textContent = 'Copiar enlace';
                    }, 2000);
                });
            }
        });
    }
    
    // ============================
    // Toast Notifications
    // ============================
    
    window.showToast = function(message, type = 'info') {
        // Remove existing toast
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        if (type === 'success') {
            toast.style.background = 'linear-gradient(135deg, #00a32a 0%, #008a23 100%)';
            toast.innerHTML = '<i class="bi bi-check-circle me-2"></i>' + message;
        } else if (type === 'error') {
            toast.style.background = 'linear-gradient(135deg, #d63638 0%, #b91c1c 100%)';
            toast.innerHTML = '<i class="bi bi-exclamation-circle me-2"></i>' + message;
        } else {
            toast.style.background = 'linear-gradient(135deg, #2271b1 0%, #135e96 100%)';
            toast.innerHTML = '<i class="bi bi-info-circle me-2"></i>' + message;
        }
        
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };
    
    // Add toast animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // ============================
    // Keyboard Shortcuts
    // ============================
    
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + U to open upload dialog
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            if (fileInput) fileInput.click();
        }
        
        // G key for grid view
        if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const target = e.target;
            if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                setGridView();
            }
        }
        
        // L key for list view
        if (e.key === 'l' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const target = e.target;
            if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                setListView();
            }
        }
    });
    
    // ============================
    // Initialize Tooltips
    // ============================
    
    // Enable Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});
