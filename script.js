let currentCanvasSize;
let currentCellSize;
const CELLS_PER_SIDE = 20;

const INITIAL_SNAKE_LENGTH = 1;
const GAME_SPEED = 450;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('high-score');
const highScoreContainer = document.getElementById('high-score-container');
const mathChallengeArea = document.getElementById('math-challenge-area');
const mathProblemDisplay = document.getElementById('math-problem');
const mathAnswerInput = document.getElementById('math-answer-input');
const submitAnswerBtn = document.getElementById('submit-answer-btn');
const timerDisplay = document.getElementById('timer-display');
const startGameBtn = document.getElementById('start-game-btn');
const pauseGameBtn = document = document.getElementById('pause-game-btn');
const resetGameBtn = document.getElementById('reset-game-btn');
const difficultyPanel = document.getElementById('difficulty-panel');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');
const gameOverModal = document.getElementById('gameOverModal');
const finalScoreDisplay = document.getElementById('finalScore');
const restartGameBtn = document.getElementById('restartGameBtn');
const installButton = document.getElementById('install-button');
const customKeyboard = document.getElementById('custom-keyboard');
const messageArea = document.getElementById('message-area');

const operationSelectionPanel = document.getElementById('operation-selection-panel');
const operationButtons = document.querySelectorAll('.operation-btn');

const infoModal = document.getElementById('infoModal');
const closeInfoModalBtn = document.getElementById('closeInfoModalBtn');

const welcomeModal = document.getElementById('welcomeModal');
const startPlayingBtn = document.getElementById('startPlayingBtn');

const gamePanel = document.querySelector('.game-panel');
const rightPanel = document.querySelector('.right-panel');
const header = document.querySelector('.header');
const controlPanel = document.getElementById('control-panel');

const allTimeHighScoreContainer = document.getElementById('all-time-high-score-container');
const allTimeHighScoreDisplay = document.getElementById('all-time-high-score');
const allTimeHighScoreProblemTypeDisplay = document.getElementById('all-time-high-score-problem-type');

let snake = [];
let food = {};
let direction = 'right';
let score = 0;
let highScores = JSON.parse(localStorage.getItem('mathSnakeHighScores')) || {};
let gameInterval;
let isGameRunning = false;
let isPaused = false;
let awaitingMathAnswer = false;
let correctMathAnswer = 0;
let mathTimerInterval;
let timeLeftForMath = 0;
let initialTimeForCurrentChallenge = 0;
let currentDifficulty = null;
let selectedOperationType = null;
let deferredInstallPrompt = null;

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
const minSwipeDistance = 30;

let pauseCountdownInterval = null;
let pauseTimeLeft = 0;

let lastProblemText = '';
let lastCorrectAnswerDisplay = '';

const difficultyTimes = {
    easy: 60,
    medium: 120,
    hard: 180,
    expert: 240
};

let allTimeHighScore = JSON.parse(localStorage.getItem('allTimeMathSnakeHighScore')) || { score: 0, problemType: 'N/A' };


// --- Utility and Display Functions (Moved to top for guaranteed availability) ---

function setMessage(msg) {
    messageArea.innerHTML = msg;
    messageArea.style.display = 'block';
}

