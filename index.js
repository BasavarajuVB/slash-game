const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const gameOverDisplay = document.getElementById('game-over');
const restartBtn = document.getElementById('restart');

let lastPos = {x: 0, y: 0};
let isDragging = false;
let slashPoints = [];
let shineParticles = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let fruits = [];
let score = 0;
let gameOver = false;
let gameLoop;
let spawnInterval;
let timeRemaining = 60;
let timerInterval;

class ShineParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 6;
        this.speedY = (Math.random() - 0.5) * 6;
        this.life = 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.02;
        this.size = Math.max(0, this.size - 0.1);
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Fruit {
    constructor(corner) {
        this.size = 40;
        this.setCornerPosition(corner);
        this.shape = this.getRandomShape();
        this.color = this.getRandomColor();
        this.points = this.getPoints();
        this.isSliced = false;
    }

    setCornerPosition(corner) {
        switch(corner) {
            case 0:
                this.x = -this.size;
                this.y = -this.size;
                this.velocityX = 3 + Math.random() * 2;
                this.velocityY = 3 + Math.random() * 2;
                break;
            case 1:
                this.x = canvas.width + this.size;
                this.y = -this.size;
                this.velocityX = -(3 + Math.random() * 2);
                this.velocityY = 3 + Math.random() * 2;
                break;
            case 2:
                this.x = -this.size;
                this.y = canvas.height + this.size;
                this.velocityX = 3 + Math.random() * 2;
                this.velocityY = -(3 + Math.random() * 2);
                break;
            case 3:
                this.x = canvas.width + this.size;
                this.y = canvas.height + this.size;
                this.velocityX = -(3 + Math.random() * 2);
                this.velocityY = -(3 + Math.random() * 2);
                break;
        }
    }

    getRandomShape() {
        const shapes = ['circle', 'square', 'triangle', 'star'];
        return shapes[Math.floor(Math.random() * shapes.length)];
    }

    getRandomColor() {
        const colors = ['#ff4444', '#ffbb33', '#00C851', '#33b5e5'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    getPoints() {
        if(this.color === "#ff4444") {
            return -5;

        } //else if(this.color === "#ffbb33") {
        //     return 5;
        // } else if(this.color === "#00C851") {
        //     return 3;
        // } else if(this.color === "#33b5e5") {
        //     return 5;
        // } else {
        //     return 1;
        // }

        switch(this.shape) {
            case 'circle' : return 1;
            case 'square': return 5;
            case 'triangle': return 3;
            case 'star': return 5;
            default: return 1;
        }
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        return this.isOffscreen();
    }

    isOffscreen() {
        return (this.x < -this.size * 2 || 
                this.x > canvas.width + this.size * 2 ||
                this.y < -this.size * 2 || 
                this.y > canvas.height + this.size * 2);
    }

    createShineEffect() {
        const particles = [];
        for (let i = 0; i < 20; i++) {
            particles.push(new ShineParticle(
                this.x + this.size/2,
                this.y + this.size/2,
                this.color
            ));
        }
        return particles;
    }

    draw() {
        if (this.isSliced) return;
        
        ctx.fillStyle = this.color;
        ctx.beginPath();

        switch(this.shape) {
            case 'circle':
                ctx.arc(this.x + this.size/2, this.y + this.size/2, this.size/2, 0, Math.PI * 2);
                break;
            case 'square':
                ctx.rect(this.x, this.y, this.size, this.size);
                break;
            case 'triangle':
                ctx.moveTo(this.x + this.size/2, this.y);
                ctx.lineTo(this.x + this.size, this.y + this.size);
                ctx.lineTo(this.x, this.y + this.size);
                break;
            case 'star':
                this.drawStar(this.x + this.size/2, this.y + this.size/2, 5, this.size/2, this.size/4);
                break;
        }

        ctx.fill();
        ctx.closePath();
    }

    drawStar(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        
        for(let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
    }

    checkSlice(x1, y1, x2, y2) {
        if (this.isSliced) return false;

        const centerX = this.x + this.size/2;
        const centerY = this.y + this.size/2;
        
        const dist = this.pointToLineDistance(centerX, centerY, x1, y1, x2, y2);
        return dist < this.size/2;
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        
        if (len_sq != 0) param = dot / len_sq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        }
        else if (param > 1) {
            xx = x2;
            yy = y2;
        }
        else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

function startGame() {
    fruits = [];
    score = 0;
    timeRemaining = 60;
    gameOver = false;
    scoreDisplay.innerHTML = `Score: ${score}`;
    timerDisplay.innerHTML = `Time: ${timeRemaining}`;
    gameOverDisplay.style.display = 'none';
    restartBtn.style.display = 'none';
    slashPoints = [];
    shineParticles = [];

    clearInterval(gameLoop);
    clearInterval(spawnInterval);
    clearInterval(timerInterval);

    gameLoop = setInterval(updateGame, 1000/60);
    spawnInterval = setInterval(spawnFruit, 1000);
    timerInterval = setInterval(updateTimer, 1000);
}

function spawnFruit() {
    if (!gameOver) {
        const corner = Math.floor(Math.random() * 4);
        fruits.push(new Fruit(corner));
    }
}

function updateGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw shine particles
    for (let i = shineParticles.length - 1; i >= 0; i--) {
        shineParticles[i].update();
        shineParticles[i].draw(ctx);
        if (shineParticles[i].life <= 0) {
            shineParticles.splice(i, 1);
        }
    }

    // Update and draw fruits
    for (let i = fruits.length - 1; i >= 0; i--) {
        const fruit = fruits[i];
        const isOffscreen = fruit.update();
        
        if (isOffscreen) {
            fruits.splice(i, 1);
        } else {
            fruit.draw();
        }
    }
}

function updateTimer() {
    if (timeRemaining > 0) {
        timeRemaining--;
        timerDisplay.innerHTML = `Time: ${timeRemaining}`;
        if (timeRemaining === 0) {
            endGame();
        }
    }
}

function endGame() {
    gameOver = true;
    clearInterval(gameLoop);
    clearInterval(spawnInterval);
    clearInterval(timerInterval);
    gameOverDisplay.style.display = 'block';
    restartBtn.style.display = 'block';
}



function handleSlice(points) {
if (gameOver || points.length < 2) return;

const x1 = points[points.length - 2].x;
const y1 = points[points.length - 2].y;
const x2 = points[points.length - 1].x;
const y2 = points[points.length - 1].y;

let sliceHappened = false;
fruits.forEach(fruit => {
 if (!fruit.isSliced && fruit.checkSlice(x1, y1, x2, y2)) {
     score += fruit.points;
     fruit.isSliced = true;
     shineParticles.push(...fruit.createShineEffect());
     scoreDisplay.innerHTML = `Score: ${score}`;
     sliceHappened = true;
 }
});

// Only keep points if slice happened on a shape
if (!sliceHappened) {
 slashPoints = [points[points.length - 1]];
}
}

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    lastPos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    slashPoints = [lastPos];
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    const currentPos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    slashPoints.push(currentPos);
    handleSlice(slashPoints);
    lastPos = currentPos;
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    slashPoints = [];
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    slashPoints = [];
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    lastPos = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
    };
    slashPoints = [lastPos];
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const currentPos = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
    };
    slashPoints.push(currentPos);
    handleSlice(slashPoints);
    lastPos = currentPos;
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    isDragging = false;
    slashPoints = [];
});
restartBtn.addEventListener('click', startGame);

// Prevent default scrolling on mobile
document.body.addEventListener('touchstart', (e) => {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

document.body.addEventListener('touchmove', (e) => {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

document.body.addEventListener('touchend', (e) => {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

startGame();
