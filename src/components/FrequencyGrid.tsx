import type { FrequencyLevel } from "../domain/grid";

// 学習頻度グリッド（GitHubのコントリビューショングラフのイメージ）。
// 参照: docs/spec.md 9.3節。20行×28列で行優先（通し番号順に左上から右へ進み、
// 右端で折り返して次の行へ）に配置する。マスの大きさは固定値ではなく表示領域の
// 横幅から計算する（1fr）。日別ヒートマップ（7行×28列。DailyHeatmapGrid.tsx）と
// 列数を揃えることで、2つのグリッドが同じ大きさで表示されるようにする

const COLUMNS = 28;

export interface FrequencyGridCell {
  contentId: number;
  level: FrequencyLevel;
}

export interface FrequencyGridProps {
  cells: FrequencyGridCell[];
}

export function FrequencyGrid({ cells }: FrequencyGridProps) {
  return (
    <div
      className="frequency-grid"
      role="img"
      aria-label="学習頻度グリッド"
      style={{ gridTemplateColumns: `repeat(${COLUMNS}, 1fr)` }}
    >
      {cells.map((cell) => (
        <span
          key={cell.contentId}
          className="frequency-grid__cell"
          data-content-id={cell.contentId}
          data-level={cell.level}
        />
      ))}
    </div>
  );
}
