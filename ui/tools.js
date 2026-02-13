export class ToolManager {
  constructor(physics, renderer) {
    this.physics = physics;
    this.renderer = renderer;
    this.activeTool = 'drag';
    this.isDragging = false;
    this.lastPos = null;
    this.lastParticle = null; // For connecting chains
    
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
      { name: 'drag', icon: '✋', label: 'Drag' },
      { name: 'draw', icon: '✏️', label: 'Build' },
      { name: 'sand', icon: '⌛', label: 'Sand' },
      { name: 'cut', icon: '✂️', label: 'Cut' },
      { name: 'pin', icon: '📌', label: 'Pin' },
      { name: 'erase', icon: '🗑️', label: 'Erase' },
      { name: 'explode', icon: '💥', label: 'Boom' }
    ];
    
    // Prevent dragging on toolbar
    toolBar.addEventListener('mousedown', e => e.stopPropagation());
    toolBar.addEventListener('touchstart', e => e.stopPropagation());
    
    for (const tool of tools) {
      const btn = document.createElement('button');
      btn.innerHTML = `${tool.icon}<br><span style="font-size: 0.7rem">${tool.label}</span>`;
      btn.style.cssText = `
        background: ${this.activeTool === tool.name ? '#6B0FFF' : '#1a1a1a'};
        border: 2px solid #00FFFF;
        color: #fff;
        padding: 8px 12px;
        font-family: 'Space Mono', monospace;
        cursor: pointer;
        min-width: 60px;
        transition: all 0.2s;
        border-radius: 4px;
        user-select: none;
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
      this.lastParticle = null;
      this.physics.endGrab();
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
      case 'drag':
        this.handleDrag(worldPos);
        break;
      case 'draw':
        this.drawStructure(worldPos);
        break;
      case 'sand':
        this.pourSand(worldPos);
        break;
      case 'cut':
        this.cutTool(worldPos);
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

  handleDrag(pos) {
    if (!this.physics.grabConstraint) {
      this.physics.startGrab(pos);
    }
    this.physics.updateGrab(pos);
  }
  
  drawStructure(pos) {
    const minStep = 2.0;
    
    // Check distance from last particle
    if (this.lastParticle) {
      const dist = Math.sqrt(
        Math.pow(pos.x - this.lastParticle.pos.x, 2) + 
        Math.pow(pos.y - this.lastParticle.pos.y, 2)
      );
      if (dist < minStep) return;
    }

    const particle = this.physics.createParticle(pos.x, pos.y);
    
    // Connect to previous in chain
    if (this.lastParticle) {
      this.physics.linkParticles(this.lastParticle, particle, 1.0, 8);
    }
    
    // Triangulate with nearby existing structure
    this.physics.triangulate(particle, 3.5);
    
    this.lastParticle = particle;
  }
  
  pourSand(pos) {
    // Pour rate limit
    if (Math.random() > 0.5) return;
    
    const jitterX = (Math.random() - 0.5) * 1.5;
    const jitterY = (Math.random() - 0.5) * 1.5;
    
    this.physics.createParticle(pos.x + jitterX, pos.y + jitterY, 0.5, '#FFD700');
  }

  cutTool(pos) {
    if (this.lastPos) {
      this.physics.cutLine(this.lastPos, pos);
    }
  }
  
  eraseTerrain(pos) {
    const radius = 2;
    this.physics.removeParticlesInRadius(pos.x, pos.y, radius);
  }
  
  pinParticles(pos) {
    // Debounce pin to avoid rapid toggle
    if (Math.random() > 0.1) return; 
    
    const radius = 1.5;
    this.physics.pinParticlesInRadius(pos.x, pos.y, radius);
  }
  
  explodeParticles(pos) {
    // Explosion should only happen on click start really, but drag is fun too
    if (Math.random() > 0.1) return;
    
    const radius = 5;
    const force = 50;
    this.physics.explodeParticlesInRadius(pos.x, pos.y, radius, force);
  }
}