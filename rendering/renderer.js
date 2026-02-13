import { RENDER_CONFIG } from '../config/render.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.camera = { x: 0, y: 0, zoom: 20 };
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  clear() {
    this.ctx.fillStyle = RENDER_CONFIG.COLORS.BACKGROUND;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  worldToScreen(x, y) {
    return {
      x: (x - this.camera.x) * this.camera.zoom + this.canvas.width / 2,
      y: (y - this.camera.y) * this.camera.zoom + this.canvas.height / 2
    };
  }
  
  render(bodies, player) {
    this.clear();
    
    // Update camera to follow player
    if (player) {
      const playerPos = player.getCenterPosition();
      this.camera.x = playerPos.x;
      this.camera.y = playerPos.y;
    }
    
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
      this.ctx.strokeStyle = RENDER_CONFIG.COLORS.BACKGROUND;
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