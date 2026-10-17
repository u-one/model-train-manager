# DBスキーマ管理

スキーマの正は [schema.prisma](../prisma/schema.prisma)。
現行運用はPrismaのdb push方式で、マイグレーション履歴は未導入。

## 変更手順

apps/web-nextで、対象環境のDATABASE_URL / DIRECT_URLとバックアップを確認する。
スキーマを編集し、次を1操作ずつ実行する。

~~~bash
npx prisma db push
npx prisma generate
npm run type-check
npm run build
~~~

db pushは接続先DBを変更する。データ移行が必要な場合は、事前に手順・ドライラン・件数照合・復旧方法を用意する。
本番データを失う警告が出た場合は、原因と移行方法を確認してから進める。

## 環境設定・デプロイ

- DATABASE_URLはアプリの通常接続、DIRECT_URLはスキーマ操作用接続。
- Next.jsのローカル設定は.env.local、Prisma CLIの接続値は.envまたは実行環境の変数へ設定する。
- postinstallとbuildはprisma generateを実行する。DBスキーマは自動更新しない。
- DBアクセスはPrismaへ統一する。Supabase用の環境変数は現行APIでは使用しない。
- 実際の適用コマンド・対象環境・変数変更・復旧手順は [デプロイ手順](deployment-setup.md) と [開発記録](../../docs/development-log.md) に残す。

## セット関係のデータ移行

ProductSetComponentとOwnedVehicle.parentSetOwnedVehicleIdは追加スキーマとして適用する。既存関係の判定は [デプロイ手順](deployment-setup.md) のドライラン付きスクリプトに従う。候補と未解決一覧を確認してから`--apply`を実行し、完了後に再度ドライランする。未解決の関係を推測で追加しない。

## DBとの差分確認

db pullはスキーマファイルを書き換えるため、単なる接続確認として実行しない。
DB側の変更を取り込む必要がある場合は、既存の編集を保護して差分をレビューし、採用する変更を明示する。

migrateを導入する場合は、既存DBのベースラインと適用・復旧手順を別途定める。現在のdb push運用と混在させない。

## Windowsで生成に失敗する場合

query_engine-windows.dll.nodeのEPERMは開発サーバー等のロックが原因になりうる。
対象プロセスを確認して停止し、prisma generateを再実行する。
