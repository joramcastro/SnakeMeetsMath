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
const evaluateFunctionBtn = document.getElementById('evaluate-function-btn');
const fractionChallengeBtn = document.getElementById('fraction-challenge-btn');
const customKeyboard = document.getElementById('custom-keyboard');
const messageArea = document.getElementById('message-area');

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
let deferredInstallPrompt = null;

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
const minSwipeDistance = 30;

let pauseCountdownInterval = null;
let pauseTimeLeft = 0;

let selectedChallengeType = 'math';
let currentChallengeMode = 'snake-game';

const difficultyTimes = {
    easy: 60,
    medium: 120,
    hard: 180,
    expert: 240
};
const FUNCTION_CHALLENGE_TIME = 240;
const FRACTION_CHALLENGE_TIME = 240;

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

    selectedChallengeType = 'math';
    currentChallengeMode = 'snake-game';
    startGameBtn.style.display = 'inline-block';
    evaluateFunctionBtn.style.display = 'inline-block';
    fractionChallengeBtn.style.display = 'inline-block';
    pauseGameBtn.style.display = 'none';
    resetGameBtn.style.display = 'inline-block';
    difficultyPanel.style.display = 'flex';
    messageArea.style.display = 'block';

    generateFood();
    drawGame();
    updateDifficultyDisplay();
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
            let eyeX, eyeY;
            const eyeOffset = CELL_SIZE / 4;
            const eyeRadius = CELL_SIZE / 8;

            switch (direction) {
                case 'right':
                    eyeX = segment.x + CELL_SIZE - eyeOffset;
                    eyeY = segment.y + eyeOffset;
                    break;
                case 'left':
                    eyeX = segment.x + eyeOffset;
                    eyeY = segment.y + eyeOffset;
                    break;
                case 'up':
                    eyeX = segment.x + eyeOffset;
                    eyeY = segment.y + eyeOffset;
                    break;
                case 'down':
                    eyeX = segment.x + eyeOffset;
                    eyeY = segment.y + CELL_SIZE - eyeOffset;
                    break;
            }
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(eyeX + (direction === 'up' || direction === 'down' ? CELL_SIZE / 2 - eyeOffset * 2 : 0),
                    eyeY + (direction === 'left' || direction === 'right' ? CELL_SIZE / 2 - eyeOffset * 2 : 0),
                    eyeRadius, 0, Math.PI * 2);
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
    currentChallengeMode = 'snake-game';
    startGameBtn.style.display = 'none';
    evaluateFunctionBtn.style.display = 'none';
    fractionChallengeBtn.style.display = 'none';
    pauseGameBtn.style.display = 'inline-block';
    resetGameBtn.style.display = 'inline-block';
    difficultyPanel.style.display = 'none';
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

    if (score < 1) {
        setMessage('A score of at least 1 is required to fuel the pause mechanism. Current points: ' + score);
        return;
    }

    if (!awaitingMathAnswer || timeLeftForMath > 10) {
        setMessage(`The pause button only works when a math challenge is active AND time left is 10s or less. Current time left: ${timeLeftForMath}s.`);
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
    gameInterval = setInterval(moveSnake, GAME_SPEED);
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
    
    selectedChallengeType = 'math';
    currentChallengeMode = 'snake-game';
    startGameBtn.style.display = 'inline-block';
    evaluateFunctionBtn.style.display = 'inline-block';
    fractionChallengeBtn.style.display = 'inline-block';
    pauseGameBtn.style.display = 'none';
    resetGameBtn.style.display = 'inline-block';
    difficultyPanel.style.display = 'flex';
    messageArea.style.display = 'block';
}

