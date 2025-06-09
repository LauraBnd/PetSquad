document.addEventListener('DOMContentLoaded', function () {
    // DOM elements
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Search elements
    const userSearch = document.getElementById('userSearch');
    const searchUsersBtn = document.getElementById('searchUsersBtn');
    const postSearch = document.getElementById('postSearch');
    const postTagFilter = document.getElementById('postTagFilter');
    const searchPostsBtn = document.getElementById('searchPostsBtn');
    
    // Modal elements
    const editUserModal = document.getElementById('editUserModal');
    const editPostModal = document.getElementById('editPostModal');
    const deleteModal = document.getElementById('deleteModal');
    const postDetailModal = document.getElementById('postDetailModal');
    
    // Edit post variables
    let currentEditingPostId = null;
    let currentEditingPost = null;
    
    // Data storage
    let currentUsers = [];
    let currentPosts = [];
    let deleteItem = null;

    // Initialize
    init();

    async function init() {
        await checkAdminAuth();
        setupEventListeners();
        await loadDashboardData();
    }

    function setupEventListeners() {
        // Mobile menu
        mobileMenuToggle?.addEventListener('click', toggleMobileMenu);
        
        // Updated overlay handler to check which modal is open
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) {
                // Check if edit post modal is open
                if (editPostModal && editPostModal.style.display === 'block') {
                    closeEditPostModal();
                } else {
                    // Otherwise close mobile menu
                    closeMobileMenu();
                }
            }
        });

        // Admin logout
        document.getElementById('adminLogout')?.addEventListener('click', handleLogout);

        // Search functionality
        searchUsersBtn?.addEventListener('click', () => searchUsers());
        userSearch?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchUsers();
        });

        searchPostsBtn?.addEventListener('click', () => searchPosts());
        postSearch?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchPosts();
        });
        postTagFilter?.addEventListener('change', () => searchPosts());

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', closeModals);
        });
        document.getElementById('cancelEditUser')?.addEventListener('click', closeModals);
        document.getElementById('cancelDelete')?.addEventListener('click', closeModals);
        document.getElementById('cancelEditPost')?.addEventListener('click', closeEditPostModal);

        // Form submissions
        document.getElementById('editUserForm')?.addEventListener('submit', handleUserEdit);
        document.getElementById('editPostForm')?.addEventListener('submit', handleEditPostSubmit);
        document.getElementById('confirmDelete')?.addEventListener('click', handleDelete);

        // Close modals when clicking outside
        window.addEventListener('click', function(e) {
            if (e.target === editUserModal) closeModals();
            if (e.target === deleteModal) closeModals();
            if (e.target === postDetailModal) closeModals();
        });

        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                closeMobileMenu();
            }
        });

        // Initialize edit post functionality
        initializeEditPost();
    }

    // Mobile menu functions
    function toggleMobileMenu() {
        sidebar?.classList.toggle('active');
        overlay?.classList.toggle('active');
        document.body.style.overflow = sidebar?.classList.contains('active') ? 'hidden' : '';
    }

    function closeMobileMenu() {
        const editPostModalOpen = editPostModal && editPostModal.style.display === 'block';
        
        // Don't close overlay if edit modal is open
        if (editPostModalOpen) {
            sidebar?.classList.remove('active');
            return;
        }
        
        sidebar?.classList.remove('active');
        overlay?.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Auth functions
    async function checkAdminAuth() {
        try {
            const response = await fetch('/auth/current-user');
            if (!response.ok) {
                window.location.href = '/profile';
                return;
            }
            
            const user = await response.json();
            if (!user.isAdmin) {
                showNotification('Access denied. Admin privileges required.', 'error');
                window.location.href = '/';
                return;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/profile';
        }
    }

    async function handleLogout() {
        try {
            const response = await fetch('/auth/logout', { method: 'POST' });
            if (response.ok) {
                showNotification('Logged out successfully', 'success');
                window.location.href = '/';
            }
        } catch (error) {
            showNotification('Logout failed', 'error');
        }
    }

    // Dashboard data loading
    async function loadDashboardData() {
        showLoading(true);
        
        try {
            // Load stats
            await loadStats();
            
            // Load users and posts
            await Promise.all([
                loadUsers(),
                loadPosts()
            ]);
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            showNotification('Failed to load dashboard data', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function loadStats() {
        try {
            const response = await fetch('/admin/stats');
            if (response.ok) {
                const stats = await response.json();
                updateStatsDisplay(stats);
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    function updateStatsDisplay(stats) {
        document.getElementById('victoryCount').textContent = stats.solvedPosts || 0;
        document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
        document.getElementById('totalPosts').textContent = stats.totalPosts || 0;
        document.getElementById('activePosts').textContent = stats.activePosts || 0;
        document.getElementById('solvedPosts').textContent = stats.solvedPosts || 0;
        
        // Animate numbers
        animateNumbers();
    }

    function animateNumbers() {
        const numbers = document.querySelectorAll('.stat-number, .victory-count');
        numbers.forEach(num => {
            const finalValue = parseInt(num.textContent);
            let current = 0;
            const increment = finalValue / 50;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= finalValue) {
                    current = finalValue;
                    clearInterval(timer);
                }
                num.textContent = Math.floor(current);
            }, 30);
        });
    }

    // User management
    async function loadUsers(query = '') {
        try {
            const params = query ? `?query=${encodeURIComponent(query)}` : '';
            const response = await fetch(`/admin/users${params}`);
            
            if (response.ok) {
                currentUsers = await response.json();
                displayUsers(currentUsers);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            showNotification('Failed to load users', 'error');
        }
    }

    function displayUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        
        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No users found</h3>
                        <p>Try adjusting your search criteria</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr class="fade-in">
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.full_name || 'Not provided'}</td>
                <td>${user.phone_number || 'Not provided'}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-edit" onclick="editUser(${user.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="action-btn btn-delete" onclick="deleteUser(${user.id}, '${user.username}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async function searchUsers() {
        const query = userSearch.value.trim();
        await loadUsers(query);
    }

    // Global functions for user actions
    window.editUser = function(userId) {
        const user = currentUsers.find(u => u.id === userId);
        if (!user) return;

        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUserUsername').value = user.username;
        document.getElementById('editUserEmail').value = user.email;
        document.getElementById('editUserFullName').value = user.full_name || '';
        document.getElementById('editUserPhone').value = user.phone_number || '';

        editUserModal.style.display = 'block';
    };

    window.deleteUser = function(userId, username) {
        deleteItem = { type: 'user', id: userId };
        document.getElementById('deleteMessage').textContent = 
            `Are you sure you want to delete user "${username}"? This will also delete all their posts and cannot be undone.`;
        deleteModal.style.display = 'block';
    };

    async function handleUserEdit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userId = document.getElementById('editUserId').value;
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch(`/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                showNotification('User updated successfully', 'success');
                closeModals();
                await loadUsers();
                await loadStats();
            } else {
                const error = await response.json();
                showNotification(error.error || 'Failed to update user', 'error');
            }
        } catch (error) {
            showNotification('Network error', 'error');
        }
    }

    // Post management
    async function loadPosts(filters = {}) {
        try {
            const params = new URLSearchParams();
            if (filters.query) params.append('query', filters.query);
            if (filters.tag) params.append('tag', filters.tag);
            
            const response = await fetch(`/admin/posts?${params}`);
            
            if (response.ok) {
                currentPosts = await response.json();
                displayPosts(currentPosts);
            }
        } catch (error) {
            console.error('Failed to load posts:', error);
            showNotification('Failed to load posts', 'error');
        }
    }

    function displayPosts(posts) {
        const grid = document.getElementById('postsGrid');
        
        if (posts.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-newspaper"></i>
                    <h3>No posts found</h3>
                    <p>Try adjusting your search criteria</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = posts.map(post => `
            <div class="admin-post-card ${post.tag} ${post.is_solved ? 'solved' : ''} fade-in" onclick="viewPost(${post.id})">
                ${post.images && post.images[0] ? 
                    `<img src="/${post.images[0]}" alt="Pet" class="post-card-image">` : 
                    '<div class="post-card-image" style="display: flex; align-items: center; justify-content: center; color: #999;"><i class="fas fa-image"></i></div>'
                }
                <div class="post-card-content">
                    <div class="post-card-header">
                        <span class="post-card-tag ${post.tag} ${post.is_solved ? 'solved' : ''}">${post.tag}</span>
                        <span class="status-badge ${post.is_solved ? 'solved' : 'active'}">${post.is_solved ? 'Solved' : 'Active'}</span>
                    </div>
                    <h4 class="post-card-title">${post.pet_name || (post.tag === 'lost' ? 'Lost Pet' : 'Found Pet')}</h4>
                    <div class="post-card-meta">
                        <p><i class="fas fa-user"></i> @${post.username}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${post.location}</p>
                        <p><i class="fas fa-calendar"></i> ${new Date(post.date).toLocaleDateString()}</p>
                    </div>
                    <div class="post-card-actions">
                        <button class="action-btn btn-edit" onclick="event.stopPropagation(); adminEditPost(${post.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="action-btn btn-view" onclick="event.stopPropagation(); viewPost(${post.id})">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="action-btn btn-delete" onclick="event.stopPropagation(); deletePost(${post.id}, '${post.pet_name || 'Pet'}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async function searchPosts() {
        const query = postSearch.value.trim();
        const tag = postTagFilter.value;
        await loadPosts({ query, tag });
    }

    // Edit Post Functions
   function initializeEditPost() {
    const closeEditPostModalBtn = document.getElementById('closeEditPostModal');
    const cancelEditPost = document.getElementById('cancelEditPost');
    const editPostForm = document.getElementById('editPostForm');

    // Close modal events - Fixed the function references
    closeEditPostModalBtn?.addEventListener('click', closeEditPostModal);
    cancelEditPost?.addEventListener('click', closeEditPostModal);

    // Form submission
    editPostForm?.addEventListener('submit', handleEditPostSubmit);

    // Tag change handling
    const tagInputs = editPostForm?.querySelectorAll('input[name="tag"]');
    tagInputs?.forEach(input => {
        input.addEventListener('change', handleAdminEditTagChange);
    });

    // File input handling
    const editUploadArea = document.getElementById('adminEditUploadArea');
    const editImagesInput = document.getElementById('adminEditImages');
    
    editUploadArea?.addEventListener('click', () => editImagesInput?.click());
    editImagesInput?.addEventListener('change', handleAdminEditImagePreview);
}

    // Admin edit post modal
    window.adminEditPost = function(postId) {
        currentEditingPostId = postId;
        loadPostForAdminEdit(postId);
    };

    // Load post data for admin editing
    async function loadPostForAdminEdit(postId) {
        try {
            const response = await fetch(`/admin/posts/edit/${postId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                currentEditingPost = await response.json();
                populateAdminEditForm(currentEditingPost);
                showEditPostModal();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to load post data');
            }
        } catch (error) {
            console.error('Error loading post for admin edit:', error);
            showNotification('Failed to load post data: ' + error.message, 'error');
        }
    }

    // Populate admin edit form with current post data
    function populateAdminEditForm(post) {
        // Set tag
        const tagInput = document.querySelector(`input[name="tag"][value="${post.tag}"]`);
        if (tagInput) {
            tagInput.checked = true;
            handleAdminEditTagChange({ target: tagInput });
        }

        // Set other fields
        document.getElementById('adminEditPetName').value = post.pet_name || '';
        document.getElementById('adminEditLocation').value = post.location || '';
        document.getElementById('adminEditDate').value = post.date?.split('T')[0] || '';
        document.getElementById('adminEditSize').value = post.size || '';
        document.getElementById('adminEditBreed').value = post.breed || '';
        document.getElementById('adminEditDescription').value = post.description || '';
        document.getElementById('adminMarkSolved').checked = post.is_solved || false;

        // Display current images
        displayAdminCurrentImages(post.images || []);
    }

    // Display current images for admin with delete option
    function displayAdminCurrentImages(images) {
        const container = document.getElementById('adminCurrentImagesEdit');
        container.innerHTML = '';

        if (images.length === 0) {
            container.innerHTML = '<p class="no-images">No images currently</p>';
            return;
        }

        images.forEach((imagePath, index) => {
            const imageDiv = document.createElement('div');
            imageDiv.className = 'current-image-item';
            imageDiv.innerHTML = `
                <div class="image-container">
                    <img src="/${imagePath}" alt="Post image ${index + 1}" class="current-image">
                    <button type="button" class="delete-current-image" data-image-path="${imagePath}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            // Add delete event listener
            const deleteBtn = imageDiv.querySelector('.delete-current-image');
            deleteBtn.addEventListener('click', () => deleteAdminCurrentImage(imagePath, imageDiv));
            
            container.appendChild(imageDiv);
        });
    }

    // Delete current image (admin)
    async function deleteAdminCurrentImage(imagePath, imageElement) {
        if (!confirm('Are you sure you want to delete this image?')) {
            return;
        }

        try {
            const response = await fetch(`/admin/posts/${currentEditingPostId}/image/${encodeURIComponent(imagePath)}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                imageElement.remove();
                
                // Update current post object
                if (currentEditingPost.images) {
                    currentEditingPost.images = currentEditingPost.images.filter(img => img !== imagePath);
                }

                // Show empty message if no images left
                const container = document.getElementById('adminCurrentImagesEdit');
                if (container.children.length === 0) {
                    container.innerHTML = '<p class="no-images">No images currently</p>';
                }
                
                showNotification('Image deleted successfully', 'success');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete image');
            }
        } catch (error) {
            console.error('Error deleting image:', error);
            showNotification('Failed to delete image: ' + error.message, 'error');
        }
    }

    // Handle tag change in admin edit form
    function handleAdminEditTagChange(event) {
        const petNameGroup = document.getElementById('adminEditPetNameGroup');
        const petNameInput = document.getElementById('adminEditPetName');
        
        if (event.target.value === 'lost') {
            petNameGroup.style.display = 'block';
            petNameInput.required = true;
        } else {
            petNameGroup.style.display = 'none';
            petNameInput.required = false;
            petNameInput.value = '';
        }
    }

    // Handle new image preview in admin edit form
    function handleAdminEditImagePreview(event) {
        const files = event.target.files;
        const preview = document.getElementById('adminEditImagePreview');
        preview.innerHTML = '';

        Array.from(files).forEach((file, index) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imageDiv = document.createElement('div');
                    imageDiv.className = 'preview-image';
                    imageDiv.innerHTML = `
                        <img src="${e.target.result}" alt="Preview ${index + 1}">
                        <button type="button" class="remove-preview" data-index="${index}">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    
                    // Add remove functionality
                    const removeBtn = imageDiv.querySelector('.remove-preview');
                    removeBtn.addEventListener('click', () => removeAdminPreviewImage(index));
                    
                    preview.appendChild(imageDiv);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Remove preview image (admin)
    function removeAdminPreviewImage(index) {
        const input = document.getElementById('adminEditImages');
        const dt = new DataTransfer();
        
        Array.from(input.files).forEach((file, i) => {
            if (i !== index) {
                dt.items.add(file);
            }
        });
        
        input.files = dt.files;
        handleAdminEditImagePreview({ target: input });
    }

    // Handle admin edit form submission
    async function handleEditPostSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        
        try {
            const response = await fetch(`/admin/posts/edit/${currentEditingPostId}`, {
                method: 'PUT',
                body: formData,
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok) {
                showNotification('Post updated successfully by admin!', 'success');
                closeEditPostModal();
                await loadPosts(); // Refresh the posts list
                await loadStats(); // Refresh stats
            } else {
                throw new Error(result.error || 'Failed to update post');
            }
        } catch (error) {
            console.error('Error updating post:', error);
            showNotification('Failed to update post: ' + error.message, 'error');
        }
    }

    // Show edit post modal
    function showEditPostModal() {
        editPostModal.style.display = 'block';
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // Close edit post modal
    function closeEditPostModal() {
        editPostModal.style.display = 'none';
        overlay.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Reset form
        document.getElementById('editPostForm')?.reset();
        document.getElementById('adminEditImagePreview').innerHTML = '';
        document.getElementById('adminCurrentImagesEdit').innerHTML = '';
        
        currentEditingPostId = null;
        currentEditingPost = null;
    }

    // Global functions for post actions
    window.viewPost = function(postId) {
        const post = currentPosts.find(p => p.id === postId);
        if (!post) return;

        // Populate modal with post data
        document.getElementById('modalPostTitle').textContent = post.pet_name || (post.tag === 'lost' ? 'Lost Pet' : 'Found Pet');
        document.getElementById('modalPostTag').textContent = post.tag;
        document.getElementById('modalPostTag').className = `post-card-tag ${post.tag} ${post.is_solved ? 'solved' : ''}`;
        document.getElementById('modalPostDate').textContent = new Date(post.date).toLocaleDateString();
        document.getElementById('modalPostOwner').textContent = post.username;
        document.getElementById('modalPostLocation').textContent = post.location;
        document.getElementById('modalPostBreed').textContent = post.breed || 'Not specified';
        document.getElementById('modalPostSize').textContent = post.size.charAt(0).toUpperCase() + post.size.slice(1);
        document.getElementById('modalPostDescription').textContent = post.description || 'No description provided';
        document.getElementById('modalPostStatus').textContent = post.is_solved ? 'Solved' : 'Active';

        // Display images
        const imagesContainer = document.getElementById('modalPostImages');
        if (post.images && post.images.length > 0) {
            imagesContainer.innerHTML = post.images.map(img => 
                `<img src="/${img}" alt="Pet image" class="modal-post-image">`
            ).join('');
        } else {
            imagesContainer.innerHTML = '<div class="no-images">No images available</div>';
        }

        // Set up action buttons
        document.getElementById('editPostBtn').onclick = () => {
            closeModals();
            adminEditPost(post.id);
        };
        document.getElementById('deletePostBtn').onclick = () => {
            closeModals();
            deletePost(post.id, post.pet_name || 'Pet');
        };

        postDetailModal.style.display = 'block';
    };

    window.deletePost = function(postId, petName) {
        deleteItem = { type: 'post', id: postId };
        document.getElementById('deleteMessage').textContent = 
            `Are you sure you want to delete the post "${petName}"? This action cannot be undone.`;
        deleteModal.style.display = 'block';
    };

    // Delete functionality
    async function handleDelete() {
        if (!deleteItem) return;

        showLoading(true);
        
        try {
            const endpoint = deleteItem.type === 'user' ? 
                `/admin/users/${deleteItem.id}` : 
                `/admin/posts/${deleteItem.id}`;
                
            const response = await fetch(endpoint, { method: 'DELETE' });

            if (response.ok) {
                showNotification(`${deleteItem.type} deleted successfully`, 'success');
                closeModals();
                
                if (deleteItem.type === 'user') {
                    await loadUsers();
                } else {
                    await loadPosts();
                }
                await loadStats();
            } else {
                const error = await response.json();
                showNotification(error.error || `Failed to delete ${deleteItem.type}`, 'error');
            }
        } catch (error) {
            showNotification('Network error', 'error');
        } finally {
            showLoading(false);
            deleteItem = null;
        }
    }

    // Modal management
    function closeModals() {
        editUserModal.style.display = 'none';
        deleteModal.style.display = 'none';
        postDetailModal.style.display = 'none';
        document.getElementById('editUserForm').reset();
    }

    // Utility functions
    function showLoading(show) {
        loadingOverlay.style.display = show ? 'block' : 'none';
    }

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
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            font-weight: 500;
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

        // Allow manual close
        notification.addEventListener('click', () => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100px)';
            setTimeout(() => notification.remove(), 300);
        });
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Escape key closes modals
        if (e.key === 'Escape') {
            closeModals();
            closeEditPostModal();
        }
        
        // Ctrl/Cmd + F focuses search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            userSearch.focus();
        }
    });

    // Auto-refresh data every 30 seconds
    setInterval(async () => {
        await loadStats();
    }, 30000);

    // Add real-time updates simulation
    function simulateRealTimeUpdates() {
        // This would typically connect to a WebSocket or use Server-Sent Events
        // For demo purposes, we'll just refresh data periodically
        setInterval(async () => {
            if (document.visibilityState === 'visible') {
                await loadStats();
            }
        }, 60000); // Every minute
    }

    simulateRealTimeUpdates();

    console.log('Admin panel loaded successfully');
});