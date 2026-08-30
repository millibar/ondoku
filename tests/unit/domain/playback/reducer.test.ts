import { describe, expect, it } from "vitest";
import { playbackReducer } from "../../../../src/domain/playback/reducer";
import type { PlaybackContext, PlaybackState } from "../../../../src/domain/playback/types";

// 参照: docs/test-plan.md 4.2節、docs/spec.md 8章
//
// 「n/総数」の表示は roundPosition（playOrder内の現在位置）を元にする。
// playOrderは順次再生ならplaylistそのもの、ランダム再生なら出題範囲の
// シャッフル済みの並びで、1ラウンド出題し終えたときだけ再シャッフルする。

function makeState(overrides: Partial<PlaybackState> = {}): PlaybackState {
  return {
    status: "stopped",
    currentContentId: 1,
    playOrder: [1, 2, 3, 4],
    roundPosition: 0,
    isRandomOrder: false,
    ...overrides,
  };
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
    it("practiceMode=shadowingの場合、待機せず進行ロジックが実行され、順次モードならroundPositionが進む", () => {
      const state = makeState({ status: "playing", currentContentId: 1, roundPosition: 0 });
      const context = makeContext({ practiceMode: "shadowing" });
      const next = playbackReducer(state, { type: "AUDIO_ENDED" }, context);
      expect(next.status).toBe("playing");
      expect(next.currentContentId).toBe(2);
      expect(next.roundPosition).toBe(1);
    });

    it("practiceMode=repeatingの場合、waitingに遷移し、roundPositionはまだ進まない", () => {
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
    it("isRepeatOne=trueの場合、roundPositionが変化せず同じコンテンツでplayingに戻る", () => {
      const state = makeState({ status: "playing", currentContentId: 2, roundPosition: 1 });
      const context = makeContext({
        practiceMode: "shadowing",
        orderSettings: { isRandom: false, isRepeatOne: true },
      });
      const next = playbackReducer(state, { type: "AUDIO_ENDED" }, context);
      expect(next.status).toBe("playing");
      expect(next.currentContentId).toBe(2);
      expect(next.roundPosition).toBe(1);
    });

    it("isRepeatOne=false, isRandom=falseの場合、通し番号で次のroundPositionに進む（末尾では先頭に戻る）", () => {
      const state = makeState({ status: "playing", currentContentId: 4, roundPosition: 3 });
      const context = makeContext({
        practiceMode: "shadowing",
        orderSettings: { isRandom: false, isRepeatOne: false },
      });
      const next = playbackReducer(state, { type: "AUDIO_ENDED" }, context);
      expect(next.currentContentId).toBe(1);
      expect(next.roundPosition).toBe(0);
    });

    it("isRepeatOne=false, isRandom=trueの場合、ラウンド内では出題範囲内から重複せず選出される", () => {
      const state = makeState({
        status: "playing",
        currentContentId: 2,
        playOrder: [2, 1, 4, 3],
        roundPosition: 0,
        isRandomOrder: true,
      });
      const context = makeContext({
        practiceMode: "shadowing",
        orderSettings: { isRandom: true, isRepeatOne: false },
      });
      const next = playbackReducer(state, { type: "AUDIO_ENDED" }, context);
      // ラウンド途中（roundPosition 0→1）は再シャッフルせず、既存のplayOrderの次を採る
      expect(next.currentContentId).toBe(1);
      expect(next.roundPosition).toBe(1);
      expect(next.playOrder).toEqual([2, 1, 4, 3]);
    });

    it("ランダム再生でラウンドの最後まで進めると、次は再シャッフルされ新しいラウンドの先頭（roundPosition=0）になる", () => {
      const state = makeState({
        status: "playing",
        currentContentId: 3,
        playOrder: [2, 1, 4, 3],
        roundPosition: 3,
        isRandomOrder: true,
      });
      const context = makeContext({
        practiceMode: "shadowing",
        orderSettings: { isRandom: true, isRepeatOne: false },
      });
      // シャッフルの乱数を固定し、新しいplayOrderが[4,2,1,3]になるようにする
      // （Fisher-Yatesの実装に依存しないよう、結果のプロパティのみ検証する）
      const next = playbackReducer(state, { type: "AUDIO_ENDED" }, context, () => 0);
      expect(next.roundPosition).toBe(0);
      // 新しいラウンドのplayOrderは出題範囲の並び替え（同じ要素集合）になる
      expect([...next.playOrder].sort()).toEqual([1, 2, 3, 4]);
      expect(next.playOrder).toHaveLength(4);
      expect(next.currentContentId).toBe(next.playOrder[0]);
    });

    it("ランダム再生でラウンドをまたぐ際、直前と同じ英文が新ラウンドの先頭に来ないようにする", () => {
      const state = makeState({
        status: "playing",
        currentContentId: 2,
        playOrder: [4, 1, 3, 2],
        roundPosition: 3,
        isRandomOrder: true,
      });
      const context = makeContext({
        practiceMode: "shadowing",
        orderSettings: { isRandom: true, isRepeatOne: false },
      });
      // random()を常に0に固定すると、出題範囲[1,2,3,4]のシャッフル結果は
      // 先頭が直前と同じ(2)になる（実装のFisher-Yatesに対して決定的に発生する
      // ケース）。このとき先頭と末尾を入れ替えて連続を避けることを確認する
      const next = playbackReducer(state, { type: "AUDIO_ENDED" }, context, () => 0);
      expect(next.currentContentId).not.toBe(2);
    });
  });

  describe("次へ／前へボタン（8.3節）", () => {
    it("playing中に次へを押すと、即座に次のコンテンツに切り替わりplayingになり、roundPositionが1増える", () => {
      const state = makeState({ status: "playing", currentContentId: 1, roundPosition: 0 });
      const next = playbackReducer(state, { type: "NEXT" }, makeContext());
      expect(next.status).toBe("playing");
      expect(next.currentContentId).toBe(2);
      expect(next.roundPosition).toBe(1);
    });

    it("stopped中に次へを押すと、roundPositionのみ変わりstoppedのままになる", () => {
      const state = makeState({ status: "stopped", currentContentId: 1, roundPosition: 0 });
      const next = playbackReducer(state, { type: "NEXT" }, makeContext());
      expect(next.status).toBe("stopped");
      expect(next.currentContentId).toBe(2);
      expect(next.roundPosition).toBe(1);
    });

    it("stopped中に前へを押すと、roundPositionのみ1減りstoppedのままになる", () => {
      const state = makeState({ status: "stopped", currentContentId: 2, roundPosition: 1 });
      const next = playbackReducer(state, { type: "PREV" }, makeContext());
      expect(next.status).toBe("stopped");
      expect(next.currentContentId).toBe(1);
      expect(next.roundPosition).toBe(0);
    });

    it("先頭で前へを押すと末尾に循環する（ランダム再生であろうと再シャッフルはしない）", () => {
      const state = makeState({
        status: "stopped",
        currentContentId: 2,
        playOrder: [2, 1, 4, 3],
        roundPosition: 0,
        isRandomOrder: true,
      });
      const context = makeContext({ orderSettings: { isRandom: true, isRepeatOne: false } });
      const next = playbackReducer(state, { type: "PREV" }, context);
      expect(next.roundPosition).toBe(3);
      expect(next.currentContentId).toBe(3);
      expect(next.playOrder).toEqual([2, 1, 4, 3]);
    });

    it("isRepeatOne=trueでも、次へボタンを押せば次のコンテンツに進む（自動遷移とは異なりボタン操作は常に進む）", () => {
      const state = makeState({ status: "playing", currentContentId: 1, roundPosition: 0 });
      const context = makeContext({
        orderSettings: { isRandom: false, isRepeatOne: true },
      });
      const next = playbackReducer(state, { type: "NEXT" }, context);
      expect(next.currentContentId).toBe(2);
    });
  });

  describe("playOrderの再構築（出題範囲・ランダム再生の切り替え検知）", () => {
    it("出題範囲（playlist）が変わり現在のplayOrderと一致しなくなった場合、次のイベントでplayOrderが再構築される", () => {
      const state = makeState({
        status: "stopped",
        currentContentId: 1,
        playOrder: [1, 2, 3, 4],
        roundPosition: 0,
      });
      // 出題範囲が[1,2,5]に変わった（3,4が対象外、5が新規対象）
      const context = makeContext({ playlist: [1, 2, 5] });
      const next = playbackReducer(state, { type: "NEXT" }, context);
      expect(next.playOrder).toEqual(expect.arrayContaining([1, 2, 5]));
      expect(next.playOrder).toHaveLength(3);
    });

    it("isRandomがOFF→ONに切り替わった場合、次のイベントでplayOrderがシャッフルされる（isRandomOrderで検知）", () => {
      const state = makeState({
        status: "stopped",
        currentContentId: 1,
        playOrder: [1, 2, 3, 4],
        roundPosition: 0,
        isRandomOrder: false,
      });
      const context = makeContext({ orderSettings: { isRandom: true, isRepeatOne: false } });
      const next = playbackReducer(state, { type: "PLAY" }, context, () => 0);
      expect(next.isRandomOrder).toBe(true);
      expect([...next.playOrder].sort()).toEqual([1, 2, 3, 4]);
    });

    it("isRandomがON→OFFに切り替わった場合、次のイベントでplayOrderが通し番号順に戻る", () => {
      const state = makeState({
        status: "stopped",
        currentContentId: 3,
        playOrder: [2, 1, 4, 3],
        roundPosition: 3,
        isRandomOrder: true,
      });
      const context = makeContext({ orderSettings: { isRandom: false, isRepeatOne: false } });
      const next = playbackReducer(state, { type: "PLAY" }, context);
      expect(next.isRandomOrder).toBe(false);
      expect(next.playOrder).toEqual([1, 2, 3, 4]);
      // currentContentIdは維持され、roundPositionはその新しい位置に再計算される
      expect(next.currentContentId).toBe(3);
      expect(next.roundPosition).toBe(2);
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
