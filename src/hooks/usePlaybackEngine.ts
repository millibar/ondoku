import { useCallback, useEffect, useRef, useState } from "react";
import { playbackReducer, reconcileOrder } from "../domain/playback/reducer";
import type { PlaybackContext, PlaybackState, PlaybackStatus } from "../domain/playback/types";
import type { OrderSettings, PracticeMode } from "../types";
import type { AudioPlayer } from "./audioPlayer";

// 手本音声の再生と domain/playback の状態機械を結びつけるフック。
// 参照: docs/implementation-plan.md WP3.5、docs/spec.md 8章

export interface UsePlaybackEngineOptions {
  playlist: number[];
  practiceMode: PracticeMode;
  orderSettings: OrderSettings;
  initialContentId: number;
  player: AudioPlayer;
  getAudioUrl: (contentId: number) => string;
  // ある1回の再生が完了するたびに呼ばれる（practiceRecordの更新に使う）
  onPlaybackCompleted: (contentId: number) => void;
}

export interface PlaybackEngine {
  status: PlaybackStatus;
  currentContentId: number;
  // 出題範囲（playlist）内で、現在何番目を再生しているか（1始まり）。
  // ランダム再生であっても、出題範囲内の通し番号ではなく再生順の位置を表す。
  // 参照: docs/spec.md 8.2節・8.3節
  currentIndex: number;
  progress: number;
  play: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
}

const PROGRESS_TICK_MS = 100;

