export type Todo = { id: number; title: string; done: boolean };

export type Api = {
  listTodos(): Promise<Todo[]>;
  createTodo(title: string): Promise<Todo>;
  updateTodo(id: number, done: boolean): Promise<Todo>;
  /** 204 と 404(既に無い)で resolve し、それ以外で reject する(design.md D5・D8)。 */
  deleteTodo(id: number): Promise<void>;
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
    async updateTodo(id, done) {
      const res = await fetchFn(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ done }),
      });
      if (!res.ok) throw new Error(`PATCH /api/todos/${id}: ${res.status}`);
      return (await res.json()) as Todo;
    },
    async deleteTodo(id) {
      const res = await fetchFn(`/api/todos/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error(`DELETE /api/todos/${id}: ${res.status}`);
    },
  };
}
