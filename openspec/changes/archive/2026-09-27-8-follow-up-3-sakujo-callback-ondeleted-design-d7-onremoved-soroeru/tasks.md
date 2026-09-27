# Tasks

## 1. callback の名前と役割の comment

- [x] 1.1 `web/src/app.ts` の `renderItem` の引数 `onDeleted` と `mountApp` の関数 `removeRow` を `onRemoved` に改め(design の D1)、`renderItem` の JSDoc と `mountApp` の `onRemoved` の comment に役割を書く(design の D2: `renderItem` は削除の応答の成功の後に `onRemoved(id)` を呼ぶだけで DOM に触れない、`mountApp` の `onRemoved` がその `id` の今の行を DOM から消し、0 行なら `showEmpty()` で T1a に切り替える)。振る舞いは変えない。確かめ方: `grep -rn "onDeleted\|removeRow" web/src` が何も出さずに exit 1(該当なし)で終わり、`grep -n "onRemoved" web/src/app.ts` の出力に `renderItem` の引数・切り替えの成功で行を作り直す `renderItem(updated, api, onRemoved)`・削除の成功での `onRemoved(todo.id)` の呼び出し・`mountApp` の `const onRemoved` の定義・`renderItem(todo, api, onRemoved)` の受け渡しの 5 か所がすべて出る、`git diff --stat` に `web/src/app.ts` 以外の file が出ない

## 2. 全体の確かめ

- [x] 2.1 root で通す。確かめ方: `pnpm install --frozen-lockfile` の後、`pnpm test` が通り(`web/test/app.test.ts` の「削除ボタンでの行の削除」「完了の行の削除」「最後の 1 件の削除」「0 件にした後の追加」「0 件の画面」「切り替えが先に成功した後の削除の成功(design.md D7)」を含むすべて)、`pnpm build` が通り、`git diff --quiet web/test` が差分を出さない
