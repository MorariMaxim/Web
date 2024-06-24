import { redirectTo } from "./common.js";
import { serverIp, imgurApplicationClientId } from "./server_location.js";

let bar = document.getElementById("filter-phact-menu");

let gallery = document.getElementById("gallery-wrapper");

let button = document.getElementById("toggleButton");
button.addEventListener("click", function () {
  let computedStyle = window.getComputedStyle(bar);

  if (computedStyle.display === "none") {
    bar.style.display = "block";
    gallery.style.display = "none";
  } else {
    bar.style.display = "none";
    gallery.style.display = "block";
  }
});

let toggleButton = document.getElementById("toggleButton");

toggleButton.addEventListener("click", function () {
  toggleButton.classList.toggle("active");
});

let toggleCircle = document.getElementById("toggleCircle");

let computedHeight = window.getComputedStyle(toggleCircle).height;

toggleCircle.style.width = computedHeight;

window.addEventListener("resize", function () {
  let toggleCircle = document.getElementById("toggleCircle");

  let computedHeight = window.getComputedStyle(toggleCircle).height;

  toggleCircle.style.width = computedHeight;
});

function deleteGalleryImages() {
  console.log("hre");
  let gallery = document.getElementById("gallery");
  while (gallery.firstChild) {
    gallery.removeChild(gallery.firstChild);
  }
}

function deleteGalleryImagesByIds(ids) { 
  let gallery = document.getElementById("gallery");
  let images = gallery.querySelectorAll("img");
  images.forEach((image) => { 
    let match = image.src.match(/getImage\?id=(\d+)/); 
    if (match && ids.includes(parseInt(match[1]))) {
      gallery.removeChild(image.parentNode);
    }
  });
}

export function makeImagesSelectable() {
  let images = document.querySelectorAll(".gallery-item img");

  images.forEach((image) => {
    image.addEventListener("click", function () {
      image.classList.toggle("selected-image");
    });
  });
}

makeImagesSelectable();

let selectAlls = document.querySelectorAll(".SelectAll");

selectAlls.forEach((selector) => {
  selector.addEventListener("click", function () {
    let images = document.querySelectorAll(".gallery-item img");

    images.forEach((image) => {
      if (selector.checked) {
        image.classList.add("selected-image");
      } else {
        image.classList.remove("selected-image");
      }
    });
  });
});

export const focusImage = () => {
  let selectAlls = document.querySelectorAll(".selected-image");
  if (selectAlls.length == 0) {
    alert("No image selected");
  } else {
    redirectTo("/image_focus_page.html", {
      focusedImage: selectAlls[0].src,
      remoteId:
        selectAlls[0].getAttribute("postId") ||
        selectAlls[0].getAttribute("id"),
      type: selectAlls[0].getAttribute("type"),
    });
  }
};

let focusButton = document.querySelectorAll(".Focus");
focusButton.forEach((button) => {
  button.addEventListener("click", focusImage);
});

let editButtons = document.querySelectorAll(".Edit");
editButtons.forEach((button) => {
  button.addEventListener("click", editImages);
});

function editImages() {
  let images = [...getSelectedImages()];

  if (images.length == 0) alert("No images selected");
  else {
    // console.log('images.map(image => image.src) :>> ', images.map(image => image.src));
    redirectTo("/photo_editor.html", {
      project_images: images.map((image) => image.src),
    });
  }
}

function showSelectedSection(select) {
  const value = select.value;
  let action;

  filterButton.innerHTML = action = actionFromSelectedValue(value);

  let phactMenus = document.querySelectorAll(".PhactMenu");

  phactMenus.forEach((menu) => {
    menu.style.display =
      menu.getAttribute("data-phact-type") == action ? "block" : "none";
  });

  let filterBars = document.querySelectorAll(".filterBarVariant");

  filterBars.forEach((menu) => {
    menu.style.display =
      menu.getAttribute("data-fbar-type") == value ? "block" : "none";
  });
}

function actionFromSelectedValue(value) {
  if (value == "New Imgur" || value == "New Unsplash") return "Fetch";
  else if (value == "Local") return "Search";
  return "Fetch";
}
let sectionSelect = document.getElementById("sectionSelect");

let previousSection = sectionSelect.value;
sectionSelect.addEventListener("change", (event) => {
  let result = true;

  if (previousSection != sectionSelect.value) {
    let images = document.querySelectorAll(".gallery-item");

    if (images.length != 0)
      result = window.confirm(
        "Proceeding will discard current gallery images.\nDo you want to continue?"
      );

    if (result) deleteGalleryImages();

    previousSection = sectionSelect.value;
  }

  if (result) showSelectedSection(event.target);
});

