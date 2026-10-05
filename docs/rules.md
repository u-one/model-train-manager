# リポジトリルール

## 現行構成

| 配置 | 内容 |
|---|---|
| apps/web-next | Next.jsアプリ、API、Prisma、アプリ固有文書 |
| docs | 進捗、DB運用、機能仕様・計画 |
| .github/workflows | Claude連携・レビュー |
| local | ローカル資料（Git管理外） |

ルートにTurbo設定とpnpm-workspace.yamlがある。現在の実行アプリはweb-nextのみ。
api-node、api-java、worker-go、共有packages、OpenAPI、Terraform等は現行構成に含めない。

## 文書・変更

- 現行仕様はapps/web-next/docs/specification.md、進捗はdocs/development-log.mdで管理する。
- DB定義はPrismaスキーマ、依存とコマンドはpackage.jsonを参照し、文書へ複製しない。
- 将来計画は「未実装」と明記し、API・モデル・画面が存在するように書かない。
- ドキュメントは必要最小限に保ち、詳細TODOは各計画の管理先へ集約する。
- ファイル移動はgit mvを使用する。
- デプロイに必要な設定・適用・復旧手順はapps/web-next/docs/deployment-setup.mdに残す。
