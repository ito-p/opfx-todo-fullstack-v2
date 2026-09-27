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

/**
 * T1・T1b の todo-item。`done` で完了の見た目(T1b)を描く。
 * チェックボックスは応答を待ってから描き直し、送信中の再押下は送らない。
 * 削除も応答を待ち、送信中の再押下は送らない(design.md D4・D6)。確認のダイアログは出さない。
 * 削除の応答が成功したら `onRemoved(id)` を呼ぶだけで、DOM の行には触れない。
 * 行を DOM から消すことと 0 件の表示(T1a)への切り替えは、呼ぶ側(`mountApp` の `onRemoved`)が受け持つ(design.md D7)。
 */
function renderItem(todo: Todo, api: Api, onRemoved: (id: number) => void): HTMLLIElement {
  const item = el('li', 'todo-item');
  item.dataset.id = String(todo.id);
  item.dataset.done = String(todo.done);

  const checkbox = el('input', 'checkbox');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.done;
  checkbox.setAttribute(
    'aria-label',
    todo.done ? `${todo.title} を未完了に戻す` : `${todo.title} を完了にする`,
  );

  let sending = false;
  checkbox.addEventListener('click', (event) => {
    // 見た目は応答の後に描き直すので、押した瞬間の切り替えは止める。
    event.preventDefault();
    if (sending) return;
    sending = true;
    api
      .updateTodo(todo.id, !todo.done)
      .then(
        (updated) => item.replaceWith(renderItem(updated, api, onRemoved)),
        () => {
          // 失敗の表示は後の Issue。行は押す前のまま残す。
        },
      )
      .finally(() => {
        sending = false;
      });
  });

  const title = el('span', 'todo-title', todo.title);

  const del = el('button', 'delete-button', '削除');
  del.type = 'button';
  let deleting = false;
  del.addEventListener('click', () => {
    if (deleting) return;
    deleting = true;
    api.deleteTodo(todo.id).then(
      () => onRemoved(todo.id),
      () => {
        // 失敗の表示は後の Issue。行は押す前のまま残し、再び押せるようにする。
        deleting = false;
      },
    );
  });

  item.append(checkbox, title, del);
  return item;
}

/**
 * T1(一覧)・T1a(0 件)・T1b(完了あり)を root に描き、起動時の一覧の読み込みを返す。
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

  // renderItem が削除の応答の成功の後に呼ぶ callback(design.md D7)。
  // 行を DOM から消すのはここで、切り替えで行が作り直されていても、その id の今の行を消す。
  // 行が 0 になったら showEmpty() で T1a に切り替える。
  const onRemoved = (id: number) => {
    if (!list) return;
    list.querySelector(`.todo-item[data-id="${id}"]`)?.remove();
    if (list.children.length === 0) showEmpty();
  };

  const append = (todo: Todo) => {
    if (!list) {
      list = el('ul', 'todo-list');
      body.replaceChildren(list);
    }
    list.append(renderItem(todo, api, onRemoved));
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
