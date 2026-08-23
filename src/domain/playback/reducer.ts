import type { PlaybackContext, PlaybackEvent, PlaybackState } from "./types";

// 再生状態遷移・進行ロジック。参照: docs/spec.md 8.1〜8.3節

type RandomFn = () => number;

export function playbackReducer(
  state: PlaybackState,
  event: PlaybackEvent,
  context: PlaybackContext,
  random: RandomFn = Math.random,
): PlaybackState {
  switch (event.type) {
    case "PLAY":
      return state.status === "stopped" ? { ...state, status: "playing" } : state;

    case "AUDIO_ENDED": {
      if (state.status !== "playing") return state;
      if (context.practiceMode === "shadowing") {
        // シャドーイングモードは待機時間0のため、waitingを経由せず即座に進行ロジックを実行する
        return autoAdvance(state, context, random);
      }
      // リピーティングモード: 音声の長さ分の待機に入る
      return { ...state, status: "waiting" };
    }

    case "WAIT_ENDED": {
      if (state.status !== "waiting") return state;
      return autoAdvance(state, context, random);
    }

    case "STOP":
      return state.status === "stopped" ? state : { ...state, status: "stopped" };

    case "NEXT": {
      const { currentContentId, history } = pickNext(context, state, random);
      return { status: keepOrPlay(state.status), currentContentId, history };
    }

    case "PREV": {
      const { currentContentId, history } = pickPrev(context, state);
      return { status: keepOrPlay(state.status), currentContentId, history };
    }

    default:
      return state;
  }
}

// 自動遷移（AUDIO_ENDED/WAIT_ENDEDからの進行）。
// 次へ／前へボタンとは異なり、1リピート再生ONの場合はインデックスを更新しない。
function autoAdvance(
  state: PlaybackState,
  context: PlaybackContext,
  random: RandomFn,
): PlaybackState {
  if (context.orderSettings.isRepeatOne) {
    return { ...state, status: "playing" };
  }
  const { currentContentId, history } = pickNext(context, state, random);
  return { status: "playing", currentContentId, history };
}

// 次へボタン・自動遷移（1リピート再生OFF時）で共通の「次のコンテンツ」決定ロジック
function pickNext(
  context: PlaybackContext,
  state: PlaybackState,
  random: RandomFn,
): { currentContentId: number; history: number[] } {
  const { playlist, orderSettings } = context;

  if (!orderSettings.isRandom) {
    const currentIndex = playlist.indexOf(state.currentContentId);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % playlist.length;
    return { currentContentId: playlist[nextIndex], history: state.history };
  }

  // ランダム再生: 直前と同じコンテンツは連続で選ばない
  const candidates = playlist.filter((id) => id !== state.currentContentId);
  const pool = candidates.length > 0 ? candidates : playlist;
  const picked = pool[Math.floor(random() * pool.length)];
  return { currentContentId: picked, history: [...state.history, state.currentContentId] };
}

// 前へボタンの「前のコンテンツ」決定ロジック
function pickPrev(
  context: PlaybackContext,
  state: PlaybackState,
): { currentContentId: number; history: number[] } {
  const { playlist, orderSettings } = context;

  if (!orderSettings.isRandom) {
    const currentIndex = playlist.indexOf(state.currentContentId);
    const prevIndex =
      currentIndex === -1 ? 0 : (currentIndex - 1 + playlist.length) % playlist.length;
    return { currentContentId: playlist[prevIndex], history: state.history };
  }

  // ランダム再生: セッション内の再生履歴を1つ戻る。履歴が無ければ「前へ」は無効（状態を変えない）
  if (state.history.length === 0) {
    return { currentContentId: state.currentContentId, history: state.history };
  }
  const history = state.history.slice(0, -1);
  const currentContentId = state.history[state.history.length - 1];
  return { currentContentId, history };
}

function keepOrPlay(status: PlaybackState["status"]): PlaybackState["status"] {
  return status === "stopped" ? "stopped" : "playing";
}
