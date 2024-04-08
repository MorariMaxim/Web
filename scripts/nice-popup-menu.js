let menu = document.getElementById("phact-menu");
let container = document.getElementById("phact-menu-container");
let dots = document.getElementById("dots-container");

let initialWidth = window.getComputedStyle(dots).width;
let initialHeight = window.getComputedStyle(dots).height;

let menuWidth = window.getComputedStyle(menu).width;
let menuHeight = window.getComputedStyle(menu).height;

container.style.width = initialWidth;
container.style.height = initialHeight;

container.style.borderRadius = `${parseInt(initialWidth) / 2}px`;

container.addEventListener("mouseover", function () {
  dots.style.display = "none";
  container.style.width = menuWidth;
  container.style.height =
    parseInt(menuHeight) + parseInt(initialHeight) + "px";
});
container.addEventListener("mouseout", function () {
  dots.style.display = "flex";
  container.style.width = initialWidth;
  container.style.height = initialHeight;
});
