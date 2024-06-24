import { sessionManager } from "./authentification.js";
import { logged_header, unlogged_header } from "../resources/headers.js";
import { redirectTo } from "./common.js";

// await sessionManager.removeSessionId();

let sessionId = localStorage.getItem("sessionId");

console.log("sessionId :>> ", sessionId);

let logged = sessionId ? await sessionManager.sendSessionId(sessionId) : false;

if (!logged) {
  if (getCurrentPageName() != "login_page.html") redirectTo("/login_page.html");
}

addHeader(logged);

setUserName();

function addHeader(logged) {
  let header = logged ? logged_header : unlogged_header;

  let stylesheet = logged
    ? "../styles/logged_header.css"
    : "../styles/unlogged_header.css";

  const tempContainer = document.createElement("div");
  tempContainer.innerHTML = header;
  document.body.insertBefore(
    tempContainer.querySelector(".header"),
    document.body.firstChild
  );

  addLinkToHeader(stylesheet, "start");
  addLinkToHeader("../styles/common.css", "start");

  addLogout();
}

function addLinkToHeader(link, position) {
  let linkElement = document.createElement("link");
  linkElement.rel = "stylesheet";
  linkElement.type = "text/css";
  linkElement.href = link;

  if (position == "start") {
    let firstChild = document.head.firstChild;

    document.head.insertBefore(linkElement, firstChild);
  } else {
    document.head.appendChild(linkElement);
  }
}

function setUserName(username) {
  let element = document.getElementById("username-block");

  element.innerHTML = localStorage.getItem("nickName");
}

function addLogout() {
  const logoutLink = document.getElementById("logout-link");

  logoutLink.addEventListener("click", (event) => {
    event.preventDefault();

    const confirmLogout = confirm("Are you sure you want to log out?");
    if (confirmLogout) {
      localStorage.removeItem("sessionId");
      localStorage.removeItem("nickName");
      window.location.href = "login_page.html";
    }
  });
}

function getCurrentPageName() {
  // Get the full path from the URL
  const path = window.location.pathname;

  // Extract the last part of the path
  const page = path.split("/").pop();

  // Remove any query parameters or hash fragments
  const pageName = page.split("?")[0].split("#")[0];

  return pageName;
}
