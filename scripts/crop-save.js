import {
  PhotoEditor,
  FilterMemento,
  AnnotationMemento,
  ImageMemento,
} from "../scripts/PhotoEditor.js";

function makeImagesSelectable() {
  let images = document.querySelectorAll(".gallery-item img");
  images.forEach((image) => {
    image.addEventListener("click", function () {
      images.forEach((img) => {
        img.classList.remove("selected-image");
      });

      image.classList.add("selected-image");
    });
  });
}

const queryParams = Object.fromEntries(
  new URLSearchParams(window.location.search).entries()
);

const mobileWidthProportion = 0.8;
const desktopWidthProportion = 0.6;
let widthProportion;
setWidthPropotion();

let showText = false;
let hoverImage = true;

let imageContainer = document.getElementById("imageContainer");

let canvasBase;

let urlImgSrc = queryParams.focusedImage;

if (urlImgSrc) canvasBase = await drawableImage(urlImgSrc);
else canvasBase = coloredCanvas(4, 3, "lightgray");

let mainCanvas = document.getElementById("mainCanvas");

const photoEditor = new PhotoEditor(
  mainCanvas,
  imageContainer,
  document.body.clientWidth * widthProportion
);

let cropX, cropY, cropWidth, cropHeight;

addFormListeners();

photoEditor.setUndistortedImage(canvasBase);
photoEditor.draw();

makeDraggable(document.getElementById("handler1"));
makeDraggable(document.getElementById("handler2"));

updateRectangle();

document.getElementById("saveButton").onclick = saveCropArea;

window.addEventListener("resize", function () {
  setWidthPropotion();

  photoEditor.setCanvasSize(document.body.clientWidth * widthProportion);
  photoEditor.draw();

  updateRectangle();
});

function makeDraggable(element) {
  let differenceX = 0,
    differenceY = 0,
    lastX = 0,
    lastY = 0;

  let handler1 = document.getElementById("handler1");

  let handlerWidth = handler1.offsetWidth;
  let handlerHeight = handler1.offsetHeight;

  element.addEventListener("mousedown", dragStart);
  element.addEventListener("touchstart", dragStart);

  function dragStart(e) {
    e.preventDefault();
    if (e.type === "mousedown") {
      lastX = e.clientX;
      lastY = e.clientY;
      document.addEventListener("mousemove", drag);
      document.addEventListener("mouseup", dragEnd);
    } else if (e.type === "touchstart") {
      let touch = e.touches[0];
      lastX = touch.clientX;
      lastY = touch.clientY;
      document.addEventListener("touchmove", drag);
      document.addEventListener("touchend", dragEnd);
    }
  }

  function drag(e) {
    e.preventDefault();
    let currentX, currentY;
    if (e.type === "mousemove") {
      currentX = e.clientX;
      currentY = e.clientY;
    } else if (e.type === "touchmove") {
      let touch = e.touches[0];
      currentX = touch.clientX;
      currentY = touch.clientY;
    }
    differenceX = currentX - lastX;
    differenceY = currentY - lastY;
    lastX = currentX;
    lastY = currentY;
    let newTop = element.offsetTop + differenceY;
    let newLeft = element.offsetLeft + differenceX;

    if (
      newTop >= 0 &&
      newLeft >= 0 &&
      newTop <= handler1.parentElement.offsetHeight - handlerHeight &&
      newLeft <= handler1.parentElement.offsetWidth - handlerWidth
    ) {
      element.style.top = newTop + "px";
      element.style.left = newLeft + "px";
    }

    updateRectangle();
  }

  function dragEnd() {
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", dragEnd);
    document.removeEventListener("touchmove", drag);
    document.removeEventListener("touchend", dragEnd);
  }
}

