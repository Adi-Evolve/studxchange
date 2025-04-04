document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('darkModeToggle');
    const body = document.body;
    const header = document.querySelector('header');
  
    // Load the user's preference from localStorage
    const currentMode = localStorage.getItem('darkMode');
    if (currentMode === 'enabled') {
      body.classList.add('dark-mode');
      header.classList.add('dark-mode');
    }
  
    toggleButton.addEventListener('click', () => {
      body.classList.toggle('dark-mode');
      header.classList.toggle('dark-mode');
  
      // Save the user's preference in localStorage
      if (body.classList.contains('dark-mode')) {
        localStorage.setItem('darkMode', 'enabled');
      } else {
        localStorage.setItem('darkMode', 'disabled');
      }
    });
  });
  

  