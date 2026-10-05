# Phase 3.1: 車両の状態/TODO・整備記録

状態: 未実装の計画（2026-10-05）。以下の追加モデル・API・画面は現行実装に含まれない。現在はMaintenanceRecordモデルと既存記録の表示のみ存在する。進捗は[開発状況](development-log.md)で管理する。

保有車両ごとに「状態（不調などの観察）」「TODO（やりたい作業）」を記録し、整備記録と紐づけて解消履歴を残す。

## 要件
- 1両に複数の状態/TODOを1件ずつ登録できる
  - 例: 状態「M車不調」、TODO「TNカプラー化」「室内灯を入れたい」
- 各項目は 未対応 / 済 を持ち、済にしても削除せず履歴として残す
- 整備記録（日付・内容）を登録できる
- 整備記録の登録時に未対応の項目を選ぶと、その項目を自動で済にして整備記録と紐づける
- 全保有車両を横断して未対応の状態/TODOを一覧できる

## データモデル

```prisma
model VehicleTask {
  id                      Int                @id @default(autoincrement())
  ownedVehicleId          Int                @map("owned_vehicle_id")
  type                    VehicleTaskType
  content                 String
  isDone                  Boolean            @default(false) @map("is_done")
  doneAt                  DateTime?          @map("done_at") @db.Date
  resolvedByMaintenanceId Int?               @map("resolved_by_maintenance_id")
  createdAt               DateTime           @default(now()) @map("created_at")
  updatedAt               DateTime           @updatedAt @map("updated_at")
  ownedVehicle            OwnedVehicle       @relation(fields: [ownedVehicleId], references: [id], onDelete: Cascade)
  resolvedByMaintenance   MaintenanceRecord? @relation(fields: [resolvedByMaintenanceId], references: [id], onDelete: SetNull)

  @@index([ownedVehicleId])
  @@index([isDone, type])
  @@map("vehicle_tasks")
}

enum VehicleTaskType {
  CONDITION @map("状態")
  TODO      @map("TODO")
}
```

- `OwnedVehicle` に `tasks VehicleTask[]`、`MaintenanceRecord` に `resolvedTasks VehicleTask[]` を追加
- `MaintenanceRecord` は既存のまま（日付・内容）
- 既存の `currentStatus`（正常/要修理/故障中）と `maintenanceNotes` は残す（自動連動はしない）
- 整備記録を削除しても紐づいた項目は済のまま（紐づけのみ解除）

## API
| メソッド | パス | 内容 |
|---|---|---|
| GET/POST | `/api/owned-vehicles/:id/tasks` | 車両の状態/TODO一覧・追加 |
| PUT/DELETE | `/api/vehicle-tasks/:id` | 内容編集・済/未対応切替・削除 |
| GET | `/api/vehicle-tasks?type=&done=&q=` | 横断一覧（デフォルト: 未対応） |
| GET/POST | `/api/owned-vehicles/:id/maintenance` | 整備記録一覧・追加（`resolveTaskIds` で項目を済にする） |
| PUT/DELETE | `/api/maintenance/:id` | 整備記録の編集・削除 |

- すべてログイン必須、自分の保有車両のみ操作可能
- 整備記録の追加と項目の済化はトランザクションで行う

## 画面
- **保有車両詳細** `/owned-vehicles/[id]`
  - 状態/TODOセクション: 種別付きで一覧、その場で追加、チェックで済/未対応切替、済の項目は折りたたみ表示
  - 整備記録セクション: 日付降順、解消した項目を併記
- **整備記録の追加・編集** `/owned-vehicles/[id]/maintenance/new`, `/maintenance/[id]/edit`
  - 日付（デフォルト今日）、内容、解消する未対応項目のチェック
- **横断一覧** `/tasks`
  - 種別・未対応/済・キーワードで絞り込み、車両名から詳細へ遷移
  - ナビゲーションに追加

## 実装順
1. スキーマ追加・`prisma db push`
2. 状態/TODO API と保有車両詳細のセクション
3. 整備記録 API と追加・編集画面（紐づけ含む）
4. 横断一覧画面
