// sell.js - Handles dynamic sell form for StudXchange
// Dependencies: db-config.js, env.js, style.css

// Ensure locationUtils.js is loaded for getBestLocationName
(function ensureLocationUtilsLoaded() {
  if (!window.getBestLocationName) {
    var script = document.createElement('script');
    script.src = 'js/locationUtils.js';
    script.onload = function() {
      // Script loaded
    };
    document.head.appendChild(script);
  }
})();

// List of Indian colleges for autocomplete
const colleges = [
  "All", "IIT Bombay", "IIT Delhi", "IIT Kanpur", "IIT Kharagpur", "IIT Madras", "IIT Roorkee", "IIT Guwahati", "IIT Hyderabad", "IIT BHU", "IIT Dhanbad", "IIT Indore", "IIT Mandi", "IIT Ropar", "IIT Gandhinagar", "IIT Jodhpur", "IIT Patna", "IIT Palakkad", "IIT Tirupati", "IIT Bhilai", "IIT Goa", "IIT Jammu", "IIT Dharwad", "IIT Bhubaneswar", "IIT ISM Dhanbad", "IIT Varanasi", "IIT (ISM) Dhanbad", "IIT (BHU) Varanasi", "IIT (ISM)", "IIT (BHU)", "NIT Trichy", "NIT Surathkal", "NIT Warangal", "NIT Rourkela", "NIT Calicut", "NIT Kurukshetra", "NIT Durgapur", "NIT Jaipur", "NIT Allahabad", "NIT Nagpur", "NIT Silchar", "NIT Surat", "NIT Bhopal", "NIT Jalandhar", "NIT Patna", "NIT Raipur", "NIT Goa", "NIT Delhi", "NIT Meghalaya", "NIT Arunachal Pradesh", "NIT Agartala", "NIT Puducherry", "NIT Manipur", "NIT Mizoram", "NIT Sikkim", "NIT Hamirpur", "NIT Uttarakhand", "NIT Andhra Pradesh", "BITS Pilani", "BITS Goa", "BITS Hyderabad", "VIT Vellore", "VIT Chennai", "SRM Chennai", "SRM Delhi NCR", "SRM Amaravati",
  "COEP Pune", "COEP Technological University", "VIT Pune", "Vishwakarma Institute of Technology Pune", "MIT WPU Pune", "MIT World Peace University Pune", "Symbiosis Institute of Technology Pune", "Symbiosis International University Pune", "SPPU Pune", "Savitribai Phule Pune University", "DY Patil College Pune", "Dr. DY Patil Institute of Technology Pune", "SIT Pune", "Sinhgad Institute of Technology Pune", "Sinhgad College of Engineering Pune", "Bharati Vidyapeeth Pune", "Bharati Vidyapeeth College of Engineering Pune", "PICT Pune", "Pune Institute of Computer Technology", "VIIT Pune", "Vishwakarma Institute of Information Technology Pune", "PCCOE Pune", "Pimpri Chinchwad College of Engineering Pune", "JSPM Pune", "JSPM's Rajarshi Shahu College of Engineering Pune", "JSPM's Imperial College of Engineering Pune", "AIT Pune", "Army Institute of Technology Pune", "Cummins College Pune", "Cummins College of Engineering for Women Pune", "Modern College Pune", "Fergusson College Pune", "Nowrosjee Wadia College Pune", "MES Garware College Pune", "Indira College of Engineering Pune", "AISSMS Pune", "AISSMS College of Engineering Pune", "Marathwada Mitra Mandal's College of Engineering Pune", "Sinhgad Academy of Engineering Pune", "Sinhgad College of Architecture Pune", "DYP Akurdi Pune", "DYP Ambi Pune", "DYP Lohegaon Pune", "DY Patil Navi Mumbai", "DY Patil Kolhapur", "Walchand College of Engineering Sangli", "Government College of Engineering Karad", "Government College of Engineering Amravati", "VJTI Mumbai", "Veermata Jijabai Technological Institute Mumbai", "ICT Mumbai", "Institute of Chemical Technology Mumbai", "KJ Somaiya College Mumbai", "KJ Somaiya College of Engineering Mumbai", "Thadomal Shahani Engineering College Mumbai", "Fr. Conceicao Rodrigues College of Engineering Mumbai", "Sardar Patel College of Engineering Mumbai", "Terna Engineering College Navi Mumbai", "Other Maharashtra College",
  "Manipal University", "Delhi University", "Mumbai University", "Jadavpur University", "Anna University", "Osmania University", "Jamia Millia Islamia", "JNU Delhi", "AMU Aligarh", "IIIT Hyderabad", "IIIT Delhi", "IIIT Bangalore", "IIIT Allahabad", "IIITDM Jabalpur", "IIITDM Kancheepuram", "IIIT Bhubaneswar", "IIIT Vadodara", "IIIT Kota", "IIIT Guwahati", "IIIT Lucknow", "IIIT Kalyani", "IIIT Una", "IIIT Sonepat", "IIIT Dharwad", "IIIT Tiruchirappalli", "IIIT Nagpur", "IIIT Pune", "IISc Bangalore", "IISER Pune", "IISER Kolkata", "IISER Mohali", "IISER Bhopal", "IISER Thiruvananthapuram", "IISER Tirupati", "IISER Berhampur", "IISER TVM", "Other"
];

