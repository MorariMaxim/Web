const newElement = document.createElement("div");
newElement.textContent = "This is a new element";

// Get a reference to the first child of the body
const firstChild = document.body.firstChild;

// Insert the new element before the first child of the body
document.body.insertBefore(newElement, firstChild);
