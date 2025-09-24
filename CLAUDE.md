# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Nゲージ鉄道模型の車両情報と保有状況を管理するWebアプリケーション。

### 技術スタック
- **フロントエンド:** React (Next.js 15)
- **バックエンド:** Node.js (Next.js API Routes)
- **データベース:** PostgreSQL (Supabase)
- **認証:** NextAuth.js (Google OAuth + ID/パスワード)
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
│  └─ development-log.md    # 開発進捗記録（要参照・更新）
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

### Phase 2.11
- CSVインポート機能
- エラーハンドリング・プレビュー機能

### Phase 2.12 ✅
- 管理者機能
- 一括削除機能
- 全削除機能（安全確認付き）
- ユーザー管理

### Phase 2.13 ✅
- ページネーション改善（デフォルト100件対応）
- 製品インポート一意性修正（メーカー+品番）
- UI視認性向上（ページネーション色調整）
- .gitignore整備（Claude関連ファイル除外）

### Phase 2.14 ✅
- セット・セット単品リンク機能（Phase 2.14.1）
- UI/UX改善（Phase 2.14.2）
  - フィルタ機能強化（アクティブ表示・リセット）
  - セット単品デフォルト非表示
  - レスポンシブデザイン改善
  - 管理者ボタン追加・保有数表示修正

### Phase 2.15（計画策定完了）
- タグシステム実装
- カテゴリ別タグ管理（車種・会社・特徴・時代）
- AND/OR論理演算による高度なフィルタリング
- **詳細**: [タグシステム仕様書](./docs/tag-system-specification.md)

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

### CSVインポート・管理（Phase 2.11-2.12）
- `/api/products/import` - 製品CSVインポート
- `/api/owned-vehicles/import` - 保有車両CSVインポート
- `/api/admin/products` - 製品一括削除（管理者のみ）
- `/api/admin/products/delete-all` - 全製品削除（管理者のみ）
- `/api/admin/owned-vehicles` - 保有車両一括削除（管理者のみ）
- `/api/admin/owned-vehicles/delete-all` - 全保有車両削除（管理者のみ）
- `/api/admin/stats` - 管理統計情報（管理者のみ）

### タグシステム（Phase 2.15）
- `/api/tags` - タグCRUD操作
- `/api/products/:id/tags` - 製品タグ管理
- `/api/products?tags=1,2&tag_operator=AND` - タグフィルタ検索
- カテゴリ別タグ管理（車種・会社・特徴・時代）
- AND/OR論理演算による高度なフィルタリング
- **詳細**: [タグシステム仕様書](./docs/tag-system-specification.md)

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

# 管理機能 (Phase 2.12で実装)
ADMIN_EMAILS="test@uoneweb.net"

# ページネーション設定 (Phase 2.13で調整)
# デフォルト100件/ページで実装済み
```

## 開発進捗管理

### 重要ドキュメント
開発作業時は以下のドキュメントを必ず参照・更新すること：

- **`apps/web-next/docs/specification.md`**: プロジェクト仕様書
  - 技術仕様・データベース設計の確認
  - API設計・画面設計の参照
  - 新機能追加時の仕様更新
  - 環境変数・セキュリティ要件の確認
- **`docs/development-log.md`**: 開発進捗記録
  - 完了した機能のチェック更新
  - 新機能実装時の詳細記録
  - 技術選択の記録
  - 課題・メモの管理

### 実装フローガイドライン
1. **事前確認**: `apps/web-next/docs/specification.md`で技術仕様・API設計を確認
2. **進捗確認**: `docs/development-log.md`で現在のフェーズと残作業を確認
3. **実装完了**: 該当項目を✅に更新
4. **仕様更新**: 新機能追加時は`specification.md`の関連セクションも更新
5. **記録管理**: 新たな課題・改善点があれば記録
6. **詳細追記**: Phase完了時は実装詳細を追記

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
- **管理者機能**: 環境変数ADMIN_EMAILSで指定されたユーザーのみ
  - 全データの一括削除・管理（選択削除・全削除）
  - 全削除機能には「全削除」文字列入力による安全確認
  - ユーザー管理・統計情報閲覧
  - 管理画面での危険な操作には多段階確認が必要

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
- GoogleProvider + CredentialsProvider使用
- セッション管理はJWT方式
- ユーザー情報はSupabaseに保存

## テスト用アカウント

### ID/パスワード認証
- **メールアドレス**: `test@uoneweb.net`
- **パスワード**: `password`
- **名前**: `test`
- **管理者権限**: あり（ADMIN_EMAILSに含まれる）

### 動作確認項目
- ユーザー登録機能
- ID/パスワードログイン
- Google OAuth ログイン
- ダッシュボードアクセス
- ログアウト機能
- **管理機能** (test@uoneweb.netでログイン後)
  - `/admin` への管理画面アクセス
  - 製品・保有車両の一括削除機能
  - **全削除機能**（「全削除」文字列入力による安全確認付き）
  - ユーザー管理機能
  - 統計情報表示とページネーション