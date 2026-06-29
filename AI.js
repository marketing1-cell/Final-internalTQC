
const promptInput = document.getElementById('ai-prompt-input');
const chatBody = document.getElementById('ai-chat-body');
const typingIndicator = document.getElementById('ai-typing-indicator');

function sendPromptToAI() {
    if (!promptInput) return;
    const userText = promptInput.value.trim();
    if (!userText) return;

    promptInput.value = '';
    

    if (promptInput.tagName.toLowerCase() === 'textarea') {
        promptInput.style.height = '52px'; 
    }

    appendUserMessage(userText);
    scrollToBottom();

    if (typingIndicator) typingIndicator.classList.remove('hidden');
    scrollToBottom();
    
    // Giả lập AI suy nghĩ 2 giây
    setTimeout(() => {
        if (typingIndicator) typingIndicator.classList.add('hidden');
        const aiReply = "Tính năng <strong>TQC AI CHAT</strong> đang được phát triển. <span class='text-cyan-400 font-bold'>Thinh P.Kinh Doanh (Admin)</span> sẽ sớm xây dụng hệ thống hoàn chỉnh.";
        appendAIMessage(aiReply);
    }, 2000);
}

function appendUserMessage(text) {
    if (!chatBody) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = "flex items-start justify-end gap-3 w-full pl-10 mb-4";
    msgDiv.innerHTML = `
        <div class="bg-gradient-to-br from-cyan-600 to-blue-600 p-3 md:p-4 rounded-2xl rounded-tr-none text-sm text-white shadow-md border border-cyan-400/30 whitespace-pre-wrap">${text}</div>
        <div class="w-8 h-8 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 shrink-0 mt-1 font-bold text-xs shadow-inner">ME</div>
    `;
    
    if (typingIndicator && typingIndicator.parentNode === chatBody) {
        chatBody.insertBefore(msgDiv, typingIndicator);
    } else {
        chatBody.appendChild(msgDiv);
    }
}

function appendAIMessage(text) {
    if (!chatBody) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = "flex items-start gap-3 w-full pr-10 mb-4";
    msgDiv.innerHTML = `
        <img src="ai.png" alt="AI" class="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] shrink-0 mt-1">
        <div class="bg-slate-800/80 border border-cyan-500/20 p-3 md:p-4 rounded-2xl rounded-tl-none text-sm text-slate-200 shadow-sm leading-relaxed backdrop-blur-sm">${text}</div>
    `;
    
    if (typingIndicator && typingIndicator.parentNode === chatBody) {
        chatBody.insertBefore(msgDiv, typingIndicator);
    } else {
        chatBody.appendChild(msgDiv);
    }
}

function scrollToBottom() {
    setTimeout(() => {
        if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
    }, 50); 
}


if (promptInput) {
    // Bắt phím Enter
    promptInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); 
            sendPromptToAI();
        }
    });

    if (promptInput.tagName.toLowerCase() === 'textarea') {
        promptInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            if (this.value === '') this.style.height = '52px';
        });
    }
}


const btnSend = document.getElementById('btn-send-ai');
if (btnSend) {
    btnSend.addEventListener('click', sendPromptToAI);
}

function toggleMobileMenu() {
            const sidebar = document.getElementById('mobile-sidebar');
            const backdrop = document.getElementById('mobile-sidebar-backdrop');
            
            // Kiểm tra xem có tìm thấy thanh menu không rồi mới chạy để tránh lỗi
            if (sidebar && backdrop) {
                if (sidebar.classList.contains('-translate-x-full')) {
                    // Mở menu
                    sidebar.classList.remove('-translate-x-full');
                    backdrop.classList.remove('hidden');
                } else {
                    // Đóng menu
                    sidebar.classList.add('-translate-x-full');
                    backdrop.classList.add('hidden');
                }
            }
        }