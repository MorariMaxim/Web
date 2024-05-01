class PhotoEditor {
  canvas;
  displayedImage; // as in new Image()
  mementos = [];
  annotations = [];
  filters = [];
  width = 300;

  constructor(canvas) {
    this.canvas = canvas;
  }

  apply(memento) {
    this.mementos.push(memento);
    console.log(memento);
    memento.apply();
  }

  setImage(image) {
    this.displayedImage = image;
    this.canvas.width = this.width;
    this.canvas.height = (image.height / image.width) * this.width;
  }

  undo() {
    let last = this.mementos.pop();

    if (last) last.undo();
  }

  draw() {
    console.log("photo editor draw");
    let ctx = this.canvas.getContext("2d");

    let savedFilter = ctx.filter;
    ctx.filter =
      this.filters.length === 0 ? "none" : " " + this.filters.join(" ");

    if (ctx.filter == savedFilter) {
      this.filters.pop();
    }

    console.log(ctx.filter);
    console.log('this.filters.join(" ") :>> ', this.filters.join(" "));
    ctx.drawImage(
      this.displayedImage,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

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
    console.log("filter undo", this.photoEditor.filters);
    this.photoEditor.draw();
  }

  apply() {
    console.log("filter apply");
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
export { PhotoEditor, Memento, FilterMemento, AnnotationMemento };
