document.addEventListener("DOMContentLoaded", () => {

    const authClose = document.getElementById("auth-close-btn");
    if (authClose) {
        authClose.addEventListener("click", closeAuthModal);
    }

    const loginTab = document.getElementById("login-tab-btn");
    if (loginTab) {
        loginTab.addEventListener("click", () => switchTab("login"));
    }

    const registerTab = document.getElementById("register-tab-btn");
    if (registerTab) {
        registerTab.addEventListener("click", () => switchTab("register"));
    }

    const forgotBtn = document.getElementById("forgot-btn");
    if (forgotBtn) {
        forgotBtn.addEventListener("click", (e) => {
            e.preventDefault();
            switchTab("reset");
        });
    }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", handleRegister);
    }

    const resetForm = document.getElementById("resetForm");
    if (resetForm) {
        resetForm.addEventListener("submit", handleResetRequest);
    }

});