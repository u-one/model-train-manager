# Repository Guidelines

## プロジェクト構成とモジュール配置

このファイルは `apps/web-next` 配下の Next.js 15 App Router アプリに適用します。リポジトリ全体は Turborepo 管理の `pnpm` ワークスペースです。ソースコードは `src` にあり、主な役割は次のとおりです。

- `app/`: 画面ルート、レイアウト、API ルート
- `components/`: 共通 UI と管理画面用コンポーネント
- `lib/`: 認証、Prisma、ストレージ、ユーティリティ、バリデーション
- `hooks/`, `constants/`, `types/`: 共通ロジックと型定義
- `prisma/`: スキーマとシード

全体ドキュメントはリポジトリ直下の `../../docs/`、アプリ固有の仕様やセットアップは `docs/` を参照してください。実装に合わせて `../../docs/development-log.md` と `docs/specification.md` も更新します。

## ビルド・テスト・開発コマンド

リポジトリ直下では次を使用します。

- `pnpm dev`: Turbo 経由で開発タスクを起動
- `pnpm build`: ワークスペース全体を本番ビルド
- `pnpm lint`: ESLint を実行
- `pnpm type-check`: TypeScript 型チェックを実行

このディレクトリでは次を使用します。

- `npm run dev`: `localhost:3000` でローカル起動
- `npm run validate`: 型チェック、lint、build を一括実行
- `npm run deploy-check`: `validate` と同等。デプロイ前に実行

## コーディング規約と命名

TypeScript を前提とします。React コンポーネントは PascalCase、例: `ProductCard.tsx`、ユーティリティファイルは kebab-case、例: `owned-vehicle-utils.ts` を使います。URL に対応するルートフォルダ名は App Router の構成に合わせてください。インデントや整形は既存ファイルに合わせ、Lint 設定は `eslint.config.mjs` の `next/core-web-vitals` と TypeScript ルールに従います。

## テスト方針

Vitest のテストは `src/**/*.test.ts(x)` と `tests/**/*.spec.ts` に配置します。最低限の確認はリポジトリ直下の `pnpm lint`、`pnpm type-check`、`pnpm build`、またはこのディレクトリの `npm run validate` です。対象範囲に応じて `npm run test`、`npm run test:coverage` も実行してください。新しいテストは対象機能の近くか `tests/` に置き、`product-form.test.tsx` のように内容が分かる名前を付けてください。

## コミットと Pull Request

Git 履歴では `feat(...)`、`fix(...)`、`refactor(...)` 形式の Conventional Commits が使われています。件名は短く、対象を明確にしてください。例: `feat(pagination): add page size selector`。PR には変更概要、影響する画面または API、関連 Issue、UI 変更時のスクリーンショットを含めてください。Prisma スキーマ変更や環境変数追加がある場合は本文で明記します。

## セキュリティと設定の注意

秘密情報やローカル CSV データはコミットしないでください。DB スキーマ変更は必ず `prisma/schema.prisma` を起点に管理します。認証、管理者機能、削除系 API は慎重に扱い、特に `src/app/api/admin` 配下の変更は権限制御を確認してください。
