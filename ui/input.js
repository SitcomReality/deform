import nipplejs from 'nipplejs';

export class InputManager {
  constructor(player) {
    this.player = player;
    this.keys = {};
    this.joystick = null;
    
    this.setupKeyboard();
    this.setupMobile();
  }
  
  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      this.updatePlayer();
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.updatePlayer();
    });
  }
  
  setupMobile() {
    const joystickContainer = document.createElement('div');
    joystickContainer.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 40px;
      width: 120px;
      height: 120px;
      z-index: 100;
    `;
    document.body.appendChild(joystickContainer);
    
    this.joystick = nipplejs.create({
      zone: joystickContainer,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: '#00FFFF',
      size: 120
    });
    
    this.joystick.on('move', (evt, data) => {
      const angle = data.angle.degree;
      this.player.input.left = angle > 90 && angle < 270;
      this.player.input.right = angle < 90 || angle > 270;
    });
    
    this.joystick.on('end', () => {
      this.player.input.left = false;
      this.player.input.right = false;
    });
    
    // Jump button
    const jumpButton = document.createElement('button');
    jumpButton.textContent = '↑';
    jumpButton.style.cssText = `
      position: fixed;
      bottom: 60px;
      right: 40px;
      width: 80px;
      height: 80px;
      font-size: 2rem;
      border-radius: 50%;
      background: #6B0FFF;
      border: none;
      color: white;
      z-index: 100;
    `;
    
    jumpButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.player.input.jump = true;
    });
    
    jumpButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.player.input.jump = false;
    });
    
    document.body.appendChild(jumpButton);
  }
  
  updatePlayer() {
    this.player.input.left = this.keys['a'] || this.keys['arrowleft'];
    this.player.input.right = this.keys['d'] || this.keys['arrowright'];
    this.player.input.jump = this.keys['w'] || this.keys[' '] || this.keys['arrowup'];
  }
}