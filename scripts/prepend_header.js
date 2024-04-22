import { sessionManager } from "./authentification.js";
import { logged_header, unlogged_header } from "../resources/headers.js";

let sessionId = await sessionManager.getSessionId();

console.log(sessionId);

let authResponse = await sessionManager.sendSessionId(sessionId);

if (authResponse) {
  let logged = false;

  if (authResponse.validSessionId == "true") {
    logged = true;
  }

  addHeader(logged);

  //console.log(sessionId, typeof sessionId, logged);

  console.log(authResponse);

  if (logged) setUserName(authResponse.username);
}

function addHeader(logged) {
  let header = logged ? logged_header : unlogged_header;

  let stylesheet = logged
    ? "../styles/logged_header.css"
    : "../styles/unlogged_header.css";

  let body = document.body;

  body.innerHTML = header + body.innerHTML;

  addLinkToHeader(stylesheet);
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

  element.innerHTML = username;
}
