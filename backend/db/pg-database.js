// db/pg-database.js — Wrapper PostgreSQL compatible avec l'API sql.js
const { Pool } = require('pg');

let pool = null;
let _api = null;

class PgStatement {
  constructor(pool, sql) {
    this._pool = pool;
    this._sql = sql;
  }
  async get(...params) {
    const result = await this._pool.query(this._sql, params);
    return result.rows[0] || undefined;
  }
  async all(...params) {
    const result = await this._pool.query(this._sql, params);
    return result.rows;
  }
  async run(...params) {
    const result = await this._pool.query(this._sql, params);
    return { lastInsertRowid: result.rows[0]?.id ?? result.rows[0]?.lastval ?? null, changes: result.rowCount };
  }
}

function makePrepare(sql) {
  const adapted = wrapSql(sql);
  return new PgStatement(pool, adapted);
}

function wrapSql(sql) {
  let idx = 0;
  let adapted = sql.replace(/\?/g, () => `$${++idx}`);

  // INSERT OR IGNORE → INSERT ... ON CONFLICT DO NOTHING
  adapted = adapted.replace(/INSERT OR IGNORE\s+INTO\s+(\w+)/gi, (match, table) => {
    // Determine conflict column from context
    return `INSERT INTO ${table} ON CONFLICT DO NOTHING`;
  });

  // last_insert_rowid() → LASTVAL()
  adapted = adapted.replace(/last_insert_rowid\(\)/gi, 'LASTVAL()');

  // changes() → 1 (simplifié)
  adapted = adapted.replace(/changes\(\)/gi, '1');

  // CURRENT_TIMESTAMP sans quotes
  // already compatible

  return adapted;
}

async function initPg() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL non défini');

  pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  const client = await pool.connect();
  try {
    const schema = require('fs').readFileSync(require('path').join(__dirname, 'schema.pg.sql'), 'utf8');
    await client.query(schema);
  } finally {
    client.release();
  }

  _api = {
    prepare: (sql) => makePrepare(sql),
    exec: async (sql) => { await pool.query(wrapSql(sql)); },
    transaction: (fn) => {
      return async (...args) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await fn(...args);
          await client.query('COMMIT');
          return result;
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      };
    },
    save: () => {},
    close: async () => { await pool.end(); },
  };

  return _api;
}

function getPgDb() {
  if (!_api) throw new Error('PG non initialisé.');
  return _api;
}

module.exports = { initPg, getPgDb };
