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
const pauseGameBtn = document.getElementById('pause-game-btn');
const resetGameBtn = document.getElementById('reset-game-btn');
const difficultyPanel = document.getElementById('difficulty-panel');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');
const categorySelectionPanel = document.getElementById('category-selection-panel');
const categoryButtons = document.querySelectorAll('.category-btn');
const gameOverModal = document.getElementById('gameOverModal');
const finalScoreDisplay = document.getElementById('finalScore');
const restartGameBtn = document.getElementById('restartGameBtn');
const installButton = document.getElementById('install-button');
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

let selectedChallengeCategory = 'pos-whole-arithmetic';
let currentChallengeMode = 'snake-game';

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

    scoreDisplay.parentElement.style.display = 'flex'; 
    mathAnswerInput.value = '';

    clearInterval(gameInterval);
    clearInterval(mathTimerInterval);
    clearInterval(pauseCountdownInterval);

    selectedChallengeCategory = 'pos-whole-arithmetic';
    currentChallengeMode = 'snake-game';
    pauseGameBtn.style.display = 'none';
    resetGameBtn.style.display = 'inline-block';
    difficultyPanel.style.display = 'flex';
    categorySelectionPanel.style.display = 'block';
    messageArea.style.display = 'block';

    generateFood();
    drawGame();
    updateDifficultyDisplay();
    updateCategoryDisplay();
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
    pauseGameBtn.style.display = 'inline-block';
    resetGameBtn.style.display = 'inline-block';
    difficultyPanel.style.display = 'none';
    categorySelectionPanel.style.display = 'none';
    canvas.style.display = 'block';
    scoreDisplay.parentElement.style.display = 'flex';
    gameInterval = setInterval(moveSnake, GAME_SPEED);
    messageArea.style.display = 'none';

    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
    }
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
    
    selectedChallengeCategory = 'pos-whole-arithmetic';
    currentChallengeMode = 'snake-game';
    pauseGameBtn.style.display = 'none';
    resetGameBtn.style.display = 'inline-block';
    difficultyPanel.style.display = 'flex';
    categorySelectionPanel.style.display = 'block';
    messageArea.style.display = 'block';

    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.documentElement.msExitFullscreen();
    }
}

