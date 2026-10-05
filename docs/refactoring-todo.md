# リファクタリングTODO

作成日: 2026-03-29

## サマリー

`apps/web-next` 全体を調査した結果、開発速度を下げる課題が7件確認された。最も影響が大きいのは**認証チェックの重複**（18ファイル・42箇所）と**ページコンポーネント・APIルートの肥大化**（7ファイルが400行超）であり、いずれも修正漏れリスクと見通しの悪さを招いている。型定義の重複も `Product` / `OwnedVehicle` インターフェースが8〜7ファイルに散在しており、`src/types/` への型集約という設計意図（`specification.md` Section 9.4）と大きく乖離している。テストは全体的に欠落しており、共有ユーティリティの変更時のリグレッション検出ができない状態にある。

---

## 課題一覧

### 優先度: 高（開発速度への影響が大きい）

| # | ファイル/パス | 課題の種別 | 概要 | 推定規模 |
|---|-------------|-----------|------|---------|
| 1 | `apps/web-next/src/app/api/`（18ファイル） | 重複 | 認証チェックが42箇所で重複・共通関数なし | M |
| 2 | `apps/web-next/src/app/owned-vehicles/page.tsx`（549行）他6ファイル | 肥大化 | 状態管理・API呼び出し・UI描画が1ファイルに混在 | L |
| 3 | `apps/web-next/src/app/api/owned-vehicles/route.ts`（376行）他3ファイル | 肥大化 / 多重責務 | 複数HTTPメソッド・バリデーション・DB処理が混在 | M |

### 優先度: 中

| # | ファイル/パス | 課題の種別 | 概要 | 推定規模 |
|---|-------------|-----------|------|---------|
| 4 | `apps/web-next/src/app/`（8ファイル・7ファイル） | 重複 / 型安全性 | `Product` / `OwnedVehicle` 型が各ファイルで独自定義・内容が微妙に相違 | M |
| 5 | `apps/web-next/src/lib/csv-parser.ts`（361行） | 肥大化 / 多重責務 | CSVパース・型変換・バリデーション・文字列変換が混在 | M |

### 優先度: 低

| # | ファイル/パス | 課題の種別 | 概要 | 推定規模 |
|---|-------------|-----------|------|---------|
| 6 | `apps/web-next/src/app/api/owned-vehicles/route.ts:340` 他3箇所 | 型安全性 | `any` 型・型アサーションによる型逃げ | S |
| 7 | `apps/web-next/src/lib/` 全体 | テスト欠落 | テストファイルが存在しない・共有ユーティリティのリグレッション検出不可 | L |

---

## 課題詳細

### #1 認証チェックの重複

- **ファイル**: `apps/web-next/src/app/api/owned-vehicles/route.ts:11-18`, `apps/web-next/src/app/api/owned-vehicles/[id]/route.ts`, `apps/web-next/src/app/api/products/route.ts`, `apps/web-next/src/app/api/products/[id]/route.ts`, `apps/web-next/src/app/api/tags/route.ts`, `apps/web-next/src/app/api/tags/[id]/route.ts` 他13ファイル（計18ファイル・42箇所）
- **問題**: 以下のパターンが全APIルートで手書きコピーされている。

  ```typescript
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  ```

  `apps/web-next/src/lib/admin-auth.ts:10-35` には管理者用の `isAdminUser()` / `requireAdmin()` が存在するが、一般ユーザー向けの `requireAuth()` に相当する共通関数がない。また、`owned-vehicles/route.ts:11-18` でセッションを取得した後、`isAdminUser()` 内部でも `getServerSession` を再度呼び出す二重セッション取得が発生している。

- **開発速度への影響**: 認証要件が変わった場合（例: emailだけでなくisVerifiedも確認する等）、42箇所を漏れなく修正する必要がある。1箇所でも修正が漏れると認証バイパスが生じる。
- **推奨対応方針**: `apps/web-next/src/lib/auth-helpers.ts` に `requireAuth(request?: Request): Promise<{ session: Session } | NextResponse>` を追加し、全APIルートから呼び出す形に一本化する。`admin-auth.ts` の `requireAdmin()` と同パターン（`apps/web-next/src/lib/admin-auth.ts:20-35`）に倣う。

---

### #2 ページコンポーネントの肥大化

- **ファイル**: 以下7ファイル

  | ファイル | 行数 |
  |---|---|
  | `apps/web-next/src/app/owned-vehicles/page.tsx` | 549行 |
  | `apps/web-next/src/app/admin/tags/page.tsx` | 538行 |
  | `apps/web-next/src/app/owned-vehicles/[id]/edit/page.tsx` | 533行 |
  | `apps/web-next/src/app/products/new/page.tsx` | 531行 |
  | `apps/web-next/src/app/owned-vehicles/new/page.tsx` | 481行 |
  | `apps/web-next/src/app/products/[id]/edit/page.tsx` | 461行 |
  | `apps/web-next/src/app/products/page.tsx` | 442行 |

