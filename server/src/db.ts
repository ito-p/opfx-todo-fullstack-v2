import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

export type Db = Database.Database;

const CREATE_TODOS = `CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0
  )`;

/** SQLite を開き、todos の table を作る。既定は memory(試験が使う。再起動で消える)。 */
export function openDb(filename = ':memory:'): Db {
  const db = new Database(filename);
  db.exec(CREATE_TODOS);
  return db;
}

/**
 * 保存の file の絶対 path(design.md D2)。空でない TODOS_DB_PATH は cwd 基準で読み、
 * 無いか空なら cwd に依らず server/data/todos.sqlite(src/ でも dist/ でも 1 つ上が server/)。
 */
export function resolveDbPath(env: { TODOS_DB_PATH?: string }, cwd: string = process.cwd()): string {
  const raw = env.TODOS_DB_PATH;
  if (raw !== undefined && raw !== '') return path.resolve(cwd, raw);
  return fileURLToPath(new URL('../data/todos.sqlite', import.meta.url));
}

export type OpenTodosDbOptions = {
  now?: () => Date;
  warn?: (line: string) => void;
};

/** SQLite が「DB でない・壊れている」と言う error か(design.md D4)。 */
const isCorruptError = (e: unknown): boolean => {
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === 'string' && (code === 'SQLITE_NOTADB' || code.startsWith('SQLITE_CORRUPT'));
};

class CorruptDbError extends Error {}

/** 開いて検査し、table を作る。壊れていれば CorruptDbError を投げる(開いた db は閉じる)。 */
function openChecked(file: string): Db {
  let db: Db | undefined;
  try {
    db = new Database(file);
    const result = db.pragma('quick_check', { simple: true });
    if (result !== 'ok') throw new CorruptDbError(`quick_check: ${String(result)}`);
    db.exec(CREATE_TODOS);
    return db;
  } catch (e) {
    db?.close();
    if (e instanceof CorruptDbError || isCorruptError(e)) throw new CorruptDbError(String(e));
    throw e;
  }
}

/** `20260927T031500123Z` の形の UTC の時刻(design.md D5)。 */
const stamp = (d: Date) => d.toISOString().replace(/[-:.]/g, '');

/** 在らない退避名を選ぶ。同じ名前が在れば -1、-2 … を足す(design.md D5)。 */
function corruptPath(file: string, now: Date): string {
  const base = `${file}.corrupt-${stamp(now)}`;
  let candidate = base;
  for (let n = 1; fs.existsSync(candidate); n++) candidate = `${base}-${n}`;
  return candidate;
}

/**
 * 保存の file の DB を開く(design.md D1・D3〜D6)。親 directory を作り、通常の file でない path は
 * 退避せずに投げる。壊れた file は中身を変えずに `<名前>.corrupt-<時刻>` へ名前を変え、空の DB で開き直す。
 */
export function openTodosDb(file: string, options: OpenTodosDbOptions = {}): Db {
  const now = options.now ?? (() => new Date());
  const warn = options.warn ?? ((line: string) => console.error(line));

  const stat = fs.statSync(file, { throwIfNoEntry: false });
  if (stat !== undefined && !stat.isFile()) {
    throw new Error(`todos の DB の path が通常の file ではありません: ${file}`);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });

  try {
    return openChecked(file);
  } catch (e) {
    if (!(e instanceof CorruptDbError)) throw e;
  }

  const moved = corruptPath(file, now());
  fs.renameSync(file, moved);
  for (const suffix of ['-journal', '-wal', '-shm']) {
    if (fs.existsSync(file + suffix)) fs.renameSync(file + suffix, moved + suffix);
  }
  warn(`todos の DB file が壊れていたので ${moved} へ退避し、空の DB で起動します`);
  return openChecked(file);
}
