import * as path from "node:path";
import { Database } from "bun:sqlite";

export function getDb(): Database {
  const dbName = process.env.DB_NAME;

  if (!dbName) {
    throw new Error("DB_NAME is not defined");
  }

  const db = new Database(path.join("db", dbName), {
    create: true,
    strict: true,
  });
  
  db.exec("PRAGMA journal_mode = WAL;");

  return db;
}
