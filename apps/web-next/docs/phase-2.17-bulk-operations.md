# Phase 2.17: 一括操作機能

## 概要

製品と保有車両の情報を効率的に管理するための一括操作機能を実装します。
特に製品タグの一括設定を中心に、複数のデータを同時に更新できる機能を提供します。

## 背景・課題

### 現在の問題
- 製品にタグを付ける際、1件ずつ編集画面を開く必要がある
- 同じメーカーの製品に共通タグを付ける作業が煩雑
- 保有車両の状態を一括で変更できない
- 大量データのメンテナンスに時間がかかる

### ユースケース
1. **新規タグ追加後の既存データ更新**
   - 新しく「KATO」タグを作成後、KATO製品全てに一括付与

2. **分類作業の効率化**
   - 通勤型電車を一覧で選択し、「通勤型電車」タグを一括追加

3. **保有状態の一括変更**
   - 展示会用に準備した車両を一括で「正常」→「展示中」に変更
   - 長期保管の車両をまとめて「要清掃」に設定

## 要件

### Phase 2.17.1: 製品一括タグ付け機能（優先）

#### 1-1. 製品選択機能
- 製品一覧画面にチェックボックス追加
- 全選択/全解除機能
- 選択件数表示
- フィルタ適用後の選択も可能

#### 1-2. 一括タグ編集ダイアログ
- 選択した製品に対してタグを一括編集
- 3つのモード：
  - **追加モード**: 既存タグを保持し、新しいタグを追加
  - **上書きモード**: 既存タグを削除し、選択したタグのみに設定
  - **削除モード**: 選択したタグのみを削除
- カテゴリ別タグ選択UI
- 適用前のプレビュー機能（影響を受ける製品数表示）

#### 1-3. 確認・実行
- 変更内容の確認ダイアログ
- 進行状況表示
- エラーハンドリング

### Phase 2.17.2: 条件ベース一括タグ付け

#### 2-1. 自動タグ付けルール設定
- メーカー名による自動タグ付け
  - 例: brand = "KATO" → 「KATO」タグ
- 品番パターンマッチング
  - 例: productCode starts with "10-" → 「Nゲージ」タグ
- 商品名キーワードマッチング
  - 例: name contains "新幹線" → 「新幹線」タグ

#### 2-2. 管理画面での一括適用
- 管理画面に「自動タグ付け」機能追加
- ルールのプレビュー（影響製品数表示）
- 実行前の確認
- 実行ログ表示

### Phase 2.17.3: 保有車両一括更新機能

#### 3-1. 保有車両選択機能
- 保有車両一覧にチェックボックス追加
- 全選択/全解除
- 選択件数表示

#### 3-2. 一括更新ダイアログ
- 更新可能な項目：
  - 現在の状態（正常/要修理/故障中/軽改造/重改造）
  - 保管状態（ケースあり/ケースなし）
  - 備考（追記モード/上書きモード）
- 変更しない項目は空欄のまま（部分更新）

#### 3-3. 確認・実行
- 変更内容の確認
- 進行状況表示
- エラーハンドリング

## 技術仕様

### データベース設計（変更なし）

既存のテーブル構造を使用。追加のテーブルは不要。

### API設計

#### 2.17.1: 製品一括タグ更新API

**エンドポイント**: `POST /api/products/bulk-update-tags`

**リクエスト**:
```json
{
  "productIds": [1, 2, 3, 4, 5],
  "mode": "add",  // "add" | "replace" | "remove"
  "tagIds": [10, 11, 12]
}
```

**処理フロー**:
1. 権限チェック（ログイン必須）
2. 製品IDの存在確認
3. モード別処理：
   - `add`: 既存タグに追加
   - `replace`: 既存タグ削除→新規タグ追加
   - `remove`: 指定タグのみ削除
4. トランザクション処理でproduct_tagsテーブル更新

**レスポンス**:
```json
{
  "success": true,
  "updatedCount": 5,
  "errors": []
}
```

#### 2.17.2: 条件ベース自動タグ付けAPI

**エンドポイント**: `POST /api/admin/products/auto-tag`

