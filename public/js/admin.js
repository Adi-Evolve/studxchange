// Admin Portal Logic for Studxchange
// Requires: Supabase client in db-config.js

const ADMIN_USER = 'adi_inamdar05';
const ADMIN_PASS = 'Saimansays@1';

const root = document.getElementById('admin-root');
let session = false;
let currentType = 'product';
let allItems = [];
let featuredItems = [];
let auditLog = [];

// Ensure supabase is always defined and points to window.supabaseClient
if (typeof window !== 'undefined' && window.supabaseClient) {
    window.supabase = window.supabaseClient;
}
const supabase = window.supabaseClient;

// Wait for Supabase client initialization before running admin logic
function waitForSupabaseClient() {
    return new Promise(resolve => {
        if (window.supabaseClient && window.supabaseClient.auth) return resolve(window.supabaseClient);
        const check = () => {
            if (window.supabaseClient && window.supabaseClient.auth) return resolve(window.supabaseClient);
            setTimeout(check, 50);
        };
        check();
    });
}

function renderLogin() {
    root.innerHTML = `
        <div class="admin-login">
            <h3 class="mb-3">Admin Login</h3>
            <div class="mb-3">
                <input id="admin-email" class="form-control" placeholder="Email" autocomplete="username" />
            </div>
            <div class="mb-3">
                <input id="admin-password" type="password" class="form-control" placeholder="Password" autocomplete="current-password" />
            </div>
            <button class="btn btn-primary w-100" onclick="adminLogin()">Login</button>
            <div id="admin-login-error" class="text-danger mt-2" style="display:none;"></div>
        </div>
    `;
}

window.adminLogin = async function() {
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    let { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        document.getElementById('admin-login-error').textContent = error.message;
        document.getElementById('admin-login-error').style.display = 'block';
        return;
    }
    // Check if user is in admins table
    let { data: adminRow, error: adminErr } = await supabase
        .from('admins')
        .select('email')
        .eq('email', email)
        .single();
    if (adminErr || !adminRow) {
        document.getElementById('admin-login-error').textContent = 'Not an authorized admin.';
        document.getElementById('admin-login-error').style.display = 'block';
        await supabase.auth.signOut();
        return;
    }
    session = true;
    renderAdminPanel();
};

function renderAdminPanel() {
    root.innerHTML = `
        <button class="btn btn-outline-danger logout-btn" onclick="adminLogout()">Logout</button>
        <div class="admin-panel">
            <h2 class="mb-4">Admin Portal</h2>
            <div class="mb-3">
                <button class="btn btn-secondary tab-btn" onclick="switchType('product')" id="tab-product">Products</button>
                <button class="btn btn-secondary tab-btn" onclick="switchType('room')" id="tab-room">Rooms</button>
                <button class="btn btn-secondary tab-btn" onclick="switchType('note')" id="tab-note">Notes</button>
                <button class="btn btn-secondary tab-btn" onclick="switchType('audit')" id="tab-audit">Audit Log</button>
            </div>
            <div id="admin-items-list" class="mb-4"></div>
            <h5>"Also Check" Featured Items</h5>
            <div id="admin-featured-list" class="featured-list mb-3"></div>
            <button class="btn btn-success" onclick="saveFeatured()">Save Featured List</button>
        </div>
        <div id="admin-edit-modal"></div>
    `;
    document.getElementById('tab-' + currentType).classList.add('btn-primary');
    if (currentType === 'audit') {
        fetchAndRenderAuditLog();
    } else {
        fetchAndRenderItems();
    }
}

window.adminLogout = async function() {
    session = false;
    await supabase.auth.signOut();
    renderLogin();
};

window.switchType = function(type) {
    currentType = type;
    renderAdminPanel();
};

async function fetchAndRenderItems() {
    let table = currentType === 'product' ? 'products' : currentType === 'room' ? 'rooms' : 'notes';
    let { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        document.getElementById('admin-items-list').innerHTML = '<div class="text-danger">Failed to fetch items.</div>';
        return;
    }
    allItems = data;
    // Fetch featured items for this type
    let { data: featured, error: ferror } = await supabase
        .from('featured_items')
        .select('*')
        .eq('type', currentType)
        .order('priority', { ascending: true });
    featuredItems = featured || [];
    renderItemsList();
    renderFeaturedList();
}

