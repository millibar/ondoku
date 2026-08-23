import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ContentListScreen } from "../../../src/screens/ContentListScreen";

// 参照: docs/test-plan.md 5章、docs/spec.md 5.2節

const ITEMS = [
  {
    id: 1,
    categoryId: "01",
    englishText: "Hello world.",
    repeatingCount: 2,
    shadowingCount: 1,
    lastPracticedAt: "2026-08-20T00:00:00.000Z",
    isFavorite: false,
  },
  {
    id: 2,
    categoryId: "02",
    englishText: "Good morning.",
    repeatingCount: 0,
    shadowingCount: 0,
    lastPracticedAt: "",
    isFavorite: true,
  },
  {
    id: 3,
    categoryId: "01",
    englishText: "Good night.",
    repeatingCount: 5,
    shadowingCount: 0,
    lastPracticedAt: "2026-08-22T00:00:00.000Z",
    isFavorite: false,
  },
];

function renderScreen(overrides: Partial<Parameters<typeof ContentListScreen>[0]> = {}) {
  return render(
    <ContentListScreen
      items={ITEMS}
      streak={3}
      onSelect={vi.fn()}
      onToggleFavorite={vi.fn()}
      onSync={vi.fn()}
      onOpenSettings={vi.fn()}
      {...overrides}
    />,
  );
}

describe("ContentListScreen", () => {
  it("初期状態では全件表示される", () => {
    renderScreen();
    expect(screen.getByText("Hello world.")).toBeInTheDocument();
    expect(screen.getByText("Good morning.")).toBeInTheDocument();
    expect(screen.getByText("Good night.")).toBeInTheDocument();
  });

  it("カテゴリで絞り込むと該当コンテンツのみ表示される", () => {
    renderScreen();
    fireEvent.change(screen.getByLabelText("カテゴリ"), { target: { value: "01" } });
    expect(screen.getByText("Hello world.")).toBeInTheDocument();
    expect(screen.getByText("Good night.")).toBeInTheDocument();
    expect(screen.queryByText("Good morning.")).not.toBeInTheDocument();
  });

  it("お気に入りのみで絞り込むと該当コンテンツのみ表示される", () => {
    renderScreen();
    fireEvent.click(screen.getByLabelText("お気に入りのみ表示"));
    expect(screen.getByText("Good morning.")).toBeInTheDocument();
    expect(screen.queryByText("Hello world.")).not.toBeInTheDocument();
    expect(screen.queryByText("Good night.")).not.toBeInTheDocument();
  });

  it("お気に入りボタンを押すとonToggleFavoriteが呼ばれる", () => {
    const onToggleFavorite = vi.fn();
    renderScreen({ onToggleFavorite });
    fireEvent.click(screen.getAllByRole("button", { name: "お気に入りに追加" })[0]);
    expect(onToggleFavorite).toHaveBeenCalledWith(1);
  });

  it("コンテンツをクリックするとonSelectが呼ばれる", () => {
    const onSelect = vi.fn();
    renderScreen({ onSelect });
    fireEvent.click(screen.getByText("Hello world."));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("連続学習日数が表示される", () => {
    renderScreen({ streak: 3 });
    expect(screen.getByText(/3日/)).toBeInTheDocument();
  });

  it("同期ボタンでonSyncが呼ばれる", () => {
    const onSync = vi.fn();
    renderScreen({ onSync });
    fireEvent.click(screen.getByRole("button", { name: "同期" }));
    expect(onSync).toHaveBeenCalledTimes(1);
  });
});
