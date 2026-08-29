// ログイン画面。参照: docs/spec.md 4章、7.1節

export interface LoginScreenProps {
  onLogin: () => void;
  errorMessage: string | null;
}

export function LoginScreen({ onLogin, errorMessage }: LoginScreenProps) {
  return (
    <div className="login-screen">
      <h1>英語音読練習</h1>
      <p>Googleドライブ上の教材（英文・日本語訳・音声）を読み込むには、ログインが必要です。</p>
      {errorMessage && <p role="alert">{errorMessage}</p>}
      <button type="button" className="button--primary" onClick={onLogin}>
        Googleでログイン
      </button>
    </div>
  );
}
