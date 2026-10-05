# 開発ガイド

日本語でやりとりする。Nゲージ鉄道模型の製品・保有車両管理アプリ。

## 作業時の参照先

- [現行仕様](apps/web-next/docs/specification.md): 実装、API、認可、既知の制限。
- [開発状況](docs/development-log.md): 進捗、残課題、作業記録。
- [リファクタリング計画](docs/refactoring-plan.md): R0〜R5のTODO・完了条件。
- [デプロイ手順](apps/web-next/docs/deployment-setup.md): 環境変数、配置、復旧。
- [DBスキーマ管理](docs/database-schema-management.md)、[リポジトリルール](docs/rules.md)。

技術構成・API・環境変数・進捗をこの文書へ重複記載しない。
実装が正で、将来計画を現行仕様として扱わない。

## 開発方針

- TypeScriptを使用し、既存の命名・構成に合わせる。
- 共通型・定数・部品を利用し、未移行のページは変更対象に応じて整理する。
- DB変更はapps/web-next/prisma/schema.prismaから行う。
- ファイル移動はgit mvを使用する。
- ドキュメントは簡潔に保ち、作業完了時に関連仕様、TODO、検証結果、未決事項、次の着手箇所を更新する。
- コミットはfeat / fix / docs / style / refactor / test / choreを目安にする。

## コマンドと確認

apps/web-nextで、1実行ファイル・1操作ずつ実行する。パイプ・論理演算子・コマンド区切り・サブシェルを使わない。

~~~bash
npm run dev
npm run type-check
npm run lint
npm run test -- --run
npm run build
~~~

実装変更は対象に応じた確認を行い、デプロイ前に型・lint・テスト・ビルドの結果を記録する。
文書だけの変更ではリンク・内容・差分を確認する。
実際のデプロイ設定・DB適用・復旧方法はデプロイ手順へ追記する。

テスト用アカウントや外部環境の設定は文書の古い記録から推測せず、対象環境で確認する。
