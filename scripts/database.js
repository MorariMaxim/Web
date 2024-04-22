import sqlite3 from "sqlite3";

class DataBase {
  constructor(path) {
    this.db = new sqlite3.Database(path);

    this.db.serialize(() => {
      this.db.run(`CREATE TABLE IF NOT EXISTS users (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      username TEXT UNIQUE,
                      password TEXT
                    )`);

      this.db.run(`CREATE TABLE IF NOT EXISTS sessions (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      session_id TEXT NOT NULL,
                      user_id INTEGER,
                      login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                  );`);
    });
  }

  closeDataBase() {
    this.db.close((err) => {
      if (err) {
        console.error("Error closing database:", err.message);
      } else {
        console.log("Database connection closed.");
      }
    });
  }

  async addUser(name, password) {
    try {
      await new Promise((resolve, reject) => {
        this.db.serialize(() => {
          const insertStmt = this.db.prepare(
            "INSERT INTO users (username, password) VALUES (?, ?)"
          );
          insertStmt.run(name, password, (err) => {
            if (err) reject(err);
            else resolve();
          });
          insertStmt.finalize();
        });
      });
    } catch (err) {
      if (err && err.errno === 19 && err.code === "SQLITE_CONSTRAINT") {
        console.log(`Username '${name}' is already taken.`);
      } else {
        console.error(err);
      }
    }
  }

  async getUserIdByUsername(username) {
    const sql = "SELECT id FROM users WHERE username = ?";
    return new Promise((resolve, reject) => {
      this.db.get(sql, [username], (err, row) => {
        if (err) {
          console.error("Error retrieving user ID:", err.message);
          resolve(null);
        } else if (row) {
          const userId = row.id;
          resolve(userId);
        } else {
          resolve(null);
        }
      });
    });
  }

  async getUserByname(username) {
    return await this.getUserById(await this.getUserIdByUsername(username));
  }

  async setSessionId(userId, sessionId) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        const insertStmt = this.db.prepare(
          "INSERT INTO sessions (session_id, user_id) VALUES (?, ?)"
        );
        insertStmt.run(sessionId, userId, (err) => {
          if (err) {
            console.error("Error setting session ID:", err);
            reject(err);
          } else {
            console.log(`Session ID set successfully ${sessionId}, ${userId}`);
            resolve();
          }
          insertStmt.finalize();
        });
      });
    });
  }

  async getUserIdBySessionId(sessionId) {
    const sql = "SELECT user_id FROM sessions WHERE session_id = ?";
    return new Promise((resolve, reject) => {
      this.db.get(sql, [sessionId], (err, row) => {
        if (err) {
          console.error("Error retrieving user ID:", err.message);
          resolve(null);
        } else if (row) {
          const userId = row.user_id;
          resolve(userId);
        } else {
          resolve(null);
        }
      });
    });
  }
  async getSessionIdByUserId(userId) {
    const sql = "SELECT session_id FROM sessions WHERE user_id = ?";
    return new Promise((resolve, reject) => {
      this.db.get(sql, [userId], (err, row) => {
        if (err) {
          console.error("Error retrieving session ID:", err.message);
          resolve(null);
        } else if (row) {
          const sessionId = row.session_id; 
          resolve(sessionId);
        } else {
          resolve(null);
        }
      });
    });
  }

  async getUserById(userId) {
    const sql = "SELECT id, username, password FROM users WHERE id = ?";
    return new Promise((resolve, reject) => {
      this.db.get(sql, [userId], (err, row) => {
        if (err) {
          console.error("Error retrieving user:", err.message);
          resolve(null);
        } else if (row) {
          const user = new User(row.id, row.username, row.password);
          resolve(user);
        } else {
          resolve(null);
        }
      });
    });
  }
}

const dataBase = new DataBase("mydatabase.db");

export { dataBase };

export class User {
  constructor(id, username, password) {
    this.id = id;
    this.username = username;
    this.password = password;
  }

  get getId() {
    return this.id;
  }

  get getUsername() {
    return this.username;
  }

  get getPassword() {
    return this.password;
  }
}