- **問題**: state変数・API呼び出し・ソート処理・フォームバリデーション・UI描画が1ファイルに混在している。特に `owned-vehicles/page.tsx:114-164` ではクライアントサイドソート（name/productCode/category）が実装されているが、`sortBy`/`sortOrder` はAPIにも渡されており（`:98-99`）、サーバー側でできる処理がクライアントで重複している。`products/page.tsx` ではフィルタ管理・ページネーション・一括タグ編集の3つの独立した機能が混在している。

- **開発速度への影響**: ファイルが大きすぎて目的のロジックを探すのに時間がかかる。副作用（state更新による意図しない再レンダリング等）の原因特定が困難。
- **推奨対応方針**: カスタムフック分離とコンポーネント分割を組み合わせる。
  - データ取得・状態管理ロジック → `useOwnedVehicles()` 等のカスタムフック（`src/hooks/` または各ページ近接配置）に抽出
  - フォームバリデーション → フォームコンポーネントに閉じ込める
  - `owned-vehicles/page.tsx` のクライアントソートは削除しAPIソートに一本化する

---

### #3 APIルートの肥大化・多重責務

- **ファイル**:

  | ファイル | 行数 | メソッド |
  |---|---|---|
  | `apps/web-next/src/app/api/owned-vehicles/route.ts` | 376行 | GET + POST |
  | `apps/web-next/src/app/api/owned-vehicles/import/route.ts` | 296行 | POST |
  | `apps/web-next/src/app/api/owned-vehicles/[id]/route.ts` | 246行 | GET + PUT + DELETE |
  | `apps/web-next/src/app/api/products/route.ts` | 236行 | GET + POST |

- **問題**: 複数HTTPメソッドが1ファイルに集約され、バリデーション・DB処理・レスポンス整形ロジックが全て同じ関数内に記述されている。`api/owned-vehicles/route.ts:335-340` と `api/owned-vehicles/[id]/route.ts:182-189` では `createData as any` / `finalUpdateData as any` という型逃げが発生しており、動的フィールド削除後にPrismaの型と合わなくなる根本原因となっている。

- **開発速度への影響**: GET処理を変更するためにPOST処理のコードを読む必要が生じる。バリデーションとDB操作が混在しているため、「このバリデーションはどのケースに適用されるか」の把握が困難。
- **推奨対応方針**: 既存の `apps/web-next/src/lib/owned-vehicle-utils.ts` パターンに倣い、DB操作ロジックを `src/lib/` 配下のユーティリティ関数に抽出する。APIルートは引数パース・権限確認・ユーティリティ呼び出し・レスポンス返却のみに留める。新規サービス層は不要（既存パターンの延長）。

---

### #4 型定義の重複・分散

- **ファイル**:
  - `interface Product { ... }`: `apps/web-next/src/app/products/page.tsx:26`, `apps/web-next/src/app/products/[id]/page.tsx`, `apps/web-next/src/components/ProductCard.tsx`, `apps/web-next/src/components/ProductListItem.tsx`, `apps/web-next/src/app/admin/products/page.tsx` 他3ファイル（計8ファイル）
  - `interface OwnedVehicle { ... }`: `apps/web-next/src/app/owned-vehicles/page.tsx:16`, `apps/web-next/src/components/OwnedVehicleCard.tsx`, `apps/web-next/src/components/OwnedVehicleListItem.tsx`, `apps/web-next/src/app/owned-vehicles/[id]/page.tsx` 他3ファイル（計7ファイル）

- **問題**: 各ファイルが独自に型を定義しており、定義内容が微妙に異なる（一部フィールドが省略されている等）。`specification.md` Section 9.4（ディレクトリ構造）では `src/types/` に型定義を置く設計意図が示されているが、現状は `apps/web-next/src/types/` に `next-auth.d.ts` しか存在せず、設計意図と大きく乖離している。

- **開発速度への影響**: DBスキーマ変更時（例: 新フィールド追加）に15ファイル以上を修正する必要がある。修正漏れにより型エラーが実行時まで検出されない。
- **推奨対応方針**: `apps/web-next/src/types/` に `product.ts` / `owned-vehicle.ts` を追加し、正規の型定義を1箇所に集約する。各ファイルの独自定義を削除してimportに置き換える。PrismaのGenerated型（`Prisma.ProductGetPayload<...>`）との整合性も確認する。

---

### #5 csv-parser.ts の肥大化・多重責務

