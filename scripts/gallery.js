import { redirectTo } from "./common.js";
import { serverIp } from "./server_location.js";

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
  let gallery = document.getElementById("gallery");
  while (gallery.firstChild) {
    gallery.removeChild(gallery.firstChild);
  }
}

function makeImagesSelectable() {
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


    redirectTo("../mainPages/image_focus_page.html", {
      focusedImage: selectAlls[0].src,
      postId: selectAlls[0].getAttribute("postId"),
      type: selectAlls[0].getAttribute("type"),
    });
  }
};

let focusButton = document.getElementById("Focus");

focusButton.addEventListener("click", focusImage);

function showSelectedSection(select) {
  const value = select.value;

  filterButton.innerHTML = actionFromSelectedValue(value);

  let phactMenus = document.querySelectorAll(".PhactMenu");

  phactMenus.forEach((menu) => {
    menu.style.display =
      menu.getAttribute("phactType") == value ? "block" : "none";
  });
  //newImgurFBar

  let filterBars = document.querySelectorAll(".filterBarVariant");

  filterBars.forEach((menu) => {
    menu.style.display =
      menu.getAttribute("fbarType") == value ? "block" : "none";
  });
}

function actionFromSelectedValue(value) {
  if (value == "New Imgur") return "Fetch";
  else if (value == "Local Imgur") return "Filter";
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
  else if (value == "Local Imgur") searchLocalImgurRequest();
});

fetchEdits.addEventListener("click", async () => {
  requestUserEdits();
});

async function downloadFromImgurRequest() {
  let queryParams = new URLSearchParams({
    type: "imgurDownload",
  });

  let headers = {
    sessionId: localStorage.getItem("sessionId"),
  };

  if (imgurSection.value != "none") {
    queryParams.append("section", "valueimgurSection.value");
  }
  if (imgurSort.value != "none") {
    queryParams.append("sort", "imgurSort.value");
  }
  if (imgurWindow.value != "none") {
    queryParams.append("window", "imgurWindow.value");
  }

  let title = imgurTitle.value.trim();

  let tags = keepSpacesAndLetters(imgurKeywords.value).trim();

  if (tags != "" && title != "")
    alert(
      "Can't search using title and tags at the same time, it defaults to tags"
    );
  if (tags != "") {
    queryParams.append("q", tags);
  } else if (title != "") {
    queryParams.append("q", `title: ${title}`);
  }

  const response = await fetch(`/searchImages?${queryParams.toString()}`, {
    method: "get",
    headers,
  });
  try {
    const responseBody = await response.json();
    if (responseBody.length == 0) alert("no images found");
    else fillGallery(responseBody);
  } catch (e) {
    alert("Seemingly there was a backend error, the server returned no images");
  }
}

async function searchLocalImgurRequest() {
  let headers = {
    "Content-Type": "application/json",
    sessionId: localStorage.getItem("sessionId"),
  };
  let titleFilter = localImgurTitle.value;

  let kwordsFilter = localImgurKeywords.value;

  let queryParams = new URLSearchParams({
    title: titleFilter,
    type: "imgurLocal",
    tags: kwordsFilter.split(/\s+/),
  });

  const response = await fetch(`/searchImages?${queryParams.toString()}`, {
    method: "get",
    headers,
  });
  try {
    const responseBody = await response.json();

    console.log(responseBody);
    if (responseBody.length == 0) alert("no images found");
    else {
      fillGallery(mapIdsToUrls(responseBody.map((item) => item.image_id)));
    }
  } catch (e) {
    alert("Seemingly there was a backend error, the server returned no images");
  }
}

function keepSpacesAndLetters(text) {
  text = text.replace(/,/g, " ");
  return text.replace(/[^a-zA-Z\s]/g, "");
}

function fillGallery(images) {
  deleteGalleryImages();

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
  let htmlImages = getSelectedImages();

  if (htmlImages.length == 0) {
    alert("No images selected");
    return;
  }

  htmlImages = [...htmlImages].filter(
    (element) => element.getAttribute("type") == "New Imgur"
  );

  let images = getImgurDataArray(htmlImages);

  console.log("save request");
  let response = await fetch("/saveImages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      sessionId: localStorage.getItem("sessionId"),
      imagetype: "New Imgur",
    },
    body: JSON.stringify(images),
  });

  console.log("save response");

  response = await response.json();

  let failed = [];

  for (let image in response) {
    const imgElement = document.querySelector(`img[src="${image}"]`);

    if (imgElement && response[image] != "fail") {
      imgElement.src = `http://${serverIp}:3000/getImage?id=${response[image]}`;
      imgElement.setAttribute("type", "Local Imgur");
    } else {
      failed.push(image);
    }
  }

  if (failed.length != 0) alert("Failed to load:\n" + failed.join("\n"));
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

function getSelectedImages() {
  return document.querySelectorAll(".selected-image");
}

async function requestUserEdits() {
  let headers = {
    "Content-Type": "application/json",
    sessionId: localStorage.getItem("sessionId"),
  };

  let queryParams = new URLSearchParams({
    type: "userEdits",
  });

  const response = await fetch(`/searchImages?${queryParams.toString()}`, {
    method: "get",
    headers,
  });

  let ids = await response.json();

  fillGallery(mapIdsToUrls(ids.map((id) => id.id)));
}

function mapIdsToUrls(ids) {
  ids = ids.map((id) => {
    return {
      src: `http://${serverIp}:3000/getImage?id=${id}`,
    };
  });

  return ids;
}
