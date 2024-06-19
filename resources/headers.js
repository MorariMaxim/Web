const unlogged_header = `
<header class="unlogged-header header">
  <div class="filler"></div>
  <div class="mpic-logo">
    <a href="main_page.html" class="link-unlogged-main"
      ><p class="gradient-text">M-PIC</p></a
    >
  </div>
  <div class="unlogged-user">
    <a href="login_page.html" class="link-to-loginp">
      <p>Log in</p>
      <img id="unlogged-image" src="../resources/user.png" alt="unlogged user"
    /></a>
  </div>
</header>

`;

const logged_header = `<header class="logged-header header">
<div class="first-section">
  <div class="hover-trigger">
    <div class="line"></div>
    <div class="line"></div>
    <div class="line"></div>
    <div class="popout-menu"> 
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
    <p id ="username-block">Username</p>
    <img id="unlogged-image" src="../resources/user.png" alt="unlogged user" />
    <div class="logout-menu">
    <!-- <a href="/profile">Profile</a>
    <a href="/settings">Settings</a> -->
    <a href="/logout" id="logout-link">Log Out</a>

  </div>
  </div>
</div>
</header>
`;

export { logged_header, unlogged_header };
