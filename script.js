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
let correctMathAnswer = 0;
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
    operationSelectionPanel.style.display = 'none';
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

    if (!awaitingMathAnswer || (selectedOperationType !== 'arithmetic') || timeLeftForMath > 10) {
        let currentMessage = `The pause button currently works only during Basic Arithmetic challenges, AND when time left is 10s or less. Current time left: ${timeLeftForMath}s.`;
        if (selectedOperationType !== 'arithmetic') {
            currentMessage = `Pause is not available for ${selectedOperationType.replace('-', ' ')} challenges.`;
        }
        setMessage(currentMessage);
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
    setMessage(`Game Paused. 1 point deducted. Pause fuel: ${score} points`);

    pauseTimeLeft = 20;
    pauseGameBtn.textContent = `Resuming in ${pauseTimeLeft}s`;

    pauseCountdownInterval = setInterval(() => {
        pauseTimeLeft--;
        pauseGameBtn.textContent = `Resuming in ${pauseTimeLeft}s`;
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
    pauseGameBtn.textContent = 'Pause';
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
    operationSelectionPanel.style.display = 'flex';
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
        setMessage('Arithmetic problem generation fallback. Please continue.');
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

function generateBinaryToDecimalProblem() {
    let binaryString;
    let decimalAnswer;
    const maxLength = (currentDifficulty === 'easy' ? 4 :
                      currentDifficulty === 'medium' ? 6 :
                      currentDifficulty === 'hard' ? 8 :
                      10);

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

function startChallenge() {
    awaitingMathAnswer = true;
    clearInterval(gameInterval);

    initialTimeForCurrentChallenge = difficultyTimes[currentDifficulty];

    mathChallengeArea.style.display = 'block';
    customKeyboard.style.display = 'flex';
    canvas.style.display = 'none';
    scoreDisplay.parentElement.style.display = 'none';

    switch (selectedOperationType) {
        case 'arithmetic':
            generateArithmeticProblem();
            pauseGameBtn.style.display = 'inline-block';
            break;
        case 'exponentiation':
            generateExponentiationProblem();
            pauseGameBtn.style.display = 'none';
            break;
        case 'modulus':
            generateModulusProblem();
            pauseGameBtn.style.display = 'none';
            break;
        case 'linear-equation':
            generateLinearEquationProblem();
            pauseGameBtn.style.display = 'none';
            break;
        case 'binary-decimal':
            generateBinaryToDecimalProblem();
            pauseGameBtn.style.display = 'none';
            break;
        default:
            generateArithmeticProblem();
            pauseGameBtn.style.display = 'inline-block';
            setMessage('Unknown problem type selected, defaulting to Basic Arithmetic.');
    }

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

    const userAnswer = parseInt(mathAnswerInput.value);

    if (mathAnswerInput.value.trim() === '' || isNaN(userAnswer)) {
        setMessage('Please enter a valid number!');
        mathAnswerInput.value = '';
        mathAnswerInput.focus();
        return;
    }

    if (userAnswer === correctMathAnswer) {
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

    if (value === 'clear') {
        mathAnswerInput.value = '';
    } else if (value === 'backspace') {
        mathAnswerInput.value = mathAnswerInput.value.slice(0, -1);
    } else if (value === '.') {
        if (!mathAnswerInput.value.includes('.') && (selectedOperationType === 'linear-equation')) {
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
        } else if ((e.key >= '0' && e.key <= '9') || e.key === '.' || e.key === '-') {
            if (e.key === '.' && selectedOperationType !== 'linear-equation') {
                return;
            }
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
    setMessage('Welcome! Choose your problem type and difficulty, then press "Start Game" to begin.');
};
