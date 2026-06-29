
function openSuggestionModal() {

    document.getElementById('suggestion-form').reset();
    

    const container = document.getElementById('sug-items-container');
    const boxes = container.querySelectorAll('.sug-item-box');
    for(let i = 1; i < boxes.length; i++) {
        boxes[i].remove();
    }
    
    toggleModal('company-suggestion-modal', 'company-suggestion-box', true);
}

function closeSuggestionModal() {
    toggleModal('company-suggestion-modal', 'company-suggestion-box', false);
}

function addSuggestionBox() {
    const container = document.getElementById('sug-items-container');
    const newBox = document.createElement('div');
    newBox.className = 'relative group sug-item-box animate-[fadeIn_0.3s_ease-out]';
    newBox.innerHTML = `
        <span class="absolute top-3 left-3 text-brand-400 font-bold"><i class="ph-fill ph-chat-circle-text"></i></span>
        <textarea required rows="2" class="sug-item-input w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all resize-none" placeholder="Nhập chi tiết ý kiến tiếp theo..."></textarea>
        <button type="button" onclick="removeSuggestionBox(this)" class="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors"><i class="ph-bold ph-trash"></i></button>
    `;
    container.appendChild(newBox);
    

    container.parentElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function removeSuggestionBox(btnEl) {
    const container = document.getElementById('sug-items-container');

    if(container.querySelectorAll('.sug-item-box').length > 1) {
        btnEl.closest('.sug-item-box').remove();
    } else {
        alert("Phải có ít nhất 1 ý kiến!");
    }
}

async function submitSuggestion(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-submit-suggestion');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = 'Đang gửi... <i class="ph-bold ph-spinner animate-spin"></i>';
    btn.disabled = true;


    const title = document.getElementById('sug-title').value.trim();
    const solution = document.getElementById('sug-solution').value.trim();
    

    const feedbackInputs = document.querySelectorAll('.sug-item-input');
    let feedbacksArray = [];
    feedbackInputs.forEach((input, index) => {
        if(input.value.trim() !== '') {
            feedbacksArray.push(`Ý ${index + 1}: ` + input.value.trim());
        }
    });

    const payload = {
        name: window.currentUser ? window.currentUser.full_name : "Nhân viên ẩn danh",
        title: title,
        feedbacks: feedbacksArray,
        solution: solution
    };


    const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyZubXqhi5m_VIkDeUE-cEfm9M-oD5VUD9ckbq4SSXfgOtcSPFqJpxtQMCm7XcBtwtFWw/exec";

    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', 
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if(result.status === "success") {
            btn.innerHTML = '<i class="ph-bold ph-check-circle"></i> Đã gửi thành công!';
            btn.className = 'px-6 py-2.5 text-sm font-bold text-white bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-2';
            
            setTimeout(() => {
                closeSuggestionModal();
                btn.innerHTML = originalText;
                btn.className = 'px-6 py-2.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-lg shadow-brand-500/30 transition-all flex items-center gap-2';
                btn.disabled = false;
            }, 2000);
        } else {
            throw new Error("Lỗi từ Google Sheets");
        }

    } catch (error) {
        alert("Lỗi kết nối. Vui lòng thử lại sau!");
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function getNoteStorageKey() {
    if (!window.currentUser || !window.currentUser.id) return null;
    return `tqc_notes_${window.currentUser.id}`;
}

async function initQuickNotes() {
    if (!window.currentUser || !window.currentUser.id) {
        setTimeout(initQuickNotes, 500);
        return;
    }

    try {

        const { data, error } = await window.supabaseClient
            .from('user_notes')
            .select('notes_data')
            .eq('user_id', window.currentUser.id)
            .single();

        if (data && data.notes_data) {
            window.userNotesData = data.notes_data;
        } else {

            window.userNotesData = {
                activeCategoryId: 'cat_default',
                categories: [
                    { id: 'cat_default', name: 'Công việc chung', tasks: [] }
                ]
            };
        }
    } catch (err) {
        console.log("Lỗi tải ghi chú hoặc chưa có dữ liệu, dùng mặc định.");
        window.userNotesData = {
            activeCategoryId: 'cat_default',
            categories: [
                { id: 'cat_default', name: 'Công việc chung', tasks: [] }
            ]
        };
    }

    const noteInput = document.getElementById('quick-note-input');
    if (noteInput) {
        const newNoteInput = noteInput.cloneNode(true);
        noteInput.parentNode.replaceChild(newNoteInput, noteInput);
        
        newNoteInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); 
                addQuickNote();
            }
        });
    }

    // Hiển thị ra màn hình
    updateCategoryDropdown();
}

function updateCategoryDropdown() {
    const selectEl = document.getElementById('note-category-select');
    if (!selectEl) return;

    selectEl.innerHTML = window.userNotesData.categories.map(cat => 
        `<option value="${cat.id}" ${cat.id === window.userNotesData.activeCategoryId ? 'selected' : ''}> ● ${cat.name}</option>`
    ).join('');

    renderQuickNotes();
}

function changeNoteCategory() {
    const selectEl = document.getElementById('note-category-select');
    window.userNotesData.activeCategoryId = selectEl.value;
    saveNotesData();
    renderQuickNotes();
}

function createNewNoteCategory() {
    document.getElementById('new-category-name').value = '';
    toggleModal('create-category-modal', 'create-category-box', true);
    
    setTimeout(() => {
        const input = document.getElementById('new-category-name');
        if(input) input.focus();
    }, 100);
}

function closeCreateCategoryModal() {
    toggleModal('create-category-modal', 'create-category-box', false);
}

