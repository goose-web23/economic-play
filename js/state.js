/**
 * Единая модель состояния игры.
 * Ничего не знает про DOM. Только данные и чистые операции над ними.
 */

const STORAGE_VERSION = 1;

/** Создать пустое состояние. */
export function createInitialState() {
  return {
    version: STORAGE_VERSION,
    phase: "setup",
    teams: [],
    currentTeamIndex: 0,
    questionPool: [],
    usedQuestions: [],
    currentQuestionId: null,
    activeHint: null,          // NEW: "fiftyFifty" | "secondChance" | null
    meta: { createdAt: null, updatedAt: null }
  };
}

/** Создать команды по трём именам. Подсказки: 2 разных типа, по 1 каждой. */
export function createTeams(names) {
  return names.map((name, i) => ({
    id: `team-${i + 1}`,
    name: String(name).trim(),
    level: 0,                  // 0 … 8 (индекс ступени на лестнице)
    hints: {
      fiftyFifty: 1,           // 50/50 — 1 шт. на игру
      secondChance: 1          // право на ошибку — 1 шт. на игру
    },
    finished: false,
    place: null                // 1 | 2 | 3 — заполняется на финише
  }));
}

/** Внутренний хелпер — обновить метку времени. */
function touch(state) {
  state.meta.updatedAt = Date.now();
  return state;
}

/**
 * Запустить игру: превращает phase setup → game, создаёт команды.
 * Возвращает новый объект состояния (не мутирует вход).
 */
export function startGame(state, names) {
  const next = structuredCloneSafe(state);
  next.phase = "game";
  next.teams = createTeams(names);
  next.currentTeamIndex = 0;
  next.questionPool = [];
  next.usedQuestions = [];
  next.currentQuestionId = null;
  next.meta.createdAt = Date.now();
  return touch(next);
}

/** Сброс в чистое состояние (новая игра с нуля). */
export function resetGame() {
  return createInitialState();
}

/**
 * Валидация имён команд.
 * Возвращает { ok: true, names: [...] } либо { ok: false, error: "..." }.
 */
export function validateTeamNames(rawNames) {
  const names = rawNames.map((n) => String(n ?? "").trim());

  if (names.some((n) => n.length === 0)) {
    return { ok: false, error: "Все три названия команд должны быть заполнены." };
  }

  const lowered = names.map((n) => n.toLowerCase());
  const unique = new Set(lowered);
  if (unique.size !== lowered.length) {
    return { ok: false, error: "Названия команд не должны повторяться (регистр не важен)." };
  }

  if (names.some((n) => n.length > 24)) {
    return { ok: false, error: "Слишком длинное название (максимум 24 символа)." };
  }

  return { ok: true, names };
}

/** Безопасный клон (structuredClone есть в современных браузерах, оставим fallback). */
function structuredCloneSafe(obj) {
  if (typeof structuredClone === "function") return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}