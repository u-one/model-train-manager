# 鉄道模型車両管理アプリ 現行仕様

基準日: 2026-10-05。リポジトリ内の実装を基準とする。外部環境の設定・本番DB・動作確認結果は今回確認していない。

## 参照先

- [開発状況・残課題](../../../docs/development-log.md)
- [デプロイ・環境設定](deployment-setup.md)
- [DBスキーマ](../prisma/schema.prisma) / [変更手順](../../../docs/database-schema-management.md)
- [タグ仕様](../../../docs/tag-system-specification.md)、[画像仕様](image-upload-specification.md)
- [リファクタリング計画](../../../docs/refactoring-plan.md)、[車両TODO・整備記録計画](../../../docs/phase-3.1-vehicle-tasks-maintenance.md)

## 概要・技術構成

Nゲージ鉄道模型の製品情報を共有し、ユーザーごとの保有車両を管理するWebアプリ。

| 項目 | 現行実装 |
|---|---|
| アプリ | Next.js 15 / React 19 / TypeScript / Tailwind CSS 4 |
| API | Next.js App RouterのRoute Handlers |
| DB | PostgreSQL（Supabase）、Prisma 6 |
| DBアクセス | 通常処理はPrisma。製品CSV取込はSupabaseクライアント |
| 認証 | NextAuth.js 4、Google OAuthとメール・パスワード、JWTセッション |
| 画像 | Vercel Blob、開発用ローカル保存 |
| 配置先 | Vercelを想定。実際の環境設定はデプロイ時に確認 |
| テスト | Vitest / React Testing Library / Playwrightの設定あり |

正確な依存バージョン・実行コマンドは [package.json](../package.json) を参照。
GitHub Actionsの現行ワークフローはClaude連携・レビュー用であり、自動テスト用ワークフローはない。

## 実装済みの範囲

- 製品・実車情報の一覧、詳細、登録、編集、削除。
- ユーザーごとの保有車両、購入情報、状態、保管条件、備考・整備メモ。
- 製品未登録の独立車両、メーカー・品番による製品照合。
- セット構成の表示と、保有セット登録時の構成車両自動登録。
- 製品・保有車両のCSV取込、プレビュー、結果表示。
- タグの管理・表示・検索、製品の一括タグ更新。
- 製品・保有車両の画像アップロード、削除、ギャラリー。
- トップページの統計・最近の情報、管理画面の製品・保有車両一括削除、ユーザー・タグ管理。

「実装済み」はコードが存在することを示す。既知の制限は以下に記載する。

## データモデル

テーブル・制約・enumの定義はPrismaスキーマで管理し、SQL定義を文書に複製しない。

| モデル | 用途 |
|---|---|
| User | ユーザー、パスワードハッシュ |
| Product / RealVehicle | 共有製品、実車情報 |
| OwnedVehicle | ユーザーの保有車両 |
| IndependentVehicle | 製品未紐付け車両の情報。保有車両と1対1 |
| MaintenanceRecord | 整備記録。モデル・既存記録の表示のみ実装 |
| Tag / ProductTag | タグ、製品との多対多関係 |

- ProductとOwnedVehicleは画像URL配列を持つ。
- 管理IDは空文字を許容し、ユーザー＋管理IDの一意制約はない。
- 製品のメーカー＋品番にも一意制約はない。
- Productの旧tags文字列配列は残っている。カテゴリ付きタグはTag / ProductTagを使用。
- isIndependentカラムはない。IndependentVehicleの関連で判定する。
- 製品構成はparentCodeによる品番参照。保有セットとの関係は文字列による判定が残る。
- 車両状態はNORMAL / NEEDS_REPAIR / BROKEN、保管条件はWITH_CASE / WITHOUT_CASE。DBには日本語値でマッピングする。
- VehicleTaskモデルは未追加。

## 現行API

