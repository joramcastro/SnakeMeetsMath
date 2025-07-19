let currentCanvasSize;
let currentCellSize;
const CELLS_PER_SIDE = 20;

const INITIAL_SNAKE_LENGTH = 1;
const GAME_SPEED = 350;

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
const pauseGameBtn = document.getElementById('pause-game-btn');
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
const closeInfoModalBtn = document = document.getElementById('closeInfoModalBtn');

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

function resizeCanvas() {
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
        const maxCanvasSize = 1000;

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

function resetGame() {
    endGame();
    initializeGame();
}

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
    resizeCanvas();

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

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#4CAF50' : '#8BC34A';
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 2;

        const cornerRadius = currentCellSize / 4;

        ctx.beginPath();
        ctx.moveTo(segment.x + cornerRadius, segment.y);
        ctx.lineTo(segment.x + currentCellSize - cornerRadius, segment.y);
        ctx.arcTo(segment.x + currentCellSize, segment.y, segment.x + currentCellSize, segment.y + cornerRadius, cornerRadius);
        ctx.lineTo(segment.x + currentCellSize, segment.y + currentCellSize - cornerRadius);
        ctx.arcTo(segment.x + currentCellSize, segment.y + currentCellSize, segment.x + currentCellSize - cornerRadius, segment.y + currentCellSize, cornerRadius);
        ctx.lineTo(segment.x + cornerRadius, segment.y + currentCellSize);
        ctx.arcTo(segment.x, segment.y + currentCellSize, segment.x, segment.y + currentCellSize - cornerRadius, cornerRadius);
        ctx.lineTo(segment.x, segment.y + cornerRadius);
        ctx.arcTo(segment.x, segment.y, segment.x + cornerRadius, segment.y, cornerRadius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

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

    ctx.fillStyle = '#FFC107';
    ctx.strokeStyle = '#FF8F00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(food.x + currentCellSize / 2, food.y + currentCellSize / 2, currentCellSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}

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

    const MAX_ATTEMPTS = 100;
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
        if (den1 === 0) continue; // Denominator cannot be zero

        // Ensure fractions are not initially simplifiable (or simplify them)
        let s1 = simplifyFraction(num1, den1);
        num1 = s1.num;
        den1 = s1.den;

        if (Math.random() < 0.3) { // Introduce some mixed numbers or improper fractions
            let whole = 0;
            if (currentDifficulty !== 'easy') {
                whole = generateRandomNum(0, 3);
                num1 += whole * den1;
            }
        }
        
        num2 = generateRandomNum(numMin, numMax);
        den2 = generateRandomNum(denMin, denMax);
        if (den2 === 0) continue; // Denominator cannot be zero

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
                        continue; // Avoid negative answers for easy difficulty subtraction
                    }
                    tempAnswerNum = num1 * den2 - num2 * den1;
                    tempAnswerDen = den1 * den2;
                    break;
                case '*':
                    tempAnswerNum = num1 * num2;
                    tempAnswerDen = den1 * den2;
                    break;
                case '/':
                    if (num2 === 0) continue; // Cannot divide by zero fraction
                    tempAnswerNum = num1 * den2;
                    tempAnswerDen = den1 * num2;
                    break;
            }

            if (tempAnswerDen === 0) continue; // Should not happen with checks, but safety
            
            const simplifiedAnswer = simplifyFraction(tempAnswerNum, tempAnswerDen);
            answerNum = simplifiedAnswer.num;
            answerDen = simplifiedAnswer.den;

            if (answerDen < 0) { // Normalize negative denominators
                answerNum *= -1;
                answerDen *= -1;
            }

            // Check if the answer is manageable (e.g., not too large, not zero denominator)
            if (Math.abs(answerNum) <= 1000 && Math.abs(answerDen) <= 1000 && answerDen !== 0) {
                problemGenerated = true;
            }

        } catch (e) {
            // Log error but continue attempts
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
        correctMathAnswer = answerNum; // Whole number
    } else {
        correctMathAnswer = `${answerNum}/${answerDen}`; // Fraction
    }
    
    mathProblemDisplay.innerHTML = problemText;
    mathAnswerInput.value = '';
    // This problem type can have integer or fraction answers, so allow decimals
    // For fractions, the user will type "X/Y"
    mathAnswerInput.setAttribute('data-allow-decimal', 'true');
    mathAnswerInput.setAttribute('data-allow-fraction', 'true');
}


