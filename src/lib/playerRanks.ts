export function getPublicRankBucket(
  rank?: string | null,
  internalRankOrder?: string | null,
) {
  if (!rank) {
    return "-";
  }

  const publicRank = rank.toUpperCase();
  const match = internalRankOrder?.toUpperCase().match(/^([ABCD])(\d+)$/);

  if (!match || match[1] !== publicRank) {
    return publicRank;
  }

  const order = Number(match[2]);

  if (order <= 3) {
    return `${publicRank}1`;
  }

  if (order <= 6) {
    return `${publicRank}2`;
  }

  return `${publicRank}3`;
}
