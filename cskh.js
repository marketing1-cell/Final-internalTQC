const GAS_API_URL = "https://script.google.com/macros/s/AKfycbz37FrOdqepa-Xx8MezCYfQXzp0x0XnPhK0mL-AxFaa7K8b3gnTnKOgM8KaLlOgvTduBA/exec"; 
const COL_DATE = "Thời gian gửi"; 
const COL_COMPANY = "Tên Doanh Nghiệp"; 
const COL_REP = "Người Đại Diện Đánh Giá";
const COL_FEEDBACK = "Lý do & Góp ý cải thiện";
const DEPARTMENTS = ['P. Chứng từ', 'P. Khai báo', 'P. Giao nhận - Vận tải', 'P. C/O', 'P. Kinh doanh', 'P. Kế toán'];

let RAW_DATA = [];
let filteredDataGlobal = [];
let monthlyGroupedData = {}; 
let customerGroups = JSON.parse(localStorage.getItem('tqc_customer_groups') || '{}');

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return window.location.href = 'login.html';
    fetchDataFromSheet();
});

function toggleMobileMenu() {
    document.getElementById('mobile-menu').classList.toggle('hidden');
}


function switchTab(tab) {
    ['detail', 'dashboard', 'feedback'].forEach(t => {

        document.getElementById(`tab-content-${t}`).classList.add('hidden');
        

        const deskBtn = document.getElementById(`tab-btn-${t}`);
        if(deskBtn) deskBtn.className = "px-4 py-2 rounded-lg text-sm font-bold transition-all text-slate-500 hover:text-slate-700";
        
 
        const mobBtn = document.getElementById(`mob-tab-btn-${t}`);
        if(mobBtn) mobBtn.className = "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all text-slate-600 hover:bg-slate-50";
    });
    

    document.getElementById(`tab-content-${tab}`).classList.remove('hidden');
    

    const activeDesk = document.getElementById(`tab-btn-${tab}`);
    if(activeDesk) activeDesk.className = "px-4 py-2 rounded-lg text-sm font-bold transition-all bg-white text-brand-600 shadow-sm";
    

    const activeMob = document.getElementById(`mob-tab-btn-${tab}`);
    if(activeMob) activeMob.className = "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all bg-brand-50 text-brand-600";


    const mobileMenu = document.getElementById('mobile-menu');
    if(mobileMenu && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
    }
}

