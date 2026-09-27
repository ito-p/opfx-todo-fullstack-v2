# Design

## Context

repo は README と方針ファイルだけで、製品のコードは無い(proposal.md の Why)。AGENTS.md が技術の枠を決めている: pnpm workspaces、server は Hono + TypeScript + better-sqlite3、web は Vite + TypeScript の素の DOM、試験は vitest。CI(`.github/workflows/test.yml`)は pnpm 10・Node 22 で `pnpm install --frozen-lockfile` / `pnpm test` / `pnpm build` を走らせ、触れない。画面の正本は 共有の Figma ファイル(`<figma-file-key>`)の Screens ページ(`0:1`)で、T1・T1a・T1b の frame は既に在る。

rubric の該当: [ui](画面を足す)、[api](route を足す)、[db](table を足す)、[new-capability-design]。

## 画面(docs/design の規則の形)

### 画面の階層

```
todo
+-- T1 todo 一覧(frame 2:2、480×400)
    +-- T1a 0 件(frame 2:16、差分)
    +-- T1b 完了あり(frame 5:2、差分。Issue 2 で扱う。この change では描かない)
```

### Screens ページの配置(読み戻した実値)

| 行 × 列 | 差分の群 | 線 |
|---|---|---|
| 0 行: T1(x 0)→ T1a(x 544)→ T1b(x 1088) | T1 → T1a → T1b | 群 `flow-lines`(2:26)に灰 #CCCCCC・太さ 10・矢印なしの線 2 本: 2:25「T1 -> T1a 差分」、5:20「T1a -> T1b 差分」 |

列の幅 = 480 + 64 = 544 で、規則(docs/design/README.md)どおり。線の始点 (480, 200) は T1 の右端の高さの中央、終点 (544, 200) は T1a の左端の高さの中央。

### 状態と遷移

| 画面 | 状態(frame) | いつ | 遷移 |
|---|---|---|---|
| T1 | 一覧(2:2) | 一覧が 1 件以上 | 追加 → 同じ T1 に行が 1 つ増える |
| T1 | 0 件 T1a(2:16) | 一覧が 0 件 | 追加に成功 → T1 |
| T1 | 完了あり T1b(5:2) | Issue 2 | この change では出ない |

ページを跨ぐ遷移は無い。

### 作ったもの

この change は Figma に frame を足さない。使う frame は既存の T1(2:2)と T1a(2:16)で、`get_metadata`・`get_design_context` で読み戻した実値を `docs/design/specs/T1-T1a.md` に写す。規則は `docs/design/README.md`、画面の一覧と配置は `docs/design/screens.md` に書く。

## Goals / Non-Goals

**Goals:**
- workspaces・試験・build・CI が最初から通る骨組み。後の Issue が route と行の操作を足すだけで済む形。
- T1・T1a を frame の実値(寸法・色・文字)どおりに描く。

**Non-Goals:**
- 完了の切り替え・削除・ファイルへの永続化(Issue 2・3・4)。T1b の描画。
- 題名の長さの上限、web の失敗の表示(文言が Figma に無い)。

## Decisions

### D1. 応答の形: 一覧は素の配列、追加は 201 で todo そのもの
`GET /api/todos` → 200 `Todo[]`、`POST /api/todos` → 201 `Todo`、失敗は 400 `{ "error": string }`。`Todo = { id: number, title: string, done: boolean }`。
- 代案: `{ "todos": [...] }` で包む。将来 paging の項目を足せるが、この規模では使う予定が無く、web の読みが 1 段増えるだけなので採らない。
- 代案: POST を 200 で返す。資源を作った応答として 201 が HTTP の意味に合い、Issue の想定とも同じ。

### D2. 並び順: 作られた順(id の昇順)
新しい行は末尾に加わる。T1 は form が上、行が下なので、追加した行は form から遠い末尾に出る。
- 代案: 新しい順(降順)。入れた直後の行が form の真下に見える利点はあるが、Issue の「一覧に行が加わる」と Figma の見本(追加順に読める並び)に照らし昇順を採る。後で変えるときは todo-api の spec を MODIFIED にする。

