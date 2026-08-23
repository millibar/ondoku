import { useMemo, useState } from "react";
import { FrequencyGrid, type FrequencyGridCell } from "../components/FrequencyGrid";
import { frequencyLevel } from "../domain/grid";

// コンテンツ一覧・選択画面。参照: docs/spec.md 4章、5.2節

export interface ContentListItem {
  id: number;
  categoryId: string;
  englishText: string;
  repeatingCount: number;
  shadowingCount: number;
  lastPracticedAt: string;
  isFavorite: boolean;
}

export interface ContentListScreenProps {
  items: ContentListItem[];
  streak: number;
  onSelect: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  onSync: () => void;
  onOpenSettings: () => void;
}

export function ContentListScreen({
  items,
  streak,
  onSelect,
  onToggleFavorite,
  onSync,
  onOpenSettings,
}: ContentListScreenProps) {
  const [categoryId, setCategoryId] = useState<string>("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.categoryId))).sort(),
    [items],
  );

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (categoryId !== "" && item.categoryId !== categoryId) return false;
        if (favoritesOnly && !item.isFavorite) return false;
        return true;
      }),
    [items, categoryId, favoritesOnly],
  );

  const gridCells: FrequencyGridCell[] = useMemo(
    () =>
      items.map((item) => ({
        contentId: item.id,
        level: frequencyLevel(item.repeatingCount + item.shadowingCount),
      })),
    [items],
  );

  return (
    <div className="content-list-screen">
      <header>
        <h1>英語音読練習</h1>
        <p>連続学習日数: {streak}日</p>
        <button type="button" onClick={onSync}>
          同期
        </button>
        <button type="button" onClick={onOpenSettings}>
          設定
        </button>
      </header>

      <FrequencyGrid cells={gridCells} />

      <div className="content-list-screen__filters">
        <label htmlFor="categoryFilter">カテゴリ</label>
        <select
          id="categoryFilter"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">すべて</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label htmlFor="favoritesOnlyFilter">
          <input
            id="favoritesOnlyFilter"
            type="checkbox"
            checked={favoritesOnly}
            onChange={(event) => setFavoritesOnly(event.target.checked)}
          />
          お気に入りのみ表示
        </label>
      </div>

      <ul className="content-list-screen__list">
        {filteredItems.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => onSelect(item.id)}>
              {item.englishText}
            </button>
            <span>
              リピーティング: {item.repeatingCount}回 / シャドーイング: {item.shadowingCount}回
            </span>
            <button
              type="button"
              aria-pressed={item.isFavorite}
              onClick={() => onToggleFavorite(item.id)}
            >
              {item.isFavorite ? "お気に入りから解除" : "お気に入りに追加"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
