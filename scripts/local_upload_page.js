const fileInput = document.getElementById("fileInput");
const uploadContent = document.getElementById("upload-content");
const fileDropArea = document.getElementById("fileDropArea");

fileInput.addEventListener("change", handleFileSelect);

function handleFileSelect(event) {
  const files = event.target.files;

  uploadContent.innerHTML = "";

  for (const element of files) {
    const file = element;
    if (!file.type.startsWith("image/")) {
      continue;
    }

    const img = document.createElement("img");
    img.classList.add("selected-image");
    img.file = file;

    const reader = new FileReader();
    reader.onload = (function (image) {
      return function (e) {
        image.src = e.target.result;
      };
    })(img);

    reader.readAsDataURL(file);
    uploadContent.appendChild(img);
  }
}

["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  fileDropArea.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}
fileDropArea.addEventListener("drop", handleDrop, false);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;

  e.target.files = files;
  handleFileSelect(e);
}

uploadButton.addEventListener("click", uploadImagesRequest);

async function uploadImagesRequest() {
  const imgElements = uploadContent.getElementsByTagName("img");
  if (imgElements.length === 0) {
    alert("No images");
    return;
  }

  async function convertImageToBase64(imgElement) {
    return fetch(imgElement.src)
      .then((response) => response.blob())
      .then((blob) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      })
      .catch((error) => {
        console.error("Error converting image to Base64:", error);
        throw error;
      });
  }
  let successful = 0;
  for (let imgElement of imgElements) {
    try {
      let data = await convertImageToBase64(imgElement);
      let info = extractImageInfo(data);
      const response = await fetch("/saveImages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          sessionId: localStorage.getItem("sessionId"),
          imagetype: "base64",
        },
        body: JSON.stringify({
          data: info.base64Data,
          type: "uploaded",
          ext: info.extension,
        }),
      });

      if (!response.ok) {
        alert(`error uploading ${imgElement.src}`);
      }
      successful += 1;
    } catch {
      alert(`error uploading ${imgElement.src}`);
    }
  }

  alert(`Successfully uploaded ${successful} images`);
}

function extractImageInfo(dataUrl) {
  const regex = /^data:(image\/\w+);base64,([\s\S]+)$/;

  const match = dataUrl.match(regex);

  if (match) {
    const mimeType = match[1];
    const base64Data = match[2];

    const extension = mimeType.split("/")[1];

    return { extension, base64Data };
  } else {
    console.error("Invalid data URL format");
    return null;
  }
}
