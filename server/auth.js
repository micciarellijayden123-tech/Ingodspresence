const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./db.sqlite');

function createAdmin(username, password) {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return reject(err);
      db.run(
        'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
        [username, hash],
        function (err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  });
}

function verifyAdmin(username, password) {
  return new Promise((resolve, reject) => {
    db.get('SELECT password_hash FROM admin_users WHERE username = ?', [username], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(false);
      bcrypt.compare(password, row.password_hash, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  });
}

module.exports = { createAdmin, verifyAdmin };
