import { CONFIG } from './config.js';
import { PhysicsEngine } from './engine/physics.js';
import { TerrainGenerator } from './systems/terrain.js';
import { Player } from './entities/player.js';
import { Renderer } from './rendering/renderer.js';
import { ScreenManager } from './ui/screens.js';
import { InputManager } from './ui/input.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new Renderer(this.canvas);
    this.physics = new PhysicsEngine();
    this.screenManager = new ScreenManager();
    
    this.player = null;
    this.inputManager = null;
    this.running = false;
    this.lastTime = 0;
    
    this.init();
  }
  
  init() {
    this.screenManager.onStart((seed) => this.startGame(seed));
  }
  
  async startGame(seed) {
    this.screenManager.show('loading');
    
    // Reset
    this.physics.bodies = [];
    
    // Generate world
    await this.generateWorld(seed);
    
    // Create player (place above terrain surface if present)
    this.screenManager.setLoadingProgress(80, 'Spawning player...');
    await this.sleep(200);

    // choose spawn X (can be tuned)
    const spawnX = 10;

    // find highest terrain particle at spawnX across physics bodies
    let surfaceY = -Infinity;
    for (const body of this.physics.bodies) {
      if (!body.particles) continue;
      for (const p of body.particles) {
        // consider particles near the spawnX (within 0.5 world units)
        if (Math.abs(p.pos.x - spawnX) <= 0.6) {
          if (p.pos.y > surfaceY) surfaceY = p.pos.y;
        }
      }
    }

    // default spawn if no terrain found
    const defaultY = 10;
    const safeOffset = (CONFIG.PLAYER.SIZE * 2) + 2; // leave some space above terrain
    const spawnY = (surfaceY === -Infinity) ? defaultY : (surfaceY - safeOffset);

    this.player = new Player(spawnX, spawnY);
    this.physics.addBody(this.player.body);
    
    // Setup input
    this.screenManager.setLoadingProgress(90, 'Initializing controls...');
    await this.sleep(200);
    if (!this.inputManager) {
      this.inputManager = new InputManager(this.player);
    } else {
      this.inputManager.player = this.player;
    }
    
    this.screenManager.setLoadingProgress(100, 'Ready!');
    await this.sleep(300);
    
    // Start game
    this.screenManager.hideAll();
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }
  
  async generateWorld(seed) {
    const generator = new TerrainGenerator(seed);
    
    this.screenManager.setLoadingProgress(10, 'Generating terrain...');
    await this.sleep(100);
    
    // Generate initial chunks
    const chunks = [];
    for (let x = -2; x <= 2; x++) {
      this.screenManager.setLoadingProgress(20 + x * 10, `Chunk ${x + 3}/5`);
      await this.sleep(50);
      const chunk = generator.generateChunk(x, 0);
      chunks.push(chunk);
    }
    
    this.screenManager.setLoadingProgress(70, 'Building physics...');
    await this.sleep(100);
    
    for (const chunk of chunks) {
      this.physics.addBody(chunk);
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  loop(time) {
    if (!this.running) return;
    
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    
    this.update(dt);
    this.render();
    
    requestAnimationFrame((t) => this.loop(t));
  }
  
  update(dt) {
    if (this.player) {
      this.player.update();
    }
    this.physics.update(dt);
  }
  
  render() {
    this.renderer.render(this.physics.bodies, this.player);
  }
}

new Game();