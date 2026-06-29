let currentPresentationUrl = '';

document.addEventListener('DOMContentLoaded', () => {
    if (typeof checkAuthSession === 'function') checkAuthSession();
    updateDailyGreeting();
    if (typeof initQuickNotes === 'function') initQuickNotes();
    initCKEditor();
    loadPinnedArticles();
});

async function loadArticles(deptSlug = 'all', title = 'Kiến thức mới xuất bản') {
    updateActiveMenu(deptSlug);
    if (typeof closeMobileNavMenu === 'function') {
        closeMobileNavMenu();
    }
    
    const topWidgets = document.getElementById('dashboard-top-widgets');
    if (topWidgets) {
        if (deptSlug === 'all') {
            topWidgets.style.display = ''; 
        } else {
            topWidgets.style.display = 'none'; 
        }
    }

    document.getElementById('main-title').innerText = title;
    document.getElementById('main-subtitle').innerText = deptSlug === 'all' 
        ? "Tất cả tài liệu, bài viết và tin tức xuất bản."
        : "Hiển thị tài liệu chuyên môn nội bộ";

    document.getElementById('article-list').innerHTML = '<p class="col-span-3 text-center text-slate-500 py-10 animate-pulse">Đang tải dữ liệu...</p>';

    let query = window.supabaseClient.from('articles').select('id, title, content, created_at, cover_url, departments!inner(name, slug), profiles(full_name)').eq('status', 'published').order('created_at', { ascending: false });
    if (deptSlug !== 'all') query = query.eq('departments.slug', deptSlug);

    const { data: articles, error } = await query;
    if (error) {
        document.getElementById('article-list').innerHTML = `<p class="col-span-3 text-red-500 text-center py-10">Lỗi kết nối CSDL: ${error.message}</p>`;
        return;
    }

    window.allArticles = articles; 
    renderArticles(articles);
}

function updateActiveMenu(deptSlug) {
    document.querySelectorAll('nav button').forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick') || '';
        const icon = btn.querySelector('i');
        
        if (onclickAttr.includes(`'${deptSlug}'`)) {
            btn.className = 'w-full flex items-center gap-3 px-4 py-3 bg-brand-50 text-brand-600 rounded-2xl font-semibold transition-all';
            if (icon) icon.className = icon.className.replace('text-slate-400', '').replace('group-hover:text-brand-500', '');
        } else {
            btn.className = 'w-full group flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-brand-600 rounded-2xl font-medium transition-all';
            if (icon && !icon.className.includes('text-slate-400')) icon.className += ' text-slate-400 group-hover:text-brand-500 transition-colors';
        }
    });
}

