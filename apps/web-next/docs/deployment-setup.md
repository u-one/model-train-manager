# デプロイ・環境設定手順

基準日: 2026-10-05。現行コードの設定項目と配置手順。本番・Previewの設定状態は未確認。

## 前提

- アプリの作業ディレクトリはapps/web-next。
- テストを含む開発環境はNode.js 20.19以上の20系、22.12以上の22系、または24以上を使用する。現行jsdomのenginesに基づく。
- ルートの.nvmrcは18のままなので、切り替え時に確認する。
- PostgreSQL / Supabase、Google OAuth、Vercelを用意する。
- VercelのRoot Directoryはapps/web-next、ビルドはnpm run build。

## 環境変数

| 変数 | 用途 |
|---|---|
| DATABASE_URL | Prismaの通常接続 |
| DIRECT_URL | Prismaのスキーマ操作用接続 |
| NEXT_PUBLIC_SUPABASE_URL | SupabaseのURL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | src/lib/supabase.tsの公開クライアント |
| SUPABASE_SERVICE_ROLE_KEY | 製品CSV取込等のサーバー処理 |
| NEXTAUTH_URL | その環境の公開URL。ローカルはhttp://localhost:3000 |
| NEXTAUTH_SECRET | JWTセッション用シークレット |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | Google OAuth認証情報 |
| ADMIN_EMAILS | 管理者メールをカンマ区切りで指定 |
| STORAGE_PROVIDER | auto / vercel-blob / local。省略時auto |
| BLOB_READ_WRITE_TOKEN | Vercel Blobの読み書きトークン |

AWS S3 / CloudFront用の環境変数は現行コードでは使用しない。
ADMIN_EMAILSは明示的に設定する。未設定時は共通管理者ヘルパーとタグAPIで判定が異なる。

ローカルのNext.js用設定は.env.local、Prisma CLI用のDB接続値は.envまたは実行環境の変数に設定する。同じ接続先を使用し、秘密値をGitに保存しない。

## Google OAuth

Google側にWebアプリ用のOAuthクライアントを作り、使用するURLごとにリダイレクトURIを登録する。

~~~text
http://localhost:3000/api/auth/callback/google
https://<公開ドメイン>/api/auth/callback/google
~~~

ポートを変える場合はローカルURIとNEXTAUTH_URLを揃える。Previewで認証する場合も、そのURLに対応するURIと環境変数を設定する。
クライアントID・シークレットを対応する環境に登録する。

## DB準備・変更

DATABASE_URL / DIRECT_URLを対象DBの接続情報に設定する。製品CSV取込用のSupabase設定も同じDBに向ける。

[DBスキーマ管理ガイド](../../../docs/database-schema-management.md) に従い、対象環境とバックアップを確認してから個別に実行する。

~~~bash
npx prisma db push
npx prisma generate
~~~

現行運用はdb push方式。migrateの履歴は導入していない。
npm installとnpm run buildはクライアントを生成するが、DBスキーマを変更しない。

## 画像保存

- ローカル: STORAGE_PROVIDER=local。apps/web-next/public/uploadsに保存し、/uploadsで配信する。
- Vercel: Blobストアを用意し、対応環境へBLOB_READ_WRITE_TOKENを設定する。STORAGE_PROVIDER=vercel-blobを明示する。
- auto: トークンがあればBlob、なければローカルへ切り替わる。Vercelではローカル永続保存を前提にしない。
- Blobへの保存はpublic。実装と残課題は [画像仕様](image-upload-specification.md) を参照。

## デプロイ

1. Vercelプロジェクトをリポジトリへ接続し、Root Directoryをapps/web-nextにする。
2. Production / Preview / Developmentそれぞれの接続先・公開URL・環境変数を設定する。
3. DB変更がある場合は先に変更手順を実施し、適用結果を記録する。
4. 次を1操作ずつ実行する。

~~~bash
npm run type-check
npm run lint
npm run test -- --run
npm run build
~~~

5. apps/web-nextからPreview、本番の順に必要な配置を行う。

~~~bash
npx vercel
npx vercel --prod
~~~

環境変数の変更後は再デプロイする。実際の公開URL・適用DB・DB変更コマンド・追加/廃止した変数・復旧方法を [開発記録](../../../docs/development-log.md) に残す。

## 配置後の確認

- Google / メール・パスワードのログイン、製品一覧、自分の保有車両を確認する。
- 管理者の表示、CSV取込、画像保存・削除を対象環境で確認する。
- 失敗時はアプリログ、DB接続値、OAuth URI、Blobトークンを確認する。
- コードを戻してもDBは戻らない。DB変更を伴う場合は、事前に記録した復旧手順とバックアップを使用する。
