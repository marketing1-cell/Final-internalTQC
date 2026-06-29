const _0x4d8ea9=_0x3228;function _0x3228(_0x5f1d55,_0x477a3f){_0x5f1d55=_0x5f1d55-0x19a;const _0x5cdf40=_0x5cdf();let _0x32289e=_0x5cdf40[_0x5f1d55];return _0x32289e;}(function(_0x5b1af6,_0x4a3cf9){const _0x5d53d7=_0x3228,_0x8141d6=_0x5b1af6();while(!![]){try{const _0x3dba44=parseInt(_0x5d53d7(0x19f))/0x1*(-parseInt(_0x5d53d7(0x19d))/0x2)+-parseInt(_0x5d53d7(0x19e))/0x3+parseInt(_0x5d53d7(0x19b))/0x4*(-parseInt(_0x5d53d7(0x19a))/0x5)+parseInt(_0x5d53d7(0x1a1))/0x6*(-parseInt(_0x5d53d7(0x1a6))/0x7)+-parseInt(_0x5d53d7(0x19c))/0x8+parseInt(_0x5d53d7(0x1a3))/0x9*(parseInt(_0x5d53d7(0x1a0))/0xa)+parseInt(_0x5d53d7(0x1a2))/0xb;if(_0x3dba44===_0x4a3cf9)break;else _0x8141d6['push'](_0x8141d6['shift']());}catch(_0x11b706){_0x8141d6['push'](_0x8141d6['shift']());}}}(_0x5cdf,0xdc660));const SUPABASE_URL='https://ikkcufweyxgcdkfhtyjv.supabase.co',SUPABASE_KEY=_0x4d8ea9(0x1a4),supabaseClient=supabase[_0x4d8ea9(0x1a5)](SUPABASE_URL,SUPABASE_KEY);function _0x5cdf(){const _0x41ea8e=['334963nBIndM','3890mQpWCg','308916ouFdvY','59336145ZABWWA','10719ciQOJs','sb_publishable_ddhA90DSTCD8YE7vUSu7RA_EixeRIqO','createClient','161YVOpIv','512805WBHKQW','24TKBboA','14245680AujlJN','4GmoEUi','2113686rWsFAJ'];_0x5cdf=function(){return _0x41ea8e;};return _0x5cdf();}

let ALL_QUIZZES = [];
let currentUser = null;
let userHistoryMap = {};
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = {}; 
let timerInterval = null;
let timeRemaining = 0; 
let timeSpent = 0;
let questionCounter = 0;

document.addEventListener('DOMContentLoaded', checkUserSession);

async function checkUserSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();

    if (profile) {
        currentUser = profile;
        loadQuizSystem();
    }
}

async function loadQuizSystem() {
    if (currentUser && currentUser.role === 'admin') {
        document.getElementById('btn-open-create-quiz').classList.remove('hidden');
    }

    try {
        // LẤY TẤT CẢ KẾT QUẢ CỦA NGƯỜI DÙNG
        const { data: history } = await supabaseClient
            .from('quiz_results')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false }); // Sắp xếp cái mới nhất lên đầu

        userHistoryMap = {};
        if (history) {
            // Duyệt danh sách: Vì đã sắp xếp (mới nhất lên đầu), 
            // ta chỉ cần lấy kết quả đầu tiên xuất hiện của mỗi quiz_id
            history.forEach(res => {
                if (!userHistoryMap[res.quiz_id]) {
                    userHistoryMap[res.quiz_id] = res.status;
                }
            });
        }

        const { data: quizzesData, error } = await supabaseClient.from('quizzes').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        ALL_QUIZZES = quizzesData || [];
    } catch (err) {
        console.error("System Init Error:", err.message);
    }

    renderQuizList(ALL_QUIZZES);
}

