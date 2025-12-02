import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Solo ejecutar si estamos en rango de CELULAR
if (window.matchMedia("(max-width: 767px)").matches) {

    console.log("Modo CELULAR activado (Grid 14x10)");

    // Configuración Firebase Local (Necesaria porque no podemos importar variables del scope de otro módulo)
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

    // --- CONSTANTES CELULAR ---
    const ROWS = 14;
    const COLS = 10;
    const MAX_WORDS = 4;

    // --- ESTADO LOCAL CELULAR ---
    let currentLevelIndex = 0;
    let grid = [];
    let placedWords = [];
    let firstSelection = null;
    let timerInterval;
    let totalSeconds = 0;
    let levelSeconds = 0;
    let isDragging = false;
    let hasRevived = false;
    let currentGameMode = 'traditional';

    const levels = [
        { level: 1, words: ["SOL", "LUNA", "MAR", "GATO", "PERRO"] },
        { level: 2, words: ["MESA", "SILLA", "LAPIZ", "LIBRO", "PAPEL", "CASA"] },
        { level: 3, words: ["AMIGO", "FELIZ", "JUGAR", "COMER", "REIR", "SUEÑO", "SALTAR"] },
        { level: 4, words: ["BOSQUE", "PLAYA", "MONTAÑA", "CIELO", "TIERRA", "AGUA", "FUEGO", "VIENTO"] },
        { level: 5, words: ["PLANETA", "ESTRELLA", "GALAXIA", "COMETA", "ORBITA", "LUNAR", "SOLAR", "ESPACIO", "COSMOS"] },
        { level: 6, words: ["CIENCIA", "FISICA", "QUIMICA", "LOGICA", "TEORIA", "ATOMO", "CELULA", "MATERIA", "ENERGIA", "NEURONA"] },
        { level: 7, words: ["LIBERTAD", "JUSTICIA", "VALOR", "RESPETO", "HONOR", "VERDAD", "MORAL", "ETICA", "DERECHO", "DEBER", "PAZ"] },
        { level: 8, words: ["COMPUTADORA", "ALGORITMO", "INTERNET", "PANTALLA", "TECLADO", "MEMORIA", "SOFTWARE", "HARDWARE", "REDES", "DATOS", "CODIGO", "PIXEL"] },
        { level: 9, words: ["FILOSOFIA", "LITERATURA", "HISTORIA", "GEOGRAFIA", "BIOLOGIA", "MATEMATICA", "ARTE", "MUSICA", "PINTURA", "ESCULTURA", "POESIA", "NOVELA", "TEATRO"] },
        { level: 10, words: ["EFIMERO", "INEFABLE", "RESILIENCIA", "SEMPITERNO", "ELOCUENCIA", "MELANCOLIA", "SERENDIPIA", "ETEREO", "LIMERENCIA", "ARREBOL", "EPOCA", "SONETO", "ASTRAL", "ETERNO"] }
    ];

    // --- SOBRESCRIBIR FUNCIONES GLOBALES ---
    
    window.startMode = function(mode) {
        currentGameMode = mode;
        currentLevelIndex = 0; 
        totalSeconds = 0;
        hasRevived = false; 
        showScreen('game-screen');
        // stopBackgroundAnimation no es accesible si no es global, asumimos que corre
        // o lo ignoramos.
        initLevel();
    };

    window.startGame = function() {
        // Redirige al flujo normal
        currentLevelIndex = 0; 
        totalSeconds = 0;
        showScreen('game-screen');
        initLevel();
    };

    window.initLevel = initLevel;
    window.nextLevelWithAnimation = nextLevelWithAnimation;
    window.solveLevel = solveLevel;
    window.saveScore = saveScore;
    window.revivePlayer = revivePlayer;

    // --- LÓGICA ---

    function initLevel() {
        const levelData = levels[currentLevelIndex];
        document.getElementById('level-indicator').textContent = `Nivel ${levelData.level}/10`;
        
        if(timerInterval) clearInterval(timerInterval);
        
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

        grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(''));
        placedWords = [];
        firstSelection = null;
        isDragging = false;

        let success = false;
        let attempts = 0;
        while(!success && attempts < 50) {
            grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(''));
            placedWords = [];
            success = true;
            for (let word of levelData.words) {
                if (!placeWord(word)) {
                    success = false; break;
                }
            }
            attempts++;
        }

        fillEmptySpaces();
        
        // Renderizar
        setTimeout(() => renderGrid(), 50);
        
        placedWords.forEach((pw, i) => pw.rendered = i < MAX_WORDS);
        renderWordList();
    }

    function updateTimerDisplay() {
        const timerEl = document.getElementById('timer');
        const val = currentGameMode === 'elimination' ? levelSeconds : totalSeconds;
        const mins = Math.floor(val / 60).toString().padStart(2, '0');
        const secs = (val % 60).toString().padStart(2, '0');
        timerEl.textContent = `${mins}:${secs}`;
        document.getElementById('level-stats').textContent = `Tiempo Total: ${mins}:${secs}`;
        
        if (currentGameMode === 'elimination') {
             if (val <= 10) timerEl.classList.add('timer-danger'); 
             else timerEl.classList.remove('timer-danger');
        }
    }

    function gameOver() {
        clearInterval(timerInterval);
        const reviveContainer = document.getElementById('revive-container');
        if (!hasRevived) {
            reviveContainer.style.display = 'flex';
        } else {
            reviveContainer.style.display = 'none';
            document.querySelector('#game-over-screen h2').textContent = "Game Over";
        }
        showScreen('game-over-screen');
    }

    function placeWord(word) {
        let placed = false;
        let att = 0;
        while (!placed && att < 100) {
            const dir = Math.floor(Math.random() * 3);
            const row = Math.floor(Math.random() * ROWS);
            const col = Math.floor(Math.random() * COLS);
            if (canPlace(word, row, col, dir)) {
                let coords = [];
                for (let i = 0; i < word.length; i++) {
                    let r, c;
                    if (dir === 0) { r = row; c = col + i; }
                    else if (dir === 1) { r = row + i; c = col; }
                    else if (dir === 2) { r = row + i; c = col + i; }
                    grid[r][c] = word[i];
                    coords.push({r,c});
                }
                placedWords.push({ word: word, found: false, coords: coords, rendered: false });
                placed = true;
            }
            att++;
        }
        return placed;
    }

    function canPlace(word, row, col, dir) {
        if (dir === 0 && col + word.length > COLS) return false;
        if (dir === 1 && row + word.length > ROWS) return false;
        if (dir === 2 && (row + word.length > ROWS || col + word.length > COLS)) return false;
        for (let i = 0; i < word.length; i++) {
            let existing = grid[dir === 0 ? row : (dir === 1 ? row + i : row + i)][dir === 0 ? col + i : (dir === 1 ? col : col + i)];
            if (existing !== '' && existing !== word[i]) return false;
        }
        return true;
    }

    function fillEmptySpaces() {
        const letters = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[r][c] === '') grid[r][c] = letters.charAt(Math.floor(Math.random() * letters.length));
            }
        }
    }

    function renderGrid() {
        const gridEl = document.getElementById('grid');
        gridEl.innerHTML = '';
        
        const wrapper = document.getElementById('grid-wrapper');
        const rect = wrapper.getBoundingClientRect();
        const gap = 1;
        
        const w = (rect.width - (COLS - 1) * gap) / COLS;
        const h = (rect.height - (ROWS - 1) * gap) / ROWS;
        const cellSize = Math.floor(Math.min(w, h));
        
        gridEl.style.gridTemplateColumns = `repeat(${COLS}, ${cellSize}px)`;
        gridEl.style.gridTemplateRows = `repeat(${ROWS}, ${cellSize}px)`;
        gridEl.style.gap = `${gap}px`;

        // Limpiar eventos desktop
        window.removeEventListener('mouseup', window.handleGlobalMouseUp); 
        
        // Eventos touch globales
        window.removeEventListener('touchend', handleGlobalTouchEnd);
        window.addEventListener('touchend', handleGlobalTouchEnd);

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = grid[r][c];
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.style.width = `${cellSize}px`;
                cell.style.height = `${cellSize}px`;
                cell.style.fontSize = `${cellSize * 0.7}px`;
                
                cell.addEventListener('touchstart', (e) => handleTouchStart(r, c, cell, e));
                cell.addEventListener('touchmove', (e) => handleTouchMove(e));
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

    // --- INTERACCIÓN ---
    function handleTouchStart(r, c, cellEl, e) {
        if(e.cancelable) e.preventDefault();
        if (!firstSelection) {
            firstSelection = { r, c, el: cellEl };
            cellEl.classList.add('selected');
            isDragging = true;
        } else {
            if (firstSelection.r === r && firstSelection.c === c) {
                isDragging = true; 
            } else {
                checkWord(firstSelection, { r, c });
                clearVisuals();
                firstSelection = null;
                isDragging = false;
            }
        }
    }

    function handleTouchMove(e) {
        if (!isDragging || !firstSelection) return;
        e.preventDefault();
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && target.classList.contains('cell')) {
            const r = parseInt(target.dataset.r);
            const c = parseInt(target.dataset.c);
            updateVisuals(firstSelection, {r, c});
        }
    }

    function handleGlobalTouchEnd(e) {
        if (isDragging && firstSelection && firstSelection.lastEnd) {
            checkWord(firstSelection, firstSelection.lastEnd);
            clearVisuals();
            firstSelection = null;
            isDragging = false;
        }
    }

    function updateVisuals(start, end) {
        clearVisuals();
        const startEl = document.querySelector(`.cell[data-r='${start.r}'][data-c='${start.c}']`);
        if(startEl) startEl.classList.add('selected');

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
            start.lastEnd = end;
        }
    }

    function clearVisuals() {
        document.querySelectorAll('.cell.selected').forEach(el => el.classList.remove('selected'));
    }

    function checkWord(start, end) {
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
        const foundObj = placedWords.find(pw => (pw.word === formedWord || pw.word === reversedWord) && !pw.found);

        if (foundObj) {
            foundObj.found = true;
            markWordFound(foundObj.coords, foundObj.word);
            document.getElementById('status-msg').textContent = `¡${foundObj.word} encontrada!`;
            
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
                ul.appendChild(newLi);
            }
        }
    }

    function levelComplete() {
        clearInterval(timerInterval);
        const titleEl = document.getElementById('level-complete-title');
        const btnNext = document.getElementById('btn-next');
        const finalForm = document.getElementById('final-form');
        
        if(currentLevelIndex === levels.length - 1) {
            titleEl.textContent = "¡INCREIBLE! Has completado el juego.";
            btnNext.classList.add('hidden');
            finalForm.classList.remove('hidden');
        } else {
            titleEl.textContent = "¡Nivel Completado!";
            btnNext.classList.remove('hidden');
            finalForm.classList.add('hidden');
        }
        showScreen('level-complete-screen');
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
            } catch (e) {}
        }
        if (!savedToCloud) {
            try {
                const localData = JSON.parse(localStorage.getItem('sopa_scores') || '[]');
                localData.push({ name: name, time: totalSeconds, date: new Date().toISOString(), source: 'local' });
                localStorage.setItem('sopa_scores', JSON.stringify(localData));
            } catch(e) {}
        }
        goToMenu();
        setTimeout(() => btnSave.classList.remove('btn-loading'), 500);
    }

    // Funciones auxiliares
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

    function showScreen(id) {
        document.querySelectorAll('body > div[id$="-screen"]').forEach(div => div.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    }
}