 sell.js - Handles dynamic sell form for StudXchange
 Dependencies: db-config.js, env.js, style.css

Ensure locationUtils.js is loaded for getBestLocationName
(function ensureLocationUtilsLoaded() {
  if (!window.getBestLocationName) {
    var script = document.createElement('script');
    script.src = 'js/locationUtils.js';
    script.onload = function() {
    };
    document.head.appendChild(script);
  }
})();

List of Indian colleges for autocomplete
const colleges = [
  "All", "IIT Bombay", "IIT Delhi", "IIT Kanpur", "IIT Kharagpur", "IIT Madras", "IIT Roorkee", "IIT Guwahati", "IIT Hyderabad", "IIT BHU", "IIT Dhanbad", "IIT Indore", "IIT Mandi", "IIT Ropar", "IIT Gandhinagar", "IIT Jodhpur", "IIT Patna", "IIT Palakkad", "IIT Tirupati", "IIT Bhilai", "IIT Goa", "IIT Jammu", "IIT Dharwad", "IIT Bhubaneswar", "IIT ISM Dhanbad", "IIT Varanasi", "IIT (ISM) Dhanbad", "IIT (BHU) Varanasi", "IIT (ISM)", "IIT (BHU)", "NIT Trichy", "NIT Surathkal", "NIT Warangal", "NIT Rourkela", "NIT Calicut", "NIT Kurukshetra", "NIT Durgapur", "NIT Jaipur", "NIT Allahabad", "NIT Nagpur", "NIT Silchar", "NIT Surat", "NIT Bhopal", "NIT Jalandhar", "NIT Patna", "NIT Raipur", "NIT Goa", "NIT Delhi", "NIT Meghalaya", "NIT Arunachal Pradesh", "NIT Agartala", "NIT Puducherry", "NIT Manipur", "NIT Mizoram", "NIT Sikkim", "NIT Hamirpur", "NIT Uttarakhand", "NIT Andhra Pradesh", "BITS Pilani", "BITS Goa", "BITS Hyderabad", "VIT Vellore", "VIT Chennai", "SRM Chennai", "SRM Delhi NCR", "SRM Amaravati",
   Pune & Maharashtra Major Colleges
  "COEP Pune", "COEP Technological University", "VIT Pune", "Vishwakarma Institute of Technology Pune", "MIT WPU Pune", "MIT World Peace University Pune", "Symbiosis Institute of Technology Pune", "Symbiosis International University Pune", "SPPU Pune", "Savitribai Phule Pune University", "DY Patil College Pune", "Dr. DY Patil Institute of Technology Pune", "SIT Pune", "Sinhgad Institute of Technology Pune", "Sinhgad College of Engineering Pune", "Bharati Vidyapeeth Pune", "Bharati Vidyapeeth College of Engineering Pune", "PICT Pune", "Pune Institute of Computer Technology", "VIIT Pune", "Vishwakarma Institute of Information Technology Pune", "PCCOE Pune", "Pimpri Chinchwad College of Engineering Pune", "JSPM Pune", "JSPM's Rajarshi Shahu College of Engineering Pune", "JSPM's Imperial College of Engineering Pune", "AIT Pune", "Army Institute of Technology Pune", "Cummins College Pune", "Cummins College of Engineering for Women Pune", "Modern College Pune", "Fergusson College Pune", "Nowrosjee Wadia College Pune", "MES Garware College Pune", "Indira College of Engineering Pune", "AISSMS Pune", "AISSMS College of Engineering Pune", "Marathwada Mitra Mandal's College of Engineering Pune", "Sinhgad Academy of Engineering Pune", "Sinhgad College of Architecture Pune", "DYP Akurdi Pune", "DYP Ambi Pune", "DYP Lohegaon Pune", "DY Patil Navi Mumbai", "DY Patil Kolhapur", "Walchand College of Engineering Sangli", "Government College of Engineering Karad", "Government College of Engineering Amravati", "VJTI Mumbai", "Veermata Jijabai Technological Institute Mumbai", "ICT Mumbai", "Institute of Chemical Technology Mumbai", "KJ Somaiya College Mumbai", "KJ Somaiya College of Engineering Mumbai", "Thadomal Shahani Engineering College Mumbai", "Fr. Conceicao Rodrigues College of Engineering Mumbai", "Sardar Patel College of Engineering Mumbai", "Terna Engineering College Navi Mumbai", "Other Maharashtra College",
   South & North India
  "Manipal University", "Delhi University", "Mumbai University", "Jadavpur University", "Anna University", "Osmania University", "Jamia Millia Islamia", "JNU Delhi", "AMU Aligarh", "IIIT Hyderabad", "IIIT Delhi", "IIIT Bangalore", "IIIT Allahabad", "IIITDM Jabalpur", "IIITDM Kancheepuram", "IIIT Bhubaneswar", "IIIT Vadodara", "IIIT Kota", "IIIT Guwahati", "IIIT Lucknow", "IIIT Kalyani", "IIIT Una", "IIIT Sonepat", "IIIT Dharwad", "IIIT Tiruchirappalli", "IIIT Nagpur", "IIIT Pune", "IISc Bangalore", "IISER Pune", "IISER Kolkata", "IISER Mohali", "IISER Bhopal", "IISER Thiruvananthapuram", "IISER Tirupati", "IISER Berhampur", "IISER TVM", "IISER TVM", "Other"
];