function updateDifficultyAndOperationDisplay() {
    difficultyButtons.forEach(btn => {
        if (btn.dataset.difficulty === currentDifficulty) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    operationButtons.forEach(btn => {
        if (btn.dataset.operationType === selectedOperationType) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    const highScoreKey = `${selectedOperationType}_${currentDifficulty}`;
    if (highScoreDisplay) {
        highScoreDisplay.textContent = highScores[highScoreKey] || 0;
    }
}

function updateAllTimeHighScoreDisplay() {
    if (allTimeHighScoreDisplay && allTimeHighScoreProblemTypeDisplay) {
        allTimeHighScoreDisplay.textContent = allTimeHighScore.score;
        allTimeHighScoreProblemTypeDisplay.textContent = allTimeHighScore.problemType;
    }
}

function checkAndEnableStartGame() {
    if (currentDifficulty && selectedOperationType) {
        startGameBtn.disabled = false;
        const selectedProblemText = document.querySelector(`.operation-btn[data-operation-type="${selectedOperationType}"]`).textContent;
        setMessage(`Ready to play! Selected: **${selectedProblemText}** at **${currentDifficulty.toUpperCase()}** difficulty. Click **Start Game**.`);
        const highScoreKey = `${selectedOperationType}_${currentDifficulty}`;
        if (highScoreDisplay) {
            highScoreDisplay.textContent = highScores[highScoreKey] || 0;
        }
        startGameBtn.style.display = 'inline-block';
    } else {
        startGameBtn.disabled = true;
        startGameBtn.style.display = 'inline-block';
        if (!currentDifficulty && !selectedOperationType) {
            setMessage('Welcome! Please choose a **problem type** and **difficulty** to start.');
        } else if (!currentDifficulty) {
            const problemTypeText = selectedOperationType ? document.querySelector(`.operation-btn[data-operation-type="${selectedOperationType}"]`).textContent : 'a problem type';
            setMessage(`Problem type set to **${problemTypeText.toUpperCase()}**. Now choose a **difficulty**.`);
        } else {
            const difficultyText = currentDifficulty ? currentDifficulty.toUpperCase() : 'a difficulty';
            setMessage(`Difficulty set to **${difficultyText}**. Now choose a **problem type**.`);
        }
    }
}

// Helper function to draw a rounded rectangle (used by drawGame)
function drawRoundedRect(ctx, x, y, width, height, radius) {
    radius = { tl: radius, tr: radius, br: radius, bl: radius }; // Fixed typo: duplicate 'radius' was `radius, bl: radius`
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}


// --- Game State Management and Core Logic ---

function endGame() {
    isGameRunning = false;
    clearInterval(gameInterval);
    clearInterval(mathTimerInterval);
    clearInterval(pauseCountdownInterval);
    finalScoreDisplay.textContent = score;
    gameOverModal.style.display = 'flex';
    
    mathChallengeArea.style.display = 'none';
    customKeyboard.style.display = 'none';
    rightPanel.style.display = 'none';

    gamePanel.style.display = 'flex';
    canvas.style.display = 'none';
    scoreDisplay.parentElement.style.display = 'none';

    if (highScoreContainer) {
        highScoreContainer.style.display = 'none';
    }
    if (allTimeHighScoreContainer) {
        allTimeHighScoreContainer.style.display = 'flex';
    }

    if (lastProblemText && lastCorrectAnswerDisplay) {
        setMessage(`Game Over! The correct answer for "${lastProblemText}" was **${lastCorrectAnswerDisplay}**. Keep practicing, you'll get it next time!`);
    } else {
        setMessage('Game Over! Better luck next time!');
    }
    
    startGameBtn.style.display = 'inline-block';
    pauseGameBtn.style.display = 'none';
    resetGameBtn.style.display = 'inline-block';
    difficultyPanel.style.display = 'flex';
    operationSelectionPanel.style.display = 'flex';
    header.style.display = 'block';
    controlPanel.style.display = 'flex';

    startGameBtn.disabled = true;
    currentDifficulty = null;
    selectedOperationType = null;
    updateDifficultyAndOperationDisplay();
    updateAllTimeHighScoreDisplay();
}


function initializeGame() {
    resizeCanvas(); // This now calls a defined resizeCanvas function

    snake = [];
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
        snake.push({ x: (INITIAL_SNAKE_LENGTH - 1 - i) * currentCellSize, y: 0 });
    }

    direction = 'right';
    score = 0;
    scoreDisplay.textContent = score;
    
    if (highScoreContainer) {
        highScoreContainer.style.display = 'none';
    }
    
    isGameRunning = false;
    isPaused = false;
    awaitingMathAnswer = false;
    
    gamePanel.style.display = 'flex';
    rightPanel.style.display = 'none';

    mathChallengeArea.style.display = 'none';
    customKeyboard.style.display = 'none';
    gameOverModal.style.display = 'none';
    infoModal.style.display = 'none';
    canvas.style.display = 'none';
    scoreDisplay.parentElement.style.display = 'none';

    clearInterval(gameInterval);
    clearInterval(mathTimerInterval);
    clearInterval(pauseCountdownInterval);

    startGameBtn.style.display = 'inline-block';
    startGameBtn.disabled = true;
    pauseGameBtn.style.display = 'none';
    resetGameBtn.style.display = 'none';
    difficultyPanel.style.display = 'flex';
    operationSelectionPanel.style.display = 'flex';
    messageArea.style.display = 'block';
    header.style.display = 'block';
    controlPanel.style.display = 'flex';
    if (allTimeHighScoreContainer) {
        allTimeHighScoreContainer.style.display = 'flex';
    }

    currentDifficulty = null;
    selectedOperationType = null;

    generateFood();
    drawGame();
    updateDifficultyAndOperationDisplay();
    setMessage('Welcome! Please choose a **problem type** and **difficulty** to start.');
    updateAllTimeHighScoreDisplay();
}

function resetGame() {
    endGame();
    initializeGame();
}

function resizeCanvas() { // Moved definition of resizeCanvas higher up
    let parentElementForCanvas;
    let targetWidth, targetHeight;
    const panelPadding = 20;

    if (window.innerWidth === 1920 && window.innerHeight === 1080) {
        currentCanvasSize = 600;
    } else {
        if (isGameRunning && !awaitingMathAnswer) {
            parentElementForCanvas = gamePanel;
            if (!parentElementForCanvas) {
                console.error("Game panel not found during resize. Using window dimensions.");
                targetWidth = window.innerWidth - (panelPadding * 2);
                targetHeight = window.innerHeight - (panelPadding * 2);
            } else {
                const statsPanelHeight = document.querySelector('.stats-panel').offsetHeight || 0;
                const controlPanelHeight = controlPanel.offsetHeight || 0;
                const fixedTopElementsHeight = statsPanelHeight + controlPanelHeight;
                const estimatedGaps = 12 * 2;

                targetWidth = parentElementForCanvas.clientWidth - (panelPadding * 2);
                targetHeight = parentElementForCanvas.clientHeight - fixedTopElementsHeight - estimatedGaps - (panelPadding * 2);
            }
        } else if (awaitingMathAnswer) {
            return;
        } else {
            parentElementForCanvas = gamePanel;
            if (!parentElementForCanvas) {
                console.error("Game panel not found during menu resize. Using window dimensions.");
                targetWidth = window.innerWidth - (panelPadding * 2);
                targetHeight = window.innerHeight - (panelPadding * 2);
            } else {
                const headerHeight = header.offsetHeight || 0;
                const statsPanelHeight = document.querySelector('.stats-panel').offsetHeight || 0;
                const operationSelectionPanelHeight = operationSelectionPanel.offsetHeight || 0;
                const difficultyPanelHeight = difficultyPanel.offsetHeight || 0;
                const messageAreaHeight = messageArea.offsetHeight || 0;
                const startGameBtnHeight = startGameBtn.offsetHeight || 0;
                const allTimeHighScoreContainerHeight = allTimeHighScoreContainer ? allTimeHighScoreContainer.offsetHeight : 0;

                const menuElementsHeight = headerHeight + statsPanelHeight + operationSelectionPanelHeight +
                                        difficultyPanelHeight + messageAreaHeight + startGameBtnHeight + allTimeHighScoreContainerHeight;
                const estimatedGaps = 12 * 7;

                targetWidth = parentElementForCanvas.clientWidth - (panelPadding * 2);
                targetHeight = parentElementForCanvas.clientHeight - menuElementsHeight - estimatedGaps - (panelPadding * 2);
            }
        }

        targetWidth = Math.max(0, targetWidth);
        targetHeight = Math.max(0, targetHeight);

        let desiredSize = Math.min(targetWidth, targetHeight);

        const minCanvasSize = CELLS_PER_SIDE * 5;
        const maxCanvasSize = 850;

        currentCanvasSize = Math.max(minCanvasSize, Math.min(desiredSize, maxCanvasSize));
        currentCanvasSize = Math.floor(currentCanvasSize / CELLS_PER_SIDE) * CELLS_PER_SIDE;
        currentCanvasSize = Math.max(currentCanvasSize, CELLS_PER_SIDE);
    }

    canvas.width = currentCanvasSize;
    canvas.height = currentCanvasSize;
    currentCellSize = currentCanvasSize / CELLS_PER_SIDE;

    if (snake && snake.length > 0) {
        let effectiveOldCellSize = currentCellSize;
        if (snake[0].x !== 0 && snake[0].y !== 0 && snake.length > 1) {
            effectiveOldCellSize = Math.abs(snake[1].x - snake[0].x) || Math.abs(snake[1].y - snake[0].y);
        } else if (snake[0].x !== 0) {
            effectiveOldCellSize = snake[0].x / (INITIAL_SNAKE_LENGTH - 1);
        } else if (snake[0].y !== 0) {
            effectiveOldCellSize = snake[0].y / (INITIAL_SNAKE_LENGTH - 1);
        }
        
        if (isNaN(effectiveOldCellSize) || effectiveOldCellSize <= 0) {
            effectiveOldCellSize = currentCanvasSize / CELLS_PER_SIDE;
        }

        const oldSnakeGrid = snake.map(segment => ({
            x: Math.round(segment.x / effectiveOldCellSize),
            y: Math.round(segment.y / effectiveOldCellSize)
        }));

        snake = oldSnakeGrid.map(segment => ({
            x: segment.x * currentCellSize,
            y: segment.y * currentCellSize
        }));
    } else {
        snake = [];
        for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
            snake.push({ x: (INITIAL_SNAKE_LENGTH - 1 - i) * currentCellSize, y: 0 });
        }
    }

    if (food && food.x !== undefined && food.y !== undefined) {
        const oldFoodGridX = Math.round(food.x / currentCellSize);
        const oldFoodGridY = Math.round(food.y / currentCellSize);

        food = {
            x: oldFoodGridX * currentCellSize,
            y: oldFoodGridY * currentCellSize
        };
        if (food.x >= currentCanvasSize || food.y >= currentCanvasSize || isFoodOnSnake(food)) {
            generateFood();
        }
    } else {
        generateFood();
    }

    drawGame();
}


// --- Game Drawing Functions ---
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    const foodRadius = currentCellSize / 2 - 2;
    const foodCenterX = food.x + currentCellSize / 2;
    const foodCenterY = food.y + currentCellSize / 2;

    const foodGradient = ctx.createRadialGradient(
        foodCenterX - foodRadius * 0.3,
        foodCenterY - foodRadius * 0.3,
        foodRadius * 0.1,
        foodCenterX,
        foodCenterY,
        foodRadius
    );
    foodGradient.addColorStop(0, '#FFEB3B');
    foodGradient.addColorStop(0.5, '#FFC107');
    foodGradient.addColorStop(1, '#FF8F00');
    
    ctx.fillStyle = foodGradient;
    ctx.strokeStyle = '#D57C00';
    ctx.lineWidth = 2;
    ctx.arc(foodCenterX, foodCenterY, foodRadius, 0, Math.PI * 2);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    snake.forEach((segment, index) => {
        const baseColor = index === 0 ? '#4CAF50' : '#8BC34A';
        const innerColor = index === 0 ? '#388E3C' : '#689F38';
        const borderColor = '#2E7D32';

        const segmentX = segment.x;
        const segmentY = segment.y;
        const segmentWidth = currentCellSize;
        const segmentHeight = currentCellSize;
        const borderRadius = currentCellSize / 4;

        const segmentGradient = ctx.createLinearGradient(segmentX, segmentY, segmentX + segmentWidth, segmentY + segmentHeight);
        segmentGradient.addColorStop(0, index === 0 ? '#66BB6A' : '#A5D6A7');
        segmentGradient.addColorStop(1, baseColor);
        ctx.fillStyle = segmentGradient;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        
        drawRoundedRect(ctx, segmentX, segmentY, segmentWidth, segmentHeight, borderRadius);

        const textureInset = currentCellSize * 0.15;
        const innerRectX = segmentX + textureInset;
        const innerRectY = segmentY + textureInset;
        const innerRectSize = currentCellSize - (textureInset * 2);

        ctx.fillStyle = innerColor;
        ctx.fillRect(innerRectX, innerRectY, innerRectSize, innerRectSize);

        if (index === 0) {
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            const eyeOffset = currentCellSize / 4;
            const eyeRadius = currentCellSize / 8;

            let eye1X, eye1Y, eye2X, eye2Y;

            switch (direction) {
                case 'right':
                    eye1X = segment.x + currentCellSize - eyeOffset; eye1Y = segment.y + eyeOffset;
                    eye2X = segment.x + currentCellSize - eyeOffset; eye2Y = segment.y + currentCellSize - eyeOffset;
                    break;
                case 'left':
                    eye1X = segment.x + eyeOffset; eye1Y = segment.y + eyeOffset;
                    eye2X = segment.x + eyeOffset; eye2Y = segment.y + currentCellSize - eyeOffset;
                    break;
                case 'up':
                    eye1X = segment.x + eyeOffset; eye1Y = segment.y + eyeOffset;
                    eye2X = segment.x + currentCellSize - eyeOffset; eye2Y = segment.y + eyeOffset;
                    break;
                case 'down':
                    eye1X = segment.x + eyeOffset; eye1Y = segment.y + currentCellSize - eyeOffset;
                    eye2X = segment.x + currentCellSize - eyeOffset; eye2Y = segment.y + currentCellSize - eyeOffset;
                    break;
            }
            ctx.beginPath();
            ctx.arc(eye1X, eye1Y, eyeRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(eye2X, eye2Y, eyeRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    });
}


// --- Game Core Mechanics ---

function moveSnake() {
    if (!isGameRunning || isPaused || awaitingMathAnswer) return;

    let head = { x: snake[0].x, y: snake[0].y };

    switch (direction) {
        case 'up':
            head.y -= currentCellSize;
            break;
        case 'down':
            head.y += currentCellSize;
            break;
        case 'left':
            head.x -= currentCellSize;
            break;
        case 'right':
            head.x += currentCellSize;
            break;
    }

    if (head.x < 0) {
        head.x = currentCanvasSize - currentCellSize;
    } else if (head.x >= currentCanvasSize) {
        head.x = 0;
    }
    if (head.y < 0) {
        head.y = currentCanvasSize - currentCellSize;
    } else if (head.y >= currentCanvasSize) {
        head.y = 0;
    }

    if (checkSelfCollision(head)) {
        endGame();
        return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        startChallenge();
    } else {
        snake.pop();
    }

    drawGame();
}

function generateFood() {
    let newFoodPos;
    const maxGridX = currentCanvasSize / currentCellSize;
    const maxGridY = currentCanvasSize / currentCellSize;
    do {
        newFoodPos = {
            x: Math.floor(Math.random() * maxGridX) * currentCellSize,
            y: Math.floor(Math.random() * maxGridY) * currentCellSize
        };
    } while (isFoodOnSnake(newFoodPos));
    food = newFoodPos;
}

function isFoodOnSnake(pos) {
    return snake.some(segment => segment.x === pos.x && segment.y === pos.y);
}

function checkSelfCollision(head) {
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    return false;
}

function startGame() {
    if (isGameRunning) return;
    if (!selectedOperationType || !currentDifficulty) {
        setMessage('Please select both a **problem type** and **difficulty** to start.');
        return;
    }

    isGameRunning = true;
    
    gamePanel.style.display = 'flex';
    rightPanel.style.display = 'none';

    header.style.display = 'none';
    startGameBtn.style.display = 'none';
    difficultyPanel.style.display = 'none';
    operationSelectionPanel.style.display = 'none';
    messageArea.style.display = 'none';
    installButton.style.display = 'none';
    if (allTimeHighScoreContainer) {
        allTimeHighScoreContainer.style.display = 'none';
    }

    controlPanel.style.display = 'flex';
    pauseGameBtn.style.display = 'none';
    resetGameBtn.style.display = 'inline-block';
    canvas.style.display = 'block';
    scoreDisplay.parentElement.style.display = 'flex';
    if (highScoreContainer) {
        highScoreContainer.style.display = 'flex';
    }
    gameInterval = setInterval(moveSnake, GAME_SPEED);
}

function pauseGame() {
    if (!isGameRunning) return;

    if (isPaused) {
        resumeGame();
        return;
    }

    if (!awaitingMathAnswer) {
        setMessage('Pause is only available during math challenges.');
        return;
    }

    if (timeLeftForMath > 10 || score < 2) {
        let currentMessage = `Pause is only available when time left is 10s or less and you have at least 2 points. Current time left: ${timeLeftForMath}s, Current points: ${score}.`;
        setMessage(currentMessage);
        return;
    }

    isPaused = true;
    clearInterval(gameInterval);
    clearInterval(mathTimerInterval);
    score = Math.max(0, score - 2);
    scoreDisplay.textContent = score;
    
    pauseTimeLeft = 20;
    
    timerDisplay.textContent = `Paused: ${pauseTimeLeft}s. Fuel: ${Math.floor(score / 2)} pauses`;
    
    clearInterval(pauseCountdownInterval);
    pauseCountdownInterval = setInterval(() => {
        pauseTimeLeft--;
        timerDisplay.textContent = `Paused: ${pauseTimeLeft}s. Fuel: ${Math.floor(score / 2)} pauses`;
        
        if (pauseTimeLeft <= 0) {
            clearInterval(pauseCountdownInterval);
            resumeGame();
        }
    }, 1000);
}

function resumeGame() {
    isPaused = false;
    clearInterval(pauseCountdownInterval);
    if (isGameRunning) {
        clearInterval(gameInterval);
        gameInterval = setInterval(moveSnake, GAME_SPEED);
    }
    if (awaitingMathAnswer) {
        clearInterval(mathTimerInterval);
        startMathTimer();
    }
    messageArea.style.display = 'none';
}


// --- Math Problem Generation Helpers ---

function getDigitRange(difficulty) {
    switch (difficulty) {
        case 'easy': return { min: 1, max: 9 };
        case 'medium': return { min: 10, max: 99 };
        case 'hard': return { min: 100, max: 999 };
        case 'expert': return { min: 1000, max: 9999 };
        default: return { min: 1, max: 9 };
    }
}

const generateRandomNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function decToBin(dec, minLength = 0) {
    let bin = (dec >>> 0).toString(2);
    while (bin.length < minLength) {
        bin = '0' + bin;
    }
    return bin;
}

function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
        [a, b] = [b, a % b];
    }
    return a;
}

function simplifyFraction(numerator, denominator) {
    if (denominator === 0) throw new Error("Denominator cannot be zero.");
    if (numerator === 0) return { num: 0, den: 1 };

    const commonDivisor = gcd(numerator, denominator);
    return {
        num: numerator / commonDivisor,
        den: denominator / commonDivisor
    };
}

function lcm(a, b) {
    if (a === 0 || b === 0) return 0;
    return Math.abs(a * b) / gcd(a, b);
}

function isPrime(num) {
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;
    for (let i = 5; i * i <= num; i = i + 6) {
        if (num % i === 0 || num % (i + 2) === 0) return false;
    }
    return true;
}

// Helper function to randomly apply negative sign
function applyRandomSign(num) {
    return Math.random() < 0.5 ? num : -num;
}


// --- Math Problem Generation Functions ---

function generateArithmeticProblem() {
    const operators = ['+', '-', '*', '/'];
    let op = operators[Math.floor(Math.random() * operators.length)];

    let num1, num2, answer;
    const { min: minVal, max: maxVal } = getDigitRange(currentDifficulty);

    const MAX_ATTEMPTS = 500;
    let attempts = 0;
    let problemGenerated = false;

    const allowNegatives = ['medium', 'hard', 'expert'].includes(currentDifficulty);

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;

        let currentOp = op;
        let tempNum1 = generateRandomNum(minVal, maxVal);
        let tempNum2 = generateRandomNum(minVal, maxVal);

        num1 = tempNum1;
        num2 = tempNum2;

        if (allowNegatives) {
            if (Math.random() < 0.5) num1 *= -1;
            if (Math.random() < 0.5) num2 *= -1;
        }

        if (num1 === 0 && currentOp !== '/') num1 = (Math.random() < 0.5 ? 1 : -1) * generateRandomNum(1, Math.max(9, maxVal));
        if (num2 === 0 && currentOp !== '/') num2 = (Math.random() < 0.5 ? 1 : -1) * generateRandomNum(1, Math.max(9, maxVal));
        
        switch (currentOp) {
            case '+':
                answer = num1 + num2;
                problemGenerated = true;
                break;

            case '-':
                answer = num1 - num2;
                problemGenerated = true;
                break;

            case '*':
                if (currentDifficulty === 'easy') {
                    num1 = generateRandomNum(1, 9);
                    num2 = generateRandomNum(1, 9);
                } else if (currentDifficulty === 'medium') {
                    num1 = generateRandomNum(minVal, maxVal);
                    num2 = generateRandomNum(1, 9);
                } else if (currentDifficulty === 'hard') {
                    num1 = generateRandomNum(minVal, maxVal);
                    num2 = generateRandomNum(1, 15);
                } else {
                    num1 = generateRandomNum(minVal, maxVal);
                    num2 = generateRandomNum(1, 25);
                }
                if (allowNegatives && Math.random() < 0.5) num1 *= -1;
                if (allowNegatives && Math.random() < 0.5) num2 *= -1;

                answer = num1 * num2;
                if (Math.abs(answer) > 9999999 || Math.abs(answer) === 0) { problemGenerated = false; continue; }
                problemGenerated = true;
                break;

            case '/':
                let quotientCandidate;
                let divisorCandidate;

                if (currentDifficulty === 'easy') {
                    divisorCandidate = generateRandomNum(1, 9);
                    quotientCandidate = generateRandomNum(1, 9);
                } else if (currentDifficulty === 'medium') {
                    divisorCandidate = generateRandomNum(2, 12);
                    quotientCandidate = generateRandomNum(2, 12);
                } else if (currentDifficulty === 'hard') {
                    divisorCandidate = generateRandomNum(5, 20);
                    quotientCandidate = generateRandomNum(5, 20);
                } else {
                    divisorCandidate = generateRandomNum(10, 30);
                    quotientCandidate = generateRandomNum(10, 30);
                }

                if (divisorCandidate === 0) { problemGenerated = false; continue; }
                let dividendCandidate = divisorCandidate * quotientCandidate;

                num1 = dividendCandidate;
                num2 = divisorCandidate;
                answer = quotientCandidate;

                if (allowNegatives) {
                    const num1Sign = Math.random() < 0.5 ? -1 : 1;
                    const num2Sign = Math.random() < 0.5 ? -1 : 1;
                    num1 = dividendCandidate * num1Sign;
                    num2 = divisorCandidate * num2Sign;
                    answer = num1 / num2;
                    if (answer % 1 !== 0) { problemGenerated = false; continue; }
                }

                if (num2 === 0 || Math.abs(answer) > 9999999 || Math.abs(answer) === 0) { problemGenerated = false; continue; }
                if (Math.abs(num1) < 1 && currentDifficulty !== 'easy') { problemGenerated = false; continue; }
                problemGenerated = true;
                break;
        }
    }

    if (!problemGenerated) {
        num1 = 5; num2 = 3; op = '+'; answer = 8;
        setMessage('Decimal Arithmetic problem generation fallback. Please continue.');
    }

    let displayOp = op;
    if (op === '*') {
        displayOp = 'x';
    } else if (op === '/') {
        displayOp = '÷';
    }

    mathProblemDisplay.textContent = `${num1} ${displayOp} ${num2} = ?`;
    correctMathAnswer = Math.round(answer);
}

// --- Pure Arithmetic Operations (Positive Numbers Only) ---
function generatePureAdditionPositiveProblem() {
    let num1, num2, answer;
    const { min: minVal, max: maxVal } = getDigitRange(currentDifficulty);
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        num1 = generateRandomNum(1, maxVal);
        num2 = generateRandomNum(1, maxVal);
        answer = num1 + num2;

        if (answer >= 0 && answer < 1000000) {
            problemGenerated = true;
        }
    }
    if (!problemGenerated) {
        num1 = 5; num2 = 3; answer = 8;
        setMessage('Pure Addition (+ve) fallback. Please continue.');
    }
    mathProblemDisplay.textContent = `${num1} + ${num2} = ?`;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'false');
}

