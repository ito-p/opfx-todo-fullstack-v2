import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { openTodosDb, resolveDbPath, type Db, type OpenTodosDbOptions } from '../src/db.js';

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.resolve(serverDir, '..');
const defaultPath = path.join(serverDir, 'data', 'todos.sqlite');

let tmp: string;
const opened: Db[] = [];
const quiet: OpenTodosDbOptions = { warn: () => {} };

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'todos-storage-'));
});

afterEach(() => {
  for (const db of opened.splice(0)) if (db.open) db.close();
  vi.restoreAllMocks();
  fs.rmSync(tmp, { recursive: true, force: true });
});

/** server の起動: 保存の file を開いて app を作る。止めるのは stop()。 */
const start = (file: string, options: OpenTodosDbOptions = quiet) => {
  const db = openTodosDb(file, options);
  opened.push(db);
  const app = createApp(db);
  const call = async (url: string, init?: RequestInit) => {
    const res = await app.request(url, init);
    const text = await res.text();
    return { status: res.status, body: text === '' ? undefined : (JSON.parse(text) as unknown) };
  };
  return {
    list: () => call('/api/todos') as Promise<{ status: number; body: Array<Record<string, unknown>> }>,
    post: async (title: string) =>
      (
        await call('/api/todos', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title }),
        })
      ).body as Record<string, unknown>,
    patch: (id: unknown, done: boolean) =>
      call(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ done }),
      }),
    del: (id: unknown) => call(`/api/todos/${id}`, { method: 'DELETE' }),
    stop: () => db.close(),
  };
};

const corruptFiles = (dir: string) => fs.readdirSync(dir).filter((n) => n.includes('.corrupt-'));

describe('todo-storage 保存の path', () => {
  it('相対の TODOS_DB_PATH', () => {
    expect(resolveDbPath({ TODOS_DB_PATH: 'sub/todos.sqlite' }, tmp)).toBe(path.join(tmp, 'sub', 'todos.sqlite'));
  });

  it('既定の保存の file', () => {
    expect(resolveDbPath({})).toBe(defaultPath);
    expect(path.isAbsolute(resolveDbPath({}))).toBe(true);
  });

  it('cwd に依らない既定の保存の file', () => {
    for (const cwd of [repoDir, serverDir, tmp]) {
      expect(resolveDbPath({}, cwd)).toBe(defaultPath);
    }
  });

  it('空の TODOS_DB_PATH', () => {
    expect(resolveDbPath({ TODOS_DB_PATH: '' }, tmp)).toBe(resolveDbPath({}, tmp));
    expect(resolveDbPath({ TODOS_DB_PATH: '' }, tmp)).toBe(defaultPath);
  });

  it('絶対の TODOS_DB_PATH はそのまま使う', () => {
    const abs = path.join(tmp, 'abs.sqlite');
    expect(resolveDbPath({ TODOS_DB_PATH: abs }, repoDir)).toBe(abs);
  });
});

