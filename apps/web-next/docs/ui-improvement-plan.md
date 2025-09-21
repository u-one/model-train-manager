# UI改善とコンポーネント共通化計画

## 現在の問題点分析

### 1. CSS変更の容易性が低い
- **問題**: ハードコーディングされたTailwindクラスが各ページに散在
- **影響**: 色やスタイルの変更時に複数ファイルを修正する必要
- **根本原因**: デザインシステムが未確立

### 2. コンポーネントの重複・雑多な構成
- **フォームフィールド**: 各ページで同様のレイアウト・バリデーション表示が重複実装
- **詳細ページ**: 情報表示セクションが冗長（基本情報、購入情報等の表示パターン）
- **共通パターン**: 戻るボタン、ページヘッダー、カードレイアウト等が再実装されている

### 3. 型定義とラベルマッピングの重複
- **インターフェース**: `Product`, `OwnedVehicle`等が複数ページで重複定義
- **定数**: statusLabels, conditionLabels等のマッピングが各ページに分散

### 4. 視認性の問題
- **テキスト色**: h2見出しやラベルの色が薄く見づらい
- **コントラスト**: グレー系の色調でコントラスト比が不十分

## 改善計画

### Phase 1: デザインシステム基盤構築

#### 1.1 Tailwind設定強化
```typescript
// tailwind.config.js 拡張予定
module.exports = {
  theme: {
    extend: {
      colors: {
        // カスタムカラーパレット
        primary: { /* ブルー系統一 */ },
        secondary: { /* グレー系改善 */ },
        accent: { /* アクセントカラー */ }
      }
    }
  }
}
```

#### 1.2 共通型定義の整理
- **新規ディレクトリ**: `src/types/`
- **統一ファイル**:
  - `product.ts` - Product関連型
  - `owned-vehicle.ts` - OwnedVehicle関連型
  - `constants.ts` - ラベルマッピング集約

### Phase 2: 再利用可能コンポーネント作成

#### 2.1 フォーム関連コンポーネント
```typescript
// src/components/form/FormField.tsx
interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}

// src/components/form/FormSection.tsx
interface FormSectionProps {
  title: string
  children: React.ReactNode
}

// src/components/form/FormActions.tsx
interface FormActionsProps {
  onCancel: () => void
  submitLabel: string
  isSubmitting: boolean
}
```

#### 2.2 レイアウトコンポーネント
```typescript
// src/components/layout/PageHeader.tsx
interface PageHeaderProps {
  title: string
  subtitle?: string
  backButton?: boolean
  actionButton?: {
    label: string
    onClick: () => void
  }
}

// src/components/layout/DetailCard.tsx
interface DetailCardProps {
  title: string
  children: React.ReactNode
}

// src/components/ui/LoadingSpinner.tsx
```

#### 2.3 表示コンポーネント
```typescript
// src/components/ui/StatusBadge.tsx
interface StatusBadgeProps {
  status: string
  variant: 'status' | 'condition' | 'type'
}

// src/components/ui/InfoRow.tsx
interface InfoRowProps {
  label: string
  value: string | number | null
  format?: 'currency' | 'date'
}

// src/components/ui/ImageGallery.tsx
interface ImageGalleryProps {
  images: string[]
  alt: string
  placeholder?: string
}
```

### Phase 3: 既存ページのリファクタリング

#### 3.1 製品関連ページ更新
- `products/[id]/page.tsx` - DetailCard, InfoRow, ImageGallery使用
- `products/[id]/edit/page.tsx` - FormSection, FormField, FormActions使用
- `products/new/page.tsx` - 同上

#### 3.2 保有車両関連ページ更新
- `owned-vehicles/[id]/page.tsx` - 詳細表示コンポーネント統一
- `owned-vehicles/[id]/edit/page.tsx` - フォームコンポーネント統一
- `owned-vehicles/new/page.tsx` - 同上

### Phase 4: スタイル一元化とテーマ改善

#### 4.1 カラーパレット最適化
```scss
// 視認性の高いグレー色調整
:root {
  --gray-50: #f9fafb;
  --gray-600: #4b5563;  // 現在のtext-gray-600より濃く
  --gray-700: #374151;  // 現在のtext-gray-700より濃く
  --gray-900: #111827;  // メインテキスト用
}
```

#### 4.2 レスポンシブ対応強化
- ブレークポイント統一（sm, md, lg, xl）
- グリッドレイアウト最適化
- モバイルファーストアプローチ

## 実装優先度

### 高優先度（Phase 2.4完了前）
1. **視認性改善**: テキスト色の調整（即座に効果が見える）
2. **共通型定義**: 重複解消による保守性向上

### 中優先度（Phase 2.5開始前）
3. **フォームコンポーネント**: 新機能実装時の効率化
4. **レイアウトコンポーネント**: UI一貫性確保

### 低優先度（Phase 3以降）
5. **詳細ページリファクタリング**: 大規模変更のため慎重に実施
6. **Tailwind設定拡張**: 安定後の最適化

## 期待効果

### 開発効率
- **UI変更**: 1箇所修正で全体反映（工数50%削減）
- **新機能追加**: 既存コンポーネント再利用で高速開発
- **保守性**: 統一されたパターンで理解しやすいコード

### ユーザー体験
- **視認性**: コントラスト比改善で読みやすさ向上
- **一貫性**: 統一されたUI/UXで操作性向上
- **レスポンシブ**: デバイス問わず快適な利用

### 品質向上
- **型安全性**: 統一された型定義でバグ減少
- **テスト性**: コンポーネント単位でのテスト容易化
- **拡張性**: 将来の機能追加時の柔軟性確保

## 次のアクション
1. Phase 2.4のUI改善作業完了
2. 本計画に基づく段階的実装開始
3. Phase 2.5（ID/パスワード認証）実装時に新コンポーネント活用