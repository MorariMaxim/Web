import { sessionManager } from "./authentification.js";
import { logged_header, unlogged_header } from "../resources/headers.js";

// await sessionManager.removeSessionId();

let logged = false;

let sessionId = await sessionManager.getSessionId();
let nickname = localStorage.getItem("nickName");

console.log(nickname, sessionId);
if (nickname == null || sessionId == null) {  
  let authResponse = await sessionManager.sendSessionId(sessionId);
  console.log(authResponse);

  if (authResponse && authResponse.validSessionId == "true") {
    logged = true;

    localStorage.setItem("nickName", authResponse.username);
    localStorage.setItem("nickName", authResponse.username);

    console.log(localStorage.getItem("nickName"));
  }
} else {
  logged = true;
}

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
