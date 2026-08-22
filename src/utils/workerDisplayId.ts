// A stable, consistent "Worker No." shown instead of the real database id
// (which starts at 36, not 1, because earlier test workers were deleted).
// Real ids can't be renumbered - they're foreign-keyed from attendance,
// salaries, EPF history, and the face-recognition service's own separate
// embeddings store keyed by id (see the Workers page decision this
// mirrors). Instead, every screen that shows a worker's "ID" computes the
// SAME ranking from the full worker roster (sorted by real id ascending)
// and shows that rank - so "Worker #1" means the same specific worker
// everywhere: the Workers grid, the Attendance table, and the ID Templates
// list. This only works if every caller builds the map from the complete,
// unfiltered, unpaginated roster (see the `all=1` param each of those
// fetches now passes) - a partial list would rank differently.
export function buildWorkerDisplayIdMap(workers: { id: number }[]): Map<number, number> {
  const sorted = [...workers].sort((a, b) => a.id - b.id);
  const map = new Map<number, number>();
  sorted.forEach((w, i) => map.set(w.id, i + 1));
  return map;
}

/** Looks up a worker's display number, falling back to the real id if the map doesn't have it (e.g. still loading). */
export function getWorkerDisplayId(map: Map<number, number>, workerId: number | null | undefined): number | string {
  if (workerId === null || workerId === undefined) return "—";
  return map.get(workerId) ?? workerId;
}
