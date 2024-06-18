import axios from "axios";
import fs from "fs";

export async function downloadImage(imageUrl, outputFilePath) {
  const response = await axios({
    url: imageUrl,
    method: "GET",
    responseType: "stream",
  });

  const contentType = response.headers["content-type"];
  const extension = contentType ? `.${contentType.split("/")[1]}` : "";

  outputFilePath += extension;

  const writer = fs.createWriteStream(outputFilePath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => resolve(extension));
    writer.on("error", reject);
  });
}

export function conc(...args) {
  return args.every((arg) => arg != null) ? args.join("") : undefined;
}

export async function getImageExtension(imageUrl) {
  try {
    const response = await axios.head(imageUrl);

    const contentType = response.headers["content-type"];

    return contentType ? `${contentType.split("/")[1]}` : "";
  } catch (error) {
    console.error("Error getting image extension:", error.message);
    return null;
  }
}

export function pointedExtension(ext) {
  return ext[0] == "." ? ext : `.${ext}`;
}
