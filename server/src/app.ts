import { Hono } from 'hono';
import type { Db } from './db.js';

export type Todo = { id: number; title: string; done: boolean };

type Row = { id: number; title: string; done: number };

const toTodo = (row: Row): Todo => ({ id: row.id, title: row.title, done: row.done !== 0 });

/** todo の一覧・追加・完了の切り替え・削除の API。db を受けるので試験は memory の db を渡す。 */
export function createApp(db: Db): Hono {
  const app = new Hono();
  const selectAll = db.prepare<[], Row>('SELECT id, title, done FROM todos ORDER BY id ASC');
  const insert = db.prepare<[string], Row>(
    'INSERT INTO todos (title, done) VALUES (?, 0) RETURNING id, title, done',
  );
  const selectOne = db.prepare<[number], Row>('SELECT id, title, done FROM todos WHERE id = ?');
  const updateDone = db.prepare<[number, number], Row>(
    'UPDATE todos SET done = ? WHERE id = ? RETURNING id, title, done',
  );
  const deleteOne = db.prepare<[number]>('DELETE FROM todos WHERE id = ?');
  // 先頭に 0 の無い正の整数の 10 進表記だけを id と読む(design.md D2)。
  const isId = (raw: string) => /^[1-9][0-9]*$/.test(raw);
  const notFound = { error: 'todo が見つかりません' };

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

  // 完了の切り替え。id(404)を body(400)より先に判定し、body は done だけを見る。
  app.patch('/api/todos/:id', async (c) => {
    const raw = c.req.param('id');
    if (!isId(raw) || selectOne.get(Number(raw)) === undefined) {
      return c.json(notFound, 404);
    }
    const id = Number(raw);
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'body は JSON の object でなければなりません' }, 400);
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return c.json({ error: 'body は JSON の object でなければなりません' }, 400);
    }
    const done = (body as { done?: unknown }).done;
    if (typeof done !== 'boolean') {
      return c.json({ error: 'done は真偽値でなければなりません' }, 400);
    }
    // body を読む間に消されていれば、更新は行を返さない(design.md D3)。
    const row = updateDone.get(done ? 1 : 0, id);
    if (row === undefined) return c.json(notFound, 404);
    return c.json(toTodo(row), 200);
  });

  // 削除。在れば 204(body なし)、無ければ(2 回目を含む)404(design.md D1・D2)。
  app.delete('/api/todos/:id', (c) => {
    const raw = c.req.param('id');
    if (!isId(raw) || deleteOne.run(Number(raw)).changes === 0) {
      return c.json(notFound, 404);
    }
    return c.body(null, 204);
  });

  return app;
}
