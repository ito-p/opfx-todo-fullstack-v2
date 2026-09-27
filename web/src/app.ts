import type { Api, Todo } from './api';

const EMPTY_TEXT = 'まだ todo がありません';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** T1 の todo-item。チェックボックスと削除はまだ何もしない(design.md D7)。 */
function renderItem(todo: Todo): HTMLLIElement {
  const item = el('li', 'todo-item');
  item.dataset.id = String(todo.id);

  const checkbox = el('input', 'checkbox');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.done;
  checkbox.setAttribute('aria-label', `${todo.title} を完了にする`);
  checkbox.addEventListener('click', (event) => event.preventDefault());

  const title = el('span', 'todo-title', todo.title);

  const del = el('button', 'delete-button', '削除');
  del.type = 'button';

  item.append(checkbox, title, del);
  return item;
}

/**
 * T1(一覧)と T1a(0 件)を root に描き、起動時の一覧の読み込みを返す。
 * 読み込みに失敗したときは見出しと form だけを描く(design.md の Non-Goals)。
 */
export function mountApp(root: HTMLElement, api: Api): Promise<void> {
  const app = el('main', 'app');
  const heading = el('h1', 'title', 'todo');

  const form = el('form', 'add-form');
  const input = el('input', 'title-input');
  input.type = 'text';
  input.name = 'title';
  input.placeholder = '題名を入力';
  input.setAttribute('aria-label', '題名');
  const addButton = el('button', 'add-button', '追加');
  addButton.type = 'submit';
  form.append(input, addButton);

  const body = el('div', 'body');
  app.append(heading, form, body);
  root.replaceChildren(app);

  let list: HTMLUListElement | null = null;

  const showEmpty = () => {
    list = null;
    const empty = el('div', 'empty-message');
    empty.append(el('p', 'empty-text', EMPTY_TEXT));
    body.replaceChildren(empty);
  };

  const append = (todo: Todo) => {
    if (!list) {
      list = el('ul', 'todo-list');
      body.replaceChildren(list);
    }
    list.append(renderItem(todo));
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = input.value;
    if (title.trim() === '') return;
    try {
      const todo = await api.createTodo(title);
      append(todo);
      input.value = '';
    } catch {
      // 失敗の表示は後の Issue。行を加えず、入力を残す。
    }
  });

  return api.listTodos().then(
    (todos) => {
      if (todos.length === 0) showEmpty();
      else todos.forEach(append);
    },
    () => {
      // 起動時の失敗は表示しない(見出しと form だけ)。
    },
  );
}
