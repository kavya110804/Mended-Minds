// Use a unique name to avoid conflicts
const DASHBOARD_API_URL = "http://127.0.0.1:5000/api";

async function loadDashboardStats() {
  const token = localStorage.getItem("mm_token");
  
  if (!token) {
    console.error("No token found");
    return;
  }

  try {
    const response = await fetch(`${DASHBOARD_API_URL}/dashboard/stats`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await response.json();
    
    const statNumbers = document.querySelectorAll('.stat-number');
    
    if (statNumbers.length >= 3) {
      statNumbers[0].textContent = data.today_mood || "—";
      statNumbers[1].textContent = data.session_count || 0;
      statNumbers[2].textContent = data.weekly_avg ? `${data.weekly_avg}/5` : "—";
    }

  } catch (error) {
    console.error("Failed to load stats:", error);
  }
}

// Load user name function
function loadUserName() {
  const name = localStorage.getItem("mm_user_name") || "User";
  const nameSpan = document.getElementById("user-name");
  if (nameSpan) nameSpan.textContent = name;
}

// Run on page load
document.addEventListener("DOMContentLoaded", () => {
  loadUserName();
  loadDashboardStats();
});