function renderQuizList(quizzes) {
    const grid = document.getElementById('quiz-grid');
    grid.innerHTML = '';

    const categoryLabels = {
        'sales-dept': 'Khối Kinh Doanh',
        'nghiep-vu': 'Khối Nghiệp Vụ XNK',
        'ke-toan': 'Khối Kế Toán',
        'tin-tuc': 'Bài thi Chung'
    };

    const htmlString = quizzes.map(quiz => {
        const status = userHistoryMap[quiz.id] || 'NOT_STARTED';
        let statusBadge, cardBorderClass, actionBtnText;

        if (status === 'PASS') {
            statusBadge = `<span class="text-[10px] font-black tracking-wider px-2.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg uppercase border border-emerald-100 flex items-center gap-1"><i class="ph-bold ph-check-circle"></i> ĐẠT (PASS)</span>`;
            cardBorderClass = 'border-emerald-200 shadow-sm shadow-emerald-500/5';
            actionBtnText = 'Thi lại';
        } else if (status === 'FAIL') {
            statusBadge = `<span class="text-[10px] font-black tracking-wider px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg uppercase border border-red-100 flex items-center gap-1 animate-pulse"><i class="ph-bold ph-x-circle"></i> CHƯA ĐẠT (FAIL)</span>`;
            cardBorderClass = 'border-red-200 shadow-sm shadow-red-500/5';
            actionBtnText = 'Thi lại';
        } else {
            statusBadge = `<span class="text-[10px] font-black tracking-wider px-2.5 py-1.5 bg-slate-100 text-slate-400 rounded-lg uppercase border border-slate-200">Chưa hoàn thành</span>`;
            cardBorderClass = 'border-slate-200';
            actionBtnText = 'Vào thi ngay';
        }

        const displayCategoryName = categoryLabels[quiz.category] || 'Chưa phân loại';

        return `
            <div class="bg-white border ${cardBorderClass} rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-extrabold tracking-wider px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg uppercase border border-brand-100">${displayCategoryName}</span>
                            ${statusBadge}
                        </div>
                        <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                            <i class="ph-bold ph-hourglass-high"></i> ${quiz.duration} phút
                        </div>
                    </div>
                    <div class="space-y-2">
                        <h3 class="font-bold text-slate-800 text-lg leading-snug hover:text-brand-600 transition-colors">${quiz.title}</h3>
                        <p class="text-sm text-slate-500 line-clamp-2 leading-relaxed">${quiz.description}</p>
                    </div>
                </div>
                <div class="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between">
                    <span class="text-xs font-medium text-slate-400 flex items-center gap-1"><i class="ph-bold ph-list-numbers text-base"></i> ${quiz.questions.length} câu hỏi trắc nghiệm</span>
                    <button onclick="startQuiz('${quiz.id}')" class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/10">${actionBtnText}</button>
                </div>
            </div>
        `;
    }).join('');

    grid.innerHTML = htmlString;
}

function filterQuizzes(category) {
    document.querySelectorAll('.quiz-tab').forEach(btn => {
        btn.className = "quiz-tab whitespace-nowrap px-5 py-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 font-medium text-sm transition-all";
    });

    const activeBtn = document.getElementById(`tab-${category}`);
    if (activeBtn) activeBtn.className = "quiz-tab whitespace-nowrap px-5 py-3 border-b-2 border-brand-600 text-brand-600 font-semibold text-sm transition-all";

    renderQuizList(category === 'all' ? ALL_QUIZZES : ALL_QUIZZES.filter(q => q.category === category));
}

function startQuiz(quizId) {
    currentQuiz = ALL_QUIZZES.find(q => q.id === quizId);
    currentQuestionIndex = 0;
    userAnswers = {};
    timeRemaining = currentQuiz.duration * 60;
    timeSpent = 0;

    document.getElementById('view-selection').classList.add('hidden');
    document.getElementById('view-test').classList.remove('hidden');
    document.getElementById('test-category-badge').innerText = currentQuiz.categoryName;
    document.getElementById('test-title-header').innerText = currentQuiz.title;

    renderQuestionNavigationGrid();
    showQuestion(currentQuestionIndex);
    startTimer();
}

function showQuestion(index) {
    currentQuestionIndex = index;
    const question = currentQuiz.questions[index];

    document.getElementById('question-number-label').innerText = `Câu hỏi ${index + 1} / ${currentQuiz.questions.length}`;
    document.getElementById('question-text').innerText = question.text;

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = question.options.map((option, optIdx) => {
        const isSelected = userAnswers[question.id] === optIdx;
        const btnClass = isSelected 
            ? 'border-brand-500 bg-brand-50 text-brand-700 font-semibold ring-2 ring-brand-500/10' 
            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700';
        const radioHtml = isSelected
            ? `<div class="w-5 h-5 rounded-full border-2 border-brand-600 bg-brand-600 flex items-center justify-center text-[10px] text-white font-bold"><i class="ph-bold ph-check"></i></div>`
            : `<div class="w-5 h-5 rounded-full border-2 border-slate-300 bg-white"></div>`;
            
        return `<button onclick="selectOption('${question.id}', ${optIdx})" class="w-full text-left p-4 rounded-xl border font-medium text-sm transition-all flex items-center gap-4 ${btnClass}">${radioHtml} <span>${option}</span></button>`;
    }).join('');

    document.getElementById('btn-prev').disabled = index === 0;
    const nextBtn = document.getElementById('btn-next');
    if (index === currentQuiz.questions.length - 1) {
        nextBtn.innerHTML = `Hoàn tất <i class="ph-bold ph-check-square"></i>`;
        nextBtn.className = "flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-emerald-500/10";
    } else {
        nextBtn.innerHTML = `Câu tiếp theo <i class="ph-bold ph-arrow-right"></i>`;
        nextBtn.className = "flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-brand-500/10";
    }

    updateQuestionNavGridHighlights();
}

