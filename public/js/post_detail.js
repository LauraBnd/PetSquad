document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const shareBtn = document.getElementById('shareBtn');
    const shareMenu = document.getElementById('shareMenu');
    const alertBtn = document.getElementById('alertBtn');
    const alertModal = document.getElementById('alertModal');
    const authModal = document.getElementById('authModal');
    const fullscreenModal = document.getElementById('fullscreenModal');
    
    // Image gallery elements
    const mainImage = document.getElementById('mainImage');
    const thumbnails = document.getElementById('thumbnails');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const fullscreenImage = document.getElementById('fullscreenImage');
    const fullscreenPrev = document.getElementById('fullscreenPrev');
    const fullscreenNext = document.getElementById('fullscreenNext');
    
    // Post data
    let currentPost = null;
    let currentUser = null;
    let currentImageIndex = 0;
    let postImages = [];

    // Initialize
    init();

    async function init() {
        await checkAuthStatus();
        await loadPostData();
        setupEventListeners();
    }

    function setupEventListeners() {
        // Share functionality
        shareBtn?.addEventListener('click', toggleShareMenu);
        document.getElementById('shareFacebook')?.addEventListener('click', shareOnFacebook);
        document.getElementById('shareInstagram')?.addEventListener('click', shareOnInstagram);
        document.getElementById('copyLink')?.addEventListener('click', copyLink);

        // Alert functionality
        alertBtn?.addEventListener('click', handleAlertClick);
        document.getElementById('sendAlert')?.addEventListener('click', sendAlert);

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', closeModals);
        });
        document.getElementById('cancelAlert')?.addEventListener('click', closeModals);
        document.getElementById('closeAuthModal')?.addEventListener('click', closeModals);

        // Gallery navigation
        prevBtn?.addEventListener('click', () => navigateImage(-1));
        nextBtn?.addEventListener('click', () => navigateImage(1));
        fullscreenPrev?.addEventListener('click', () => navigateImage(-1));
        fullscreenNext?.addEventListener('click', () => navigateImage(1));

        // Fullscreen functionality
        mainImage?.addEventListener('click', openFullscreen);
        document.getElementById('closeFullscreen')?.addEventListener('click', closeFullscreen);

        // Close modals when clicking outside
        window.addEventListener('click', function(e) {
            if (e.target === alertModal) closeModals();
            if (e.target === authModal) closeModals();
            if (e.target === fullscreenModal) closeFullscreen();
            
            // Close share menu when clicking outside
            if (!shareBtn?.contains(e.target) && !shareMenu?.contains(e.target)) {
                shareMenu?.classList.remove('active');
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (fullscreenModal && fullscreenModal.style.display === 'block') {
                if (e.key === 'ArrowLeft') navigateImage(-1);
                if (e.key === 'ArrowRight') navigateImage(1);
                if (e.key === 'Escape') closeFullscreen();
            }
        });
    }

    // Auth check
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

    // Load post data
    async function loadPostData() {
        const postId = getPostIdFromUrl();
        if (!postId) {
            showError('Invalid post ID');
            return;
        }

        try {
            const response = await fetch(`/posts/${postId}`);
            if (response.ok) {
                currentPost = await response.json();
                displayPostData();
                setupImageGallery();
                updatePageTitle();
                addSocialMetaTags();
                updateHistory();
                addStructuredData();
            } else if (response.status === 404) {
                showError('Post not found');
            } else {
                showError('Failed to load post');
            }
        } catch (error) {
            console.error('Load post error:', error);
            showError('Network error while loading post');
        }
    }

    function getPostIdFromUrl() {
        const pathParts = window.location.pathname.split('/');
        return pathParts[pathParts.length - 1];
    }

    function displayPostData() {
        if (!currentPost) return;

        // Update header
        document.getElementById('postUsername').textContent = `@${currentPost.username}`;
        const tagElement = document.getElementById('postTag');
        tagElement.textContent = currentPost.tag;
        tagElement.className = `post-tag ${currentPost.tag}`;

        // Update post details
        document.getElementById('petName').textContent = currentPost.pet_name || 
            (currentPost.tag === 'lost' ? 'Lost Pet' : 'Found Pet');
        document.getElementById('petLocation').textContent = currentPost.location;
        document.getElementById('petDate').textContent = new Date(currentPost.date).toLocaleDateString();
        document.getElementById('petBreed').textContent = currentPost.breed || 'Not specified';
        document.getElementById('petSize').textContent = currentPost.size.charAt(0).toUpperCase() + currentPost.size.slice(1);

        // Update description
        const descriptionElement = document.getElementById('petDescription');
        if (currentPost.description) {
            descriptionElement.textContent = currentPost.description;
        } else {
            descriptionElement.textContent = 'No additional description provided.';
            descriptionElement.style.fontStyle = 'italic';
            descriptionElement.style.color = '#999';
        }

        // Update contact info
        document.getElementById('ownerEmail').textContent = currentPost.email;
        if (currentPost.phone_number) {
            document.getElementById('ownerPhone').textContent = currentPost.phone_number;
            document.getElementById('phoneContact').style.display = 'flex';
        }

        // Update alert recipient
        document.getElementById('alertRecipient').textContent = `@${currentPost.username}`;

        // Show/hide alert button based on ownership
        if (currentUser && currentUser.id === currentPost.user_id) {
            alertBtn.style.display = 'none';
        }
    }

    function setupImageGallery() {
        if (!currentPost.images || currentPost.images.length === 0) {
            // Show placeholder image
            mainImage.src = '/images/no-image-placeholder.png';
            mainImage.alt = 'No image available';
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
            return;
        }

        postImages = currentPost.images;
        currentImageIndex = 0;

        // Display main image
        updateMainImage();

        // Create thumbnails
        if (postImages.length > 1) {
            createThumbnails();
        } else {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        }
    }

    function updateMainImage() {
        if (postImages.length === 0) return;

        const imagePath = postImages[currentImageIndex].startsWith('/') ? 
            postImages[currentImageIndex] : `/${postImages[currentImageIndex]}`;
        
        mainImage.src = imagePath;
        mainImage.alt = `Pet image ${currentImageIndex + 1}`;
        fullscreenImage.src = imagePath;

        // Update active thumbnail
        document.querySelectorAll('.thumbnail').forEach((thumb, index) => {
            thumb.classList.toggle('active', index === currentImageIndex);
        });

        // Update navigation buttons
        prevBtn.style.display = currentImageIndex > 0 ? 'block' : 'none';
        nextBtn.style.display = currentImageIndex < postImages.length - 1 ? 'block' : 'none';
    }

    function createThumbnails() {
        thumbnails.innerHTML = '';
        
        postImages.forEach((image, index) => {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'thumbnail';
            if (index === 0) thumbnail.classList.add('active');
            
            const imagePath = image.startsWith('/') ? image : `/${image}`;
            thumbnail.innerHTML = `<img src="${imagePath}" alt="Thumbnail ${index + 1}">`;
            
            thumbnail.addEventListener('click', () => {
                currentImageIndex = index;
                updateMainImage();
            });
            
            thumbnails.appendChild(thumbnail);
        });
    }

    function navigateImage(direction) {
        if (postImages.length <= 1) return;

        currentImageIndex += direction;
        
        if (currentImageIndex < 0) {
            currentImageIndex = postImages.length - 1;
        } else if (currentImageIndex >= postImages.length) {
            currentImageIndex = 0;
        }
        
        updateMainImage();
    }

    // Share functionality
    function toggleShareMenu() {
        shareMenu?.classList.toggle('active');
    }

    function shareOnFacebook() {
        const url = encodeURIComponent(window.location.href);
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        window.open(facebookUrl, '_blank', 'width=600,height=400');
        shareMenu?.classList.remove('active');
    }

    function shareOnInstagram() {
        // Instagram doesn't allow direct sharing, so copy link and show message
        copyToClipboard(window.location.href);
        showNotification('Link copied! You can now paste it on Instagram.', 'info');
        shareMenu?.classList.remove('active');
    }

    function copyLink() {
        copyToClipboard(window.location.href);
        showNotification('Link copied to clipboard!', 'success');
        shareMenu?.classList.remove('active');
    }

    function copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    }

    // Alert functionality
    function handleAlertClick() {
        if (!currentUser) {
            authModal.style.display = 'block';
        } else {
            alertModal.style.display = 'block';
        }
    }

    async function sendAlert() {
        const message = document.getElementById('alertMessage').value;
        
        try {
            const response = await fetch('/posts/alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: currentPost.id,
                    message: message || `Hi, @${currentPost.username}! You just got an alert from @${currentUser.username}. Contact them for more details.`
                })
            });

            if (response.ok) {
                showNotification('Alert sent successfully!', 'success');
                closeModals();
            } else {
                const error = await response.json();
                showNotification(error.error || 'Failed to send alert', 'error');
            }
        } catch (error) {
            console.error('Send alert error:', error);
            showNotification('Network error while sending alert', 'error');
        }
    }

    // Fullscreen functionality
    function openFullscreen() {
        if (postImages.length === 0) return;
        fullscreenModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeFullscreen() {
        fullscreenModal.style.display = 'none';
        document.body.style.overflow = '';
    }

    // Modal management
    function closeModals() {
        alertModal.style.display = 'none';
        authModal.style.display = 'none';
        document.getElementById('alertMessage').value = '';
    }

    // Navigation
    window.goBack = function() {
        if (document.referrer && document.referrer.includes(window.location.origin)) {
            window.history.back();
        } else {
            window.location.href = '/feed';
        }
    };

    // Utility functions
    function showError(message) {
        const container = document.querySelector('.container');
        container.innerHTML = `
            <div class="error-container" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 50vh;
                text-align: center;
                color: #666;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 3rem;
                margin: 2rem auto;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            ">
                <i class="fas fa-exclamation-triangle" style="
                    font-size: 4rem;
                    color: #e74c3c;
                    margin-bottom: 1rem;
                "></i>
                <h2 style="color: #450920; margin-bottom: 1rem; font-size: 2rem;">${message}</h2>
                <p style="margin-bottom: 2rem; font-size: 1.1rem;">The post you're looking for might have been removed or doesn't exist.</p>
                <button onclick="goBack()" style="
                    background: linear-gradient(135deg, #da627d, #a53860);
                    color: white;
                    border: none;
                    padding: 1rem 2rem;
                    border-radius: 50px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 1.1rem;
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 10px 25px rgba(218, 98, 125, 0.3)';" 
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                    <i class="fas fa-arrow-left" style="margin-right: 0.5rem;"></i>
                    Go Back
                </button>
            </div>
        `;
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
            cursor: pointer;
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

    // Handle image load errors
    function handleImageError(img) {
        img.src = '/images/no-image-placeholder.png';
        img.alt = 'Image not available';
        img.style.objectFit = 'contain';
        img.style.background = '#f5f5f5';
    }

    // Add error handling to images
    if (mainImage) {
        mainImage.addEventListener('error', () => handleImageError(mainImage));
    }

    if (fullscreenImage) {
        fullscreenImage.addEventListener('error', () => handleImageError(fullscreenImage));
    }

    // Touch support for mobile gallery navigation
    let touchStartX = 0;
    let touchEndX = 0;

    mainImage?.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    });

    mainImage?.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50;
        const swipeDistance = touchEndX - touchStartX;

        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0) {
                // Swipe right - previous image
                navigateImage(-1);
            } else {
                // Swipe left - next image
                navigateImage(1);
            }
        }
    }

    // Update page title based on post
    function updatePageTitle() {
        if (currentPost) {
            const petName = currentPost.pet_name || (currentPost.tag === 'lost' ? 'Lost Pet' : 'Found Pet');
            document.title = `${petName} - ${currentPost.tag.toUpperCase()} | PetSquad`;
        }
    }

    // Add meta tags for social sharing
    function addSocialMetaTags() {
        if (!currentPost) return;

        const head = document.head;
        const url = window.location.href;
        const title = `${currentPost.pet_name || 'Pet'} - ${currentPost.tag.toUpperCase()} | PetSquad`;
        const description = `${currentPost.tag === 'lost' ? 'Lost' : 'Found'} pet in ${currentPost.location}. ${currentPost.description || 'Help reunite this pet with their family!'}`;
        const image = currentPost.images && currentPost.images[0] ? 
            `${window.location.origin}/${currentPost.images[0]}` : 
            `${window.location.origin}/images/petsquad-logo.png`;

        // Open Graph tags
        const ogTags = [
            { property: 'og:url', content: url },
            { property: 'og:type', content: 'website' },
            { property: 'og:title', content: title },
            { property: 'og:description', content: description },
            { property: 'og:image', content: image },
        ];

        // Twitter Card tags
        const twitterTags = [
            { name: 'twitter:card', content: 'summary_large_image' },
            { name: 'twitter:title', content: title },
            { name: 'twitter:description', content: description },
            { name: 'twitter:image', content: image },
        ];

        // Add Open Graph tags
        ogTags.forEach(tag => {
            let meta = document.querySelector(`meta[property="${tag.property}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('property', tag.property);
                head.appendChild(meta);
            }
            meta.setAttribute('content', tag.content);
        });

        // Add Twitter tags
        twitterTags.forEach(tag => {
            let meta = document.querySelector(`meta[name="${tag.name}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('name', tag.name);
                head.appendChild(meta);
            }
            meta.setAttribute('content', tag.content);
        });
    }

    // Handle browser back/forward navigation
    window.addEventListener('popstate', function(e) {
        // If user navigates back/forward, reload the page to get correct post
        if (e.state && e.state.postId !== getPostIdFromUrl()) {
            window.location.reload();
        }
    });

    // Add to browser history
    function updateHistory() {
        if (currentPost) {
            const title = `${currentPost.pet_name || 'Pet'} - ${currentPost.tag.toUpperCase()} | PetSquad`;
            window.history.replaceState(
                { postId: currentPost.id }, 
                title, 
                window.location.pathname
            );
        }
    }

    // Add structured data for SEO
    function addStructuredData() {
        if (!currentPost) return;

        const structuredData = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": `${currentPost.pet_name || 'Pet'} - ${currentPost.tag.toUpperCase()}`,
            "description": currentPost.description || `${currentPost.tag === 'lost' ? 'Lost' : 'Found'} pet in ${currentPost.location}`,
            "image": currentPost.images && currentPost.images[0] ? 
                `${window.location.origin}/${currentPost.images[0]}` : 
                `${window.location.origin}/images/petsquad-logo.png`,
            "author": {
                "@type": "Person",
                "name": currentPost.username
            },
            "datePublished": currentPost.created_at,
            "publisher": {
                "@type": "Organization",
                "name": "PetSquad",
                "logo": {
                    "@type": "ImageObject",
                    "url": `${window.location.origin}/images/petsquad-logo.png`
                }
            }
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(structuredData);
        document.head.appendChild(script);
    }

    console.log('PetSquad post detail page loaded successfully');
});