認証・認可の実際の状態は次節を参照。将来計画のAPIはこの一覧に含めない。

| メソッド | パス | 用途 |
|---|---|---|
| NextAuth標準 | /api/auth/* | ログイン・ログアウト・セッション |
| POST | /api/auth/register | メール・パスワード登録 |
| GET / POST | /api/products | 製品一覧・作成 |
| GET / PUT / DELETE | /api/products/:id | 製品詳細・更新・削除 |
| GET / POST | /api/products/:id/set-components | 構成一覧・構成製品の作成 |
| GET | /api/products/:id/parent-sets | 所属セット |
| POST | /api/products/import | 製品CSV取込 |
| GET / POST | /api/owned-vehicles | 保有一覧・作成 |
| GET / PUT / DELETE | /api/owned-vehicles/:id | 保有詳細・更新・削除 |
| POST | /api/owned-vehicles/match-product | メーカー・品番の照合 |
| POST | /api/owned-vehicles/import | 保有CSV取込 |
| DELETE | /api/owned-vehicles/delete-all | 自分の保有車両を全削除 |
| GET | /api/stats/user | ログインユーザーの統計 |
| GET / POST | /api/tags | タグ一覧・作成 |
| GET / PUT / DELETE | /api/tags/:id | タグ詳細・更新・削除 |
| GET / PUT / POST | /api/products/:id/tags | 製品タグの取得・置換・追加 |
| DELETE | /api/products/:id/tags/:tagId | 製品タグの解除 |
| POST | /api/products/bulk-update-tags | タグの一括追加・上書き・削除 |
| POST | /api/images/upload | multipart画像アップロード |
| DELETE | /api/images/:key | ストレージ内の画像削除 |
| GET | /api/admin/status | 管理者状態 |
| GET | /api/admin/stats、/api/admin/users | 管理統計・ユーザー一覧 |
| DELETE | /api/admin/products、/api/admin/owned-vehicles | 選択削除 |
| DELETE | /api/admin/products/delete-all、/api/admin/owned-vehicles/delete-all | 全削除 |
| GET | /api/test-db | DB接続確認 |

整備記録CRUD、車両TODO、CSV出力、共有、自動タグ付け、保有車両一括更新のAPIは未実装。

## 認証・認可の現状

- 製品・タグの閲覧は公開。製品追加・編集の画面はログイン状態を確認する。
- 製品作成APIは未認証を拒否せず、未認証時は作成者をnullにする。製品更新・削除API、構成製品作成APIにも認証・所有者チェックはない。
- 通常の保有車両APIはログイン必須で、自分のデータを対象とする。管理者は一覧のincludeUserAndProduct=trueで全ユーザー分を取得できる。
- 製品タグの更新・CSV取込・画像APIはログイン必須。画像APIの所有者・作成者チェックは未実装。
- タグマスタの変更と管理APIは管理者限定。管理者はADMIN_EMAILSで判定するが、共通ヘルパーには未設定時の既定メールがあり、タグAPIの判定と異なる。

望ましい権限への統一はリファクタリング計画R0 / R1で扱う。

## 検索・関連更新の制限

- 一覧はデフォルト100件。製品のタグAND検索はページ取得後に絞り込み、そのページ内の件数を総件数として返す。
- 保有車両のタグAND検索はPrismaのeveryを使い、製品一覧と意味が一致しない。カテゴリ別「なし」は画面にあるが保有APIには未接続。
- 保有車両のメーカーとキーワードを同時指定するとOR条件が上書きされる。
- 保有車両の名称・品番・分類ソートは取得後に画面で行うため、ページをまたぐ並び順を保証しない。
- 独立車両からの製品作成画面は紐付けにPATCHを送るが、保有更新APIはPUTのみ。自動紐付けの成功は保証できない。
- 関連更新・通常登録・CSV取込は処理とトランザクション境界が統一されていない。

修正の完了条件はリファクタリング計画で管理する。
