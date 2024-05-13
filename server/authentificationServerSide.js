import { v4 as uuidv4 } from "uuid";

export async function generateSessionId() {
  try {
    const sessionId = uuidv4();
    return sessionId;
  } catch (error) {
    console.error("Error generating session ID:", error);
    return null;
  }
}
