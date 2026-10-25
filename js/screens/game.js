import { loadQuestions, getQuestionById, refillPool } from "../logic/questions.js";
import { renderTeamsBar } from "../ui/teamsBar.js";
import { renderLadder } from "../ui/ladder.js";
import { renderQuestion, getQuestionRefs } from "../ui/question.js";
import {
  applyAnswer,
  activateFiftyFifty,
  activateSecondChance,
  finalizeByLevels
} from "../logic/gameEngine.js";
import { alertModal, openModal } from "../ui/modals.js";

export async function initGameScreen({ getState, setState, showScreen, onResetRequest }) {
  document.getElementById("btn-reset")?.addEventListener("click", () => onResetRequest?.());

  let questions = [];
  try {
    questions = await loadQuestions();
  } catch (err) {
    console.error("[game]", err);
    const r = getQuestionRefs();
    r.title.textContent = "ОШИБКА";
    r.text.textContent = "Не удалось загрузить data/questions.json";
    return { questions: [], render: () => {} };
  }

  const refs = getQuestionRefs();
  let pending = null;
  let eliminatedForCurrentQ = [];

  /* ============ Подсказки ============ */
  function handleHintClick(type) {
    const state = getState();
    if (!state.currentQuestionId || pending) return;

    const next = structuredCloneSafe(state);
    const ok = type === "fiftyFifty"
      ? activateFiftyFifty(next)
      : activateSecondChance(next);

    if (!ok) return;

    if (type === "fiftyFifty") {
      const question = getQuestionById(questions, next.currentQuestionId);
      eliminatedForCurrentQ = pickTwoWrong(question);
    }

    setState(next);
  }

  /* ============ Клик по варианту ============ */
  refs.options.addEventListener("click", (e) => {
    if (pending) return;
    const btn = e.target.closest(".option");
    if (!btn || btn.disabled) return;

    const state = getState();
    if (state.phase !== "game") return;

    const question = getQuestionById(questions, state.currentQuestionId);
    if (!question) return;

    const choiceIdx = Number(btn.dataset.index);
    const correct = choiceIdx === question.correctIndex;

    if (!correct && state.activeHint === "secondChance") {
      handleSecondChanceWrong(choiceIdx);
      return;
    }

    paintAnswerBoth(refs, choiceIdx, question.correctIndex);
    pending = { question, choiceIdx, correct };

    if (refs.next) {
      refs.next.disabled = false;
      refs.next.textContent = correct ? "ДАЛЕЕ" : "ДАЛЕЕ";
    }
  });

  /* ============ «Право на ошибку» — неверный ответ: даём попытку 2 ============ */
  function handleSecondChanceWrong(choiceIdx) {
    const state = getState();

    if (!eliminatedForCurrentQ.includes(choiceIdx)) eliminatedForCurrentQ.push(choiceIdx);

    const next = structuredCloneSafe(state);
    next.activeHint = null;
    setState(next);

    const buttons = refs.options.querySelectorAll(".option");
    buttons.forEach((b, i) => {
      if (i === choiceIdx) {
        b.classList.add("option--wrong", "option--eliminated");
        b.disabled = true;
      } else if (!eliminatedForCurrentQ.includes(i)) {
        b.disabled = false;
      }
    });
    refs.title.textContent = "ПРАВО НА ОШИБКУ // ПОПРОБУЙТЕ ЕЩЁ РАЗ";
    if (refs.next) { refs.next.disabled = true; refs.next.textContent = "ДАЛЕЕ"; }
  }

  /* ============ «Далее» ============ */
  refs.next?.addEventListener("click", async () => {
    if (!pending) return;

    const state = getState();
    const next = structuredCloneSafe(state);
    const result = applyAnswer(next, pending.question, pending.choiceIdx);

    pending = null;
    eliminatedForCurrentQ = [];
    refs.next.disabled = true;
    refs.next.textContent = "ДАЛЕЕ";

    if (result.becameWinner) {
      const winnerTeam = next.teams.find((t) => t.place === result.assignedPlace);
      const placeText = ["первое", "второе", "третье"][result.assignedPlace - 1] ?? "?";
      await alertModal(
        "🏆 ПОБЕДА!",
        `Команда «${winnerTeam.name}» заняла ${placeText} место и выходит из игры.`,
        { okLabel: "ПРОДОЛЖИТЬ" }
      );
    }

    if (result.gameOver) {
      next.phase = "finished";
      setState(next);
      return;
    }

    if (result.exhausted) {
      // пул кончился, но игра ещё не окончена: спросим, что делать
      const choice = await openModal({
        title: "ВОПРОСЫ ЗАКОНЧИЛИСЬ",
        body: "Вопросы из пула закончились, но ещё не все места распределены. Что делаем?",
        actions: [
          { label: "ЗАВЕРШИТЬ ПО СТУПЕНЯМ", variant: "danger", value: "finish" },
          { label: "ПЕРЕМЕШАТЬ И ПРОДОЛЖИТЬ", variant: "primary", value: "refill" }
        ],
        dismissOnOverlay: false
      });

      if (choice === "finish") {
        finalizeByLevels(next);
        next.phase = "finished";
        setState(next);
        return;
      }

      if (choice === "refill") {
        refillPool(next);
        // после refill currentQuestionId = null; syncView подхватит первый из нового пула
        setState(next);
        return;
      }

      // если модалку закрыли (не должно быть, dismissOnOverlay=false) — просто сохраним как есть
    }

    setState(next);
  });

  /* ============ Рендер ============ */
  const render = (s) => {
    if (pending) {
      pending = null;
      if (refs.next) { refs.next.disabled = true; refs.next.textContent = "ДАЛЕЕ"; }
    }

    renderTeamsBar(document.getElementById("teams-bar"), s, {
      onHint: handleHintClick
    });

    renderLadder(document.getElementById("ladder"), s);

    const question = s.currentQuestionId ? getQuestionById(questions, s.currentQuestionId) : null;

    if (!question && s.phase === "game") {
      // пул пуст, но игра идёт — покажем заглушку, пока ведущий не выберет в модалке
      refs.title.textContent = "ПУЛ ИСЧЕРПАН";
      refs.text.textContent = "Больше вопросов нет. Выберите действие в окне выше.";
      refs.options.innerHTML = "";
      if (refs.next) { refs.next.disabled = true; refs.next.textContent = "ДАЛЕЕ"; }
      return;
    }

    renderQuestion(refs, question, { disabledIdx: eliminatedForCurrentQ });

    if (s.activeHint === "secondChance") {
      refs.title.textContent = "ПРАВО НА ОШИБКУ // ЖДЁМ ОТВЕТ";
    }
  };

  return { questions, render };
}

/* ============ Вспомогательные ============ */

function pickTwoWrong(question) {
  const wrong = [];
  question.options.forEach((_, i) => {
    if (i !== question.correctIndex) wrong.push(i);
  });
  for (let i = wrong.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wrong[i], wrong[j]] = [wrong[j], wrong[i]];
  }
  return wrong.slice(0, 2).sort();
}

function paintAnswerBoth(refs, choiceIdx, correctIdx) {
  const buttons = refs.options.querySelectorAll(".option");
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === choiceIdx) b.classList.add(i === correctIdx ? "option--correct" : "option--wrong");
    else if (i === correctIdx) b.classList.add("option--correct");
  });
}

function structuredCloneSafe(obj) {
  if (typeof structuredClone === "function") return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}