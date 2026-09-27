import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';

type App = ReturnType<typeof createApp>;
let app: App;

beforeEach(() => {
  app = createApp(openDb());
});

const list = async () => {
  const res = await app.request('/api/todos');
  return { status: res.status, body: (await res.json()) as Array<Record<string, unknown>> };
};

const post = async (raw: string) => {
  const res = await app.request('/api/todos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw,
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
};

const postTitle = (title: unknown) => post(JSON.stringify({ title }));

const expectRejected = async (raw: string) => {
  const before = (await list()).body.length;
  const res = await post(raw);
  expect(res.status).toBe(400);
  expect(typeof res.body.error).toBe('string');
  expect((await list()).body.length).toBe(before);
};

describe('todo-api', () => {
  it('作った直後の todo の形', async () => {
    const { body } = await postTitle('牛乳を買う');
    expect(Number.isInteger(body.id)).toBe(true);
    expect(body).toEqual({ id: body.id, title: '牛乳を買う', done: false });
  });

  it('0 件の一覧', async () => {
    expect(await list()).toEqual({ status: 200, body: [] });
  });

  it('追加した todo を含む一覧', async () => {
    const a = (await postTitle('牛乳を買う')).body;
    const b = (await postTitle('掃除する')).body;
    expect(await list()).toEqual({ status: 200, body: [a, b] });
  });

  it('題名を送った追加', async () => {
    const res = await postTitle('牛乳を買う');
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: '牛乳を買う', done: false });
    expect((await list()).body).toContainEqual(res.body);
  });

  it('前後の空白の除去', async () => {
    const res = await postTitle('  牛乳を買う \t');
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('牛乳を買う');
    const stored = (await list()).body.find((t) => t.id === res.body.id);
    expect(stored?.title).toBe('牛乳を買う');
  });

  it('題名の中の空白の保持', async () => {
    const res = await postTitle(' 本 を 返す ');
    expect(res.body.title).toBe('本 を 返す');
  });

  it('空の題名の拒否', async () => {
    await expectRejected(JSON.stringify({ title: '' }));
  });

  it('空白だけの題名の拒否', async () => {
    await expectRejected(JSON.stringify({ title: '   ' }));
    await expectRejected(JSON.stringify({ title: ' \t\n ' }));
  });

  it('題名の無い body の拒否', async () => {
    await expectRejected('{}');
  });

  it('文字列でない題名の拒否', async () => {
    await expectRejected(JSON.stringify({ title: 123 }));
    await expectRejected(JSON.stringify({ title: null }));
    await expectRejected(JSON.stringify({ title: ['a'] }));
  });

  it('JSON でない body の拒否', async () => {
    await expectRejected('title=a');
    await expectRejected('"a"');
  });
});

const patch = async (id: unknown, raw: string) => {
  const res = await app.request(`/api/todos/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: raw,
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
};

const patchDone = (id: unknown, done: unknown) => patch(id, JSON.stringify({ done }));

describe('todo-api 完了の切り替え', () => {
  it('完了にする', async () => {
    const made = (await postTitle('牛乳を買う')).body;
    const res = await patchDone(made.id, true);
    expect(res).toEqual({ status: 200, body: { id: made.id, title: '牛乳を買う', done: true } });
  });

  it('未完了に戻す', async () => {
    const made = (await postTitle('牛乳を買う')).body;
    await patchDone(made.id, true);
    const res = await patchDone(made.id, false);
    expect(res).toEqual({ status: 200, body: { id: made.id, title: '牛乳を買う', done: false } });
  });

  it('同じ値の再送', async () => {
    const made = (await postTitle('牛乳を買う')).body;
    const res = await patchDone(made.id, false);
    expect(res.status).toBe(200);
    expect(res.body.done).toBe(false);
  });

  it('一覧への反映', async () => {
    const a = (await postTitle('牛乳を買う')).body;
    const b = (await postTitle('掃除する')).body;
    await patchDone(b.id, true);
    expect(await list()).toEqual({
      status: 200,
      body: [
        { id: a.id, title: '牛乳を買う', done: false },
        { id: b.id, title: '掃除する', done: true },
      ],
    });
  });

  it('done 以外の key の無視', async () => {
    const made = (await postTitle('牛乳を買う')).body;
    const res = await patch(made.id, JSON.stringify({ done: true, title: '掃除する', id: 999 }));
    const expected = { id: made.id, title: '牛乳を買う', done: true };
    expect(res).toEqual({ status: 200, body: expected });
    expect((await list()).body).toEqual([expected]);
  });

  const expectPatchRejected = async (id: unknown, raw: string, status: number) => {
    const before = (await list()).body;
    const res = await patch(id, raw);
    expect(res.status).toBe(status);
    expect(typeof res.body.error).toBe('string');
    expect((await list()).body).toEqual(before);
  };

  it('存在しない id の拒否', async () => {
    const made = (await postTitle('牛乳を買う')).body;
    await expectPatchRejected((made.id as number) + 1, JSON.stringify({ done: true }), 404);
  });

  it('数値として読めない id の拒否', async () => {
    await postTitle('牛乳を買う');
    for (const id of ['abc', '1.5', '0', '-1']) {
      await expectPatchRejected(id, JSON.stringify({ done: true }), 404);
    }
  });

  it('存在しない id と不正な body', async () => {
    const made = (await postTitle('牛乳を買う')).body;
    await expectPatchRejected((made.id as number) + 1, '{}', 404);
  });

  it('done の無い body の拒否', async () => {
    const made = (await postTitle('牛乳を買う')).body;
    await expectPatchRejected(made.id, '{}', 400);
    await expectPatchRejected(made.id, JSON.stringify({ title: '掃除する' }), 400);
  });

  it('真偽値でない done の拒否', async () => {
    const made = (await postTitle('牛乳を買う')).body;
    for (const done of ['true', 1, 0, null]) {
      await expectPatchRejected(made.id, JSON.stringify({ done }), 400);
    }
  });

  it('JSON でない完了の body の拒否', async () => {
    const made = (await postTitle('牛乳を買う')).body;
    for (const raw of ['done=true', 'true', '[true]']) {
      await expectPatchRejected(made.id, raw, 400);
    }
  });
});
