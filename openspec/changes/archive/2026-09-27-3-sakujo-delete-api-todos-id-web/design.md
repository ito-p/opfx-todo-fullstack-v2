# Design

## Context

Issue 1・2 の後: server は `createApp(db)`(Hono、memory の SQLite)で `GET`/`POST /api/todos` と `PATCH /api/todos/:id`。PATCH は `id` を `/^[1-9][0-9]*$/` と `SELECT` で判定してから `await c.req.json()` で body を読み、`UPDATE … RETURNING` の結果を `toTodo(row)` に渡す。body を読む間に他の要求が todo を消すと `row` が `undefined` になり、`toTodo` が throw して 500 になる(Issue の受け入れ基準「PATCH の途中で todo が消えても 404」の対象)。web は `mountApp(root, api)` が T1・T1a・T1b を素の DOM で描き、行は `renderItem(todo, api)` が作る。削除ボタンは描くだけで listener が無い。動機は proposal.md の Why。

rubric の該当: [api](route を足し、PATCH の応答の status を足す)、[ui](T1・T1b → T1a という同じ画面の中の遷移を足す)、[behavior-change]。

## 画面(docs/design の規則の形)

### 画面の階層

```
todo
+-- T1 todo 一覧(frame 2:2、480×400)
    +-- T1a 0 件(frame 2:16、差分)
    +-- T1b 完了あり(frame 5:2、差分)
```

この change は画面も状態も足さない。

### Screens ページの配置(2026-09-27 に `get_metadata` で読み戻した実値)

| 行 × 列 | 差分の群 | 線 |
|---|---|---|
| 0 行: T1(2:2、x 0)→ T1a(2:16、x 544)→ T1b(5:2、x 1088)。どれも 480×400、y 0 | T1 → T1a → T1b | frame `flow-lines`(2:26、x 480・y 200・608×0)に 2:25「T1 -> T1a 差分」(480, 200)→(544, 200)、5:20「T1a -> T1b 差分」(1024, 200)→(1088, 200) |

`docs/design/screens.md` の写しと一致する。この change は配置も線も変えない。

### 使う部品(読み戻した実値)

- **delete-button**: T1 の 8:2・8:4・8:6、T1b の 8:8・8:10・8:12。どれも行の中の (370, 7.5)、50×28、中の label(8:3 ほか)は (11, 5.5)・28×17。見た目の値は `docs/design/specs/T1-T1a.md` の delete-button のとおりで、実装(`.delete-button`)に既に在る。
- **empty-message**(2:23、(24, 125)、432×120)と **empty-text**(2:24): 最後の 1 件を消した後に描く T1a の中身。実装(`showEmpty`)に既に在る。

### 状態と遷移

| 画面 | 状態(frame) | いつ | この change で足す遷移 |
|---|---|---|---|
| T1 | 一覧(2:2) | 1 件以上、完了の行が 0 | 行の削除に成功し、残りが 1 件以上 → T1 のまま / 残りが 0 → T1a |
| T1 | 完了あり T1b(5:2) | 完了の行が 1 つ以上 | 行の削除に成功し、完了の行が残る → T1b のまま / 完了の行が 0 で 1 件以上残る → T1 / 残りが 0 → T1a |
| T1 | 0 件 T1a(2:16) | 0 件 | (削除する行が無い。追加に成功 → T1 は Issue 1 のまま) |

どれも同じ画面の中の状態の変化で、ページを跨ぐ遷移は無い。削除の応答を待つ間の見た目は押す前のままなので、「削除中」の状態は無い。確認のダイアログも描かない(Issue の範囲外)。

### 作ったもの

Figma には何も足さない、変えない(delete-button と T1a が既に在り、新しい見た目が無いため)。README の規則では遷移の線は frame どうしを結ぶもので、T1 ↔ T1a は既に灰の差分の線 2:25 で結ばれている。Issue 2 の完了の切り替え(T1 ↔ T1b)も線を足していないので、それに揃える。同じ理由で `docs/design` の文書(`screens.md`・`specs/`)も変えない。

## Goals / Non-Goals

**Goals:**
- `DELETE /api/todos/:id` で todo を消す。204 / 404 の規則を Issue の受け入れ基準どおりにする。
- PATCH の途中で todo が消えても 404 を返す。
- 行の「削除」ボタンで確認なしに消し、0 件になったら T1a を描く。

**Non-Goals:**
- 取り消し(undo)、まとめての削除、確認ダイアログ、永続化(Issue 4)。
- 削除の失敗の表示(Figma に失敗の frame が無い)。失敗したら行を押す前のまま残すだけ。
- 削除の応答待ちの間に同じ行のチェックボックスを押したときの扱いを特別にすること(D7)。

## Decisions

### D1. 応答: 204 で body なし
`DELETE /api/todos/:id` → 204、body は空。失敗は 404 で `{ "error": string }`(POST・PATCH と同じ形)。Hono では `c.body(null, 204)`。
- 代案: 200 で消した todo を返す。Issue が「204(body なし)」と決めているので採らない。

### D2. id の読み方と 404: PATCH と同じ
path の `:id` が `/^[1-9][0-9]*$/` に合わなければ table を引かずに 404(先頭に 0 の付いた `01`・`001` も合わないので 404。同じ todo に複数の path を当てない。Issue 2 の D2 と同じ。spec の要求の文は「先頭に 0 の無い正の整数の 10 進表記」と書き、PATCH と DELETE の両方に Scenario「先頭に 0 の付いた id の…」を置いて揃える)。合えば `DELETE FROM todos WHERE id = ?` を走らせ、`changes` が 0 なら 404。
- 代案: 先に `SELECT` で在るかを見てから `DELETE`。文が 2 つになり、間に他の要求が入る余地が残る。1 文の `changes` で判定する方が短く確かなので採らない。
- 代案: 在っても無くても 204(冪等な DELETE)。Issue が「2 回目は 404」と決めているので採らない。

