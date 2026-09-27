import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { openTodosDb, resolveDbPath } from './db.js';

const port = Number(process.env.PORT ?? 8787);
// 保存の file の DB を開く(TODOS_DB_PATH、既定は server/data/todos.sqlite)。design.md D1・D2。
const app = createApp(openTodosDb(resolveDbPath(process.env)));

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`server listening on http://localhost:${info.port}`);
});
