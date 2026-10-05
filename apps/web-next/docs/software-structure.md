# apps/web-next ソフトウェア構造

Nゲージ鉄道模型管理アプリのフロントエンド/バックエンドを担う Next.js 15 アプリケーション。

---

## 全体アーキテクチャ

```mermaid
graph TB
    subgraph Client["ブラウザ (Client)"]
        UI[React コンポーネント]
    end

    subgraph NextJS["Next.js 15 (Vercel)"]
        Pages[App Router Pages]
        API[API Routes]
        MW[Middleware / Auth]
    end

    subgraph External["外部サービス"]
        DB[(PostgreSQL\nSupabase)]
        Storage[画像ストレージ\nVercel Blob / Local]
        OAuth[Google OAuth]
    end

    UI --> Pages
    UI --> API
    Pages --> MW
    API --> MW
    MW --> DB
    API --> Storage
    MW --> OAuth
```

---

## ディレクトリ構造

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # ルートレイアウト（Navigation + AuthProvider）
│   ├── page.tsx            # トップページ（製品一覧へリダイレクト）
│   ├── products/           # 製品情報 UI
│   ├── owned-vehicles/     # 保有車両 UI
│   ├── admin/              # 管理者専用画面
│   ├── import/             # CSVインポート画面
│   ├── auth/               # 認証画面
│   └── api/                # API Routes（バックエンド）
│       ├── auth/           # NextAuth.js エンドポイント
│       ├── products/       # 製品 CRUD + タグ + インポート
│       ├── owned-vehicles/ # 保有車両 CRUD + インポート
│       ├── tags/           # タグ CRUD
│       ├── admin/          # 管理者専用 API
│       ├── images/         # 画像アップロード/取得
│       └── stats/          # 統計情報
├── components/             # 共有 React コンポーネント
│   ├── ui/                 # 汎用 UI パーツ（Input, Select, TextArea）
│   ├── shared/             # 横断的コンポーネント（VehicleImage, StatusBadge）
│   ├── admin/              # 管理者専用コンポーネント
│   └── providers/          # Context プロバイダー（session-provider）
├── lib/                    # ユーティリティ・インフラ層
│   ├── prisma.ts           # Prisma クライアントシングルトン
│   ├── auth.ts             # NextAuth 設定
│   ├── admin-auth.ts       # 管理者権限チェック
│   ├── csv-parser.ts       # CSV パース処理
│   ├── storage/            # 画像ストレージ抽象化
│   ├── validations/        # Zod バリデーションスキーマ
│   └── utils/              # 汎用ユーティリティ
├── hooks/                  # カスタム React フック
│   ├── useAdmin.ts         # 管理者ステータス取得
│   └── useViewMode.ts      # 一覧/カード表示切替
├── constants/              # 定数定義
│   ├── tags.ts             # タグカテゴリ定数
│   ├── productTypes.ts     # 製品種別定数
│   └── vehicle.ts          # 車両ステータス定数
└── types/
    ├── domain.ts           # ドメイン型定義（Product, OwnedVehicle, Tag）
    └── next-auth.d.ts      # NextAuth セッション型拡張
