import pkg from "pg";
const { Pool, Client } = pkg;

class DataBasePosgres {
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

    // Execute the table creation queries
    await this.run(createUsersTable);
    await this.run(createSessionsTable);
    await this.run(createImagesTable);
    await this.run(createImgurImagesTable);
    await this.run(createUserImagesTable);
    await this.run(createImgurMetaTable);
    await this.run(createImgurAccessTokensTable);
  }

  // Close the pool when you're done to free up resources
  async close() {
    await this.pool.end();
  }
}

/* // Usage Example
(async () => {
  const dbConfig = {
    user: "postgres",
    host: "localhost",
    database: "WebDb",
    password: "password",
    port: 5432, // Default PostgreSQL port
  };

  const db = new DataBasePosgres(dbConfig);
  // await db.createTables();

  // Define the SQL query to call the function
  const sqlQuery = "SELECT create_comment($1)";

  // Define the parameters to pass to the function
  const commentJson = { 
  };

  // Execute the query
  client
    .query(sqlQuery, [commentJson])
    .then((result) => {
      // Handle the result
      console.log("Function call result:", result.rows);
    })
    .catch((err) => {
      // Handle any errors
      console.error("Error calling function:", err);
    });

  await db.close();
})();
 */

async function callPostgresFunction(commentJson) {
  // Create a new client instance
  const client = new Client({
    user: "postgres",
    host: "localhost",
    database: "WebDb",
    password: "password",
    port: 5432, // Default PostgreSQL port
  });

  try {
    // Connect to the database
    await client.connect();
    console.log("Connected to the database");

    // Define the SQL query to call the function
    const sqlQuery = "SELECT create_comment($1)";

    // Execute the query
    const result = await client.query(sqlQuery, [commentJson]);
    console.log("Function call result:", result.rows);
  } catch (error) {
    // Handle any errors
    console.error("Error calling function:", error);
  } finally {
    // Close the connection
    await client.end();
    console.log("Connection closed");
  }
}

async function create_root_comment(commentJson, image_id) {
  // Create a new client instance
  const client = new Client({
    user: "postgres",
    host: "localhost",
    database: "WebDb",
    password: "password",
    port: 5432, // Default PostgreSQL port
  });

  try {
    // Connect to the database
    await client.connect();
    console.log("Connected to the database");

    // Define the SQL query to call the function
    const sqlQuery = "SELECT create_comment_root($1,$2)";

    // Execute the query
    const result = await client.query(sqlQuery, [commentJson, image_id]);
    console.log("Function call result:", result.rows);
  } catch (error) {
    // Handle any errors
    console.error("Error calling function:", error);
  } finally {
    // Close the connection
    await client.end();
    console.log("Connection closed");
  }
}

// Example usage
const commentJson = {
  author: "author1",
  text: "text1",
  children: [
    {
      text: "...probably thinks he owns the world.",
      author: "hgfurgyhauh4uhghghuhgiqguhniij",
    },
  ],
};

// callPostgresFunction(commentJson);
async function getCommentTree(commentJson) {
  // Create a new client instance
  const client = new Client({
    user: "postgres",
    host: "localhost",
    database: "WebDb",
    password: "password",
    port: 5432, // Default PostgreSQL port
  });

  try {
    // Connect to the database
    await client.connect();
    console.log("Connected to the database");

    // Define the SQL query to call the function
    const sqlQuery = "SELECT * FROM get_comment_tree($1)";

    // Execute the query
    const result = await client.query(sqlQuery, [commentJson]);
    console.log("Function call result:", result.rows[0].get_comment_tree);
  } catch (error) {
    // Handle any errors
    console.error("Error calling function:", error);
  } finally {
    // Close the connection
    await client.end();
    console.log("Connection closed");
  }
}

async function executeSql(sqlQuery, parameters) {
  const client = new Client({
    user: "postgres",
    host: "localhost",
    database: "WebDb",
    password: "password",
    port: 5432,
  });

  try {
    await client.connect();
    console.log("Connected to the database");

    return (await client.query(sqlQuery, parameters)).rows;
  } catch (error) {
    console.error("Error calling function:", error);
  } finally {
    await client.end();
    console.log("Connection closed");
  }
}

// Example usage
const commentId = 2; // Replace with the actual comment ID
// let result = await getCommentTree(commentId);

// console.log(JSON.stringify(result.children));

// create_root_comment(commentJson, 33);

/* let result = await executeSql("select * from insert_image($1,$2)", ["imgur",".jpg"]);

console.log(result); */

// let result = await executeSql("select * from insert_image($1,$2)", ["imgur",".jpg"]);

let result = await executeSql("SELECT * FROM get_image_comments($1)", [1]);
// let result = await executeSql("SELECT * FROM create_comment_root($1,$2)", [commentJson,1]);


console.log(result[0].get_image_comments); 