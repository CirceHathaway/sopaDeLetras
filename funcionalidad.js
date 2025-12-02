import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBXOH-m6L0kS-0qVSAAh837R-lVIlFt2ZQ",
  authDomain: "sopa-de-letras-1bb46.firebaseapp.com",
  projectId: "sopa-de-letras-1bb46",
  storageBucket: "sopa-de-letras-1bb46.firebasestorage.app",
  messagingSenderId: "931258212814",
  appId: "1:931258212814:web:456b55dadb16602fb9cb9f"
};

let db;
let auth;
let user;

try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    signInAnonymously(auth).then(u => user = u.user).catch(console.error);
} catch (e) { console.error(e); }

// --- VARIABLES GLOBALES ---
window.showModeSelection = showModeSelection;
window.startMode = startMode;
window.goToMenu = goToMenu;
window.nextLevelWithAnimation = nextLevelWithAnimation;
window.confirmExit = confirmExit;
window.closeConfirm = closeConfirm;
window.saveScore = saveScore;
window.showScoreboard = showScoreboard;
window.solveLevel = solveLevel; 
window.revivePlayer = revivePlayer;

// --- ANIMACIÓN DE FONDO ---
let animInterval;
function startBackgroundAnimation() {
    const container = document.getElementById('background-animation');
    container.innerHTML = ''; 
    const createLetter = () => {
        const letter = document.createElement('div');
        letter.classList.add('falling-letter');
        letter.textContent = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        letter.style.left = Math.random() * 100 + 'vw';
        const duration = Math.random() * 5 + 3;
        letter.style.animationDuration = duration + 's';
        letter.style.fontSize = (Math.random() * 20 + 20) + 'px';
        container.appendChild(letter);
        setTimeout(() => { letter.remove(); }, duration * 1000);
    };
    animInterval = setInterval(createLetter, 400);
}
function stopBackgroundAnimation() {
    clearInterval(animInterval);
    document.getElementById('background-animation').innerHTML = '';
}
startBackgroundAnimation();

// --- DATOS DE NIVELES ---
const gameLevels = [
    { level: 1, size: 8, words: ["SOL", "LUNA", "MAR", "GATO", "PERRO"] },
    { level: 2, size: 9, words: ["MESA", "SILLA", "LAPIZ", "LIBRO", "PAPEL", "CASA"] },
    { level: 3, size: 10, words: ["AMIGO", "FELIZ", "JUGAR", "COMER", "REIR", "SUEÑO", "SALTAR"] },
    { level: 4, size: 11, words: ["BOSQUE", "PLAYA", "MONTAÑA", "CIELO", "TIERRA", "AGUA", "FUEGO", "VIENTO"] },
    { level: 5, size: 12, words: ["PLANETA", "ESTRELLA", "GALAXIA", "COMETA", "ORBITA", "LUNAR", "SOLAR", "ESPACIO", "COSMOS"] },
    { level: 6, size: 13, words: ["CIENCIA", "FISICA", "QUIMICA", "LOGICA", "TEORIA", "ATOMO", "CELULA", "MATERIA", "ENERGIA", "NEURONA"] },
    { level: 7, size: 14, words: ["LIBERTAD", "JUSTICIA", "VALOR", "RESPETO", "HONOR", "VERDAD", "MORAL", "ETICA", "DERECHO", "DEBER", "PAZ"] },
    { level: 8, size: 15, words: ["COMPUTADORA", "ALGORITMO", "INTERNET", "PANTALLA", "TECLADO", "MEMORIA", "SOFTWARE", "HARDWARE", "REDES", "DATOS", "CODIGO", "PIXEL"] },
    { level: 9, size: 16, words: ["FILOSOFIA", "LITERATURA", "HISTORIA", "GEOGRAFIA", "BIOLOGIA", "MATEMATICA", "ARTE", "MUSICA", "PINTURA", "ESCULTURA", "POESIA", "NOVELA", "TEATRO"] },
    { level: 10, size: 17, words: ["EFIMERO", "INEFABLE", "RESILIENCIA", "SEMPITERNO", "ELOCUENCIA", "MELANCOLIA", "SERENDIPIA", "ETEREO", "LIMERENCIA", "ARREBOL", "EPOCA", "SONETO", "ASTRAL", "ETERNO"] }
];

