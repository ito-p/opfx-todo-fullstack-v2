export type Todo = { id: number; title: string; done: boolean };

export type Api = {
  listTodos(): Promise<Todo[]>;
  createTodo(title: string): Promise<Todo>;
};

/** 相対の /api を呼ぶ(design.md D5)。試験では fetch を差し替える。 */
export function createApi(fetchFn: typeof fetch = (...args) => fetch(...args)): Api {
  return {
    async listTodos() {
      const res = await fetchFn('/api/todos');
      if (!res.ok) throw new Error(`GET /api/todos: ${res.status}`);
      return (await res.json()) as Todo[];
    },
    async createTodo(title) {
      const res = await fetchFn('/api/todos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error(`POST /api/todos: ${res.status}`);
      return (await res.json()) as Todo;
    },
  };
}