// Helper: Smart search for college names
function filterColleges(query) {
  if (!query) return colleges;
  query = query.toLowerCase();
  return colleges.filter(col =>
    col.toLowerCase().includes(query) ||
    (query.includes('iit') && col.toLowerCase().includes('iit')) ||
    (query.includes('nit') && col.toLowerCase().includes('nit')) ||
    (query.includes('vit') && col.toLowerCase().includes('vit'))
  );
}

// DOM Elements
const categorySelect = document.getElementById('category');
const dynamicFields = document.getElementById('dynamicSellFields');
const sellForm = document.getElementById('sellForm');

let currentLocation = null;
let mapLocation = null;
// Global variable to make the openMapModal function accessible
window.openMapModal = null;

// Removed redundant event listener for 'selectOnMapBtn' as no such static button exists in the HTML.
// The Select on Map button is rendered dynamically in each form and event is bound after rendering.
// See renderRegularProductForm and renderRoomForm for correct event binding.

categorySelect.addEventListener('change', handleCategoryChange);
sellForm.addEventListener('submit', handleSellSubmit);

document.addEventListener('DOMContentLoaded', async () => {
  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
  } catch (e) {
    console.error('Error parsing user data:', e);
  }
  
  if (!currentUser || !currentUser.id) {
    // Try to get from Supabase session
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session && session.user) {
      // Set currentUser in localStorage for future checks
      currentUser = { id: session.user.id, email: session.user.email, ...session.user.user_metadata };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      // Show dialog and prevent further actions
      showLoginRequiredDialog();
      return;
    }
  }
  
  // Setup map modal first so it's available when category changes
  setupMapModal();
  handleCategoryChange();
});

