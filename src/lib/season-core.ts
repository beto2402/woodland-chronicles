// Pure date math for season boundaries — no imports, safe to use from client components
// (e.g. the admin cadence-edit confirmation modal) as well as server code.
export function computeDueDate(startDate: Date, cadenceMonths: number): Date {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + cadenceMonths);
  return d;
}
