/**
 * BUG_MODE: training bugs for the testing course.
 * The server reads process.env.BUG_MODE at request time and renders it as
 * <html data-bug-mode="1|0">, so shared client code can read it too.
 */
export function serverBugMode(): boolean {
  return process.env.BUG_MODE === "1";
}

export function clientBugMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.bugMode === "1";
}

/** Works in both environments. */
export function isBugMode(): boolean {
  return typeof window === "undefined" ? serverBugMode() : clientBugMode();
}
