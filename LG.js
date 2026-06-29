const _0x4d8ea9=_0x3228;function _0x3228(_0x5f1d55,_0x477a3f){_0x5f1d55=_0x5f1d55-0x19a;const _0x5cdf40=_0x5cdf();let _0x32289e=_0x5cdf40[_0x5f1d55];return _0x32289e;}(function(_0x5b1af6,_0x4a3cf9){const _0x5d53d7=_0x3228,_0x8141d6=_0x5b1af6();while(!![]){try{const _0x3dba44=parseInt(_0x5d53d7(0x19f))/0x1*(-parseInt(_0x5d53d7(0x19d))/0x2)+-parseInt(_0x5d53d7(0x19e))/0x3+parseInt(_0x5d53d7(0x19b))/0x4*(-parseInt(_0x5d53d7(0x19a))/0x5)+parseInt(_0x5d53d7(0x1a1))/0x6*(-parseInt(_0x5d53d7(0x1a6))/0x7)+-parseInt(_0x5d53d7(0x19c))/0x8+parseInt(_0x5d53d7(0x1a3))/0x9*(parseInt(_0x5d53d7(0x1a0))/0xa)+parseInt(_0x5d53d7(0x1a2))/0xb;if(_0x3dba44===_0x4a3cf9)break;else _0x8141d6['push'](_0x8141d6['shift']());}catch(_0x11b706){_0x8141d6['push'](_0x8141d6['shift']());}}}(_0x5cdf,0xdc660));const SUPABASE_URL='https://ikkcufweyxgcdkfhtyjv.supabase.co',SUPABASE_KEY=_0x4d8ea9(0x1a4),supabaseClient=supabase[_0x4d8ea9(0x1a5)](SUPABASE_URL,SUPABASE_KEY);function _0x5cdf(){const _0x41ea8e=['334963nBIndM','3890mQpWCg','308916ouFdvY','59336145ZABWWA','10719ciQOJs','sb_publishable_ddhA90DSTCD8YE7vUSu7RA_EixeRIqO','createClient','161YVOpIv','512805WBHKQW','24TKBboA','14245680AujlJN','4GmoEUi','2113686rWsFAJ'];_0x5cdf=function(){return _0x41ea8e;};return _0x5cdf();}

document.addEventListener('DOMContentLoaded', checkSession);

async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = '/';
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const btn = document.getElementById('login-btn');
    const errBox = document.getElementById('login-error');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    btn.innerHTML = 'Đang xác thực... <i class="ph-bold ph-spinner animate-spin"></i>';
    btn.disabled = true;
    errBox.classList.add('hidden');

    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        
        if (error) throw error;
        
        window.location.href = '/';
    } catch (error) {
        errBox.innerText = `Sai tài khoản hoặc mật khẩu: ${error.message}`;
        errBox.classList.remove('hidden');
        btn.innerHTML = 'Đăng nhập hệ thống';
        btn.disabled = false;
    }
}