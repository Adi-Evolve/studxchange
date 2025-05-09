// sell.js - Handles dynamic sell form for StudXchange
// Dependencies: db-config.js, firebase-config.js, style.css

// List of Indian colleges for autocomplete
const colleges = [
  "All", "IIT Bombay", "IIT Delhi", "IIT Kanpur", "IIT Kharagpur", "IIT Madras", "IIT Roorkee", "IIT Guwahati", "IIT Hyderabad", "IIT BHU", "IIT Dhanbad", "IIT Indore", "IIT Mandi", "IIT Ropar", "IIT Gandhinagar", "IIT Jodhpur", "IIT Patna", "IIT Palakkad", "IIT Tirupati", "IIT Bhilai", "IIT Goa", "IIT Jammu", "IIT Dharwad", "IIT Bhubaneswar", "IIT ISM Dhanbad", "IIT Varanasi", "IIT (ISM) Dhanbad", "IIT (BHU) Varanasi", "IIT (ISM)", "IIT (BHU)", "NIT Trichy", "NIT Surathkal", "NIT Warangal", "NIT Rourkela", "NIT Calicut", "NIT Kurukshetra", "NIT Durgapur", "NIT Jaipur", "NIT Allahabad", "NIT Nagpur", "NIT Silchar", "NIT Surat", "NIT Bhopal", "NIT Jalandhar", "NIT Patna", "NIT Raipur", "NIT Goa", "NIT Delhi", "NIT Meghalaya", "NIT Arunachal Pradesh", "NIT Agartala", "NIT Puducherry", "NIT Manipur", "NIT Mizoram", "NIT Sikkim", "NIT Hamirpur", "NIT Uttarakhand", "NIT Andhra Pradesh", "BITS Pilani", "BITS Goa", "BITS Hyderabad", "VIT Vellore", "VIT Chennai", "SRM Chennai", "SRM Delhi NCR", "SRM Amaravati",
  // Pune & Maharashtra Major Colleges
  "COEP Pune", "COEP Technological University", "VIT Pune", "Vishwakarma Institute of Technology Pune", "MIT WPU Pune", "MIT World Peace University Pune", "Symbiosis Institute of Technology Pune", "Symbiosis International University Pune", "SPPU Pune", "Savitribai Phule Pune University", "DY Patil College Pune", "Dr. DY Patil Institute of Technology Pune", "SIT Pune", "Sinhgad Institute of Technology Pune", "Sinhgad College of Engineering Pune", "Bharati Vidyapeeth Pune", "Bharati Vidyapeeth College of Engineering Pune", "PICT Pune", "Pune Institute of Computer Technology", "VIIT Pune", "Vishwakarma Institute of Information Technology Pune", "PCCOE Pune", "Pimpri Chinchwad College of Engineering Pune", "JSPM Pune", "JSPM's Rajarshi Shahu College of Engineering Pune", "JSPM's Imperial College of Engineering Pune", "AIT Pune", "Army Institute of Technology Pune", "Cummins College Pune", "Cummins College of Engineering for Women Pune", "Modern College Pune", "Fergusson College Pune", "Nowrosjee Wadia College Pune", "MES Garware College Pune", "Indira College of Engineering Pune", "AISSMS Pune", "AISSMS College of Engineering Pune", "Marathwada Mitra Mandal's College of Engineering Pune", "Sinhgad Academy of Engineering Pune", "Sinhgad College of Architecture Pune", "DYP Akurdi Pune", "DYP Ambi Pune", "DYP Lohegaon Pune", "DY Patil Navi Mumbai", "DY Patil Kolhapur", "Walchand College of Engineering Sangli", "Government College of Engineering Karad", "Government College of Engineering Amravati", "VJTI Mumbai", "Veermata Jijabai Technological Institute Mumbai", "ICT Mumbai", "Institute of Chemical Technology Mumbai", "KJ Somaiya College Mumbai", "KJ Somaiya College of Engineering Mumbai", "Thadomal Shahani Engineering College Mumbai", "Fr. Conceicao Rodrigues College of Engineering Mumbai", "Sardar Patel College of Engineering Mumbai", "Terna Engineering College Navi Mumbai", "Other Maharashtra College",
  // South & North India
  "Manipal University", "Delhi University", "Mumbai University", "Jadavpur University", "Anna University", "Osmania University", "Jamia Millia Islamia", "JNU Delhi", "AMU Aligarh", "IIIT Hyderabad", "IIIT Delhi", "IIIT Bangalore", "IIIT Allahabad", "IIITDM Jabalpur", "IIITDM Kancheepuram", "IIIT Bhubaneswar", "IIIT Vadodara", "IIIT Kota", "IIIT Guwahati", "IIIT Lucknow", "IIIT Kalyani", "IIIT Una", "IIIT Sonepat", "IIIT Dharwad", "IIIT Tiruchirappalli", "IIIT Nagpur", "IIIT Pune", "IISc Bangalore", "IISER Pune", "IISER Kolkata", "IISER Mohali", "IISER Bhopal", "IISER Thiruvananthapuram", "IISER Tirupati", "IISER Berhampur", "IISER TVM", "IISER TVM", "Other"
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

categorySelect.addEventListener('change', handleCategoryChange);
sellForm.addEventListener('submit', handleSellSubmit);

document.addEventListener('DOMContentLoaded', () => {
  handleCategoryChange();
  setupMapModal();
});

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
    <div class="location-btns">
      <button type="button" id="useCurrentLocation" class="btn-secondary">Use Current Location</button>
      <button type="button" id="selectOnMap" class="btn-secondary">Select on Map</button>
    </div>
    <input type="hidden" id="location" name="location">
  `;
  document.getElementById('useCurrentLocation').onclick = getCurrentLocation;
  document.getElementById('selectOnMap').onclick = openMapModal;
  document.getElementById('images').onchange = (e) => limitFiles(e, 5);
}

function renderRoomForm() {
  dynamicFields.innerHTML = `
    ${renderCollegeSelector()}
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
    <div class="location-btns">
      <button type="button" id="useCurrentLocation" class="btn-secondary">Current Location</button>
      <button type="button" id="selectOnMap" class="btn-secondary">Select on Map</button>
    </div>
    <input type="hidden" id="location" name="location">
  `;
  document.getElementById('useCurrentLocation').onclick = getCurrentLocation;
  document.getElementById('selectOnMap').onclick = openMapModal;
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

async function getCurrentLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      currentLocation = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
      // Use reverse geocoding to get location name (improved logic)
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLocation.lat}&lon=${currentLocation.lon}`);
        const data = await response.json();
        currentLocation.name = data.display_name
          || data.address.city
          || data.address.town
          || data.address.village
          || data.address.suburb
          || data.address.state
          || data.address.county
          || `Lat: ${currentLocation.lat.toFixed(4)}, Lon: ${currentLocation.lon.toFixed(4)}`;
      } catch (err) {
        currentLocation.name = `Lat: ${currentLocation.lat.toFixed(4)}, Lon: ${currentLocation.lon.toFixed(4)}`;
      }
      // Always store as string
      document.getElementById('location').value = JSON.stringify(currentLocation);
      alert('Location set: ' + currentLocation.name);
    },
    (error) => {
      alert('Unable to get location.');
    }
  );
}

