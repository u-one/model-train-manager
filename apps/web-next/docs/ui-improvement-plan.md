# UI共通化の現状と計画

基準日: 2026-10-05。

## 現行の共通部品

- src/components/ui/: Input、Select、TextArea。
- src/components/shared/: VehicleImage、StatusBadge。
- src/components/: Pagination、ViewModeToggle、製品・保有車両のカード/リスト、画像・タグ部品。
- src/types/domain.ts: 共通ドメイン型。各ページの独自型は残っている。
- src/constants/: 製品種別、車両状態、タグカテゴリ。

共通型・表示部品の抽出は部分的に実施済み。新規・編集フォーム全体やAPI出力型の統一は未完了。

## 今後の方針

フォーム・型の共通化は [リファクタリング計画R1 / R5](../../../docs/refactoring-plan.md) に集約する。
旧計画の専用ディレクトリやコンポーネント名は、現行構成として扱わない。
デザインテーマ・表示密度等は採用未定で、必要になった時点で範囲を決める。

機能の進捗は [開発状況](../../../docs/development-log.md)、実装済み機能は [現行仕様](specification.md) を参照。
