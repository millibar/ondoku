// アプリ設定値。参照: docs/spec.md 7.1節
//
// クライアントIDは秘匿情報ではないため、定数としてソースコードに含めている。
// クライアントシークレットは本実装（GISトークンクライアント方式）では使用しないため、
// ここにもリポジトリのどこにも含めない。

export const GOOGLE_OAUTH_CLIENT_ID =
  "470110026121-jekddv45e9t7vfroliqufgf8tdl5v6te.apps.googleusercontent.com";

export const GOOGLE_DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
