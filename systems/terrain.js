import { SoftBody, Particle, Constraint, Triangle } from '../engine/mesh.js';
import { CONFIG } from '../config.js';
import { SeededRandom } from '../utils/random.js';

export class TerrainGenerator {
  constructor(seed) {
    this.rng = new SeededRandom(seed);
  }
  
  generateLevel() {
    const body = new SoftBody();
    const width = CONFIG.WORLD.LEVEL_WIDTH;
    const height = CONFIG.WORLD.LEVEL_HEIGHT;
    const particles = [];
    
    // Generate terrain columns
    for (let x = 0; x < width; x++) {
      const terrainHeight = this.getTerrainHeight(x);
      const column = [];
      
      for (let y = height - terrainHeight; y < height; y++) {
        const particle = new Particle(x, y, 1, y === height - 1);
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
    height += Math.sin(x * 0.15) * 8;
    height += Math.sin(x * 0.3) * 4;
    height += Math.sin(x * 0.6) * 2;
    height += this.rng.range(-0.5, 0.5);
    
    return Math.max(5, Math.floor(20 + height));
  }
}