async function fetchDataFromSheet() {
    document.getElementById('loading-indicator').classList.remove('hidden');
    try {
        const response = await fetch(GAS_API_URL);
        const result = await response.json();
        if(result.status === 'success') { 
            RAW_DATA = result.data; 

            standardizeCompanyNames(); 
            
            applyFilter(); 
        }
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
    const groupVal = document.getElementById('filter-group').value;
    const custVal = document.getElementById('filter-customer').value;
    
    filteredDataGlobal = RAW_DATA; 

    const startDate = startVal ? new Date(startVal).setHours(0,0,0,0) : 0;
    const endDate = endVal ? new Date(endVal).setHours(23,59,59,999) : Infinity;
    
    filteredDataGlobal = RAW_DATA.filter(row => {
        const rowTime = getSafeTime(row[COL_DATE]);
        if (rowTime < startDate || rowTime > endDate) return false;
        
        const compName = row[COL_COMPANY] ? row[COL_COMPANY].trim() : "Khách Hàng Ẩn Danh";
        
  
        if (groupVal !== 'all') {
            const compGroup = customerGroups[compName] || 'vanglai';
            if (compGroup !== groupVal) return false;
        }

        if (custVal !== 'all' && compName !== custVal) return false;
        
        return true;
    });

    monthlyGroupedData = {}; 
    filteredDataGlobal.forEach(row => {
        let d = new Date(row[COL_DATE]);
        if (isNaN(d.getTime())) return;
        
        let m = String(d.getMonth() + 1).padStart(2, '0');
        let y = d.getFullYear();
        let folderName = `${m}-${y}`; 
        let sortKey = `${y}-${m}`; 

        if (!monthlyGroupedData[sortKey]) {
            monthlyGroupedData[sortKey] = { label: `THÁNG ${d.getMonth() + 1} - ${y}`, folderName: folderName, companies: {}, totalReviews: 0 };
        }

        let compName = row[COL_COMPANY] ? row[COL_COMPANY].trim() : "Khách Hàng Ẩn Danh";
        if (!monthlyGroupedData[sortKey].companies[compName]) monthlyGroupedData[sortKey].companies[compName] = [];
        
        monthlyGroupedData[sortKey].companies[compName].push(row);
        monthlyGroupedData[sortKey].totalReviews++;
    });

    renderMonthFolders(); 
    analyzeDashboard(filteredDataGlobal);
    analyzeCompanyTrend(filteredDataGlobal); 
    renderFeedbackSynthesis(filteredDataGlobal);
    
    if (typeof renderOverallDistribution === "function") renderOverallDistribution(filteredDataGlobal);
    if (typeof renderNPS === "function") renderNPS(filteredDataGlobal);
    if (typeof renderGroupPieChart === "function") renderGroupPieChart(filteredDataGlobal);
    if (typeof renderCustomerHeatmap === "function") renderCustomerHeatmap(filteredDataGlobal);
    
    if (document.getElementById('filter-customer').options.length <= 1) {
        populateFilterDropdowns();
    }
}


function renderMonthFolders() {
    const container = document.getElementById('report-container');
    document.getElementById('pagination-container').innerHTML = ''; 

    let sortedMonths = Object.keys(monthlyGroupedData).sort((a, b) => b.localeCompare(a)); 

    if (sortedMonths.length === 0) {
        container.innerHTML = '<div class="text-center py-20 font-bold text-slate-500">Không có đánh giá nào.</div>'; return;
    }

    const viewedRecords = JSON.parse(localStorage.getItem('tqc_viewed_feedbacks') || '[]');
    

  let html = `
    <div class="flex justify-end mb-6 relative group z-20">

        <button class="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-emerald-500/20 transition-all cursor-default">
            <i class="ph-bold ph-download-simple text-xl"></i> Down ALL
            <i class="ph-bold ph-caret-down ml-1"></i>
        </button>

        <div class="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 overflow-hidden flex flex-col">
            <button onclick="downloadAllAsZip()" class="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 border-b border-slate-100 transition-colors text-left">
                <i class="ph-bold ph-file-zip text-lg text-emerald-500"></i>
                <span>Tải từng tháng (File ZIP)</span>
            </button>
            <button onclick="downloadAllAsSingleExcel()" class="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-left">
                <i class="ph-bold ph-file-xls text-lg text-emerald-500"></i>
                <span>Tải gộp 1 file Excel tổng</span>
            </button>
        </div>
    </div>`;

    sortedMonths.forEach((monthKey, folderIdx) => {
        const monthData = monthlyGroupedData[monthKey];
        

        let sortedCompanyNames = Object.keys(monthData.companies).sort((compA, compB) => {
            let latestA = Math.max(...monthData.companies[compA].map(r => getSafeTime(r[COL_DATE])));
            let latestB = Math.max(...monthData.companies[compB].map(r => getSafeTime(r[COL_DATE])));
            return latestB - latestA; 
        });


        let companiesHtml = sortedCompanyNames.map((companyName, compIdx) => {
            const records = monthData.companies[companyName];
            

            records.sort((a, b) => getSafeTime(b[COL_DATE]) - getSafeTime(a[COL_DATE]));

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
            let uniqueAccId = `acc-${folderIdx}-${compIdx}`;

            return `
            <div class="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden group/acc ${glowClass} mb-4">
                <button onclick="toggleAccordionAndMarkRead('${uniqueAccId}', '${groupId}')" class="w-full flex items-center justify-between p-5 bg-white hover:bg-slate-50 border-b border-transparent">
                    <div class="flex items-center gap-4 text-left">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl text-white ${hasBadScoreOverall ? 'bg-red-500' : 'bg-slate-800'} shrink-0"><i class="ph-fill ph-buildings"></i></div>
                        <div>
                            <div class="flex items-center gap-2 flex-wrap"><h2 class="text-lg font-black text-slate-800 tracking-tight">${companyName}</h2>${newBadge}${badScoreBadge}</div>
                            <div class="text-[11px] text-slate-500 font-bold uppercase mt-1">${records.length} Phiếu đánh giá</div>
                        </div>
                    </div>
                    <i id="icon-${uniqueAccId}" class="ph-bold ph-caret-down text-slate-500 caret-icon text-lg"></i>
                </button>
                <div id="${uniqueAccId}" class="accordion-content bg-slate-50/50 px-4 border-t border-slate-100">${detailsHTML}</div>
            </div>`;
        }).join('');

        html += `
        <div class="month-block mb-10 bg-slate-50 p-2 rounded-3xl border border-slate-200 transition-all duration-500">
            
            <div class="flex flex-col md:flex-row md:items-center justify-between bg-slate-800 text-white px-6 py-4 rounded-3xl shadow-lg cursor-pointer hover:bg-slate-900 transition-colors" onclick="toggleMonthFolder('folder-content-${monthKey}', 'folder-icon-${monthKey}')">
                <div class="flex items-center gap-3">
                    <i class="ph-fill ph-folder-open text-amber-400 text-3xl"></i>
                    <div>
                        <h2 class="text-lg font-black tracking-wider uppercase">${monthData.label}</h2>
                        <span class="text-xs font-medium text-slate-300">${monthData.totalReviews} lượt đánh giá trong tháng</span>
                    </div>
                </div>
                <div class="flex items-center gap-3 mt-4 md:mt-0">
                    <button onclick="event.stopPropagation(); downloadSingleExcel('${monthKey}')" class="flex justify-center items-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-300 px-3 py-2 rounded-xl transition-all shadow-sm hover:shadow group" title="Tải file Excel">
                        <i class="ph-bold ph-microsoft-excel-logo text-emerald-600 text-lg group-hover:scale-110 transition-transform"></i>
                        <i class="ph-bold ph-download-simple text-slate-400 group-hover:text-emerald-500 transition-colors text-sm"></i>
                    </button>
                    <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                        <i id="folder-icon-${monthKey}" class="ph-bold ph-caret-down text-xl transition-transform duration-300 -rotate-90"></i>
                    </div>
                </div>
            </div>
            
            <div id="folder-content-${monthKey}" class="month-content p-4 md:p-6 transition-all duration-300 hidden">
                ${companiesHtml}
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

window.toggleMonthFolder = function(contentId, iconId) {
    const content = document.getElementById(contentId);
    const icon = document.getElementById(iconId);
    

    content.classList.toggle('hidden');
    icon.classList.toggle('-rotate-90');


    const allBlocks = document.querySelectorAll('.month-block');
    let hasAnyOpen = false;


    allBlocks.forEach(block => {
        const contentDiv = block.querySelector('.month-content');
        if (contentDiv && !contentDiv.classList.contains('hidden')) {
            hasAnyOpen = true;
        }
    });


    allBlocks.forEach(block => {
        const contentDiv = block.querySelector('.month-content');
        
        if (hasAnyOpen) {

            if (contentDiv && !contentDiv.classList.contains('hidden')) {
                block.classList.remove('opacity-40', 'scale-[0.98]');
                block.classList.add('opacity-100');
            } else {

                block.classList.remove('opacity-100');
                block.classList.add('opacity-40', 'scale-[0.98]');
            }
        } else {

            block.classList.remove('opacity-40', 'scale-[0.98]');
            block.classList.add('opacity-100');
        }
    });
}


async function buildExcelBuffer(monthKey) {
    const data = monthlyGroupedData[monthKey];
    if(!data) return null;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(data.folderName);

    sheet.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Tên Doanh Nghiệp', key: 'company', width: 45 },
        { header: 'Người Đại Diện', key: 'rep', width: 22 },
        { header: 'Thời Gian', key: 'date', width: 18 },
        { header: 'P. Chứng Từ', key: 'p1', width: 13 },
        { header: 'P. Khai Báo', key: 'p2', width: 13 },
        { header: 'P. Giao Nhận', key: 'p3', width: 13 },
        { header: 'P. C/O', key: 'p4', width: 10 },
        { header: 'P. Kinh Doanh', key: 'p5', width: 13 },
        { header: 'P. Kế Toán', key: 'p6', width: 13 },
        { header: 'Mức Độ Giới Thiệu', key: 'p7', width: 17 },
        { header: 'Lý Do & Góp Ý Cải Thiện', key: 'feedback', width: 50 },
        { header: 'Cá Nhân Hài Lòng Nhất', key: 'best_person', width: 25 },
        { header: 'Cá Nhân Cần Cải Thiện', key: 'worst_person', width: 25 },
        { header: 'Thắc Mắc Thêm', key: 'more_info', width: 25 }
    ];


    sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; 
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });
    sheet.getRow(1).height = 35;

    const getCleanScore = (val) => {
        let num = parseFloat(val);
        return isNaN(num) ? '' : num;
    };

    let stt = 1;
    Object.keys(data.companies).forEach(compName => {
        data.companies[compName].forEach(row => {
            const r = sheet.addRow({
                stt: stt++,
                company: row[COL_COMPANY] || '',
                rep: row[COL_REP] || '',
                date: row[COL_DATE] ? new Date(row[COL_DATE]).toLocaleString('vi-VN') : '',
                p1: getCleanScore(row['P. Chứng từ']),
                p2: getCleanScore(row['P. Khai báo']),
                p3: getCleanScore(row['P. Giao nhận - Vận tải']),
                p4: getCleanScore(row['P. C/O']),
                p5: getCleanScore(row['P. Kinh doanh']),
                p6: getCleanScore(row['P. Kế toán']),
                p7: getCleanScore(row['Mức độ giới thiệu']),
                feedback: row[COL_FEEDBACK] || '',
                best_person: row['Cá nhân hài lòng nhất'] || '',
                worst_person: row['Cá nhân cần cải thiện'] || '', 
                more_info: row['Thắc mắc thêm'] || '' 
            });

            let hasBadScore = false;
            

            [5,6,7,8,9,10,11].forEach(colIndex => {
                let cell = r.getCell(colIndex);
                let val = cell.value;
                if (val !== '') { 
                    if (val <= 2) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
                        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                        hasBadScore = true;
                    } else if (val === 3) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
                        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                        hasBadScore = true;
                    }
                }
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });


            if (hasBadScore) {
                let compCell = r.getCell(2);
                compCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; 
                compCell.font = { color: { argb: 'FFDC2626' }, bold: true }; 
            }
            

            [12, 13, 14, 15].forEach(colIndex => {
                r.getCell(colIndex).alignment = { wrapText: true, vertical: 'top' };
            });

            r.eachCell((cell) => {
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            });
        });
    });

    return await workbook.xlsx.writeBuffer();
}

window.downloadSingleExcel = async function(monthKey) {
    const buffer = await buildExcelBuffer(monthKey);
    if(buffer) {
        let fileName = `Danh_Gia_CSKH_${monthlyGroupedData[monthKey].folderName}.xlsx`;
        saveAs(new Blob([buffer]), fileName);
    }
}

window.downloadAllAsZip = async function() {
    const zip = new JSZip();
    let year = new Date().getFullYear();
    const rootFolder = zip.folder(`Báo Cáo CSKH TQC ${year}`);

    for (let monthKey in monthlyGroupedData) {
        let monthData = monthlyGroupedData[monthKey];
        let buffer = await buildExcelBuffer(monthKey);
        
        if (buffer) {
            let subFolder = rootFolder.folder(monthData.folderName);
            subFolder.file(`Danh_Gia_${monthData.folderName}.xlsx`, buffer);
        }
    }

    zip.generateAsync({type:"blob"}).then(function(content) {
        saveAs(content, `Bao_Cao_CSKH_TQC_${year}.zip`);
    });
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
                monthlyData[monthKey].sum += score; monthlyData[monthKey].count++;
            }
        });
    });

    let trendArr = Object.keys(monthlyData).map(key => ({
        month: key, avg: monthlyData[key].count > 0 ? (monthlyData[key].sum / monthlyData[key].count).toFixed(2) : 0, timestamp: monthlyData[key].timestamp
    })).filter(item => item.avg > 0).sort((a, b) => a.timestamp - b.timestamp);

    if(trendArr.length === 0) { trendContainer.innerHTML = '<p class="text-slate-400">Không có điểm số hợp lệ.</p>'; return; }

    trendContainer.innerHTML = trendArr.map((item, index) => {
        let percent = (item.avg / 5) * 100;

        let isLast = index === trendArr.length - 1;
        let barColor = isLast ? 'bg-slate-800' : 'bg-slate-200 hover:bg-slate-300';
        let textColor = isLast ? 'text-slate-800 font-black' : 'text-slate-400 font-bold';
        
        return `<div class="relative flex flex-col items-center justify-end h-full w-12 md:w-16 group chart-bar cursor-pointer"><div class="chart-tooltip absolute -top-10 bg-white border border-slate-200 text-slate-800 text-[10px] font-black px-3 py-1.5 rounded-xl opacity-0 invisible transition-all z-10 shadow-xl whitespace-nowrap">${item.avg} Điểm</div><div class="text-[10px] ${textColor} mb-2 transition-colors">${item.avg}</div><div class="w-full ${barColor} rounded-t-lg transition-all duration-500" style="height: ${percent}%;"></div><div class="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-wider">${item.month}</div></div>`;
    }).join('');

    const statusEl = document.getElementById('overall-trend-status');
    if(trendArr.length >= 2) {
        let last = parseFloat(trendArr[trendArr.length - 1].avg); let prev = parseFloat(trendArr[trendArr.length - 2].avg);
        if(last > prev) statusEl.innerHTML = `<span class="bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1"><i class="ph-bold ph-trend-up text-emerald-500"></i> Tăng ${(last - prev).toFixed(2)} điểm</span>`;
        else if (last < prev) statusEl.innerHTML = `<span class="bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1"><i class="ph-bold ph-trend-down text-red-500"></i> Giảm ${(prev - last).toFixed(2)} điểm</span>`;
        else statusEl.innerHTML = `<span class="bg-slate-50 text-slate-500 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200">Giữ nguyên</span>`;
    } else statusEl.innerHTML = ''; 
}

function openDeptModal(deptName) { 
    const modalBody = document.getElementById('modal-dept-body');
    const modalTitle = document.getElementById('modal-dept-title');
    const modalStats = document.getElementById('modal-dept-stats');
    const modal = document.getElementById('dept-detail-modal'); 
    const box = document.getElementById('dept-detail-box');

    if (!modal || !modalBody || !modalTitle || !modalStats || !box) {
        alert("Lỗi hiển thị: Không tìm thấy khung HTML của Modal 'Chi tiết phòng ban'! Vui lòng kiểm tra lại file bao-cao-cskh.html.");
        return;
    }

    modalTitle.innerText = deptName;
    let deptReviews = filteredDataGlobal.filter(row => { 
        let score = parseFloat(row[deptName]); 
        return !isNaN(score) && score >= 1 && score <= 5; 
    }).sort((a,b) => getSafeTime(b[COL_DATE]) - getSafeTime(a[COL_DATE])); 
    
    modalStats.innerText = `${deptReviews.length} lượt đánh giá trong kỳ`;

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

            return `<div class="bg-white p-4 md:p-5 rounded-2xl border ${isBad ? 'border-red-200 shadow-sm' : 'border-slate-200'}"><div class="flex justify-between items-start gap-3"><div><h4 class="font-black text-slate-800 text-base">${company}</h4><p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1"><i class="ph-bold ph-user"></i> ${repName} &bull; <i class="ph-bold ph-clock"></i> ${dateStr}</p></div><div class="${badgeColor} border px-3 py-1 rounded-xl text-lg font-black shrink-0">${score}/5</div></div>${feedback}</div>`;
        }).join('');
    }
    
    modal.classList.remove('hidden'); 
    setTimeout(() => { 
        modal.classList.remove('opacity-0'); 
        box.classList.remove('scale-95'); 
    }, 10);
}

