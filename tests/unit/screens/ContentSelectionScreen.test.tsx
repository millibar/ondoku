import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ContentSelectionScreen } from "../../../src/screens/ContentSelectionScreen";

// 参照: docs/test-plan.md 5章、docs/spec.md 4.2節

const ITEMS = [
  {
    id: 1,
    categoryId: "01",
    englishText: "Hello world.",
    repeatingCount: 2,
    shadowingCount: 1,
    isFavorite: false,
  },
  {
    id: 2,
    categoryId: "02",
    englishText: "Good morning.",
    repeatingCount: 0,
    shadowingCount: 0,
    isFavorite: true,
  },
  {
    id: 3,
    categoryId: "01",
    englishText: "Good night.",
    repeatingCount: 5,
    shadowingCount: 0,
    isFavorite: false,
  },
];

function renderScreen(overrides: Partial<Parameters<typeof ContentSelectionScreen>[0]> = {}) {
  return render(
    <ContentSelectionScreen
      items={ITEMS}
      selectedContentIds={[1, 2, 3]}
      onToggleContentSelection={vi.fn()}
      onToggleCategorySelection={vi.fn()}
      onToggleFavorite={vi.fn()}
      onOpenSettings={vi.fn()}
      {...overrides}
    />,
  );
}

describe("ContentSelectionScreen", () => {
  it("カテゴリごとに見出しが表示され、配下に該当英文が表示される", () => {
    renderScreen();
    expect(screen.getByRole("heading", { name: "カテゴリ 01" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "カテゴリ 02" })).toBeInTheDocument();
  });

  it("英文カードに通し番号・英文・回数が表示される", () => {
    renderScreen();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("Hello world.")).toBeInTheDocument();
    expect(screen.getByText(/リピーティング: 2回/)).toBeInTheDocument();
    expect(screen.getByText(/シャドーイング: 1回/)).toBeInTheDocument();
  });

  it("練習対象チェックボックスはselectedContentIdsを反映する", () => {
    renderScreen({ selectedContentIds: [1, 3] });
    expect(screen.getByLabelText("#1を練習対象にする")).toBeChecked();
    expect(screen.getByLabelText("#2を練習対象にする")).not.toBeChecked();
    expect(screen.getByLabelText("#3を練習対象にする")).toBeChecked();
  });

  it("練習対象チェックボックスをクリックするとonToggleContentSelectionが呼ばれる", () => {
    const onToggleContentSelection = vi.fn();
    renderScreen({ onToggleContentSelection });
    fireEvent.click(screen.getByLabelText("#2を練習対象にする"));
    expect(onToggleContentSelection).toHaveBeenCalledWith(2);
  });

  it("カテゴリ内が全選択済みの場合、見出しの全選択チェックボックスはcheckedになり、クリックで全解除が呼ばれる", () => {
    const onToggleCategorySelection = vi.fn();
    renderScreen({ selectedContentIds: [1, 2, 3], onToggleCategorySelection });
    const checkbox = screen.getByLabelText("カテゴリ01を全選択");
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(onToggleCategorySelection).toHaveBeenCalledWith("01", false);
  });

  it("カテゴリ内が未選択の場合、見出しの全選択チェックボックスはuncheckedになり、クリックで全選択が呼ばれる", () => {
    const onToggleCategorySelection = vi.fn();
    renderScreen({ selectedContentIds: [2], onToggleCategorySelection });
    const checkbox = screen.getByLabelText("カテゴリ01を全選択");
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(onToggleCategorySelection).toHaveBeenCalledWith("01", true);
  });

  it("カテゴリ内が一部だけ選択済みの場合、見出しの全選択チェックボックスはindeterminateになる", () => {
    renderScreen({ selectedContentIds: [1] });
    const checkbox = screen.getByLabelText("カテゴリ01を全選択") as HTMLInputElement;
    expect(checkbox.indeterminate).toBe(true);
  });

  it("カテゴリ絞り込みチェックボックスを外すと、そのカテゴリの英文が非表示になる", () => {
    renderScreen();
    fireEvent.click(screen.getByLabelText("カテゴリ01を表示"));
    expect(screen.queryByText("Hello world.")).not.toBeInTheDocument();
    expect(screen.queryByText("Good night.")).not.toBeInTheDocument();
    expect(screen.getByText("Good morning.")).toBeInTheDocument();
  });

  it("お気に入りボタンを押すとonToggleFavoriteが呼ばれる", () => {
    const onToggleFavorite = vi.fn();
    renderScreen({ onToggleFavorite });
    fireEvent.click(screen.getAllByRole("button", { name: "お気に入りに追加" })[0]);
    expect(onToggleFavorite).toHaveBeenCalledWith(1);
  });

  it("設定ボタンでonOpenSettingsが呼ばれる", () => {
    const onOpenSettings = vi.fn();
    renderScreen({ onOpenSettings });
    fireEvent.click(screen.getByRole("button", { name: "設定" }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
