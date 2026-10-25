import { el } from "../utils/dom.js";

const ROOT_ID = "modal-root";

function root() {
  const r = document.getElementById(ROOT_ID);
  if (!r) throw new Error("#modal-root не найден");
  return r;
}

/**
 * Показать модалку.
 * @param {object} opts
 * @param {string} opts.title
 * @param {Node|string} opts.body          — содержимое
 * @param {Array<{label:string, variant?:string, value:any}>} opts.actions
 * @param {boolean} [opts.dismissOnOverlay=true]
 * @returns {Promise<any>}                 — value нажатой кнопки
 */
export function openModal({ title, body, actions = [], dismissOnOverlay = true }) {
  const r = root();
  r.setAttribute("aria-hidden", "false");

  // overlay + окно
  const overlay = el("div", { class: "modal-overlay" });
  const win = el("div", { class: "window modal-window", role: "dialog", "aria-modal": "true" });

  const titlebar = el("div", { class: "window__titlebar" });
  titlebar.append(
    el("span", { class: "window__title", text: title }),
    el("span", { class: "window__dots" })
  );

  const bodyEl = el("div", { class: "window__body modal-body" });
  if (typeof body === "string") bodyEl.append(el("p", { class: "modal-text", text: body }));
  else if (body instanceof Node) bodyEl.append(body);

  const actionsEl = el("div", { class: "modal-actions" });

  return new Promise((resolve) => {
    let closed = false;
    const close = (value) => {
      if (closed) return;
      closed = true;
      r.innerHTML = "";
      r.setAttribute("aria-hidden", "true");
      resolve(value);
    };

    actions.forEach((a) => {
      const btn = el("button", {
        type: "button",
        class: "btn " + (a.variant ? `btn--${a.variant}` : ""),
        text: a.label
      });
      btn.addEventListener("click", () => close(a.value));
      actionsEl.append(btn);
    });

    if (actions.length) bodyEl.append(actionsEl);

    win.append(titlebar, bodyEl);
    overlay.append(win);

    if (dismissOnOverlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close(null);
      });
    }

    r.innerHTML = "";
    r.append(overlay);
  });
}

/** Короткий помощник — «OK»-диалог. */
export function alertModal(title, text, { okLabel = "ОК" } = {}) {
  return openModal({
    title,
    body: text,
    actions: [{ label: okLabel, variant: "primary", value: true }]
  });
}

/** Диалог подтверждения. Возвращает true/false. */
export function confirmModal(title, text, { okLabel = "ДА", cancelLabel = "ОТМЕНА", danger = false } = {}) {
  return openModal({
    title,
    body: text,
    actions: [
      { label: cancelLabel, variant: "primary", value: false },
      { label: okLabel,     variant: danger ? "danger" : "bad", value: true }
    ],
    dismissOnOverlay: true
  }).then((v) => v === true);
}