function generatePureSubtractionPositiveProblem() {
    let num1, num2, answer;
    const { min: minVal, max: maxVal } = getDigitRange(currentDifficulty);
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        num1 = generateRandomNum(minVal + 1, maxVal * 2);
        num2 = generateRandomNum(minVal, num1 - 1);
        
        answer = num1 - num2;

        if (answer >= 0 && answer < 1000000) {
            problemGenerated = true;
        }
    }
    if (!problemGenerated) {
        num1 = 8; num2 = 3; answer = 5;
        setMessage('Pure Subtraction (+ve) fallback. Please continue.');
    }
    mathProblemDisplay.textContent = `${num1} - ${num2} = ?`;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'false');
}

function generatePureMultiplicationPositiveProblem() {
    let num1, num2, answer;
    const { min: minVal, max: maxVal } = getDigitRange(currentDifficulty);
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        num1 = generateRandomNum(1, Math.min(maxVal, currentDifficulty === 'easy' ? 9 : currentDifficulty === 'medium' ? 20 : 50));
        num2 = generateRandomNum(1, Math.min(maxVal, currentDifficulty === 'easy' ? 9 : currentDifficulty === 'medium' ? 15 : 20));
        
        answer = num1 * num2;

        if (answer >= 0 && answer < 1000000) {
            problemGenerated = true;
        }
    }
    if (!problemGenerated) {
        num1 = 5; num2 = 3; answer = 15;
        setMessage('Pure Multiplication (+ve) fallback. Please continue.');
    }
    mathProblemDisplay.textContent = `${num1} x ${num2} = ?`;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'false');
}

function generatePureDivisionPositiveProblem() {
    let num1, num2, answer;
    const { min: minVal, max: maxVal } = getDigitRange(currentDifficulty);
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        let quotientCandidate = generateRandomNum(1, currentDifficulty === 'easy' ? 9 : currentDifficulty === 'medium' ? 12 : 20);
        let divisorCandidate = generateRandomNum(1, currentDifficulty === 'easy' ? 9 : currentDifficulty === 'medium' ? 15 : 25);
        
        num1 = divisorCandidate * quotientCandidate;
        num2 = divisorCandidate;
        answer = quotientCandidate;

        if (num1 > 0 && num2 > 0 && answer >= 0 && num1 <= maxVal * maxVal && answer < 1000000) {
            problemGenerated = true;
        }
    }
    if (!problemGenerated) {
        num1 = 15; num2 = 3; answer = 5;
        setMessage('Pure Division (+ve) fallback. Please continue.');
    }
    mathProblemDisplay.textContent = `${num1} ÷ ${num2} = ?`;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'false');
}

// --- Pure Arithmetic Operations (Mixed Signs / Negative Numbers Included) ---
function generatePureAdditionNegativeProblem() {
    let num1, num2, answer;
    const { min: minVal, max: maxVal } = getDigitRange(currentDifficulty);
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        num1 = applyRandomSign(generateRandomNum(1, maxVal));
        num2 = applyRandomSign(generateRandomNum(1, maxVal));
        answer = num1 + num2;

        if (Math.abs(answer) < 1000000) {
            problemGenerated = true;
        }
    }
    if (!problemGenerated) {
        num1 = 5; num2 = -3; answer = 2;
        setMessage('Pure Addition (±ve) fallback. Please continue.');
    }
    let displayNum1 = num1;
    let displayNum2 = num2 < 0 ? `(${num2})` : num2;
    mathProblemDisplay.textContent = `${displayNum1} + ${displayNum2} = ?`;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'false');
}

function generatePureSubtractionNegativeProblem() {
    let num1, num2, answer;
    const { min: minVal, max: maxVal } = getDigitRange(currentDifficulty);
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        num1 = applyRandomSign(generateRandomNum(1, maxVal));
        num2 = applyRandomSign(generateRandomNum(1, maxVal));
        answer = num1 - num2;

        if (Math.abs(answer) < 1000000) {
            problemGenerated = true;
        }
    }
    if (!problemGenerated) {
        num1 = 8; num2 = -3; answer = 11;
        setMessage('Pure Subtraction (±ve) fallback. Please continue.');
    }
    let displayNum1 = num1;
    let displayNum2 = num2 < 0 ? `(${num2})` : num2;
    mathProblemDisplay.textContent = `${displayNum1} - ${displayNum2} = ?`;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'false');
}

function generatePureMultiplicationNegativeProblem() {
    let num1, num2, answer;
    const { min: minVal, max: maxVal } = getDigitRange(currentDifficulty);
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        let tempNum1 = generateRandomNum(1, Math.min(maxVal, currentDifficulty === 'easy' ? 9 : currentDifficulty === 'medium' ? 20 : 50));
        let tempNum2 = generateRandomNum(1, Math.min(maxVal, currentDifficulty === 'easy' ? 9 : currentDifficulty === 'medium' ? 15 : 20));
        
        num1 = applyRandomSign(tempNum1);
        num2 = applyRandomSign(tempNum2);

        answer = num1 * num2;

        if (Math.abs(answer) < 1000000) {
            problemGenerated = true;
        }
    }
    if (!problemGenerated) {
        num1 = -5; num2 = 3; answer = -15;
        setMessage('Pure Multiplication (±ve) fallback. Please continue.');
    }
    let displayNum1 = num1 < 0 ? `(${num1})` : num1;
    let displayNum2 = num2 < 0 ? `(${num2})` : num2;
    mathProblemDisplay.textContent = `${displayNum1} x ${displayNum2} = ?`;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'false');
}

function generatePureDivisionNegativeProblem() {
    let num1, num2, answer;
    const { min: minVal, max: maxVal } = getDigitRange(currentDifficulty);
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        let quotientCandidate;
        let divisorCandidate;

        if (currentDifficulty === 'easy') {
            divisorCandidate = generateRandomNum(1, 9);
            quotientCandidate = generateRandomNum(1, 9);
        } else if (currentDifficulty === 'medium') {
            divisorCandidate = generateRandomNum(2, 15);
            quotientCandidate = generateRandomNum(2, 12);
        } else if (currentDifficulty === 'hard') {
            divisorCandidate = generateRandomNum(5, 25);
            quotientCandidate = generateRandomNum(5, 20);
        } else {
            divisorCandidate = generateRandomNum(10, 40);
            quotientCandidate = generateRandomNum(10, 30);
        }
        
        let rawDividend = divisorCandidate * quotientCandidate;
        
        num1 = applyRandomSign(rawDividend);
        num2 = applyRandomSign(divisorCandidate);

        if (num2 === 0 || rawDividend % Math.abs(num2) !== 0) continue;
        answer = num1 / num2;

        if (Math.abs(answer) < 1000000) {
            problemGenerated = true;
        }
    }
    if (!problemGenerated) {
        num1 = -15; num2 = 3; answer = -5;
        setMessage('Pure Division (±ve) fallback. Please continue.');
    }
    let displayNum1 = num1;
    let displayNum2 = num2 < 0 ? `(${num2})` : num2;
    mathProblemDisplay.textContent = `${displayNum1} ÷ ${displayNum2} = ?`;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'false');
}


