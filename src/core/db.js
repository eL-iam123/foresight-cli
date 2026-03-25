import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";

let sqlPromise;

export async function openDatabase(inputPath) {
  const dbPath = resolve(process.cwd(), inputPath);
  mkdirSync(dirname(dbPath), { recursive: true });

  const SQL = await loadSqlJs();
  const hasExistingDb = existsSync(dbPath) && statSync(dbPath).size > 0;
  const db = hasExistingDb
    ? new SQL.Database(readFileSync(dbPath))
    : new SQL.Database();

  const client = new SqliteClient(db, dbPath);
  client.exec(`
    CREATE TABLE IF NOT EXISTS deprecations (
      id TEXT PRIMARY KEY,
      fingerprint TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      project TEXT NOT NULL,
      module TEXT,
      package_name TEXT,
      message TEXT NOT NULL,
      severity TEXT NOT NULL,
      source TEXT NOT NULL,
      replacement TEXT,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      occurrence_count INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'open',
      metadata_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_deprecations_project
      ON deprecations(project, severity, type, last_seen_at);

    CREATE TABLE IF NOT EXISTS deprecation_events (
      id TEXT PRIMARY KEY,
      deprecation_id TEXT NOT NULL,
      detected_at TEXT NOT NULL,
      raw_line TEXT,
      metadata_json TEXT,
      FOREIGN KEY (deprecation_id) REFERENCES deprecations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_events_detected_at
      ON deprecation_events(detected_at);

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      deprecation_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      delivered_at TEXT,
      error_message TEXT,
      payload_json TEXT,
      FOREIGN KEY (deprecation_id) REFERENCES deprecations(id) ON DELETE CASCADE
    );
  `);

  client.persist();
  return client;
}

async function loadSqlJs() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: (file) =>
        fileURLToPath(new URL(`../../node_modules/sql.js/dist/${file}`, import.meta.url))
    });
  }

  return sqlPromise;
}

class SqliteClient {
  constructor(db, dbPath) {
    this.db = db;
    this.dbPath = dbPath;
  }

  exec(sql, params = []) {
    if (!params || params.length === 0) {
      this.db.run(sql);
      return;
    }

    const statement = this.db.prepare(sql);
    statement.bind(params);
    while (statement.step()) {
      // Exhaust the statement for sqlite side effects.
    }
    statement.free();
  }

  run(sql, params = []) {
    this.exec(sql, params);
    this.persist();
  }

  get(sql, params = []) {
    const statement = this.db.prepare(sql);
    statement.bind(params);
    const row = statement.step() ? statement.getAsObject() : undefined;
    statement.free();
    return row;
  }

  all(sql, params = []) {
    const statement = this.db.prepare(sql);
    statement.bind(params);
    const rows = [];

    while (statement.step()) {
      rows.push(statement.getAsObject());
    }

    statement.free();
    return rows;
  }

  transaction(callback) {
    this.db.run("BEGIN");

    try {
      const result = callback();
      this.db.run("COMMIT");
      this.persist();
      return result;
    } catch (error) {
      try {
        this.db.run("ROLLBACK");
      } catch {
        // Ignore rollback failures after the original error.
      }
      throw error;
    }
  }

  persist() {
    writeFileSync(this.dbPath, Buffer.from(this.db.export()));
  }

  close() {
    this.persist();
    this.db.close();
  }
}
