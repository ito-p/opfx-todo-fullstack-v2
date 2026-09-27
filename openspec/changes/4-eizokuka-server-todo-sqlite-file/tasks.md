# Tasks

## 1. 保存の path

- [ ] 1.1 `server/src/db.ts` に `resolveDbPath(env, cwd = process.cwd())` を足す(design の D1・D2: 空でない `TODOS_DB_PATH` は `path.resolve(cwd, …)`、無いか空なら `import.meta.url` から求めた `server/data/todos.sqlite`)。todo-storage の Scenario「相対の TODOS_DB_PATH」「既定の保存の file」「cwd に依らない既定の保存の file」「空の TODOS_DB_PATH」の題名をそのまま試験名にした試験を `server/test/storage.test.ts` に足す(既定の path は、試験の file の場所から求めた repo の `server/data/todos.sqlite` の絶対 path と比べ、file は開かない)。確かめ方: `pnpm --filter server test` が通り、`git status --porcelain server/data` が何も出さない

## 2. file の DB を開く・再起動・無い file

- [ ] 2.1 `server/src/db.ts` に `openTodosDb(path, { now, warn })` を足し、D3 のとおり開く前に親 directory を `mkdirSync(…, { recursive: true })` で作る(壊れた file の扱いは 3.1)。todo-storage の Scenario「再起動の後の追加した todo」「再起動の後の完了状態」「再起動の後の削除」「再起動の後の id の続き」「TODOS_DB_PATH の指す file への保存」「無い file からの起動」「無い親 directory の作成」「長さ 0 の file からの起動」の題名をそのまま試験名にした試験を `server/test/storage.test.ts` に足す(D1: `openTodosDb` → `createApp` → `db.close()` → 同じ path で開き直すを再起動とする。path は `fs.mkdtempSync(os.tmpdir())` の一時 directory の中で、`afterEach` で消す)。確かめ方: `pnpm --filter server test` が既存の試験と新しい試験のすべてで通る

## 3. 壊れた file の退避

- [ ] 3.1 `openTodosDb` に D4〜D6 を足す(`quick_check` と `SQLITE_NOTADB`・`SQLITE_CORRUPT*` で壊れたと見分け、`db.close()` の後に `<basename>.corrupt-<YYYYMMDDTHHmmssSSSZ>` へ `renameSync`、名前が在れば `-1`・`-2` …、在れば `-journal`・`-wal`・`-shm` も同じく退避、`warn` に退避先の絶対 path を含む 1 行、それ以外の error はそのまま投げる)。todo-storage の Scenario「壊れた file の退避」「退避した file の中身の保持」「退避の後の保存」「同じ時刻の退避名の衝突」「退避の標準エラーへの記録」「directory を指す TODOS_DB_PATH」の題名をそのまま試験名にした試験を足す(衝突は `now` に `2026-09-27T03:15:00.123Z` を返す関数を渡す。標準エラーは `warn` の spy と、`warn` を渡さないときの `console.error` の spy で確かめる)。壊れた file の隣に置いた `<path>-journal` が退避名 + `-journal` に移り、元の path の隣に残らないことの試験も足す。確かめ方: `pnpm --filter server test` がすべて通る

## 4. 起動のつなぎと全体の確かめ

- [ ] 4.1 `server/src/index.ts` を `createApp(openTodosDb(resolveDbPath(process.env)))` にし、`.gitignore` に `server/data/` を足す(D7)。確かめ方: `pnpm build` が通り、`git check-ignore server/data/todos.sqlite server/data/todos.sqlite.corrupt-20260927T031500123Z` が 2 行とも出す
- [ ] 4.2 実の process で再起動を確かめる。確かめ方: 一時 directory の path を `TODOS_DB_PATH` に渡して `node server/dist/index.js` を起動し、`curl` で「牛乳を買う」を POST して止め、同じ `TODOS_DB_PATH` で起動し直した `GET /api/todos` に「牛乳を買う」が在る。続けて `TODOS_DB_PATH` を渡さずに repo の根と `server/` のそれぞれから起動して POST し、どちらも `server/data/todos.sqlite` ができて(`server/server/data` はできない)、`git status --porcelain` に `server/data` が出ないことを見て、確かめの後に `server/data/` を消す
- [ ] 4.3 root で通す。確かめ方: `pnpm test` と `pnpm build` が通り、`pnpm install --frozen-lockfile` も通る(依存を足していないので `pnpm-lock.yaml` は変わらない。`git diff --quiet pnpm-lock.yaml`)