function generateExponentiationProblem() {
    let base, exponent, answer;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        if (currentDifficulty === 'easy') {
            base = generateRandomNum(2, 5);
            exponent = generateRandomNum(2, 3);
        } else if (currentDifficulty === 'medium') {
            base = generateRandomNum(2, 7);
            exponent = generateRandomNum(2, 4);
        } else if (currentDifficulty === 'hard') {
            base = generateRandomNum(2, 9);
            exponent = generateRandomNum(2, 5);
        } else {
            base = generateRandomNum(2, 12);
            exponent = generateRandomNum(2, 6);
        }

        answer = Math.pow(base, exponent);

        if (Math.abs(answer) < 10000000 && Math.abs(answer) > 1) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        base = 3; exponent = 2; answer = 9;
        setMessage('Exponentiation problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `${base}^${exponent} = ?`;
    correctMathAnswer = Math.round(answer);
    mathAnswerInput.value = '';
}

function generateModulusProblem() {
    let num, divisor, answer;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        if (currentDifficulty === 'easy') {
            num = generateRandomNum(10, 50);
            divisor = generateRandomNum(2, 9);
        } else if (currentDifficulty === 'medium') {
            num = generateRandomNum(50, 200);
            divisor = generateRandomNum(5, 20);
        } else if (currentDifficulty === 'hard') {
            num = generateRandomNum(100, 500);
            divisor = generateRandomNum(10, 30);
        } else {
            num = generateRandomNum(200, 1000);
            divisor = generateRandomNum(15, 50);
        }

        if (divisor === 0) continue;
        answer = num % divisor;

        if (num > divisor) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        num = 10; divisor = 3; answer = 1;
        setMessage('Modulus problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `${num} mod ${divisor} = ?`;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
}

function generateAbsoluteValueProblem() {
    let number, answer;
    const { min: minVal, max: maxVal } = getDigitRange(currentDifficulty);

    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;

        number = generateRandomNum(minVal, maxVal);
        if (Math.random() < 0.5) number *= -1;

        if (number === 0) continue;

        answer = Math.abs(number);

        if (answer > 0 && answer < 10000) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        number = -5; answer = 5;
        setMessage('Absolute Value problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `|${number}| = ?`;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
}

function generateFractionsProblem() {
    let num1, den1, num2, den2, operation, problemText, answerNum, answerDen;
    const operators = ['+', '-', '*', '/'];
    const MAX_ATTEMPTS = 500;
    let attempts = 0;
    let problemGenerated = false;

    const getFractionRange = (difficulty) => {
        switch (difficulty) {
            case 'easy': return { numMin: 1, numMax: 5, denMin: 2, denMax: 5 };
            case 'medium': return { numMin: 1, numMax: 10, denMin: 2, denMax: 10 };
            case 'hard': return { numMin: 1, numMax: 15, denMin: 2, denMax: 15 };
            case 'expert': return { numMin: 1, numMax: 20, denMin: 2, denMax: 20 };
            default: return { numMin: 1, numMax: 5, denMin: 2, denMax: 5 };
        }
    };

    const { numMin, numMax, denMin, denMax } = getFractionRange(currentDifficulty);

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        operation = operators[Math.floor(Math.random() * operators.length)];

        num1 = generateRandomNum(numMin, numMax);
        den1 = generateRandomNum(denMin, denMax);
        if (den1 === 0) continue;

        let s1 = simplifyFraction(num1, den1);
        num1 = s1.num;
        den1 = s1.den;

        if (Math.random() < 0.3) {
            let whole = 0;
            if (currentDifficulty !== 'easy') {
                whole = generateRandomNum(0, 3);
                num1 += whole * den1;
            }
        }
        
        num2 = generateRandomNum(numMin, numMax);
        den2 = generateRandomNum(denMin, den2);
        if (den2 === 0) continue;

        let s2 = simplifyFraction(num2, den2);
        num2 = s2.num;
        den2 = s2.den;

        if (Math.random() < 0.3) {
            let whole = 0;
            if (currentDifficulty !== 'easy') {
                whole = generateRandomNum(0, 3);
                num2 += whole * den2;
            }
        }

        let tempAnswerNum, tempAnswerDen;

        try {
            switch (operation) {
                case '+':
                    tempAnswerNum = num1 * den2 + num2 * den1;
                    tempAnswerDen = den1 * den2;
                    break;
                case '-':
                    if (currentDifficulty === 'easy' && (num1 / den1 < num2 / den2)) {
                        continue;
                    }
                    tempAnswerNum = num1 * den2 - num2 * den1;
                    tempAnswerDen = den1 * den2;
                    break;
                case '*':
                    tempAnswerNum = num1 * num2;
                    tempAnswerDen = den1 * den2;
                    break;
                case '/':
                    if (num2 === 0) continue;
                    tempAnswerNum = num1 * den2;
                    tempAnswerDen = den1 * num2;
                    break;
            }

            if (tempAnswerDen === 0) continue;
            
            const simplifiedAnswer = simplifyFraction(tempAnswerNum, tempAnswerDen);
            answerNum = simplifiedAnswer.num;
            answerDen = simplifiedAnswer.den;

            if (answerDen < 0) {
                answerNum *= -1;
                answerDen *= -1;
            }

            if (Math.abs(answerNum) <= 1000 && Math.abs(answerDen) <= 1000 && answerDen !== 0) {
                problemGenerated = true;
            }

        } catch (e) {
            console.warn("Fraction problem generation error, retrying:", e.message);
            problemGenerated = false;
        }
    }

    if (!problemGenerated) {
        num1 = 1; den1 = 2; num2 = 1; den2 = 4; operation = '+'; answerNum = 3; answerDen = 4;
        setMessage('Fractions problem generation fallback. Please continue.');
    }

    problemText = `${num1}/${den1} ${operation} ${num2}/${den2} = ?`;
    if (answerDen === 1) {
        correctMathAnswer = answerNum;
    } else {
        correctMathAnswer = `${answerNum}/${den2}`;
    }
    
    mathProblemDisplay.innerHTML = problemText;
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'true');
    mathAnswerInput.setAttribute('data-allow-fraction', 'true');
}

function generatePercentageProblem() {
    let base, percentage, answer, problemType;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        problemType = generateRandomNum(1, 3);

        if (currentDifficulty === 'easy') {
            base = generateRandomNum(10, 100) * 10;
            percentage = generateRandomNum(5, 50) * 5;
        } else if (currentDifficulty === 'medium') {
            base = generateRandomNum(50, 500) * 10;
            percentage = generateRandomNum(1, 100);
        } else if (currentDifficulty === 'hard') {
            base = generateRandomNum(100, 1000) * 10;
            percentage = generateRandomNum(1, 200);
        } else {
            base = generateRandomNum(500, 2000) * 10;
            percentage = generateRandomNum(1, 300);
        }

        switch (problemType) {
            case 1:
                answer = (percentage / 100) * base;
                mathProblemDisplay.textContent = `What is ${percentage}% of ${base}?`;
                break;
            case 2:
                let part = generateRandomNum(1, base / 2);
                base = generateRandomNum(part * 2, part * 10);
                if (base === 0) continue;
                answer = (part / base) * 100;
                mathProblemDisplay.textContent = `${part} is what percent of ${base}?`;
                break;
            case 3:
                let result = generateRandomNum(10, 500);
                percentage = generateRandomNum(5, 100);
                if (percentage === 0) continue;
                answer = (result / percentage) * 100;
                mathProblemDisplay.textContent = `${result} is ${percentage}% of what number?`;
                break;
        }

        if (Math.abs(answer) < 100000 && (answer % 1 === 0 || (answer * 10) % 1 === 0 || (answer * 100) % 1 === 0)) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        mathProblemDisplay.textContent = `What is 20% of 150?`;
        answer = 30;
        setMessage('Percentage problem generation fallback. Please continue.');
    }

    correctMathAnswer = parseFloat(answer.toFixed(2));
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'true');
}

function generateSquareRootProblem() {
    let number, answer;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        let minBase, maxBase;
        if (currentDifficulty === 'easy') {
            minBase = 2; maxBase = 10;
        } else if (currentDifficulty === 'medium') {
            minBase = 5; maxBase = 20;
        } else if (currentDifficulty === 'hard') {
            minBase = 10; maxBase = 30;
        } else {
            minBase = 20; maxBase = 50;
        }
        
        answer = generateRandomNum(1, maxBase);
        number = answer * answer;

        if (currentDifficulty === 'hard' || currentDifficulty === 'expert') {
            if (Math.random() < 0.5) {
                let offset = Math.random() < 0.5 ? -generateRandomNum(1, 3) : generateRandomNum(1, 3);
                number += offset;
                if (number < 1) continue;
                answer = Math.sqrt(number);
                if (answer % 1 === 0) continue;
            }
        }
        
        if (answer > 0 && Math.abs(answer) < 1000 && isFinite(answer) && !isNaN(answer)) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        number = 81; answer = 9;
        setMessage('Square Root problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `√${number} = ? (2 dec places if needed)`;
    correctMathAnswer = parseFloat(answer.toFixed(2));
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'true');
}

function generateOrderOfOperationsProblem() {
    let problemString, answer;
    const MAX_ATTEMPTS = 500;
    let attempts = 0;
    let problemGenerated = false;

    const generateSimpleExpression = (min, max, allowMultiplyDivide = true) => {
        let num1 = generateRandomNum(min, max);
        let num2 = generateRandomNum(min, max);
        let op;

        if (allowMultiplyDivide && Math.random() < 0.5) {
            op = Math.random() < 0.5 ? '*' : '/';
            if (op === '/' && num2 === 0) num2 = 1;
            if (op === '/' && num1 % num2 !== 0) {
                num1 = num2 * generateRandomNum(1, Math.floor(max / num2));
            }
        } else {
            op = Math.random() < 0.5 ? '+' : '-';
        }
        return `${num1} ${op === '*' ? 'x' : op === '/' ? '÷' : op} ${num2}`;
    };

    const evaluateExpression = (expr) => {
        expr = expr.replace(/x/g, '*').replace(/÷/g, '/');
        try {
            return eval(expr);
        } catch (e) {
            return NaN;
        }
    };

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        let minVal, maxVal;
        let numTerms = 2;
        let includeParentheses = false;

        if (currentDifficulty === 'easy') {
            minVal = 1; maxVal = 10;
            numTerms = generateRandomNum(2, 3);
        } else if (currentDifficulty === 'medium') {
            minVal = 1; maxVal = 15;
            numTerms = generateRandomNum(3, 4);
            includeParentheses = Math.random() < 0.4;
        } else if (currentDifficulty === 'hard') {
            minVal = 1; maxVal = 20;
            numTerms = generateRandomNum(3, 5);
            includeParentheses = Math.random() < 0.7;
        } else {
            minVal = 1; maxVal = 25;
            numTerms = generateRandomNum(4, 6);
            includeParentheses = Math.random() < 0.9;
        }

        let parts = [];
        for (let i = 0; i < numTerms; i++) {
            parts.push(generateRandomNum(minVal, maxVal));
            if (i < numTerms - 1) {
                const operators = ['+', '-', '*', '/'];
                let op = operators[Math.floor(Math.random() * operators.length)];
                if (currentDifficulty === 'easy' && (op === '*' || op === '/')) {
                    op = Math.random() < 0.5 ? '+' : '-';
                }
                parts.push(op === '*' ? 'x' : op === '/' ? '÷' : op);
            }
        }

        problemString = parts.join(' ');

        if (includeParentheses && parts.length >= 3) {
            let startIdx = generateRandomNum(0, parts.length - 3);
            let parenStart = -1, parenEnd = -1;
            
            for(let i = 0; i < parts.length - 2; i++) {
                if (typeof parts[i] === 'number' && typeof parts[i+1] === 'string' && typeof parts[i+2] === 'number') {
                    parenStart = i;
                    parenEnd = i + 2;
                    break;
                }
            }
            if (parenStart !== -1) {
                problemString = parts.slice(0, parenStart).join(' ') + 
                                (parts.slice(0, parenStart).length > 0 ? ' ' : '') + 
                                `(${parts.slice(parenStart, parenEnd + 1).join(' ')})` + 
                                (parts.slice(parenEnd + 1).length > 0 ? ' ' : '') +
                                parts.slice(parenEnd + 1).join(' ');
            }
        }

        problemString = problemString.replace(/\s+/g, ' ').trim();

        answer = evaluateExpression(problemString);

        const isIntegerAnswer = answer % 1 === 0;
        const isManageableAnswer = Math.abs(answer) < 10000 && isFinite(answer) && !isNaN(answer);

        if (isManageableAnswer) {
            if (currentDifficulty === 'easy' || currentDifficulty === 'medium') {
                if (isIntegerAnswer) {
                    problemGenerated = true;
                }
            } else {
                problemGenerated = true;
            }
        }
    }

    if (!problemGenerated) {
        problemString = '(5 + 3) x 2 - 4';
        answer = 12;
        setMessage('Order of Operations problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `${problemString} = ?`;
    correctMathAnswer = parseFloat(answer.toFixed(2));
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'true');
}


