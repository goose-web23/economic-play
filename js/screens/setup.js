import { validateTeamNames, startGame } from "../state.js";

/**
 * Подключает экран Setup.
 * @param {object} deps
 * @param {object} deps.state                — текущее состояние игры
 * @param {(next: object) => void} deps.setState — сеттер состояния (из main.js)
 * @param {(name: string) => void} deps.showScreen
 */
export function initSetupScreen({ state, setState, showScreen }) {
  const form = document.getElementById("setup-form");
  const errorBox = document.getElementById("setup-error");
  if (!form) {
    console.warn("[setup] форма setup не найдена");
    return;
  }

  const inputs = [
    form.querySelector('input[name="team-1"]'),
    form.querySelector('input[name="team-2"]'),
    form.querySelector('input[name="team-3"]')
  ];

  // если пришли на setup из другой игры — подставим имена, если они уже были
  if (Array.isArray(state.teams) && state.teams.length === 3) {
    state.teams.forEach((t, i) => {
      if (inputs[i]) inputs[i].value = t.name;
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const rawNames = inputs.map((inp) => inp?.value ?? "");
    const result = validateTeamNames(rawNames);

    if (!result.ok) {
      showError(result.error);
      return;
    }
    hideError();

    const nextState = startGame(state, result.names);
    setState(nextState);
    showScreen("game");
  });

  // чистим ошибку при вводе
  for (const inp of inputs) {
    inp?.addEventListener("input", hideError);
  }

  function showError(message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function hideError() {
    if (!errorBox) return;
    errorBox.hidden = true;
    errorBox.textContent = "";
  }
}