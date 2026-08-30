import { describe, expect, it } from "vitest";
import { buildPlaylist } from "../../../src/domain/selection";

// 参照: docs/test-plan.md 4.9節、docs/spec.md 8.0節

const contents = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
const favorites = new Set([2, 4]);
const isFavorite = (contentId: number) => favorites.has(contentId);

describe("buildPlaylist", () => {
  it("全件選択・お気に入りのみ表示OFFの場合、id昇順で全件を返す", () => {
    expect(buildPlaylist(contents, [1, 2, 3, 4, 5], false, isFavorite)).toEqual([1, 2, 3, 4, 5]);
  });

  it("一部のみ選択されている場合、選択順ではなくid昇順で返す", () => {
    expect(buildPlaylist(contents, [5, 3, 1], false, isFavorite)).toEqual([1, 3, 5]);
  });

  it("お気に入りのみ表示ONの場合、選択済み ∩ お気に入りのみに絞り込まれる", () => {
    expect(buildPlaylist(contents, [1, 2, 3, 4], true, isFavorite)).toEqual([2, 4]);
  });

  it("選択が0件の場合は空配列を返す", () => {
    expect(buildPlaylist(contents, [], false, isFavorite)).toEqual([]);
  });

  it("お気に入りのみ表示ONで、選択範囲内にお気に入りが1件も無い場合は空配列を返す", () => {
    expect(buildPlaylist(contents, [1, 3, 5], true, isFavorite)).toEqual([]);
  });

  it("存在しないコンテンツIDがselectedContentIdsに含まれていても無視される", () => {
    expect(buildPlaylist(contents, [1, 999, 2], false, isFavorite)).toEqual([1, 2]);
  });
});