function generateLCMProblem() {
    let num1, num2, answer;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        if (currentDifficulty === 'easy') {
            num1 = generateRandomNum(2, 10);
            num2 = generateRandomNum(2, 10);
        } else if (currentDifficulty === 'medium') {
            num1 = generateRandomNum(5, 15);
            num2 = generateRandomNum(5, 15);
        } else if (currentDifficulty === 'hard') {
            num1 = generateRandomNum(10, 25);
            num2 = generateRandomNum(10, 25);
        } else {
            num1 = generateRandomNum(15, 40);
            num2 = generateRandomNum(15, 40);
        }

        answer = lcm(num1, num2);

        if (answer <= 5000 && answer > 0) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        num1 = 4; num2 = 6; answer = 12;
        setMessage('LCM problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `What is the LCM of ${num1} and ${num2}?`;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
}

function generateGCDProblem() {
    let num1, num2, answer;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        if (currentDifficulty === 'easy') {
            num1 = generateRandomNum(10, 50);
            num2 = generateRandomNum(10, 50);
        } else if (currentDifficulty === 'medium') {
            num1 = generateRandomNum(30, 100);
            num2 = generateRandomNum(30, 100);
        } else if (currentDifficulty === 'hard') {
            num1 = generateRandomNum(50, 200);
            num2 = generateRandomNum(50, 200);
        } else {
            num1 = generateRandomNum(100, 500);
            num2 = generateRandomNum(100, 500);
        }

        answer = gcd(num1, num2);

        if (answer > 0 && answer <= Math.min(num1, num2)) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        num1 = 12; num2 = 18; answer = 6;
        setMessage('GCD problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `What is the GCD of ${num1} and ${num2}?`;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
}

function generatePrimeNumberProblem() {
    let number, isItPrime, problemType;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    const getPrimeRange = (difficulty) => {
        switch (difficulty) {
            case 'easy': return { min: 2, max: 50 };
            case 'medium': return { min: 2, max: 100 };
            case 'hard': return { min: 2, max: 200 };
            case 'expert': return { min: 2, max: 500 };
            default: return { min: 2, max: 50 };
        }
    };

    const { min: minVal, max: maxVal } = getPrimeRange(currentDifficulty);

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        number = generateRandomNum(minVal, maxVal);
        isItPrime = isPrime(number);

        if (attempts % 2 === 0 && isItPrime) {
            if (number > 4) number = Math.max(4, number + generateRandomNum(-3, 3));
            if (isPrime(number)) continue;
        } else if (attempts % 2 !== 0 && !isItPrime) {
            let foundPrime = false;
            for (let i = number; i <= maxVal; i++) {
                if (isPrime(i)) {
                    number = i;
                    foundPrime = true;
                    break;
                }
            }
            if (!foundPrime) {
                const smallPrimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
                number = smallPrimes[Math.floor(Math.random() * smallPrimes.length)];
                if (number > maxVal) continue;
            }
        }
        isItPrime = isPrime(number);

        if (number > 1) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        number = 17; isItPrime = true;
        setMessage('Prime Number problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `Is ${number} a prime number? (Yes/No)`;
    correctMathAnswer = isItPrime ? 'Yes' : 'No';
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'false');
    mathAnswerInput.setAttribute('data-allow-fraction', 'false');
    mathAnswerInput.setAttribute('data-allow-text-answer', 'true');
}


function generateAreaPerimeterProblem() {
    let shape, val1, val2, problemText, answer;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    const shapes = ['rectangle', 'square', 'circle'];
    const properties = ['area', 'perimeter'];

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        shape = shapes[Math.floor(Math.random() * shapes.length)];
        let property = properties[Math.floor(Math.random() * properties.length)];

        if (currentDifficulty === 'easy') {
            val1 = generateRandomNum(2, 10);
            val2 = generateRandomNum(2, 10);
        } else if (currentDifficulty === 'medium') {
            val1 = generateRandomNum(5, 15);
            val2 = generateRandomNum(5, 15);
        } else if (currentDifficulty === 'hard') {
            val1 = generateRandomNum(10, 25);
            val2 = generateRandomNum(10, 25);
        } else {
            val1 = generateRandomNum(15, 30);
            val2 = generateRandomNum(15, 30);
        }

        if (shape === 'square') {
            val2 = val1;
            property = properties[Math.floor(Math.random() * properties.length)];
        } else if (shape === 'circle') {
            property = 'area';
            if (Math.random() < 0.5) property = 'circumference';
            val1 = generateRandomNum(2, currentDifficulty === 'easy' ? 7 : currentDifficulty === 'medium' ? 10 : 15);
        }
        
        switch (shape) {
            case 'rectangle':
                problemText = `${property === 'area' ? 'Area' : 'Perimeter'} of a rectangle with L=${val1} and W=${val2}?`;
                answer = property === 'area' ? val1 * val2 : 2 * (val1 + val2);
                break;
            case 'square':
                problemText = `${property === 'area' ? 'Area' : 'Perimeter'} of a square with side=${val1}?`;
                answer = property === 'area' ? val1 * val1 : 4 * val1;
                break;
            case 'circle':
                problemText = `${property === 'area' ? 'Area' : 'Circumference'} of a circle with R=${val1}? (Use π=3.14)`;
                answer = property === 'area' ? Math.PI * val1 * val1 : 2 * Math.PI * val1;
                answer = parseFloat(answer.toFixed(2));
                break;
        }

        if (answer > 0 && Math.abs(answer) < 10000 && isFinite(answer) && !isNaN(answer)) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        problemText = `Area of a rectangle with L=5 and W=4?`;
        answer = 20;
        setMessage('Area/Perimeter problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = problemText;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'true');
}

function generateUnitConversionProblem() {
    let value, fromUnit, toUnit, factor, answer, problemText;
    const MAX_ATTEMPTS = 500;
    let attempts = 0;
    let problemGenerated = false;

    const units = {
        length: {
            m: { to: { cm: 100, km: 0.001 }, display: 'meters' },
            cm: { to: { m: 0.01, mm: 10 }, display: 'centimeters' },
            km: { to: { m: 1000 }, display: 'kilometers' },
            ft: { to: { in: 12, yd: 1/3 }, display: 'feet' },
            in: { to: { ft: 1/12 }, display: 'inches' },
            yd: { to: { ft: 3 }, display: 'yards' }
        },
        mass: {
            kg: { to: { g: 1000, lb: 2.20462 }, display: 'kilograms' },
            g: { to: { kg: 0.001 }, display: 'grams' },
            lb: { to: { kg: 0.453592 }, display: 'pounds' }
        },
        volume: {
            l: { to: { ml: 1000, gal: 0.264172 }, display: 'liters' },
            ml: { to: { l: 0.001 }, display: 'milliliters' },
            gal: { to: { l: 3.78541 }, display: 'gallons' }
        }
    };

    const categories = Object.keys(units);

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        console.log(`Unit Conversion Attempt ${attempts}`); // Diagnostic Log
        const categoryName = categories[Math.floor(Math.random() * categories.length)];
        const category = units[categoryName];
        const fromUnitKey = Object.keys(category)[Math.floor(Math.random() * Object.keys(category).length)];
        const fromUnitData = category[fromUnitKey];
        const toUnitKeys = Object.keys(fromUnitData.to);
        
        if (toUnitKeys.length === 0) {
            console.log(`Skipping: No conversions for ${fromUnitKey}`); // Diagnostic Log
            continue;
        }
        
        const toUnitKey = toUnitKeys[Math.floor(Math.random() * toUnitKeys.length)];
        
        value = generateRandomNum(1, currentDifficulty === 'easy' ? 20 : currentDifficulty === 'medium' ? 100 : currentDifficulty === 'hard' ? 500 : 1000);
        factor = fromUnitData.to[toUnitKey];
        
        if (typeof factor !== 'number' || !isFinite(factor) || isNaN(factor) || factor === 0) {
            console.log(`Skipping: Invalid factor ${factor} for ${fromUnitKey} to ${toUnitKey}`); // Diagnostic Log
            continue;
        }

        answer = value * factor;
        let roundedAnswer = parseFloat(answer.toFixed(2)); // Round to 2 for testing acceptance
        
        // FIXED: Refined condition for unit conversion answers (ensure not too small after rounding)
        if (isFinite(answer) && !isNaN(answer) && Math.abs(roundedAnswer) >= 0.01 && Math.abs(answer) < 1000000) {
            console.log(`Unit Conversion SUCCESS: ${value} ${fromUnitKey} to ${toUnitKey}. Raw Answer: ${answer}, Rounded: ${roundedAnswer}`); // Diagnostic Log
            problemGenerated = true;
            fromUnit = fromUnitData.display;
            toUnit = units[categoryName][toUnitKey].display;
            correctMathAnswer = roundedAnswer; // Use the rounded answer for correction
        } else {
            console.log(`Unit Conversion FAILED condition: value=${value}, factor=${factor}, answer=${answer}, roundedAnswer=${roundedAnswer}`); // Diagnostic Log
        }
    }

    if (!problemGenerated) {
        value = 1; fromUnit = 'meters'; toUnit = 'centimeters'; correctMathAnswer = 100;
        setMessage('Unit Conversion problem generation fallback. Please continue.');
        console.log('Unit Conversion fallback triggered.'); // Diagnostic Log
    }
    
    problemText = `Convert ${value} ${fromUnit} to ${toUnit}: ?`;
    mathProblemDisplay.textContent = problemText;
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'true');
}

function generatePythagoreanTheoremProblem() {
    let a, b, c, sideToFind, answer;
    const MAX_ATTEMPTS = 500;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        console.log(`Pythagorean Attempt ${attempts}`); // Diagnostic Log
        const pythagoreanTriples = [
            [3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29],
            [9, 40, 41], [11, 60, 61], [12, 35, 37]
        ];

        let chosenTriple = pythagoreanTriples[Math.floor(Math.random() * pythagoreanTriples.length)];
        let multiplier = 1;
        if (currentDifficulty === 'hard') { multiplier = generateRandomNum(1, 3); }
        if (currentDifficulty === 'expert') { multiplier = generateRandomNum(1, 5); }

        let tempA = chosenTriple[0] * multiplier;
        let tempB = chosenTriple[1] * multiplier;
        let tempC = chosenTriple[2] * multiplier; // Hypotenuse from perfect triple

        sideToFind = generateRandomNum(1, 3);

        // Fixed: ONLY apply non-perfect adjustment if finding the hypotenuse in expert mode
        if (currentDifficulty === 'expert' && Math.random() < 0.3 && sideToFind === 3) {
            let nonPerfectAdjust = generateRandomNum(1, 3);
            if (Math.random() < 0.5) { tempA += nonPerfectAdjust; } else { tempB += nonPerfectAdjust; }
            console.log(`Expert non-perfect enabled for hypotenuse. a=${tempA}, b=${tempB}`); // Diagnostic Log
        }
        
        let problemText;
        let calculatedAnswer;

        switch (sideToFind) {
            case 1: // Find a: a = sqrt(c^2 - b^2)
                if (tempC * tempC - tempB * tempB <= 0) {
                    console.log(`Skipping: Invalid sqrt arg (c^2 - b^2 <= 0) for a=${tempA}, b=${tempB}, c=${tempC}`); // Diagnostic Log
                    continue; // Skip this attempt if not a valid triangle for finding 'a'
                }
                calculatedAnswer = Math.sqrt(tempC * tempC - tempB * tempB);
                problemText = `Leg b = ${tempB}, Hypotenuse c = ${tempC}. Find leg a: ?`;
                break;
            case 2: // Find b: b = sqrt(c^2 - a^2)
                if (tempC * tempC - tempA * tempA <= 0) {
                    console.log(`Skipping: Invalid sqrt arg (c^2 - a^2 <= 0) for a=${tempA}, b=${tempB}, c=${tempC}`); // Diagnostic Log
                    continue; // Skip this attempt if not a valid triangle for finding 'b'
                }
                calculatedAnswer = Math.sqrt(tempC * tempC - tempA * tempA);
                problemText = `Leg a = ${tempA}, Hypotenuse c = ${tempC}. Find leg b: ?`;
                break;
            case 3: // Find c (hypotenuse)
                calculatedAnswer = Math.sqrt(tempA * tempA + tempB * tempB);
                problemText = `Leg a = ${tempA}, Leg b = ${tempB}. Find hypotenuse c: ?`;
                break;
        }
        
        // Final validity check for calculated answer
        if (isNaN(calculatedAnswer) || !isFinite(calculatedAnswer) || calculatedAnswer <= 0) {
            console.log(`Skipping: Calculated answer invalid (NaN, Infinity, or <=0): ${calculatedAnswer}`); // Diagnostic Log
            continue;
        }

        if (Math.abs(calculatedAnswer) < 500) { // Limit magnitude of the answer
            if (calculatedAnswer % 1 !== 0) { // If it's a decimal, add hint
                 problemText += " (2 dec places)";
            }
            answer = parseFloat(calculatedAnswer.toFixed(2)); // Round to 2 decimals for the answer
            problemGenerated = true;
            console.log(`Pythagorean SUCCESS: ${problemText}, Answer: ${answer}`); // Diagnostic Log
        } else {
            console.log(`Pythagorean FAILED magnitude check: ${calculatedAnswer}`); // Diagnostic Log
        }
    }

    if (!problemGenerated) {
        problemText = `Leg a = 3, Leg b = 4. Find hypotenuse c: ?`;
        answer = 5;
        setMessage('Pythagorean Theorem problem generation fallback. Please continue.');
        console.log('Pythagorean fallback triggered.'); // Diagnostic Log
    }

    mathProblemDisplay.textContent = problemText;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'true');
}

function generateTrigonometryProblem() {
    let angle, func, answer, problemText;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    const commonAngles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360];
    const functions = ['sin', 'cos', 'tan'];

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        func = functions[Math.floor(Math.random() * functions.length)];
        
        let anglePool;
        if (currentDifficulty === 'easy') {
            anglePool = [0, 30, 45, 60, 90];
        } else if (currentDifficulty === 'medium') {
            anglePool = [0, 30, 45, 60, 90, 120, 135, 150, 180];
        } else if (currentDifficulty === 'hard') {
            anglePool = commonAngles;
        } else {
            anglePool = commonAngles.concat(Array.from({ length: 10 }, () => generateRandomNum(0, 360)));
        }

        angle = anglePool[Math.floor(Math.random() * anglePool.length)];

        let calculatedAnswer;
        const angleRad = angle * (Math.PI / 180);

        switch (func) {
            case 'sin':
                calculatedAnswer = Math.sin(angleRad);
                break;
            case 'cos':
                calculatedAnswer = Math.cos(angleRad);
                break;
            case 'tan':
                if (angle === 90 || angle === 270) continue;
                calculatedAnswer = Math.tan(angleRad);
                break;
        }
        
        if (isFinite(calculatedAnswer) && !isNaN(calculatedAnswer) && Math.abs(calculatedAnswer) < 1000) {
            answer = parseFloat(calculatedAnswer.toFixed(3)); // Store with 3 decimal places
            problemText = `${func}(${angle}°) = ? (3 dec places)`; // Prompt for 3 dec places
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        problemText = `sin(30°) = ? (3 dec places)`;
        answer = 0.5;
        setMessage('Trigonometry problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = problemText;
    correctMathAnswer = answer; // correctMathAnswer is already a float with 3 decimals
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'true');
}