// --- MAP MODAL WITH LEAFLET ---
function setupMapModal() {
  const modal = document.getElementById('sell-map-modal');
  const closeModal = document.getElementById('closeMapModal');
  const confirmBtn = document.getElementById('confirmMapLocation');
  let leafletMap = null;
  let leafletMarker = null;
  let geocoder = null;

  if (!modal) return;
  closeModal.onclick = () => { modal.style.display = 'none'; };
  confirmBtn.onclick = () => {
    if (mapLocation) {
      // Always store as string
      document.getElementById('location').value = JSON.stringify(mapLocation);
      modal.style.display = 'none';
      alert('Location set from map!');
    } else {
      alert('Please select a location on the map.');
    }
  };

  // --- Map Modal Logic ---
  function openMap() {
    // Remove any existing map instance to avoid blank map issues
    if (leafletMap) {
      leafletMap.remove();
      leafletMap = null;
    }
    leafletMap = L.map('mapContainer').setView([19.7515, 75.7139], 6); // Center on Maharashtra by default
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: ' OpenStreetMap contributors'
    }).addTo(leafletMap);
    geocoder = L.Control.geocoder({ defaultMarkGeocode: false })
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
    leafletMap.on('click', function(e) {
      if (leafletMarker) leafletMap.removeLayer(leafletMarker);
      leafletMarker = L.marker(e.latlng).addTo(leafletMap);
      mapLocation = {
        lat: e.latlng.lat,
        lon: e.latlng.lng,
        name: `Lat: ${e.latlng.lat.toFixed(4)}, Lon: ${e.latlng.lng.toFixed(4)}`
      };
      // Try reverse geocoding
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
        .then(resp => resp.json())
        .then(data => {
          if (data && data.display_name) {
            mapLocation.name = data.display_name;
          }
        });
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
        .catch(() => alert('Error searching for place.'));
    };
  }

  // Open map when modal is displayed
  const origOpen = window.openMapModal;
  window.openMapModal = function() {
    modal.style.display = 'block';
    setTimeout(openMap, 100); // Delay to ensure modal is visible and container has size
    if (origOpen) origOpen();
  };
}

