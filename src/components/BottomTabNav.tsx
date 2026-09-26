// 下部タブナビゲーション。参照: docs/spec.md 4章

import type { ComponentType } from "react";
import { CalendarSVG, DocumentSVG, MicrophoneSVG, type IconProps } from "./icons/Icons";

export type TabId = "practice" | "selection" | "history";

export interface BottomTabNavProps {
  active: TabId;
  // 英文再生中・待機中は英文選択／練習履歴タブへの遷移をdisabledにする（練習タブ自体は常に有効）
  disabled: boolean;
  onSelect: (tab: TabId) => void;
}

// 各タブはアイコンの下にラベルを表示する
const TABS: { id: TabId; label: string; Icon: ComponentType<IconProps> }[] = [
  { id: "practice", label: "Practice", Icon: MicrophoneSVG },
  { id: "selection", label: "Sentences", Icon: DocumentSVG },
  { id: "history", label: "History", Icon: CalendarSVG },
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
          <tab.Icon className="bottom-tab-nav__icon" />
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
