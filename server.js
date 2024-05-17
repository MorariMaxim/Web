import { createServer } from "http";
import { parse } from "url";
import { readFile, stat, writeFile } from "fs/promises";
import { join, dirname, basename, extname } from "path";
import { getContentType } from "./server/functions.js";
import { dataBase } from "./server/database.js";
import { generateSessionId } from "./server/authentificationServerSide.js";
import {
  fetchImgurImages,
  fetchCommentsForPost,
  fetchPostInfo,
} from "./server/imgur.js";
import axios from "axios";
import fs from "fs";
import { clientId } from "./server/imgur-credentials.js";
import { allowedNodeEnvironmentFlags, config } from "process";
import { DESTRUCTION } from "dns";
// import { Database } from "sqlite3";

const accessToken = "42c4f1fc4b77765844a5ff3f8d78c77acecb8414";

const __dirname = decodeURIComponent(
  dirname(new URL(import.meta.url).pathname)
).slice(1);

const serveFile = async (res, filePath) => {
  const fileExists = async (filePath) => {
    try {
      await stat(filePath);
      ``;
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  if (await fileExists(filePath)) {
    try {
      const data = await readFile(filePath);
      const contentType = getContentType(filePath);
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
      return;
    } catch (err) {
      console.error("Error reading file:", err);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
      return;
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("File not found");
};

export const serveStaticFile = async (res, pathnameComponents) => {
  let filePath = join(__dirname, pathnameComponents[0], pathnameComponents[1]);

  for (component in pathnameComponents) {
    filePath = join(filePath, component);
  }

  serveFile(res, filePath);
};

const server = createServer(async (req, res) => {
  const parsedUrl = parse(req.url, true);
  let pathname = parsedUrl.pathname;
  const pathComponents = pathname.split("/").filter(Boolean);

  //console.log(pathComponents);
  const staticFolders = [
    "mainPages",
    "components",
    "resources",
    "scripts",
    "styles",
  ];
  http: if (pathComponents.length == 0) {
    const filePath = join(__dirname, "mainPages", "main_page.html");
    serveFile(res, filePath);
  } else if (pathComponents[0] == "imgurAccessToken") {
    serveFile(res, "imgurAccessToken.html");
  } else if (pathComponents[0] == "storeImgurAccessToken") {
    storeImgurAccessToken(req, res);
  } else if (pathComponents[0] == "uploadImage") {
    uploadImage(req, res);
  } else if (pathComponents[0] == "getComments") {
    getComments(req, res);
  } else if (pathComponents[0] == "getImage") {
    getImage(req, res);
  } else if (pathComponents[0] == "searchImages") {
    searchImagesRoute(req, res);
  } else if (pathComponents[0] == "saveImages") {
    saveImages(req, res);
  } else if (pathComponents[0] == "loginRoute") {
    loginRoute(req, res);
  } else if (pathComponents.length == 1) {
    const filePath = join(__dirname, "mainPages", pathComponents[0]);
    serveFile(res, filePath);
  } else if (
    pathComponents.length > 1 &&
    staticFolders.includes(pathComponents.at(0))
  ) {
    serveFile(res, join(__dirname, pathname));
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Page not found");
  }
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

function getBodyFromRequest(req) {
  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk.toString();
    });

    req.on("end", () => {
      try {
        const body = JSON.parse(data);
        resolve(body);
      } catch (error) {
        console.error("Error parsing JSON:", error);
        reject(error);
      }
    });
  });
}

async function loginRoute(req, res) {
  const response = {
    username: "invalid",
    validSessionId: "false",
  };

  if (req.headers.sessionid) {
    const sessionId = req.headers.sessionid;
    console.log("sessionId:", sessionId);

    const userId = await dataBase.getUserIdBySessionId(sessionId);

    res.setHeader("validSessionId", "true");

    if (userId) {
      const userDate = await dataBase.getUserById(userId);

      response.username = userDate.getUsername;
      response.validSessionId = "true";
    }
  } else if (req.headers.authentificationtype) {
    const loginAttempt = req.headers.authentificationtype == "login";

    console.log(loginAttempt);

    let body = await getBodyFromRequest(req);

    console.log(body);

    if (loginAttempt) {
      let userId = await dataBase.getUserIdByUsername(body.username);

      if (userId) {
        const newSessionId = await generateSessionId();

        response.username = body.getUsername;
        response.validCredentials = "true";
        response.sessionId = newSessionId;

        dataBase.setSessionId(userId, newSessionId);
      } else {
        console.log("invalid username " + body.username);
      }
    } else {
      let userData = await dataBase.getUserByname(body.username);

      if (userData) {
        response.signupresult = "username taken";
      } else {
        dataBase.addUser(body.username, body.password);
        let user = await dataBase.getUserByname(body.username);

        response.signupresult = "success";
        const newSessionId = await generateSessionId();
        console.log(newSessionId);

        await dataBase.setSessionId(user.getId, newSessionId);

        console.log(await dataBase.getSessionIdByUserId(user.getId));

        response.sessionId = newSessionId;
      }
    }
  }

  res.end(JSON.stringify(response));
}

async function searchImagesRoute(req, res) {
  console.log("searchImagesRoute");
  const parsedUrl = parse(req.url, true);
  const queryParams = parsedUrl.query;

  let type = queryParams.type;

  console.log(req.url);
  console.log(queryParams.options);

  let options = {};
  if (type == "imgurDownload") {
    if (queryParams.section) {
      options.section = queryParams.section;
    }
    if (queryParams.window) {
      options.window = queryParams.window;
    }
    if (queryParams.sort) {
      options.sort = queryParams.sort;
    }
    if (queryParams.q) {
      options.q = queryParams.q;
    }

    console.log(`received options: ${JSON.stringify(options)}`);
    let images = await fetchImgurImages(options);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(images));
  } else if (type == "imgurLocal") {
    searchImgurLocallyRoute(req, res);
  } else if (type == "userEdits") {
    console.log("userEdits");
    getUserEditsRoute(req, res);
  } else {
    res.writeHead(404);
    res.end();
  }
}

async function saveImages(req, res) {
  let imageType = req.headers.imagetype;

  console.log(imageType);

  let sessionId = req.headers.sessionid;
  if (!(await checkSessionId(req, res))) return;

  console.log("Trying to save images for user with sessionId " + sessionId);

  console.log("saveimages");
  console.log(`imageType  :${imageType}`);

  if (imageType == "New Imgur") saveNewImgurImages(req, res);
  else if (imageType == "base64") saveDataArrayImage(req, res);
}

async function saveDataArrayImage(req, res) {
  let body = await getBodyFromRequest(req);

  let dataArray = Buffer.from(body.data, "base64");
  let extension = body.ext;
  let type = body.type;

  console.log(req.headers.sessionid);

  if (dataArray) {
    let imageId = await insertAsocciateImage(
      type,
      extension,
      req.headers.sessionid
    );
    console.log(imageId);
    if (imageId.ok) {
      if (
        await saveImageLocally(
          dataArray,
          `server/repository/images/${imageId.imageId}${extension}`
        )
      ) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ id: imageId.imageId }));
      }
    }
  }
}

