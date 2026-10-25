import { el } from "../utils/dom.js";

/**
 * @param {HTMLElement} container
 * @param {object} state
 * @param {object} opts { onHint: (type: "fiftyFifty"|"secondChance") => void }
 */
export function renderTeamsBar(container, state, opts = {}) {
  if (!container) return;
  container.innerHTML = "";

  const { onHint } = opts;

  state.teams.forEach((team, index) => {
    const isActive = index === state.currentTeamIndex && !team.finished;
    const hintLocked = !!state.activeHint; // уже есть активная подсказка — новую нельзя

    const card = el("div", {
      class: "team-card" +
        (isActive ? " team-card--active" : "") +
        (team.finished ? " team-card--finished" : ""),
      dataset: { teamId: team.id }
    });

    card.append(el("div", { class: "team-card__name", text: team.name }));
    card.append(el("div", { class: "team-card__level", text: `ступень ${team.level}` }));

    const hintRow = el("div", { class: "team-card__hints" });

    const canFF = isActive && !hintLocked && team.hints.fiftyFifty > 0;
    const canSC = isActive && !hintLocked && team.hints.secondChance > 0;

    const btnFF = el("button", {
      type: "button",
      class: "hint-chip hint-chip--ff" + (team.hints.fiftyFifty ? "" : " is-used"),
      title: "50/50 — останутся два варианта ответа",
      disabled: !canFF
    }, "50/50");
    if (canFF) btnFF.addEventListener("click", () => onHint?.("fiftyFifty"));

    const btnSC = el("button", {
      type: "button",
      class: "hint-chip hint-chip--sc" + (team.hints.secondChance ? "" : " is-used"),
      title: "Право на ошибку — можно ответить ещё раз",
      disabled: !canSC
    }, "ОШИБКА");
    if (canSC) btnSC.addEventListener("click", () => onHint?.("secondChance"));

    // отметим активную подсказку (визуально)
    if (isActive && state.activeHint === "fiftyFifty") btnFF.classList.add("is-active");
    if (isActive && state.activeHint === "secondChance") btnSC.classList.add("is-active");

    hintRow.append(btnFF, btnSC);
    card.append(hintRow);

    container.append(card);
  });
}