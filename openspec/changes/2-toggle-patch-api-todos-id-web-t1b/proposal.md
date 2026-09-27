# Proposal

## Why

todo を作って一覧で見ることはできる(Issue 1)が、済んだ todo に印を付けられない。todo の `done` は API の形に既に在り、Figma には完了の行の見た目 T1b(frame 5:2)も既に在るので、完了の切り替えを API と画面の両方につなぐ(Issue #2)。

## What Changes

- API: `PATCH /api/todos/:id` を足す。body `{"done": <真偽値>}` でその todo の完了状態を変え、200 で更新後の todo を返す。存在しない id(数値として読めない id を含む)は 404、`done` が無いか真偽値でない body(JSON として読めない body を含む)は 400。`done` 以外の key は無視し、題名は変えない。
- web: 行のチェックボックスを押すと、その行の反対の `done` を PATCH で送り、成功したら返った todo で行を描き直す。`done` が `true` の行は T1b のとおり(印の付いた黒いチェックボックス、題名に取り消し線・灰色)に描く。起動時の一覧でも `done` が `true` の行を T1b の見た目で描く。
- web: 「まだ動かないチェックボックスと削除ボタン」の要求を、削除ボタンだけのものに置き換える(チェックボックスは動くようになる)。
- docs/design: T1b の実値の文書 `docs/design/specs/T1b.md` を足し、`screens.md` の実値の文書の表を更新する。Figma は変えない。

## Capabilities

### New Capabilities

(なし)

### Modified Capabilities

- `todo-api`: 完了状態の変更(`PATCH /api/todos/:id`)と、その不正な要求の拒否(404・400)の要求を足す。
- `todo-web`: 起動時の一覧で完了の行を T1b の見た目で描く。チェックボックスで完了を切り替える要求を足し、チェックボックスを「まだ動かない」要求から外す。

## Impact

- server: `server/src/app.ts` に route を 1 つ足す。table は変えない(`done` の列は既に在る)。試験 `server/test/todos.test.ts`。
- web: `web/src/api.ts`(`updateTodo`)、`web/src/app.ts`(行の描き直しと切り替え)、`web/src/style.css`(T1b の値)、チェックボックスの印の SVG。試験 `web/test/app.test.ts`。
- docs: `docs/design/specs/T1b.md`(新規)、`docs/design/screens.md`。
- rubric: [api](route を足す)、[ui](T1b の状態と、T1 ↔ T1b の切り替えを足す)、[behavior-change]。