function renderArticles(articles) {
    const container = document.getElementById('article-list');
    container.innerHTML = ''; 

    if (!articles || articles.length === 0) {
        container.innerHTML = '<p class="col-span-3 text-center text-slate-500 py-10">Hệ thống chưa có bài viết nào ở mục này.</p>';
        return;
    }

    const htmlString = articles.map(article => {
        const formattedDate = new Date(article.created_at).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric'});
        const deptName = article.departments ? article.departments.name : 'Chung';
        const authorName = article.profiles ? article.profiles.full_name : 'Admin';
        
        let tempDiv = document.createElement("div");
        tempDiv.innerHTML = article.content;
        Array.from(tempDiv.getElementsByTagName('iframe')).forEach(el => el.remove());
        Array.from(tempDiv.getElementsByTagName('style')).forEach(el => el.remove());
        
        let plainText = tempDiv.textContent || tempDiv.innerText || "";
        if (plainText.trim() === "") plainText = "📄 Đính kèm tài liệu tương tác. Nhấn để xem chi tiết...";

        const coverHTML = article.cover_url 
            ? `<img src="${article.cover_url}" alt="Cover" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"><div class="absolute top-3 left-3 z-10"><span class="text-[10px] font-black tracking-wider px-3 py-1.5 bg-white/90 backdrop-blur text-brand-700 rounded-full shadow-sm uppercase border border-brand-100">${deptName}</span></div>`
            : `<i class="ph-duotone ph-article text-6xl text-brand-300 group-hover:scale-110 group-hover:text-brand-500 transition-all duration-500"></i><div class="absolute top-3 left-3 z-10"><span class="text-[10px] font-black tracking-wider px-3 py-1.5 bg-white text-brand-700 rounded-full shadow-sm uppercase border border-brand-100">${deptName}</span></div>`;

        return `
            <div onclick="openArticleModal('${article.id}')" class="group bg-white border border-slate-100 rounded-[2rem] p-5 shadow-card hover:shadow-card-hover hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full relative cursor-pointer">
                <button onclick="event.stopPropagation(); openFeedbackModal('${article.id}', '${article.title.replace(/'/g, "\\'")}')" class="absolute top-4 right-4 z-10 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-slate-400 hover:text-orange-500 hover:bg-orange-50 shadow-sm transition-all opacity-0 group-hover:opacity-100" title="Báo cáo / Góp ý sửa bài này">
                    <i class="ph-bold ph-warning-circle text-lg"></i>
                </button>
                <div class="h-40 rounded-2xl bg-slate-50 flex items-center justify-center relative mb-5 overflow-hidden">
                    ${coverHTML}
                </div>
                <h3 class="font-bold text-slate-800 text-lg mb-2 leading-snug group-hover:text-brand-600 transition-colors line-clamp-2">${article.title}</h3>
                <div class="text-sm text-slate-500 mb-6 line-clamp-3 flex-1 overflow-hidden">${plainText}</div>
                <div class="flex items-center gap-3 pt-4 border-t border-slate-100 mt-auto">
                    <div class="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs uppercase">${authorName.charAt(0)}</div>
                    <div class="flex-1">
                        <p class="text-xs font-bold text-slate-700">${authorName}</p>
                        <p class="text-[10px] text-slate-400">${formattedDate}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = htmlString;
}

function filterArticles() {
    const keyword = document.getElementById('search-input').value.toLowerCase().trim();
    if (!window.allArticles || window.allArticles.length === 0) return;

    const filteredData = window.allArticles.filter(article => {
        const safeTitle = (article.title || "").toLowerCase();
        return safeTitle.includes(keyword); 
    });

    renderArticles(filteredData); 
}

function toggleModal(modalId, boxId, show) {
    const modal = document.getElementById(modalId);
    const box = document.getElementById(boxId);
    if (!modal || !box) return;

    if (show) {
        modal.classList.remove('hidden');
        setTimeout(() => { 
            modal.classList.remove('opacity-0'); 
            box.classList.remove('scale-90', 'scale-95'); 
            box.classList.add('scale-100'); 
        }, 10);
    } else {
        modal.classList.add('opacity-0');
        box.classList.remove('scale-100');
        box.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

function openFeedbackModal(articleId, articleTitle) {
    document.getElementById('target-article-id').value = articleId;
    document.getElementById('target-article-title').innerText = articleTitle;
    toggleModal('feedback-modal', 'feedback-box', true);
}

function closeFeedbackModal() { toggleModal('feedback-modal', 'feedback-box', false); }

function triggerInsideFeedback() {
    if (!window.currentOpenedArticleId) return;
    const articleTitle = document.getElementById('read-title').innerText;
    openFeedbackModal(window.currentOpenedArticleId, articleTitle);
}

async function submitFeedback(event) {
    event.preventDefault();
    const btn = document.getElementById('feedback-submit-btn');
    const originalClasses = btn.className;

    btn.innerHTML = 'Đang gửi... <i class="ph-bold ph-spinner animate-spin"></i>'; 
    btn.disabled = true;

    const articleId = document.getElementById('target-article-id').value;
    const content = event.target.querySelector('textarea').value; 

    try {
        const { error } = await window.supabaseClient.from('feedbacks').insert([{
            article_id: articleId, user_id: window.currentUser.id, content: content, status: 'pending'
        }]);

        if (error) throw error;

        btn.innerHTML = '<i class="ph-bold ph-check-circle text-lg"></i> Đã gửi';
        btn.className = 'px-6 py-3 text-sm font-bold text-white bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2';

        setTimeout(() => {
            closeFeedbackModal();
            document.getElementById('feedback-form').reset();
            btn.innerHTML = 'Gửi góp ý'; 
            btn.className = originalClasses;
            btn.disabled = false;
        }, 1500);
        
    } catch (err) {
        alert("Lỗi khi gửi góp ý: " + err.message);
        btn.innerHTML = 'Gửi góp ý'; 
        btn.disabled = false;
    }
}

function initCKEditor() {
    if (document.getElementById('admin-content')) {
        CKEDITOR.replace('admin-content', {
            height: 250,
            allowedContent: true,
            toolbar: [
                { name: 'document', items: ['Source'] },
                { name: 'clipboard', items: ['Undo', 'Redo'] },
                { name: 'basicstyles', items: ['Bold', 'Italic', 'Underline', 'Strike', 'RemoveFormat'] },
                { name: 'paragraph', items: ['NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'Blockquote', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock'] },
                { name: 'links', items: ['Link', 'Unlink'] },
                { name: 'insert', items: ['Image', 'Table', 'HorizontalRule'] },
                { name: 'styles', items: ['Format', 'Font', 'FontSize'] },
                { name: 'colors', items: ['TextColor', 'BGColor'] }
            ]
        });
    }
}

async function openAdminModal() {
    toggleModal('admin-modal', 'admin-box', true);
    const selectEl = document.getElementById('admin-dept');
    selectEl.innerHTML = '<option value="">Đang tải danh sách phòng ban...</option>';

    try {
        const { data: depts, error } = await window.supabaseClient.from('departments').select('id, name');
        if (error) throw error; 

        if (depts && depts.length > 0) {
            selectEl.innerHTML = '<option value="">-- Chọn phòng ban --</option>' + depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        } else {
            selectEl.innerHTML = '<option value="">⚠️ Chưa có phòng ban nào trong CSDL</option>';
        }
    } catch (err) {
        selectEl.innerHTML = '<option value="">❌ Lỗi kết nối CSDL</option>';
    }
}

function closeAdminModal() { toggleModal('admin-modal', 'admin-box', false); }

async function submitAdminArticle(event) {
    event.preventDefault();
    const btn = document.getElementById('admin-submit-btn');
    btn.innerHTML = 'Đang xuất bản... <i class="ph-bold ph-spinner animate-spin"></i>';
    btn.disabled = true;

    const title = document.getElementById('admin-title').value;
    const deptId = document.getElementById('admin-dept').value;
    const dateInput = document.getElementById('admin-date').value;
    const coverUrl = document.getElementById('admin-cover').value; 
    const contentHTML = CKEDITOR.instances['admin-content'].getData();
    const isPinned = document.getElementById('admin-is-pinned') ? document.getElementById('admin-is-pinned').checked : false;

    if (contentHTML.trim().length === 0) {
        alert("Vui lòng nhập nội dung chi tiết!");
        btn.innerHTML = '<i class="ph-bold ph-check-circle"></i> Xuất bản lên hệ thống';
        btn.disabled = false;
        return;
    }

    try {
        let payload = { title, content: contentHTML, department_id: deptId, author_id: window.currentUser.id, status: 'published', is_pinned: isPinned };
        if (dateInput) payload.created_at = new Date(dateInput).toISOString();
        if (coverUrl) payload.cover_url = coverUrl;

        const { error } = await window.supabaseClient.from('articles').insert([payload]);
        if (error) throw error;

        closeAdminModal();
        document.getElementById('admin-form').reset();
        CKEDITOR.instances['admin-content'].setData(''); 
        loadArticles('all', 'Kiến thức mới xuất bản');
    } catch (err) {
        alert("Lỗi xuất bản: " + err.message);
    } finally {
        btn.innerHTML = '<i class="ph-bold ph-check-circle"></i> Xuất bản lên hệ thống';
        btn.disabled = false;
    }
}

async function openArticleModal(articleId) {
    window.currentOpenedArticleId = articleId;
    disableEditModeVisuals();
    
    document.getElementById('read-title').innerText = "Đang tải bài viết...";
    document.getElementById('read-content').innerHTML = '<div class="text-center py-10"><i class="ph-bold ph-spinner animate-spin text-3xl text-brand-500"></i></div>';
    toggleModal('read-modal', 'read-box', true);

    const floatingWidgets = document.querySelector('.fixed.bottom-6.right-4');
    if (floatingWidgets) floatingWidgets.style.display = 'none';

    try {
        const { data: article, error } = await window.supabaseClient.from('articles').select('title, content, created_at, cover_url, is_pinned, pin_type, presentation_url, departments(name), profiles(full_name)').eq('id', articleId).single();
        if (error) throw error;

        currentPresentationUrl = article.presentation_url || '';
        
        const btnViewPres = document.getElementById('btn-view-presentation');
        if (btnViewPres) {
            if (currentPresentationUrl.trim() !== '') {
                btnViewPres.classList.remove('hidden');
            } else {
                btnViewPres.classList.add('hidden');
            }
        }

        const btnFeedbackInside = document.getElementById('btn-feedback-inside');
        if (btnFeedbackInside) btnFeedbackInside.classList.remove('hidden');

        const pinCompact = document.getElementById('admin-pin-compact');
        const presInput = document.getElementById('admin-presentation-input');
        if (pinCompact && presInput) {
            pinCompact.classList.add('hidden');
            pinCompact.classList.remove('flex');
            presInput.classList.add('hidden');
            presInput.value = currentPresentationUrl;
            
            const pinCheckbox = document.getElementById('admin-is-pinned');
            const pinTypeSelect = document.getElementById('admin-pin-type');
            if(pinCheckbox) pinCheckbox.checked = article.is_pinned || false;
            if(pinTypeSelect) {
                pinTypeSelect.value = article.pin_type || 'baiviet';
                pinTypeSelect.classList.toggle('hidden', !(article.is_pinned || false));
            }
        }

        document.getElementById('read-title').innerText = article.title;
        document.getElementById('read-author').innerText = article.profiles ? article.profiles.full_name : 'Admin';
        document.getElementById('read-date').innerText = new Date(article.created_at).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric'});
        document.getElementById('read-dept').innerText = article.departments ? article.departments.name : 'Chung';

        const coverContainer = document.getElementById('read-cover-container');
        const coverImg = document.getElementById('read-cover-img');
        if (article.cover_url) {
            coverImg.src = article.cover_url;
            coverContainer.classList.remove('hidden');
        } else {
            coverImg.src = '';
            coverContainer.classList.add('hidden');
        }

        document.getElementById('read-content').innerHTML = article.content;
        
        const adminActions = document.getElementById('admin-article-actions');
        if(adminActions) {
            adminActions.classList.toggle('hidden', !(window.currentUser && window.currentUser.role === 'admin'));
        }

    } catch (err) {
        document.getElementById('read-content').innerHTML = `<p class="text-red-500 p-6">Lỗi không thể tải bài viết: ${err.message}</p>`;
    }
}

function closeArticleModal() { toggleModal('read-modal', 'read-box', false); 
const floatingWidgets = document.querySelector('.fixed.bottom-6.right-4');
    if (floatingWidgets) floatingWidgets.style.display = '';
}

function enableEditMode() {
    const titleEl = document.getElementById('read-title');
    const contentEl = document.getElementById('read-content');
    
    titleEl.innerHTML = `<input type="text" id="edit-read-title" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-2xl font-bold text-slate-800 focus:outline-none focus:border-brand-500" value="${titleEl.innerText}">`;
    contentEl.innerHTML = `<textarea id="edit-read-content" name="edit-read-content">${contentEl.innerHTML}</textarea>`;
    
    CKEDITOR.replace('edit-read-content', {
        height: 300,
        allowedContent: true,
        toolbar: [
            { name: 'document', items: ['Source'] },
            { name: 'basicstyles', items: ['Bold', 'Italic', 'Underline', 'Strike', 'RemoveFormat'] },
            { name: 'paragraph', items: ['NumberedList', 'BulletedList', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock'] },
            { name: 'insert', items: ['Image', 'Table', 'HorizontalRule'] },
            { name: 'styles', items: ['Format', 'Font', 'FontSize'] },
            { name: 'colors', items: ['TextColor', 'BGColor'] }
        ]
    });

    document.getElementById('btn-edit-article').classList.add('hidden');
    document.getElementById('btn-delete-article').classList.add('hidden');
    document.getElementById('btn-save-article').classList.remove('hidden');
    
    const pinCompact = document.getElementById('admin-pin-compact');
    if(pinCompact) {
        pinCompact.classList.remove('hidden');
        pinCompact.classList.add('flex');
    }
    const presInput = document.getElementById('admin-presentation-input');
    if(presInput) presInput.classList.remove('hidden');
    
    const btnViewPres = document.getElementById('btn-view-presentation');
    if(btnViewPres) btnViewPres.classList.add('hidden');
}

    const btnFeedbackInside = document.getElementById('btn-feedback-inside');
    if(btnFeedbackInside) btnFeedbackInside.classList.add('hidden');

async function saveArticleChanges() {
    const saveBtn = document.getElementById('btn-save-article');
    saveBtn.innerHTML = 'Đang lưu... <i class="ph-bold ph-spinner animate-spin"></i>';
    saveBtn.disabled = true;

    const newTitle = document.getElementById('edit-read-title').value;
    const newContentHTML = CKEDITOR.instances['edit-read-content'].getData();
    
    const presInput = document.getElementById('admin-presentation-input');
    const presUrl = presInput ? presInput.value.trim() : '';
    
    const pinCheckbox = document.getElementById('admin-is-pinned');
    const isPinned = pinCheckbox ? pinCheckbox.checked : false;
    
    const pinTypeSelect = document.getElementById('admin-pin-type');
    const pinType = pinTypeSelect ? pinTypeSelect.value : 'baiviet';

    if (newTitle.trim() === "" || newContentHTML.trim() === "") {
        alert("Tiêu đề và nội dung không được bỏ trống!");
        saveBtn.innerHTML = '<i class="ph-bold ph-floppy-disk text-sm"></i> Lưu thay đổi';
        saveBtn.disabled = false;
        return;
    }

    try {
        const updates = { 
            title: newTitle, 
            content: newContentHTML,
            presentation_url: presUrl,
            is_pinned: isPinned,
            pin_type: pinType
        };

        const { error } = await window.supabaseClient.from('articles').update(updates).eq('id', window.currentOpenedArticleId);
        if (error) throw error;

        if (CKEDITOR.instances['edit-read-content']) CKEDITOR.instances['edit-read-content'].destroy();
        await openArticleModal(window.currentOpenedArticleId);
        loadArticles('all', 'Kiến thức mới xuất bản');
        loadPinnedArticles();
    } catch (err) {
        alert("Lỗi khi lưu thay đổi: " + err.message);
        saveBtn.innerHTML = '<i class="ph-bold ph-floppy-disk text-sm"></i> Lưu thay đổi';
        saveBtn.disabled = false;
    }
}

async function deleteArticleViaModal() {
    if (!confirm("Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu/tin tức này không? Hành động này không thể hoàn tác!")) return;
    try {
        const { error } = await window.supabaseClient.from('articles').delete().eq('id', window.currentOpenedArticleId);
        if (error) throw error;
        closeArticleModal();
        loadArticles('all', 'Kiến thức mới xuất bản');
        loadPinnedArticles();
    } catch (err) {
        alert("Lỗi khi xóa bài viết: " + err.message);
    }
}

function disableEditModeVisuals() {
    if (CKEDITOR.instances['edit-read-content']) CKEDITOR.instances['edit-read-content'].destroy();
    const btnEdit = document.getElementById('btn-edit-article');
    const btnDelete = document.getElementById('btn-delete-article');
    const btnSave = document.getElementById('btn-save-article');
    
    if (btnEdit && btnDelete && btnSave) {
        btnEdit.classList.remove('hidden');
        btnDelete.classList.remove('hidden');
        btnSave.classList.add('hidden');
        btnSave.innerHTML = '<i class="ph-bold ph-floppy-disk text-sm"></i> Lưu thay đổi';
        btnSave.disabled = false;
    }
}

function updateDailyGreeting() {
    const hour = new Date().getHours();
    let greeting = "Buổi tối thư giãn nhé! 🌙", icon = '<i class="ph-fill ph-moon-stars text-indigo-500"></i>';
    if (hour >= 5 && hour < 11) { greeting = "Buổi sáng năng suất cho cả ngày nhé!"; icon = '<i class="ph-fill ph-sun text-amber-500"></i>'; } 
    else if (hour >= 11 && hour < 18) { greeting = "Buổi chiều thật năng lượng và hiệu quả! ☕"; icon = '<i class="ph-fill ph-coffee text-amber-700"></i>'; }

    const textEl = document.getElementById('greeting-text');
    const iconEl = document.getElementById('greeting-icon');
    if (textEl && iconEl) { textEl.innerText = greeting; iconEl.innerHTML = icon; }
}

function showEmotionPopup(type) {
    const iconWrap = document.getElementById('emotion-icon-wrap');
    const title = document.getElementById('emotion-title');
    const message = document.getElementById('emotion-message');

    if (type === 'great') {
        iconWrap.className = "w-20 h-20 mx-auto rounded-full flex items-center justify-center text-5xl mb-5 bg-emerald-100 animate-bounce";
        iconWrap.innerHTML = '<img src="./img/1.png" alt="Great" class="w-12 h-12">';
        title.innerText = "Bạn Thật Tuyệt!";
        title.className = "text-2xl font-bold text-emerald-600 mb-2";
        message.innerText = "Hãy lan tỏa năng lượng tích cực này đến mọi người xung quanh và giữ vững phong độ nhé! 🚀";
    } else if (type === 'okay') {
        iconWrap.className = "w-20 h-20 mx-auto rounded-full flex items-center justify-center text-5xl mb-5 bg-amber-100 animate-bounce";
        iconWrap.innerHTML = '<img src="./img/3.png" alt="Okay" class="w-12 h-12">';
        title.innerText = "Mọi việc rồi sẽ ổn thôi!";
        title.className = "text-2xl font-bold text-amber-600 mb-2";
        message.innerText = "Đôi khi bình thường lại là điều tốt nhất. Hãy uống một ngụm nước, hít một hơi thật sâu và tiếp tục công việc thật năng suất nhé! 💪";
    } else if (type === 'tired') {
        iconWrap.className = "w-20 h-20 mx-auto rounded-full flex items-center justify-center text-5xl mb-5 bg-rose-100 animate-pulse";
        iconWrap.innerHTML = '<img src="./img/2.png" alt="Tired" class="w-12 h-12">';
        title.innerText = "Nghỉ ngơi một chút nhé!";
        title.className = "text-2xl font-bold text-rose-600 mb-2";
        message.innerText = "Bạn đã vất vả rồi. Hãy đứng lên vươn vai, nhắm mắt thư giãn 5 phút để sạc lại năng lượng nha. Đừng cố quá sức! 💧";
    }

    toggleModal('emotion-modal', 'emotion-box', true);

    // BỔ SUNG: Ẩn các nút nổi khi mở popup cảm xúc
    const floatingWidgets = document.querySelector('.fixed.bottom-6.right-4');
    if (floatingWidgets) floatingWidgets.style.display = 'none';
}

function closeEmotionPopup() { 
    toggleModal('emotion-modal', 'emotion-box', false); 
    const floatingWidgets = document.querySelector('.fixed.bottom-6.right-4');
    if (floatingWidgets) floatingWidgets.style.display = '';
}

function openMobileNavMenu() {
    const sidebar = document.getElementById('mobile-sidebar');
    const backdrop = document.getElementById('mobile-sidebar-backdrop');
    
    if (sidebar && backdrop) {
        sidebar.classList.toggle('-translate-x-full');
        backdrop.classList.toggle('hidden');
        return;
    }

    const nav = document.querySelector('header nav');
    if (nav) {
        if (nav.classList.contains('hidden')) {

            nav.className = 'flex flex-col absolute top-full left-0 w-full bg-white shadow-2xl p-4 gap-1 z-[100] border-b border-slate-200 transition-all';
            
            setTimeout(() => {
                document.addEventListener('click', closeMenuOutside);
            }, 10);
        } else {
            closeMobileNavMenu();
        }
    }
}


function closeMobileNavMenu() {
    const nav = document.querySelector('header nav');
    if (nav && !nav.classList.contains('hidden')) {
        nav.className = 'hidden lg:flex items-center gap-2 xl:gap-3 shrink-0 whitespace-nowrap';
        document.removeEventListener('click', closeMenuOutside);
    }
}


function closeMenuOutside(event) {
    const nav = document.querySelector('header nav');
    const hamburgerBtn = document.querySelector('button[onclick="openMobileNavMenu()"]');
    

    if (nav && !nav.contains(event.target) && hamburgerBtn && !hamburgerBtn.contains(event.target)) {
        closeMobileNavMenu();
    }
}

function toggleAIChat() {
    const chatWindow = document.getElementById('ai-chat-window');
    const badge = document.getElementById('ai-greeting-badge');
    
    if (chatWindow.classList.contains('scale-0')) {
        chatWindow.classList.remove('scale-0', 'opacity-0', 'pointer-events-none');
        chatWindow.classList.add('scale-100', 'opacity-100', 'pointer-events-auto');
        badge.classList.add('hidden');
    } else {
        chatWindow.classList.add('scale-0', 'opacity-0', 'pointer-events-none');
        chatWindow.classList.remove('scale-100', 'opacity-100', 'pointer-events-auto');
        setTimeout(() => { badge.classList.remove('hidden'); }, 3000);
    }
}

async function loadPinnedArticles() {
    const container = document.getElementById('pinned-articles-container');
    if (!container) return;

    try {
        const { data, error } = await window.supabaseClient
            .from('articles')
            .select('id, title, content, cover_url, is_pinned, pin_type, departments(name)')
            .eq('is_pinned', true)
            .order('created_at', { ascending: false })
            .limit(3);

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = `<div class="col-span-3 text-center py-6 text-brand-200/50 text-sm font-medium border border-white/10 rounded-2xl border-dashed">Hiện tại chưa có thông báo ghim nào.</div>`;
            return;
        }

        const getBadgeStyle = (type) => {
            switch(type) {
                case 'capnhat': 
                    return { bg: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Cập Nhật' };
                case 'thongbao': 
                    return { bg: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Thông Báo' };
                case 'baiviet':
                default:
                    return { bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Bài Viết' };
            }
        };

        container.innerHTML = data.map((article) => {
            const style = getBadgeStyle(article.pin_type);
            
            let tempDiv = document.createElement("div");
            tempDiv.innerHTML = article.content;
            
            Array.from(tempDiv.getElementsByTagName('style')).forEach(el => el.remove());
            Array.from(tempDiv.getElementsByTagName('script')).forEach(el => el.remove());
            Array.from(tempDiv.getElementsByTagName('iframe')).forEach(el => el.remove());
            
            let plainText = tempDiv.textContent || tempDiv.innerText || "";
            let cleanDesc = plainText.trim() ? plainText.trim().substring(0, 80) + '...' : 'Nhấn để xem chi tiết...';

            const deptName = article.departments ? article.departments.name : 'Admin Ban Hành';

            const coverHTML = article.cover_url 
                ? `<div class="h-28 w-full rounded-xl overflow-hidden mb-4 bg-slate-900/10 flex items-center justify-center p-1"><img src="${article.cover_url}" alt="${article.title}" class="w-full h-full object-contain drop-shadow-md transition-transform duration-500 group-hover:scale-105"></div>`
                : '';

            return `
            <a href="javascript:void(0)" onclick="openArticleModal('${article.id}')" class="block bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 rounded-2xl p-4 md:p-5 shadow-lg transition-all duration-300 group flex flex-col justify-between h-full relative overflow-hidden">
                <div class="relative z-10 flex-1 flex flex-col">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="px-2 py-0.5 rounded text-[9px] font-black ${style.bg} uppercase tracking-wider">${style.label}</span>
                    </div>
                    
                    ${coverHTML}

                    <h3 class="text-base font-bold text-white leading-snug group-hover:text-cyan-200 transition-colors line-clamp-3">
                        ${article.title}
                    </h3>
                </div>
                <div class="relative z-10 flex items-center justify-between border-t border-white/10 pt-3 mt-4">
                    <span class="text-[10px] text-brand-200 font-medium line-clamp-1">${deptName}</span>
                    <i class="ph-bold ph-arrow-right text-white group-hover:translate-x-1 transition-transform shrink-0"></i>
                </div>
            </a>`;
        }).join('');

    } catch (err) {
        container.innerHTML = `<div class="col-span-3 text-center py-4 text-red-300 text-sm">Lỗi tải dữ liệu. Vui lòng thử lại.</div>`;
    }
}

async function toggleArticlePin() {
    const isPinned = document.getElementById('admin-is-pinned').checked;
    const pinType = document.getElementById('admin-pin-type').value;

    const pinTypeContainer = document.getElementById('pin-type-container');
    if (pinTypeContainer) pinTypeContainer.classList.toggle('hidden', !isPinned);

    try {
        const { error } = await window.supabaseClient.from('articles')
            .update({ is_pinned: isPinned, pin_type: pinType })
            .eq('id', window.currentOpenedArticleId);
        
        if (error) throw error;
        
        if(typeof loadPinnedArticles === 'function') loadPinnedArticles();
    } catch (err) {
        alert("Lỗi khi cập nhật ghim: " + err.message);
    }
}

function openPresentationModal() {
    if (!currentPresentationUrl) return;
    
    const container = document.getElementById('presentation-iframe-container');
    if (container) {
        container.innerHTML = `<iframe src="${currentPresentationUrl}" class="w-full h-full border-0" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>`;
    }
    
    const modal = document.getElementById('presentation-view-modal');
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
    }
}

function closePresentationModal() {
    const modal = document.getElementById('presentation-view-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            const container = document.getElementById('presentation-iframe-container');
            if (container) container.innerHTML = ''; 
        }, 300);
    }
}