async function saveImageLocally(buffer, filename) {
  try {
    await writeFile(filename, buffer);

    return true;
  } catch (err) {
    console.error("Error saving image:", err);
    return false;
  }
}

async function saveNewImgurImages(req, res) {
  let body = await getBodyFromRequest(req);
  let sessionId = req.headers.sessionid;
  let response = {};
  for (let image of body) {
    let imageUrl = image.src;
    let postId = image.postId;

    console.log("trying " + image);

    console.log(imageUrl, postId);

    let result = await dataBase.saveImgurImageToUser(
      sessionId,
      postId,
      imageUrl
    );
    let fail = false;
    if (result.success) {
      if (result.download) {
        let downloaded = await downloadImgurImage(
          imageUrl,
          "server/repository/images/" + result.id + extname(imageUrl)
        );
        if (!downloaded) fail = true;
      }
    } else fail = true;

    if (!fail) {
      response[imageUrl] = result.id;

      let meta = await getImgurMetaDataFromPostId(postId);

      await saveImageMetaData(meta, result.id);

      console.log(await dataBase.storeImgurMetaData(result.id, meta.details));
    } else response[imageUrl] = "fail";
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  console.log("sending " + JSON.stringify(response));
  res.end(JSON.stringify(response));
}

async function downloadImgurImage(imageUrl, imagePath) {
  console.log(`downloadImgurImage ${(imageUrl, imagePath)}`);
  const imageResponse = await axios.get(imageUrl, {
    responseType: "arraybuffer",
  });

  const imageData = imageResponse.data;

  return new Promise((resolve, reject) => {
    fs.writeFile(imagePath, imageData, (err) => {
      if (err) {
        console.error("Error writing image data to file:", err);
        resolve(false);
      } else {
        console.log("Image data written to file:", imagePath);
        resolve(true);
      }
    });
  });
}

async function checkSessionId(req, res) {
  let userId = await dataBase.getUserIdBySessionId(req.headers.sessionid);

  if (userId == null) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Invalid sessionId");
    return null;
  }

  return userId;
}

