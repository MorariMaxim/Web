import axios from "axios";
import { imgurApplicationClientId } from "./imgur-credentials.js";

export async function fetchImgurImages(options = {}) {
  console.log("fetchImgurImages: " + JSON.stringify(options));
  console.log({
    page: 0, //to get more you'd set page: current_page+1
    ...options,
    // q: "title: dog AND cat",
  });
  try {
    const response = await axios.get(
      "https://api.imgur.com/3/gallery/search/",
      {
        params: {
          page: 0, //to get more you'd set page: current_page+1
          ...options,
          // q: "title: dog AND cat",
        },
        headers: {
          Authorization: `Client-ID ${imgurApplicationClientId}`,
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
            type: "New Imgur",
          });
        }
      });
    } else if (item.type === "image/jpeg" || item.type === "image/png") {
      imgLinks.push({
        src: item.link,
        postId: item.id,
        type: "New Imgur",
      });
    }
  });

  return imgLinks;
}

export async function fetchCommentsForPost(postId, imgurApplicationClientId) {
  try {
    const response = await axios.get(
      `https://api.imgur.com/3/gallery/${postId}/comments`,
      {
        headers: {
          Authorization: `Client-ID ${imgurApplicationClientId}`,
        },
      }
    );

    const commentData = response.data.data;

    return commentData;
  } catch (error) {
    return [];
  }
}

export async function fetchPostInfo(postId, imgurApplicationClientId) {
  try {
    const response = await axios.get(
      `https://api.imgur.com/3/gallery/${postId}`,
      {
        headers: {
          Authorization: `Client-ID ${imgurApplicationClientId}`,
        },
      }
    );

    const commentData = response.data.data;
    
    return commentData;
  } catch (error) {
    return [];
  }
}

export async function fetchPostsFromImgur(username, accessToken) {
  try {
    const response = await axios.get(
      `https://api.imgur.com/3/account/${username}/submissions`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const postData = response.data.data;

    return getImgLinksFromImgurAlbums(postData);
  } catch (error) {
    console.log(error);
    return [];
  }
}
