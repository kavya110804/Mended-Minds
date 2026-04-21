const API_URL = "http://127.0.0.1:5000/api";

let selectedMood = null;

const FALLBACK_EMOJIS = {
  "Very Happy": "😄",
  "Happy": "☺️",
  "Neutral": "😐",
  "Sad": "😔",
  "Very Sad": "😭"
};

/*document.addEventListener("DOMContentLoaded", () => {
  loadMoods();
  loadMonthlyMood();
});*/
window.onload = function () {
  loadMoods();
  loadMonthlyMood();
};


async function loadMoods() {
  try {
    const res = await fetch(`${API_URL}/moods`);
    const data = await res.json();

    const container = document.getElementById("mood-container");
    if (!container) return;

    console.log("Mood API response:", data);

    let moods = [];

    if (Array.isArray(data)) {
      moods = data;
    } else if (data && typeof data === "object") {
      if (Array.isArray(data.moods)) moods = data.moods;
      else if (Array.isArray(data.data)) moods = data.data;
      else if (Array.isArray(data.result)) moods = data.result;
      else {
        const foundArray = Object.values(data).find(value => Array.isArray(value));
        if (foundArray) moods = foundArray;
      }
    }

    container.innerHTML = "";

    if (moods.length === 0) {
      container.innerHTML = `<p style="padding: 10px;">No moods found.</p>`;
      console.log("No array found in response.");
      return;
    }

    moods.forEach(m => {
      const card = document.createElement("div");
      card.className = "mood-card";

      const moodName = m.mood_name || m.name || "Mood";
      const emoji = m.emoji || FALLBACK_EMOJIS[moodName] || "🙂";

      card.innerHTML = `
        <div class="mood-emoji">${emoji}</div>
        <div class="mood-label">${moodName}</div>
      `;

      card.onclick = () => {
        document.querySelectorAll(".mood-card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        selectedMood = m.id;
      };

      container.appendChild(card);
    });
  } catch (err) {
    console.error("Mood load error:", err);
  }
}

async function saveMood() {
  const note = document.getElementById("note")?.value.trim() || null;
  const token = localStorage.getItem("mm_token");

  if (!selectedMood) {
    alert("Please select a mood");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/log-mood`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        mood_id: selectedMood,
        note: note
      })
    });

    const data = await res.json();
    alert(data.message);

    // 🔥 ADD THIS BLOCK
    if (res.ok) {
      selectedMood = null;

      document.getElementById("note").value = "";

      document.querySelectorAll(".mood-card")
        .forEach(el => el.classList.remove("selected"));

      loadMonthlyMood();   // refresh list
      loadMoods();         // refresh cards
    }

  } catch (err) {
    console.error("Save error:", err);
    alert("Error saving mood");
  }
}

async function loadMonthlyMood() {
  const token = localStorage.getItem("mm_token");

  try {
    const res = await fetch(`${API_URL}/my-moods`, {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    const data = await res.json();
    const container = document.getElementById("monthly-mood");

    if (!container) return;

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = "No mood data yet";
      return;
    }

    const avg = (data.reduce((sum, m) => sum + (m.mood_score || 0), 0) / data.length).toFixed(1);

    container.innerHTML = `
      <div style="margin-bottom: 12px;">
        <p><strong>Average Mood Score:</strong> ${avg}</p>
        <p><strong>Total Entries:</strong> ${data.length}</p>
      </div>

      <div class="mood-month-list">
        ${data.map(item => {
          const emoji = item.emoji || FALLBACK_EMOJIS[item.mood_name] || "🙂";
          return `
            <div class="mood-month-item">
              <div>
                <strong>${item.logged_date}</strong><br>
                <span>${emoji} ${item.mood_name}</span>
              </div>
              <div style="max-width: 220px; text-align: right;">
                ${item.note ? item.note : ""}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  } catch (err) {
    console.error("Monthly error:", err);
  }
}