**リクエスト**:
```json
{
  "conditions": {
    "brand": "KATO",           // オプション
    "productCodePattern": "^10-",  // 正規表現
    "nameKeyword": "新幹線"     // 部分一致
  },
  "tagIds": [10, 11],
  "mode": "add",
  "dryRun": false  // trueの場合はプレビューのみ
}
```

**レスポンス**:
```json
{
  "affectedProducts": 45,
  "updatedCount": 45,
  "products": [
    { "id": 1, "name": "...", "existingTags": [...], "newTags": [...] }
  ]
}
```

#### 2.17.3: 保有車両一括更新API

**エンドポイント**: `POST /api/owned-vehicles/bulk-update`

**リクエスト**:
```json
{
  "vehicleIds": [1, 2, 3],
  "updates": {
    "currentStatus": "NORMAL",      // オプション
    "storageCondition": "WITH_CASE", // オプション
    "notes": {
      "mode": "append",  // "append" | "replace"
      "content": "展示会用に準備完了"
    }
  }
}
```

**レスポンス**:
```json
{
  "success": true,
  "updatedCount": 3,
  "errors": []
}
```

### UI設計

#### 2.17.1: 製品一覧画面の拡張

**変更点**:
```tsx
// 製品一覧テーブルヘッダー
<thead>
  <tr>
    <th><input type="checkbox" onChange={handleSelectAll} /></th>
    <th>メーカー</th>
    <th>品番</th>
    ...
  </tr>
</thead>

// アクションボタン
{selectedProducts.length > 0 && (
  <div className="fixed bottom-4 right-4 bg-white shadow-lg p-4 rounded-lg">
    <p>選択中: {selectedProducts.length}件</p>
    <button onClick={openBulkTagDialog}>一括タグ編集</button>
    <button onClick={openBulkDeleteDialog}>一括削除</button>
  </div>
)}
```

#### 2.17.2: 一括タグ編集ダイアログ

**コンポーネント**: `BulkTagEditDialog.tsx`

```tsx
interface BulkTagEditDialogProps {
  selectedProductIds: number[]
  onClose: () => void
  onComplete: () => void
}

// UI構成
<Dialog>
  <DialogTitle>
    {selectedProductIds.length}件の製品にタグを設定
  </DialogTitle>

  <DialogContent>
    {/* モード選択 */}
    <RadioGroup value={mode} onChange={setMode}>
      <Radio value="add">追加（既存タグを保持）</Radio>
      <Radio value="replace">上書き（既存タグを削除）</Radio>
      <Radio value="remove">削除（選択タグのみ削除）</Radio>
    </RadioGroup>

    {/* タグ選択（カテゴリ別） */}
    <TagSelector
      selectedTags={selectedTags}
      onChange={setSelectedTags}
    />

    {/* プレビュー */}
    <div className="mt-4 p-3 bg-blue-50 rounded">
      <p>影響を受ける製品: {selectedProductIds.length}件</p>
      <p>追加されるタグ: {selectedTags.length}個</p>
    </div>
  </DialogContent>

  <DialogActions>
    <button onClick={onClose}>キャンセル</button>
    <button onClick={handleApply}>適用</button>
  </DialogActions>
</Dialog>
```

#### 2.17.3: 保有車両一括更新ダイアログ

**コンポーネント**: `BulkVehicleUpdateDialog.tsx`

```tsx
<Dialog>
  <DialogTitle>
    {selectedVehicleIds.length}件の保有車両を更新
  </DialogTitle>

  <DialogContent>
    {/* 現在の状態 */}
    <Select
      label="現在の状態（変更しない場合は空欄）"
      value={currentStatus}
      onChange={setCurrentStatus}
    >
      <option value="">変更しない</option>
      <option value="NORMAL">正常</option>
      <option value="NEEDS_REPAIR">要修理</option>
      <option value="BROKEN">故障中</option>
    </Select>

    {/* 保管状態 */}
    <Select
      label="保管状態（変更しない場合は空欄）"
      value={storageCondition}
      onChange={setStorageCondition}
    >
      <option value="">変更しない</option>
      <option value="WITH_CASE">ケースあり</option>
      <option value="WITHOUT_CASE">ケースなし</option>
    </Select>

    {/* 備考 */}
    <div>
      <label>備考</label>
      <RadioGroup value={notesMode}>
        <Radio value="append">追記</Radio>
        <Radio value="replace">上書き</Radio>
      </RadioGroup>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
    </div>
  </DialogContent>

  <DialogActions>
    <button onClick={onClose}>キャンセル</button>
    <button onClick={handleUpdate}>更新</button>
  </DialogActions>
</Dialog>
```

