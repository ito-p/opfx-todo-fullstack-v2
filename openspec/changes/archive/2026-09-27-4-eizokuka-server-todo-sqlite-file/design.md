# Design

## Context

Issue 1〜3 の後: `server/src/db.ts` の `openDb(filename = ':memory:')` が better-sqlite3 で DB を開き、`CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0)` を走らせる。`server/src/index.ts` は `createApp(openDb())` で memory の DB を渡すので、再起動で todo が消える。`createApp(db)` は DB を受けるだけで、試験(`server/test/todos.test.ts`)は `openDb()` の memory の DB を使う。動機は proposal.md の Why、振る舞いは `specs/todo-storage/spec.md`。

rubric の該当: [db] は rule の文(table・列・索引・migration を足す・変える)には当たらない(table の形は変えない)が、Issue が「[db] に当たるので plan は人が見る」としているのでそれに従って人の確認に回す。rule の文に当たるのは [new-capability-design](`todo-storage`)、[behavior-change]。[api] と [ui] には当たらない(route・応答の形・画面を変えない)。

## 画面

この change は画面・画面の状態・遷移を足しも変えもしない(server の中だけの変更)。Figma(共有のファイル の Screens ページ)にも `docs/design` の文書(`screens.md`・`specs/`)にも何も足さない、変えない。

## Goals / Non-Goals

**Goals:**
- todo を file の SQLite に保存し、同じ file で起動し直すと追加・完了・削除の結果が戻る。
- 保存の path を `TODOS_DB_PATH` で変えられ、既定は cwd に依らず `server/data/todos.sqlite`。
- 無い file・無い親 directory・長さ 0 の file は空の DB として起動する。壊れた file は中身を残したまま退避し、空の DB で起動する。

**Non-Goals:**
- schema の migration、backup、複数 process からの並行の書き込み、SQLite 以外の DB(Issue の範囲外)。
- 既に在る DB の `todos` の table が違う形のときの扱い(migration に当たる)。`CREATE TABLE IF NOT EXISTS` は既に在る table に触らない。
- 退避した file の自動の削除や件数の上限。

## Decisions

### D1. 関数の分け方: path の決定と DB の開き方を分け、`createApp` は変えない
`server/src/db.ts` に次を置く。
- `resolveDbPath(env: { TODOS_DB_PATH?: string }, cwd = process.cwd()): string` — 保存の path を絶対 path で返す(D2)。
- `openDb(filename = ':memory:')` — 今のまま(memory の DB を既存の試験が使う)。
- `openTodosDb(path: string, options?: { now?: () => Date; warn?: (line: string) => void }): Db` — 親 directory を作り(D3)、file を開き、壊れていれば退避して開き直す(D4〜D6)。`now` と `warn` は試験が時刻を決めて(D5 の衝突の Scenario)標準エラーの行を拾う(D6)ために受ける。既定は `new Date()` と `console.error`。

`index.ts` は `createApp(openTodosDb(resolveDbPath(process.env)))` にする。
- 代案: `openDb` に env を読ませて 1 つの関数にする。試験が `process.env` と cwd を書き換えることになり、並んで走る試験どうしが干渉する。引数で渡す方を採る。
- 代案: 「再起動」の Scenario を実の process(`node dist/index.js`)を起こして試す。build が試験の前に要り、port の取り合いや待ち時間で揺れる。`openTodosDb` で開き → `createApp` → `db.close()` → 同じ path で開き直す、を「server を止めて起動し直す」とみなす。server の状態は DB の file だけにあり(`createApp` は memory に何も持たない)、`index.ts` はこの 2 つの関数をつなぐだけなので、これで足りる。`index.ts` のつなぎは tasks 4.2 で実の起動で確かめる。

### D2. path の決め方
- `TODOS_DB_PATH` が空でない文字列 → `path.resolve(cwd, TODOS_DB_PATH)`(相対は cwd 基準、絶対はそのまま)。
- 無いか空の文字列 → `fileURLToPath(new URL('../data/todos.sqlite', import.meta.url))`。`db.ts` は build の後 `server/dist/db.js`、試験では `server/src/db.ts` に在り、どちらでも 1 つ上が `server/` なので `server/data/todos.sqlite` を指す。起動時の cwd を見ない。
- 代案: `path.resolve(process.cwd(), 'server/data/todos.sqlite')`。root から `pnpm --filter server start` で起こすと cwd は `server/` になり(pnpm は package の directory で script を走らせる)`server/server/data/…` を指してしまう。採らない。
- 代案: 空の文字列を「cwd そのもの」として扱う。`path.resolve(cwd, '')` は directory になり開けないだけなので、既定に落とす方が親切。Issue の「無いとき」と同じ扱いにする。

### D3. 親 directory: `fs.mkdirSync(dirname, { recursive: true })`
開く前に毎回呼ぶ。既に在れば何もしない。better-sqlite3(SQLite)は無い file は作るが、無い directory は作らないため。
- 代案: `ENOENT` で失敗してから作って開き直す。分岐が増えるだけなので採らない。

