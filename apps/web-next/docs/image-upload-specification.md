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

ログイン必須。multipart/form-dataでfile、entityType、entityIdを送る。保有車両は所有者、製品は作成者または管理者に限定する。`entityType` は `owned-vehicle` / `product`、IDは正の整数。

- 許可形式: JPEG / PNG / WebP / GIF。
- サイズ上限: 1ファイル5MB。
- Blob用パス: entityTypeにsを付けた種別 / entityId / タイムスタンプ付きファイル名。ランダム接尾辞あり。
- ローカル保存も `/uploads/<種別>/<ID>/...` の階層を使用する。
- 応答: url、key、size。
- DBのimageUrls更新は呼出元の保存処理で行う。保有車両の新規画面では作成後の画像追加・削除時にPATCHで即時保存する。

### DELETE /api/images/:key

ログイン必須。現行UIは画像URL全体をURLエンコードし、`entityType` と `entityId` をクエリで送る。対象の所有者・作成者を確認し、URLが対象の画像であることを確かめてから削除する。旧クライアント向けにDB登録済みURLからの対象特定も行う。
ローカル保存は `/uploads/<種別>/<ID>/...` を使い、URLから削除キーを解決する。既存の平坦な保存URLはDB登録済みの場合に限り対象を確認できる。

## 画面

- ImageUploader: ファイル選択、ドラッグ&ドロップ、複数画像、送信中表示、プレビュー・削除。
- ImageGallery: 製品・保有車両の詳細表示。
- 製品・保有車両それぞれの新規登録、編集、詳細の6画面へ組込済み。
- 保有車両の新規画面は車両作成後に画像をアップロードし、変更ごとにDBへ保存する。
- 製品の新規画面では製品作成後に詳細画面へ移動する。

## 制限・残課題

途中失敗の当面の運用方針: 保存失敗は画面に表示し、アップロード後のDB保存失敗では再アップロード前に再読込して登録状態を確認する。削除後のDB保存失敗では画像URLが残る可能性があるため、再読込後に再度削除して保存する。未紐付け画像は自動削除せず、運用者がストレージ一覧と製品・保有車両の全imageUrlsを照合し、処理中でないことを確認して対象を個別承認後に削除する。自動補償・定期整理は別対応とする。

- ストレージとDB更新は別処理で、途中失敗時の自動補償や未紐付け画像の定期整理はない。
- ファイル数上限はUI側で制御し、APIはDBの画像数を検証しない。

残課題の進捗は [開発状況](../../docs/development-log.md) と [リファクタリング計画](../../docs/refactoring-plan.md) で管理する。
