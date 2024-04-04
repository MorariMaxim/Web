var header = `
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

var body = document.body;

body.innerHTML = header + body.innerHTML;

var linkElement = document.createElement("link");
linkElement.rel = "stylesheet";
linkElement.type = "text/css";
linkElement.href = "styles/logged_header.css";

document.head.appendChild(linkElement);

var linkElement = document.createElement("link");
linkElement.rel = "stylesheet";
linkElement.type = "text/css";
linkElement.href = "styles/common.css";

document.head.appendChild(linkElement);
