import sqlite3 from "sqlite3";
import { extname } from "path";
import fs from "fs";
import path from "path";
import pkg from "pg";
const { Pool } = pkg;

const dbConfig = {
  user: "postgres",
  host: "localhost",
  database: "WebDb",
  password: "password",
  port: 5432,
};
class DataBase {
  constructor(config) {
    this.pool = new Pool(config);
  }
  async run(query) {
    try {
      await this.pool.query(query);
      console.log("Query executed successfully");
    } catch (err) {
      console.error("Error executing query:", err.message);
    }
  }
  async resetDataBase() {
    const dropImgurAccessTokensTable = `
        DROP TABLE IF EXISTS imgurAccessTokens;
    `;

    const dropImgurMetaTable = `
        DROP TABLE IF EXISTS imgurMeta;
    `;

    const dropUserImagesTable = `
        DROP TABLE IF EXISTS userImages;
    `;

    const dropImgurImagesTable = `
        DROP TABLE IF EXISTS imgurImages;
    `;

    const dropImagesTable = `
        DROP TABLE IF EXISTS images;
    `;

    const dropSessionsTable = `
        DROP TABLE IF EXISTS sessions;
    `;

    const dropUsersTable = `
        DROP TABLE IF EXISTS users;
    `;

    try {
      await this.run(dropImgurAccessTokensTable);
      await this.run(dropImgurMetaTable);
      await this.run(dropUserImagesTable);
      await this.run(dropImgurImagesTable);
      await this.run(dropImagesTable);
      // await this.run(dropSessionsTable);
      // await this.run(dropUsersTable);
      console.log("All tables dropped successfully.");

      deleteFilesInDirectory("server/repository/image_meta");
      deleteFilesInDirectory("server/repository/images");
    } catch (err) {
      console.error("Error dropping tables:", err.message);
    }
  }

  async createTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
    `;

    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        user_id INTEGER,
        login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `;

    const createImagesTable = `
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        ext TEXT NOT NULL
      );
    `;

    const createImgurImagesTable = `
      CREATE TABLE IF NOT EXISTS imgurImages (
        postId TEXT NOT NULL,
        url TEXT NOT NULL,
        image_id INTEGER NOT NULL,
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
        UNIQUE(postId, url)
      );
    `;

    const createUserImagesTable = `
      CREATE TABLE IF NOT EXISTS userImages (
        user_id INTEGER NOT NULL,
        image_id INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
        UNIQUE(user_id, image_id)
      );
    `;

    const createImgurMetaTable = `
      CREATE TABLE IF NOT EXISTS imgurMeta (
        image_id INTEGER NOT NULL,
        title TEXT,
        description TEXT,
        views INTEGER,
        ups INTEGER,
        downs INTEGER,
        tags TEXT,
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
        UNIQUE(image_id)
      );
    `;

    const createImgurAccessTokensTable = `
      CREATE TABLE IF NOT EXISTS imgurAccessTokens (
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        UNIQUE(user_id, token)
      );
    `;

    const createTagTable = `CREATE TABLE tags (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      image_id INTEGER NOT NULL,
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
      );
      `;

    const createCommentTable = `CREATE TABLE comments (
        id SERIAL PRIMARY KEY,
        author TEXT NOT NULL,
        text TEXT NOT NULL
    );`;

    const create_comment_roots_table = `CREATE TABLE comment_roots (
        id INTEGER PRIMARY KEY,  -- id as PRIMARY KEY to ensure uniqueness
        image_id INTEGER NOT NULL,
        FOREIGN KEY (id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
    );`;  

    const create_comment_hierarchy_table = `CREATE TABLE comment_hierarchy (
        parent_id INTEGER NOT NULL,
        child_id INTEGER NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY (child_id) REFERENCES comments(id) ON DELETE CASCADE,
        PRIMARY KEY (parent_id, child_id)  -- Ensure unique parent-child pairs
    );
    `;

