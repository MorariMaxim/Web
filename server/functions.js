import { extname } from "path";

export const getFile = async (filePath) => {
  if (await fileExists(filePath)) {
    try {
      const data = await readFile(filePath);
      return data;
    } catch (err) {
      console.error("Error reading file:", err);
      throw new Error("Internal Server Error");
    }
  } else {
    throw new Error("File not found");
  }
};

export const getContentType = (filePath) => {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html";
    case ".css":
      return "text/css";
    case ".js":
      return "application/javascript";
    case ".json":
      return "application/json";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
};

