/** Returns the optimal post time label based on current WIB hour. */
export function getOptimalPostTime(): "morning" | "afternoon" | "night" {
  const jakartaHour = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  ).getHours();

  if (jakartaHour >= 5 && jakartaHour < 11) return "morning";
  if (jakartaHour >= 11 && jakartaHour < 17) return "afternoon";
  return "night";
}

/** Returns true if today is Friday (WIB). */
export function isFriday(): boolean {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  ).getDay() === 5;
}

/** Returns true if today is weekend (WIB). */
export function isWeekend(): boolean {
  const day = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  ).getDay();
  return day === 0 || day === 6;
}
