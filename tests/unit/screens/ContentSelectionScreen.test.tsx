import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
      onToggleAllSelection={vi.fn()}
      onToggleFavorite={vi.fn()}
      onOpenSettings={vi.fn()}
      {...overrides}
    />,
  );
}

// カテゴリは既定で折りたたまれているため、配下の英文カードを検証する前に展開する
function expandCategory(categoryId: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`カテゴリ ${categoryId}`) }));
}

// 開閉アニメーションのため配下の英文カードは折りたたみ中もDOMに残り続け、
// data-expanded属性とinertで開閉状態を表す
function getCollapseRegion(categoryId: string) {
  const toggle = screen.getByRole("button", { name: new RegExp(`カテゴリ ${categoryId}`) });
  return toggle.closest("section")?.querySelector(".content-selection-screen__collapse");
}

describe("ContentSelectionScreen", () => {
  it("カテゴリごとに見出しが表示される（既定は折りたたみ状態）", () => {
    renderScreen();
    expect(screen.getByRole("heading", { name: /カテゴリ 01/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /カテゴリ 02/ })).toBeInTheDocument();
    expect(getCollapseRegion("01")).toHaveAttribute("data-expanded", "false");
    expect(getCollapseRegion("01")).toHaveAttribute("inert");
    expect(getCollapseRegion("02")).toHaveAttribute("data-expanded", "false");
    expect(getCollapseRegion("02")).toHaveAttribute("inert");
  });

  it("カテゴリはカテゴリ名の文字列ソートではなく、英文の通し番号順（itemsの並び順）に表示される", () => {
    // カテゴリ名がゼロ埋めされていない場合、文字列ソートだと "1","10","2" の順に
    // なってしまう。通し番号（id）順であれば "2"→"10"→"1" の順で表示されるべき
    const items = [
      {
        id: 1,
        categoryId: "2",
        englishText: "A",
        repeatingCount: 0,
        shadowingCount: 0,
        isFavorite: false,
      },
      {
        id: 2,
        categoryId: "10",
        englishText: "B",
        repeatingCount: 0,
        shadowingCount: 0,
        isFavorite: false,
      },
      {
        id: 3,
        categoryId: "1",
        englishText: "C",
        repeatingCount: 0,
        shadowingCount: 0,
        isFavorite: false,
      },
    ];
    renderScreen({ items, selectedContentIds: [] });
    const headingNames = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent?.replace(/\s+/g, " ").trim());
    expect(headingNames).toEqual(["カテゴリ 2 0/1", "カテゴリ 10 0/1", "カテゴリ 1 0/1"]);
  });

  it("カテゴリ見出しを展開すると、配下に該当英文が表示される", () => {
    renderScreen();
    expandCategory("01");
    expandCategory("02");
    expect(screen.getByText("Hello world.")).toBeInTheDocument();
    expect(screen.getByText("Good morning.")).toBeInTheDocument();
  });

  it("カテゴリ見出しに「選択中/総数」が表示される", () => {
    renderScreen({ selectedContentIds: [1] });
    // カテゴリ01は2件中1件選択、カテゴリ02は1件中0件選択
    expect(screen.getByRole("heading", { name: /カテゴリ 01.*1\/2/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /カテゴリ 02.*0\/1/ })).toBeInTheDocument();
  });

  it("英文カードに通し番号・英文・回数が表示される", () => {
    renderScreen();
    expandCategory("01");
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("Hello world.")).toBeInTheDocument();
    expect(screen.getByText(/Repeating: 2\b/)).toBeInTheDocument();
    expect(screen.getByText(/Shadowing: 1\b/)).toBeInTheDocument();
  });

  it("練習対象チェックボックスはselectedContentIdsを反映する", () => {
    renderScreen({ selectedContentIds: [1, 3] });
    expandCategory("01");
    expandCategory("02");
    expect(screen.getByLabelText("#1を練習対象にする")).toBeChecked();
    expect(screen.getByLabelText("#2を練習対象にする")).not.toBeChecked();
    expect(screen.getByLabelText("#3を練習対象にする")).toBeChecked();
  });

  it("練習対象チェックボックスをクリックするとonToggleContentSelectionが呼ばれる", () => {
    const onToggleContentSelection = vi.fn();
    renderScreen({ onToggleContentSelection });
    expandCategory("02");
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

  it("カテゴリ見出しをクリックすると、配下の英文カードの開閉状態が切り替わる（既定は折りたたみ状態）", () => {
    renderScreen();
    const toggle = screen.getByRole("button", { name: /カテゴリ 01/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(getCollapseRegion("01")).toHaveAttribute("data-expanded", "false");
    expect(getCollapseRegion("01")).toHaveAttribute("inert");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(getCollapseRegion("01")).toHaveAttribute("data-expanded", "true");
    expect(getCollapseRegion("01")).not.toHaveAttribute("inert");
    expect(screen.getByText("Hello world.")).toBeInTheDocument();
    // 他のカテゴリには影響しない（折りたたまれたまま）
    expect(getCollapseRegion("02")).toHaveAttribute("data-expanded", "false");
    expect(getCollapseRegion("02")).toHaveAttribute("inert");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(getCollapseRegion("01")).toHaveAttribute("data-expanded", "false");
    expect(getCollapseRegion("01")).toHaveAttribute("inert");
  });

  it("カテゴリ見出しの開閉クリックはチェックボックスの選択状態に影響しない", () => {
    const onToggleCategorySelection = vi.fn();
    const onToggleContentSelection = vi.fn();
    renderScreen({ onToggleCategorySelection, onToggleContentSelection });
    fireEvent.click(screen.getByRole("button", { name: /カテゴリ 01/ }));
    expect(onToggleCategorySelection).not.toHaveBeenCalled();
    expect(onToggleContentSelection).not.toHaveBeenCalled();
  });

  it("画面上部に「選択中/総数」（全カテゴリ合計）が表示される", () => {
    renderScreen({ selectedContentIds: [1, 3] });
    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("全選択チェックボックスと選択数は、見出し（header）内にまとめて表示される", () => {
    renderScreen({ selectedContentIds: [1, 3] });
    const header = screen.getByRole("banner");
    expect(within(header).getByRole("heading", { name: "Sentences" })).toBeInTheDocument();
    expect(within(header).getByLabelText("すべて選択")).toBeInTheDocument();
    expect(within(header).getByText("2/3")).toBeInTheDocument();
  });

  it("画面上部の全選択チェックボックスは、全件選択済みならchecked、クリックで全解除が呼ばれる", () => {
    const onToggleAllSelection = vi.fn();
    renderScreen({ selectedContentIds: [1, 2, 3], onToggleAllSelection });
    const checkbox = screen.getByLabelText("すべて選択");
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(onToggleAllSelection).toHaveBeenCalledWith(false);
  });

  it("画面上部の全選択チェックボックスは、未選択ならunchecked、クリックで全選択が呼ばれる", () => {
    const onToggleAllSelection = vi.fn();
    renderScreen({ selectedContentIds: [], onToggleAllSelection });
    const checkbox = screen.getByLabelText("すべて選択");
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(onToggleAllSelection).toHaveBeenCalledWith(true);
  });

  it("画面上部の全選択チェックボックスは、一部だけ選択済みの場合indeterminateになる", () => {
    renderScreen({ selectedContentIds: [1] });
    const checkbox = screen.getByLabelText("すべて選択") as HTMLInputElement;
    expect(checkbox.indeterminate).toBe(true);
  });

  it("お気に入りボタンを押すとonToggleFavoriteが呼ばれる", () => {
    const onToggleFavorite = vi.fn();
    renderScreen({ onToggleFavorite });
    expandCategory("01");
    fireEvent.click(screen.getAllByRole("button", { name: "お気に入りに追加" })[0]);
    expect(onToggleFavorite).toHaveBeenCalledWith(1);
  });

  it("設定ボタンは歯車アイコン（装飾用SVG）のみで表示され、名前は「Settings」", () => {
    renderScreen();
    const button = screen.getByRole("button", { name: "Settings" });
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(button).toHaveTextContent("");
  });

  it("設定ボタンでonOpenSettingsが呼ばれる", () => {
    const onOpenSettings = vi.fn();
    renderScreen({ onOpenSettings });
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});

// 固定表示（sticky）中の見出しを押して閉じたときのスクロール位置。
// jsdomにはレイアウトが無いため、要素の位置（getBoundingClientRect）とscrollIntoViewを差し替えて検証する
describe("ContentSelectionScreen: カテゴリを閉じたときのスクロール位置", () => {
  const rect = (top: number) =>
    ({ top, bottom: top + 40, left: 0, right: 0, width: 0, height: 40, x: 0, y: top }) as DOMRect;

  // 枠（section）の上端 sectionTop と見出しの上端 headerTop を差し替える。
  // 固定されていなければ両者は一致し、固定中は枠が上へスクロールアウトして見出しだけが下にずれる
  function mockCategoryRects(sectionTop: number, headerTop: number) {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      if (this.classList.contains("content-selection-screen__category")) return rect(sectionTop);
      if (this.classList.contains("content-selection-screen__category-header"))
        return rect(headerTop);
      return rect(0);
    });
  }

  let scrollIntoView: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it("固定表示中の見出しを押して閉じると、そのカテゴリの位置（見出しの位置）にスクロールを合わせる", () => {
    renderScreen();
    expandCategory("01");
    mockCategoryRects(-300, 72);
    fireEvent.click(screen.getByRole("button", { name: /カテゴリ 01/ }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    // 見出しが属するカテゴリ（section）に対して呼ばれる
    expect(scrollIntoView.mock.contexts[0]).toBe(
      screen.getByRole("button", { name: /カテゴリ 01/ }).closest("section"),
    );
  });

  it("固定されていない（見出しが本来の位置にある）ときは、閉じてもスクロールしない", () => {
    renderScreen();
    expandCategory("01");
    mockCategoryRects(200, 200);
    fireEvent.click(screen.getByRole("button", { name: /カテゴリ 01/ }));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("カテゴリを開くときは、スクロール位置を動かさない", () => {
    renderScreen();
    mockCategoryRects(-300, 72);
    fireEvent.click(screen.getByRole("button", { name: /カテゴリ 01/ }));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