describe('todo-storage 再起動と無い file', () => {
  it('再起動の後の追加した todo', async () => {
    const file = path.join(tmp, 'todos.sqlite');
    const s1 = start(file);
    const a = await s1.post('牛乳を買う');
    const b = await s1.post('掃除する');
    s1.stop();
    const s2 = start(file);
    expect(await s2.list()).toEqual({ status: 200, body: [a, b] });
  });

  it('再起動の後の完了状態', async () => {
    const file = path.join(tmp, 'todos.sqlite');
    const s1 = start(file);
    const a = await s1.post('牛乳を買う');
    const b = await s1.post('掃除する');
    expect((await s1.patch(b.id, true)).status).toBe(200);
    s1.stop();
    const s2 = start(file);
    expect((await s2.list()).body).toEqual([
      { ...a, done: false },
      { ...b, done: true },
    ]);
  });

  it('再起動の後の削除', async () => {
    const file = path.join(tmp, 'todos.sqlite');
    const s1 = start(file);
    const a = await s1.post('牛乳を買う');
    const b = await s1.post('掃除する');
    const c = await s1.post('本を返す');
    expect((await s1.del(b.id)).status).toBe(204);
    s1.stop();
    const s2 = start(file);
    expect((await s2.list()).body).toEqual([a, c]);
  });

  it('再起動の後の id の続き', async () => {
    const file = path.join(tmp, 'todos.sqlite');
    const s1 = start(file);
    await s1.post('牛乳を買う');
    const b = await s1.post('掃除する');
    expect((await s1.del(b.id)).status).toBe(204);
    s1.stop();
    const s2 = start(file);
    const c = await s2.post('本を返す');
    expect(c.id as number).toBeGreaterThan(b.id as number);
  });

  it('TODOS_DB_PATH の指す file への保存', async () => {
    const file = resolveDbPath({ TODOS_DB_PATH: path.join(tmp, 'todos-test.sqlite') });
    const s1 = start(file);
    await s1.post('牛乳を買う');
    s1.stop();
    expect(fs.statSync(file).isFile()).toBe(true);
    const s2 = start(file);
    expect((await s2.list()).body.map((t) => t.title)).toContain('牛乳を買う');
  });

  it('無い file からの起動', async () => {
    const file = path.join(tmp, 'none.sqlite');
    expect(fs.existsSync(file)).toBe(false);
    const s = start(file);
    expect(await s.list()).toEqual({ status: 200, body: [] });
    expect(fs.statSync(file).isFile()).toBe(true);
  });

  it('無い親 directory の作成', async () => {
    const file = path.join(tmp, 'a', 'b', 'todos.sqlite');
    const s = start(file);
    expect(fs.statSync(path.join(tmp, 'a', 'b')).isDirectory()).toBe(true);
    expect(fs.statSync(file).isFile()).toBe(true);
    expect((await s.list()).body).toEqual([]);
  });

  it('長さ 0 の file からの起動', async () => {
    const file = path.join(tmp, 'todos.sqlite');
    fs.writeFileSync(file, '');
    const s1 = start(file);
    expect((await s1.list()).body).toEqual([]);
    expect(corruptFiles(tmp)).toEqual([]);
    await s1.post('牛乳を買う');
    s1.stop();
    const s2 = start(file);
    expect((await s2.list()).body.map((t) => t.title)).toEqual(['牛乳を買う']);
  });
});

