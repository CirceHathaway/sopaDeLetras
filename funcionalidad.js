import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

// VARIABLE PARA GUARDAR EL DICCIONARIO
let wordDictionary = null;

// FUNCIÓN PARA CARGAR EL JSON
async function loadDictionary() {
    try {
        const response = await fetch('./palabras.json');
        const data = await response.json();
        wordDictionary = data.palabras;
        console.log("Diccionario cargado correctamente");
    } catch (e) {
        console.error("No se pudo cargar palabras.json", e);
    }
}
// Llamamos a la carga apenas inicia el script
loadDictionary();

// Globales
window.showModeSelection = showModeSelection;
window.startMode = startMode;
window.goToMenu = goToMenu;
window.nextLevelWithAnimation = nextLevelWithAnimation;
window.confirmExit = confirmExit;
window.closeConfirm = closeConfirm;
window.saveScore = saveScore;
window.showScoreboard = showScoreboard; 
window.revivePlayer = revivePlayer;
window.shareGame = shareGame;

// --- DETECCIÓN Y CONSTANTES ---
function isMobile() { return window.innerWidth < 600; }
function isTablet() { return window.innerWidth >= 600 && window.innerWidth <= 1024; }

function getMaxVisibleWords() {
    if (isMobile() || isTablet()) return 8;
    return 11; 
}

let animInterval;
function startBackgroundAnimation() {
    const container = document.getElementById('background-animation');
    if (!container) return;
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
    const container = document.getElementById('background-animation');
    if (container) container.innerHTML = '';
}
startBackgroundAnimation();

// Ahora "count" define cuántas palabras sacar al azar
const gameLevels = [
    { level: 1, size: 8,  difficulty: 'facil', count: 5 },
    { level: 2, size: 9,  difficulty: 'facil', count: 6 },
    { level: 3, size: 10, difficulty: 'facil', count: 7 },
    { level: 4, size: 11, difficulty: 'medio', count: 8 },
    { level: 5, size: 12, difficulty: 'medio', count: 9 },
    { level: 6, size: 13, difficulty: 'medio', count: 10 },
    { level: 7, size: 14, difficulty: 'medio', count: 10 },
    { level: 8, size: 15, difficulty: 'dificil', count: 12 },
    { level: 9, size: 16, difficulty: 'dificil', count: 13 },
    { level: 10, size: 17, difficulty: 'dificil', count: 14 }
];

// --- VARIABLES GLOBALES ---
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

// COLORES PARA REMARCAR LAS PALABRAS:
const highlightColors = [
    "#ff8000ff", // 
    "#4ECDC4", // Turquesa
    "#FBC531", // Amarillo mostaza
    "#9B59B6", // Violeta
    "#E84393", // Rosa fuerte
    "#00a8ff", // Azul cielo
    "#e1b12c", // Naranja
    "#4cd137",  // Verde lima
    "#f1a2d7ff",
    "#2532a4ff",
    "#68f5aeff",
    "#b4ff06ff",
    "#ffd500ff",
    "#623c03ff",
];
let currentColorIndex = 0;

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
    totalSeconds = 0; 
    hasRevived = false; 

    // --- NUEVO: REINICIAMOS LA MEMORIA DE PALABRAS ---
    localStorage.removeItem('sopa_used_words');

    // --- LÓGICA MODO SAO ---
    if (currentGameMode === 'sao') {
        // Intentamos recuperar el nivel guardado (por defecto nivel 1, que es índice 0)
        const savedLevel = localStorage.getItem('sopa_sao_level');
        currentLevelIndex = savedLevel ? parseInt(savedLevel) : 0;
    } else {
        currentLevelIndex = 0; 
    }

    showScreen('game-screen'); 
    
    if (isMobile()) stopBackgroundAnimation(); 
    if (isTablet()) stopBackgroundAnimation(); 
    
    initLevel(); 
}

function goToMenu() { 
    stopTimer(); 
    document.getElementById('confirm-modal').classList.add('hidden'); 
    showScreen('menu-screen'); 
    // Reactivar animación
    startBackgroundAnimation(); 
}

