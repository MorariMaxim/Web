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
  fetchPostsFromImgur,
} from "./server/imgur.js";
import axios from "axios";
import fs from "fs";
import { imgurApplicationClientId } from "./server/imgur-credentials.js";
import nodemailer from "nodemailer";
import {
  fetchUnsplashImages,
  fetchUnsplashMeta,
} from "./server/unsplash/main.js";

import { pointedExtension } from "./server/utilities.js";
import { log } from "console";

const applicationEmail = "mpic_application@outlook.com";
const emailPassword = "mpic102442=Asf";

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

  for (let component of pathnameComponents) {
    filePath = join(filePath, component);
  }

  serveFile(res, filePath);
};

const staticFolders = [
  "mainPages",
  "components",
  "resources",
  "scripts",
  "styles",
];

const server = createServer(async (req, res) => {
  try {
    const parsedUrl = parse(req.url, true);
    let pathname = parsedUrl.pathname;
    const pathComponents = pathname.split("/").filter(Boolean);

    if (pathComponents.length == 0) {
      const filePath = join(__dirname, "mainPages", "main_page.html");
      serveFile(res, filePath);
    } else {
      switch (pathComponents[0]) {
        case "imgurAccessToken":
          serveFile(res, "imgurAccessToken.html");
          break;
        case "storeImgurAccessToken":
          storeImgurAccessToken(req, res);
          break;
        case "uploadDataArrayImage":
          uploadDataArrayImage(req, res);
          break;
        case "uploadImage":
          uploadImage(req, res);
          break;
        case "changeImageMeta":
          changeImageMeta(req, res);
          break;
        case "getMeta":
          getMeta(req, res);
          break;
        case "getImage":
          getImage(req, res);
          break;
        case "searchImages":
          searchImagesRoute(req, res);
          break;
        case "saveImages":
          saveImages(req, res);
          break;
        case "loginRoute":
          loginRoute(req, res);
          break;
        case "resetPassword":
          resetPassword(req, res);
          break;
        case "api":
          if (pathComponents[1] === "images") {
            if (pathComponents.length === 2) {
              let images = await searchLocalImagesRoute(req, res);
              sendJsonResponse(res, images);
            } else if (pathComponents.length === 3) {
              let image = await getImageObjectRoute(
                req,
                res,
                pathComponents[2]
              );
            } else {
              sendNotFoundResponse(res);
            }
          } else if (pathComponents[1] === "getImage") {
            await getImage(req, res);
          } else sendNotFoundResponse(res);
          break;
        default:
          if (pathComponents.length == 1) {
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
          break;
      }
    }
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

const PORT = 3000;

const CLEANUP_INTERVAL = 5 * 60 * 1000; // milliseconds, here every 5 minutes

startDBCleanUpThread();

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

function sendJsonResponse(res, object) {
  if (!object) {
    sendNotFoundResponse(res);
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(object));
  }
}

function sendNotFoundResponse(res, message = "Not Found") {
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end(message);
}

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
    console.log("userId :>> ", userId);

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
      let user = await dataBase.getUserByName(body.username);

      console.log("user :>> ", user);
      if (!user || user.password != body.password) {
        console.log(
          `Bad credentials: request: ${JSON.stringify(
            body
          )}, db: ${JSON.stringify(user)}`
        );
      } else {
        const newSessionId = await generateSessionId();

        response.username = user.getUsername;
        response.validCredentials = "true";
        response.sessionId = newSessionId;

        await dataBase.run(
          `delete from sessions where user_id = ${user.getId}`
        );
        await dataBase.setSessionId(user.getId, newSessionId);
      }
    } else {
      let userData = await dataBase.getUserByName(body.username);
      let emailTaken = await (async () => {
        let result = await dataBase.executeFunction(
          `select * from users where email = $1`,
          [body.email]
        );
        return result && result.length > 0;
      })();
      if (emailTaken) {
        response.signupresult = "email already in use";
      } else if (userData) {
        response.signupresult = "username taken";
      } else {
        console.log(
          await dataBase.addUser(body.username, body.password, body.email)
        );
        let userId = (await dataBase.getUserByName(body.username)).id;
        console.log("userId :>> ", userId);
        response.signupresult = "success";
        const newSessionId = await generateSessionId();
        console.log(newSessionId);

        await dataBase.run(`delete from sessions where user_id = ${userId}`);
        await dataBase.setSessionId(userId, newSessionId);

        console.log(await dataBase.getSessionIdByUserId(userId));

        response.sessionId = newSessionId;
      }
    }
  }

  res.end(JSON.stringify(response));
}

