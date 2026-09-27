## Context

`web/src/app.ts` では、削除の callback が 3 つの名前で呼ばれている。`renderItem` の引数は `onDeleted`、`mountApp` が渡す関数は `removeRow`、#3 の design.md(`openspec/changes/archive/2026-09-27-3-sakujo-delete-api-todos-id-web/design.md`)の D7 は `onRemoved`。コードの振る舞いは D7 のとおりで、`renderItem` は削除の応答が成功したら `id` を知らせるだけ、`mountApp` 側が `list.querySelector('.todo-item[data-id="…"]')` でその `id` の今の行を消し、行が 0 なら `showEmpty()` を呼ぶ。画面・状態・遷移は変わらないので、Figma の frame は作らず docs/design も変えない。

## Goals / Non-Goals

**Goals:**
- 削除を知らせる callback の名前を、コードの中と D7 で一つ(`onRemoved`)にする。
- 「誰が行を DOM から消し、誰が 0 件の表示に切り替えるか」をコードの comment に書き、振る舞いと合わせる。

**Non-Goals:**
- 振る舞いの変更(D5 の 404 の扱い、D6 の `finally` の書き方、削除の応答待ちの間に作り直された行の 2 回目の DELETE)。
- archive 済みの design.md の書き換え。

## Decisions

### D1. 名前は D7 の `onRemoved` に揃える
`renderItem` の引数 `onDeleted` と `mountApp` の関数 `removeRow` を、どちらも `onRemoved` にする。archive 済みの D7 は正本の記録で書き換えないので、コードを記録に寄せれば、記録とコードの食い違いが後から読む人に残らない。
- 代案: コードの `onDeleted` を残し、揃えない理由をこの design.md に書く。D7 を読んだ人は `onRemoved` を探してコードで見つけられないままになるので採らない。
- 代案: 引数だけ `onRemoved` にし、`mountApp` の関数名 `removeRow` は残す。`removeRow` は中身を表す名前だが、同じ callback に 2 つの名前が残り「一つの名前に揃える」受け入れ基準を満たさないので採らない。

### D2. 役割の分け方はコードの今の振る舞いのまま comment に書く
D7 の「行を取り除いたことを `mountApp` に知らせる」は、コードでは「API が todo を取り除いた(削除の応答が成功した)ことを知らせる」であり、DOM の行を消すのは `mountApp` の `onRemoved` である(切り替えで行が作り直されていても今の行を消すため、D7 の後半の決め)。この分け方を変えずに、`renderItem` の JSDoc に「DOM には触れず `onRemoved(id)` を呼ぶだけ」、`mountApp` の `onRemoved` の comment に「その `id` の今の行を DOM から消し、0 行なら `showEmpty()`(T1a)」と書く。
- 代案: `renderItem` 側で `item.remove()` してから `onRemoved` を呼ぶ。切り替えで作り直された後の行を消せなくなり(D7 の試験「切り替えが先に成功した後の削除の成功(design.md D7)」が落ちる)、振る舞いが変わるので採らない。

## Risks / Trade-offs

- [名前の置き換え漏れ] → `grep -rn "onDeleted\|removeRow" web/src` が何も出さずに exit 1(該当なし)で終わることを確かめる(`-r` を付けないと素の grep は directory を読まずに exit 2 で終わり、漏れが在っても何も出さないため)。
- [comment が振る舞いとずれる] → 既存の削除の試験(「削除ボタンでの行の削除」「最後の 1 件の削除」「0 件にした後の追加」「切り替えが先に成功した後の削除の成功(design.md D7)」ほか)を書き換えずに通し、comment の述べる分け方がそのまま試験で確かめられていることを見る。
