import { useCallback, useEffect, useRef, useState } from "react";
import { playbackReducer } from "../domain/playback/reducer";
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
    history: [],
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

  // 手本音声の再生終了イベントを購読する（マウント時に一度だけ）
  useEffect(() => {
    const unsubscribe = optionsRef.current.player.onEnded(() => {
      clearWaitTimer();
      optionsRef.current.onPlaybackCompleted(stateRef.current.currentContentId);
      handleAdvance("AUDIO_ENDED");
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    progress,
    play,
    stop,
    next,
    prev,
  };
}
