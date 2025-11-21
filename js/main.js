// Main Page Logic
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    updateHeroButton();
    
    // Listen for storage changes (login/logout from other tabs)
    window.addEventListener('storage', updateHeroButton);
});

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badges = document.querySelectorAll('#cartCount');
    badges.forEach(badge => {
        badge.textContent = count;
    });
}

function updateHeroButton() {
    const heroBtn = document.getElementById('heroSecondaryBtn');
    if (!heroBtn) return;
    
    const username = localStorage.getItem('username');
    const adminSession = localStorage.getItem('adminSession');
    const isLoggedIn = username || adminSession;
    
    if (isLoggedIn) {
        heroBtn.textContent = 'Go to Dashboard';
        heroBtn.setAttribute('onclick', "window.location.href='dashboard.html'");
    } else {
        heroBtn.textContent = 'Join Now';
        heroBtn.setAttribute('onclick', "window.location.href='signup.html'");
    }
}

function handleHeroButtonClick() {
    const username = localStorage.getItem('username');
    const adminSession = localStorage.getItem('adminSession');
    const isLoggedIn = username || adminSession;
    
    if (isLoggedIn) {
        window.location.href = 'dashboard.html';
    } else {
        window.location.href = 'signup.html';
    }
}
