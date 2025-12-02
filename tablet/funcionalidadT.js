// Prevenir ejecución múltiple
if (window.mobileModeLoaded) return;
window.mobileModeLoaded = true;
console.log("--- MODO TABLET INICIADO ---");

if (window.innerWidth >= 768 && window.innerWidth <= 1024) {
    console.log("--- MODO TABLETA ACTIVADO ---");

    const T_ROWS = 16; 
    const T_COLS = 15; 
    const T_MAX_WORDS = 4; // REQUISITO 4 PALABRAS

    let t_grid = [];
    let t_placedWords = [];
    let t_currentLevelIndex = 0;
    let t_totalSeconds = 0;
    let t_levelSeconds = 0;
    let t_timerInterval;
    let t_currentGameMode = 'traditional';
    let t_hasRevived = false;
    let t_firstSelection = null;
    let t_isDragging = false;

    // Firebase Config (copia local)
    const firebaseConfig = {
      apiKey: "AIzaSyBXOH-m6L0kS-0qVSAAh837R-lVIlFt2ZQ",
      authDomain: "sopa-de-letras-1bb46.firebaseapp.com",
      projectId: "sopa-de-letras-1bb46",
      storageBucket: "sopa-de-letras-1bb46.firebasestorage.app",
      messagingSenderId: "931258212814",
      appId: "1:931258212814:web:456b55dadb16602fb9cb9f"
    };
    try {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
        const { getAuth, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
        const { getFirestore, collection, addDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        signInAnonymously(auth).catch(e=>{});
    } catch(e){}

    const tabletLevels = [
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
        t_currentGameMode = mode;
        t_currentLevelIndex = 0; 
        t_totalSeconds = 0;
        t_hasRevived = false; 
        document.querySelectorAll('body > div[id$="-screen"]').forEach(div => div.classList.add('hidden'));
        document.getElementById('game-screen').classList.remove('hidden');
        const bg = document.getElementById('background-animation');
        if(bg) bg.innerHTML = '';
        initLevelT();
    };

    window.nextLevelWithAnimation = function() {
        const btn = document.getElementById('btn-next');
        if(btn.classList.contains('filling')) return;
        btn.classList.add('filling');
        setTimeout(() => {
            btn.classList.remove('filling');
            t_currentLevelIndex++;
            document.querySelectorAll('body > div[id$="-screen"]').forEach(div => div.classList.add('hidden'));
            document.getElementById('game-screen').classList.remove('hidden');
            initLevelT();
        }, 1500);
    };

    window.solveLevel = function() {
        t_placedWords.forEach(pw => {
            if(!pw.found) {
                pw.found = true;
                markWordFoundT(pw.coords, pw.word);
            }
        });
        setTimeout(levelCompleteT, 500);
    };
    
    window.revivePlayer = function() {
        t_hasRevived = true;
        t_levelSeconds += 30; 
        document.querySelectorAll('body > div[id$="-screen"]').forEach(div => div.classList.add('hidden'));
        document.getElementById('game-screen').classList.remove('hidden');
        t_timerInterval = setInterval(() => {
            t_levelSeconds--;
            t_totalSeconds++; 
            updateTimerT();
            if (t_levelSeconds <= 0) gameOverT();
        }, 1000);
    };

    window.saveScore = async function() {
        // (Misma lógica de guardado, apuntando a db local)
        window.goToMenu();
    };

    // --- LÓGICA CORE TABLET ---

    function initLevelT() {
        const levelData = tabletLevels[t_currentLevelIndex];
        document.getElementById('level-indicator').textContent = `Nivel ${levelData.level}/10`;
        document.getElementById('status-msg').textContent = "Encuentra las palabras";

        if(t_timerInterval) clearInterval(t_timerInterval);
        
        if (t_currentGameMode === 'elimination') {
            t_levelSeconds = levelData.words.length * 12; 
            updateTimerT();
            t_timerInterval = setInterval(() => {
                t_levelSeconds--;
                t_totalSeconds++; 
                updateTimerT();
                if (t_levelSeconds <= 0) gameOverT();
            }, 1000);
        } else {
            updateTimerT();
            t_timerInterval = setInterval(() => {
                t_totalSeconds++;
                updateTimerT();
            }, 1000);
        }

        t_grid = Array(T_ROWS).fill(null).map(() => Array(T_COLS).fill(''));
        t_placedWords = [];
        let success = false;
        let attempts = 0;
        
        while(!success && attempts < 50) {
            t_grid = Array(T_ROWS).fill(null).map(() => Array(T_COLS).fill(''));
            t_placedWords = [];
            success = true;
            for (let word of levelData.words) {
                if (!placeWordT(word)) {
                    success = false; break;
                }
            }
            attempts++;
        }
        
        fillEmptySpacesT();
        
        setTimeout(() => renderGridT(), 50);
        
        t_placedWords.forEach((pw, i) => pw.rendered = i < T_MAX_WORDS);
        renderWordListT();
    }

    function updateTimerT() {
        const timerEl = document.getElementById('timer');
        const val = t_currentGameMode === 'elimination' ? t_levelSeconds : t_totalSeconds;
        const mins = Math.floor(val / 60).toString().padStart(2, '0');
        const secs = (val % 60).toString().padStart(2, '0');
        timerEl.textContent = `${mins}:${secs}`;
        document.getElementById('level-stats').textContent = `Tiempo Total: ${mins}:${secs}`;
    }

    function gameOverT() {
        clearInterval(t_timerInterval);
        document.getElementById('revive-container').style.display = !t_hasRevived ? 'flex' : 'none';
        document.querySelectorAll('body > div[id$="-screen"]').forEach(div => div.classList.add('hidden'));
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    function placeWordT(word) {
        let placed = false;
        let att = 0;
        while (!placed && att < 100) {
            const dir = Math.floor(Math.random() * 3);
            const row = Math.floor(Math.random() * T_ROWS);
            const col = Math.floor(Math.random() * T_COLS);
            if (canPlaceT(word, row, col, dir)) {
                let coords = [];
                for (let i = 0; i < word.length; i++) {
                    let r, c;
                    if (dir === 0) { r = row; c = col + i; }
                    else if (dir === 1) { r = row + i; c = col; }
                    else if (dir === 2) { r = row + i; c = col + i; }
                    t_grid[r][c] = word[i];
                    coords.push({r,c});
                }
                t_placedWords.push({ word: word, found: false, coords: coords, rendered: false });
                placed = true;
            }
            att++;
        }
        return placed;
    }

    function canPlaceT(word, row, col, dir) {
        if (dir === 0 && col + word.length > T_COLS) return false;
        if (dir === 1 && row + word.length > T_ROWS) return false;
        if (dir === 2 && (row + word.length > T_ROWS || col + word.length > T_COLS)) return false;
        for (let i = 0; i < word.length; i++) {
            let existing = t_grid[dir === 0 ? row : (dir === 1 ? row + i : row + i)][dir === 0 ? col + i : (dir === 1 ? col : col + i)];
            if (existing !== '' && existing !== word[i]) return false;
        }
        return true;
    }

    function fillEmptySpacesT() {
        const letters = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
        for (let r = 0; r < T_ROWS; r++) {
            for (let c = 0; c < T_COLS; c++) {
                if (t_grid[r][c] === '') t_grid[r][c] = letters.charAt(Math.floor(Math.random() * letters.length));
            }
        }
    }

    function renderGridT() {
        const gridEl = document.getElementById('grid');
        gridEl.innerHTML = '';
        const wrapper = document.getElementById('grid-wrapper');
        const rect = wrapper.getBoundingClientRect();
        
        const gap = 2;
        // Llenar espacio
        let wAvailable = rect.width || window.innerWidth;
        let hAvailable = rect.height || (window.innerHeight - 250);

        const w = (wAvailable - (T_COLS - 1) * gap) / T_COLS;
        const h = (hAvailable - (T_ROWS - 1) * gap) / T_ROWS;
        const cellSize = Math.floor(Math.min(w, h));
        
        gridEl.style.display = 'grid';
        gridEl.style.gridTemplateColumns = `repeat(${T_COLS}, ${cellSize}px)`;
        gridEl.style.gridTemplateRows = `repeat(${T_ROWS}, ${cellSize}px)`;
        gridEl.style.gap = `${gap}px`;
        
        window.removeEventListener('touchend', handleTouchEndT);
        window.addEventListener('touchend', handleTouchEndT);

        for (let r = 0; r < T_ROWS; r++) {
            for (let c = 0; c < T_COLS; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = t_grid[r][c];
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.style.width = `${cellSize}px`;
                cell.style.height = `${cellSize}px`;
                cell.style.fontSize = `${cellSize * 0.65}px`;
                
                cell.addEventListener('touchstart', (e) => handleTouchStartT(r, c, cell, e));
                cell.addEventListener('touchmove', (e) => handleTouchMoveT(e));
                gridEl.appendChild(cell);
            }
        }
    }

    function renderWordListT() {
    const listEl = document.getElementById('word-list');
    listEl.innerHTML = '';
    t_placedWords.forEach(obj => {
        if (obj.rendered) {
            const li = document.createElement('li');
            li.textContent = obj.word;
            li.id = 'word-' + obj.word;
            if (obj.found) li.classList.add('found-word');
            listEl.appendChild(li);
        }
    });
}

    // Interaction T
    function handleTouchStartT(r, c, cellEl, e) {
        if(e.cancelable) e.preventDefault();
        if (!t_firstSelection) {
            t_firstSelection = { r, c, el: cellEl };
            cellEl.classList.add('selected');
            t_isDragging = true;
        } else {
            if (t_firstSelection.r === r && t_firstSelection.c === c) t_isDragging = true;
            else { checkWordT(t_firstSelection, { r, c }); clearVisualsT(); t_firstSelection = null; t_isDragging = false; }
        }
    }

    function handleTouchMoveT(e) {
        if (!t_isDragging || !t_firstSelection) return;
        e.preventDefault();
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && target.classList.contains('cell')) {
            const r = parseInt(target.dataset.r);
            const c = parseInt(target.dataset.c);
            updateDragT(t_firstSelection, {r, c});
        }
    }

    function handleTouchEndT() {
        if (t_isDragging && t_firstSelection && t_firstSelection.lastEnd) {
            checkWordT(t_firstSelection, t_firstSelection.lastEnd);
            clearVisualsT();
            t_firstSelection = null;
            t_isDragging = false;
        }
    }

    function updateDragT(start, end) {
        clearVisualsT();
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

    function clearVisualsT() {
        document.querySelectorAll('.cell.selected').forEach(el => el.classList.remove('selected'));
    }

    function checkWordT(start, end) {
        const dRow = end.r - start.r;
        const dCol = end.c - start.c;
        if (dRow !== 0 && dCol !== 0 && Math.abs(dRow) !== Math.abs(dCol)) return;
        const steps = Math.max(Math.abs(dRow), Math.abs(dCol));
        const stepR = dRow === 0 ? 0 : dRow / Math.abs(dRow);
        const stepC = dCol === 0 ? 0 : dCol / Math.abs(dCol);
        let formedWord = "";
        let r = start.r, c = start.c;
        let coords = [];
        for (let i = 0; i <= steps; i++) {
            formedWord += t_grid[r][c];
            coords.push({r,c});
            r += stepR; c += stepC;
        }
        const reversedWord = formedWord.split('').reverse().join('');
        const foundObj = t_placedWords.find(pw => (pw.word === formedWord || pw.word === reversedWord) && !pw.found);
        if (foundObj) {
            foundObj.found = true;
            markWordFoundT(foundObj.coords, foundObj.word);
            if (t_currentGameMode === 'elimination') { t_levelSeconds += 5; updateTimerT(); }
            if (t_placedWords.every(pw => pw.found)) setTimeout(levelCompleteT, 800);
        }
    }

    function markWordFoundT(coords, wordText) {
        coords.forEach((coord, index) => {
            const cell = document.querySelector(`.cell[data-r='${coord.r}'][data-c='${coord.c}']`);
            if(cell) setTimeout(() => cell.classList.add('found'), index * 40);
        });
        const li = document.getElementById('word-' + wordText);
        if (li) {
            li.remove();
            const nextWord = t_placedWords.find(pw => !pw.rendered && !pw.found);
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

    function levelCompleteT() {
        clearInterval(t_timerInterval);
        const titleEl = document.getElementById('level-complete-title');
        const btnNext = document.getElementById('btn-next');
        const finalForm = document.getElementById('final-form');
        if(t_currentLevelIndex === tabletLevels.length - 1) {
            titleEl.textContent = "¡INCREIBLE! Has completado el juego.";
            btnNext.classList.add('hidden');
            finalForm.classList.remove('hidden');
        } else {
            titleEl.textContent = "¡Nivel Completado!";
            btnNext.classList.remove('hidden');
            finalForm.classList.add('hidden');
        }
        document.querySelectorAll('body > div[id$="-screen"]').forEach(div => div.classList.add('hidden'));
        document.getElementById('level-complete-screen').classList.remove('hidden');
    }
}