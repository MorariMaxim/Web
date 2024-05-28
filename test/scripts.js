document.addEventListener('DOMContentLoaded', function() {
    const projectImagesButton = document.getElementById('projectImagesButton');
    const menu = document.getElementById('menu');

    projectImagesButton.addEventListener('click', function() {
        if (menu.style.display === 'flex') {
            menu.style.display = 'none';
        } else {
            menu.style.display = 'flex';
            menu.style.flexDirection = 'column';
            menu.style.justifyContent = 'center';
            menu.style.alignItems = 'center';
        }
    });
});
