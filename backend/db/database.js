// db/database.js — Initialise SQLite et crée les tables
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'securasante.db');
const SCHEMA  = path.join(__dirname, 'schema.sql');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    // Crée les tables si elles n'existent pas
    const schema = fs.readFileSync(SCHEMA, 'utf8');
    db.exec(schema);
  }
  return db;
}

module.exports = { getDb };
