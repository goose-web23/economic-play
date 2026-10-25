import { el } from "../utils/dom.js";

/**
 * Отрисовать вертикальную шкалу 0…800 сверху вниз (800 сверху, 0 снизу — как на ТВ-викторине).
 * На ступени, где стоят команды, выводятся их имена.
 *
 * @param {HTMLElement} container — #ladder
 * @param {object} state
 */
export function renderLadder(container, state) {
  if (!container) return;
  container.innerHTML = "";

  const levelsCount = 9; // 0…8
  const points = (level) => level * 100; // 0, 100, …, 800

  // сверху вниз: 8 → 0
  for (let level = levelsCount - 1; level >= 0; level--) {
    const teamsHere = state.teams.filter((t) => t.level === level);

    const row = el("div", {
      class: "ladder__row",
      dataset: { level: String(level) }
    });

    const score = el("div", { class: "ladder__score", text: String(points(level)) });
    row.append(score);

    const marks = el("div", { class: "ladder__marks" });
    for (const t of teamsHere) {
      const tag = el("span", {
        class: "ladder__tag" +
          (state.teams[state.currentTeamIndex]?.id === t.id && !t.finished ? " ladder__tag--active" : ""),
        text: t.name
      });
      marks.append(tag);
    }
    row.append(marks);

    container.append(row);
  }
}