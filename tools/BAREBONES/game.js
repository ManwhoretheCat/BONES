import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { Platform } from './platform.js';
import { Bone } from './collectibles.js';
import { RedCandle } from './collectibles.js';
import { TerrainGenerator } from './terrain.js';
import { GoldenBone } from './collectibles.js';
import { GreenCandle } from './collectibles.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = 800;
    this.canvas.height = 600;
    
    this.gameState = 'start';
    this.initializeGame();
    this.setupInput();
    
    // Show start screen
    this.showModal('Welcome to BONES', 'Press ENTER to start your adventure!');
    this.worldHeight = 800; // Total world height
    this.redCandles = [];
    this.greenCandles = [];
    this.goldenBones = [];
    this.lastGoldenBoneTime = Date.now();
    this.lastGreenCandleTime = Date.now();
    this.goldenBoneInterval = Math.random() * 240000 + 60000; // 1-5 minutes
    this.greenCandleInterval = Math.random() * 120000 + 180000; // 3-5 minutes
    this.highScore = 0;
    this.stagesCleared = 0;
    this.sessionScore = 0; // Tracks score for current stage
    this.isPaused = false;
    this.setupPauseHandler();
  }

  initializeGame() {
    this.player = new Player(100, 300);
    this.terrainGenerator = new TerrainGenerator();
    this.enemies = [];
    this.bones = [];
    this.platforms = [];
    this.camera = { x: 0, y: 0 };
    
    // Only reset score if it's a new game (not continuing from stage completion)
    if (!this.score) {
      this.score = 0;
    }
    
    this.stageLength = 3200;
    // Finish marker is now a bone shape positioned higher
    this.finishMarker = { 
      x: this.stageLength - 100, 
      y: 220,  // Positioned higher
      width: 20, 
      height: 80 
    };
    
    this.generateInitialTerrain();
    
    // Update HUD with current score (maintained between stages)
    document.getElementById('score').textContent = `Bones: ${this.score}`;
    document.getElementById('health').textContent = 'Health: 100';
    this.sessionScore = this.score; // Track session score starting from current score
    document.getElementById('highScore').textContent = `High Score: ${this.highScore}`;
    document.getElementById('stagesCleared').textContent = `Stages: ${this.stagesCleared}`;
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' && this.gameState !== 'playing') {
        this.startGame();
      } else if(e.key === 'Backspace' && this.gameState === 'playing') {
        // Reset to start of current stage
        this.resetStage();
      } else if(this.gameState === 'playing') {
        this.player.handleKeyDown(e);
      }
    });
    
    window.addEventListener('keyup', (e) => {
      if(this.gameState === 'playing') {
        this.player.handleKeyUp(e);
      }
    });
  }

  setupPauseHandler() {
    window.addEventListener('keydown', (e) => {
      if(e.key === 'p' && this.gameState === 'playing') {
        this.togglePause();
      }
    });
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if(this.isPaused) {
      this.showToast('Game Paused - Press P to Resume');
    }
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  showModal(title, message) {
    if(this.currentModal) {
      this.currentModal.remove();
    }
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <h2>${title}</h2>
      <p>${message}</p>
    `;
    document.body.appendChild(modal);
    this.currentModal = modal;
  }

  startGame() {
    if(this.currentModal) {
      this.currentModal.remove();
    }
    this.gameState = 'playing';
    this.initializeGame();  // Reset game state completely
    this.gameLoop();
  }

  generateInitialTerrain() {
    this.platforms = this.terrainGenerator.generateTerrain(this.stageLength);
    this.spawnEnemies();
    this.spawnCollectibles();
  }

  spawnEnemies() {
    for(let i = 200; i < this.stageLength; i += 200) {
      if(Math.random() > 0.5) {
        this.enemies.push(new Enemy('salesman', i, 300));
      } else {
        this.enemies.push(new Enemy('jeet', i, 300));
      }
    }
  }

  spawnCollectibles() {
    const bonePlacements = [];
    
    // Place bones above platforms
    this.platforms.forEach(platform => {
      if(Math.random() < 0.7) { // High probability of bone above platform
        const heightAbove = Math.floor(Math.random() * 3) + 1; // 1 to 3 spaces above
        bonePlacements.push({
          x: platform.x + Math.random() * (platform.width - 15),
          y: platform.y - (heightAbove * 30)
        });
      }
    });
    
    // Add some additional bones in various locations
    for(let i = 100; i < this.stageLength; i += 150) {
      if(Math.random() < 0.3) {
        bonePlacements.push({
          x: i,
          y: Math.random() * 200 + 200
        });
      }
    }
    
    this.bones = bonePlacements.map(pos => new Bone(pos.x, pos.y));
  }

  resetStage() {
    // Reset player position and properties but keep the same terrain
    this.player = new Player(100, 300);
    this.score = 0;
    this.camera = { x: 0, y: 0 };
    
    // Respawn enemies and collectibles
    this.enemies = [];
    this.bones = [];
    this.redCandles = [];
    this.greenCandles = [];
    this.goldenBones = [];
    this.spawnEnemies();
    this.spawnCollectibles();
    
    // Reset HUD
    document.getElementById('score').textContent = 'Bones: 0';
    document.getElementById('health').textContent = 'Health: 100';
    this.highScore -= this.sessionScore; // Remove current stage points from high score
    this.sessionScore = 0; // Reset session score
  }

  update() {
    if(this.gameState !== 'playing') return;
    
    this.player.update(this.platforms);
    
    // Check for bone drops from player
    if(this.player.dropBone && this.score >= 10) {
      this.bones.push(new Bone(this.player.x - 20, this.player.y)); // Spawn bone to the left
      this.score -= 10;
      document.getElementById('score').textContent = `Bones: ${this.score}`;
      this.player.dropBone = false;
    }

    // Horizontal camera tracking
    const targetCameraX = Math.max(0, Math.min(
      this.player.x - this.canvas.width/2,
      this.stageLength - this.canvas.width
    ));
    
    // Vertical camera tracking
    const targetCameraY = Math.max(0, Math.min(
      this.player.y - this.canvas.height/2,
      this.worldHeight - this.canvas.height
    ));
    
    // Smooth camera movement
    this.camera.x += (targetCameraX - this.camera.x) * 0.1;
    this.camera.y += (targetCameraY - this.camera.y) * 0.1;
    
    this.enemies.forEach(enemy => {
      enemy.update(this.platforms, this.player, this.bones);
    });
    
    // Update red candles
    this.redCandles = this.redCandles.filter(candle => {
      candle.lifeTimer--;
      return candle.lifeTimer > 0;
    });

    // Check for candle drops from Jeets
    this.enemies.forEach(enemy => {
      if(enemy.type === 'jeet' && enemy.dropCandle) {
        this.redCandles.push(new RedCandle(enemy.x, enemy.y));
        enemy.dropCandle = false;
      }
    });
    
    // Update special collectibles
    const currentTime = Date.now();
    
    // Golden Bone spawning
    if(currentTime - this.lastGoldenBoneTime > this.goldenBoneInterval) {
      const x = Math.random() * (this.stageLength - 200) + 100;
      const y = Math.random() * 400 + 100;
      this.goldenBones.push(new GoldenBone(x, y));
      this.lastGoldenBoneTime = currentTime;
      this.goldenBoneInterval = Math.random() * 240000 + 60000;
    }
    
    // Green Candle spawning
    if(currentTime - this.lastGreenCandleTime > this.greenCandleInterval) {
      const x = Math.random() * (this.stageLength - 200) + 100;
      const y = Math.random() * 400 + 100;
      this.greenCandles.push(new GreenCandle(x, y));
      this.lastGreenCandleTime = currentTime;
      this.greenCandleInterval = Math.random() * 120000 + 180000;
    }
    
    // Update collectible timers
    this.goldenBones = this.goldenBones.filter(bone => {
      bone.lifeTimer--;
      return bone.lifeTimer > 0;
    });
    
    this.greenCandles = this.greenCandles.filter(candle => {
      candle.lifeTimer--;
      return candle.lifeTimer > 0;
    });
    
    this.checkCollisions();
    
    if(this.player.health <= 0) {
    }
  }

  checkCollisions() {
    this.bones = this.bones.filter(bone => {
      if(this.player.collidesWith(bone)) {
        this.score += 10;
        this.sessionScore += 10;
        this.highScore = Math.max(this.highScore, this.sessionScore);
        this.player.grow();
        document.getElementById('score').textContent = `Bones: ${this.score}`;
        document.getElementById('highScore').textContent = `High Score: ${this.highScore}`;
        return false;
      }
      return true;
    });
    
    // Check enemy collisions
    this.enemies.forEach(enemy => {
      if(this.player.collidesWith(enemy)) {
        this.player.takeDamage();
        document.getElementById('health').textContent = `Health: ${this.player.health}`;
        if(this.player.health <= 0) {
          this.player.flashRedTimer = 120; // Flash red for 2 seconds before game over
          setTimeout(() => {
            this.gameState = 'gameover';
            this.score = 0; // Reset score to 0 when BONES dies
            document.getElementById('score').textContent = 'Bones: 0';
            this.showModal('Game Over', 'Press ENTER to try again!');
          }, 2000);
        }
      }
    });

    // Check if player fell out of bounds
    if(this.player.y > this.worldHeight) {
      this.score = 0; // Reset score to 0 when BONES dies from falling
      document.getElementById('score').textContent = 'Bones: 0';
      this.resetPlayerPosition();
    }
    
    // Check red candle collisions
    this.redCandles.forEach(candle => {
      if(this.player.collidesWith(candle)) {
        this.player.touchRedCandle();
        document.getElementById('health').textContent = `Health: ${this.player.health}`;
        
        // If player died from red candle, trigger game over after 2 seconds
        if(this.player.health <= 0) {
          setTimeout(() => {
            this.gameState = 'gameover';
            this.score = 0; // Reset score to 0 when BONES dies
            document.getElementById('score').textContent = 'Bones: 0';
            this.showModal('Game Over', 'Press ENTER to try again!');
          }, 2000);
        }
      }
    });

    if(this.player.collidesWith(this.finishMarker)) {
      this.stagesCleared++;
      document.getElementById('stagesCleared').textContent = `Stages: ${this.stagesCleared}`;
      this.gameState = 'complete';
      // Score is now maintained between stages
      this.showModal('Stage Complete!', 'Press ENTER to continue with your bones!');
    }
    
    // Check salesman collisions with candles
    this.enemies.forEach(enemy => {
      if(enemy.type === 'salesman') {
        this.redCandles.forEach(candle => {
          if(enemy.collidesWith(candle)) {
            enemy.touchCandle();
          }
        });
      }
    });
    
    // Check collisions with special collectibles
    this.goldenBones = this.goldenBones.filter(bone => {
      if(this.player.collidesWith(bone)) {
        this.score += 100;
        document.getElementById('score').textContent = `Bones: ${this.score}`;
        return false;
      }
      return true;
    });
    
    this.greenCandles = this.greenCandles.filter(candle => {
      if(this.player.collidesWith(candle)) {
        this.player.health = Math.min(100, this.player.health + 30);
        document.getElementById('health').textContent = `Health: ${this.player.health}`;
        return false;
      }
      return true;
    });
  }

  resetPlayerPosition() {
    this.player = new Player(100, 300);
    this.score = 0;
    this.sessionScore = 0;
    document.getElementById('score').textContent = `Bones: 0`;
    document.getElementById('health').textContent = `Health: 100`;
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Enhanced sky background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height * 0.75);
    gradient.addColorStop(0, '#4A90E2');
    gradient.addColorStop(0.5, '#87CEEB');
    gradient.addColorStop(1, '#B0E2FF');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height * 0.75);
    
    // Enhanced sun with corona
    const sunGradient = this.ctx.createRadialGradient(200, 100, 0, 200, 100, 60);
    sunGradient.addColorStop(0, '#FFD700');
    sunGradient.addColorStop(0.7, '#FFA500');
    sunGradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
    this.ctx.fillStyle = sunGradient;
    this.ctx.beginPath();
    this.ctx.arc(200, 100, 60, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Inner sun
    this.ctx.fillStyle = '#FFD700';
    this.ctx.beginPath();
    this.ctx.arc(200, 100, 40, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Enhanced clouds with shading
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    [
      {x: 100, y: 50, size: 35},
      {x: 400, y: 80, size: 40},
      {x: 600, y: 60, size: 30}
    ].forEach(cloud => {
      this.drawCloud(cloud.x, cloud.y, cloud.size);
    });
  
    // Enhanced clay/rock background
    const rockGradient = this.ctx.createLinearGradient(
      0, this.canvas.height * 0.75,
      0, this.canvas.height
    );
    rockGradient.addColorStop(0, '#8B4513');
    rockGradient.addColorStop(1, '#654321');
    this.ctx.fillStyle = rockGradient;
    this.ctx.fillRect(0, this.canvas.height * 0.75, 
                      this.canvas.width, this.canvas.height * 0.25);
  
    // Enhanced rock details
    this.ctx.fillStyle = '#A0522D';
    for(let i = 0; i < this.canvas.width; i += 40) {
      // Large rocks
      this.ctx.beginPath();
      this.ctx.arc(i, this.canvas.height * 0.85, 12, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Small rocks
      this.ctx.fillStyle = '#8B4513';
      this.ctx.beginPath();
      this.ctx.arc(i + 20, this.canvas.height * 0.88, 8, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Rock highlights
      this.ctx.fillStyle = '#CD853F';
      this.ctx.beginPath();
      this.ctx.arc(i + 2, this.canvas.height * 0.84, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.save();
    this.ctx.translate(-this.camera.x, -this.camera.y);
    
    this.platforms.forEach(platform => platform.render(this.ctx));
    this.bones.forEach(bone => bone.render(this.ctx));
    this.enemies.forEach(enemy => enemy.render(this.ctx));
    this.player.render(this.ctx);
    this.redCandles.forEach(candle => candle.render(this.ctx));
    this.goldenBones.forEach(bone => bone.render(this.ctx));
    this.greenCandles.forEach(candle => candle.render(this.ctx));
    
    // Render finish marker as a bone
    this.ctx.fillStyle = 'white';
    const fm = this.finishMarker;
    
    // Draw bone ends
    this.ctx.beginPath();
    this.ctx.arc(fm.x + fm.width/2, fm.y + 10, 10, 0, Math.PI * 2);
    this.ctx.arc(fm.x + fm.width/2, fm.y + fm.height - 10, 10, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw bone middle
    this.ctx.fillRect(fm.x + fm.width/2 - 5, fm.y + 10, 10, fm.height - 20);
    
    this.ctx.restore();
  }

  drawCloud(x, y, size) {
    // Enhanced cloud with shading
    // Main cloud puffs
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.arc(x + size, y, size * 0.8, 0, Math.PI * 2);
    this.ctx.arc(x - size, y, size * 0.8, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Cloud highlights
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.beginPath();
    this.ctx.arc(x - 5, y - 5, size * 0.5, 0, Math.PI * 2);
    this.ctx.arc(x + size - 5, y - 5, size * 0.4, 0, Math.PI * 2);
    this.ctx.arc(x - size - 5, y - 5, size * 0.4, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Cloud shadows
    this.ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
    this.ctx.beginPath();
    this.ctx.arc(x + 5, y + 5, size * 0.6, 0, Math.PI * 2);
    this.ctx.arc(x + size + 5, y + 5, size * 0.5, 0, Math.PI * 2);
    this.ctx.arc(x - size + 5, y + 5, size * 0.5, 0, Math.PI * 2);
    this.ctx.fill();
  }

  gameLoop() {
    if(this.gameState === 'playing') {
      if(!this.isPaused) {
        this.update();
        this.render();
      }
      requestAnimationFrame(() => this.gameLoop());
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});