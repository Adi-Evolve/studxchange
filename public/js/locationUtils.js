// Utility to extract the most accurate human-readable location name from Nominatim/OpenStreetMap
function getBestLocationName(address) {
    // Prefer city + state if both available
    if (address.city && address.state) return `${address.city}, ${address.state}`;
    if (address.town && address.state) return `${address.town}, ${address.state}`;
    if (address.village && address.state) return `${address.village}, ${address.state}`;
    if (address.hamlet && address.state) return `${address.hamlet}, ${address.state}`;
    // If no city, try town/village/hamlet
    if (address.city) return address.city;
    if (address.town) return address.town;
    if (address.village) return address.village;
    if (address.hamlet) return address.hamlet;
    // If no city/town/village/hamlet, try suburb/neighbourhood
    if (address.suburb) return address.suburb;
    if (address.neighbourhood) return address.neighbourhood;
    // Try state_district, state, county
    if (address.state_district) return address.state_district;
    if (address.state) return address.state;
    if (address.county) return address.county;
    // Fallback: coordinates if available
    if (address.lat && address.lon) return `Lat: ${Number(address.lat).toFixed(4)}, Lon: ${Number(address.lon).toFixed(4)}`;
    return "Unknown Location";
}

// Export for global use
window.getBestLocationName = getBestLocationName;
