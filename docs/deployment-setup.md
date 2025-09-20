# デプロイ・環境設定手順

## 概要
鉄道模型車両管理アプリのVercelデプロイとGoogle OAuth設定手順

## 前提条件
- Node.js 18以上
- npm/pnpm
- Vercel CLI（`npm i -g vercel`）
- Googleアカウント

## 1. Vercelデプロイ

### 1.1 Vercel CLIを使用したデプロイ
```bash
# apps/web-nextディレクトリに移動
cd apps/web-next

# Vercelにデプロイ
vercel

# 初回デプロイ時の設定
# - Set up and deploy "web-next"? Y
# - Which scope do you want to deploy to? （あなたのアカウント）
# - Link to existing project? N
# - What's your project's name? model-train-manager
# - In which directory is your code located? ./
```

### 1.2 デプロイ確認
デプロイ完了後、以下のようなURLが表示されます：
- **Production**: `https://model-train-manager.vercel.app`
- **Preview**: `https://model-train-manager-xxxxx.vercel.app`

## 2. Google Cloud Console設定

### 2.1 新しいプロジェクト作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 「プロジェクトを選択」→「新しいプロジェクト」
3. プロジェクト名: `model-train-manager`（または任意）
4. 「作成」をクリック

### 2.2 OAuth同意画面の設定
1. 左メニュー「APIs & Services」→「OAuth consent screen」
2. **User Type**: `External` を選択
3. 「作成」をクリック
4. アプリ情報を入力：

| 項目 | 値 |
|------|-----|
| アプリ名 | `鉄道模型車両管理` |
| ユーザーサポートメール | あなたのGmailアドレス |
| アプリのロゴ | （スキップ可） |
| アプリドメイン | （スキップ可） |
| 承認済みドメイン | `vercel.app` |
| 開発者の連絡先情報 | あなたのGmailアドレス |

5. 「保存して次へ」
6. スコープ画面：そのまま「保存して次へ」
7. テストユーザー画面：そのまま「保存して次へ」
8. 概要画面：「ダッシュボードに戻る」

### 2.3 OAuth認証情報作成
1. 左メニュー「APIs & Services」→「Credentials」
2. 「+ CREATE CREDENTIALS」→「OAuth client ID」
3. 設定値を入力：

| 項目 | 値 |
|------|-----|
| Application type | `Web application` |
| Name | `鉄道模型車両管理 Web Client` |

4. **Authorized redirect URIs**に以下を追加：
   ```
   http://localhost:3000/api/auth/callback/google
   http://localhost:3001/api/auth/callback/google
   https://model-train-manager.vercel.app/api/auth/callback/google
   ```

5. 「作成」をクリック

### 2.4 認証情報の保存
作成完了後、以下の情報をコピーして保存：
- **Client ID**: `xxxxxxxxxxxx.apps.googleusercontent.com`
- **Client Secret**: `xxxxxxxxxxxxxxxx`

## 3. Vercel環境変数設定

### 3.1 必要な環境変数

| 変数名 | 値 | 説明 |
|--------|----|----|
| `NEXTAUTH_URL` | `https://model-train-manager.vercel.app` | 本番環境URL |
| `NEXTAUTH_SECRET` | （下記の方法で生成したランダム値） | NextAuth用シークレット |
| `GOOGLE_CLIENT_ID` | （Google Cloud Consoleで取得） | OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | （Google Cloud Consoleで取得） | OAuth Client Secret |

### 3.2 Vercelダッシュボードでの設定
1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. `model-train-manager` プロジェクトを選択
3. 「Settings」タブ → 「Environment Variables」
4. 「Add New」で各環境変数を追加：
   - Name: 変数名を入力
   - Value: 対応する値を入力
   - Environments: `Production`, `Preview`, `Development` すべてにチェック

### 3.3 Vercel CLIでの設定（代替方法）
```bash
cd apps/web-next

# 各環境変数を個別に設定
vercel env add NEXTAUTH_URL
# 値: https://model-train-manager.vercel.app

vercel env add NEXTAUTH_SECRET
# 値: （下記の方法で生成したランダム値を入力）

vercel env add GOOGLE_CLIENT_ID
# 値: （Google Cloud Consoleで取得したClient ID）

vercel env add GOOGLE_CLIENT_SECRET
# 値: （Google Cloud Consoleで取得したClient Secret）
```

### 3.4 NextAuthシークレット生成方法
```bash
# ランダムな32文字以上のシークレット生成
openssl rand -base64 32

# この出力された値をNEXTAUTH_SECRETとして使用してください
# 例: ABc123XYz456... (実際の値は毎回異なります)
```

**重要**: 生成された値は一意でセキュアなため、ドキュメントには記載せず、直接環境変数として設定してください。

## 4. 再デプロイと動作確認

### 4.1 環境変数更新後の再デプロイ
環境変数を設定後、再デプロイが必要です：

```bash
cd apps/web-next
vercel --prod
```

または、Vercelダッシュボードの「Deployments」タブで「Redeploy」

### 4.2 動作確認
1. `https://model-train-manager.vercel.app` にアクセス
2. 「ログインして始める」をクリック
3. 「Googleアカウントでログイン」をクリック
4. Google認証画面が表示されることを確認
5. 認証後、ダッシュボードにリダイレクトされることを確認

## 5. トラブルシューティング

### 5.1 よくあるエラー

#### `redirect_uri_mismatch`
- Google Cloud ConsoleのAuthorized redirect URIsにVercelのURLが正しく設定されているか確認
- URLの末尾スラッシュに注意（`/api/auth/callback/google`）

#### `invalid_client`
- GOOGLE_CLIENT_IDとGOOGLE_CLIENT_SECRETが正しく設定されているか確認
- 環境変数名に誤字がないか確認

#### `NEXTAUTH_URL`エラー
- 環境変数にVercelの正確なURLが設定されているか確認
- URLの末尾にスラッシュがないことを確認

### 5.2 デバッグ方法
1. Vercelの「Functions」タブでログを確認
2. ブラウザの開発者ツールでNetworkタブを確認
3. Google Cloud Consoleの「APIs & Services」→「Credentials」で設定を再確認

## 6. セキュリティ考慮事項

### 6.1 本番環境での注意点
- NEXTAUTH_SECRETは十分に複雑なランダム文字列を使用
- Google Cloud Console OAuth同意画面を「公開」ステータスに変更する場合は、Googleの審査が必要
- テスト段階では「テスト」ステータスのまま、限定されたユーザーでのテストを推奨

### 6.2 環境変数管理
- 環境変数には秘密情報が含まれるため、GitHubなどに誤ってコミットしないよう注意
- `.env.local`ファイルは`.gitignore`に含まれていることを確認

## 7. 次の段階

認証システムが正常に動作確認できたら、次の段階に進みます：
1. データベース環境構築（Supabase）
2. Prismaスキーマ実装
3. 製品情報・保有車両機能の実装