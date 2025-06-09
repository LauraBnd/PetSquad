document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const makePostBtn = document.getElementById('makePostBtn');
    const searchBtn = document.getElementById('searchBtn');
    const searchPanel = document.getElementById('searchPanel');
    const makePostModal = document.getElementById('makePostModal');
    const authRequiredModal = document.getElementById('authRequiredModal');
    const postsGrid = document.getElementById('postsGrid');
    const loading = document.getElementById('loading');
    const noPosts = document.getElementById('noPosts');
    
    // Forms
    const searchForm = document.getElementById('searchForm');
    const postForm = document.getElementById('postForm');
    
    // Current user and posts data
    let currentUser = null;
    let currentPosts = [];
    let selectedImages = [];

    // Initialize
    init();

    async function init() {
        setupEventListeners();
        await checkAuthStatus();
        await loadPosts();
        setupImageUpload();
    }

    function setupEventListeners() {
        // Mobile menu
        mobileMenuToggle?.addEventListener('click', toggleMobileMenu);
        overlay?.addEventListener('click', closeMobileMenu);

        // Header actions
        makePostBtn?.addEventListener('click', handleMakePost);
        searchBtn?.addEventListener('click', toggleSearchPanel);

        // Search form
        searchForm?.addEventListener('submit', handleSearch);
        document.getElementById('clearFilters')?.addEventListener('click', clearFilters);

        // Post form
        postForm?.addEventListener('submit', handlePostSubmit);
        
        // Modal close buttons
        document.getElementById('closePostModal')?.addEventListener('click', closePostModal);
        document.getElementById('closeAuthModal')?.addEventListener('click', closeAuthModal);
        document.getElementById('cancelPost')?.addEventListener('click', closePostModal);
        document.getElementById('closeAuthBtn')?.addEventListener('click', closeAuthModal);

        // Tag selection
        const tagInputs = document.querySelectorAll('input[name="tag"]');
        tagInputs.forEach(input => {
            input.addEventListener('change', handleTagChange);
        });

        // Close modals when clicking outside
        window.addEventListener('click', function(e) {
            if (e.target === makePostModal) closePostModal();
            if (e.target === authRequiredModal) closeAuthModal();
        });
    }

    // Mobile menu functions
    function toggleMobileMenu() {
        sidebar?.classList.toggle('active');
        overlay?.classList.toggle('active');
        document.body.style.overflow = sidebar?.classList.contains('active') ? 'hidden' : '';
    }

    function closeMobileMenu() {
        sidebar?.classList.remove('active');
        overlay?.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Auth functions
    async function checkAuthStatus() {
        try {
            const response = await fetch('/auth/current-user');
            if (response.ok) {
                currentUser = await response.json();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    }

    // Search functions
    function toggleSearchPanel() {
        searchPanel?.classList.toggle('active');
    }

    async function handleSearch(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const filters = Object.fromEntries(formData);
        
        // Remove empty filters
        Object.keys(filters).forEach(key => {
            if (!filters[key]) delete filters[key];
        });

        await loadPosts(filters);
    }

    function clearFilters() {
        searchForm?.reset();
        loadPosts();
    }

    // Posts functions
    async function loadPosts(filters = {}) {
        showLoading(true);
        
        try {
            const params = new URLSearchParams(filters);
            const response = await fetch(`/posts?${params}`);
            
            if (response.ok) {
                currentPosts = await response.json();
                displayPosts(currentPosts);
            } else {
                showError('Failed to load posts');
            }
        } catch (error) {
            console.error('Load posts error:', error);
            showError('Network error while loading posts');
        } finally {
            showLoading(false);
        }
    }

    function displayPosts(posts) {
        if (posts.length === 0) {
            postsGrid.style.display = 'none';
            noPosts.style.display = 'block';
            return;
        }

        noPosts.style.display = 'none';
        postsGrid.style.display = 'grid';
        
        postsGrid.innerHTML = posts.map(post => `
            <div class="post-card ${post.tag}" onclick="viewPost(${post.id})">
                ${post.images && post.images[0] ? 
                    `<div class="post-image-container">
                        <img src="/${post.images[0]}" alt="Pet" class="post-image">
                        <div class="post-header">
                            <span class="post-username">@${post.username}</span>
                            <span class="post-tag ${post.tag}">${post.tag}</span>
                        </div>
                    </div>` : 
                    `<div class="post-image-container">
                        <div class="post-image no-image">
                            <i class="fas fa-image"></i>
                            <p>No image</p>
                        </div>
                        <div class="post-header">
                            <span class="post-username">@${post.username}</span>
                            <span class="post-tag ${post.tag}">${post.tag}</span>
                        </div>
                    </div>`
                }
                <div class="post-content">
                    <h3 class="post-title">${post.pet_name || (post.tag === 'lost' ? 'Lost Pet' : 'Found Pet')}</h3>
                    <div class="post-info">
                        <div class="post-detail">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${post.location}</span>
                        </div>
                        <div class="post-detail">
                            <i class="fas fa-calendar"></i>
                            <span>${new Date(post.date).toLocaleDateString()}</span>
                        </div>
                        ${post.breed ? `
                            <div class="post-detail">
                                <i class="fas fa-paw"></i>
                                <span>${post.breed}</span>
                            </div>
                        ` : ''}
                        <div class="post-detail">
                            <i class="fas fa-ruler"></i>
                            <span>${post.size.charAt(0).toUpperCase() + post.size.slice(1)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function showLoading(show) {
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }

    function showError(message) {
        showNotification(message, 'error');
    }

    // Post creation functions
    function handleMakePost() {
        if (!currentUser) {
            authRequiredModal.style.display = 'block';
        } else {
            makePostModal.style.display = 'block';
        }
    }

    function closePostModal() {
        makePostModal.style.display = 'none';
        postForm?.reset();
        clearImagePreviews();
        selectedImages = [];
    }

    function closeAuthModal() {
        authRequiredModal.style.display = 'none';
    }

    function handleTagChange(e) {
        const petNameGroup = document.getElementById('petNameGroup');
        const petNameInput = document.getElementById('petName');
        
        if (e.target.value === 'found') {
            petNameGroup.style.display = 'none';
            petNameInput.removeAttribute('required');
        } else {
            petNameGroup.style.display = 'block';
            petNameInput.setAttribute('required', '');
        }
    }

    async function handlePostSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        
        // Add selected images
        selectedImages.forEach(file => {
            formData.append('images', file);
        });

        try {
            const response = await fetch('/posts', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                showNotification('Post created successfully!', 'success');
                closePostModal();
                await loadPosts(); // Reload posts
            } else {
                const error = await response.json();
                showNotification(error.error || 'Failed to create post', 'error');
            }
        } catch (error) {
            console.error('Post creation error:', error);
            showNotification('Network error while creating post', 'error');
        }
    }

    // Image upload functions
    function setupImageUpload() {
        const imagesInput = document.getElementById('images');
        const uploadArea = document.getElementById('uploadArea');
        
        if (!imagesInput || !uploadArea) return;

        uploadArea.addEventListener('click', () => imagesInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.background = 'rgba(218, 98, 125, 0.15)';
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.background = 'rgba(218, 98, 125, 0.05)';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.background = 'rgba(218, 98, 125, 0.05)';
            handleFiles(e.dataTransfer.files);
        });
        
        imagesInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });
    }

    function handleFiles(files) {
        const maxFiles = 5;
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        Array.from(files).forEach(file => {
            if (selectedImages.length >= maxFiles) {
                showNotification(`Maximum ${maxFiles} images allowed`, 'error');
                return;
            }
            
            if (file.size > maxSize) {
                showNotification(`${file.name} is too large. Maximum 5MB per image.`, 'error');
                return;
            }
            
            if (!file.type.startsWith('image/')) {
                showNotification(`${file.name} is not an image file`, 'error');
                return;
            }
            
            selectedImages.push(file);
            addImagePreview(file);
        });
    }

    function addImagePreview(file) {
        const imagePreview = document.getElementById('imagePreview');
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="remove-image" onclick="removeImage(${selectedImages.length - 1})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            imagePreview.appendChild(previewItem);
        };
        
        reader.readAsDataURL(file);
    }

    window.removeImage = function(index) {
        selectedImages.splice(index, 1);
        const imagePreview = document.getElementById('imagePreview');
        imagePreview.children[index].remove();
        
        // Update indices for remaining remove buttons
        Array.from(imagePreview.children).forEach((item, i) => {
            const removeBtn = item.querySelector('.remove-image');
            removeBtn.onclick = () => window.removeImage(i);
        });
    };

    function clearImagePreviews() {
        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview) {
            imagePreview.innerHTML = '';
        }
    }

    // Navigation functions
    window.viewPost = function(postId) {
        window.location.href = `/post/${postId}`;
    };


    // Notification system
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#e74c3c' : '#2196F3'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            z-index: 3000;
            opacity: 0;
            transform: translateX(100px);
            transition: all 0.3s ease;
            max-width: 400px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100px)';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            closeMobileMenu();
        }
    });

    // Set today's date as default for post form
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
});