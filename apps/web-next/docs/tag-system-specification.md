# タグシステム仕様書

## 概要

鉄道模型車両管理アプリにおいて、製品により柔軟で詳細な分類・検索機能を提供するためのタグシステム。

### 目的
- 現在の固定的なカテゴリ分類を柔軟なタグシステムに拡張
- 複数軸での製品分類（車種、運営会社、特徴等）
- AND/OR論理演算による高度な検索・フィルタ機能
- 将来的な分類軸の追加に対する拡張性確保

### スコープ
- 製品（products）へのタグ付け機能
- カテゴリ別タグ管理
- タグによるフィルタリング機能
- 管理画面でのタグCRUD操作

## データベース設計

### テーブル構造

#### tags テーブル
```sql
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(30) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- カテゴリ別インデックス
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_tags_name ON tags(name);
```

#### product_tags テーブル
```sql
CREATE TABLE product_tags (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (product_id, tag_id)
);

-- 検索用インデックス
CREATE INDEX idx_product_tags_product_id ON product_tags(product_id);
CREATE INDEX idx_product_tags_tag_id ON product_tags(tag_id);
```

### Prismaスキーマ拡張

```prisma
model Tag {
  id          Int          @id @default(autoincrement())
  name        String       @unique @db.VarChar(50)
  category    String       @db.VarChar(30)
  description String?      @db.Text
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")

  productTags ProductTag[]

  @@index([category])
  @@index([name])
  @@map("tags")
}

model ProductTag {
  productId Int      @map("product_id")
  tagId     Int      @map("tag_id")
  createdAt DateTime @default(now()) @map("created_at")

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  tag     Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([productId, tagId])
  @@index([productId])
  @@index([tagId])
  @@map("product_tags")
}

// Product モデルの拡張
model Product {
  // 既存フィールド...

  productTags ProductTag[]

  // 計算フィールド
  tags Tag[] @relation("ProductTags")
}
```

## タグカテゴリ設計

### 基本カテゴリ

#### vehicle_type（車種）
```
新幹線, 在来線電車, 気動車, 客車, 貨車, 電気機関車,
ディーゼル機関車, 蒸気機関車, 路面電車, 私鉄電車
```

#### company（運営会社）
```
# JR各社
JR北海道, JR東日本, JR東海, JR西日本, JR四国, JR九州, 国鉄

# 大手私鉄
東京メトロ, 都営地下鉄, 小田急電鉄, 京急電鉄, 東急電鉄,
京王電鉄, 西武鉄道, 東武鉄道, 京成電鉄, 相鉄,
近畿日本鉄道, 阪急電鉄, 阪神電気鉄道, 南海電気鉄道,
京阪電気鉄道, 名古屋鉄道, 西日本鉄道

# 第三セクター・その他
青い森鉄道, IGRいわて銀河鉄道, 仙台市交通局,
新京成電鉄, 北総鉄道, 千葉都市モノレール,
湘南モノレール, 多摩都市モノレール
```

#### feature（特徴・仕様）
```
# 編成・両数
単行, 2両編成, 3両編成, 4両編成, 6両編成, 8両編成,
10両編成, 12両編成, 16両編成

# 用途分類
通勤形, 近郊形, 特急形, 急行形, 新快速, 快速, 普通,
寝台車, 食堂車, グリーン車, 指定席, 自由席

# 技術仕様
室内灯対応, Assyパーツ付, フライホイール付,
ヘッドライト点灯, テールライト点灯, DCC対応

# 商品特性
限定品, 絶版, 復刻版, リニューアル品,
初回特典付, 特別仕様, コレクターズエディション
```

#### era（時代・塗装）
```
# 時代区分
国鉄時代, JR発足時, 現在, 引退済み

# 塗装バリエーション
国鉄色, JR色, 更新車, 原色, リニューアル塗装,
復刻塗装, 特別塗装, ラッピング車両, 記念塗装
```

## API設計

### RESTful API エンドポイント

#### タグ管理
```typescript
// タグ一覧取得
GET /api/tags
Query: ?category=vehicle_type&limit=50&offset=0
Response: {
  tags: Tag[],
  total: number,
  categories: string[]
}

// タグ作成
POST /api/tags
Body: {
  name: string,
  category: string,
  description?: string
}

// タグ更新
PUT /api/tags/:id
Body: {
  name?: string,
  category?: string,
  description?: string
}

// タグ削除
DELETE /api/tags/:id
```

