import { createApi } from "unsplash-js";
import { accessKey } from "./data.js";

const unsplash = createApi({
  accessKey,
  fetch,
});

export async function fetchPhotoDetails(photoId) {
  try {
    let response = await unsplash.photos.get({ photoId });

    if (response.errors) {
      console.log("Error occurred: ", response.errors[0]);
      return null;
    }
    response = response.response;
    let result = {};
    result.description = response.description || response.alt_description || "";
    result.likes = response.likes;
    result.location =
      (
        (response.location?.name || "") +
        ", " +
        (response.location?.city || "") +
        ", " +
        (response.location?.country || "")
      )
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length != 0)
        .join(", ") || "somewhere";

    result.tags = response.tags.map((tag) => tag.title);
    result.views = response.views;
    result.downloads = response.downloads;

    return result;
  } catch (error) {
    console.error("Error fetching photo details from Unsplash: ", error);
    return null;
  }
}

const photoId = "cQXOOB_qQbY";

console.log(await fetchPhotoDetails(photoId));