Helper: Smart search for college names
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

DOM Elements
const categorySelect = document.getElementById('category');
const dynamicFields = document.getElementById('dynamicSellFields');
const sellForm = document.getElementById('sellForm');

let currentLocation = null;
let mapLocation = null;
Global variable to make the openMapModal function accessible
window.openMapModal = null;

Removed redundant event listener for 'selectOnMapBtn' as no such static button exists in the HTML.
The Select on Map button is rendered dynamically in each form and event is bound after rendering.
See renderRegularProductForm and renderRoomForm for correct event binding.

categorySelect.addEventListener('change', handleCategoryChange);
sellForm.addEventListener('submit', handleSellSubmit);

document.addEventListener('DOMContentLoaded', async () => {
  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
  } catch {}
  if (!currentUser || !currentUser.id) {
    Try to get from Supabase session
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session && session.user) {
      Set currentUser in localStorage for future checks
      currentUser = { id: session.user.id, email: session.user.email, ...session.user.user_metadata };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      Show dialog and prevent further actions
      showLoginRequiredDialog();
      return;
    }
  }
  Setup map modal first so it's available when category changes
  setupMapModal();
  handleCategoryChange();
});

function showLoginRequiredDialog() {
  Create modal overlay
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

  Create dialog box
  const dialog = document.createElement('div');
  dialog.style.background = '#fff';
  dialog.style.padding = '32px 24px';
  dialog.style.borderRadius = '12px';
  dialog.style.boxShadow = '0 4px 24px rgba(0,0,0,0.15)';
  dialog.style.textAlign = 'center';
  dialog.innerHTML = `<div style="font-size:1.2rem;margin-bottom:12px;">You must be logged in to sell.</div><button id="closeLoginDialog" style="padding:8px 20px;background:#2a3d56;color:#fff;border:none;border-radius:6px;font-size:1rem;cursor:pointer;">Close</button>`;

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
  Uses datalist for search
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
  document.getElementById('selectOnMap').onclick = openMapModal || function() { alert('Map modal not available.'); };
  document.getElementById('roomImages').onchange = (e) => limitFiles(e, 10);
}

