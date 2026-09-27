import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Api, Todo } from '../src/api';
import { mountApp } from '../src/app';

type FakeApi = Api & { listTodos: ReturnType<typeof vi.fn>; createTodo: ReturnType<typeof vi.fn> };

const todo = (id: number, title: string): Todo => ({ id, title, done: false });

function fakeApi(initial: Todo[], create?: (title: string) => Promise<Todo>): FakeApi {
  let next = 100;
  return {
    listTodos: vi.fn(async () => initial),
    createTodo: vi.fn(create ?? (async (title: string) => todo(next++, title))),
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

  it('チェックボックスと削除ボタンの無反応', async () => {
    const api = fakeApi([todo(1, '牛乳を買う')]);
    await mountApp(root, api);
    const before = root.innerHTML;

    const checkbox = q<HTMLInputElement>('.checkbox')!;
    checkbox.click();
    q<HTMLButtonElement>('.delete-button')!.click();
    await flush();

    expect(checkbox.checked).toBe(false);
    expect(titles()).toEqual(['牛乳を買う']);
    expect(root.innerHTML).toBe(before);
    expect(api.listTodos).toHaveBeenCalledTimes(1);
    expect(api.createTodo).not.toHaveBeenCalled();
  });
});
