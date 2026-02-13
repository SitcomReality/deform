import { CONFIG } from '../config.js';

export class PhysicsEngine {
  constructor() {
    this.bodies = [];
    this.spatialHash = new Map();
  }
  
  addBody(body) {
    this.bodies.push(body);
  }
  
  update(dt) {
    const substepDt = dt / CONFIG.PHYSICS.SUBSTEPS;
    
    for (let i = 0; i < CONFIG.PHYSICS.SUBSTEPS; i++) {
      this.applyForces(substepDt);
      this.integrate(substepDt);
      this.solveConstraints();
      this.updateSpatialHash();
      this.handleCollisions();
    }
  }
  
  applyForces(dt) {
    for (const body of this.bodies) {
      for (const particle of body.particles) {
        if (!particle.pinned) {
          // Gravity
          particle.force.y += CONFIG.PHYSICS.GRAVITY * particle.mass;
        }
      }
    }
  }
  
  integrate(dt) {
    for (const body of this.bodies) {
      for (const particle of body.particles) {
        if (particle.pinned) continue;
        
        // Verlet integration
        const vel = {
          x: (particle.pos.x - particle.oldPos.x) * CONFIG.PHYSICS.DAMPING,
          y: (particle.pos.y - particle.oldPos.y) * CONFIG.PHYSICS.DAMPING
        };
        
        particle.oldPos.x = particle.pos.x;
        particle.oldPos.y = particle.pos.y;
        
        particle.pos.x += vel.x + particle.force.x * dt * dt;
        particle.pos.y += vel.y + particle.force.y * dt * dt;
        
        particle.force.x = 0;
        particle.force.y = 0;
      }
    }
  }
  
  solveConstraints() {
    for (let iter = 0; iter < CONFIG.PHYSICS.CONSTRAINT_ITERATIONS; iter++) {
      for (const body of this.bodies) {
        for (const constraint of body.constraints) {
          if (!constraint.broken) {
            constraint.solve();
          }
        }
      }
    }
  }
  
  updateSpatialHash() {
    this.spatialHash.clear();
    const cellSize = CONFIG.PERF.SPATIAL_CELL_SIZE;
    
    for (const body of this.bodies) {
      for (const particle of body.particles) {
        const cellX = Math.floor(particle.pos.x / cellSize);
        const cellY = Math.floor(particle.pos.y / cellSize);
        const key = `${cellX},${cellY}`;
        
        if (!this.spatialHash.has(key)) {
          this.spatialHash.set(key, []);
        }
        this.spatialHash.get(key).push(particle);
      }
    }
  }
  
  handleCollisions() {
    for (const cell of this.spatialHash.values()) {
      for (let i = 0; i < cell.length; i++) {
        for (let j = i + 1; j < cell.length; j++) {
          this.resolveParticleCollision(cell[i], cell[j]);
        }
      }
    }
  }
  
  resolveParticleCollision(p1, p2) {
    const dx = p2.pos.x - p1.pos.x;
    const dy = p2.pos.y - p1.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = p1.radius + p2.radius;
    
    if (dist < minDist && dist > 0) {
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;
      
      if (!p1.pinned && !p2.pinned) {
        p1.pos.x -= nx * overlap * 0.5;
        p1.pos.y -= ny * overlap * 0.5;
        p2.pos.x += nx * overlap * 0.5;
        p2.pos.y += ny * overlap * 0.5;
      } else if (!p1.pinned) {
        p1.pos.x -= nx * overlap;
        p1.pos.y -= ny * overlap;
      } else if (!p2.pinned) {
        p2.pos.x += nx * overlap;
        p2.pos.y += ny * overlap;
      }
    }
  }
}