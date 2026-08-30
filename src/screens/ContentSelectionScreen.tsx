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
  onToggleAllSelection: (selected: boolean) => void;
  onToggleFavorite: (id: number) => void;
  onOpenSettings: () => void;
}

export function ContentSelectionScreen({
  items,
  selectedContentIds,
  onToggleContentSelection,
  onToggleCategorySelection,
  onToggleAllSelection,
  onToggleFavorite,
  onOpenSettings,
}: ContentSelectionScreenProps) {
  const selected = useMemo(() => new Set(selectedContentIds), [selectedContentIds]);
  // 折りたたんだカテゴリ（見出しクリックで開閉するUI状態。既定はすべて展開）
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

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

  function toggleCategoryCollapsed(categoryId: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  const selectedCount = items.filter((item) => selected.has(item.id)).length;
  const allSelected = items.length > 0 && selectedCount === items.length;
  const someSelected = selectedCount > 0 && !allSelected;

  return (
    <div className="content-selection-screen">
      <header>
        <h1>英文選択</h1>
        <button type="button" onClick={onOpenSettings}>
          設定
        </button>
      </header>

      <div className="content-selection-screen__summary">
        <SelectAllCheckbox
          checked={allSelected}
          indeterminate={someSelected}
          ariaLabel="すべて選択"
          onChange={() => onToggleAllSelection(!allSelected)}
        />
        <span className="content-selection-screen__summary-count">
          {selectedCount}/{items.length}
        </span>
      </div>

      {categories.map((categoryId) => {
        const categoryItems = itemsByCategory.get(categoryId) ?? [];
        const categorySelectedCount = categoryItems.filter((item) => selected.has(item.id)).length;
        const allSelectedInCategory =
          categoryItems.length > 0 && categorySelectedCount === categoryItems.length;
        const someSelectedInCategory = categorySelectedCount > 0 && !allSelectedInCategory;
        const isExpanded = !collapsedCategories.has(categoryId);

        return (
          <section key={categoryId} className="content-selection-screen__category">
            <div className="content-selection-screen__category-header">
              <SelectAllCheckbox
                checked={allSelectedInCategory}
                indeterminate={someSelectedInCategory}
                ariaLabel={`カテゴリ${categoryId}を全選択`}
                onChange={() => onToggleCategorySelection(categoryId, !allSelectedInCategory)}
              />
              <h2>
                <button
                  type="button"
                  className="content-selection-screen__category-toggle"
                  aria-expanded={isExpanded}
                  onClick={() => toggleCategoryCollapsed(categoryId)}
                >
                  カテゴリ {categoryId}
                  <span className="content-selection-screen__category-count">
                    {categorySelectedCount}/{categoryItems.length}
                  </span>
                </button>
              </h2>
            </div>

            {isExpanded && (
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
            )}
          </section>
        );
      })}
    </div>
  );
}

// 全選択／全解除チェックボックス。一部だけ選択済みの場合はindeterminate表示にする
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
