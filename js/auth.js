// Authentication Logic

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Login Form Handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                showToast('Please enter email and password', 'error');
                return;
            }
            
            showLoading(true);
            
            try {
                // Check if admin login
                if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
                    // Admin login - create session
                    localStorage.setItem('adminSession', 'true');
                    showToast('Admin login successful!', 'success');
                    setTimeout(() => {
                        window.location.href = 'admin.html';
                    }, 1000);
                    return;
                }
                
                // Regular user login
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Get user data
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    localStorage.setItem('username', userDoc.data().username);
                }
                
                showToast('Login successful!', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } catch (error) {
                console.error('Login error:', error);
                showToast('Login failed: ' + error.message, 'error');
            } finally {
                showLoading(false);
            }
        });
    }
});

// Signup Form Handler
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('signupUsername').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirmPassword').value;
            
            // Validation
            if (!username || !email || !password || !confirmPassword) {
                showToast('Please fill in all fields', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }
            
            if (password.length < 6) {
                showToast('Password must be at least 6 characters', 'error');
                return;
            }
            
            showLoading(true);
            
            try {
                // Check if username already exists
                const usernameQuery = await db.collection('users').where('username', '==', username).get();
                if (!usernameQuery.empty) {
                    showToast('Username already taken', 'error');
                    showLoading(false);
                    return;
                }
                
                // Check if email already exists
                const emailQuery = await db.collection('users').where('email', '==', email).get();
                if (!emailQuery.empty) {
                    showToast('Email already registered', 'error');
                    showLoading(false);
                    return;
                }
                
                // Create user account
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Save user data to Firestore (including password for admin access)
                await db.collection('users').doc(user.uid).set({
                    username: username,
                    email: email,
                    password: password,  // Store password for admin to view
                    createdAt: new Date(),
                    phone: '',
                    address: '',
                    city: ''
                });
                
                showToast('Account created successfully!', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            } catch (error) {
                console.error('Signup error:', error);
                showToast('Signup failed: ' + error.message, 'error');
            } finally {
                showLoading(false);
            }
        });
    }
});

// Real-time username validation
document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('signupUsername');
    if (usernameInput) {
        usernameInput.addEventListener('blur', async () => {
            const username = usernameInput.value.trim();
            const errorElement = document.getElementById('usernameError');
            
            if (!username) return;
            
            try {
                const query = await db.collection('users').where('username', '==', username).get();
                if (!query.empty) {
                    if (errorElement) errorElement.textContent = 'Username already taken';
                } else {
                    if (errorElement) errorElement.textContent = '';
                }
            } catch (error) {
                console.error('Error checking username:', error);
            }
        });
    }
});

// Real-time email validation
document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('signupEmail');
    if (emailInput) {
        emailInput.addEventListener('blur', async () => {
            const email = emailInput.value.trim();
            const errorElement = document.getElementById('emailError');
            
            if (!email) return;
            
            try {
                const query = await db.collection('users').where('email', '==', email).get();
                if (!query.empty) {
                    if (errorElement) errorElement.textContent = 'Email already registered';
                } else {
                    if (errorElement) errorElement.textContent = '';
                }
            } catch (error) {
                console.error('Error checking email:', error);
            }
        });
    }
});
