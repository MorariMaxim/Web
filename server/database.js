import sqlite3 from "sqlite3";
import { extname } from "path";
import fs, { readdirSync } from "fs";
import path from "path";
import pkg from "pg";
import { downloadImage } from "./utilities.js";
import { fetchUnsplashMeta } from "./unsplash/main.js";
import { getImageExtension } from "./utilities.js";

const { Pool } = pkg;

// in minutes
const IMGUR_ACCESS_TOKEN_EXPIRATION_MINUTES = 7 * 24 * 60;
const RESET_PASS_CODE_EXPIRATION_MINUTES = 10;
const SESSION_EXPIRATION_MINUTES = 1 * 24 * 60;

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

  async executeFunction(query, params) {
    try {
      const result = await this.pool.query(query, params);
      console.log("Query executed successfully");
      return result.rows;
    } catch (err) {
      console.error("Error executing query:", err.message);
      return null;
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
        
    
    ;
    `;

    const dropUsersTable = `
        DROP TABLE IF EXISTS users;
    `;

    try {
      await this.run(dropImgurMetaTable);
      await this.run(dropUserImagesTable);
      await this.run(dropImgurImagesTable);
      await this.run("drop table if exists comment_roots");
      await this.run("drop table if exists comment_hierarchy");
      await this.run("drop table if exists titles");
      await this.run("drop table if exists descriptions");
      await this.run("drop table if exists tags");
      await this.run(dropImagesTable);
      await this.run("drop table if exists comments");

      await this.run(dropUsersTable);

      await this.run(dropSessionsTable);
      await this.run("drop table resetPassCodes");
      await this.run(dropImgurAccessTokensTable);

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
        password TEXT NOT NULL,
        email TEXT 
      );
    `;

    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        user_id INTEGER,
        last_login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user_id)
      );
    `;
    const createResetPassCodesTable = `
    CREATE TABLE IF NOT EXISTS resetPassCodes (
      id SERIAL PRIMARY KEY, 
      username TEXT not null,
      code TEXT not null,
      FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (username)
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
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
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
        views INTEGER,
        ups INTEGER,
        downs INTEGER,
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
        UNIQUE(image_id)
      );
    `;

    const createImgurAccessTokensTable = `
      CREATE TABLE IF NOT EXISTS imgurAccessTokens (
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        account_username TEXT NOT NULL,
        last_access_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, token)
      );
    `;

    const createTagTable = `CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      image_id INTEGER NOT NULL,
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
      );
      `;

    const createCommentTable = `CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        author TEXT NOT NULL,
        text TEXT NOT NULL
    );`;

    const create_comment_roots_table = `CREATE TABLE IF NOT EXISTS comment_roots (
        id INTEGER PRIMARY KEY,  -- id as PRIMARY KEY to ensure uniqueness
        image_id INTEGER NOT NULL,
        FOREIGN KEY (id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
    );`;

    const create_comment_hierarchy_table = `CREATE TABLE IF NOT EXISTS comment_hierarchy (
        parent_id INTEGER NOT NULL,
        child_id INTEGER NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY (child_id) REFERENCES comments(id) ON DELETE CASCADE,
        PRIMARY KEY (parent_id, child_id)   
    );
    `;

    const create_titles_table = `create table IF NOT EXISTS titles (
      text TEXT NOT NULL,
      image_id INTEGER NOT NULL,
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
      UNIQUE(image_id)
    );`;

    const create_descriptions_table = `create table IF NOT EXISTS descriptions (
      text TEXT NOT NULL,
      image_id INTEGER NOT NULL,
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
      unique(image_id)
    );`;

    const create_views_table = `create table IF NOT EXISTS views (
      image_id INTEGER NOT NULL,
      views INTEGER NOT NULL,
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
      unique(image_id)
    );`;

    const create_likes_table = `create table IF NOT EXISTS likes (
      image_id INTEGER NOT NULL,
      likes INTEGER NOT NULL,
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
      unique(image_id)
    );`;

    const create_downloads_table = `create table IF NOT EXISTS downloads (
      image_id INTEGER NOT NULL,
      downloads INTEGER NOT NULL,
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
      unique(image_id)
    );`;

    const create_location_table = `create table IF NOT EXISTS locations (
      image_id INTEGER NOT NULL,
      location TEXT NOT NULL,
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
      unique(image_id)
    );`;

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
    await this.run(create_descriptions_table);
    await this.run(create_titles_table);
    await this.run(createResetPassCodesTable);

    await this.run(create_views_table);
    await this.run(create_downloads_table);
    await this.run(create_likes_table);
    await this.run(create_location_table);
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
  async addUser(name, password, email) {
    return this.executeFunction(
      "INSERT INTO users (username, password, email) VALUES ($1, $2, $3)",
      [name, password, email]
    );
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
  async refreshImgurAccessTokenLastAccessDate(token) {
    const client = await this.pool.connect();
    try {
      const updateQuery = `
        UPDATE imgurAccessTokens
        SET last_access_date = CURRENT_TIMESTAMP
        WHERE token = $2;
      `;
      await client.query(updateQuery, [token]);
      console.log(`Last access date updated for token: ${token}`);
    } catch (err) {
      console.error("Error updating last access date:", err);
    } finally {
      client.release();
    }
  }

  async refreshLastLoginTime(sessionId) {
    const client = await this.pool.connect();
    try {
      const updateQuery = `
        UPDATE sessions
        SET last_login_time = CURRENT_TIMESTAMP
        WHERE session_id  = $1;
      `;
      await client.query(updateQuery, [sessionId]);
      console.log(`Last login time updated for user_id: ${sessionId}`);
    } catch (err) {
      console.error("Error updating last login time:", err);
    } finally {
      client.release();
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
    const sql = "SELECT id, username, password, email FROM users WHERE id = $1";
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [userId]);
      client.release();
      console.log("geUserByid: " + result.rows[0]);
      return result.rows.length > 0
        ? new User(
            result.rows[0].id,
            result.rows[0].username,
            result.rows[0].password,
            result.rows[0].email
          )
        : null;
    } catch (err) {
      console.error("Error retrieving user:", err.message);
      return null;
    }
  }

  async insertImage(type, ext) {
    const sql = "INSERT INTO images (type, ext) VALUES ($1, $2) RETURNING id";
    const client = await this.pool.connect();
    const result = await client.query(sql, [type, ext]);
    client.release();
    return result.rows[0].id;
  }

  async insertImgurImage(imageId, postId, url) {
    const sql =
      "INSERT INTO imgurImages (postId, url, image_id) VALUES ($1, $2, $3)";
    const client = await this.pool.connect();
    await client.query(sql, [postId, url, imageId]);
    client.release();
    return imageId;
  }

  async associateImageToUser(imageId, userId) {
    const sql = "INSERT INTO userImages (user_id, image_id) VALUES ($1, $2)";
    const client = await this.pool.connect();
    try {
      await client.query(sql, [userId, imageId]);
    } catch (err) {
      if (err.code !== "23505") {
        console.error("Error associating image to user:", err.message);
      } else throw err;
    } finally {
      client.release();
    }
  }
  //
  async saveImgurImageToUser(userId, postId, url) {
    let client;
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      let imageId = await this.insertImage("imgur", extname(url));

      await this.insertImgurImage(imageId, postId, url);

      await this.associateImageToUser(imageId, userId);

      await client.query("COMMIT");
      return imageId;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async saveUnsplashImageToUser(link, remoteId, userId) {
    let client;

    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      let imageId = await this.insertImage(
        "unsplash",
        await getImageExtension(link)
      );

      await this.associateImageToUser(imageId, userId);

      console.log("here");

      await downloadImage(link, "server/repository/images/" + imageId);

      await this.saveUnsplashMeta(imageId, remoteId, client);

      await client.query("COMMIT");
      return imageId;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error saving imgur image to user:", err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  async saveUnsplashMeta(localId, remoteId, client) {
    let nested = !!client;
    if (!nested) client = await this.pool.connect();

    try {
      if (nested) await client.query("BEGIN");

      let meta = await fetchUnsplashMeta(remoteId);

      await client.query(
        `
        INSERT INTO descriptions (text, image_id)
        VALUES ($1, $2)
      `,
        [meta.description, localId]
      );

      await client.query(
        `
        INSERT INTO views (image_id, views)
        VALUES ($1, $2)
      `,
        [localId, meta.views]
      );

      await client.query(
        `
        INSERT INTO likes (image_id, likes)
        VALUES ($1, $2)
      `,
        [localId, meta.likes]
      );

      await client.query(
        `
        INSERT INTO downloads (image_id, downloads)
        VALUES ($1, $2)
      `,
        [localId, meta.downloads]
      );

      await client.query(
        `
        INSERT INTO locations (image_id, location)
        VALUES ($1, $2)
      `,
        [localId, meta.location]
      );

      for (const tag of meta.tags) {
        await client.query(
          `
          INSERT INTO tags (name, image_id)
          VALUES ($1, $2)
        `,
          [tag, localId]
        );
      }
      if (nested) await client.query("COMMIT");
    } catch (err) {
      if (nested) await client.query("ROLLBACK");
      console.error("Error saving Unsplash metadata:", err.message);
      throw err;
    } finally {
      if (!nested) client.release();
    }
  }

  async getMetaByImageId(imageId) {
    const client = await this.pool.connect();

    try {
      const meta = {};

      const title = await this.getTitleByImageId(imageId);
      meta.title = title;

      const tags = await this.getAllTagsByImageId(imageId);
      meta.tags = tags;

      return meta;
    } catch (err) {
      console.error("Error fetching metadata by image ID:", err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  async getUnsplashMeta(localId) {
    const client = await this.pool.connect();

    try {
      const meta = {};

      // Fetch description
      const descriptionResult = await client.query(
        `SELECT text FROM descriptions WHERE image_id = $1`,
        [localId]
      );
      meta.description = descriptionResult.rows[0]?.text || null;

      // Fetch views
      const viewsResult = await client.query(
        `SELECT views FROM views WHERE image_id = $1`,
        [localId]
      );
      meta.views = viewsResult.rows[0]?.views || null;

      // Fetch likes
      const likesResult = await client.query(
        `SELECT likes FROM likes WHERE image_id = $1`,
        [localId]
      );
      meta.likes = likesResult.rows[0]?.likes || null;

      // Fetch downloads
      const downloadsResult = await client.query(
        `SELECT downloads FROM downloads WHERE image_id = $1`,
        [localId]
      );
      meta.downloads = downloadsResult.rows[0]?.downloads || null;

      // Fetch location
      const locationResult = await client.query(
        `SELECT location FROM locations WHERE image_id = $1`,
        [localId]
      );
      meta.location = locationResult.rows[0]?.location || null;

      // Fetch tags
      const tagsResult = await client.query(
        `SELECT name FROM tags WHERE image_id = $1`,
        [localId]
      );
      meta.tags = tagsResult.rows.map((row) => row.name);

      return meta;
    } catch (err) {
      console.error("Error retrieving Unsplash metadata:", err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  async getBaseImageByid(imageId) {
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

  async getAllTagsByImageId(imageId) {
    const sql = "SELECT name FROM tags WHERE image_id = $1";
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [imageId]);
      client.release();
      return result.rows.map((row) => row.name);
    } catch (err) {
      console.error("Error retrieving tags from database:", err.message);
      return null;
    }
  }

  async getTitleByImageId(imageId) {
    const sql = "SELECT text FROM titles WHERE image_id = $1";
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [imageId]);
      client.release();
      return result.rows.length > 0 ? result.rows[0].text : null;
    } catch (err) {
      console.error("Error retrieving title from database:", err.message);
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
  async storeImgurMetaDataToDB(imageId, meta) {
    const sql = `
        SELECT * FROM store_imgur_meta_data($1, $2::jsonb);
    `;
    try {
      const client = await this.pool.connect();
      await client.query(sql, [imageId, JSON.stringify(meta)]);
      client.release();
      return true;
    } catch (err) {
      console.error("Error storing imgur meta:", err.message);
      return false;
    }
  }

  async updateImageMetaData(imageId, meta) {
    const sql = `
        SELECT * FROM update_image_meta_data($1, $2, $3);
    `;
    try {
      const client = await this.pool.connect();
      await client.query(sql, [imageId, meta.title, meta.tags]);
      client.release();
      return true;
    } catch (err) {
      console.error("Error updating image meta:", err.message);
      return false;
    }
  }

  async createCommentRoots(imageId, comments) {
    const sql = `
        SELECT create_comment_roots($1::jsonb, $2);
    `;
    try {
      const client = await this.pool.connect();
      await client.query(sql, [JSON.stringify(comments), imageId]);
      client.release();
      return true;
    } catch (err) {
      console.error("Error creating comment roots:", err.message);
      return false;
    }
  }

  /*   async getImgurMetaData(imageId) {
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
  } */

  async getImgurMetaAndCommentsData(imageId) {
    const sql = `
        SELECT get_full_image_data($1) AS full_data;
    `;
    try {
      const client = await this.pool.connect();
      const res = await client.query(sql, [imageId]);
      client.release();
      return res.rows[0].full_data;
    } catch (err) {
      console.error("Error retrieving full image data:", err.message);
      return null;
    }
  }

  async storeImgurMetaAndComments(id, meta) {
    console.log("storeImgurMetaAndComments: " + JSON.stringify(meta));

    console.log(`tags look like: ${JSON.stringify(meta.details.tags)}`);
    let storedMeta = await dataBase.storeImgurMetaDataToDB(id, meta.details);

    let storedComments = await dataBase.createCommentRoots(id, meta.comments);

    return storedComments && storedMeta;
  }

  async getUserImgurAccessToken(userId) {
    const sql = "SELECT * FROM imgurAccessTokens WHERE user_id = $1";
    try {
      const client = await this.pool.connect();
      const result = await client.query(sql, [userId]);
      client.release();
      console.log("getUserImgurAccessToken: " + JSON.stringify(result.rows[0]));
      return result.rows.length > 0
        ? {
            token: result.rows[0].token,
            account_username: result.rows[0].account_username,
          }
        : null;
    } catch (err) {
      console.error("Error retrieving imgur access token:", err.message);
      return null;
    }
  }

  async insertImgurAccessToken(userId, token, account_username) {
    const sql = `
        INSERT INTO imgurAccessTokens (user_id, token,account_username )
        VALUES ($1, $2, $3)
    `;
    try {
      const client = await this.pool.connect();
      await client.query(sql, [userId, token, account_username]);
      client.release();
      return { userId, token };
    } catch (err) {
      console.error("Error inserting imgur access token:", err.message);
      return null;
    }
  }

  async filterIds(ids, tags, type, title) {
    return (
      await this.executeFunction(
        "SELECT filter_ids($1, $2, $3, $4) AS filtered_ids",
        [ids, tags, type, title]
      )
    )[0].filtered_ids;
  }

  async cleanUpExpiredData() {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const deleteImgurAccessTokensQuery = `
      DELETE FROM imgurAccessTokens
      WHERE last_access_date < NOW() - INTERVAL '${IMGUR_ACCESS_TOKEN_EXPIRATION_MINUTES} minutes';
    `;
      await client.query(deleteImgurAccessTokensQuery);

      const deleteResetPassCodesQuery = `
      DELETE FROM resetPassCodes
      WHERE created_at < NOW() - INTERVAL '${RESET_PASS_CODE_EXPIRATION_MINUTES} minutes';
    `;
      await client.query(deleteResetPassCodesQuery);

      console.log("cleaning up sessions");
      const deleteSessionsQuery = `
      DELETE FROM sessions
      WHERE last_login_time < NOW() - INTERVAL '${SESSION_EXPIRATION_MINUTES} minutes';
    `;
      await client.query(deleteSessionsQuery);

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error cleaning up expired data:", err.message);
      throw err;
    } finally {
      client.release();
    }
  }
}

export class User {
  constructor(id, username, password, email) {
    this.id = id;
    this.username = username;
    this.password = password;
    this.email = email;
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
  get getEmail() {
    return this.email;
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

export const dataBase = new DataBase(dbConfig);
// await dataBase.resetDataBase();
await dataBase.createTables();

/* await dataBase.run("DROP TABLE IF EXISTS sessions");
await dataBase.run("drop table resetPassCodes");
await dataBase.run("DROP TABLE IF EXISTS imgurAccessTokens"); */
