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
import { config } from "process";
import { DESTRUCTION } from "dns";
// import { Database } from "sqlite3";

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

  if (pathComponents.length == 0) {
    const filePath = join(__dirname, "mainPages", "main_page.html");
    serveFile(res, filePath);
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
  const type = req.headers.type;
  let options = {};
  if (type == "imgurDownload") {
    if (req.headers.section) {
      options.section = req.headers.section;
    }
    if (req.headers.window) {
      options.window = req.headers.window;
    }
    if (req.headers.sort) {
      options.sort = req.headers.sort;
    }
    if (req.headers.q) {
      options.q = req.headers.q;
    }

    console.log(`received options: ${JSON.stringify(options)}`);
    let images = await fetchImgurImages(options);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(images));
    // res.end(null);
  } else if (type == "imgurLocal") {
    let userId = await dataBase.getUserIdBySessionId(req.headers.sessionid);

    if (!userId) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("invalid sessionID");
      return;
    }

    let images = await dataBase.getUserImages(userId);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(images));
  } else {
    res.writeHead(404);
  }
}

async function saveImages(req, res) {
  let imageType = req.headers.imagetype;

  console.log(imageType);

  let sessionId = req.headers.sessionid;
  if (!(await checkSessionId(sessionId))) return;

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
      /* res.writeHead(500);
      res.end("server side error"); */

      if (
        saveImageLocally(
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
  console.log("saveNewImgurImages");
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
    console.log("past saveImgurImageToUser");
    console.log("result " + JSON.stringify( result));
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

      saveImageMetaData(meta, result.id);
    } else response[imageUrl] = "fail";
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  console.log("sending " + JSON.stringify(response));
  res.end(JSON.stringify(response));
}

async function downloadImgurImage(imageUrl, imagePath) {

  console.log(`downloadImgurImage ${imageUrl,imagePath}`);
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

async function checkSessionId(sessionId, res) {
  let userId = dataBase.getUserIdBySessionId(sessionId);

  if (userId == null) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Invalid sessionId");
    return false;
  }

  return true;
}

(async () => {
  //const imageResponse = await axios.get("http://localhost:3000/getImage?id=1");
  console.log(await dataBase.getImages());
  /*
  await saveImageMetaData(
    {
      details: { likes: 2 },
      comments: [{ comment: "cool image" }],
    },
    2
  );

  let meta = await getImageMetaData(2);

  console.log(meta); */
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
  try {
    // Write the metadata to the file
    await writeFile(
      `server/repository/image_meta/${imageId}.json`,
      JSON.stringify(meta)
    );

    // Indicate success
    return true;
  } catch (err) {
    // Log the error
    console.error("Error saving metadata:", err);
    // Indicate failure
    return false;
  }
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