async function updateRectangle() {
  let top_ = Math.min(handler1.offsetTop, handler2.offsetTop);
  let left_ = Math.min(handler1.offsetLeft, handler2.offsetLeft);
  let width =
    Math.abs(handler1.offsetLeft - handler2.offsetLeft) + handler1.offsetWidth;
  let height =
    Math.abs(handler1.offsetTop - handler2.offsetTop) + handler1.offsetHeight;

  cropX = left_;
  cropY = top_;
  cropWidth = width;
  cropHeight = height;

  let rectangle = document.getElementById("rectangle");
  rectangle.style.top = top_ + "px";
  rectangle.style.left = left_ + "px";
  rectangle.style.width = width + "px";
  rectangle.style.height = height + "px";

  let canvas = document.getElementById("textHover");
  let ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (showText) {
    canvas.height = cropHeight * 1.3;

    let { text, fontType, textColor } = getTextInputValues();

    ctx.font = cropHeight + "px " + fontType;
    ctx.fillStyle = textColor;
    canvas.width = ctx.measureText(text).width;

    ctx.font = cropHeight + "px " + fontType;
    ctx.fillStyle = textColor;
    ctx.filter = photoEditor.filters.join(" ");
    ctx.fillText(text, 0, cropHeight);
  } else if (hoverImage) {
    try {
      let image = await drawableImage(selectedImage());

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      console.log("ctx.width, ctx.height :>> ", ctx.width, ctx.height);

      ctx.drawImage(
        image,
        0,
        0,
        image.width,
        image.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
    } catch (e) {
      console.log(e);
    }
  }
}

async function saveCropArea(e) {
  e.preventDefault();

  let result = window.confirm(
    "This action will save a new image and associate it with your account, do you agree?"
  );
  if (!result) return;

  let mainCanvas = document.getElementById("mainCanvas");

  let image = getPartOfCanvas(cropX, cropY, cropWidth, cropHeight, mainCanvas);

  const response = await fetch("/saveImages", {
    method: "post",
    body: JSON.stringify({
      data: base64FromCanvasImage(image),
      ext: ".jpg",
      type: "edit",
    }),
    headers: {
      imagetype: "base64",
      sessionid: localStorage.getItem("sessionId"),
    },
  });
  console.log(await response.json());
  //downloadImage(image);
}

function getPartOfCanvas(x, y, width, height, sourceCanvas) {
  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(
    sourceCanvas,
    x,
    y,
    width,
    height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas.toDataURL("image/jpeg", 1);
}

function downloadImage(image) {
  let downloadLink = document.createElement("a");
  downloadLink.href = image;
  downloadLink.download = "cropped_image.jpg";
  downloadLink.click();
}

function addFormListeners() {
  document
    .getElementById("applyFilterBtn")
    .addEventListener("click", function (event) {
      event.preventDefault();
      const filterName = document.getElementById("filterName").value;
      const intensity = document.getElementById("intensity").value;
      console.log("Filter Name:", filterName);
      console.log("Intensity:", intensity);

      photoEditor.apply(
        new FilterMemento(photoEditor, filterName + "(" + intensity + "%)")
      );

      updateRectangle();
    });

  document
    .getElementById("addTextBtn")
    .addEventListener("click", function (event) {
      event.preventDefault();
      const text = document.getElementById("textInput").value;
      const fontType = document.getElementById("fontType").value;
      const textColor = document.getElementById("textColor").value;
      console.log("Text:", text);
      console.log("Font Type:", fontType);
      console.log("Text Color:", textColor);

      photoEditor.apply(
        new AnnotationMemento(
          photoEditor,
          text,
          cropHeight,
          fontType,
          textColor,
          cropY + cropHeight,
          cropX
        )
      );
    });

  document
    .getElementById("pasteImageBtn")
    .addEventListener("click", async function (event) {
      event.preventDefault();

      let image = await drawableImage(selectedImage());

      photoEditor.apply(
        new ImageMemento(
          photoEditor,
          image,
          cropX,
          cropY,
          cropHeight,
          cropWidth
        )
      );
    });

  document.getElementById("undoButton").addEventListener("click", (event) => {
    event.preventDefault();
    photoEditor.undo();
    updateRectangle();
  });

  const fontType = document.getElementById("fontType");

  const textColor = document.getElementById("textColor");

  const textInput = document.getElementById("textInput");

  [fontType, textColor, textInput].forEach((element) =>
    element.addEventListener("input", function (event) {
      updateRectangle();
    })
  );

  document
    .getElementById("uploadButton")
    .addEventListener("click", uploadImage);

  document
    .getElementById("showOptions")
    .addEventListener("change", function () {
      showText = false;
      hoverImage = false;
      if (this.value == "text") {
        showText = true;
      } else if (this.value == "selected image") {
        hoverImage = true;
      }

      updateRectangle();
    });
  document.getElementById("showOptions").value = "selected image";

  document
    .getElementById("changeCanvasBase")
    .addEventListener("click", async () => {
      try {
        let image = await drawableImage(selectedImage());
        photoEditor.setUndistortedImage(image);
        photoEditor.draw();
      } catch (e) {
        document.getElementById("projectImagesButton").click();
      }
    });

  document
    .getElementById("resizeCanvas")
    .addEventListener("click", async () => {
      let ok = window.confirm(
        "This action fill clear the canvas and resize it with the given wdith and height proportion"
      );

      if (ok) {
        photoEditor.setUndistortedImage(
          coloredCanvas(widthInput.value, heightInput.value, canvasColor.value)
        );
        photoEditor.draw();
      }
    });

  document
    .getElementById("fillSelectedImageButton")
    .addEventListener("click", async () => {
      try {
        let image = await drawableImage(selectedImage());
        image.width = 100;
        image.height = 100;
        photoEditor.setImage(image);
        photoEditor.draw();
      } catch (e) {
        document.getElementById("projectImagesButton").click();
      }
    });
}

function coloredCanvas(width, height, color) {
  const canvas = document.createElement("canvas");

  // Set the height and width of the canvas
  canvas.height = height;
  canvas.width = width;
  const context = canvas.getContext("2d");

  // Set the fill color
  context.fillStyle = color;

  // Fill the entire canvas with the color
  context.fillRect(0, 0, canvas.width, canvas.height);

  return canvas;
}

function getTextInputValues() {
  let result = {
    text: null,
    fontType: null,
    textColor: null,
  };

  result.text = document.getElementById("textInput").value;
  result.fontType = document.getElementById("fontType").value;
  result.textColor = document.getElementById("textColor").value;

  return result;
}

function uploadImage() {
  let input = document.getElementById("upload-input");
  let file = input.files[0];
  let reader = new FileReader();
  reader.onload = function (e) {
    let img = document.createElement("img");

    img.onload = () => {
      photoEditor.setUndistortedImage(img);
      photoEditor.draw();
    };

    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function getImageFromUrl() {
  return;
}

function setWidthPropotion() {
  widthProportion =
    document.body.clientWidth > 1000
      ? desktopWidthProportion
      : mobileWidthProportion;
}

function base64FromCanvasImage(image) {
  return image.replace(/^data:image\/\w+;base64,/, "");
}

makeImagesSelectable();

async function drawableImage(link) {
  return new Promise((resolve, reject) => {
    let image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = link;
  });
}

function selectedImage() {
  let image = [...document.querySelectorAll(".selected-image")][0];

  if (image) {
    return image.src;
  } else {
    throw new Error("No selected image found.");
  }
}

let image = document.querySelectorAll(".gallery-item img")[0];
if (image) image.classList.add("selected-image");

/* menu button */

document.addEventListener("DOMContentLoaded", function () {
  const projectImagesButton = document.getElementById("projectImagesButton");
  const menu = document.getElementById("projectImages");

  projectImagesButton.addEventListener("click", function () {
    if (menu.style.display === "flex") {
      menu.style.display = "none";
    } else {
      menu.style.display = "flex";
      menu.style.flexDirection = "column";
      menu.style.justifyContent = "center";
      menu.style.alignItems = "center";
    }
  });
});

function fillGallery(images) {
  let gallery = document.getElementById("gallery");
  images.forEach((image) => {
    const galleryItem = document.createElement("div");
    galleryItem.classList.add("gallery-item");

    const imgElement = document.createElement("img");

    imgElement.src = image;

    galleryItem.appendChild(imgElement);

    gallery.appendChild(galleryItem);
  });

  makeImagesSelectable();
}

if (queryParams.project_images) {
  fillGallery(queryParams.project_images.split(","));
}
