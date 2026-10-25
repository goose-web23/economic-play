import { el } from "../utils/dom.js";

/**
 * @param {object} refs { title, text, options, next }
 * @param {object|null} question
 * @param {object} [mode] { disabledIdx?: number[] }
 */
export function renderQuestion(refs, question, mode = {}) {
  if (!refs) return;

  if (!question) {
    refs.title.textContent = "ВОПРОС";
    refs.text.textContent = "Вопросов не осталось.";
    refs.options.innerHTML = "";
    if (refs.next) { refs.next.disabled = true; refs.next.textContent = "ДАЛЕЕ"; }
    return;
  }

  refs.title.textContent = `ВОПРОС // ${question.id}`;
  refs.text.textContent = question.text;

  refs.options.innerHTML = "";
  const disabled = new Set(mode.disabledIdx ?? []);

  question.options.forEach((text, i) => {
    const letter = "АБВГ"[i] || String(i + 1);
    const btn = el("button", {
      type: "button",
      class: "option",
      dataset: { index: String(i) }
    });
    if (disabled.has(i)) {
      btn.disabled = true;
      btn.classList.add("option--eliminated");
    }
    btn.append(el("span", { class: "option__letter", text: letter + ":" }));
    btn.append(el("span", { class: "option__text", text }));
    refs.options.append(btn);
  });

  if (refs.next) {
    refs.next.disabled = true;
    refs.next.textContent = "ДАЛЕЕ";
  }
}

export function getQuestionRefs() {
  return {
    title:   document.getElementById("question-title"),
    text:    document.getElementById("question-text"),
    options: document.getElementById("options"),
    next:    document.getElementById("btn-next")
  };
}