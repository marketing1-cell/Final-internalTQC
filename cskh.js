const GAS_API_URL = "https://script.google.com/macros/s/AKfycbz37FrOdqepa-Xx8MezCYfQXzp0x0XnPhK0mL-AxFaa7K8b3gnTnKOgM8KaLlOgvTduBA/exec"; 
        const COL_DATE = "Thời gian gửi"; 
        const COL_COMPANY = "Tên Doanh Nghiệp"; 
        const COL_REP = "Người Đại Diện Đánh Giá";
        const COL_FEEDBACK = "Lý do & Góp ý cải thiện";
        const DEPARTMENTS = ['P. Chứng từ', 'P. Khai báo', 'P. Giao nhận - Vận tải', 'P. C/O', 'P. Kinh doanh', 'P. Kế toán'];

        let RAW_DATA = [];
        let filteredDataGlobal = [];
        let currentPage = 1; const itemsPerPage = 6;
        let sortedCompanies = []; let currentGroupedData = {}; 

        document.addEventListener('DOMContentLoaded', async () => {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) return window.location.href = 'login.html';
            fetchDataFromSheet();
        });

        function switchTab(tab) {
            document.getElementById('tab-content-detail').classList.add('hidden');
            document.getElementById('tab-content-dashboard').classList.add('hidden');
            document.getElementById('tab-btn-detail').className = "px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all text-slate-500 hover:text-slate-700";
            document.getElementById('tab-btn-dashboard').className = "px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all text-slate-500 hover:text-slate-700";
            document.getElementById(`tab-content-${tab}`).classList.remove('hidden');
            document.getElementById(`tab-btn-${tab}`).className = "px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all bg-white text-brand-600 shadow-sm";
        }

        async function fetchDataFromSheet() {
            document.getElementById('loading-indicator').classList.remove('hidden');
            try {
                const response = await fetch(GAS_API_URL);
                const result = await response.json();
                if(result.status === 'success') { RAW_DATA = result.data; applyFilter(); }
            } catch (err) { alert("Lỗi tải dữ liệu."); } 
            finally { document.getElementById('loading-indicator').classList.add('hidden'); }
        }

        function getSafeTime(dateStr) {
            if(!dateStr) return 0;
            const d = new Date(dateStr); return isNaN(d.getTime()) ? 0 : d.getTime();
        }

        function applyFilter() {
            const startVal = document.getElementById('filter-start').value;
            const endVal = document.getElementById('filter-end').value;
            filteredDataGlobal = RAW_DATA;

            if (startVal || endVal) {
                const startDate = startVal ? new Date(startVal).setHours(0,0,0,0) : 0;
                const endDate = endVal ? new Date(endVal).setHours(23,59,59,999) : Infinity;
                filteredDataGlobal = RAW_DATA.filter(row => {
                    const rowTime = getSafeTime(row[COL_DATE]); return rowTime >= startDate && rowTime <= endDate;
                });
            }


            const groupedData = {};
            filteredDataGlobal.forEach(row => {
                const companyName = row[COL_COMPANY] ? row[COL_COMPANY].trim() : "Khách Hàng Ẩn Danh";
                if (!groupedData[companyName]) groupedData[companyName] = [];
                groupedData[companyName].push(row);
            });
            currentGroupedData = groupedData;
            sortedCompanies = Object.keys(groupedData).sort((a, b) => Math.max(...groupedData[b].map(r => getSafeTime(r[COL_DATE]))) - Math.max(...groupedData[a].map(r => getSafeTime(r[COL_DATE]))));
            currentPage = 1; renderPage();


            analyzeDashboard(filteredDataGlobal);
            analyzeCompanyTrend(filteredDataGlobal);
        }


        function analyzeCompanyTrend(data) {
            const trendContainer = document.getElementById('trend-chart-container');
            if(data.length === 0) { trendContainer.innerHTML = '<p class="text-slate-400">Không có dữ liệu vẽ biểu đồ.</p>'; return; }


            let monthlyData = {};
            data.forEach(row => {
                let d = new Date(row[COL_DATE]);
                if(isNaN(d.getTime())) return;
                let monthKey = `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                
                if(!monthlyData[monthKey]) monthlyData[monthKey] = { sum: 0, count: 0, timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime() };
                
                DEPARTMENTS.forEach(dep => {
                    let score = parseFloat(row[dep]);
                    if (!isNaN(score) && score >= 1 && score <= 5) {
                        monthlyData[monthKey].sum += score;
                        monthlyData[monthKey].count++;
                    }
                });
            });


            let trendArr = Object.keys(monthlyData).map(key => ({
                month: key,
                avg: monthlyData[key].count > 0 ? (monthlyData[key].sum / monthlyData[key].count).toFixed(2) : 0,
                timestamp: monthlyData[key].timestamp
            })).filter(item => item.avg > 0).sort((a, b) => a.timestamp - b.timestamp);

            if(trendArr.length === 0) { trendContainer.innerHTML = '<p class="text-slate-400">Không có điểm số hợp lệ.</p>'; return; }


            trendContainer.innerHTML = trendArr.map(item => {
                let percent = (item.avg / 5) * 100;
                let barColor = item.avg <= 3.5 ? 'bg-red-400' : (item.avg <= 4.2 ? 'bg-amber-400' : 'bg-brand-500');
                return `
                <div class="relative flex flex-col items-center justify-end h-full w-12 md:w-16 group chart-bar cursor-pointer">
                    <div class="chart-tooltip absolute -top-12 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 invisible transition-all z-10 shadow-lg whitespace-nowrap">
                        ${item.avg} Điểm
                        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                    </div>
                    
                    <div class="text-[10px] font-black text-slate-500 mb-1">${item.avg}</div>
                    <div class="w-full ${barColor} rounded-t-xl transition-all duration-1000 shadow-sm" style="height: ${percent}%;"></div>
                    <div class="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">${item.month}</div>
                </div>`;
            }).join('');


            const statusEl = document.getElementById('overall-trend-status');
            if(trendArr.length >= 2) {
                let last = parseFloat(trendArr[trendArr.length - 1].avg);
                let prev = parseFloat(trendArr[trendArr.length - 2].avg);
                if(last > prev) {
                    statusEl.innerHTML = `<span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black shadow-sm border border-emerald-200"><i class="ph-bold ph-trend-up"></i> Tăng ${(last - prev).toFixed(2)} điểm</span>`;
                } else if (last < prev) {
                    statusEl.innerHTML = `<span class="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-black shadow-sm border border-red-200"><i class="ph-bold ph-trend-down"></i> Giảm ${(prev - last).toFixed(2)} điểm</span>`;
                } else {
                    statusEl.innerHTML = `<span class="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-black shadow-sm border border-slate-200">Giữ nguyên</span>`;
                }
            } else {
                statusEl.innerHTML = ''; 
            }
        }


        function openDeptModal(deptName) {
            const modalBody = document.getElementById('modal-dept-body');
            document.getElementById('modal-dept-title').innerText = deptName;
            

            let deptReviews = filteredDataGlobal.filter(row => {
                let score = parseFloat(row[deptName]);
                return !isNaN(score) && score >= 1 && score <= 5;
            }).sort((a,b) => getSafeTime(b[COL_DATE]) - getSafeTime(a[COL_DATE])); 

            document.getElementById('modal-dept-stats').innerText = `${deptReviews.length} lượt đánh giá trong kỳ`;

            if(deptReviews.length === 0) {
                modalBody.innerHTML = '<div class="text-center py-10 text-slate-400 font-bold">Chưa có khách hàng nào đánh giá phòng ban này.</div>';
            } else {
                modalBody.innerHTML = deptReviews.map(record => {
                    let dateStr = "Chưa rõ";
                    if(record[COL_DATE]) {
                        const d = new Date(record[COL_DATE]);
                        if(!isNaN(d.getTime())) dateStr = `${d.getHours()}:${d.getMinutes()} - ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
                    }
                    
                    let company = record[COL_COMPANY] || "Khách ẩn danh";
                    let repName = record[COL_REP] || "";
                    let score = parseFloat(record[deptName]);
                    let feedback = record[COL_FEEDBACK] ? `<div class="mt-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-sm text-slate-700 italic">" ${record[COL_FEEDBACK]} "</div>` : '';
                    
                    let isBad = score <= 3;
                    let badgeColor = isBad ? 'bg-red-100 text-red-600 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200';

                    return `
                    <div class="bg-white p-4 md:p-5 rounded-2xl border ${isBad ? 'border-red-200 shadow-sm' : 'border-slate-200'}">
                        <div class="flex justify-between items-start gap-3">
                            <div>
                                <h4 class="font-black text-slate-800 text-base">${company}</h4>
                                <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1"><i class="ph-bold ph-user"></i> ${repName} &bull; <i class="ph-bold ph-clock"></i> ${dateStr}</p>
                            </div>
                            <div class="${badgeColor} border px-3 py-1 rounded-xl text-lg font-black shrink-0">${score}/5</div>
                        </div>
                        ${feedback}
                    </div>`;
                }).join('');
            }

            // Bật Modal
            const modal = document.getElementById('dept-detail-modal');
            const box = document.getElementById('dept-detail-box');
            modal.classList.remove('hidden');
            setTimeout(() => { modal.classList.remove('opacity-0'); box.classList.remove('scale-95'); }, 10);
        }

        function closeDeptModal() {
            const modal = document.getElementById('dept-detail-modal');
            const box = document.getElementById('dept-detail-box');
            modal.classList.add('opacity-0'); box.classList.add('scale-95');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }


        function analyzeDashboard(data) {
            document.getElementById('dash-total-reviews').innerText = data.length;
            if(data.length === 0) {
                document.getElementById('dash-dept-grid').innerHTML = ''; document.getElementById('dash-worst-dept').innerText = 'Không có dữ liệu'; return;
            }

            let stats = {}; DEPARTMENTS.forEach(dep => stats[dep] = { sum: 0, count: 0, scores: {1:0, 2:0, 3:0, 4:0, 5:0} });
            data.forEach(row => {
                DEPARTMENTS.forEach(dep => {
                    let score = parseFloat(row[dep]);
                    if (!isNaN(score) && score >= 1 && score <= 5) { stats[dep].sum += score; stats[dep].count++; stats[dep].scores[Math.round(score)]++; }
                });
            });

            let rankingArr = [];
            for (let dep in stats) {
                let avg = stats[dep].count > 0 ? (stats[dep].sum / stats[dep].count) : 0;
                rankingArr.push({ name: dep, avg: avg.toFixed(2), count: stats[dep].count, dist: stats[dep].scores });
            }
            rankingArr.sort((a, b) => parseFloat(a.avg) - parseFloat(b.avg));

            const worstDept = rankingArr.find(d => parseFloat(d.avg) > 0);
            if (worstDept) document.getElementById('dash-worst-dept').innerHTML = `${worstDept.name} <span class="text-lg font-bold text-red-600 bg-white px-2 py-0.5 rounded-lg ml-2 shadow-sm border border-red-100">${worstDept.avg} điểm</span>`;


            document.getElementById('dash-dept-grid').innerHTML = rankingArr.map(dept => {
                if(dept.count === 0) return '';
                let avgNum = parseFloat(dept.avg); let isDanger = avgNum <= 3.5;
                let bgHeader = isDanger ? 'bg-red-50' : 'bg-slate-50'; let textHeader = isDanger ? 'text-red-700' : 'text-slate-800';
                
                let distHTML = [5,4,3,2,1].map(star => {
                    let pct = dept.count > 0 ? (dept.dist[star] / dept.count) * 100 : 0;
                    let color = star >= 4 ? 'bg-emerald-400' : (star === 3 ? 'bg-amber-400' : 'bg-red-400');
                    return `<div class="flex items-center gap-2 mb-1.5"><div class="w-4 text-[10px] font-bold text-slate-400">${star} <i class="ph-fill ph-star text-amber-400"></i></div><div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div class="${color} h-full rounded-full" style="width: ${pct}%"></div></div><div class="w-6 text-[10px] font-bold text-slate-500 text-right">${dept.dist[star]}</div></div>`;
                }).join('');


                return `
                <div onclick="openDeptModal('${dept.name}')" class="bg-white rounded-[2rem] border ${isDanger ? 'border-red-300 shadow-md shadow-red-100' : 'border-slate-200 shadow-sm hover:border-brand-300 hover:shadow-lg'} overflow-hidden cursor-pointer transition-all transform hover:-translate-y-1 group">
                    <div class="${bgHeader} px-6 py-4 border-b ${isDanger ? 'border-red-200' : 'border-slate-100'} flex justify-between items-center group-hover:bg-brand-50 transition-colors">
                        <h4 class="font-black ${textHeader} group-hover:text-brand-700 text-base tracking-tight">${dept.name}</h4>
                        <div class="text-2xl font-black ${textHeader} group-hover:text-brand-700">${dept.avg} <span class="text-xs font-bold text-slate-400">/ 5</span></div>
                    </div>
                    <div class="p-6">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-between"><span>Tỷ lệ điểm số</span> <span class="bg-slate-100 px-2 rounded-md">${dept.count} lượt</span></p>
                        ${distHTML}
                        <div class="mt-4 text-center text-[10px] font-black text-brand-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Click xem chi tiết <i class="ph-bold ph-arrow-right"></i></div>
                    </div>
                </div>`;
            }).join('');
        }

        function renderPage() {
            const container = document.getElementById('report-container');
            const pagination = document.getElementById('pagination-container');
            if (sortedCompanies.length === 0) { container.innerHTML = '<div class="text-center py-20 font-bold text-slate-500">Không có đánh giá nào.</div>'; pagination.innerHTML = ''; return; }
            const viewedRecords = JSON.parse(localStorage.getItem('tqc_viewed_feedbacks') || '[]');
            const startIndex = (currentPage - 1) * itemsPerPage; const endIndex = startIndex + itemsPerPage;
            const companiesToShow = sortedCompanies.slice(startIndex, endIndex);

            container.innerHTML = companiesToShow.map((companyName, idx) => {
                const records = currentGroupedData[companyName];
                let hasBadScoreOverall = false; let hasNewUnread = false; 
                const latestTimestamp = Math.max(...records.map(r => getSafeTime(r[COL_DATE])));
                const groupId = `grp_${companyName}_${latestTimestamp}`.replace(/\s+/g, '_');
                if (!viewedRecords.includes(groupId)) hasNewUnread = true;

                const detailsHTML = records.map(record => {
                    let dateStr = "Chưa rõ thời gian";
                    if(record[COL_DATE]) { const d = new Date(record[COL_DATE]); if(!isNaN(d.getTime())) dateStr = `${d.getHours()}:${d.getMinutes()} - ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`; }
                    const repName = record[COL_REP] || "Không tên";
                    let scoreBarsHTML = ""; let commentsHTML = "";

                    for (let key in record) {
                        if (key === COL_COMPANY || key === COL_DATE || key === COL_REP || !record[key]) continue;
                        let val = record[key];

                        if (key.startsWith('P. ') || key === 'Mức độ giới thiệu') {
                            let score = parseFloat(val) || 0; let isBad = score > 0 && score <= 3; 
                            if (isBad && key !== 'Mức độ giới thiệu') hasBadScoreOverall = true; 
                            let barColor = isBad ? 'bg-red-500' : 'bg-emerald-500'; let textColor = isBad ? 'text-red-600' : 'text-emerald-700';
                            scoreBarsHTML += `<div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-2"><div class="flex justify-between items-center mb-1.5"><span class="text-[11px] font-bold text-slate-600">${key.replace('P. ', '')}</span><span class="text-xs font-black ${textColor}">${score}/5</span></div><div class="w-full bg-slate-200 rounded-full h-1"><div class="${barColor} h-1 rounded-full" style="width: ${(score/5)*100}%"></div></div></div>`;
                        } else {
                           commentsHTML += `<div class="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-3"><p class="text-[10px] font-black text-blue-600 uppercase mb-1">${key}</p><p class="text-sm text-slate-700 font-medium whitespace-pre-wrap">${val}</p></div>`;
                        }
                    }
                    return `<div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm mb-4"><div class="font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">${repName} <span class="text-xs text-slate-400 font-normal ml-2">${dateStr}</span></div><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div>${scoreBarsHTML}</div><div>${commentsHTML}</div></div></div>`;
                }).join('');

                let badScoreBadge = hasBadScoreOverall ? `<span class="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-black uppercase shadow-sm">Điểm thấp</span>` : '';
                let newBadge = hasNewUnread ? `<span id="badge-${groupId}" class="bg-rose-500 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase animate-pulse shadow-sm">Mới</span>` : '';
                let glowClass = hasBadScoreOverall ? 'bad-score-glow border-red-200' : 'hover:border-brand-300';

                return `<div class="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden group/acc ${glowClass}"><button onclick="toggleAccordionAndMarkRead('acc-${idx}', '${groupId}')" class="w-full flex items-center justify-between p-5 bg-white hover:bg-slate-50 border-b border-transparent"><div class="flex items-center gap-4 text-left"><div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl text-white ${hasBadScoreOverall ? 'bg-red-500' : 'bg-slate-800'} shrink-0"><i class="ph-fill ph-buildings"></i></div><div><div class="flex items-center gap-2 flex-wrap"><h2 class="text-lg font-black text-slate-800 tracking-tight">${companyName}</h2>${newBadge}${badScoreBadge}</div><div class="text-[11px] text-slate-500 font-bold uppercase mt-1">${records.length} Phiếu đánh giá</div></div></div><i id="icon-acc-${idx}" class="ph-bold ph-caret-down text-slate-500 caret-icon text-lg"></i></button><div id="acc-${idx}" class="accordion-content bg-slate-50/50 px-4 border-t border-slate-100">${detailsHTML}</div></div>`;
            }).join('');
            renderPaginationControls(sortedCompanies.length);
        }

        function renderPaginationControls(totalItems) {
            const pagination = document.getElementById('pagination-container');
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            if (totalPages <= 1) { pagination.innerHTML = ''; return; }
            let html = `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100"><i class="ph-bold ph-caret-left"></i></button>`;
            for(let i = 1; i <= totalPages; i++) html += `<button onclick="changePage(${i})" class="w-10 h-10 flex items-center justify-center rounded-xl font-bold ${i === currentPage ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}">${i}</button>`;
            html += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100"><i class="ph-bold ph-caret-right"></i></button>`;
            pagination.innerHTML = html;
        }

        window.changePage = function(newPage) { currentPage = newPage; renderPage(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        window.toggleAccordionAndMarkRead = function(cId, gId) {
            document.getElementById(cId).classList.toggle('open'); document.getElementById('icon-' + cId).classList.toggle('open');
            const badge = document.getElementById('badge-' + gId);
            if (badge) { badge.remove(); let viewed = JSON.parse(localStorage.getItem('tqc_viewed_feedbacks') || '[]'); if (!viewed.includes(gId)) { viewed.push(gId); localStorage.setItem('tqc_viewed_feedbacks', JSON.stringify(viewed)); } }
        }