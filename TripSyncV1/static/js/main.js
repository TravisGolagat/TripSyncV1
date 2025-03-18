// Main JavaScript functionality for TripSync

document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    initNavbar();
    initScrollEffects();
    initFlashMessages();
    initAccordions();
    initModals();
    initUser();
    
    // Page-specific initializations
    const currentPage = getCurrentPage();
    
    switch(currentPage) {
        case 'index':
            initHomePage();
            break;
        case 'search':
            initSearchPage();
            break;
        case 'offer':
            initOfferPage();
            break;
        case 'auth':
            initAuthPage();
            break;
        case 'ride_details':
            initRideDetailsPage();
            break;
        case 'profile':
            initProfilePage();
            break;
        case 'dashboard':
            initDashboardPage();
            break;
        case 'faq':
            initFAQPage();
            break;
        case 'contact':
            initContactPage();
            break;
    }
});

// Utility Functions
function getCurrentPage() {
    const path = window.location.pathname;
    
    if (path === '/' || path === '/index') {
        return 'index';
    }
    
    if (path.includes('/search')) {
        return 'search';
    }
    
    if (path.includes('/offer')) {
        return 'offer';
    }
    
    if (path.includes('/auth')) {
        return 'auth';
    }
    
    if (path.includes('/ride/')) {
        return 'ride_details';
    }
    
    if (path.includes('/profile/')) {
        return 'profile';
    }
    
    if (path.includes('/dashboard')) {
        return 'dashboard';
    }
    
    if (path.includes('/faq')) {
        return 'faq';
    }
    
    if (path.includes('/contact')) {
        return 'contact';
    }
    
    return '';
}

function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatTime(timeString) {
    return timeString;
}

function formatCurrency(amount) {
    return '$' + parseFloat(amount).toFixed(2);
}

function createFlashMessage(message, type = 'success') {
    const flashContainer = document.createElement('div');
    flashContainer.className = `flash-message flash-${type}`;
    flashContainer.textContent = message;
    
    document.body.appendChild(flashContainer);
    
    setTimeout(() => {
        flashContainer.remove();
    }, 5000);
}

function getUserData() {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
}

function setUserData(userData) {
    localStorage.setItem('user', JSON.stringify(userData));
    updateAuthUI();
}

function clearUserData() {
    localStorage.removeItem('user');
    updateAuthUI();
}

function isLoggedIn() {
    return !!getUserData();
}

function updateAuthUI() {
    const authLinks = document.querySelector('.nav-auth');
    if (!authLinks) return;
    
    if (isLoggedIn()) {
        const user = getUserData();
        authLinks.innerHTML = `
            <a href="/dashboard" class="btn btn-sm btn-outline">Dashboard</a>
            <a href="#" id="logout-btn" class="btn btn-sm btn-primary">Logout</a>
        `;
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }
    } else {
        authLinks.innerHTML = `
            <a href="/auth?action=login" class="btn btn-sm btn-outline">Login</a>
            <a href="/auth?action=register" class="btn btn-sm btn-primary">Sign Up</a>
        `;
    }
}

async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            clearUserData();
            createFlashMessage('You have been logged out successfully');
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Logout error:', error);
        createFlashMessage('Failed to logout. Please try again.', 'error');
    }
}

// Component Initializations
function initNavbar() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });
    }
}

function initScrollEffects() {
    const header = document.querySelector('header');
    
    if (header) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }
}

function initFlashMessages() {
    const flashMessages = document.querySelectorAll('.flash-message');
    
    flashMessages.forEach(flash => {
        setTimeout(() => {
            flash.remove();
        }, 5000);
    });
}

function initAccordions() {
    const accordions = document.querySelectorAll('.accordion');
    
    accordions.forEach(accordion => {
        const header = accordion.querySelector('.accordion-header');
        
        if (header) {
            header.addEventListener('click', function() {
                accordion.classList.toggle('active');
            });
        }
    });
}

function initModals() {
    const modalTriggers = document.querySelectorAll('[data-modal]');
    const modalOverlays = document.querySelectorAll('.modal-overlay');
    const modalCloseButtons = document.querySelectorAll('.modal-close');
    
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            
            if (modal) {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });
    
    modalOverlays.forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
    
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal-overlay');
            
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
}

function initUser() {
    updateAuthUI();
}

// Page-specific Initializations
function initHomePage() {
    const searchForm = document.querySelector('.search-form');
    
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const fromInput = this.querySelector('input[name="from"]');
            const toInput = this.querySelector('input[name="to"]');
            const dateInput = this.querySelector('input[name="date"]');
            
            if (fromInput && toInput) {
                const from = fromInput.value.trim();
                const to = toInput.value.trim();
                const date = dateInput ? dateInput.value : '';
                
                window.location.href = `/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`;
            }
        });
    }
}

function initFAQPage() {
    // FAQ page specific initialization
    // Already handled by the accordion initialization
}

function initContactPage() {
    const contactForm = document.querySelector('.contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simulating form submission
            createFlashMessage('Your message has been sent successfully!');
            contactForm.reset();
        });
    }
}
