// scripts.js
document.addEventListener("DOMContentLoaded", () => {
  const userIconContainer = document.querySelector(".user-icon-container");
  const logoutMenu = document.querySelector(".logout-menu");

  userIconContainer.addEventListener("click", () => {
    const isMenuVisible = logoutMenu.style.display === "block";
    logoutMenu.style.display = isMenuVisible ? "none" : "block";
  });

  document.addEventListener("click", (event) => {
    if (!userIconContainer.contains(event.target)) {
      logoutMenu.style.display = "none";
    }
  });
});
