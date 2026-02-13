import { CONFIG } from '../config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.camera = { x: CONFIG.WORLD.LEVEL_WIDTH / 2, y: CONFIG.WORLD.LEVEL_HEIGHT / 2, zoom: 15 };
    this.cellSize = CONFIG.PERF.SPATIAL_CELL_SIZE;
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  clear() {
    this.ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  worldToScreen(x, y) {
    return {
      x: (x - this.camera.x) * this.camera.zoom + this.canvas.width / 2,
      y: (y - this.camera.y) * this.camera.zoom + this.canvas.height / 2
    };
  }
  
  screenToWorld(sx, sy) {
    return {
      x: (sx - this.canvas.width / 2) / this.camera.zoom + this.camera.x,
      y: (sy - this.canvas.height / 2) / this.camera.zoom + this.camera.y
    };
  }
  
  render(bodies) {
    this.clear();
    
    this.ctx.lineWidth = 1;
    
    // Render all bodies
    for (const body of bodies) {
      // Render triangles
      for (const tri of body.triangles) {
        const p1 = this.worldToScreen(tri.p1.pos.x, tri.p1.pos.y);
        const p2 = this.worldToScreen(tri.p2.pos.x, tri.p2.pos.y);
        const p3 = this.worldToScreen(tri.p3.pos.x, tri.p3.pos.y);
        
        this.ctx.fillStyle = tri.color;
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.lineTo(p3.x, p3.y);
        this.ctx.closePath();
        this.ctx.fill();
      }
      
      // Render constraints (edges)
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = CONFIG.COLORS.BACKGROUND;
      for (const constraint of body.constraints) {
        if (constraint.broken) continue;
        
        const p1 = this.worldToScreen(constraint.p1.pos.x, constraint.p1.pos.y);
        const p2 = this.worldToScreen(constraint.p2.pos.x, constraint.p2.pos.y);
        
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
      }

      // Render loose particles (sand/fluids)
      for (const p of body.particles) {
        if (p.color) { // Only render if it has an explicit color (sand)
          const scr = this.worldToScreen(p.pos.x, p.pos.y);
          const rad = p.radius * this.camera.zoom;
          
          this.ctx.fillStyle = p.color;
          this.ctx.beginPath();
          this.ctx.arc(scr.x, scr.y, rad, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
  }

  renderCursor(cursorPos, grabConstraint) {
    if (grabConstraint) {
      const p1 = this.worldToScreen(grabConstraint.particle.pos.x, grabConstraint.particle.pos.y);
      const p2 = this.worldToScreen(grabConstraint.pos.x, grabConstraint.pos.y);
      
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.strokeStyle = CONFIG.COLORS.DRAG_LINE;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      this.ctx.beginPath();
      this.ctx.arc(p2.x, p2.y, 5, 0, Math.PI * 2);
      this.ctx.fillStyle = CONFIG.COLORS.DRAG_LINE;
      this.ctx.fill();
    }
  }
}