import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApi, type Api, type Todo } from '../src/api';
import { mountApp } from '../src/app';

type FakeApi = Api & {
  listTodos: ReturnType<typeof vi.fn>;
  createTodo: ReturnType<typeof vi.fn>;
  updateTodo: ReturnType<typeof vi.fn>;
  deleteTodo: ReturnType<typeof vi.fn>;
};

const todo = (id: number, title: string, done = false): Todo => ({ id, title, done });

function fakeApi(
  initial: Todo[],
  create?: (title: string) => Promise<Todo>,
  update?: (id: number, done: boolean) => Promise<Todo>,
  remove?: (id: number) => Promise<void>,
): FakeApi {
  let next = 100;
  const byId = new Map(initial.map((t) => [t.id, t]));
  return {
    listTodos: vi.fn(async () => initial),
    createTodo: vi.fn(create ?? (async (title: string) => todo(next++, title))),
    updateTodo: vi.fn(
      update ?? (async (id: number, done: boolean) => ({ ...byId.get(id)!, done })),
    ),
    deleteTodo: vi.fn(remove ?? (async () => undefined)),
  };
}

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app')!;
});

const q = <T extends Element>(sel: string) => root.querySelector<T>(sel);
const rows = () => Array.from(root.querySelectorAll<HTMLLIElement>('.todo-item'));
const titles = () => rows().map((r) => r.querySelector('.todo-title')!.textContent);
const input = () => q<HTMLInputElement>('.title-input')!;
const flush = () => new Promise((r) => setTimeout(r, 0));
const checkboxOf = (row: Element) => row.querySelector<HTMLInputElement>('.checkbox')!;
const isDone = (row: HTMLElement) => row.dataset.done === 'true';
const deleteOf = (row: Element) => row.querySelector<HTMLButtonElement>('.delete-button')!;
const rowOf = (title: string) => rows().find((r) => r.querySelector('.todo-title')!.textContent === title)!;
const emptyText = () => q('.empty-message .empty-text')?.textContent ?? null;

async function submitWith(value: string, how: 'button' | 'enter' = 'button') {
  input().value = value;
  const form = q<HTMLFormElement>('.add-form')!;
  if (how === 'button') q<HTMLButtonElement>('.add-button')!.click();
  else form.requestSubmit();
  await flush();
}

