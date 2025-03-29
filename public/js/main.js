// Import other JS files
import './db-config.js';
import './navbar.js';

// Add any global JavaScript functionality here
document.addEventListener('DOMContentLoaded', () => {
  console.log('StudXchange application loaded successfully');
  
  // Initialize lazy loading for images
  if ('loading' in HTMLImageElement.prototype) {
    console.log('Native lazy loading supported');
    // Browser supports native lazy loading
    // This is handled with the loading="lazy" attribute
  } else {
    console.log('Native lazy loading not supported, implementing fallback');
    // Fallback for browsers that don't support native lazy loading
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    const lazyImageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const lazyImage = entry.target;
          lazyImage.src = lazyImage.dataset.src || lazyImage.src;
          lazyImageObserver.unobserve(lazyImage);
        }
      });
    });

    lazyImages.forEach(image => {
      lazyImageObserver.observe(image);
    });
  }
});
