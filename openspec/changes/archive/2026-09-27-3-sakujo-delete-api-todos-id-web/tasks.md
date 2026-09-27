# Tasks

## 1. server の API

- [x] 1.1 `server/src/app.ts` に `DELETE /api/todos/:id` を足す(design の D1・D2: id を `/^[1-9][0-9]*$/` で読み、`DELETE … WHERE id = ?` の `changes` が 0 なら 404 `{ error }`、1 なら 204 で body なし)。todo-api の ADDED の 7 の Scenario(存在する todo の削除、削除した todo の一覧からの消去、最後の 1 件の API での削除、存在しない id の削除、同じ id の 2 回目の削除、数値として読めない id の削除、先頭に 0 の付いた id の削除)の題名をそのまま試験名にした試験を `server/test/todos.test.ts` に足す。確かめ方: `pnpm --filter server test` が既存の 22 と新しい 7 の試験すべてで通る
- [x] 1.2 `PATCH /api/todos/:id` で `UPDATE … RETURNING` が行を返さないとき 404 `{ error }` を返す(D3)。MODIFIED の Scenario「PATCH の途中の削除」の試験を、body を `ReadableStream` にして読まれる時に `DELETE` を呼ぶ形で足す(Node の `Request` は stream の body に `duplex: 'half'` が要るので付ける)。同じく MODIFIED の Scenario「先頭に 0 の付いた id の拒否」の試験も足す(今の正規表現で既に通るはず)。確かめ方: 先に試験だけを足して `pnpm --filter server test` がその試験で 500 を受けて落ちることを見てから直し、直した後に `pnpm --filter server test` がすべて通る

## 2. web の行の削除

- [x] 2.1 `web/src/api.ts` に `deleteTodo(id)` を足し(D8、204・404 で resolve)、`web/src/app.ts` の削除ボタンに `click` を付けて D4〜D7 のとおりに送り、成功で行を取り除き、0 件なら T1a を描く。`window.confirm` は呼ばない。todo-web の ADDED の 8 の Scenario(削除ボタンでの行の削除、完了の行の削除、最後の 1 件の削除、0 件にした後の追加、削除の応答待ちの間の再押下、既に無い todo の削除、削除の失敗、削除の要求の失敗)の題名をそのまま試験名にし、「削除ボタンでの行の削除」では `window.confirm` の spy が呼ばれないことも確かめる。REMOVED の「削除ボタンの無反応」の試験を消す。`deleteTodo` が 204・404 で resolve し 500 で reject することの試験と、D7 の順序(削除の応答待ちの間に同じ行の切り替えが先に成功して行が作り直され、その後に削除が成功する)で行が消え、一覧に残らないことの試験も足す。確かめ方: `pnpm --filter web test` がすべて通り、`grep -n "削除ボタンの無反応" web/test/app.test.ts` が何も出さない
- [x] 2.2 画面を frame と見比べる。確かめ方: server と web の dev を起動し、「牛乳を買う」「掃除する」「本を返す」を作って「掃除する」の「削除」を押した画面(2 行)を 480 幅で撮り、行の配置・delete-button が Figma の T1(2:2)の screenshot の行と一致すること、残りの 2 行も消した画面が T1a(2:16)の screenshot と一致すること、どの押下でも確認のダイアログが出ないことを見る

## 3. 全体の確かめ

- [x] 3.1 root で通す。確かめ方: `pnpm test`(server と web の両方の試験)と `pnpm build`(両方の build)が通り、`npx pnpm@10 install --frozen-lockfile` も通る(依存を足していないので `pnpm-lock.yaml` は変わらない)
