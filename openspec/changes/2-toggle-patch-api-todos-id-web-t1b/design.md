# Design

## Context

Issue 1 の骨組みが在る: server は `createApp(db)`(Hono、memory の SQLite、`todos.done INTEGER`)で `GET`/`POST /api/todos`、web は `mountApp(root, api)` が T1・T1a を素の DOM で描き、チェックボックスは `click` で `preventDefault()` して動かない(Issue 1 の design D7)。完了の行の見た目は Figma の T1b(frame 5:2)に既に在る。動機は proposal.md の Why。

rubric の該当: [api](route を足す)、[ui](T1 の状態 T1b と、行の切り替えという同じ画面の中の遷移を足す)、[behavior-change]。

## 画面(docs/design の規則の形)

### 画面の階層

```
todo
+-- T1 todo 一覧(frame 2:2、480×400)
    +-- T1a 0 件(frame 2:16、差分)
    +-- T1b 完了あり(frame 5:2、差分)  <- この change で描く
```

### Screens ページの配置(2026-09-27 に `get_metadata` で読み戻した実値)

| 行 × 列 | 差分の群 | 線 |
|---|---|---|
| 0 行: T1(x 0)→ T1a(x 544)→ T1b(x 1088)。どれも 480×400、y 0 | T1 → T1a → T1b | frame `flow-lines`(2:26)に灰 #CCCCCC・太さ 10・矢印なしの線 2 本: 2:25「T1 -> T1a 差分」(480, 200)→(544, 200)、5:20「T1a -> T1b 差分」(1024, 200)→(1088, 200) |

列の幅 = 480 + 64 = 544。T1b の x 1088 = 544 × 2 で、規則(差分は基準の右へ鎖で 1 列ずつ)どおり。5:20 の端点は T1a の右端の中央 (1024, 200) と T1b の左端の中央 (1088, 200)。この change は配置も線も変えない。

### 状態と遷移

| 画面 | 状態(frame) | いつ | 遷移 |
|---|---|---|---|
| T1 | 一覧(2:2) | 一覧が 1 件以上で、完了の行が 0 | 行のチェックボックスを押して成功 → T1b |
| T1 | 0 件 T1a(2:16) | 一覧が 0 件 | 追加に成功 → T1 |
| T1 | 完了あり T1b(5:2) | 完了の行が 1 つ以上 | 完了の行のチェックボックスを押して成功し、完了の行が 0 になる → T1。まだ完了の行が残る → T1b のまま |

どれも同じ画面の中の状態の変化で、ページを跨ぐ遷移は無い。T1b は 1 行目だけが完了の見本で、行ごとの見た目は `done` で決まる(行の部品の状態は `checkbox(完了)` / `checkbox(未完了)`)。

### T1b の実値(frame 5:2 の `get_design_context` で読んだ値)

T1 との違いは完了の行(5:10)だけ。

- **checkbox(完了)**(5:16): 20×20 の SVG。面 #171717 の角丸 4 の矩形、印は path `M5 10L8.5 13.5L15 6.5`、線 白・太さ 2・端と角は丸。枠は無い。
- **todo-title**(5:11): 16px Regular、色 #A3A3A3、取り消し線(solid)。
- 未完了の行(5:12・5:14)の checkbox(未完了)(5:18・5:19)と題名は T1 と同じ値。delete-button(8:8・8:10・8:12)も同じ。

### 作ったもの

Figma には何も足さない、変えない。使う frame は既存の T1b(5:2)で、読み戻した実値を apply で `docs/design/specs/T1b.md` に写し、`docs/design/screens.md` の「実値の文書」の表の T1b の行を埋める。

## Goals / Non-Goals

**Goals:**
- `PATCH /api/todos/:id` で `done` を明示して変える。検証の規則を Issue の受け入れ基準どおりにする。
- 行のチェックボックスで完了を切り替え、完了の行を T1b の実値どおりに描く。

**Non-Goals:**
- 題名の編集、まとめての完了、削除(Issue 3)、永続化(Issue 4)。
- 切り替えの失敗の表示(Figma に失敗の frame が無い)。失敗したら行を押す前のまま残すだけ。
- 完了の行の並べ替え(完了を下へ送るなど)。行の位置は変えない。

## Decisions

### D1. 応答: 200 で更新後の todo
`PATCH /api/todos/:id` → 200 `Todo`。失敗は 404 / 400 で `{ "error": string }`(POST と同じ形)。
- 代案: 204 で body なし。web が行を描き直すのに返った todo を使えず、Issue の「更新後の todo が返る」に合わないので採らない。

### D2. id の読み方: 正の整数の 10 進表記だけ、それ以外は 404
path の `:id` が `/^[1-9][0-9]*$/` に合わなければ、table を引かずに 404。合えば `SELECT` して無ければ 404。
- 代案: 読めない id を 400 にする。Issue の想定「数値として読めない id も 404」に従い採らない。`Number(id)` で読む案は `1.0`・`1e0`・` 1` を 1 と読んでしまい、同じ todo に複数の path が当たるので採らない。