function selectOption(questionId, optionIndex) {
    userAnswers[questionId] = optionIndex;
    showQuestion(currentQuestionIndex);
    renderQuestionNavigationGrid();
}

function changeQuestion(direction) {
    const targetIndex = currentQuestionIndex + direction;
    if (targetIndex >= 0 && targetIndex < currentQuiz.questions.length) {
        showQuestion(targetIndex);
    } else if (targetIndex === currentQuiz.questions.length) {
        submitQuizConfirm();
    }
}

function renderQuestionNavigationGrid() {
    const grid = document.getElementById('question-nav-grid');
    grid.innerHTML = currentQuiz.questions.map((q, idx) => {
        const isAnswered = userAnswers[q.id] !== undefined;
        const isCurrent = idx === currentQuestionIndex;
        let cellClass = "h-10 w-full rounded-xl font-medium text-sm border border-slate-200 bg-white text-slate-600 hover:bg-slate-100";
        
        if (isCurrent) cellClass = "h-10 w-full rounded-xl font-bold text-sm border-2 border-brand-600 bg-brand-600 text-white shadow-sm shadow-brand-500/20";
        else if (isAnswered) cellClass = "h-10 w-full rounded-xl font-semibold text-sm border border-brand-200 bg-brand-50 text-brand-600";
        
        return `<button onclick="showQuestion(${idx})" class="${cellClass}">${idx + 1}</button>`;
    }).join('');
}

function updateQuestionNavGridHighlights() {
    document.querySelectorAll('#question-nav-grid button').forEach((cell, idx) => {
        const q = currentQuiz.questions[idx];
        const isAnswered = userAnswers[q.id] !== undefined;
        if (idx === currentQuestionIndex) {
            cell.className = "h-10 w-full rounded-xl font-bold text-sm border-2 border-brand-600 bg-brand-600 text-white shadow-sm shadow-brand-500/20";
        } else if (isAnswered) {
            cell.className = "h-10 w-full rounded-xl font-semibold text-sm border border-brand-200 bg-brand-50 text-brand-600";
        } else {
            cell.className = "h-10 w-full rounded-xl font-medium text-sm border border-slate-200 bg-white text-slate-600 hover:bg-slate-100";
        }
    });
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeRemaining--;
        timeSpent++;
        updateTimerDisplay();

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            processQuizResults();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('quiz-timer');
    if (!timerEl) return;
    
    timerEl.innerText = `${Math.floor(timeRemaining / 60).toString().padStart(2, '0')}:${(timeRemaining % 60).toString().padStart(2, '0')}`;
    timerEl.className = timeRemaining < 60 
        ? "text-3xl font-black text-red-500 tracking-tight flex items-center justify-center gap-2 font-mono animate-pulse"
        : "text-3xl font-black text-slate-800 tracking-tight flex items-center justify-center gap-2 font-mono";
}

