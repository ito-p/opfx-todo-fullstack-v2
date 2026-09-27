import Database from 'better-sqlite3';

export type Db = Database.Database;

/** memory 上の SQLite を開き、todos の table を作る(design.md D4)。再起動で消える。 */
export function openDb(filename = ':memory:'): Db {
  const db = new Database(filename);
  db.exec(`CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0
  )`);
  return db;
}
