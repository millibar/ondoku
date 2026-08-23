import { afterEach, describe, expect, it, vi } from "vitest";
import { createGoogleAuthClient } from "../../../src/auth/googleAuth";

// 参照: docs/spec.md 7.1節（Google Identity Servicesによるブラウザ完結OAuth）

type TokenCallback = (response: {
  access_token?: string;
  expires_in?: string;
  error?: string;
}) => void;
type ErrorCallback = (error: { type: string }) => void;

function mockGoogleGis() {
  let tokenCallback: TokenCallback = () => {};
  let errorCallback: ErrorCallback = () => {};

  const initTokenClient = vi.fn(
    (config: { callback: TokenCallback; error_callback: ErrorCallback }) => {
      tokenCallback = config.callback;
      errorCallback = config.error_callback;
      return {
        requestAccessToken: vi.fn(),
      };
    },
  );

  (globalThis as unknown as { google: unknown }).google = {
    accounts: { oauth2: { initTokenClient } },
  };

  return {
    initTokenClient,
    triggerSuccess: (response: { access_token: string; expires_in?: string }) =>
      tokenCallback(response),
    triggerCallbackError: (error: string) => tokenCallback({ error }),
    triggerErrorCallback: (error: { type: string }) => errorCallback(error),
  };
}

afterEach(() => {
  delete (globalThis as unknown as { google?: unknown }).google;
});

describe("createGoogleAuthClient", () => {
  it("正常にトークンが取得できた場合、accessTokenとexpiresInSecondsを解決する", async () => {
    const gis = mockGoogleGis();
    const client = createGoogleAuthClient({ clientId: "client-id", scope: "scope" });

    const promise = client.requestToken();
    gis.triggerSuccess({ access_token: "tok-123", expires_in: "3599" });

    await expect(promise).resolves.toEqual({ accessToken: "tok-123", expiresInSeconds: 3599 });
  });

  it("callbackにerrorが含まれる場合、rejectされる", async () => {
    const gis = mockGoogleGis();
    const client = createGoogleAuthClient({ clientId: "client-id", scope: "scope" });

    const promise = client.requestToken();
    gis.triggerCallbackError("access_denied");

    await expect(promise).rejects.toThrow(/access_denied/);
  });

  it("error_callbackが呼ばれた場合、rejectされる", async () => {
    const gis = mockGoogleGis();
    const client = createGoogleAuthClient({ clientId: "client-id", scope: "scope" });

    const promise = client.requestToken();
    gis.triggerErrorCallback({ type: "popup_closed" });

    await expect(promise).rejects.toThrow(/popup_closed/);
  });

  it("サイレント再認証時はprompt: ''でトークンを要求する", async () => {
    const gis = mockGoogleGis();
    const client = createGoogleAuthClient({ clientId: "client-id", scope: "scope" });

    const promise = client.requestToken({ silent: true });
    const tokenClient = gis.initTokenClient.mock.results[0].value as {
      requestAccessToken: (opts: { prompt: string }) => void;
    };
    expect(tokenClient.requestAccessToken).toHaveBeenCalledWith({ prompt: "" });

    gis.triggerSuccess({ access_token: "tok", expires_in: "3599" });
    await promise;
  });

  it("Google Identity Servicesが読み込まれていない場合、rejectされる", async () => {
    const client = createGoogleAuthClient({ clientId: "client-id", scope: "scope" });
    await expect(client.requestToken()).rejects.toThrow();
  });
});
