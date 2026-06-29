async function checkAuthSession() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session) {
        await fetchUserProfile(session.user.id);
        loadArticles('all', 'Kiến thức mới xuất bản');
    } else {
        window.location.href = 'login.html';
    }
}

async function fetchUserProfile(userId) {
    const { data: profile, error } = await window.supabaseClient.from('profiles').select('*').eq('id', userId).single();
    if (profile) {
        window.currentUser = profile;
    if (profile.role === 'admin' || profile.role === 'cskh'|| profile.role === 'bod') {
        const cskhMenu = document.getElementById('menu-cskh-report');
        if (cskhMenu) cskhMenu.classList.remove('hidden');
    }
        document.getElementById('current-user-name').innerText = profile.full_name;
        const roleNames = {
            'admin': 'Admin',
            'bod': 'BOD',
            'cskh': 'CSKH',
            'staff': 'Staff'
        };
        document.getElementById('current-user-role').innerText = roleNames[profile.role] || 'Nhân viên';
        if (profile.role === 'admin') {
            document.getElementById('admin-menu-section').classList.remove('hidden');
        }

        const nameParts = profile.full_name.trim().split(' ');
        const lastName = nameParts[nameParts.length - 1];
        document.getElementById('welcome-message').innerText = `Chúc ${lastName} một ngày tốt lành!`;

        const today = new Date();
        document.getElementById('system-date').innerText = `Ngày: ${today.toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'})}`;
    } else if (error) {
        console.error("Profile Fetch Error:", error);
    }
}

async function handleLogout() {
    await window.supabaseClient.auth.signOut();
    window.location.href = 'login.html'; 
}


function openChangePasswordModal() {
    const form = document.getElementById('change-password-form');
    if (form) form.reset();
    toggleModal('change-password-modal', 'change-password-box', true);
}

function closeChangePasswordModal() {
    toggleModal('change-password-modal', 'change-password-box', false);
}

async function submitChangePassword(event) {
    event.preventDefault();
    
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        alert("Mật khẩu xác nhận không khớp. Vui lòng nhập lại!");
        return;
    }

    if (newPassword.length < 6) {
        alert("Mật khẩu phải có ít nhất 6 ký tự để đảm bảo an toàn!");
        return;
    }

    const btn = document.getElementById('btn-submit-password');
    const originalClasses = btn.className;
    
    btn.innerHTML = 'Đang xử lý... <i class="ph-bold ph-spinner animate-spin"></i>';
    btn.disabled = true;

    try {

        const { data, error } = await window.supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;


        btn.innerHTML = '<i class="ph-bold ph-check-circle"></i> Đổi thành công! Đang đăng xuất...';
        btn.className = 'px-5 py-2.5 text-sm font-bold text-white bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2';


        setTimeout(async () => {
            closeChangePasswordModal();
            btn.className = originalClasses;
            btn.disabled = false;
            

            await window.supabaseClient.auth.signOut();

            window.location.href = 'login.html';
        }, 2000);

    } catch (err) {
        alert("Lỗi khi đổi mật khẩu: " + err.message);
        btn.innerHTML = '<i class="ph-bold ph-floppy-disk"></i> Lưu thay đổi';
        btn.disabled = false;
    }
}