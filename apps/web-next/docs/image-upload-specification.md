# 画像アップロード 現行仕様

基準日: 2026-10-05。API・ストレージ・画面部品は実装済み。外部ストアの設定と実行時動作は未確認。

## 保存方式

src/lib/storage/のStorageProviderを通して保存する。

| STORAGE_PROVIDER | 動作 |
|---|---|
| local | public/uploadsへ保存、/uploadsで配信 |
| vercel-blob | Vercel Blobへpublicで保存 |
| auto（既定） | BLOB_READ_WRITE_TOKENがあればBlob、なければlocal |

AWS S3 / CloudFrontプロバイダーは未実装。設定は [デプロイ手順](deployment-setup.md) に記載する。

## API

### POST /api/images/upload

ログイン必須。multipart/form-dataでfile、entityType、entityIdを送る。

- 許可形式: JPEG / PNG / WebP / GIF。
- サイズ上限: 1ファイル5MB。
- Blob用パス: entityTypeにsを付けた種別 / entityId / タイムスタンプ付きファイル名。ランダム接尾辞あり。
- ローカル保存ではディレクトリ部分を除いたファイル名を使用する。
- 応答: url、key、size。
- DBのimageUrls更新は呼出元の製品・保有車両保存処理で行う。

### DELETE /api/images/:key

ログイン必須。デコードしたkeyをストレージのdeleteへ渡す。
現行UIは画像URL全体をURLエンコードして送る。ストレージ削除とDBのURL配列更新は別操作。

## 画面

- ImageUploader: ファイル選択、ドラッグ&ドロップ、複数画像、送信中表示、プレビュー・削除。
- ImageGallery: 製品・保有車両の詳細表示。
- 製品・保有車両それぞれの新規登録、編集、詳細の6画面へ組込済み。
- 新規登録画面では保存前にアップロードするため、実データIDが確定する前の画像が存在する。

## 制限・残課題

- APIは所有者・作成者を確認していない。entityType / entityIdと対象データの存在・権限の検証も未実装。
- ローカルのdeleteはファイル名を想定するが、UIは/uploadsの画像URLを送るため、削除キーの扱いが一致していない。
- ストレージとDB更新の一体性、保存中断時の未紐付け画像の整理は保証していない。
- ファイル数上限はUI側で制御し、APIはDBの画像数を検証しない。

残課題の進捗は [開発状況](../../../docs/development-log.md) と [リファクタリング計画](../../../docs/refactoring-plan.md) で管理する。
