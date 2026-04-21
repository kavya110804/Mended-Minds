let currentAudio = null;
let currentButton = null;
let breathInterval = null;
let isBreathing = false;

function toggleAudio(audioId, button) {
  const audio = document.getElementById(audioId);
  const circle = document.querySelector('.breath-circle');
  const breathText = document.getElementById('breathText');
  
  // If audio element not found
  if (!audio) {
    console.error("Audio element not found:", audioId);
    return;
  }
  
  // If this audio is already playing, pause it
  if (currentAudio === audio) {
    audio.pause();
    button.textContent = '▶ Play';
    stopBreathing();
    currentAudio = null;
    currentButton = null;
    return;
  }
  
  // Stop any other playing audio
  if (currentAudio) {
    currentAudio.pause();
    if (currentButton) {
      currentButton.textContent = '▶ Play';
    }
  }
  
  // Play new audio with error handling
  audio.play().then(() => {
    button.textContent = '⏸ Pause';
    currentAudio = audio;
    currentButton = button;
    startBreathing();
  }).catch(error => {
    console.error("Play failed:", error);
    alert("Audio file not available. Using silent mode for demo.");
    
    // Still show breathing animation even if audio fails (for demo)
    button.textContent = '⏸ Pause';
    currentAudio = audio;
    currentButton = button;
    startBreathing();
  });
}

function startBreathing() {
  if (isBreathing) return;
  isBreathing = true;
  
  const breathText = document.getElementById('breathText');
  const circle = document.querySelector('.breath-circle');
  let isIn = true;
  
  breathInterval = setInterval(() => {
    if (isIn) {
      breathText.textContent = 'Breathe Out';
      circle.style.transform = 'scale(0.8)';
      circle.style.backgroundColor = '#d4c4e8';
    } else {
      breathText.textContent = 'Breathe In';
      circle.style.transform = 'scale(1.2)';
      circle.style.backgroundColor = '#b39ddb';
    }
    isIn = !isIn;
  }, 4000);
}

function stopBreathing() {
  if (breathInterval) {
    clearInterval(breathInterval);
    breathInterval = null;
  }
  isBreathing = false;
  
  const breathText = document.getElementById('breathText');
  const circle = document.querySelector('.breath-circle');
  breathText.textContent = 'Press Play';
  circle.style.transform = 'scale(1)';
  circle.style.backgroundColor = '#d1c4e9';
}