export function usePlaybackEngine(options: UsePlaybackEngineOptions): PlaybackEngine {
  const [state, setState] = useState<PlaybackState>({
    status: "stopped",
    currentContentId: options.initialContentId,
    playOrder: [...options.playlist],
    roundPosition: Math.max(0, options.playlist.indexOf(options.initialContentId)),
    isRandomOrder: false,
  });
  const [progress, setProgress] = useState(0);

  // レンダー中にrefへ書き込むとReact Compilerの前提を壊すため、常にeffectで同期する
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // playlistまたはisRandom（ランダム再生ON/OFF）が変化した場合の調整。
  // 「propが変わったらstateを調整する」パターンのため、effectではなくレンダー中に
  // 直接setStateする（https://react.dev/learn/you-might-not-need-an-effect）。
  // 呼び出し側がplaylist配列をメモ化せず毎回新しい参照を渡す可能性があるため、
  // 参照比較ではなく内容（要素の並び）で比較する（でないと再レンダーのたびに
  // 変化したと誤判定し、無限ループになる）
  const playlistKey = options.playlist.join(",");
  const orderKey = `${playlistKey}|${options.orderSettings.isRandom}`;
  const [prevOrderKey, setPrevOrderKey] = useState(orderKey);
  if (orderKey !== prevOrderKey) {
    setPrevOrderKey(orderKey);
    if (
      state.status === "stopped" &&
      options.playlist.length > 0 &&
      !options.playlist.includes(state.currentContentId)
    ) {
      // playlistが変化し、現在のcurrentContentIdが新しいplaylistに含まれなくなった場合
      // （出題範囲の絞り込みで対象外になった等。参照: docs/spec.md 8.0節）、stopped状態で
      // あれば先頭にリセットする。playing/waiting中は割り込まない
      // （次の自動遷移＝AUDIO_ENDED/WAIT_ENDEDが最新のplaylistを参照して自然に解決するため）
      setState({
        status: "stopped",
        currentContentId: options.playlist[0],
        playOrder: [...options.playlist],
        roundPosition: 0,
        isRandomOrder: false,
      });
    } else {
      // currentContentId自体は引き続き有効なので、playOrder・表示上の位置
      // （roundPosition）だけをその場で再構築する。次のイベントまで遅延させると、
      // その次の「次へ／前へ」操作でreconcileOrderによる再構築と1手先への移動が
      // 同時に起きてしまい、表示上の数字が2以上動いて見える（次へ/前へで必ず1ずつ
      // 増減するという仕様に反する）ため、切り替え直後に即座に反映する
      setState((prev) =>
        reconcileOrder(
          prev,
          {
            playlist: options.playlist,
            practiceMode: options.practiceMode,
            orderSettings: options.orderSettings,
          },
          Math.random,
        ),
      );
    }
  }

  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waitStartedAtRef = useRef(0);
  const waitDurationRef = useRef(0);

  const context = useCallback(
    (): PlaybackContext => ({
      playlist: optionsRef.current.playlist,
      practiceMode: optionsRef.current.practiceMode,
      orderSettings: optionsRef.current.orderSettings,
    }),
    [],
  );

  const clearWaitTimer = useCallback(() => {
    if (waitTimerRef.current !== null) {
      clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }
  }, []);

  const clearProgressTimer = useCallback(() => {
    if (progressTimerRef.current !== null) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const startPlayingProgressTimer = useCallback(() => {
    clearProgressTimer();
    progressTimerRef.current = setInterval(() => {
      const { player } = optionsRef.current;
      const duration = player.getDuration();
      setProgress(duration > 0 ? Math.min(1, player.getCurrentTime() / duration) : 0);
    }, PROGRESS_TICK_MS);
  }, [clearProgressTimer]);

  const startWaitingProgressTimer = useCallback(
    (durationSeconds: number) => {
      clearProgressTimer();
      waitStartedAtRef.current = Date.now();
      waitDurationRef.current = durationSeconds;
      progressTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - waitStartedAtRef.current) / 1000;
        setProgress(
          waitDurationRef.current > 0 ? Math.min(1, elapsed / waitDurationRef.current) : 0,
        );
      }, PROGRESS_TICK_MS);
    },
    [clearProgressTimer],
  );

  const startPlaying = useCallback(
    (contentId: number) => {
      const { player, getAudioUrl } = optionsRef.current;
      player.play(getAudioUrl(contentId));
      setProgress(0);
      startPlayingProgressTimer();
    },
    [startPlayingProgressTimer],
  );

  // setTimeout内からの再帰呼び出し用。handleAdvance自身を直接参照すると
  // React Compiler向けのlintルール（自己参照の禁止）に抵触するため、refを経由する
  const handleAdvanceRef = useRef<(eventType: "AUDIO_ENDED" | "WAIT_ENDED") => void>(() => {});

  // AUDIO_ENDED（再生終了）・WAIT_ENDED（待機終了）どちらのイベントも、
  // domain/playbackの進行ロジックに従って次の状態を決め、必要なら再生・待機タイマーを開始する。
  const handleAdvance = useCallback(
    (eventType: "AUDIO_ENDED" | "WAIT_ENDED") => {
      const next = playbackReducer(stateRef.current, { type: eventType }, context());
      setState(next);

      if (next.status === "playing") {
        startPlaying(next.currentContentId);
      } else if (next.status === "waiting") {
        clearProgressTimer();
        setProgress(0);
        const durationSeconds = optionsRef.current.player.getDuration();
        waitTimerRef.current = setTimeout(() => {
          handleAdvanceRef.current("WAIT_ENDED");
        }, durationSeconds * 1000);
        startWaitingProgressTimer(durationSeconds);
      }
    },
    [context, startPlaying, clearProgressTimer, startWaitingProgressTimer],
  );

  useEffect(() => {
    handleAdvanceRef.current = handleAdvance;
  });

  // 手本音声の再生終了イベントを購読する。
  // <audio>要素のrefはマウント直後は未確定で、App.tsx側ではまず
  // createNoopAudioPlayer()が渡され、ref確定後に実プレイヤーへ差し替わる。
  // options.playerをdepsに含めて差し替えのたびに再購読しないと、noopプレイヤーに
  // 購読したままになり、実際の再生終了イベントが一切ハンドラに届かなくなる
  // （自動的に次のコンテンツへ進まなくなるバグの原因だった）。
  useEffect(() => {
    const unsubscribe = options.player.onEnded(() => {
      clearWaitTimer();
      optionsRef.current.onPlaybackCompleted(stateRef.current.currentContentId);
      handleAdvance("AUDIO_ENDED");
    });
    return unsubscribe;
  }, [options.player, clearWaitTimer, handleAdvance]);

  // アンマウント時にタイマーを片付ける
  useEffect(() => {
    return () => {
      clearWaitTimer();
      clearProgressTimer();
    };
  }, [clearWaitTimer, clearProgressTimer]);

  const play = useCallback(() => {
    if (stateRef.current.status !== "stopped") return;
    const next = playbackReducer(stateRef.current, { type: "PLAY" }, context());
    setState(next);
    startPlaying(next.currentContentId);
  }, [context, startPlaying]);

  const stop = useCallback(() => {
    clearWaitTimer();
    clearProgressTimer();
    setProgress(0);
    optionsRef.current.player.stop();
    setState((prev) => playbackReducer(prev, { type: "STOP" }, context()));
  }, [clearWaitTimer, clearProgressTimer, context]);

  const goTo = useCallback(
    (eventType: "NEXT" | "PREV") => {
      clearWaitTimer();
      const next = playbackReducer(stateRef.current, { type: eventType }, context());
      setState(next);
      if (next.status === "playing") {
        startPlaying(next.currentContentId);
      }
    },
    [clearWaitTimer, context, startPlaying],
  );

  const next = useCallback(() => goTo("NEXT"), [goTo]);
  const prev = useCallback(() => goTo("PREV"), [goTo]);

  return {
    status: state.status,
    currentContentId: state.currentContentId,
    currentIndex: state.roundPosition + 1,
    progress,
    play,
    stop,
    next,
    prev,
  };
}