// --- Robust imgbb Upload Function ---
async function uploadImageToImgbb(file) {
  // Fetch the imgbb API key from window.env (populated via server-side injection)
  const apiKey = window.env && window.env.IMGBB_API_KEY ? window.env.IMGBB_API_KEY : undefined;
  console.log('[imgbb] Using API Key:', apiKey);
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
      console.error('[imgbb] Failed to parse JSON:', jsonErr);
      throw new Error('imgbb upload failed: Invalid JSON response');
    }
    if (!response.ok) {
      console.error('[imgbb] upload failed:', data);
      alert('Image upload failed: ' + (data.error?.message || response.statusText));
      throw new Error(data.error?.message || 'imgbb upload failed');
    }
    if (!data?.data?.url) {
      console.error('[imgbb] No image URL returned:', data);
      alert('Image upload failed: No image URL returned');
      throw new Error('imgbb upload failed: No image URL returned');
    }
    console.log('[imgbb] Image uploaded successfully:', data.data.url);
    return data.data.url;
  } catch (err) {
    console.error('[imgbb] upload error:', err);
    alert('Image upload failed: ' + err.message);
    throw err;
  }
}

// --- Image and PDF Upload Helpers ---
async function uploadPdfToSupabase(file) {
  // Uses window.supabaseClient from firebase-config.js
  const supabase = window.supabaseClient;
  if (!supabase) {
    alert('Supabase client is not initialized. Check your script order and config.');
    throw new Error('Supabase client not initialized');
  }

  // Generate a unique filename
  const fileName = `${Date.now()}_${file.name}`;

  // Upload
  let uploadResponse;
  try {
    uploadResponse = await supabase.storage.from('notes').upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
  } catch (uploadErr) {
    throw new Error('PDF upload failed: ' + (uploadErr.message || uploadErr));
  }
  console.log('[Supabase] upload response:', uploadResponse);
  const data = uploadResponse && uploadResponse.data;
  const error = uploadResponse && uploadResponse.error;
  if (error) throw new Error('PDF upload failed: ' + error.message);
  if (!data || !data.path) throw new Error('PDF upload failed: No data/path returned from Supabase.');

  // Get public URL (handle all property names)
  const publicUrlResult = supabase.storage.from('notes').getPublicUrl(data.path);
  console.log('[Supabase] getPublicUrl result:', publicUrlResult);

  // Try all possible property names
  let publicURL = publicUrlResult.data?.publicUrl || publicUrlResult.data?.publicURL;
  if (!publicURL && typeof publicUrlResult.data === 'string') publicURL = publicUrlResult.data;

  if (!publicURL || typeof publicURL !== 'string' || !publicURL.startsWith('http')) {
    throw new Error('PDF upload failed: No valid public URL returned. Check your Supabase bucket policy and public access settings.');
  }

  return publicURL;
}


