import { SoftBody } from '../engine/mesh.js';
import { CONFIG } from '../config.js';

export class ToolManager {
  constructor(physics, renderer, game) {
    this.physics = physics;
    this.renderer = renderer;
    this.game = game;
    this.activeTool = 'drag';
    this.brushSize = 3;
    this.isDragging = false;
    this.currentWorldPos = { x: 0, y: 0 };
    this.lastPos = null;
    this.lastParticle = null; // For connecting chains
    this.pinnedThisDrag = new Set();
    this.audioCtx = null;
    
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
      btn.className = 'tool-btn';
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
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      `;
      
      btn.addEventListener('click', () => {
        this.activeTool = tool.name;
        // Update all button styles
        toolBar.querySelectorAll('.tool-btn').forEach((b, i) => {
          if (i < tools.length) {
            b.style.background = tools[i].name === tool.name ? '#6B0FFF' : '#1a1a1a';
          }
        });
      });
      
      toolBar.appendChild(btn);
    }

    // Controls Section (Brush, Pause, Clear)
    const controlBar = document.createElement('div');
    controlBar.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 20px;
      background: rgba(0, 0, 0, 0.8);
      padding: 10px 20px;
      border: 2px solid #6B0FFF;
      z-index: 100;
      border-radius: 8px;
    `;

    // Brush Size
    const brushContainer = document.createElement('div');
    brushContainer.style.display = 'flex';
    brushContainer.style.flexDirection = 'column';
    brushContainer.style.gap = '4px';
    brushContainer.innerHTML = `<label style="font-size: 0.6rem; color: #00FFFF; text-transform: uppercase;">Brush Size: <span id="brushVal">${this.brushSize}</span></label>`;
    
    const brushSlider = document.createElement('input');
    brushSlider.type = 'range';
    brushSlider.min = '1';
    brushSlider.max = '15';
    brushSlider.value = this.brushSize;
    brushSlider.style.width = '100px';
    brushSlider.addEventListener('input', (e) => {
      this.brushSize = parseInt(e.target.value);
      document.getElementById('brushVal').textContent = this.brushSize;
    });
    brushContainer.appendChild(brushSlider);

    // Pause Button
    const pauseBtn = document.createElement('button');
    pauseBtn.textContent = 'PAUSE';
    pauseBtn.style.cssText = 'background: #1a1a1a; border: 1px solid #fff; color: #fff; padding: 5px 10px; cursor: pointer; font-family: inherit; font-size: 0.8rem;';
    pauseBtn.onclick = () => {
      const isPaused = this.game.togglePause();
      pauseBtn.textContent = isPaused ? 'RESUME' : 'PAUSE';
      pauseBtn.style.background = isPaused ? '#f00' : '#1a1a1a';
    };

    // Clear Button
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'CLEAR ALL';
    clearBtn.style.cssText = 'background: #1a1a1a; border: 1px solid #ff4444; color: #ff4444; padding: 5px 10px; cursor: pointer; font-family: inherit; font-size: 0.8rem;';
    clearBtn.onclick = () => {
      if (confirm('Clear everything?')) {
        this.physics.clearAll(SoftBody);
      }
    };

    controlBar.appendChild(brushContainer);
    controlBar.appendChild(pauseBtn);
    controlBar.appendChild(clearBtn);

    document.body.appendChild(toolBar);
    document.body.appendChild(controlBar);
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
      const worldPos = this.renderer.screenToWorld(x, y);
      this.currentWorldPos = worldPos;
      if (!this.isDragging) return;
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
    canvas.addEventListener('mouseup', () => {
      handleEnd();
      this.pinnedThisDrag.clear();
    });
    
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
    const gridSize = CONFIG.WORLD.GRID_SIZE;
    const hStep = gridSize;
    const vStep = gridSize * 0.866; // Height of equilateral triangle
    
    const radius = this.brushSize;
    const minGx = Math.floor((pos.x - radius) / hStep) - 1;
    const maxGx = Math.ceil((pos.x + radius) / hStep) + 1;
    const minGy = Math.floor((pos.y - radius) / vStep) - 1;
    const maxGy = Math.ceil((pos.y + radius) / vStep) + 1;

    for (let gy = minGy; gy <= maxGy; gy++) {
      const rowOffsetX = (gy % 2 === 0) ? 0 : hStep / 2;
      for (let gx = minGx; gx <= maxGx; gx++) {
        const px = gx * hStep + rowOffsetX;
        const py = gy * vStep;
        
        const dist = Math.sqrt(Math.pow(px - pos.x, 2) + Math.pow(py - pos.y, 2));
        if (dist <= radius) {
          const p = this.physics.getOrCreateGridParticle(gx, gy, px, py);
          
          // Connect to neighbors in the hexagonal grid
          // Neighbors for even rows: (x-1, y), (x+1, y), (x, y-1), (x+1, y-1), (x, y+1), (x+1, y+1)
          // Neighbors for odd rows:  (x-1, y), (x+1, y), (x-1, y-1), (x, y-1), (x-1, y+1), (x, y+1)
          const isOdd = (gy % 2 !== 0);
          const neighbors = [
            [gx - 1, gy], [gx + 1, gy],
            [isOdd ? gx - 1 : gx, gy - 1], [isOdd ? gx : gx + 1, gy - 1],
            [isOdd ? gx - 1 : gx, gy + 1], [isOdd ? gx : gx + 1, gy + 1]
          ];

          for (const [nx, ny] of neighbors) {
            const key = `${nx},${ny}`;
            if (this.physics.gridParticles.has(key)) {
              const np = this.physics.gridParticles.get(key);
              if (this.physics.terrainBody.particles.includes(np)) {
                // Link them
                if (!this.physics.findConstraint(p, np)) {
                  this.physics.linkParticles(p, np, 1.0, 10);
                }
              }
            }
          }

          // Form triangles by checking sets of 3 grid points
          // For hexagonal grid, triangles are formed between (gx, gy), (gx+1, gy), and (gx or gx+1, gy+1)
          const checkTri = (gx1, gy1, gx2, gy2, gx3, gy3) => {
            const p1 = this.physics.gridParticles.get(`${gx1},${gy1}`);
            const p2 = this.physics.gridParticles.get(`${gx2},${gy2}`);
            const p3 = this.physics.gridParticles.get(`${gx3},${gy3}`);
            if (p1 && p2 && p3 && 
                this.physics.terrainBody.particles.includes(p1) &&
                this.physics.terrainBody.particles.includes(p2) &&
                this.physics.terrainBody.particles.includes(p3)) {
              // Ensure constraints exist
              if (!this.physics.findConstraint(p1, p2)) this.physics.linkParticles(p1, p2, 1.0, 10);
              if (!this.physics.findConstraint(p2, p3)) this.physics.linkParticles(p2, p3, 1.0, 10);
              if (!this.physics.findConstraint(p3, p1)) this.physics.linkParticles(p3, p1, 1.0, 10);
              
              // Only add if triangle doesn't already exist
              const exists = this.physics.terrainBody.triangles.some(t => 
                (t.p1 === p1 || t.p1 === p2 || t.p1 === p3) &&
                (t.p2 === p1 || t.p2 === p2 || t.p2 === p3) &&
                (t.p3 === p1 || t.p3 === p2 || t.p3 === p3)
              );
              if (!exists) {
                this.physics.addTriangle(p1, p2, p3);
              }
            }
          };

          // Check standard triangle patterns for this grid point
          checkTri(gx, gy, gx + 1, gy, isOdd ? gx : gx + 1, gy - 1);
          checkTri(gx, gy, gx + 1, gy, isOdd ? gx : gx + 1, gy + 1);
        }
      }
    }
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
    this.physics.removeParticlesInRadius(pos.x, pos.y, this.brushSize);
  }
  
  pinParticles(pos) {
    const success = this.physics.pinParticlesInRadius(pos.x, pos.y, this.brushSize, this.pinnedThisDrag);
    if (success) {
      this.playPinSound();
    }
  }

  playPinSound() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Low frequency tack sound
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.1);
  }
  
  explodeParticles(pos) {
    // Explosion should only happen on click start really, but drag is fun too
    if (Math.random() > 0.1) return;
    const force = 50;
    this.physics.explodeParticlesInRadius(pos.x, pos.y, this.brushSize * 2, force);
  }
}