### D3. 題名の検証は server が正、web は空白だけを送らない
server が trim 後に空なら 400。web は trim 後に空なら送らない(無駄な 400 を避ける)。web は trim せずに送り、正規化は server だけが持つ(規則が 1 か所)。
- 代案: web も 400 を受けて失敗を表示する。Figma に失敗の表示の frame が無いので、この change では入力を残すだけにする。

### D4. 永続化: memory 上の SQLite、`createApp(db)` で差し込む
server は `new Database(':memory:')` を開き、`todos(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0)` を作る。app は `createApp(db)` で db を受け、試験は試験ごとに新しい memory の db を渡し、`app.request()` で HTTP を通す(port を開かない)。
- 代案: 配列で持つ。Issue 4 でファイルの SQLite に替えるとき store を書き直すことになるので、最初から SQL で書き、Issue 4 では db の開き方だけを変える。

### D5. 同じ origin: Vite の dev server の proxy
web は常に相対の `/api/todos` を呼ぶ。開発時は `vite.config.ts` の `server.proxy` で `/api` を `http://localhost:8787`(server の既定の port、`PORT` で上書き)へ流す。
- 代案: server に CORS を足す。origin が 2 つになり本番の配置も縛るので採らない。本番の配信方法はこの change では決めない(`vite build` の出力を作るまで)。

### D6. web の構造: 素の DOM を描く関数と、fetch を包む api
`web/src/api.ts`(`listTodos` / `createTodo`、`fetch` を差し替えられる)と `web/src/app.ts`(`mountApp(root, api)`: 描画と操作)に分け、`main.ts` は `#app` に mount するだけ。試験は vitest の jsdom 環境で `mountApp` に偽の api を渡す。CSS は `web/src/style.css` に frame の値を素の CSS で書く(Tailwind などは入れない)。
- 代案: Web Components。部品が 1 画面分しか無く、素の関数で足りる。

### D7. まだ動かないチェックボックス
`<input type="checkbox">` を `appearance: none` で frame の箱(20×20、枠 1px #A3A3A3、角丸 4)に描き、`click` で `preventDefault()` して印が付かないようにする。削除は `<button type="button">削除</button>` に処理を付けない。Issue 2・3 はここに処理を足す。
- 代案: `disabled` にする。押せない見た目(灰色・カーソル)になり frame と違うので採らない。

### D8. 文字の書体
frame は Noto Sans JP。`font-family: "Noto Sans JP", sans-serif` と書くだけで web font は読み込まない(外部への通信を足さない)。入っていない環境では sans-serif で描かれる。
- 代案: Google Fonts を読む。外部依存が増えるので、必要になれば別の Issue で。

### D9. workspaces と build
root の `package.json` は `"test": "pnpm -r test"`、`"build": "pnpm -r build"`。server は `tsc`(`dist/` へ)、web は `tsc --noEmit && vite build`。`pnpm-workspace.yaml` に `packages: [server, web]` と、pnpm 10 が既定で止める install script を better-sqlite3 に許す `onlyBuiltDependencies`。lockfile は CI と同じ pnpm 10 で作る(手元の pnpm 12 の lockfile の形が CI と食い違わないように `npx pnpm@10 install`)。
- 代案: `packageManager` で pnpm を固定する。CI の `pnpm/action-setup` の `version: 10` と二重指定になり action が失敗しうるので書かない。

## Risks / Trade-offs

- [better-sqlite3 は native module] → CI(Node 22、ubuntu)には prebuild が在る。install script を許していないと require で落ちるので `onlyBuiltDependencies` を書き、`pnpm test` で server の試験が db を開くことで確かめる。
- [手元と CI の pnpm の版の違い] → lockfile を pnpm 10 で作り、`npx pnpm@10 install --frozen-lockfile` を手元でも通してから commit する。
- [memory の db は再起動で消える] → Issue の想定どおり。Issue 4 で扱う。
- [書体が環境で変わる] → 寸法は box の高さで固定しているので、行の高さ 44 などは書体に依らない。