function showLoginRequiredDialog() {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0,0,0,0.4)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';

  // Create dialog box
  const dialog = document.createElement('div');
  dialog.style.background = '#fff';
  dialog.style.padding = '32px 24px';
  dialog.style.borderRadius = '12px';
  dialog.style.boxShadow = '0 4px 24px rgba(0,0,0,0.15)';
  dialog.style.textAlign = 'center';
  dialog.innerHTML = `
    <div style="font-size:1.2rem;margin-bottom:12px;">You must be logged in to sell.</div>
    <button id="closeLoginDialog" style="padding:8px 20px;background:#2a3d56;color:#fff;border:none;border-radius:6px;font-size:1rem;cursor:pointer;">Close</button>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  document.getElementById('closeLoginDialog').onclick = function() {
    document.body.removeChild(overlay);
  };
}

function handleCategoryChange() {
  const cat = categorySelect.value;
  dynamicFields.innerHTML = '';
  if (!cat) return;

  if (cat === 'rooms_hostels') {
    renderRoomForm();
  } else if (cat === 'notes') {
    renderNotesForm();
  } else {
    renderRegularProductForm();
  }
}

function renderCollegeSelector(id = 'college', label = 'Select College') {
  // Uses datalist for search
  return `
    <label for="${id}">${label}</label>
    <input list="college-list" id="${id}" name="${id}" required autocomplete="off" placeholder="Type college name or short form...">
    <datalist id="college-list">
      ${colleges.map(col => `<option value="${col}">`).join('')}
    </datalist>
  `;
}

function renderRegularProductForm() {
  dynamicFields.innerHTML = `
    ${renderCollegeSelector()}
    <label for="title">Product Title</label>
    <input type="text" id="title" name="title" required maxlength="100">
    <label for="price">Set Price (INR)</label>
    <input type="number" id="price" name="price" required min="0">
    <label for="condition">Condition</label>
    <select id="condition" name="condition" required>
      <option value="">Select</option>
      <option value="new">New</option>
      <option value="old">Old</option>
      <option value="refurbished">Refurbished</option>
    </select>
    <label for="images">Upload Images (max 5)</label>
    <input type="file" id="images" name="images" accept="image/*" multiple required>
    <label for="description">Description</label>
    <textarea id="description" name="description" required maxlength="1000"></textarea>
    <div class="location-btns" style="gap: 12px; display: flex; flex-wrap: wrap;">
      <button type="button" id="useCurrentLocation" class="btn-secondary">Use Current Location</button>
      <button type="button" id="selectOnMap" class="btn-secondary">Select on Map</button>
    </div>
    <input type="hidden" id="location" name="location">
  `;
  document.getElementById('useCurrentLocation').onclick = getCurrentLocation;
  const selectOnMapBtn = document.getElementById('selectOnMap');
  selectOnMapBtn.onclick = function() {
    if (typeof window.openMapModal === 'function') {
      window.openMapModal();
    } else {
      alert('Map feature is not ready yet. Please try again in a few seconds.');
    }
  };
  document.getElementById('images').onchange = (e) => limitFiles(e, 5);
}

function renderRoomForm() {
  dynamicFields.innerHTML = `
    ${renderCollegeSelector()}
    <label for="roomName">Room/Hostel Name</label>
    <input type="text" id="roomName" name="roomName" required maxlength="100">
    <label for="roomType">Room Type</label>
    <select id="roomType" name="roomType" required>
      <option value="">Select Type</option>
      <option value="single">Single Room</option>
      <option value="shared">Shared Room</option>
      <option value="1bhk">1 BHK</option>
      <option value="2bhk">2 BHK</option>
      <option value="3bhk">3 BHK</option>
      <option value="pg">PG</option>
      <option value="hostel">Hostel</option>
    </select>
    <label for="fees">Fees/Amount (INR)</label>
    <input type="number" id="fees" name="fees" required min="0">
    <label><input type="checkbox" id="feesIncludeMess" name="feesIncludeMess"> Include Mess in Fees</label>
    <label for="deposit">Deposit Amount (INR)</label>
    <input type="number" id="deposit" name="deposit" required min="0">
    <label for="description">Description</label>
    <textarea id="description" name="description" required maxlength="1000"></textarea>
    <label for="distance">Distance from College (km)</label>
    <input type="number" id="distance" name="distance" required min="0" step="0.1">
    <label for="occupancy">Occupancy</label>
    <input type="number" id="occupancy" name="occupancy" required min="1" max="20">
    <label for="roomImages">Upload Images (max 10)</label>
    <input type="file" id="roomImages" name="roomImages" accept="image/*" multiple required>
    <label for="ownerName">Owner Name</label>
    <input type="text" id="ownerName" name="ownerName" required maxlength="50">
    <label for="contact1">Contact Number</label>
    <input type="tel" id="contact1" name="contact1" required pattern="[0-9]{10}">
    <label for="contact2">Second Contact Number (optional)</label>
    <input type="tel" id="contact2" name="contact2" pattern="[0-9]{10}">
    <label>Amenities</label>
    <div class="amenities">
      <label><input type="checkbox" name="amenities" value="ac"> AC</label>
      <label><input type="checkbox" name="amenities" value="wifi"> WiFi</label>
      <label><input type="checkbox" name="amenities" value="washing_machine"> Washing Machine</label>
      <label><input type="checkbox" name="amenities" value="mess"> Mess Included</label>
      <label><input type="checkbox" name="amenities" value="refrigerator"> Refrigerator</label>
      <label><input type="checkbox" name="amenities" value="parking"> Parking</label>
      <label><input type="checkbox" name="amenities" value="hot_water"> Hot Water/Geyser</label>
      <label><input type="checkbox" name="amenities" value="furnished"> Furnished</label>
    </div>
    <label for="messType">Mess Type</label>
    <select id="messType" name="messType" required>
      <option value="">Select</option>
      <option value="veg">Veg</option>
      <option value="nonveg">Non Veg</option>
      <option value="both">Both</option>
    </select>
    <div class="location-btns" style="gap: 12px; display: flex; flex-wrap: wrap;">
      <button type="button" id="useCurrentLocation" class="btn-secondary">Current Location</button>
      <button type="button" id="selectOnMap" class="btn-secondary">Select on Map</button>
    </div>
    <input type="hidden" id="location" name="location">
  `;
  document.getElementById('useCurrentLocation').onclick = getCurrentLocation;
  document.getElementById('selectOnMap').onclick = window.openMapModal || function() { alert('Map modal not available.'); };
  document.getElementById('roomImages').onchange = (e) => limitFiles(e, 10);
}

function renderNotesForm() {
  dynamicFields.innerHTML = `
    ${renderCollegeSelector()}
    <label for="title">Notes Title</label>
    <input type="text" id="title" name="title" required maxlength="100">
    <label for="forYear">For Year</label>
    <select id="forYear" name="forYear" required>
      <option value="">Select Year</option>
      <option value="pre_nursery">Pre-Nursery</option>
      <option value="nursery">Nursery</option>
      <option value="lkg">LKG (Lower Kindergarten)</option>
      <option value="ukg">UKG (Upper Kindergarten)</option>
      <option value="1st">1st Grade / Class 1</option>
      <option value="2nd">2nd Grade / Class 2</option>
      <option value="3rd">3rd Grade / Class 3</option>
      <option value="4th">4th Grade / Class 4</option>
      <option value="5th">5th Grade / Class 5</option>
      <option value="6th">6th Grade / Class 6</option>
      <option value="7th">7th Grade / Class 7</option>
      <option value="8th">8th Grade / Class 8</option>
      <option value="9th">9th Grade / Class 9</option>
      <option value="10th">10th Grade / Class 10 (Secondary)</option>
      <option value="11th">11th Grade / Class 11 (Higher Secondary)</option>
      <option value="12th">12th Grade / Class 12 (Senior Secondary)</option>
      <option value="diploma">Diploma (After 10th/12th)</option>
      <option value="certificate">Certificate Course</option>
      <option value="first_year">First Year (UG)</option>
      <option value="second_year">Second Year (UG)</option>
      <option value="third_year">Third Year (UG)</option>
      <option value="fourth_year">Fourth Year (UG)</option>
      <option value="fifth_year">Fifth Year (UG)</option>
      <option value="masters">Masters (PG)</option>
      <option value="mphil">M.Phil</option>
      <option value="phd">PhD</option>
      <option value="postdoc">Postdoctoral</option>
    </select>
    <label for="subjectCourse">Subject/Course</label>
    <select id="subjectCourse" name="subjectCourse" required>
      <option value="">Select Subject/Course</option>
      <option value="mathematics">Mathematics</option>
      <option value="physics">Physics</option>
      <option value="chemistry">Chemistry</option>
      <option value="biology">Biology</option>
      <option value="english">English</option>
      <option value="hindi">Hindi</option>
      <option value="computer_science">Computer Science</option>
      <option value="electronics">Electronics</option>
      <option value="mechanical_engineering">Mechanical Engineering</option>
      <option value="civil_engineering">Civil Engineering</option>
      <option value="electrical_engineering">Electrical Engineering</option>
      <option value="chemical_engineering">Chemical Engineering</option>
      <option value="information_technology">Information Technology</option>
      <option value="commerce">Commerce</option>
      <option value="economics">Economics</option>
      <option value="business_studies">Business Studies</option>
      <option value="accountancy">Accountancy</option>
      <option value="history">History</option>
      <option value="geography">Geography</option>
      <option value="political_science">Political Science</option>
      <option value="psychology">Psychology</option>
      <option value="sociology">Sociology</option>
      <option value="law">Law</option>
      <option value="medicine">Medicine</option>
      <option value="pharmacy">Pharmacy</option>
      <option value="architecture">Architecture</option>
      <option value="mba">MBA</option>
      <option value="bba">BBA</option>
      <option value="bcom">B.Com</option>
      <option value="ba">BA</option>
      <option value="bsc">B.Sc</option>
      <option value="msc">M.Sc</option>
      <option value="ma">MA</option>
      <option value="mtech">M.Tech</option>
      <option value="btech">B.Tech</option>
      <option value="mca">MCA</option>
      <option value="bca">BCA</option>
      <option value="other">Other</option>
    </select>
    <label for="price">Set Price (INR)</label>
    <input type="number" id="price" name="price" required min="0">
    <label for="notesImages">Upload Images (max 5)</label>
    <input type="file" id="notesImages" name="notesImages" accept="image/*" multiple required>
    <label for="pdf">Upload PDF (max 100MB)</label>
    <input type="file" id="pdf" name="pdf" accept="application/pdf" required>
    <label for="description">Description</label>
    <textarea id="description" name="description" required maxlength="1000"></textarea>
  `;
  document.getElementById('notesImages').onchange = (e) => limitFiles(e, 5);
  document.getElementById('pdf').onchange = (e) => limitFiles(e, 1);
}

function limitFiles(e, max) {
  if (e.target.files.length > max) {
    alert(`You can upload max ${max} files!`);
    e.target.value = '';
  }
}

async function getCurrentLocation(e) {
  let btn = e && e.currentTarget ? e.currentTarget : (e && e.target ? e.target : this);
  let form = btn.closest('form');
  let locationInput = form ? form.querySelector('input[name="location"]') : document.getElementById('location');
  let oldMsgs = btn.parentNode.querySelectorAll('.location-status-msg');
  oldMsgs.forEach(el => el.remove());
  let statusMsg = document.createElement('div');
  statusMsg.className = 'location-status-msg';
  statusMsg.style = 'color:#c00;margin-top:8px;font-size:1rem;text-align:left;';
  btn.parentNode.appendChild(statusMsg);
  if (!navigator.geolocation) {
    statusMsg.textContent = 'Geolocation is not supported by your browser.';
    if (locationInput) locationInput.value = '';
    return;
  }
  statusMsg.textContent = 'Fetching current location...';
  navigator.geolocation.getCurrentPosition(
    (position) => {
      try {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const name = `Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`;
        if (locationInput) locationInput.value = JSON.stringify({
          lat: lat,
          lon: lon,
          name: name
        });
        statusMsg.textContent = 'Location captured!';
        statusMsg.style.color = '#090';
        setTimeout(() => { statusMsg.textContent = ''; }, 3500);
      } catch (err) {
        statusMsg.textContent = 'Failed to get location. Please try again.';
        if (locationInput) locationInput.value = '';
      }
    },
    (error) => {
      let msg = 'Unable to get location.';
      if (error && error.message) msg += ' ' + error.message;
      statusMsg.textContent = msg;
      if (locationInput) locationInput.value = '';
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

// --- MAP MODAL WITH LEAFLET ---
function setupMapModal() {
  // Initialize global variables
  let leafletMap = null;
  let leafletMarker = null;
  let geocoder = null;

  // Get modal elements
  const modal = document.getElementById('sell-map-modal');
  const closeModal = document.getElementById('closeMapModal');
  const mapContainer = document.getElementById('mapContainer');
  const confirmBtn = document.getElementById('confirmMapLocation');

  if (!modal || !closeModal || !mapContainer || !confirmBtn) {
    console.error('Missing required modal elements');
    return;
  }

  // Helper: Clean up map instance
  function cleanupMap() {
    if (leafletMap) {
      leafletMap.off();
      leafletMap.remove();
      leafletMap = null;
      leafletMarker = null;
    }
  }

  // Modal close logic
  closeModal.onclick = function() {
    modal.style.display = 'none';
    cleanupMap();
  };

  // Confirm location logic
  confirmBtn.onclick = function() {
    if (window.mapLocation) {
      const locInput = document.getElementById('location');
      if (locInput) {
        locInput.value = JSON.stringify({
          lat: window.mapLocation.lat,
          lon: window.mapLocation.lon,
          name: window.mapLocation.name
        });
        locInput.dispatchEvent(new Event('change'));
      }
      modal.style.display = 'none';
      cleanupMap();
      alert('Location set from map: ' + window.mapLocation.name);
    } else {
      alert('Please select a location on the map.');
    }
  };

  // Map initialization function
  function initializeMap() {
    if (!window.L) {
      console.error('Leaflet not loaded');
      return false;
    }
    cleanupMap();
    try {
      leafletMap = L.map('mapContainer').setView([19.7515, 75.7139], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors'
      }).addTo(leafletMap);
      // Add geocoder control
      if (L.Control.Geocoder) {
        geocoder = L.Control.Geocoder.nominatim();
        const geocoderControl = L.Control.geocoder({
          geocoder: geocoder,
          defaultMarkGeocode: false
        });
        geocoderControl.on('markgeocode', function(e) {
          const latlng = e.geocode.center;
          if (leafletMarker) leafletMap.removeLayer(leafletMarker);
          leafletMarker = L.marker(latlng).addTo(leafletMap);
          window.mapLocation = {
            lat: latlng.lat,
            lon: latlng.lng,
            name: e.geocode.name
          };
          leafletMap.setView(latlng, 15);
        });
        geocoderControl.addTo(leafletMap);
      } else {
        console.warn('Geocoder control not available');
      }
      return true;
    } catch (error) {
      console.error('Error initializing map:', error);
      return false;
    }
  }

  // Add map click handler only after map is initialized
  function addLeafletMapClickHandler() {
    if (!leafletMap) return;
    leafletMap.on('click', function(e) {
      if (leafletMarker) leafletMap.removeLayer(leafletMarker);
      leafletMarker = L.marker(e.latlng).addTo(leafletMap);
      window.mapLocation = {
        lat: e.latlng.lat,
        lon: e.latlng.lng,
        name: `Lat: ${e.latlng.lat.toFixed(4)}, Lon: ${e.latlng.lng.toFixed(4)}`
      };
      // Try reverse geocoding
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
        .then(response => response.json())
        .then(data => {
          if (data && data.display_name) {
            window.mapLocation.name = data.display_name;
          }
        })
        .catch(error => {
          console.error('Error getting location:', error);
        });
    });
    // Search bar logic
    document.getElementById('mapSearchBtn').onclick = function() {
      const query = document.getElementById('mapSearchInput').value.trim();
      if (!query) return;
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
        .then(resp => resp.json())
        .then(results => {
          if (results && results.length > 0) {
            const place = results[0];
            const latlng = [parseFloat(place.lat), parseFloat(place.lon)];
            leafletMap.setView(latlng, 15);
            if (leafletMarker) leafletMap.removeLayer(leafletMarker);
            leafletMarker = L.marker(latlng).addTo(leafletMap);
            window.mapLocation = {
              lat: latlng[0],
              lon: latlng[1],
              name: place.display_name
            };
          } else {
            alert('Place not found. Try another search.');
          }
        })
        .catch(err => {
          alert('Error searching for place.');
        });
    };
    // Handle Enter key in search input
    document.getElementById('mapSearchInput').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('mapSearchBtn').click();
      }
    });
  }

  // Expose modal open function globally
  window.openMapModal = function() {
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.55)';
    modal.style.zIndex = '9999';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.style.width = '350px';
      modalContent.style.maxWidth = '95vw';
      modalContent.style.margin = '0 auto';
      modalContent.style.background = '#fff';
      modalContent.style.borderRadius = '8px';
      modalContent.style.padding = '20px';
      modalContent.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    }
    // Load Leaflet if not loaded
    function ensureLeafletLoaded(cb) {
      if (window.L && window.L.Control && window.L.Control.Geocoder) {
        cb();
        return;
      }
      let loaded = 0;
      const total = 2;
      function checkLoaded() {
        loaded++;
        if (loaded === total) cb();
      }
      if (!window.L) {
        const leafletCSS = document.createElement('link');
        leafletCSS.rel = 'stylesheet';
        leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(leafletCSS);
        const leafletJS = document.createElement('script');
        leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        leafletJS.onload = checkLoaded;
        document.head.appendChild(leafletJS);
      } else {
        checkLoaded();
      }
      if (!window.L || !window.L.Control || !window.L.Control.Geocoder) {
        const geocoderJS = document.createElement('script');
        geocoderJS.src = 'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js';
        geocoderJS.onload = checkLoaded;
        document.head.appendChild(geocoderJS);
        const geocoderCSS = document.createElement('link');
        geocoderCSS.rel = 'stylesheet';
        geocoderCSS.href = 'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css';
        document.head.appendChild(geocoderCSS);
      } else {
        checkLoaded();
      }
    }
    ensureLeafletLoaded(function() {
      if (!initializeMap()) {
        alert('Error initializing map. Please try again.');
        modal.style.display = 'none';
      } else {
        addLeafletMapClickHandler();
      }
    });
  };
}

  
  // Load Leaflet CSS and JS if not already loaded
  if (!window.L) {
    const leafletCSS = document.createElement('link');
    leafletCSS.rel = 'stylesheet';
    leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(leafletCSS);
    
    const leafletJS = document.createElement('script');
    leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    document.head.appendChild(leafletJS);
    
    const geocoderJS = document.createElement('script');
    geocoderJS.src = 'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js';
    document.head.appendChild(geocoderJS);
    
    const geocoderCSS = document.createElement('link');
    geocoderCSS.rel = 'stylesheet';
    geocoderCSS.href = 'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css';
    document.head.appendChild(geocoderCSS);
  }
  
  closeModal.onclick = function() { 
    modal.style.display = 'none'; 
  };
  
  confirmBtn.onclick = function() {
    if (mapLocation) {
      document.getElementById('location').value = JSON.stringify({
        lat: mapLocation.lat,
        lon: mapLocation.lon,
        name: mapLocation.name
      });
      modal.style.display = 'none';
      alert('Location set from map: ' + mapLocation.name);
    } else {
      alert('Please select a location on the map.');
    }
  };

  // Map initialization function
  function initializeMap() {
    // Make sure Leaflet is loaded
    if (!window.L) {
      console.error('Leaflet not loaded');
      return false;
    }

    // Remove any existing map instance
    if (leafletMap) {
      leafletMap.remove();
      leafletMap = null;
    }

    try {
      // Initialize map centered on Maharashtra
      leafletMap = L.map('mapContainer').setView([19.7515, 75.7139], 6);
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors'
      }).addTo(leafletMap);

      // Add geocoder control
      if (L.Control.Geocoder) {
        geocoder = L.Control.Geocoder.nominatim();
        const geocoderControl = L.Control.geocoder({
          geocoder: geocoder,
          defaultMarkGeocode: false
        });
        
        geocoderControl.on('markgeocode', function(e) {
          const latlng = e.geocode.center;
          if (leafletMarker) leafletMap.removeLayer(leafletMarker);
          leafletMarker = L.marker(latlng).addTo(leafletMap);
          mapLocation = {
            lat: latlng.lat,
            lon: latlng.lng,
            name: e.geocode.name
          };
          leafletMap.setView(latlng, 15);
        });
        
        geocoderControl.addTo(leafletMap);
      } else {
        console.warn('Geocoder control not available');
      }

      return true;
    } catch (error) {
      console.error('Error initializing map:', error);
      return false;
    }
  }
      
  // Add map click handler only after map is initialized
  function addLeafletMapClickHandler() {
    if (!leafletMap) return;
    leafletMap.on('click', function(e) {
      if (leafletMarker) leafletMap.removeLayer(leafletMarker);
      leafletMarker = L.marker(e.latlng).addTo(leafletMap);
      mapLocation = {
        lat: e.latlng.lat,
        lon: e.latlng.lng,
        name: `Lat: ${e.latlng.lat.toFixed(4)}, Lon: ${e.latlng.lng.toFixed(4)}`
      };
      try {
        // Try reverse geocoding
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
          .then(response => response.json())
          .then(data => {
            if (data && data.display_name) {
              mapLocation.name = data.display_name;
            }
          })
          .catch(error => {
            console.error('Error getting location:', error);
          });
      } catch (err) {
        console.error('Error handling map click:', err);
      }
    });
      
    // --- Search bar logic ---
    document.getElementById('mapSearchBtn').onclick = function() {
      const query = document.getElementById('mapSearchInput').value.trim();
      if (!query) return;
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
        .then(resp => resp.json())
        .then(results => {
          if (results && results.length > 0) {
            const place = results[0];
            const latlng = [parseFloat(place.lat), parseFloat(place.lon)];
            leafletMap.setView(latlng, 15);
            if (leafletMarker) leafletMap.removeLayer(leafletMarker);
            leafletMarker = L.marker(latlng).addTo(leafletMap);
            mapLocation = {
              lat: latlng[0],
              lon: latlng[1],
              name: place.display_name
            };
          } else {
            alert('Place not found. Try another search.');
          }
        })
        .catch(err => {
          alert('Error searching for place.');
        });
    };
      
    // Handle Enter key in search input
    document.getElementById('mapSearchInput').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('mapSearchBtn').click();
      }
    });
  }

  // Modal event handlers
  closeModal.onclick = function() {
    modal.style.display = 'none';
    // Clean up map when closing
    if (leafletMap) {
      leafletMap.remove();
      leafletMap = null;
    }
  };

  saveLocationBtn.onclick = function() {
    if (mapLocation) {
      // Update location input fields
      const locationInputs = document.querySelectorAll('.location-field');
      locationInputs.forEach(input => {
        input.value = `${mapLocation.lat},${mapLocation.lon}`;
        input.dispatchEvent(new Event('change'));
      });
      
      modal.style.display = 'none';
    } else {
      alert('Please select a location on the map.');
    }
  };

  // Open modal function
  window.openMapModal = function() {
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.55)';
    modal.style.zIndex = '9999';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.style.width = '350px';
      modalContent.style.maxWidth = '95vw';
      modalContent.style.margin = '0 auto';
      modalContent.style.background = '#fff';
      modalContent.style.borderRadius = '8px';
      modalContent.style.padding = '20px';
      modalContent.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    }

    // Initialize map when modal opens
    if (!initializeMap()) {
      alert('Error initializing map. Please try again.');
      modal.style.display = 'none';
    }
    addLeafletMapClickHandler();
  };


async function uploadImageToImgbb(file) {
  const apiKey = window.env && window.env.IMGBB_API_KEY ? window.env.IMGBB_API_KEY : undefined;
  if (!apiKey) {
    alert('imgbb API key is missing. Please set it in your environment/config.');
    throw new Error('imgbb API key missing');
  }
  const formData = new FormData();
  formData.append('image', file);
  formData.append('key', apiKey);
  try {
    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData
    });
    let data;
    try {
      data = await response.json();
    } catch (jsonErr) {
      throw new Error('imgbb upload failed: Invalid JSON response');
    }
    if (!response.ok) {
      alert('Image upload failed: ' + (data.error?.message || response.statusText));
      throw new Error(data.error?.message || 'imgbb upload failed');
    }
    if (!data?.data?.url) {
      alert('Image upload failed: No image URL returned');
      throw new Error('imgbb upload failed: No image URL returned');
    }
    return data.data.url;
  } catch (err) {
    alert('Image upload failed: ' + err.message);
    throw err;
  }
}

async function uploadPdfToSupabase(file) {
  const supabase = window.supabaseClient;
  if (!supabase) {
    alert('Supabase client is not initialized. Check your script order and config.');
    throw new Error('Supabase client not initialized');
  }

  const fileName = `${Date.now()}_${file.name}`;
  let uploadResponse;
  try {
    uploadResponse = await supabase.storage.from('product-pdfs').upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
  } catch (uploadErr) {
    throw new Error('PDF upload failed: ' + (uploadErr.message || uploadErr));
  }
  const data = uploadResponse && uploadResponse.data;
  const error = uploadResponse && uploadResponse.error;
  if (error) throw new Error('PDF upload failed: ' + error.message);
  if (!data || !data.path) throw new Error('PDF upload failed: No data/path returned from Supabase.');

  // Get public URL (handle all property names)
  const publicUrlResult = supabase.storage.from('product-pdfs').getPublicUrl(data.path);
  // Try all possible property names
  let publicURL = publicUrlResult.data?.publicUrl || publicUrlResult.data?.publicURL;
  if (!publicURL && typeof publicUrlResult.data === 'string') publicURL = publicUrlResult.data;

  if (!publicURL || typeof publicURL !== 'string' || !publicURL.startsWith('https:')) {
    throw new Error('PDF upload failed: No valid public URL returned. Check your Supabase bucket policy and public access settings.');
  }
  return publicURL;
}

// async function handleSellSubmit(e) {
async function handleSellSubmit(e) {
  e.preventDefault();
  showLoading();
  const cat = categorySelect.value;
  const formData = new FormData(sellForm);
  let payload = {};
  let imageUrls = [];
  let pdfUrl = '';
  try {
    if (cat === 'rooms_hostels') {
      payload = {
        college: formData.get('college'),
        roomName: formData.get('roomName'),
        title: formData.get('roomName'),
        roomType: formData.get('roomType'),
        fees: formData.get('fees'),
        feesIncludeMess: document.getElementById('feesIncludeMess').checked,
        deposit: formData.get('deposit'),
        description: formData.get('description'),
        distance: formData.get('distance'),
        occupancy: formData.get('occupancy'),
        ownerName: formData.get('ownerName'),
        contact1: formData.get('contact1'),
        contact2: formData.get('contact2'),
        amenities: Array.from(sellForm.querySelectorAll('input[name="amenities"]:checked')).map(cb => cb.value),
        messType: formData.get('messType'),
        createdAt: new Date().toISOString()
      };
      const files = formData.getAll('roomImages');
      for (const file of files) {
        if (file && file.size > 0) imageUrls.push(await uploadImageToImgbb(file));
      }
      payload.images = imageUrls;
      let sellerId = null;
      try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (user && user.id) {
          sellerId = user.id;
          payload.seller_id = sellerId;
          const upsertResult = await window.supabaseClient.from('users').upsert([
            {
              id: sellerId,
              email: user.email,
              name: user.user_metadata?.name || ''
            }
          ], { onConflict: ['id'] });
        }
      } catch (err) {}
      if (
        !payload.seller_id ||
        typeof payload.seller_id !== 'string' ||
        payload.seller_id.length < 20 ||
        payload.seller_id === '1' ||
        typeof payload.seller_id === 'number'
      ) {
        hideLoading();
        alert('Invalid seller_id (must be a valid UUID from Supabase Auth, never 1 or a number). Please log out and log in again.');
        return;
      }
      const supabase = window.supabaseClient;
      const { error: roomError } = await supabase
        .from('rooms')
        .insert([payload]);
      if (roomError) throw new Error(roomError.message);
      alert('Room/Hostel listed successfully!');
      sellForm.reset();
      handleCategoryChange();
    } else if (cat === 'notes') {
      payload = {
        college: formData.get('college'),
        title: formData.get('title'),
        note_year: formData.get('forYear'),
        note_subject: formData.get('subjectCourse'),
        price: formData.get('price'),
        description: formData.get('description'),
      };
      const imgFiles = formData.getAll('notesImages');
      for (const file of imgFiles) {
        if (file && file.size > 0) imageUrls.push(await uploadImageToImgbb(file));
      }
      payload.images = imageUrls;
      try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (user && user.id) {
          payload.seller_id = user.id;
          const upsertResult = await window.supabaseClient.from('users').upsert([
            {
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || ''
            }
          ], { onConflict: ['id'] });
        }
      } catch (err) {}
      const pdfFile = formData.get('pdf');
      if (pdfFile && pdfFile.size > 0) {
        if (pdfFile.size > window.SUPABASE_MAX_FILE_SIZE) throw new Error('PDF exceeds 100MB limit');
        pdfUrl = await uploadPdfToSupabase(pdfFile);
        if (pdfUrl && typeof pdfUrl === 'string' && pdfUrl.startsWith('https:')) {
          payload.pdfUrl = pdfUrl;
        } else {
          alert('PDF upload failed: No valid URL returned');
          throw new Error('PDF upload failed: No valid URL returned');
        }
      } else {
        payload.pdfUrl = '';
      }
      const { error: notesError } = await supabase
        .from('notes')
        .insert([payload]);
      if (notesError) throw new Error(notesError.message);
      alert('Notes listed successfully!');
      sellForm.reset();
      handleCategoryChange();
    } else {
      payload = {
        college: formData.get('college'),
        title: formData.get('title'),
        category: cat,
        price: formData.get('price'),
        condition: formData.get('condition'),
        description: formData.get('description'),
        location: formData.get('location') || ''
      };
      const files = formData.getAll('images');
      for (const file of files) {
        if (file && file.size > 0) imageUrls.push(await uploadImageToImgbb(file));
      }
      payload.images = imageUrls;
      try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (user && user.id) {
          payload.seller_id = user.id;
          const upsertResult = await window.supabaseClient.from('users').upsert([
            {
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || ''
            }
          ], { onConflict: ['id'] });
        }
      } catch (err) {}
      const supabase = window.supabaseClient;
      const { error: productError } = await supabase
        .from('products')
        .insert([payload]);
      if (productError) throw new Error(productError.message);
      alert('Product listed successfully!');
      sellForm.reset();
      handleCategoryChange();
    }
  } catch (err) {
    alert('Error: ' + err.message);
    (err);
  } finally {
    hideLoading();
  }
}

function showLoading() {
  if (document.getElementById('sellLoadingOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'sellLoadingOverlay';
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0,0,0,0.4)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';
  overlay.innerHTML = '<div style="background:#fff;padding:32px 24px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.15);text-align:center;"><div class="spinner" style="margin-bottom:12px;font-size:2rem;">⏳</div><div style="font-size:1.1rem;">Uploading, please wait...</div></div>';
  document.body.appendChild(overlay);
}
function hideLoading() {
  const overlay = document.getElementById('sellLoadingOverlay');
  if (overlay) overlay.remove();
}
