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
