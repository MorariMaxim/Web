function uploadImage() {
  let input = document.getElementById("upload-input");
  let file = input.files[0];
  let reader = new FileReader();
  reader.onload = function (e) {
    let img = document.createElement("img");
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
