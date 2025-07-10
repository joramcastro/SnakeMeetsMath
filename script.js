const CANVAS_SIZE = 400;
const CELL_SIZE = 20;
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
const closeInfoModalBtn = document.getElementById('closeInfoModalBtn');

const welcomeModal = document.getElementById('welcomeModal');
const startPlayingBtn = document.getElementById('startPlayingBtn');

const cheatSheetModal = document.getElementById('cheatSheetModal');
const cheatSheetContent = document.getElementById('cheatSheetContent');
const closeCheatSheetBtn = document.getElementById('closeCheatSheetBtn');

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
    canvas.style.display = 'none';
    scoreDisplay.parentElement.style.display = 'none';
    if (highScoreContainer) {
        highScoreContainer.style.display = 'none';
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

    startGameBtn.disabled = true;
    currentDifficulty = null;
    selectedOperationType = null;
    updateDifficultyAndOperationDisplay();
}


function initializeGame() {
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    snake = [];
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
        snake.push({ x: (INITIAL_SNAKE_LENGTH - 1 - i) * CELL_SIZE, y: 0 });
    }

    direction = 'right';
    score = 0;
    scoreDisplay.textContent = score;
    if (highScoreDisplay) {
        highScoreDisplay.textContent = 0;
    }
    if (highScoreContainer) {
        highScoreContainer.style.display = 'none';
    }
    
    isGameRunning = false;
    isPaused = false;
    awaitingMathAnswer = false;
    mathChallengeArea.style.display = 'none';
    customKeyboard.style.display = 'none';
    gameOverModal.style.display = 'none';
    infoModal.style.display = 'none';
    cheatSheetModal.style.display = 'none';
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

    currentDifficulty = null;
    selectedOperationType = null;

    generateFood();
    drawGame();
    updateDifficultyAndOperationDisplay();
    setMessage('Welcome! Please choose a **problem type** and **difficulty** to start.');
}

