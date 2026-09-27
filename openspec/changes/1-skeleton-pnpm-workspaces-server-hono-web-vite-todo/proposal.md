# Proposal

## Why

この repo にはまだ製品のコードが無い。todo アプリの最初の縦の一本(API で一覧と追加、web で表示と追加)を通し、後の Issue(完了の切り替え・削除・永続化)が積み上がる土台と、画面の規則を書いた docs/design を用意する(Issue #1)。

## What Changes

- pnpm workspaces を root に置き、`server/`(Hono + TypeScript + better-sqlite3)と `web/`(Vite + TypeScript の素の DOM)の 2 つの workspace を作る。root の `pnpm test` / `pnpm build` が両方を走らせ、pnpm-lock.yaml を commit する。
- server に `GET /api/todos`(一覧)と `POST /api/todos`(追加)を足す。題名は前後の空白を除いて保存し、空・空白だけ・欠落・文字列でない題名は 400 で拒む。保存先は memory 上の SQLite(再起動で消える)。
- web は起動時に一覧を読み、Figma の T1(一覧)と T1a(0 件)のとおりに描く。題名を入れて追加すると API に送り、行を加える。各行にチェックボックスと削除ボタンを描くが、押しても何も起きない。
- docs/design に whizz から写した規則(Figma の Screens ページの配置と線、画面コード、画面ごとの実値の書き方)と、T1・T1a の実値を書く。

## Capabilities

### New Capabilities
- `todo-api`: todo の一覧と追加の HTTP API(形、status、題名の検証)
- `todo-web`: todo の一覧画面(T1 / T1a)の表示と追加の操作

### Modified Capabilities
(なし)

## Impact

- 新しいファイル: root の `package.json`・`pnpm-workspace.yaml`・`pnpm-lock.yaml`・`tsconfig.base.json`、`server/**`、`web/**`、`docs/design/**`。
- 依存: hono、@hono/node-server、better-sqlite3、typescript、vitest、vite、jsdom。
- 方針ファイル(`.github/workflows`、`.factory`、`AGENTS.md`)は触らない。CI は今の workflow(`pnpm install --frozen-lockfile` / `pnpm test` / `pnpm build`)のまま通す。
