// ============================================
// Tabla de Schulte
// ============================================

const boardEl = document.getElementById("board");
const sizeSelect = document.getElementById("size-select");
const modeSelect = document.getElementById("mode-select");
const playModeSelect = document.getElementById("play-mode-select");
const restartBtn = document.getElementById("restart-btn");
const modeDescriptionEl = document.getElementById("mode-description");
const mentalHintEl = document.getElementById("mental-hint");
const targetStatEl = document.getElementById("target-stat");
const targetValueEl = document.getElementById("target-value");
const timeValueEl = document.getElementById("time-value");
const bestValueEl = document.getElementById("best-value");
const bestDateEl = document.getElementById("best-date");
const overlayEl = document.getElementById("overlay");
const finalTimeEl = document.getElementById("final-time");
const recordMsgEl = document.getElementById("record-msg");
const playAgainBtn = document.getElementById("play-again-btn");
const mentalControlsEl = document.getElementById("mental-controls");
const mentalStartBtn = document.getElementById("mental-start-btn");
const mentalStopBtn = document.getElementById("mental-stop-btn");

const STORAGE_PREFIX = "schulte-best-";

const CLICK_DESCRIPTION =
  "Pulsa los números en orden (1, 2, 3...) lo más rápido que puedas, sin mover la vista del centro.";
const MENTAL_DESCRIPTION =
  "No pinches nada: pulsa «Empezar», recorre los números en orden solo con la vista y pulsa «He terminado» al llegar al último.";

let size = parseInt(sizeSelect.value, 10);
let mode = modeSelect.value; // "numbers" | "letters" | "mixed"
let playMode = playModeSelect.value; // "click" | "mental"
let sequence = []; // orden correcto de etiquetas a pulsar, ej. ["1","2","3"] o ["1","A","2","B"]
let targetIndex = 0;
let total = size * size;
let startTime = null;
let timerId = null;
let finished = false;

// Convierte un índice (0-based) en una etiqueta de letras estilo columnas
// de hoja de cálculo: 0->A, 1->B, ..., 25->Z, 26->AA, 27->AB, ...
function letterLabel(index) {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

// Genera la secuencia ordenada de etiquetas que hay que pulsar,
// según el modo elegido.
function generateSequence(totalCells, currentMode) {
  if (currentMode === "letters") {
    return Array.from({ length: totalCells }, (_, i) => letterLabel(i));
  }

  if (currentMode === "mixed") {
    const numCount = Math.ceil(totalCells / 2);
    const letterCount = totalCells - numCount;
    const nums = Array.from({ length: numCount }, (_, i) => String(i + 1));
    const letters = Array.from({ length: letterCount }, (_, i) => letterLabel(i));
    const seq = [];
    let ni = 0;
    let li = 0;
    while (ni < nums.length || li < letters.length) {
      if (ni < nums.length) seq.push(nums[ni++]);
      if (li < letters.length) seq.push(letters[li++]);
    }
    return seq;
  }

  // "numbers" (por defecto)
  return Array.from({ length: totalCells }, (_, i) => String(i + 1));
}

// El modo mental mide una habilidad distinta (sin verificación de
// clics, cronómetro parado a mano), así que guarda su propio récord
// para no mezclarlo con el modo interactivo. El modo interactivo
// conserva la clave de siempre para no perder récords ya guardados.
function bestKey(n, m, pm) {
  const suffix = pm === "mental" ? "-mental" : "";
  return `${STORAGE_PREFIX}${n}x${n}-${m}${suffix}`;
}

// El récord se guarda como { time, date } para conservar siempre
// la fecha en la que se consiguió, junto con el tiempo.
function getBest(n, m, pm) {
  const raw = localStorage.getItem(bestKey(n, m, pm));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "time" in parsed) {
      return parsed;
    }
    // Compatibilidad con el formato antiguo (solo un número, sin modo).
    return { time: parseFloat(raw), date: null };
  } catch {
    return { time: parseFloat(raw), date: null };
  }
}

function setBest(n, m, pm, seconds) {
  const record = { time: seconds, date: new Date().toISOString() };
  localStorage.setItem(bestKey(n, m, pm), JSON.stringify(record));
}

function formatTime(seconds) {
  return `${seconds.toFixed(1)}s`;
}

function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function updateBestDisplay() {
  const best = getBest(size, mode, playMode);
  if (best) {
    bestValueEl.textContent = formatTime(best.time);
    bestDateEl.textContent = best.date ? formatDate(best.date) : "";
  } else {
    bestValueEl.textContent = "—";
    bestDateEl.textContent = "";
  }
}

