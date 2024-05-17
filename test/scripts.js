document.getElementById('uploadButton').addEventListener('click', function() {
    document.getElementById('formContainer').classList.toggle('hidden');
});

document.getElementById('imageForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const imageUpload = document.getElementById('imageUpload').files[0];
    
    if (!imageUpload) {
        alert('Please select an image to upload.');
        return;
    }

    console.log('Title:', title);
    console.log('Description:', description);
    console.log('Image:', imageUpload);

    // Handle the form submission, e.g., upload the data to the server
    alert('Form submitted successfully!');
});
