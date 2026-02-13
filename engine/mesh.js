import { Vec2 } from '../utils/math.js';

export class Particle {
  constructor(x, y, mass = 1, pinned = false) {
    this.pos = new Vec2(x, y);
    this.oldPos = new Vec2(x, y);
    this.force = new Vec2(0, 0);
    this.mass = mass;
    this.pinned = pinned;
    this.radius = 0.5;
  }
  
  applyForce(fx, fy) {
    this.force.x += fx;
    this.force.y += fy;
  }
}

export class Constraint {
  constructor(p1, p2, stiffness = 1.0, breakThreshold = Infinity) {
    this.p1 = p1;
    this.p2 = p2;
    this.restLength = Vec2.dist(p1.pos, p2.pos);
    this.stiffness = stiffness;
    this.breakThreshold = breakThreshold;
    this.broken = false;
  }
  
  solve() {
    if (this.broken) return;
    
    const delta = Vec2.sub(this.p2.pos, this.p1.pos);
    const dist = delta.length();
    
    if (dist > this.breakThreshold) {
      this.broken = true;
      return;
    }
    
    const diff = (dist - this.restLength) / dist;
    const offset = delta.mul(diff * this.stiffness * 0.5);
    
    if (!this.p1.pinned) this.p1.pos.add(offset);
    if (!this.p2.pinned) this.p2.pos.sub(offset);
  }
}

export class Triangle {
  constructor(p1, p2, p3, color) {
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
    this.color = color;
  }
  
  getCentroid() {
    return new Vec2(
      (this.p1.pos.x + this.p2.pos.x + this.p3.pos.x) / 3,
      (this.p1.pos.y + this.p2.pos.y + this.p3.pos.y) / 3
    );
  }
}

export class SoftBody {
  constructor() {
    this.particles = [];
    this.constraints = [];
    this.triangles = [];
  }
  
  addParticle(particle) {
    this.particles.push(particle);
    return particle;
  }
  
  addConstraint(constraint) {
    this.constraints.push(constraint);
    return constraint;
  }
  
  addTriangle(triangle) {
    this.triangles.push(triangle);
    return triangle;
  }
}