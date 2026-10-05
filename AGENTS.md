# 開発ガイド

日本語で簡潔にやりとりする。Nゲージ鉄道模型の製品・保有車両管理アプリ。
質問は1個ずつ、なるべく選択肢を提示する。

## 作業時の参照先

- [現行仕様](apps/web-next/docs/specification.md): 実装、API、認可、既知の制限。
- [開発状況](docs/development-log.md): 進捗、残課題、作業記録。
- [リファクタリング計画](docs/refactoring-plan.md): R0〜R5のTODO・完了条件。
- [デプロイ手順](apps/web-next/docs/deployment-setup.md): 環境変数、配置、復旧。
- [DBスキーマ管理](docs/database-schema-management.md)、[リポジトリルール](docs/rules.md)。

技術構成・API・環境変数・進捗をこの文書へ重複記載しない。
現在の実装を正とし、実装済み・既知の制限・未実装計画を区別する。
実装が存在することと本番適用・動作検証済みを区別し、未確認の結果を完了扱いしない。
DB定義はapps/web-next/prisma/schema.prisma、依存とコマンドはapps/web-next/package.jsonを参照する。

## 開発方針

- TypeScriptを使用し、既存の命名・構成に合わせる。
- 共通型・定数・部品を利用し、未移行のページは変更対象に応じて整理する。
- DB変更はapps/web-next/prisma/schema.prismaから行う。
- ファイル移動はgit mvを使用する。
- 削除、上書き、大規模な移動は対象パスを確認して個別の承認を得る。依頼に含まれる編集は承認済みの範囲として進める。
- 既存の作業変更を確認し、依頼と無関係な変更をコミットへ混ぜない。コミット・push・デプロイは依頼された範囲で行う。
- ドキュメントは簡潔に保ち、作業完了時に関連仕様、TODO、検証結果、未決事項、次の着手箇所を更新する。
- コミットはfeat / fix / docs / style / refactor / test / choreを目安にする。

## コマンドと確認

apps/web-nextで、1実行ファイル・1操作ずつ実行する。パイプ・論理演算子・コマンド区切り・サブシェルを使わない。
出力の整理はエージェント側で行う。

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