function renderItemsList() {
    const list = document.getElementById('admin-items-list');
    if (!allItems.length) {
        list.innerHTML = '<div class="text-muted">No items found.</div>';
        return;
    }
    list.innerHTML = allItems.map(item => {
        const isActive = item.active !== false && item.keep !== false;
        const isFeatured = featuredItems.some(f => f.item_id === item.id);
        return `<div class="item-row">
            <span class="item-title">${item.title || item.name || item.product_name || 'Untitled'} <span class="badge bg-${isActive ? 'success' : 'secondary'} ms-2">${isActive ? 'Keep' : 'Not Keep'}</span></span>
            <button class="btn btn-sm btn-${isActive ? 'secondary' : 'success'}" onclick="toggleKeep('${item.id}', ${isActive})">${isActive ? 'Set Not Keep' : 'Set Keep'}</button>
            <input type="checkbox" class="form-check-input ms-3" ${isFeatured ? 'checked' : ''} onchange="toggleFeatured('${item.id}', this.checked)"> <span class="ms-1">Also Check</span>
            <button class="btn btn-sm btn-primary ms-2" onclick="openEditModal('${item.id}')">Edit</button>
        </div>`;
    }).join('');
    // Add modal container if not present
    if (!document.getElementById('admin-edit-modal')) {
        const modalDiv = document.createElement('div');
        modalDiv.id = 'admin-edit-modal';
        document.body.appendChild(modalDiv);
    }
}

window.toggleKeep = async function(id, isActive) {
    let table = currentType === 'product' ? 'products' : currentType === 'room' ? 'rooms' : 'notes';
    let updateObj = { active: !isActive };
    let { error } = await supabase.from(table).update(updateObj).eq('id', id);
    if (!error) {
        fetchAndRenderItems();
    }
};

window.toggleFeatured = function(id, checked) {
    if (checked) {
        if (!featuredItems.some(f => f.item_id === id)) {
            featuredItems.push({ item_id: id, type: currentType, priority: featuredItems.length });
        }
    } else {
        featuredItems = featuredItems.filter(f => f.item_id !== id);
    }
    renderFeaturedList();
};

function renderFeaturedList() {
    const list = document.getElementById('admin-featured-list');
    if (!featuredItems.length) {
        list.innerHTML = '<div class="text-muted">No featured items selected.</div>';
        return;
    }
    // Map to get item details
    let featuredWithDetails = featuredItems.map((f, idx) => {
        let item = allItems.find(i => i.id === f.item_id);
        return { ...f, idx, title: item?.title || item?.name || item?.product_name || 'Untitled', label: f.label || 'Sponsored' };
    });
    list.innerHTML = featuredWithDetails.map((f, i) => `
        <div class="featured-item">
            <span>${f.title}</span>
            <input type="text" class="form-control form-control-sm ms-2" style="width:110px;display:inline-block;" value="${f.label || 'Sponsored'}" onchange="setFeaturedLabel(${i}, this.value)" placeholder="Label" />
            <button class="priority-btn" onclick="moveFeatured(${i}, -1)" ${i === 0 ? 'disabled' : ''}>&uarr;</button>
            <button class="priority-btn" onclick="moveFeatured(${i}, 1)" ${i === featuredWithDetails.length - 1 ? 'disabled' : ''}>&darr;</button>
            <button class="btn btn-sm btn-outline-danger ms-2" onclick="removeFeatured(${i})">Remove</button>
        </div>
    `).join('');
}

window.moveFeatured = function(idx, dir) {
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === featuredItems.length - 1)) return;
    [featuredItems[idx], featuredItems[idx + dir]] = [featuredItems[idx + dir], featuredItems[idx]];
    renderFeaturedList();
};

window.removeFeatured = function(idx) {
    featuredItems.splice(idx, 1);
    renderFeaturedList();
};

window.setFeaturedLabel = function(idx, value) {
    if (featuredItems[idx]) featuredItems[idx].label = value;
};

window.saveFeatured = async function() {
    // Remove all featured for this type, then insert all with new priorities
    let { error: delErr } = await supabase.from('featured_items').delete().eq('type', currentType);
    if (delErr) {
        alert('Failed to update featured items.');
        return;
    }
    // Insert new featured items with priorities and custom labels
    let inserts = featuredItems.map((f, i) => ({ type: currentType, item_id: f.item_id, priority: i, label: f.label || 'Sponsored' }));
    if (inserts.length) {
        let { error: insErr } = await supabase.from('featured_items').insert(inserts);
        if (insErr) {
            alert('Failed to update featured items.');
            return;
        }
    }
    alert('Featured items updated!');
    fetchAndRenderItems();
};

