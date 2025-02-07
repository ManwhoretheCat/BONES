export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 30;
    this.velocityX = 0;
    this.velocityY = 0;
    this.speed = 2;  
    this.jumpForce = -8; 
    this.gravity = 0.25; 
    this.health = 100;
    this.isGrounded = false;
    this.canDoubleJump = false;
    this.doubleJumpUsed = false;
    this.keys = {};
    this.jumpHoldTimer = 0;
    this.maxJumpHoldTime = 15;
    this.flashRedTimer = 0;
    this.minWidth = 10;
    this.minHeight = 15;
    this.baseWidth = 20;
    this.baseHeight = 30;
    this.damageTimer = 0;  
    this.score = 0; // Initialize score
    this.candleDamageTimer = 0;
    this.candleFlashTimer = 0;
  }

  handleKeyDown(e) {
    this.keys[e.key] = true;
    if(e.key === '0' && this.width > this.minWidth) {
      this.dropBone = true;
      this.flashRedTimer = 120; // 2 seconds at 60fps
      this.width = Math.max(this.minWidth, this.width - 2);
      this.height = Math.max(this.minHeight, this.height - 2);
    }
  }

  handleKeyUp(e) {
    this.keys[e.key] = false;
    if(e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') {
      this.jumpHoldTimer = 0;
    }
  }

  update(platforms) {
    if (this.health <= 0) return;

    if(this.keys['ArrowRight'] || this.keys['d']) {
      this.velocityX = this.speed;
    } else if(this.keys['ArrowLeft'] || this.keys['a']) {
      this.velocityX = -this.speed;
    } else {
      this.velocityX = 0;
    }

    const jumpKeyPressed = this.keys['ArrowUp'] || this.keys['w'] || this.keys[' '];
    
    if(jumpKeyPressed) {
      if(this.isGrounded) {
        this.velocityY = this.jumpForce;
        this.isGrounded = false;
        this.canDoubleJump = true;
        this.jumpHoldTimer = 0;
      } 
      else if(this.canDoubleJump && !this.doubleJumpUsed && this.velocityY > -2) {
        this.velocityY = this.jumpForce;
        this.doubleJumpUsed = true;
        this.jumpHoldTimer = 0;
      }
      
      if(this.jumpHoldTimer < this.maxJumpHoldTime) {
        this.jumpHoldTimer++;
        if(this.velocityY > this.jumpForce) {
          this.velocityY -= 0.5;
        }
      }
    }

    this.velocityY += this.gravity;
    this.x += this.velocityX;
    this.y += this.velocityY;

    this.isGrounded = false;
    platforms.forEach(platform => {
      if(this.collidesWith(platform)) {
        if(this.velocityY > 0) {
          this.isGrounded = true;
          this.velocityY = 0;
          this.y = platform.y - this.height;
          this.doubleJumpUsed = false;
        }
      }
    });

    // Update damage timer
    if (this.damageTimer > 0) {
      this.damageTimer--;
    }
    if (this.candleDamageTimer > 0) {
      this.candleDamageTimer--;
    }
  }

  collidesWith(object) {
    return this.x < object.x + object.width &&
           this.x + this.width > object.x &&
           this.y < object.y + object.height &&
           this.y + this.height > object.y;
  }

  grow() {
    this.width += 2;
    this.height += 2;
  }

  takeDamage() {
    if (this.damageTimer <= 0) {  
      this.health -= 30;
      this.flashRedTimer = 60; 
      this.damageTimer = 60;  
    }
  }

  touchRedCandle() {
    if (this.candleDamageTimer <= 0) {
      this.health -= 60;
      this.candleFlashTimer = 300; // 5 seconds
      this.candleDamageTimer = 60; // 1 second cooldown
      
      // If health is 0 or below, flash red for 2 seconds before game over
      if (this.health <= 0) {
        this.flashRedTimer = 120; // 2 seconds at 60fps
      }
    }
  }

  render(ctx) {
    // Base color with shading
    ctx.fillStyle = this.score >= 70 ? '#d4d4d4' : '#ffffff';
    const shadowColor = this.score >= 70 ? '#b0b0b0' : '#e0e0e0';
    
    if(this.flashRedTimer > 0 || this.candleFlashTimer > 0) {
      ctx.fillStyle = '#ff0000';
      this.flashRedTimer--;
      this.candleFlashTimer--;
    }
    
    // Enhanced skeleton body with shading
    ctx.fillRect(this.x + this.width * 0.4, this.y, this.width * 0.2, this.height);
    ctx.fillStyle = shadowColor;
    ctx.fillRect(this.x + this.width * 0.45, this.y, this.width * 0.1, this.height);
    
    // Enhanced skull with details
    ctx.beginPath();
    ctx.arc(this.x + this.width/2, this.y, this.width * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = this.score >= 70 ? '#d4d4d4' : '#ffffff';
    ctx.fill();
    
    // Skull details
    ctx.beginPath();
    ctx.arc(this.x + this.width/2, this.y - 2, this.width * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = shadowColor;
    ctx.fill();
    
    // Eye sockets
    ctx.fillStyle = '#404040';
    ctx.beginPath();
    ctx.arc(this.x + this.width * 0.4, this.y - 2, 4, 0, Math.PI * 2);
    ctx.arc(this.x + this.width * 0.6, this.y - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Enhanced eyes
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(this.x + this.width * 0.4, this.y - 2, 3, 0, Math.PI * 2);
    ctx.arc(this.x + this.width * 0.6, this.y - 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // White eyelids
    ctx.fillStyle = this.score >= 70 ? '#d4d4d4' : '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x + this.width * 0.4, this.y - 4, 4, Math.PI, 0);
    ctx.arc(this.x + this.width * 0.6, this.y - 4, 4, Math.PI, 0);
    ctx.fill();
    
    // Enhanced arms with joints
    const armAngle = Math.sin(Date.now() / 200) * 0.5;
    ctx.save();
    ctx.translate(this.x + this.width/2, this.y + this.height * 0.2);
    
    // Left arm with joints
    ctx.rotate(-Math.PI/4 + armAngle);
    ctx.fillStyle = this.score >= 70 ? '#d4d4d4' : '#ffffff';
    // Upper arm
    ctx.fillRect(-this.width * 0.1, 0, this.width * 0.2, this.height * 0.2);
    // Elbow joint
    ctx.beginPath();
    ctx.arc(0, this.height * 0.2, this.width * 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Lower arm
    ctx.fillRect(-this.width * 0.1, this.height * 0.2, this.width * 0.2, this.height * 0.2);
    
    // Right arm with joints
    ctx.rotate(Math.PI/2 - armAngle * 2);
    // Upper arm
    ctx.fillRect(-this.width * 0.1, 0, this.width * 0.2, this.height * 0.2);
    // Elbow joint
    ctx.beginPath();
    ctx.arc(0, this.height * 0.2, this.width * 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Lower arm
    ctx.fillRect(-this.width * 0.1, this.height * 0.2, this.width * 0.2, this.height * 0.2);
    
    ctx.restore();
  }
}