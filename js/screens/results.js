import { el } from "../utils/dom.js";

/**
 * Отрисовать финальное табло.
 * @param {object} deps { state, onPlayAgain, onHardReset }
 */
export function initResultsScreen({ getState, onPlayAgain, onHardReset }) {
  const list = document.getElementById("results-list");
  const btnAgain = document.getElementById("btn-play-again");
  const btnHard = document.getElementById("btn-hard-reset");

  btnAgain?.addEventListener("click", () => onPlayAgain?.());
  btnHard?.addEventListener("click", () => onHardReset?.());

  return {
    render(state) {
      if (!list) return;
      list.innerHTML = "";

      const sorted = [...state.teams].sort((a, b) => {
        const pa = a.place ?? 99;
        const pb = b.place ?? 99;
        if (pa !== pb) return pa - pb;
        return b.level - a.level;
      });

      sorted.forEach((t, i) => {
        const place = t.place ?? (i + 1);
        const placeWord = ["1-е", "2-е", "3-е"][place - 1] ?? `${place}-е`;
        const item = el("li", {
          class: "results-item" + (t.place === 1 ? " results-item--winner" : ""),
          text: `${placeWord} место — «${t.name}» (${t.level * 100} очков)`
        });
        list.append(item);
      });
    }
  };
}