function resetGame() {
    endGame();
    initializeGame();
    setMessage('Game reset. Select difficulty and Start Game or Evaluate Function!');
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

function generateMathProblem() {
    const operators = ['+', '-', '*', '/'];
    let op = operators[Math.floor(Math.random() * operators.length)];

    let num1, num2, answer;
    const { min: minVal, max: maxVal } = getDigitRange(currentDifficulty);

    const generateRandomNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
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
        
        if (num1 === 0) num1 = (Math.random() < 0.5 ? 1 : -1) * generateRandomNum(1, Math.max(9,maxVal));
        if (num2 === 0) num2 = (Math.random() < 0.5 ? 1 : -1) * generateRandomNum(1, Math.max(9,maxVal));


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
                } else if (currentDifficulty === 'medium') {
                    num1 = generateRandomNum(minVal, maxVal);
                    num2 = generateRandomNum(1, 9);
                    if (allowNegatives && Math.random() < 0.5) num1 *= -1;
                    if (allowNegatives && Math.random() < 0.5) num2 *= -1;
                } else if (currentDifficulty === 'hard') {
                    num1 = generateRandomNum(minVal, maxVal);
                    num2 = generateRandomNum(1, 9);
                    if (allowNegatives && Math.random() < 0.5) num1 *= -1;
                    if (allowNegatives && Math.random() < 0.5) num2 *= -1;
                } else {
                    num1 = generateRandomNum(minVal, maxVal);
                    num2 = generateRandomNum(1, 9);
                    if (allowNegatives && Math.random() < 0.5) num1 *= -1;
                    if (allowNegatives && Math.random() < 0.5) num2 *= -1;
                }
                answer = num1 * num2;
                if (Math.abs(answer) > 9999999) { problemGenerated = false; continue; }
                problemGenerated = true;
                break;

            case '/':
                let quotientCandidate;
                let divisorCandidate;
                
                if (currentDifficulty === 'easy') {
                    divisorCandidate = generateRandomNum(1, 9);
                    quotientCandidate = generateRandomNum(1, 9);
                } else if (currentDifficulty === 'medium') {
                    divisorCandidate = generateRandomNum(10, 99);
                    quotientCandidate = generateRandomNum(2, 9);
                } else if (currentDifficulty === 'hard') {
                    divisorCandidate = generateRandomNum(100, 999);
                    quotientCandidate = generateRandomNum(2, 9);
                } else {
                    divisorCandidate = generateRandomNum(1000, 9999);
                    quotientCandidate = generateRandomNum(2, 9);
                }

                if (divisorCandidate === 0) divisorCandidate = 1;
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
                
                if (num2 === 0) { problemGenerated = false; continue; }
                if (Math.abs(answer) > 9999999) { problemGenerated = false; continue; }
                if (Math.abs(num1) < minVal || Math.abs(num1) > maxVal) { problemGenerated = false; continue; }
                if (num1 === 0 && currentDifficulty !== 'easy') { problemGenerated = false; continue; }
                problemGenerated = true;
                break;
        }

    } while (!problemGenerated && attempts < MAX_ATTEMPTS);

    if (!problemGenerated) {
        num1 = 5; num2 = 3; op = '+'; answer = 8;
        setMessage('Problem generation fallback. Please continue.');
    }

    let displayOp = op;
    if (op === '*') {
        displayOp = 'x';
    } else if (op === '/') {
        displayOp = '÷';
    }

    mathProblemDisplay.textContent = `${num1} ${displayOp} ${num2} = ?`;
    correctMathAnswer = Math.round(answer);
    mathAnswerInput.value = '';
}

function gcd(a, b) {
    if (b === 0) return a;
    return gcd(b, a % b);
}

function simplifyFraction(numerator, denominator) {
    const commonDivisor = gcd(Math.abs(numerator), Math.abs(denominator));
    return {
        numerator: numerator / commonDivisor,
        denominator: denominator / commonDivisor
    };
}

