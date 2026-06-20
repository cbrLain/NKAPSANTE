// db/database.js — Sélection automatique sql.js (local) ou PostgreSQL (DATABASE_URL)
const path = require('path');
const fs   = require('fs');

let _api = null;

let initDb;
if (process.env.DATABASE_URL) {
  // Mode PostgreSQL
  const { initPg, getPgDb } = require('./pg-database');
  initDb = async () => {
    _api = await initPg();
    // Seed si base vide
    const row = (await _api.prepare('SELECT COUNT(*) AS n FROM utilisateurs').get());
    if (!row || row.n === '0' || row.n === 0) {
      console.log('📦 Base PG vide — exécution du seed...');
      require('./seed');
    }
    return _api;
  };
} else {
  // Mode sql.js (local)
  const initSqlJs = require('sql.js');
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'securasante.db');
  const SCHEMA  = path.join(__dirname, 'schema.sql');

  class Statement {
    constructor(sqlJsStmt) { this._stmt = sqlJsStmt; }
    get(...params) {
      if (params.length) this._stmt.bind(params);
      if (this._stmt.step()) { const row = this._stmt.getAsObject(); this._stmt.reset(); return row; }
      this._stmt.reset(); return undefined;
    }
    all(...params) {
      if (params.length) this._stmt.bind(params);
      const rows = [];
      while (this._stmt.step()) rows.push(this._stmt.getAsObject());
      this._stmt.reset(); return rows;
    }
    run(...params) {
      if (params.length) this._stmt.bind(params);
      this._stmt.step(); this._stmt.reset();
      const db = this._stmt.database;
      const lastId = Number(db.exec("SELECT last_insert_rowid() AS id")[0]?.values[0]?.[0] || 0);
      const changes = Number(db.exec("SELECT changes() AS n")[0]?.values[0]?.[0] || 0);
      return { lastInsertRowid: lastId, changes };
    }
  }

  function transaction(fn) {
    return async function(...args) {
      const db = getDb();
      db.exec('BEGIN');
      try { const result = await fn(...args); db.exec('COMMIT'); return result; }
      catch(e) { db.exec('ROLLBACK'); throw e; }
    };
  }

  let db;
  initDb = async () => {
    const SQL = await initSqlJs();
    let buffer = null;
    try { buffer = fs.readFileSync(DB_PATH); } catch(e) { /* first time */ }
    db = new SQL.Database(buffer);
    const schema = fs.readFileSync(SCHEMA, 'utf8');
    db.exec(schema);
    _api = {
      prepare: (sql) => new Statement(db.prepare(sql)),
      exec: (sql) => db.exec(sql),
      transaction,
      save: () => { try { fs.writeFileSync(DB_PATH, Buffer.from(db.export())); } catch(e) { console.error('⚠️  Save error:', e.message); } },
    };
    return _api;
  };
}

function getDb() {
  if (!_api) throw new Error('Database not initialized.');
  return _api;
}

module.exports = { getDb, initDb };