function submitNewCategory() {
    const input = document.getElementById('new-category-name');
    const catName = input.value.trim();
    
    if (!catName) {
        input.classList.add('animate-pulse', 'border-red-400');
        setTimeout(() => input.classList.remove('animate-pulse', 'border-red-400'), 1000);
        return;
    }

    const newId = 'cat_' + Date.now();
    window.userNotesData.categories.push({
        id: newId,
        name: catName,
        tasks: []
    });
    
    window.userNotesData.activeCategoryId = newId;
    saveNotesData();
    updateCategoryDropdown();
    closeCreateCategoryModal();
}


function deleteCurrentCategory() {
    if (window.userNotesData.categories.length <= 1) {
        alert("Bạn phải giữ lại ít nhất 1 nhóm công việc!");
        return;
    }

    toggleModal('delete-category-modal', 'delete-category-box', true);
}

function closeDeleteCategoryModal() {
    toggleModal('delete-category-modal', 'delete-category-box', false);
}

function submitDeleteCategory() {
    const activeId = window.userNotesData.activeCategoryId;
    window.userNotesData.categories = window.userNotesData.categories.filter(cat => cat.id !== activeId);
    
    window.userNotesData.activeCategoryId = window.userNotesData.categories[0].id;
    saveNotesData();
    updateCategoryDropdown();
    closeDeleteCategoryModal();
}

function getActiveCategory() {
    return window.userNotesData.categories.find(cat => cat.id === window.userNotesData.activeCategoryId);
}

function addQuickNote() {
    const input = document.getElementById('quick-note-input');
    const text = input.value.trim();
    if (!text) return;

    const activeCat = getActiveCategory();
    if (!activeCat) return;

    const now = new Date();
    activeCat.tasks.unshift({
        text: text,
        date: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate()}/${now.getMonth()+1}`,
        isDone: false,
        isImportant: false
    });

    saveNotesData();
    renderQuickNotes();
    input.value = '';
}

function renderQuickNotes() {
    const listEl = document.getElementById('quick-note-list');
    const countEl = document.getElementById('note-count');
    if (!listEl) return;

    const activeCat = getActiveCategory();
    if (!activeCat) return;

    countEl.innerText = activeCat.tasks.length;

    if (activeCat.tasks.length === 0) {
        listEl.innerHTML = `<div class="text-center py-6 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200"><i class="ph-thin ph-leaf text-3xl mb-1"></i><p class="text-[11px] font-medium">Chưa có công việc nào trong nhóm này</p></div>`;
        return;
    }

    listEl.innerHTML = activeCat.tasks.map((task, index) => {
        // Xử lý logic hiển thị màu sắc hiện đại
        const isImp = task.isImportant;
        const isDone = task.isDone;
        
        const bgClass = isDone ? 'bg-slate-50 opacity-60' : (isImp ? 'bg-rose-50 border-rose-200 shadow-md' : 'bg-white hover:bg-slate-50 border-slate-100');
        const textClass = isDone ? 'line-through text-slate-400' : (isImp ? 'text-rose-700 font-bold' : 'text-slate-700 font-medium');
        const dateClass = isImp && !isDone ? 'text-rose-400' : 'text-slate-400';
        const starColor = isImp ? 'text-rose-500 hover:bg-rose-100' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50';

        return `
        <div class="group flex items-start gap-2 p-2.5 ${bgClass} border rounded-xl transition-all duration-300 shadow-sm relative overflow-hidden">
            ${isImp && !isDone ? '<div class="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 rounded-l-xl"></div>' : ''}
            
            <input type="checkbox" ${isDone ? 'checked' : ''} onchange="toggleNoteStatus(${index})" class="mt-1 w-4 h-4 text-blue-500 rounded border-slate-300 cursor-pointer focus:ring-blue-500 relative z-10 ml-1">
            
            <div class="flex-1 min-w-0 relative z-10">
                <p class="text-sm break-words leading-snug transition-colors ${textClass}">${task.text}</p>
                <p class="text-[9px] ${dateClass} mt-1 uppercase tracking-wider font-bold transition-colors">${task.date}</p>
            </div>
            
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative z-10 ${isImp ? 'opacity-100' : ''}">
                <button onclick="toggleNoteImportance(${index})" class="p-1.5 cursor-pointer rounded-md transition-colors ${starColor}" title="Đánh dấu quan trọng">
                    <i class="${isImp ? 'ph-fill' : 'ph-bold'} ph-star text-base"></i>
                </button>
                <button onclick="deleteNote(${index})" class="text-slate-300 hover:text-red-500 p-1.5 cursor-pointer bg-transparent rounded-md hover:bg-red-50 transition-colors" title="Xóa">
                    <i class="ph-bold ph-trash text-base"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');
}

function toggleNoteStatus(taskIndex) { 
    const activeCat = getActiveCategory();
    activeCat.tasks[taskIndex].isDone = !activeCat.tasks[taskIndex].isDone; 
    saveNotesData();
    renderQuickNotes(); 
}

function toggleNoteImportance(taskIndex) {
    const activeCat = getActiveCategory();
    activeCat.tasks[taskIndex].isImportant = !activeCat.tasks[taskIndex].isImportant;
    saveNotesData();
    renderQuickNotes();
}

function deleteNote(taskIndex) { 
    const activeCat = getActiveCategory();
    activeCat.tasks.splice(taskIndex, 1); 
    saveNotesData();
    renderQuickNotes(); 
}

async function saveNotesData() { 
    if (!window.currentUser || !window.currentUser.id) return;
    
    try {
        const { error } = await window.supabaseClient
            .from('user_notes')
            .upsert({ 
                user_id: window.currentUser.id, 
                notes_data: window.userNotesData,
                updated_at: new Date().toISOString()
            });
            
        if (error) throw error;
    } catch (err) {
        console.error("Lỗi đồng bộ ghi chú lên cloud:", err.message);
    }
}