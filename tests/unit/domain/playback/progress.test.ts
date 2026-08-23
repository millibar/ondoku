import { describe, expect, it } from "vitest";
import { calculateProgress } from "../../../../src/domain/playback/progress";

// 参照: docs/test-plan.md 4.2節（プログレスバー計算）、docs/spec.md 8.4節

describe("calculateProgress", () => {
  it("playing中はcurrentTime / durationを返す", () => {
    expect(calculateProgress("playing", { currentTime: 1.5, duration: 3 })).toBeCloseTo(0.5);
  });

  it("playing中、再生開始直後（currentTime=0）は0を返す", () => {
    expect(calculateProgress("playing", { currentTime: 0, duration: 3 })).toBe(0);
  });

  it("playing中、durationが0（未取得）の場合は0を返す（0除算を避ける）", () => {
    expect(calculateProgress("playing", { currentTime: 0, duration: 0 })).toBe(0);
  });

  it("waiting中はwaitElapsed / waitDurationを返す", () => {
    expect(calculateProgress("waiting", { waitElapsed: 1, waitDuration: 4 })).toBeCloseTo(0.25);
  });

  it("waiting中、waitDurationが0の場合は0を返す", () => {
    expect(calculateProgress("waiting", { waitElapsed: 0, waitDuration: 0 })).toBe(0);
  });

  it("stopped中は常に0を返す", () => {
    expect(calculateProgress("stopped", {})).toBe(0);
  });

  it("値が1を超える場合は1にクランプする", () => {
    expect(calculateProgress("playing", { currentTime: 5, duration: 3 })).toBe(1);
  });
});
