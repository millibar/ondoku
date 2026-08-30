// 下部タブナビゲーション。参照: docs/spec.md 4章

export type TabId = "practice" | "selection" | "history";

export interface BottomTabNavProps {
  active: TabId;
  // 英文再生中・待機中は英文選択／練習履歴タブへの遷移をdisabledにする（練習タブ自体は常に有効）
  disabled: boolean;
  onSelect: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "practice", label: "練習" },
  { id: "selection", label: "英文選択" },
  { id: "history", label: "練習履歴" },
];

export function BottomTabNav({ active, disabled, onSelect }: BottomTabNavProps) {
  return (
    <nav className="bottom-tab-nav" aria-label="画面切り替え">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className="bottom-tab-nav__button"
          aria-pressed={active === tab.id}
          disabled={tab.id !== "practice" && disabled}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
