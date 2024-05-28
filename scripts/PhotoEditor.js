class PhotoEditor {
  canvas;
  displayedImage; // as in new Image()
  mementos = [];
  annotations = [];
  filters = [];
  images = [];
  width = 1;
  height = 1;

  constructor(canvas, imageContainer, width) {
    this.canvas = canvas;
    this.width = width;
    this.imageContainer = imageContainer;
  }

  clear() {
    this.mementos = [];
    this.annotations = [];
    this.filters = [];
  }

  apply(memento) {
    this.mementos.push(memento);
    // console.log(memento);
    memento.apply();
  }

  setCanvasSize(width) {
    this.width = width;
    this.canvas.width = width;
    this.canvas.height =
      (this.displayedImage.height / this.displayedImage.width) * this.width;
  }

  setUndistortedImage(image) {
    this.displayedImage = image;

    console.log("image.height :>> ", image.height);
    console.log("image.width :>> ", image.width);

    console.log(this.displayedImage);

    this.setCanvasSize(this.width);
  }

  setImage(image) {
    this.displayedImage = image;
  }

  addImage(image) {
    this.images.push(image);
  }

  undo() {
    let last = this.mementos.pop();

    // console.log('last :>> ', last);

    if (last) last.undo();
  }

  draw() {
    // console.log('this.filters :>> ', this.filters);
    // console.log('this.annotations :>> ', this.annotations);

    let ctx = this.canvas.getContext("2d");

    let savedFilter = ctx.filter;
    ctx.filter =
      this.filters.length === 0 ? "none" : " " + this.filters.join(" ");

    /*  if (ctx.filter == savedFilter) {
      this.filters.pop();
    } */

    ctx.drawImage(
      this.displayedImage,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    this.images.forEach((image) => {
      console.log(image);
      ctx.drawImage(
        image.data,
        0,
        0,
        image.width,
        image.height,
        image.top,
        image.left,
        image.distortedWidth,
        image.distortedHeight
      );
    });

    for (let annotation of this.annotations) {
      ctx.font = annotation.fontSize + "px " + annotation.type;
      ctx.fillStyle = annotation.color;

      ctx.fillText(annotation.text, annotation.left, annotation.top);
    }
  }
}

class Memento {
  photoEditor;

  apply() {}

  undo() {}

  constructor(photoEditor) {
    this.photoEditor = photoEditor;
  }
}

class FilterMemento extends Memento {
  filter;

  constructor(photoEditor, filter) {
    super(photoEditor);
    this.filter = filter;
  }

  undo() {
    this.photoEditor.filters.pop();
    // console.log("filter undo", this.photoEditor.filters);
    this.photoEditor.draw();
  }

  apply() {
    // console.log("filter apply");
    this.photoEditor.filters.push(this.filter);
    this.photoEditor.draw();
  }
}

class AnnotationMemento extends Memento {
  text;
  fontSize;
  type;
  color;
  top;
  left;

  constructor(photoEditor, text, fontSize, type, color, top, left) {
    super(photoEditor);
    this.text = text;
    this.fontSize = fontSize;
    this.type = type;
    this.color = color;
    this.top = top;
    this.left = left;
  }

  undo() {
    this.photoEditor.annotations.pop();
    this.photoEditor.draw();
  }

  apply() {
    this.photoEditor.annotations.push({
      text: this.text,
      fontSize: this.fontSize,
      type: this.type,
      color: this.color,
      top: this.top,
      left: this.left,
    });

    this.photoEditor.draw();
  }
}

class ImageMemento extends Memento {
  top;
  left;
  width;
  height;
  distortedHeight;
  distortedWidth;
  data;

  constructor(photoEditor, data, top, left, distortedHeight, distortedWidth) {
    super(photoEditor);
    this.data = data;
    console.log("this.data :>> ", this.data);
    this.width = data.width;
    this.height = data.height;
    this.top = top;
    this.left = left;
    this.distortedHeight = distortedHeight;
    this.distortedWidth = distortedWidth;
  }

  undo() {
    this.photoEditor.images.pop();
    this.photoEditor.draw();
  }

  apply() {
    this.photoEditor.images.push({
      data: this.data,
      width: this.width,
      height: this.height,
      top: this.top,
      left: this.left,
      distortedHeight: this.distortedHeight,
      distortedWidth: this.distortedWidth,
    });

    this.photoEditor.draw();
  }
}

export { PhotoEditor, Memento, FilterMemento, AnnotationMemento, ImageMemento };
