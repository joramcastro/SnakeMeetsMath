const CANVAS_SIZE = 400;
const CELL_SIZE = 20;
const INITIAL_SNAKE_LENGTH = 1;
const GAME_SPEED = 350;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('high-score');
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

let snake = [];
let food = {};
let direction = 'right';
let score = 0;
let highScore = localStorage.getItem('mathSnakeHighScore') || 0;
let gameInterval;
let isGameRunning = false;
let isPaused = false;
let awaitingMathAnswer = false;
let correctMathAnswer = 0; // Can be number or string (for binary, octal, hex conversions)
let mathTimerInterval;
let timeLeftForMath = 0;
let initialTimeForCurrentChallenge = 0;
let currentDifficulty = 'medium';
let selectedOperationType = 'arithmetic';
let deferredInstallPrompt = null;

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
const minSwipeDistance = 30;

let pauseCountdownInterval = null;
let pauseTimeLeft = 0;

const difficultyTimes = {
    easy: 60,
    medium: 120,
    hard: 180,
    expert: 240
};

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
    highScoreDisplay.textContent = highScore;
    isGameRunning = false;
    isPaused = false;
    awaitingMathAnswer = false;
    mathChallengeArea.style.display = 'none';
    customKeyboard.style.display = 'none';
    gameOverModal.style.display = 'none';
    canvas.style.display = 'none';
    scoreDisplay.parentElement.style.display = 'none';

    clearInterval(gameInterval);
    clearInterval(mathTimerInterval);
    clearInterval(pauseCountdownInterval);

    startGameBtn.style.display = 'inline-block';
    pauseGameBtn.style.display = 'none';
    resetGameBtn.style.display = 'inline-block';
    difficultyPanel.style.display = 'flex';
    operationSelectionPanel.style.display = 'flex';
    messageArea.style.display = 'block';

    generateFood();
    drawGame();
    updateDifficultyAndOperationDisplay();
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
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('mathSnakeHighScore', highScore);
            highScoreDisplay.textContent = highScore;
        }
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
    isGameRunning = true;
    startGameBtn.style.display = 'none';
    pauseGameBtn.style.display = 'inline-block';
    resetGameBtn.style.display = 'inline-block';
    difficultyPanel.style.display = 'none';
    operationSelectionPanel.style.display = 'none'; // Hide operation panel
    canvas.style.display = 'block';
    scoreDisplay.parentElement.style.display = 'flex';
    gameInterval = setInterval(moveSnake, GAME_SPEED);
    messageArea.style.display = 'none';
}

