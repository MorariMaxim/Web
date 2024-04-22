import { createServer } from "http";
import { parse } from "url";
import { readFile, stat } from "fs/promises";
import { join, dirname } from "path";
import { getContentType } from "./scripts/functions.js";
import { dataBase } from "./scripts/database.js";
import { generateSessionId } from "./scripts/authentificationServerSide.js";

const __dirname = decodeURIComponent(
  dirname(new URL(import.meta.url).pathname)
).slice(1);

const serveFile = async (res, filePath) => {
  const fileExists = async (filePath) => {
    try {
      await stat(filePath);
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
  } else if (pathComponents[0] == "loginRoute") {
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