function generateFactoringProblem() {
    let commonFactor, term1Coefficient, term2Coefficient, problemText, answer;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        if (currentDifficulty === 'easy') {
            commonFactor = generateRandomNum(2, 5);
            term1Coefficient = generateRandomNum(1, 5);
            term2Coefficient = generateRandomNum(1, 5);
        } else if (currentDifficulty === 'medium') {
            commonFactor = generateRandomNum(2, 10);
            term1Coefficient = generateRandomNum(1, 8);
            term2Coefficient = generateRandomNum(1, 8);
        } else {
            commonFactor = generateRandomNum(2, 20);
            term1Coefficient = generateRandomNum(1, 10);
            term2Coefficient = generateRandomNum(1, 10);
        }

        if (term1Coefficient === 0 || term2Coefficient === 0) continue;

        let num1 = commonFactor * term1Coefficient;
        let num2 = commonFactor * term2Coefficient;

        if (gcd(num1, num2) !== commonFactor) {
            commonFactor = gcd(num1, num2);
            term1Coefficient = num1 / commonFactor;
            term2Coefficient = num2 / commonFactor;
        }

        if (Math.random() < 0.5 && currentDifficulty !== 'easy') {
            num2 *= -1;
            term2Coefficient *= -1;
        }

        let variable = Math.random() < 0.5 ? 'x' : 'y';

        if (Math.random() < 0.6 || currentDifficulty === 'easy') {
            problemText = `Factor out common: ${num1}${variable} ${num2 >= 0 ? '+' : '-'} ${Math.abs(num2)} = ?(${term1Coefficient}${variable} ${term2Coefficient >= 0 ? '+' : '-'} ${Math.abs(term2Coefficient)})`;
        } else {
            problemText = `Factor out common: ${num1}${variable} ${num2 >= 0 ? '+' : '-'} ${Math.abs(num2)}${variable} = ?(${term1Coefficient} ${term2Coefficient >= 0 ? '+' : '-'} ${Math.abs(term2Coefficient)})${variable}`;
            if (commonFactor % 1 !== 0) continue;
        }
        
        answer = commonFactor;

        if (Math.abs(answer) > 0 && Math.abs(answer) < 1000) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        problemText = `Factor out common: 6x + 9 = ?(2x + 3)`;
        answer = 3;
        setMessage('Factoring (GCF) problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = problemText;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'false');
    mathAnswerInput.setAttribute('data-allow-fraction', 'false');
    mathAnswerInput.setAttribute('data-allow-text-answer', 'false');
}

function generateSolvingInequalitiesProblem() {
    let a, b, c, testValue, isSolution, problemText, answer;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    const operators = ['>', '<', '>=', '<='];

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        let op = operators[Math.floor(Math.random() * operators.length)];

        if (currentDifficulty === 'easy') {
            a = 1;
            b = generateRandomNum(1, 10);
            c = generateRandomNum(b + 1, b + 10);
        } else if (currentDifficulty === 'medium') {
            a = generateRandomNum(1, 5);
            b = generateRandomNum(-5, 10);
            c = generateRandomNum(-10, 20);
        } else {
            a = generateRandomNum(1, 7);
            if (Math.random() < 0.5) a *= -1;
            b = generateRandomNum(-10, 20);
            c = generateRandomNum(-20, 30);
        }
        if (a === 0) a = 1;

        let solutionThreshold = (c - b) / a;

        testValue = generateRandomNum(Math.floor(solutionThreshold) - 5, Math.ceil(solutionThreshold) + 5);

        let originalExpressionValue = a * testValue + b;

        isSolution = false;
        switch (op) {
            case '>': isSolution = (originalExpressionValue > c); break;
            case '<': isSolution = (originalExpressionValue < c); break;
            case '>=': isSolution = (originalExpressionValue >= c); break;
            case '<=': isSolution = (originalExpressionValue <= c); break;
        }
        
        problemText = `${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)} ${op} ${c}. Is x = ${testValue} a solution? (Yes/No)`;
        answer = isSolution ? 'Yes' : 'No';

        if (solutionThreshold % 1 !== 0 && (currentDifficulty === 'easy' || currentDifficulty === 'medium')) {
            continue;
        }
        
        problemGenerated = true;
    }

    if (!problemGenerated) {
        problemText = `2x + 5 > 15. Is x = 8 a solution? (Yes/No)`;
        answer = 'Yes';
        setMessage('Solving Inequalities problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = problemText;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'false');
    mathAnswerInput.setAttribute('data-allow-fraction', 'false');
    mathAnswerInput.setAttribute('data-allow-text-answer', 'true');
}

function generateMatricesProblem() {
    let rows, cols, matrixA, matrixB, operation, targetRow, targetCol, answer;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    const generateMatrix = (r, c, valMin, valMax) => {
        let matrix = [];
        for (let i = 0; i < r; i++) {
            let row = [];
            for (let j = 0; j < c; j++) {
                row.push(generateRandomNum(valMin, valMax));
            }
            matrix.push(row);
        }
        return matrix;
    };

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        operation = Math.random() < 0.5 ? '+' : '-';

        let valMin, valMax;
        if (currentDifficulty === 'easy') {
            rows = 2; cols = 2;
            valMin = 1; valMax = 5;
        } else if (currentDifficulty === 'medium') {
            rows = 2; cols = generateRandomNum(2, 3);
            valMin = -5; valMax = 10;
        } else if (currentDifficulty === 'hard') {
            rows = 2; cols = generateRandomNum(2, 3); cols = generateRandomNum(2, 3);
            valMin = -10; valMax = 15;
        } else {
            rows = generateRandomNum(3, 4); cols = generateRandomNum(3, 4);
            valMin = -15; valMax = 20;
        }

        matrixA = generateMatrix(rows, cols, valMin, valMax);
        matrixB = generateMatrix(rows, cols, valMin, valMax);

        targetRow = generateRandomNum(0, rows - 1);
        targetCol = generateRandomNum(0, cols - 1);

        let calculatedElement;
        if (operation === '+') {
            calculatedElement = matrixA[targetRow][targetCol] + matrixB[targetRow][targetCol];
        } else {
            calculatedElement = matrixA[targetRow][targetCol] - matrixB[targetRow][targetCol];
        }
        
        answer = calculatedElement;

        if (Math.abs(answer) < 1000) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        matrixA = [[1, 2], [3, 4]];
        matrixB = [[5, 6], [7, 8]];
        operation = '+';
        targetRow = 0;
        targetCol = 0;
        answer = 6;
        setMessage('Matrices problem generation fallback. Please continue.');
    }
    
    let matrixADisplay = matrixA.map(row => '[' + row.join(' ') + ']').join(' ');
    let matrixBDisplay = matrixB.map(row => '[' + row.join(' ') + ']').join(' ');

    mathProblemDisplay.innerHTML = `Given A=[${matrixADisplay}]<br>B=[${matrixBDisplay}]<br>What is (A ${operation} B)[${targetRow},${targetCol}]?`;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'false');
    mathAnswerInput.setAttribute('data-allow-fraction', 'false');
    mathAnswerInput.setAttribute('data-allow-text-answer', 'false');
}

