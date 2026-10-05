# タグシステム 現行仕様

基準日: 2026-10-05。コードの実装状況を記載。進捗・今後の機能は [開発状況](development-log.md) で管理する。

## データ・カテゴリ

[Prismaスキーマ](../apps/web-next/prisma/schema.prisma) のTagとProductTagを使用する。
タグ名は一意、製品とタグの組合せは複合主キー。製品またはタグの削除時は関連も削除する。
Productの旧tags文字列配列は残っているが、カテゴリ付きタグの関係はProductTagで管理する。

[src/constants/tags.ts](../apps/web-next/src/constants/tags.ts) に定義するカテゴリ:

| 値 | 表示 |
|---|---|
| vehicle_type | 車種 |
| company | 運営会社 |
| product_feature | 商品特徴 |
| vehicle_spec | 車両仕様 |
| era | 時代・塗装 |

## 実装済み

- タグ一覧・詳細の公開API、管理者限定の作成・編集・削除。
- 製品のタグ取得、ログインユーザーによる追加・置換・解除。
- 製品一覧・詳細・フォームの表示と選択、管理画面のカテゴリ・使用数表示。
- 管理統計のタグ数・タグ付き製品数。
- 一括タグ追加・上書き・削除（[一括操作仕様](phase-2.17-bulk-operations.md)）。
- カテゴリ別フィルタ、AND / ORの選択、製品の除外タグ・カテゴリ別「なし」。

APIのパス・メソッド一覧は [現行仕様](../apps/web-next/docs/specification.md) を参照。

## 検索の現状

| パラメータ | 製品API | 保有車両API |
|---|---|---|
| tags | タグIDをカンマ区切り | 紐付いた製品のタグIDをカンマ区切り |
| tag_operator | ORが既定、ANDは取得後に絞込 | ORが既定、ANDはproductTags.everyを使用 |
| exclude_tags | 対応 | 未対応 |
| no_tags_categories | 指定カテゴリのタグがない製品 | 未対応。画面の選択はAPI未接続 |

製品ANDの件数は取得ページ内で計算される。保有ANDは「指定タグをすべて持つ」と同じ意味にならない。
検索・件数の統一は [リファクタリング計画R4](refactoring-plan.md) で扱う。

## 未実装の計画

CSV取込時のタグ自動付与、条件ベース自動タグ付け、タグ推奨・統合。
タグの初期データ用スクリプトはprisma/seed-tags.tsにあるが、対象DBへの投入状態は未確認。
