import { sessionManager } from "./authentification.js";
import { redirectTo } from "./common.js";

let submitAction = "log-in";
let resetPassPhase = 1;

document.querySelectorAll(".sectionSelect").forEach((button) => {
  button.addEventListener("click", () => {
    console.log(
      'button.getAttribute("data-action-type") :>> ',
      button.getAttribute("data-action-type")
    );
    submitAction = button.getAttribute("data-action-type");
    document.querySelectorAll("form").forEach((form) => {
      if (
        form.getAttribute("data-action-type") !=
        button.getAttribute("data-action-type")
      )
        form.classList.add("hidden");
      else form.classList.remove("hidden");
    });
  });
});

document.querySelectorAll(".password-visibility-button").forEach((button) => {
  button.addEventListener("click", (event) => {
    const parentContainer = button.closest(".password-container");

    const passwordInput = parentContainer.querySelector(".password-input");

    if (passwordInput) {
      console.log("passwordInput :>> ", passwordInput);

      let src;
      let type;
      let hidden = passwordInput.getAttribute("type") == "text";
      if (!hidden) {
        type = "text";
        src = "../resources/show-password.png";
      } else {
        type = "password";
        src = "../resources/hide-password.png";
      }

      passwordInput.setAttribute("type", type);
      button.src = src;
    }
  });
});

let submitButton = document.getElementById("submit-button");

submitButton.addEventListener("click", async (event) => {
  event.preventDefault();

  const { username, password } = getCredentials(submitAction);

  console.log("username :>> ", username);
  console.log("password :>> ", password);
  let email = null;

  if (resetPassPhase == 1 && !validateUserName(username)) return;

  if (resetPassPhase != 1) {
    if (!isValidPassword(password)) return;
  }

  if (submitAction == "sign-up") {
    email = getAndValidateEmail();
    if (!email) return;
  }

  if (submitAction == "log-in") {
    console.log("log-in");

    let response = await sendCredentials(username, password, email, false);

    console.log(response);

    if (response.validCredentials == "true") {
      sessionManager.setSessionId(response.sessionId);
      redirectTo("/", null);
    } else alert("Bad credentials");
  } else if (submitAction == "sign-up") {
    console.log("sign-up");

    let response = await sendCredentials(username, password, email, true);

    console.log(response.signupresult);
    if (response.signupresult == "success") {
      sessionManager.setSessionId(response.sessionId);
      redirectTo("/", null);
    } else alert("Sign up failed: " + response.signupresult);
  } else if (submitAction == "reset-password") {
    console.log("reset-password", resetPassPhase);

    if (resetPassPhase == 1) {
      if (!validateUserName(username)) return;
      const response = await fetch("/resetPassword", {
        method: "POST",
        body: JSON.stringify({ username }),
      });

      console.log(response.ok);

      if (response.ok) {
        alert(
          `We have sent you an email with a code you will use to reset your password`
        );

        document
          .querySelectorAll(".send-code-phase, .reset-code-phase")
          .forEach((item) => {
            item.classList.toggle("hidden");
          });

        resetPassPhase = 2;
      } else {
        alert(`The server couldn't send an email`);
      }
    } else {
      let resetcode = document.getElementById("resetcode-input").value;

      const response = await fetch("/resetPassword", {
        method: "POST",
        body: JSON.stringify({ resetcode, newpassword: password }),
      });

      if (response.ok) {
        alert("You have successfully reset your password");
      } else {
        alert(`Server response: ${await response.text()}`);
      }
    }
  }
});

async function sendCredentials(username, password, email, singup = false) {
  const headers = {
    "Content-Type": "application/json",
  };

  headers["authentificationtype"] = singup ? "singup" : "login";

  const response = await fetch("/loginRoute", {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ username, password, email }),
  });

  const responseBody = await response.json();

  return responseBody;
}

function getCredentials(type) {
  let username = null;
  let password = null;

  let usernameInput = document.querySelector(
    `form[data-action-type="${type}"] .username-input`
  );

  if (usernameInput) {
    username = usernameInput.value;
  }

  let passwordInput = document.querySelector(
    `form[data-action-type="${type}"] .password-input`
  );
  if (passwordInput) {
    password = passwordInput.value;
  }

  return { username, password };
}
function validateUserName(username) {
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  if (!alphanumericRegex.test(username)) {
    alert("invalid username format: only alphanumeric characters allowed");
    return false;
  }
  return true;
}

function validFormatCredentials(username, password) {
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  if (!alphanumericRegex.test(username)) {
    alert("invalid username format: only alphanumeric characters allowed");
    return false;
  }
  return isValidPassword(password);
}

function isValidPassword(password) {
  const minLength = 8;
  const specialCharacters = "!@#$%^&*";
  const specialCharacterRegex = new RegExp(
    `[${specialCharacters.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}]`
  );

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecialChar = specialCharacterRegex.test(password);
  const isLongEnough = password.length >= minLength;

  if (
    hasUppercase &&
    hasLowercase &&
    hasDigit &&
    hasSpecialChar &&
    isLongEnough
  )
    return true;
  else {
    alert(
      "You password doesn't contain at least " +
        (!hasUppercase ? "an uppercase letter, " : "") +
        (!hasLowercase ? "a lowercase letter, " : "") +
        (!hasDigit ? "a digit, " : "") +
        (!hasSpecialChar
          ? `a special character, as in ${specialCharacters}, `
          : "") +
        (!isLongEnough ? `is shorter than 8 characters` : "")
    );
    return false;
  }
}

function getAndValidateEmail() {
  let emailInput = document.getElementById("emailInput");

  let email = emailInput.value;

  if (!emailInput.checkValidity()) alert("Invalid email format");
  else return email;

  return null;
}
