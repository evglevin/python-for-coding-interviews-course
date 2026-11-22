import { LESSONS } from '../data';

/** Lessons live at `<base>lessons/<lesson-id>`, e.g. `/lessons/sort-ascending`. */
const LESSON_PATH_PREFIX = `${import.meta.env.BASE_URL}lessons/`;

/** The lesson named by the current URL path, or null if the path names no lesson. */
export function lessonIdFromUrl(): string | null {
  const { pathname } = window.location;
  if (!pathname.startsWith(LESSON_PATH_PREFIX)) return null;
  let id: string;
  try {
    id = decodeURIComponent(pathname.slice(LESSON_PATH_PREFIX.length)).replace(/\/$/, '');
  } catch {
    return null;
  }
  return LESSONS.some((l) => l.id === id) ? id : null;
}

export function lessonPath(lessonId: string): string {
  return LESSON_PATH_PREFIX + encodeURIComponent(lessonId);
}

/** True for an unmodified primary click that should be handled in-app instead of opening a new tab. */
export function isPlainLeftClick(e: {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/** Points the current history entry at a lesson, without adding a new entry. */
export function showLessonInUrl(lessonId: string): void {
  const path = lessonPath(lessonId);
  if (window.location.pathname !== path) {
    window.history.replaceState(window.history.state, '', path);
  }
}

/** Adds a history entry for a lesson, so the browser's Back button returns to the previous one. */
export function pushLessonUrl(lessonId: string): void {
  const path = lessonPath(lessonId);
  if (window.location.pathname !== path) {
    window.history.pushState(null, '', path);
  }
}
