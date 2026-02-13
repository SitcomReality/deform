import { CONFIG } from '../config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.camera = { x: CONFIG.WORLD.LEVEL_WIDTH / 2, y: CONFIG.WORLD.LEVEL_HEIGHT / 2, zoom: 15 };
    
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
    }
  }
}