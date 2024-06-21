import { createApi } from "unsplash-js";
let accessKey = "YMcVGZL6kF-vfWzquORkPYHa5hfD2U-MV2H-uXfG02E";

const unsplash = createApi({
  accessKey,
  fetch,
});

export async function fetchUnsplashImages(criteria) {
  try {
    const response = await unsplash.search.getPhotos({
      query: criteria.query,
      page: criteria.page || 1,
      perPage: criteria.perPage || 10,
      orientation: criteria.orientation,
      color: criteria.color,
      orderBy: criteria.orderBy,
      collections: criteria.collections,
      contentFilter: criteria.contentFilter,
    });

    if (response.errors) {
      console.log("Error occurred: ", response.errors[0]);
      return null;
    }

    return response.response;
  } catch (error) {
    console.error("Error fetching images from Unsplash: ", error);
    return null;
  }
}

export async function fetchUnsplashMeta(photoId) {
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

const criteria = {
  query: "cat dog desert",
  page: 1,
  perPage: 15,
  orientation: "landscape",
  color: "yellow",
  orderBy: "relevant",
  contentFilter: "high",
};



async function fetchUserImagesFromUnsplash(username) {
  try {
    const userPhotosResponse = await unsplash.users.getPhotos({ username });
    if (userPhotosResponse.errors) {
      console.log("Error fetching user photos from Unsplash:", userPhotosResponse.errors);
      return [];
    }

    const photos = userPhotosResponse.response.results;
    return photos.map(photo => ({
      id: photo.id,
      url: photo.urls.full,
      description: photo.description || photo.alt_description || "No description",
      likes: photo.likes,
      views: photo.views,
      downloads: photo.downloads
    }));
  } catch (error) {
    console.error("Error in fetchUserImagesFromUnsplash:", error);
    return [];
  }
}