function closeDeptModal() {
    const modal = document.getElementById('dept-detail-modal'); const box = document.getElementById('dept-detail-box');
    modal.classList.add('opacity-0'); box.classList.add('scale-95'); setTimeout(() => modal.classList.add('hidden'), 300);
}

function analyzeDashboard(data) {
    document.getElementById('dash-total-reviews').innerText = data.length;
    if(data.length === 0) { document.getElementById('dash-dept-grid').innerHTML = ''; document.getElementById('dash-worst-dept').innerText = 'Không có dữ liệu'; return; }

    let stats = {}; DEPARTMENTS.forEach(dep => stats[dep] = { sum: 0, count: 0, scores: {1:0, 2:0, 3:0, 4:0, 5:0} });
    data.forEach(row => { DEPARTMENTS.forEach(dep => { let score = parseFloat(row[dep]); if (!isNaN(score) && score >= 1 && score <= 5) { stats[dep].sum += score; stats[dep].count++; stats[dep].scores[Math.round(score)]++; } }); });

    let rankingArr = [];
    for (let dep in stats) { let avg = stats[dep].count > 0 ? (stats[dep].sum / stats[dep].count) : 0; rankingArr.push({ name: dep, avg: avg.toFixed(2), count: stats[dep].count, dist: stats[dep].scores }); }
    rankingArr.sort((a, b) => parseFloat(a.avg) - parseFloat(b.avg));

    const worstDept = rankingArr.find(d => parseFloat(d.avg) > 0);
    if (worstDept) document.getElementById('dash-worst-dept').innerHTML = `${worstDept.name} <span class="text-lg font-bold text-red-600 bg-white px-2 py-0.5 rounded-lg ml-2 shadow-sm border border-red-100">${worstDept.avg} điểm</span>`;
    
    let custStats = {};
    data.forEach(row => {
        let comp = row[COL_COMPANY] || "Khách Hàng Ẩn Danh";
        if (!custStats[comp]) custStats[comp] = { sum: 0, count: 0 };
        DEPARTMENTS.forEach(dep => {
            let score = parseFloat(row[dep]);
            if (!isNaN(score) && score >= 1 && score <= 5) {
                custStats[comp].sum += score;
                custStats[comp].count++;
            }
        });
    });

    let rankingCust = [];
    for (let comp in custStats) {
        if (custStats[comp].count > 0) {
            rankingCust.push({ name: comp, avg: (custStats[comp].sum / custStats[comp].count).toFixed(2) });
        }
    }

    rankingCust.sort((a, b) => parseFloat(a.avg) - parseFloat(b.avg));
    

    let bottom3Cust = rankingCust.slice(0, 3);
    const alertCustContainer = document.getElementById('alert-cust-content');
    
    if (bottom3Cust.length > 0) {
        let htmlCust = `<p class="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Báo động Đỏ: Top Khách hàng điểm thấp</p><div class="flex flex-wrap gap-2">`;
        bottom3Cust.forEach(c => {
            htmlCust += `<span class="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-xl text-xs md:text-sm font-bold shadow-sm">${c.name}: ${c.avg}</span>`;
        });
        htmlCust += `</div>`;
        alertCustContainer.innerHTML = htmlCust;
    } else {
        alertCustContainer.innerHTML = `<p class="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Báo động Đỏ: Top Khách hàng điểm thấp</p><p class="text-lg font-black text-red-600 mt-1">Chưa có dữ liệu</p>`;
    }

    document.getElementById('dash-dept-grid').innerHTML = rankingArr.map(dept => {
        if(dept.count === 0) return '';
        let avgNum = parseFloat(dept.avg); 
        let isDanger = avgNum <= 3.5;
        

        let cardClass = isDanger ? 'border-red-200 shadow-sm' : 'border-slate-200 shadow-sm';
        let titleColor = isDanger ? 'text-red-600' : 'text-slate-800';
        
        let distHTML = [5,4,3,2,1].map(star => {
            let pct = dept.count > 0 ? (dept.dist[star] / dept.count) * 100 : 0;
            let barColor = 'bg-slate-700';
            if (star <= 2 && dept.dist[star] > 0) barColor = 'bg-red-400';

            return `<div class="flex items-center gap-3 mb-2"><div class="w-6 text-[11px] font-bold text-slate-400 flex items-center justify-between">${star} <i class="ph-fill ph-star text-slate-300"></i></div><div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="${barColor} h-full rounded-full" style="width: ${pct}%"></div></div><div class="w-6 text-[10px] font-bold text-slate-500 text-right">${dept.dist[star]}</div></div>`;
        }).join('');

        return `<div onclick="openDeptModal('${dept.name}')" class="bg-white rounded-[2rem] border ${cardClass} overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-slate-300 group"><div class="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-transparent"><h4 class="font-black ${titleColor} text-sm uppercase tracking-wider">${dept.name}</h4><div class="text-xl font-black ${titleColor}">${dept.avg} <span class="text-[10px] font-bold text-slate-400">/ 5</span></div></div><div class="p-6"><div class="flex items-center justify-between mb-4"><span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tỷ lệ điểm</span><span class="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">${dept.count} lượt</span></div>${distHTML}</div></div>`;
    }).join('');
}

