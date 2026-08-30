import { useEffect, useMemo, useRef, useState } from "react";

// 英文選択画面。参照: docs/spec.md 4.2節

export interface ContentSelectionItem {
  id: number;
  categoryId: string;
  englishText: string;
  repeatingCount: number;
  shadowingCount: number;
  isFavorite: boolean;
}

export interface ContentSelectionScreenProps {
  items: ContentSelectionItem[]; // id昇順で渡される想定
  selectedContentIds: number[]; // 出題範囲（練習対象チェックボックスでONのID一覧）
  onToggleContentSelection: (id: number) => void;
  onToggleCategorySelection: (categoryId: string, selected: boolean) => void;
  onToggleFavorite: (id: number) => void;
  onOpenSettings: () => void;
}

export function ContentSelectionScreen({
  items,
  selectedContentIds,
  onToggleContentSelection,
  onToggleCategorySelection,
  onToggleFavorite,
  onOpenSettings,
}: ContentSelectionScreenProps) {
  const selected = useMemo(() => new Set(selectedContentIds), [selectedContentIds]);
  // フィルターで非表示にしたカテゴリ（表示のみに影響。出題範囲そのものは変えない）
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.categoryId))).sort(),
    [items],
  );

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, ContentSelectionItem[]>();
    for (const item of items) {
      const list = map.get(item.categoryId) ?? [];
      list.push(item);
      map.set(item.categoryId, list);
    }
    return map;
  }, [items]);

  function toggleCategoryVisibility(categoryId: string) {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  return (
    <div className="content-selection-screen">
      <header>
        <h1>英文選択</h1>
        <button type="button" onClick={onOpenSettings}>
          設定
        </button>
      </header>

      <div className="content-selection-screen__filters">
        {categories.map((categoryId) => (
          <label key={categoryId}>
            <input
              type="checkbox"
              checked={!hiddenCategories.has(categoryId)}
              onChange={() => toggleCategoryVisibility(categoryId)}
              aria-label={`カテゴリ${categoryId}を表示`}
            />
            {categoryId}
          </label>
        ))}
      </div>

      {categories
        .filter((categoryId) => !hiddenCategories.has(categoryId))
        .map((categoryId) => {
          const categoryItems = itemsByCategory.get(categoryId) ?? [];
          const selectedCount = categoryItems.filter((item) => selected.has(item.id)).length;
          const allSelected = categoryItems.length > 0 && selectedCount === categoryItems.length;
          const someSelected = selectedCount > 0 && !allSelected;

          return (
            <section key={categoryId} className="content-selection-screen__category">
              <div className="content-selection-screen__category-header">
                <SelectAllCheckbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  ariaLabel={`カテゴリ${categoryId}を全選択`}
                  onChange={() => onToggleCategorySelection(categoryId, !allSelected)}
                />
                <h2>カテゴリ {categoryId}</h2>
              </div>

              <ul className="content-selection-screen__list">
                {categoryItems.map((item) => (
                  <li key={item.id}>
                    <div className="content-selection-screen__item-head">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => onToggleContentSelection(item.id)}
                        aria-label={`#${item.id}を練習対象にする`}
                      />
                      <span className="content-selection-screen__item-number">#{item.id}</span>
                    </div>
                    <p className="content-selection-screen__item-text">{item.englishText}</p>
                    <div className="content-selection-screen__item-footer">
                      <span className="content-selection-screen__item-meta">
                        リピーティング: {item.repeatingCount}回 / シャドーイング:{" "}
                        {item.shadowingCount}回
                      </span>
                      <button
                        type="button"
                        className="button--favorite"
                        aria-pressed={item.isFavorite}
                        onClick={() => onToggleFavorite(item.id)}
                      >
                        {item.isFavorite ? "お気に入りから解除" : "お気に入りに追加"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
    </div>
  );
}

// カテゴリの全選択／全解除チェックボックス。一部だけ選択済みの場合はindeterminate表示にする
function SelectAllCheckbox({
  checked,
  indeterminate,
  ariaLabel,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  ariaLabel: string;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input ref={ref} type="checkbox" checked={checked} onChange={onChange} aria-label={ariaLabel} />
  );
}
