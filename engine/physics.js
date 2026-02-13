import { CONFIG } from '../config.js';
import { Particle, Constraint, Triangle } from './mesh.js';
import { lineIntersects } from '../utils/math.js';

export class PhysicsEngine {
  constructor() {
    this.bodies = [];
    this.spatialHash = new Map();
    this.terrainBody = null;
    this.grabConstraint = null;
  }
  
  addBody(body) {
    this.bodies.push(body);
    if (!this.terrainBody) {
      this.terrainBody = body;
    }
  }

  clearAll() {
    this.bodies = [];
    this.terrainBody = null;
    this.grabConstraint = null;
    this.spatialHash.clear();
    
    // We need to re-create the base body. 
    // Since we are in a module, we can't easily sync-import but we know SoftBody is available in terrain.js
    // Alternatively, let's just make it a habit to provide a container.
  }

  setBaseBody(body) {
    this.bodies = [body];
    this.terrainBody = body;
  }

  clearAll(SoftBodyClass) {
    const newBody = new SoftBodyClass();
    this.bodies = [newBody];
    this.terrainBody = newBody;
    this.grabConstraint = null;
    this.spatialHash.clear();
  }
  
  createParticle(x, y, mass = 1, color = null) {
    if (!this.terrainBody) return null;
    const particle = new Particle(x, y, mass, false, color);
    this.terrainBody.addParticle(particle);
    return particle;
  }
  
  linkParticles(p1, p2, stiffness = 1.0, breakingThreshold = Infinity) {
    if (!this.terrainBody) return;
    const constraint = new Constraint(p1, p2, stiffness, breakingThreshold);
    this.terrainBody.addConstraint(constraint);
    return constraint;
  }

  triangulate(particle, radius) {
    if (!this.terrainBody) return;
    
    // Find nearby particles
    const nearby = [];
    for (const p of this.terrainBody.particles) {
      if (p === particle) continue;
      const dx = p.pos.x - particle.pos.x;
      const dy = p.pos.y - particle.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        nearby.push({ particle: p, dist });
      }
    }
    
    // Sort by distance
    nearby.sort((a, b) => a.dist - b.dist);
    
    // Connect to closest valid neighbors to form triangles
    let connectedCount = 0;
    for (const neighbor of nearby) {
      if (connectedCount >= 3) break;
      
      const p2 = neighbor.particle;
      
      // Check if this connection would cross existing constraints (optional, expensive)
      // For now just connect
      
      this.linkParticles(particle, p2, 1.0, 8);
      
      // Try to make a triangle with this neighbor and another neighbor
      for (const other of nearby) {
        if (other.particle === p2) continue;
        const p3 = other.particle;
        
        // Check if p2 and p3 are connected
        const p2p3 = this.findConstraint(p2, p3);
        if (p2p3) {
          // We have a triangle particle-p2-p3
          this.terrainBody.addTriangle(new Triangle(particle, p2, p3, CONFIG.COLORS.TERRAIN));
        }
      }
      
      connectedCount++;
    }
  }

  findConstraint(p1, p2) {
    if (!this.terrainBody) return null;
    return this.terrainBody.constraints.find(c => 
      (c.p1 === p1 && c.p2 === p2) || (c.p1 === p2 && c.p2 === p1)
    );
  }

  cutLine(p1, p2) {
    if (!this.terrainBody) return;
    
    for (const constraint of this.terrainBody.constraints) {
      if (constraint.broken) continue;
      if (lineIntersects(p1, p2, constraint.p1.pos, constraint.p2.pos)) {
        constraint.broken = true;
      }
    }
  }

  startGrab(pos) {
    if (!this.terrainBody) return;
    
    let closest = null;
    let minDist = 2.0; // Grab radius
    
    for (const p of this.terrainBody.particles) {
      const dist = Math.sqrt(
        Math.pow(p.pos.x - pos.x, 2) + 
        Math.pow(p.pos.y - pos.y, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    }
    
    if (closest) {
      this.grabConstraint = {
        particle: closest,
        pos: { x: pos.x, y: pos.y }
      };
    }
  }

  updateGrab(pos) {
    if (this.grabConstraint) {
      this.grabConstraint.pos.x = pos.x;
      this.grabConstraint.pos.y = pos.y;
    }
  }

  endGrab() {
    this.grabConstraint = null;
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
    // Mouse Interaction
    if (this.grabConstraint) {
      const p = this.grabConstraint.particle;
      const target = this.grabConstraint.pos;
      const dx = target.x - p.pos.x;
      const dy = target.y - p.pos.y;
      
      // Spring force towards mouse
      if (!p.pinned) {
        p.pos.x += dx * 0.2;
        p.pos.y += dy * 0.2;
      }
    }

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