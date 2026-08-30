// 出題範囲（プレイリスト）の算出。参照: docs/spec.md 8.0節

/**
 * 出題範囲（プレイリスト）を、コンテンツのid昇順で算出する。
 *
 * - `selectedContentIds`（英文選択画面の練習対象チェックボックスでONの英文ID）に含まれるものだけを対象とする
 * - `favoritesOnly`がtrueの場合、さらに`isFavorite`がtrueのものだけに絞り込む
 * - 並び順は選択順ではなく、`contents`（id昇順で渡される想定）の順序を保つ
 * - `contents`に存在しないIDが`selectedContentIds`に含まれていても無視する
 */
export function buildPlaylist(
  contents: { id: number }[],
  selectedContentIds: number[],
  favoritesOnly: boolean,
  isFavorite: (contentId: number) => boolean,
): number[] {
  const selected = new Set(selectedContentIds);
  return contents
    .filter((content) => selected.has(content.id))
    .filter((content) => !favoritesOnly || isFavorite(content.id))
    .map((content) => content.id);
}