function renderFeedbackSynthesis(data) {
    const listBest = document.getElementById('list-cat-best');
    const listWorst = document.getElementById('list-cat-worst');
    const listSug = document.getElementById('list-cat-sug');

    let htmlBest = ''; let htmlWorst = ''; let htmlSug = '';
    let countBest = 0; let countWorst = 0; let countSug = 0;

    const createScrollCard = (text, companyName, date, themeColor) => {
        let themeClasses = {
            'emerald': 'border-emerald-200 text-emerald-900 bg-emerald-50/50',
            'rose': 'border-rose-200 text-rose-900 bg-rose-50/50',
            'blue': 'border-blue-200 text-blue-900 bg-blue-50/50'
        };
        return `
        <div class="w-[280px] md:w-[320px] h-[350px] shrink-0 snap-start p-5 rounded-2xl border ${themeClasses[themeColor]} flex flex-col shadow-sm">
            
            <div class="flex-1 overflow-y-auto pr-2 mb-4">
                <p class="text-sm font-semibold leading-relaxed break-words">"${text}"</p>
            </div>

            <div class="pt-4 border-t border-slate-200/60 mt-auto shrink-0">
                <span class="text-[10px] md:text-[11px] font-black uppercase text-slate-600 tracking-wider flex items-start gap-1.5 leading-tight"><i class="ph-fill ph-buildings text-sm mt-0.5"></i> ${companyName}</span>
                <span class="text-[10px] font-bold text-slate-400 pl-5 mt-1 block">${date}</span>
            </div>
        </div>`;
    };

    data.forEach(row => {
        let compName = row[COL_COMPANY] || "Khách Hàng Ẩn Danh";
        let dateStr = row[COL_DATE] ? new Date(row[COL_DATE]).toLocaleDateString('vi-VN') : '';

        let khen = row['Cá nhân hài lòng nhất'];
        let che = row['Cá nhân cần cải thiện'];
        let gopy = row[COL_FEEDBACK];

        if (khen && khen.trim() !== '') { htmlBest += createScrollCard(khen, compName, dateStr, 'emerald'); countBest++; }
        if (che && che.trim() !== '') { htmlWorst += createScrollCard(che, compName, dateStr, 'rose'); countWorst++; }
        if (gopy && gopy.trim() !== '') { htmlSug += createScrollCard(gopy, compName, dateStr, 'blue'); countSug++; }
    });

    const emptyState = `<div class="w-full text-center py-10 text-sm font-bold text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">Không có ghi nhận nào trong khoảng thời gian này</div>`;
    
    listBest.innerHTML = htmlBest || emptyState; document.getElementById('count-best').innerText = `${countBest} đánh giá`;
    listWorst.innerHTML = htmlWorst || emptyState; document.getElementById('count-worst').innerText = `${countWorst} đánh giá`;
    listSug.innerHTML = htmlSug || emptyState; document.getElementById('count-sug').innerText = `${countSug} đánh giá`;

    switchFeedbackCategory('best');
}
window.switchFeedbackCategory = function(cat) {
    const categories = ['best', 'worst', 'sug'];
    const activeColors = { 'best': 'border-emerald-500 bg-emerald-50', 'worst': 'border-rose-500 bg-rose-50', 'sug': 'border-blue-500 bg-blue-50' };

    categories.forEach(c => {
        const listEl = document.getElementById(`list-cat-${c}`);
        if (c === cat) { listEl.classList.remove('hidden'); } 
        else { listEl.classList.add('hidden'); }

        const btnEl = document.getElementById(`btn-cat-${c}`);
        if (c === cat) {
            btnEl.classList.add('active');
            btnEl.classList.remove('border-slate-200', 'bg-white');
            btnEl.classList.add(...activeColors[c].split(' '));
        } else {
            btnEl.classList.remove('active');
            btnEl.classList.remove(...activeColors[c].split(' '));
            btnEl.classList.add('border-slate-200', 'bg-white');
        }
    });
}



