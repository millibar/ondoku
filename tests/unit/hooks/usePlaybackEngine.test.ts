import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlaybackEngine } from "../../../src/hooks/usePlaybackEngine";
import type { AudioPlayer } from "../../../src/hooks/audioPlayer";

// 参照: docs/implementation-plan.md WP3.5、docs/spec.md 8章
//
// HTMLAudioElementは実際には再生・再生終了イベントの制御ができないため、
// テスト用のフェイクAudioPlayerを注入して検証する。

function createFakePlayer(initialDuration = 3): AudioPlayer & { triggerEnded: () => void } {
  let endedCallback: (() => void) | null = null;
  return {
    play: vi.fn(),
    stop: vi.fn(),
    getCurrentTime: () => 0,
    getDuration: () => initialDuration,
    onEnded: (callback) => {
      endedCallback = callback;
      return () => {
        endedCallback = null;
      };
    },
    onTimeUpdate: () => () => {},
    triggerEnded: () => endedCallback?.(),
  };
}

function getAudioUrl(contentId: number) {
  return `blob://content-${contentId}`;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("usePlaybackEngine", () => {
  it("play()を呼ぶと、現在のコンテンツの音声が再生され、statusがplayingになる", () => {
    const player = createFakePlayer();
    const { result } = renderHook(() =>
      usePlaybackEngine({
        playlist: [1, 2, 3],
        practiceMode: "shadowing",
        orderSettings: { isRandom: false, isRepeatOne: false },
        initialContentId: 1,
        player,
        getAudioUrl,
        onPlaybackCompleted: vi.fn(),
      }),
    );

    act(() => result.current.play());

    expect(player.play).toHaveBeenCalledWith("blob://content-1");
    expect(result.current.status).toBe("playing");
  });

  it("シャドーイングモードで再生終了すると、練習完了が記録され、次のコンテンツが即座に再生される", () => {
    const player = createFakePlayer();
    const onPlaybackCompleted = vi.fn();
    const { result } = renderHook(() =>
      usePlaybackEngine({
        playlist: [1, 2, 3],
        practiceMode: "shadowing",
        orderSettings: { isRandom: false, isRepeatOne: false },
        initialContentId: 1,
        player,
        getAudioUrl,
        onPlaybackCompleted,
      }),
    );

    act(() => result.current.play());
    act(() => player.triggerEnded());

    expect(onPlaybackCompleted).toHaveBeenCalledWith(1);
    expect(player.play).toHaveBeenLastCalledWith("blob://content-2");
    expect(result.current.status).toBe("playing");
    expect(result.current.currentContentId).toBe(2);
  });

  it("リピーティングモードで再生終了すると、waitingになり、音声の長さ分経過後に次のコンテンツが自動再生される", () => {
    const player = createFakePlayer(3);
    const { result } = renderHook(() =>
      usePlaybackEngine({
        playlist: [1, 2, 3],
        practiceMode: "repeating",
        orderSettings: { isRandom: false, isRepeatOne: false },
        initialContentId: 1,
        player,
        getAudioUrl,
        onPlaybackCompleted: vi.fn(),
      }),
    );

    act(() => result.current.play());
    act(() => player.triggerEnded());
    expect(result.current.status).toBe("waiting");
    expect(player.play).toHaveBeenCalledTimes(1); // まだ次は再生されていない

    act(() => vi.advanceTimersByTime(3000));

    expect(result.current.status).toBe("playing");
    expect(result.current.currentContentId).toBe(2);
    expect(player.play).toHaveBeenLastCalledWith("blob://content-2");
  });

  it("stop()を呼ぶと再生が停止し、待機中のタイマーもキャンセルされる", () => {
    const player = createFakePlayer(3);
    const { result } = renderHook(() =>
      usePlaybackEngine({
        playlist: [1, 2, 3],
        practiceMode: "repeating",
        orderSettings: { isRandom: false, isRepeatOne: false },
        initialContentId: 1,
        player,
        getAudioUrl,
        onPlaybackCompleted: vi.fn(),
      }),
    );

    act(() => result.current.play());
    act(() => player.triggerEnded()); // waitingになる
    act(() => result.current.stop());

    expect(player.stop).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("stopped");

    act(() => vi.advanceTimersByTime(5000));
    // タイマーがキャンセルされていれば、停止後に自動再生は始まらない
    expect(result.current.status).toBe("stopped");
    expect(player.play).toHaveBeenCalledTimes(1); // 最初のplay()のみ
  });

  it("next()を押すと、再生中であれば即座に次のコンテンツが再生される", () => {
    const player = createFakePlayer();
    const { result } = renderHook(() =>
      usePlaybackEngine({
        playlist: [1, 2, 3],
        practiceMode: "shadowing",
        orderSettings: { isRandom: false, isRepeatOne: false },
        initialContentId: 1,
        player,
        getAudioUrl,
        onPlaybackCompleted: vi.fn(),
      }),
    );

    act(() => result.current.play());
    act(() => result.current.next());

    expect(result.current.currentContentId).toBe(2);
    expect(result.current.status).toBe("playing");
    expect(player.play).toHaveBeenLastCalledWith("blob://content-2");
  });

  it("停止中にnext()を押すと、インデックスのみ進み再生は開始されない", () => {
    const player = createFakePlayer();
    const { result } = renderHook(() =>
      usePlaybackEngine({
        playlist: [1, 2, 3],
        practiceMode: "shadowing",
        orderSettings: { isRandom: false, isRepeatOne: false },
        initialContentId: 1,
        player,
        getAudioUrl,
        onPlaybackCompleted: vi.fn(),
      }),
    );

    act(() => result.current.next());

    expect(result.current.currentContentId).toBe(2);
    expect(result.current.status).toBe("stopped");
    expect(player.play).not.toHaveBeenCalled();
  });

  it("1リピート再生ONの場合、再生終了しても同じコンテンツが繰り返し再生される", () => {
    const player = createFakePlayer();
    const { result } = renderHook(() =>
      usePlaybackEngine({
        playlist: [1, 2, 3],
        practiceMode: "shadowing",
        orderSettings: { isRandom: false, isRepeatOne: true },
        initialContentId: 1,
        player,
        getAudioUrl,
        onPlaybackCompleted: vi.fn(),
      }),
    );

    act(() => result.current.play());
    act(() => player.triggerEnded());

    expect(result.current.currentContentId).toBe(1);
    expect(player.play).toHaveBeenLastCalledWith("blob://content-1");
  });
});