function pauseGame() {
    if (!isGameRunning) return;

    if (isPaused) {
        resumeGame();
        return;
    }

    // Pause is primarily for arithmetic challenges when timer is low.
    const isArithmeticLike = ['arithmetic'].includes(selectedOperationType);
    if (!awaitingMathAnswer || (!isArithmeticLike) || timeLeftForMath > 10) {
        let currentMessage = `The pause button currently works only during Decimal Arithmetic challenges, AND when time left is 10s or less. Current time left: ${timeLeftForMath}s.`;
        if (!isArithmeticLike) {
            currentMessage = `Pause is not available for ${selectedOperationType.replace('-', ' ')} challenges.`;
        }
        setMessage(currentMessage); // Display initial error message
        return;
    }

    if (score < 1) {
        setMessage('A score of at least 1 is required to fuel the pause mechanism. Current points: ' + score);
        return;
    }

    isPaused = true;
    clearInterval(gameInterval);
    clearInterval(mathTimerInterval);
    score = Math.max(0, score - 1);
    scoreDisplay.textContent = score;
    
    // Start real-time pause countdown display in message area
    pauseTimeLeft = 20; // Set initial pause time
    setMessage(`Game Paused. 1 point deducted. Resuming in ${pauseTimeLeft}s. Pause fuel: ${score} points`);
    
    pauseCountdownInterval = setInterval(() => {
        pauseTimeLeft--;
        // Update messageArea with real-time countdown
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
    // Remove specific pause message when resuming
    messageArea.style.display = 'none'; 
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

    startGameBtn.style.display = 'inline-block';
    pauseGameBtn.style.display = 'none';
    resetGameBtn.style.display = 'inline-block';
    difficultyPanel.style.display = 'flex';
    operationSelectionPanel.style.display = 'flex'; // Show operation panel
    messageArea.style.display = 'block';
}

function resetGame() {
    endGame();
    initializeGame();
    setMessage('Game reset. Select difficulty and problem type, then Start Game!');
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

// --- Helper for number system conversions ---
function decToBin(dec, minLength = 0) {
    let bin = (dec >>> 0).toString(2);
    while (bin.length < minLength) {
        bin = '0' + bin;
    }
    return bin;
}

function binToOct(bin) {
    return parseInt(bin, 2).toString(8);
}

function octToBin(oct, minLength = 0) {
    let dec = parseInt(oct, 8);
    let bin = (dec >>> 0).toString(2);
     while (bin.length < minLength) {
        bin = '0' + bin;
    }
    return bin;
}

function decToOct(dec) {
    return dec.toString(8);
}

function octToDec(oct) {
    return parseInt(oct, 8);
}

function binToHex(bin) {
    return parseInt(bin, 2).toString(16).toUpperCase();
}

function decToHex(dec) {
    return dec.toString(16).toUpperCase();
}

function hexToDec(hex) {
    return parseInt(hex, 16);
}

function hexToBin(hex, minLength = 0) {
    let dec = parseInt(hex, 16);
    let bin = (dec >>> 0).toString(2);
     while (bin.length < minLength) {
        bin = '0' + bin;
    }
    return bin;
}

// --- Problem Generation Functions ---

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
    const maxLength = (currentDifficulty === 'easy' ? 15 : // Max decimal value for 4 bits
                      currentDifficulty === 'medium' ? 63 : // Max for 6 bits
                      currentDifficulty === 'hard' ? 255 : // Max for 8 bits
                      1023); // Max for 10 bits

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

// --- New Binary Arithmetic Problem Generators (Binary Output) ---
function generateBinaryArithmeticProblem(operation) {
    let num1Dec, num2Dec;
    let bin1, bin2;
    let answerBin;
    const maxLengthBits = (currentDifficulty === 'easy' ? 4 :
                          currentDifficulty === 'medium' ? 6 :
                          currentDifficulty === 'hard' ? 8 : 10);

    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;

        num1Dec = generateRandomNum(1, Math.pow(2, maxLengthBits) - 1);
        num2Dec = generateRandomNum(1, Math.pow(2, maxLengthBits) - 1);

        // Ensure num1 >= num2 for subtraction to avoid negative results (for simplicity in binary display)
        if (operation === 'subtraction' || operation === '-') {
            if (num1Dec < num2Dec) {
                [num1Dec, num2Dec] = [num2Dec, num1Dec]; // Swap them
            }
        }

        // For division, ensure num1 is a multiple of num2 and num2 is not zero
        if (operation === 'division' || operation === '/') {
            if (num2Dec === 0) continue;
            let tempQuotient = generateRandomNum(1, 5); // Keep quotient small
            num1Dec = num2Dec * tempQuotient;
            if (num1Dec === 0) { continue; } // Avoid 0/X
        }
        
        // Pad binary strings to similar length for cleaner display
        const displayLength = Math.max(bin1 ? bin1.length : 0, bin2 ? bin2.length : 0, Math.floor(maxLengthBits / 2) + 1);
        bin1 = decToBin(num1Dec, displayLength);
        bin2 = decToBin(num2Dec, displayLength);

        let answerDec;
        let opSymbol;
        switch (operation) {
            case 'addition':
            case '+': answerDec = num1Dec + num2Dec; opSymbol = '+'; break;
            case 'subtraction':
            case '-': answerDec = num1Dec - num2Dec; opSymbol = '-'; break;
            case 'multiplication':
            case '*': answerDec = num1Dec * num2Dec; opSymbol = 'x'; break;
            case 'division':
            case '/': answerDec = num1Dec / num2Dec; opSymbol = '÷'; break;
            default: continue; // Should not happen
        }
        answerBin = decToBin(answerDec);

        // Ensure binary answer is not too long or is non-negative for this simplified context
        if (answerBin.length <= maxLengthBits + 2 && answerDec >= 0) { // +2 for slightly longer results
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        bin1 = '101'; bin2 = '011'; opSymbol = '+'; answerBin = '1000'; // Fallback to 5+3=8
        setMessage(`Binary ${operation} fallback. Please continue.`);
    }

    mathProblemDisplay.textContent = `Binary ${bin1} ${opSymbol} ${bin2} = ?`;
    correctMathAnswer = answerBin; // Binary string answer expected
    mathAnswerInput.value = '';
}

// Separate functions for explicit button types
function generateBinaryAdditionProblem() { generateBinaryArithmeticProblem('addition'); }
function generateBinarySubtractionProblem() { generateBinaryArithmeticProblem('subtraction'); }
function generateBinaryMultiplicationProblem() { generateBinaryArithmeticProblem('multiplication'); }
function generateBinaryDivisionProblem() { generateBinaryArithmeticProblem('division'); }


function generateBinaryToOctalProblem() {
    let binaryString;
    let octalAnswer;
    const maxLength = (currentDifficulty === 'easy' ? 6 : // Up to 6 bits (2 octal digits)
                      currentDifficulty === 'medium' ? 9 : // Up to 9 bits (3 octal digits)
                      currentDifficulty === 'hard' ? 12 : // Up to 12 bits (4 octal digits)
                      15); // Up to 15 bits (5 octal digits)

    const MAX_ATTEMPTS = 100;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        binaryString = '';
        let numBits = generateRandomNum(3, maxLength); // Min 3 bits to ensure at least one full octal group
        // Ensure the number of bits is a multiple of 3 for cleaner grouping
        numBits = Math.ceil(numBits / 3) * 3;
        if (numBits === 0) numBits = 3;

        for (let i = 0; i < numBits; i++) {
            binaryString += Math.random() < 0.5 ? '0' : '1';
        }
        if (parseInt(binaryString, 2) === 0) { // Avoid all zeros
            const randomIndex = generateRandomNum(0, binaryString.length - 1);
            binaryString = binaryString.substring(0, randomIndex) + '1' + binaryString.substring(randomIndex + 1);
        }

        octalAnswer = binToOct(binaryString);

        if (octalAnswer.length <= Math.ceil(maxLength / 3) + 1) { // Keep octal answer length reasonable
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        binaryString = '110101'; octalAnswer = '65';
        setMessage('Binary to Octal problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `Convert binary ${binaryString} to octal: ?`;
    correctMathAnswer = octalAnswer;
    mathAnswerInput.value = '';
}

function generateOctalToBinaryProblem() {
    let octalString;
    let binaryAnswer;
    const maxOctalLength = (currentDifficulty === 'easy' ? 2 : // Up to 2 octal digits
                            currentDifficulty === 'medium' ? 3 : // Up to 3 octal digits
                            currentDifficulty === 'hard' ? 4 : // Up to 4 octal digits
                            5); // Up to 5 octal digits

    const MAX_ATTEMPTS = 100;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        octalString = '';
        let firstDigit = generateRandomNum(1, 7); // Ensure first digit is not zero
        octalString += firstDigit.toString();
        for (let i = 1; i < maxOctalLength; i++) {
            octalString += generateRandomNum(0, 7).toString();
        }

        binaryAnswer = octToBin(octalString);

        if (binaryAnswer.length <= maxOctalLength * 3) { // Max 3 bits per octal digit
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        octalString = '75'; binaryAnswer = '111101';
        setMessage('Octal to Binary problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `Convert octal ${octalString} to binary: ?`;
    correctMathAnswer = binaryAnswer;
    mathAnswerInput.value = '';
}

function generateDecimalToOctalProblem() {
    let decimalNum;
    let octalAnswer;
    const maxDecimal = (currentDifficulty === 'easy' ? 63 : // Max for 2 octal digits
                        currentDifficulty === 'medium' ? 511 : // Max for 3 octal digits
                        currentDifficulty === 'hard' ? 4095 : // Max for 4 octal digits
                        32767); // Max for 5 octal digits

    const MAX_ATTEMPTS = 100;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        decimalNum = generateRandomNum(1, maxDecimal);
        octalAnswer = decToOct(decimalNum);

        if (decimalNum > 0) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        decimalNum = 25; octalAnswer = '31';
        setMessage('Decimal to Octal problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `Convert decimal ${decimalNum} to octal: ?`;
    correctMathAnswer = octalAnswer;
    mathAnswerInput.value = '';
}

function generateOctalToDecimalProblem() {
    let octalString;
    let decimalAnswer;
    const maxOctalLength = (currentDifficulty === 'easy' ? 2 :
                            currentDifficulty === 'medium' ? 3 :
                            currentDifficulty === 'hard' ? 4 :
                            5);

    const MAX_ATTEMPTS = 100;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        octalString = '';
        let firstDigit = generateRandomNum(1, 7);
        octalString += firstDigit.toString();
        for (let i = 1; i < maxOctalLength; i++) {
            octalString += generateRandomNum(0, 7).toString();
        }

        decimalAnswer = octToDec(octalString);

        if (decimalAnswer > 0) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        octalString = '31'; decimalAnswer = 25;
        setMessage('Octal to Decimal problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `Convert octal ${octalString} to decimal: ?`;
    correctMathAnswer = decimalAnswer;
    mathAnswerInput.value = '';
}

function generateBinaryToHexadecimalProblem() {
    let binaryString;
    let hexAnswer;
    const maxLength = (currentDifficulty === 'easy' ? 8 : // Up to 8 bits (2 hex digits)
                      currentDifficulty === 'medium' ? 12 : // Up to 12 bits (3 hex digits)
                      currentDifficulty === 'hard' ? 16 : // Up to 16 bits (4 hex digits)
                      20); // Up to 20 bits (5 hex digits)

    const MAX_ATTEMPTS = 100;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        binaryString = '';
        let numBits = generateRandomNum(4, maxLength); // Min 4 bits for at least one hex digit
        numBits = Math.ceil(numBits / 4) * 4; // Ensure multiple of 4
        if (numBits === 0) numBits = 4;

        for (let i = 0; i < numBits; i++) {
            binaryString += Math.random() < 0.5 ? '0' : '1';
        }
        if (parseInt(binaryString, 2) === 0) {
            const randomIndex = generateRandomNum(0, binaryString.length - 1);
            binaryString = binaryString.substring(0, randomIndex) + '1' + binaryString.substring(randomIndex + 1);
        }

        hexAnswer = binToHex(binaryString);

        if (hexAnswer.length <= Math.ceil(maxLength / 4) + 1) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        binaryString = '10101100'; hexAnswer = 'AC';
        setMessage('Binary to Hexadecimal problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `Convert binary ${binaryString} to hexadecimal: ?`;
    correctMathAnswer = hexAnswer;
    mathAnswerInput.value = '';
    setMessage('For Hexadecimal answers (A-F), you may need a physical keyboard. Please type uppercase.');
}

function generateDecimalToHexadecimalProblem() {
    let decimalNum;
    let hexAnswer;
    const maxDecimal = (currentDifficulty === 'easy' ? 255 : // Max for 2 hex digits
                        currentDifficulty === 'medium' ? 4095 : // Max for 3 hex digits
                        currentDifficulty === 'hard' ? 65535 : // Max for 4 hex digits
                        1048575); // Max for 5 hex digits

    const MAX_ATTEMPTS = 100;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        decimalNum = generateRandomNum(1, maxDecimal);
        hexAnswer = decToHex(decimalNum);

        if (decimalNum > 0) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        decimalNum = 172; hexAnswer = 'AC';
        setMessage('Decimal to Hexadecimal problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `Convert decimal ${decimalNum} to hexadecimal: ?`;
    correctMathAnswer = hexAnswer;
    mathAnswerInput.value = '';
    setMessage('For Hexadecimal answers (A-F), you may need a physical keyboard. Please type uppercase.');
}

function generateHexToDecimalProblem() {
    let hexString;
    let decimalAnswer;
    const maxHexLength = (currentDifficulty === 'easy' ? 1 :
                          currentDifficulty === 'medium' ? 2 :
                          currentDifficulty === 'hard' ? 3 :
                          4);

    const hexChars = '0123456789ABCDEF';
    const MAX_ATTEMPTS = 100;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        hexString = '';
        let firstCharIndex = generateRandomNum(1, 15);
        hexString += hexChars[firstCharIndex];
        for (let i = 1; i < maxHexLength; i++) {
            hexString += hexChars[generateRandomNum(0, 15)];
        }

        decimalAnswer = hexToDec(hexString);

        if (decimalAnswer > 0) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        hexString = 'A'; decimalAnswer = 10;
        setMessage('Hexadecimal to Decimal problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `Convert hexadecimal ${hexString} to decimal: ?`;
    correctMathAnswer = decimalAnswer;
    mathAnswerInput.value = '';
    setMessage('For Hexadecimal problem inputs, you may need a physical keyboard for A-F.');
}

function generateHexadecimalToBinaryProblem() {
    let hexString;
    let binaryAnswer;
    const maxHexLength = (currentDifficulty === 'easy' ? 1 :
                          currentDifficulty === 'medium' ? 2 :
                          currentDifficulty === 'hard' ? 3 :
                          4);

    const hexChars = '0123456789ABCDEF';
    const MAX_ATTEMPTS = 100;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        hexString = '';
        let firstCharIndex = generateRandomNum(1, 15);
        hexString += hexChars[firstCharIndex];
        for (let i = 1; i < maxHexLength; i++) {
            hexString += hexChars[generateRandomNum(0, 15)];
        }

        binaryAnswer = hexToBin(hexString);

        if (binaryAnswer.length <= maxHexLength * 4) { // Max 4 bits per hex digit
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        hexString = 'A'; binaryAnswer = '1010';
        setMessage('Hexadecimal to Binary problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `Convert hexadecimal ${hexString} to binary: ?`;
    correctMathAnswer = binaryAnswer;
    mathAnswerInput.value = '';
    setMessage('For Hexadecimal problem inputs, you need to type the hex characters (A-F) with your physical keyboard.');
}


function generateLinearEquationProblem() {
    let a, b, c, x, problemString, answer;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    const getNumForEq = (min, max) => {
        let val = generateRandomNum(min, max);
        if (['medium', 'hard', 'expert'].includes(currentDifficulty) && Math.random() < 0.5) val *= -1;
        return val;
    };

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;

        if (currentDifficulty === 'easy') {
            a = getNumForEq(1, 3);
            b = getNumForEq(1, 5);
            x = getNumForEq(1, 5);
            c = (a * x) + b;
            if (x <= 0) { problemGenerated = false; continue; }
        } else if (currentDifficulty === 'medium') {
            a = getNumForEq(1, 5);
            b = getNumForEq(-10, 10);
            x = getNumForEq(-7, 7);
            c = (a * x) + b;
        } else if (currentDifficulty === 'hard') {
            a = getNumForEq(1, 10);
            b = getNumForEq(-20, 20);
            x = getNumForEq(-10, 10);
            c = (a * x) + b;
        } else {
            a = getNumForEq(1, 15);
            b = getNumForEq(-30, 30);
            x = getNumForEq(-15, 15);
            c = (a * x) + b;
        }

        if (a === 0) { problemGenerated = false; continue; }
        if (Math.abs(c) > 999999 || Math.abs(x) > 99999 || Math.abs(b) > 99999) { problemGenerated = false; continue; }
        if (x % 1 !== 0) { problemGenerated = false; continue; }

        let aStr = a === 1 ? '' : (a === -1 ? '-' : a.toString());
        let bStr = b === 0 ? '' : (b > 0 ? ` + ${b}` : ` - ${Math.abs(b)}`);
        problemString = `${aStr}x${bStr} = ${c}`;
        answer = x;
        problemGenerated = true;
    }

    if (!problemGenerated) {
        problemString = `2x + 3 = 7 (Fallback)`;
        answer = 2;
        setMessage('Linear equation problem generation fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `Solve for x: ${problemString}`;
    correctMathAnswer = Math.round(answer);
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
        } else { // Expert
            numCount = generateRandomNum(4, 5);
            numbers = Array.from({ length: numCount }, () => generateRandomNum(-20, 50));
        }

        const sum = numbers.reduce((acc, curr) => acc + curr, 0);
        answer = sum / numbers.length;

        // Aim for integer or simple decimal answers for mean
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
        } else { // Hard/Expert
            numerator = generateRandomNum(1, 25);
            denominator = generateRandomNum(2, 25);
        }

        if (denominator === 0) continue;
        answer = numerator / denominator;

        const decimalStr = answer.toString();
        // Allow terminating decimals or those with up to a few places.
        // For simplicity, we'll check length.
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
        // Principal in hundreds
        principal = generateRandomNum(1, currentDifficulty === 'easy' ? 5 : currentDifficulty === 'medium' ? 20 : currentDifficulty === 'hard' ? 50 : 100) * 100;
        // Rate as whole percentage
        rate = generateRandomNum(1, currentDifficulty === 'easy' ? 5 : currentDifficulty === 'medium' ? 10 : currentDifficulty === 'hard' ? 15 : 20);
        // Time in years
        time = generateRandomNum(1, currentDifficulty === 'easy' ? 3 : currentDifficulty === 'medium' ? 5 : currentDifficulty === 'hard' ? 7 : 10);

        interest = (principal * rate * time) / 100;
        totalAmount = principal + interest;

        // Ensure integer or 2 decimal places answer
        if (Math.abs(totalAmount) < 1000000 && (totalAmount * 100) % 1 === 0) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        principal = 1000; rate = 5; time = 2; totalAmount = 1100;
        setMessage('Simple Interest fallback. Please continue.');
    }

    mathProblemDisplay.textContent = `P=$${principal}, R=${rate}%, T=${time} yrs. Simple Interest Total?`;
    correctMathAnswer = parseFloat(totalAmount.toFixed(2));
    mathAnswerInput.value = '';
}

function generateCompoundInterestProblem() {
    let principal, rate, time, periods, totalAmount;
    const MAX_ATTEMPTS = 100;
    let attempts = 0;
    let problemGenerated = false;

    const getRate = (min, max) => generateRandomNum(min * 10, max * 10) / 10; // Allow .5 rates
    const getPeriods = (diff) => {
        if (diff === 'easy') return 1; // Annually
        if (diff === 'medium') return Math.random() < 0.5 ? 2 : 4; // Semi or Quarterly
        return Math.random() < 0.5 ? 4 : 12; // Quarterly or Monthly
    };

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        principal = generateRandomNum(1, currentDifficulty === 'easy' ? 5 : currentDifficulty === 'medium' ? 10 : currentDifficulty === 'hard' ? 20 : 50) * 1000; // $1000 - $50000
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

    mathProblemDisplay.textContent = `P=$${principal}, R=${rate}%, T=${time} yrs, ${periodsText}. Comp. Int. Total?`;
    correctMathAnswer = parseFloat(totalAmount.toFixed(2));
    mathAnswerInput.value = '';
}


// --- Main Challenge Logic ---

function startChallenge() {
    awaitingMathAnswer = true;
    clearInterval(gameInterval);

    initialTimeForCurrentChallenge = difficultyTimes[currentDifficulty];

    mathChallengeArea.style.display = 'block';
    customKeyboard.style.display = 'flex';
    canvas.style.display = 'none';
    scoreDisplay.parentElement.style.display = 'none';

    // Determine input format and if decimal input is allowed based on problem type
    let inputFormat = 'decimal'; // 'decimal', 'binary', 'octal', 'hex'
    let allowDecimalInput = false;

    switch (selectedOperationType) {
        case 'arithmetic':
            generateArithmeticProblem();
            pauseGameBtn.style.display = 'inline-block';
            inputFormat = 'decimal';
            break;
        case 'exponentiation':
            generateExponentiationProblem();
            pauseGameBtn.style.display = 'none';
            inputFormat = 'decimal';
            break;
        case 'modulus':
            generateModulusProblem();
            pauseGameBtn.style.display = 'none';
            inputFormat = 'decimal';
            break;
        case 'absolute-value':
            generateAbsoluteValueProblem();
            pauseGameBtn.style.display = 'none';
            inputFormat = 'decimal';
            break;
        case 'binary-decimal': // User inputs binary string, answer is decimal number
            generateBinaryToDecimalProblem();
            pauseGameBtn.style.display = 'none';
            inputFormat = 'binary'; // User types binary
            break;
        case 'decimal-binary': // User inputs binary string, answer is binary string
            generateDecimalToBinaryProblem();
            pauseGameBtn.style.display = 'none';
            inputFormat = 'binary'; // User types binary
            break;
        case 'binary-addition':
        case 'binary-subtraction':
        case 'binary-multiplication':
        case 'binary-division':
            generateBinaryArithmeticProblem(selectedOperationType.split('-')[1]); // Pass operation symbol
            pauseGameBtn.style.display = 'none';
            inputFormat = 'binary'; // User types binary string for answer
            break;
        case 'binary-octal':
            generateBinaryToOctalProblem();
            pauseGameBtn.style.display = 'none';
            inputFormat = 'octal'; // User types octal string
            break;
        case 'octal-binary':
            generateOctalToBinaryProblem();
            pauseGameBtn.style.display = 'none';
            inputFormat = 'octal'; // User types octal string
            break;
        case 'decimal-octal':
            generateDecimalToOctalProblem();
            pauseGameBtn.style.display = 'none';
            inputFormat = 'octal'; // User types octal string
            break;
        case 'octal-decimal':
            generateOctalToDecimalProblem();
            pauseGameBtn.style.display = 'none';
            inputFormat = 'octal'; // User types octal string
            break;
        case 'binary-hex':
            generateBinaryToHexadecimalProblem();
            pauseGameBtn.style.display = 'none';
            inputFormat = 'hex'; // User types hex string
            break;
        case 'decimal-hex':
            generateDecimalToHexadecimalProblem();
            pauseGameBtn.style.display = 'none';
            inputFormat = 'hex'; // User types hex string
            break;
        case 'hex-decimal':
            generateHexToDecimalProblem();
            pauseGameBtn.style.display = 'none';
            inputFormat = 'decimal'; // User types decimal, problem shows Hex input
            break;
        case 'hex-binary':
            generateHexToBinaryProblem();
            pauseGameBtn.style.display = 'none';
            inputFormat = 'hex'; // User types hex string
            break;
        case 'linear-equation': 
            // Re-adding this for completeness based on previous discussions.
            // Ensure generateLinearEquationProblem() is indeed implemented in script.js
            generateLinearEquationProblem(); 
            pauseGameBtn.style.display = 'none';
            inputFormat = 'decimal'; // Linear equation answers are typically decimal integers
            break;
        case 'arithmetic-mean':
            generateArithmeticMeanProblem();
            pauseGameBtn.style.display = 'none';
            allowDecimalInput = true;
            inputFormat = 'decimal';
            break;
        case 'fraction-decimal':
            generateFractionToDecimalProblem();
            pauseGameBtn.style.display = 'none';
            allowDecimalInput = true;
            inputFormat = 'decimal';
            break;
        case 'simple-interest':
            generateSimpleInterestProblem();
            pauseGameBtn.style.display = 'none';
            allowDecimalInput = true;
            inputFormat = 'decimal';
            break;
        case 'compound-interest':
            generateCompoundInterestProblem();
            pauseGameBtn.style.display = 'none';
            allowDecimalInput = true;
            inputFormat = 'decimal';
            break;
        default:
            generateArithmeticProblem();
            pauseGameBtn.style.display = 'inline-block';
            inputFormat = 'decimal';
            setMessage('Unknown problem type selected, defaulting to Decimal Arithmetic.');
    }

    mathAnswerInput.setAttribute('data-input-format', inputFormat);
    mathAnswerInput.setAttribute('data-allow-decimal', allowDecimalInput ? 'true' : 'false');


    timeLeftForMath = initialTimeForCurrentChallenge;
    timerDisplay.textContent = `Time left: ${timeLeftForMath}s`;
    startMathTimer();
    setMessage('Answer the problem to proceed!');
}

function startMathTimer() {
    clearInterval(mathTimerInterval);
    mathTimerInterval = setInterval(() => {
        timeLeftForMath--;
        timerDisplay.textContent = `Time left: ${timeLeftForMath}s`;
        if (timeLeftForMath <= 0) {
            clearInterval(mathTimerInterval);
            setMessage('Time ran out! Game Over.');
            endGame();
        }
    }, 1000);
}

function submitMathAnswer() {
    if (!awaitingMathAnswer) return;

    const inputFormat = mathAnswerInput.getAttribute('data-input-format');
    const isDecimalAllowed = mathAnswerInput.getAttribute('data-allow-decimal') === 'true';
    const userAnswerRaw = mathAnswerInput.value.trim();
    let userAnswer;

    if (userAnswerRaw === '') {
        setMessage('Please enter an answer!');
        mathAnswerInput.value = '';
        mathAnswerInput.focus();
        return;
    }

    let isValidInput = true;

    // Validate input format based on current problem type
    switch (inputFormat) {
        case 'binary':
            if (!/^[01]+$/.test(userAnswerRaw)) {
                isValidInput = false;
                setMessage('Please enter only 0s and 1s for binary answers!');
            }
            userAnswer = userAnswerRaw; // Keep as string for comparison
            break;
        case 'octal':
            if (!/^[0-7]+$/.test(userAnswerRaw)) {
                isValidInput = false;
                setMessage('Please enter only 0-7 for octal answers!');
            }
            userAnswer = userAnswerRaw; // Keep as string for octal comparison
            break;
        case 'hex':
            if (!/^[0-9A-F]+$/i.test(userAnswerRaw)) { // Case-insensitive for validation
                isValidInput = false;
                setMessage('Please enter valid hexadecimal digits (0-9, A-F)!');
            }
            userAnswer = userAnswerRaw.toUpperCase(); // Convert to uppercase for consistent comparison
            break;
        case 'decimal': // Includes standard numbers, floats
        default:
            userAnswer = isDecimalAllowed ? parseFloat(userAnswerRaw) : parseInt(userAnswerRaw);
            if (isNaN(userAnswer)) {
                isValidInput = false;
                setMessage('Please enter a valid number!');
            }
            break;
    }

    if (!isValidInput) {
        mathAnswerInput.value = '';
        mathAnswerInput.focus();
        return;
    }
    
    // Compare based on stored correct answer type and input format
    let isCorrect = false;
    // For string comparisons (binary, octal, hex), direct equality
    // For number comparisons, use toFixed(2) for floating-point accuracy if allowed decimal
    if (inputFormat === 'binary' || inputFormat === 'octal' || inputFormat === 'hex') {
        isCorrect = (userAnswer === correctMathAnswer);
    } else { // 'decimal' format
        isCorrect = (userAnswer === parseFloat(correctMathAnswer.toFixed(2))); 
    }

    if (isCorrect) {
        let pointsEarned = 0;
        const timeTaken = initialTimeForCurrentChallenge - timeLeftForMath;

        if (timeTaken <= 0.25 * initialTimeForCurrentChallenge) {
            pointsEarned = 4;
        } else if (timeTaken <= 0.50 * initialTimeForCurrentChallenge) {
            pointsEarned = 3;
        } else {
            pointsEarned = 2;
        }

        score += pointsEarned;
        scoreDisplay.textContent = score;

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('mathSnakeHighScore', highScore);
            highScoreDisplay.textContent = highScore;
        }

        setMessage(`Correct! +${pointsEarned} points.`);
        awaitingMathAnswer = false;
        clearInterval(mathTimerInterval);
        mathChallengeArea.style.display = 'none';
        customKeyboard.style.display = 'none';
        canvas.style.display = 'block';
        scoreDisplay.parentElement.style.display = 'flex';

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

    const inputFormat = mathAnswerInput.getAttribute('data-input-format');
    const isDecimalAllowed = mathAnswerInput.getAttribute('data-allow-decimal') === 'true';

    // Handle utility keys regardless of input format
    if (value === 'clear') {
        mathAnswerInput.value = '';
        mathAnswerInput.focus();
        return;
    } else if (value === 'backspace') {
        mathAnswerInput.value = mathAnswerInput.value.slice(0, -1);
        mathAnswerInput.focus();
        return;
    }

    // Handle number/symbol keys based on input format
    switch (inputFormat) {
        case 'binary':
            if (value === '0' || value === '1') {
                mathAnswerInput.value += value;
            }
            break;
        case 'octal':
            if (value >= '0' && value <= '7') {
                mathAnswerInput.value += value;
            }
            break;
        case 'hex': // Custom keyboard does NOT have A-F keys
            // Only allow 0-9 from the custom keyboard for hex.
            // A-F must be typed via physical keyboard.
            if (value >= '0' && value <= '9') {
                mathAnswerInput.value += value;
            }
            // Cannot handle A-F from custom keyboard here.
            break;
        case 'decimal':
        default:
            if (value >= '0' && value <= '9') {
                mathAnswerInput.value += value;
            } else if (value === '.') {
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
            }
            break;
    }
    mathAnswerInput.focus();
}

document.addEventListener('keydown', e => {
    if (awaitingMathAnswer) {
        const inputFormat = mathAnswerInput.getAttribute('data-input-format');
        const isDecimalAllowed = mathAnswerInput.getAttribute('data-allow-decimal') === 'true';

        if (e.key === 'Enter') {
            submitMathAnswer();
            e.preventDefault();
            return;
        } else if (e.key === 'Backspace') {
            handleKeyboardInput('backspace');
            e.preventDefault();
            return;
        } else if (e.key === 'Delete') {
            handleKeyboardInput('clear');
            e.preventDefault();
            return;
        }

        // Handle numeric/symbol keys based on input format
        switch (inputFormat) {
            case 'binary':
                if (e.key === '0' || e.key === '1') {
                    handleKeyboardInput(e.key);
                }
                break;
            case 'octal':
                if (e.key >= '0' && e.key <= '7') {
                    handleKeyboardInput(e.key);
                }
                break;
            case 'hex':
                // Allow 0-9, A-F (case-insensitive)
                if ((e.key >= '0' && e.key <= '9') || (e.key >= 'a' && e.key <= 'f') || (e.key >= 'A' && e.key <= 'F')) {
                    // Directly append to input field as handleKeyboardInput doesn't process A-F from value
                    // Also, ensure non-A-F keys from custom keyboard are not double-handled.
                    if (e.key.length === 1) { // Only single characters
                        mathAnswerInput.value += e.key.toUpperCase();
                    }
                }
                break;
            case 'decimal':
            default:
                if (e.key >= '0' && e.key <= '9') {
                    handleKeyboardInput(e.key);
                } else if (e.key === '.') {
                    if (isDecimalAllowed) {
                        handleKeyboardInput(e.key);
                    }
                } else if (e.key === '-') {
                    handleKeyboardInput(e.key);
                }
                break;
        }
        e.preventDefault();
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
    startGame();
});
pauseGameBtn.addEventListener('click', pauseGame);
resetGameBtn.addEventListener('click', resetGame);
submitAnswerBtn.addEventListener('click', submitMathAnswer);
restartGameBtn.addEventListener('click', resetGame);

difficultyButtons.forEach(button => {
    button.addEventListener('click', () => {
        currentDifficulty = button.dataset.difficulty;
        updateDifficultyAndOperationDisplay();
        setMessage(`Difficulty set to ${currentDifficulty.toUpperCase()}. Press "Start Game" to begin.`);
    });
});

operationButtons.forEach(button => {
    button.addEventListener('click', () => {
        selectedOperationType = button.dataset.operationType;
        updateDifficultyAndOperationDisplay();
        setMessage(`Problem type set to ${button.textContent.toUpperCase()}. Press "Start Game" to begin.`);
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
}

function setMessage(msg) {
    messageArea.textContent = msg;
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
    initializeGame();
    updateDifficultyAndOperationDisplay();
    const allDetails = document.querySelectorAll('.operation-selection-panel details');
    allDetails.forEach((detail, index) => {
        if (index === 0) {
            detail.open = true;
        } else {
            detail.open = false;
        }
    });
    setMessage('Welcome! Choose your problem type and difficulty, then press "Start Game" to begin.');
};