function showScreen(id) { document.querySelectorAll('body > div[id$="-screen"]').forEach(div => div.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); }
function confirmExit() { document.getElementById('confirm-modal').classList.remove('hidden'); }
function closeConfirm() { document.getElementById('confirm-modal').classList.add('hidden'); }

function initLevel() {
    if (!wordDictionary) { setTimeout(initLevel, 200); return; }

    let levelData;
    let difficulty;

    // --- LÓGICA DIFERENCIADA PARA SAO ---
    if (currentGameMode === 'sao') {
        difficulty = getSaoDifficulty(currentLevelIndex);
        levelData = {
            level: currentLevelIndex + 1,
            difficulty: difficulty,
            count: 14 // SIEMPRE 14 palabras
        };
        // Ocultar timer en modo SAO
        document.getElementById('timer').style.visibility = 'hidden';
        document.getElementById('level-indicator').textContent = `Piso ${levelData.level}/100`;
    } else {
        // Lógica normal
        levelData = gameLevels[currentLevelIndex];
        difficulty = levelData.difficulty;
        document.getElementById('timer').style.visibility = 'visible';
        document.getElementById('level-indicator').textContent = `Nivel ${levelData.level}/10`;
    }

    currentColorIndex = 0; 

    // --- LÓGICA ANTI-REPETICIÓN (Igual que antes) ---
    let usedWordsHistory = [];
    try { usedWordsHistory = JSON.parse(localStorage.getItem('sopa_used_words')) || []; } catch (e) {}

    const fullPool = wordDictionary[difficulty]; // Usamos la dificultad calculada
    let availableWords = fullPool.filter(word => !usedWordsHistory.includes(word));

    if (availableWords.length < levelData.count) {
        usedWordsHistory = usedWordsHistory.filter(w => !fullPool.includes(w));
        availableWords = [...fullPool];
    }

    const shuffled = [...availableWords];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    let selectedWords = shuffled.slice(0, levelData.count);
    selectedWords.sort((a, b) => b.length - a.length);

    const updatedHistory = [...usedWordsHistory, ...selectedWords];
    localStorage.setItem('sopa_used_words', JSON.stringify(updatedHistory));

    // --- DIMENSIONES ---
    if (isMobile()) {
        currentRows = 14; currentCols = 10;
    } else if (isTablet()) {
        currentRows = 16; currentCols = 15;
    } else {
        if (currentGameMode === 'sao') {
            // ESCRITORIO SAO: Fijo como el nivel 10
            currentCols = 17;
            currentRows = 11; 
        } else {
            // ESCRITORIO NORMAL
            currentCols = levelData.size;
            currentRows = (levelData.level >= 5) ? 11 : levelData.size;
        }
    }
    
    document.getElementById('status-msg').textContent = "Encuentra las palabras";
    
    stopTimer();

    // --- GENERACIÓN DE GRILLA (Igual que antes) ---
    placedWords = [];
    firstSelection = null;
    isDragging = false;
    let success = false;
    let attempts = 0;
    
    while(!success && attempts < 200) {
        grid = Array(currentRows).fill(null).map(() => Array(currentCols).fill(''));
        placedWords = [];
        success = true;
        for (let word of selectedWords) {
            if (!placeWord(word, currentRows, currentCols)) {
                success = false; break;
            }
        }
        attempts++;
    }

    // --- SINCRONIZACIÓN Y TIMERS ---
    const finalWordCount = placedWords.length;
    
    // En SAO no iniciamos timer, pero en los otros sí
    if (currentGameMode !== 'sao') {
        if (currentGameMode === 'elimination') {
            levelSeconds = finalWordCount * 12; 
            updateTimerDisplay();
            timerInterval = setInterval(() => {
                levelSeconds--; totalSeconds++; updateTimerDisplay();
                if (levelSeconds <= 0) gameOver();
            }, 1000);
        } else {
            updateTimerDisplay();
            timerInterval = setInterval(() => {
                totalSeconds++; updateTimerDisplay();
            }, 1000);
        }
    } else {
        // En SAO solo limpiamos el texto del timer por si acaso
        document.getElementById('timer').textContent = "∞";
        document.getElementById('timer').style.visibility = 'visible'; // Lo mostramos como infinito
    }

    fillEmptySpaces(currentRows, currentCols);
    setTimeout(() => { renderGrid(currentRows, currentCols); }, 50);
    
    const limit = getMaxVisibleWords();
    placedWords.forEach((pw, i) => pw.rendered = i < limit);
    renderWordList();
}

