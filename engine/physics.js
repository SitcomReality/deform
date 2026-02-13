import { PHYSICS_CONFIG } from '../config/physics.js';
import { PERF_CONFIG } from '../config/perf.js';

export class PhysicsEngine {
  constructor() {
    this.bodies = [];
    this.spatialHash = new Map();
  }
  
  addBody(body) {
    this.bodies.push(body);
  }
  
  update(dt) {
    const substepDt = dt / PHYSICS_CONFIG.SUBSTEPS;
    
    for (let i = 0; i < PHYSICS_CONFIG.SUBSTEPS; i++) {
      // Reset grounding state for non-pinned particles
      for (const body of this.bodies) {
        for (const p of body.particles) {
          if (!p.pinned) p.isGrounded = false;
        }
      }

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
          particle.force.y += PHYSICS_CONFIG.GRAVITY * particle.mass;
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
          x: (particle.pos.x - particle.oldPos.x) * PHYSICS_CONFIG.DAMPING,
          y: (particle.pos.y - particle.oldPos.y) * PHYSICS_CONFIG.DAMPING
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
    for (let iter = 0; iter < PHYSICS_CONFIG.CONSTRAINT_ITERATIONS; iter++) {
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
    const cellSize = PERF_CONFIG.SPATIAL_CELL_SIZE;
    
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
    // Particle-Particle collisions
    for (const cell of this.spatialHash.values()) {
      for (let i = 0; i < cell.length; i++) {
        for (let j = i + 1; j < cell.length; j++) {
          this.resolveParticleCollision(cell[i], cell[j]);
        }
      }
    }

    // Particle-Edge collisions (Player vs Terrain Surface)
    for (const bodyA of this.bodies) {
      if (bodyA.pinned) continue; // Skip static-static
      for (const p of bodyA.particles) {
        if (p.pinned) continue;
        for (const bodyB of this.bodies) {
          if (bodyA === bodyB) continue;
          for (const edge of bodyB.edges) {
            this.resolveParticleEdgeCollision(p, edge);
          }
        }
      }
    }
  }

  resolveParticleEdgeCollision(p, edge) {
    if (edge.broken) return;
    const pA = edge.p1;
    const pB = edge.p2;

    const abx = pB.pos.x - pA.pos.x;
    const aby = pB.pos.y - pA.pos.y;
    const apx = p.pos.x - pA.pos.x;
    const apy = p.pos.y - pA.pos.y;

    const abLenSq = abx * abx + aby * aby;
    if (abLenSq === 0) return;

    let t = (apx * abx + apy * aby) / abLenSq;
    t = Math.max(0, Math.min(1, t));

    const nearestX = pA.pos.x + t * abx;
    const nearestY = pA.pos.y + t * aby;

    const dx = p.pos.x - nearestX;
    const dy = p.pos.y - nearestY;
    const distSq = dx * dx + dy * dy;
    const minDist = p.radius + 0.05; // Edge has a tiny virtual thickness

    if (distSq < minDist * minDist && distSq > 0) {
      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      p.pos.x += nx * overlap;
      p.pos.y += ny * overlap;

      // If pushed up, mark as grounded
      if (ny < -0.1) p.isGrounded = true;
    }
  }
  
  resolveParticleCollision(p1, p2) {
    const dx = p2.pos.x - p1.pos.x;
    const dy = p2.pos.y - p1.pos.y;
    const distSq = dx * dx + dy * dy;
    const minDist = p1.radius + p2.radius;
    
    if (distSq < minDist * minDist && distSq > 0) {
      const dist = Math.sqrt(distSq);
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
        // Corrected grounding: if normal points up from terrain to player
        if (ny < -0.5) p1.isGrounded = true;
      } else if (!p2.pinned) {
        p2.pos.x += nx * overlap;
        p2.pos.y += ny * overlap;
        if (ny > 0.5) p2.isGrounded = true;
      }
    }
  }
}