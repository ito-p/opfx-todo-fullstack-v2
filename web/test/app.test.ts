import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Api, Todo } from '../src/api';
import { mountApp } from '../src/app';

type FakeApi = Api & {
  listTodos: ReturnType<typeof vi.fn>;
  createTodo: ReturnType<typeof vi.fn>;
  updateTodo: ReturnType<typeof vi.fn>;
};

const todo = (id: number, title: string, done = false): Todo => ({ id, title, done });

function fakeApi(
  initial: Todo[],
  create?: (title: string) => Promise<Todo>,
  update?: (id: number, done: boolean) => Promise<Todo>,
): FakeApi {
  let next = 100;
  const byId = new Map(initial.map((t) => [t.id, t]));
  return {
    listTodos: vi.fn(async () => initial),
    createTodo: vi.fn(create ?? (async (title: string) => todo(next++, title))),
    updateTodo: vi.fn(
      update ?? (async (id: number, done: boolean) => ({ ...byId.get(id)!, done })),
    ),
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

  it('削除ボタンの無反応', async () => {
    const api = fakeApi([todo(1, '牛乳を買う')]);
    await mountApp(root, api);
    const before = root.innerHTML;

    q<HTMLButtonElement>('.delete-button')!.click();
    await flush();

    expect(titles()).toEqual(['牛乳を買う']);
    expect(root.innerHTML).toBe(before);
    expect(api.listTodos).toHaveBeenCalledTimes(1);
    expect(api.createTodo).not.toHaveBeenCalled();
    expect(api.updateTodo).not.toHaveBeenCalled();
  });
});
