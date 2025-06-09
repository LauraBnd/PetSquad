document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const authContainer = document.getElementById('authContainer');
    const profileContainer = document.getElementById('profileContainer');
    
    // Auth elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const authForms = document.querySelectorAll('.auth-form');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    // Profile elements
    const profileSections = document.querySelectorAll('.section-item');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const editProfileModal = document.getElementById('editProfileModal');
    const closeEditModalBtn = document.getElementById('closeEditModal');
    const editProfileForm = document.getElementById('editProfileForm');
    const deleteAccountSection = document.getElementById('deleteAccountSection');
    
    // Current user data
    let currentUser = null;

    // Initialize
    init();

    async function init() {
        setupEventListeners();
        await checkAuthStatus();
        await checkPendingAlert();
    }

    function setupEventListeners() {
        // Mobile menu
        mobileMenuToggle?.addEventListener('click', toggleMobileMenu);
        overlay?.addEventListener('click', closeMobileMenu);

        // Auth tabs
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        // Auth forms
        loginForm?.addEventListener('submit', handleLogin);
        signupForm?.addEventListener('submit', handleSignup);

        // PASSWORD TOGGLE - MOVED HERE
        document.querySelectorAll('.password-toggle').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('data-target');
                const input = document.getElementById(targetId);
                const icon = this.querySelector('i');
                
                console.log('Toggle clicked for:', targetId); // Debug line
                
                if (input && icon) {
                    if (input.type === 'password') {
                        input.type = 'text';
                        icon.classList.remove('fa-eye');
                        icon.classList.add('fa-eye-slash');
                    } else {
                        input.type = 'password';
                        icon.classList.remove('fa-eye-slash');
                        icon.classList.add('fa-eye');
                    }
                }
            });
        });

        // Profile sections
        profileSections.forEach(section => {
            const header = section.querySelector('.section-header');
            if (header && !section.id.includes('logout')) {
                header.addEventListener('click', () => toggleSection(section));
            }
        });

        // Logout
        const logoutSection = document.getElementById('logoutSection');
        if (logoutSection) {
            logoutSection.addEventListener('click', handleLogout);
        }

        // Delete account section
         deleteAccountSection.addEventListener('click', function() {
        showDeleteAccountModal();
    });
    
    function showDeleteAccountModal() {
        // Create modal dynamically
        const modal = document.createElement('div');
        modal.className = 'delete-modal';
        modal.innerHTML = `
            <div class="delete-modal-content">
                <div class="delete-modal-header">
                    <h3>Delete Account</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="delete-modal-body">
                    <p><strong>Warning:</strong> This action cannot be undone.</p>
                    <p>All your posts, data, and account information will be permanently deleted.</p>
                    <p>Type <strong>"DELETE"</strong> to confirm:</p>
                    <input type="text" id="deleteConfirmInput" placeholder="Type DELETE" class="delete-input">
                </div>
                <div class="delete-modal-footer">
                    <button id="confirmDeleteBtn" class="btn-delete" disabled>Delete Account</button>
                    <button id="cancelDeleteBtn" class="btn-cancel">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Get modal elements
        const closeModal = modal.querySelector('.close-modal');
        const confirmDeleteBtn = modal.querySelector('#confirmDeleteBtn');
        const cancelDeleteBtn = modal.querySelector('#cancelDeleteBtn');
        const deleteConfirmInput = modal.querySelector('#deleteConfirmInput');
        
        // Enable/disable delete button based on input
        deleteConfirmInput.addEventListener('input', function() {
            if (this.value.trim() === 'DELETE') {
                confirmDeleteBtn.disabled = false;
                confirmDeleteBtn.classList.add('enabled');
            } else {
                confirmDeleteBtn.disabled = true;
                confirmDeleteBtn.classList.remove('enabled');
            }
        });
        
        // Close modal events
        closeModal.addEventListener('click', () => closeDeleteModal(modal));
        cancelDeleteBtn.addEventListener('click', () => closeDeleteModal(modal));
        
        // Click outside to close
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeDeleteModal(modal);
            }
        });
        
        // Confirm delete
        confirmDeleteBtn.addEventListener('click', async function() {
            if (deleteConfirmInput.value.trim() !== 'DELETE') {
                alert('Please type "DELETE" to confirm.');
                return;
            }
            
            // Show loading state
            confirmDeleteBtn.textContent = 'Deleting...';
            confirmDeleteBtn.disabled = true;
            
            try {
                const response = await fetch('/auth/delete-account', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include'
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    alert('Account deleted successfully. You will be redirected to the home page.');
                    window.location.href = '/';
                } else {
                    alert(result.message || 'Failed to delete account. Please try again.');
                    confirmDeleteBtn.textContent = 'Delete Account';
                    confirmDeleteBtn.disabled = false;
                }
            } catch (error) {
                console.error('Error deleting account:', error);
                alert('An error occurred. Please try again.');
                confirmDeleteBtn.textContent = 'Delete Account';
                confirmDeleteBtn.disabled = false;
            }
        });
    }
    
    function closeDeleteModal(modal) {
        modal.remove();
    }

        // Edit profile modal
        editProfileBtn?.addEventListener('click', openEditModal);
        closeEditModalBtn?.addEventListener('click', closeEditModal);
        editProfileForm?.addEventListener('submit', handleProfileUpdate);

        // Notification tabs
        const notifTabs = document.querySelectorAll('.notif-tab');
        notifTabs.forEach(tab => {
            tab.addEventListener('click', () => switchNotificationTab(tab.dataset.content));
        });

        // Auth links
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-tab]')) {
                e.preventDefault();
                switchTab(e.target.dataset.tab);
            }
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
    function switchTab(tabName) {
        tabBtns.forEach(btn => btn.classList.remove('active'));
        authForms.forEach(form => form.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
        document.getElementById(`${tabName}Form`)?.classList.add('active');
    }

    async function handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        console.log('Login attempt with:', data.email); // Debug log

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log('Login response:', result); // Debug log
            
            if (response.ok) {
                currentUser = result.user;
                
                // Check if user is admin and redirect accordingly
                if (currentUser.isAdmin) {
                    console.log('Admin user detected, redirecting to admin page');
                    showNotification('Welcome Admin! Redirecting to admin panel...', 'success');
                    
                    // Small delay for notification visibility, then redirect
                    setTimeout(() => {
                        window.location.href = '/admin';
                    }, 1500);
                    return;
                }
                
                // Regular user flow
                showProfile();
                await loadUserData();
                showNotification('Login successful!', 'success');
            } else {
                console.error('Login failed:', result);
                showNotification(result.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Network error. Please try again.', 'error');
        }
    }

    async function handleSignup(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        if (data.password !== data.confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }

        try {
            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (response.ok) {
                currentUser = result.user;
                
                // Check if newly registered user is admin (unlikely but possible)
                if (currentUser.isAdmin) {
                    console.log('New admin user registered, redirecting to admin page');
                    showNotification('Welcome Admin! Redirecting to admin panel...', 'success');
                    setTimeout(() => {
                        window.location.href = '/admin';
                    }, 1500);
                    return;
                }
                
                // Regular user flow
                showProfile();
                await loadUserData();
                showNotification('Account created successfully!', 'success');
            } else {
                showNotification(result.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            showNotification('Network error. Please try again.', 'error');
        }
    }

    async function handleLogout() {
        try {
            const response = await fetch('/auth/logout', { method: 'POST' });
            
            if (response.ok) {
                currentUser = null;
                showAuth();
                showNotification('Logged out successfully', 'success');
            }
        } catch (error) {
            showNotification('Logout failed', 'error');
        }
    }

    async function checkAuthStatus() {
        try {
            const response = await fetch('/auth/current-user');
            
            if (response.ok) {
                const user = await response.json();
                currentUser = user;
                
                // Check if already logged in user is admin
                if (currentUser.isAdmin) {
                    console.log('Already logged in admin user detected');
                    // Don't redirect automatically on page load, just show profile
                    // User can manually navigate to admin if needed
                }
                
                showProfile();
                await loadUserData();
            } else {
                showAuth();
            }
        } catch (error) {
            showAuth();
        }
    }

    // Profile functions
    function showAuth() {
        authContainer.style.display = 'flex';
        profileContainer.style.display = 'none';
    }

    function showProfile() {
        authContainer.style.display = 'none';
        profileContainer.style.display = 'block';
    }

    async function loadUserData() {
        if (!currentUser) return;

        // Update profile info
        document.getElementById('profileUsername').textContent = currentUser.username;
        document.getElementById('profileFullName').textContent = currentUser.fullName || 'Not provided';
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profilePhone').textContent = currentUser.phoneNumber || 'Not provided';

        // Add admin indicator if user is admin
        if (currentUser.isAdmin) {
            const usernameElement = document.getElementById('profileUsername');
            if (usernameElement && !usernameElement.querySelector('.admin-badge')) {
                usernameElement.innerHTML += ' <span class="admin-badge" style="background: #4CAF50; color: white; padding: 0.2rem 0.5rem; border-radius: 10px; font-size: 0.8rem; margin-left: 0.5rem;">ADMIN</span>';
            }
            
            // Add admin panel link to sidebar if not exists
            addAdminLinkToSidebar();
        }

        // Load user posts
        await loadUserPosts();
        
        // Load user alerts
        await loadUserAlerts();
    }

    function addAdminLinkToSidebar() {
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu && !document.querySelector('.admin-nav-item')) {
            const adminNavItem = document.createElement('li');
            adminNavItem.className = 'nav-item admin-nav-item';
            adminNavItem.innerHTML = `
                <a href="/admin" class="nav-link" style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; margin-top: 1rem;">
                    <i class="fas fa-cog"></i>
                    <span>Admin Panel</span>
                </a>
            `;
            navMenu.appendChild(adminNavItem);
        }
    }

    async function loadUserPosts() {
        try {
            const response = await fetch('/posts/user');
            
            if (response.ok) {
                const posts = await response.json();
                displayUserPosts(posts);
            }
        } catch (error) {
            console.error('Failed to load user posts:', error);
        }
    }

    function displayUserPosts(posts) {
        const postsGrid = document.getElementById('userPosts');
        
        if (posts.length === 0) {
            postsGrid.innerHTML = '<p class="no-posts">No posts yet. <a href="/feed">Create your first post</a></p>';
            return;
        }

        postsGrid.innerHTML = posts.map(post => `
            <div class="post-card ${post.tag}">
                ${post.images && post.images[0] ? 
                    `<img src="/${post.images[0]}" alt="Pet image" class="post-image">` : 
                    '<div class="post-image placeholder">No image</div>'
                }
                <div class="post-content">
                    <div class="post-header">
                        <span class="post-tag ${post.tag}">${post.tag}</span>
                        ${post.is_solved ? '<span class="solved-badge">Solved</span>' : ''}
                    </div>
                    <h4>${post.pet_name || 'Unknown Pet'}</h4>
                    <p><i class="fas fa-map-marker-alt"></i> ${post.location}</p>
                    <p><i class="fas fa-calendar"></i> ${new Date(post.date).toLocaleDateString()}</p>
                    <div class="post-actions">
                        ${!post.is_solved ? 
                            `<button class="post-btn btn-found" onclick="markAsSolved(${post.id})">Found</button>` : 
                            ''
                        }
                        <button class="post-btn btn-delete" onclick="deletePost(${post.id})">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async function loadUserAlerts() {
        try {
            const response = await fetch('/posts/alerts');
            
            if (response.ok) {
                const alerts = await response.json();
                displayUserAlerts(alerts);
            }
        } catch (error) {
            console.error('Failed to load user alerts:', error);
        }
    }

    function displayUserAlerts(alerts) {
        const alertsList = document.getElementById('alertsList');
        
        if (alerts.length === 0) {
            alertsList.innerHTML = '<p class="no-alerts">No alerts received yet.</p>';
            return;
        }

        alertsList.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.is_read ? 'read' : 'unread'}">
                <div class="alert-content">
                    <h5>Alert from @${alert.sender_username}</h5>
                    <p>${alert.message}</p>
                    <small>${new Date(alert.created_at).toLocaleDateString()}</small>
                </div>
                ${!alert.is_read ? 
                    `<button class="btn-mark-read" onclick="markAlertRead(${alert.id})">Mark as Read</button>` : 
                    ''
                }
            </div>
        `).join('');
    }

    // Section toggle
    function toggleSection(section) {
        section.classList.toggle('active');
    }

    // Notification tabs
    function switchNotificationTab(contentType) {
        document.querySelectorAll('.notif-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.notif-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-content="${contentType}"]`)?.classList.add('active');
        document.getElementById(contentType === 'received' ? 'receivedAlerts' : 'preferences')?.classList.add('active');
    }

    // Edit profile modal
    function openEditModal() {
        if (!currentUser) return;
        
        // Populate form with current data
        document.getElementById('editFullName').value = currentUser.fullName || '';
        document.getElementById('editUsername').value = currentUser.username || '';
        document.getElementById('editEmail').value = currentUser.email || '';
        document.getElementById('editPhone').value = currentUser.phoneNumber || '';
        
        editProfileModal.style.display = 'block';
    }

    function closeEditModal() {
        editProfileModal.style.display = 'none';
    }

    async function handleProfileUpdate(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        // Handle password change if provided
        if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
            showNotification('New passwords do not match', 'error');
            return;
        }

        try {
            // Update profile
            const profileResponse = await fetch('/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: data.username,
                    email: data.email,
                    fullName: data.fullName,
                    phoneNumber: data.phoneNumber
                })
            });

            if (!profileResponse.ok) {
                const error = await profileResponse.json();
                throw new Error(error.error);
            }

            // Handle password change if provided
            if (data.newPassword) {
                const passwordResponse = await fetch('/auth/change-password', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        currentPassword: data.currentPassword,
                        newPassword: data.newPassword
                    })
                });

                if (!passwordResponse.ok) {
                    const error = await passwordResponse.json();
                    throw new Error(error.error);
                }
            }

            // Update current user data
            currentUser = { ...currentUser, ...data };
            await loadUserData();
            closeEditModal();
            showNotification('Profile updated successfully!', 'success');

        } catch (error) {
            showNotification(error.message || 'Failed to update profile', 'error');
        }
    }

    // Global functions for post actions
    window.markAsSolved = async function(postId) {
        try {
            const response = await fetch(`/posts/${postId}/solved`, { method: 'PUT' });
            
            if (response.ok) {
                showNotification('Post marked as solved!', 'success');
                await loadUserPosts();
            } else {
                const error = await response.json();
                showNotification(error.error || 'Failed to mark as solved', 'error');
            }
        } catch (error) {
            showNotification('Network error', 'error');
        }
    };

    window.deletePost = async function(postId) {
        if (!confirm('Are you sure you want to delete this post?')) return;

        try {
            const response = await fetch(`/posts/${postId}`, { method: 'DELETE' });
            
            if (response.ok) {
                showNotification('Post deleted successfully', 'success');
                await loadUserPosts();
            } else {
                const error = await response.json();
                showNotification(error.error || 'Failed to delete post', 'error');
            }
        } catch (error) {
            showNotification('Network error', 'error');
        }
    };

    window.markAlertRead = async function(alertId) {
        try {
            const response = await fetch(`/posts/alert/${alertId}/read`, { method: 'PUT' });
            
            if (response.ok) {
                await loadUserAlerts();
            }
        } catch (error) {
            console.error('Failed to mark alert as read:', error);
        }
    };

    // Check for pending alerts
    async function checkPendingAlert() {
        if (!currentUser) return;

        try {
            const response = await fetch('/posts/pending-alert');
            
            if (response.ok) {
                const pendingAlert = await response.json();
                
                if (pendingAlert) {
                    showReuniteModal(pendingAlert);
                }
            }
        } catch (error) {
            console.error('Failed to check pending alerts:', error);
        }
    }

    function showReuniteModal(alert) {
        const modalHtml = `
            <div class="modal" id="reuniteQuestionModal" style="display: block;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Pet Reunion Check</h3>
                    </div>
                    <div class="reunite-content" style="padding: 2rem; text-align: center;">
                        <h4>Has this pet been reunited with its family?</h4>
                        <div class="alert-post-preview" style="margin: 1.5rem 0;">
                            ${alert.images && alert.images[0] ? 
                                `<img src="/${alert.images[0]}" alt="Pet" style="width: 200px; height: 200px; object-fit: cover; border-radius: 15px;">` : 
                                '<div class="no-image">No image available</div>'
                            }
                            <h5>${alert.pet_name || 'Pet'} - ${alert.tag}</h5>
                            <p><i class="fas fa-map-marker-alt"></i> ${alert.location}</p>
                            <p>Alert from: @${alert.sender_username}</p>
                        </div>
                        <div class="reunite-buttons" style="display: flex; gap: 1rem; justify-content: center;">
                            <button class="btn-reunite-yes" onclick="handleReuniteResponse(${alert.id}, ${alert.post_id}, true)" style="background: #4CAF50; color: white; padding: 1rem 2rem; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">Yes</button>
                            <button class="btn-reunite-no" onclick="handleReuniteResponse(${alert.id}, ${alert.post_id}, false)" style="background: #e74c3c; color: white; padding: 1rem 2rem; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">No</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    window.handleReuniteResponse = async function(alertId, postId, isReunited) {
        try {
            // Mark alert as read
            await fetch(`/posts/alert/${alertId}/read`, { method: 'PUT' });

            if (isReunited) {
                // Mark post as solved
                await fetch(`/posts/${postId}/solved`, { method: 'PUT' });
                
                // Remove question modal
                document.getElementById('reuniteQuestionModal')?.remove();
                
                // Show success modal with confetti
                showSuccessModal();
            } else {
                // Remove question modal
                document.getElementById('reuniteQuestionModal')?.remove();
                
                // Show sorry message
                showSorryModal();
            }
        } catch (error) {
            console.error('Failed to handle reunite response:', error);
            showNotification('Something went wrong', 'error');
        }
    };

    function showSuccessModal() {
        const reuniteModal = document.getElementById('reuniteModal');
        reuniteModal.style.display = 'block';
        
        // Create confetti effect
        createConfetti();
        
        // Close modal handler
        document.getElementById('closeReuniteModal').onclick = function() {
            reuniteModal.style.display = 'none';
        };
    }

    function showSorryModal() {
        const sorryModalHtml = `
            <div class="modal" id="sorryModal" style="display: block;">
                <div class="modal-content">
                    <div class="sorry-content" style="padding: 3rem; text-align: center;">
                        <i class="fas fa-heart-broken" style="font-size: 4rem; color: #e74c3c; margin-bottom: 1rem;"></i>
                        <h3 style="color: #450920; margin-bottom: 1rem;">We are so sorry</h3>
                        <p style="color: #666; font-size: 1.1rem; margin-bottom: 2rem;">But PetSquad will keep trying!</p>
                        <button class="btn-continue" onclick="document.getElementById('sorryModal').remove()" style="background: linear-gradient(135deg, #da627d, #a53860); color: white; border: none; padding: 1rem 2rem; border-radius: 50px; font-weight: 600; cursor: pointer;">Continue</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', sorryModalHtml);
        
        // Auto redirect to home after 3 seconds
        setTimeout(() => {
            document.getElementById('sorryModal')?.remove();
            window.location.href = '/';
        }, 3000);
    }

    function createConfetti() {
        const confettiContainer = document.getElementById('confettiContainer');
        const colors = ['#f9dbbd', '#ffa5ab', '#da627d', '#a53860', '#450920'];
        
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.style.cssText = `
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    top: -10px;
                    left: ${Math.random() * 100}%;
                    animation: confetti-fall 3s linear forwards;
                    border-radius: 50%;
                `;
                
                confettiContainer.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 3000);
            }, i * 100);
        }
    }

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

    // Add confetti animation CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes confetti-fall {
            to {
                transform: translateY(100vh) rotate(360deg);
                opacity: 0;
            }
        }
        
        .no-posts, .no-alerts {
            text-align: center;
            color: #666;
            padding: 2rem;
            font-style: italic;
        }
        
        .no-posts a {
            color: #da627d;
            text-decoration: none;
            font-weight: 600;
        }
        
        .alert-item {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .alert-item.unread {
            background: rgba(218, 98, 125, 0.1);
            border-left: 4px solid #da627d;
        }
        
        .alert-content h5 {
            color: #450920;
            margin-bottom: 0.5rem;
        }
        
        .alert-content p {
            color: #666;
            margin-bottom: 0.3rem;
        }
        
        .alert-content small {
            color: #999;
        }
        
        .btn-mark-read {
            background: #da627d;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.9rem;
        }
        
        .solved-badge {
            background: #4CAF50;
            color: white;
            padding: 0.2rem 0.5rem;
            border-radius: 10px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .post-image.placeholder {
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #999;
            font-style: italic;
        }
        
        .password-input-container {
            position: relative;
            display: flex;
            align-items: center;
        }

        .password-input-container input {
            padding-right: 3.5rem !important;
            width: 100%;
        }

        .password-toggle {
            position: absolute;
            right: 0.8rem;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            padding: 0.5rem;
            font-size: 1rem;
            transition: color 0.3s ease;
            z-index: 10;
        }

        .password-toggle:hover {
            color: #da627d;
        }

        .password-toggle:focus {
            outline: none;
        }

        .admin-badge {
            background: #4CAF50;
            color: white;
            padding: 0.2rem 0.5rem;
            border-radius: 10px;
            font-size: 0.8rem;
            margin-left: 0.5rem;
        }
    `;
    document.head.appendChild(style);

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            closeMobileMenu();
        }
    });
});