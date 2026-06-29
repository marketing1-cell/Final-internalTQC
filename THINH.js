const _0x4d8ea9=_0x3228;function _0x3228(_0x5f1d55,_0x477a3f){_0x5f1d55=_0x5f1d55-0x19a;const _0x5cdf40=_0x5cdf();let _0x32289e=_0x5cdf40[_0x5f1d55];return _0x32289e;}(function(_0x5b1af6,_0x4a3cf9){const _0x5d53d7=_0x3228,_0x8141d6=_0x5b1af6();while(!![]){try{const _0x3dba44=parseInt(_0x5d53d7(0x19f))/0x1*(-parseInt(_0x5d53d7(0x19d))/0x2)+-parseInt(_0x5d53d7(0x19e))/0x3+parseInt(_0x5d53d7(0x19b))/0x4*(-parseInt(_0x5d53d7(0x19a))/0x5)+parseInt(_0x5d53d7(0x1a1))/0x6*(-parseInt(_0x5d53d7(0x1a6))/0x7)+-parseInt(_0x5d53d7(0x19c))/0x8+parseInt(_0x5d53d7(0x1a3))/0x9*(parseInt(_0x5d53d7(0x1a0))/0xa)+parseInt(_0x5d53d7(0x1a2))/0xb;if(_0x3dba44===_0x4a3cf9)break;else _0x8141d6['push'](_0x8141d6['shift']());}catch(_0x11b706){_0x8141d6['push'](_0x8141d6['shift']());}}}(_0x5cdf,0xdc660));const SUPABASE_URL='https://ikkcufweyxgcdkfhtyjv.supabase.co',SUPABASE_KEY=_0x4d8ea9(0x1a4),supabaseClient=supabase[_0x4d8ea9(0x1a5)](SUPABASE_URL,SUPABASE_KEY);function _0x5cdf(){const _0x41ea8e=['334963nBIndM','3890mQpWCg','308916ouFdvY','59336145ZABWWA','10719ciQOJs','sb_publishable_ddhA90DSTCD8YE7vUSu7RA_EixeRIqO','createClient','161YVOpIv','512805WBHKQW','24TKBboA','14245680AujlJN','4GmoEUi','2113686rWsFAJ'];_0x5cdf=function(){return _0x41ea8e;};return _0x5cdf();}
document.addEventListener('DOMContentLoaded', checkAdminAccess);
// Dán Key ở Bước 1 vào đây
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlra2N1ZndleXhnY2RrZmh0eWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTIyOTExNSwiZXhwIjoyMDk2ODA1MTE1fQ.MXtBgj5GKKGTUDzO_biXmNmPkFKGXHV2TemS3IYXlCc'; 

// Tạo một cổng kết nối riêng chỉ dành cho Admin (Bỏ qua RLS, không lưu session)
const supabaseAdmin = supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkAdminAccess() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', session.user.id).single();

    if (!profile || profile.role !== 'admin') {
        alert("Bạn không có quyền truy cập trang quản trị này!");
        window.location.href = 'index.html';
    } else {
        document.getElementById('page-body').classList.remove('hidden');

        loadFeedbacks();
        loadUsers();
    }
}


function switchTab(tabName) {
    // 1. Reset màu các nút bên Sidebar
    document.getElementById('tab-btn-feedbacks').className = "w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-brand-600 rounded-xl font-bold transition-all";
    document.getElementById('tab-btn-users').className = "w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-brand-600 rounded-xl font-bold transition-all";


    document.getElementById('tab-content-feedbacks').classList.add('hidden');
    document.getElementById('tab-content-users').classList.add('hidden');


    document.getElementById(`tab-btn-${tabName}`).className = "w-full flex items-center gap-3 px-4 py-3 bg-brand-50 text-brand-600 rounded-xl font-bold transition-all";
    document.getElementById(`tab-content-${tabName}`).classList.remove('hidden');
}



