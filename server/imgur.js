import axios from "axios";
import { clientId } from "./imgur-credentials.js";

export async function fetchImgurImages(tags, options = {}) {
  //tags is like ["cats", "funny"]
  try {
    const response = await axios.get(
      "https://api.imgur.com/3/gallery/search/",
      {
        params: {
          q: tags.join(","),
          page: 0, //to get more you'd set page: current_page+1
          ...options,
        },
        headers: {
          Authorization: `Client-ID ${clientId}`,
        },
      }
    );

    if (!response.data || !response.data.data) {
      throw new Error("Invalid response from Imgur API");
    }

    const images = getImgLinksFromImgurAlbums(response.data.data);

    return images;
  } catch (error) {
    console.error("Error searching images:", error);
    return null;
  }
}
export function getImgLinksFromImgurAlbums(data) {
  const imgLinks = [];

  data.forEach((item) => {
    if (item.is_album) {
      const albumImages = item.images || [];
      albumImages.forEach((image) => {
        if (image.type === "image/jpeg" || image.type === "image/png") {
          imgLinks.push({
            src: image.link,
            postId: item.id,
            foreign: true,
            type: "New Imgur",
          });
        }
      });
    } else if (item.type === "image/jpeg" || item.type === "image/png") {
      imgLinks.push({
        src: item.link,
        postId: item.id,
        foreign: true,
        type: "New Imgur",
      });
    }
  });

  return imgLinks;
}
