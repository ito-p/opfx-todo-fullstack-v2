# Proposal

## Why

todo を作り(Issue 1)完了にできる(Issue 2)が、要らなくなった todo を消せない。各行の「削除」ボタンは Issue 1 から描かれているのに押しても何も起きない。削除を API と画面の両方につなぐ(Issue #3)。あわせて、`PATCH /api/todos/:id` が id の判定の後に todo を消されると 500 になりうる穴を、削除が入るこの change で塞ぐ。

## What Changes

- API: `DELETE /api/todos/:id` を足す。在る todo を消して 204(body なし)を返す。存在しない id(数値として読めない id を含む、同じ id の 2 回目を含む)は 404 と `{"error": …}`。
- API: `PATCH /api/todos/:id` の判定の後、更新の前にその todo が消えていたときも 404 を返す(500 にしない)。
- web: 行の「削除」ボタンを押すと、確認ダイアログを出さずに `DELETE /api/todos/:id` を送り、成功したらその行を消す。最後の 1 件を消したら T1a(文「まだ todo がありません」)を描く。応答を待つ間の再押下は送らない。404 は「もう無い」として行を消し、それ以外の失敗では行を残して再び押せるようにする。
- web: 「まだ動かない削除ボタン」の要求を外す。
- Figma と docs/design は変えない。削除ボタン(8:2 ほか)と T1a(2:16)は既に在り、新しい画面・状態・部品の見た目は無い(design.md の「画面」)。
- source of truth の `## Purpose`: todo-api(「一覧・追加・完了の切り替え」「後の機能(削除)」)と todo-web(削除を含まない)の Purpose は delta で運べないので、archive の commit で手で書き直す(削除を足す)。

## Capabilities

### New Capabilities

(なし)

### Modified Capabilities

- `todo-api`: todo の削除(`DELETE /api/todos/:id`、204・404)の要求を足す。「不正な完了の切り替えの拒否」に、判定の後に消えた todo の 404 を足す。
- `todo-web`: 行の削除の要求を足し、「まだ動かない削除ボタン」の要求を外す。

## Impact

- server: `server/src/app.ts` に route を 1 つ足し、PATCH の更新が行を返さないときの 404 を足す。table は変えない。試験 `server/test/todos.test.ts`。
- web: `web/src/api.ts`(`deleteTodo`)、`web/src/app.ts`(削除ボタンと、行が 0 になったときの T1a)。CSS は変えない。試験 `web/test/app.test.ts`。
- rubric: [api](route を足し、PATCH の status を変える)、[ui](T1・T1b → T1a の遷移を足す)、[behavior-change]。
