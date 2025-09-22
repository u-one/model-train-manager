# 鉄道模型車両管理アプリ 開発仕様書

## 1. プロジェクト概要

### 1.1 目的
Nゲージ鉄道模型の車両情報と保有状況を管理するWebアプリケーション

### 1.2 ターゲットユーザー
- 鉄道模型愛好家
- 個人コレクター
- 複数ユーザーでの情報共有も想定

### 1.3 主要機能
- 製品情報管理（全ユーザー共通データベース）
- 保有車両管理（ユーザー個別）
- セット・編成管理
- 保有リストの共有
- CSVインポート・エクスポート機能
- 管理者向け一括操作機能

## 2. 技術仕様

### 2.1 技術スタック
- **フロントエンド:** React (Next.js)
- **バックエンド:** Node.js (Next.js API Routes)
- **データベース:** PostgreSQL
- **認証:** NextAuth.js
- **画像ストレージ:** AWS S3 + CloudFront
- **デプロイ:** Vercel + Supabase/PlanetScale

### 2.2 開発優先順位
1. **Phase 1 (MVP):** 製品情報管理、保有車両管理、ユーザー認証
2. **Phase 2:** セット・編成管理
3. **Phase 3:** 画像アップロード、検索機能
4. **Phase 4:** ウィッシュリスト、CSV出力、共有機能

## 3. データベース設計

### 3.1 主要テーブル構成

#### 3.1.1 製品マスタテーブル (products)
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  brand VARCHAR(100) NOT NULL,              -- メーカー名
  product_code VARCHAR(100),                -- 品番
  parent_code VARCHAR(100),                 -- 親品番（セット商品用）
  type VARCHAR(20) NOT NULL,                -- 単品/セット/セット単品
  name VARCHAR(500) NOT NULL,               -- 商品名
  release_year INTEGER,                     -- 発売年
  price_excluding_tax INTEGER,              -- 税抜価格
  price_including_tax INTEGER,              -- 税込価格
  jan_code VARCHAR(50),                     -- JANコード
  description TEXT,                         -- 詳細説明
  tags TEXT[],                              -- タグ配列
  vehicle_count INTEGER DEFAULT 1,          -- 車両数
  image_url VARCHAR(500),                   -- 製品画像URL
  url VARCHAR(500),                         -- 公式URL
  icon VARCHAR(100),                        -- アイコンファイル名
  created_by_user_id INTEGER,               -- ユーザー追加製品の場合
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT products_type_check CHECK (type IN ('単品', 'セット', 'セット単品'))
);

-- インデックス
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_code ON products(product_code);
CREATE INDEX idx_products_parent ON products(parent_code);
CREATE INDEX idx_products_type ON products(type);
```

#### 3.1.2 実車情報テーブル (real_vehicles)
```sql
CREATE TABLE real_vehicles (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(100),                -- 車両形式
  company VARCHAR(100),                     -- 所属会社
  manufacturing_year VARCHAR(50),           -- 製造年代
  operation_line VARCHAR(100),              -- 運用線区
  notes TEXT,                               -- 備考
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_real_vehicles_product ON real_vehicles(product_id);
```

#### 3.1.3 ユーザーテーブル (users)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  image VARCHAR(500),                       -- プロフィール画像
  email_verified TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.1.4 保有車両テーブル (owned_vehicles)
```sql
CREATE TABLE owned_vehicles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  management_id VARCHAR(100) NOT NULL,      -- 管理用ID
  product_id INTEGER REFERENCES products(id), -- null可（独立記録の場合）
  is_independent BOOLEAN DEFAULT FALSE,     -- 独立記録フラグ
  
  -- 購入情報
  purchase_date DATE,
  purchase_price_excluding_tax INTEGER,
  purchase_price_including_tax INTEGER,
  purchase_store VARCHAR(200),
  purchase_condition VARCHAR(20),           -- 新品/中古
  
  -- 現在の状態
  current_status VARCHAR(20) DEFAULT '正常', -- 正常/要修理/故障中/軽改造/重改造
  storage_condition VARCHAR(20) DEFAULT 'ケースあり', -- ケースあり/ケースなし
  
  -- その他
  maintenance_notes TEXT,                   -- 整備情報
  notes TEXT,                               -- 備考
  image_urls TEXT[],                        -- 画像URL配列
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, management_id),
  CONSTRAINT owned_vehicles_status_check CHECK (current_status IN ('正常', '要修理', '故障中', '軽改造', '重改造')),
  CONSTRAINT owned_vehicles_storage_check CHECK (storage_condition IN ('ケースあり', 'ケースなし')),
  CONSTRAINT owned_vehicles_condition_check CHECK (purchase_condition IN ('新品', '中古'))
);

