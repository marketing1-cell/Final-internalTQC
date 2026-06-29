const _0x4d8ea9=_0x3228;function _0x3228(_0x5f1d55,_0x477a3f){_0x5f1d55=_0x5f1d55-0x19a;const _0x5cdf40=_0x5cdf();let _0x32289e=_0x5cdf40[_0x5f1d55];return _0x32289e;}(function(_0x5b1af6,_0x4a3cf9){const _0x5d53d7=_0x3228,_0x8141d6=_0x5b1af6();while(!![]){try{const _0x3dba44=parseInt(_0x5d53d7(0x19f))/0x1*(-parseInt(_0x5d53d7(0x19d))/0x2)+-parseInt(_0x5d53d7(0x19e))/0x3+parseInt(_0x5d53d7(0x19b))/0x4*(-parseInt(_0x5d53d7(0x19a))/0x5)+parseInt(_0x5d53d7(0x1a1))/0x6*(-parseInt(_0x5d53d7(0x1a6))/0x7)+-parseInt(_0x5d53d7(0x19c))/0x8+parseInt(_0x5d53d7(0x1a3))/0x9*(parseInt(_0x5d53d7(0x1a0))/0xa)+parseInt(_0x5d53d7(0x1a2))/0xb;if(_0x3dba44===_0x4a3cf9)break;else _0x8141d6['push'](_0x8141d6['shift']());}catch(_0x11b706){_0x8141d6['push'](_0x8141d6['shift']());}}}(_0x5cdf,0xdc660));const SUPABASE_URL='https://ikkcufweyxgcdkfhtyjv.supabase.co',SUPABASE_KEY=_0x4d8ea9(0x1a4),supabaseClient=supabase[_0x4d8ea9(0x1a5)](SUPABASE_URL,SUPABASE_KEY);function _0x5cdf(){const _0x41ea8e=['334963nBIndM','3890mQpWCg','308916ouFdvY','59336145ZABWWA','10719ciQOJs','sb_publishable_ddhA90DSTCD8YE7vUSu7RA_EixeRIqO','createClient','161YVOpIv','512805WBHKQW','24TKBboA','14245680AujlJN','4GmoEUi','2113686rWsFAJ'];_0x5cdf=function(){return _0x41ea8e;};return _0x5cdf();}

        document.addEventListener('DOMContentLoaded', checkAdminAccess);

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
            }
        }

        async function loadFeedbacks() {
            const tbody = document.getElementById('feedback-table-body');
            const { data: feedbacks, error } = await supabaseClient
                .from('feedbacks')
                .select('id, content, status, created_at, profiles(full_name), articles(title)')
                .order('created_at', { ascending: false });

            if (error) {
                tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-red-500 text-center">Lỗi tải dữ liệu: ${error.message}</td></tr>`;
                return;
            }

            if (!feedbacks || feedbacks.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-slate-500 text-center">Chưa có góp ý nào từ hệ thống.</td></tr>`;
                return;
            }

            tbody.innerHTML = feedbacks.map(item => {
                const dateStr = new Date(item.created_at).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric'});
                const senderName = item.profiles?.full_name || 'Người dùng ẩn danh';
                const articleTitle = item.articles?.title || 'Bài viết đã bị xóa';
                const isPending = item.status === 'pending';

                const statusBadge = isPending 
                    ? `<span class="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold uppercase">Chờ xử lý</span>`
                    : `<span class="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold uppercase">Đã cập nhật</span>`;

                const actionButton = isPending
                    ? `<div class="flex items-center justify-end gap-2">
                           <button onclick="markAsResolved('${item.id}')" class="bg-brand-50 text-brand-600 hover:bg-brand-600 hover:text-white transition-colors px-3 py-1.5 rounded-lg text-xs font-bold">Xác nhận cập nhật</button>
                           <button onclick="deleteFeedback('${item.id}')" class="text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 transition-colors p-1.5 rounded-lg" title="Xóa góp ý"><i class="ph-bold ph-trash text-base"></i></button>
                       </div>`
                    : `<div class="flex items-center justify-end gap-3">
                           <span class="text-slate-400 text-xs font-medium"><i class="ph-bold ph-check"></i> Hoàn tất</span>
                           <button onclick="deleteFeedback('${item.id}')" class="text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 transition-colors p-1.5 rounded-lg" title="Xóa góp ý"><i class="ph-bold ph-trash text-base"></i></button>
                       </div>`;

                return `
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="px-6 py-4">
                            <p class="font-bold text-slate-800">${senderName}</p>
                            <p class="text-xs text-slate-500">${dateStr}</p>
                        </td>
                        <td class="px-6 py-4 font-medium text-brand-600">${articleTitle}</td>
                        <td class="px-6 py-4 text-slate-600 max-w-xs truncate" title="${item.content}">${item.content}</td>
                        <td class="px-6 py-4">${statusBadge}</td>
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
            if (!confirm("Bạn có chắc chắn muốn xóa vĩnh viễn góp ý này không? Hành động này không thể hoàn tác.")) return;
            const { error } = await supabaseClient.from('feedbacks').delete().eq('id', feedbackId);
            if (error) alert("Lỗi khi xóa: " + error.message);
            else loadFeedbacks();
        }