import { describe, expect, it } from "vitest";
import { playbackReducer } from "../../../../src/domain/playback/reducer";
import type { PlaybackContext, PlaybackState } from "../../../../src/domain/playback/types";

// 参照: docs/test-plan.md 4.2節、docs/spec.md 8章

function makeState(overrides: Partial<PlaybackState> = {}): PlaybackState {
  return { status: "stopped", currentContentId: 1, history: [], ...overrides };
}

function makeContext(overrides: Partial<PlaybackContext> = {}): PlaybackContext {
  return {
    playlist: [1, 2, 3, 4],
    practiceMode: "shadowing",
    orderSettings: { isRandom: false, isRepeatOne: false },
    ...overrides,
  };
}

describe("playbackReducer", () => {
  it("stoppedから再生ボタン（PLAY）でplayingに遷移する", () => {
    const state = makeState({ status: "stopped" });
    const next = playbackReducer(state, { type: "PLAY" }, makeContext());
    expect(next.status).toBe("playing");
    expect(next.currentContentId).toBe(1);
  });

  describe("AUDIO_ENDED（音声再生終了）", () => {
    it("practiceMode=shadowingの場合、待機せず進行ロジックが実行され、順次モードならインデックスが進む", () => {
      const state = makeState({ status: "playing", currentContentId: 1 });
      const context = makeContext({ practiceMode: "shadowing" });
      const next = playbackReducer(state, { type: "AUDIO_ENDED" }, context);
      expect(next.status).toBe("playing");
      expect(next.currentContentId).toBe(2);
    });

    it("practiceMode=repeatingの場合、waitingに遷移し、インデックスはまだ進まない", () => {
      const state = makeState({ status: "playing", currentContentId: 1 });
      const context = makeContext({ practiceMode: "repeating" });
      const next = playbackReducer(state, { type: "AUDIO_ENDED" }, context);
      expect(next.status).toBe("waiting");
      expect(next.currentContentId).toBe(1);
    });
  });

  describe("WAIT_ENDED（待機終了）", () => {
    it("waitingから待機時間経過で進行ロジックが実行され、playingに戻る", () => {
      const state = makeState({ status: "waiting", currentContentId: 1 });
      const context = makeContext({ practiceMode: "repeating" });
      const next = playbackReducer(state, { type: "WAIT_ENDED" }, context);
      expect(next.status).toBe("playing");
      expect(next.currentContentId).toBe(2);
    });
  });

  describe("進行ロジック（8.2節）", () => {
    it("isRepeatOne=trueの場合、インデックスが変化せず同じコンテンツでplayingに戻る", () => {
      const state = makeState({ status: "playing", currentContentId: 2 });
      const context = makeContext({
        practiceMode: "shadowing",
        orderSettings: { isRandom: false, isRepeatOne: true },
      });
      const next = playbackReducer(state, { type: "AUDIO_ENDED" }, context);
      expect(next.status).toBe("playing");
      expect(next.currentContentId).toBe(2);
    });

    it("isRepeatOne=false, isRandom=falseの場合、通し番号で次のインデックスに進む（末尾では先頭に戻る）", () => {
      const state = makeState({ status: "playing", currentContentId: 4 });
      const context = makeContext({
        practiceMode: "shadowing",
        orderSettings: { isRandom: false, isRepeatOne: false },
      });
      const next = playbackReducer(state, { type: "AUDIO_ENDED" }, context);
      expect(next.currentContentId).toBe(1);
    });

    it("isRepeatOne=false, isRandom=trueの場合、出題範囲内からランダムに選出され、直前と同じコンテンツは選ばれない", () => {
      const state = makeState({ status: "playing", currentContentId: 2 });
      const context = makeContext({
        practiceMode: "shadowing",
        orderSettings: { isRandom: true, isRepeatOne: false },
      });
      // playlist=[1,2,3,4], current=2 → candidates=[1,3,4] → random()=0 で先頭(1)を選ぶ決定的乱数
      const next = playbackReducer(state, { type: "AUDIO_ENDED" }, context, () => 0);
      expect(next.currentContentId).toBe(1);
      expect(next.currentContentId).not.toBe(2);
      expect(next.history).toEqual([2]);
    });
  });

  describe("次へ／前へボタン（8.3節）", () => {
    it("playing中に次へを押すと、即座に次のコンテンツに切り替わりplayingになる", () => {
      const state = makeState({ status: "playing", currentContentId: 1 });
      const next = playbackReducer(state, { type: "NEXT" }, makeContext());
      expect(next.status).toBe("playing");
      expect(next.currentContentId).toBe(2);
    });

    it("stopped中に次へを押すと、インデックスのみ変わりstoppedのままになる", () => {
      const state = makeState({ status: "stopped", currentContentId: 1 });
      const next = playbackReducer(state, { type: "NEXT" }, makeContext());
      expect(next.status).toBe("stopped");
      expect(next.currentContentId).toBe(2);
    });

    it("stopped中に前へを押すと、インデックスのみ戻りstoppedのままになる", () => {
      const state = makeState({ status: "stopped", currentContentId: 2 });
      const next = playbackReducer(state, { type: "PREV" }, makeContext());
      expect(next.status).toBe("stopped");
      expect(next.currentContentId).toBe(1);
    });

    it("isRepeatOne=trueでも、次へボタンを押せば次のコンテンツに進む（自動遷移とは異なりボタン操作は常に進む）", () => {
      const state = makeState({ status: "playing", currentContentId: 1 });
      const context = makeContext({
        orderSettings: { isRandom: false, isRepeatOne: true },
      });
      const next = playbackReducer(state, { type: "NEXT" }, context);
      expect(next.currentContentId).toBe(2);
    });

    it("isRandom=trueのとき、次への押下は新規ランダム選出で、履歴に直前のコンテンツが積まれる", () => {
      const state = makeState({ status: "playing", currentContentId: 2, history: [] });
      const context = makeContext({ orderSettings: { isRandom: true, isRepeatOne: false } });
      const next = playbackReducer(state, { type: "NEXT" }, context, () => 0);
      expect(next.currentContentId).toBe(1);
      expect(next.history).toEqual([2]);
    });

    it("isRandom=trueのとき、前へは履歴から直前に再生したコンテンツへ1つ戻る", () => {
      const state = makeState({ status: "playing", currentContentId: 1, history: [2] });
      const context = makeContext({ orderSettings: { isRandom: true, isRepeatOne: false } });
      const next = playbackReducer(state, { type: "PREV" }, context);
      expect(next.currentContentId).toBe(2);
      expect(next.history).toEqual([]);
    });

    it("isRandom=trueで履歴が無い場合、前へは無効化され状態が変化しない", () => {
      const state = makeState({ status: "playing", currentContentId: 1, history: [] });
      const context = makeContext({ orderSettings: { isRandom: true, isRepeatOne: false } });
      const next = playbackReducer(state, { type: "PREV" }, context);
      expect(next.currentContentId).toBe(1);
      expect(next.history).toEqual([]);
    });
  });

  describe("出題範囲（playlist）が0件の場合", () => {
    // 参照: docs/spec.md 8.0節。お気に入りのみ表示ONでお気に入りが1件も無い
    // 場合等、playlistが空になっても、undefinedなcurrentContentIdを生成して
    // DBアクセスでクラッシュしたりしないよう、あらゆるイベントを安全に無視する
    it("PLAYを送ってもstoppedのままで、currentContentIdはundefinedにならない", () => {
      const state = makeState({ status: "stopped", currentContentId: 1 });
      const next = playbackReducer(state, { type: "PLAY" }, makeContext({ playlist: [] }));
      expect(next.status).toBe("stopped");
      expect(next.currentContentId).toBe(1);
    });

    it("再生中にAUDIO_ENDEDを送ってもstoppedに落ち着き、currentContentIdはundefinedにならない", () => {
      const state = makeState({ status: "playing", currentContentId: 1 });
      const next = playbackReducer(
        state,
        { type: "AUDIO_ENDED" },
        makeContext({ playlist: [], practiceMode: "shadowing" }),
      );
      expect(next.status).toBe("stopped");
      expect(next.currentContentId).toBe(1);
    });

    it("待機中にWAIT_ENDEDを送ってもstoppedに落ち着く", () => {
      const state = makeState({ status: "waiting", currentContentId: 1 });
      const next = playbackReducer(state, { type: "WAIT_ENDED" }, makeContext({ playlist: [] }));
      expect(next.status).toBe("stopped");
      expect(next.currentContentId).toBe(1);
    });

    it("NEXT/PREVを送っても状態が変化しない", () => {
      const state = makeState({ status: "stopped", currentContentId: 1 });
      const nextResult = playbackReducer(state, { type: "NEXT" }, makeContext({ playlist: [] }));
      const prevResult = playbackReducer(state, { type: "PREV" }, makeContext({ playlist: [] }));
      expect(nextResult).toEqual(state);
      expect(prevResult).toEqual(state);
    });
  });

  describe("停止ボタン", () => {
    it("playingからstoppedに遷移する", () => {
      const state = makeState({ status: "playing" });
      const next = playbackReducer(state, { type: "STOP" }, makeContext());
      expect(next.status).toBe("stopped");
    });

    it("waitingからstoppedに遷移する", () => {
      const state = makeState({ status: "waiting" });
      const next = playbackReducer(state, { type: "STOP" }, makeContext());
      expect(next.status).toBe("stopped");
    });
  });
});