let currentGameMode = 'traditional'; 
let currentLevelIndex = 0;
let grid = [];
let placedWords = []; 
let firstSelection = null;
let timerInterval;
let totalSeconds = 0; 
let levelSeconds = 0; 
let currentRows = 0;
let currentCols = 0;
let isDragging = false;
let hasRevived = false; 
const MAX_VISIBLE_WORDS = 11;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration, vol = 0.05) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function showModeSelection() {
    showScreen('mode-screen');
}

function startMode(mode) {
    currentGameMode = mode;
    currentLevelIndex = 0; 
    totalSeconds = 0;
    hasRevived = false; 
    showScreen('game-screen');
    stopBackgroundAnimation();
    initLevel();
}

function goToMenu() {
    stopTimer();
    document.getElementById('confirm-modal').classList.add('hidden');
    showScreen('menu-screen');
    startBackgroundAnimation();
}

function showScreen(id) {
    document.querySelectorAll('body > div[id$="-screen"]').forEach(div => div.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function confirmExit() { document.getElementById('confirm-modal').classList.remove('hidden'); }
function closeConfirm() { document.getElementById('confirm-modal').classList.add('hidden'); }

function initLevel() {
    const levelData = gameLevels[currentLevelIndex];
    currentCols = levelData.size;
    currentRows = (levelData.level >= 5) ? 11 : levelData.size;
    
    document.getElementById('level-indicator').textContent = `Nivel ${levelData.level}/10`;
    document.getElementById('status-msg').textContent = "Encuentra las palabras";
    
    stopTimer();
    if (currentGameMode === 'elimination') {
        levelSeconds = levelData.words.length * 12; 
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            levelSeconds--;
            totalSeconds++; 
            updateTimerDisplay();
            if (levelSeconds <= 0) gameOver();
        }, 1000);
    } else {
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            totalSeconds++;
            updateTimerDisplay();
        }, 1000);
    }

    placedWords = [];
    firstSelection = null;
    isDragging = false;

    let success = false;
    let attempts = 0;
    while(!success && attempts < 50) {
        grid = Array(currentRows).fill(null).map(() => Array(currentCols).fill(''));
        placedWords = [];
        success = true;
        for (let word of levelData.words) {
            if (!placeWord(word, currentRows, currentCols)) {
                success = false; break;
            }
        }
        attempts++;
    }

    fillEmptySpaces(currentRows, currentCols);
    renderGrid(currentRows, currentCols);
    placedWords.forEach((pw, i) => pw.rendered = i < MAX_VISIBLE_WORDS);
    renderWordList();
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('timer');
    if (currentGameMode === 'elimination') {
        const mins = Math.floor(levelSeconds / 60).toString().padStart(2, '0');
        const secs = (levelSeconds % 60).toString().padStart(2, '0');
        timerEl.textContent = `${mins}:${secs}`;
        if (levelSeconds <= 10) timerEl.classList.add('timer-danger');
        else timerEl.classList.remove('timer-danger');
    } else {
        const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const secs = (totalSeconds % 60).toString().padStart(2, '0');
        timerEl.textContent = `${mins}:${secs}`;
        timerEl.classList.remove('timer-danger');
    }
    const tmins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const tsecs = (totalSeconds % 60).toString().padStart(2, '0');
    document.getElementById('level-stats').textContent = `Tiempo Total: ${tmins}:${tsecs}`;
}

function gameOver() {
    stopTimer();
    const reviveContainer = document.getElementById('revive-container');
    if (!hasRevived) {
        reviveContainer.style.display = 'flex'; // Flex para centrar
    } else {
        reviveContainer.style.display = 'none';
        document.querySelector('#game-over-screen h2').textContent = "Game Over";
    }
    showScreen('game-over-screen');
    playTone(150, 'sawtooth', 0.5); 
}

function revivePlayer() {
    hasRevived = true;
    levelSeconds += 30; 
    showScreen('game-screen');
    timerInterval = setInterval(() => {
        levelSeconds--;
        totalSeconds++;
        updateTimerDisplay();
        if (levelSeconds <= 0) gameOver();
    }, 1000);
}