function renderOverallDistribution(data) {
    let globalStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0 };
    
    data.forEach(row => {
        DEPARTMENTS.forEach(dep => {
            let score = parseFloat(row[dep]);
            if (!isNaN(score) && score >= 1 && score <= 5) {
                globalStats[Math.round(score)]++; globalStats.total++;
            }
        });
    });

    const container = document.getElementById('dash-overall-distribution');
    if (globalStats.total === 0) { container.innerHTML = '<p class="text-slate-400 font-medium">Chưa có dữ liệu.</p>'; return; }

    let good = globalStats[5] + globalStats[4];
    let neutral = globalStats[3];
    let bad = globalStats[2] + globalStats[1];

    let pctGood = ((good / globalStats.total) * 100).toFixed(1);
    let pctNeutral = ((neutral / globalStats.total) * 100).toFixed(1);
    let pctBad = ((bad / globalStats.total) * 100).toFixed(1);

    container.innerHTML = `
        <div class="space-y-4">
            <div>
                <div class="flex items-center justify-between mb-1.5"><span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tốt (4-5 <i class="ph-fill ph-star text-slate-300"></i>)</span><span class="text-sm font-black text-slate-800">${pctGood}%</span></div>
                <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex"><div class="bg-slate-800 h-full transition-all duration-1000" style="width: ${pctGood}%"></div></div>
            </div>
            <div>
                <div class="flex items-center justify-between mb-1.5"><span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tạm (3 <i class="ph-fill ph-star text-slate-300"></i>)</span><span class="text-sm font-black text-slate-600">${pctNeutral}%</span></div>
                <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex"><div class="bg-slate-300 h-full transition-all duration-1000" style="width: ${pctNeutral}%"></div></div>
            </div>
            <div>
                <div class="flex items-center justify-between mb-1.5"><span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kém (1-2 <i class="ph-fill ph-star text-slate-300"></i>)</span><span class="text-sm font-black text-red-500">${pctBad}%</span></div>
                <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex"><div class="bg-red-400 h-full transition-all duration-1000" style="width: ${pctBad}%"></div></div>
            </div>
        </div>
        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6 pt-4 border-t border-slate-100 text-center">Dựa trên ${globalStats.total} lượt đánh giá</p>
    `;
}


function standardizeCompanyNames() {

    let uniqueRawNames = [...new Set(RAW_DATA.map(r => r[COL_COMPANY]).filter(Boolean))];
    let clusters = [];

    const getCore = (str) => {
        let n = str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
        const terms = ["cong ty", "cty", "tnhh", "co phan", "cp", "tap doan", "viet nam", "vn", "co., ltd", "ltd"];
        terms.forEach(t => { n = n.replace(new RegExp(`\\b${t}\\b`, 'gi'), ' '); });
        return n.replace(/[^a-z0-9]/gi, ' ').replace(/\s+/g, ' ').trim();
    };


    uniqueRawNames.forEach(raw => {
        let core = getCore(raw);
        if (!core) return; 
        
        let found = clusters.find(c => {
            if (c.core === core) return true;
            if (c.core.length >= 4 && core.length >= 4) {
                return new RegExp(`\\b${core}\\b`, 'i').test(c.core) || new RegExp(`\\b${c.core}\\b`, 'i').test(core);
            }
            return false;
        });

        if (found) {
            found.raws.push(raw);

            if (raw.length > found.display.length) found.display = raw.toUpperCase().trim();

            if (core.length < found.core.length && core.length >= 4) found.core = core;
        } else {

            clusters.push({ core: core, display: raw.toUpperCase().trim(), raws: [raw] });
        }
    });

    let clusterMap = {};
    clusters.forEach(c => {
        c.raws.forEach(r => { clusterMap[r] = c.display; });
    });


    RAW_DATA.forEach(row => {
        let rawComp = row[COL_COMPANY];
        if (rawComp && clusterMap[rawComp]) {
            row[COL_COMPANY] = clusterMap[rawComp]; 
        } else if (rawComp) {
            row[COL_COMPANY] = rawComp.toUpperCase().trim();
        }
    });
}


