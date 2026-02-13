export class SeededRandom {
  constructor(seed) {
    this.seed = seed || Date.now();
    this.state = this.seed;
  }
  
  next() {
    // Simple LCG
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }
  
  range(min, max) {
    return min + this.next() * (max - min);
  }
  
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }
}