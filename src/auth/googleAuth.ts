// Google認証（Google Identity Services）。参照: docs/spec.md 7.1節

export interface GoogleAuthClientConfig {
  clientId: string;
  scope: string;
}

export interface TokenResult {
  accessToken: string;
  expiresInSeconds: number;
}

export interface RequestTokenOptions {
  // trueの場合サイレント再認証（GISに prompt: '' を渡す）、falseの場合は同意画面を表示する
  silent?: boolean;
}

export interface GoogleAuthClient {
  requestToken(options?: RequestTokenOptions): Promise<TokenResult>;
}

interface GisTokenResponse {
  access_token?: string;
  expires_in?: string;
  error?: string;
}

interface GisErrorResponse {
  type: string;
}

interface GisTokenClient {
  requestAccessToken(options: { prompt: string }): void;
}

interface GoogleIdentityServices {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: GisTokenResponse) => void;
        error_callback: (error: GisErrorResponse) => void;
      }): GisTokenClient;
    };
  };
}

function getGoogleGis(): GoogleIdentityServices | undefined {
  return (globalThis as unknown as { google?: GoogleIdentityServices }).google;
}

export function createGoogleAuthClient(config: GoogleAuthClientConfig): GoogleAuthClient {
  function requestToken(options: RequestTokenOptions = {}): Promise<TokenResult> {
    return new Promise((resolve, reject) => {
      const google = getGoogleGis();
      if (!google) {
        reject(new Error("Google Identity Servicesが読み込まれていません"));
        return;
      }

      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: config.scope,
        callback: (response) => {
          if (response.error || !response.access_token) {
            reject(new Error(`Google認証エラー: ${response.error ?? "不明なエラー"}`));
            return;
          }
          resolve({
            accessToken: response.access_token,
            expiresInSeconds: Number(response.expires_in ?? 0),
          });
        },
        error_callback: (error) => {
          reject(new Error(`Google認証エラー: ${error.type}`));
        },
      });

      tokenClient.requestAccessToken({ prompt: options.silent ? "" : "consent" });
    });
  }

  return { requestToken };
}
