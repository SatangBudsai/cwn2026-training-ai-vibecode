export function baht(n: number): string {
  return "฿" + Math.round(n).toLocaleString("en-US");
}

/** C7: calendar/estimate prices are rounded to the nearest 10. */
export function bahtApprox(n: number): string {
  return baht(Math.round(n / 10) * 10);
}

export function kg(grams: number): string {
  return `${Math.round(grams / 1000).toLocaleString("en-US")} กก.`;
}
