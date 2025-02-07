export class Platform {
  constructor(x, y, width) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = 20;
  }

  render(ctx) {
    const heightBasedStyles = {
      above: { // White cloud platforms
        fill: '#FFFFFF',
        details: (ctx) => {
          // Enhanced cloud platform with more detailed puffs
          const puffPositions = [0, 0.25, 0.5, 0.75, 1];
          puffPositions.forEach(pos => {
            // Main puff
            ctx.beginPath();
            ctx.arc(this.x + this.width * pos, this.y + 10, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            
            // Highlight puff
            ctx.beginPath();
            ctx.arc(this.x + this.width * pos - 5, this.y + 8, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#F0F0F0';
            ctx.fill();
            
            // Shadow detail
            ctx.beginPath();
            ctx.arc(this.x + this.width * pos + 5, this.y + 12, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#E0E0E0';
            ctx.fill();
          });
        }
      },
      base: { // Enhanced grass platforms
        fill: '#4CAF50',
        details: (ctx) => {
          // Multiple layers of grass details
          ctx.fillStyle = '#2E7D32';
          for(let i = 0; i < this.width; i += 8) {
            // Back layer grass
            ctx.beginPath();
            ctx.moveTo(this.x + i, this.y);
            ctx.lineTo(this.x + i + 4, this.y - 7);
            ctx.lineTo(this.x + i + 8, this.y);
            ctx.fill();
            
            // Front layer grass
            ctx.fillStyle = '#388E3C';
            ctx.beginPath();
            ctx.moveTo(this.x + i + 4, this.y);
            ctx.lineTo(this.x + i + 7, this.y - 5);
            ctx.lineTo(this.x + i + 10, this.y);
            ctx.fill();
            
            // Grass highlight spots
            ctx.fillStyle = '#81C784';
            ctx.fillRect(this.x + i + 2, this.y + 5, 3, 3);
          }
        }
      },
      below: { // Enhanced dirt/rocky platforms
        fill: '#D2B48C',
        details: (ctx) => {
          // Multiple rock layers and details
          for(let i = 0; i < this.width; i += 15) {
            // Large rocks
            ctx.fillStyle = '#A0522D';
            ctx.beginPath();
            ctx.arc(this.x + i + 7, this.y + 10, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Small rocks
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.arc(this.x + i + 3, this.y + 8, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Rock highlights
            ctx.fillStyle = '#DEB887';
            ctx.beginPath();
            ctx.arc(this.x + i + 6, this.y + 9, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    };

    let style;
    if (this.y > 450) {
      style = heightBasedStyles.below;
    } else if (this.y < 300) {
      style = heightBasedStyles.above;
    } else {
      style = heightBasedStyles.base;
    }

    ctx.fillStyle = style.fill;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    style.details(ctx);
  }
}