async function searchImagesRoute(req, res) {
  const parsedUrl = parse(req.url, true);
  const queryParams = parsedUrl.query;

  let images;
  try {
    switch (queryParams.type) {
      case "imgurDownload":
        images = await fetchImgurImages(JSON.parse(queryParams.options));
        break;
      case "unsplashSearch":
        images = await fetchUnsplashImages(JSON.parse(queryParams.criteria));

        images = images.results.map((image) => {
          return { src: image.urls.raw, id: image.id, type: "New Unsplash" };
        });
        break;
      case "local":
        images = await searchLocalImagesRoute(req, res);
        break;
      case "RemoteImgurUserImages":
        images = await fetchRemoteImgurUserImage(req, res);
        break;
      default:
        res.writeHead(404);
        res.end();
        break;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(images));
  } catch (e) {}
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
  else if (imageType == "New Unsplash") saveNewUnsplashImages(req, res);
  else if (imageType == "base64") saveDataArrayImage(req, res);
}

async function saveDataArrayImage(req, res) {
  let body = await getBodyFromRequest(req);
  let userId = await checkSessionId(req, res);
  if (!userId) return;

  let dataArray = Buffer.from(body.data, "base64");
  let extension = body.ext;
  let type = body.type;

  console.log(req.headers.sessionid);
  try {
    if (!dataArray) throw new Error();

    let imageId = await insertAsocciateImage(type, extension, userId);

    await saveImageLocally(
      dataArray,
      `server/repository/images/${imageId}${
        extension[0] == "." ? extension : "." + extension
      }`
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ id: imageId.imageId }));
  } catch {
    res.writeHead(500);
  }
}

async function saveImageLocally(buffer, filename) {
  await writeFile(filename, buffer);
}

async function saveNewImgurImages(req, res) {
  let body = await getBodyFromRequest(req);
  let userId = await checkSessionId(req, res);
  if (!userId) return;
  let response = {};
  for (let image of body) {
    let imageUrl = image.src;
    let postId = image.postId;

    try {
      let imageId = await dataBase.saveImgurImageToUser(
        userId,
        postId,
        imageUrl
      );
      await downloadImgurImage(
        imageUrl,
        "server/repository/images/" + imageId + extname(imageUrl)
      );
      response[imageUrl] = imageId;

      let meta = await getImgurMetaDataFromPostId(postId);

      await dataBase.storeImgurMetaAndComments(imageId, meta);
    } catch {
      response[imageUrl] = "fail";
    }
  }

  res.writeHead(200, { "Content-Type": "application/json" });
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
        reject(false);
      } else {
        console.log("Image data written to file:", imagePath);
        resolve(true);
      }
    });
  });
}

async function checkSessionId(req, res, end = true) {
  let userId = await dataBase.getUserIdBySessionId(req.headers.sessionid);

  if (userId == null && end) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Invalid sessionId");
    return null;
  } else if (userId != null) {
    dataBase.refreshLastLoginTime(req.headers.sessionid);
  }
  return userId;
}

// testing function
(async () => {
  console.log(await dataBase.getImages());

  const imageId = 8;
  const meta = {
    views: 1000,
    ups: 100,
    downs: 10,
    title: "Example Image Title",
    description: "This is an example description for the image.",
    tags: ["tag1", "tag2", "tag3"],
  };

  console.log(await dataBase.executeFunction("select * from sessions"));

  // await deleteImages([100, 1002]);

  const images = await fetchImages("maxim", "dunes", ["desert"]);
  images.forEach((image) => {
    triggerGetImageObjectRoute(image, true);
  });

  // await triggerGetImageObjectRoute(40);
  // await triggerGetImageObjectRoute(53);
  // await triggerGetImageObjectRoute(54);
  // await triggerGetImageObjectRoute(59);
})();

async function fetchImages(username, title, tags) {
  try {
    const queryParams = new URLSearchParams();
    if (username != null) queryParams.append("username", username);
    if (title != null) queryParams.append("title", title);
    if (tags != null) queryParams.append("tags", tags);

    const queryString = queryParams.toString();

    const response = await axios.get(
      `http://localhost:3000/api/images?${queryString}`
    );
    console.log("Images:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching images:", error.message);
    return [];
  }
}

async function triggerGetImageObjectRoute(imageId, simpleDisplay = false) {
  try {
    const response = await axios.get(
      `http://localhost:3000/api/images/${imageId}`
    );
    if (simpleDisplay) {
      console.log(response.data);
    } else {
      console.log("Status:", response.status, response.headers);
      console.log("Response:", response.data);
    }
  } catch (error) {
    console.error("Error fetching image object:", error.message);
  }
}

async function deleteImages(imageIds) {
  const placeholders = imageIds.map((_, index) => `$${index + 1}`).join(", ");
  const sql = `DELETE FROM images WHERE id IN (${placeholders})`;

  try {
    console.log(await dataBase.executeFunction(sql, imageIds));
  } catch (error) {
    console.error("Error deleting entries:", error);
  }
}