function generateDecimalToBinaryProblem() {
    let decimalNum;
    let binaryAnswer;
    const maxLength = (currentDifficulty === 'easy' ? 15 :
                                 currentDifficulty === 'medium' ? 63 :
                                 currentDifficulty === 'hard' ? 255 :
                                 1023);

    const MAX_ATTEMPTS = 100;
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

    const MAX_ATTEMPTS = 100;
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

    const MAX_ATTEMPTS = 100;
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
    const { min: minVal, max: maxVal } = getDigitRange(currentDifficulty);
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
    let answer;

    const MAX_ATTEMPTS = 100;
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
        answer = sum / numbers.length;

        if (answer % 1 === 0 || (answer * 10) % 1 === 0 || (answer * 100) % 1 === 0) {
             if (Math.abs(answer) < 10000) {
                 problemGenerated = true;
             }
        }
    }

    if (!problemGenerated) {
        numbers = [1, 2, 3]; answer = 2;
        setMessage('Arithmetic Mean problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `What is the mean of ${numbers.join(', ')}?`;
    correctMathAnswer = answer;
    mathAnswerInput.value = '';
}

function generateStandardDeviationProblem() {
    let numCount;
    let numbers = [];
    let answer;

    const MAX_ATTEMPTS = 100;
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
        answer = Math.sqrt(variance);

        if (answer > 0.1 && answer < 100 && (answer * 100) % 1 !== 0) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        numbers = [1, 2, 3, 4, 5]; answer = 1.41;
        setMessage('Standard Deviation problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `Std. Dev. of [${numbers.join(', ')}]? (2 dec places)`;
    correctMathAnswer = parseFloat(answer.toFixed(2));
    mathAnswerInput.value = '';
}

function generateEvaluatingFunctionProblem() {
    let a, b, c, x, problemString, answer;
    const MAX_ATTEMPTS = 100;
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
    const MAX_ATTEMPTS = 100;
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
    const MAX_ATTEMPTS = 100;
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

        if (totalAmount > principal && totalAmount < 10000000 && (totalAmount * 100) % 1 === 0) {
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

    switch (selectedOperationType) {
        case 'arithmetic':
            generateArithmeticProblem();
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
        case 'fractions':
            generateFractionsProblem();
            allowDecimalInput = true; // Fractions can often be represented as decimals
            allowFractionInput = true; // Allow X/Y input
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


    timeLeftForMath = initialTimeForCurrentChallenge;
    timerDisplay.textContent = `Time left: ${timeLeftForMath}s`;
    
    lastProblemText = mathProblemDisplay.textContent;
    lastCorrectAnswerDisplay = (selectedOperationType === 'decimal-binary' || selectedOperationType === 'binary-decimal' || selectedOperationType === 'binary-addition' || selectedOperationType === 'fractions') ? correctMathAnswer : parseFloat(correctMathAnswer.toFixed(2));

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
    const userAnswerRaw = mathAnswerInput.value.trim();
    let userAnswer;

    if (userAnswerRaw === '') {
        setMessage('Please enter an answer!');
        mathAnswerInput.value = '';
        mathAnswerInput.focus();
        return;
    }

    if (selectedOperationType === 'decimal-binary' || selectedOperationType === 'binary-addition') {
        userAnswer = userAnswerRaw;
        if (!/^[01]+$/.test(userAnswer)) {
            setMessage('For Binary conversion/addition, please enter only 0s and 1s!');
            mathAnswerInput.value = '';
            mathAnswerInput.focus();
            return;
        }
    } else if (selectedOperationType === 'fractions') {
        userAnswer = userAnswerRaw;
        // Handle fraction input "X/Y"
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
            const simplifiedCorrect = simplifyFraction(
                parseInt(correctMathAnswer.split('/')[0]),
                parseInt(correctMathAnswer.split('/')[1])
            );
            // Compare simplified fractions
            if (simplifiedUser.num === simplifiedCorrect.num && simplifiedUser.den === simplifiedCorrect.den) {
                // It's a match!
            } else {
                setMessage('Incorrect answer! Try again. Remember to simplify if necessary.');
                mathAnswerInput.value = '';
                mathAnswerInput.focus();
                return;
            }
        } else if (!isNaN(parseFloat(userAnswer))) {
            // Allow decimal input for fractions too, compare as floats
            userAnswer = parseFloat(userAnswer);
            const correctFloat = eval(correctMathAnswer); // Safely evaluate "X/Y" to a float
            if (Math.abs(userAnswer - correctFloat) > 0.001) { // Tolerance for float comparison
                setMessage('Incorrect answer! Try again.');
                mathAnswerInput.value = '';
                mathAnswerInput.focus();
                return;
            }
        } else if (!isNaN(parseInt(userAnswer)) && correctMathAnswer.toString().includes('/')) {
            // If user enters an integer but answer is a fraction (e.g. 2/1 vs 2)
            const correctFloat = eval(correctMathAnswer);
            if (Math.abs(parseInt(userAnswer) - correctFloat) > 0.001) {
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
    if (selectedOperationType === 'decimal-binary' || selectedOperationType === 'binary-addition') {
        isCorrect = userAnswer === correctMathAnswer;
    } else if (selectedOperationType === 'fractions') {
        // This case is handled by the specialized logic above. If execution reaches here, it means
        // either it was a direct match (fraction simplified) or the float conversion matched.
        isCorrect = true; // Assuming the specific fraction/decimal checks passed
    } else {
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

    if (value === 'clear') {
        mathAnswerInput.value = '';
    } else if (value === 'backspace') {
        mathAnswerInput.value = mathAnswerInput.value.slice(0, -1);
    } else if (value === '-') {
        if (mathAnswerInput.value === '') {
            mathAnswerInput.value = '-';
        } else if (mathAnswerInput.value === '-') {
            mathAnswerInput.value = '';
        } else if (mathAnswerInput.value.startsWith('-')) {
            mathAnswerInput.value = mathAnswerInput.value.substring(1);
        } else {
            mathAnswerInput.value = '-' + mathAnswerInput.value;
        }
    } else if (value === '.') {
        const isDecimalAllowed = mathAnswerInput.getAttribute('data-allow-decimal') === 'true';
        if (!mathAnswerInput.value.includes('.') && isDecimalAllowed) {
            mathAnswerInput.value += value;
        }
    } else if (isBinaryInput) {
        if (value === '0' || value === '1') {
            mathAnswerInput.value += value;
        }
    } else if (isFractionInput) {
        // For fractions, allow digits and '/'
        if ((value >= '0' && value <= '9') || value === '/') {
            mathAnswerInput.value += value;
        }
    } else {
        // Default for numeric input
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
        } else if (e.key === '/') { // Allow '/' for fraction input
            const isFractionAllowed = mathAnswerInput.getAttribute('data-allow-fraction') === 'true';
            if (isFractionAllowed) {
                 handleKeyboardInput(e.key);
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

canvas.addEventListener('touchstart', (e) => {
    if (awaitingMathAnswer || !isGameRunning || isPaused) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (awaitingMathAnswer || !isGameRunning || isPaused) return;
    touchEndX = e.touches[0].clientX;
    touchEndY = e.touches[0].clientY;
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', () => {
    if (awaitingMathAnswer || !isGameRunning || isPaused) return;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipeDistance) {
        if (dx > 0 && direction !== 'left') {
            direction = 'right';
        } else if (dx < 0 && direction !== 'right') {
            direction = 'left';
        }
    } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > minSwipeDistance) {
        if (dy > 0 && direction !== 'up') {
            direction = 'down';
        } else if (dy < 0 && direction !== 'down') {
            direction = 'up';
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
    if (currentDifficulty && selectedOperationType) {
        startGame();
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

function setMessage(msg) {
    messageArea.innerHTML = msg;
    messageArea.style.display = 'block';
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installButton.style.display = 'inline-block';
});

installButton.addEventListener('click', () => {
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                setMessage('Game installed successfully!');
                installButton.style.display = 'none';
            } else {
                setMessage('Installation cancelled.');
            }
            deferredInstallPrompt = null;
        });
    } else {
        setMessage('Install prompt not available. Use your browser menu to install.');
    }
});

window.addEventListener('load', function() {
    welcomeModal.style.display = 'flex';
    initializeGame();
});

window.addEventListener('resize', resizeCanvas);
