import type { PlaybackContext, PlaybackEvent, PlaybackState } from "./types";

// 再生状態遷移・進行ロジック。参照: docs/spec.md 8.1〜8.3節

type RandomFn = () => number;

export function playbackReducer(
  state: PlaybackState,
  event: PlaybackEvent,
  context: PlaybackContext,
  random: RandomFn = Math.random,
): PlaybackState {
  // 出題範囲が0件（練習対象チェックがすべてOFF、またはお気に入りのみ表示ONで
  // お気に入りが1件も無い場合等）は、いかなるイベントも安全に無視しstoppedのまま
  // にする。playlist[0]（undefined）をcurrentContentIdにしてしまうと、
  // 呼び出し側でDBアクセス時にIndexedDBのDataError（キー未指定）を
  // 引き起こすため、ここで防ぐ。参照: docs/spec.md 8.0節
  if (context.playlist.length === 0) {
    return state.status === "stopped" ? state : { ...state, status: "stopped" };
  }

  const reconciled = reconcileOrder(state, context, random);

  switch (event.type) {
    case "PLAY":
      return reconciled.status === "stopped" ? { ...reconciled, status: "playing" } : reconciled;

    case "AUDIO_ENDED": {
      if (reconciled.status !== "playing") return reconciled;
      if (context.practiceMode === "shadowing") {
        // シャドーイングモードは待機時間0のため、waitingを経由せず即座に進行ロジックを実行する
        return autoAdvance(reconciled, context, random);
      }
      // リピーティングモード: 音声の長さ分の待機に入る
      return { ...reconciled, status: "waiting" };
    }

    case "WAIT_ENDED": {
      if (reconciled.status !== "waiting") return reconciled;
      return autoAdvance(reconciled, context, random);
    }

    case "STOP":
      return reconciled.status === "stopped" ? reconciled : { ...reconciled, status: "stopped" };

    case "NEXT":
      return {
        ...advancePosition(reconciled, context, random, 1),
        status: keepOrPlay(reconciled.status),
      };

    case "PREV":
      return {
        ...advancePosition(reconciled, context, random, -1),
        status: keepOrPlay(reconciled.status),
      };

    default:
      return reconciled;
  }
}

// 自動遷移（AUDIO_ENDED/WAIT_ENDEDからの進行）。
// 次へ／前へボタンとは異なり、1リピート再生ONの場合はroundPositionを更新しない。
function autoAdvance(
  state: PlaybackState,
  context: PlaybackContext,
  random: RandomFn,
): PlaybackState {
  if (context.orderSettings.isRepeatOne) {
    return { ...state, status: "playing" };
  }
  return { ...advancePosition(state, context, random, 1), status: "playing" };
}

// playOrderが現在のplaylist・isRandom設定と整合しているか確認し、
// 不整合なら再構築する（出題範囲の変更・ランダム再生ON/OFF切り替えの検知）。
// usePlaybackEngineからも、切り替え直後に表示上の位置を即座に更新するために呼び出す
// （呼び出しを次のイベントまで遅延させると、その次へ／前へ操作で表示が2以上動いてしまうため）
export function reconcileOrder(
  state: PlaybackState,
  context: PlaybackContext,
  random: RandomFn,
): PlaybackState {
  const { playlist, orderSettings } = context;
  const isValidOrder =
    state.playOrder.length === playlist.length &&
    state.playOrder.every((id) => playlist.includes(id));
  const modeMatches = state.isRandomOrder === orderSettings.isRandom;

  if (isValidOrder && modeMatches) {
    return state;
  }

  const playOrder = orderSettings.isRandom ? shuffle(playlist, random) : [...playlist];
  const roundPosition = Math.max(0, playOrder.indexOf(state.currentContentId));
  return { ...state, playOrder, roundPosition, isRandomOrder: orderSettings.isRandom };
}

// 次へ／前へ・自動遷移で共通の「1つ進む/戻る」ロジック。
// ラウンド（出題範囲全件）を最後まで進めた場合のみ、ランダム再生なら再シャッフルする。
// 前へでラウンド先頭を下回った場合は、再シャッフルせず現在のplayOrder内で末尾に循環する。
function advancePosition(
  state: PlaybackState,
  context: PlaybackContext,
  random: RandomFn,
  direction: 1 | -1,
): {
  currentContentId: number;
  playOrder: number[];
  roundPosition: number;
  isRandomOrder: boolean;
} {
  const { playOrder } = state;
  let roundPosition = state.roundPosition + direction;
  let nextOrder = playOrder;

  if (roundPosition >= playOrder.length) {
    roundPosition = 0;
    if (context.orderSettings.isRandom) {
      nextOrder = shuffleAvoidingFirst(context.playlist, state.currentContentId, random);
    }
  } else if (roundPosition < 0) {
    roundPosition = playOrder.length - 1;
  }

  return {
    currentContentId: nextOrder[roundPosition],
    playOrder: nextOrder,
    roundPosition,
    isRandomOrder: state.isRandomOrder,
  };
}

// Fisher-Yatesシャッフル
function shuffle(ids: number[], random: RandomFn): number[] {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ラウンドをまたぐ際、直前に再生したコンテンツが新ラウンドの先頭に来ないようにする
function shuffleAvoidingFirst(ids: number[], avoid: number, random: RandomFn): number[] {
  const order = shuffle(ids, random);
  if (order.length > 1 && order[0] === avoid) {
    [order[0], order[order.length - 1]] = [order[order.length - 1], order[0]];
  }
  return order;
}

function keepOrPlay(status: PlaybackState["status"]): PlaybackState["status"] {
  return status === "stopped" ? "stopped" : "playing";
}