async function loadFeedbacks() {
    const tbody = document.getElementById('feedback-table-body');
    const { data: feedbacks, error } = await supabaseClient
        .from('feedbacks')
        .select('id, content, status, created_at, profiles(full_name), articles(title)')
        .order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-red-500 text-center font-bold">Lỗi tải dữ liệu: ${error.message}</td></tr>`;
        return;
    }

    if (!feedbacks || feedbacks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-slate-500 text-center font-bold">Chưa có góp ý nào từ hệ thống.</td></tr>`;
        return;
    }

    tbody.innerHTML = feedbacks.map(item => {
        const dateStr = new Date(item.created_at).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric'});
        const senderName = item.profiles?.full_name || 'Người dùng ẩn danh';
        const articleTitle = item.articles?.title || 'Bài viết đã bị xóa';
        const isPending = item.status === 'pending';

        const statusBadge = isPending 
            ? `<span class="bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-max mx-auto"><i class="ph-bold ph-hourglass-high animate-pulse"></i> Chờ xử lý</span>`
            : `<span class="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-max mx-auto"><i class="ph-bold ph-check-circle"></i> Đã cập nhật</span>`;

        const actionButton = isPending
            ? `<div class="flex items-center justify-end gap-2">
                   <button onclick="markAsResolved('${item.id}')" class="bg-brand-50 text-brand-600 border border-brand-200 hover:bg-brand-600 hover:text-white transition-colors px-4 py-2 rounded-xl text-xs font-bold shadow-sm">Hoàn thành</button>
                   <button onclick="deleteFeedback('${item.id}')" class="text-slate-400 hover:text-red-500 bg-slate-50 border border-slate-200 hover:bg-red-50 hover:border-red-200 transition-colors p-2 rounded-xl" title="Xóa góp ý"><i class="ph-bold ph-trash text-lg"></i></button>
               </div>`
            : `<div class="flex items-center justify-end gap-3">
                   <button onclick="deleteFeedback('${item.id}')" class="text-slate-400 hover:text-red-500 bg-slate-50 border border-slate-200 hover:bg-red-50 hover:border-red-200 transition-colors p-2 rounded-xl" title="Xóa góp ý"><i class="ph-bold ph-trash text-lg"></i></button>
               </div>`;

        return `
            <tr class="hover:bg-slate-50 transition-colors group">
                <td class="px-6 py-4">
                    <p class="font-bold text-slate-800 text-sm">${senderName}</p>
                    <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">${dateStr}</p>
                </td>
                <td class="px-6 py-4 font-semibold text-brand-600 max-w-[200px] truncate">${articleTitle}</td>
                <td class="px-6 py-4 text-slate-700 font-medium leading-relaxed">${item.content}</td>
                <td class="px-6 py-4 text-center">${statusBadge}</td>
                <td class="px-6 py-4 text-right">${actionButton}</td>
            </tr>
        `;
    }).join('');
}

async function markAsResolved(feedbackId) {
    if (!confirm("Bạn xác nhận đã chỉnh sửa bài viết theo góp ý này?")) return;
    const { error } = await supabaseClient.from('feedbacks').update({ status: 'resolved' }).eq('id', feedbackId);
    if (error) alert("Lỗi cập nhật: " + error.message);
    else loadFeedbacks();
}

async function deleteFeedback(feedbackId) {
    if (!confirm("Xóa vĩnh viễn góp ý này?")) return;
    const { error } = await supabaseClient.from('feedbacks').delete().eq('id', feedbackId);
    if (error) alert("Lỗi khi xóa: " + error.message);
    else loadFeedbacks();
}


