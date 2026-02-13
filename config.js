export const CONFIG = {
  // Visual
  COLORS: {
    PRIMARY: '#00FFFF',    // Cyan
    SECONDARY: '#6B0FFF',  // Purple
    BACKGROUND: '#000000', // Black
    ACCENT: '#FFFFFF',     // White
    TERRAIN: '#00FFFF',
    PLAYER: '#FFFFFF',
    FLUID_WATER: '#00FFFF80',
    FLUID_LAVA: '#FF0080',
    FLUID_ACID: '#39FF14',
  },
  
  // Physics
  PHYSICS: {
    GRAVITY: 0.5,
    DAMPING: 0.98,
    CONSTRAINT_ITERATIONS: 3,
    SUBSTEPS: 2,
    AIR_DENSITY: 0.001,
    FLUID_DENSITY: 1.0,
  },
  
  // World
  WORLD: {
    LEVEL_WIDTH: 80,
    LEVEL_HEIGHT: 60,
    TERRAIN_SEED: Date.now(),
  },
  
  // Performance
  PERF: {
    MAX_PARTICLES: 10000,
    SPATIAL_CELL_SIZE: 10,
  }
};