## 実装計画

### Phase 2.17.1: 製品一括タグ付け（2-3日）

1. **API実装** (1日)
   - [x] `/api/products/bulk-update-tags` エンドポイント作成
   - [x] トランザクション処理実装
   - [x] エラーハンドリング

2. **UI実装** (1-2日)
   - [x] 製品一覧にチェックボックス追加
   - [x] 選択状態管理（useState）
   - [x] BulkTagEditDialogコンポーネント作成
   - [x] タグ選択UI統合
   - [x] 進行状況表示

3. **テスト・確認** (0.5日)
   - [x] 各モード（add/replace/remove）の動作確認
   - [x] エラーケースの確認
   - [x] UI/UX確認

### Phase 2.17.2: 条件ベース自動タグ付け（2日）

1. **API実装** (1日)
   - [ ] `/api/admin/products/auto-tag` エンドポイント
   - [ ] 条件マッチングロジック
   - [ ] プレビュー機能（dryRun）

2. **管理画面UI** (1日)
   - [ ] 自動タグ付け画面作成
   - [ ] 条件入力フォーム
   - [ ] プレビュー表示
   - [ ] 実行確認ダイアログ

### Phase 2.17.3: 保有車両一括更新（1-2日）

1. **API実装** (0.5日)
   - [ ] `/api/owned-vehicles/bulk-update` エンドポイント
   - [ ] 部分更新ロジック
   - [ ] 備考の追記/上書きモード

2. **UI実装** (1日)
   - [ ] 保有車両一覧にチェックボックス追加
   - [ ] BulkVehicleUpdateDialogコンポーネント
   - [ ] 更新確認ダイアログ

3. **テスト・確認** (0.5日)

## テストシナリオ

### 2.17.1: 製品一括タグ付け

1. **追加モード**
   - ✅ 5件の製品を選択
   - ✅ 「通勤型電車」タグを追加
   - ✅ 既存タグが保持される

2. **上書きモード**
   - ✅ 10件の製品を選択
   - ✅ 「KATO」「Nゲージ」タグに上書き
   - ✅ 既存タグが削除され、新しいタグのみになる

3. **削除モード**
   - ✅ 3件の製品を選択
   - ✅ 「廃盤」タグを削除
   - ✅ 他のタグは保持される

### 2.17.2: 条件ベース自動タグ付け

1. **メーカー別タグ付け**
   - ✅ brand = "KATO" の製品に「KATO」タグを一括付与
   - ✅ プレビューで影響製品数が正しく表示

2. **品番パターンマッチング**
   - ✅ productCode starts with "10-" に「Nゲージ」タグ
   - ✅ 該当製品のみが更新される

### 2.17.3: 保有車両一括更新

1. **状態の一括変更**
   - ✅ 5件の保有車両を選択
   - ✅ 現在の状態を「正常」に変更
   - ✅ 他の項目は変更されない

2. **備考の追記**
   - ✅ 3件の保有車両を選択
   - ✅ 備考に「展示会用」を追記
   - ✅ 既存の備考が保持される

## 注意事項

### パフォーマンス
- 大量データ（100件以上）の一括更新時の処理時間を考慮
- トランザクション処理でデータ整合性を保証
- 進行状況表示でUXを改善

### セキュリティ
- ログイン必須
- 自動タグ付けは管理者のみ
- 保有車両は所有者のみ更新可能

### ユーザー体験
- 一括操作の影響範囲を事前に明示
- 確認ダイアログで誤操作を防止
- エラー時の詳細メッセージ表示

## 関連ドキュメント

- [開発進捗記録](./development-log.md)
- [プロジェクト仕様書](../apps/web-next/docs/specification.md)
- [タグシステム仕様書](./tag-system-specification.md)
- [Phase 2.16仕様書](./phase-2.16-csv-import-improvement.md)
