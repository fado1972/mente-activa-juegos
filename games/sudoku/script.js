// ============================================
// Sudoku
// ============================================

const boardEl = document.getElementById("board");
const loadingEl = document.getElementById("loading-msg");
const difficultySelect = document.getElementById("difficulty-select");
const restartBtn = document.getElementById("restart-btn");
const checkBtn = document.getElementById("check-btn");
const checkMsgEl = document.getElementById("check-msg");
const timeValueEl = document.getElementById("time-value");
const bestValueEl = document.getElementById("best-value");
const bestDateEl = document.getElementById("best-date");
const numberPadEl = document.getElementById("number-pad");
const notesBtn = document.getElementById("notes-btn");
const overlayEl = document.getElementById("overlay");
const finalTimeEl = document.getElementById("final-time");
const recordMsgEl = document.getElementById("record-msg");
const playAgainBtn = document.getElementById("play-again-btn");

const STORAGE_PREFIX = "sudoku-best-";
const CLUES_BY_DIFFICULTY = { easy: 40, medium: 32, hard: 28, expert: 24 };

let puzzleGrid = [];
let solutionGrid = [];
let userGrid = [];
let notesGrid = [];
let cellEls = [];
let selected = null;
let startTime = null;
let timerId = null;
let finished = false;
let notesMode = false;

// ---------- Generación del sudoku ----------

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function emptyGrid() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function isSafe(grid, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num || grid[i][col] === num) return false;
  }
  const boxRow = row - (row % 3);
  const boxCol = col - (col % 3);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[boxRow + r][boxCol + c] === num) return false;
    }
  }
  return true;
}

function fillGrid(grid) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (isSafe(grid, row, col, num)) {
            grid[row][col] = num;
            if (fillGrid(grid)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

// Cuenta soluciones posibles (se detiene en cuanto encuentra más de una).
function countSolutions(grid) {
  let count = 0;

  function solve() {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isSafe(grid, row, col, num)) {
              grid[row][col] = num;
              solve();
              grid[row][col] = 0;
              if (count > 1) return;
            }
          }
          return;
        }
      }
    }
    count++;
  }

  solve();
  return count;
}

function generatePuzzle(cluesToKeep) {
  const solution = emptyGrid();
  fillGrid(solution);

  const puzzle = solution.map((row) => [...row]);
  const positions = shuffle(Array.from({ length: 81 }, (_, i) => i));
  let cellsToRemove = 81 - cluesToKeep;

  for (const pos of positions) {
    if (cellsToRemove <= 0) break;
    const row = Math.floor(pos / 9);
    const col = pos % 9;
    if (puzzle[row][col] === 0) continue;

    const backup = puzzle[row][col];
    puzzle[row][col] = 0;

    const copy = puzzle.map((r) => [...r]);
    if (countSolutions(copy) !== 1) {
      puzzle[row][col] = backup;
    } else {
      cellsToRemove--;
    }
  }

  return { puzzle, solution };
}

// ---------- Récords ----------

function bestKey(difficulty) {
  return `${STORAGE_PREFIX}${difficulty}`;
}

function getBest(difficulty) {
  const raw = localStorage.getItem(bestKey(difficulty));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "time" in parsed) return parsed;
    return { time: parseFloat(raw), date: null };
  } catch {
    return null;
  }
}

function setBest(difficulty, seconds) {
  const record = { time: seconds, date: new Date().toISOString() };
  localStorage.setItem(bestKey(difficulty), JSON.stringify(record));
}

function formatTime(seconds) {
  return `${seconds.toFixed(1)}s`;
}

function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function updateBestDisplay() {
  const best = getBest(difficultySelect.value);
  if (best) {
    bestValueEl.textContent = formatTime(best.time);
    bestDateEl.textContent = best.date ? formatDate(best.date) : "";
  } else {
    bestValueEl.textContent = "—";
    bestDateEl.textContent = "";
  }
}

// ---------- Tablero e interacción ----------

function buildBoard() {
  finished = false;
  selected = null;
  startTime = null;
  clearInterval(timerId);
  timeValueEl.textContent = "0.0s";
  checkMsgEl.textContent = "—";
  overlayEl.classList.add("hidden");
  updateBestDisplay();

  boardEl.classList.add("hidden");
  loadingEl.classList.remove("hidden");

  // Pequeño delay para que se pinte el "Generando puzzle..." antes
  // de bloquear el hilo principal con el cálculo del sudoku.
  setTimeout(() => {
    const clues = CLUES_BY_DIFFICULTY[difficultySelect.value];
    const { puzzle, solution } = generatePuzzle(clues);
    puzzleGrid = puzzle;
    solutionGrid = solution;
    userGrid = puzzle.map((row) => [...row]);
    notesGrid = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
    renderBoardCells();
    loadingEl.classList.add("hidden");
    boardEl.classList.remove("hidden");
  }, 30);
}

