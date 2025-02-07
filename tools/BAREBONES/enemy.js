export class Enemy {
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.baseWidth = type === 'salesman' ? 20 : 10;
    this.baseHeight = type === 'salesman' ? 30 : 15;
    this.width = this.baseWidth;
    this.height = this.baseHeight;
    this.velocityX = type === 'salesman' ? 0.5 : 0.3; 
    this.velocityY = 0;
    this.jumpForce = -10;
    this.gravity = 0.25;
    this.isGrounded = false;
    this.direction = Math.random() < 0.5 ? 1 : -1;
    this.directionChangeTimer = 0;
    this.detectionRange = type === 'salesman' ? 120 : 180; 
    this.targetBone = null;
    this.randomBehaviorTimer = 0;
    this.isRandomBehavior = false;
    this.lastCandleDropX = x;
    this.candleDropDistance = type === 'jeet' ? 30 : 90; 
    this.nextCandleTime = 0;
    this.enlargeTimer = 0;
    this.jumpTimer = 0;
    this.jumpCooldown = 0;
    this.jumpProbability = type === 'salesman' ? 0.08 : 0.02;
    this.detectionTimer = 0; 
  }

  update(platforms, player, bones) {
    if(this.isGrounded) {
      this.jumpCooldown--;
      this.directionChangeTimer++;
      
      if(this.type === 'salesman') {
        const distanceToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
        
        if(distanceToPlayer <= this.detectionRange) {
          this.detectionTimer = 300; // Keep tracking for 5 seconds
          this.direction = player.x > this.x ? 1 : -1;
          
          // Check if there's a platform ahead before moving
          const platformAhead = platforms.some(platform => 
            Math.abs(this.x + (this.width * this.direction) - platform.x) < 30 &&
            Math.abs(this.y + this.height - platform.y) < 5
          );
          
          if(platformAhead || Math.random() < this.jumpProbability) {
            if(this.jumpCooldown <= 0) {
              this.velocityY = this.jumpForce;
              this.isGrounded = false;
              this.jumpCooldown = 60;
            }
            this.x += this.velocityX * this.direction;
          }
        } else if(this.detectionTimer > 0) {
          // Continue pursuing for detection timer duration
          this.detectionTimer--;
          if(Math.random() < this.jumpProbability && this.jumpCooldown <= 0) {
            this.velocityY = this.jumpForce;
            this.isGrounded = false;
            this.jumpCooldown = 60;
          }
          this.x += this.velocityX * this.direction;
        } else {
          // Random movement with platform awareness
          if(Math.random() < this.jumpProbability && this.jumpCooldown <= 0) {
            this.velocityY = this.jumpForce;
            this.isGrounded = false;
            this.jumpCooldown = 60;
          }
          
          if(this.directionChangeTimer > 60) {
            this.direction = Math.random() < 0.5 ? 1 : -1;
            this.directionChangeTimer = 0;
          }
          
          const platformAhead = platforms.some(platform => 
            Math.abs(this.x + (this.width * this.direction) - platform.x) < 30 &&
            Math.abs(this.y + this.height - platform.y) < 5
          );
          
          if(platformAhead) {
            this.x += this.velocityX * this.direction;
          } else {
            this.direction *= -1;
          }
        }
      } else if(this.type === 'jeet') {
        if(this.isRandomBehavior) {
          if(this.randomBehaviorTimer > 0) {
            this.randomBehaviorTimer--;
            
            if(Math.random() < 0.1) {
              this.direction = Math.random() < 0.5 ? 1 : -1;
            }
            
            if(Math.random() < 0.08) { 
              this.velocityY = this.jumpForce;
              this.isGrounded = false;
            }
            
            this.x += this.velocityX * this.direction * 0.5;

            if(this.isRandomBehavior && Math.abs(this.x - this.lastCandleDropX) >= this.candleDropDistance) {
              this.dropCandle = true;
              this.lastCandleDropX = this.x;
            }
          } else {
            this.isRandomBehavior = false;
          }
        } else {
          if(!this.targetBone && bones.length > 0) {
            this.targetBone = bones.find(bone => 
              Math.hypot(bone.x - this.x, bone.y - this.y) <= this.detectionRange
            );
          }
          
          if(this.targetBone) {
            this.direction = this.targetBone.x > this.x ? 1 : -1;
            
            // Jump only when bone is above and nearby
            if(this.targetBone.y < this.y - 30 && 
               Math.abs(this.targetBone.x - this.x) < 100 && 
               this.jumpCooldown <= 0) {
              this.velocityY = this.jumpForce;
              this.isGrounded = false;
              this.jumpCooldown = 90;
            }
            
            this.x += this.velocityX * this.direction;
          } else {
            // Exploration behavior
            if(this.directionChangeTimer > 180) {
              this.direction *= -1;
              this.directionChangeTimer = 0;
            }
            this.x += this.velocityX * this.direction * 0.5;
          }

          if(Math.random() < 0.005 && !this.isRandomBehavior) { 
            this.isRandomBehavior = true;
            this.randomBehaviorTimer = 300; 
            this.targetBone = null;
          }

          if(this.dropCandle) {
            this.isRandomBehavior = true;
            this.randomBehaviorTimer = 600; 
            this.targetBone = null;
          }
        }
      }
    }

    if (this.type === 'jeet' && this.isRandomBehavior) {
      if (Math.abs(this.x - this.lastCandleDropX) >= this.candleDropDistance) {
        this.dropCandle = true;
        this.lastCandleDropX = this.x;
      }
    }

    if(this.enlargeTimer > 0) {
      this.enlargeTimer--;
      if(this.enlargeTimer === 0) {
        this.width = this.baseWidth;
        this.height = this.baseHeight;
      }
    }

    this.velocityY += this.gravity;
    this.y += this.velocityY;

    this.isGrounded = false;
    platforms.forEach(platform => {
      if(this.collidesWith(platform)) {
        if(this.velocityY > 0) {
          this.isGrounded = true;
          this.velocityY = 0;
          this.y = platform.y - this.height;
        }
      }
    });
  }

  collidesWith(object) {
    return this.x < object.x + object.width &&
           this.x + this.width > object.x &&
           this.y < object.y + object.height &&
           this.y + this.height > object.y;
  }

  render(ctx) {
    if(this.type === 'salesman') {
      // Enhanced suit with shading
      ctx.fillStyle = '#000000';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(this.x + this.width * 0.1, this.y, this.width * 0.8, this.height);
      
      // Enhanced shirt with collar
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(this.x + this.width * 0.25, this.y, this.width * 0.5, this.height * 0.3);
      ctx.fillStyle = '#F0F0F0';
      ctx.fillRect(this.x + this.width * 0.3, this.y, this.width * 0.4, this.height * 0.25);
      
      // Enhanced tie with shading
      const tieGradient = ctx.createLinearGradient(
        this.x + this.width * 0.5, this.y,
        this.x + this.width * 0.5, this.y + this.height * 0.7
      );
      tieGradient.addColorStop(0, '#ff0000');
      tieGradient.addColorStop(1, '#cc0000');
      ctx.fillStyle = tieGradient;
      
      ctx.beginPath();
      ctx.moveTo(this.x + this.width * 0.5, this.y);
      ctx.lineTo(this.x + this.width * 0.6, this.y + this.height * 0.5);
      ctx.lineTo(this.x + this.width * 0.5, this.y + this.height * 0.7);
      ctx.lineTo(this.x + this.width * 0.4, this.y + this.height * 0.5);
      ctx.closePath();
      ctx.fill();
      
      // Enhanced animated sunglasses
      if(Math.sin(Date.now() / 1000) > 0) {
        // Frame
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x + this.width * 0.2, this.y + this.height * 0.15, 
                    this.width * 0.6, this.height * 0.1);
        // Lens shine
        ctx.fillStyle = '#404040';
        ctx.fillRect(this.x + this.width * 0.25, this.y + this.height * 0.16, 
                    this.width * 0.1, this.height * 0.03);
      }
      
    } else if(this.type === 'jeet') {
      // Enhanced blob with gradient
      const blobGradient = ctx.createRadialGradient(
        this.x + this.width/2, this.y + this.height/2, 0,
        this.x + this.width/2, this.y + this.height/2, this.width/2
      );
      blobGradient.addColorStop(0, '#A0522D');
      blobGradient.addColorStop(1, '#8B4513');
      
      ctx.fillStyle = blobGradient;
      ctx.beginPath();
      ctx.arc(this.x + this.width/2, this.y + this.height/2, 
              this.width/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Enhanced animated bubbles
      const bubblePositions = [
        {x: 0.3, y: 0.3, size: 4},
        {x: 0.7, y: 0.4, size: 3},
        {x: 0.5, y: 0.6, size: 5}
      ];
      
      bubblePositions.forEach((pos, i) => {
        const time = Date.now() / (1000 + i * 200);
        if(Math.sin(time) > 0) {
          // Bubble with highlight
          ctx.beginPath();
          ctx.arc(this.x + this.width * pos.x, 
                  this.y + this.height * pos.y,
                  pos.size, 0, Math.PI * 2);
          ctx.fillStyle = '#B8860B';
          ctx.fill();
          
          // Bubble highlight
          ctx.beginPath();
          ctx.arc(this.x + this.width * pos.x - 1, 
                  this.y + this.height * pos.y - 1,
                  pos.size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = '#DAA520';
          ctx.fill();
        }
      });
    }
  }

  touchCandle() {
    if(this.type === 'salesman' && this.enlargeTimer === 0) {
      this.width = this.baseWidth * 2;
      this.height = this.baseHeight * 2;
      this.enlargeTimer = 900; 
    }
  }
}