async function getImageObjectRoute(req, res, imageId) {
  let image = await getImageObject(parseInt(imageId, 10));
  sendJsonResponse(res, image);
}

async function getImageObject(imageId) {
  let image = await dataBase.getBaseImageByid(imageId);
  if (!image) return null;

  let meta = {};
  switch (image.type) {
    case "imgur":
      meta = await dataBase.getImgurMetaAndCommentsData(imageId);
      meta && (meta = { comments: meta.comments, ...meta.details });
      break;
    case "unsplash":
      meta = await dataBase.getUnsplashMeta(imageId);
      break;

    default:
      let tags = await dataBase.getAllTagsByImageId(imageId);
      meta = { tags: tags };

      let title = await dataBase.getTitleByImageId(imageId);
      meta = { ...meta, title: title };
      break;
  }

  return { ...image, ...meta };
}

async function getImage(req, res) {
  console.log("getImage");
  const parsedUrl = parse(req.url, true).query;

  let id = parsedUrl.id;

  let image = await dataBase.getBaseImageByid(id);

  if (!image) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Image not found");
    return;
  }

  const filePath = join(
    "server/repository/images",
    `${id}${pointedExtension(image.ext)}`
  );

  console.log(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendNotFoundResponse(res);
    } else {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      res.end(data);
    }
  });
}

async function getMeta(req, res) {
  console.log("getMeta request");
  let imageId = req.headers.imageid;
  let remoteId = req.headers.remoteid;
  let type = req.headers.type;

  let response = {};

  if (imageId) {
    let image = await dataBase.getBaseImageByid(imageId);
    let imageType = image.type;

    if (imageType == "imgur") {
      let metaData = await dataBase.getImgurMetaAndCommentsData(imageId);

      if (metaData) {
        response.comments = metaData.comments;
        response.details = metaData.details;
      } else {
        let imgurImage = await dataBase.getImgurImage(imageId);

        imgurId = imgurImage.postId;

        if (imgurId) {
          response = await getImgurMetaDataFromPostId(imgurId);
        }
      }
    } else if (imageType == "unsplash") {
      let meta = await dataBase.getUnsplashMeta(imageId);
      if (!meta) await dataBase.saveUnsplashMeta(imageId, remoteId);

      response.details = await dataBase.getUnsplashMeta(imageId);
    }
  } else if (type == "New Imgur") {
    response = await getImgurMetaDataFromPostId(remoteId);
  } else if (type == "New Unsplash") {
    response = await remoteIdgetUnsplashMetaFromRemoteId(remoteId);
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(response));
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
    tags: meta.details.tags?.map((tag) => {
      return tag.name;
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

async function insertAsocciateImage(type, ext, userId) {
  try {
    let imageId = await dataBase.insertImage(type, ext);
    await dataBase.associateImageToUser(imageId, userId);
    return imageId;
  } catch (e) {
    throw e;
  }
}

async function getImgurMetaDataFromPostId(postId) {
  let response = {};
  response.comments = await fetchCommentsForPost(
    postId,
    imgurApplicationClientId
  );

  response.details = await fetchPostInfo(postId, imgurApplicationClientId);

  return trimMetaData(response);
}

async function remoteIdgetUnsplashMetaFromRemoteId(id) {
  let response = {};

  response.details = await fetchUnsplashMeta(id);
  return response;
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

  let accessToken = await dataBase.getUserImgurAccessToken(userId);

  console.log("token stored: " + accessToken);

  accessToken = accessToken.token;

  if (!accessToken) {
    res.writeHead(500, { "Content-Type": "application/json" });

    res.end(JSON.stringify("no accessToken"));

    return;
  }

  const parsedUrl = parse(req.url, true);
  const queryParams = parsedUrl.query;

  const to = queryParams.to;

  const imageId = queryParams.imageId;

  let responseCode = 200;
  let responseBody = {};

  let image = await dataBase.getBaseImageByid(imageId);

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

  let account_username = body.account_username;

  console.log("storeImgurAccessToken: " + body);

  let ok = await dataBase.insertImgurAccessToken(
    userId,
    token,
    account_username
  );

  console.log(ok);

  res.end();
}
const secretKey = "dasv12mhuvmohi,xuh121cr1";

/* async function jwtRoute(req, res) {
  console.log("JWTROUTE, getting body");
  let body = await getBodyFromRequest(req);
  let username = body.username;
  console.log(username);

  let userId = await dataBase.getUserIdByUsername(username);

  if (userId) {
    const token = jwt.sign({ userId }, secretKey, {
      expiresIn: "10d",
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ token }));
  } else {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Unauthorized",
        message: "Invalid username",
      })
    );
  }
}
 */

async function changeImageMeta(req, res) {
  let userId = await checkSessionId(req, res);
  if (!userId) return;

  let body = await getBodyFromRequest(req);

  console.log("body :>> ", body);

  let result = await dataBase.updateImageMetaData(body.id, body.meta);

  console.log("result :>> ", result);
}

async function fetchRemoteImgurUserImage(req, res) {
  let userId = await checkSessionId(req, res);
  if (!userId) return;

  let result = await dataBase.getUserImgurAccessToken(userId);

  if (!result) {
    res.writeHead(500, { "Content-Type": "application/json" });

    res.end("no accessToken");
    throw new Error("");
  } else {
    let { token, account_username } = result;

    dataBase.refreshImgurAccessTokenLastAccessDate(token);

    return await fetchPostsFromImgur(account_username, token);
  }
}

async function sendEmail(mailOptions) {
  return new Promise((resolve, reject) => {
    let transporter = nodemailer.createTransport({
      host: "smtp-mail.outlook.com", // Outlook.com SMTP server
      port: 587, // Port for Outlook.com
      secure: false, // TLS required, but not SSL
      auth: {
        user: applicationEmail,
        pass: emailPassword,
      },
    });

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(error);
      } else {
        console.log("Message sent:", info.messageId);
        resolve(info);
      }
    });
  });
}

