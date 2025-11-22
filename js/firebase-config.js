// Firebase Configuration - Shop Site (Firestore + Database)
const firebaseConfig = {
    apiKey: "AIzaSyB03DRF5M-a-2nrFwjM8YvpQ58vRjfTn9w",
    authDomain: "laurixy-shop.firebaseapp.com",
    databaseURL: "https://laurixy-shop-default-rtdb.firebaseio.com",
    projectId: "laurixy-shop",
    storageBucket: "laurixy-shop.firebasestorage.app",
    messagingSenderId: "756132572660",
    appId: "1:756132572660:web:5b7d10b1966c9c4d6a1da1",
    measurementId: "G-DT53D8STQ3"
};

// Firebase Configuration - Main Site (Authentication only)
const mainSiteFirebaseConfig = {
    apiKey: "AIzaSyCxugQpFlWBLE_9VVExDIRVRbH4_aFPxRk",
    authDomain: "laurixy-45813.firebaseapp.com",
    databaseURL: "https://laurixy-45813-default-rtdb.firebaseio.com",
    projectId: "laurixy-45813",
    storageBucket: "laurixy-45813.firebasestorage.app",
    messagingSenderId: "311152588741",
    appId: "1:311152588741:web:9122a3bc203dddbc153dac"
};

// Initialize Firebase Apps
let shopApp, mainApp;

if (!firebase.apps.length) {
    // Initialize shop app (default)
    shopApp = firebase.initializeApp(firebaseConfig);
    // Initialize main site app
    mainApp = firebase.initializeApp(mainSiteFirebaseConfig, "mainSite");
} else {
    shopApp = firebase.apps[0];
    mainApp = firebase.apps.find(app => app.name === "mainSite") || firebase.initializeApp(mainSiteFirebaseConfig, "mainSite");
}

// Reduce Firestore console noise (warnings, debug logs)
firebase.firestore.setLogLevel('error');

// Get Firebase services from shop app
const auth = shopApp.auth();
const db = shopApp.firestore();
const rtdb = shopApp.database();

// Get auth from main site app for cross-site login
const mainAuth = mainApp.auth();

// Admin credentials
const ADMIN_EMAIL = "admin@laurixy.com";
const ADMIN_PASSWORD = "admin640";

// Delivery charge
const DELIVERY_CHARGE = 200;

// Payment methods storage
let paymentMethods = {
    bank: { iban: "", account: "" },
    jazzcash: { number: "" },
    easypaisa: { number: "" },
    raast: { account: "" }
};

// Initialize payment methods from Firestore
async function initializePaymentMethods() {
    try {
        const doc = await db.collection('settings').doc('paymentMethods').get();
        if (doc.exists) {
            paymentMethods = doc.data();
        }
    } catch (error) {
        // Fallback to default payment methods if Firestore read fails
    }
}

initializePaymentMethods();

// Helper function to show toast notifications
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Helper function to show/hide loading spinner
function showLoading(show = true) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        if (show) {
            spinner.classList.remove('hidden');
        } else {
            spinner.classList.add('hidden');
        }
    }
}

// Helper function to format currency
function formatCurrency(amount) {
    return `Rs. ${amount.toLocaleString('en-PK')}`;
}

// Helper function to format date
function formatDate(date) {
    if (typeof date === 'object' && date.toDate) {
        date = date.toDate();
    }
    return new Date(date).toLocaleDateString('en-PK');
}

// Helper function to format time
function formatTime(date) {
    if (typeof date === 'object' && date.toDate) {
        date = date.toDate();
    }
    return new Date(date).toLocaleTimeString('en-PK');
}

// Get current user
function getCurrentUser() {
    return auth.currentUser;
}

// Check if user is authenticated
function isAuthenticated() {
    return getCurrentUser() !== null;
}

// Logout function
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    }).catch(error => {
        showToast('Logout failed: ' + error.message, 'error');
    });
}

// Go to dashboard
function goToDashboard() {
    window.location.href = 'dashboard.html';
}

// Go to admin panel
function goToAdmin() {
    window.location.href = 'admin.html';
}

