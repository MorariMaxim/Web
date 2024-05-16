import sqlite3 from "sqlite3";
import { extname } from "path";
import fs from "fs";
import path from "path";

class DataBase {
  constructor(path) {
    this.db = new sqlite3.Database(path);
    let dropTables = false;
    this.db.serialize(() => {
      if (dropTables) {
        this.db.run("DROP TABLE IF EXISTS images");
        this.db.run("DROP TABLE IF EXISTS imgurImages");
        this.db.run("DROP TABLE IF EXISTS userImages");

        deleteFilesInDirectory("server/repository/images");
        deleteFilesInDirectory("server/repository/image_meta");
      }

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
      this.db.run(`CREATE TABLE IF NOT EXISTS images (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, 
                    type TEXT,
                    ext TEXT
                  );`);
      this.db.run(`CREATE TABLE IF NOT EXISTS imgurImages (        
                  postId TEXT,
                  url TEXT,                  
                  image_id INTEGER,
                  FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
                  UNIQUE(postId,url)
              );`);
      this.db.run(`CREATE TABLE IF NOT EXISTS userImages (        
                user_id INTEGER,                       
                image_id INTEGER,
                FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id,image_id)
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

  async getImages() {
    const sql = "SELECT * FROM images";
    return await new Promise((resolve, reject) => {
      this.db.all(sql, (err, row) => {
        if (err) {
          console.error("Error:", err.message);
          resolve(null);
        } else if (row) {
          resolve(row);
        } else {
          resolve(null);
        }
      });
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

  async insertImage(type, ext) {
    const insertImageSql = `
      INSERT INTO images (type, ext)
      VALUES (?, ?)
    `;
    let result = await new Promise((resolve, reject) => {
      this.db.run(insertImageSql, [type, ext], function (err) {
        if (err) {
          console.error(
            "Error inserting image into images table:",
            err.message
          );
          resolve(null);
        } else {
          resolve(this.lastID);
        }
      });
    });

    return result;
  }

  async insertImgurImage(image_id, postId, url) {
    const insertImageSql = `
      INSERT INTO imgurImages (postId, url,image_id)
      VALUES (?, ?, ?)
    `;
    return await new Promise((resolve, reject) => {
      this.db.run(insertImageSql, [postId, url, image_id], function (err) {
        if (err) {
          console.error(
            "Error inserting image into imgurImages table:",
            err.message
          );
          resolve(null);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async associateImageToUser(imageId, userId) {
    return await new Promise((resolve, reject) => {
      this.db.run(
        "INSERT INTO userImages (user_id, image_id) VALUES (?, ?);",
        [userId, imageId],
        function (err) {
          if (err && err.code != "SQLITE_CONSTRAINT") {
            resolve(false);
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  async saveImgurImageToUser(sessionId, postId, url) {
    return await new Promise(async (resolve) => {
      this.db.serialize(async () => {
        let response = {};
        response.success = false;
        response.id = -1;
        response.download = true;

        this.db.run("BEGIN TRANSACTION;");

        let imageId = await this.getImgurImageByUrl(url);

        console.log(imageId);

        let userId = await this.getUserIdBySessionId(sessionId);

        if (imageId == null) {
          imageId = await this.insertImage("imgur", extname(url));
          console.log(`saving image with ext = ${extname(url)}`);
          if (!imageId) {
            this.db.run("ROLLBACK;");
            resolve(response);
            return;
          }

          let result = await this.insertImgurImage(imageId, postId, url);
          if (!result) {
            this.db.run("ROLLBACK;");
            resolve(response);
            return;
          }
        } else {
          response.download = false;
        }

        let result = await this.associateImageToUser(imageId, userId);

        console.log("associating:" + result);

        if (!result) {
          this.db.run("ROLLBACK;");
          resolve(response);
          return;
        }

        this.db.run("COMMIT;", () => {
          response.id = imageId;
          response.success = true;
          resolve(response);
        });
      });
    });
  }

  async getImageById(imageId) {
    const selectImageSql = `
      SELECT * FROM images WHERE id = ?
    `;

    return new Promise((resolve, reject) => {
      this.db.get(selectImageSql, [imageId], (err, row) => {
        if (err) {
          console.error(
            "Error retrieving image from images table:",
            err.message
          );
          resolve(null);
        } else {
          resolve(row);
        }
      });
    });
  }

  async getUserImages(userId) {
    console.log(userId);
    const selectImageSql = `
      SELECT image_id FROM userImages WHERE user_id = ?
    `;

    return new Promise((resolve, reject) => {
      this.db.all(selectImageSql, [userId], (err, row) => {
        if (err) {
          console.error(
            "Error retrieving userImages from images table:",
            err.message
          );
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async getImgurImageByUrl(url) {
    const selectImageSql = `
      SELECT image_id FROM imgurImages WHERE url = ?
    `;

    return new Promise((resolve, reject) => {
      this.db.get(selectImageSql, [url], (err, row) => {
        if (row) {
          resolve(row.image_id);
        } else resolve(null);
      });
    });
  }

  async getImgurImage(imageId) {
    const selectImageSql = `
      SELECT * FROM imgurImages WHERE image_id = ?
    `;

    return new Promise((resolve, reject) => {
      this.db.get(selectImageSql, [imageId], (err, row) => {
        if (err) {
          console.error(
            "Error retrieving imgurImage from imgurImages table:",
            err.message
          );
          resolve(null);
        } else {
          resolve(row);
        }
      });
    });
  }
}

const dataBase = new DataBase("server/mydatabase.db");

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

function deleteFilesInDirectory(directory) {
  fs.readdir(directory, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(directory, file);

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error("Error deleting file:", err);
          return;
        }
        console.log(`Deleted file: ${filePath}`);
      });
    });
  });
}