function generateFractionProblem() {
    const operators = ['+', '-', '*', '/'];
    let op = operators[Math.floor(Math.random() * operators.length)];

    let num1, den1, num2, den2, resultNum, resultDen;
    let problemString;
    const MAX_ATTEMPTS = 500;
    let attempts = 0;
    let problemGenerated = false;

    const allowNegatives = ['medium', 'hard', 'expert'].includes(currentDifficulty);
    const getNum = (min, max) => {
        let val = Math.floor(Math.random() * (max - min + 1)) + min;
        if (allowNegatives && Math.random() < 0.5) val *= -1;
        return val;
    };

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;
        
        let nRangeMin = 1, nRangeMax = 9;
        let dRangeMin = 1, dRangeMax = 9;

        if (currentDifficulty === 'medium') { nRangeMax = 99; dRangeMin = 2; dRangeMax = 9; }
        else if (currentDifficulty === 'hard') { nRangeMax = 999; dRangeMin = 2; dRangeMax = 99; }
        else if (currentDifficulty === 'expert') { nRangeMax = 9999; dRangeMin = 2; dRangeMax = 999; }

        num1 = getNum(1, nRangeMax);
        den1 = getNum(dRangeMin, dRangeMax);
        num2 = getNum(1, nRangeMax);
        den2 = getNum(dRangeMin, dRangeMax);

        if (den1 === 0) den1 = 1;
        if (den2 === 0) den2 = 1;

        let frac1 = simplifyFraction(num1, den1);
        let frac2 = simplifyFraction(num2, den2);
        num1 = frac1.numerator; den1 = frac1.denominator;
        num2 = frac2.numerator; den2 = frac2.denominator;

        if (num1 === 0) num1 = (Math.random() < 0.5 ? 1 : -1) * generateRandomNum(1, nRangeMax);
        if (num2 === 0) num2 = (Math.random() < 0.5 ? 1 : -1) * generateRandomNum(1, nRangeMax);

        switch (op) {
            case '+':
                resultNum = num1 * den2 + num2 * den1;
                resultDen = den1 * den2;
                break;
            case '-':
                resultNum = num1 * den2 - num2 * den1;
                resultDen = den1 * den2;
                break;
            case '*':
                resultNum = num1 * num2;
                resultDen = den1 * den2;
                break;
            case '/':
                if (num2 === 0) {
                    problemGenerated = false; continue;
                }
                resultNum = num1 * den2;
                resultDen = den1 * num2;
                break;
        }

        let simplified = simplifyFraction(resultNum, resultDen);
        resultNum = simplified.numerator;
        resultDen = simplified.denominator;

        if (resultDen === 0) {
            problemGenerated = false; continue;
        }

        if (Math.abs(resultNum) > 99999999 || Math.abs(resultDen) > 9999999) {
            problemGenerated = false; continue;
        }
        
        correctMathAnswer = resultNum / resultDen; 
        
        if (Math.abs(correctMathAnswer - Math.round(correctMathAnswer)) < 0.0001) {
            correctMathAnswer = Math.round(correctMathAnswer);
        } else {
            correctMathAnswer = parseFloat(correctMathAnswer.toFixed(2));
            if (correctMathAnswer % 1 !== 0 && !mathAnswerInput.value.includes('.')) {
            }
        }

        let displayOp = op;
        if (op === '*') displayOp = 'x';
        else if (op === '/') displayOp = '÷';
        
        problemString = `${num1}/${den1} ${displayOp} ${num2}/${den2} = ?`;
        
        problemGenerated = true;

    }

    if (!problemGenerated) {
        problemString = `1/2 + 1/2 = ? (Fallback)`;
        correctMathAnswer = 1;
        setMessage('Fraction problem generation fallback.');
    }

    mathProblemDisplay.textContent = problemString;
    mathAnswerInput.value = '';
}


