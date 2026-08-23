import { describe, expect, it } from "vitest";
import { frequencyLevel } from "../../../src/domain/grid";

// 参照: docs/test-plan.md 4.4節、docs/spec.md 9.3節
// 区分: 0回=0（無色）、1〜2回=1、3〜5回=2、6〜10回=3、11回以上=4

describe("frequencyLevel", () => {
  it("0回のコンテンツは無色（レベル0）になる", () => {
    expect(frequencyLevel(0)).toBe(0);
  });

  it.each([
    [1, 1],
    [2, 1],
    [3, 2],
    [5, 2],
    [6, 3],
    [10, 3],
    [11, 4],
    [100, 4],
  ])("練習回数%i回はレベル%iになる（境界値含む）", (count, expected) => {
    expect(frequencyLevel(count)).toBe(expected);
  });
});
