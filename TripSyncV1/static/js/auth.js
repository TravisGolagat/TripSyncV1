// Authentication functionality for TripSync

function initAuthPage() {
    const authTabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    // Set active tab based on URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action') || 'login';
    
    authTabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === action) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Show relevant form based on active tab
    if (action === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
    
    // Tab switching functionality
    authTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabType = this.getAttribute('data-tab');
            
            authTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            if (tabType === 'login') {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
                window.history.replaceState({}, '', '/auth?action=login');
            } else {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
                window.history.replaceState({}, '', '/auth?action=register');
            }
        });
    });
    
    // Form submission handlers
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const submitButton = document.querySelector('#login-form button[type="submit"]');
    
    // Form validation
    if (!emailInput.value.trim()) {
        createFlashMessage('Please enter your email', 'error');
        emailInput.focus();
        return;
    }
    
    if (!passwordInput.value) {
        createFlashMessage('Please enter your password', 'error');
        passwordInput.focus();
        return;
    }
    
    // Update button state
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="loader"></span>';
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: emailInput.value.trim(),
                password: passwordInput.value
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Successful login
            createFlashMessage('Login successful! Redirecting...');
            
            // Store user data and redirect
            fetchUserData(data.user_id);
            
            // Redirect to home or previous page
            const redirectTo = localStorage.getItem('redirectAfterLogin') || '/';
            localStorage.removeItem('redirectAfterLogin');
            
            setTimeout(() => {
                window.location.href = redirectTo;
            }, 1500);
        } else {
            // Login failed
            createFlashMessage(data.error || 'Login failed. Please check your credentials.', 'error');
            
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    } catch (error) {
        console.error('Login error:', error);
        createFlashMessage('An error occurred during login. Please try again.', 'error');
        
        // Reset button state
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('register-name');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const passwordConfirmInput = document.getElementById('register-password-confirm');
    const submitButton = document.querySelector('#register-form button[type="submit"]');
    
    // Form validation
    if (!nameInput.value.trim()) {
        createFlashMessage('Please enter your name', 'error');
        nameInput.focus();
        return;
    }
    
    if (!emailInput.value.trim()) {
        createFlashMessage('Please enter your email', 'error');
        emailInput.focus();
        return;
    }
    
    if (!passwordInput.value) {
        createFlashMessage('Please enter a password', 'error');
        passwordInput.focus();
        return;
    }
    
    if (passwordInput.value.length < 8) {
        createFlashMessage('Password must be at least 8 characters long', 'error');
        passwordInput.focus();
        return;
    }
    
    if (passwordInput.value !== passwordConfirmInput.value) {
        createFlashMessage('Passwords do not match', 'error');
        passwordConfirmInput.focus();
        return;
    }
    
    // Update button state
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="loader"></span>';
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                password: passwordInput.value
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Successful registration
            createFlashMessage('Registration successful! Redirecting...');
            
            // Store user data and redirect
            fetchUserData(data.user_id);
            
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        } else {
            // Registration failed
            createFlashMessage(data.error || 'Registration failed. Please try again.', 'error');
            
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    } catch (error) {
        console.error('Registration error:', error);
        createFlashMessage('An error occurred during registration. Please try again.', 'error');
        
        // Reset button state
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}

// Fetch user data from the server using the user ID
async function fetchUserData(userId) {
    try {
        // In a real implementation, you would fetch the user data from an API
        // For this implementation, we'll mock the user data
        const userData = {
            id: userId,
            name: document.getElementById('register-name')?.value || 'User',
            email: document.getElementById('register-email')?.value || document.getElementById('login-email')?.value,
        };
        
        setUserData(userData);
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
}