sectionSelect.dispatchEvent(new Event("change"));

filterButton.addEventListener("click", async () => {
  const value = sectionSelect.value;

  if (value == "New Imgur") downloadFromImgurRequest();
  else if (value == "New Unsplash") downloadFromUnsplashRequest();
  else if (value == "Local") searchLocalImagesRequest();
});

fetchNewImgurUserButton.addEventListener("click", async () => {
  requestRemoteImgurUserImages();
});

async function downloadFromImgurRequest() {
  let queryParams = new URLSearchParams({
    type: "imgurDownload",
  });

  let headers = {
    sessionId: localStorage.getItem("sessionId"),
  };

  let options = {};
  if (imgurSection.value != "none") {
    options.section = imgurSection.value;
  }
  if (imgurSort.value != "none") {
    options.sort = imgurSort.value;
  }
  if (imgurWindow.value != "none") {
    options.window = imgurWindow.value;
  }

  options.page = imgurPageInput.value;

  let title = imgurTitle.value.trim();

  let tags = keepSpacesAndLetters(imgurKeywords.value).trim();

  if (tags != "" && title != "")
    alert(
      "Can't search using title and tags at the same time, it defaults to tags"
    );

  if (tags != "") {
    options.q = tags;
  } else if (title != "") {
    options.q = `title: ${title}`;
  }
  queryParams.append("options", JSON.stringify(options));

  const response = await fetch(`/searchImages?${queryParams.toString()}`, {
    method: "get",
    headers,
  });
  try {
    const responseBody = await response.json();
    if (responseBody.length == 0) alert("no images found");
    else fillGallery(responseBody);

    // imgurPageInput.value = parseInt(imgurPageInput.value) + 1
  } catch (e) {
    alert("Seemingly there was a backend error, the server returned no images");
  }
}

async function searchLocalImagesRequest() {
  let headers = {
    "Content-Type": "application/json",
    sessionId: localStorage.getItem("sessionId"),
  };
  let titleFilter = localFbarTitle.value.trim();

  let kwordsFilter = localFbarKeywords.value.trim();

  let origin = localFbarOrigin.value;

  let queryParams = new URLSearchParams({
    title: titleFilter,
    origin,
    type: "local",
    tags: kwordsFilter.split(/\s+/),
  });

  const response = await fetch(`/searchImages?${queryParams.toString()}`, {
    method: "get",
    headers,
  });
  try {
    const responseBody = await response.json();

    if (responseBody.length == 0) alert("no images found");
    else {
      fillGallery(mapIdsToUrls(responseBody));
    }
  } catch (e) {
    console.log(e);
    alert("Seemingly there was a backend error, the server returned no images");
  }
}

function keepSpacesAndLetters(text) {
  text = text.replace(/,/g, " ");
  return text.replace(/[^a-zA-Z\s]/g, "");
}

function fillGallery(images) {
  let gallery = document.getElementById("gallery");
  images.forEach((image) => {
    const galleryItem = document.createElement("div");
    galleryItem.classList.add("gallery-item");

    const imgElement = document.createElement("img");

    for (const field in image) {
      imgElement.setAttribute(field, image[field]);
    }

    galleryItem.appendChild(imgElement);

    gallery.appendChild(galleryItem);
  });

  makeImagesSelectable();
}

let saveButtons = document.querySelectorAll(".save_phact");

saveButtons.forEach((button) => {
  button.addEventListener("click", saveImagesRequest);
});

async function saveImagesRequest() {
  console.log("calling saveImagesRequest");
  let type = sectionSelect.value;

  let htmlImages = getSelectedImages();

  if (htmlImages.length == 0) {
    alert("No images selected");
    return;
  }
  let images;

  if (type == "New Imgur") {
    images = getImgurDataArray(htmlImages);
  } else if (type == "New Unsplash") {
    images = getUnsplashDataArray(htmlImages);
  }

  console.log("making a request");
  let response = await fetch("/saveImages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      sessionId: localStorage.getItem("sessionId"),
      imagetype: type,
    },
    body: JSON.stringify(images),
  });

  response = await response.json();
  let failed = [];
  let ids = [];

  for (let image in response) {
    const imgElement = document.querySelector(`img[src="${image}"]`);
    if (imgElement && response[image] != "fail") {
      imgElement.src = `http://${serverIp}:3000/getImage?id=${response[image]}`;
      ids.push(response[image]);
    } else {
      failed.push(image);
    }
  }

  let alertMessage = `Successfully saved ${
    htmlImages.length - failed.length
  } images.`;
  if (failed.length > 0) {
    alertMessage += `\nFailed to save ${failed.length} images:\n${failed.join(
      "\n"
    )}`;
  }
  alert(alertMessage);
  deleteGalleryImagesByIds(ids);
}