function placeWord(word, rows, cols) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
        const dir = Math.floor(Math.random() * 3); 
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        if (canPlace(word, row, col, dir, rows, cols)) {
            let coords = [];
            for (let i = 0; i < word.length; i++) {
                let r, c;
                if (dir === 0) { r = row; c = col + i; }
                else if (dir === 1) { r = row + i; c = col; }
                else if (dir === 2) { r = row + i; c = col + i; }
                grid[r][c] = word[i];
                coords.push({ r, c });
            }
            placedWords.push({ word: word, found: false, coords: coords, rendered: false });
            placed = true;
        }
        attempts++;
    }
    return placed;
}

function canPlace(word, row, col, dir, rows, cols) {
    if (dir === 0 && col + word.length > cols) return false;
    if (dir === 1 && row + word.length > rows) return false;
    if (dir === 2 && (row + word.length > rows || col + word.length > cols)) return false;
    for (let i = 0; i < word.length; i++) {
        let existing;
        if (dir === 0) existing = grid[row][col + i];
        else if (dir === 1) existing = grid[row + i][col];
        else if (dir === 2) existing = grid[row + i][col + i];
        if (existing !== '' && existing !== word[i]) return false;
    }
    return true;
}

function fillEmptySpaces(rows, cols) {
    const letters = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === '') grid[r][c] = letters.charAt(Math.floor(Math.random() * letters.length));
        }
    }
}

