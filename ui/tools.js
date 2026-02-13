export class ToolManager {
  constructor(physics, renderer) {
    this.physics = physics;
    this.renderer = renderer;
    this.activeTool = 'draw';
    this.isDragging = false;
    this.lastPos = null;
    
    this.setupUI();
    this.setupInput();
  }
  
  setupUI() {
    const toolBar = document.createElement('div');
    toolBar.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      background: rgba(0, 0, 0, 0.8);
      padding: 10px;
      border: 2px solid #00FFFF;
      z-index: 100;
    `;
    
    const tools = [
      { name: 'draw', icon: '✏️', label: 'Draw' },
      { name: 'erase', icon: '🗑️', label: 'Erase' },
      { name: 'pin', icon: '📌', label: 'Pin' },
      { name: 'explode', icon: '💥', label: 'Explode' }
    ];
    
    for (const tool of tools) {
      const btn = document.createElement('button');
      btn.innerHTML = `${tool.icon}<br><span style="font-size: 0.7rem">${tool.label}</span>`;
      btn.style.cssText = `
        background: ${this.activeTool === tool.name ? '#6B0FFF' : '#1a1a1a'};
        border: 2px solid #00FFFF;
        color: #fff;
        padding: 10px;
        font-family: 'Space Mono', monospace;
        cursor: pointer;
        min-width: 70px;
        transition: all 0.2s;
      `;
      
      btn.addEventListener('click', () => {
        this.activeTool = tool.name;
        // Update all button styles
        toolBar.querySelectorAll('button').forEach((b, i) => {
          b.style.background = tools[i].name === tool.name ? '#6B0FFF' : '#1a1a1a';
        });
      });
      
      toolBar.appendChild(btn);
    }
    
    document.body.appendChild(toolBar);
  }
  
  setupInput() {
    const canvas = this.renderer.canvas;
    
    const handleStart = (x, y) => {
      this.isDragging = true;
      const worldPos = this.renderer.screenToWorld(x, y);
      this.lastPos = worldPos;
      this.useTool(worldPos);
    };
    
    const handleMove = (x, y) => {
      if (!this.isDragging) return;
      const worldPos = this.renderer.screenToWorld(x, y);
      this.useTool(worldPos);
      this.lastPos = worldPos;
    };
    
    const handleEnd = () => {
      this.isDragging = false;
      this.lastPos = null;
    };
    
    // Mouse
    canvas.addEventListener('mousedown', (e) => handleStart(e.clientX, e.clientY));
    canvas.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
    canvas.addEventListener('mouseup', handleEnd);
    
    // Touch
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    });
    
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    });
    
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleEnd();
    });
  }
  
  useTool(worldPos) {
    switch (this.activeTool) {
      case 'draw':
        this.drawTerrain(worldPos);
        break;
      case 'erase':
        this.eraseTerrain(worldPos);
        break;
      case 'pin':
        this.pinParticles(worldPos);
        break;
      case 'explode':
        this.explodeParticles(worldPos);
        break;
    }
  }
  
  drawTerrain(pos) {
    // Create small particle clusters
    if (this.lastPos) {
      const dist = Math.sqrt(
        Math.pow(pos.x - this.lastPos.x, 2) + 
        Math.pow(pos.y - this.lastPos.y, 2)
      );
      
      if (dist < 0.5) return; // Too close, skip
    }
    
    // Add a single particle (simplified for now)
    const particle = this.physics.createParticle(pos.x, pos.y);
    if (particle) {
      // Try to connect to nearby particles
      this.physics.connectNearbyParticles(particle, 2);
    }
  }
  
  eraseTerrain(pos) {
    const radius = 2;
    this.physics.removeParticlesInRadius(pos.x, pos.y, radius);
  }
  
  pinParticles(pos) {
    const radius = 1.5;
    this.physics.pinParticlesInRadius(pos.x, pos.y, radius);
  }
  
  explodeParticles(pos) {
    const radius = 5;
    const force = 50;
    this.physics.explodeParticlesInRadius(pos.x, pos.y, radius, force);
  }
}