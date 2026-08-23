// 英文・日本語訳の表示（独立にON/OFF切り替え可能）。参照: docs/spec.md 5.3節

export interface ContentTextProps {
  englishText: string;
  japaneseText: string;
  showEnglish: boolean;
  showJapanese: boolean;
}

export function ContentText({
  englishText,
  japaneseText,
  showEnglish,
  showJapanese,
}: ContentTextProps) {
  return (
    <div className="content-text">
      {showEnglish && <p className="content-text__english">{englishText}</p>}
      {showJapanese && <p className="content-text__japanese">{japaneseText}</p>}
    </div>
  );
}
