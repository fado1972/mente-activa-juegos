// Catálogo central de juegos, agrupado por temática.
// Para añadir un juego nuevo: crea su carpeta en /games y añade
// una entrada dentro de la categoría que corresponda (o crea una
// categoría nueva si hace falta).
const CATEGORIES = [
  {
    name: "🧩 Lógica y razonamiento",
    games: [
      {
        icon: "🔢",
        title: "Sudoku",
        description:
          "El clásico rompecabezas numérico. Completa la cuadrícula 9×9 sin repetir números en fila, columna o región.",
        path: "games/sudoku/index.html",
        available: true,
      },
    ],
  },
  {
    name: "⚡ Atención y velocidad",
    games: [
      {
        icon: "🎯",
        title: "Tabla de Schulte",
        description:
          "Encuentra los números (o letras) en orden lo más rápido posible. Entrena visión periférica y atención.",
        path: "games/schulte/index.html",
        available: true,
      },
    ],
  },
];

function renderCard(game) {
  const classes = "game-card" + (game.available ? "" : " disabled");
  return `
    <a class="${classes}" href="${game.path}">
      <span class="icon">${game.icon}</span>
      <h3>${game.title}</h3>
      <p>${game.description}</p>
      <span class="play">${game.available ? "Jugar →" : "Muy pronto"}</span>
    </a>
  `;
}

function renderCategories() {
  const container = document.getElementById("categories-container");
  if (!container) return;

  container.innerHTML = CATEGORIES.map(
    (category) => `
      <section class="category-section">
        <h2 class="category-title">${category.name}</h2>
        <div class="game-grid">
          ${category.games.map(renderCard).join("")}
        </div>
      </section>
    `
  ).join("");
}

document.addEventListener("DOMContentLoaded", renderCategories);
