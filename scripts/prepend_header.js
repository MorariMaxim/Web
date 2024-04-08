let unlogged_header = `
<header class="logged-header">
<div class="first-section">
  <div class="hover-trigger">
    <div class="line"></div>
    <div class="line"></div>
    <div class="line"></div>
    <div class="popout-menu">
      <a href="platform_download_page.html">Platform Download</a>
      <a href="platform_upload_page.html">Platfrom Upload</a>
      <a href="local_upload_page.html">Local Upload</a>          
    </div>
  </div>
</div>
<div class="mpic-logo">
  <a href="main_page.html" class="link-unlogged-main"
    ><p class="gradient-text">M-PIC</p></a
  >
</div>
<div class="unlogged-user">
  <div href="login_page.html" class="logged-user-section">
    <p>Username</p>
    <img
      id="unlogged-image"
      src="resources/user.png"
      alt="unlogged user"
    />
  </div>
</div>
</header>
`;

let logged_header = `<header class="logged-header">
<div class="first-section">
  <div class="hover-trigger">
    <div class="line"></div>
    <div class="line"></div>
    <div class="line"></div>
    <div class="popout-menu">
      <a href="search_page.html">Platform Download</a>
      <a href="platform_upload_page.html">Platfrom Upload</a>
      <a href="local_upload_page.html">Local Upload</a>
      <a href="gallery.html">Gallery</a>
    </div>
  </div>
</div>
<div class="mpic-logo">
  <a href="main_page.html" class="link-unlogged-main"
    ><p class="gradient-text">M-PIC</p></a
  >
</div>
<div class="unlogged-user">
  <div href="login_page.html" class="logged-user-section">
    <p>Username</p>
    <img id="unlogged-image" src="resources/user.png" alt="unlogged user" />
  </div>
</div>
</header>
`;
let logged = true;

let header = logged ? logged_header : unlogged_header;

let stylesheet = logged
  ? "styles/logged_header.css"
  : "styles/unlogged_header.css";

let body = document.body;

body.innerHTML = header + body.innerHTML;

let linkElement = document.createElement("link");
linkElement.rel = "stylesheet";
linkElement.type = "text/css";
linkElement.href = stylesheet;

document.head.appendChild(linkElement);

linkElement = document.createElement("link");
linkElement.rel = "stylesheet";
linkElement.type = "text/css";
linkElement.href = "styles/common.css";

document.head.appendChild(linkElement);
