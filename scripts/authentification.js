class SessionManager {
  constructor() {
    this.uuidv4Function = null;

    this.initializationPromise = new Promise((resolve, reject) => {
      import("https://cdn.skypack.dev/uuid@3")
        .then((uuid) => {
          this.uuidv4Function = uuid.default.v4;
          resolve();
        })
        .catch((error) => {
          console.error("Failed to load module:", error);
          reject(error);
        });
    });
  }

  async setSessionId(sessionId) {
    localStorage.setItem("sessionId", sessionId);
  }

  async getSessionId() {
    return localStorage.getItem("sessionId");
  }

  async removeSessionId() {
    localStorage.removeItem("sessionId");
  }

  async generateSessionId() {
    await this.initializationPromise;
    if (this.uuidv4Function) {
      return this.uuidv4Function();
    } else {
      console.error("uuidv4 function is not available yet");
      return null;
    }
  }

  async sendSessionId(sessionId) {
    console.log("sending sessionId");
    try {
      const response = await fetch("/loginRoute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          sessionId: sessionId,
        },
      });

      if (response.ok) {
        const responseBody = await response.json();

        if (responseBody.validSessionId == "false") {
          localStorage.removeItem("sessionId");
          localStorage.removeItem("nickName");
          return false;
        } else {
          localStorage.setItem("nickName", responseBody.username);
          return true;
        }
      } else {
        console.error("Error:", response.statusText);
      }
    } catch (error) {
      console.error("Error:", error);
    }

    return false;
  }
}

export default SessionManager;

const sessionManager = new SessionManager();
export { sessionManager };
