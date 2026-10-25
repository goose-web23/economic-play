/**
 * Слой localStorage. Единственное место, которое знает про ключ и про (де)сериализацию.
 * Ничего не знает про модель состояния — просто хранит объект.
 */

const KEY = "econ-quiz-game-v1";

/** Сохранить состояние. Молча игнорирует ошибки записи (квота/приватный режим). */
export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[storage] не удалось сохранить состояние:", err);
  }
}

/** Загрузить состояние. Возвращает null, если ничего нет или данные битые. */
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (err) {
    console.warn("[storage] не удалось прочитать состояние:", err);
    return null;
  }
}

/** Полный сброс — удалить запись. */
export function clear() {
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    console.warn("[storage] не удалось очистить состояние:", err);
  }
}

/** Есть ли что-то в хранилище. */
export function has() {
  return load() != null;
}