- **ファイル**: `apps/web-next/src/lib/csv-parser.ts`（361行）
- **問題**: 以下の責務が1ファイルに混在している。
  - CSV文字列の汎用パース処理（`parseCSV` 関数）
  - 製品CSV固有の型変換ロジック（`parseProductCSV` 関数）
  - 保有車両CSV固有の型変換ロジック（`parseOwnedVehicleCSV` 関数）
  - バリデーションロジック（各パース関数内）
  - HTMLタグ変換処理（`convertHtmlBreaks` 関数）

- **開発速度への影響**: 製品CSVのパースを変更する際に保有車両CSVのコードを読む必要がある。新しいCSVフォーマットを追加するたびにファイルが肥大化する。
- **推奨対応方針**: 責務ごとにファイル分割する。
  - `src/lib/csv-utils.ts`: 汎用パース処理（`parseCSV`、`convertHtmlBreaks`）
  - `src/lib/csv-parser-product.ts`: 製品CSV固有の変換・バリデーション
  - `src/lib/csv-parser-owned-vehicle.ts`: 保有車両CSV固有の変換・バリデーション

---

### #6 any型・型アサーションの使用

- **ファイル**:

  | ファイル:行 | 内容 | 根本原因 |
  |---|---|---|
  | `apps/web-next/src/lib/owned-vehicle-utils.ts:79` | `supabase: any` | Supabaseクライアントの型定義が未整備 |
  | `apps/web-next/src/app/api/owned-vehicles/route.ts:340` | `createData as any` | delete後の動的オブジェクト型がPrismaと不一致 |
  | `apps/web-next/src/app/api/owned-vehicles/[id]/route.ts:53` | `any[]` | Prismaクエリ結果型を変数宣言後に代入 |
  | `apps/web-next/src/app/api/owned-vehicles/[id]/route.ts:189` | `finalUpdateData as any` | 同上（同一パターンの重複） |

- **問題**: `as any` による型逃げは型システムを無効化し、リファクタリング時の型安全性を損なう。`:340` と `:189` は同一パターンであり、根本原因（Prismaの動的フィールド削除後の型不一致）を解消すれば両方同時に修正できる。
- **開発速度への影響**: 型エラーが実行時まで検出されない。Prismaスキーマ変更時に型の恩恵を受けられない。
- **推奨対応方針**: Prismaの `Prisma.OwnedVehicleCreateInput` / `Prisma.OwnedVehicleUpdateInput` を正しく使用し、動的フィールド削除を `satisfies` や型ガードで安全に扱う。Supabaseクライアントは `SupabaseClient` 型（`@supabase/supabase-js`）をインポートして使用する。

---

### #7 テストの欠落

- **ファイル**: `apps/web-next/src/lib/` 全体（テストファイルなし）
- **問題**: テストファイルが1件も存在しない。特にリスクの高い箇所：
  - `apps/web-next/src/lib/csv-parser.ts`: 複数のパースパターン・エラーケース・文字コード変換を持つが、動作保証がない
  - `apps/web-next/src/lib/admin-auth.ts`: 認証判定ロジックが全管理機能に影響するが、テストがない
  - `apps/web-next/src/lib/owned-vehicle-utils.ts`: セット自動登録ロジックが複数のAPIルートから呼ばれるが、テストがない

- **開発速度への影響**: 共有ユーティリティを変更した際のリグレッションを手動確認に頼るしかない。特に `csv-parser.ts` は保有車両インポートの中核であり、破壊的変更が発覚しにくい。
- **推奨対応方針**: Jestを使用し（`CLAUDE.md`「テスト戦略」参照）、以下の優先順で追加する。
  1. `apps/web-next/src/lib/admin-auth.test.ts`: `isAdminUser()` の境界値テスト（email一致・不一致・未設定）
  2. `apps/web-next/src/lib/csv-parser.test.ts`: 正常系・異常系・エッジケース（空行・Shift-JIS文字列・HTMLタグ）
  3. `apps/web-next/src/lib/owned-vehicle-utils.test.ts`: セット自動登録ロジックのモックテスト

---

## 補足: specification.md との乖離

`apps/web-next/docs/specification.md` との乖離として以下を特記する。

1. **型定義の設計意図との乖離（課題#4に関連）**: `specification.md` Section 9.4（ディレクトリ構造）では `src/types/` に集中管理する設計意図が示されているが、現状は各コンポーネント・ページが型を独自定義している。

2. **`products` テーブルの `tags` カラム記述の陳腐化**: `specification.md:57` 付近では `products` テーブルに `tags TEXT[]` カラムがある記述が残っているが、実際はPhase 2.15でPrismaスキーマを `product_tags` 中間テーブルに移行済み。`specification.md` の該当箇所の更新が必要。