function renderNotesForm() {
  dynamicFields.innerHTML = `
    ${renderCollegeSelector()}
    <label for="title">Notes Title</label>
    <input type="text" id="title" name="title" required maxlength="100">
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

--- MAP MODAL WITH LEAFLET ---
function setupMapModal() {
  const modal = document.getElementById('sell-map-modal');
  const closeModal = document.getElementById('closeMapModal');
  const confirmBtn = document.getElementById('confirmMapLocation');
  let leafletMap = null;
  let leafletMarker = null;
  let geocoder = null;

  if (!modal) {
    return;
  }
  
  Load Leaflet CSS and JS if not already loaded
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

  --- Map Modal Logic ---
  function openMap() {
    Make sure Leaflet is loaded
    if (!window.L) {
      setTimeout(openMap, 500);
      return;
    }
    
    Remove any existing map instance to avoid blank map issues
    if (leafletMap) {
      leafletMap.remove();
      leafletMap = null;
    }
    
    try {
      leafletMap = L.map('mapContainer').setView([19.7515, 75.7139], 6);  Center on Maharashtra by default
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors'
      }).addTo(leafletMap);
      
      Add geocoder if available
      if (L.Control.Geocoder) {
        geocoder = L.Control.Geocoder.nominatim();
        L.Control.geocoder({
          geocoder: geocoder,
          defaultMarkGeocode: false
        })
        .on('markgeocode', function(e) {
          const latlng = e.geocode.center;
          if (leafletMarker) leafletMap.removeLayer(leafletMarker);
          leafletMarker = L.marker(latlng).addTo(leafletMap);
          mapLocation = {
            lat: latlng.lat,
            lon: latlng.lng,
            name: e.geocode.name
          };
          leafletMap.setView(latlng, 15);
        })
        .addTo(leafletMap);
      }
      
      Click handler for map
      leafletMap.on('click', function(e) {
        if (leafletMarker) leafletMap.removeLayer(leafletMarker);
        leafletMarker = L.marker(e.latlng).addTo(leafletMap);
        mapLocation = {
          lat: e.latlng.lat,
          lon: e.latlng.lng,
          name: `Lat: ${e.latlng.lat.toFixed(4)}, Lon: ${e.latlng.lng.toFixed(4)}`
        };
        Try reverse geocoding
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
          .then(resp => resp.json())
          .then(data => {
            if (data && data.display_name) {
              mapLocation.name = data.display_name;
            }
          })
          .catch(err => {});
      });
      
      --- Search bar logic ---
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
      
      Handle Enter key in search input
      document.getElementById('mapSearchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('mapSearchBtn').click();
        }
      });
    } catch (err) {}
  }

  Define global openMapModal function
  window.openMapModal = function() {
    modal.style.display = 'block';
    Ensure modal covers the viewport as a true overlay
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.55)';
    modal.style.zIndex = '9999';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    Style the inner modal-content as a centered dialog
    var modalContent = modal.querySelector('.modal-content');
    if(modalContent) {
      modalContent.style.width = '350px';
      modalContent.style.maxWidth = '95vw';
      modalContent.style.margin = '0 auto';
      modalContent.style.padding = '18px 10px 16px 10px';
      modalContent.style.borderRadius = '13px';
      modalContent.style.boxShadow = '0 8px 32px rgba(44,62,80,0.15)';
      modalContent.style.background = '#fff';
      modalContent.style.position = 'relative';
      modalContent.style.zIndex = '10000';
      modalContent.style.display = 'block';
    }
    setTimeout(openMap, 300);  Delay to ensure modal is visible and container has size
  };
}

--- Robust imgbb Upload Function ---
async function uploadImageToImgbb(file) {
  Fetch the imgbb API key from window.env (populated via server-side injection)
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

--- Image and PDF Upload Helpers ---
async function uploadPdfToSupabase(file) {
  Uses window.supabaseClient from env.js setup
  const supabase = window.supabaseClient;
  if (!supabase) {
    alert('Supabase client is not initialized. Check your script order and config.');
    throw new Error('Supabase client not initialized');
  }

  Generate a unique filename
  const fileName = `${Date.now()}_${file.name}`;

  Upload
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

  Get public URL (handle all property names)
  const publicUrlResult = supabase.storage.from('product-pdfs').getPublicUrl(data.path);

  Try all possible property names
  let publicURL = publicUrlResult.data?.publicUrl || publicUrlResult.data?.publicURL;
  if (!publicURL && typeof publicUrlResult.data === 'string') publicURL = publicUrlResult.data;

  if (!publicURL || typeof publicURL !== 'string' || !publicURL.startsWith('https:')) {
    throw new Error('PDF upload failed: No valid public URL returned. Check your Supabase bucket policy and public access settings.');
  }

  return publicURL;
}

--- Form Submission ---
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
      Room/Hostel listing
      payload = {
        college: formData.get('college'),
        roomName: formData.get('roomName'),
        title: formData.get('roomName'),  Ensure title is set for DB
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
      Upload images
      const files = formData.getAll('roomImages');
      for (const file of files) {
        if (file && file.size > 0) imageUrls.push(await uploadImageToImgbb(file));
      }
      payload.images = imageUrls;
      Attach seller_id from Supabase Auth (must match users table id)
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
      Validate seller_id before insert
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
      Submit to backend
      const supabase = window.supabaseClient;
      const { error: roomError } = await supabase
        .from('rooms')
        .insert([payload]);
      if (roomError) throw new Error(roomError.message);
      alert('Room/Hostel listed successfully!');
      sellForm.reset();
      handleCategoryChange();
    } else if (cat === 'notes') {
      Notes listing
      payload = {
        college: formData.get('college'),
        title: formData.get('title'),
        price: formData.get('price'),
        description: formData.get('description'),
      };
      Upload images
      const imgFiles = formData.getAll('notesImages');
      for (const file of imgFiles) {
        if (file && file.size > 0) imageUrls.push(await uploadImageToImgbb(file));
      }
      payload.images = imageUrls;
      Attach seller_id from localStorage (assumes currentUser is stored as JSON with id)
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
      Upload PDF
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
        Defensive: Always set pdfUrl to empty string if no file uploaded
        payload.pdfUrl = '';
      }
      Submit to backend
      const { error: notesError } = await supabase
        .from('notes')
        .insert([payload]);
      if (notesError) throw new Error(notesError.message);
      alert('Notes listed successfully!');
      sellForm.reset();
      handleCategoryChange();
    } else {
      Regular product
      payload = {
        college: formData.get('college'),
        title: formData.get('title'),
        category: cat,
        price: formData.get('price'),
        condition: formData.get('condition'),
        description: formData.get('description'),
        location: formData.get('location') || ''
      };
      Upload images
      const files = formData.getAll('images');
      for (const file of files) {
        if (file && file.size > 0) imageUrls.push(await uploadImageToImgbb(file));
      }
      payload.images = imageUrls;
      Attach seller_id from localStorage (assumes currentUser is stored as JSON with id)
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
      Submit to backend
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
