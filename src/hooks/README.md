# hooks/

`App.tsx`の実配線（WP3.5）で追加したディレクトリ。ブラウザAPI（`HTMLAudioElement`）と`domain/playback`の状態機械を結びつけるロジックを置く。

- `audioPlayer.ts`: `HTMLAudioElement`を薄くラップする`AudioPlayer`アダプター（テスト時はフェイク実装に差し替え可能）
- `usePlaybackEngine.ts`: `domain/playback`の状態遷移・進行ロジックと`AudioPlayer`を結びつけるフック ✅ WP3.5で実装済み

参照: [docs/implementation-plan.md](../../docs/implementation-plan.md) WP3.5
