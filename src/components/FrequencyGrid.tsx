import type { FrequencyLevel } from "../domain/grid";

// 学習頻度グリッド（GitHubのコントリビューショングラフのイメージ）。
// 参照: docs/spec.md 9.3節

export interface FrequencyGridCell {
  contentId: number;
  level: FrequencyLevel;
}

export interface FrequencyGridProps {
  cells: FrequencyGridCell[];
}

export function FrequencyGrid({ cells }: FrequencyGridProps) {
  return (
    <div className="frequency-grid" role="img" aria-label="学習頻度グリッド">
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
