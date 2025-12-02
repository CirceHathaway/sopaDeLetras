import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Solo ejecutar si estamos en rango de CELULAR
if (window.matchMedia("(max-width: 700px)").matches) {

    const C_ROWS = 14;
    const C_COLS = 10;
    const C_MAX_WORDS = 4;

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

    // Sobrescribir funciones globales
    window.initLevel = function() {
        let lvlTxt = document.getElementById('level-indicator').textContent;
        let lvl = parseInt(lvlTxt.split('/')[0].replace('Nivel ', '')) || 1;
        let idx = lvl - 1;
        const levelData = mobileLevels[idx];

        if(window.stopTimer) window.stopTimer();

        let grid = Array(C_ROWS).fill(null).map(() => Array(C_COLS).fill(''));
        let placedWords = [];
        let success = false;
        let attempts = 0;

        while(!success && attempts < 50) {
            grid = Array(C_ROWS).fill(null).map(() => Array(C_COLS).fill(''));
            placedWords = [];
            success = true;
            for (let word of levelData.words) {
                if (!placeWordMobile(word, C_ROWS, C_COLS, grid, placedWords)) {
                    success = false; break;
                }
            }
            attempts++;
        }

        fillEmptySpacesMobile(C_ROWS, C_COLS, grid);

        // Renderizado diferido para asegurar cálculo de dimensiones
        setTimeout(() => {
            renderGridMobile(C_ROWS, C_COLS, grid);
        }, 50);
        setTimeout(() => {
            renderGridMobile(C_ROWS, C_COLS, grid);
        }, 200); // Doble check

        placedWords.forEach((pw, i) => pw.rendered = i < C_MAX_WORDS);
        renderWordListMobile(placedWords);

        window.grid = grid;
        window.placedWords = placedWords;
        window.currentRows = C_ROWS;
        window.currentCols = C_COLS;

        if (window.currentGameMode === 'elimination') {
            window.levelSeconds = levelData.words.length * 12; 
            window.updateTimerDisplay();
            window.timerInterval = setInterval(() => {
                window.levelSeconds--;
                window.totalSeconds++; 
                window.updateTimerDisplay();
                if (window.levelSeconds <= 0) window.gameOver();
            }, 1000);
        } else {
            window.updateTimerDisplay();
            window.timerInterval = setInterval(() => {
                window.totalSeconds++;
                window.updateTimerDisplay();
            }, 1000);
        }
    };

    function placeWordMobile(word, rows, cols, gridRef, wordsRef) {
        let placed = false;
        let att = 0;
        while (!placed && att < 100) {
            const dir = Math.floor(Math.random() * 3);
            const row = Math.floor(Math.random() * rows);
            const col = Math.floor(Math.random() * cols);
            if (canPlaceMobile(word, row, col, dir, rows, cols, gridRef)) {
                let coords = [];
                for (let i = 0; i < word.length; i++) {
                    let r, c;
                    if (dir === 0) { r = row; c = col + i; }
                    else if (dir === 1) { r = row + i; c = col; }
                    else if (dir === 2) { r = row + i; c = col + i; }
                    gridRef[r][c] = word[i];
                    coords.push({r,c});
                }
                wordsRef.push({ word: word, found: false, coords: coords, rendered: false });
                placed = true;
            }
            att++;
        }
        return placed;
    }

    function canPlaceMobile(word, row, col, dir, rows, cols, gridRef) {
        if (dir === 0 && col + word.length > cols) return false;
        if (dir === 1 && row + word.length > rows) return false;
        if (dir === 2 && (row + word.length > rows || col + word.length > cols)) return false;
        for (let i = 0; i < word.length; i++) {
            let existing = gridRef[dir === 0 ? row : (dir === 1 ? row + i : row + i)][dir === 0 ? col + i : (dir === 1 ? col : col + i)];
            if (existing !== '' && existing !== word[i]) return false;
        }
        return true;
    }

    function fillEmptySpacesMobile(rows, cols, gridRef) {
        const letters = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (gridRef[r][c] === '') gridRef[r][c] = letters.charAt(Math.floor(Math.random() * letters.length));
            }
        }
    }

    function renderGridMobile(rows, cols, gridRef) {
        const gridEl = document.getElementById('grid');
        const wrapper = document.getElementById('grid-wrapper');
        
        if (!gridEl || !wrapper) return;
        
        gridEl.innerHTML = '';
        
        // Medidas reales o fallback a ventana si es 0
        let rect = wrapper.getBoundingClientRect();
        let width = rect.width;
        let height = rect.height;

        if (width === 0) width = window.innerWidth - 4;
        if (height === 0) height = window.innerHeight - 150; // Estimación

        const gap = 1;
        const w = (width - (cols - 1) * gap) / cols;
        const h = (height - (rows - 1) * gap) / rows;
        const cellSize = Math.floor(Math.min(w, h));
        
        gridEl.style.display = 'grid';
        gridEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
        gridEl.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
        gridEl.style.gap = `${gap}px`;

        window.removeEventListener('touchend', handleGlobalTouchEndMobile);
        window.addEventListener('touchend', handleGlobalTouchEndMobile);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = gridRef[r][c];
                cell.dataset.r = r;
                cell.dataset.c = c;
                
                cell.style.width = `${cellSize}px`;
                cell.style.height = `${cellSize}px`;
                cell.style.fontSize = `${cellSize * 0.65}px`;
                
                cell.addEventListener('touchstart', (e) => handleTouchStartMobile(r, c, cell, e));
                cell.addEventListener('touchmove', (e) => handleTouchMoveMobile(e));
                
                gridEl.appendChild(cell);
            }
        }
    }

    function renderWordListMobile(wordsRef) {
        const listEl = document.getElementById('word-list');
        listEl.innerHTML = '';
        wordsRef.forEach(obj => {
            if (obj.rendered) {
                const li = document.createElement('li');
                li.textContent = obj.word;
                li.id = 'word-' + obj.word;
                listEl.appendChild(li);
            }
        });
    }

    let c_firstSelection = null;
    let c_isDragging = false;

    function handleTouchStartMobile(r, c, cellEl, e) {
        if(e.cancelable) e.preventDefault();
        if (window.playTone) window.playTone(300, 'sine', 0.05);
        
        if (!c_firstSelection) {
            c_firstSelection = { r, c, el: cellEl };
            cellEl.classList.add('selected');
            c_isDragging = true;
        } else {
            if (c_firstSelection.r === r && c_firstSelection.c === c) {
                c_isDragging = true; 
            } else {
                checkWordMobile(c_firstSelection, { r, c });
                clearVisualsMobile();
                c_firstSelection = null;
                c_isDragging = false;
            }
        }
    }

    function handleTouchMoveMobile(e) {
        if (!c_isDragging || !c_firstSelection) return;
        e.preventDefault();
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && target.classList.contains('cell')) {
            const r = parseInt(target.dataset.r);
            const c = parseInt(target.dataset.c);
            updateDragMobile(c_firstSelection, {r, c});
        }
    }

    function handleGlobalTouchEndMobile(e) {
        if (c_isDragging) {
            c_isDragging = false;
            if (c_firstSelection && c_firstSelection.lastEnd) {
                checkWordMobile(c_firstSelection, c_firstSelection.lastEnd);
                clearVisualsMobile();
                c_firstSelection = null;
            }
        }
    }

    function updateDragMobile(start, end) {
        clearVisualsMobile();
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

    function clearVisualsMobile() {
        document.querySelectorAll('.cell.selected').forEach(el => el.classList.remove('selected'));
    }

    function checkWordMobile(start, end) {
        const dRow = end.r - start.r;
        const dCol = end.c - start.c;
        if (dRow !== 0 && dCol !== 0 && Math.abs(dRow) !== Math.abs(dCol)) return;

        const steps = Math.max(Math.abs(dRow), Math.abs(dCol));
        const stepR = dRow === 0 ? 0 : dRow / Math.abs(dRow);
        const stepC = dCol === 0 ? 0 : dCol / Math.abs(dCol);
        let formedWord = "";
        let currR = start.r;
        let currC = start.c;
        let coords = [];

        const gridRef = window.grid; 
        
        for (let i = 0; i <= steps; i++) {
            formedWord += gridRef[currR][currC];
            coords.push({r: currR, c: currC});
            currR += stepR;
            currC += stepC;
        }

        const reversedWord = formedWord.split('').reverse().join('');
        const foundObj = window.placedWords.find(pw => (pw.word === formedWord || pw.word === reversedWord) && !pw.found);

        if (foundObj) {
            foundObj.found = true;
            markWordFoundMobile(foundObj.coords, foundObj.word);
            document.getElementById('status-msg').textContent = `¡${foundObj.word} encontrada!`;
            if(window.playTone) window.playTone(440, 'sine', 0.1);
            
            if (window.currentGameMode === 'elimination') {
                window.levelSeconds += 5; 
                window.updateTimerDisplay();
            }
            if (window.placedWords.every(pw => pw.found)) {
                setTimeout(window.levelComplete, 800);
            }
        }
    }

    function markWordFoundMobile(coords, wordText) {
        coords.forEach((coord, index) => {
            const cell = document.querySelector(`.cell[data-r='${coord.r}'][data-c='${coord.c}']`);
            if(cell) setTimeout(() => cell.classList.add('found'), index * 40);
        });
        const li = document.getElementById('word-' + wordText);
        if (li) {
            li.remove();
            const nextWord = window.placedWords.find(pw => !pw.rendered && !pw.found);
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
}