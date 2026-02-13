export const PHYSICS_CONFIG = {
  GRAVITY: 60, // Significantly increased for a more "snappy" feel
  DAMPING: 0.992, // Reduced damping (from 0.98) to remove the "jello/honey" movement feel
  CONSTRAINT_ITERATIONS: 5, // Increased for structural stability
  SUBSTEPS: 8, // Higher substeps for more accurate and stable physics simulation
  AIR_DENSITY: 0.001,
  FLUID_DENSITY: 1.0,
};