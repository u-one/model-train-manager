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

## 7. データベース環境構築（Supabase）

### 7.1 Vercelコンソールでのデータベース作成

1. **Vercelダッシュボード**にアクセス
2. `model-train-manager` プロジェクトを選択
3. 「Storage」タブ → 「Create Database」
4. **Supabase**を選択
5. 以下の設定で作成：
   - Database Name: `model-train-manager-db`
   - Region: `ap-northeast-1` (東京)
6. 「Create & Continue」をクリック

### 7.2 環境変数の自動設定確認

データベース作成後、Vercelが以下の環境変数を自動設定します：

| Vercel環境変数 | Prisma用途 | 説明 |
|----------------|------------|------|
| `POSTGRES_PRISMA_URL` | `DATABASE_URL` | 接続プール用URL（通常操作） |
| `POSTGRES_URL_NON_POOLING` | `DIRECT_URL` | 直接接続URL（マイグレーション用） |
| `POSTGRES_USER` | - | データベースユーザー名 |
| `POSTGRES_HOST` | - | データベースホスト |
| `POSTGRES_PASSWORD` | - | データベースパスワード |
| `POSTGRES_DATABASE` | - | データベース名 |

### 7.3 ローカル環境設定

`.env.local`ファイルにデータベース設定を追加：

```env
# Database (Vercelから取得した値を設定)
DATABASE_URL="postgres://postgres.xxx:xxx@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"
DIRECT_URL="postgres://postgres.xxx:xxx@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Supabase (Vercelから取得した値を設定)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**注意**: 実際の値はVercelのEnvironment Variablesページから取得してください。

### 7.4 Prismaセットアップ

#### 7.4.1 Prismaクライアント設定

`apps/web-next/src/lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

#### 7.4.2 データベーススキーマ

`apps/web-next/prisma/schema.prisma`でデータベーススキーマを定義済み：
- **User**: ユーザー情報
- **Product**: 製品マスタ
- **RealVehicle**: 実車情報
- **OwnedVehicle**: 保有車両
- **IndependentVehicle**: 独立記録車両
- **MaintenanceRecord**: 整備記録

#### 7.4.3 データベースマイグレーション

```bash
cd apps/web-next

# Prismaクライアント生成
npx prisma generate

# データベースにスキーマを適用
npx prisma db push
```

**重要**: `.env`ファイルも作成が必要（Prisma CLIは`.env.local`より`.env`を優先するため）:
```bash
# .env.localの内容を.envにもコピー
cp .env.local .env
```

### 7.5 データベース接続テスト

#### 7.5.1 テストAPI作成

`apps/web-next/src/app/api/test-db/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await prisma.$connect()

    const userCount = await prisma.user.count()
    const productCount = await prisma.product.count()

    return NextResponse.json({
      success: true,
      message: 'データベース接続成功',
      data: {
        userCount,
        productCount,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json({
      success: false,
      message: 'データベース接続エラー',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
```

#### 7.5.2 接続確認

```bash
# 開発サーバー起動
npm run dev

# テストエンドポイントにアクセス
curl http://localhost:3000/api/test-db
```

期待されるレスポンス：
```json
{
  "success": true,
  "message": "データベース接続成功",
  "data": {
    "userCount": 0,
    "productCount": 0,
    "timestamp": "2025-09-20T09:55:00.616Z"
  }
}
```

### 7.6 トラブルシューティング

#### 7.6.1 よくあるエラー

**`Environment variable not found: DIRECT_URL`**
- `.env`ファイルに`DIRECT_URL`が設定されているか確認
- `.env.local`の内容を`.env`にもコピーする

**`Can't reach database server`**
- `DATABASE_URL`と`DIRECT_URL`の値が正しいか確認
- SupabaseプロジェクトがアクティブかSupabaseダッシュボードで確認

**`Invalid connection string`**
- 接続文字列のフォーマットが正しいか確認
- 特殊文字がエスケープされているか確認

#### 7.6.2 デバッグ方法

```bash
# Prisma接続確認
npx prisma db pull

# Supabaseダッシュボードで確認
# https://supabase.com/dashboard/projects
```
