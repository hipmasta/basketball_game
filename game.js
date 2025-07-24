// DOM 요소 가져오기
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const currentStreakEl = document.getElementById('current-streak');
const highScoreEl = document.getElementById('high-score');
const messageEl = document.getElementById('message');
const messageContainer = document.querySelector('.message-container');

// 캔버스 크기 조절
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 게임 변수
let ball, hoop;
let gravity = 0.5;
let wind = 0;
let isDragging = false;
let dragStartPoint, dragEndPoint, lastMouseX;
let score = 0;
let highScore = 0;
let particles = [];

// 파티클 객체 (이전과 동일)
class Particle {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 5) * 4;
        this.radius = Math.random() * 4 + 2;
        const colors = ['#FFDAB9', '#E6E6FA', '#B0E0E6', '#F08080'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.life = 80;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vy += 0.1; this.life--;
    }
    draw() {
        ctx.globalAlpha = this.life / 80;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.fill();
        ctx.closePath(); ctx.globalAlpha = 1.0;
    }
}

// 공 객체 (새로운 라인아트 디자인)
class Ball {
    constructor(x, y, radius) {
        this.x = x; this.y = y;
        this.radius = radius;
        this.vx = 0; this.vy = 0;
        this.spin = 0;
        this.angle = 0;
        this.isMoving = false;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle); // 회전 적용

        // 흰색 배경
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        
        // 검은색 라인
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;

        // 외곽선
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // 중앙 수직선
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(0, this.radius);
        ctx.stroke();

        // 양쪽 커브 선
        ctx.beginPath();
        ctx.moveTo(this.radius * 0.5, -this.radius * 0.866);
        ctx.quadraticCurveTo(this.radius, 0, this.radius * 0.5, this.radius * 0.866);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-this.radius * 0.5, -this.radius * 0.866);
        ctx.quadraticCurveTo(-this.radius, 0, -this.radius * 0.5, this.radius * 0.866);
        ctx.stroke();

        ctx.restore();
    }

    update() {
        if (this.isMoving) {
            this.vy += gravity;
            this.vx += wind;
            this.vx += this.spin * 0.01;
            this.x += this.vx;
            this.y += this.vy;
            this.angle += this.vx * 0.05; // 회전

            if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
                this.vx *= -0.8;
                this.spin *= 0.5;
            }
            
            if (this.y - this.radius > canvas.height) {
                if (score > 0) {
                    showMessage("아깝네요!");
                    updateHighScore();
                    score = 0;
                }
                resetBall();
                updateScore();
            }
        }
    }
}

// 골대 객체 (새로운 디자인 및 그물 찰랑임 추가)
class Hoop {
    constructor() {
        this.x = canvas.width / 2 - 60;
        this.y = canvas.height * 0.35;
        this.width = 120;
        this.backboard = { x: this.x - 5, y: this.y - 80, width: 130, height: 85 };
        this.speed = 0;
        this.direction = 1;
        
        // 그물 찰랑임 상태
        this.isSwishing = false;
        this.swishProgress = 0;
    }

    update() {
        // 골대 움직임
        if (this.speed !== 0) {
            this.x += this.speed * this.direction;
            this.backboard.x += this.speed * this.direction;
            if (this.x + this.width > canvas.width - 10 || this.x < 10) {
                this.direction *= -1;
            }
        }
        // 그물 애니메이션
        if (this.isSwishing) {
            this.swishProgress += 0.1;
            if (this.swishProgress >= 1) {
                this.isSwishing = false;
                this.swishProgress = 0;
            }
        }
    }

    triggerSwish() {
        this.isSwishing = true;
        this.swishProgress = 0;
    }

