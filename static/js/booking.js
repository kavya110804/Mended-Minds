// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {

  console.log("booking.js loaded");

  const counsellorMap = {
    "anxiety":        [{ id: 1, name: "Dr. Mehta (Anxiety Specialist)" }],
    "depression":     [{ id: 2, name: "Dr. Sharma (Depression Expert)" }],
    "stress":         [{ id: 3, name: "Dr. Patel (Stress Management)" }],
    "sleep Issues":   [{ id: 4, name: "Dr. Iyer (Sleep Therapist)" }],
    "relationship":   [{ id: 5, name: "Dr. Kapoor (Relationship Counsellor)" }],
    "work Pressure":  [{ id: 3, name: "Dr. Patel (Stress Management)" }],
    "loneliness":     [{ id: 6, name: "Dr. Singh (Emotional Support)" }],
    "personal Growth":[{ id: 7, name: "Dr. Rao (Life Coach)" }],
    "bullying":       [{ id: 8, name: "Dr. Khan (Trauma Specialist)" }],
    "trauma":         [{ id: 8, name: "Dr. Khan (Trauma Specialist)" }]
  };

  // ISSUE SELECTION
  const issueButtons = document.querySelectorAll(".issue-btn");

  issueButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      issueButtons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      window.selectedIssue = btn.getAttribute("data-issue");
      updateCounsellors(window.selectedIssue);
    });
  });

  // UPDATE COUNSELLOR DROPDOWN
  function updateCounsellors(issue) {
    const select = document.getElementById("counsellor");
    select.innerHTML = "";

    const list = counsellorMap[issue.toLowerCase()] || [];

    if (list.length === 0) {
      select.innerHTML = `<option value="">No counsellors available</option>`;
      return;
    }

    list.forEach(c => {
      const option = document.createElement("option");
      option.value = c.id;
      option.textContent = c.name;
      select.appendChild(option);
    });
  }

  // Set min date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById("date").setAttribute("min", today);

  // Load existing bookings on page load
  loadBookings();

});


// ============================================================
// bookSession() — GLOBAL SCOPE
// ============================================================
async function bookSession() {
  const counsellor_id = document.getElementById("counsellor")?.value;
  const date          = document.getElementById("date")?.value;
  const time          = document.getElementById("time")?.value;
  const notes         = document.getElementById("notes")?.value;
  const selectedIssue = window.selectedIssue;

  // PAST DATE VALIDATION
  if (date && time) {
    const selectedDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    
    if (selectedDateTime < now) {
      alert("❌ Cannot book a session in the past. Please select a future date and time.");
      return;
    }
  }

  if (!selectedIssue) {
    alert("Please select an issue");
    return;
  }

  if (!date || !time) {
    alert("Please select date and time");
    return;
  }

  if (!counsellor_id) {
    alert("Please select a counsellor");
    return;
  }

  const token = localStorage.getItem("mm_token");

  if (!token) {
    alert("You are not logged in. Please login first.");
    window.location.href = "/login";
    return;
  }

  // Create datetime string properly
  const slot_datetime = `${date} ${time}:00`;

  try {
    const response = await fetch("http://127.0.0.1:5000/api/book-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        counsellor_id,
        issue: selectedIssue,
        slot_datetime: slot_datetime,
        notes
      })
    });

    const data = await response.json();
    alert(data.message);

    if (response.ok) {
      loadBookings();
      
      document.getElementById("booking-info").style.display = "block";
      document.getElementById("booking-form").style.display = "none";
      document.getElementById("upcoming-sessions").style.display = "block";
      
      window.selectedIssue = null;
      document.querySelectorAll(".issue-btn").forEach(b => b.classList.remove("selected"));
      document.getElementById("date").value = "";
      document.getElementById("time").value = "";
      document.getElementById("notes").value = "";
    }

  } catch (err) {
    console.error("Error:", err);
    alert("Cannot connect to server. Is Flask running?");
  }
}


// ============================================================
// loadBookings() — Load and display bookings
// ============================================================
async function loadBookings() {
  const token = localStorage.getItem("mm_token");
  const container = document.getElementById("booking-list");

  if (!container) return;

  if (!token) {
    container.innerHTML = "<p style='color: var(--color-text-light);'>Please login to view bookings</p>";
    return;
  }

  try {
    const response = await fetch("http://127.0.0.1:5000/api/my-bookings", {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    const bookings = await response.json();

    if (!bookings || bookings.length === 0) {
      container.innerHTML = "<p style='color: var(--color-text-light);'>No sessions booked yet</p>";
      return;
    }

    container.innerHTML = "";

    bookings.forEach(b => {
      const card = document.createElement("div");
      card.className = "booking-card";

      card.innerHTML = `
        <p><strong>📅 Date:</strong> ${formatDateTime(b.slot_datetime)}</p>
        <p><strong>📋 Issue:</strong> ${b.issue || "Not specified"}</p>
        <p><strong>📝 Notes:</strong> ${b.notes || "None"}</p>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    console.error("Error loading bookings:", err);
    container.innerHTML = "<p style='color: var(--color-error);'>Failed to load bookings</p>";
  }
}


// ============================================================
// formatDateTime() — Manual parsing to avoid timezone issues
// ============================================================
function formatDateTime(datetime) {
  if (!datetime) return "N/A";
  
  // Parse manually to avoid timezone issues
  const parts = datetime.split(/[- :T]/);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  const hour = parts[3];
  const minute = parts[4];
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  let hourNum = parseInt(hour);
  const ampm = hourNum >= 12 ? "PM" : "AM";
  hourNum = hourNum % 12 || 12;
  
  return `${day} ${months[parseInt(month) - 1]} ${year}, ${hourNum}:${minute} ${ampm}`;
}