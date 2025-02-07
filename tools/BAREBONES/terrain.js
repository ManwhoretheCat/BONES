import { Platform } from './platform.js';

export class TerrainGenerator {
  constructor() {
    this.minPlatformWidth = 100;
    this.maxPlatformWidth = 300;
    this.minGapWidth = 50;
    this.maxGapWidth = 150;
    this.baseHeight = 450;
    this.heightLevels = [
      630, // 6 spaces down from base
      570, // 4 spaces down from base
      510, // 2 spaces down from base
      450, // Base level
      390, // 2 spaces up from base
      330, // 4 spaces up from base
      270, // 6 spaces up from base
      210, // 8 spaces up from base
      150, // 10 spaces up from base
      90,  // 12 spaces up from base
    ];
  }

  generateTerrain(stageLength) {
    const platforms = [];
    let currentX = 0;
    let finalPlatformX = stageLength - 150;

    // Generate platforms at all height levels
    this.heightLevels.forEach(height => {
      currentX = 0;
      while(currentX < finalPlatformX) {
        if(Math.random() < 0.6) { // Increased probability
          const platformWidth = Math.random() * 
            (this.maxPlatformWidth - this.minPlatformWidth) + this.minPlatformWidth;
          
          // Check for overlapping platforms
          const tooClose = platforms.some(p => 
            Math.abs(p.x - currentX) < platformWidth &&
            Math.abs(p.y - height) < 60
          );

          if(!tooClose) {
            platforms.push(new Platform(
              currentX,
              height,
              platformWidth
            ));
          }
        }
        currentX += Math.random() * 200 + 100;
      }
    });

    // Final platform for finish marker
    platforms.push(new Platform(
      finalPlatformX,
      300,
      150
    ));

    return platforms;
  }
}