export type CycleBucket = { label: string; count: number };

export function buildCycleBuckets(durations: number[]): CycleBucket[] {
  const buckets: CycleBucket[] = [
    { label: "0–1d", count: 0 },
    { label: "2–3d", count: 0 },
    { label: "4–7d", count: 0 },
    { label: "8+d", count: 0 },
  ];
  durations.forEach((d) => {
    if (d <= 1) buckets[0].count += 1;
    else if (d <= 3) buckets[1].count += 1;
    else if (d <= 7) buckets[2].count += 1;
    else buckets[3].count += 1;
  });
  return buckets;
}

export function computeMedian(arr: number[]): number | null {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