### D3. 判定の順: id(404)を body(400)より先
存在しない id に不正な body を送ると 404。資源が無いことを先に知らせる方が、web の「行が既に無い」場合の扱いを 1 つにできる。
- 代案: body を先に検証して 400。どちらも Issue の受け入れ基準を満たすが、上の理由で id を先にし、spec の Scenario「存在しない id と不正な body」で固定する。

### D4. PATCH は done だけを見る
body は JSON の object で、`typeof done === 'boolean'` のときだけ受ける。`done` 以外の key(`title`・`id` など)は読まない。SQL は `UPDATE todos SET done = ? WHERE id = ? RETURNING id, title, done`。
- 代案: 未知の key を 400 にする。Issue の想定「done 以外の key は無視」に従い採らない。
- 代案: body なしで反転する(toggle)。Issue が「done を明示して送る」ので採らない。明示なら同じ要求の再送で結果が変わらない(Scenario「同じ値の再送」)。

### D5. web: 応答を待ってから描く(楽観的に描かない)
チェックボックスの `click` は今までどおり `preventDefault()` で見た目の変化を止め、`api.updateTodo(id, !todo.done)` を呼び、成功したら返った todo で行を作り直して置き換える(`replaceWith`)。失敗(`!res.ok` で throw、または `fetch` 自体の throw)したら行の見た目は変えず、D6 の旗だけを下ろす。追加(POST)の成功後に描くのと同じ流れ。
- 代案: 押した瞬間に描き、失敗で戻す(楽観的)。速く見えるが、失敗の表示が無いまま見た目が戻ると押した人に理由が伝わらない。memory の server なので応答は速く、待つ方を採る。

### D6. 応答待ちの間の再押下を送らない
行ごとに「送信中」の旗を持ち、立っている間の `click` は `preventDefault()` だけして送らない。旗は成功でも失敗でも応答の後に必ず下ろす(`finally`)。成功では行を作り直すので新しい行は旗の下りた状態で始まり、失敗では同じ行の旗を下ろして再び押せるようにする(Scenario「切り替えの失敗」「切り替えの要求の失敗」)。
- 代案: `disabled` にする。灰色の見た目になり T1・T1b の frame と違うので採らない(Issue 1 の D7 と同じ理由)。

### D7. 完了の見た目の CSS
- チェックボックス: `.checkbox:checked` に `border: none` と、Figma の SVG(5:16 から取った `web/src/assets/checkbox-done.svg`、20×20・viewBox 0 0 20 20)を `background` に敷く。画像は Figma の asset そのものを使い、描き直さない。
- 題名: 行に `data-done="true"|"false"` を付け、`.todo-item[data-done='true'] .todo-title` に `text-decoration: line-through`・`color: #a3a3a3`。
- docs/design の命名の規則(状態は属性か修飾の class で表し、class 名は役割の部分に揃える)に従い、新しい class は足さない。
- 代案: `.todo-item--done` の修飾 class。どちらも規則の内だが、真偽値そのものを写せる属性の方が試験で読みやすいので属性を採る。
- 代案: SVG を CSS の `::after` と border で描き直す。Figma の asset と形がずれうるので採らない。

### D8. api と aria
`web/src/api.ts` に `updateTodo(id: number, done: boolean): Promise<Todo>`(`PATCH /api/todos/${id}`、`content-type: application/json`、`!res.ok` で throw)を足す。チェックボックスの `aria-label` は未完了なら「<題名> を完了にする」、完了なら「<題名> を未完了に戻す」(押したら何が起きるかを読み上げる。Issue 1 の「<題名> を完了にする」を引き継ぐ)。
- 代案: `updateTodo(id, patch: Partial<Todo>)` で任意の項目を送れる形にする。API が受けるのは `done` だけ(D4)で、題名の編集は範囲外なので、受けない項目を送れる型は誤りを招く。採らない。
- 代案: `aria-label` を状態に依らず「<題名> の完了」に固定し、状態は `checked` だけで伝える。読み上げは `checked` も伝えるので足りるが、Issue 1 が既に動作を言う形(「を完了にする」)を採っており、完了の行で同じ名前だと押すと何が起きるかがずれるので採らない。

## Risks / Trade-offs

- [jsdom は `:checked` の CSS も SVG も描かない] → 試験は DOM の状態(`checked`・`data-done`・送った引数)を確かめ、見た目は dev server の画面を 480 幅で撮って T1b(5:2)の screenshot と並べて確かめる(tasks 3.3)。
- [`preventDefault()` した click の後の `checked` の値] → ブラウザは click の既定の動作を取り消すと `checked` を元に戻す。描き直しは返った todo から行を作り直すので、`checked` の途中の値に依らない。
- [同じ todo を 2 つの画面で同時に切り替える] → 明示の `done` を送るので、後に届いた方の値になる。画面は自分の応答の値を描く。memory の server の間は問題にしない。