function stopTimer() { if (timerInterval) clearInterval(timerInterval); }
function updateTimerDisplay() {
    const timerEl = document.getElementById('timer');
    if (currentGameMode === 'elimination') {
        const mins = Math.floor(levelSeconds / 60).toString().padStart(2, '0');
        const secs = (levelSeconds % 60).toString().padStart(2, '0');
        timerEl.textContent = `${mins}:${secs}`;
        if (levelSeconds <= 10) timerEl.classList.add('timer-danger'); else timerEl.classList.remove('timer-danger');
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

function gameOver() { stopTimer(); const reviveContainer = document.getElementById('revive-container'); if (!hasRevived) reviveContainer.style.display = 'flex'; else { reviveContainer.style.display = 'none'; document.querySelector('#game-over-screen h2').textContent = "Game Over"; } showScreen('game-over-screen'); playTone(150, 'sawtooth', 0.5); }
function revivePlayer() { hasRevived = true; levelSeconds += 30; showScreen('game-screen'); timerInterval = setInterval(() => { levelSeconds--; totalSeconds++; updateTimerDisplay(); if (levelSeconds <= 0) gameOver(); }, 1000); }
function placeWord(word, rows, cols) {
    let placed = false;
    let attempts = 0;
    
    // Obtenemos la dificultad del nivel actual
    const difficulty = gameLevels[currentLevelIndex].difficulty;

    // DEFINIMOS LAS DIRECCIONES (Cambio en fila, Cambio en columna)
    // 0: Horizontal (→) | 1: Vertical (↓) | 2: Diagonal (↘)
    let allowedDirections = [
        { dr: 0, dc: 1 },  // Horizontal Derecha
        { dr: 1, dc: 0 },  // Vertical Abajo
        { dr: 1, dc: 1 },   // Diagonal Abajo-Derecha
        { dr: -1, dc: 1 } // Diagonal Arriba-Derecha
    ];

    // Si NO es fácil, agregamos las direcciones invertidas (←, ↑, ↖, etc.)
    if (difficulty !== 'facil') {
        allowedDirections.push(
            { dr: -1, dc: 0 }, // Vertical Arriba (Rev)
            { dr: -1, dc: -1 },// Diagonal Arriba-Izquierda (Rev)
            { dr: -1, dc: 1 }, // Diagonal Arriba-Derecha
            { dr: 1, dc: -1 }  // Diagonal Abajo-Izquierda
        );
    }

    while (!placed && attempts < 150) { // Aumentamos un poco los intentos
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        
        // Elegimos una dirección al azar de las permitidas
        const dirObj = allowedDirections[Math.floor(Math.random() * allowedDirections.length)];

        if (canPlace(word, row, col, dirObj, rows, cols)) {
            let coords = [];
            for (let i = 0; i < word.length; i++) {
                // Calculamos la posición exacta usando la dirección
                const r = row + (i * dirObj.dr);
                const c = col + (i * dirObj.dc);
                
                grid[r][c] = word[i];
                coords.push({ r, c });
            }
            // Guardamos la palabra. 'found: false'
            placedWords.push({ word: word, found: false, coords: coords, rendered: false });
            placed = true;
        }
        attempts++;
    }
    return placed;
}

function canPlace(word, startRow, startCol, dir, rows, cols) {
    // 1. Calculamos dónde terminaría la palabra
    const endRow = startRow + (word.length - 1) * dir.dr;
    const endCol = startCol + (word.length - 1) * dir.dc;

    // 2. Verificar si se sale de los bordes
    if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) {
        return false;
    }

    // 3. Verificar si choca con letras diferentes
    for (let i = 0; i < word.length; i++) {
        const r = startRow + (i * dir.dr);
        const c = startCol + (i * dir.dc);
        
        const existing = grid[r][c];
        // Si la celda no está vacía Y la letra no coincide, no se puede poner
        if (existing !== '' && existing !== word[i]) {
            return false;
        }
    }
    return true;
}

function fillEmptySpaces(rows, cols) { const letters = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ"; for (let r = 0; r < rows; r++) { for (let c = 0; c < cols; c++) { if (grid[r][c] === '') grid[r][c] = letters.charAt(Math.floor(Math.random() * letters.length)); } } }

// --- RENDERIZADO ---
function renderGrid(rows, cols) {
    const gridEl = document.getElementById('grid');
    gridEl.innerHTML = '';
    
    const wrapper = document.querySelector('.grid-wrapper');
    const rect = wrapper.getBoundingClientRect();
    
    // --- CAMBIO 1: APLICAR CLASE GIGANTE SI ES SAO ---
    if (currentGameMode === 'sao' && !isMobile() && !isTablet()) {
        wrapper.classList.add('sao-large');
    } else {
        wrapper.classList.remove('sao-large');
    }
    
    // Medir tamaño real disponible
    let wAvailable = rect.width || (window.innerWidth - 10);
    let hAvailable = rect.height || (window.innerHeight - 200);

    let cellSize, gap;

    if (isMobile() || isTablet()) {
        // --- MODO AGRESIVO PARA MÓVIL ---
        // En lugar de medir el contenedor, medimos la PANTALLA completa.
        
        // 1. Ancho total de la pantalla
        wAvailable = window.innerWidth;
        
        // 2. Alto total MENOS lo que ocupan los menús (Header + Panel Palabras)
        hAvailable = window.innerHeight - 170;

        gap = 1; // Espacio mínimo entre letras
        
        // Calculamos cuánto mediría la celda si nos guiamos por el ancho
        const cellByWidth = (wAvailable - (cols * gap)) / cols;
        
        // Calculamos cuánto mediría si nos guiamos por el alto
        const cellByHeight = (hAvailable - (rows * gap)) / rows;
        
        // Elegimos la que quepa, pero redondeamos hacia ARRIBA (ceil) para ganar pixeles
        cellSize = Math.min(cellByWidth, cellByHeight);
        
        gridEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
        gridEl.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
        gridEl.style.gap = `${gap}px`;
    } else {
        // Escritorio
        gap = 5;
        
        if (currentGameMode === 'sao') {
            // --- LÓGICA MODO SAO (AUTO-AJUSTE VERTICAL) ---
            // Calculamos: (Altura total de pantalla - 280px de interfaz) / cantidad de filas
            // Esto asegura que NUNCA se salga de la pantalla verticalmente.
            cellSize = `calc((100vh - 280px) / ${rows})`;
        } else {
            // --- LÓGICA MODO NORMAL (VMIN) ---
            const availableVmin = 65; 
            const divisor = rows; 
            cellSize = `calc((${availableVmin}vmin - ${divisor * gap}px) / ${divisor})`;
        }

        gridEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize})`;
        gridEl.style.gridTemplateRows = `repeat(${rows}, ${cellSize})`;
        gridEl.style.gap = `${gap}px`;
    }
    
    // ... (El resto de la función sigue igual: eventos touch, mouse, bucles for) ...
    window.removeEventListener('touchend', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = grid[r][c];
            cell.dataset.r = r;
            cell.dataset.c = c;
            
            if (isMobile() || isTablet()) {
                cell.style.width = `${cellSize}px`;
                cell.style.height = `${cellSize}px`;
                cell.style.fontSize = `${cellSize * 0.65}px`;
            } else {
                cell.style.width = '';
                cell.style.height = '';
                // Ajustamos ligeramente la fuente también
                cell.style.fontSize = `calc(${cellSize} * 0.55)`;
            }
            
            cell.addEventListener('mousedown', (e) => handleStart(r, c, cell, e));
            cell.addEventListener('touchstart', (e) => handleStart(r, c, cell, e));
            cell.addEventListener('mouseenter', (e) => handleMove(r, c, cell));
            cell.addEventListener('touchmove', (e) => handleTouchMove(e));
            cell.addEventListener('mouseup', () => handleEnd(r, c, cell));
            gridEl.appendChild(cell);
        }
    }
}

function renderWordList() { const listEl = document.getElementById('word-list'); listEl.innerHTML = ''; placedWords.forEach(obj => { if (obj.rendered) { const li = document.createElement('li'); li.textContent = obj.word; li.id = 'word-' + obj.word; listEl.appendChild(li); } }); }

function handleStart(r, c, cellEl, e) { 
    if(e.cancelable) e.preventDefault(); 
    playTone(300, 'sine', 0.05); 
    
    if (!firstSelection) { 
        firstSelection = { r, c, el: cellEl }; 
        cellEl.classList.add('selected'); 
        isDragging = true; 
        
        // --- AGREGAR ESTO: Mostrar la primera letra inmediatamente ---
        updateSelectionText(firstSelection, {r, c});

    } else { 
        // (El resto de tu lógica else sigue igual...)
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

function handleMove(r, c, cellEl) { if (!isDragging || !firstSelection) return; updateDragVisuals(firstSelection, {r, c}); }
function handleTouchMove(e) { if (!isDragging || !firstSelection) return; e.preventDefault(); const touch = e.touches[0]; const target = document.elementFromPoint(touch.clientX, touch.clientY); if (target && target.classList.contains('cell')) { const r = parseInt(target.dataset.r); const c = parseInt(target.dataset.c); updateDragVisuals(firstSelection, {r, c}); } }
function handleEnd(r, c, cellEl) { if (!isDragging) return; isDragging = false; if (firstSelection && (firstSelection.r !== r || firstSelection.c !== c)) { checkWordAttempt(firstSelection, {r, c}); clearSelectionVisuals(); firstSelection = null; } }

function handleGlobalMouseUp(e) {
    if (isDragging && firstSelection) {
        isDragging = false;
        
        // Lógica para detectar dónde se soltó el dedo en pantallas táctiles
        if (e.changedTouches && e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            
            // Si soltamos sobre una celda, intentamos validar la palabra
            if (target && target.classList.contains('cell')) {
                const r = parseInt(target.dataset.r);
                const c = parseInt(target.dataset.c);
                // Verificamos si se formó la palabra
                checkWordAttempt(firstSelection, { r, c });
            }
        }
        
        // Limpiamos lo visual (esto ya lo tenías)
        const cells = document.querySelectorAll('.cell.selected');
        cells.forEach(c => {
            const r = parseInt(c.dataset.r);
            const col = parseInt(c.dataset.c);
            if (firstSelection && (r !== firstSelection.r || col !== firstSelection.c)) {
                c.classList.remove('selected');
            }
        });

        // --- AGREGAR ESTO: Resetear texto si soltó sin validar ---
        // (Solo si no dice "¡Encontrada!" para no borrar el mensaje de éxito)
        const msg = document.getElementById('status-msg').textContent;
        if (!msg.includes('encontrada!')) {
            document.getElementById('status-msg').textContent = "Encuentra las palabras";
        }
        
        // Reiniciamos la selección inicial
        firstSelection = null;
        clearSelectionVisuals();
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

        for (let i = 0; i <= steps; i++) {
            const cell = document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
            if (cell) cell.classList.add('selected');
            r += stepR;
            c += stepC;
        }
    }
    updateSelectionText(start, end);
}

function clearSelectionVisuals() { document.querySelectorAll('.cell.selected').forEach(el => el.classList.remove('selected')); }

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

    const foundObj = placedWords.find(
        pw =>
            (pw.word === formedWord || pw.word === reversedWord) &&
            !pw.found
    );

    if (foundObj) {
        // SI ENCONTRÓ PALABRA
        foundObj.found = true;
        markWordFound(foundObj.coords, foundObj.word);

        document.getElementById('status-msg').textContent =
            `¡${foundObj.word} encontrada!`;

        playTone(440, 'sine', 0.1);
        setTimeout(() => playTone(660, 'sine', 0.15), 100);

        if (currentGameMode === 'elimination') {
            levelSeconds += 5;
            updateTimerDisplay();
        }

        if (placedWords.every(pw => pw.found))
            setTimeout(levelComplete, 800);
    } else {
        // Volvemos al mensaje por defecto después de un momento breve
        // O inmediatamente:
        document.getElementById('status-msg').textContent = "Encuentra las palabras";
    }
}

function markWordFound(coords, wordText) {
    // 1. Elegimos el color actual y avanzamos el índice (circularmente)
    const color = highlightColors[currentColorIndex % highlightColors.length];
    currentColorIndex++;

    coords.forEach((coord, index) => {
        const cell = document.querySelector(`.cell[data-r='${coord.r}'][data-c='${coord.c}']`);
        if (cell) {
            // Animación secuencial
            setTimeout(() => {
                cell.classList.add('found');
                // APLICAMOS EL COLOR DIRECTAMENTE
                cell.style.backgroundColor = color;
                // Nos aseguramos que el texto sea blanco para contraste
                cell.style.color = 'white'; 
                // Un pequeño borde sombra para que se vea bonito
                cell.style.boxShadow = "inset 0 0 10px rgba(0,0,0,0.2)";
            }, index * 40);
        }
    });

    // Lógica para quitar la palabra de la lista (esto sigue igual que antes)
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
    
    const containerId = 'level-complete-title-container';
    const btnNext = document.getElementById('btn-next');
    const finalForm = document.getElementById('final-form');

    // Lógica específica MODO SAO
    if (currentGameMode === 'sao') {
        // Guardamos el progreso del SIGUIENTE nivel
        const nextLevel = currentLevelIndex + 1; // Índice + 1 = siguiente índice
        
        if (nextLevel >= 100) {
            // --- JUEGO TERMINADO (NIVEL 100 SUPERADO) ---
            renderTitleTiles(containerId, "¡CIMA CONQUISTADA!");
            btnNext.classList.add('hidden');
            
            // Creamos un botón especial para volver al menú y resetear
            finalForm.classList.remove('hidden');
            finalForm.innerHTML = `
                <p style="text-align:center;">Has completado los 100 pisos.</p>
                <button class="btn-start" onclick="resetSaoAndExit()">
                    <span class="btn-text">Volver al Menú</span>
                </button>
            `;
            // Borramos progreso para que pueda jugar de nuevo
            localStorage.removeItem('sopa_sao_level'); 
        } else {
            // --- NIVEL INTERMEDIO COMPLETADO ---
            renderTitleTiles(containerId, "PISO COMPLETADO");
            btnNext.classList.remove('hidden');
            finalForm.classList.add('hidden');
            
            // Guardamos que el usuario ya está en el siguiente nivel (índice)
            localStorage.setItem('sopa_sao_level', nextLevel);
        }

    } else {
        // --- LÓGICA MODOS NORMALES (La que ya tenías) ---
        if(currentLevelIndex === gameLevels.length - 1) {
            renderTitleTiles(containerId, "JUEGO COMPLETADO");
            btnNext.classList.add('hidden');
            finalForm.classList.remove('hidden');
            // Restauramos el formulario original si fue modificado por SAO
            if(!document.getElementById('player-name-input')) {
                finalForm.innerHTML = `
                    <input type="text" id="player-name-input" placeholder="Tu Nombre (Máx 14)" maxlength="14">
                    <button id="btn-save" class="btn-start" onclick="saveScore()">
                        <span class="btn-text">Guardar</span>
                    </button>
                `;
            }
        } else {
            renderTitleTiles(containerId, "NIVEL COMPLETADO");
            btnNext.classList.remove('hidden');
            finalForm.classList.add('hidden');
        }
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
        
        // Verificación de seguridad
        if (currentGameMode !== 'sao' && currentLevelIndex >= gameLevels.length) {
            // Esto no debería pasar por la lógica de levelComplete, pero por seguridad:
            goToMenu();
            return;
        }

        showScreen('game-screen'); 
        initLevel(); 
    }, 1500); 
}

async function saveScore() { const name = document.getElementById('player-name-input').value.trim() || "Anónimo"; const btnSave = document.getElementById('btn-save'); btnSave.classList.add('btn-loading'); let savedToCloud = false; if (db && user) { try { await addDoc(collection(db, 'scores'), { name: name, time: totalSeconds, date: new Date().toISOString(), uid: user.uid }); savedToCloud = true; } catch (e) { console.warn(e); } } if (!savedToCloud) { try { const localData = JSON.parse(localStorage.getItem('sopa_scores') || '[]'); localData.push({ name: name, time: totalSeconds, date: new Date().toISOString(), source: 'local' }); localStorage.setItem('sopa_scores', JSON.stringify(localData)); } catch(e) { console.error(e); } } goToMenu(); setTimeout(() => btnSave.classList.remove('btn-loading'), 500); }
async function showScoreboard() { showScreen('scoreboard-screen'); const list = document.getElementById('score-list'); list.innerHTML = '<li class="score-item">Cargando...</li>'; let scores = []; if (db) { try { const querySnapshot = await getDocs(collection(db, 'scores')); querySnapshot.forEach(doc => scores.push(doc.data())); } catch (e) { console.warn(e); } } try { const localData = JSON.parse(localStorage.getItem('sopa_scores') || '[]'); scores = [...scores, ...localData]; } catch(e) {} scores.sort((a, b) => a.time - b.time); scores = scores.slice(0, 3); list.innerHTML = ''; if (scores.length === 0) list.innerHTML = '<li class="score-item">Aún no hay récords</li>'; else { scores.forEach((s, index) => { const mins = Math.floor(s.time / 60).toString().padStart(2, '0'); const secs = (s.time % 60).toString().padStart(2, '0'); const li = document.createElement('li'); li.className = 'score-item'; let rankIcon = index === 0 ? '🥇' : (index === 1 ? '🥈' : '🥉'); li.innerHTML = `<span class="score-rank">${rankIcon}</span><span class="score-name">${s.name}</span><span class="score-time">${mins}:${secs}</span>`; list.appendChild(li); }); } }
async function shareGame() {
    const shareData = {
        title: 'Sopa de Letras - Desafío Mental',
        text: '¡Te desafío a superar mi tiempo en esta Sopa de Letras!',
        url: 'https://circehathaway.github.io/sopaDeLetras/'
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback para PC si no soporta compartir nativo: Copiar al portapapeles
            await navigator.clipboard.writeText(shareData.url);
            alert('¡Enlace copiado al portapapeles!');
        }
    } catch (err) {
        console.error('Error al compartir:', err);
    }
}

// --- LÓGICA DE INSTALACIÓN Y NAVEGACIÓN ---
let deferredPrompt; // Variable para guardar el evento de instalación

// 1. Detectar si se puede instalar
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e; // Guardamos el evento para usarlo luego
    
    // Si justo estamos viendo el menú al cargar, mostramos el aviso
    const menu = document.getElementById('menu-screen');
    if (!menu.classList.contains('hidden')) {
        document.getElementById('install-modal').classList.remove('hidden');
    }
});

// 2. MODIFICAMOS LA FUNCIÓN showScreen (El cerebro de la navegación)
window.showScreen = function(id) {
    // A. Ocultar todas las pantallas (Menu, Juego, Score, Modos, etc.)
    document.querySelectorAll('body > div[id$="-screen"]').forEach(div => div.classList.add('hidden')); 
    
    // B. Mostrar la pantalla que pidió el usuario
    document.getElementById(id).classList.remove('hidden');

    // C. CONTROL DEL AVISO DE INSTALACIÓN (Aquí está la magia)
    const installModal = document.getElementById('install-modal');
    
    if (id === 'menu-screen') {
        // ¿Estamos en el Menú Principal?
        // SI -> Mostramos el aviso solo si la app se puede instalar (deferredPrompt existe)
        if (deferredPrompt) {
            installModal.classList.remove('hidden');
        }
    } else {
        // ¿Estamos en Jugar, Modos, Score o cualquier otro lado?
        // NO -> Ocultamos el aviso obligatoriamente
        installModal.classList.add('hidden');
    }
};

// 3. Funciones de los botones del modal
window.installApp = async () => {
    if (!deferredPrompt) return;
    document.getElementById('install-modal').classList.add('hidden');
    deferredPrompt.prompt(); // Lanza la ventana nativa de Android/iOS
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Usuario decidió: ${outcome}`);
    deferredPrompt = null; // Ya no se puede instalar de nuevo inmediatamente
};

