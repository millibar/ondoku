import { useState } from "react";

// 英文・日本語訳の表示（それぞれ独立に目のアイコンでON/OFF切り替え可能）。
// 参照: docs/spec.md 5.3節
//
// 非表示時はDOMから取り除く（display:none相当）のではなく visibility:hidden
// にすることで、表示・非表示の切り替えでレイアウト（カードの高さ）が
// 変わらないようにしている

export interface ContentTextProps {
  englishText: string;
  japaneseText: string;
}

export function ContentText({ englishText, japaneseText }: ContentTextProps) {
  const [showEnglish, setShowEnglish] = useState(true);
  const [showJapanese, setShowJapanese] = useState(true);

  return (
    <div className="content-text">
      <div className="content-text__row content-text__row--english">
        <EyeToggle visible={showEnglish} label="英文" onClick={() => setShowEnglish((v) => !v)} />
        <p
          className="content-text__english"
          style={showEnglish ? undefined : { visibility: "hidden" }}
        >
          {englishText}
        </p>
      </div>
      <div className="content-text__row content-text__row--japanese">
        <EyeToggle
          visible={showJapanese}
          label="日本語訳"
          onClick={() => setShowJapanese((v) => !v)}
        />
        <p
          className="content-text__japanese"
          style={showJapanese ? undefined : { visibility: "hidden" }}
        >
          {japaneseText}
        </p>
      </div>
    </div>
  );
}

// 目のアイコン（パスワード表示・非表示の切り替えでよく使われるもの）による表示切り替えボタン
function EyeToggle({
  visible,
  label,
  onClick,
}: {
  visible: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="content-text__eye-toggle"
      onClick={onClick}
      aria-pressed={visible}
      aria-label={visible ? `${label}を隠す` : `${label}を表示`}
    >
      <EyeIcon visible={visible} />
    </button>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      viewBox="0 0 24 16"
      width="20"
      height="14"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 8 Q12 -2 23 8 Q12 18 1 8 Z" />
      <circle cx="12" cy="8" r="3" />
      {!visible && <line x1="1" y1="1" x2="23" y2="15" />}
    </svg>
  );
}