describe('todo-web', () => {
  it('起動時の一覧の行', async () => {
    const api = fakeApi([todo(1, '牛乳を買う'), todo(2, '掃除する'), todo(3, '本を返す')]);
    await mountApp(root, api);

    expect(q('.title')!.textContent).toBe('todo');
    expect(input().placeholder).toBe('題名を入力');
    expect(q('.add-button')!.textContent).toBe('追加');
    expect(titles()).toEqual(['牛乳を買う', '掃除する', '本を返す']);
    for (const row of rows()) {
      const children = Array.from(row.children).map((c) => c.className);
      expect(children).toEqual(['checkbox', 'todo-title', 'delete-button']);
      expect(row.querySelector<HTMLInputElement>('.checkbox')!.checked).toBe(false);
      expect(row.querySelector('.delete-button')!.textContent).toBe('削除');
    }
    expect(q('.empty-message')).toBeNull();
  });

  it('0 件の画面', async () => {
    await mountApp(root, fakeApi([]));

    expect(q('.title')!.textContent).toBe('todo');
    expect(q('.add-form')).not.toBeNull();
    expect(q('.empty-message .empty-text')!.textContent).toBe('まだ todo がありません');
    expect(rows()).toHaveLength(0);
  });

  it('追加した題名の行', async () => {
    const api = fakeApi([todo(1, '牛乳を買う')]);
    await mountApp(root, api);

    await submitWith('掃除する');

    expect(api.createTodo).toHaveBeenCalledWith('掃除する');
    expect(titles()).toEqual(['牛乳を買う', '掃除する']);
    expect(input().value).toBe('');
  });

  it('0 件からの追加', async () => {
    const api = fakeApi([]);
    await mountApp(root, api);

    await submitWith('牛乳を買う', 'enter');

    expect(api.createTodo).toHaveBeenCalledWith('牛乳を買う');
    expect(q('.empty-message')).toBeNull();
    expect(titles()).toEqual(['牛乳を買う']);
  });

  it('空白だけの入力の不送信', async () => {
    const api = fakeApi([todo(1, '牛乳を買う')]);
    await mountApp(root, api);

    await submitWith('');
    await submitWith('  \t ');

    expect(api.createTodo).not.toHaveBeenCalled();
    expect(titles()).toEqual(['牛乳を買う']);
    expect(input().value).toBe('  \t ');
  });

  it('追加の失敗', async () => {
    const api = fakeApi([todo(1, '牛乳を買う')], async () => {
      throw new Error('POST /api/todos: 400');
    });
    await mountApp(root, api);

    await submitWith('掃除する');

    expect(api.createTodo).toHaveBeenCalledWith('掃除する');
    expect(titles()).toEqual(['牛乳を買う']);
    expect(input().value).toBe('掃除する');
  });

  it('起動時の完了の行', async () => {
    const api = fakeApi([todo(1, '牛乳を買う', true), todo(2, '掃除する'), todo(3, '本を返す')]);
    await mountApp(root, api);

    expect(titles()).toEqual(['牛乳を買う', '掃除する', '本を返す']);
    expect(rows().map(isDone)).toEqual([true, false, false]);
    expect(rows().map(checkboxOf).map((c) => c.checked)).toEqual([true, false, false]);
    expect(checkboxOf(rows()[0]).getAttribute('aria-label')).toBe('牛乳を買う を未完了に戻す');
  });

  it('未完了の行の完了', async () => {
    const api = fakeApi([todo(1, '牛乳を買う'), todo(2, '掃除する')]);
    await mountApp(root, api);
    const second = rows()[1];

    checkboxOf(rows()[0]).click();
    await flush();

    expect(api.updateTodo).toHaveBeenCalledTimes(1);
    expect(api.updateTodo).toHaveBeenCalledWith(1, true);
    expect(titles()).toEqual(['牛乳を買う', '掃除する']);
    const first = rows()[0];
    expect(isDone(first)).toBe(true);
    expect(checkboxOf(first).checked).toBe(true);
    expect(checkboxOf(first).getAttribute('aria-label')).toBe('牛乳を買う を未完了に戻す');
    expect(rows()[1]).toBe(second);
    expect(isDone(second)).toBe(false);
    expect(checkboxOf(second).checked).toBe(false);
  });

  it('完了の行の未完了', async () => {
    const api = fakeApi([todo(1, '牛乳を買う', true)]);
    await mountApp(root, api);

    checkboxOf(rows()[0]).click();
    await flush();

    expect(api.updateTodo).toHaveBeenCalledWith(1, false);
    const row = rows()[0];
    expect(isDone(row)).toBe(false);
    expect(checkboxOf(row).checked).toBe(false);
    expect(checkboxOf(row).getAttribute('aria-label')).toBe('牛乳を買う を完了にする');
  });

  it('応答待ちの間の再押下', async () => {
    let resolve!: (t: Todo) => void;
    const api = fakeApi([todo(1, '牛乳を買う')], undefined, () => new Promise((r) => (resolve = r)));
    await mountApp(root, api);
    const checkbox = checkboxOf(rows()[0]);

    checkbox.click();
    await flush();
    expect(checkbox.checked).toBe(false);
    expect(isDone(rows()[0])).toBe(false);
    checkbox.click();
    await flush();
    expect(checkbox.checked).toBe(false);
    expect(api.updateTodo).toHaveBeenCalledTimes(1);

    resolve(todo(1, '牛乳を買う', true));
    await flush();
    expect(isDone(rows()[0])).toBe(true);
    expect(checkboxOf(rows()[0]).checked).toBe(true);
    expect(api.updateTodo).toHaveBeenCalledTimes(1);
  });

  it('切り替えの失敗', async () => {
    const api = fakeApi([todo(1, '牛乳を買う')], undefined, async (id) => {
      throw new Error(`PATCH /api/todos/${id}: 404`);
    });
    await mountApp(root, api);
    const row = rows()[0];

    checkboxOf(row).click();
    await flush();

    expect(rows()[0]).toBe(row);
    expect(isDone(row)).toBe(false);
    expect(checkboxOf(row).checked).toBe(false);

    checkboxOf(row).click();
    await flush();
    expect(api.updateTodo).toHaveBeenCalledTimes(2);
    expect(api.updateTodo).toHaveBeenLastCalledWith(1, true);
  });

  it('切り替えの要求の失敗', async () => {
    const api = fakeApi([todo(1, '牛乳を買う', true)], undefined, async () => {
      throw new TypeError('Failed to fetch');
    });
    await mountApp(root, api);
    const row = rows()[0];

    checkboxOf(row).click();
    await flush();

    expect(rows()[0]).toBe(row);
    expect(isDone(row)).toBe(true);
    expect(checkboxOf(row).checked).toBe(true);

    checkboxOf(row).click();
    await flush();
    expect(api.updateTodo).toHaveBeenCalledTimes(2);
    expect(api.updateTodo).toHaveBeenLastCalledWith(1, false);
  });
});