### D3. PATCH の途中の削除: `RETURNING` が行を返さなければ 404
`UPDATE todos SET done = ? WHERE id = ? RETURNING id, title, done` の結果が `undefined` なら、`toTodo` に渡さずに 404 `{ error }` を返す。`id` の最初の判定(`SELECT`)は残す(D3 of Issue 2: 存在しない id を body より先に 404 にするため)。
- 代案: `SELECT` と `UPDATE` を 1 つの transaction にまとめる。body の読み込み(`await`)を挟むので transaction で囲めず、better-sqlite3 は同期なので `UPDATE` 1 文はそれ自体で原子的。結果の有無を見るだけで足りるので採らない。
- 代案: body を先に読んでから `id` を判定する。判定の順(404 が 400 より先)が source of truth で決まっているので採らない。
- 試験: `app.request` に `ReadableStream` の body を(Node の `Request` が求める `duplex: 'half'` と一緒に)渡し、その stream が読まれる時(= `id` の判定の後)に `DELETE` を呼んでから JSON を流す。これで判定と更新の間の削除を決まった順で起こせる。

### D4. web: 応答を待ってから行を消す(楽観的に消さない)
「削除」ボタンの `click` で `api.deleteTodo(todo.id)` を呼び、成功したら `item.remove()`。残った行が 0 なら `showEmpty()`(T1a)。Issue 2 の D5 と同じく、失敗の表示が無いまま行が戻ってくる動きを避ける。
- 代案: 押した瞬間に消し、失敗で戻す。速く見えるが、失敗で消えた行が理由なく戻り、元の位置へ戻す手間も要る。memory の server なので応答は速く、待つ方を採る。
- 確認ダイアログ(`window.confirm`)は呼ばない。試験で `window.confirm` を spy して呼ばれないことを確かめる。

### D5. 404 は「既に無い」として行を消す
`api.deleteTodo` は status 204 と 404 をともに成功として返し(404 は「消すべき todo がもう無い」= 望んだ結果)、それ以外の `!res.ok` と `fetch` 自体の失敗で throw する。
- この 404 の扱いは Issue に書かれていない判断(完了の切り替えでは 404 を失敗として行を残す、の非対称)なので、PR の本文に明記して人の review で確かめてもらう。
- 代案: 404 も失敗として行を残す。server にもう無い todo の行が残り、何度押しても 404 で消せない行になる。採らない。
- 代案: 404 で一覧を読み直す。他の画面での変化も拾えるが、Issue の範囲を越え、読み直しの失敗の扱いも要る。採らない。

### D6. 応答待ちの間の再押下を送らない
Issue 2 の D6 と同じく、行ごとに「削除の送信中」の旗を持ち、立っている間の `click` は送らない。旗は失敗の後に `finally` で下ろして再び押せるようにする。成功した行は DOM から消えるので旗の後始末は要らない。
- 代案: `disabled` にする。灰色の見た目になり T1・T1b の frame と違うので採らない(Issue 1 の D7 と同じ理由)。

### D7. 行の置き換えと削除の重なり
完了の切り替えは成功で `item.replaceWith(renderItem(updated, …))` と行を作り直す。削除は `renderItem` が作る行ごとの listener で、消すのはその時 DOM に在る行でなければならない。そこで `renderItem` に「行を取り除いた」ことを知らせる callback(`onRemoved`)を渡し、`mountApp` がそこで残りの行数を見て 0 なら `showEmpty()` を呼ぶ。切り替えの応答より先に削除が成功した行では、`replaceWith` は親の無い要素に対して何もしないので行は戻らない。削除の応答より先に切り替えが成功して行が作り直された場合、古い行の削除の成功は古い行を消すだけになるので、作り直した後の行を消すため `item` ではなく「その `id` の今の行」(`list.querySelector('[data-id="…"]')`)を消す。
- 代案: 削除の送信中はチェックボックスも止める。Issue に無い動きを足すので採らない。

### D8. api
`web/src/api.ts` に `deleteTodo(id: number): Promise<void>`(`DELETE /api/todos/${id}`、204・404 で resolve、それ以外で throw)を足す。
- 代案: 404 で throw し、`app.ts` 側で status を見て分ける。`Error` に status を持たせる型が要り、呼ぶ側が増える。status の意味づけ(D5)を api の 1 か所に置く方を採る。

## Risks / Trade-offs

- [D3 の試験が Hono の body の読み方に依る] → `c.req.json()` は body の stream を読むので、stream の `start`/`pull` の中で削除すれば判定の後・更新の前に当たる。Hono の版が変わり body を先読みするようになれば試験が 200 の側で落ちて知らせる。
- [404 を成功として扱うので、打ち間違いの id でも行が消える] → web が送る `id` は API が返した todo の `id` だけなので、404 は「既に消えた」ときにしか起きない。
- [jsdom は見た目を描かない] → 試験は DOM の状態(行の有無と順・`empty-message`・送った引数・`confirm` の呼び出し)を確かめ、見た目は dev server の画面を 480 幅で撮り、T1(2:2)・T1a(2:16)の screenshot と並べて確かめる(tasks 2.2)。