    draw() {
        ctx.strokeStyle = 'white';
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 5;

        // 백보드
        ctx.fillRect(this.backboard.x, this.backboard.y, this.backboard.width, this.backboard.height);
        ctx.strokeRect(this.backboard.x, this.backboard.y, this.backboard.width, this.backboard.height);
        
        // 림
        ctx.fillStyle = '#FF4500'; // 주황색
        ctx.beginPath();
        ctx.rect(this.x, this.y - 5, this.width, 10);
        ctx.fill();

        // 그물
        const netHeight = 60;
        const netWidth = this.width * 0.8;
        const startX = this.x + (this.width - netWidth) / 2;
        
        // 찰랑이는 효과 계산
        const swishAmount = netHeight * 0.5 * Math.sin(this.swishProgress * Math.PI);

        for (let i = 0; i <= 5; i++) {
            const x1 = startX + (netWidth / 5) * i;
            const y1 = this.y + 5;
            const x2 = x1 + swishAmount * (i % 2 === 0 ? 1 : -1);
            const y2 = y1 + netHeight;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}

// 게임 초기화
function init() {
    resetBall();
    hoop = new Hoop();
    gameLoop();
}

// 공 리셋
function resetBall() {
    ball = new Ball(canvas.width / 2, canvas.height - 220, 25);
}

// 점수 업데이트
function updateScore() {
    currentStreakEl.textContent = score;
    wind = 0;
    hoop.speed = 0;
    if (score > 0) {
        if (score >= 5) wind = (Math.random() - 0.5) * 0.05 * Math.floor(score / 5);
        if (score >= 10) hoop.speed = 0.5 + (0.5 * Math.floor(score / 10));
    }
}

// 최고 점수 업데이트
function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        highScoreEl.textContent = highScore;
    }
}

// 메시지 표시
function showMessage(msg) {
    messageEl.textContent = msg;
    messageContainer.style.display = 'block';
    setTimeout(() => { messageContainer.style.display = 'none'; }, 1500);
}

// 파티클, 스크린쉐이크
function createParticles(x, y) { for (let i = 0; i < 30; i++) particles.push(new Particle(x, y)); }
function screenShake() {
    document.querySelector('.game-container').classList.add('shake');
    setTimeout(() => { document.querySelector('.game-container').classList.remove('shake'); }, 200);
}

// 충돌 감지
function checkCollision() {
    if (!ball.isMoving) return;
    if (ball.y > hoop.y - 10 && ball.y < hoop.y + 10 && ball.x > hoop.x && ball.x < hoop.x + hoop.width && ball.vy > 0) {
        score++;
        showMessage(`NICE! ${score} STREAK!`);
        createParticles(ball.x, ball.y);
        screenShake();
        hoop.triggerSwish(); // 그물 찰랑임 트리거
        updateHighScore();
        resetBall();
        updateScore();
    }
}

// 입력 처리
function handleMouseDown(e) {
    isDragging = true;
    const pos = getMousePos(e);
    dragStartPoint = pos;
    lastMouseX = pos.x;
    ball.spin = 0;
}

function handleMouseMove(e) {
    if (!isDragging || ball.isMoving) return;
    const pos = getMousePos(e);
    ball.spin += (pos.x - lastMouseX) * 0.1;
    ball.spin = Math.max(-10, Math.min(10, ball.spin));
    lastMouseX = pos.x;
}

function handleMouseUp(e) {
    if (!isDragging || ball.isMoving) return;
    isDragging = false;
    dragEndPoint = getMousePos(e);
    const dx = dragEndPoint.x - dragStartPoint.x;
    const dy = dragEndPoint.y - dragStartPoint.y;
    ball.vx = -dx * 0.15;
    ball.vy = -dy * 0.15;
    ball.isMoving = true;
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleMouseDown(e); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleMouseMove(e); });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); handleMouseUp(e); });

// 게임 루프
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    hoop.update();
    hoop.draw();
    
    ball.update();
    ball.draw();
    
    checkCollision();

    particles.forEach((p, i) => {
        p.update();
        p.draw();
        if (p.life <= 0) particles.splice(i, 1);
    });

    requestAnimationFrame(gameLoop);
}

init();