describe('todo-web 行の削除', () => {
  it('削除ボタンでの行の削除', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const api = fakeApi([todo(1, '牛乳を買う'), todo(2, '掃除する'), todo(3, '本を返す')]);
    await mountApp(root, api);
    const first = rowOf('牛乳を買う');
    const third = rowOf('本を返す');

    deleteOf(rowOf('掃除する')).click();
    await flush();

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(api.deleteTodo).toHaveBeenCalledTimes(1);
    expect(api.deleteTodo).toHaveBeenCalledWith(2);
    expect(titles()).toEqual(['牛乳を買う', '本を返す']);
    expect(rows()).toEqual([first, third]);
    expect(emptyText()).toBeNull();
    confirmSpy.mockRestore();
  });

  it('完了の行の削除', async () => {
    const api = fakeApi([todo(1, '牛乳を買う', true), todo(2, '掃除する')]);
    await mountApp(root, api);

    deleteOf(rowOf('牛乳を買う')).click();
    await flush();

    expect(api.deleteTodo).toHaveBeenCalledWith(1);
    expect(titles()).toEqual(['掃除する']);
    expect(rows().map(isDone)).toEqual([false]);
  });

  it('最後の 1 件の削除', async () => {
    const api = fakeApi([todo(1, '牛乳を買う')]);
    await mountApp(root, api);

    deleteOf(rows()[0]).click();
    await flush();

    expect(api.deleteTodo).toHaveBeenCalledWith(1);
    expect(rows()).toHaveLength(0);
    expect(q('.todo-list')).toBeNull();
    expect(emptyText()).toBe('まだ todo がありません');
  });

  it('0 件にした後の追加', async () => {
    const api = fakeApi([todo(1, '牛乳を買う')]);
    await mountApp(root, api);
    deleteOf(rows()[0]).click();
    await flush();
    expect(emptyText()).toBe('まだ todo がありません');

    await submitWith('掃除する');

    expect(emptyText()).toBeNull();
    expect(titles()).toEqual(['掃除する']);
  });

  it('削除の応答待ちの間の再押下', async () => {
    let resolve!: () => void;
    const api = fakeApi(
      [todo(1, '牛乳を買う'), todo(2, '掃除する')],
      undefined,
      undefined,
      () => new Promise<void>((r) => (resolve = r)),
    );
    await mountApp(root, api);
    const row = rows()[0];

    deleteOf(row).click();
    await flush();
    expect(rows()[0]).toBe(row);
    deleteOf(row).click();
    await flush();
    expect(api.deleteTodo).toHaveBeenCalledTimes(1);
    expect(titles()).toEqual(['牛乳を買う', '掃除する']);

    resolve();
    await flush();
    expect(titles()).toEqual(['掃除する']);
    expect(api.deleteTodo).toHaveBeenCalledTimes(1);
  });

  it('既に無い todo の削除', async () => {
    // 404 の扱いは api の層で決まる(design.md D5・D8)ので、本物の createApi に fetch の偽物を渡す。
    const fetchFn = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        return new Response(JSON.stringify({ error: 'todo が見つかりません' }), { status: 404 });
      }
      return new Response(JSON.stringify([todo(1, '牛乳を買う'), todo(2, '掃除する')]), {
        status: 200,
      });
    });
    await mountApp(root, createApi(fetchFn as unknown as typeof fetch));

    deleteOf(rowOf('牛乳を買う')).click();
    await flush();

    expect(fetchFn).toHaveBeenCalledWith('/api/todos/1', { method: 'DELETE' });
    expect(titles()).toEqual(['掃除する']);
  });

  it('削除の失敗', async () => {
    const fetchFn = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        return new Response(JSON.stringify({ error: 'x' }), { status: 500 });
      }
      return new Response(JSON.stringify([todo(1, '牛乳を買う')]), { status: 200 });
    });
    await mountApp(root, createApi(fetchFn as unknown as typeof fetch));
    const row = rows()[0];
    const before = root.innerHTML;

    deleteOf(row).click();
    await flush();
    expect(rows()[0]).toBe(row);
    expect(root.innerHTML).toBe(before);

    deleteOf(row).click();
    await flush();
    const deletes = fetchFn.mock.calls.filter(([, init]) => init?.method === 'DELETE');
    expect(deletes).toEqual([
      ['/api/todos/1', { method: 'DELETE' }],
      ['/api/todos/1', { method: 'DELETE' }],
    ]);
    expect(titles()).toEqual(['牛乳を買う']);
  });

  it('削除の要求の失敗', async () => {
    const api = fakeApi([todo(1, '牛乳を買う')], undefined, undefined, async () => {
      throw new TypeError('Failed to fetch');
    });
    await mountApp(root, api);
    const row = rows()[0];
    const before = root.innerHTML;

    deleteOf(row).click();
    await flush();
    expect(rows()[0]).toBe(row);
    expect(root.innerHTML).toBe(before);

    deleteOf(row).click();
    await flush();
    expect(api.deleteTodo).toHaveBeenCalledTimes(2);
    expect(api.deleteTodo).toHaveBeenLastCalledWith(1);
  });

  it('切り替えが先に成功した後の削除の成功(design.md D7)', async () => {
    let resolveDelete!: () => void;
    const api = fakeApi(
      [todo(1, '牛乳を買う'), todo(2, '掃除する')],
      undefined,
      undefined,
      () => new Promise<void>((r) => (resolveDelete = r)),
    );
    await mountApp(root, api);
    const old = rows()[0];

    deleteOf(old).click();
    checkboxOf(old).click();
    await flush();
    // 切り替えの成功で 1 行目は作り直されている。
    expect(rows()[0]).not.toBe(old);
    expect(isDone(rows()[0])).toBe(true);

    resolveDelete();
    await flush();
    expect(titles()).toEqual(['掃除する']);
  });
});

describe('api.deleteTodo', () => {
  const apiWith = (status: number) =>
    createApi((async () => new Response(status === 204 ? null : '{}', { status })) as typeof fetch);

  it('204 で resolve する', async () => {
    await expect(apiWith(204).deleteTodo(1)).resolves.toBeUndefined();
  });

  it('404 で resolve する', async () => {
    await expect(apiWith(404).deleteTodo(1)).resolves.toBeUndefined();
  });

  it('500 で reject する', async () => {
    await expect(apiWith(500).deleteTodo(1)).rejects.toThrow('DELETE /api/todos/1: 500');
  });
});
