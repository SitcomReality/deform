export class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  
  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }
  
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }
  
  mul(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }
  
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  
  normalize() {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }
  
  clone() {
    return new Vec2(this.x, this.y);
  }
  
  static dist(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  static sub(a, b) {
    return new Vec2(a.x - b.x, a.y - b.y);
  }
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}