### D4. 壊れた file の見分け方: 開く前の file の種類の検査と、SQLite の error の code
まず `fs.statSync(path, { throwIfNoEntry: false })` で path を見る。在って `isFile()` でない(directory・socket など)ときは、SQLite に渡さず、退避もせずに error を投げて起動を失敗させる(spec の「directory を指す TODOS_DB_PATH」)。macOS などで SQLite が directory を読み取り専用で開けてしまい、後の読み込みで `SQLITE_NOTADB` 系の code が出ても directory を退避しないよう、error の code に頼らずに先に止める。無いときは D3 のとおり作る。
次に file を開き、`PRAGMA quick_check` を走らせて結果が `ok` でなければ壊れたとする。開く・`quick_check`・`CREATE TABLE IF NOT EXISTS` のどこかで better-sqlite3 の `SqliteError` が出て、その `code` が `SQLITE_NOTADB` か `SQLITE_CORRUPT` で始まるときも壊れたとする。それ以外の error(`SQLITE_CANTOPEN`: 権限が無い、など)は退避せずにそのまま投げ、起動を失敗させる。長さ 0 の file は SQLite が空の DB として開くので、この判定で壊れたとはならない(spec の「長さ 0 の file からの起動」)。
- 代案: file の種類を見ず、error の code の判定だけに任せる。directory を開いたときの code は OS と SQLite の版で違いうる(確かめられていない)ので、directory が `SQLITE_NOTADB` と見なされて退避されうる。`statSync` の 1 回で決まる方を採る。
- 代案: 開けない error はすべて壊れたとみなして退避する。権限の誤りや一時的な失敗で、読めるはずの利用者の file を退避してしまう。「中身を消さない」を守るため、SQLite が「DB でない・壊れている」と言うときだけに絞る。
- 代案: `PRAGMA integrity_check`。`quick_check` より遅く(索引の中身まで照合する)、起動のたびに走るので、表の構造を見る `quick_check` を採る。
- 代案: 先頭 16 byte の `SQLite format 3\0` だけを見る。頭が正しくて中が壊れた file を見逃すので、SQLite 自身の検査に任せる。

### D5. 退避: 同じ directory の中で `fs.renameSync`
- 退避名は `<basename>.corrupt-<時刻>`、`<時刻>` は `now().toISOString()` から `-`・`:`・`.` を除いた UTC の `YYYYMMDDTHHmmssSSSZ`(例 `20260927T031500123Z`)。ms まで含め、Windows でも使えない文字(`:`)を含めない。
- 名前が既に在れば(`fs.existsSync`)`-1`、`-2` … を足して、在らない名前になるまで進める。
- `renameSync` は同じ directory の中なので、中身を読み書きせずに名前だけを変える(中身が 1 byte も変わらない)。
- 退避の前に `db.close()` で壊れた file を閉じる(開いたまま名前を変えると、閉じるときの書き込みが退避先に行きうる)。
- 壊れた file を閉じた後、同じ path に `-journal`・`-wal`・`-shm` の付いた file がまだ在れば、それも `<退避名>-journal` などへ同じく名前を変える。残すと、新しく作る空の DB に古い journal が当てられうるため。なお SQLite は開くときに読めない journal を自ら消すことがある(apply の試験で見た)ので、そのときは移すものが無く、新しい DB の隣にも残らない。
- 代案: 中身を copy してから元を消す。途中で落ちると両方が半端に残りうる。rename は 1 回の操作で済むので採らない。
- 代案: 退避の directory(`server/data/corrupt/`)を分ける。別の file system になりうるうえ、Issue の例(`<元の名前>.corrupt-<時刻>`)が同じ場所を想定しているので採らない。
- 代案: 時刻の代わりに連番だけ。いつ壊れたかが名前から分からなくなるので、時刻 + 衝突時の連番にする。

### D6. 退避の知らせ: 標準エラーに 1 行
`todos の DB file が壊れていたので <退避先の絶対 path> へ退避し、空の DB で起動します` を `warn`(既定 `console.error`)に 1 行で渡す。
- 代案: 知らせない。利用者は todo が消えたように見え、退避した file に気づけない。
- 代案: 起動を止めて人に選ばせる。Issue が「別名に退避してから作り直す」(起動する)と決めているので採らない。

### D7. `.gitignore`
`server/data/` を足す。DB の file と退避した file(`*.corrupt-*`)と journal をまとめて外す。directory ごと外すので `server/data/.gitkeep` も置かない(D3 で起動時に作るため要らない)。
- 代案: `*.sqlite` だけを外す。退避名(`todos.sqlite.corrupt-…`)と `-journal` が漏れるので採らない。

## Risks / Trade-offs

- [D4 の判定が better-sqlite3 の error の code に依る] → directory など file でないものは code を見る前に `statSync` で止める。壊れた file の側は spec の Scenario(文字列の file、4096 byte の bytes 列)を試験にし、版が上がって code が変わると試験が落ちて知らせる。
- [既定の path が `import.meta.url` に依るので、`dist/` を別の場所へ移すと既定がずれる] → 配布はこの repo の中で `node dist/index.js` だけなので受け入れる。ずらしたいときは `TODOS_DB_PATH` を渡す。
- [複数の process が同じ file を開くと、壊れていると誤って見なすことはないが書き込みが競う] → Issue の範囲外。SQLite の lock に任せる。
- [試験が既定の path の file を作ってしまう] → 既定の path の Scenario は `resolveDbPath` の返す値だけを確かめ、file は開かない。DB を開く試験はすべて一時 directory の path を使い、`afterEach` で消す。