function getImgurDataArray(htmlImages) {
  return [...htmlImages].map((image) => {
    return {
      postId: image.getAttribute("postId"),
      src: image.src,
      type: image.getAttribute("type"),
    };
  });
}
function getUnsplashDataArray(htmlImages) {
  return [...htmlImages].map((image) => {
    return {
      id: image.getAttribute("id"),
      src: image.src,
    };
  });
}

function getSelectedImages() {
  return document.querySelectorAll(".selected-image");
}

function mapIdsToUrls(ids) {
  ids = ids.map((id) => {
    return {
      src: `http://${serverIp}:3000/getImage?id=${id}`,
    };
  });

  return ids;
}

async function requestRemoteImgurUserImages() {
  let headers = {
    "Content-Type": "application/json",
    sessionId: localStorage.getItem("sessionId"),
  };

  let queryParams = new URLSearchParams({
    type: "RemoteImgurUserImages",
  });

  const response = await fetch(`/searchImages?${queryParams.toString()}`, {
    method: "get",
    headers,
  });

  if (response.ok) {
    let result = await response.json();
    if(result.length == 0) alert("no images found");
    fillGallery(result);
  } else {
    let text = await response.text();
    console.log("here", `text = $${text}$`);
    if (text == "no accessToken") {
      let agree = window.confirm(
        "We need your permission to get images from your account."
      );

      if (agree) {
        window.open(
          `https://api.imgur.com/oauth2/authorize?client_id=${imgurApplicationClientId}&response_type=token&state=some_random_state`,
          "_blank"
        );
      }
    } else alert(`unknown server error: ${text}`);
  }
}

async function downloadFromUnsplashRequest() {
  let queryParams = new URLSearchParams({
    type: "unsplashSearch",
  });

  let headers = {
    sessionId: localStorage.getItem("sessionId"),
  };

  let criteria = {};
  if (unsplashOrientation.value != "none") {
    criteria.orientation = unsplashOrientation.value;
  }
  if (unsplashOrder.value != "none") {
    criteria.order = unsplashOrder.value;
  }
  if (unsplashContentFilter.value != "none") {
    criteria.contentFilter = unsplashContentFilter.value;
  }
  if (unsplashColor.value != "none") {
    criteria.color = unsplashColor.value;
  }

  criteria.page = unsplashPage.value;

  criteria.perPage = unsplashPerPage.value;

  criteria.query = keepSpacesAndLetters(UnsplashKeywords.value).trim();

  console.log("criteria.query :>> ", criteria.query);

  queryParams.append("criteria", JSON.stringify(criteria));

  const response = await fetch(`/searchImages?${queryParams.toString()}`, {
    method: "get",
    headers,
  });
  try {
    const responseBody = await response.json();
    console.log("responseBody :>> ", responseBody);
    if (responseBody.length == 0) alert("no images found");
    else fillGallery(responseBody);

    // unsplashPage.value = parseInt(unsplashPage.value) + 1;
  } catch (e) {
    alert("Seemingly there was a backend error, the server returned no images");
  }
}

let cleanButtons = document.querySelectorAll(".CleanGallery");
console.log("cleanbuttons");
console.log(cleanButtons);

cleanButtons.forEach((button) =>
  button.addEventListener("click", () => {
    deleteGalleryImages();
  })
);

let deleteButtons = document.querySelectorAll(".Delete");
deleteButtons.forEach((button) =>
  button.addEventListener("click", () => {
    deleteImagesRequest();
  })
);

async function deleteImagesRequest() {
  let htmlImages = getSelectedImages();

  if (htmlImages.length == 0) {
    alert("No images selected");
    return;
  }

  let imageIds = [...htmlImages]
    .filter((image) => image.src.includes("getImage?id="))
    .map((image) => image.src.match(/getImage\?id=(\d+)/)[1]);

  console.log("imageIds :>> ", imageIds);

  let response = await fetch("/deleteImages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      sessionId: localStorage.getItem("sessionId"),
    },
    body: JSON.stringify({ ids: imageIds }),
  });

  let message = (await response.json()).message;

  if (response.ok) {
    alert(message);
    deleteGalleryImagesByIds(imageIds);
  } else {
    alert(message);
  }
}
 