// testing function
(async () => {
  console.log(await dataBase.getImages());

  // deleteUserImgurPosts(accessToken, "mmaxim2291");

  // console.log(await imageId2Path(13, "ext"));

  // await deleteImgurImage(accessToken, "kAyn68XlOZOSB2Y");

  /*  let uploadedImage = await uploadImageToImgur(
    accessToken,
    "server/repository/images/1.jpg"
  );

  console.log(uploadedImage);

  console.log(
    await shareImageToCommunity(
      uploadedImage.id,
      accessToken,
      "SharedImage",
      null,
      null,
      null,
      null
    )
  ); */
})();

async function getImage(req, res) {
  console.log("getImage");
  const parsedUrl = parse(req.url, true).query;

  let id = parsedUrl.id;

  let image = await dataBase.getImageById(id);

  if (!image) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Image not found");
    return;
  }

  const filePath = join("server/repository/images", `${id}${image.ext}`);

  console.log(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Image not found");
    } else {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      res.end(data);
    }
  });
}

async function getComments(req, res) {
  console.log("GetComments request");
  let imageId = req.headers.imageid;
  let postId = req.headers.postid;

  let response = {};
  let ok = false;

  if (imageId) {
    let metaData = await getImageMetaData(imageId);

    if (metaData) {
      response.comments = metaData.comments;
      response.details = metaData.details;
      ok = true;
    } else {
      let image = await dataBase.getImageById(imageId);

      if (image.type == "imgur") {
        let imgurImage = await dataBase.getImgurImage(imageId);

        postId = imgurImage.postId;
      }
    }
  }

  if (postId && !ok) {
    response = await getImgurMetaDataFromPostId(postId);

    if (imageId)
      saveImageMetaData(
        {
          comments: response.comments,
          details: response.details,
        },
        imageId
      );

    ok = true;
  }

  if (ok) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Can't treat it");
  }
}

async function getImageMetaData(imageId) {
  try {
    const data = await readFile(`server/repository/image_meta/${imageId}.json`);
    return JSON.parse(data);
  } catch (err) {
    // Handle errors, e.g., file not found
    console.error("Error reading file:", err);
    return null;
  }
}

async function saveImageMetaData(meta, imageId) {
  return await new Promise((resolve, reject) => {
    fs.writeFile(
      `server/repository/image_meta/${imageId}.json`,
      JSON.stringify(meta),
      (err) => {
        if (err) {
          console.error("Error writing image data to file:", err);
          resolve(false);
        } else {
          console.log(
            "Image data written to file:",
            `server/repository/image_meta/${imageId}.json`
          );
          resolve(true);
        }
      }
    );
  });
}

