# 鉄道模型車両管理アプリ

Next.js製の製品・保有車両管理アプリ。

## 開発開始

このディレクトリで環境変数を設定し、次を1操作ずつ実行する。

~~~bash
npm install
npm run dev
~~~

http://localhost:3000 を開く。環境変数とNode.jsの条件は [環境設定手順](docs/deployment-setup.md) を参照。

## 確認コマンド

~~~bash
npm run type-check
npm run lint
npm run test -- --run
npm run build
~~~

## ドキュメント

- [現行仕様](docs/specification.md)
- [開発状況・残課題](../../docs/development-log.md)
- [デプロイ・環境設定](docs/deployment-setup.md)
- [DBスキーマ管理](../../docs/database-schema-management.md)
- [リファクタリング計画](../../docs/refactoring-plan.md)