function renderBoardCells() {
  boardEl.innerHTML = "";
  cellEls = [];

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const val = puzzleGrid[row][col];
      const cell = document.createElement("div");
      cell.className = "sudoku-cell" + (val !== 0 ? " fixed" : "");
      if (col % 3 === 2 && col !== 8) cell.classList.add("box-right");
      if (row % 3 === 2 && row !== 8) cell.classList.add("box-bottom");
      cell.tabIndex = 0;
      cell.setAttribute("role", "gridcell");
      cell.addEventListener("click", () => selectCell(row, col));
      cell.addEventListener("focus", () => selectCell(row, col));
      boardEl.appendChild(cell);
      cellEls.push(cell);
    }
  }

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      renderCellContent(row, col);
    }
  }

  updateNumberPadState();
}

// Pinta el contenido de una celda: el número grande si tiene valor,
// o la mini-cuadrícula de notas (lápiz) si no lo tiene.
function renderCellContent(row, col) {
  const el = cellEls[row * 9 + col];
  const val = userGrid[row][col];

  if (val !== 0) {
    el.textContent = String(val);
    el.classList.remove("has-notes");
    return;
  }

  const notes = notesGrid[row][col];
  if (!notes || notes.size === 0) {
    el.textContent = "";
    el.classList.remove("has-notes");
    return;
  }

  el.classList.add("has-notes");
  el.innerHTML = `<div class="notes-grid">${Array.from({ length: 9 }, (_, i) => {
    const n = i + 1;
    return `<span class="note">${notes.has(n) ? n : ""}</span>`;
  }).join("")}</div>`;
}

// Pone en gris los números del panel inferior que ya están
// colocados 9 veces en el tablero (independientemente de si
// están bien puestos o no).
function updateNumberPadState() {
  const counts = {};
  for (let n = 1; n <= 9; n++) counts[n] = 0;

  userGrid.forEach((row) => {
    row.forEach((val) => {
      if (val !== 0) counts[val] += 1;
    });
  });

  numberPadEl.querySelectorAll(".number-btn").forEach((btn) => {
    const num = parseInt(btn.dataset.num, 10);
    if (num === 0) return;
    btn.classList.toggle("complete", counts[num] >= 9);
  });
}

function selectCell(row, col) {
  if (finished) return;
  selected = { row, col };
  highlight();
  const el = cellEls[row * 9 + col];
  if (el && document.activeElement !== el) el.focus({ preventScroll: true });
}

function highlight() {
  cellEls.forEach((el) => el.classList.remove("selected", "peer", "same-value"));
  if (!selected) return;

  const { row, col } = selected;
  const selVal = userGrid[row][col];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const el = cellEls[r * 9 + c];
      if (r === row && c === col) {
        el.classList.add("selected");
        continue;
      }
      const sameBox = Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(col / 3);
      if (r === row || c === col || sameBox) el.classList.add("peer");
      if (selVal !== 0 && userGrid[r][c] === selVal) el.classList.add("same-value");
    }
  }
}

function setValue(row, col, num) {
  if (puzzleGrid[row][col] !== 0) return; // celda fija, no se puede tocar
  if (finished) return;

  if (startTime === null && num !== 0) {
    startTime = performance.now();
    timerId = setInterval(updateTimer, 100);
  }

  userGrid[row][col] = num;
  notesGrid[row][col].clear();
  if (num !== 0) clearNoteFromPeers(row, col, num);

  renderCellContent(row, col);
  updateConflicts();
  highlight();
  updateNumberPadState();
  checkCompletion();
}

// Al fijar un número, lo quita de las notas de la misma fila,
// columna y región (ya no son candidatos válidos ahí).
function clearNoteFromPeers(row, col, num) {
  for (let c = 0; c < 9; c++) notesGrid[row][c].delete(num);
  for (let r = 0; r < 9; r++) notesGrid[r][col].delete(num);

  const boxRow = row - (row % 3);
  const boxCol = col - (col % 3);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) notesGrid[boxRow + r][boxCol + c].delete(num);
  }

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (userGrid[r][c] === 0) renderCellContent(r, c);
    }
  }
}

// Añade o quita una nota (candidato en lápiz) de una celda vacía.
function toggleNote(row, col, num) {
  if (puzzleGrid[row][col] !== 0) return;
  if (userGrid[row][col] !== 0) return; // no se anotan celdas ya rellenas
  if (finished) return;

  const notes = notesGrid[row][col];
  if (notes.has(num)) {
    notes.delete(num);
  } else {
    notes.add(num);
  }
  renderCellContent(row, col);
}

