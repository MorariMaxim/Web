var applied_filters = "";


function uploadImage() {
  var input = document.getElementById("upload-input");
  var file = input.files[0];
  var reader = new FileReader();
  reader.onload = function (e) {
    var img = document.createElement("img");
    img.src = e.target.result;
    img.id = "edited-image";
    document.getElementById("image-container").innerHTML = "";
    document.getElementById("image-container").appendChild(img);
    document.getElementById("edit-panel").style.display = "flex";

    applied_filters = "";
  };
  reader.readAsDataURL(file);
}

document.getElementById("filter-form").addEventListener("change", function () {
  testFilter();
});

function applyFilter() {
  console.log("here");
  var img = document.getElementById("edited-image");
  var filterType = document.getElementById("filter-select").value;
  var filterStrength = document.getElementById("filter-slider").value;

  applied_filters += filterType + "(" + filterStrength + "%)" + " ";
  img.style.filter = applied_filters.trim();
}

function undoFilter() {
  var img = document.getElementById("edited-image");

  let w = applied_filters.split(" ");
  w.pop();
  w.pop();
  applied_filters = w.join(" ") + " ";

  img.style.filter = applied_filters.trim();
}

function testFilter() {
  var img = document.getElementById("edited-image");
  var filterType = document.getElementById("filter-select").value;
  var filterStrength = document.getElementById("filter-slider").value;

  img.style.filter = applied_filters + filterType + "(" + filterStrength + "%)";
}

function resetFilter() {
  var img = document.getElementById("edited-image");

  applied_filters = "";
  img.style.filter = applied_filters;
}
