import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Prevenir ejecución múltiple
if (window.mobileModeLoaded) return;
window.mobileModeLoaded = true;

// DETECCIÓN: Ejecutar solo si es celular
if (window.matchMedia("(max-width: 767px)").matches) {
    console.log("--- MODO CELULAR ACTIVADO ---");

    // Configuración Fija Celular
    const C_ROWS = 14;
    const C_COLS = 10;
    const C_MAX_WORDS = 4;

    // Estado Local (Independiente del escritorio)
    let c_grid = [];
    let c_placedWords = [];
    let c_currentLevelIndex = 0;
    let c_totalSeconds = 0;
    let c_levelSeconds = 0;
    let c_timerInterval;
    let c_currentGameMode = 'traditional';
    let c_hasRevived = false;
    let c_firstSelection = null;
    let c_isDragging = false;

    // Firebase Local
    const firebaseConfig = {
      apiKey: "AIzaSyBXOH-m6L0kS-0qVSAAh837R-lVIlFt2ZQ",
      authDomain: "sopa-de-letras-1bb46.firebaseapp.com",
      projectId: "sopa-de-letras-1bb46",
      storageBucket: "sopa-de-letras-1bb46.firebasestorage.app",
      messagingSenderId: "931258212814",
      appId: "1:931258212814:web:456b55dadb16602fb9cb9f"
    };
    let db, auth, user;
    try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        signInAnonymously(auth).then(u => user = u.user).catch(e=>{});
    } catch(e){}

    const mobileLevels = [
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

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playTone(freq, type, duration) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    // --- SOBRESCRIBIR FUNCIONES GLOBALES ---
    // Esto asegura que los botones llamen a NUESTRA lógica
    
    window.startMode = function(mode) {
        c_currentGameMode = mode;
        c_currentLevelIndex = 0;
        c_totalSeconds = 0;
        c_hasRevived = false;
        
        document.querySelectorAll('body > div[id$="-screen"]').forEach(div => div.classList.add('hidden'));
        document.getElementById('game-screen').classList.remove('hidden');
        
        const bg = document.getElementById('background-animation');
        if(bg) bg.innerHTML = '';
        
        initLevelC();
    };

    window.nextLevelWithAnimation = function() {
        const btn = document.getElementById('btn-next');
        if(btn.classList.contains('filling')) return;
        btn.classList.add('filling');
        setTimeout(() => {
            btn.classList.remove('filling');
            c_currentLevelIndex++;
            document.querySelectorAll('body > div[id$="-screen"]').forEach(div => div.classList.add('hidden'));
            document.getElementById('game-screen').classList.remove('hidden');
            initLevelC();
        }, 1500);
    };

    window.solveLevel = function() {
        c_placedWords.forEach(pw => {
            if(!pw.found) {
                pw.found = true;
                markWordFoundC(pw.coords, pw.word);
            }
        });
        setTimeout(levelCompleteC, 500);
    };

    window.revivePlayer = function() {
        c_hasRevived = true;
        c_levelSeconds += 30; 
        document.querySelectorAll('body > div[id$="-screen"]').forEach(div => div.classList.add('hidden'));
        document.getElementById('game-screen').classList.remove('hidden');
        c_timerInterval = setInterval(() => {
            c_levelSeconds--;
            c_totalSeconds++; 
            updateTimerC();
            if (c_levelSeconds <= 0) gameOverC();
        }, 1000);
    };

    window.saveScore = async function() {
        const name = document.getElementById('player-name-input').value.trim() || "Anónimo";
        const btnSave = document.getElementById('btn-save');
        btnSave.classList.add('btn-loading'); 
        
        if (db && user) {
            try {
                await addDoc(collection(db, 'scores'), { name: name, time: c_totalSeconds, date: new Date().toISOString(), uid: user.uid });
            } catch (e) {}
        }
        window.goToMenu(); // Esta usa la global original que solo cambia pantallas, está bien
        setTimeout(() => btnSave.classList.remove('btn-loading'), 500);
    };

    // --- LÓGICA ESPECÍFICA CELULAR ---

    function initLevelC() {
        const levelData = mobileLevels[c_currentLevelIndex];
        document.getElementById('level-indicator').textContent = `Nivel ${levelData.level}/10`;
        document.getElementById('status-msg').textContent = "Encuentra las palabras";

        if(c_timerInterval) clearInterval(c_timerInterval);
        
        // Timer
        if (c_currentGameMode === 'elimination') {
            c_levelSeconds = levelData.words.length * 12; 
            updateTimerC();
            c_timerInterval = setInterval(() => {
                c_levelSeconds--;
                c_totalSeconds++; 
                updateTimerC();
                if (c_levelSeconds <= 0) gameOverC();
            }, 1000);
        } else {
            updateTimerC();
            c_timerInterval = setInterval(() => {
                c_totalSeconds++;
                updateTimerC();
            }, 1000);
        }

        // Grid 14x10 Fijo
        c_placedWords = [];
        c_firstSelection = null;
        c_isDragging = false;
        let success = false;
        let attempts = 0;
        
        while(!success && attempts < 50) {
            c_grid = Array(C_ROWS).fill(null).map(() => Array(C_COLS).fill(''));
            c_placedWords = [];
            success = true;
            for (let word of levelData.words) {
                if (!placeWordC(word)) {
                    success = false; break;
                }
            }
            attempts++;
        }
        
        fillEmptySpacesC();
        
        // Renderizado con timeout para asegurar layout
        setTimeout(renderGridC, 50);
        
        c_placedWords.forEach((pw, i) => pw.rendered = i < C_MAX_WORDS);
        renderWordListC();
    }

    function updateTimerC() {
        const timerEl = document.getElementById('timer');
        const val = c_currentGameMode === 'elimination' ? c_levelSeconds : c_totalSeconds;
        const mins = Math.floor(val / 60).toString().padStart(2, '0');
        const secs = (val % 60).toString().padStart(2, '0');
        timerEl.textContent = `${mins}:${secs}`;
        document.getElementById('level-stats').textContent = `Tiempo Total: ${mins}:${secs}`;
    }

    function gameOverC() {
        clearInterval(c_timerInterval);
        const reviveContainer = document.getElementById('revive-container');
        if (!c_hasRevived) reviveContainer.style.display = 'flex';
        else {
            reviveContainer.style.display = 'none';
            document.querySelector('#game-over-screen h2').textContent = "Game Over";
        }
        document.querySelectorAll('body > div[id$="-screen"]').forEach(div => div.classList.add('hidden'));
        document.getElementById('game-over-screen').classList.remove('hidden');
        playTone(150, 'sawtooth', 0.5);
    }

    function placeWordC(word) {
        let placed = false;
        let att = 0;
        while (!placed && att < 100) {
            const dir = Math.floor(Math.random() * 3);
            const row = Math.floor(Math.random() * C_ROWS);
            const col = Math.floor(Math.random() * C_COLS);
            
            // Check boundaries
            let fits = true;
            if (dir === 0 && col + word.length > C_COLS) fits = false;
            if (dir === 1 && row + word.length > C_ROWS) fits = false;
            if (dir === 2 && (row + word.length > C_ROWS || col + word.length > C_COLS)) fits = false;

            if (fits) {
                // Check collision
                let collision = false;
                for (let i = 0; i < word.length; i++) {
                    let r = row, c = col;
                    if (dir === 0) c += i;
                    else if (dir === 1) r += i;
                    else if (dir === 2) { r += i; c += i; }
                    if (c_grid[r][c] !== '' && c_grid[r][c] !== word[i]) { collision = true; break; }
                }

                if (!collision) {
                    let coords = [];
                    for (let i = 0; i < word.length; i++) {
                        let r = row, c = col;
                        if (dir === 0) c += i;
                        else if (dir === 1) r += i;
                        else if (dir === 2) { r += i; c += i; }
                        c_grid[r][c] = word[i];
                        coords.push({r,c});
                    }
                    c_placedWords.push({ word: word, found: false, coords: coords, rendered: false });
                    placed = true;
                }
            }
            att++;
        }
        return placed;
    }

    function fillEmptySpacesC() {
        const letters = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
        for (let r = 0; r < C_ROWS; r++) {
            for (let c = 0; c < C_COLS; c++) {
                if (c_grid[r][c] === '') c_grid[r][c] = letters.charAt(Math.floor(Math.random() * letters.length));
            }
        }
    }

    function renderGridC() {
        const gridEl = document.getElementById('grid');
        gridEl.innerHTML = '';
        const wrapper = document.getElementById('grid-wrapper');
        const rect = wrapper.getBoundingClientRect();
        
        // Cálculo "FIT" para llenar todo el espacio
        const gap = 1;
        let wAvailable = rect.width || window.innerWidth;
        let hAvailable = rect.height || (window.innerHeight - 200);
        
        const w = (wAvailable - (C_COLS - 1) * gap) / C_COLS;
        const h = (hAvailable - (C_ROWS - 1) * gap) / C_ROWS;
        const cellSize = Math.floor(Math.min(w, h));
        
        gridEl.style.display = 'grid';
        gridEl.style.gridTemplateColumns = `repeat(${C_COLS}, ${cellSize}px)`;
        gridEl.style.gridTemplateRows = `repeat(${C_ROWS}, ${cellSize}px)`;
        gridEl.style.gap = `${gap}px`;
        
        window.removeEventListener('touchend', handleTouchEndC);
        window.addEventListener('touchend', handleTouchEndC);

        for (let r = 0; r < C_ROWS; r++) {
            for (let c = 0; c < C_COLS; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = c_grid[r][c];
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.style.width = `${cellSize}px`;
                cell.style.height = `${cellSize}px`;
                cell.style.fontSize = `${cellSize * 0.65}px`;
                
                cell.addEventListener('touchstart', (e) => handleTouchStartC(r, c, cell, e));
                cell.addEventListener('touchmove', (e) => handleTouchMoveC(e));
                gridEl.appendChild(cell);
            }
        }
    }

    function renderWordListC() {
        const listEl = document.getElementById('word-list');
        listEl.innerHTML = '';
        c_placedWords.forEach(obj => {
            if (obj.rendered) {
                const li = document.createElement('li');
                li.textContent = obj.word;
                li.id = 'word-' + obj.word;
                if (obj.found) li.classList.add('found-word');
                listEl.appendChild(li);
            }
        });
    }

    // --- TOUCH EVENTS ---
    function handleTouchStartC(r, c, cellEl, e) {
        if(e.cancelable) e.preventDefault();
        playTone(300, 'sine', 0.05);
        if (!c_firstSelection) {
            c_firstSelection = { r, c, el: cellEl };
            cellEl.classList.add('selected');
            c_isDragging = true;
        } else {
            if (c_firstSelection.r === r && c_firstSelection.c === c) c_isDragging = true;
            else {
                checkWordC(c_firstSelection, { r, c });
                clearVisualsC();
                c_firstSelection = null;
                c_isDragging = false;
            }
        }
    }

    function handleTouchMoveC(e) {
        if (!c_isDragging || !c_firstSelection) return;
        e.preventDefault();
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && target.classList.contains('cell')) {
            const r = parseInt(target.dataset.r);
            const c = parseInt(target.dataset.c);
            updateDragC(c_firstSelection, {r, c});
        }
    }

    function handleTouchEndC(e) {
        if (c_isDragging && c_firstSelection && c_firstSelection.lastEnd) {
            checkWordC(c_firstSelection, c_firstSelection.lastEnd);
            clearVisualsC();
            c_firstSelection = null;
            c_isDragging = false;
        }
    }

    function updateDragC(start, end) {
        clearVisualsC();
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
                if(cell) cell.classList.add('selected');
                r += stepR; c += stepC;
            }
            start.lastEnd = end;
        }
    }

    function clearVisualsC() {
        document.querySelectorAll('.cell.selected').forEach(el => el.classList.remove('selected'));
    }

    function checkWordC(start, end) {
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
            formedWord += c_grid[r][c];
            coords.push({r, c});
            r += stepR; c += stepC;
        }

        const reversedWord = formedWord.split('').reverse().join('');
        const foundObj = c_placedWords.find(pw => (pw.word === formedWord || pw.word === reversedWord) && !pw.found);

        if (foundObj) {
            foundObj.found = true;
            markWordFoundC(foundObj.coords, foundObj.word);
            document.getElementById('status-msg').textContent = `¡${foundObj.word} encontrada!`;
            playTone(440, 'sine', 0.1);
            if (c_currentGameMode === 'elimination') {
                c_levelSeconds += 5; updateTimerC();
            }
            if (c_placedWords.every(pw => pw.found)) {
                setTimeout(levelCompleteC, 800);
            }
        }
    }

    function markWordFoundC(coords, wordText) {
        coords.forEach((coord, index) => {
            const cell = document.querySelector(`.cell[data-r='${coord.r}'][data-c='${coord.c}']`);
            if(cell) setTimeout(() => cell.classList.add('found'), index * 40);
        });
        const li = document.getElementById('word-' + wordText);
        if (li) {
            li.remove();
            const nextWord = c_placedWords.find(pw => !pw.rendered && !pw.found);
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

    function levelCompleteC() {
        clearInterval(c_timerInterval);
        const titleEl = document.getElementById('level-complete-title');
        const btnNext = document.getElementById('btn-next');
        const finalForm = document.getElementById('final-form');
        
        if(c_currentLevelIndex === mobileLevels.length - 1) {
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