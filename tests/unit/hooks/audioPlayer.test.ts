import { describe, expect, it, vi } from "vitest";
import { createHtmlAudioPlayer } from "../../../src/hooks/audioPlayer";

// 参照: docs/spec.md 8章、11章（音声再生エラー時は該当コンテンツをスキップ可能にする）

describe("createHtmlAudioPlayer", () => {
  it("play()はaudio要素のsrcを設定し再生する", () => {
    const audio = document.createElement("audio");
    audio.play = vi.fn().mockResolvedValue(undefined);
    const player = createHtmlAudioPlayer(audio);

    player.play("blob://test");

    expect(audio.src).toContain("blob://test");
    expect(audio.play).toHaveBeenCalledTimes(1);
  });

  it("stop()はaudio要素を一時停止する", () => {
    const audio = document.createElement("audio");
    audio.pause = vi.fn();
    const player = createHtmlAudioPlayer(audio);

    player.stop();

    expect(audio.pause).toHaveBeenCalledTimes(1);
  });

  it("onEndedはaudio要素のendedイベントで発火する", () => {
    const audio = document.createElement("audio");
    const player = createHtmlAudioPlayer(audio);
    const callback = vi.fn();

    player.onEnded(callback);
    audio.dispatchEvent(new Event("ended"));

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("音声再生エラー（errorイベント）が発生した場合も、onEndedのコールバックが発火する（スキップできるようにするため）", () => {
    const audio = document.createElement("audio");
    const player = createHtmlAudioPlayer(audio);
    const callback = vi.fn();

    player.onEnded(callback);
    audio.dispatchEvent(new Event("error"));

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("onEndedの購読解除後は、endedイベントが発生してもコールバックが呼ばれない", () => {
    const audio = document.createElement("audio");
    const player = createHtmlAudioPlayer(audio);
    const callback = vi.fn();

    const unsubscribe = player.onEnded(callback);
    unsubscribe();
    audio.dispatchEvent(new Event("ended"));

    expect(callback).not.toHaveBeenCalled();
  });
});