describe('todo-storage 壊れた file', () => {
  const garbage = () => Buffer.from(Array.from({ length: 4096 }, (_, i) => (i * 31 + 7) % 256));

  it('壊れた file の退避', async () => {
    const file = path.join(tmp, 'todos.sqlite');
    fs.writeFileSync(file, 'これは SQLite ではない');
    const s = start(file);
    expect(await s.list()).toEqual({ status: 200, body: [] });
    const moved = corruptFiles(tmp);
    expect(moved).toHaveLength(1);
    expect(moved[0]).toMatch(/^todos\.sqlite\.corrupt-\d{8}T\d{9}Z$/);
    expect(fs.readFileSync(file).subarray(0, 16).toString('latin1')).toBe('SQLite format 3\0');
  });

  it('退避した file の中身の保持', () => {
    const file = path.join(tmp, 'todos.sqlite');
    const bytes = garbage();
    expect(bytes.subarray(0, 16).toString('latin1')).not.toBe('SQLite format 3\0');
    fs.writeFileSync(file, bytes);
    start(file);
    const moved = corruptFiles(tmp);
    expect(moved).toHaveLength(1);
    expect(fs.readFileSync(path.join(tmp, moved[0]!)).equals(bytes)).toBe(true);
  });

  it('退避の後の保存', async () => {
    const file = path.join(tmp, 'todos.sqlite');
    fs.writeFileSync(file, garbage());
    const s1 = start(file);
    await s1.post('牛乳を買う');
    s1.stop();
    const s2 = start(file);
    expect((await s2.list()).body.map((t) => t.title)).toEqual(['牛乳を買う']);
    expect(corruptFiles(tmp)).toHaveLength(1);
  });

  it('同じ時刻の退避名の衝突', () => {
    const file = path.join(tmp, 'todos.sqlite');
    const taken0 = path.join(tmp, 'todos.sqlite.corrupt-20260927T031500123Z');
    const taken1 = `${taken0}-1`;
    fs.writeFileSync(taken0, 'first');
    fs.writeFileSync(taken1, 'second');
    fs.writeFileSync(file, 'これは SQLite ではない');
    start(file, { ...quiet, now: () => new Date('2026-09-27T03:15:00.123Z') });
    expect(fs.readFileSync(`${taken0}-2`, 'utf8')).toBe('これは SQLite ではない');
    expect(fs.readFileSync(taken0, 'utf8')).toBe('first');
    expect(fs.readFileSync(taken1, 'utf8')).toBe('second');
  });

  it('退避の標準エラーへの記録', () => {
    const file = path.join(tmp, 'todos.sqlite');
    fs.writeFileSync(file, 'これは SQLite ではない');
    const warn = vi.fn();
    start(file, { warn });
    const moved = path.join(tmp, corruptFiles(tmp)[0]!);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain(moved);

    // warn を渡さないときは console.error(標準エラー)に 1 行書く。
    fs.rmSync(file);
    fs.writeFileSync(file, 'これも SQLite ではない');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    opened.push(openTodosDb(file));
    const second = corruptFiles(tmp).map((n) => path.join(tmp, n)).find((p) => p !== moved)!;
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0]![0])).toContain(second);
    expect(path.isAbsolute(second)).toBe(true);
  });

  it('壊れた file の古い journal を新しい DB の隣に残さない', async () => {
    const file = path.join(tmp, 'todos.sqlite');
    fs.writeFileSync(file, 'これは SQLite ではない');
    fs.writeFileSync(`${file}-journal`, 'old journal');
    const s = start(file);
    // SQLite が開くときに読めない journal を消すことがある。残っていれば退避名 + -journal へ移す(design.md D5)。
    const moved = corruptFiles(tmp).find((n) => !n.endsWith('-journal'))!;
    const movedJournal = path.join(tmp, `${moved}-journal`);
    if (fs.existsSync(movedJournal)) expect(fs.readFileSync(movedJournal, 'utf8')).toBe('old journal');
    expect(fs.existsSync(`${file}-journal`)).toBe(false);
    expect((await s.list()).body).toEqual([]);
  });

  it('退避の前に残る journal の退避', () => {
    const file = path.join(tmp, 'todos.sqlite');
    fs.writeFileSync(file, 'これは SQLite ではない');
    // 検査で閉じた後に在る sidecar(-wal)は、退避名 + 同じ末尾へ移す。
    const realRename = fs.renameSync;
    const spy = vi.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      if (from === file) fs.writeFileSync(`${file}-wal`, 'old wal');
      return realRename(from, to);
    });
    start(file);
    spy.mockRestore();
    const moved = corruptFiles(tmp).find((n) => !n.endsWith('-wal'))!;
    expect(fs.readFileSync(path.join(tmp, `${moved}-wal`), 'utf8')).toBe('old wal');
    expect(fs.existsSync(`${file}-wal`)).toBe(false);
  });

  it('directory を指す TODOS_DB_PATH', () => {
    const dir = path.join(tmp, 'todos.sqlite');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'keep.txt'), '残す');
    expect(() => openTodosDb(dir, quiet)).toThrow();
    expect(fs.statSync(dir).isDirectory()).toBe(true);
    expect(fs.readdirSync(dir)).toEqual(['keep.txt']);
    expect(fs.readFileSync(path.join(dir, 'keep.txt'), 'utf8')).toBe('残す');
    expect(corruptFiles(tmp)).toEqual([]);
  });
});
