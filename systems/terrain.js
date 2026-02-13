import { SoftBody, Particle, Constraint, Triangle } from '../engine/mesh.js';
import { CONFIG } from '../config.js';
import { SeededRandom } from '../utils/random.js';

export class TerrainGenerator {
  constructor(seed) {
    this.rng = new SeededRandom(seed);
  }
  
  generateChunk(chunkX, chunkY) {
    const body = new SoftBody();
    const size = CONFIG.WORLD.CHUNK_SIZE;
    const particles = [];
    const bedrockY = 30; // Base of the world
    
    // Generate height map
    for (let x = 0; x < size; x++) {
      const worldX = chunkX * size + x;
      const thickness = this.getTerrainHeight(worldX);
      const column = [];
      
      for (let y = 0; y < thickness; y++) {
        // Build upwards from bedrock (decreasing Y is up)
        const worldY = bedrockY - y;
        const isBedrock = (y === 0);
        const particle = new Particle(worldX, worldY, 1, isBedrock);
        body.addParticle(particle);
        column.push(particle);
      }
      
      particles.push(column);
    }
    
    // Create constraints and triangles
    for (let x = 0; x < particles.length - 1; x++) {
      const col1 = particles[x];
      const col2 = particles[x + 1];
      
      for (let y = 0; y < Math.min(col1.length, col2.length); y++) {
        // Horizontal constraint
        if (col2[y]) {
          body.addConstraint(new Constraint(col1[y], col2[y], 1.0, 5));
        }
        
        // Vertical constraint
        if (y > 0) {
          body.addConstraint(new Constraint(col1[y], col1[y - 1], 1.0, 5));
        }
        
        // Diagonal constraints for stability
        if (y > 0 && col2[y] && col2[y - 1]) {
          body.addConstraint(new Constraint(col1[y], col2[y - 1], 0.8, 6));
          body.addConstraint(new Constraint(col2[y], col1[y - 1], 0.8, 6));
        }
        
        // Create triangles
        if (col2[y] && y > 0 && col2[y - 1]) {
          body.addTriangle(new Triangle(col1[y], col2[y], col1[y - 1], CONFIG.COLORS.TERRAIN));
          body.addTriangle(new Triangle(col2[y], col2[y - 1], col1[y - 1], CONFIG.COLORS.TERRAIN));
        }
      }
    }
    
    return body;
  }
  
  getTerrainHeight(x) {
    // Multi-octave noise approximation
    let height = 0;
    height += Math.sin(x * 0.02) * 5;
    height += Math.sin(x * 0.05) * 3;
    height += Math.sin(x * 0.1) * 1.5;
    height += this.rng.range(-0.5, 0.5);
    
    return Math.max(5, Math.floor(15 + height));
  }
}