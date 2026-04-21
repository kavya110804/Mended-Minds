const AUTH_API_URL = "/api";

// ── UTILITIES ─────────────────────────────────────────────
function showAlert(elementId, message, type) {
  const alertEl = document.getElementById(elementId);
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.className = `alert alert-${type} show`;
  setTimeout(() => { alertEl.className = 'alert'; }, 5000);
}

function setLoading(buttonId, loading, originalText) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'Please wait...' : originalText;
}

function getToken()   { return localStorage.getItem("mm_token"); }
function isLoggedIn() { return getToken() !== null; }

// ── SIGNUP ─────────────────────────────────────────────────
async function signup() {
  const name     = document.getElementById("name")?.value.trim();
  const email    = document.getElementById("email")?.value.trim();
  const username = document.getElementById("username")?.value.trim();
  const password = document.getElementById("password")?.value;
  const confirm  = document.getElementById("confirm_password")?.value;

  if (!name || !email || !username || !password) {
    showAlert("signup-alert", "Please fill in all fields.", "error"); return;
  }
  if (password !== confirm) {
    showAlert("signup-alert", "Passwords do not match!", "error"); return;
  }
  if (password.length < 6) {
    showAlert("signup-alert", "Password must be at least 6 characters.", "error"); return;
  }

  setLoading("signup-btn", true, "Create Account");

  try {
    const response = await fetch(`${AUTH_API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, username, password })
    });

    const data = await response.json();

    if (response.ok) {
      showAlert("signup-alert", data.message, "success");

      setTimeout(() => {
        window.location.href = "/login";   // ✅ FIXED
      }, 2000);

    } else {
      showAlert("signup-alert", data.message, "error");
    }

  } catch (error) {
    showAlert("signup-alert", "Cannot connect to server. Is Flask running?", "error");
  } finally {
    setLoading("signup-btn", false, "Create Account");
  }
}

// ── LOGIN ──────────────────────────────────────────────────
async function login() {
  const email    = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;

  if (!email || !password) {
    showAlert("login-alert", "Please enter email and password.", "error"); return;
  }

  setLoading("login-btn", true, "Login");

  try {
    const response = await fetch(`${AUTH_API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      // ✅ SAVE TOKEN PROPERLY
      localStorage.setItem("mm_token", data.token);
      localStorage.setItem("mm_user_name", data.name);
      localStorage.setItem("mm_user_role", data.role);

      showAlert("login-alert", "Login successful! Redirecting...", "success");

      setTimeout(() => {
        window.location.href = "/dashboard";   // ✅ FIXED
      }, 1500);

    } else {
      showAlert("login-alert", data.message, "error");
    }

  } catch (error) {
    showAlert("login-alert", "Cannot connect to server. Is Flask running?", "error");
  } finally {
    setLoading("login-btn", false, "Login");
  }
}

// ── LOGOUT ─────────────────────────────────────────────────
function logout() {
  localStorage.removeItem("mm_token");
  localStorage.removeItem("mm_user_name");
  localStorage.removeItem("mm_user_role");

  window.location.href = "/login";   // ✅ FIXED
}

// ── AUTH GUARD ─────────────────────────────────────────────
function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href = "/login";   // ✅ FIXED
  }
}

function loadUserName() {
  const nameEl = document.getElementById("user-name");
  if (nameEl) {
    nameEl.textContent = localStorage.getItem("mm_user_name") || "User";
  }
}