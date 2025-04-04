// Common navbar functionality for StudXchange

document.addEventListener('DOMContentLoaded', function() {
    // Insert the navbar HTML
    const navbarContainer = document.getElementById('common-navbar');
    if (navbarContainer) {
        navbarContainer.innerHTML = `
        <div class="navbar">
            <div class="navlogo">
                <a href="index.html">
                    <img src="Logo1.png" alt="StudXchange">
                </a>
            </div>
            <div class="search-container">
                <form class="searchbar" action="search-results.html" method="GET">
                    <select name="category" class="category-select">
                        <option value="all">All</option>
                        <option value="VIT">VIT</option>
                        <option value="COEP">COEP</option>
                        <option value="PICT">PICT</option>
                        <option value="DYP">DYP</option>
                        <option value="PCCOE">PCCOE</option>
                    </select>
                    <input type="text" name="query" placeholder="Search products...">
                    <button type="submit"><i class="fas fa-search"></i></button>
                </form>
            </div>
            <button class="nav-button location-button" id="locationButton">
                <i class="fas fa-map-marker-alt"></i> 
                <span id="locationText">Get Location</span>
            </button>
            <div class="button-container">
                <a class="nav-button wishlist-button me-2" href="wishlist.html">
                    <i class="far fa-heart"></i>
                </a>
                <a class="nav-button sell-button" href="sell.html">Sell/Donate</a>
                <div id="authButtonContainer"></div>
            </div>
        </div>
        `;
    }

    // Initialize navbar functionality
    initNavbar();
});

function initNavbar() {
    // Update auth button based on login status
    updateAuthButton();

    // Set up location button
    const locationButton = document.getElementById('locationButton');
    if (locationButton) {
        locationButton.addEventListener('click', handleLocation);
        
        // Restore location if available
        const userLocation = JSON.parse(localStorage.getItem('userLocation'));
        if (userLocation && userLocation.name) {
            const locationText = document.getElementById('locationText');
            if (locationText) {
                locationText.textContent = userLocation.name;
                locationButton.classList.add('active-location');
            }
        }
    }
}

function updateAuthButton() {
    const currentUser = localStorage.getItem('currentUser');
    const authContainer = document.getElementById('authButtonContainer');
    if (authContainer) {
        authContainer.innerHTML = currentUser ? 
            `<a class="nav-button profile-button" href="PROFILE_FINAL.html">Profile</a>` :
            `<a class="nav-button signup-button" href="login.html">Login</a>`;
    }
}

async function handleLocation() {
    if (!navigator.geolocation) {
        alert("Geolocation not supported");
        return null;
    }
    
    const locationButton = document.getElementById('locationButton');
    const locationText = document.getElementById('locationText');
    
    if (!locationButton || !locationText) return null;
    
    locationButton.disabled = true;
    locationText.textContent = 'Getting location...';
    
    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        
        // Get coordinates
        const loc = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            timestamp: Date.now()
        };
        
        // Get location name using reverse geocoding
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lon}`
            );
            const data = await response.json();
            
            // Extract city or town name
            if (data.address) {
                loc.name = data.address.city || data.address.town || 
                          data.address.village || data.address.suburb || 
                          'Your Location';
            } else {
                loc.name = 'Your Location';
            }
        } catch (error) {
            console.error("Error getting location name:", error);
            loc.name = 'Your Location';
        }
        
        // Update button text and save location
        localStorage.setItem('userLocation', JSON.stringify(loc));
        locationText.textContent = loc.name;
        locationButton.classList.add('active-location');
        locationButton.disabled = false;
        
        // Refresh page to update any distance-based sorting
        if (window.location.href.includes('category.html') ||
            window.location.href.includes('search-results.html')) {
            window.location.reload();
        }
        
        return loc;
    } catch (error) {
        console.error("Location error:", error);
        alert("Location access denied");
        locationText.textContent = 'Get Location';
        locationButton.disabled = false;
        return null;
    }
} 