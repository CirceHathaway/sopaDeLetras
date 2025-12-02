if (window.innerWidth >= 768 && window.innerWidth <= 1024) {

    const T_ROWS = 16;
    const T_COLS = 15;
    const T_MAX_WORDS = 7;

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

    // Sobrescribir initLevel global
    window.initLevel = function() {
        console.log("Iniciando modo TABLETA (16x15)");
        let lvlTxt = document.getElementById('level-indicator').textContent;
        let lvl = parseInt(lvlTxt.split('/')[0].replace('Nivel ', '')) || 1;
        let idx = lvl - 1;
        const levelData = tabletLevels[idx];

        if(window.stopTimer) window.stopTimer();

        let grid = Array(T_ROWS).fill(null).map(() => Array(T_COLS).fill(''));
        let placedWords = [];
        
        let success = false;
        let attempts = 0;
        while(!success && attempts < 50) {
            grid = Array(T_ROWS).fill(null).map(() => Array(T_COLS).fill(''));
            placedWords = [];
            success = true;
            for (let word of levelData.words) {
                if (!placeWordTablet(word, T_ROWS, T_COLS, grid, placedWords)) {
                    success = false; break;
                }
            }
            attempts++;
        }
        
        fillEmptySpacesTablet(T_ROWS, T_COLS, grid);
        
        setTimeout(() => {
            renderGridTablet(T_ROWS, T_COLS, grid);
        }, 50);
        
        placedWords.forEach((pw, i) => pw.rendered = i < T_MAX_WORDS);
        renderWordListTablet(placedWords);
        
        // Exportar estado global para que los eventos funcionen
        window.grid = grid;
        window.placedWords = placedWords;
        
        // Timer (reutilizamos la variable global si existe, o la creamos)
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

    function placeWordTablet(word, rows, cols, gridRef, wordsRef) {
        let placed = false;
        let att = 0;
        while (!placed && att < 100) {
            const dir = Math.floor(Math.random() * 3);
            const row = Math.floor(Math.random() * rows);
            const col = Math.floor(Math.random() * cols);
            if (canPlaceTablet(word, row, col, dir, rows, cols, gridRef)) {
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

    function canPlaceTablet(word, row, col, dir, rows, cols, gridRef) {
        if (dir === 0 && col + word.length > cols) return false;
        if (dir === 1 && row + word.length > rows) return false;
        if (dir === 2 && (row + word.length > rows || col + word.length > cols)) return false;
        for (let i = 0; i < word.length; i++) {
            let existing = gridRef[dir === 0 ? row : (dir === 1 ? row + i : row + i)][dir === 0 ? col + i : (dir === 1 ? col : col + i)];
            if (existing !== '' && existing !== word[i]) return false;
        }
        return true;
    }

    function fillEmptySpacesTablet(rows, cols, gridRef) {
        const letters = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (gridRef[r][c] === '') gridRef[r][c] = letters.charAt(Math.floor(Math.random() * letters.length));
            }
        }
    }

    function renderGridTablet(rows, cols, gridRef) {
        const gridEl = document.getElementById('grid');
        gridEl.innerHTML = '';
        const wrapper = document.getElementById('grid-wrapper');
        const rect = wrapper.getBoundingClientRect();
        const gap = 2;
        
        const w = (rect.width - (cols - 1) * gap) / cols;
        const h = (rect.height - (rows - 1) * gap) / rows;
        const cellSize = Math.floor(Math.min(w, h));
        
        gridEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
        gridEl.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
        gridEl.style.gap = `${gap}px`;
        
        // Usamos el handler global de celular (funcionalidadC.js) si está cargado, 
        // o definimos uno propio si solo carga tablet. Asumimos que se cargan ambos o usamos el global.
        // Para seguridad, definimos el handler touch aquí también.
        
        window.removeEventListener('touchend', handleGlobalTouchEndTablet);
        window.addEventListener('touchend', handleGlobalTouchEndTablet);

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
                
                cell.addEventListener('touchstart', (e) => handleTouchStartTablet(r, c, cell, e));
                cell.addEventListener('touchmove', (e) => handleTouchMoveTablet(e));
                
                gridEl.appendChild(cell);
            }
        }
    }

    function renderWordListTablet(wordsRef) {
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

    // Lógica Táctil Tableta (Local)
    let t_firstSelection = null;
    let t_isDragging = false;

    function handleTouchStartTablet(r, c, cellEl, e) {
        if(e.cancelable) e.preventDefault();
        if (!t_firstSelection) {
            t_firstSelection = { r, c, el: cellEl };
            cellEl.classList.add('selected');
            t_isDragging = true;
        } else {
            if (t_firstSelection.r === r && t_firstSelection.c === c) {
                t_isDragging = true;
            } else {
                checkWordTablet(t_firstSelection, { r, c });
                clearVisualsTablet();
                t_firstSelection = null;
                t_isDragging = false;
            }
        }
    }

    function handleTouchMoveTablet(e) {
        if (!t_isDragging || !t_firstSelection) return;
        e.preventDefault();
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && target.classList.contains('cell')) {
            const r = parseInt(target.dataset.r);
            const c = parseInt(target.dataset.c);
            updateDragTablet(t_firstSelection, {r, c});
        }
    }

    function handleGlobalTouchEndTablet(e) {
        if (t_isDragging) {
            t_isDragging = false;
            if (t_firstSelection && t_firstSelection.lastEnd) {
                checkWordTablet(t_firstSelection, t_firstSelection.lastEnd);
                clearVisualsTablet();
                t_firstSelection = null;
            }
        }
    }

    function updateDragTablet(start, end) {
        clearVisualsTablet();
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

    function clearVisualsTablet() {
        document.querySelectorAll('.cell.selected').forEach(el => el.classList.remove('selected'));
    }

    function checkWordTablet(start, end) {
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
        
        // Usamos variable global del modulo original
        const currentGrid = window.grid; 

        for (let i = 0; i <= steps; i++) {
            formedWord += currentGrid[currR][currC];
            coords.push({r: currR, c: currC});
            currR += stepR;
            currC += stepC;
        }

        const reversedWord = formedWord.split('').reverse().join('');
        const foundObj = window.placedWords.find(pw => (pw.word === formedWord || pw.word === reversedWord) && !pw.found);

        if (foundObj) {
            foundObj.found = true;
            markWordFoundTablet(foundObj.coords, foundObj.word);
            document.getElementById('status-msg').textContent = `¡${foundObj.word} encontrada!`;
            
            if (window.currentGameMode === 'elimination') {
                window.levelSeconds += 5; 
                window.updateTimerDisplay();
            }
            if (window.placedWords.every(pw => pw.found)) {
                setTimeout(window.levelComplete, 800);
            }
        }
    }

    function markWordFoundTablet(coords, wordText) {
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