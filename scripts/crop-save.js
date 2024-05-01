import {
  PhotoEditor,
  FilterMemento,
  AnnotationMemento,
} from "../scripts/PhotoEditor.js";

const mobileWidthProportion = 0.8;
const desktopWidthProportion = 0.6;
let widthProportion;
setWidthPropotion();

let showText = true;

let imageContainer = document.getElementById("imageContainer");

let imageSrc = "../resources/th.jpg";

let urlImgSrc = getImageFromUrl();

if (urlImgSrc) imageSrc = urlImgSrc;

let mainCanvas = document.getElementById("mainCanvas");
let ctx = mainCanvas.getContext("2d");

const photoEditor = new PhotoEditor(
  mainCanvas,
  document.body.clientWidth * widthProportion
);

const mainImage = new Image();
mainImage.src = imageSrc;

let cropX, cropY, cropWidth, cropHeight;

addFormListeners();

mainImage.onload = async function () {
  photoEditor.setImage(mainImage);
  photoEditor.draw();

  makeDraggable(document.getElementById("handler1"));
  makeDraggable(document.getElementById("handler2"));

  updateRectangle();

  document.getElementById("saveButton").onclick = saveCropArea;

  window.addEventListener("resize", function () {
    setWidthPropotion();

    photoEditor.setCanvasSize(document.body.clientWidth * widthProportion);
    photoEditor.draw();
  });
};

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

function updateRectangle() {
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
  }
}

function saveCropArea(e) {
  e.preventDefault();
  let mainCanvas = document.getElementById("mainCanvas");

  let image = getPartOfCanvas(cropX, cropY, cropWidth, cropHeight, mainCanvas);

  downloadImage(image);
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

function setParentSize(height, width) {
  parentHeight = height;
  parentWidth = width;

  imageContainer.width = width;
  imageContainer.height = height;
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

  document.getElementById("showText").addEventListener("change", function () {
    if (this.checked) {
      showText = true;
    } else {
      showText = false;
    }

    updateRectangle();
  });
  document.getElementById("showText").click();

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
      photoEditor.setImage(img);
      photoEditor.draw();
    };

    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function getImageFromUrl() {
  const queryString = window.location.search;

  const urlParams = new URLSearchParams(queryString);

  const encodedData = urlParams.get("focusedImage");
  if (encodedData) {
    return JSON.parse(decodeURIComponent(encodedData));
  }

  return null;
}

function setWidthPropotion() {
  widthProportion =
    document.body.clientWidth > 1000
      ? desktopWidthProportion
      : mobileWidthProportion;
}
