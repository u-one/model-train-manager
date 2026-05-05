# model-train-manager

Nゲージ鉄道模型の車両情報と保有状況を管理するWebアプリケーション。

## 技術スタック

- **フロントエンド:** React (Next.js 15)
- **バックエンド:** Node.js (Next.js API Routes)
- **データベース:** PostgreSQL (Supabase)
- **認証:** NextAuth.js (Google OAuth + ID/パスワード)
- **画像ストレージ:** AWS S3 + CloudFront
- **デプロイ:** Vercel + Supabase

## 開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開いてください。

### 環境変数

`.env.local` を作成して以下を設定してください：

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
ADMIN_EMAILS="your@email.com"
```

詳細は [`docs/deployment-setup.md`](./docs/deployment-setup.md) を参照。

## 主な機能

- 製品情報管理（メーカー・品番・価格等）
- 保有車両管理（購入情報・状態管理）
- タグシステム（カテゴリ別タグによる高度なフィルタリング）
- セット・編成管理（製品間の親子関係）
- CSVインポート（製品情報・保有情報の一括登録）
- 管理者機能（一括削除・ユーザー管理・統計情報）

## デプロイ前チェック

```bash
# 型チェック・Lint・ビルドを一括実行
npm run deploy-check
```

## コード複雑度の計測

ESLintに `complexity` / `max-depth` / `max-lines-per-function` ルールが設定されています。

```bash
# 複雑度の警告を確認
npm run lint
```

複雑度が高い箇所は `warning` として表示されます。閾値はデフォルトで以下のとおりです：

| ルール | 閾値 |
|---|---|
| 循環的複雑度 (`complexity`) | 10 |
| ネスト深さ (`max-depth`) | 4 |
| 関数行数 (`max-lines-per-function`) | 80行 |

閾値の変更は `eslint.config.mjs` を編集してください。

## ドキュメント

- [`docs/deployment-setup.md`](./docs/deployment-setup.md) - 環境設定・デプロイ手順
- [`../../docs/development-log.md`](../../docs/development-log.md) - 開発進捗記録
- [`../../docs/database-schema-management.md`](../../docs/database-schema-management.md) - DBスキーマ管理ガイド