function trimMetaData(meta) {
  console.log(`triming : ${meta}`);

  let result = {};

  result.details = {
    title: meta.details.title,
    description: meta.details.description,
    views: meta.details.views,
    ups: meta.details.ups,
    downs: meta.details.downs,
    tags: meta.details.tags.map((tag) => {
      return { name: tag.name };
    }),
  };

  result.comments = meta.comments.map((commmentInfo) => {
    return {
      comment: commmentInfo.comment,
      author: commmentInfo.author,
      chidlren: commmentInfo.chidlren,
    };
  });

  return result;
}

async function insertAsocciateImage(type, ext, sessionId) {
  let userId = await dataBase.getUserIdBySessionId(sessionId);

  if (!userId) return { ok: false, problem: "sessionid" };

  let imageId = await dataBase.insertImage(type, ext);

  console.log("associating imageId: " + imageId);

  if (!(await dataBase.associateImageToUser(imageId, userId)))
    return { ok: false, problem: "associate" };

  return { ok: true, imageId };
}

async function getImgurMetaDataFromPostId(postId) {
  let response = {};
  response.comments = await fetchCommentsForPost(postId, clientId);

  response.details = await fetchPostInfo(postId, clientId);

  return trimMetaData(response);
}

async function searchImgurLocallyRoute(req, res) {
  const parsedUrl = parse(req.url, true);
  const queryParams = parsedUrl.query;

  let userId = await checkSessionId(req, res);
  if (!userId) return;

  let tags = queryParams.tags.split(/\s+/);

  if (tags.length == 0) tags = null;

  console.log(`tags: ${tags}`);

  let title = queryParams.title;

  let result = await searchImgurLocally(userId, tags, title);

  console.log(result);

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify(
      result.map((item) => {
        return { image_id: item.image_id };
      })
    )
  );
}

async function searchImgurLocally(userId, tags, title) {
  let ids = (await dataBase.getUserImages(userId)).map(
    (image) => image.image_id
  );

  let imgurs = await dataBase.retainImgurImages(ids);

  let metas = await Promise.all(
    imgurs.map(async (id) => await dataBase.getImgurMetaData(id))
  );

  console.log("before filters");

  console.log(`title :${title}`);

  console.log(`tags :${tags}`);

  if (title) metas = filterImgurByTitle(metas, title);

  if (tags) metas = filterImgurByTags(metas, tags);

  return metas;
}

function filterImgurByTitle(metas, titleSubstring) {
  return metas.filter((meta) =>
    meta.title.toLowerCase().includes(titleSubstring.toLowerCase())
  );
}

function filterImgurByTags(metas, tags) {
  return metas.filter((meta) =>
    tags.every((tag) => meta.tags.toLowerCase().includes(tag.toLowerCase()))
  );
}

function stringToRegex(str) {
  const parts = str.match(/^\/(.*)\/([a-z]*)$/);
  if (!parts) {
    throw new Error("Invalid regular expression string");
  }
  const pattern = parts[1];
  const flags = parts[2];
  return new RegExp(pattern, flags);
}

async function getUserEditsRoute(req, res) {
  let userId = await checkSessionId(req, res);
  if (!userId) return;

  let results = await dataBase.getUserEdits(userId, "edit");

  console.log(results);

  res.writeHead(200);
  res.end(
    JSON.stringify(
      results.map((item) => {
        return { id: item.id };
      })
    )
  );
}