CREATE INDEX idx_owned_vehicles_user ON owned_vehicles(user_id);
CREATE INDEX idx_owned_vehicles_product ON owned_vehicles(product_id);
CREATE INDEX idx_owned_vehicles_management ON owned_vehicles(management_id);
```

#### 3.1.5 独立記録車両テーブル (independent_vehicles)
```sql
CREATE TABLE independent_vehicles (
  id SERIAL PRIMARY KEY,
  owned_vehicle_id INTEGER NOT NULL REFERENCES owned_vehicles(id) ON DELETE CASCADE,
  brand VARCHAR(100),                       -- メーカー
  product_code VARCHAR(100),                -- 品番
  name VARCHAR(500) NOT NULL,               -- 商品名
  vehicle_type VARCHAR(100),                -- 車両形式
  description TEXT,                         -- 説明
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_independent_vehicles_owned ON independent_vehicles(owned_vehicle_id);
```

#### 3.1.6 整備記録テーブル (maintenance_records)
```sql
CREATE TABLE maintenance_records (
  id SERIAL PRIMARY KEY,
  owned_vehicle_id INTEGER NOT NULL REFERENCES owned_vehicles(id) ON DELETE CASCADE,
  maintenance_date DATE NOT NULL,
  content TEXT NOT NULL,                    -- 整備内容
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maintenance_records_owned ON maintenance_records(owned_vehicle_id);
CREATE INDEX idx_maintenance_records_date ON maintenance_records(maintenance_date);
```

### 3.2 初期データ移行

#### 3.2.1 製品情報CSV構造
```
ブランド,品番,parentCode,種別,商品名,税抜,税込,発売日,URL,詳細,タグ,JAN,icon,車両数
```

#### 3.2.2 保有情報CSV構造
```
No,分類,系統,セット/単品,形式,メーカー,品番,定価,購入価格(税抜),(税込),入手場所,購入日,ID,備考１,ケース有無,備考２
```

## 4. API設計

### 4.1 認証API
```
POST /api/auth/signin      # ログイン
POST /api/auth/signup      # ユーザー登録
POST /api/auth/signout     # ログアウト
GET  /api/auth/session     # セッション情報取得
```

### 4.2 製品情報API
```
GET    /api/products               # 製品一覧取得（フィルタ・ソート・ページネーション）
GET    /api/products/:id           # 製品詳細取得
POST   /api/products               # 製品追加（ユーザー独自）
PUT    /api/products/:id           # 製品更新
DELETE /api/products/:id           # 製品削除
GET    /api/products/:id/set       # セット構成取得
PUT    /api/products/:id/set       # セット構成更新
```

### 4.3 保有車両API
```
GET    /api/owned-vehicles         # 保有車両一覧取得
GET    /api/owned-vehicles/:id     # 保有車両詳細取得
POST   /api/owned-vehicles         # 保有車両追加
PUT    /api/owned-vehicles/:id     # 保有車両更新
DELETE /api/owned-vehicles/:id     # 保有車両削除
GET    /api/owned-vehicles/stats   # 統計情報取得
```

### 4.4 整備記録API
```
GET    /api/owned-vehicles/:id/maintenance     # 整備記録一覧
POST   /api/owned-vehicles/:id/maintenance     # 整備記録追加
PUT    /api/maintenance/:id                    # 整備記録更新
DELETE /api/maintenance/:id                    # 整備記録削除
```

### 4.5 画像API
```
POST   /api/images/upload         # 画像アップロード（S3プリサインドURL）
DELETE /api/images/:key           # 画像削除
```

### 4.6 CSVインポート・管理API
```
POST   /api/products/import       # 製品情報CSVインポート
POST   /api/owned-vehicles/import # 保有車両CSVインポート
DELETE /api/admin/products        # 製品一括削除（管理者のみ）
DELETE /api/admin/owned-vehicles  # 保有車両一括削除（管理者のみ）
DELETE /api/admin/reset           # 全データリセット（管理者のみ）
GET    /api/admin/stats           # 管理統計情報取得（管理者のみ）
```

## 5. 画面設計

### 5.1 完成済み画面
1. **製品詳細画面** - セット管理機能付き
2. **製品一覧画面** - リストビュー、フィルタ機能
3. **保有車両管理画面** - 一覧、統計、フィルタ
4. **車両詳細・編集画面** - 表示/編集モード切り替え
5. **ダッシュボード** - 統計表示、最近の活動、クイックアクション
6. **CSVインポート画面** - 製品・保有車両のCSVインポート機能

### 5.2 管理画面（管理者のみ）
1. **管理ダッシュボード** - システム統計、データベース状況
2. **製品管理画面** - 全製品一覧、一括削除、検索機能
3. **保有車両管理画面** - 全保有車両一覧、ユーザー別削除機能
4. **ユーザー管理画面** - 全ユーザー情報、統計表示

### 5.3 レスポンシブ対応
- PC、タブレット、スマートフォン対応
- 買い物中の参照を想定したモバイル最適化

## 6. 認証・セキュリティ

### 6.1 認証方式
- NextAuth.js使用
- Google OAuth認証のみ
- セッション管理はJWT方式

### 6.2 権限管理
- 製品情報：ログインなしで閲覧可能
- 保有情報：ログインユーザーのみ
- 管理機能：所有者のみ編集可能
- 管理者機能：環境変数で指定されたユーザーのみ
  - 全データの一括削除・管理
  - ユーザー管理
  - システム統計情報の閲覧

## 7. パフォーマンス要件

### 7.1 目標値
- 初回読み込み：3秒以内
- ページ遷移：1秒以内
- 画像読み込み：2秒以内（CloudFront使用）

### 7.2 最適化施策
- Next.js SSG/ISR活用
- 画像最適化（Next.js Image）
- データベースインデックス最適化
- キャッシュ戦略

## 8. デプロイ・運用

### 8.1 環境構成
- **開発環境:** ローカル + Supabase
- **ステージング環境:** Vercel Preview + Supabase
- **本番環境:** Vercel + Supabase + AWS S3

### 8.2 CI/CDパイプライン
- GitHub Actions使用
- プルリクエスト時の自動テスト
- マージ時の自動デプロイ

### 8.3 モニタリング
- Vercel Analytics
- Supabase メトリクス
- エラー追跡（Sentry等）

## 9. 開発タスク（Phase 1）

### 9.1 環境構築
```bash
# Next.jsプロジェクト作成
npx create-next-app@latest train-model-manager --typescript --tailwind --eslint --app

# 必要パッケージインストール
npm install @supabase/supabase-js next-auth prisma @prisma/client
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install lucide-react @headlessui/react
npm install -D prisma
```

### 9.2 データベースセットアップ
1. Supabaseプロジェクト作成
2. 上記SQL実行
3. Prismaスキーマ作成
4. 初期データ投入スクリプト作成

### 9.3 基本機能実装順序
1. **認証システム** (NextAuth.js + Supabase)
2. **製品情報表示** (一覧・詳細画面)
3. **保有車両CRUD** (追加・編集・削除)
4. **フィルタ・検索機能**
5. **ダッシュボード統計**

### 9.4 ディレクトリ構造
```
src/
├── app/                    # App Router
│   ├── (auth)/            # 認証関連ページ
│   ├── dashboard/         # ダッシュボード
│   ├── products/          # 製品情報
│   ├── vehicles/          # 保有車両
│   ├── api/               # API Routes
│   └── layout.tsx         # ルートレイアウト
├── components/            # 再利用可能コンポーネント
│   ├── ui/               # UIコンポーネント
│   ├── forms/            # フォームコンポーネント
│   └── layout/           # レイアウトコンポーネント
├── lib/                  # ユーティリティ
│   ├── supabase.ts       # Supabase設定
│   ├── auth.ts           # NextAuth設定
│   └── utils.ts          # 汎用関数
├── types/                # TypeScript型定義
└── styles/               # スタイル
```

## 10. 開発注意事項

### 10.1 コーディング規約
- TypeScript必須
- ESLint + Prettier設定
- コンポーネント名はPascalCase
- ファイル名はkebab-case

### 10.2 コミット規約
```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット
refactor: リファクタリング
test: テスト追加・修正
chore: ビルド・設定変更
```

### 10.3 ブランチ戦略
- main: 本番環境
- develop: 開発ブランチ
- feature/*: 機能開発
- hotfix/*: 緊急修正

## 11. テストStrategy

### 11.1 テスト種別
- **ユニットテスト:** Jest + React Testing Library
- **統合テスト:** API Routes テスト
- **E2Eテスト:** Playwright（主要機能のみ）

### 11.2 テスト対象
- 認証フロー
- CRUD操作
- フィルタ・検索機能
- データ整合性

## 12. パッケージ構成

### 12.1 主要依存関係
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "typescript": "^5.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "next-auth": "^4.0.0",
    "prisma": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "tailwindcss": "^3.0.0",
    "lucide-react": "^0.200.0",
    "@aws-sdk/client-s3": "^3.0.0",
    "react-hook-form": "^7.0.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "@testing-library/react": "^13.0.0",
    "playwright": "^1.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

## 13. 環境変数

### 13.1 必要な環境変数
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
ADMIN_EMAILS="admin1@example.com,admin2@example.com"
```

## 14. 既存データ移行

### 14.1 CSVインポート機能
- 管理者用データインポート画面
- CSVフォーマット検証
- エラーハンドリング
- 進捗表示

### 14.2 データクリーニング
- 重複データの統合
- 不正データの修正
- 親子関係の整合性チェック

## 15. 今後の拡張予定

### 15.1 Phase 2以降
- 編成管理機能
- ウィッシュリスト
- データ共有機能
- モバイルアプリ（React Native）

### 15.2 API拡張
- GraphQL対応検討
- リアルタイム同期
- 外部システム連携

---

## 開発開始時の確認事項

1. **要件の最終確認**
   - 機能要件に漏れがないか
   - 非機能要件（性能・セキュリティ）の確認

2. **技術選定の妥当性**
   - 選択した技術スタックの妥当性
   - ライブラリバージョンの互換性

3. **開発環境**
   - ローカル開発環境の構築手順
   - 外部サービス（Supabase、AWS）の設定

4. **プロジェクト管理**
   - タスク管理方法
   - 進捗報告頻度
   - レビュー体制

この仕様書をベースに、Claude Codeでの開発を開始することができます。不明な点や追加が必要な情報があれば、随時アップデートしてください。