function toggleModal(modalId, boxId, show) {
    const modal = document.getElementById(modalId);
    const box = document.getElementById(boxId);
    if (show) {
        modal.classList.remove('hidden');
        setTimeout(() => { modal.classList.remove('opacity-0'); box.classList.remove('scale-95'); }, 10);
    } else {
        modal.classList.add('opacity-0');
        box.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

function submitQuizConfirm() {
    const totalQuestions = currentQuiz.questions.length;
    const answeredCount = Object.keys(userAnswers).length;
    const isMissingAnswers = answeredCount < totalQuestions;

    const iconHolder = document.getElementById('submit-modal-icon');
    const warningBox = document.getElementById('submit-modal-warning-box');

    document.getElementById('submit-modal-status').innerHTML = `Xác nhận kết thúc bài thi?<br><span class="text-slate-700 font-bold">Đã làm: ${answeredCount}/${totalQuestions}</span>`;

    if (isMissingAnswers) {
        iconHolder.className = "w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4 bg-orange-50 text-orange-500 border border-orange-100 animate-bounce";
        iconHolder.innerHTML = `<i class="ph-bold ph-warning"></i>`;
        warningBox.className = "w-full p-4 rounded-2xl text-left text-xs mb-6 flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 font-medium";
        warningBox.innerHTML = `<i class="ph-bold ph-warning-circle text-lg shrink-0"></i><div><p class="font-bold">⚠️ CẢNH BÁO:</p><p class="mt-0.5">Còn <span class="font-black underline">${totalQuestions - answeredCount} câu</span> chưa trả lời. Sẽ bị tính sai nếu nộp.</p></div>`;
        warningBox.classList.remove('hidden');
    } else {
        iconHolder.className = "w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4 bg-emerald-50 text-emerald-600 border border-emerald-100";
        iconHolder.innerHTML = `<i class="ph-bold ph-paper-plane-right"></i>`;
        warningBox.classList.add('hidden');
    }

    toggleModal('submit-confirm-modal', 'submit-confirm-box', true);
}

function closeSubmitModal() { toggleModal('submit-confirm-modal', 'submit-confirm-box', false); }

function confirmSubmitQuiz() {
    if (timerInterval) clearInterval(timerInterval);
    closeSubmitModal();
    processQuizResults();
}

async function processQuizResults() {
    const totalQuestions = currentQuiz.questions.length;
    let correctCount = 0;

    currentQuiz.questions.forEach(q => {
        if (userAnswers[q.id] === q.correct) correctCount++;
    });

    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const isPassed = percentage >= 70; 
    const status = isPassed ? 'PASS' : 'FAIL';
    const scoreStr = `${correctCount} / ${totalQuestions}`;
    const timeStr = `${Math.floor(timeSpent / 60).toString().padStart(2, '0')}:${(timeSpent % 60).toString().padStart(2, '0')}`;

    try {
        const { error } = await supabaseClient.from('quiz_results').insert([{
            user_id: currentUser.id,
            quiz_id: currentQuiz.id,
            score: scoreStr,
            percentage: percentage,
            time_spent: timeStr,
            status: status
        }]);

        if (error) throw error;
        if (!userHistoryMap[currentQuiz.id] || status === 'PASS') userHistoryMap[currentQuiz.id] = status;

    } catch (err) {
        console.error("Result Sync Error:", err.message);
    }

    document.getElementById('view-test').classList.add('hidden');
    document.getElementById('view-result').classList.remove('hidden');
    document.getElementById('result-quiz-title').innerText = currentQuiz.title;
    document.getElementById('result-score-txt').innerText = scoreStr;
    document.getElementById('result-percent-txt').innerText = `${percentage}%`;
    document.getElementById('result-time-txt').innerText = timeStr;

    const iconHolder = document.getElementById('result-icon-holder');
    const statusTitle = document.getElementById('result-status-title');

    if (isPassed) {
        statusTitle.innerText = "KẾT QUẢ: ĐẠT (PASS)";
        statusTitle.className = "text-2xl font-black tracking-tight text-emerald-600";
        iconHolder.className = "w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl shadow-lg bg-emerald-50 text-emerald-600 border border-emerald-100";
        iconHolder.innerHTML = `<i class="ph-bold ph-seal-check"></i>`;
    } else {
        statusTitle.innerText = "KẾT QUẢ: CHƯA ĐẠT (FAIL)";
        statusTitle.className = "text-2xl font-black tracking-tight text-red-600";
        iconHolder.className = "w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl shadow-lg bg-red-50 text-red-600 border border-red-100";
        iconHolder.innerHTML = `<i class="ph-bold ph-x-circle"></i>`;
    }
}

function backToSelection() {
    document.getElementById('view-result').classList.add('hidden');
    document.getElementById('view-selection').classList.remove('hidden');
    filterQuizzes('all');
}

function openCreateQuizModal() {
    document.getElementById('create-quiz-form').reset();
    document.getElementById('cq-questions-container').innerHTML = '';
    questionCounter = 0;
    addQuestionBlock();
    toggleModal('create-quiz-modal', 'create-quiz-box', true);
}

function closeCreateQuizModal() { toggleModal('create-quiz-modal', 'create-quiz-box', false); }

function addQuestionBlock() {
    questionCounter++;
    const qId = questionCounter;
    
    const blockHTML = `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative question-item">
            <h5 class="text-sm font-bold text-brand-600 mb-3 uppercase tracking-wider">Câu hỏi ${qId}</h5>
            <input type="text" required class="q-text w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 mb-4 font-bold text-slate-800 focus:border-brand-500 focus:outline-none" placeholder="Nhập nội dung câu hỏi...">
            <div class="grid grid-cols-2 gap-3 mb-4">
                <input type="text" required class="q-opt-0 w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="Đáp án A">
                <input type="text" required class="q-opt-1 w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="Đáp án B">
                <input type="text" required class="q-opt-2 w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="Đáp án C">
                <input type="text" required class="q-opt-3 w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="Đáp án D">
            </div>
            <div class="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 w-max">
                <label class="text-xs font-bold text-emerald-700">ĐÁP ÁN ĐÚNG LÀ:</label>
                <select class="q-correct bg-white border border-emerald-200 text-emerald-700 text-xs font-bold rounded-md px-2 py-1 outline-none cursor-pointer">
                    <option value="0">Đáp án A</option>
                    <option value="1">Đáp án B</option>
                    <option value="2">Đáp án C</option>
                    <option value="3">Đáp án D</option>
                </select>
            </div>
            <button type="button" onclick="this.parentElement.remove()" class="absolute top-4 right-4 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><i class="ph-bold ph-trash"></i></button>
        </div>
    `;
    document.getElementById('cq-questions-container').insertAdjacentHTML('beforeend', blockHTML);
}

async function submitNewQuiz() {
    const btn = document.getElementById('btn-save-new-quiz');
    const title = document.getElementById('cq-title').value.trim();
    const desc = document.getElementById('cq-desc').value.trim();
    const catVal = document.getElementById('cq-category').value.split('|');
    const duration = document.getElementById('cq-duration').value;

    if (!title) return alert("Vui lòng nhập tên bài thi!");

    const questionBlocks = document.querySelectorAll('.question-item');
    if (questionBlocks.length === 0) return alert("Bài thi phải có ít nhất 1 câu hỏi!");

    let finalQuestions = [];
    let isValid = true;

    questionBlocks.forEach((block, index) => {
        const text = block.querySelector('.q-text').value.trim();
        const opt0 = block.querySelector('.q-opt-0').value.trim();
        const opt1 = block.querySelector('.q-opt-1').value.trim();
        const opt2 = block.querySelector('.q-opt-2').value.trim();
        const opt3 = block.querySelector('.q-opt-3').value.trim();
        const correctStr = block.querySelector('.q-correct').value;

        if (!text || !opt0 || !opt1 || !opt2 || !opt3) isValid = false;

        finalQuestions.push({
            id: index + 1,
            text: text,
            options: [opt0, opt1, opt2, opt3],
            correct: parseInt(correctStr)
        });
    });

    if (!isValid) return alert("Vui lòng điền đầy đủ nội dung và 4 đáp án cho tất cả câu hỏi!");

    btn.innerHTML = 'Đang lưu... <i class="ph-bold ph-spinner animate-spin"></i>';
    btn.disabled = true;

    try {
        const payload = {
            category: catVal[0],
            category_name: catVal[1],
            title: title,
            description: desc,
            duration: parseInt(duration),
            questions: finalQuestions
        };

        const { error } = await supabaseClient.from('quizzes').insert([payload]);
        if (error) throw error;

        closeCreateQuizModal();
        loadQuizSystem();
    } catch(err) {
        alert("Lỗi tạo đề thi: " + err.message);
    } finally {
        btn.innerHTML = '<i class="ph-bold ph-check-circle"></i> Xuất bản Đề thi';
        btn.disabled = false;
    }
}
function toggleMobileMenu() {
            const sidebar = document.getElementById('mobile-sidebar');
            const backdrop = document.getElementById('mobile-sidebar-backdrop');
            
            if (sidebar.classList.contains('-translate-x-full')) {
                // Trượt menu ra
                sidebar.classList.remove('-translate-x-full');
                backdrop.classList.remove('hidden');
            } else {
                // Thu menu lại
                sidebar.classList.add('-translate-x-full');
                backdrop.classList.add('hidden');
            }
        }

