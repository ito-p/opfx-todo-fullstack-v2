# Tasks

## 1. server の API

- [ ] 1.1 `server/src/app.ts` に `PATCH /api/todos/:id` を足す(design の D1〜D4: id を `/^[1-9][0-9]*$/` で読み、無ければ 404、在れば body の `done` が真偽値のときだけ `UPDATE … RETURNING` して 200)。todo-api の新しい 11 の Scenario の題名をそのまま試験名にした試験を `server/test/todos.test.ts` に足す。確かめ方: `pnpm --filter server test` が既存の 11 と新しい 11 の Scenario の試験すべてで通る

## 2. web の完了の切り替え

- [ ] 2.1 `web/src/api.ts` に `updateTodo(id, done)` を足し(D8)、`web/src/app.ts` の行の描画を `done` に従わせ(`checked`・`data-done`・`aria-label`)、チェックボックスの `click` で反対の `done` を送り、成功で行を置き換え、送信中の再押下と失敗を D5・D6 のとおりに扱う。削除ボタンは何もしないまま。todo-web の MODIFIED・ADDED の Scenario(起動時の一覧の行、起動時の完了の行、未完了の行の完了、完了の行の未完了、応答待ちの間の再押下、切り替えの失敗、削除ボタンの無反応)の題名をそのまま試験名にし、REMOVED の「チェックボックスと削除ボタンの無反応」の試験を消す。確かめ方: `pnpm --filter web test` が todo-web の 12 の Scenario の試験すべてで通り、「チェックボックスと削除ボタンの無反応」の試験が残っていない
- [ ] 2.2 Figma の checkbox(完了)(5:16)の SVG を `web/src/assets/checkbox-done.svg` に置き、`web/src/style.css` に D7 の値(`.checkbox:checked`、`.todo-item[data-done='true'] .todo-title` の取り消し線・#a3a3a3)を足す。確かめ方: `pnpm --filter web build` が通り、`web/dist` の CSS が SVG を参照している(`grep -l checkbox-done web/dist/assets/*.css` か data URL で埋め込まれている)
- [ ] 2.3 画面を frame と見比べる。確かめ方: server と web の dev を起動し、「牛乳を買う」「掃除する」「本を返す」を作って「牛乳を買う」のチェックボックスを押した画面を 480 幅で撮り、Figma の T1b(5:2)の screenshot と並べて、チェックボックスの印・題名の取り消し線と色・行の配置が一致する。もう一度押して T1(2:2)の見た目に戻ることも撮って確かめる

## 3. docs/design

- [ ] 3.1 `docs/design/specs/T1b.md` を README の「画面ごとの実値の書き方」の形(出所・T1 との差分だけ・実装への含意)で書き、`docs/design/screens.md` の「実値の文書」の表の T1b の行を埋める。確かめ方: Screens ページ(0:1)を `get_metadata` で、T1b(5:2)と checkbox(完了)(5:16)を `get_design_context` で読み戻し、README の「検算の仕方」(1)座標の不一致 0、(2)重なり 0、(3)線の端点が辺の中央、(4)線の色と太さ、が満たされ、T1b.md の値が読み戻した値と 1 つ残らず一致する

## 4. 全体の確かめ

- [ ] 4.1 root で通す。確かめ方: `pnpm test`(server と web の両方の試験)と `pnpm build`(両方の build)が通り、`npx pnpm@10 install --frozen-lockfile` も通る(依存を足していないので `pnpm-lock.yaml` は変わらない)
