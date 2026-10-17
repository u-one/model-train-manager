# 鉄道模型車両管理アプリ 現行仕様

基準日: 2026-10-06。リポジトリ内の実装を基準とする。外部環境の設定・本番DBへの適用は未確認。

## 参照先

- [開発状況・残課題](../../docs/development-log.md)
- [デプロイ・環境設定](deployment-setup.md)
- [DBスキーマ](../prisma/schema.prisma) / [変更手順](database-schema-management.md)
- [タグ仕様](../../docs/tag-system-specification.md)、[画像仕様](image-upload-specification.md)
- [リファクタリング計画](../../docs/refactoring-plan.md)、[車両TODO・整備記録計画](../../docs/phase-3.1-vehicle-tasks-maintenance.md)

## 概要・技術構成

Nゲージ鉄道模型の製品情報を共有し、ユーザーごとの保有車両を管理するWebアプリ。

| 項目 | 現行実装 |
|---|---|
| アプリ | Next.js 15 / React 19 / TypeScript / Tailwind CSS 4 |
| API | Next.js App RouterのRoute Handlers |
| DB | PostgreSQL（Supabase）、Prisma 6 |
| DBアクセス | Prisma。関連する書込みは業務関数・トランザクションへ集約 |
| 認証 | NextAuth.js 4、Google OAuthとメール・パスワード、JWTセッション |
| 画像 | Vercel Blob、開発用ローカル保存 |
| 配置先 | Vercelを想定。実際の環境設定はデプロイ時に確認 |
| テスト | Vitest / React Testing Library / Playwrightの設定あり |

正確な依存バージョン・実行コマンドは [package.json](../package.json) を参照。
GitHub ActionsのcoverageワークフローがPull Requestでテストを実行する。Node.js 22を使用する。

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
| MaintenanceRecord | 整備記録。表示と詳細ページからの追加（POST /api/owned-vehicles/:id/maintenance）を実装。編集・削除は未実装 |
| Tag / ProductTag | タグ、製品との多対多関係 |

- ProductとOwnedVehicleは画像URL配列を持つ。
- Productのセット構成はProductSetComponentのIDによる多対多。構成順・数量は未モデル化し、同一車種の内訳は別の構成製品として登録する。
- OwnedVehicleはparentSetOwnedVehicleIdで保有セットと構成車両を結ぶ。親削除時は構成車両を残し、親IDをnullにする。
- 管理IDは空文字を許容し、ユーザー＋管理IDの一意制約はない。
- 製品のメーカー＋品番にも一意制約はない。
- Productの旧tags文字列配列は残っている。カテゴリ付きタグはTag / ProductTagを使用。
- isIndependentカラムはない。IndependentVehicleの関連で判定する。
- 旧parentCode・備考から一意に特定できない既存構成はID関係へ自動移行しない。画面は移行中の互換読取を行う。
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
| PATCH | /api/owned-vehicles/:id | 製品紐付け、画像URL更新 |
| GET / POST | /api/products/:id/set-components | 構成一覧・構成製品の作成 |
| GET | /api/products/:id/parent-sets | 所属セット |
| POST | /api/products/import | 製品CSV取込 |
| GET / POST | /api/owned-vehicles | 保有一覧・作成 |
| GET / PUT / DELETE | /api/owned-vehicles/:id | 保有詳細・更新・削除 |
| POST | /api/owned-vehicles/match-product | メーカー・品番の照合 |
| POST | /api/owned-vehicles/import | 保有CSV取込 |
| DELETE | /api/owned-vehicles/delete-all | 自分の保有車両を全削除 |
| GET | /api/stats/user | ログインユーザーの統計 |
| GET | /api/stats/public | 公開製品統計・最近の製品・人気タグ |
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

整備記録の編集・削除、車両TODO、CSV出力、共有、自動タグ付け、保有車両一括更新のAPIは未実装。

## 認証・認可の現状

- 製品・タグの閲覧は公開。製品追加・編集の画面はログイン状態を確認する。
- 製品作成・更新APIはログイン必須。製品削除APIは管理者限定。構成製品作成APIはログイン必須。
- 通常の保有車両APIはログイン必須で、自分のデータを対象とする。管理者は一覧のincludeUserAndProduct=trueで全ユーザー分を取得できる。
- 製品タグの更新・CSV取込・画像APIはログイン必須。画像は保有車両の所有者、製品の作成者または管理者だけが追加・削除できる（実装済み、動作未検証）。
- タグマスタの変更と管理APIは管理者限定。管理者はADMIN_EMAILSのカンマ区切り一覧で判定し、未設定時は管理者なし。

入力はZodスキーマで検証し、Prisma書込項目は明示的に組み立てる。共通エラーは400（不正入力）、401（未認証）、403（権限不足）、404（対象なし）、409（重複・曖昧一致）、500（予期しない失敗）に分ける。APIの日付はISO形式のJSON文字列として返す。

## 検索・CSV・関連更新

- 製品・保有一覧は検索条件をANDで組み合わせ、条件に一致する全件数を返す。タグANDは指定タグすべてを持つ意味。
- カテゴリ別「タグなし」はそのカテゴリのタグを持たない製品に加え、製品未紐付けの保有車両も含む。
- 保有車両の名称・品番・分類ソートは製品・独立車両の表示値でサーバー全件を並べてからページ分割する。大規模データでは全一致行をメモリに読むため、DB側の正規化列や検索基盤が必要になる可能性がある。
- 保有CSVは50件単位、製品CSVは製品単位でトランザクションを実行し、製品と実車情報、保有セットと自動登録車両の関連書込みをまとめる。ファイル内の製品重複・管理ID重複は報告し、曖昧な製品照合は自動紐付けしない。
- 製品登録・更新、タグ更新、独立車両の製品紐付け、選択削除・全削除はサーバー業務関数で処理する。

セット関係の既存データ移行は[デプロイ手順](deployment-setup.md)に記載。ドライラン報告を確認後、対象DBで明示的に適用する。DB適用と本番動作は未確認。

修正の完了条件はリファクタリング計画で管理する。
