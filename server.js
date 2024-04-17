import { createServer } from "http";
import { parse } from "url";
import { readFile, stat } from "fs/promises";
import { join, dirname } from "path";
import { getContentType } from "./functions.js";

const __dirname = decodeURIComponent(
  dirname(new URL(import.meta.url).pathname)
).slice(1);

const serverFile = async (res, filePath) => {
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
  const filePath = join(
    __dirname,
    pathnameComponents[0],
    pathnameComponents[1]
  );

  serverFile(res, filePath);
};

const server = createServer(async (req, res) => {
  const parsedUrl = parse(req.url, true);
  let pathname = parsedUrl.pathname;
  const pathComponents = pathname.split("/").filter(Boolean);

  console.log(pathComponents);
  const staticFolders = [
    "mainPages",
    "components",
    "resources",
    "scripts",
    "styles",
  ];
  if (pathComponents.length == 0) {
    const filePath = join(__dirname, "mainPages", "main_page.html");
    serverFile(res, filePath);
  } else if (pathComponents.length == 1) {
    const filePath = join(__dirname, "mainPages", pathComponents[0]);
    serverFile(res, filePath);
  } else if (
    pathComponents.length > 1 &&
    staticFolders.includes(pathComponents.at(0))
  ) {
    serveStaticFile(res, pathComponents);
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Page not found");
  }
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
