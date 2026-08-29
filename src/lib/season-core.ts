// Pure date math for season boundaries — no imports, safe to use from client components
// (e.g. the admin cadence-edit confirmation modal) as well as server code.
export function computeDueDate(startDate: Date, cadenceMonths: number): Date {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + cadenceMonths);
  return d;
}

// The 1st of the (UTC) month containing `date`, at UTC midnight — matching how Prisma's
// @db.Date fields are stored/serialized. Anchoring a season's startDate to this keeps every
// later rollover calendar-aligned for free: computeDueDate only ever adds whole months, so it
// never drifts off the 1st once the chain starts there.
export function firstOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
