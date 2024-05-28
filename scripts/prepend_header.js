import { sessionManager } from "./authentification.js";
import { logged_header, unlogged_header } from "../resources/headers.js";

// await sessionManager.removeSessionId();

let sessionId = localStorage.getItem("sessionId");

console.log('sessionId :>> ', sessionId);

let logged = sessionId ? await sessionManager.sendSessionId(sessionId) : false;

console.log('logged :>> ', logged);

addHeader(logged);

setUserName();

function addHeader(logged) {
  console.log(logged);
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
