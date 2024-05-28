import { imgurApplicationClientId } from "./server_location.js";

let imageDetails;

const queryParams = Object.fromEntries(
  new URLSearchParams(window.location.search).entries()
);

console.log(queryParams);

let foreign = false;

let imageId;

const regex = /getImage\?id=(\d+)/;

const focusedImage = queryParams.focusedImage;

const match = focusedImage.match(regex);

if (match) {
  const id = match[1];
  imageId = id;
  console.log("ID found:", id);
} else {
  foreign = true;
}

if (foreign) {
  editButton.style.display = "none";
  uploadImgurButton.style.display = "none";
  changeMetaButton.style.display = "none";
}

if (focusedImage) {
  let editedImage = document.getElementById("focusedImage");

  editedImage.src = focusedImage;
}

editButton.addEventListener("click", (event) => {
  let focusedImage = document.getElementById("focusedImage");

  let editQueryParams = new URLSearchParams();

  editQueryParams.append("focusedImage", focusedImage.src);

  window.location.href = `../mainPages/photo_editor.html?${editQueryParams.toString()}`;
});

var commentsButton = document.getElementById("fetchCommentsButton");

commentsButton.addEventListener("click", async (event) => {
  const pattern = /id=(\d+)/;

  const match = pattern.exec(focusedImage);

  let id;
  let headers = {};

  if (match) {
    id = match[1];
    headers.imageId = id;
    console.log(id);
  } else {
    let postId = queryParams.postId;

    if (postId) headers.postid = postId;
    else {
      alert("Can't perform action for current object");
      return;
    }
  }

  const response = await fetch("/getComments", {
    method: "get",
    headers,
  });

  function addImageDetails(details) {
    imageDetailList.innerHTML = "";
    let highlighted = [];

    if (details.title) highlighted.push({ title: details.title });
    if (details.description)
      highlighted.push({ description: details.description });
    if (details.views) highlighted.push({ views: details.views });
    if (details.ups) highlighted.push({ ups: details.ups });
    if (details.downs) highlighted.push({ downs: details.downs });

    function addDetail(key, value) {
      const li = document.createElement("li");
      li.innerHTML = `<span style="font-weight: bold; color: red;">${key.toUpperCase()}:</span> ${value}`;
      imageDetailList.appendChild(li);
    }

    for (const detail_ in highlighted) {
      for (const key in highlighted[detail_]) {
        const fieldName = key;
        const fieldValue = highlighted[detail_][key];
        addDetail(fieldName, fieldValue);
      }
    }

    let tags = [];

    details.tags?.forEach((tag) => {
      tags.push(tag);
    });
    if (tags.length) addDetail("tags", tags.join(", "));
  }

  function addComment(commentInfo, parent) {
    // Create the comment div element
    const commentDiv = document.createElement("div");
    commentDiv.classList.add("comment");

    // Create the user span element
    const userSpan = document.createElement("span");
    userSpan.classList.add("user");
    userSpan.textContent = commentInfo.author;

    // Create the comment paragraph element
    const commentP = document.createElement("p");
    commentP.textContent = commentInfo.comment;

    // Append user span and comment paragraph to the comment div
    commentDiv.appendChild(userSpan);
    commentDiv.appendChild(commentP);

    // Append the comment div to the specified parent element
    parent.appendChild(commentDiv);

    console.log("commentInfo :>> ", commentInfo);

    commentInfo.children.forEach((child) => {
      addComment(child, commentDiv);
    });
  }
  commentsSection.innerHTML = "<h2>Comments</h2>";

  if (response.ok) {
    let postData = await response.json();

    console.log("postData :>> ", postData);

    if (postData.comments)
      [...postData.comments].forEach((comment) => {
        addComment(comment, document.getElementById("commentsSection"));
      });

    {
      imageDetails = postData.details;

      if (imageDetails.title)
        document.getElementById("changeMetaTitle").value = imageDetails.title;

      if (imageDetails.tags)
        document.getElementById("changeMetaTags").value = imageDetails.tags;
    }

    addImageDetails(postData.details);
  } else alert("Nothing for this image");
});

uploadImgurButton.addEventListener("click", async (event) => {
  document
    .getElementById("imgurUploadFormContainer")
    .classList.toggle("hidden");
});

changeMetaButton.addEventListener("click", async (event) => {
  document.getElementById("changeMetaFormContainer").classList.toggle("hidden");
});

changeMetaForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  let title = document.getElementById("changeMetaTitle").value.trim();

  let tags = document.getElementById("changeMetaTags").value.trim();

  tags = tags.split(",").filter((tag) => tag.length > 0);

  let agree = window.confirm(
    `Parsed changes: title = ${title}, tags = ${JSON.stringify(tags)}`
  );

  if (agree) {
    const response = await fetch(`/changeImageMeta?${queryParams.toString()}`, {
      method: "put",
      headers: { sessionid: localStorage.getItem("sessionId") },
      body: JSON.stringify({ meta: { tags, title }, id: imageId }),
    });

    let cause = (await response.json()).cause;

    if (cause == "accessToken") {
      alert("error!");
    } else {
      alert("Meta data successfully updated!");
    }
  }
});

imgurUploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  let title = document.querySelector("#imgurUploadForm #title").value;

  if (title.trim() == "") document.getElementById("title").focus();

  let agree = window.confirm(
    "This action will upload a new image to your imgur account and share it with the community. You can upload it multiple times. Continue?"
  );

  if (agree) {
    let queryParams = new URLSearchParams();

    queryParams.append("to", "imgur");
    queryParams.append("imageId", imageId);
    queryParams.append("title", title);

    const response = await fetch(`/uploadImage?${queryParams.toString()}`, {
      method: "post",

      headers: { sessionid: localStorage.getItem("sessionId") },
    });

    let cause = (await response.json()).cause;

    if (cause == "accessToken") {
      let agree = window.confirm(
        "We need your permission to upload an image to your account."
      );
      console.log("agree :>> ", agree);
      if (agree) {
        window.open(
          `https://api.imgur.com/oauth2/authorize?client_id=${imgurApplicationClientId}&response_type=token&state=some_random_state`,
          "_blank"
        );
      }
    } else {
      alert("Image successfully uploaded to your account!");
    }
  }
});