function renderGrid(rows, cols) {
    const gridEl = document.getElementById('grid');
    gridEl.innerHTML = '';
    const gap = 5;
    const availableVmin = 65; 
    const divisor = rows; 
    const cellSize = `calc((${availableVmin}vmin - ${divisor * gap}px) / ${divisor})`;
    
    gridEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize})`;
    gridEl.style.gridTemplateRows = `repeat(${rows}, ${cellSize})`;
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = grid[r][c];
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.style.fontSize = `calc(${cellSize} * 0.55)`;
            
            cell.addEventListener('mousedown', (e) => handleStart(r, c, cell, e));
            cell.addEventListener('touchstart', (e) => handleStart(r, c, cell, e));
            cell.addEventListener('mouseenter', (e) => handleMove(r, c, cell));
            cell.addEventListener('touchmove', (e) => handleTouchMove(e));
            cell.addEventListener('mouseup', () => handleEnd(r, c, cell));
            
            gridEl.appendChild(cell);
        }
    }
}

function renderWordList() {
    const listEl = document.getElementById('word-list');
    listEl.innerHTML = '';
    placedWords.forEach(obj => {
        if (obj.rendered) {
            const li = document.createElement('li');
            li.textContent = obj.word;
            li.id = 'word-' + obj.word;
            listEl.appendChild(li);
        }
    });
}

function handleStart(r, c, cellEl, e) {
    if(e.cancelable) e.preventDefault();
    playTone(300, 'sine', 0.05);
    if (!firstSelection) {
        firstSelection = { r, c, el: cellEl };
        cellEl.classList.add('selected');
        isDragging = true;
    } else {
        if (firstSelection.r === r && firstSelection.c === c) {
            isDragging = true;
        } else {
            checkWordAttempt(firstSelection, { r, c });
            clearSelectionVisuals(); 
            firstSelection = null;
            isDragging = false;
        }
    }
}

function handleMove(r, c, cellEl) {
    if (!isDragging || !firstSelection) return;
    updateDragVisuals(firstSelection, {r, c});
}

function handleTouchMove(e) {
    if (!isDragging || !firstSelection) return;
    e.preventDefault();
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target && target.classList.contains('cell')) {
        const r = parseInt(target.dataset.r);
        const c = parseInt(target.dataset.c);
        updateDragVisuals(firstSelection, {r, c});
    }
}

function handleEnd(r, c, cellEl) {
    if (!isDragging) return;
    isDragging = false;
    if (firstSelection && (firstSelection.r !== r || firstSelection.c !== c)) {
        checkWordAttempt(firstSelection, {r, c});
        clearSelectionVisuals();
        firstSelection = null; 
    } 
}

function handleGlobalMouseUp(e) {
    if (isDragging) {
        isDragging = false;
        const cells = document.querySelectorAll('.cell.selected');
        cells.forEach(c => {
            const r = parseInt(c.dataset.r);
            const col = parseInt(c.dataset.c);
            if (firstSelection && (r !== firstSelection.r || col !== firstSelection.c)) {
                c.classList.remove('selected');
            }
        });
    }
}

function updateDragVisuals(start, end) {
    const allSelected = document.querySelectorAll('.cell.selected');
    allSelected.forEach(el => {
        const r = parseInt(el.dataset.r);
        const c = parseInt(el.dataset.c);
        if (r !== start.r || c !== start.c) el.classList.remove('selected');
    });
    const dRow = end.r - start.r;
    const dCol = end.c - start.c;
    if (dRow === 0 || dCol === 0 || Math.abs(dRow) === Math.abs(dCol)) {
        const steps = Math.max(Math.abs(dRow), Math.abs(dCol));
        const stepR = dRow === 0 ? 0 : dRow / Math.abs(dRow);
        const stepC = dCol === 0 ? 0 : dCol / Math.abs(dCol);
        let r = start.r;
        let c = start.c;
        for(let i=0; i<=steps; i++) {
            const cell = document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
            if (cell) cell.classList.add('selected');
            r += stepR; c += stepC;
        }
    }
}

function clearSelectionVisuals() {
    document.querySelectorAll('.cell.selected').forEach(el => el.classList.remove('selected'));
}

function checkWordAttempt(start, end) {
    const dRow = end.r - start.r;
    const dCol = end.c - start.c;
    if (dRow !== 0 && dCol !== 0 && Math.abs(dRow) !== Math.abs(dCol)) return; 

    const steps = Math.max(Math.abs(dRow), Math.abs(dCol));
    const stepR = dRow === 0 ? 0 : dRow / Math.abs(dRow);
    const stepC = dCol === 0 ? 0 : dCol / Math.abs(dCol);

    let formedWord = "";
    let currR = start.r;
    let currC = start.c;

    for (let i = 0; i <= steps; i++) {
        formedWord += grid[currR][currC];
        currR += stepR;
        currC += stepC;
    }

    const reversedWord = formedWord.split('').reverse().join('');
    const foundObj = placedWords.find(pw => 
        (pw.word === formedWord || pw.word === reversedWord) && !pw.found
    );

    if (foundObj) {
        foundObj.found = true;
        markWordFound(foundObj.coords, foundObj.word); 
        document.getElementById('status-msg').textContent = `¡${foundObj.word} encontrada!`;
        playTone(440, 'sine', 0.1);
        setTimeout(() => playTone(660, 'sine', 0.15), 100);

        if (currentGameMode === 'elimination') {
            levelSeconds += 5; 
            updateTimerDisplay();
        }

        if (placedWords.every(pw => pw.found)) {
            setTimeout(levelComplete, 800);
        }
    }
}

function markWordFound(coords, wordText) {
    coords.forEach((coord, index) => {
        const cell = document.querySelector(`.cell[data-r='${coord.r}'][data-c='${coord.c}']`);
        if(cell) setTimeout(() => cell.classList.add('found'), index * 40);
    });

    const li = document.getElementById('word-' + wordText);
    if (li) {
        li.remove();
        const nextWord = placedWords.find(pw => !pw.rendered && !pw.found);
        if (nextWord) {
            nextWord.rendered = true;
            const ul = document.getElementById('word-list');
            const newLi = document.createElement('li');
            newLi.textContent = nextWord.word;
            newLi.id = 'word-' + nextWord.word;
            newLi.style.animation = "fadeIn 0.5s";
            ul.appendChild(newLi);
        }
    }
}

function levelComplete() {
    stopTimer();
    const titleEl = document.getElementById('level-complete-title');
    const btnNext = document.getElementById('btn-next');
    const finalForm = document.getElementById('final-form');
    
    if(currentLevelIndex === gameLevels.length - 1) {
        titleEl.textContent = "¡INCREIBLE! Has completado el juego.";
        btnNext.classList.add('hidden');
        finalForm.classList.remove('hidden');
    } else {
        titleEl.textContent = "¡Nivel Completado!";
        btnNext.classList.remove('hidden');
        finalForm.classList.add('hidden');
    }

    showScreen('level-complete-screen');
    playTone(400, 'triangle', 0.1);
    setTimeout(() => playTone(500, 'triangle', 0.1), 100);
    setTimeout(() => playTone(600, 'triangle', 0.2), 200);
}

function nextLevelWithAnimation() {
    const btn = document.getElementById('btn-next');
    if(btn.classList.contains('filling')) return;
    btn.classList.add('filling');
    setTimeout(() => {
        btn.classList.remove('filling');
        currentLevelIndex++;
        showScreen('game-screen');
        initLevel();
    }, 1500);
}

function solveLevel() {
    placedWords.forEach(pw => {
        if(!pw.found) {
            pw.found = true;
            markWordFound(pw.coords, pw.word);
        }
    });
    setTimeout(levelComplete, 500);
}

async function saveScore() {
    const name = document.getElementById('player-name-input').value.trim() || "Anónimo";
    const btnSave = document.getElementById('btn-save');
    btnSave.classList.add('btn-loading'); 
    
    let savedToCloud = false;
    if (db && user) {
        try {
            await addDoc(collection(db, 'scores'), { name: name, time: totalSeconds, date: new Date().toISOString(), uid: user.uid });
            savedToCloud = true;
        } catch (e) { console.warn(e); }
    }
    if (!savedToCloud) {
        try {
            const localData = JSON.parse(localStorage.getItem('sopa_scores') || '[]');
            localData.push({ name: name, time: totalSeconds, date: new Date().toISOString(), source: 'local' });
            localStorage.setItem('sopa_scores', JSON.stringify(localData));
        } catch(e) { console.error(e); }
    }
    
    goToMenu();
    setTimeout(() => btnSave.classList.remove('btn-loading'), 500);
}

async function showScoreboard() {
    showScreen('scoreboard-screen');
    const list = document.getElementById('score-list');
    list.innerHTML = '<li class="score-item">Cargando...</li>';
    let scores = [];

    if (db) {
        try {
            const querySnapshot = await getDocs(collection(db, 'scores'));
            querySnapshot.forEach(doc => scores.push(doc.data()));
        } catch (e) { console.warn(e); }
    }
    try {
        const localData = JSON.parse(localStorage.getItem('sopa_scores') || '[]');
        scores = [...scores, ...localData];
    } catch(e) {}

    scores.sort((a, b) => a.time - b.time);
    scores = scores.slice(0, 3);

    list.innerHTML = '';
    if (scores.length === 0) list.innerHTML = '<li class="score-item">Aún no hay récords</li>';
    else {
        scores.forEach((s, index) => {
            const mins = Math.floor(s.time / 60).toString().padStart(2, '0');
            const secs = (s.time % 60).toString().padStart(2, '0');
            const li = document.createElement('li');
            li.className = 'score-item';
            let rankIcon = index === 0 ? '🥇' : (index === 1 ? '🥈' : '🥉');
            li.innerHTML = `<span class="score-rank">${rankIcon}</span><span class="score-name">${s.name}</span><span class="score-time">${mins}:${secs}</span>`;
            list.appendChild(li);
        });
    }
}

// === DETECCIÓN DE DISPOSITIVO Y CARGA DINÁMICA ===
function detectDeviceAndLoad() {
    const width = window.innerWidth;
    
    if (width <= 767) {
        // CELULAR
        import('./celular/funcionalidadC.js').then(module => {
            console.log("Modo CELULAR cargado dinámicamente");
        }).catch(err => console.error("Error cargando móvil:", err));
    } 
    else if (width >= 768 && width <= 1024) {
        // TABLET
        import('./tablet/funcionalidadT.js').then(module => {
            console.log("Modo TABLET cargado dinámicamente");
        }).catch(err => console.error("Error cargando tablet:", err));
    }
    // Escritorio: ya está cargado este archivo
}

// Ejecutar al cargar y al rotar
detectDeviceAndLoad();
window.addEventListener('resize', () => {
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(detectDeviceAndLoad, 300);
});