function generateFunctionProblem() {
    let a, b, c, x, answer;
    let problemString;
    const generateRandomNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;
    let problemGenerated = false;

    const allowNegatives = ['medium', 'hard', 'expert'].includes(currentDifficulty);
    const getNum = (min, max) => {
        let val = generateRandomNum(min, max);
        if (allowNegatives && Math.random() < 0.5) val *= -1;
        return val;
    };

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;

        const isQuadratic = Math.random() < 0.5;

        let aRangeMin, aRangeMax, bRangeMin, bRangeMax, cRangeMin, cRangeMax, xRangeMin, xRangeMax;

        if (currentDifficulty === 'easy') {
            aRangeMin = 1; aRangeMax = 3;
            bRangeMin = 1; bRangeMax = 5;
            cRangeMin = 1; cRangeMax = 5;
            xRangeMin = 1; xRangeMax = 3;
        } else if (currentDifficulty === 'medium') {
            aRangeMin = 1; aRangeMax = 5;
            bRangeMin = 1; bRangeMax = 10;
            cRangeMin = 1; cRangeMax = 10;
            xRangeMin = 1; xRangeMax = 5;
        } else if (currentDifficulty === 'hard') {
            aRangeMin = 1; aRangeMax = 10;
            bRangeMin = 1; bRangeMax = 20;
            cRangeMin = 1; cRangeMax = 20;
            xRangeMin = 1; xRangeMax = 10;
        } else {
            aRangeMin = 1; aRangeMax = 15;
            bRangeMin = 1; bRangeMax = 30;
            cRangeMin = 1; cRangeMax = 30;
            xRangeMin = 1; xRangeMax = 15;
        }

        if (isQuadratic) {
            a = getNum(aRangeMin, aRangeMax);
            b = getNum(bRangeMin, bRangeMax);
            c = getNum(cRangeMin, cRangeMax);
            x = getNum(xRangeMin, xRangeMax);
            
            if (Math.abs(a * x * x) > 10000000 || Math.abs(b * x) > 10000000) { continue; }

            answer = (a * x * x) + (b * x) + c;
            let aStr = a === 1 ? '' : (a === -1 ? '-' : a.toString());
            let bStr = b === 0 ? '' : (b > 0 ? ` + ${b}x` : ` - ${Math.abs(b)}x`);
            let cStr = c === 0 ? '' : (c > 0 ? ` + ${c}` : ` - ${Math.abs(c)}`);

            problemString = `f(x) = ${aStr}x^2${bStr}${cStr}, x = ${x}`;
        } else {
            a = getNum(aRangeMin, aRangeMax * 2);
            b = getNum(bRangeMin, bRangeMax * 2);
            x = getNum(xRangeMin, xRangeMax * 2);

            if (Math.abs(a * x) > 10000000) { continue; }

            answer = (a * x) + b;
            let aStr = a === 1 ? '' : (a === -1 ? '-' : a.toString());
            let bStr = b === 0 ? '' : (b > 0 ? ` + ${b}` : ` - ${Math.abs(b)}`);

            problemString = `f(x) = ${aStr}x${bStr}, x = ${x}`;
        }

        if (Math.abs(answer) < 100000000 && Math.abs(answer) > -100000000) {
            problemGenerated = true;
        }
    }

    if (!problemGenerated) {
        problemString = `f(x) = 10x + 5, x = 1 (Fallback)`;
        answer = 15;
        setMessage('Function problem generation fallback.');
    }

    mathProblemDisplay.textContent = `Evaluate: ${problemString}`;
    correctMathAnswer = Math.round(answer);
    mathAnswerInput.value = '';
}


