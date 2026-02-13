import { CONFIG } from '../config.js';
import { Particle, Constraint } from './mesh.js';

export class PhysicsEngine {
  constructor() {
    this.bodies = [];
    this.spatialHash = new Map();
    this.terrainBody = null; // Main terrain body for manipulation
  }
  
  addBody(body) {
    this.bodies.push(body);
    if (!this.terrainBody) {
      this.terrainBody = body;
    }
  }
  
  createParticle(x, y) {
    if (!this.terrainBody) return null;
    const particle = new Particle(x, y);
    this.terrainBody.addParticle(particle);
    return particle;
  }
  
  connectNearbyParticles(particle, maxDist) {
    if (!this.terrainBody) return;
    
    const nearby = [];
    for (const p of this.terrainBody.particles) {
      if (p === particle) continue;
      const dx = p.pos.x - particle.pos.x;
      const dy = p.pos.y - particle.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        nearby.push({ particle: p, dist });
      }
    }
    
    nearby.sort((a, b) => a.dist - b.dist);
    
    for (let i = 0; i < Math.min(3, nearby.length); i++) {
      const constraint = new Constraint(particle, nearby[i].particle, 1.0, 5);
      this.terrainBody.addConstraint(constraint);
    }
  }
  
  removeParticlesInRadius(x, y, radius) {
    if (!this.terrainBody) return;
    
    const toRemove = [];
    for (let i = 0; i < this.terrainBody.particles.length; i++) {
      const p = this.terrainBody.particles[i];
      const dx = p.pos.x - x;
      const dy = p.pos.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        toRemove.push(i);
      }
    }
    
    // Remove from highest index to lowest to avoid index shifting issues
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const particle = this.terrainBody.particles[toRemove[i]];
      
      // Remove constraints connected to this particle
      this.terrainBody.constraints = this.terrainBody.constraints.filter(
        c => c.p1 !== particle && c.p2 !== particle
      );
      
      // Remove triangles containing this particle
      this.terrainBody.triangles = this.terrainBody.triangles.filter(
        t => t.p1 !== particle && t.p2 !== particle && t.p3 !== particle
      );
      
      this.terrainBody.particles.splice(toRemove[i], 1);
    }
  }
  
  pinParticlesInRadius(x, y, radius) {
    if (!this.terrainBody) return;
    
    for (const p of this.terrainBody.particles) {
      const dx = p.pos.x - x;
      const dy = p.pos.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        p.pinned = !p.pinned; // Toggle pin
      }
    }
  }
  
  explodeParticlesInRadius(x, y, radius, force) {
    if (!this.terrainBody) return;
    
    for (const p of this.terrainBody.particles) {
      const dx = p.pos.x - x;
      const dy = p.pos.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius && dist > 0) {
        const strength = (1 - dist / radius) * force;
        p.applyForce((dx / dist) * strength, (dy / dist) * strength);
      }
    }
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