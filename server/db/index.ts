import Database from "better-sqlite3";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "../env.js";

mkdirSync(dirname(env.DB_PATH), { recursive: true });

export const db = new Database(env.DB_PATH);
db.pragma("journal_mode = WAL");

const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf-8");
db.exec(schema);
