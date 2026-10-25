/**
 * Игровой движок: чистые функции над состоянием.
 */

export const MIN_LEVEL = 0;
export const MAX_LEVEL = 8;

export function activeTeam(state) {
  return state.teams[state.currentTeamIndex] || null;
}

export function hasActiveTeams(state) {
  return state.teams.some((t) => !t.finished);
}

export function nextTeamIndex(state, fromIndex = state.currentTeamIndex) {
  const n = state.teams.length;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    if (!state.teams[idx].finished) return idx;
  }
  return fromIndex;
}

export function adjustLevel(team, delta) {
  const before = team.level;
  const target = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, before + delta));
  team.level = target;
  return { applied: target - before, prevLevel: before, newLevel: target };
}

/** Присвоить следующее свободное место (по убыванию: сначала 1-е, потом 2-е и т.д.). */
export function assignNextPlace(state) {
  const taken = state.teams.map((t) => t.place).filter((p) => p != null);
  for (let p = 1; p <= 3; p++) {
    if (!taken.includes(p)) return p;
  }
  return null;
}

export function isGameOver(state) {
  return state.teams.every((t) => t.finished || t.place != null);
}

/** Можно ли использовать подсказку в текущий момент. */
export function canUseHint(state, type) {
  const team = activeTeam(state);
  if (!team || team.finished) return false;
  if (state.activeHint) return false;              // уже есть активная подсказка
  if (state.phase !== "game") return false;
  if (!state.currentQuestionId) return false;
  return team.hints[type] > 0;
}

/** Активировать 50/50 (не меняет состояние вопроса — только флаг и счётчик). */
export function activateFiftyFifty(state) {
  const team = activeTeam(state);
  if (!canUseHint(state, "fiftyFifty")) return false;
  team.hints.fiftyFifty = 0;
  state.activeHint = "fiftyFifty";
  return true;
}

/** Активировать «право на ошибку». */
export function activateSecondChance(state) {
  const team = activeTeam(state);
  if (!canUseHint(state, "secondChance")) return false;
  team.hints.secondChance = 0;
  state.activeHint = "secondChance";
  return true;
}

/**
 * Применить ответ команды на текущий вопрос.
 *
 * Возвращает расширенный результат:
 *   - usedSecondChance: true, если было активно «право на ошибку» и ответ НЕВЕРНЫЙ
 *     (тогда ступень не меняется, ход не переходит, вопрос остаётся тот же).
 */
export function applyAnswer(state, question, choiceIdx) {
  const team = activeTeam(state);
  const correct = choiceIdx === question.correctIndex;

  // «право на ошибку» и ответ неверный → повторная попытка
  if (!correct && state.activeHint === "secondChance") {
    // вопрос и команда те же, вопрос не «сгорает»
    state.activeHint = null; // подсказка уже израсходована ранее, просто убираем флаг
    return {
      correct: false,
      levelDelta: 0,
      prevLevel: team.level,
      newLevel: team.level,
      nextTeamIndex: state.currentTeamIndex,
      nextQuestionId: state.currentQuestionId,
      exhausted: false,
      becameWinner: false,
      assignedPlace: null,
      gameOver: false,
      usedSecondChance: true
    };
  }

  const { applied, prevLevel, newLevel } = adjustLevel(team, correct ? +1 : -1);

  let becameWinner = false;
  let assignedPlace = null;
  if (!team.finished && team.level >= MAX_LEVEL) {
    team.finished = true;
    team.place = assignNextPlace(state);
    assignedPlace = team.place;
    becameWinner = true;
  }

  const takenPlaces = state.teams.map((t) => t.place).filter((p) => p != null);
  const firstAndSecondTaken = takenPlaces.includes(1) && takenPlaces.includes(2);
  if (firstAndSecondTaken) {
    state.teams.forEach((t) => {
      if (!t.finished && t.place == null) {
        t.place = 3;
        t.finished = true;
      }
    });
  }

  const nextIdx = nextTeamIndex(state, state.currentTeamIndex);

  let nextQuestionId = null;
  let exhausted = false;
  if (state.questionPool.length > 0) {
    const [id, ...rest] = state.questionPool;
    nextQuestionId = id;
    state.questionPool = rest;
  } else {
    exhausted = true;
  }

  state.usedQuestions.push(question.id);
  state.currentQuestionId = nextQuestionId;
  state.currentTeamIndex = nextIdx;
  state.activeHint = null; // сбрасываем при переходе

  return {
    correct,
    levelDelta: applied,
    prevLevel, newLevel,
    nextTeamIndex: nextIdx,
    nextQuestionId,
    exhausted,
    becameWinner,
    assignedPlace,
    gameOver: isGameOver(state),
    usedSecondChance: false
  };
}

/**
 * Завершить игру по текущим ступеням: распределить оставшиеся места
 * по убыванию ступеней (при равенстве — по порядку команды в массиве).
 */
export function finalizeByLevels(state) {
  const free = state.teams.filter((t) => t.place == null);
  const taken = state.teams.map((t) => t.place).filter((p) => p != null);
  const available = [];
  for (let p = 1; p <= 3; p++) if (!taken.includes(p)) available.push(p);

  free
    .slice()
    .sort((a, b) => b.level - a.level)
    .forEach((t, i) => {
      t.place = available[i] ?? null;
      t.finished = true;
    });
}