// Punto de entrada único para el numpad y el teclado: decide si el
// número va como valor definitivo o como nota, según el modo activo.
function handleInput(row, col, num) {
  if (finished) return;
  if (puzzleGrid[row][col] !== 0) return;

  if (num === 0) {
    setValue(row, col, 0); // el borrado siempre limpia valor y notas
    return;
  }

  if (notesMode) {
    toggleNote(row, col, num);
  } else {
    setValue(row, col, num);
  }
}

function toggleNotesMode() {
  notesMode = !notesMode;
  notesBtn.classList.toggle("active", notesMode);
}

function updateConflicts() {
  cellEls.forEach((el) => el.classList.remove("conflict"));

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const val = userGrid[row][col];
      if (val === 0) continue;

      for (let c = 0; c < 9; c++) {
        if (c !== col && userGrid[row][c] === val) {
          cellEls[row * 9 + col].classList.add("conflict");
          cellEls[row * 9 + c].classList.add("conflict");
        }
      }
      for (let r = 0; r < 9; r++) {
        if (r !== row && userGrid[r][col] === val) {
          cellEls[row * 9 + col].classList.add("conflict");
          cellEls[r * 9 + col].classList.add("conflict");
        }
      }
      const boxRow = row - (row % 3);
      const boxCol = col - (col % 3);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const rr = boxRow + r;
          const cc = boxCol + c;
          if ((rr !== row || cc !== col) && userGrid[rr][cc] === val) {
            cellEls[row * 9 + col].classList.add("conflict");
            cellEls[rr * 9 + cc].classList.add("conflict");
          }
        }
      }
    }
  }
}

function isBoardFull() {
  return userGrid.every((row) => row.every((v) => v !== 0));
}

function isBoardCorrect() {
  return userGrid.every((row, r) => row.every((v, c) => v === solutionGrid[r][c]));
}

function checkCompletion() {
  if (isBoardFull() && isBoardCorrect()) {
    finishGame();
  }
}

function checkProgress() {
  let wrong = 0;
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const val = userGrid[row][col];
      if (val !== 0 && val !== solutionGrid[row][col]) {
        cellEls[row * 9 + col].classList.add("check-wrong");
        wrong++;
      }
    }
  }

  checkMsgEl.textContent = wrong === 0 ? "¡Todo bien!" : `${wrong} incorrecta${wrong > 1 ? "s" : ""}`;

  setTimeout(() => {
    cellEls.forEach((el) => el.classList.remove("check-wrong"));
  }, 1500);
}

function updateTimer() {
  const elapsed = (performance.now() - startTime) / 1000;
  timeValueEl.textContent = formatTime(elapsed);
}

function finishGame() {
  finished = true;
  clearInterval(timerId);
  const elapsed = (performance.now() - startTime) / 1000;
  timeValueEl.textContent = formatTime(elapsed);
  checkMsgEl.textContent = "¡Resuelto!";

  const difficulty = difficultySelect.value;
  const best = getBest(difficulty);
  let recordMsg = "";
  if (best === null || elapsed < best.time) {
    setBest(difficulty, elapsed);
    recordMsg = "🏆 ¡Nuevo mejor tiempo!";
  } else {
    recordMsg = `Tu mejor tiempo sigue siendo ${formatTime(best.time)} (${formatDate(best.date)})`;
  }

  finalTimeEl.textContent = formatTime(elapsed);
  recordMsgEl.textContent = recordMsg;
  updateBestDisplay();
  overlayEl.classList.remove("hidden");
}

// ---------- Eventos ----------

numberPadEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".number-btn");
  if (!btn || !selected) return;
  handleInput(selected.row, selected.col, parseInt(btn.dataset.num, 10));
});

notesBtn.addEventListener("click", toggleNotesMode);

document.addEventListener("keydown", (e) => {
  if (!selected || finished) return;
  const { row, col } = selected;

  if (e.key >= "1" && e.key <= "9") {
    handleInput(row, col, parseInt(e.key, 10));
  } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
    handleInput(row, col, 0);
  } else if (e.key.toLowerCase() === "n") {
    toggleNotesMode();
  } else if (e.key === "ArrowUp" && row > 0) {
    selectCell(row - 1, col);
  } else if (e.key === "ArrowDown" && row < 8) {
    selectCell(row + 1, col);
  } else if (e.key === "ArrowLeft" && col > 0) {
    selectCell(row, col - 1);
  } else if (e.key === "ArrowRight" && col < 8) {
    selectCell(row, col + 1);
  }
});

difficultySelect.addEventListener("change", buildBoard);
restartBtn.addEventListener("click", buildBoard);
checkBtn.addEventListener("click", checkProgress);
playAgainBtn.addEventListener("click", buildBoard);

buildBoard();