window.closeInstallModal = () => {
    document.getElementById('install-modal').classList.add('hidden');
};

window.addEventListener('appinstalled', () => {
    document.getElementById('install-modal').classList.add('hidden');
    deferredPrompt = null;
});

// Función para dibujar texto con fichas estáticas
function renderTitleTiles(containerId, text) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Limpiar anterior
    
    const words = text.split(' '); // Separar por palabras
    
    // Crear una fila por cada palabra (o agrupar si son cortas)
    words.forEach(word => {
        const row = document.createElement('div');
        row.className = 'title-row';
        
        for (let char of word) {
            const tile = document.createElement('div');
            tile.className = 'title-tile static';
            tile.textContent = char;
            row.appendChild(tile);
        }
        container.appendChild(row);
    });
}

function getSaoDifficulty(levelIndex) {
    // levelIndex 0 = Nivel 1.
    const realLevel = levelIndex + 1;
    if (realLevel <= 25) return 'facil';
    if (realLevel <= 65) return 'medio';
    return 'dificil';
}

//Cuando terminas el nivel 100
window.resetSaoAndExit = function() {
    localStorage.removeItem('sopa_sao_level');
    goToMenu();
    // Restauramos el formulario del DOM por si el usuario juega modo normal después
    const finalForm = document.getElementById('final-form');
    finalForm.innerHTML = `
        <input type="text" id="player-name-input" placeholder="Tu Nombre (Máx 14)" maxlength="14">
        <button id="btn-save" class="btn-start" onclick="saveScore()">
            <span class="btn-text">Guardar</span>
        </button>
    `;
};

