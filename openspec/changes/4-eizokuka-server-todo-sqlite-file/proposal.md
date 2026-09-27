# Proposal

## Why

server は todo を memory の SQLite に置いているので、再起動のたびに作った todo・完了の状態・削除の結果がすべて消える。todo を SQLite の file に保存し、起動時にそこから復元する(Issue #4)。Issue 1〜3(一覧・追加・完了の切り替え・削除)は merge 済みなので、そのすべてが再起動の後に反映される。

## What Changes

- server は起動時に SQLite の file を開き、todo をそこに読み書きする。追加・完了の切り替え・削除は再起動の後の `GET /api/todos` に反映される。
- file の場所は環境変数 `TODOS_DB_PATH` で変えられる。無い(または空の文字列の)ときは、起動時の cwd に依らず repo の `server/data/todos.sqlite` を使う。
- file が無ければ空の DB として作る。親の directory が無ければ作る。
- SQLite の DB として読めない(壊れた)file は、中身を変えずに `<元の名前>.corrupt-<時刻>` へ名前を変えて退避し、同じ path に新しい空の DB を作って起動する。退避したことと退避先の path を標準エラーに 1 行書く。
- `server/data/` を `.gitignore` に入れる。
- HTTP API の route・要求・応答の形は変えない。table の形(`todos` の列)も変えない。

## Capabilities

### New Capabilities

- `todo-storage`: server が todo を保存する file の場所の決め方、起動時の復元、無い file と壊れた file の扱い。

### Modified Capabilities

(なし。todo-api の「todo の一覧」は既に「保存されているすべての todo」を返すと定めており、要求の文は変わらない)

## Impact

- server: `server/src/db.ts`(file の path の決定、親 directory の作成、壊れた file の退避)、`server/src/index.ts`(起動時に file の DB を開く)。`server/src/app.ts` は変えない。試験は新しい `server/test/storage.test.ts`(一時 directory の path を使う)。既存の試験は memory の DB のまま。
- 依存は足さない(better-sqlite3 と Node の `fs`・`path`・`url` だけ)。`pnpm-lock.yaml` は変わらない。
- `.gitignore` に `server/data/` を足す。
- web と画面(Figma、docs/design)は変えない。
- rubric: [new-capability-design](`todo-storage` を足す)、[behavior-change](再起動の後も残るという観察できる振る舞いを足す)。[db] は rule の文(schema を足す・変える)には当たらない(table の形を変えない)が、Issue が人の確認を求めているのでそれに従う。どちらにしても [behavior-change] が人の review を求める。
