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
        document.getElementById('current-user-name').innerText = profile.full_name;
        document.getElementById('current-user-role').innerText = profile.role === 'admin' ? 'Quản trị viên' : 'Nhân viên';

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