window.openEditModal = function(id) {
    const item = allItems.find(i => i.id === id);
    if (!item) return;
    let fields = Object.keys(item).filter(k => k !== 'id' && k !== 'created_at');
    let formHtml = fields.map(f => {
        let label = f.charAt(0).toUpperCase() + f.slice(1);
        let val = typeof item[f] === 'object' ? JSON.stringify(item[f]) : (item[f] ?? '');
        // Image upload for images field (array or string)
        if (f === 'images') {
            let imgs = [];
            try { imgs = Array.isArray(item[f]) ? item[f] : JSON.parse(item[f]); } catch { imgs = item[f] ? [item[f]] : []; }
            return `<div class="mb-2">
                <label class="form-label">${label}</label>
                <div id="admin-image-preview">${imgs.map(img => `<img src='${img}' style='max-width:60px;max-height:60px;margin:2px;border-radius:6px;'>`).join('')}</div>
                <input type="file" class="form-control mt-2" id="admin-image-upload" accept="image/*" />
                <button type="button" class="btn btn-sm btn-outline-primary mt-2" onclick="uploadAdminImage('${id}')">Upload Image</button>
                <input type="hidden" id="edit-field-${f}" value='${JSON.stringify(imgs)}' />
                <div class="invalid-feedback" id="err-${f}"></div>
            </div>`;
        }
        // Use textarea for description/long text
        if (f.toLowerCase().includes('desc')) {
            return `<div class="mb-2"><label class="form-label">${label}</label><textarea class="form-control" id="edit-field-${f}" rows="3">${val}</textarea><div class="invalid-feedback" id="err-${f}"></div></div>`;
        }
        // Dropdown for category
        if (f === 'category') {
            return `<div class="mb-2"><label class="form-label">${label}</label><select class="form-select" id="edit-field-${f}">
                <option value="product" ${val==='product'?'selected':''}>Product</option>
                <option value="room" ${val==='room'?'selected':''}>Room</option>
                <option value="notes" ${val==='notes'?'selected':''}>Notes</option>
            </select><div class="invalid-feedback" id="err-${f}"></div></div>`;
        }
        // Toggle for booleans
        if (typeof item[f] === 'boolean' || f === 'active' || f === 'keep') {
            return `<div class="mb-2 form-check form-switch"><input class="form-check-input" type="checkbox" id="edit-field-${f}" ${item[f] ? 'checked' : ''}><label class="form-check-label ms-2" for="edit-field-${f}">${label}</label><div class="invalid-feedback" id="err-${f}"></div></div>`;
        }
        // Date picker for date fields
        if (f.toLowerCase().includes('date')) {
            return `<div class="mb-2"><label class="form-label">${label}</label><input type="date" class="form-control" id="edit-field-${f}" value="${val.split('T')[0] || ''}" /><div class="invalid-feedback" id="err-${f}"></div></div>`;
        }
        // Number for price
        if (f.toLowerCase().includes('price')) {
            return `<div class="mb-2"><label class="form-label">${label}</label><input type="number" class="form-control" id="edit-field-${f}" value="${val}" /><div class="invalid-feedback" id="err-${f}"></div></div>`;
        }
        // Email validation
        if (f.toLowerCase().includes('email')) {
            return `<div class="mb-2"><label class="form-label">${label}</label><input type="email" class="form-control" id="edit-field-${f}" value="${val}" /><div class="invalid-feedback" id="err-${f}"></div></div>`;
        }
        // Default: text input
        return `<div class="mb-2"><label class="form-label">${label}</label><input class="form-control" id="edit-field-${f}" value="${val}" /><div class="invalid-feedback" id="err-${f}"></div></div>`;
    }).join('');
    document.getElementById('admin-edit-modal').innerHTML = `
        <div class="modal fade show" id="editModal" tabindex="-1" style="display:block;background:rgba(0,0,0,0.3);">
            <div class="modal-dialog"><div class="modal-content">
                <div class="modal-header"><h5 class="modal-title">Edit Item</h5>
                    <button type="button" class="btn-close" onclick="closeEditModal()"></button>
                </div>
                <div class="modal-body">
                    <form id="admin-edit-form">${formHtml}</form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-danger me-auto" onclick="deleteItem('${item.id}')">Delete</button>
                    <button class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveEditItem('${item.id}')">Save</button>
                </div>
            </div></div>
        </div>
    `;
};

window.closeEditModal = function() {
    document.getElementById('admin-edit-modal').innerHTML = '';
};

