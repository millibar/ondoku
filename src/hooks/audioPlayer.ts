// HTMLAudioElementをusePlaybackEngineから扱いやすい形に薄くラップするアダプター。
// 参照: docs/implementation-plan.md WP3.5

export interface AudioPlayer {
  play(url: string): void;
  stop(): void;
  getCurrentTime(): number;
  getDuration(): number;
  onEnded(callback: () => void): () => void;
  onTimeUpdate(callback: () => void): () => void;
}

// <audio>要素のrefがまだ取得できていない間の一時的なプレースホルダー
export function createNoopAudioPlayer(): AudioPlayer {
  return {
    play() {},
    stop() {},
    getCurrentTime: () => 0,
    getDuration: () => 0,
    onEnded: () => () => {},
    onTimeUpdate: () => () => {},
  };
}

export function createHtmlAudioPlayer(audio: HTMLAudioElement): AudioPlayer {
  return {
    play(url) {
      audio.src = url;
      audio.currentTime = 0;
      void audio.play();
    },
    stop() {
      audio.pause();
    },
    getCurrentTime: () => audio.currentTime,
    getDuration: () => (Number.isFinite(audio.duration) ? audio.duration : 0),
    onEnded(callback) {
      // 再生エラー（未対応フォーマット等）が起きた場合も再生終了と同様に扱い、
      // 該当コンテンツをスキップして次へ進めるようにする（仕様書11章）
      audio.addEventListener("ended", callback);
      audio.addEventListener("error", callback);
      return () => {
        audio.removeEventListener("ended", callback);
        audio.removeEventListener("error", callback);
      };
    },
    onTimeUpdate(callback) {
      audio.addEventListener("timeupdate", callback);
      return () => audio.removeEventListener("timeupdate", callback);
    },
  };
}
