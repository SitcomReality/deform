import { SoftBody, Particle, Constraint, Triangle } from '../engine/mesh.js';
import { CONFIG } from '../config.js';

export class Player {
  constructor(x, y) {
    this.body = new SoftBody();
    this.input = { left: false, right: false, jump: false };
    this.onGround = false;
    
    // Create player as a simple triangulated rectangle
    const size = CONFIG.PLAYER.SIZE;
    const p1 = new Particle(x - size, y - size * 2);
    const p2 = new Particle(x + size, y - size * 2);
    const p3 = new Particle(x + size, y);
    const p4 = new Particle(x - size, y);
    
    this.body.addParticle(p1);
    this.body.addParticle(p2);
    this.body.addParticle(p3);
    this.body.addParticle(p4);
    
    this.body.addConstraint(new Constraint(p1, p2, 1.0));
    this.body.addConstraint(new Constraint(p2, p3, 1.0));
    this.body.addConstraint(new Constraint(p3, p4, 1.0));
    this.body.addConstraint(new Constraint(p4, p1, 1.0));
    this.body.addConstraint(new Constraint(p1, p3, 0.9));
    this.body.addConstraint(new Constraint(p2, p4, 0.9));
    
    this.body.addTriangle(new Triangle(p1, p2, p3, CONFIG.COLORS.PLAYER));
    this.body.addTriangle(new Triangle(p1, p3, p4, CONFIG.COLORS.PLAYER));
    
    this.particles = [p1, p2, p3, p4];
  }
  
  update() {
    const speed = CONFIG.PLAYER.SPEED;
    
    for (const p of this.particles) {
      if (this.input.left) {
        p.applyForce(-speed, 0);
      }
      if (this.input.right) {
        p.applyForce(speed, 0);
      }
    }
    
    if (this.input.jump && this.onGround) {
      for (const p of this.particles) {
        p.applyForce(0, -CONFIG.PLAYER.JUMP_FORCE);
      }
      this.onGround = false;
    }
    
    // Check if on ground (simple check for now)
    const lowestY = Math.max(...this.particles.map(p => p.pos.y));
    this.onGround = lowestY > 20; // Temporary
  }
  
  getCenterPosition() {
    const avgX = this.particles.reduce((sum, p) => sum + p.pos.x, 0) / this.particles.length;
    const avgY = this.particles.reduce((sum, p) => sum + p.pos.y, 0) / this.particles.length;
    return { x: avgX, y: avgY };
  }
}