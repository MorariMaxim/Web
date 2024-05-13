import { redirectTo } from "./common.js";

let bar = document.getElementById("filter-phact-menu");

let gallery = document.getElementById("gallery-wrapper");

let button = document.getElementById("toggleButton");
button.addEventListener("click", function () {
  let computedStyle = window.getComputedStyle(bar);

  console.log(computedStyle.display);

  if (computedStyle.display === "none") {
    console.log("first");
    bar.style.display = "block";
    gallery.style.display = "none";
  } else {
    console.log("second");
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
    console.log("source = " + selectAlls[0].src);
    redirectTo("../mainPages/image_focus_page.html", {
      focusedImage: selectAlls[0].src,
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
}

function actionFromSelectedValue(value) {
  if (value == "New Imgur") return "Fetch";
  else if (value == "Local Imgur") return "Filter";
}
let sectionSelect = document.getElementById("sectionSelect");

let confirmSectionChange = false;
sectionSelect.addEventListener("change", (event) => {
  let result = true;
  if (confirmSectionChange) {
    result = window.confirm(
      "Proceeding will discard current gallery images.\nDo you want to continue?"
    );
    if (result) deleteGalleryImages();
  }
  if (result) {
    showSelectedSection(event.target);
  }
});
sectionSelect.dispatchEvent(new Event("change"));

confirmSectionChange = true;
filterButton.addEventListener("click", async () => {
  const value = sectionSelect.value;

  if (value == "New Imgur") downloadFromImgurRequest();
  else if (value == "Local Imgur") searchLocalImgurRequest();
});

async function downloadFromImgurRequest() {
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

  let headers = {
    "Content-Type": "application/json",
    tags: keepSpacesAndLetters(imgurTags.value),
    type: "imgurDownload",
    ...options,
  };

  console.log(headers);

  const response = await fetch("/searchImages", {
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

async function searchLocalImgurRequest() {}

function keepSpacesAndLetters(text) {
  text = text.replace(/,/g, " ");
  console.log(text);
  return text.replace(/[^a-zA-Z\s]/g, "");
}

function fillGallery(images) {
  deleteGalleryImages();

  let gallery = document.getElementById("gallery");
  images.forEach((image) => {
    const galleryItem = document.createElement("div");
    galleryItem.classList.add("gallery-item");

    const imgElement = document.createElement("img");
    imgElement.src = image;
    imgElement.alt = "Couldn't load image";

    galleryItem.appendChild(imgElement);

    gallery.appendChild(galleryItem);
  });

  makeImagesSelectable();
}
