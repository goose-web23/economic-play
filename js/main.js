import { el } from "./utils/dom.js";
import { createInitialState, createTeams } from "./state.js";
import * as storage from "./storage.js";
import { initSetupScreen } from "./screens/setup.js";
import { initGameScreen } from "./screens/game.js";
import { initResultsScreen } from "./screens/results.js";
import { buildPool } from "./logic/questions.js";
import { confirmModal } from "./ui/modals.js";

const SCREENS = ["setup", "game", "results"];

let _state = createInitialState();
let _gameScreen = null;
let _resultsScreen = null;

export function getState() { return _state; }

function setState(next) {
  _state = next;
  storage.save(_state);
  syncView();
}

function getScreenEl(name) { return document.getElementById(`screen-${name}`); }

export function showScreen(name) {
  if (!SCREENS.includes(name)) { console.warn("[main] unknown screen:", name); return; }
  for (const s of SCREENS) {
    const node = getScreenEl(s);
    if (!node) continue;
    node.hidden = s !== name;
  }
  document.body.dataset.currentScreen = name;
}

export function currentScreen() {
  return document.body.dataset.currentScreen || null;
}

function syncView() {
  if (_state.phase === "setup")    showScreen("setup");
  if (_state.phase === "game")     showScreen("game");
  if (_state.phase === "finished") showScreen("results");

  if (_state.phase === "game" && _gameScreen && _state.teams.length) {
    // если вопроса нет, но пул непуст — возьмём следующий
    if (!_state.currentQuestionId && _state.questionPool.length) {
      const [firstId, ...rest] = _state.questionPool;
      _state = { ..._state, currentQuestionId: firstId, questionPool: rest };
      storage.save(_state);
    }
    // если вопроса нет и пул пуст — render(game.js) покажет заглушку «ПУЛ ИСЧЕРПАН»
    // (модалка с выбором «завершить/перемешать» покажется из обработчика «Далее»)
    _gameScreen.render(_state);
  }

  if (_state.phase === "finished" && _resultsScreen) {
    _resultsScreen.render(_state);
  }
}

function bootstrapState() {
  const saved = storage.load();
  if (saved && ["setup", "game", "finished"].includes(saved.phase)) {
    _state = { ...createInitialState(), ...saved };
    console.info("[main] состояние восстановлено:", _state.phase);
  } else {
    _state = createInitialState();
  }
}

/** Полный сброс: чистка localStorage, состояние → начальное, экран → setup. */
async function fullReset() {
  const ok = await confirmModal(
    "СБРОСИТЬ ИГРУ?",
    "Весь прогресс, ступени команд и подсказки будут потеряны. Названия команд тоже сбросятся.",
    { okLabel: "СБРОСИТЬ", cancelLabel: "ОТМЕНА", danger: true }
  );
  if (!ok) return;

  storage.clear();
  _state = createInitialState();
  // очистим поля setup
  document.querySelectorAll('#setup-form input').forEach((inp) => (inp.value = ""));
  const errorBox = document.getElementById("setup-error");
  if (errorBox) { errorBox.hidden = true; errorBox.textContent = ""; }
  syncView();
}

/**
 * «Сыграть ещё»: сохраняем имена команд, сбрасываем ступени/подсказки/места,
 * уходим в Setup с предзаполненными полями.
 */
function playAgain() {
  const names = _state.teams.map((t) => t.name);
  _state = {
    ...createInitialState(),
    teams: createTeams(names) // «пустые» команды с теми же именами
  };
  _state.phase = "setup";
  storage.save(_state);

  // предзаполним форму
  const inputs = document.querySelectorAll('#setup-form input');
  inputs.forEach((inp, i) => (inp.value = names[i] ?? ""));

  syncView();
}

function bindDebugNav() {
  const nav = document.querySelector(".debug-nav");
  if (!nav) return;
  nav.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-goto]");
    if (!btn) return;
    showScreen(btn.dataset.goto);
  });
}

async function init() {
  bootstrapState();

  initSetupScreen({
    state: _state,
    setState: (next) => {
      if (next.phase === "game" && _gameScreen && _gameScreen.questions.length) {
        next.questionPool = buildPool(_gameScreen.questions);
        next.usedQuestions = [];
        next.currentQuestionId = null;
      }
      setState(next);
    },
    showScreen
  });

  _gameScreen = await initGameScreen({
    getState: () => _state,
    setState,
    showScreen,
    onResetRequest: fullReset
  });

  _resultsScreen = initResultsScreen({
    getState: () => _state,
    onPlayAgain: playAgain,
    onHardReset: fullReset
  });

  if (_state.phase === "game" && _gameScreen.questions.length) {
    if (!_state.questionPool?.length && !_state.currentQuestionId) {
      _state = { ..._state, questionPool: buildPool(_gameScreen.questions), usedQuestions: [] };
      storage.save(_state);
    }
  }

  bindDebugNav();
  syncView();

  window.__app = { getState, showScreen, currentScreen, el };
  console.info("[main] этап 5: победа/места/финал подключены");
}

init();