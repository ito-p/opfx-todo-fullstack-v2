import { Hono } from 'hono';
import type { Db } from './db.js';

export type Todo = { id: number; title: string; done: boolean };

type Row = { id: number; title: string; done: number };

const toTodo = (row: Row): Todo => ({ id: row.id, title: row.title, done: row.done !== 0 });

/** todo の一覧と追加の API(design.md D1〜D4)。db を受けるので試験は memory の db を渡す。 */
export function createApp(db: Db): Hono {
  const app = new Hono();
  const selectAll = db.prepare<[], Row>('SELECT id, title, done FROM todos ORDER BY id ASC');
  const insert = db.prepare<[string], Row>(
    'INSERT INTO todos (title, done) VALUES (?, 0) RETURNING id, title, done',
  );

  app.get('/api/todos', (c) => c.json(selectAll.all().map(toTodo), 200));

  app.post('/api/todos', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'body は JSON の object でなければなりません' }, 400);
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return c.json({ error: 'body は JSON の object でなければなりません' }, 400);
    }
    const title = (body as { title?: unknown }).title;
    if (typeof title !== 'string') {
      return c.json({ error: 'title は文字列でなければなりません' }, 400);
    }
    const trimmed = title.trim();
    if (trimmed === '') {
      return c.json({ error: 'title は空にできません' }, 400);
    }
    const row = insert.get(trimmed) as Row;
    return c.json(toTodo(row), 201);
  });

  return app;
}