```

---

## データモデル

```mermaid
erDiagram
    User {
        Int id PK
        String email UK
        String name
        String image
        String password
        DateTime createdAt
    }
    Product {
        Int id PK
        String brand
        String productCode
        String parentCode
        ProductType type
        String name
        Int releaseYear
        Int priceIncludingTax
        String[] imageUrls
        Int createdByUserId FK
    }
    RealVehicle {
        Int id PK
        Int productId FK
        String vehicleType
        String company
        String operationLine
    }
    OwnedVehicle {
        Int id PK
        Int userId FK
        Int productId FK
        String managementId
        VehicleStatus currentStatus
        StorageCondition storageCondition
        DateTime purchaseDate
        String[] imageUrls
    }
    IndependentVehicle {
        Int id PK
        Int ownedVehicleId FK
        String brand
        String name
        String vehicleType
    }
    MaintenanceRecord {
        Int id PK
        Int ownedVehicleId FK
        DateTime maintenanceDate
        String content
    }
    Tag {
        Int id PK
        String name UK
        String category
    }
    ProductTag {
        Int productId PK,FK
        Int tagId PK,FK
    }

    User ||--o{ OwnedVehicle : "保有"
    User ||--o{ Product : "作成"
    Product ||--o{ RealVehicle : "実車情報"
    Product ||--o{ OwnedVehicle : "紐づく"
    Product ||--o{ ProductTag : "タグ"
    Tag ||--o{ ProductTag : "付与先"
    OwnedVehicle ||--o| IndependentVehicle : "製品未紐付け時"
    OwnedVehicle ||--o{ MaintenanceRecord : "整備記録"
```

### Enum 一覧

| Enum | 値 |
|------|-----|
| `ProductType` | `SINGLE`（単品）/ `SET`（セット）/ `SET_SINGLE`（セット単品） |
| `VehicleStatus` | `NORMAL`（正常）/ `NEEDS_REPAIR`（要修理）/ `BROKEN`（故障中） |
| `StorageCondition` | `WITH_CASE`（ケースあり）/ `WITHOUT_CASE`（ケースなし） |
| `PurchaseCondition` | `NEW`（新品）/ `USED`（中古） |

---

## 画面構成と遷移

```mermaid
graph LR
    Root["/\nトップ"] --> Products

    Products["/products\n製品一覧"] --> ProdDetail["/products/:id\n製品詳細"]
    Products --> ProdNew["/products/new\n製品追加"]
    ProdDetail --> ProdEdit["/products/:id/edit\n製品編集"]

    Owned["/owned-vehicles\n保有車両一覧"] --> OwnedDetail["/owned-vehicles/:id\n保有車両詳細"]
    Owned --> OwnedNew["/owned-vehicles/new\n保有車両追加"]
    OwnedDetail --> OwnedEdit["/owned-vehicles/:id/edit\n保有車両編集"]

    Dashboard["/dashboard\nダッシュボード"]
    Import["/import\nCSVインポート"]

    Admin["/admin\n管理者TOP"] --> AdminProducts["/admin/products\n製品管理"]
    Admin --> AdminOwned["/admin/owned-vehicles\n保有車両管理"]
    Admin --> AdminTags["/admin/tags\nタグ管理"]
    Admin --> AdminUsers["/admin/users\nユーザー管理"]

    Auth["/auth/signin\nサインイン"]

    Nav[ナビゲーション] --> Root
    Nav --> Products
    Nav --> Owned
    Nav --> Dashboard
    Nav --> Import
    Nav --> Admin
    Nav --> Auth
```

---

## API Routes 構成

```mermaid
graph TD
    subgraph Products["製品 API"]
        P1["GET/POST /api/products"]
        P2["GET/PUT/DELETE /api/products/:id"]
        P3["GET/POST /api/products/:id/tags"]
        P4["DELETE /api/products/:id/tags/:tagId"]
        P5["GET /api/products/:id/set-components"]
        P6["GET /api/products/:id/parent-sets"]
        P7["POST /api/products/import"]
        P8["POST /api/products/bulk-update-tags"]
    end

    subgraph OwnedVehicles["保有車両 API"]
        O1["GET/POST /api/owned-vehicles"]
        O2["GET/PUT/DELETE /api/owned-vehicles/:id"]
        O3["POST /api/owned-vehicles/import"]
        O4["POST /api/owned-vehicles/match-product"]
        O5["DELETE /api/owned-vehicles/delete-all"]
    end

    subgraph Tags["タグ API"]
        T1["GET/POST /api/tags"]
        T2["GET/PUT/DELETE /api/tags/:id"]
    end

    subgraph Admin["管理者 API（要管理者権限）"]
        A1["GET/DELETE /api/admin/products"]
        A2["DELETE /api/admin/products/delete-all"]
        A3["GET/DELETE /api/admin/owned-vehicles"]
        A4["DELETE /api/admin/owned-vehicles/delete-all"]
        A5["GET /api/admin/stats"]
        A6["GET /api/admin/status"]
        A7["GET /api/admin/users"]
    end

    subgraph Auth["認証 API"]
        AU1["* /api/auth/[...nextauth]"]
        AU2["POST /api/auth/register"]
    end

    subgraph Images["画像 API"]
        I1["POST /api/images/upload"]
        I2["GET /api/images/:key"]
    end

    subgraph Stats["統計 API"]
        S1["GET /api/stats/user"]
    end
```

---

## 認証フロー

```mermaid
sequenceDiagram
    participant Browser
    participant NextJS
    participant NextAuth
    participant DB as PostgreSQL
    participant Google

    alt Google OAuth
        Browser->>NextAuth: /api/auth/signin/google
        NextAuth->>Google: OAuth 認証リクエスト
        Google-->>NextAuth: Authorization Code
        NextAuth->>DB: ユーザー検索/作成
        NextAuth-->>Browser: JWT セッション Cookie
    else ID/パスワード
        Browser->>NextAuth: POST /api/auth/callback/credentials
        NextAuth->>DB: メールでユーザー検索
        DB-->>NextAuth: ユーザー情報（ハッシュ済みパスワード）
        NextAuth->>NextAuth: bcrypt でパスワード検証
        NextAuth-->>Browser: JWT セッション Cookie
    end

    Browser->>NextJS: 認証が必要なページへアクセス
    NextJS->>NextAuth: セッション検証
    NextAuth->>DB: ユーザーID取得
    DB-->>NextAuth: ユーザー情報
    NextAuth-->>NextJS: セッション（user.id 付き）
    NextJS-->>Browser: ページレンダリング
```

---

## コンポーネント構成

```mermaid
graph TB
    Layout["RootLayout\n(layout.tsx)"] --> AuthProvider["AuthProvider\n(session-provider)"]
    AuthProvider --> Navigation
    AuthProvider --> PageContent["各ページコンテンツ"]

    subgraph ProductPages["製品ページ系"]
        ProductList["ProductsPage\n製品一覧"]
        ProductList --> ProductCard
        ProductList --> ProductListItem
        ProductList --> TagFilter
        ProductList --> Pagination
        ProductList --> BulkTagEditDialog
        ProductList --> ViewModeToggle
    end

    subgraph OwnedPages["保有車両ページ系"]
        OwnedList["OwnedVehiclesPage\n保有車両一覧"]
        OwnedList --> OwnedVehicleCard
        OwnedList --> OwnedVehicleListItem
        OwnedDetail["OwnedVehicleDetailPage"]
        OwnedDetail --> VehicleImage
        OwnedDetail --> StatusBadge
    end

    subgraph FormComponents["フォーム系"]
        ProductFormTagSelector["ProductFormTagSelector\nタグ選択UI"]
        CSVImport --> CSVPreview
        ImageUploader --> ImageGallery
    end

    subgraph SharedComponents["共通コンポーネント"]
        AuthGuard["AuthGuard\n認証ガード"]
        ConfirmModal["ConfirmModal\n確認ダイアログ"]
        ItemsContainer["ItemsContainer\nリスト/カード切替コンテナ"]
        VehicleImage
        StatusBadge
    end

    subgraph UIKit["UI キット (src/components/ui)"]
        Input
        Select
        TextArea
    end
```

---

## ストレージ抽象化

```mermaid
classDiagram
    class StorageProvider {
        <<interface>>
        +upload(file, options) UploadResult
        +delete(key) void
        +list(prefix?) StorageItem[]
        +getMetadata(key) StorageMetadata
    }

    class LocalStorage {
        +upload()
        +delete()
        +list()
        +getMetadata()
    }

    class VercelBlobStorage {
        +upload()
        +delete()
        +list()
        +getMetadata()
    }

    StorageProvider <|.. LocalStorage : 実装
    StorageProvider <|.. VercelBlobStorage : 実装

    class StorageIndex {
        +getStorageProvider() StorageProvider
    }

    StorageIndex --> StorageProvider : 環境変数で切替
```

`src/lib/storage/index.ts` が環境変数 `BLOB_READ_WRITE_TOKEN` の有無によって、本番（Vercel Blob）とローカル（ファイルシステム）を自動切替する。

---

## タグシステム

タグは5カテゴリに分類され、製品に多対多で紐づく。

```mermaid
graph LR
    subgraph Categories["タグカテゴリ"]
        C1["vehicle_type\n車種"]
        C2["company\n運営会社"]
        C3["product_feature\n商品特徴"]
        C4["vehicle_spec\n車両仕様"]
        C5["era\n時代・塗装"]
    end

    Tag["Tag\n(タグマスタ)"] --> C1
    Tag --> C2
    Tag --> C3
    Tag --> C4
    Tag --> C5

    Product --> ProductTag["ProductTag\n(中間テーブル)"]
    Tag --> ProductTag

    subgraph Filter["タグフィルタ機能"]
        AND["AND検索\n全タグを含む製品"]
        OR["OR検索\nいずれかのタグを含む製品"]
        NONE["なし検索\nカテゴリ未設定製品"]
    end
```

---

## データフロー（CSVインポート）

```mermaid
sequenceDiagram
    participant User
    participant ImportPage
    participant CSVImport
    participant CSVPreview
    participant API as /api/products/import
    participant DB

    User->>ImportPage: CSVファイルアップロード
    ImportPage->>CSVImport: ファイル渡す
    CSVImport->>CSVImport: csv-parser でパース
    CSVImport->>CSVPreview: プレビューデータ表示
    User->>CSVImport: インポート実行
    CSVImport->>API: POST（パース済みデータ）
    API->>DB: 製品を upsert（メーカー+品番で一意）
    API->>DB: 製品が存在しない場合は IndependentVehicle として登録
    DB-->>API: 結果（作成数・更新数・独立車両数）
    API-->>CSVImport: レスポンス
    CSVImport-->>User: 結果表示
```

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS |
| データベース | PostgreSQL (Supabase) |
| ORM | Prisma |
| 認証 | NextAuth.js (Google OAuth + Credentials) |
| パスワードハッシュ | bcryptjs |
| 画像ストレージ | Vercel Blob（本番）/ ローカルFS（開発） |
| テスト | Vitest + React Testing Library / Playwright (E2E) |
| デプロイ | Vercel |
