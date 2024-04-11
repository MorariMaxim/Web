import { redirectTo } from "./common.js";

let bar = document.getElementById("filter-phact-menu");

let gallery = document.getElementById("gallery-wrapper");

let button = document.getElementById("toggleButton");
button.addEventListener("click", function () {
  let computedStyle = window.getComputedStyle(bar);

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

let images = document.querySelectorAll(".gallery-item img");

images.forEach((image) => {
  image.addEventListener("click", function () {
    image.classList.toggle("selected-image");
  });
});

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
