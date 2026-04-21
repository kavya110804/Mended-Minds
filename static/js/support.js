const API_URL = "/announcements";

document.addEventListener("DOMContentLoaded", () => {
  loadAnnouncements();
});

async function loadAnnouncements() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    console.log("DATA:", data);  // 👈 ADD THIS

    const container = document.getElementById("announcement-container");
    container.innerHTML = "";

    data.forEach(item => {
      const card = document.createElement("div");
      card.className = "announcement-card";

      card.innerHTML = `
        <h3>${item.title}</h3>
        <p><strong>Date:</strong> ${item.date}</p>
        <p>${item.description}</p>
      `;

      container.appendChild(card);
    });

  } catch (error) {
    console.error("Error:", error);
  }
}