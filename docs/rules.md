# リポジトリルール

このリポジトリのルールを記述する

## ディレクトリ構成
```
repo-root/
├─ apps/                    # デプロイ対象（＝実行可能物）
│  ├─ web-next/             # Next.js(フロント)
│  ├─ api-node/             # Node/Nest/Fastify 等のAPI
│  ├─ api-java/             # Spring Boot API（Gradle/Maven）
│  └─ worker-go/            # バックグラウンド処理など
├─ packages/                # 複数アプリで共有するライブラリ群
│  ├─ ui/                   # UIコンポーネント（TS/React）
│  ├─ shared-ts/            # 共通ユーティリティ/型
│  ├─ eslint-config/        # Lint共有設定
│  └─ tsconfig/             # TS設定プリセット
├─ schemas/                 # API契約の“源泉”
│  ├─ openapi/              # openapi.yaml, 分割スキーマ, ジェネレータ設定
│  └─ proto/                # *.proto（gRPC使うなら）
├─ infra/
│  ├─ docker/               # 各アプリの Dockerfile & compose.yml
│  ├─ k8s/                  # マニフェスト or Helm
│  └─ terraform/            # IaC（必要なら）
├─ tools/                   # スクリプト/CLIs（コード生成やチェック等）
├─ .editorconfig
├─ .gitignore
├─ package.json             # JS/TS 側のルート設定（pnpmワークスペース）
├─ pnpm-workspace.yaml
└─ turbo.json               # タスクパイプライン（Turbo採用例）
```