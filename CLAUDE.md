# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Nゲージ鉄道模型の車両情報と保有状況を管理するWebアプリケーション。

### 技術スタック
- **フロントエンド:** React (Next.js)
- **バックエンド:** Node.js (Next.js API Routes)
- **データベース:** PostgreSQL (Supabase)
- **認証:** NextAuth.js (Google OAuth)
- **画像ストレージ:** AWS S3 + CloudFront
- **デプロイ:** Vercel + Supabase

## ディレクトリ構造

```
repo-root/
├─ apps/                    # デプロイ対象（＝実行可能物）
│  └─ web-next/             # Next.js フロントエンドアプリ
│     └─ docs/              # web-next固有ドキュメント
│        └─ deployment-setup.md  # 環境設定・デプロイ手順
├─ docs/                    # プロジェクト全体ドキュメント
├─ local/                   # ローカルファイル（git管理外）
│  ├─ 車両リスト - 車両商品情報.csv
│  └─ 車両リスト - 保有車両.csv
└─ CLAUDE.md               # このファイル
```

## データベース設計

### 主要テーブル
- **products** - 製品マスタ（品番、メーカー、価格等）
- **real_vehicles** - 実車情報（形式、所属会社等）
- **users** - ユーザー情報
- **owned_vehicles** - 保有車両（購入情報、状態管理）
- **independent_vehicles** - 独立記録車両
- **maintenance_records** - 整備記録

### データ移行
- `local/` ディレクトリ内のCSVファイルに既存データが格納されている
- 製品情報CSVと保有情報CSVの2つのファイルがある

## 開発フェーズ

### Phase 1 (MVP)
- 製品情報管理
- 保有車両管理
- ユーザー認証

### Phase 2
- フォーム機能（追加・編集）
- UI改善

### Phase 2.5
- ID/パスワード認証追加
- ユーザー登録機能

### Phase 2.6
- セット・編成管理
- 製品間親子関係管理

### Phase 3
- 整備記録機能
- 画像アップロード
- データエクスポート

### Phase 4
- ウィッシュリスト
- CSV出力
- 共有機能

## API設計

### 認証
- `/api/auth/*` - NextAuth.js Google OAuthエンドポイント

### 製品情報
- `/api/products` - 製品一覧・追加
- `/api/products/:id` - 製品詳細・更新・削除

### セット管理（Phase 2.5）
- `/api/products/:id/set-components` - セット構成車両管理
- `/api/products/:id/parent-sets` - 所属セット情報取得

### 保有車両
- `/api/owned-vehicles` - 保有車両一覧・追加
- `/api/owned-vehicles/:id` - 保有車両詳細・更新・削除
- `/api/owned-vehicles/stats` - 統計情報

### 整備記録
- `/api/owned-vehicles/:id/maintenance` - 整備記録管理
- `/api/maintenance/:id` - 整備記録操作

## 環境変数

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# NextAuth (Google OAuth)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# AWS S3 (Phase 3で実装)
AWS_REGION="ap-northeast-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
S3_BUCKET_NAME="..."
CLOUDFRONT_DOMAIN="..."
```

## 開発ガイドライン

### コーディング規約
- TypeScript必須
- ESLint + Prettier設定
- コンポーネント名: PascalCase
- ファイル名: kebab-case

### デプロイ前チェック必須項目
実装完了時は以下のコマンドで必ずチェックしてからデプロイすること：

```bash
cd apps/web-next

# 型チェック
npm run type-check

# ESLintチェック
npm run lint

# ビルドチェック
npm run build

# 一括チェック（推奨）
npm run deploy-check
```

**重要**: これらのチェックが全て通らない場合はVercelデプロイに失敗します。

### コミット規約
```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット
refactor: リファクタリング
test: テスト追加・修正
chore: ビルド・設定変更
```

### ブランチ戦略
- main: 本番環境
- develop: 開発ブランチ
- feature/*: 機能開発
- hotfix/*: 緊急修正

## パフォーマンス要件

- 初回読み込み: 3秒以内
- ページ遷移: 1秒以内
- 画像読み込み: 2秒以内

### 最適化施策
- Next.js SSG/ISR活用
- 画像最適化（Next.js Image）
- データベースインデックス最適化
- キャッシュ戦略

## セキュリティ

### 権限管理
- 製品情報: ログインなしで閲覧可能
- 保有情報: ログインユーザーのみ
- 管理機能: 所有者のみ編集可能

## テスト戦略

- **ユニットテスト:** Jest + React Testing Library
- **統合テスト:** API Routes テスト
- **E2Eテスト:** Playwright（主要機能のみ）

### テスト対象
- Google OAuth認証フロー
- CRUD操作
- フィルタ・検索機能
- データ整合性

## 認証設定

### Google Cloud Console設定
1. Google Cloud Consoleでプロジェクト作成
2. OAuth 2.0認証情報作成
3. 認証済みリダイレクトURI設定：
   - http://localhost:3000/api/auth/callback/google (開発)
   - https://your-domain.com/api/auth/callback/google (本番)

### NextAuth.js設定
- GoogleProviderのみ使用
- セッション管理はJWT方式
- ユーザー情報はSupabaseに保存