function buildBoard() {
  size = parseInt(sizeSelect.value, 10);
  mode = modeSelect.value;
  playMode = playModeSelect.value;
  total = size * size;
  sequence = generateSequence(total, mode);
  targetIndex = 0;
  finished = false;
  startTime = null;
  clearInterval(timerId);
  timeValueEl.textContent = "0.0s";
  targetValueEl.textContent = sequence[0];
  overlayEl.classList.add("hidden");
  updateBestDisplay();

  const isMental = playMode === "mental";
  modeDescriptionEl.textContent = isMental ? MENTAL_DESCRIPTION : CLICK_DESCRIPTION;
  mentalHintEl.classList.toggle("hidden", !isMental);
  targetStatEl.classList.toggle("hidden", isMental);
  mentalControlsEl.classList.toggle("hidden", !isMental);
  mentalStartBtn.disabled = false;
  mentalStopBtn.disabled = true;

  const shuffled = shuffle([...sequence]);

  boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  boardEl.style.maxWidth = `${Math.min(560, size * 90)}px`;
  boardEl.innerHTML = "";

  shuffled.forEach((label, index) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent = label;
    cell.dataset.value = label;
    cell.dataset.index = index;
    if (isMental) {
      // En modo mental no se pincha ni se navega con teclado: solo se
      // mira el tablero mientras corre el cronómetro manual.
      cell.setAttribute("aria-hidden", "true");
    } else {
      cell.tabIndex = 0;
      cell.setAttribute("role", "button");
      cell.setAttribute("aria-label", label);
      cell.addEventListener("click", () => handleCellClick(cell, label));
      cell.addEventListener("keydown", (e) => handleCellKeydown(e, cell, label, index));
    }
    boardEl.appendChild(cell);
  });
}

// Activa la celda con Enter/Espacio y permite moverse por el tablero
// con las flechas, igual que con el ratón/tacto.
function handleCellKeydown(e, cell, label, index) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    handleCellClick(cell, label);
    return;
  }

  const cells = boardEl.children;
  let target = null;
  if (e.key === "ArrowRight" && index % size < size - 1) target = index + 1;
  else if (e.key === "ArrowLeft" && index % size > 0) target = index - 1;
  else if (e.key === "ArrowDown" && index + size < cells.length) target = index + size;
  else if (e.key === "ArrowUp" && index - size >= 0) target = index - size;

  if (target !== null) {
    e.preventDefault();
    cells[target].focus();
  }
}

function handleCellClick(cell, label) {
  if (finished) return;

  if (label === sequence[targetIndex]) {
    if (startTime === null) {
      startTime = performance.now();
      timerId = setInterval(updateTimer, 100);
    }

    cell.classList.add("correct");
    setTimeout(() => {
      cell.classList.remove("correct");
      cell.classList.add("done");
    }, 200);

    targetIndex += 1;
    targetValueEl.textContent =
      targetIndex >= sequence.length ? "✓" : sequence[targetIndex];

    if (targetIndex >= sequence.length) {
      finishGame();
    }
  } else {
    cell.classList.add("wrong");
    setTimeout(() => cell.classList.remove("wrong"), 250);
  }
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

  const best = getBest(size, mode, playMode);
  let recordMsg = "";
  if (best === null || elapsed < best.time) {
    setBest(size, mode, playMode, elapsed);
    recordMsg = "🏆 ¡Nuevo mejor tiempo!";
  } else {
    recordMsg = `Tu mejor tiempo sigue siendo ${formatTime(best.time)} (${formatDate(best.date)})`;
  }

  finalTimeEl.textContent = formatTime(elapsed);
  recordMsgEl.textContent = recordMsg;
  updateBestDisplay();
  overlayEl.classList.remove("hidden");
}

// Modo mental: el propio jugador arranca y para el cronómetro, sin
// que el juego verifique nada por clics.
function startMentalTimer() {
  if (finished || startTime !== null) return;
  startTime = performance.now();
  timerId = setInterval(updateTimer, 100);
  mentalStartBtn.disabled = true;
  mentalStopBtn.disabled = false;
}

function stopMentalTimer() {
  if (finished || startTime === null) return;
  mentalStopBtn.disabled = true;
  finishGame();
}

sizeSelect.addEventListener("change", buildBoard);
modeSelect.addEventListener("change", buildBoard);
playModeSelect.addEventListener("change", buildBoard);
restartBtn.addEventListener("click", buildBoard);
playAgainBtn.addEventListener("click", buildBoard);
mentalStartBtn.addEventListener("click", startMentalTimer);
mentalStopBtn.addEventListener("click", stopMentalTimer);

buildBoard();
