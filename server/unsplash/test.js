import { createApi } from "unsplash-js";
import { accessKey } from "./data.js";

const unsplash = createApi({
  accessKey,
  fetch,
});

async function fetchImages(criteria) {
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

// Example usage
const criteria = {
  query: "cat desert",
  page: 1,
  perPage: 15,
  orientation: "squarish",
  color: "yellow",
  orderBy: "relevant",
  collections: ["123", "456"],
  contentFilter: "high",
};

fetchImages(criteria).then((result) => {
  if (result) {
    console.log("Total results:", result.total);
    console.log("Total pages:", result.total_pages);
    console.log("Number of results on this page:", result.results.length); 
    console.log("Results:", result.results[0].urls.raw);
  }
});
