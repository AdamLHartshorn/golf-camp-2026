export type NightGolfScoreRow = {
  id?: string | null;
  player_name: string | null;
  target: string | null;
  score: number | null;
  created_at: string | null;
  attempt_id?: string | null;
};

export type NightGolfAttempt = {
  id: string;
  playerName: string;
  total: number;
  submittedAt: string | null;
  targetCount: number;
  attemptId: string | null;
};

export function buildNightGolfAttempts(rows: NightGolfScoreRow[]) {
  const attemptsByKey = rows.reduce<Map<string, NightGolfAttempt>>(
    (attempts, row) => {
      const playerName = row.player_name?.trim();

      if (!playerName) {
        return attempts;
      }

      const attemptKey = row.attempt_id || `legacy:${playerName}`;
      const existingAttempt = attempts.get(attemptKey);

      if (!existingAttempt) {
        attempts.set(attemptKey, {
          id: attemptKey,
          playerName,
          total: row.score || 0,
          submittedAt: row.created_at,
          targetCount: row.target ? 1 : 0,
          attemptId: row.attempt_id || null,
        });
        return attempts;
      }

      existingAttempt.total += row.score || 0;
      existingAttempt.targetCount += row.target ? 1 : 0;

      if (
        row.created_at &&
        (!existingAttempt.submittedAt ||
          new Date(row.created_at).getTime() >
            new Date(existingAttempt.submittedAt).getTime())
      ) {
        existingAttempt.submittedAt = row.created_at;
      }

      return attempts;
    },
    new Map(),
  );

  return Array.from(attemptsByKey.values()).sort((a, b) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }

    return a.playerName.localeCompare(b.playerName);
  });
}

export function getNightGolfAttemptLabels(attempts: NightGolfAttempt[]) {
  const chronologicalByPlayer = attempts.reduce<Record<string, NightGolfAttempt[]>>(
    (groups, attempt) => {
      groups[attempt.playerName] ||= [];
      groups[attempt.playerName].push(attempt);
      return groups;
    },
    {},
  );

  return Object.fromEntries(
    Object.entries(chronologicalByPlayer).flatMap(([, playerAttempts]) => {
      const sortedAttempts = playerAttempts
        .slice()
        .sort((a, b) => {
          const aTime = a.submittedAt
            ? new Date(a.submittedAt).getTime()
            : Number.MAX_SAFE_INTEGER;
          const bTime = b.submittedAt
            ? new Date(b.submittedAt).getTime()
            : Number.MAX_SAFE_INTEGER;

          return aTime - bTime;
        });

      return sortedAttempts.map((attempt, index) => [
        attempt.id,
        sortedAttempts.length > 1 ? `Attempt ${index + 1}` : "Scorecard",
      ]);
    }),
  ) as Record<string, string>;
}
