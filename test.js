function keepSpacesAndLetters(text) {
  // Replace any characters that are not letters or spaces with an empty string
  return text.replace(/[^a-zA-Z\s]/g, "");
}

// Example usage:
const text = "Hello123, World! How are you?";
const cleanedText = keepSpacesAndLetters(text);
console.log(cleanedText); // Output: "Hello World How are you"
