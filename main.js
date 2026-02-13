import { CONFIG } from './config.js';
import { PhysicsEngine } from './engine/physics.js';
import { TerrainGenerator } from './systems/terrain.js';
import { Renderer } from './rendering/renderer.js';
import { ScreenManager } from './ui/screens.js';
import { ToolManager } from './ui/tools.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new Renderer(this.canvas);
    this.physics = new PhysicsEngine();
    this.screenManager = new ScreenManager();
    this.toolManager = null;
    
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
    
    // Setup tools
    this.screenManager.setLoadingProgress(90, 'Initializing tools...');
    await this.sleep(200);
    if (!this.toolManager) {
      this.toolManager = new ToolManager(this.physics, this.renderer);
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
    
    // Generate single level that fits on screen
    this.screenManager.setLoadingProgress(30, 'Building level...');
    await this.sleep(100);
    
    const level = generator.generateLevel();
    
    this.screenManager.setLoadingProgress(70, 'Building physics...');
    await this.sleep(100);
    
    this.physics.addBody(level);
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
    this.physics.update(dt);
  }
  
  render() {
    this.renderer.render(this.physics.bodies);
  }
}

new Game();