// account
async function loadUsers() {
    const tbody = document.getElementById('user-table-body');
    const { data: users, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-red-500 text-center font-bold">Lỗi tải dữ liệu User: ${error.message}</td></tr>`;
        return;
    }

    if (!users || users.length === 0) return;

    tbody.innerHTML = users.map(user => {
        const isSelf = true; 
        
        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold uppercase shrink-0">
                            ${user.full_name.charAt(0)}
                        </div>
                        <p class="font-bold text-slate-800 text-sm">${user.full_name}</p>
                    </div>
                </td>
                <td class="px-6 py-4 font-semibold text-slate-500">${user.email || '—'}</td>
                <td class="px-6 py-4 text-center">
                    <select id="role-select-${user.id}" class="bg-slate-50 border border-slate-200 text-brand-700 text-xs font-bold rounded-lg px-3 py-2 outline-none cursor-pointer focus:border-brand-500 transition-all">
                        <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Staff (Nhân viên)</option>
                        <option value="cskh" ${user.role === 'cskh' ? 'selected' : ''}>CSKH</option>
                        <option value="bod" ${user.role === 'bod' ? 'selected' : ''}>BOD (Ban Giám Đốc)</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin (Quản trị)</option>
                    </select>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider mx-auto">Hoạt động</span>
                </td>
                <td class="px-6 py-4 text-right">
                    <button onclick="updateUserRole('${user.id}')" class="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-slate-800/20 transition-all">Lưu Quyền</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function updateUserRole(userId) {
    const newRole = document.getElementById(`role-select-${userId}`).value;
    if (!confirm(`Bạn có chắc chắn muốn thay đổi quyền hạn của tài khoản này thành [${newRole.toUpperCase()}] không?`)) return;

    try {
        const { error } = await supabaseClient.from('profiles').update({ role: newRole }).eq('id', userId);
        if (error) throw error;
        
        alert("Đã phân quyền thành công!");
        loadUsers();
    } catch (err) {
        alert("Lỗi khi phân quyền: " + err.message);
    }
}


// ================= MODAL TẠO TÀI KHOẢN MỚI (BẰNG ADMIN API) =================
function openCreateUserModal() {
    document.getElementById('create-user-form').reset();
    toggleModal('create-user-modal', 'create-user-box', true);
}

function closeCreateUserModal() {
    toggleModal('create-user-modal', 'create-user-box', false);
}

async function submitCreateUser(event) {
    event.preventDefault();
    
    const name = document.getElementById('new-user-name').value;
    const email = document.getElementById('new-user-email').value;
    const pass = document.getElementById('new-user-pass').value;
    const role = document.getElementById('new-user-role').value;

    const btn = document.getElementById('btn-submit-user');
    const originalClasses = btn.className;
    btn.innerHTML = 'Đang khởi tạo... <i class="ph-bold ph-spinner animate-spin"></i>';
    btn.disabled = true;

    try {
        // 1. Tạo Auth User bằng quyền Admin (Tự động Verify Email luôn)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: pass,
            email_confirm: true // Rất quan trọng: Bỏ qua bước chờ email xác nhận
        });
        
        if (authError) throw authError;

        // 2. Chờ 1 giây để Database tạo xong, sau đó cập nhật Tên và Phân Quyền
      setTimeout(async () => {
            if (authData && authData.user) {
                // SỬA LỖI Ở ĐÂY: Dùng upsert thay vì update, và bắt buộc truyền id của user vào
                const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
                    id: authData.user.id,     // Bắt buộc phải link đúng ID của Auth
                    full_name: name,          // Tên nhân viên
                    role: role                // Phân quyền
                });
                
                if (profileError) {
                    alert("Tạo tài khoản đăng nhập thành công nhưng lỗi tạo Profile: " + profileError.message);
                    console.error(profileError);
                }
            }
            
            btn.innerHTML = '<i class="ph-bold ph-check-circle"></i> Đã tạo thành công!';
            btn.className = 'px-6 py-3 text-sm font-bold text-white bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2';

            setTimeout(() => {
                closeCreateUserModal();
                btn.innerHTML = '<i class="ph-bold ph-plus-circle"></i> Khởi tạo';
                btn.className = originalClasses;
                btn.disabled = false;
                loadUsers(); // Tự động làm mới bảng nhân sự
            }, 1500);

        }, 1000);

    } catch (err) {
        alert("Lỗi khi tạo tài khoản: " + err.message);
        btn.innerHTML = '<i class="ph-bold ph-plus-circle"></i> Khởi tạo';
        btn.disabled = false;
    }
}