// Función para mostrar la palabra que se está formando en tiempo real
function updateSelectionText(start, end) {
    const dRow = end.r - start.r;
    const dCol = end.c - start.c;
    const statusEl = document.getElementById('status-msg');

    // 1. Si es solo una celda (el inicio)
    if (dRow === 0 && dCol === 0) {
        statusEl.textContent = grid[start.r][start.c];
        return;
    }

    // 2. Si la dirección no es válida (movimiento extraño), no mostramos nada nuevo
    if (dRow !== 0 && dCol !== 0 && Math.abs(dRow) !== Math.abs(dCol)) {
        return; 
    }

    // 3. Calcular la palabra
    const steps = Math.max(Math.abs(dRow), Math.abs(dCol));
    const stepR = dRow === 0 ? 0 : dRow / Math.abs(dRow);
    const stepC = dCol === 0 ? 0 : dCol / Math.abs(dCol);

    let currentWord = "";
    let r = start.r;
    let c = start.c;

    for (let i = 0; i <= steps; i++) {
        currentWord += grid[r][c];
        r += stepR;
        c += stepC;
    }

    // 4. Actualizar el título con lo que llevamos seleccionado
    statusEl.textContent = currentWord;
    
    // Opcional: Cambiar color si es una palabra válida (visual extra)
    // statusEl.style.color = "#ffeb3b"; 
}