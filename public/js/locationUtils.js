// Utility to extract the most accurate human-readable location name from Nominatim/OpenStreetMap
function getBestLocationName(address) {
    return (
        address.city ||
        address.town ||
        address.village ||
        address.hamlet ||
        address.suburb ||
        address.neighbourhood ||
        address.state_district ||
        address.state ||
        address.county ||
        `Lat: ${address.lat?.toFixed?.(4) || ''}, Lon: ${address.lon?.toFixed?.(4) || ''}` ||
        "Unknown Location"
    );
}

// Export for global use
window.getBestLocationName = getBestLocationName;
