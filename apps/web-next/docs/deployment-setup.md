# デプロイ・環境設定手順

基準日: 2026-10-07。現行コードの設定項目と配置手順。本番・Previewの設定状態は未確認。

## 前提

- アプリの作業ディレクトリはapps/web-next。
- テストを含む開発環境はNode.js 20.19以上または22.12以上を使用する。現行jsdomのenginesに基づく。
- ルートの`.nvmrc`とGitHub ActionsはNode.js 22を使用する。
- PostgreSQL、Google OAuth、Vercelを用意する。
- VercelのRoot Directoryはapps/web-next、ビルドはnpm run build。

## 環境変数

| 変数 | 用途 |
|---|---|
| DATABASE_URL | Prismaの通常接続 |
| DIRECT_URL | Prismaのスキーマ操作用接続 |
| NEXTAUTH_URL | その環境の公開URL。ローカルはhttp://localhost:3000 |
| NEXTAUTH_SECRET | JWTセッション用シークレット |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | Google OAuth認証情報 |
| ADMIN_EMAILS | 管理者メールをカンマ区切りで指定 |
| STORAGE_PROVIDER | auto / vercel-blob / local。省略時auto |
| BLOB_READ_WRITE_TOKEN | Vercel Blobの読み書きトークン |

AWS S3 / CloudFront用の環境変数は現行コードでは使用しない。
ADMIN_EMAILSは管理者メールを明示的に設定する。未設定時は管理者なしとして扱う。
製品・保有CSV取込を含むDB処理はPrismaを使う。未使用Supabaseヘルパーと依存は削除済み。`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` は不要。外部環境での変数削除は、その環境の他用途がないことを確認して行う。

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

DATABASE_URL / DIRECT_URLを対象DBの接続情報に設定する。対象環境とバックアップを必ず確認する。

[DBスキーマ管理ガイド](database-schema-management.md) に従い、対象環境とバックアップを確認してから個別に実行する。

~~~bash
npx prisma db push
npx prisma generate
~~~

現行運用はdb push方式。migrateの履歴は導入していない。
npm installとnpm run buildはクライアントを生成するが、DBスキーマを変更しない。

### セット関係の既存データ移行（追加スキーマ）

新しいProductSetComponent / parentSetOwnedVehicleIdの適用後に実行する。アプリの互換読取は旧parentCode・備考を残す。

1. 対象DBのバックアップを取得し、`DATABASE_URL`が対象環境を指すことを確認する。
2. 上記の`db push`と`prisma generate`を実行する。
3. `DATABASE_URL`を実行環境へ設定した状態で、まず読取専用のドライランを行う。

~~~bash
node scripts/migrate-set-relationships.mjs
~~~

4. 出力された候補・未解決一覧を確認する。製品は旧parentCodeがセット品番に大小文字を無視して一意一致する関係、保有車両は同じユーザーの保有セットと旧備考マーカーが一意一致する関係だけが候補になる。
5. 候補と未解決理由を確認してから適用する。

~~~bash
node scripts/migrate-set-relationships.mjs --apply
~~~

6. ドライランを再実行し、新規候補が0件で、適用数・既存リンク数・未解決一覧が説明できることを確認する。アプリの製品構成・保有セット詳細も確認する。

スクリプトは再実行可能で、既存リンクを重複作成しない。ドライランはDBを書き換えない。誤適用時は対象DBのバックアップを復元する。旧コードへ戻しても追加スキーマとリンク行は残り、スキーマ削除や互換読取の除去は別変更として扱う。未解決関係は画面表示上の互換読取に残るため、件数と判断を作業記録に残す。

`.env.local`の値は単独のNode.jsスクリプトには自動読込されない。実行端末または運用環境のシークレット設定から`DATABASE_URL`を渡し、接続文字列を画面出力・記録へ貼らない。

## ローカル動作確認

本番と分離した確認専用DBで行う。Dockerでの例（ポート5433）:

~~~bash
docker run -d --name model-train-test-db -e POSTGRES_PASSWORD=<任意> -e POSTGRES_DB=model_train_test -p 5433:5432 postgres:16
~~~

1. apps/web-nextの.env.localにDATABASE_URL / DIRECT_URL（上記DB）、NEXTAUTH_URL、NEXTAUTH_SECRET、ADMIN_EMAILS、STORAGE_PROVIDER=localを設定する。.envにもDATABASE_URL / DIRECT_URLを設定する。どちらもGit管理外。
2. apps/web-nextで`npx prisma db push`、`npm run dev`を実行する。
3. 画面からメール・パスワードで管理者（ADMIN_EMAILS）と一般ユーザーを登録し、認可・CSV取込・画像を確認する。

Playwrightは`channel: 'chrome'`で拡張機能のないプロファイルを使う。Chrome拡張経由の操作は、他の拡張機能（パスワード管理等）の干渉で失敗することがある。画面の読込直後に入力するとログインが成立しない場合があるため、表示後に操作する。

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

環境変数の変更後は再デプロイする。実際の公開URL・適用DB・DB変更コマンド・追加/廃止した変数・復旧方法を [開発記録](../../docs/development-log.md) に残す。

## 配置後の確認

- Google / メール・パスワードのログイン、製品一覧、自分の保有車両を確認する。
- 管理者の表示、CSV取込、画像保存・削除を対象環境で確認する。
- 失敗時はアプリログ、DB接続値、OAuth URI、Blobトークンを確認する。
- コードを戻してもDBは戻らない。DB変更を伴う場合は、事前に記録した復旧手順とバックアップを使用する。
