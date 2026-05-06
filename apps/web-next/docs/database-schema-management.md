# データベーススキーマ管理ガイド

## 基本原則

**Prismaスキーマを唯一の真実の源（Single Source of Truth）として管理する**

- ✅ すべてのスキーマ変更はPrismaスキーマファイルから行う
- ❌ データベースに直接SQLを実行してスキーマ変更しない
- ✅ Prismaツールを使ってスキーマとデータベースを同期する

## Prismaスキーマの場所

```
apps/web-next/prisma/schema.prisma
```

## スキーマ変更の基本フロー

### 1. Prismaスキーマファイルを編集

```prisma
// apps/web-next/prisma/schema.prisma

model OwnedVehicle {
  id           Int    @id @default(autoincrement())
  managementId String @map("management_id")
  // ... その他のフィールド

  @@index([managementId])  // インデックスのみ
  // @@unique([userId, managementId])  // ← 削除する場合
}
```

### 2. データベースに反映

```bash
cd apps/web-next

# スキーマをデータベースに反映
npx prisma db push

# Prismaクライアントを再生成
npx prisma generate
```

### 3. 動作確認

```bash
# 型チェック
npm run type-check

# ビルド確認
npm run build
```

## 主要コマンド

### `prisma db push` （推奨：開発時）

スキーマをデータベースに直接反映します。マイグレーション履歴は作成しません。

```bash
npx prisma db push
```

**使用ケース:**
- ✅ 開発環境でスキーマを試行錯誤する時
- ✅ Supabaseなど外部管理されたデータベースを使用する時
- ✅ 本プロジェクトのような既存データベースがある場合

**メリット:**
- 素早くスキーマを反映できる
- マイグレーションファイルが不要

### `prisma db pull`

データベースの現在の状態をPrismaスキーマに逆同期します。

```bash
npx prisma db pull
```

**使用ケース:**
- ⚠️ データベースに直接変更が加えられた時の緊急対応
- ✅ 既存データベースからPrismaスキーマを初めて生成する時

**注意:**
- このコマンドを使う必要がある状況は避けるべき
- データベースへの直接変更は推奨されない

### `prisma generate`

Prismaクライアントを生成します。

```bash
npx prisma generate
```

**使用ケース:**
- ✅ `prisma db push` 後
- ✅ スキーマファイルを編集後
- ✅ デプロイ時（自動実行）

### `prisma migrate` （参考：今後導入する場合）

マイグレーション履歴を管理しながらスキーマを変更します。

```bash
# 開発環境
npx prisma migrate dev --name description_of_changes

# 本番環境
npx prisma migrate deploy
```

**現在は使用していません** が、将来的に導入する場合の参考として記載。

## 典型的なワークフロー

### シナリオ1: 新しいフィールドを追加

```bash
# 1. Prismaスキーマを編集
# apps/web-next/prisma/schema.prisma
model Product {
  id          Int     @id @default(autoincrement())
  name        String
  newField    String? // ← 追加
}

# 2. データベースに反映
cd apps/web-next
npx prisma db push

# 3. Prismaクライアント再生成
npx prisma generate

# 4. 確認
npm run type-check
```

### シナリオ2: 制約を削除

```bash
# 1. Prismaスキーマから制約を削除
# @@unique([userId, managementId]) を削除

# 2. データベースに反映
npx prisma db push

# 3. Prismaクライアント再生成
npx prisma generate

# 4. 確認
npm run type-check
npm run build
```

### シナリオ3: データベースとPrismaスキーマの不一致を検出

もしデータベースに直接変更が加えられた場合：

```bash
# 1. 現在のデータベース状態を確認
npx prisma db pull

# 2. 差分を確認（git diff等で）
git diff prisma/schema.prisma

# 3. 意図しない変更があれば、Prismaスキーマを正しい状態に戻す
git checkout prisma/schema.prisma

# 4. Prismaスキーマの状態をデータベースに反映
npx prisma db push
```

## 環境変数設定

Prismaは2つのデータベース接続URLを使用します：

```env
# .env または .env.local

# 通常のクエリ実行用（PgBouncer経由）
DATABASE_URL="postgres://user:pass@host:6543/db?pgbouncer=true"

# スキーマ変更・Migrate用（直接接続）
DIRECT_URL="postgres://user:pass@host:5432/db"
```

`prisma db push` や `prisma migrate` は `DIRECT_URL` を使用します。

## デプロイ時の動作

### Vercel デプロイ

```json
// package.json
{
  "scripts": {
    "build": "prisma generate && next build --turbopack"
  }
}
```

ビルド時に自動的に `prisma generate` が実行され、最新のPrismaクライアントが生成されます。

### Supabase側

Supabaseはデータベースをホストしているだけです。スキーマ変更は：

1. ローカルで `npx prisma db push` を実行
2. Supabase上のデータベースに直接反映される
3. Vercelデプロイ時に新しいPrismaクライアントが生成される

## トラブルシューティング

### エラー: "Drift detected"

```
Drift detected: Your database schema is not in sync with your migration history.
```

**原因**: マイグレーション履歴がない、またはデータベースと不一致

**解決**: `prisma db push` を使用（マイグレーション履歴不要）

```bash
npx prisma db push
```

### エラー: "Can't reach database server"

```
Error: P1001
Can't reach database server at host:5432
```

**原因**: `DIRECT_URL` が設定されていない、または接続情報が間違っている

**解決**: `.env` ファイルを確認

```bash
# 接続テスト
npx prisma db pull
```

### Prismaクライアント生成エラー（Windows）

```
EPERM: operation not permitted, rename 'query_engine-windows.dll.node'
```

**原因**: 開発サーバーやPrismaプロセスがファイルをロック中

**解決**:
```bash
# 開発サーバーを停止
# Ctrl+C で停止

# 再実行
npx prisma generate
```

## チェックリスト

スキーマ変更時は以下を確認：

- [ ] `prisma/schema.prisma` を編集した
- [ ] `npx prisma db push` を実行した
- [ ] `npx prisma generate` を実行した
- [ ] `npm run type-check` が通った
- [ ] `npm run build` が通った
- [ ] Gitにコミットする前に `schema.prisma` の変更を確認した

## 禁止事項

❌ **Supabaseダッシュボードで直接テーブル構造を変更する**
  - インデックスの追加・削除
  - カラムの追加・削除
  - 制約の追加・削除

❌ **SQLエディタで直接DDL（CREATE/ALTER/DROP）を実行する**

❌ **Prismaスキーマとデータベースを手動で同期しようとする**

## 推奨事項

✅ **全てのスキーマ変更はPrismaスキーマファイルから**

✅ **定期的に `prisma db pull` で同期確認**（月1回程度）

✅ **スキーマ変更をGitで管理**

✅ **重要な変更前はSupabaseでバックアップを取得**

## 参考資料

- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma db push](https://www.prisma.io/docs/reference/api-reference/command-reference#db-push)
- [Supabase with Prisma](https://supabase.com/docs/guides/integrations/prisma)
