// Infinite scroll for similar notes
let similarNotesPage = 0;
let similarNotesLoading = false;
let similarNotesDone = false;
let loadedSimilarNoteIds = new Set();
async function fetchSimilarNotes(note, page = 0, pageSize = 8) {
    const supabase = window.supabaseClient;
    if (!supabase) return [];
    let query = supabase.from('notes').select('*').neq('id', note.id);
    if (note.college) query = query.eq('college', note.college);
    const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
    if (error || !data) return [];
    return data;
}
async function loadMoreSimilarNotes(note) {
    if (similarNotesLoading || similarNotesDone) return;
    similarNotesLoading = true;
    const notes = await fetchSimilarNotes(note, similarNotesPage);
    if (!notes.length) {
        similarNotesDone = true;
        return;
    }
    const container = document.getElementById('similarNotes');
    notes.forEach(nt => {
        if (loadedSimilarNoteIds.has(nt.id)) return;
        loadedSimilarNoteIds.add(nt.id);
        const card = document.createElement('div');
        card.className = 'similar-notes-card';
        card.innerHTML = `
            <img src="${(nt.images && nt.images[0]) || nt.image || 'https://via.placeholder.com/120x120?text=No+Image'}" alt="Similar Note" />
            <div class="similar-notes-title">${nt.title || nt.name || 'Untitled'}</div>
            <div class="similar-notes-price">₹${nt.price || 'N/A'}</div>
            <a href="notes_interface.html?id=${nt.id}" class="similar-notes-link">View Details</a>
        `;
        container.appendChild(card);
    });
    similarNotesPage++;
    similarNotesLoading = false;
}
function setupSimilarNotesInfiniteScroll(note) {
    const container = document.getElementById('similarNotes');
    if (!container) return;
    container.onscroll = function() {
        if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 50) {
            loadMoreSimilarNotes(note);
        }
    };
    // Initial load
    loadMoreSimilarNotes(note);
}
window.setupSimilarNotesInfiniteScroll = setupSimilarNotesInfiniteScroll;