//"server/repository/images/1.jpg"
async function uploadImageToImgur(accessToken, imageFilePath, title) {
  try {
    const imageData = await readFile(imageFilePath);

    const base64Image = imageData.toString("base64");

    const response = await axios.post(
      "https://api.imgur.com/3/image",
      {
        image: base64Image,
        type: "base64",
        title,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const uploadedImage = response.data.data;

    return uploadedImage;
  } catch (error) {
    console.error("Error uploading image:", error.response);
    throw error;
  }
}

async function shareImageToCommunity(
  imageHash,
  accessToken,
  title,
  topic,
  terms,
  mature,
  tags
) {
  try {
    // Make a POST request to share the image with the community
    const response = await axios.post(
      `https://api.imgur.com/3/gallery/image/${imageHash}`,
      {
        title: title,
        topic: topic,
        terms: terms,
        mature: mature,
        tags: tags,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Extract the response data
    const responseData = response.data;

    // Return the response data
    return responseData;
  } catch (error) {
    console.error("Error sharing image to community:", error.message);
    return null;
  }
}

async function uploadImage(req, res) {
  let userId = await checkSessionId(req, res);
  if (!userId) return;

  let accessToken = (await dataBase.getUserImgurAccessToken(userId)).token;

  console.log("token stored: " + accessToken);

  if (!accessToken) {
    res.writeHead(500, { "Content-Type": "application/json" });

    res.end(JSON.stringify({ cause: "accessToken" }));

    return;
  }

  const parsedUrl = parse(req.url, true);
  const queryParams = parsedUrl.query;

  const to = queryParams.to;

  const imageId = queryParams.imageId;

  let responseCode = 200;
  let responseBody = {};

  let image = await dataBase.getImageById(imageId);

  if (!image) {
    responseBody.cause = "no such image on the server";
    responseCode = 400;
  } else if (to == "imgur") {
    let uploadedImage = await uploadImageToImgur(
      accessToken,
      imageId2Path(imageId, image.ext),
      queryParams.title
    );

    let imageHash = uploadedImage.id;

    if (imageHash) {
      let result = await shareImageToCommunity(
        imageHash,
        accessToken,
        queryParams.title,
        null,
        null,
        null,
        null
      );

      responseBody.platformResponse = result;
    } else {
      deleteImgurImage(accessToken, uploadedImage.deletehash);

      responseBody.cause = "couldn't upload to imgur";
      responseCode = 500;
    }
  } else {
    responseBody.cause = "unknown platform";
    responseCode = 400;
  }

  res.writeHead(responseCode, { "Content-Type": "application/json" });

  res.end(JSON.stringify(responseBody));
}

function imageId2Path(imageId, ext) {
  return `server/repository/images/${imageId}${addLeadingPeriod(ext)}`;
}

function addLeadingPeriod(str) {
  return str.startsWith(".") ? str : `.${str}`;
}

async function deleteImgurImage(accessToken, imageId) {
  const url = `https://api.imgur.com/3/image/${imageId}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.ok) {
    const data = await response.json();
    console.log("Image deleted successfully:", data);
  } else {
    console.error(
      "Failed to delete image:",
      response.status,
      response.statusText
    );
  }
}

async function getUserImgurPosts(username, accessToken) {
  try {
    // Fetch user's posts from Imgur API
    const response = await axios.get(
      `https://api.imgur.com/3/account/${username}/submissions`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // Extract post data from the response
    const postData = response.data.data;

    // Return the posts
    return postData;
  } catch (error) {
    // Write error message to a file
    fs.writeFileSync(
      "error.html",
      `${error.response ? error.response.data : error.message}\n`
    );
    return [];
  }
}

async function deleteUserImgurPosts(accessToken, username) {
  try {
    let userPosts = await getUserImgurPosts(username, accessToken);

    // Map the array of promises
    let deletionPromises = userPosts.map(async (post) => {
      await deleteImgurImage(accessToken, post.id);
    });

    // Wait for all promises to resolve
    await Promise.all(deletionPromises);

    console.log("All images deleted successfully.");
  } catch (error) {
    console.error("Error deleting images:", error);
  }
}

async function storeImgurAccessToken(req, res) {
  let userId = await checkSessionId(req, res);
  if (!userId) return;

  let body = await getBodyFromRequest(req);

  let token = body.accessToken;

  let ok = await dataBase.insertImgurAccessToken(userId, token);

  console.log(ok);

  res.end();
}
