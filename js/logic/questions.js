/**
 * Загрузка вопросов + перемешивание пула + выдача текущего.
 * На этапе 3 умеет только: загрузить, перемешать, взять первый.
 * Реальное "продвижение по пулу" и "не повторять" включим на этапе 4.
 */

let _cache = null;

/** Загрузить JSON вопросов. Кешируется в памяти между вызовами. */
export async function loadQuestions() {
  if (_cache) return _cache;
  const res = await fetch("data/questions.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`Не удалось загрузить questions.json: ${res.status}`);
  const data = await res.json();
  if (!data || !Array.isArray(data.questions)) {
    throw new Error("Некорректный формат questions.json");
  }
  _cache = data.questions;
  return _cache;
}

/** Fisher–Yates. Возвращает новый массив. */
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Достать вопрос по id из загруженного массива. */
export function getQuestionById(list, id) {
  return list.find((q) => q.id === id) || null;
}

/** Перемешать пул id вопросов. */
export function buildPool(questions) {
  return shuffle(questions.map((q) => q.id));
}

/** Заново перемешать использованные вопросы → новый пул. */
export function refillPool(state) {
  const ids = [...state.usedQuestions];
  if (!ids.length) return false;
  // перемешаем использованные id
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  state.questionPool = ids;
  state.usedQuestions = [];
  state.currentQuestionId = null;
  return true;
}