#### 製品タグ管理
```typescript
// 製品のタグ取得
GET /api/products/:id/tags
Response: {
  tags: Tag[]
}

// 製品のタグ更新
PUT /api/products/:id/tags
Body: {
  tagIds: number[]
}

// 製品のタグ追加
POST /api/products/:id/tags
Body: {
  tagId: number
}

// 製品のタグ削除
DELETE /api/products/:id/tags/:tagId
```

#### 拡張された製品検索
```typescript
// タグフィルタ付き製品検索
GET /api/products
Query:
  ?tags=1,2,3              // タグID（カンマ区切り）
  &tag_operator=AND        // AND | OR
  &tag_categories=vehicle_type,company  // カテゴリフィルタ
  &exclude_tags=4,5        // 除外タグ
  &search=                 // 既存の検索パラメータ
  &brand=
  &type=
  &page=1
  &limit=100

Response: {
  products: Product[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  },
  appliedFilters: {
    tags: Tag[],
    tagOperator: 'AND' | 'OR',
    excludeTags: Tag[]
  }
}
```

### TypeScript型定義

```typescript
interface Tag {
  id: number
  name: string
  category: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

interface ProductTag {
  productId: number
  tagId: number
  createdAt: Date
}

interface TagCategory {
  name: string
  label: string
  description: string
  tags: Tag[]
}

interface TagFilter {
  tags: number[]
  operator: 'AND' | 'OR'
  categories?: string[]
  excludeTags?: number[]
}

interface ProductWithTags extends Product {
  tags: Tag[]
}
```

## UI/UX設計

### フィルタUI設計

#### 製品一覧ページ拡張
```typescript
// 既存フィルタの拡張
interface ProductFilter {
  // 既存
  search?: string
  brand?: string
  type?: string
  excludeSetSingle?: boolean

  // 新規追加
  tags?: TagFilter
}
```

#### タグフィルタコンポーネント
```tsx
interface TagFilterProps {
  selectedTags: number[]
  operator: 'AND' | 'OR'
  onTagsChange: (tags: number[]) => void
  onOperatorChange: (operator: 'AND' | 'OR') => void
}

// コンポーネント構造
<TagFilter>
  <TagFilterHeader>
    <OperatorToggle /> // AND/OR切り替え
    <ClearButton />    // クリアボタン
  </TagFilterHeader>

  <TagCategorySection category="vehicle_type">
    <TagCheckbox tag="新幹線" />
    <TagCheckbox tag="在来線電車" />
    // ...
  </TagCategorySection>

  <TagCategorySection category="company">
    // ...
  </TagCategorySection>

  <TagCategorySection category="feature">
    // ...
  </TagCategorySection>
</TagFilter>
```

#### 製品フォーム拡張
```tsx
interface ProductFormTags {
  selectedTags: number[]
  availableTags: TagCategory[]
  onTagToggle: (tagId: number) => void
}

// 製品追加・編集フォームに追加
<FormSection title="タグ">
  <TagCategoryInput
    category="vehicle_type"
    label="車種"
    tags={vehicleTypeTags}
    selected={selectedTags}
    onChange={onTagToggle}
  />

  <TagCategoryInput
    category="company"
    label="運営会社"
    tags={companyTags}
    selected={selectedTags}
    onChange={onTagToggle}
  />

  // ...
</FormSection>
```

### 表示UI設計

#### 製品カード/リストでのタグ表示
```tsx
<ProductCard>
  {/* 既存の製品情報 */}

  <TagBadges>
    <TagBadge category="vehicle_type" tag="新幹線" />
    <TagBadge category="company" tag="JR東海" />
    <TagBadge category="feature" tag="室内灯対応" />
  </TagBadges>
</ProductCard>
```

#### タグバッジのスタイル設計
```css
/* カテゴリ別の色分け */
.tag-badge-vehicle_type { @apply bg-blue-100 text-blue-800; }
.tag-badge-company { @apply bg-green-100 text-green-800; }
.tag-badge-feature { @apply bg-purple-100 text-purple-800; }
.tag-badge-era { @apply bg-orange-100 text-orange-800; }
```

## 実装計画

### Phase 1: データベース・API基盤（優先度：高）

#### Step 1.1: データベース構築
- [ ] Prismaスキーマの拡張（Tag, ProductTagモデル追加）
- [ ] マイグレーションファイル作成
- [ ] 基本的なタグデータの準備（seed.sql）

#### Step 1.2: 基本API実装
- [ ] `/api/tags` CRUD エンドポイント
- [ ] `/api/products/:id/tags` 製品タグ管理
- [ ] 既存 `/api/products` のタグフィルタ拡張

#### Step 1.3: データ投入
- [ ] 基本タグデータの登録（車種、主要会社、基本特徴）
- [ ] 管理画面でのタグ管理機能

