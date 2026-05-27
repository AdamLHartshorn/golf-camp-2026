export const displayRanks = [
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
] as const;

export type DisplayRank = (typeof displayRanks)[number];

export function getPublicDisplayRank(
  displayRank?: string | null,
  rank?: string | null,
) {
  return displayRank || rank || "-";
}

export function getDisplayRankSortValue(displayRank?: string | null) {
  const index = displayRanks.indexOf(displayRank as DisplayRank);

  return index === -1 ? displayRanks.length : index;
}