    await this.run(createUsersTable);
    await this.run(createSessionsTable);
    await this.run(createImagesTable);
    await this.run(createImgurImagesTable);
    await this.run(createUserImagesTable);
    await this.run(createImgurMetaTable);
    await this.run(createImgurAccessTokensTable);
    await this.run(createTagTable);
    await this.run(create_comment_roots_table);
    await this.run(createCommentTable);
    await this.run(create_comment_hierarchy_table);
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
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql);
      client.release();
      return result.rows;
    } catch (err) {
      console.error("Error:", err.message);
      return null;
    }
  }

  async addUser(name, password) {
    const sql = "INSERT INTO users (username, password) VALUES ($1, $2)";
    try {
      const client = await this.pool.connect();
      await client.query(sql, [name, password]);
      client.release();
    } catch (err) {
      if (err.code === "23505") {
        console.log(`Username '${name}' is already taken.`);
      } else {
        console.error(err);
      }
    }
  }

  async getUserIdByUsername(username) {
    const sql = "SELECT id FROM users WHERE username = $1";
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [username]);
      client.release();
      return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (err) {
      console.error("Error retrieving user ID:", err.message);
      return null;
    }
  }

  async getUserByName(username) {
    const userId = await this.getUserIdByUsername(username);
    return userId ? await this.getUserById(userId) : null;
  }

  async setSessionId(userId, sessionId) {
    const sql = "INSERT INTO sessions (session_id, user_id) VALUES ($1, $2)";
    try {
      const client = await this.pool.connect();
      await client.query(sql, [sessionId, userId]);
      client.release();
      console.log(`Session ID set successfully ${sessionId}, ${userId}`);
    } catch (err) {
      console.error("Error setting session ID:", err);
    }
  }

  async getUserIdBySessionId(sessionId) {
    const sql = "SELECT user_id FROM sessions WHERE session_id = $1";
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [sessionId]);
      client.release();
      return result.rows.length > 0 ? result.rows[0].user_id : null;
    } catch (err) {
      console.error("Error retrieving user ID:", err.message);
      return null;
    }
  }

  async getSessionIdByUserId(userId) {
    const sql = "SELECT session_id FROM sessions WHERE user_id = $1";
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [userId]);
      client.release();
      return result.rows.length > 0 ? result.rows[0].session_id : null;
    } catch (err) {
      console.error("Error retrieving session ID:", err.message);
      return null;
    }
  }

  async getUserById(userId) {
    const sql = "SELECT id, username, password FROM users WHERE id = $1";
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [userId]);
      client.release();
      return result.rows.length > 0
        ? new User(
            result.rows[0].id,
            result.rows[0].username,
            result.rows[0].password
          )
        : null;
    } catch (err) {
      console.error("Error retrieving user:", err.message);
      return null;
    }
  }

  async insertImage(type, ext) {
    const sql = "INSERT INTO images (type, ext) VALUES ($1, $2) RETURNING id";
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [type, ext]);
      client.release();
      return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (err) {
      console.error("Error inserting image into images table:", err.message);
      return null;
    }
  }

  async insertImgurImage(imageId, postId, url) {
    const sql =
      "INSERT INTO imgurImages (postId, url, image_id) VALUES ($1, $2, $3)";
    try {
      const client = await this.pool.connect();
      await client.query(sql, [postId, url, imageId]);
      client.release();
      return imageId;
    } catch (err) {
      console.error(
        "Error inserting image into imgurImages table:",
        err.message
      );
      return null;
    }
  }

  async associateImageToUser(imageId, userId) {
    const sql = "INSERT INTO userImages (user_id, image_id) VALUES ($1, $2)";
    try {
      const client = await this.pool.connect();
      await client.query(sql, [userId, imageId]);
      client.release();
      return true;
    } catch (err) {
      if (err.code !== "23505") {
        console.error("Error associating image to user:", err.message);
      }
      return false;
    }
  }
  //
  async saveImgurImageToUser(sessionId, postId, url) {
    let client;
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      let response = {
        success: false,
        id: -1,
        download: true,
      };

      let imageId = await this.getImgurImageByUrl(url);

      console.log(imageId);

      let userId = await this.getUserIdBySessionId(sessionId);

      if (imageId === null) {
        imageId = await this.insertImage("imgur", extname(url));
        console.log(`saving image with ext = ${extname(url)}`);
        if (!imageId) {
          await client.query("ROLLBACK");
          return response;
        }

        let result = await this.insertImgurImage(imageId, postId, url);
        if (!result) {
          await client.query("ROLLBACK");
          return response;
        }
      } else {
        response.download = false;
      }

      let result = await this.associateImageToUser(imageId, userId);

      console.log("associating:" + result);

      if (!result) {
        await client.query("ROLLBACK");
        return response;
      }

      await client.query("COMMIT");
      response.id = imageId;
      response.success = true;
      return response;
    } catch (err) {
      console.error("Error saving imgur image to user:", err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  async getImageById(imageId) {
    const sql = "SELECT * FROM images WHERE id = $1";
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [imageId]);
      client.release();
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
      console.error("Error retrieving image from images table:", err.message);
      return null;
    }
  }

  async getUserImages(userId) {
    const sql = "SELECT image_id FROM userImages WHERE user_id = $1";
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [userId]);
      client.release();
      return result.rows;
    } catch (err) {
      console.error(
        "Error retrieving userImages from images table:",
        err.message
      );
      throw err;
    }
  }

  async retainImgurImages(imageIds) {
    const sql = `
      SELECT image_id FROM imgurImages WHERE image_id IN (${imageIds
        .map((_, index) => `$${index + 1}`)
        .join(", ")})
  `;
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, imageIds);
      client.release();
      return result.rows.map((row) => row.image_id);
    } catch (err) {
      console.error(
        "Error retrieving imgurImages from imgurImages table:",
        err.message
      );
      return null;
    }
  }

  async getImgurImageByUrl(url) {
    const sql = "SELECT image_id FROM imgurImages WHERE url = $1";
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [url]);
      client.release();
      return result.rows.length > 0 ? result.rows[0].image_id : null;
    } catch (err) {
      console.error(
        "Error retrieving imgurImage from imgurImages table:",
        err.message
      );
      return null;
    }
  }

  async getImgurImage(imageId) {
    const sql = "SELECT * FROM imgurImages WHERE image_id = $1";
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [imageId]);
      client.release();
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
      console.error(
        "Error retrieving imgurImage from imgurImages table:",
        err.message
      );
      return null;
    }
  }

  //
  async storeImgurMetaData(imageId, meta) {
    const sql = `
        INSERT INTO imgurMeta (image_id, title, description, views, ups, downs, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    try {
      const client = await this.pool.connect();
      await client.query(sql, [
        imageId,
        meta.title,
        meta.description,
        meta.views,
        meta.ups,
        meta.downs,
        [...meta.tags].map((tag) => tag.name).join(" "),
      ]);
      client.release();
      return true;
    } catch (err) {
      console.error("Error storing imgur meta:", err.message);
      return false;
    }
  }

  async getImgurMetaData(imageId) {
    const sql = "SELECT * FROM imgurMeta WHERE image_id = $1";
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [imageId]);
      client.release();
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
      console.error("Error retrieving imgurMeta:", err.message);
      return null;
    }
  }

  async getUserEdits(userId, imageType) {
    const sql = `
        SELECT images.*
        FROM images
        JOIN userImages ON images.id = userImages.image_id
        WHERE userImages.user_id = $1 AND images.type = $2
    `;
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [userId, imageType]);
      client.release();
      return result.rows;
    } catch (err) {
      console.error("Error retrieving user edits:", err.message);
      return null;
    }
  }

  async getUserImgurAccessToken(userId) {
    const sql = "SELECT token FROM imgurAccessTokens WHERE user_id = $1";
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [userId]);
      client.release();
      return result.rows.length > 0 ? result.rows[0].token : null;
    } catch (err) {
      console.error("Error retrieving imgur access token:", err.message);
      return null;
    }
  }

  async insertImgurAccessToken(userId, token) {
    const sql = `
        INSERT INTO imgurAccessTokens (user_id, token)
        VALUES ($1, $2)
    `;
    try {
      const client = await this.pool.connect();
      await client.query(sql, [userId, token]);
      client.release();
      return { userId, token };
    } catch (err) {
      console.error("Error inserting imgur access token:", err.message);
      return null;
    }
  }
}

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

const dataBase = new DataBase(dbConfig);
//  await dataBase.resetDataBase();
await dataBase.createTables();

export { dataBase };