### Phase 2: フロントエンド実装（優先度：中）

#### Step 2.1: タグフィルタUI
- [ ] TagFilterコンポーネント作成
- [ ] カテゴリ別チェックボックス実装
- [ ] AND/OR切り替え機能
- [ ] 既存フィルタとの統合

#### Step 2.2: 製品フォーム拡張
- [ ] 製品追加フォームへのタグ選択UI追加
- [ ] 製品編集フォームの拡張
- [ ] バリデーション対応

#### Step 2.3: 表示機能
- [ ] 製品一覧でのタグバッジ表示
- [ ] タグによるソート機能
- [ ] タグ統計表示

### Phase 3: 運用・管理機能（優先度：低）

#### Step 3.1: 管理画面拡張
- [ ] 管理画面でのタグCRUD操作
- [ ] タグ統計・分析機能
- [ ] 一括タグ付け機能

#### Step 3.2: データ管理
- [ ] CSVインポート時のタグ自動付与
- [ ] 既存製品への一括タグ付け機能
- [ ] タグの統合・削除機能

#### Step 3.3: 高度な機能
- [ ] タグ推奨機能（類似製品のタグ提案）
- [ ] タグベースの製品推奨
- [ ] タグ使用統計とレポート

## 技術的考慮事項

### パフォーマンス

#### データベースクエリ最適化
```sql
-- 複雑なタグフィルタクエリの例
SELECT DISTINCT p.*
FROM products p
JOIN product_tags pt ON p.id = pt.product_id
JOIN tags t ON pt.tag_id = t.id
WHERE t.id IN (1, 2, 3)  -- 指定されたタグ
GROUP BY p.id
HAVING COUNT(DISTINCT t.id) = 3  -- AND演算の場合
```

#### インデックス戦略
- `product_tags(product_id, tag_id)` の複合インデックス
- `tags(category)` のカテゴリインデックス
- フルテキスト検索とタグフィルタの組み合わせ最適化

### 拡張性

#### 将来的な機能拡張
- ユーザー定義タグの対応
- タグの階層構造（親子関係）
- タグの同義語・エイリアス機能
- 動的タグ（価格帯、発売年代等）

#### データ移行戦略
- 既存の `type` フィールドからタグへの移行
- CSVインポート機能への対応
- レガシーデータとの互換性維持

### セキュリティ

#### 権限管理
- タグ作成・編集の権限制御
- 管理者のみのタグ管理機能
- 不適切なタグの防止

#### バリデーション
- タグ名の重複チェック
- カテゴリの妥当性検証
- XSS対策（タグ表示時）

## 運用方針

### タグ管理ルール

#### 命名規則
- 日本語表記を基本とする
- 略語は避け、正式名称を使用
- 一意性を保つため重複チェック必須

#### カテゴリ管理
- 新規カテゴリ追加は管理者承認制
- カテゴリの統廃合は慎重に検討
- 既存データへの影響を評価

#### データ品質管理
- 定期的なタグ使用状況の確認
- 未使用タグの整理
- 重複・類似タグの統合

### 段階的導入

#### Phase 1導入時
- 基本的な車種・会社タグのみ
- 管理者による手動タグ付け
- フィードバック収集

#### Phase 2導入時
- 特徴・時代タグの追加
- 自動タグ付け機能
- ユーザビリティ改善

#### Phase 3導入時
- 高度な検索機能
- 推奨・分析機能
- 運用の自動化

## 成功指標

### 定量的指標
- タグ付けされた製品の割合（目標：80%以上）
- タグフィルタの使用率（目標：検索の30%以上）
- 検索結果の精度向上（目標：関連性20%向上）

### 定性的指標
- ユーザーの検索効率向上
- 製品発見の容易さ
- 管理の運用コスト削減

## リスク・課題

### 技術的リスク
- 大量データでのクエリパフォーマンス
- タグ数増加によるUI複雑化
- 既存機能との競合・重複

### 運用リスク
- タグ品質の維持コスト
- 不適切なタグ付けによる混乱
- ユーザーの学習コスト

### 対策
- 段階的な機能リリース
- 十分なテスト期間の確保
- ユーザーフィードバックの継続的収集
- 運用ガイドラインの整備

## 参考資料

### 関連ドキュメント
- [開発進捗記録](./development-log.md)
- [プロジェクト仕様書](../apps/web-next/docs/specification.md)
- [CLAUDE.md](../CLAUDE.md)

### 外部参考
- 鉄道模型メーカーの分類体系
- ECサイトのタグシステム事例
- データベース設計ベストプラクティス