async function resetPassword(req, res) {
  let body = await getBodyFromRequest(req);

  let userName = body.username;
  let resetcode = body.resetcode;
  let newpassword = body.newpassword;

  if (userName) {
    let user = await dataBase.getUserByName(userName);

    if (!user) {
      res.writeHead(401);
      res.end();
    }
    let generatedCode = generateRandomCode(6);

    console.log(
      'await dataBase.executeFunction("delete from resetPassCodes where username = $1", [userName]) :>> ',
      await dataBase.executeFunction(
        "delete from resetPassCodes where username = $1",
        [userName]
      )
    );
    console.log(
      await dataBase.executeFunction(
        "insert into resetPassCodes (username, code) values ($1,$2)",
        [userName, generatedCode]
      )
    );
    let email = user.getEmail;
    console.log("email :>> ", email);

    try {
      await sendEmail({
        from: applicationEmail,
        to: user.getEmail,
        subject: "Code for password reset",
        text: `You can use this code to reset your password: ${generatedCode}`,
      });
    } catch (e) {
      console.log("Error sending email", e);
      res.writeHead(500);
      res.end();
      return;
    }

    res.writeHead(200);
    res.end();
  } else if (resetcode && newpassword) {
    let result = await dataBase.executeFunction(
      "select username from resetPassCodes where code = $1 ",
      [resetcode]
    );
    if (result.length == 0) {
      res.writeHead(401);
      res.end("Invalid reset code");
    } else {
      let username = result[0].username;

      result = await dataBase.executeFunction(
        "UPDATE users SET password = $1 WHERE username = $2",
        [newpassword, username]
      );

      console.log("result :>> ", result);

      res.writeHead(200);
      res.end();
    }
  }
  res.writeHead(400);
  res.end();
}
function generateRandomCode(length) {
  const characters =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let code = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
}

async function uploadDataArrayImage(req, res) {
  let userId = await checkSessionId(req, res);
  if (!userId) return;
}

async function saveNewUnsplashImages(req, res) {
  let userId = await checkSessionId(req, res);
  let body = await getBodyFromRequest(req);

  let response = {};
  for (let image of body) {
    let imageUrl = image.src;

    try {
      let imageId = await dataBase.saveUnsplashImageToUser(
        imageUrl,
        image.id,
        userId
      );

      response[imageUrl] = imageId;
    } catch {
      response[imageUrl] = "fail";
    }
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  console.log("sending " + JSON.stringify(response));
  res.end(JSON.stringify(response));
}
async function searchLocalImagesRoute(req, res) {
  const parsedUrl = parse(req.url, true);
  const queryParams = parsedUrl.query;

  let userId = await checkSessionId(req, res, false);
  if (!userId) {
    let userName = queryParams.username;
    userId = await dataBase.getUserIdByUsername(userName);
  }

  let tags =
    queryParams.tags?.split(",").filter((item) => item.length > 0) || [];

  if (tags.length == 0) tags = null;

  let title = queryParams.title || null;

  let origin = queryParams.origin || null;
  if (origin == "none") origin = null;

  let ids;
  if (userId) {
    ids = (await dataBase.getUserImages(userId)).map((image) => image.image_id);
  } else {
    ids = (await dataBase.getImages()).map((image) => image.id);
  }

  return await dataBase.filterIds(ids, tags, origin, title);
}

function startDBCleanUpThread() {
  dataBase.cleanUpExpiredData().catch((err) => {
    console.error("Error during scheduled cleanup:", err);
  });

  setInterval(() => {
    dataBase.cleanUpExpiredData().catch((err) => {
      console.error("Error during scheduled cleanup:", err);
    });
  }, CLEANUP_INTERVAL);
}
