## Why

#3(PR #7)の R2 で、web の削除の callback の名前がコード(`renderItem(todo, api, onDeleted)`、`mountApp` 側は `removeRow`)と #3 の design.md の D7(`onRemoved`)で食い違っていると指摘された。名前が 3 つあり、誰が行を DOM から消し誰が 0 件の表示に切り替えるかがコードから読み取りにくいので、一つの名前に揃え、役割を comment に書く。

## What Changes

- `web/src/app.ts` の削除を知らせる callback の名前を、#3 の design.md D7 の `onRemoved` に揃える(`renderItem` の引数 `onDeleted` と、`mountApp` が渡す関数 `removeRow` の両方を `onRemoved` にする)。
- `renderItem` と `mountApp` の comment に callback の役割を書く: `renderItem` は削除の応答が成功した後に `onRemoved(id)` を呼ぶだけで DOM に触れない。`mountApp` の `onRemoved` がその `id` の今の行を DOM から消し、行が 0 になれば `showEmpty()` で T1a に切り替える。
- 振る舞いは変えない(refactor のみ)。削除と 0 件の表示の既存の試験は書き換えずにそのまま通す。
- archive 済みの #3 の design.md は書き換えない。

## Capabilities

### New Capabilities

(なし)

### Modified Capabilities

(なし。観測できる振る舞いが変わらないので spec の delta は持たず、`.openspec.yaml` に `skip_specs: true` を置く)

## Impact

- 変わる file: `web/src/app.ts`(識別子の名前と comment のみ)。
- API・DB・画面・依存は変わらない。`web/test/app.test.ts` は変えない。
