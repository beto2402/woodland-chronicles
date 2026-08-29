// Pure date math for season boundaries — no imports, safe to use from client components
// (e.g. the admin cadence-edit confirmation modal) as well as server code.
//
// Does the month arithmetic in UTC, not local time: startDate is a @db.Date value (stored/
// serialized as UTC midnight), and getMonth()/setMonth() read/write the *local* calendar date —
// which can land on the wrong day (and even the wrong month, near a month boundary) depending on
// the caller's timezone. That matters here since this runs both server-side and in the browser.
export function computeDueDate(startDate: Date, cadenceMonths: number): Date {
  return new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + cadenceMonths, startDate.getUTCDate()),
  );
}

// The 1st of the (UTC) month containing `date`, at UTC midnight — matching how Prisma's
// @db.Date fields are stored/serialized. Anchoring a season's startDate to this keeps every
// later rollover calendar-aligned for free: computeDueDate only ever adds whole months, so it
// never drifts off the 1st once the chain starts there.
export function firstOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