function renderCustomerHeatmap(data) {
    const container = document.getElementById('customer-heatmap-container');
    if (data.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-sm font-medium w-full text-center mt-10 p-4">Chưa có dữ liệu để vẽ bản đồ nhiệt.</p>';
        return;
    }

    let heatData = {};
    let monthsSet = new Set();


    data.forEach(row => {
        let comp = row[COL_COMPANY] || "Khách Hàng Ẩn Danh";
        let d = new Date(row[COL_DATE]);
        if (isNaN(d.getTime())) return;
        
        let monthKey = `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
        let timestamp = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
        
        monthsSet.add(JSON.stringify({key: monthKey, ts: timestamp}));
        
        if (!heatData[comp]) heatData[comp] = {};
        if (!heatData[comp][monthKey]) heatData[comp][monthKey] = { sum: 0, count: 0 };
        
        DEPARTMENTS.forEach(dep => {
            let score = parseFloat(row[dep]);
            if (!isNaN(score) && score >= 1 && score <= 5) {
                heatData[comp][monthKey].sum += score;
                heatData[comp][monthKey].count++;
            }
        });
    });

    let sortedMonths = Array.from(monthsSet)
        .map(m => JSON.parse(m))
        .sort((a,b) => a.ts - b.ts)
        .map(m => m.key);
    
    if (sortedMonths.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-sm p-4 text-center">Không có dữ liệu thời gian hợp lệ.</p>';
        return;
    }

    let tableHTML = `<table class="w-full text-left border-collapse text-sm min-w-max">
        <thead class="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
                <th class="p-3 font-black text-slate-600 border-b border-slate-200 sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Khách hàng</th>`;
    
    sortedMonths.forEach(m => {
        tableHTML += `<th class="p-3 font-black text-slate-600 border-b border-slate-200 text-center w-20">${m}</th>`;
    });
    tableHTML += `</tr></thead><tbody class="divide-y divide-slate-100">`;


    let sortedCompanies = Object.keys(heatData).sort();

    sortedCompanies.forEach(comp => {
        tableHTML += `<tr><td class="p-3 font-bold text-slate-700 max-w-[200px] truncate sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" title="${comp}">${comp}</td>`;
        
        sortedMonths.forEach(m => {
            let cellData = heatData[comp][m];
            if (cellData && cellData.count > 0) {
                let avg = (cellData.sum / cellData.count).toFixed(1);
                
                let bgClass = '';
                if (avg < 3) bgClass = 'bg-red-500 text-white shadow-inner'; 
                else if (avg < 4) bgClass = 'bg-orange-400 text-white shadow-sm'; 
                else bgClass = 'bg-emerald-500 text-white shadow-sm';
                
                tableHTML += `<td class="p-1.5">
                    <div class="w-full h-full py-1.5 text-center rounded-lg font-bold text-xs ${bgClass} transition-transform hover:scale-110 cursor-default" title="${comp} - ${m}: ${avg} điểm">
                        ${avg}
                    </div>
                </td>`;
            } else {
                tableHTML += `<td class="p-1.5"><div class="w-full h-full py-1.5 text-center rounded-lg bg-slate-50 text-slate-300 font-medium text-xs">-</div></td>`;
            }
        });
        tableHTML += `</tr>`;
    });

    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}

async function summarizeFeedbackWithAI() {
    let feedbackText = "";
    filteredDataGlobal.forEach(row => {
        let khen = row['Cá nhân hài lòng nhất'] || "";
        let che = row['Cá nhân cần cải thiện'] || "";
        let gopy = row['Lý do & Góp ý cải thiện'] || "";
        
        if (khen.trim() !== '' || che.trim() !== '' || gopy.trim() !== '') {
            feedbackText += `- Khen: ${khen}. Phàn nàn: ${che}. Góp ý: ${gopy}\n`;
        }
    });

    if (!feedbackText.trim()) {
        alert("Không có dữ liệu ý kiến trong khoảng thời gian này để AI phân tích.");
        return;
    }

    const resultBox = document.getElementById('ai-summary-result');
    resultBox.classList.remove('hidden');
    resultBox.innerHTML = '<div class="flex items-center justify-center py-6 text-cyan-400 animate-pulse font-bold"><i class="ph-bold ph-spinner animate-spin text-3xl mr-3"></i> T-Logi AI đang phân tích dữ liệu chuyên sâu...</div>';

 const endpoint = `https://backend-cskh-p9fj.onrender.com/api/analyze`;
    
    const prompt = `Bạn là Giám đốc Chăm Sóc Khách hàng . Dưới đây là các ý kiến phản hồi thô của khách hàng. Hãy phân tích và trả về kết quả bằng tiếng Việt, trình bày bằng thẻ HTML cơ bản (<b>, <br>) để hiển thị web. Không dùng Markdown.
    Cấu trúc bắt buộc:
    <b>1. Tóm tắt chung:</b> (đánh giá tình hình chung chỉ một đoạn ngắn trong tầm 80 chữ đổ lại, nêu rõ mức độ hài lòng chung của khách hàng và xu hướng hiện tại)
    <b>2. Nguyên nhân cốt lõi:</b> (Liệt kê các nguyên nhân chính gây phàn nàn)
    <b>3. Đề xuất giải pháp:</b> (gợi ý hành động và giải pháp cụ thể công ty cần làm để tối ưu nhất)
    
    Dữ liệu:
    ${feedbackText}`;

    try {
        const response = await fetchWithRetry(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        
        if (response.status === 429) {
            resultBox.innerHTML = '<p class="text-amber-400 font-bold">Hệ thống AI đang bảo trì do vượt quá số lượng truy cập trong ngày. Vui lòng thử lại sau nhé!</p>';
            return;
        }

        const data = await response.json();
        
     if (data.error) {
            console.error("Lỗi chi tiết từ API:", data.error);
            resultBox.innerHTML = `<p class="text-red-400 font-bold">Lỗi từ máy chủ AI: ${data.error.message}</p>`;
            return;
        }
        
        if (data.candidates && data.candidates.length > 0) {
            const aiText = data.candidates[0].content.parts[0].text;
            resultBox.innerHTML = `
                <div class="text-sm leading-relaxed space-y-3 text-slate-200">
                    ${aiText.replace(/\n/g, '<br>')}
                </div>
            `;
        } else {
            resultBox.innerHTML = '<p class="text-amber-400 font-bold">Lỗi: AI từ chối trả lời do bộ lọc an toàn hoặc định dạng không hợp lệ.</p>';
        }
    } catch (error) {
        console.error(error);
        resultBox.innerHTML = '<p class="text-red-400 font-bold">Lỗi mạng Vui lòng kiểm tra kết nối internet hoặc liên hệ với admin Thịnh (P.Kinh Doanh) - email: marketing1@thongquan.com.vn .</p>';
    }
}

async function fetchWithRetry(url, options, retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        const response = await fetch(url, options);
        
        if (response.status !== 429) {
            return response; 
        }
        console.warn(`Hệ thống AI đang bận. Tự động thử lại lần ${i + 1} sau ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    return fetch(url, options);
}

window.toggleAccordionAndMarkRead = function(cId, gId) {
    document.getElementById(cId).classList.toggle('open'); document.getElementById('icon-' + cId).classList.toggle('open');
    const badge = document.getElementById('badge-' + gId);
    if (badge) { badge.remove(); let viewed = JSON.parse(localStorage.getItem('tqc_viewed_feedbacks') || '[]'); if (!viewed.includes(gId)) { viewed.push(gId); localStorage.setItem('tqc_viewed_feedbacks', JSON.stringify(viewed)); } }
}


window.downloadAllAsSingleExcel = async function() {

    if (!filteredDataGlobal || filteredDataGlobal.length === 0) {
        alert("Không có dữ liệu nào trong khoảng thời gian này để tải xuống!");
        return;
    }

    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Tong_Hop_Danh_Gia");


        sheet.columns = [
            { header: 'STT', key: 'stt', width: 6 },
            { header: 'Tên Doanh Nghiệp', key: 'company', width: 45 },
            { header: 'Người Đại Diện', key: 'rep', width: 22 },
            { header: 'Thời Gian', key: 'date', width: 18 },
            { header: 'P. Chứng Từ', key: 'p1', width: 13 },
            { header: 'P. Khai Báo', key: 'p2', width: 13 },
            { header: 'P. Giao Nhận', key: 'p3', width: 13 },
            { header: 'P. C/O', key: 'p4', width: 10 },
            { header: 'P. Kinh Doanh', key: 'p5', width: 13 },
            { header: 'P. Kế Toán', key: 'p6', width: 13 },
            { header: 'Mức Độ Giới Thiệu', key: 'p7', width: 17 },
            { header: 'Lý Do & Góp Ý Cải Thiện', key: 'feedback', width: 50 },
            { header: 'Cá Nhân Hài Lòng Nhất', key: 'best_person', width: 25 },
            { header: 'Cá Nhân Cần Cải Thiện', key: 'worst_person', width: 25 },
            { header: 'Thắc Mắc Thêm', key: 'more_info', width: 25 }
        ];


        sheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; 
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
        sheet.getRow(1).height = 35;

        const getCleanScore = (val) => {
            let num = parseFloat(val);
            return isNaN(num) ? '' : num;
        };

        let stt = 1;
        filteredDataGlobal.forEach(row => {
            const r = sheet.addRow({
                stt: stt++,
                company: row[COL_COMPANY] || '',
                rep: row[COL_REP] || '',
                date: row[COL_DATE] ? new Date(row[COL_DATE]).toLocaleString('vi-VN') : '',
                p1: getCleanScore(row['P. Chứng từ']),
                p2: getCleanScore(row['P. Khai báo']),
                p3: getCleanScore(row['P. Giao nhận - Vận tải']),
                p4: getCleanScore(row['P. C/O']),
                p5: getCleanScore(row['P. Kinh doanh']),
                p6: getCleanScore(row['P. Kế toán']),
                p7: getCleanScore(row['Mức độ giới thiệu']),
                feedback: row[COL_FEEDBACK] || '',
                best_person: row['Cá nhân hài lòng nhất'] || '',
                worst_person: row['Cá nhân cần cải thiện'] || '', 
                more_info: row['Thắc mắc thêm'] || '' 
            });

            let hasBadScore = false;
            

            [5,6,7,8,9,10,11].forEach(colIndex => {
                let cell = r.getCell(colIndex);
                let val = cell.value;
                if (val !== '') { 
                    if (val <= 2) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } }; 
                        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                        hasBadScore = true;
                    } else if (val === 3) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } }; 
                        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                        hasBadScore = true;
                    }
                }
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            if (hasBadScore) {
                let compCell = r.getCell(2);
                compCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; 
                compCell.font = { color: { argb: 'FFDC2626' }, bold: true }; 
            }

            [12, 13, 14, 15].forEach(colIndex => {
                r.getCell(colIndex).alignment = { wrapText: true, vertical: 'top' };
            });

            r.eachCell((cell) => {
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            });
        });


        const buffer = await workbook.xlsx.writeBuffer();
        let year = new Date().getFullYear();
        saveAs(new Blob([buffer]), `Bao_Cao_Tong_Hop_CSKH_TQC_${year}.xlsx`);

    } catch (error) {
        console.error("Lỗi khi tạo file Excel:", error);
        alert("Có lỗi xảy ra khi xuất dữ liệu. Vui lòng thử lại!");
    }
}

window.scrollFeedback = function(direction) {
    const containerBox = document.getElementById('feedback-horizontal-container');
    

    const activeList = containerBox.querySelector('div[id^="list-cat-"]:not(.hidden)');
    
    if (!activeList) return;

    const scrollAmount = 320; 
    
    if (direction === 'left') {
        activeList.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        activeList.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
};

function switchDashView(view) {
    const views = ['dept', 'cust'];
    
    views.forEach(v => {
        const viewEl = document.getElementById(`dash-view-${v}`);
        const btnEl = document.getElementById(`subtab-btn-${v}`);
        const alertEl = document.getElementById(`alert-${v}-content`);
        
        if (v === view) {

            viewEl.classList.remove('hidden');
            viewEl.classList.add('block');
            if (alertEl) { alertEl.classList.remove('hidden'); alertEl.classList.add('block'); }
            

            btnEl.className = "px-6 py-2.5 rounded-xl text-sm font-black transition-all bg-white text-brand-600 shadow-md";
        } else {

            viewEl.classList.remove('block');
            viewEl.classList.add('hidden');
            if (alertEl) { alertEl.classList.remove('block'); alertEl.classList.add('hidden'); }
            

            btnEl.className = "px-6 py-2.5 rounded-xl text-sm font-bold transition-all text-slate-500 hover:text-slate-800 hover:bg-slate-200/50";
        }
    });
}

function renderNPS(data) {
    let promoters = 0;
    let passives = 0;
    let detractors = 0;
    let total = 0;


    data.forEach(row => {
        let score = parseFloat(row['Mức độ giới thiệu']); 
        if (!isNaN(score) && score >= 1 && score <= 5) {
            total++;
            if (score === 5) promoters++;
            else if (score >= 3) passives++;
            else detractors++;
        }
    });

    const container = document.getElementById('dash-nps-container');
    
    if (total === 0) {
        container.innerHTML = '<p class="text-slate-400 font-medium">Chưa có dữ liệu NPS.</p>';
        return;
    }


    let pctPromoters = Math.round((promoters / total) * 100);
    let pctDetractors = Math.round((detractors / total) * 100);
    

    let npsScore = pctPromoters - pctDetractors; 

    let npsColor = npsScore >= 30 ? 'text-emerald-500' : (npsScore > 0 ? 'text-amber-500' : 'text-red-500');
    let npsBg = npsScore >= 30 ? 'bg-emerald-50' : (npsScore > 0 ? 'bg-amber-50' : 'bg-red-50');
    let npsBorder = npsScore >= 30 ? 'border-emerald-200' : (npsScore > 0 ? 'border-amber-200' : 'border-red-200');
    let npsStatus = npsScore >= 30 ? 'Tuyệt vời' : (npsScore > 0 ? 'Trung bình' : 'Báo động đỏ');

    container.innerHTML = `
        <div class="relative w-32 h-32 flex items-center justify-center rounded-full ${npsBg} border-[6px] ${npsBorder} mb-3 shadow-inner">
            <div class="text-center">
                <div class="text-4xl font-black ${npsColor}">${npsScore > 0 ? '+'+npsScore : npsScore}</div>
                <div class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Điểm NPS</div>
            </div>
        </div>
        <h4 class="font-black ${npsColor} uppercase tracking-wider mb-6 text-sm bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">${npsStatus}</h4>
        
        <div class="w-full space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div class="flex justify-between items-center text-xs font-bold">
                <span class="text-emerald-600 flex items-center gap-1.5"><i class="ph-fill ph-smiley text-lg"></i> Ủng hộ (5đ)</span>
                <span class="bg-white px-2 py-0.5 rounded shadow-sm">${pctPromoters}%</span>
            </div>
            <div class="flex justify-between items-center text-xs font-bold">
                <span class="text-amber-500 flex items-center gap-1.5"><i class="ph-fill ph-smiley-meh text-lg"></i> Thụ động (3-4đ)</span>
                <span class="bg-white px-2 py-0.5 rounded shadow-sm">${Math.round((passives / total) * 100)}%</span>
            </div>
            <div class="flex justify-between items-center text-xs font-bold">
                <span class="text-red-500 flex items-center gap-1.5"><i class="ph-fill ph-smiley-sad text-lg"></i> Rủi ro (1-2đ)</span>
                <span class="bg-white px-2 py-0.5 rounded shadow-sm">${pctDetractors}%</span>
            </div>
        </div>
    `;
}


function populateFilterDropdowns() {
    const groupVal = document.getElementById('filter-group').value;
    const custSelect = document.getElementById('filter-customer');
    

    let uniqueCompanies = [...new Set(RAW_DATA.map(r => r[COL_COMPANY] || "Khách Hàng Ẩn Danh"))].sort();
    

    if (groupVal !== 'all') {
        uniqueCompanies = uniqueCompanies.filter(comp => {
            let g = customerGroups[comp] || 'vanglai'; 
            return g === groupVal;
        });
    }


    custSelect.innerHTML = '<option value="all">Tất cả khách hàng trong danh sách này</option>' + 
        uniqueCompanies.map(c => `<option value="${c}">${c}</option>`).join('');
}

function openGroupModal() {
    const listContainer = document.getElementById('group-management-list');
    let uniqueCompanies = [...new Set(RAW_DATA.map(r => r[COL_COMPANY] || "Khách Hàng Ẩn Danh"))].sort();
    
    listContainer.innerHTML = uniqueCompanies.map(comp => {
        let currentGroup = customerGroups[comp] || 'vanglai';
        return `
        <div class="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-brand-300 transition-colors">
            <span class="text-sm font-bold text-slate-800 truncate w-1/2 pr-4" title="${comp}">${comp}</span>
            <select onchange="customerGroups['${comp}'] = this.value" class="w-1/2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-brand-500 cursor-pointer">
                <option value="chuluc" ${currentGroup === 'chuluc' ? 'selected' : ''}>Chủ lực</option>
                <option value="tiemnang" ${currentGroup === 'tiemnang' ? 'selected' : ''}>Tiềm năng</option>
                <option value="vanglai" ${currentGroup === 'vanglai' ? 'selected' : ''}>Vãng lai</option>
            </select>
        </div>
        `;
    }).join('');
    
    const modal = document.getElementById('group-manage-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('group-manage-box').classList.remove('scale-95');
    }, 10);
}

function closeGroupModal() {
    const modal = document.getElementById('group-manage-modal');
    modal.classList.add('opacity-0');
    document.getElementById('group-manage-box').classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
}

function saveGroupManagement() {
    localStorage.setItem('tqc_customer_groups', JSON.stringify(customerGroups));
    closeGroupModal();
    populateFilterDropdowns(); 
    applyFilter(); 
}


function downloadDashboardPDF() {
    const dashboard = document.getElementById('tab-content-dashboard');
    const heatmapContainer = document.getElementById('customer-heatmap-container');
    const pdfActionBar = document.getElementById('pdf-action-bar');
    const loadingIndicator = document.getElementById('loading-indicator');

    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
    if (pdfActionBar) pdfActionBar.style.display = 'none';

    let originalHeatmapMaxHeight = '';
    if (heatmapContainer) {
        originalHeatmapMaxHeight = heatmapContainer.style.maxHeight;
        heatmapContainer.style.maxHeight = 'none';
        heatmapContainer.classList.remove('overflow-y-auto'); 
    }

    const printHeader = document.createElement('div');
    printHeader.id = 'pdf-print-header';
    const currentDate = new Date().toLocaleDateString('vi-VN');
    printHeader.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; padding-top: 20px;">
            <h1 style="font-size: 28px; font-weight: 900; color: #0f172a; text-transform: uppercase;">Báo Cáo Tổng Hợp Đánh Giá CSKH</h1>
            <p style="font-size: 14px; color: #64748b; margin-top: 5px;">Trích xuất từ Hệ thống Nội bộ Thông Quan Logistics - Ngày: ${currentDate}</p>
            <div style="width: 50px; height: 3px; background-color: #0ea5e9; margin: 15px auto;"></div>
        </div>
    `;
    dashboard.insertBefore(printHeader, dashboard.firstChild);

   const opt = {
        margin:       [0.5, 0.3, 0.5, 0.3], 
        filename:     'Bao_Cao_Dashboard_CSKH.pdf',
        image:        { type: 'jpeg', quality: 1 }, 
        html2canvas:  { scale: 2, useCORS: true, logging: false }, 
        jsPDF:        { unit: 'in', format: 'a3', orientation: 'landscape' },
        pagebreak:    { mode: 'avoid-all', avoid: '.bg-white' } 
    };

  
    html2pdf().set(opt).from(dashboard).save().then(() => {

        if (pdfActionBar) pdfActionBar.style.display = 'flex';
        if (heatmapContainer) {
            heatmapContainer.style.maxHeight = originalHeatmapMaxHeight || '400px';
            heatmapContainer.classList.add('overflow-y-auto');
        }
        if (printHeader) printHeader.remove(); 
        if (loadingIndicator) loadingIndicator.classList.add('hidden'); 
    }).catch(err => {
        console.error("Lỗi khi tạo PDF:", err);
        alert("Có lỗi xảy ra khi tạo file PDF.");
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
    });
}