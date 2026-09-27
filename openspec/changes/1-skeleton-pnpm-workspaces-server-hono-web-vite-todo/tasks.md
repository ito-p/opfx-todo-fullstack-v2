# Tasks

## 1. workspaces の骨組み

- [ ] 1.1 root に `package.json`(`test`: `pnpm -r test`、`build`: `pnpm -r build`)・`pnpm-workspace.yaml`(`server`・`web`、better-sqlite3 の `onlyBuiltDependencies`)・`tsconfig.base.json`・`.gitignore`(`node_modules`・`dist`)を置き、`server/`・`web/` の `package.json` と依存を足す。確かめ方: `npx pnpm@10 install` が通り、`node -e "new (require('better-sqlite3'))(':memory:')"` を `server/` で実行して例外が出ない

## 2. server の API

- [ ] 2.1 `server/src/db.ts`(memory の SQLite を開き `todos` を作る)と `server/src/app.ts`(`createApp(db)`、`GET /api/todos`・`POST /api/todos`、D1〜D4 のとおり)を書き、todo-api の各 Scenario の題名をそのまま試験名にした `server/test/todos.test.ts` を書く。確かめ方: `pnpm --filter server test` が todo-api の 11 の Scenario の試験すべてで通る
- [ ] 2.2 `server/src/index.ts`(`@hono/node-server` で `PORT`、既定 8787 に起動)と `tsconfig.json`・`build` の script を書く。確かめ方: `pnpm --filter server build` が通り、`node server/dist/index.js` を起動して `curl -s localhost:8787/api/todos` が `[]` を返す

## 3. web の画面

- [ ] 3.1 `web/src/api.ts`・`web/src/app.ts`(`mountApp`)・`web/src/main.ts`・`web/src/style.css`・`web/index.html` を書き、T1・T1a を `docs/design/specs/T1-T1a.md` の実値どおりに描く(D6〜D8)。todo-web の各 Scenario の題名をそのまま試験名にした `web/test/app.test.ts`(jsdom)を書く。確かめ方: `pnpm --filter web test` が todo-web の 7 の Scenario の試験すべてで通る
- [ ] 3.2 `vite.config.ts` に `/api` の proxy(D5)と試験の jsdom 環境を書き、`build` の script を足す。確かめ方: `pnpm --filter web build` が通り、server と `pnpm --filter web dev` を起動して `curl -s localhost:5173/api/todos` が server と同じ応答を返す
- [ ] 3.3 画面を frame と見比べる。確かめ方: server と web の dev を起動し、0 件・3 件(牛乳を買う・掃除する・本を返す)の画面を 480 幅で撮り、Figma の T1(2:2)・T1a(2:16)の screenshot と並べて、配置・寸法・色・文言が一致する

## 4. 全体の確かめ

- [ ] 4.1 root で通す。確かめ方: `npx pnpm@10 install --frozen-lockfile`、`pnpm test`(server と web の両方の試験が走る)、`pnpm build`(両方が build される)がすべて通り、`pnpm-lock.yaml` が lockfileVersion 9.0 で commit に含まれる
- [ ] 4.2 docs/design を Figma から読み戻して検算する。確かめ方: Screens ページ(0:1)を `get_metadata` で読み戻し、`docs/design/README.md` の「検算の仕方」(1) 規則から求めた座標との不一致 0、(2) node の重なり 0、(3) 線の端点が辺の中央、(4) 線の色と太さ、がすべて満たされ、`docs/design/specs/T1-T1a.md` と `docs/design/screens.md` の値が T1(2:2)・T1a(2:16)の `get_design_context` と 1 つ残らず一致する
