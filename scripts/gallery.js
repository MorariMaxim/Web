var bar = document.getElementById("filter-wrapper");

var gallery = document.getElementById("gallery-wrapper");

var button = document.getElementById("toggleButton");
button.addEventListener("click", function () {
  var computedStyle = window.getComputedStyle(bar);

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

var toggleButton = document.getElementById("toggleButton");

toggleButton.addEventListener("click", function () {
  toggleButton.classList.toggle("active");
});

var toggleCircle = document.getElementById("toggleCircle");

var computedHeight = window.getComputedStyle(toggleCircle).height;

toggleCircle.style.width = computedHeight;

window.addEventListener("resize", function () {
  var toggleCircle = document.getElementById("toggleCircle");

  var computedHeight = window.getComputedStyle(toggleCircle).height;

  toggleCircle.style.width = computedHeight;
});
 