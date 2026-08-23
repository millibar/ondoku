// 連続学習日数（ストリーク）の計算。参照: docs/spec.md 9.2節

/**
 * 練習した日付一覧（"YYYY-MM-DD"、順不同・重複可）と基準日（今日、"YYYY-MM-DD"）から、
 * 直近の連続学習日数を求める。
 *
 * - 今日練習していれば、今日を含めて過去に連続する日数を返す
 * - 今日はまだ練習していないが昨日は練習している場合、昨日までの連続日数を返す
 * - 今日・昨日いずれも練習していない場合は0（ストリークが途切れている）
 */
export function calculateStreak(practicedDates: string[], today: string): number {
  const dateSet = new Set(practicedDates);

  let cursor = dateSet.has(today) ? today : previousDay(today);
  if (!dateSet.has(cursor)) {
    return 0;
  }

  let count = 0;
  while (dateSet.has(cursor)) {
    count++;
    cursor = previousDay(cursor);
  }
  return count;
}

function previousDay(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