function resetGame() {
    endGame();
    initializeGame();
    setMessage('Game reset. Select difficulty and a category to start!');
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

function generateRandomNum(min, max, isDecimal = false) {
    if (isDecimal) {
        return parseFloat((Math.random() * (max - min) + min).toFixed(2));
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateFunctionProblem() {
    let a, b, c, x, problemString;
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
}

function generateBinaryToDecimalProblem() {
    let bits;
    switch (currentDifficulty) {
        case 'easy': bits = generateRandomNum(3, 4); break;
        case 'medium': bits = generateRandomNum(5, 6); break;
        case 'hard': bits = generateRandomNum(7, 8); break;
        case 'expert': bits = generateRandomNum(9, 10); break;
    }
    let binaryString = '';
    for (let i = 0; i < bits; i++) {
        binaryString += Math.round(Math.random());
    }
    if (binaryString.startsWith('0') && binaryString.length > 1) binaryString = '1' + binaryString.substring(1);
    if (binaryString === '0') binaryString = '1';

    correctMathAnswer = parseInt(binaryString, 2);
    mathProblemDisplay.textContent = `Convert binary ${binaryString} to decimal: ?`;
}

function generateDecimalToBinaryProblem() {
    let decimalNum;
    switch (currentDifficulty) {
        case 'easy': decimalNum = generateRandomNum(1, 15); break;
        case 'medium': decimalNum = generateRandomNum(16, 63); break;
        case 'hard': decimalNum = generateRandomNum(64, 255); break;
        case 'expert': decimalNum = generateRandomNum(256, 1023); break;
    }
    correctMathAnswer = decimalNum.toString(2);
    mathProblemDisplay.textContent = `Convert decimal ${decimalNum} to binary: ?`;
}

function generateSimpleInterestProblem() {
    const P = generateRandomNum(100, 10000);
    const R = generateRandomNum(1, 10) / 100;
    const T = generateRandomNum(1, 10);
    const I = P * R * T;
    correctMathAnswer = parseFloat(I.toFixed(2));
    mathProblemDisplay.textContent = `Principal: $${P}, Rate: ${R * 100}%, Time: ${T} years. Simple Interest = ?`;
}

function generateCompoundInterestProblem() {
    const P = generateRandomNum(100, 5000);
    const R = generateRandomNum(1, 8) / 100;
    const T = generateRandomNum(1, 5);
    const N = Math.random() < 0.5 ? 1 : 2;
    const A = P * Math.pow((1 + R / N), N * T);
    correctMathAnswer = parseFloat(A.toFixed(2));
    mathProblemDisplay.textContent = `Principal: $${P}, Rate: ${R * 100}%, Time: ${T} years, Compounded: ${N === 1 ? 'Annually' : 'Semi-annually'}. Amount = ?`;
}

function generateArithmeticSequenceProblem() {
    const a1 = generateRandomNum(1, 20);
    const d = generateRandomNum(-5, 5);
    const n = generateRandomNum(5, 15);
    const an = a1 + (n - 1) * d;
    correctMathAnswer = an;
    mathProblemDisplay.textContent = `Arithmetic Sequence: $a_1 = ${a1}$, $d = ${d}$. Find $a_{${n}}$ = ?`;
}

function generateArithmeticMeansProblem() {
    const a1 = generateRandomNum(1, 20);
    const an = generateRandomNum(a1 + 10, a1 + 50);
    const k = generateRandomNum(1, 4);
    const d = (an - a1) / (k + 1);
    if (d % 1 !== 0) {
        generateArithmeticMeansProblem();
        return;
    }
    const meanIndex = generateRandomNum(1, k);
    const meanValue = a1 + meanIndex * d;
    correctMathAnswer = meanValue;
    mathProblemDisplay.textContent = `Arithmetic Means: Between ${a1} and ${an}, find the ${meanIndex}${meanIndex === 1 ? 'st' : meanIndex === 2 ? 'nd' : meanIndex === 3 ? 'rd' : 'th'} arithmetic mean when there are ${k} means = ?`;
}

function generateFractionToDecimalProblem() {
    let numerator, denominator;
    let decimalAnswer;
    const MAX_ATTEMPTS = 100;
    let attempts = 0;

    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        numerator = generateRandomNum(1, 20);
        denominator = generateRandomNum(2, 20);
        decimalAnswer = parseFloat((numerator / denominator).toFixed(4));
        if (decimalAnswer.toString().length <= 8) {
            break;
        }
    }
    correctMathAnswer = decimalAnswer;
    mathProblemDisplay.textContent = `Convert fraction ${numerator}/${denominator} to decimal: ?`;
}

function generateDecimalToFractionProblem() {
    const simpleDecimals = [
        { dec: 0.25, frac: "1/4" }, { dec: 0.5, frac: "1/2" }, { dec: 0.75, frac: "3/4" },
        { dec: 0.125, frac: "1/8" }, { dec: 0.375, frac: "3/8" }, { dec: 0.625, frac: "5/8" }, { dec: 0.875, frac: "7/8" },
        { dec: 0.1, frac: "1/10" }, { dec: 0.2, frac: "1/5" }, { dec: 0.4, frac: "2/5" }, { dec: 0.6, frac: "3/5" }, { dec: 0.8, frac: "4/5" }
    ];
    const problem = simpleDecimals[Math.floor(Math.random() * simpleDecimals.length)];
    correctMathAnswer = problem.frac;
    mathProblemDisplay.textContent = `Convert decimal ${problem.dec} to fraction: ? (e.g., 1/2)`;
}

function generateArithmeticProblem(isDecimal, allowNegatives) {
    const operators = ['+', '-', '*', '/'];
    let op = operators[Math.floor(Math.random() * operators.length)];

    let num1, num2, answer;
    const { min: minVal, max: maxVal } = getDigitRange(currentDifficulty);

    const generateNum = (min, max, isDec, allowNeg) => {
        let val = generateRandomNum(min, max, isDec);
        if (allowNeg && Math.random() < 0.5) val *= -1;
        return val;
    };

    const MAX_ATTEMPTS = 500;
    let attempts = 0;
    let problemGenerated = false;

    while (!problemGenerated && attempts < MAX_ATTEMPTS) {
        attempts++;

        num1 = generateNum(minVal, maxVal, isDecimal, allowNegatives);
        num2 = generateNum(minVal, maxVal, isDecimal, allowNegatives);

        if (isDecimal) {
            num1 = parseFloat(num1.toFixed(2));
            num2 = parseFloat(num2.toFixed(2));
        }

        switch (op) {
            case '+':
                answer = num1 + num2;
                problemGenerated = true;
                break;
            case '-':
                answer = num1 - num2;
                problemGenerated = true;
                break;
            case '*':
                answer = num1 * num2;
                if (Math.abs(answer) > 9999999 || (isDecimal && answer.toString().length > 10)) { problemGenerated = false; continue; }
                problemGenerated = true;
                break;
            case '/':
                if (num2 === 0) { problemGenerated = false; continue; }
                answer = num1 / num2;
                if (!isDecimal && answer % 1 !== 0) { problemGenerated = false; continue; }
                if (Math.abs(answer) > 9999999 || (isDecimal && answer.toString().length > 10)) { problemGenerated = false; continue; }
                problemGenerated = true;
                break;
        }
    }

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
    correctMathAnswer = isDecimal ? parseFloat(answer.toFixed(2)) : Math.round(answer);
}

function binToDec(bin) {
    return parseInt(bin, 2);
}

function decToBin(dec) {
    return dec.toString(2);
}

function generateBinaryAdditionProblem() {
    let num1Dec = generateRandomNum(1, 15);
    let num2Dec = generateRandomNum(1, 15);
    let bin1 = decToBin(num1Dec);
    let bin2 = decToBin(num2Dec);
    let sumDec = num1Dec + num2Dec;
    correctMathAnswer = decToBin(sumDec);
    mathProblemDisplay.textContent = `Binary Addition: ${bin1} + ${bin2} = ?`;
}

function generateBinarySubtractionProblem() {
    let num1Dec = generateRandomNum(5, 20);
    let num2Dec = generateRandomNum(1, 5);
    if (num1Dec < num2Dec) [num1Dec, num2Dec] = [num2Dec, num1Dec];
    let bin1 = decToBin(num1Dec);
    let bin2 = decToBin(num2Dec);
    let diffDec = num1Dec - num2Dec;
    correctMathAnswer = decToBin(diffDec);
    mathProblemDisplay.textContent = `Binary Subtraction: ${bin1} - ${bin2} = ?`;
}

function generateBinaryMultiplicationProblem() {
    let num1Dec = generateRandomNum(1, 7);
    let num2Dec = generateRandomNum(1, 7);
    let bin1 = decToBin(num1Dec);
    let bin2 = decToBin(num2Dec);
    let prodDec = num1Dec * num2Dec;
    correctMathAnswer = decToBin(prodDec);
    mathProblemDisplay.textContent = `Binary Multiplication: ${bin1} x ${bin2} = ?`;
}

function generateBinaryDivisionProblem() {
    let num2Dec = generateRandomNum(1, 5);
    let quotientDec = generateRandomNum(1, 5);
    let num1Dec = num2Dec * quotientDec;
    if (num1Dec === 0) {
        generateBinaryDivisionProblem();
        return;
    }
    let bin1 = decToBin(num1Dec);
    let bin2 = decToBin(num2Dec);
    correctMathAnswer = decToBin(quotientDec);
    mathProblemDisplay.textContent = `Binary Division: ${bin1} ÷ ${bin2} = ?`;
}

function generateExponentiationProblem() {
    let base, exponent;
    if (currentDifficulty === 'easy') {
        base = generateRandomNum(2, 5);
        exponent = generateRandomNum(2, 3);
    } else if (currentDifficulty === 'medium') {
        base = generateRandomNum(2, 7);
        exponent = generateRandomNum(2, 4);
    } else {
        base = generateRandomNum(2, 10);
        exponent = generateRandomNum(2, 5);
    }
    correctMathAnswer = Math.pow(base, exponent);
    mathProblemDisplay.textContent = `${base}^${exponent} = ?`;
}

function generateRootsProblem() {
    let num, root, answer;
    if (currentDifficulty === 'easy') {
        root = 2;
        answer = generateRandomNum(2, 5);
    } else if (currentDifficulty === 'medium') {
        root = Math.random() < 0.5 ? 2 : 3;
        answer = generateRandomNum(2, 7);
    } else {
        root = generateRandomNum(2, 4);
        answer = generateRandomNum(2, 10);
    }
    num = Math.pow(answer, root);
    correctMathAnswer = answer;
    mathProblemDisplay.textContent = `Find the ${root}${root === 2 ? 'nd' : root === 3 ? 'rd' : 'th'} root of ${num} = ?`;
}

function generateModulusProblem() {
    let num1, num2;
    if (currentDifficulty === 'easy') {
        num1 = generateRandomNum(10, 50);
        num2 = generateRandomNum(2, 9);
    } else {
        num1 = generateRandomNum(50, 200);
        num2 = generateRandomNum(10, 25);
    }
    correctMathAnswer = num1 % num2;
    mathProblemDisplay.textContent = `${num1} mod ${num2} = ?`;
}

function generateSolvingForUnknownsProblem() {
    let a, b, c, x, problemString;
    const { min: minVal, max: maxVal } = getDigitRange(currentDifficulty);
    const getNum = (min, max) => generateRandomNum(min, max);

    a = getNum(1, 10);
    b = getNum(1, 20);
    x = getNum(1, 10);
    c = a * x + b;

    problemString = `${a}x + ${b} = ${c}`;
    correctMathAnswer = x;
    mathProblemDisplay.textContent = `Solve for x: ${problemString}`;
}

function generateFactoringProblem() {
    let p = generateRandomNum(1, 5);
    let q = generateRandomNum(1, 5);
    if (Math.random() < 0.5) p *= -1;
    if (Math.random() < 0.5) q *= -1;

    let b = p + q;
    let c = p * q;
    let problemString = `x^2 ${b > 0 ? '+' : '-'} ${Math.abs(b)}x ${c > 0 ? '+' : '-'} ${Math.abs(c)}`;
    correctMathAnswer = `(x${p > 0 ? '+' : ''}${p})(x${q > 0 ? '+' : ''}${q})`;
    mathProblemDisplay.textContent = `Factor: ${problemString} = ? (e.g., (x+a)(x+b))`;
}

function generateExpandingProblem() {
    let a = generateRandomNum(1, 5);
    let b = generateRandomNum(1, 5);
    if (Math.random() < 0.5) a *= -1;
    if (Math.random() < 0.5) b *= -1;

    let problemString = `(x${a > 0 ? '+' : ''}${a})(x${b > 0 ? '+' : ''}${b})`;
    let x_coeff = a + b;
    let constant = a * b;
    let answer = `x^2 ${x_coeff > 0 ? '+' : '-'} ${Math.abs(x_coeff)}x ${constant > 0 ? '+' : '-'} ${Math.abs(constant)}`;
    correctMathAnswer = answer;
    mathProblemDisplay.textContent = `Expand: ${problemString} = ?`;
}

function generateMeanProblem() {
    let count = generateRandomNum(3, 5);
    let numbers = [];
    let sum = 0;
    for (let i = 0; i < count; i++) {
        let num = generateRandomNum(1, 20);
        numbers.push(num);
        sum += num;
    }
    correctMathAnswer = parseFloat((sum / count).toFixed(2));
    mathProblemDisplay.textContent = `Find the mean of [${numbers.join(', ')}] = ?`;
}

function generateMedianProblem() {
    let count = generateRandomNum(3, 7);
    let numbers = [];
    for (let i = 0; i < count; i++) {
        numbers.push(generateRandomNum(1, 30));
    }
    numbers.sort((a, b) => a - b);
    let median;
    if (count % 2 === 1) {
        median = numbers[Math.floor(count / 2)];
    } else {
        median = (numbers[count / 2 - 1] + numbers[count / 2]) / 2;
    }
    correctMathAnswer = median;
    mathProblemDisplay.textContent = `Find the median of [${numbers.join(', ')}] = ?`;
}

function generateModeProblem() {
    let numbers = [];
    let numCount = generateRandomNum(5, 10);
    let possibleNums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (let i = 0; i < numCount; i++) {
        numbers.push(possibleNums[generateRandomNum(0, possibleNums.length - 1)]);
    }
    
    let counts = {};
    numbers.forEach(num => {
        counts[num] = (counts[num] || 0) + 1;
    });

    let mode = [];
    let maxCount = 0;
    for (let num in counts) {
        if (counts[num] > maxCount) {
            mode = [parseInt(num)];
            maxCount = counts[num];
        } else if (counts[num] === maxCount) {
            mode.push(parseInt(num));
        }
    }
    mode.sort((a, b) => a - b);
    correctMathAnswer = mode.join(', ');
    mathProblemDisplay.textContent = `Find the mode of [${numbers.join(', ')}] = ? (comma-separated if multiple)`;
}

function generateRangeProblem() {
    let count = generateRandomNum(4, 8);
    let numbers = [];
    for (let i = 0; i < count; i++) {
        numbers.push(generateRandomNum(1, 50));
    }
    let min = Math.min(...numbers);
    let max = Math.max(...numbers);
    correctMathAnswer = max - min;
    mathProblemDisplay.textContent = `Find the range of [${numbers.join(', ')}] = ?`;
}

function generateDifferentiationProblem() {
    let coeff = generateRandomNum(1, 10);
    let power = generateRandomNum(1, 5);
    let problemString;
    let answerString;

    if (power === 1) {
        problemString = `${coeff}x`;
        answerString = `${coeff}`;
    } else {
        problemString = `${coeff}x^${power}`;
        answerString = `${coeff * power}x^${power - 1}`;
    }
    correctMathAnswer = answerString;
    mathProblemDisplay.textContent = `Differentiate: ${problemString} = ?`;
}

function generateIntegrationProblem() {
    let coeff = generateRandomNum(1, 10);
    let power = generateRandomNum(0, 4);
    let problemString;
    let answerString;

    if (power === 0) {
        problemString = `${coeff}`;
        answerString = `${coeff}x + C`;
    } else {
        problemString = `${coeff}x^${power}`;
        answerString = `${coeff}/${power + 1}x^${power + 1} + C`;
    }
    correctMathAnswer = answerString;
    mathProblemDisplay.textContent = `Integrate: ${problemString} dx = ? (e.g., 2x^2 + C)`;
}

function generateSet(size, maxVal) {
    let set = new Set();
    while (set.size < size) {
        set.add(generateRandomNum(1, maxVal));
    }
    return Array.from(set).sort((a, b) => a - b);
}

function formatSet(arr) {
    return `{${arr.join(', ')}}`;
}

function generateSetUnionProblem() {
    let setA = generateSet(generateRandomNum(2, 4), 10);
    let setB = generateSet(generateRandomNum(2, 4), 10);
    let union = new Set([...setA, ...setB]);
    correctMathAnswer = formatSet(Array.from(union).sort((a, b) => a - b));
    mathProblemDisplay.textContent = `A = ${formatSet(setA)}, B = ${formatSet(setB)}. Find A U B = ?`;
}

function generateSetIntersectionProblem() {
    let setA = generateSet(generateRandomNum(3, 5), 10);
    let setB = generateSet(generateRandomNum(3, 5), 10);
    let intersection = setA.filter(value => setB.includes(value));
    correctMathAnswer = formatSet(intersection.sort((a, b) => a - b));
    mathProblemDisplay.textContent = `A = ${formatSet(setA)}, B = ${formatSet(setB)}. Find A ∩ B = ?`;
}

function generateSetComplementProblem() {
    let universalSet = generateSet(generateRandomNum(6, 10), 15);
    let setA = generateSet(generateRandomNum(2, 5), 15);
    setA = setA.filter(val => universalSet.includes(val));
    let complement = universalSet.filter(value => !setA.includes(value));
    correctMathAnswer = formatSet(complement.sort((a, b) => a - b));
    mathProblemDisplay.textContent = `U = ${formatSet(universalSet)}, A = ${formatSet(setA)}. Find A' (complement of A) = ?`;
}

function generateSetDifferenceProblem() {
    let setA = generateSet(generateRandomNum(3, 5), 10);
    let setB = generateSet(generateRandomNum(3, 5), 10);
    let difference = setA.filter(value => !setB.includes(value));
    correctMathAnswer = formatSet(difference.sort((a, b) => a - b));
    mathProblemDisplay.textContent = `A = ${formatSet(setA)}, B = ${formatSet(setB)}. Find A - B = ?`;
}

function generateLogicANDProblem() {
    let A = Math.random() < 0.5;
    let B = Math.random() < 0.5;
    correctMathAnswer = (A && B) ? 'True' : 'False';
    mathProblemDisplay.textContent = `If A is ${A} and B is ${B}, what is A AND B?`;
}

function generateLogicORProblem() {
    let A = Math.random() < 0.5;
    let B = Math.random() < 0.5;
    correctMathAnswer = (A || B) ? 'True' : 'False';
    mathProblemDisplay.textContent = `If A is ${A} and B is ${B}, what is A OR B?`;
}

function generateLogicNOTProblem() {
    let A = Math.random() < 0.5;
    correctMathAnswer = (!A) ? 'True' : 'False';
    mathProblemDisplay.textContent = `If A is ${A}, what is NOT A?`;
}

function generateLogicXORProblem() {
    let A = Math.random() < 0.5;
    let B = Math.random() < 0.5;
    correctMathAnswer = (A !== B) ? 'True' : 'False';
    mathProblemDisplay.textContent = `If A is ${A} and B is ${B}, what is A XOR B?`;
}

function startChallenge() {
    awaitingMathAnswer = true;
    clearInterval(gameInterval);
    initialTimeForCurrentChallenge = difficultyTimes[currentDifficulty];
    
    mathChallengeArea.style.display = 'block';
    customKeyboard.style.display = 'flex';
    canvas.style.display = 'none';
    mathAnswerInput.value = '';
    
    switch (selectedChallengeCategory) {
        case 'function-evaluation':
            generateFunctionProblem();
            break;
        case 'binary-to-decimal':
            generateBinaryToDecimalProblem();
            break;
        case 'decimal-to-binary':
            generateDecimalToBinaryProblem();
            break;
        case 'simple-interest':
            generateSimpleInterestProblem();
            break;
        case 'compound-interest':
            generateCompoundInterestProblem();
            break;
        case 'arithmetic-sequence':
            generateArithmeticSequenceProblem();
            break;
        case 'arithmetic-means':
            generateArithmeticMeansProblem();
            break;
        case 'fraction-to-decimal':
            generateFractionToDecimalProblem();
            break;
        case 'decimal-to-fraction':
            generateDecimalToFractionProblem();
            break;
        case 'pos-whole-arithmetic':
            generateArithmeticProblem(false, false);
            break;
        case 'neg-whole-arithmetic':
            generateArithmeticProblem(false, true);
            break;
        case 'pos-decimal-arithmetic':
            generateArithmeticProblem(true, false);
            break;
        case 'neg-decimal-arithmetic':
            generateArithmeticProblem(true, true);
            break;
        case 'binary-addition':
            generateBinaryAdditionProblem();
            break;
        case 'binary-subtraction':
            generateBinarySubtractionProblem();
            break;
        case 'binary-multiplication':
            generateBinaryMultiplicationProblem();
            break;
        case 'binary-division':
            generateBinaryDivisionProblem();
            break;
        case 'exponentiation':
            generateExponentiationProblem();
            break;
        case 'roots':
            generateRootsProblem();
            break;
        case 'modulus':
            generateModulusProblem();
            break;
        case 'solve-unknown':
            generateSolvingForUnknownsProblem();
            break;
        case 'factoring':
            generateFactoringProblem();
            break;
        case 'expanding':
            generateExpandingProblem();
            break;
        case 'mean':
            generateMeanProblem();
            break;
        case 'median':
            generateMedianProblem();
            break;
        case 'mode':
            generateModeProblem();
            break;
        case 'range':
            generateRangeProblem();
            break;
        case 'differentiation':
            generateDifferentiationProblem();
            break;
        case 'integration':
            generateIntegrationProblem();
            break;
        case 'set-union':
            generateSetUnionProblem();
            break;
        case 'set-intersection':
            generateSetIntersectionProblem();
            break;
        case 'set-complement':
            generateSetComplementProblem();
            break;
        case 'set-difference':
            generateSetDifferenceProblem();
            break;
        case 'logic-and':
            generateLogicANDProblem();
            break;
        case 'logic-or':
            generateLogicORProblem();
            break;
        case 'logic-not':
            generateLogicNOTProblem();
            break;
        case 'logic-xor':
            generateLogicXORProblem();
            break;
        default:
            generateArithmeticProblem(false, false);
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

    let userAnswerRaw = mathAnswerInput.value.trim();
    let isCorrect = false;

    if (typeof correctMathAnswer === 'number') {
        const userAnswerNum = parseFloat(userAnswerRaw);
        if (!isNaN(userAnswerNum)) {
            const tolerance = 0.01;
            isCorrect = Math.abs(userAnswerNum - correctMathAnswer) < tolerance;
        }
    } else if (typeof correctMathAnswer === 'string') {
        isCorrect = userAnswerRaw.toLowerCase() === correctMathAnswer.toLowerCase();
    }

    if (userAnswerRaw === '' || (!isCorrect && typeof correctMathAnswer === 'number' && isNaN(parseFloat(userAnswerRaw)))) {
        setMessage('Please enter a valid answer!');
        mathAnswerInput.value = '';
        mathAnswerInput.focus();
        return;
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

        if (currentChallengeMode === 'snake-game') {
            gameInterval = setInterval(moveSnake, GAME_SPEED);
            generateFood();
            drawGame();
        }
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

pauseGameBtn.addEventListener('click', pauseGame);
resetGameBtn.addEventListener('click', resetGame);
submitAnswerBtn.addEventListener('click', submitMathAnswer);
restartGameBtn.addEventListener('click', resetGame);

difficultyButtons.forEach(button => {
    button.addEventListener('click', () => {
        currentDifficulty = button.dataset.difficulty;
        updateDifficultyDisplay();
        setMessage(`Difficulty set to ${currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}. Select a category to start!`);
    });
});

categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
        selectedChallengeCategory = button.dataset.category;
        updateCategoryDisplay();
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

function updateCategoryDisplay() {
    categoryButtons.forEach(btn => {
        if (btn.dataset.category === selectedChallengeCategory) {
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
    setMessage('Welcome! Select difficulty and a category to start!');
};
