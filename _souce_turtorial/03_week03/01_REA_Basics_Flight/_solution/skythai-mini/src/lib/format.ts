export const thb = (n: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

export const thaiDate = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok",
  }).format(new Date(iso.length === 10 ? `${iso}T00:00:00+07:00` : iso));

export const thaiDateTime = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
  }).format(new Date(iso));

export const stopsText = (stops: number) => (stops === 0 ? "บินตรง" : `แวะพัก ${stops} ครั้ง`);
