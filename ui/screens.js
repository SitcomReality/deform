export class ScreenManager {
  constructor() {
    this.screens = {
      start: document.getElementById('startScreen'),
      loading: document.getElementById('loadingScreen')
    };
    
    this.seedInput = document.getElementById('seedInput');
    this.startButton = document.getElementById('startButton');
    this.loadingFill = document.getElementById('loadingFill');
    this.loadingText = document.getElementById('loadingText');
  }
  
  show(screenName) {
    for (const screen of Object.values(this.screens)) {
      screen.classList.remove('active');
    }
    this.screens[screenName]?.classList.add('active');
  }
  
  hide(screenName) {
    this.screens[screenName]?.classList.remove('active');
  }
  
  hideAll() {
    for (const screen of Object.values(this.screens)) {
      screen.classList.remove('active');
    }
  }
  
  setLoadingProgress(percent, text) {
    this.loadingFill.style.width = `${percent}%`;
    this.loadingText.textContent = text;
  }
  
  getSeed() {
    const input = this.seedInput.value.trim();
    if (input) {
      // Convert string to number
      let hash = 0;
      for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) - hash) + input.charCodeAt(i);
        hash = hash & hash;
      }
      return Math.abs(hash);
    }
    return Date.now();
  }
  
  onStart(callback) {
    this.startButton.addEventListener('click', () => {
      callback(this.getSeed());
    });
    
    this.seedInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        callback(this.getSeed());
      }
    });
  }
}