function startChallenge() {
    console.log('Starting Challenge. Type:', selectedChallengeType);
    console.log('Canvas before hiding:', canvas.style.display);
    console.log('Score parent before hiding:', scoreDisplay.parentElement.style.display);
    
    awaitingMathAnswer = true;
    clearInterval(gameInterval);
    initialTimeForCurrentChallenge = timeLeftForMath;
    
    mathChallengeArea.style.display = 'block';
    customKeyboard.style.display = 'flex';
    canvas.style.display = 'none';
    
    if (selectedChallengeType === 'math') {
        generateMathProblem();
        initialTimeForCurrentChallenge = difficultyTimes[currentDifficulty];
        timeLeftForMath = initialTimeForCurrentChallenge;
        pauseGameBtn.style.display = 'inline-block';
    } else if (selectedChallengeType === 'function') {
        generateFunctionProblem();
        initialTimeForCurrentChallenge = FUNCTION_CHALLENGE_TIME;
        timeLeftForMath = initialTimeForCurrentChallenge;
        pauseGameBtn.style.display = 'none';
    } else if (selectedChallengeType === 'fraction') {
        generateFractionProblem();
        initialTimeForCurrentChallenge = FRACTION_CHALLENGE_TIME;
        timeLeftForMath = initialTimeForCurrentChallenge;
        pauseGameBtn.style.display = 'none';
    }
    
    timerDisplay.textContent = `Time left: ${timeLeftForMath}s`;
    startMathTimer();
    setMessage('Answer the problem to proceed!');
    console.log('Canvas after hiding:', canvas.style.display);
    console.log('Score parent after hiding:', scoreDisplay.parentElement.style.display);
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
    console.log('Submit button clicked.');
    if (!awaitingMathAnswer) {
        console.log('Not awaiting math answer.');
        return;
    }

    const userAnswer = parseFloat(mathAnswerInput.value);
    console.log('User Answer:', mathAnswerInput.value, 'Parsed:', userAnswer, 'Correct Answer:', correctMathAnswer);

    if (mathAnswerInput.value.trim() === '' || isNaN(userAnswer)) {
        setMessage('Please enter a valid number!');
        mathAnswerInput.value = '';
        mathAnswerInput.focus();
        console.log('Invalid input.');
        return;
    }

    const tolerance = 0.001; 
    if (Math.abs(userAnswer - correctMathAnswer) < tolerance) {
        let pointsEarned = 0;
        const timeTaken = initialTimeForCurrentChallenge - timeLeftForMath;
        console.log('Time taken:', timeTaken, 'Initial Time:', initialTimeForCurrentChallenge);

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
            console.log('High Score updated:', highScore);
        }

        setMessage(`Correct! +${pointsEarned} points.`);
        awaitingMathAnswer = false;
        clearInterval(mathTimerInterval);
        mathChallengeArea.style.display = 'none';
        customKeyboard.style.display = 'none';
        canvas.style.display = 'block';
        
        if (currentChallengeMode === 'snake-game') {
            gameInterval = setInterval(moveSnake, GAME_SPEED);
            generateFood();
            drawGame();
            console.log('Snake game resumed after correct answer.');
        }
    } else {
        setMessage('Incorrect answer! Try again.');
        mathAnswerInput.value = '';
        mathAnswerInput.focus();
        console.log('Incorrect answer. User must try again.');
    }
}

function handleKeyboardInput(value) {
    if (!awaitingMathAnswer) return;

    if (value === 'clear') {
        mathAnswerInput.value = '';
    } else if (value === 'backspace') {
        mathAnswerInput.value = mathAnswerInput.value.slice(0, -1);
    } else if (value === '.') {
        if (!mathAnswerInput.value.includes('.')) {
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
        } else if (e.key >= '0' && e.key <= '9' || e.key === '.' || e.key === '-') {
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
    selectedChallengeType = 'math';
    startGame();
});
pauseGameBtn.addEventListener('click', pauseGame);
resetGameBtn.addEventListener('click', resetGame);
submitAnswerBtn.addEventListener('click', submitMathAnswer);
restartGameBtn.addEventListener('click', resetGame);
evaluateFunctionBtn.addEventListener('click', () => {
    selectedChallengeType = 'function';
    startGame();
});
fractionChallengeBtn.addEventListener('click', () => {
    selectedChallengeType = 'fraction';
    startGame();
});

difficultyButtons.forEach(button => {
    button.addEventListener('click', () => {
        currentDifficulty = button.dataset.difficulty;
        updateDifficultyDisplay();
        selectedChallengeType = 'math';
        startGame();
    });
});

function updateDifficultyDisplay() {
    difficultyButtons.forEach(btn => {
        if (btn.dataset.difficulty === currentDifficulty) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function setMessage(msg) {
    messageArea.textContent = msg;
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
    setMessage('Welcome! Select difficulty and press "Start Game" or "Evaluate Function".');
};
