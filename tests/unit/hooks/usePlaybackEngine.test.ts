import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  usePlaybackEngine,
  type UsePlaybackEngineOptions,
} from "../../../src/hooks/usePlaybackEngine";
import { createNoopAudioPlayer, type AudioPlayer } from "../../../src/hooks/audioPlayer";

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

  it("<audio>要素のrefが後から確定してplayerがnoopから実プレイヤーへ差し替わっても、差し替え後のplayerの再生終了で自動的に次へ進む（App.tsxの実際の初期化順序を再現）", () => {
    const realPlayer = createFakePlayer();
    const { result, rerender } = renderHook(
      (props: UsePlaybackEngineOptions) => usePlaybackEngine(props),
      {
        initialProps: {
          playlist: [1, 2, 3],
          practiceMode: "shadowing",
          orderSettings: { isRandom: false, isRepeatOne: false },
          initialContentId: 1,
          player: createNoopAudioPlayer(), // マウント直後は<audio>要素のrefが未確定のためnoop
          getAudioUrl,
          onPlaybackCompleted: vi.fn(),
        },
      },
    );

    // <audio>要素のrefが確定し、実プレイヤーに差し替わる（App.tsx PracticeContainer参照）
    rerender({
      playlist: [1, 2, 3],
      practiceMode: "shadowing",
      orderSettings: { isRandom: false, isRepeatOne: false },
      initialContentId: 1,
      player: realPlayer,
      getAudioUrl,
      onPlaybackCompleted: vi.fn(),
    });

    act(() => result.current.play());
    act(() => realPlayer.triggerEnded());

    expect(result.current.status).toBe("playing");
    expect(result.current.currentContentId).toBe(2);
    expect(realPlayer.play).toHaveBeenLastCalledWith("blob://content-2");
  });

  it("停止中にplaylistが変化し、現在のcurrentContentIdが新しいplaylistに含まれなくなった場合、先頭にリセットされる（お気に入りのみ表示のON/OFF切替等）", () => {
    const player = createFakePlayer();
    const { result, rerender } = renderHook(
      (props: UsePlaybackEngineOptions) => usePlaybackEngine(props),
      {
        initialProps: {
          playlist: [],
          practiceMode: "shadowing" as const,
          orderSettings: { isRandom: false, isRepeatOne: false },
          initialContentId: 0,
          player,
          getAudioUrl,
          onPlaybackCompleted: vi.fn(),
        },
      },
    );

    expect(result.current.currentContentId).toBe(0);

    // 出題範囲が回復した（例: お気に入りのみ表示をOFFにした）
    rerender({
      playlist: [5, 6, 7],
      practiceMode: "shadowing",
      orderSettings: { isRandom: false, isRepeatOne: false },
      initialContentId: 0,
      player,
      getAudioUrl,
      onPlaybackCompleted: vi.fn(),
    });

    expect(result.current.currentContentId).toBe(5);
    expect(result.current.status).toBe("stopped");
  });

  it("再生中・待機中はplaylistが変化しても割り込んでリセットしない（自動遷移時に最新のplaylistを参照して自然に解決するため）", () => {
    const player = createFakePlayer();
    const { result, rerender } = renderHook(
      (props: UsePlaybackEngineOptions) => usePlaybackEngine(props),
      {
        initialProps: {
          playlist: [1, 2, 3],
          practiceMode: "shadowing" as const,
          orderSettings: { isRandom: false, isRepeatOne: false },
          initialContentId: 1,
          player,
          getAudioUrl,
          onPlaybackCompleted: vi.fn(),
        },
      },
    );

    act(() => result.current.play());
    expect(result.current.status).toBe("playing");

    // 再生中にplaylistが変化し、現在のコンテンツが対象外になった
    rerender({
      playlist: [5, 6, 7],
      practiceMode: "shadowing",
      orderSettings: { isRandom: false, isRepeatOne: false },
      initialContentId: 1,
      player,
      getAudioUrl,
      onPlaybackCompleted: vi.fn(),
    });

    // 再生中の割り込みリセットは行わない
    expect(result.current.currentContentId).toBe(1);
    expect(result.current.status).toBe("playing");
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

  it("currentIndexは出題範囲内での再生順の位置（1始まり）を表し、next()/prev()で1ずつ増減する", () => {
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

    expect(result.current.currentIndex).toBe(1);

    act(() => result.current.next());
    expect(result.current.currentIndex).toBe(2);
    expect(result.current.currentContentId).toBe(2);

    act(() => result.current.prev());
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.currentContentId).toBe(1);
  });

  it("ランダム再生をONにした直後、currentIndexが即座に再構築される（次へを押すまで待たない）。その後のnext()も1しか進まない", () => {
    // Fisher-Yatesシャッフルを決定的にするため、乱数を固定する
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const player = createFakePlayer();
      const { result, rerender } = renderHook(
        (props: UsePlaybackEngineOptions) => usePlaybackEngine(props),
        {
          initialProps: {
            playlist: [1, 2, 3, 4],
            practiceMode: "shadowing" as const,
            orderSettings: { isRandom: false, isRepeatOne: false },
            initialContentId: 1,
            player,
            getAudioUrl,
            onPlaybackCompleted: vi.fn(),
          },
        },
      );

      expect(result.current.currentIndex).toBe(1);

      // ランダム再生スイッチをONにする（この時点ではまだ次へ／前へを押していない）
      rerender({
        playlist: [1, 2, 3, 4],
        practiceMode: "shadowing",
        orderSettings: { isRandom: true, isRepeatOne: false },
        initialContentId: 1,
        player,
        getAudioUrl,
        onPlaybackCompleted: vi.fn(),
      });

      // currentContentIdは変わらないが、出題範囲内での位置（表示上の数字）は
      // 再構築後のplayOrder内での位置に即座に更新される
      expect(result.current.currentContentId).toBe(1);
      const indexAfterSwitch = result.current.currentIndex;
      expect(indexAfterSwitch).toBeGreaterThanOrEqual(1);
      expect(indexAfterSwitch).toBeLessThanOrEqual(4);

      // 切り替え後の最初のnext()でも、表示上の数字はちょうど1つだけ動く
      // （末尾からの場合は先頭へ循環する。順次再生と同じ挙動）
      act(() => result.current.next());
      const expectedIndex = indexAfterSwitch >= 4 ? 1 : indexAfterSwitch + 1;
      expect(result.current.currentIndex).toBe(expectedIndex);
    } finally {
      randomSpy.mockRestore();
    }
  });
});