function generateLogarithmsProblem() {
    let base, number, answer, problemText;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        if (currentDifficulty === 'easy') {
            base = generateRandomNum(2, 4);
            answer = generateRandomNum(2, 4);
        } else if (currentDifficulty === 'medium') {
            base = generateRandomNum(2, 6);
            answer = generateRandomNum(2, 5);
        } else if (currentDifficulty === 'hard') {
            base = generateRandomNum(2, 10);
            answer = generateRandomNum(2, 6);
        } else {
            base = generateRandomNum(2, 12);
            answer = generateRandomNum(2, 7);
            if (Math.random() < 0.3) answer = generateRandomNum(-3, -1);
        }

        number = Math.pow(base, answer);
        
        if (base === 1 || number <= 0 || !isFinite(number) || Math.abs(number) > 1000000 || Math.abs(answer) > 100) continue;
        
        problemText = `log${base} (${number}) = ?`;
        correctMathAnswer = answer;

        if (isFinite(answer) && !isNaN(answer)) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        problemText = `log2 (8) = ?`;
        answer = 3;
        setMessage('Logarithms problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = problemText;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
    mathAnswerInput.setAttribute('data-allow-decimal', 'true');
    mathAnswerInput.setAttribute('data-allow-fraction', 'false');
    mathAnswerInput.setAttribute('data-allow-text-answer', 'false');
}

function generateDecimalToBinaryProblem() {
    let decimalNum;
    let binaryAnswer;
    const maxLength = (currentDifficulty === 'easy' ? 15 :
                                 currentDifficulty === 'medium' ? 63 :
                                 currentDifficulty === 'hard' ? 255 :
                                 1023);

    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        decimalNum = generateRandomNum(1, maxLength);
        binaryAnswer = decToBin(decimalNum, 0);

        if (decimalNum > 0) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        decimalNum = 5; binaryAnswer = '101';
        setMessage('Decimal to Binary problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `Convert decimal ${decimalNum} to binary: ?`;
    correctMathAnswer = binaryAnswer;
    mathAnswerInput.value = '';

}

function generateBinaryToDecimalProblem() {
    let binaryString;
    let decimalAnswer;
    const maxLength = (currentDifficulty === 'easy' ? 4 :
                                 currentDifficulty === 'medium' ? 6 :
                                 currentDifficulty === 'hard' ? 8 : 10);

    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        binaryString = '';
        let hasOne = false;
        const numBits = generateRandomNum(2, maxLength);
        for (let i = 0; i < numBits; i++) {
            const bit = Math.random() < 0.5 ? '0' : '1';
            binaryString += bit;
            if (bit === '1') hasOne = true;
        }

        if (!hasOne && numBits > 0) {
            const randomIndex = generateRandomNum(0, binaryString.length - 1);
            binaryString = binaryString.substring(0, randomIndex) + '1' + binaryString.substring(randomIndex + 1);
        }

        decimalAnswer = parseInt(binaryString, 2);

        if (decimalAnswer > 0 && decimalAnswer < 2000) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        binaryString = '101';
        decimalAnswer = 5;
        setMessage('Binary to Decimal problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `Convert binary ${binaryString} to decimal: ?`;
    correctMathAnswer = decimalAnswer;
    mathAnswerInput.value = '';
}

function generateBinaryAdditionProblem() {
    let binaryNum1, binaryNum2, sumBinary;
    let bitLength;

    if (currentDifficulty === 'easy') {
        bitLength = generateRandomNum(2, 4);
    } else if (currentDifficulty === 'medium') {
        bitLength = generateRandomNum(4, 6);
    } else if (currentDifficulty === 'hard') {
        bitLength = generateRandomNum(6, 8);
    } else {
        bitLength = generateRandomNum(8, 10);
    }

    const generateRandomBinary = (length) => {
        let binary = '';
        for (let i = 0; i < length; i++) {
            binary += Math.round(Math.random());
        }
        if (parseInt(binary, 2) === 0 && length > 0) {
            binary = binary.substring(0, length - 1) + '1';
        }
        return binary;
    };

    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        binaryNum1 = generateRandomBinary(bitLength);
        binaryNum2 = generateRandomBinary(bitLength);

        const dec1 = parseInt(binaryNum1, 2);
        const dec2 = parseInt(binaryNum2, 2);
        const sumDec = dec1 + dec2;
        sumBinary = sumDec.toString(2);

        if (sumBinary.length <= bitLength + 1) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        binaryNum1 = '101';
        binaryNum2 = '011';
        sumBinary = (parseInt(binaryNum1, 2) + parseInt(binaryNum2, 2)).toString(2);
        setMessage('Binary Addition problem generation fallback. Please continue.');
    }

    mathProblemDisplay.innerHTML = `Add binary:<br>${binaryNum1}<br>+ ${binaryNum2}<br>= ?`;
    correctMathAnswer = sumBinary;
    mathAnswerInput.value = '';
}

function generateLinearEquationProblem() {
    let a, b, c, answer;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;

        a = generateRandomNum(1, Math.floor(maxVal / 5));
        if (Math.random() < 0.5) a *= -1;
        if (a === 0) a = 1;

        b = generateRandomNum(-Math.floor(maxVal / 2), Math.floor(maxVal / 2));
        c = generateRandomNum(-Math.floor(maxVal / 2), Math.floor(maxVal / 2));

        let numerator = c - b;
        if (numerator % a === 0) {
            answer = numerator / a;
            if (Math.abs(answer) <= maxVal * 2 && Math.abs(answer) > 0 || (answer === 0 && attempts > MAX_ATTEMPTS/2)) {
                problemGenerated = true;
            }
        }
    }

    if (!problemGenerated) {
        a = 2; b = 3; c = 7; answer = 2;
        setMessage('Linear Equation problem generation fallback. Please continue.');
    }

    let bSign = b >= 0 ? '+' : '';
    let bDisplay = b === 0 ? '' : `${bSign} ${Math.abs(b)}`;
    if (b < 0) bDisplay = `- ${Math.abs(b)}`;
    if (b === 0) bDisplay = '';

    let problemString;
    if (b === 0) {
        problemString = `${a}x = ${c}`;
    } else {
        problemString = `${a}x ${bDisplay} = ${c}`;
    }

    mathProblemDisplay.textContent = `Solve for x: ${problemString}`;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
}

function generateArithmeticMeanProblem() {
    let numCount;
    let numbers = [];
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        if (currentDifficulty === 'easy') {
            numCount = 2;
            numbers = [generateRandomNum(1, 10), generateRandomNum(1, 10)];
        } else if (currentDifficulty === 'medium') {
            numCount = generateRandomNum(2, 3);
            numbers = Array.from({ length: numCount }, () => generateRandomNum(1, 20));
        } else if (currentDifficulty === 'hard') {
            numCount = generateRandomNum(3, 4);
            numbers = Array.from({ length: numCount }, () => generateRandomNum(-10, 30));
        } else {
            numCount = generateRandomNum(4, 5);
            numbers = Array.from({ length: numCount }, () => generateRandomNum(-20, 50));
        }

        const sum = numbers.reduce((acc, curr) => acc + curr, 0);
        let answer = sum / numbers.length;

        if (answer % 1 === 0 || (answer * 10) % 1 === 0 || (answer * 100) % 1 === 0) {
             if (Math.abs(answer) < 10000) {
                 problemGenerated = true;
                 correctMathAnswer = answer;
             }
        }
    }

    if (!problemGenerated) {
        numbers = [1, 2, 3]; correctMathAnswer = 2;
        setMessage('Arithmetic Mean problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `What is the mean of ${numbers.join(', ')}?`;
    mathAnswerInput.value = '';
}

function generateStandardDeviationProblem() {
    let numCount;
    let numbers = [];
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        if (currentDifficulty === 'easy') {
            numCount = generateRandomNum(3, 4);
            numbers = Array.from({ length: numCount }, () => generateRandomNum(1, 10));
        } else if (currentDifficulty === 'medium') {
            numCount = generateRandomNum(4, 5);
            numbers = Array.from({ length: numCount }, () => generateRandomNum(1, 15));
        } else if (currentDifficulty === 'hard') {
            numCount = generateRandomNum(5, 6);
            numbers = Array.from({ length: numCount }, () => generateRandomNum(-5, 20));
        } else {
            numCount = generateRandomNum(6, 7);
            numbers = Array.from({ length: numCount }, () => generateRandomNum(-10, 25));
        }

        const mean = numbers.reduce((sum, val) => sum + val, 0) / numbers.length;
        const variance = numbers.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numbers.length;
        let answer = Math.sqrt(variance);

        if (answer > 0.1 && answer < 100 && isFinite(answer) && !isNaN(answer)) {
            problemGenerated = true;
            correctMathAnswer = parseFloat(answer.toFixed(2));
        }
    }

    if (!problemGenerated) {
        numbers = [1, 2, 3, 4, 5]; correctMathAnswer = 1.41;
        setMessage('Standard Deviation problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `Std. Dev. of [${numbers.join(', ')}]? (2 dec places)`;
    mathAnswerInput.value = '';
}

function generateEvaluatingFunctionProblem() {
    let a, b, c, x, problemString, answer;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        if (currentDifficulty === 'easy') {
            a = generateRandomNum(1, 5);
            b = generateRandomNum(-5, 5);
            x = generateRandomNum(1, 5);
            problemString = `f(x) = ${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)}`;
            answer = a * x + b;
        } else if (currentDifficulty === 'medium') {
            a = generateRandomNum(1, 7);
            b = generateRandomNum(-7, 7);
            x = generateRandomNum(-5, 5);
            problemString = `f(x) = ${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)}`;
            answer = a * x + b;
        } else {
            a = generateRandomNum(1, 2);
            b = generateRandomNum(-7, 7);
            c = generateRandomNum(-7, 7);
            x = generateRandomNum(-5, 5);
            problemString = `f(x) = ${a}x² ${b >= 0 ? '+' : '-'} ${Math.abs(b)}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)}`;
            answer = a * Math.pow(x, 2) + b * x + c;
        }
        
        if (Math.abs(answer) < 1000) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        problemString = `f(x) = 2x + 3`; x = 2; answer = 7;
        setMessage('Evaluating Function problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `Evaluate ${problemString} for x = ${x}: ?`;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
}

function generateFractionToDecimalProblem() {
    let numerator, denominator, answer;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        if (currentDifficulty === 'easy') {
            numerator = generateRandomNum(1, 9);
            denominator = generateRandomNum(2, 5);
        } else if (currentDifficulty === 'medium') {
            numerator = generateRandomNum(1, 15);
            denominator = generateRandomNum(2, 10);
        } else {
            numerator = generateRandomNum(1, 25);
            denominator = generateRandomNum(2, 25);
        }

        if (denominator === 0) continue;
        answer = numerator / denominator;

        const decimalStr = answer.toString();
        if (decimalStr.length < 10 && Math.abs(answer) < 1000) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        numerator = 1; denominator = 2; answer = 0.5;
        setMessage('Fraction to Decimal problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `Convert ${numerator}/${denominator} to decimal: ?`;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
}

function generateSimpleInterestProblem() {
    let principal, rate, time, interest, totalAmount;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        principal = generateRandomNum(1, currentDifficulty === 'easy' ? 5 : currentDifficulty === 'medium' ? 20 : currentDifficulty === 'hard' ? 50 : 100) * 100;
        rate = generateRandomNum(1, currentDifficulty === 'easy' ? 5 : currentDifficulty === 'medium' ? 10 : currentDifficulty === 'hard' ? 15 : 20);
        time = generateRandomNum(1, currentDifficulty === 'easy' ? 3 : currentDifficulty === 'medium' ? 5 : currentDifficulty === 'hard' ? 7 : 10);

        interest = (principal * rate * time) / 100;
        totalAmount = principal + interest;

        if (Math.abs(totalAmount) < 1000000 && (totalAmount * 100) % 1 === 0) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        principal = 1000; rate = 5; time = 2; totalAmount = 1100;
        setMessage('Simple Interest fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `P=₱${principal}, R=${rate}%, T=${time} yrs. Simple Interest Total?`;
    correctMathAnswer = parseFloat(totalAmount.toFixed(2));
    mathAnswerInput.value = '';
}

function generateCompoundInterestProblem() {
    let principal, rate, time, periods, totalAmount;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    const getRate = (min, max) => generateRandomNum(min * 10, max * 10) / 10;
    const getPeriods = (diff) => {
        if (diff === 'easy') return 1;
        if (diff === 'medium') return Math.random() < 0.5 ? 2 : 4;
        return Math.random() < 0.5 ? 4 : 12;
    };

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        principal = generateRandomNum(1, currentDifficulty === 'easy' ? 5 : currentDifficulty === 'medium' ? 10 : currentDifficulty === 'hard' ? 20 : 50) * 1000;
        rate = getRate(currentDifficulty === 'easy' ? 2 : currentDifficulty === 'medium' ? 4 : currentDifficulty === 'hard' ? 6 : 8,
                                     currentDifficulty === 'easy' ? 8 : currentDifficulty === 'medium' ? 12 : currentDifficulty === 'hard' ? 18 : 25);
        time = generateRandomNum(1, currentDifficulty === 'easy' ? 3 : currentDifficulty === 'medium' ? 6 : currentDifficulty === 'hard' ? 10 : 15);
        periods = getPeriods(currentDifficulty);

        totalAmount = principal * Math.pow((1 + (rate / 100) / periods), (periods * time));

        if (totalAmount > principal && totalAmount < 10000000 && isFinite(totalAmount) && !isNaN(totalAmount)) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        principal = 1000; rate = 5; time = 2; periods = 1; totalAmount = 1102.50;
        setMessage('Compound Interest fallback. Please continue.');
    }
    
    let periodsText = 'annually';
    if (periods === 2) periodsText = 'semi-annually';
    else if (periods === 4) periodsText = 'quarterly';
    else if (periods === 12) periodsText = 'monthly';

    mathProblemDisplay.textContent = `P=₱${principal}, R=${rate}%, T=${time} yrs, ${periodsText}. Comp. Int. Total?`;
    correctMathAnswer = parseFloat(totalAmount.toFixed(2));
    mathAnswerInput.value = '';
}

function startChallenge() {
    awaitingMathAnswer = true;
    clearInterval(gameInterval);

    initialTimeForCurrentChallenge = difficultyTimes[currentDifficulty];

    gamePanel.style.display = 'none';
    rightPanel.style.display = 'flex';

    mathChallengeArea.style.display = 'block';
    customKeyboard.style.display = 'flex';
    canvas.style.display = 'none';
    scoreDisplay.parentElement.style.display = 'none';
    if (highScoreContainer) {
        highScoreContainer.style.display = 'none';
    }
    resetGameBtn.style.display = 'none';

    mathAnswerInput.value = '';

    let allowDecimalInput = false;
    let allowFractionInput = false;
    let allowTextAnswer = false;

    switch (selectedOperationType) {
        case 'arithmetic':
            generateArithmeticProblem();
            break;
        case 'pure-addition-positive':
            generatePureAdditionPositiveProblem();
            break;
        case 'pure-subtraction-positive':
            generatePureSubtractionPositiveProblem();
            break;
        case 'pure-multiplication-positive':
            generatePureMultiplicationPositiveProblem();
            break;
        case 'pure-division-positive':
            generatePureDivisionPositiveProblem();
            break;
        case 'pure-addition-negative':
            generatePureAdditionNegativeProblem();
            break;
        case 'pure-subtraction-negative':
            generatePureSubtractionNegativeProblem();
            break;
        case 'pure-multiplication-negative':
            generatePureMultiplicationNegativeProblem();
            break;
        case 'pure-division-negative':
            generatePureDivisionNegativeProblem();
            break;
        case 'exponentiation':
            generateExponentiationProblem();
            break;
        case 'modulus':
            generateModulusProblem();
            break;
        case 'absolute-value':
            generateAbsoluteValueProblem();
            break;
        case 'percentage':
            generatePercentageProblem();
            allowDecimalInput = true;
            break;
        case 'square-root':
            generateSquareRootProblem();
            allowDecimalInput = true;
            break;
        case 'order-of-operations':
            generateOrderOfOperationsProblem();
            allowDecimalInput = true;
            break;
        case 'fractions':
            generateFractionsProblem();
            allowDecimalInput = true;
            allowFractionInput = true;
            break;
        case 'lcm':
            generateLCMProblem();
            break;
        case 'gcd':
            generateGCDProblem();
            break;
        case 'prime-number':
            generatePrimeNumberProblem();
            allowTextAnswer = true;
            break;
        case 'area-perimeter':
            generateAreaPerimeterProblem();
            allowDecimalInput = true;
            break;
        case 'unit-conversion':
            generateUnitConversionProblem();
            allowDecimalInput = true;
            break;
        case 'pythagorean-theorem':
            generatePythagoreanTheoremProblem();
            allowDecimalInput = true;
            break;
        case 'trigonometry':
            generateTrigonometryProblem();
            allowDecimalInput = true;
            break;
        case 'factoring':
            generateFactoringProblem();
            break;
        case 'solve-inequality':
            generateSolvingInequalitiesProblem();
            allowTextAnswer = true;
            break;
        case 'matrices':
            generateMatricesProblem();
            break;
        case 'logarithms':
            generateLogarithmsProblem();
            allowDecimalInput = true;
            break;
        case 'binary-decimal':
            generateBinaryToDecimalProblem();
            break;
        case 'decimal-binary':
            generateDecimalToBinaryProblem();
            break;
        case 'binary-addition':
            generateBinaryAdditionProblem();
            break;
        case 'linear-equation':
            generateLinearEquationProblem();
            break;
        case 'arithmetic-mean':
            generateArithmeticMeanProblem();
            allowDecimalInput = true;
            break;
        case 'standard-deviation':
            generateStandardDeviationProblem();
            allowDecimalInput = true;
            break;
        case 'evaluating-function':
            generateEvaluatingFunctionProblem();
            break;
        case 'fraction-decimal':
            generateFractionToDecimalProblem();
            allowDecimalInput = true;
            break;
        case 'simple-interest':
            generateSimpleInterestProblem();
            allowDecimalInput = true;
            break;
        case 'compound-interest':
            generateCompoundInterestProblem();
            allowDecimalInput = true;
            break;
        default:
            generateArithmeticProblem();
            setMessage('Unknown problem type selected, defaulting to Decimal Arithmetic.');
    }

    mathAnswerInput.setAttribute('data-allow-decimal', allowDecimalInput ? 'true' : 'false');
    mathAnswerInput.setAttribute('data-allow-fraction', allowFractionInput ? 'true' : 'false');
    mathAnswerInput.setAttribute('data-allow-text-answer', allowTextAnswer ? 'true' : 'false');


    timeLeftForMath = initialTimeForCurrentChallenge;
    timerDisplay.textContent = `Time left: ${timeLeftForMath}s`;
    
    lastProblemText = mathProblemDisplay.textContent;
    lastCorrectAnswerDisplay = (selectedOperationType === 'decimal-binary' || selectedOperationType === 'binary-addition' || selectedOperationType === 'fractions' || selectedOperationType === 'prime-number' || selectedOperationType === 'solve-inequality') ? correctMathAnswer : parseFloat(correctMathAnswer.toFixed(2));

    startMathTimer();
    messageArea.style.display = 'none';
}

function startMathTimer() {
    clearInterval(mathTimerInterval);
    mathTimerInterval = setInterval(() => {
        timeLeftForMath--;
        timerDisplay.textContent = `Time left: ${timeLeftForMath}s`;

        if (timeLeftForMath <= 10 && !isPaused && score >= 2) {
            pauseGameBtn.style.display = 'inline-block';
        } else {
            pauseGameBtn.style.display = 'none';
        }

        if (timeLeftForMath <= 0) {
            clearInterval(mathTimerInterval);
            endGame();
        }
    }, 1000);
}

function submitMathAnswer() {
    if (!awaitingMathAnswer) return;

    const isDecimalAllowed = mathAnswerInput.getAttribute('data-allow-decimal') === 'true';
    const isFractionAllowed = mathAnswerInput.getAttribute('data-allow-fraction') === 'true';
    const isTextAnswerAllowed = mathAnswerInput.getAttribute('data-allow-text-answer') === 'true';

    const userAnswerRaw = mathAnswerInput.value.trim();
    let userAnswer;

    if (userAnswerRaw === '') {
        setMessage('Please enter an answer!');
        mathAnswerInput.value = '';
        mathAnswerInput.focus();
        return;
    }

    if (isTextAnswerAllowed) {
        userAnswer = userAnswerRaw.toLowerCase();
        if (userAnswer === correctMathAnswer.toLowerCase()) {
            // Correct, proceed to score
        } else {
            setMessage('Incorrect answer! Try again. (e.g., "Yes" or "No")');
            mathAnswerInput.value = '';
            mathAnswerInput.focus();
            return;
        }
    } else if (selectedOperationType === 'decimal-binary' || selectedOperationType === 'binary-addition') {
        userAnswer = userAnswerRaw;
        if (!/^[01]+$/.test(userAnswer)) {
            setMessage('For Binary conversion/addition, please enter only 0s and 1s!');
            mathAnswerInput.value = '';
        mathAnswerInput.focus();
            return;
        }
    } else if (selectedOperationType === 'fractions') {
        userAnswer = userAnswerRaw;
        const fractionParts = userAnswer.split('/').map(s => s.trim());
        if (fractionParts.length === 2 && !isNaN(parseInt(fractionParts[0])) && !isNaN(parseInt(fractionParts[1]))) {
            const userNum = parseInt(fractionParts[0]);
            const userDen = parseInt(fractionParts[1]);
            if (userDen === 0) {
                setMessage('Denominator cannot be zero!');
                mathAnswerInput.value = '';
                mathAnswerInput.focus();
                return;
            }
            const simplifiedUser = simplifyFraction(userNum, userDen);
            let correctNum, correctDen;
            if (typeof correctMathAnswer === 'string' && correctMathAnswer.includes('/')) {
                const correctParts = correctMathAnswer.split('/').map(s => s.trim());
                correctNum = parseInt(correctParts[0]);
                correctDen = parseInt(correctParts[1]);
            } else {
                correctNum = parseInt(correctMathAnswer);
                correctDen = 1;
            }
            const simplifiedCorrect = simplifyFraction(correctNum, correctDen);
            
            if (simplifiedUser.num === simplifiedCorrect.num && simplifiedUser.den === simplifiedCorrect.den) {
            } else {
                setMessage('Incorrect answer! Try again. Remember to simplify if necessary.');
                mathAnswerInput.value = '';
                mathAnswerInput.focus();
                return;
            }
        } else if (isDecimalAllowed && !isNaN(parseFloat(userAnswer))) {
            userAnswer = parseFloat(userAnswer);
            let correctFloat;
            if (typeof correctMathAnswer === 'string' && correctMathAnswer.includes('/')) {
                const parts = correctMathAnswer.split('/');
                correctFloat = parseFloat(parts[0]) / parseFloat(parts[1]);
            } else {
                correctFloat = parseFloat(correctMathAnswer);
            }
            
            if (Math.abs(userAnswer - correctFloat) > 0.001) {
                setMessage('Incorrect answer! Try again.');
                mathAnswerInput.value = '';
                mathAnswerInput.focus();
                return;
            }
        } else {
            setMessage('Please enter a valid number or fraction (e.g., "1/2")!');
            mathAnswerInput.value = '';
            mathAnswerInput.focus();
            return;
        }
    } else {
        userAnswer = isDecimalAllowed ? parseFloat(userAnswerRaw) : parseInt(userAnswerRaw);
        if (isNaN(userAnswer)) {
            setMessage('Please enter a valid number!');
            mathAnswerInput.value = '';
            mathAnswerInput.focus();
            return;
        }
    }
    
    let isCorrect = false;
    if (isTextAnswerAllowed) {
        isCorrect = userAnswer === correctMathAnswer.toLowerCase();
    } else if (selectedOperationType === 'decimal-binary' || selectedOperationType === 'binary-addition') {
        isCorrect = userAnswer === correctMathAnswer;
    } else if (selectedOperationType === 'fractions') {
        isCorrect = true;
    } else if (selectedOperationType === 'trigonometry') { // Fixed: Add specific validation for trigonometry
        // correctMathAnswer is already float. Compare with tolerance.
        isCorrect = Math.abs(userAnswer - correctMathAnswer) < 0.005; // Tolerance for 3 decimal places
    }
    else {
        isCorrect = userAnswer === parseFloat(correctMathAnswer.toFixed(2));
    }

    if (isCorrect) {
        let pointsEarned = 0;
        const timeTaken = initialTimeForCurrentChallenge - timeLeftForMath;

        if (timeTaken <= 0.25 * initialTimeForCurrentChallenge) {
            pointsEarned = 7;
        } else if (timeTaken <= 0.50 * initialTimeForCurrentChallenge) {
            pointsEarned = 5;
        } else if (timeTaken <= 0.75 * initialTimeForCurrentChallenge) {
            pointsEarned = 3;
        } else {
            pointsEarned = 2;
        }

        score += pointsEarned;
        scoreDisplay.textContent = score;

        const highScoreKey = `${selectedOperationType}_${currentDifficulty}`;
        if (!highScores[highScoreKey] || score > highScores[highScoreKey]) {
            highScores[highScoreKey] = score;
            localStorage.setItem('mathSnakeHighScores', JSON.stringify(highScores));
            if (highScoreDisplay) {
                highScoreDisplay.textContent = highScores[highScoreKey];
            }
        }

        if (score > allTimeHighScore.score) {
            allTimeHighScore.score = score;
            const selectedProblemTypeText = document.querySelector(`.operation-btn[data-operation-type="${selectedOperationType}"]`).textContent;
            allTimeHighScore.problemType = selectedProblemTypeText;
            localStorage.setItem('allTimeMathSnakeHighScore', JSON.stringify(allTimeHighScore));
            updateAllTimeHighScoreDisplay();
        }

        setMessage(`Correct! +${pointsEarned} points.`);
        awaitingMathAnswer = false;
        clearInterval(mathTimerInterval);
        
        gamePanel.style.display = 'flex';
        rightPanel.style.display = 'none';

        mathChallengeArea.style.display = 'none';
        customKeyboard.style.display = 'none';
        canvas.style.display = 'block';
        scoreDisplay.parentElement.style.display = 'flex';
        if (highScoreContainer) {
            highScoreContainer.style.display = 'flex';
        }
        pauseGameBtn.style.display = 'none';

        clearInterval(gameInterval);
        gameInterval = setInterval(moveSnake, GAME_SPEED);
        generateFood();
        drawGame();
    } else {
        setMessage('Incorrect answer! Try again.');
        mathAnswerInput.value = '';
        mathAnswerInput.focus();
    }
}

function handleKeyboardInput(value) {
    if (!awaitingMathAnswer) return;

    const isBinaryInput = (selectedOperationType === 'decimal-binary' || selectedOperationType === 'binary-addition');
    const isFractionInput = (selectedOperationType === 'fractions');
    const isTextAnswer = mathAnswerInput.getAttribute('data-allow-text-answer') === 'true';

    if (value === 'clear') {
        mathAnswerInput.value = '';
    } else if (value === 'backspace') {
        mathAnswerInput.value = mathAnswerInput.value.slice(0, -1);
    } else if (value === '-') {
        if (!isTextAnswer) {
            if (mathAnswerInput.value === '') {
                mathAnswerInput.value = '-';
            } else if (mathAnswerInput.value === '-') {
                mathAnswerInput.value = '';
            } else if (mathAnswerInput.value.startsWith('-')) {
                mathAnswerInput.value = mathAnswerInput.value.substring(1);
            } else {
                mathAnswerInput.value = '-' + mathAnswerInput.value;
            }
        }
    } else if (value === '.') {
        const isDecimalAllowed = mathAnswerInput.getAttribute('data-allow-decimal') === 'true';
        if (!mathAnswerInput.value.includes('.') && isDecimalAllowed) { // Fixed: `isDecimalInput` to `isDecimalAllowed`
            mathAnswerInput.value += value;
        }
    } else if (isBinaryInput) {
        if (value === '0' || value === '1') {
            mathAnswerInput.value += value;
        }
    } else if (isFractionInput) {
        if ((value >= '0' && value <= '9') || value === '/') {
            mathAnswerInput.value += value;
        }
    } else if (isTextAnswer) {
        if (value === 'yes') {
            mathAnswerInput.value = 'Yes';
        } else if (value === 'no') {
            mathAnswerInput.value = 'No';
        }
    } else {
        if (value >= '0' && value <= '9') {
            mathAnswerInput.value += value;
        }
    }
    mathAnswerInput.focus();
}


document.addEventListener('keydown', e => {
    if (awaitingMathAnswer) {
        if (e.key === 'Enter') {
            submitMathAnswer();
        } else if (e.key === 'Backspace') {
            handleKeyboardInput('backspace');
        } else if (e.key === 'Delete') {
            handleKeyboardInput('clear');
        } else if ((e.key >= '0' && e.key <= '9')) {
            handleKeyboardInput(e.key);
        } else if (e.key === '.') {
            const isDecimalAllowed = mathAnswerInput.getAttribute('data-allow-decimal') === 'true';
            if (isDecimalAllowed) {
                handleKeyboardInput(e.key);
            }
        } else if (e.key === '-') {
            handleKeyboardInput(e.key);
        } else if (e.key === '/') {
            const isFractionAllowed = mathAnswerInput.getAttribute('data-allow-fraction') === 'true';
            if (isFractionAllowed) {
                 handleKeyboardInput(e.key);
            }
        } else if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
            const isTextAnswerAllowed = mathAnswerInput.getAttribute('data-allow-text-answer') === 'true';
            if (isTextAnswerAllowed) {
                mathAnswerInput.value += e.key;
            }
        }
        return;
    }

    if (!isGameRunning || isPaused) return;

    const newDirection = e.key.replace('Arrow', '').toLowerCase();
    if ((newDirection === 'up' && direction !== 'down') ||
        (newDirection === 'down' && direction !== 'up') ||
        (newDirection === 'left' && direction !== 'right') ||
        (newDirection === 'right' && direction !== 'left')) {
        direction = newDirection;
    }
});


// --- Event Listeners (All consolidated inside window.load for guaranteed DOM availability) ---
window.addEventListener('load', function() {
    // Initial display of welcome modal and game initialization
    welcomeModal.style.display = 'flex';
    initializeGame();

    // Attach all core event listeners here
    canvas.addEventListener('touchstart', (e) => {
        // console.log("Touch start detected."); // Diagnostic Log
        if (awaitingMathAnswer || !isGameRunning || isPaused) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        // console.log("Touch move detected."); // Diagnostic Log
        if (awaitingMathAnswer || !isGameRunning || isPaused) return;
        touchEndX = e.touches[0].clientX;
        touchEndY = e.touches[0].clientY;
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        // console.log("Touch end detected. Swipe check initiated."); // Diagnostic Log
        if (awaitingMathAnswer || !isGameRunning || isPaused) return;

        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;

        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipeDistance) {
            if (dx > 0 && direction !== 'left') {
                direction = 'right';
                // console.log("Direction set to Right"); // Diagnostic Log
            } else if (dx < 0 && direction !== 'right') {
                direction = 'left';
                // console.log("Direction set to Left"); // Diagnostic Log
            }
        } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > minSwipeDistance) {
            if (dy > 0 && direction !== 'up') {
                direction = 'down';
                // console.log("Direction set to Down"); // Diagnostic Log
            } else if (dy < 0 && direction !== 'down') {
                direction = 'up';
                // console.log("Direction set to Up"); // Diagnostic Log
            }
        }
        touchStartX = 0;
        touchStartY = 0;
        touchEndX = 0;
        touchEndY = 0;
    });

    customKeyboard.addEventListener('click', (e) => {
        if (e.target.classList.contains('key-btn')) {
            handleKeyboardInput(e.target.dataset.value);
        }
    });

    startGameBtn.addEventListener('click', () => {
        // console.log("Start Game button clicked!"); // Diagnostic log
        welcomeModal.style.display = 'none';
        if (currentDifficulty && selectedOperationType) {
            startGame();
        } else {
            initializeGame();
        }
    });

    pauseGameBtn.addEventListener('click', pauseGame);
    resetGameBtn.addEventListener('click', resetGame);
    submitAnswerBtn.addEventListener('click', submitMathAnswer);
    restartGameBtn.addEventListener('click', resetGame);

    closeInfoModalBtn.addEventListener('click', () => {
        infoModal.style.display = 'none';
    });

    infoModal.addEventListener('click', (e) => {
        if (e.target === infoModal) {
            infoModal.style.display = 'none';
        }
    });

    startPlayingBtn.addEventListener('click', () => {
        console.log("Start Playing button clicked!"); // Diagnostic log (keeping for this specific button for now)
        welcomeModal.style.display = 'none';
        initializeGame();
    });

    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            difficultyButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            currentDifficulty = button.dataset.difficulty;
            updateDifficultyAndOperationDisplay();
            checkAndEnableStartGame();
        });
    });

    operationButtons.forEach(button => {
        button.addEventListener('click', () => {
            operationButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectedOperationType = button.dataset.operationType;
            updateDifficultyAndOperationDisplay();
            checkAndEnableStartGame();
        });
    });

    // Attach the resize event listener here as well
    window.addEventListener('resize', resizeCanvas);
});
