CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY, 
    type TEXT NOT NULL,
    ext TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS imgurImages (        
    postId TEXT NOT NULL,
    url TEXT NOT NULL,                  
    image_id INTEGER NOT NULL,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
    UNIQUE(postId, url)
);

CREATE TABLE IF NOT EXISTS userImages (        
    user_id INTEGER NOT NULL,                       
    image_id INTEGER NOT NULL,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, image_id)
);

CREATE TABLE IF NOT EXISTS imgurMeta (                 
    image_id INTEGER NOT NULL,
    title TEXT,
    description TEXT,
    views INTEGER,
    ups INTEGER,
    downs INTEGER,
    tags TEXT,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
    UNIQUE (image_id)
);

CREATE TABLE IF NOT EXISTS imgurAccessTokens (                 
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    UNIQUE(user_id, token)
);
