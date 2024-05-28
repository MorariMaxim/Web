import { waitForCondition } from "./common.js";
import { sessionManager } from "./authentification.js";
import { redirectTo } from "./common.js";

let hidden = true;
let authType = "login";

let button = document.getElementById("password-visibility-button");
let passwordInput = document.getElementById("password-input");

button.addEventListener("click", (event) => {
  if (hidden) {
    button.src = "../resources/show-password.png";
    passwordInput.setAttribute("type", "text");
  } else {
    button.src = "../resources/hide-password.png";
    passwordInput.setAttribute("type", "password");
  }
  hidden = !hidden;
});

let authToggle = document.getElementById("authAction-toggle");
let authHeader = document.getElementById("authHeader");

authToggle.addEventListener("click", (event) => {
  if (authType == "login") {
    authHeader.innerText = "Sign Up";
    authToggle.innerText = "Log In";

    authType = "signup";
  } else {
    authHeader.innerText = "Log In";
    authToggle.innerText = "Sign Up";

    authType = "login";
  }
});

let submitButton = document.getElementById("submit-button");

submitButton.addEventListener("click", async (event) => {
  let singUpAttemp = authType == "signup";
  event.preventDefault();
  const { username, password } = getCredentials();

  let response = await sendCredentials(username, password, singUpAttemp);

  console.log(response);

  if (singUpAttemp) {
    console.log(response.signupresult);
    if (response.signupresult == "success") {
      sessionManager.setSessionId(response.sessionId);
      redirectTo("/", null);
    } else alert("Sign up failed");
  } else {
    if (response.validCredentials == "true") {
      sessionManager.setSessionId(response.sessionId);
      redirectTo("/", null);
    } else alert("Bad credentials");
  }
});

async function sendCredentials(username, password, singup = false) {
  const headers = {
    "Content-Type": "application/json",
  };

  headers["authentificationtype"] = singup ? "singup" : "login";

  const response = await fetch("/loginRoute", {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ username, password }),
  });

  const responseBody = await response.json();

  return responseBody;
}

function getCredentials() {
  let username = document.getElementById("username-input").value;

  let password = document.getElementById("password-input").value;

  return { username, password };
}
