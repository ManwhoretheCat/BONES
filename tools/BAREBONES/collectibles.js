export class RedCandle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 10;
    this.height = 15;
    this.lifeTimer = 900; // 15 seconds
  }

  render(ctx) {
    // Enhanced red candle visualization
    // Draw candle base
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(this.x + 2, this.y + 5, 6, 10);
    
    // Draw flickering flame
    const flicker = Math.sin(Date.now() / 100) * 2;
    
    // Outer flame glow
    const gradient = ctx.createRadialGradient(
      this.x + 5, this.y + 2, 0,
      this.x + 5, this.y + 2, 10
    );
    gradient.addColorStop(0, 'rgba(255, 200, 0, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x + 5, this.y + 2, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner flame
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.moveTo(this.x + 5, this.y - flicker);
    ctx.lineTo(this.x + 8, this.y + 5);
    ctx.lineTo(this.x + 2, this.y + 5);
    ctx.closePath();
    ctx.fill();
  }
}

export class GreenCandle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 10;
    this.height = 15;
    this.lifeTimer = 3600; // 1 minute
  }

  render(ctx) {
    // Draw candle base
    ctx.fillStyle = '#44ff44';
    ctx.fillRect(this.x + 2, this.y + 5, 6, 10);
    
    // Draw flickering flame
    const flicker = Math.sin(Date.now() / 100) * 2;
    
    // Outer flame glow
    const gradient = ctx.createRadialGradient(
      this.x + 5, this.y + 2, 0,
      this.x + 5, this.y + 2, 10
    );
    gradient.addColorStop(0, 'rgba(100, 255, 100, 0.6)');
    gradient.addColorStop(1, 'rgba(50, 255, 50, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x + 5, this.y + 2, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner flame
    ctx.fillStyle = '#88ff88';
    ctx.beginPath();
    ctx.moveTo(this.x + 5, this.y - flicker);
    ctx.lineTo(this.x + 8, this.y + 5);
    ctx.lineTo(this.x + 2, this.y + 5);
    ctx.closePath();
    ctx.fill();
  }
}

export class GoldenBone {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 20;
    this.lifeTimer = 600; // 10 seconds
  }

  render(ctx) {
    ctx.fillStyle = '#ffd700';
    // Draw bone ends
    ctx.beginPath();
    ctx.arc(this.x + 3, this.y + this.height/2, 5, 0, Math.PI * 2);
    ctx.arc(this.x + this.width - 3, this.y + this.height/2, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw bone middle
    ctx.fillRect(this.x + 8, this.y + this.height/2 - 3, this.width - 16, 6);
    
    // Add sparkle effect
    const sparkleTime = Date.now() / 200;
    const sparkleX = this.x + 10 + Math.sin(sparkleTime) * 5;
    const sparkleY = this.y + 10 + Math.cos(sparkleTime) * 5;
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sparkleX, sparkleY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Bone {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 15;
    this.height = 15;
  }

  render(ctx) {
    ctx.fillStyle = '#e6e6e6';
    // Draw bone ends
    ctx.beginPath();
    ctx.arc(this.x + 2, this.y + this.height/2, 4, 0, Math.PI * 2);
    ctx.arc(this.x + this.width - 2, this.y + this.height/2, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw bone middle
    ctx.fillRect(this.x + 6, this.y + this.height/2 - 2, this.width - 12, 4);
  }
}