// Update UI based on auth state
// Only update UI, don't redirect
function updateNavbarUI(user) {
    const authMenu = document.getElementById('authMenu');
    const userMenu = document.getElementById('userMenu');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const logoUsername = document.getElementById('logoUsername');
    const usernameText = document.getElementById('usernameText');
    
    // Only update UI if elements exist
    if (!authMenu || !userMenu) {
        return;
    }
    
    if (user) {
        // User is logged in
        try {
            // Get user data from Firestore
            db.collection('users').doc(user.uid).get().then(userDoc => {
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const username = userData.username || user.email.split('@')[0];
                    const firstLetter = username.charAt(0).toUpperCase();
                    
                    // Update avatar with first letter AND username
                    if (userAvatar) {
                        userAvatar.textContent = firstLetter;
                        userAvatar.title = username;  // Show full username on hover
                    }
                    
                    // Update user name in dropdown
                    if (userName) {
                        userName.textContent = username;
                    }
                    
                    // Update username next to logo
                    if (usernameText) {
                        usernameText.textContent = username;
                    }
                    if (logoUsername) {
                        logoUsername.style.display = 'flex';
                    }
                }
            }).catch(error => {
                console.error('Error fetching user data:', error);
            });
        } catch (error) {
            console.error('Error in updateNavbarUI:', error);
        }
        
        // Show user menu, hide auth menu - FORCE UPDATE
        if (authMenu) {
            authMenu.style.display = 'none';
            authMenu.classList.add('hidden');
        }
        if (userMenu) {
            userMenu.style.display = 'flex';
            userMenu.classList.remove('hidden');
        }
        
        // Show mobile logout button
        const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
        if (mobileLogoutBtn) {
            mobileLogoutBtn.classList.remove('hidden');
            mobileLogoutBtn.style.display = 'block';
        }
    } else {
        // User is NOT logged in
        if (authMenu) {
            authMenu.style.display = 'flex';
            authMenu.classList.remove('hidden');
        }
        if (userMenu) {
            userMenu.style.display = 'none';
            userMenu.classList.add('hidden');
        }
        if (logoUsername) {
            logoUsername.style.display = 'none';
        }
        
        // Hide mobile logout button
        const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
        if (mobileLogoutBtn) {
            mobileLogoutBtn.classList.add('hidden');
            mobileLogoutBtn.style.display = 'none';
        }
    }
}

// Listen for auth state changes from main site
mainAuth.onAuthStateChanged((mainUser) => {
    if (mainUser) {
        // User is logged in on main site, auto-login on shop
        console.log('Main site user detected:', mainUser.email);
        // Sign in to shop with main site credentials
        auth.signInWithEmailAndPassword(mainUser.email, mainUser.uid)
            .catch(() => {
                // If direct sign-in fails, user needs to sign up on shop
                console.log('User needs to sign up on shop site');
            });
    }
});

// Listen for auth state changes from shop
auth.onAuthStateChanged((user) => {
    console.log('Auth state changed:', user ? 'Logged in' : 'Logged out');
    updateNavbarUI(user);
});

// Also update navbar when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, updating navbar');
    const user = getCurrentUser();
    updateNavbarUI(user);
    
    // Also update after a small delay to ensure Firebase is ready
    setTimeout(() => {
        const currentUser = getCurrentUser();
        if (currentUser) {
            updateNavbarUI(currentUser);
        }
    }, 500);
    
    // Add hover effect to username badge to show dropdown
    const logoUsername = document.getElementById('logoUsername');
    const userMenu = document.getElementById('userMenu');
    const userDropdown = document.querySelector('.user-dropdown');
    
    function positionDropdown() {
        if (logoUsername && userDropdown) {
            const rect = logoUsername.getBoundingClientRect();
            userDropdown.style.top = (rect.bottom + 10) + 'px';
            userDropdown.style.right = (window.innerWidth - rect.right) + 'px';
        }
    }
    
    if (logoUsername && userMenu) {
        logoUsername.addEventListener('mouseenter', () => {
            if (userDropdown) {
                positionDropdown();
                userDropdown.style.display = 'block';
            }
        });
        
        logoUsername.addEventListener('mouseleave', () => {
            if (userDropdown && !userMenu.matches(':hover')) {
                userDropdown.style.display = 'none';
            }
        });
        
        // Also position on window resize
        window.addEventListener('resize', () => {
            if (userDropdown && userDropdown.style.display === 'block') {
                positionDropdown();
            }
        });
    }
    
    // Mobile hamburger menu toggle
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        
        // Close menu when a link is clicked
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            }
        });
    }
});