function drawGame() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#4CAF50' : '#8BC34A';
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 2;

        const cornerRadius = CELL_SIZE / 4;

        ctx.beginPath();
        ctx.moveTo(segment.x + cornerRadius, segment.y);
        ctx.lineTo(segment.x + CELL_SIZE - cornerRadius, segment.y);
        ctx.arcTo(segment.x + CELL_SIZE, segment.y, segment.x + CELL_SIZE, segment.y + cornerRadius, cornerRadius);
        ctx.lineTo(segment.x + CELL_SIZE, segment.y + CELL_SIZE - cornerRadius);
        ctx.arcTo(segment.x + CELL_SIZE, segment.y + CELL_SIZE, segment.x + CELL_SIZE - cornerRadius, segment.y + CELL_SIZE, cornerRadius);
        ctx.lineTo(segment.x + cornerRadius, segment.y + CELL_SIZE);
        ctx.arcTo(segment.x, segment.y + CELL_SIZE, segment.x, segment.y + CELL_SIZE - cornerRadius, cornerRadius);
        ctx.lineTo(segment.x, segment.y + cornerRadius);
        ctx.arcTo(segment.x, segment.y, segment.x + cornerRadius, segment.y, cornerRadius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (index === 0) {
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            const eyeOffset = CELL_SIZE / 4;
            const eyeRadius = CELL_SIZE / 8;

            let eye1X, eye1Y, eye2X, eye2Y;

            switch (direction) {
                case 'right':
                    eye1X = segment.x + CELL_SIZE - eyeOffset; eye1Y = segment.y + eyeOffset;
                    eye2X = segment.x + CELL_SIZE - eyeOffset; eye2Y = segment.y + CELL_SIZE - eyeOffset;
                    break;
                case 'left':
                    eye1X = segment.x + eyeOffset; eye1Y = segment.y + eyeOffset;
                    eye2X = segment.x + eyeOffset; eye2Y = segment.y + CELL_SIZE - eyeOffset;
                    break;
                case 'up':
                    eye1X = segment.x + eyeOffset; eye1Y = segment.y + eyeOffset;
                    eye2X = segment.x + CELL_SIZE - eyeOffset; eye2Y = segment.y + eyeOffset;
                    break;
                case 'down':
                    eye1X = segment.x + eyeOffset; eye1Y = segment.y + CELL_SIZE - eyeOffset;
                    eye2X = segment.x + CELL_SIZE - eyeOffset; eye2Y = segment.y + CELL_SIZE - eyeOffset;
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
    ctx.arc(food.x + CELL_SIZE / 2, food.y + CELL_SIZE / 2, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}

function moveSnake() {
    if (!isGameRunning || isPaused || awaitingMathAnswer) return;

    let head = { x: snake[0].x, y: snake[0].y };

    switch (direction) {
        case 'up':
            head.y -= CELL_SIZE;
            break;
        case 'down':
            head.y += CELL_SIZE;
            break;
        case 'left':
            head.x -= CELL_SIZE;
            break;
        case 'right':
            head.x += CELL_SIZE;
            break;
    }

    if (head.x < 0) {
        head.x = CANVAS_SIZE - CELL_SIZE;
    } else if (head.x >= CANVAS_SIZE) {
        head.x = 0;
    }
    if (head.y < 0) {
        head.y = CANVAS_SIZE - CELL_SIZE;
    } else if (head.y >= CANVAS_SIZE) {
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
    do {
        newFoodPos = {
            x: Math.floor(Math.random() * (CANVAS_SIZE / CELL_SIZE)) * CELL_SIZE,
            y: Math.floor(Math.random() * (CANVAS_SIZE / CELL_SIZE)) * CELL_SIZE
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
    startGameBtn.style.display = 'none';
    pauseGameBtn.style.display = 'none';
    resetGameBtn.style.display = 'inline-block';
    difficultyPanel.style.display = 'none';
    operationSelectionPanel.style.display = 'none';
    cheatSheetModal.style.display = 'none';
    canvas.style.display = 'block';
    scoreDisplay.parentElement.style.display = 'flex';
    if (highScoreContainer) {
        highScoreContainer.style.display = 'flex';
    }
    gameInterval = setInterval(moveSnake, GAME_SPEED);
    messageArea.style.display = 'none';
}

function pauseGame() {
    if (!isGameRunning) return;

    if (isPaused) {
        resumeGame();
        return;
    }

    if (timeLeftForMath > 10 || score < 1) {
        let currentMessage = `Pause is only available when time left is 10s or less and you have points to fuel it. Current time left: ${timeLeftForMath}s, Current points: ${score}.`;
        setMessage(currentMessage);
        return;
    }

    isPaused = true;
    clearInterval(gameInterval);
    clearInterval(mathTimerInterval);
    score = Math.max(0, score - 1);
    scoreDisplay.textContent = score;
    
    pauseTimeLeft = 20;
    setMessage(`Game Paused. 1 point deducted. Resuming in ${pauseTimeLeft}s. Pause fuel: ${score} points`);
    
    pauseCountdownInterval = setInterval(() => {
        pauseTimeLeft--;
        setMessage(`Game Paused. 1 point deducted. Resuming in ${pauseTimeLeft}s. Pause fuel: ${score} points`);
        
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
        gameInterval = setInterval(moveSnake, GAME_SPEED);
    }
    if (awaitingMathAnswer) {
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

    mathChallengeArea.style.display = 'block';
    customKeyboard.style.display = 'flex';
    canvas.style.display = 'none';
    scoreDisplay.parentElement.style.display = 'none';
    if (highScoreContainer) {
        highScoreContainer.style.display = 'none';
    }
    pauseGameBtn.style.display = 'none';

    let allowDecimalInput = false;

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
        case 'binary-decimal':
            generateBinaryToDecimalProblem();
            break;
        case 'decimal-binary':
            generateDecimalToBinaryProblem();
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

    timeLeftForMath = initialTimeForCurrentChallenge;
    timerDisplay.textContent = `Time left: ${timeLeftForMath}s`;
    
    lastProblemText = mathProblemDisplay.textContent;
    lastCorrectAnswerDisplay = (selectedOperationType === 'decimal-binary' || selectedOperationType === 'binary-decimal') ? correctMathAnswer : parseFloat(correctMathAnswer.toFixed(2));

    startMathTimer();
    setMessage('Answer the problem to proceed!');
}

function startMathTimer() {
    clearInterval(mathTimerInterval);
    mathTimerInterval = setInterval(() => {
        timeLeftForMath--;
        timerDisplay.textContent = `Time left: ${timeLeftForMath}s`;

        if (timeLeftForMath <= 10 && !isPaused && score > 0) {
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
    const userAnswerRaw = mathAnswerInput.value.trim();
    let userAnswer;

    if (userAnswerRaw === '') {
        setMessage('Please enter an answer!');
        mathAnswerInput.value = '';
        mathAnswerInput.focus();
        return;
    }

    if (selectedOperationType === 'decimal-binary') {
        userAnswer = userAnswerRaw;
        if (!/^[01]+$/.test(userAnswer)) {
            setMessage('For Binary conversion, please enter only 0s and 1s!');
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
    
    const isCorrect = (selectedOperationType === 'decimal-binary') ?
                        userAnswer === correctMathAnswer :
                        userAnswer === parseFloat(correctMathAnswer.toFixed(2));

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

        setMessage(`Correct! +${pointsEarned} points.`);
        awaitingMathAnswer = false;
        clearInterval(mathTimerInterval);
        mathChallengeArea.style.display = 'none';
        customKeyboard.style.display = 'none';
        canvas.style.display = 'block';
        scoreDisplay.parentElement.style.display = 'flex';
        if (highScoreContainer) {
            highScoreContainer.style.display = 'flex';
        }
        pauseGameBtn.style.display = 'none';

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

    if (selectedOperationType === 'decimal-binary') {
        if (value === 'clear') {
            mathAnswerInput.value = '';
        } else if (value === 'backspace') {
            mathAnswerInput.value = mathAnswerInput.value.slice(0, -1);
        } else if (value === '0' || value === '1') {
            mathAnswerInput.value += value;
        }
    } else {
        if (value === 'clear') {
            mathAnswerInput.value = '';
        } else if (value === 'backspace') {
            mathAnswerInput.value = mathAnswerInput.value.slice(0, -1);
        } else if (value === '.') {
            const isDecimalAllowed = mathAnswerInput.getAttribute('data-allow-decimal') === 'true';
            if (!mathAnswerInput.value.includes('.') && isDecimalAllowed) {
                mathAnswerInput.value += value;
            }
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
        } else {
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
    checkAndEnableStartGame();
});

closeCheatSheetBtn.addEventListener('click', () => {
    cheatSheetModal.style.display = 'none';
    startGame();
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
    if (currentDifficulty && selectedOperationType && highScoreContainer) {
        highScoreContainer.style.display = 'flex';
    } else if (highScoreContainer) {
        highScoreContainer.style.display = 'none';
    }
}

function generateCheatSheetContent(operationType, difficulty) {
    let content = '';
    const difficultyText = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

    switch (operationType) {
        case 'arithmetic':
            content = `
                <h3>Decimal Arithmetic</h3>
                <p>Solve problems using addition, subtraction, multiplication, and division.</p>
                <div class="formula-example">
                    <p class="example"><b>Example:</b> $15 \\div 3 = ?$</p>
                    <p class="solution"><b>Solution:</b> $15 \\div 3 = 5$</p>
                </div>
            `;
            break;
        case 'exponentiation':
            content = `
                <h3>Exponentiation (xⁿ)</h3>
                <p>Multiply a number by itself a certain number of times.</p>
                <div class="formula-example">
                    <p class="example"><b>Example:</b> $4^3 = ?$</p>
                    <p class="solution"><b>Solution:</b> $4 \\times 4 \\times 4 = 64$</p>
                </div>
            `;
            break;
        case 'modulus':
            content = `
                <h3>Modulus (X mod Y)</h3>
                <p>Find the remainder after dividing one number by another.</p>
                <div class="formula-example">
                    <p class="example"><b>Example:</b> $17 \\text{ mod } 5 = ?$</p>
                    <p class="solution"><b>Solution:</b> $17 \\div 5 = 3$ with a remainder of $2$. So, $17 \\text{ mod } 5 = 2$</p>
                </div>
            `;
            break;
        case 'absolute-value':
            content = `
                <h3>Absolute Value (|x|)</h3>
                <p>The absolute value is how far a number is from zero, always a positive value.</p>
                <div class="formula-example">
                    <p class="example"><b>Example:</b> $|-7| = ?$</p>
                    <p class="solution"><b>Solution:</b> The distance of $-7$ from $0$ is $7$. So, $|-7| = 7$</p>
                </div>
            `;
            break;
        case 'binary-decimal':
            content = `
                <h3>Binary to Decimal</h3>
                <p>Convert a binary number (using only 0s and 1s) to its regular decimal number.</p>
                <div class="formula-example">
                    <p class="example"><b>Example:</b> Convert $1011_2$ to decimal</p>
                    <p class="solution"><b>Solution:</b> $(1 \\times 2^3) + (0 \\times 2^2) + (1 \\times 2^1) + (1 \\times 2^0) = 8 + 0 + 2 + 1 = 11$</p>
                </div>
            `;
            break;
        case 'decimal-binary':
            content = `
                <h3>Decimal to Binary</h3>
                <p>Convert a regular decimal number to its binary equivalent (using only 0s and 1s).</p>
                <div class="formula-example">
                    <p class="example"><b>Example:</b> Convert $13_{10}$ to binary</p>
                    <p class="solution"><b>Solution:</b><br>
                        $13 \\div 2 = 6$ R $1$<br>
                        $6 \\div 2 = 3$ R $0$<br>
                        $3 \\div 2 = 1$ R $1$<br>
                        $1 \\div 2 = 0$ R $1$<br>
                        Read remainders bottom-up: $1101_2$</p>
                </div>
            `;
            break;
        case 'linear-equation':
            content = `
                <h3>Solve Linear Equation</h3>
                <p>Find the value of 'x' in an equation like $ax + b = c$.</p>
                <div class="formula-example">
                    <p class="example"><b>Example:</b> Solve for x: $3x + 5 = 14$</p>
                    <p class="solution"><b>Solution:</b><br>
                        $3x = 14 - 5$<br>
                        $3x = 9$<br>
                        $x = 9 \\div 3$<br>
                        $x = 3$</p>
                </div>
            `;
            break;
        case 'arithmetic-mean':
            content = `
                <h3>Arithmetic Mean</h3>
                <p>Calculate the average of a set of numbers.</p>
                <div class="formula-example">
                    <p class="example"><b>Example:</b> Find the mean of $2, 4, 6$</p>
                    <p class="solution"><b>Solution:</b> $\\frac{2 + 4 + 6}{3} = \\frac{12}{3} = 4$</p>
                </div>
            `;
            break;
        case 'standard-deviation':
            content = `
                <h3>Standard Deviation</h3>
                <p>Measures how spread out numbers are from the average.</p>
                <div class="formula-example">
                    <p class="example"><b>Example:</b> Std. Dev. of $1, 2, 3$ (2 dec places)</p>
                    <p class="solution"><b>Solution:</b><br>
                        Mean ($\\mu$) = $(1+2+3)/3 = 2$<br>
                        Differences squared: $(1-2)^2=1, (2-2)^2=0, (3-2)^2=1$<br>
                        Sum of differences squared = $1+0+1=2$<br>
                        Standard Deviation = $\\sqrt{2 \\div 3} \\approx 0.82$</p>
                </div>
            `;
            break;
        case 'evaluating-function':
            content = `
                <h3>Evaluating Function</h3>
                <p>Replace 'x' with a given number in the function and calculate the result.</p>
                <div class="formula-example">
                    <p class="example"><b>Example:</b> Evaluate $f(x) = 2x + 3$ for $x = 4$</p>
                    <p class="solution"><b>Solution:</b><br>
                        $f(4) = 2(4) + 3$<br>
                        $f(4) = 8 + 3$<br>
                        $f(4) = 11$</p>
                </div>
            `;
            break;
        case 'fraction-decimal':
            content = `
                <h3>Fraction to Decimal</h3>
                <p>Convert a fraction to a decimal by dividing the top number (numerator) by the bottom number (denominator).</p>
                <div class="formula-example">
                    <p class="example"><b>Example:</b> Convert $3/4$ to decimal</p>
                    <p class="solution"><b>Solution:</b> $3 \\div 4 = 0.75$</p>
                </div>
            `;
            break;
        case 'simple-interest':
            content = `
                <h3>Simple Interest</h3>
                <p>Calculate the total amount you'll have after earning simple interest.</p>
                <div class="formula-example">
                    <p class="example"><b>Example:</b> P=₱1000, R=5%, T=2 yrs. Simple Interest Total?</p>
                    <p class="solution"><b>Solution:</b><br>
                        Interest ($I$) = $₱1000 \\times (5 \\div 100) \\times 2 = ₱100$<br>
                        Total Amount ($A$) = $₱1000 + ₱100 = ₱1100$</p>
                </div>
            `;
            break;
        case 'compound-interest':
            content = `
                <h3>Compound Interest</h3>
                <p>Calculate the total amount you'll have when interest is earned on both the original amount and accumulated interest.</p>
                <div class="formula-example">
                    <p class="example"><b>Example:</b> P=₱1000, R=5%, T=2 yrs, annually. Comp. Int. Total?</p>
                    <p class="solution"><b>Solution:</b><br>
                        $A = ₱1000(1 + (0.05 \\div 1))^{1 \\times 2}$<br>
                        $A = ₱1000(1.05)^2$<br>
                        $A = ₱1000 \\times 1.1025 = ₱1102.50$</p>
                </div>
            `;
            break;
        default:
            content = `
                <h3>Welcome to SnakeMeetsMath!</h3>
                <p>Select a problem type and difficulty to see specific examples.</p>
                <p>Then, click "Got It! Start Game" to begin your challenge!</p>
            `;
            break;
    }
    cheatSheetContent.innerHTML = content;
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
        if (highScoreContainer) {
            highScoreContainer.style.display = 'flex';
        }
        
        generateCheatSheetContent(selectedOperationType, currentDifficulty);
        cheatSheetModal.style.display = 'flex';
        startGameBtn.style.display = 'none';
    } else {
        startGameBtn.disabled = true;
        if (highScoreContainer) {
            highScoreContainer.style.display = 'none';
        }
        if (!currentDifficulty && !selectedOperationType) {
            setMessage('Welcome! Please choose a **problem type** and **difficulty** to start.');
        } else if (!currentDifficulty) {
            const problemTypeText = selectedOperationType ? document.querySelector(`.operation-btn[data-operation-type="${selectedOperationType}"]`).textContent : 'a problem type';
            setMessage(`Problem type set to **${problemTypeText.toUpperCase()}**. Now choose a **difficulty**.`);
        } else {
            const difficultyText = currentDifficulty ? currentDifficulty.toUpperCase() : 'a difficulty';
            setMessage(`Difficulty set to **${difficultyText}**. Now choose a **problem type**.`);
        }
        cheatSheetModal.style.display = 'none';
        startGameBtn.style.display = 'inline-block';
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

window.onload = function() {
    welcomeModal.style.display = 'flex';
};