window.saveEditItem = async function(id) {
    const item = allItems.find(i => i.id === id);
    if (!item) return;
    let table = currentType === 'product' ? 'products' : currentType === 'room' ? 'rooms' : 'notes';
    let before = { ...item };
    let updateObj = {};
    let valid = true;
    Object.keys(item).forEach(f => {
        if (f === 'id' || f === 'created_at') return;
        let el = document.getElementById('edit-field-' + f);
        let val = el?.value;
        let err = '';
        // Required fields
        if ((f === 'title' || f === 'price' || f === 'category') && (!val || val.trim() === '')) {
            err = 'Required';
            valid = false;
        }
        // Number validation
        if (f.toLowerCase().includes('price') && val && isNaN(Number(val))) {
            err = 'Must be a number';
            valid = false;
        }
        // Email validation
        if (f.toLowerCase().includes('email') && val && !/^\S+@\S+\.\S+$/.test(val)) {
            err = 'Invalid email';
            valid = false;
        }
        // Boolean toggle
        if (el && el.type === 'checkbox') {
            updateObj[f] = el.checked;
        } else if (el && el.type === 'number') {
            updateObj[f] = val ? Number(val) : null;
        } else {
            try {
                updateObj[f] = JSON.parse(val);
            } catch {
                updateObj[f] = val;
            }
        }
        // Show/hide error
        let errDiv = document.getElementById('err-' + f);
        if (errDiv) {
            errDiv.textContent = err;
            el?.classList[err ? 'add' : 'remove']('is-invalid');
        }
    });
    if (!valid) return;
    let { error } = await supabase.from(table).update(updateObj).eq('id', id);
    if (!error) {
        closeEditModal();
        fetchAndRenderItems();
        let after = allItems.find(i => i.id === id);
        logAdminAction('edit', table, id, { before, after });
    } else {
        alert('Failed to update item: ' + error.message);
    }
};

window.deleteItem = async function(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    let table = currentType === 'product' ? 'products' : currentType === 'room' ? 'rooms' : 'notes';
    let { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) {
        closeEditModal();
        fetchAndRenderItems();
        let item = allItems.find(i => i.id === id);
        logAdminAction('delete', table, id, { deleted: item });
    } else {
        alert('Failed to delete item: ' + error.message);
    }
};

window.uploadAdminImage = async function(id) {
    const fileInput = document.getElementById('admin-image-upload');
    if (!fileInput || !fileInput.files.length) return alert('Select an image file first.');
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('image', file);
    // Use ImgBB API (API key from env.js)
    const apiKey = window.env?.IMGBB_API_KEY;
    if (!apiKey) return alert('IMGBB API key not found.');
    try {
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data && data.data && data.data.url) {
            // Add new image to images array
            let imgs = [];
            try { imgs = JSON.parse(document.getElementById('edit-field-images').value); } catch { imgs = []; }
            imgs.push(data.data.url);
            document.getElementById('edit-field-images').value = JSON.stringify(imgs);
            // Update preview
            document.getElementById('admin-image-preview').innerHTML = imgs.map(img => `<img src='${img}' style='max-width:60px;max-height:60px;margin:2px;border-radius:6px;'>`).join('');
            alert('Image uploaded!');
        } else {
            alert('Upload failed.');
        }
    } catch (e) {
        alert('Upload error: ' + e.message);
    }
};

async function fetchAndRenderAuditLog() {
    let { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
    auditLog = data || [];
    renderAuditLog();
}

function renderAuditLog() {
    const list = document.getElementById('admin-items-list');
    if (!auditLog.length) {
        list.innerHTML = '<div class="text-muted">No audit log entries found.</div>';
        return;
    }
    list.innerHTML = `<table class="table table-sm"><thead><tr><th>Time</th><th>Action</th><th>Item Type</th><th>Item ID</th><th>Details</th></tr></thead><tbody>
        ${auditLog.map(log => `<tr><td>${new Date(log.timestamp).toLocaleString()}</td><td>${log.action}</td><td>${log.item_type}</td><td>${log.item_id}</td><td>${log.details || ''}</td></tr>`).join('')}
    </tbody></table>`;
}

async function logAdminAction(action, itemType, itemId, details) {
    await supabase.from('admin_audit_log').insert([
        {
            action,
            item_type: itemType,
            item_id: itemId,
            details: details ? JSON.stringify(details) : '',
            timestamp: new Date().toISOString(),
            admin: 'admin' // You can enhance this to use real admin identity
        }
    ]);
}

async function checkAdminSession() {
    const { data: { session: userSession } } = await supabase.auth.getSession();
    if (!userSession) {
        renderLogin();
        return false;
    }
    // Optionally, check if the email is in the admins table again here
    return true;
}

// On page load:
waitForSupabaseClient().then(() => {
    checkAdminSession().then(isAdmin => {
        if (isAdmin) renderAdminPanel();
    });
});