// --- Form Submission ---
async function handleSellSubmit(e) {
  e.preventDefault();
  const cat = categorySelect.value;
  const formData = new FormData(sellForm);
  let payload = {};
  let imageUrls = [];
  let pdfUrl = '';
  try {
    if (cat === 'rooms_hostels') {
      // Room/Hostel listing
      payload = {
        college: formData.get('college'),
        roomType: formData.get('roomType'),
        deposit: formData.get('deposit'),
        description: formData.get('description'),
        distance: formData.get('distance'),
        occupancy: formData.get('occupancy'),
        ownerName: formData.get('ownerName'),
        contact1: formData.get('contact1'),
        contact2: formData.get('contact2'),
        amenities: Array.from(sellForm.querySelectorAll('input[name="amenities"]:checked')).map(cb => cb.value),
        messType: formData.get('messType'),
        location: formData.get('location') ? JSON.parse(formData.get('location')) : null
      };
      // Upload images
      const files = formData.getAll('roomImages');
      for (const file of files) {
        if (file && file.size > 0) imageUrls.push(await uploadImageToImgbb(file));
      }
      payload.images = imageUrls;
      // Submit to backend
      await apiRequest(API_ENDPOINTS.ADD_ROOM, 'POST', payload);
      alert('Room/Hostel listed successfully!');
      sellForm.reset();
      handleCategoryChange();
    } else if (cat === 'notes') {
      // Notes listing
      payload = {
        college: formData.get('college'),
        title: formData.get('title'),
        price: formData.get('price'),
        description: formData.get('description'),
      };
      // Upload images
      const imgFiles = formData.getAll('notesImages');
      for (const file of imgFiles) {
        if (file && file.size > 0) imageUrls.push(await uploadImageToImgbb(file));
      }
      payload.images = imageUrls;
      // Upload PDF
      const pdfFile = formData.get('pdf');
      if (pdfFile && pdfFile.size > 0) {
        if (pdfFile.size > window.SUPABASE_MAX_FILE_SIZE) throw new Error('PDF exceeds 100MB limit');
        pdfUrl = await uploadPdfToSupabase(pdfFile);
        // Ensure the pdfUrl is always set and valid
        if (pdfUrl && typeof pdfUrl === 'string' && pdfUrl.startsWith('https://')) {
          payload.pdfUrl = pdfUrl;
        } else {
          alert('PDF upload failed: No valid URL returned');
          throw new Error('PDF upload failed: No valid URL returned');
        }
      } else {
        // Defensive: Always set pdfUrl to empty string if no file uploaded
        payload.pdfUrl = '';
      }
      // Submit to backend
      await apiRequest(API_ENDPOINTS.ADD_NOTES, 'POST', payload);
      alert('Notes listed successfully!');
      sellForm.reset();
      handleCategoryChange();
    } else {
      // Regular product
      payload = {
        college: formData.get('college'),
        title: formData.get('title'),
        category: cat,
        price: formData.get('price'),
        condition: formData.get('condition'),
        description: formData.get('description'),
        location: formData.get('location') ? JSON.parse(formData.get('location')) : null
      };
      // Upload images
      const files = formData.getAll('images');
      for (const file of files) {
        if (file && file.size > 0) imageUrls.push(await uploadImageToImgbb(file));
      }
      payload.images = imageUrls;
      // Submit to backend
      await apiRequest(API_ENDPOINTS.ADD_PRODUCT, 'POST', payload);
      alert('Product listed successfully!');
      sellForm.reset();
      handleCategoryChange();
    }
  } catch (err) {
    alert('Error: ' + err.message);
    console.error(err);
  }
}
