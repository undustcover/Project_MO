// 全局变量
let calendarData = [];
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let selectedWellNumber = ''; // 当前选中的井号

// 合同指标数据
let contractData = {
    productionTime: 0,    // 合同生产时间
    nonProductionTime: 0, // 合同非生产时间
    completionTime: 0,    // 合同中完时间
    movingPeriod: 0,      // 合同搬家周期
    wellCompletionPeriod: 0, // 合同完井周期
    drillingPeriod: 0     // 合同钻井周期
};

// 计算结果数据
let calculationResults = {
    productionRate: 0,          // 生产时间达成率
    nonProductionRate: 0,       // 非生产时效溢价率
    completionRate: 0,           // 中完时间达成率
    drillingEfficiency: 0,       // 纯钻时效
    trippingEfficiency: 0,       // 起下钻时效
    contractUtilization: 0,      // 合同时间利用率
    overallScore: 0,             // 综合得分
    evaluationLevel: '未计算',   // 评价等级
    evaluationDescription: ''    // 评价描述
};

// DOM元素
const yearSelect = document.getElementById('year-select');
const monthSelect = document.getElementById('month-select');
const wellNumberSelect = document.getElementById('well-number-select');
const refreshBtn = document.getElementById('refresh-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const pdfExportBtn = document.getElementById('pdf-export-btn');
const fileInput = document.getElementById('file-input');
const calendarBody = document.getElementById('calendar-body');
const toast = document.getElementById('toast');

// 合同指标相关DOM元素
const contractProductionTimeInput = document.getElementById('contract-production-time');
const contractNonProductionTimeInput = document.getElementById('contract-non-production-time');
const contractCompletionTimeInput = document.getElementById('contract-completion-time');
const contractMovingPeriodInput = document.getElementById('contract-moving-period');
const contractWellCompletionPeriodInput = document.getElementById('contract-well-completion-period');
const contractDrillingPeriodInput = document.getElementById('contract-drilling-period');
const calculateBtn = document.getElementById('calculate-btn');

// 指标显示元素
const productionRateValue = document.getElementById('production-rate-value');
const productionRateLevel = document.getElementById('production-rate-level');
const nonProductionRateValue = document.getElementById('non-production-rate-value');
const nonProductionRateLevel = document.getElementById('non-production-rate-level');
const completionRateValue = document.getElementById('completion-rate-value');
const completionRateLevel = document.getElementById('completion-rate-level');
const drillingEfficiencyValue = document.getElementById('drilling-efficiency-value');
const drillingEfficiencyLevel = document.getElementById('drilling-efficiency-level');
const trippingEfficiencyValue = document.getElementById('tripping-efficiency-value');
const trippingEfficiencyLevel = document.getElementById('tripping-efficiency-level');
const contractUtilizationValue = document.getElementById('contract-utilization-value');
const contractUtilizationLevel = document.getElementById('contract-utilization-level');

// 初始化任务进度对比图
function initializeProgressComparisonChart() {
    const ctx = document.getElementById('progress-comparison-chart').getContext('2d');
    
    // 任务数据
    const taskNames = ['搬家安装', '一开钻进', '一开中完', '二开钻进', '二开中完', '三开钻进', '完井作业', '试油作业'];
    
    // 计划开始和结束时间（转换为天数）
    const plannedStart = [0, 40, 48, 52, 59, 61, 64, 65]; // 从2025.7.23开始的天数
    const plannedEnd = [40, 48, 52, 59, 61, 64, 65, 73];
    
    // 实际开始和结束时间（转换为天数）
    const actualStart = [0, 46, 50, 54, 57, 60, 63, 66];
    const actualEnd = [46, 50, 54, 56, 60, 63, 66, 73];
    
    // 创建进度对比图
    window.progressComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: taskNames,
            datasets: [
                {
                    label: '计划时间',
                    data: plannedEnd.map((end, i) => end - plannedStart[i]),
                    backgroundColor: 'rgba(74, 108, 247, 0.7)',
                    borderColor: 'rgba(74, 108, 247, 1)',
                    borderWidth: 1
                },
                {
                    label: '实际时间',
                    data: actualEnd.map((end, i) => end - actualStart[i]),
                    backgroundColor: 'rgba(255, 107, 107, 0.7)',
                    borderColor: 'rgba(255, 107, 107, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '天数'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: '任务计划与实际时间对比',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const index = context.dataIndex;
                            if (context.datasetIndex === 0) {
                                return `计划: ${plannedStart[index]}天 - ${plannedEnd[index]}天`;
                            } else {
                                return `实际: ${actualStart[index]}天 - ${actualEnd[index]}天`;
                            }
                        }
                    }
                }
            }
        }
    });
}

// 雷达图实例
let radarChart = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeYearSelect();
    loadCalendarData();
    setupEventListeners();
    
    // 初始化井号筛选选项
    updateWellNumberOptions();
    
    renderCalendar();
    updateCharts();
    initializeProgressComparisonChart();
});

// 初始化年份选择器
function initializeYearSelect() {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 5; year <= currentYear + 5; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + '年';
        if (year === currentYear) {
            option.selected = true;
        }
        yearSelect.appendChild(option);
    }
    monthSelect.value = currentMonth;
}

// 设置事件监听器
function setupEventListeners() {
    yearSelect.addEventListener('change', handleDateChange);
    monthSelect.addEventListener('change', handleDateChange);
    wellNumberSelect.addEventListener('change', handleWellNumberChange);
    refreshBtn.addEventListener('click', handleRefresh);
    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleImport);
    pdfExportBtn.addEventListener('click', handlePdfExport);
    
    // 合同指标相关事件监听器
    calculateBtn.addEventListener('click', handleCalculate);
    contractProductionTimeInput.addEventListener('input', handleContractDataChange);
    contractNonProductionTimeInput.addEventListener('input', handleContractDataChange);
    contractCompletionTimeInput.addEventListener('input', handleContractDataChange);
    contractMovingPeriodInput.addEventListener('input', handleContractDataChange);
    contractWellCompletionPeriodInput.addEventListener('input', handleContractDataChange);
    contractDrillingPeriodInput.addEventListener('input', handleContractDataChange);
}

// 处理日期变化
function handleDateChange() {
    currentYear = parseInt(yearSelect.value);
    currentMonth = parseInt(monthSelect.value);
    renderCalendar();
    updateCharts();
}

// 处理井号变化
function handleWellNumberChange() {
    selectedWellNumber = wellNumberSelect.value;
    renderCalendar();
    updateCharts();
    showToast(`已筛选井号: ${selectedWellNumber === '' ? '全部井号' : selectedWellNumber}`);
}

// 处理刷新
function handleRefresh() {
    renderCalendar();
    updateCharts();
    showToast('日历已刷新');
}

// 加载日历数据
function loadCalendarData() {
    // 尝试从localStorage加载数据
    try {
        const savedData = localStorage.getItem('calendarData');
        if (savedData) {
            calendarData = JSON.parse(savedData);
        } else {
            // 不初始化示例数据，保持为空数组
            calendarData = [];
        }
    } catch (e) {
        // 如果localStorage不可用，使用内存存储
        calendarData = [];
    }
}

// 保存日历数据
function saveCalendarData() {
    try {
        localStorage.setItem('calendarData', JSON.stringify(calendarData));
    } catch (e) {
        // 如果localStorage不可用，数据将保存在内存中
        console.log('数据保存在内存中，刷新页面后将丢失');
    }
}

// 渲染日历
function renderCalendar() {
    // 清空日历主体
    calendarBody.innerHTML = '';
    
    // 获取当前月份的第一天和最后一天
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const prevLastDay = new Date(currentYear, currentMonth - 1, 0);
    
    // 获取第一天是星期几（0=周日，1=周一，...）
    const firstDayOfWeek = firstDay.getDay();
    
    // 获取当前月份的天数
    const daysInMonth = lastDay.getDate();
    
    // 获取上个月的天数
    const daysInPrevMonth = prevLastDay.getDate();
    
    // 当前日期
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() + 1 === currentMonth;
    const currentDate = today.getDate();
    
    // 添加上个月日期（灰色显示）
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const dayCell = createDayCell(daysInPrevMonth - i, true, false);
        calendarBody.appendChild(dayCell);
    }
    
    // 添加当前月份的日期
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = isCurrentMonth && day === currentDate;
        const dayCell = createDayCell(day, false, isToday);
        calendarBody.appendChild(dayCell);
    }
    
    // 添加下个月日期（灰色显示）
    const totalCells = calendarBody.children.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
        const dayCell = createDayCell(day, true, false);
        calendarBody.appendChild(dayCell);
    }
}

// 创建日期单元格
function createDayCell(day, isOtherMonth, isToday) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    
    if (isOtherMonth) {
        dayCell.classList.add('other-month');
    }
    
    if (isToday) {
        dayCell.classList.add('today');
    }
    
    // 日期数字
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayCell.appendChild(dayNumber);
    
    // 如果不是其他月份，添加任务
    if (!isOtherMonth) {
        const dateStr = formatDate(currentYear, currentMonth, day);
        const dayTasks = getTasksForDate(dateStr);
        
        if (dayTasks.length > 0) {
            const tasksContainer = document.createElement('div');
            tasksContainer.className = 'tasks-container';
            
            dayTasks.forEach(task => {
                const taskElement = createTaskElement(task);
                tasksContainer.appendChild(taskElement);
            });
            
            dayCell.appendChild(tasksContainer);
        }
    }
    
    return dayCell;
}

// 创建任务元素
function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `task ${task.type === '生产时效' ? 'production' : 'non-生产'}`;
    
    const taskInfo = document.createElement('div');
    taskInfo.className = 'task-info';
    taskInfo.innerHTML = `
        <div class="task-time">${task.startTime}-${task.endTime}</div>
        <div class="task-project">${task.project}</div>
        <div class="task-well-number">${task.wellNumber || ''}</div>
        <div class="task-person">${task.person}</div>
    `;
    
    taskElement.appendChild(taskInfo);
    
    return taskElement;
}

// 获取指定日期的任务
function getTasksForDate(date) {
    let tasks = calendarData.filter(task => task.date === date);
    
    // 如果有选中的井号，则进一步筛选
    if (selectedWellNumber !== '') {
        tasks = tasks.filter(task => task.wellNumber === selectedWellNumber);
    }
    
    return tasks;
}

// 格式化日期
function formatDate(year, month, day) {
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

// 显示提示信息
function showToast(message, duration = 3000) {
    toast.textContent = message;
    toast.style.display = 'block';
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 300);
    }, duration);
}

// 导出Excel
function handleExport() {
    // 筛选当前显示的数据
    let exportData = calendarData;
    
    // 按日期排序
    exportData.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 创建CSV内容，调整字段顺序为：1.井号；2.工况名称；3.工况一级时效；4.工况二级时效；5.工况三级时效；6.开始时间；7.结束时间；8.负责人；9.日期
    let csvContent = "井号,工况名称,工况一级时效,工况二级时效,工况三级时效,开始时间,结束时间,负责人,日期\n";
    
    exportData.forEach(task => {
        csvContent += `${task.wellNumber || ''},${task.project},${task.type},${task.detail},${task.drillingDetail},${task.startTime},${task.endTime},${task.person},${task.date}\n`;
    });
    
    // 创建Blob并下载
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `日历数据_${currentYear}_${currentMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('数据已导出为CSV文件');
}

// 导出PDF
function handlePdfExport() {
    // 显示加载提示
    showToast('正在生成PDF，请稍候...');
    
    // 确保所有图表都已渲染完成
    setTimeout(() => {
        // 获取要导出的元素 - 整个容器
        const element = document.querySelector('.container');
        
        // 获取元素的实际尺寸
        const elementWidth = element.scrollWidth;
        const elementHeight = element.scrollHeight;
        
        // 计算适合的PDF尺寸（以毫米为单位）
        // 使用1:1的比例，保持页面原始布局，确保所有内容在一页显示
        const pdfWidth = Math.max(elementWidth * 0.264583, 297); // 最小A3宽度
        const pdfHeight = Math.max(elementHeight * 0.264583, 420); // 最小A3高度
        
        // 配置PDF选项 - 使用自定义尺寸确保所有内容在一页显示
        const opt = {
            margin: 5, // 添加小边距确保内容不被截断
            filename: `项目时间维度统计分析_${currentYear}_${currentMonth}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 1.2, // 降低缩放比例避免内容过大
                useCORS: true,
                logging: false,
                allowTaint: true,
                width: elementWidth, // 使用元素实际宽度
                height: elementHeight, // 使用元素实际高度
                scrollX: 0,
                scrollY: 0,
                windowWidth: elementWidth,
                windowHeight: elementHeight,
                // 确保捕获整个页面，包括滚动区域
                onclone: function(clonedDoc) {
                    // 在克隆文档中确保所有元素可见
                    const clonedElement = clonedDoc.querySelector('.container');
                    if (clonedElement) {
                        clonedElement.style.height = 'auto';
                        clonedElement.style.overflow = 'visible';
                        clonedElement.style.width = elementWidth + 'px';
                    }
                    
                    // 确保所有图表在克隆文档中渲染
                    const charts = clonedDoc.querySelectorAll('canvas');
                    charts.forEach(chart => {
                        // 强制图表重新渲染
                        const ctx = chart.getContext('2d');
                        if (ctx) {
                            // 保存当前图表状态
                            const imageData = ctx.getImageData(0, 0, chart.width, chart.height);
                            // 稍后恢复图表状态
                            setTimeout(() => {
                                ctx.putImageData(imageData, 0, 0);
                            }, 100);
                        }
                    });
                }
            },
            jsPDF: { 
                unit: 'mm', 
                format: [pdfWidth, pdfHeight], // 使用自定义尺寸确保所有内容在一页
                orientation: 'portrait' // 强制使用纵向布局
            },
            pagebreak: { 
                mode: ['avoid-all', 'css', 'legacy'],
                before: '.page-break',
                after: '.page-break',
                avoid: ['tr', 'img', 'canvas', '.info-card', '.chart-container', '.radar-card', '.evaluation-card', '.calendar-container']
            }
        };
        
        // 生成PDF
        html2pdf().set(opt).from(element).save().then(() => {
            showToast('PDF导出成功');
        }).catch(error => {
            console.error('PDF导出失败:', error);
            showToast('PDF导出失败，请重试');
        });
    }, 3000); // 增加等待时间确保图表完全渲染
}

// 导入Excel
function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    const fileName = file.name.toLowerCase();
    const isXlsx = fileName.endsWith('.xlsx');
    const isXls = fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv');
    
    if (!isXlsx && !isXls && !isCsv) {
        showToast('请选择.xlsx、.xls或.csv格式的文件');
        return;
    }
    
    if (isXlsx || isXls) {
        // 使用SheetJS处理xlsx文件
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // 获取第一个工作表
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // 转换为JSON格式
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                // 处理数据
                processImportData(jsonData);
                
            } catch (error) {
                console.error('导入失败:', error);
                showToast('导入失败，请检查文件格式');
            }
        };
        
        reader.readAsArrayBuffer(file);
    } else if (isCsv) {
        // 处理CSV文件
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const text = e.target.result;
                console.log('CSV原始内容:', text);
                
                // 使用更健壮的CSV解析方法
                const jsonData = parseCSV(text);
                console.log('CSV解析结果:', jsonData);
                
                // 处理数据
                processImportData(jsonData);
                
            } catch (error) {
                console.error('导入失败:', error);
                showToast('导入失败，请检查文件格式');
            }
        };
        
        reader.readAsText(file, 'UTF-8');
    }
    
    // 重置文件输入
    event.target.value = '';
}

// 增强的CSV解析函数
function parseCSV(text) {
    const lines = text.split(/\r\n|\n/);
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 跳过空行
        if (!line) {
            continue;
        }
        
        // 处理CSV行，支持逗号分隔和引号包围的字段
        const fields = [];
        let field = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                fields.push(field);
                field = '';
            } else {
                field += char;
            }
        }
        
        // 添加最后一个字段
        fields.push(field);
        
        // 只添加非空行
        if (fields.some(f => f.trim() !== '')) {
            result.push(fields);
        }
    }
    
    return result;
}

// 解析CSV行，处理引号内的逗号
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    // 添加最后一个字段
    result.push(current.trim());
    
    return result;
}

// 更新井号筛选下拉框选项
function updateWellNumberOptions() {
    // 获取所有不重复的井号
    const wellNumbers = [...new Set(calendarData.map(task => task.wellNumber).filter(Boolean))];
    
    // 清空现有选项
    wellNumberSelect.innerHTML = '';
    
    // 添加"全部井号"选项
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = '全部井号';
    wellNumberSelect.appendChild(allOption);
    
    // 添加井号选项
    wellNumbers.forEach(wellNumber => {
        const option = document.createElement('option');
        option.value = wellNumber;
        option.textContent = wellNumber;
        wellNumberSelect.appendChild(option);
    });
    
    // 保持当前选中的井号
    wellNumberSelect.value = selectedWellNumber;
}

// 处理导入的数据
function processImportData(jsonData) {
    // 添加调试信息
    console.log('导入的原始数据:', jsonData);
    console.log('数据行数:', jsonData.length);
    
    // 跳过标题行
    if (jsonData.length < 2) {
        showToast('文件内容为空');
        return;
    }
    
    const newData = [];
    
    // 从第二行开始解析数据
    for (let i = 1; i < jsonData.length; i++) {
        const fields = jsonData[i];
        console.log(`第${i+1}行数据:`, fields);
        
        // 跳过空行
        if (!fields || fields.length === 0 || fields.every(field => !field || field.trim() === '')) {
            continue;
        }
        
        // 确保有足够的字段（至少9个字段，包含井号），如果不足则用空字符串填充
        while (fields.length < 9) {
            fields.push('');
        }
        
        // 处理日期格式（第9列，索引8）
        let date = fields[8];
        if (typeof date === 'number') {
            // Excel日期序列号转换为JavaScript日期，然后格式化为YYYY-MM-DD
            const excelDate = new Date((date - 25569) * 86400 * 1000);
            const year = excelDate.getFullYear();
            const month = String(excelDate.getMonth() + 1).padStart(2, '0');
            const day = String(excelDate.getDate()).padStart(2, '0');
            date = `${year}-${month}-${day}`;
            console.log(`Excel日期序列号 ${fields[8]} 转换为日期字符串: ${date}`);
        } else if (typeof date === 'string') {
            // 尝试解析各种日期格式
            date = parseDateString(date.trim());
        }
        
        // 解析数据，确保字段不为null或undefined，调整字段顺序为：1.井号；2.工况名称；3.工况一级时效；4.工况二级时效；5.工况三级时效；6.开始时间；7.结束时间；8.负责人；9.日期
        const task = {
            id: Date.now() + i, // 生成唯一ID
            date: date || '',
            wellNumber: String(fields[0] || '').trim(), // 井号
            project: String(fields[1] || '').trim(), // 工况名称
            type: String(fields[2] || '').trim(), // 工况一级时效
            detail: String(fields[3] || '').trim(), // 工况二级时效
            drillingDetail: String(fields[4] || '').trim(), // 工况三级时效
            startTime: String(fields[5] || '').trim(), // 开始时间
            endTime: String(fields[6] || '').trim(), // 结束时间
            person: String(fields[7] || '').trim(), // 负责人
            notes: '' // 备注
        };
        
        // 计算工作时长
        task.hours = calculateHours(task.startTime, task.endTime);
        
        console.log(`解析后的任务:`, task);
        
        // 验证数据 - 至少需要日期、项目、开始时间和结束时间
        if (!task.date || !task.project || !task.startTime || !task.endTime) {
            showToast(`第${i+1}行数据不完整，已跳过`);
            continue;
        }
        
        // 验证日期格式
        if (!/^\d{4}-\d{2}-\d{2}$/.test(task.date)) {
            showToast(`第${i+1}行日期格式不正确，已跳过`);
            continue;
        }
        
        // 验证时间格式
        if (!/^\d{1,2}:\d{2}$/.test(task.startTime) || !/^\d{1,2}:\d{2}$/.test(task.endTime)) {
            showToast(`第${i+1}行时间格式不正确，已跳过`);
            continue;
        }
        
        newData.push(task);
    }
    
    console.log('有效数据条数:', newData.length);
    
    if (newData.length === 0) {
        showToast('没有有效的数据可导入');
        return;
    }
    
    // 询问用户是替换还是合并数据
    const isReplace = confirm(`检测到${newData.length}条有效数据，是否替换现有数据？\n点击"确定"替换，点击"取消"合并`);
    
    if (isReplace) {
        calendarData = newData;
    } else {
        // 合并数据，避免重复
        newData.forEach(newTask => {
            const exists = calendarData.some(task => 
                task.date === newTask.date && 
                task.project === newTask.project && 
                task.startTime === newTask.startTime
            );
            
            if (!exists) {
                calendarData.push(newTask);
            }
        });
    }
    
    // 更新井号筛选选项
    updateWellNumberOptions();
    
    saveCalendarData();
    renderCalendar();
    updateCharts();
    showToast(`成功导入${newData.length}条数据`);
}

// 解析各种日期格式
function parseDateString(dateStr) {
    // 尝试匹配 YYYY-MM-DD 格式
    const match1 = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match1) {
        return formatDate(parseInt(match1[1]), parseInt(match1[2]), parseInt(match1[3]));
    }
    
    // 尝试匹配 YYYY/MM/DD 格式
    const match2 = dateStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (match2) {
        return formatDate(parseInt(match2[1]), parseInt(match2[2]), parseInt(match2[3]));
    }
    
    // 尝试匹配 MM/DD/YYYY 格式
    const match3 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match3) {
        return formatDate(parseInt(match3[3]), parseInt(match3[1]), parseInt(match3[2]));
    }
    
    // 尝试匹配 MM-DD-YYYY 格式
    const match4 = dateStr.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (match4) {
        return formatDate(parseInt(match4[3]), parseInt(match4[1]), parseInt(match4[2]));
    }
    
    // 如果都不匹配，返回原字符串
    return dateStr;
}

// 计算工作时长
function calculateHours(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    
    // 解析时间，支持格式: HH:MM 或 H:MM
    const startParts = startTime.split(':').map(Number);
    const endParts = endTime.split(':').map(Number);
    
    if (startParts.length < 2 || endParts.length < 2) return 0;
    
    let startHours = startParts[0];
    let startMinutes = startParts[1] || 0;
    let endHours = endParts[0];
    let endMinutes = endParts[1] || 0;
    
    // 计算总分钟数
    let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    
    // 处理跨天情况（例如从20:00到24:00或从00:00到04:00）
    if (totalMinutes < 0) {
        totalMinutes += 24 * 60; // 加24小时
    }
    
    // 转换为小时
    return totalMinutes / 60;
}

// 更新统计图表
function updateCharts() {
    updateWellCycleChart();
    updateWorkTimeChart();
    updateProductionTimeChart();
    updateDrillingTimeChart();
    updateNonProductionTimeChart();
    
    // 更新动拆搬安时效统计
    updateMovingTimeChart();
    
    // 更新组停时效指标
    updateOrganizationTimeChart();
}

// 更新建井周期统计图表
function updateWellCycleChart() {
    // 筛选当前显示的数据
    let filteredData = calendarData;
    
    // 如果有选中的井号，则进一步筛选
    if (selectedWellNumber !== '') {
        filteredData = filteredData.filter(task => task.wellNumber === selectedWellNumber);
    }
    
    // 计算建井周期的各个部分
    let movingCycleTime = 0;      // 搬安周期（工况名称字段中所有含有搬安文本的时间之和）
    let drillingCycleTime = 0;    // 钻井周期（除了搬安周期、完井周期、测试周期之外的剩余时间之和）
    let completionCycleTime = 0;  // 完井周期（工况名称字段中所有含有完井文本的时间之和）
    let testingCycleTime = 0;      // 测试周期（工况名称字段中所有含有试油/测试/试气文本的时间之和）
    
    // 计算各项时间
    filteredData.forEach(task => {
        // 搬安周期：工况名称字段中所有含有搬安文本的时间之和
        if (task.project.includes('搬安')) {
            movingCycleTime += task.hours;
        }
        // 完井周期：工况名称字段中所有含有完井文本的时间之和
        else if (task.project.includes('完井')) {
            completionCycleTime += task.hours;
        }
        // 测试周期：工况名称字段中所有含有试油/测试/试气文本的时间之和
        else if (task.project.includes('试油') || task.project.includes('测试') || task.project.includes('试气')) {
            testingCycleTime += task.hours;
        }
        // 钻井周期：除了搬安周期、完井周期、测试周期之外的剩余时间之和
        else {
            drillingCycleTime += task.hours;
        }
    });
    
    // 绘制圆盘图
    const canvas = document.getElementById('well-cycle-chart');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 100;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 计算总时长
    const totalTime = movingCycleTime + drillingCycleTime + completionCycleTime + testingCycleTime;
    
    if (totalTime === 0) {
        // 无数据时显示空圆盘
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 显示无数据文本
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('无数据', centerX, centerY);
        
        // 清空图例
        document.getElementById('well-cycle-legend').innerHTML = '';
        return;
    }
    
    // 定义颜色
    const colors = ['#FF9800', '#2196F3', '#4CAF50', '#9C27B0'];
    const labels = ['搬安周期', '钻井周期', '完井周期', '测试周期'];
    const values = [movingCycleTime, drillingCycleTime, completionCycleTime, testingCycleTime];
    
    // 绘制扇形
    let currentAngle = 0;
    const legendItems = [];
    
    for (let i = 0; i < values.length; i++) {
        if (values[i] > 0) {
            const angle = (values[i] / totalTime) * 2 * Math.PI;
            
            // 绘制扇形
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + angle);
            ctx.closePath();
            ctx.fillStyle = colors[i];
            ctx.fill();
            
            // 添加到图例
            legendItems.push({
                color: colors[i],
                label: labels[i],
                value: values[i],
                percentage: (values[i] / totalTime * 100).toFixed(1)
            });
            
            currentAngle += angle;
        }
    }
    
    // 绘制边框
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 更新图例
    const legend = document.getElementById('well-cycle-legend');
    legend.innerHTML = legendItems.map(item => `
        <div class="legend-item">
            <div class="legend-color" style="background-color: ${item.color};"></div>
            <span>${item.label}: ${item.value.toFixed(1)}小时 (${item.percentage}%)</span>
        </div>
    `).join('');
}

// 更新工作时效统计图表
function updateWorkTimeChart() {
    // 筛选当前显示的数据
    let filteredData = calendarData;
    
    // 如果有选中的井号，则进一步筛选
    if (selectedWellNumber !== '') {
        filteredData = filteredData.filter(task => task.wellNumber === selectedWellNumber);
    }
    
    // 计算生产时效和非生产时效的总时长
    let productionTime = 0;
    let nonProductionTime = 0;
    
    filteredData.forEach(task => {
        if (task.type === '生产时效') {
            productionTime += task.hours;
        } else if (task.type === '非生产时效') {
            nonProductionTime += task.hours;
        }
    });
    
    // 绘制圆盘图
    const canvas = document.getElementById('work-time-chart');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 100;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 计算总时长
    const totalTime = productionTime + nonProductionTime;
    
    if (totalTime === 0) {
        // 无数据时显示空圆盘
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 显示无数据文本
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('无数据', centerX, centerY);
        
        // 清空图例
        document.getElementById('work-time-legend').innerHTML = '';
        return;
    }
    
    // 计算角度
    const productionAngle = (productionTime / totalTime) * 2 * Math.PI;
    const nonProductionAngle = (nonProductionTime / totalTime) * 2 * Math.PI;
    
    // 绘制生产时效扇形
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, 0, productionAngle);
    ctx.closePath();
    ctx.fillStyle = '#4CAF50';
    ctx.fill();
    
    // 绘制非生产时效扇形
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, productionAngle, productionAngle + nonProductionAngle);
    ctx.closePath();
    ctx.fillStyle = '#F44336';
    ctx.fill();
    
    // 绘制边框
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 更新图例
    const legend = document.getElementById('work-time-legend');
    legend.innerHTML = `
        <div class="legend-item">
            <div class="legend-color" style="background-color: #4CAF50;"></div>
            <span>生产时效: ${productionTime.toFixed(1)}小时 (${(productionTime/totalTime*100).toFixed(1)}%)</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background-color: #F44336;"></div>
            <span>非生产时效: ${nonProductionTime.toFixed(1)}小时 (${(nonProductionTime/totalTime*100).toFixed(1)}%)</span>
        </div>
    `;
}

// 更新生产时效统计图表
function updateProductionTimeChart() {
    // 筛选当前显示的数据
    let filteredData = calendarData;
    
    // 如果有选中的井号，则进一步筛选
    if (selectedWellNumber !== '') {
        filteredData = filteredData.filter(task => task.wellNumber === selectedWellNumber);
    }
    
    // 按项目分组统计生产时效
    const projectStats = {};
    
    filteredData.forEach(task => {
        if (task.type === '生产时效') {
            if (!projectStats[task.project]) {
                projectStats[task.project] = 0;
            }
            projectStats[task.project] += task.hours;
        }
    });
    
    // 绘制柱状图
    const canvas = document.getElementById('production-time-chart');
    const ctx = canvas.getContext('2d');
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 获取项目列表
    const projects = Object.keys(projectStats);
    
    if (projects.length === 0) {
        // 无数据时显示提示
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('无数据', canvas.width / 2, canvas.height / 2);
        
        // 清空图例
        document.getElementById('production-time-legend').innerHTML = '';
        return;
    }
    
    // 计算最大值
    const maxHours = Math.max(...Object.values(projectStats));
    
    // 设置图表参数
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const barWidth = chartWidth / projects.length * 0.6;
    const barGap = chartWidth / projects.length * 0.4;
    
    // 设置颜色
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4'];
    
    // 绘制坐标轴
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // 绘制Y轴刻度
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        const value = maxHours * (1 - i / 5);
        
        ctx.fillText(value.toFixed(1) + 'h', padding - 10, y + 5);
        
        // 绘制网格线
        ctx.strokeStyle = '#eee';
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
    }
    
    // 绘制柱状图
    projects.forEach((project, index) => {
        const x = padding + (index * (barWidth + barGap)) + barGap / 2;
        const barHeight = (projectStats[project] / maxHours) * chartHeight;
        const y = canvas.height - padding - barHeight;
        
        // 绘制柱子
        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // 绘制项目名称
        ctx.save();
        ctx.translate(x + barWidth / 2, canvas.height - padding + 15);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(project, 0, 0);
        ctx.restore();
        
        // 绘制数值
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(projectStats[project].toFixed(1) + 'h', x + barWidth / 2, y - 5);
    });
    
    // 更新图例
    const legend = document.getElementById('production-time-legend');
    let legendHTML = '';
    
    projects.forEach((project, index) => {
        const color = colors[index % colors.length];
        legendHTML += `
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${color};"></div>
                <span>${project}: ${projectStats[project].toFixed(1)}小时</span>
            </div>
        `;
    });
    
    legend.innerHTML = legendHTML;
}

// 更新进尺工作时间统计图表
function updateDrillingTimeChart() {
    // 筛选当前显示的数据
    let filteredData = calendarData;
    
    // 如果有选中的井号，则进一步筛选
    if (selectedWellNumber !== '') {
        filteredData = filteredData.filter(task => task.wellNumber === selectedWellNumber);
    }
    
    // 只筛选进尺工作时间的数据
    filteredData = filteredData.filter(task => 
        task.detail === '进尺工作时间' || task.detail === '进尺'
    );
    
    // 计算各种进尺工况的总时长
    let pureDrillingTime = 0;  // 纯钻
    let coringTime = 0;        // 取芯
    let trippingTime = 0;      // 起下钻
    let connectionTime = 0;    // 换接划
    let circulationTime = 0;    // 循环
    let testOilTime = 0;       // 试油
    let testGasTime = 0;       // 试气
    let workoverTime = 0;      // 修井
    let otherDrillingTime = 0; // 其他
    
    filteredData.forEach(task => {
        // 根据工况三级时效自动分类
        if (task.drillingDetail === '纯钻时间' || task.drillingDetail === '纯钻') {
            pureDrillingTime += task.hours;
        } else if (task.drillingDetail === '取芯时间' || task.drillingDetail === '取芯') {
            coringTime += task.hours;
        } else if (task.drillingDetail === '起下钻时间' || task.drillingDetail === '起下钻') {
            trippingTime += task.hours;
        } else if (task.drillingDetail === '换接划时间' || task.drillingDetail === '换接划') {
            connectionTime += task.hours;
        } else if (task.drillingDetail === '循环时间' || task.drillingDetail === '循环') {
            circulationTime += task.hours;
        } else if (task.drillingDetail === '试油时间' || task.drillingDetail === '试油') {
            testOilTime += task.hours;
        } else if (task.drillingDetail === '试气时间' || task.drillingDetail === '试气') {
            testGasTime += task.hours;
        } else if (task.drillingDetail === '修井时间' || task.drillingDetail === '修井') {
            workoverTime += task.hours;
        } else {
            otherDrillingTime += task.hours;
        }
    });
    
    // 绘制圆盘图
    const canvas = document.getElementById('drilling-time-chart');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 100;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 计算总时长
    const totalTime = pureDrillingTime + coringTime + trippingTime + connectionTime + circulationTime + testOilTime + testGasTime + workoverTime + otherDrillingTime;
    
    if (totalTime === 0) {
        // 无数据时显示空圆盘
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 显示无数据文本
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('无数据', centerX, centerY);
        
        // 清空图例
        document.getElementById('drilling-time-legend').innerHTML = '';
        return;
    }
    
    // 定义颜色
    const colors = ['#FF5722', '#8BC34A', '#3F51B5', '#E91E63', '#009688', '#FFC107', '#795548', '#9E9E9E', '#607D8B'];
    const labels = ['纯钻', '取芯', '起下钻', '换接划', '循环', '试油', '试气', '修井', '其他'];
    const values = [pureDrillingTime, coringTime, trippingTime, connectionTime, circulationTime, testOilTime, testGasTime, workoverTime, otherDrillingTime];
    
    // 绘制扇形
    let currentAngle = 0;
    const legendItems = [];
    
    for (let i = 0; i < values.length; i++) {
        if (values[i] > 0) {
            const angle = (values[i] / totalTime) * 2 * Math.PI;
            
            // 绘制扇形
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + angle);
            ctx.closePath();
            ctx.fillStyle = colors[i];
            ctx.fill();
            
            // 添加到图例
            legendItems.push({
                color: colors[i],
                label: labels[i],
                value: values[i],
                percentage: (values[i] / totalTime * 100).toFixed(1)
            });
            
            currentAngle += angle;
        }
    }
    
    // 绘制边框
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 更新图例
    const legend = document.getElementById('drilling-time-legend');
    legend.innerHTML = legendItems.map(item => `
        <div class="legend-item">
            <div class="legend-color" style="background-color: ${item.color};"></div>
            <span>${item.label}: ${item.value.toFixed(1)}小时 (${item.percentage}%)</span>
        </div>
    `).join('');
}

// 更新非生产时效统计图表
function updateNonProductionTimeChart() {
    // 筛选当前显示的数据
    let filteredData = calendarData;
    
    // 如果有选中的井号，则进一步筛选
    if (selectedWellNumber !== '') {
        filteredData = filteredData.filter(task => task.wellNumber === selectedWellNumber);
    }
    
    // 只筛选非生产时效的数据
    filteredData = filteredData.filter(task => task.type === '非生产时效');
    
    // 计算各种非生产时效类型的总时长
    let organizationTime = 0;    // 组织停工时间
    let repairTime = 0;         // 修理时间
    let testRepairTime = 0;     // 试修时间
    let complexityTime = 0;     // 复杂时间
    let failureTime = 0;        // 故障时间
    let naturalDisasterTime = 0; // 自然灾害停工
    let otherNonProductionTime = 0; // 其他停工时间
    
    filteredData.forEach(task => {
        // 根据工况二级时效自动分类
        if (task.detail === '组织停工时间' || task.detail === '组织停工') {
            organizationTime += task.hours;
        } else if (task.detail === '修理时间' || task.detail === '修理') {
            repairTime += task.hours;
        } else if (task.detail === '试修时间' || task.detail === '试修') {
            testRepairTime += task.hours;
        } else if (task.detail === '复杂时间' || task.detail === '复杂') {
            complexityTime += task.hours;
        } else if (task.detail === '故障时间' || task.detail === '故障') {
            failureTime += task.hours;
        } else if (task.detail === '自然灾害停工' || task.detail === '自然灾害') {
            naturalDisasterTime += task.hours;
        } else {
            otherNonProductionTime += task.hours;
        }
    });
    
    // 绘制圆盘图
    const canvas = document.getElementById('non-production-time-chart');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 100;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 计算总时长
    const totalTime = organizationTime + repairTime + testRepairTime + complexityTime + failureTime + naturalDisasterTime + otherNonProductionTime;
    
    if (totalTime === 0) {
        // 无数据时显示空圆盘
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 显示无数据文本
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('无数据', centerX, centerY);
        
        // 清空图例
        document.getElementById('non-production-time-legend').innerHTML = '';
        return;
    }
    
    // 定义颜色
    const colors = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#607D8B'];
    const labels = ['组织停工时间', '修理时间', '试修时间', '复杂时间', '故障时间', '自然灾害停工', '其他停工时间'];
    const values = [organizationTime, repairTime, testRepairTime, complexityTime, failureTime, naturalDisasterTime, otherNonProductionTime];
    
    // 绘制扇形
    let currentAngle = 0;
    const legendItems = [];
    
    for (let i = 0; i < values.length; i++) {
        if (values[i] > 0) {
            const angle = (values[i] / totalTime) * 2 * Math.PI;
            
            // 绘制扇形
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + angle);
            ctx.closePath();
            ctx.fillStyle = colors[i];
            ctx.fill();
            
            // 添加到图例
            legendItems.push({
                color: colors[i],
                label: labels[i],
                value: values[i],
                percentage: (values[i] / totalTime * 100).toFixed(1)
            });
            
            currentAngle += angle;
        }
    }
    
    // 绘制边框
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 更新图例
    const legend = document.getElementById('non-production-time-legend');
    legend.innerHTML = legendItems.map(item => `
        <div class="legend-item">
            <div class="legend-color" style="background-color: ${item.color};"></div>
            <span>${item.label}: ${item.value.toFixed(1)}小时 (${item.percentage}%)</span>
        </div>
    `).join('');
}

// 更新动拆搬安时效统计图表
function updateMovingTimeChart() {
    // 筛选当前显示的数据
    let filteredData = calendarData;
    
    // 如果有选中的井号，则进一步筛选
    if (selectedWellNumber !== '') {
        filteredData = filteredData.filter(task => task.wellNumber === selectedWellNumber);
    }
    
    // 只筛选动拆搬安的数据
    filteredData = filteredData.filter(task => task.detail === '动拆搬安' || task.detail === '动拆搬安');
    
    // 计算各种动拆搬安的数据
    let movingTime = 0;        // 动迁时间
    let disassemblyTime = 0;   // 拆卸时间
    let relocationTime = 0;    // 搬家时间
    let installationTime = 0;  // 安装时间
    let otherMovingTime = 0;   // 其他动拆搬安时间
    
    filteredData.forEach(task => {
        // 根据工况三级时效自动分类
        if (task.drillingDetail === '动迁时间' || task.drillingDetail === '动迁') {
            movingTime += task.hours;
        } else if (task.drillingDetail === '拆卸时间' || task.drillingDetail === '拆卸') {
            disassemblyTime += task.hours;
        } else if (task.drillingDetail === '搬家时间' || task.drillingDetail === '搬家') {
            relocationTime += task.hours;
        } else if (task.drillingDetail === '安装时间' || task.drillingDetail === '安装') {
            installationTime += task.hours;
        } else {
            otherMovingTime += task.hours;
        }
    });
    
    // 绘制圆盘图
    const canvas = document.getElementById('moving-time-chart');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 100;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 计算总时长
    const totalTime = movingTime + disassemblyTime + relocationTime + installationTime + otherMovingTime;
    
    if (totalTime === 0) {
        // 无数据时显示空圆盘
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 显示无数据文本
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('无数据', centerX, centerY);
        
        // 清空图例
        document.getElementById('moving-time-legend').innerHTML = '';
        return;
    }
    
    // 定义颜色
    const colors = ['#795548', '#D84315', '#5D4037', '#A1887F', '#8D6E63'];
    const labels = ['动迁时间', '拆卸时间', '搬家时间', '安装时间', '其他动拆搬安'];
    const values = [movingTime, disassemblyTime, relocationTime, installationTime, otherMovingTime];
    
    // 绘制扇形
    let currentAngle = 0;
    const legendItems = [];
    
    for (let i = 0; i < values.length; i++) {
        if (values[i] > 0) {
            const angle = (values[i] / totalTime) * 2 * Math.PI;
            
            // 绘制扇形
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + angle);
            ctx.closePath();
            ctx.fillStyle = colors[i];
            ctx.fill();
            
            // 添加到图例
            legendItems.push({
                color: colors[i],
                label: labels[i],
                value: values[i],
                percentage: (values[i] / totalTime * 100).toFixed(1)
            });
            
            currentAngle += angle;
        }
    }
    
    // 绘制边框
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 更新图例
    const legend = document.getElementById('moving-time-legend');
    legend.innerHTML = legendItems.map(item => `
        <div class="legend-item">
            <div class="legend-color" style="background-color: ${item.color};"></div>
            <span>${item.label}: ${item.value.toFixed(1)}小时 (${item.percentage}%)</span>
        </div>
    `).join('');
}

// 更新组停时效指标图表
function updateOrganizationTimeChart() {
    // 筛选当前显示的数据
    let filteredData = calendarData;
    
    // 如果有选中的井号，则进一步筛选
    if (selectedWellNumber !== '') {
        filteredData = filteredData.filter(task => task.wellNumber === selectedWellNumber);
    }
    
    // 计算组织停工时间和总时间
    let organizationTime = 0;    // 组织停工时间
    let totalTime = 0;           // 总时间
    
    filteredData.forEach(task => {
        // 累计所有时间
        totalTime += task.hours;
        
        // 累计组织停工时间
        if (task.detail === '组织停工时间' || task.detail === '组织停工') {
            organizationTime += task.hours;
        }
    });
    
    // 绘制圆盘图
    const canvas = document.getElementById('organization-time-chart');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 100;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (totalTime === 0) {
        // 无数据时显示空圆盘
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 显示无数据文本
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('无数据', centerX, centerY);
        
        // 清空图例
        document.getElementById('organization-time-legend').innerHTML = '';
        return;
    }
    
    // 计算组织停工时间比率
    const organizationRatio = (organizationTime / totalTime) * 100;
    const nonOrganizationTime = totalTime - organizationTime;
    const nonOrganizationRatio = (nonOrganizationTime / totalTime) * 100;
    
    // 计算角度
    const organizationAngle = (organizationTime / totalTime) * 2 * Math.PI;
    const nonOrganizationAngle = (nonOrganizationTime / totalTime) * 2 * Math.PI;
    
    // 绘制组织停工时间扇形
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, 0, organizationAngle);
    ctx.closePath();
    ctx.fillStyle = '#FF9800';  // 橙色表示组织停工
    ctx.fill();
    
    // 绘制非组织停工时间扇形
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, organizationAngle, organizationAngle + nonOrganizationAngle);
    ctx.closePath();
    ctx.fillStyle = '#4CAF50';  // 绿色表示非组织停工
    ctx.fill();
    
    // 绘制边框
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 在中心显示比率
    ctx.fillStyle = '#333';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(organizationRatio.toFixed(1) + '%', centerX, centerY);
    
    // 在比率下方添加小字说明
    ctx.font = '12px Arial';
    ctx.fillText('组织停工比率', centerX, centerY + 20);
    
    // 更新图例
    const legend = document.getElementById('organization-time-legend');
    legend.innerHTML = `
        <div class="legend-item">
            <div class="legend-color" style="background-color: #FF9800;"></div>
            <span>组织停工: ${organizationTime.toFixed(1)}小时 (${organizationRatio.toFixed(1)}%)</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background-color: #4CAF50;"></div>
            <span>其他时间: ${nonOrganizationTime.toFixed(1)}小时 (${nonOrganizationRatio.toFixed(1)}%)</span>
        </div>
    `;
}

// 处理合同指标数据变化
function handleContractDataChange() {
    // 更新合同数据
    contractData.productionTime = parseFloat(contractProductionTimeInput.value) || 0;
    contractData.nonProductionTime = parseFloat(contractNonProductionTimeInput.value) || 0;
    contractData.completionTime = parseFloat(contractCompletionTimeInput.value) || 0;
    contractData.movingPeriod = parseFloat(contractMovingPeriodInput.value) || 0;
    contractData.wellCompletionPeriod = parseFloat(contractWellCompletionPeriodInput.value) || 0;
    contractData.drillingPeriod = parseFloat(contractDrillingPeriodInput.value) || 0;
    
    // 保存到localStorage
    try {
        localStorage.setItem('contractData', JSON.stringify(contractData));
    } catch (e) {
        console.log('合同数据保存在内存中，刷新页面后将丢失');
    }
}

// 处理计算按钮点击事件
function handleCalculate() {
    // 验证输入
    if (contractData.productionTime <= 0 || 
        contractData.nonProductionTime <= 0 || 
        contractData.completionTime <= 0 ||
        contractData.movingPeriod <= 0 ||
        contractData.wellCompletionPeriod <= 0 ||
        contractData.drillingPeriod <= 0) {
        showToast('请输入有效的合同指标数据');
        return;
    }
    
    // 验证是否有数据
    if (calendarData.length === 0) {
        showToast('没有数据可用于计算，请先导入数据');
        return;
    }
    
    // 计算各项指标
    calculateAllIndicators();
    
    // 计算综合得分
    calculateOverallScore();
    
    // 更新雷达图
    updateRadarChart();
    
    // 显示计算结果
    displayCalculationResults();
    
    showToast('计算完成');
}

// 计算综合得分
function calculateOverallScore() {
    // 获取各项指标的得分
    const productionRateScore = calculationResults.productionRateScore || 0;
    const nonProductionRateScore = calculationResults.nonProductionRateScore || 0;
    const completionRateScore = calculationResults.completionScore || 0;
    const drillingEfficiencyScore = calculationResults.drillingEfficiencyScore || 0;
    const trippingEfficiencyScore = calculationResults.trippingEfficiencyScore || 0;
    const contractUtilizationScore = calculationResults.contractUtilization || 0;
    
    // 计算综合得分 = (生产时间达成率得分+非生产时效溢价率得分+中完时间达成率得分+纯钻时效得分+起下钻时效得分+合同时间利用率得分)/6
    const overallScore = (productionRateScore + nonProductionRateScore + completionRateScore + 
                         drillingEfficiencyScore + trippingEfficiencyScore + contractUtilizationScore) / 6;
    
    // 保存综合得分
    calculationResults.overallScore = overallScore;
    
    // 判断评价等级
    let evaluationLevel, evaluationDescription;
    
    if (overallScore >= 4.5) {
        evaluationLevel = '优秀+';
        evaluationDescription = '项目管理水平非常高，整体运营效率达到巅峰状态。生产时间控制精准，非生产时间极小，关键作业效率卓越，合同时间利用率最优。项目成为行业标杆，经济效益最大化。';
    } else if (overallScore >= 3.5) {
        evaluationLevel = '优秀';
        evaluationDescription = '项目管理表现优秀，大部分管理维度都能达到行业领先水平，但可能有个别管理维度不能领先于行业平均水平。项目运营高效，但仍有细节优化空间。';
    } else if (overallScore >= 2.5) {
        evaluationLevel = '良好+';
        evaluationDescription = '项目管理表现达到良好水平，但距离优秀有差距。项目管理没有突破性方法，而非生产时间控制或合同利用率可能表现平平。项目运营稳定，但效率提升潜力大。';
    } else if (overallScore >= 1.5) {
        evaluationLevel = '良好';
        evaluationDescription = '项目管理表现基本合格，单项目管理仍需改进，可能涉及生产时间偏差大、非生产时间超支或关键作业效率低下。项目存在明显运营风险，需系统性改进。';
    } else if (overallScore >= 0.5) {
        evaluationLevel = '一般';
        evaluationDescription = '项目管理表现较差，项目管理面临失控，可能包括生产时间严重超支、非生产时间失控、关键作业效率低下的问题。项目运营效率低，经济效益受损。';
    } else {
        evaluationLevel = '不合格';
        evaluationDescription = '项目管理表现极差，项目管理完全失控，项目严重偏离合同要求，运营效率极度低下，可能面临重大损失或违约风险。';
    }
    
    // 保存评价等级和描述
    calculationResults.evaluationLevel = evaluationLevel;
    calculationResults.evaluationDescription = evaluationDescription;
}

// 计算所有指标
function calculateAllIndicators() {
    // 筛选当前显示的数据
    let filteredData = calendarData;
    
    // 如果有选中的井号，则进一步筛选
    if (selectedWellNumber !== '') {
        filteredData = filteredData.filter(task => task.wellNumber === selectedWellNumber);
    }
    
    // 计算基础数据
    let wellCycleTime = 0;        // 建井周期（井号中的所有时间之和）
    let movingCycleTime = 0;       // 搬安周期（工况名称字段中所有含有搬安文本的时间之和）
    let drillingCycleTime = 0;     // 钻井周期（除了搬安周期、完井周期、测试周期之外的剩余时间之和）
    let completionCycleTime = 0;  // 完井周期（工况名称字段中所有含有完井文本的时间之和）
    let testingCycleTime = 0;      // 测试周期（工况名称字段中所有含有试油/测试/试气文本的时间之和）
    
    // 钻井周期内的生产时效和非生产时效
    let drillingProductionTime = 0;      // 钻井周期内的生产时效
    let drillingNonProductionTime = 0;   // 钻井周期内的非生产时效
    
    // 其他计算所需的数据
    let actualCompletionTime = 0; // 实际中完时间（固井工作时间与电测工作时间之和）
    let pureDrillingTime = 0;    // 纯钻时间
    let trippingTime = 0;        // 起下钻时间
    let footageWorkingTime = 0;  // 进尺工作时间
    
    // 计算各项时间
    filteredData.forEach(task => {
        // 建井周期：井号中的所有时间之和
        wellCycleTime += task.hours;
        
        // 搬安周期：工况名称字段中所有含有搬安文本的时间之和
        if (task.project.includes('搬安')) {
            movingCycleTime += task.hours;
        }
        // 完井周期：工况名称字段中所有含有完井文本的时间之和
        else if (task.project.includes('完井')) {
            completionCycleTime += task.hours;
        }
        // 测试周期：工况名称字段中所有含有试油/测试/试气文本的时间之和
        else if (task.project.includes('试油') || task.project.includes('测试') || task.project.includes('试气')) {
            testingCycleTime += task.hours;
        }
        // 钻井周期：除了搬安周期、完井周期、测试周期之外的剩余时间之和
        else {
            drillingCycleTime += task.hours;
            
            // 钻井周期内的生产时效和非生产时效
            if (task.type === '生产时效') {
                drillingProductionTime += task.hours;
            } else if (task.type === '非生产时效') {
                drillingNonProductionTime += task.hours;
            }
            
            // 计算实际中完时间（固井工作时间与电测工作时间之和）
            if (task.detail === '固井工作时间' || task.detail === '固井' || 
                task.detail === '电测工作时间' || task.detail === '电测') {
                actualCompletionTime += task.hours;
            }
            
            // 计算纯钻时间
            if (task.drillingDetail === '纯钻时间' || task.drillingDetail === '纯钻') {
                pureDrillingTime += task.hours;
            }
            
            // 计算起下钻时间（仅统计工况二级时效字段为进尺工作时间下的起下钻时间）
            if ((task.detail === '进尺工作时间' || task.detail === '进尺') && 
                (task.drillingDetail === '起下钻时间' || task.drillingDetail === '起下钻')) {
                trippingTime += task.hours;
            }
            
            // 计算进尺工作时间（工况二级时效字段下所有进尺工作时间之和）
            if (task.detail === '进尺工作时间' || task.detail === '进尺') {
                footageWorkingTime += task.hours;
            }
        }
    });
    
    // 1. 计算钻井周期生产时间达成率（原生产时间达成率）
    // 公式：|生产时间-合同生产时间|/合同生产时间×100%
    const productionRate = Math.abs((drillingProductionTime - contractData.productionTime) / contractData.productionTime * 100);
    calculationResults.productionRate = productionRate;
    
    // 1.1 生产时间达成率评分
    // 得分标准：优秀+：0.5%以内是优秀+，得5分；优秀：0.5%<B≤1%，得4分；良好+：1%<B≤3%，得3分；良好：3%<B≤5%，得2分，一般：5%<B≤10%，得1分，不合格：>10%不合格，得0分
    let productionRateScore;
    if (productionRate <= 0.5) {
        productionRateScore = 5;
    } else if (productionRate > 0.5 && productionRate <= 1) {
        productionRateScore = 4;
    } else if (productionRate > 1 && productionRate <= 3) {
        productionRateScore = 3;
    } else if (productionRate > 3 && productionRate <= 5) {
        productionRateScore = 2;
    } else if (productionRate > 5 && productionRate <= 10) {
        productionRateScore = 1;
    } else {
        productionRateScore = 0;
    }
    calculationResults.productionRateScore = productionRateScore;
    
    // 2. 计算非生产时效溢价率
    // 2.1 A.非生产时效占比：钻井周期内非生产时效/(钻井周期生产时效+钻井周期非生产时效)×100%
    const nonProductionRatio = drillingCycleTime > 0 ? (drillingNonProductionTime / drillingCycleTime) * 100 : 0;
    
    // 2.1 A得分
    let aScore;
    if (nonProductionRatio <= 0.3) {
        aScore = 5;
    } else if (nonProductionRatio > 0.3 && nonProductionRatio <= 0.5) {
        aScore = 4;
    } else if (nonProductionRatio > 0.5 && nonProductionRatio <= 0.8) {
        aScore = 3;
    } else if (nonProductionRatio > 0.8 && nonProductionRatio <= 1.0) {
        aScore = 2;
    } else if (nonProductionRatio > 1.0 && nonProductionRatio <= 2) {
        aScore = 1;
    } else {
        aScore = 0;
    }
    
    // 2.2 B.非生产时间合同符合率：钻井周期内非生产时间/合同非生产时间×100%
    const nonProductionContractRate = contractData.nonProductionTime > 0 ? (drillingNonProductionTime / contractData.nonProductionTime) * 100 : 0;
    
    // 2.2 B得分
    let bScore;
    if (nonProductionContractRate <= 60) {
        bScore = 5;
    } else if (nonProductionContractRate > 60 && nonProductionContractRate <= 70) {
        bScore = 4;
    } else if (nonProductionContractRate > 70 && nonProductionContractRate < 80) {
        bScore = 3;
    } else if (nonProductionContractRate > 80 && nonProductionContractRate < 90) {
        bScore = 2;
    } else if (nonProductionContractRate > 90 && nonProductionContractRate <= 100) {
        bScore = 1;
    } else {
        bScore = 0;
    }
    
    // 2.3 最终得分C：两者权重相加 A得分*0.35+B得分*0.65
    const finalScore = aScore * 0.35 + bScore * 0.65;
    calculationResults.nonProductionRate = finalScore;
    
    // 3. 计算中完时间达成率
    // 公式：实际中完时间 ÷ 合同中完时间
    const midCompletionRate = contractData.completionTime > 0 ? (actualCompletionTime / contractData.completionTime) : 0;
    calculationResults.completionRate = midCompletionRate * 100;
    
    // 3.1 中完时间达成率评分
    let midCompletionScore;
    if (midCompletionRate <= 0.6) {
        midCompletionScore = 5;
    } else if (midCompletionRate > 0.6 && midCompletionRate <= 0.7) {
        midCompletionScore = 4;
    } else if (midCompletionRate > 0.7 && midCompletionRate <= 0.8) {
        midCompletionScore = 3;
    } else if (midCompletionRate > 0.8 && midCompletionRate <= 0.9) {
        midCompletionScore = 2;
    } else if (midCompletionRate > 0.9 && midCompletionRate <= 1.0) {
        midCompletionScore = 1;
    } else {
        midCompletionScore = 0;
    }
    calculationResults.completionScore = midCompletionScore;
    
    // 4. 计算纯钻时效
    // 公式：纯钻时间/钻井周期×100%
    const drillingEfficiencyRate = drillingCycleTime > 0 ? (pureDrillingTime / drillingCycleTime) * 100 : 0;
    calculationResults.drillingEfficiency = drillingEfficiencyRate;
    
    // 4.1 纯钻时效评分
    let drillingEfficiencyScore;
    if (drillingEfficiencyRate >= 50) {
        drillingEfficiencyScore = 5;
    } else if (drillingEfficiencyRate >= 40) {
        drillingEfficiencyScore = 4;
    } else if (drillingEfficiencyRate >= 35) {
        drillingEfficiencyScore = 3;
    } else if (drillingEfficiencyRate >= 30) {
        drillingEfficiencyScore = 2;
    } else if (drillingEfficiencyRate >= 20) {
        drillingEfficiencyScore = 1;
    } else {
        drillingEfficiencyScore = 0;
    }
    calculationResults.drillingEfficiencyScore = drillingEfficiencyScore;
    
    // 5. 计算起下钻时效
    // 公式：起下钻时间/进尺工作时间×100%
    const trippingEfficiencyRate = footageWorkingTime > 0 ? (trippingTime / footageWorkingTime) * 100 : 0;
    calculationResults.trippingEfficiency = trippingEfficiencyRate;
    
    // 5.1 起下钻时效评分
    let trippingEfficiencyScore;
    if (trippingEfficiencyRate <= 20) {
        trippingEfficiencyScore = 5;
    } else if (trippingEfficiencyRate <= 25) {
        trippingEfficiencyScore = 4;
    } else if (trippingEfficiencyRate <= 30) {
        trippingEfficiencyScore = 3;
    } else if (trippingEfficiencyRate <= 35) {
        trippingEfficiencyScore = 2;
    } else if (trippingEfficiencyRate <= 40) {
        trippingEfficiencyScore = 1;
    } else {
        trippingEfficiencyScore = 0;
    }
    calculationResults.trippingEfficiencyScore = trippingEfficiencyScore;
    
    // 6. 计算合同时间利用率
    // 6.1 A1：搬安时间利用率：搬安周期/合同搬家周期*100%
    const moveInstallRate = contractData.movingPeriod > 0 ? (movingCycleTime / contractData.movingPeriod) * 100 : 0;
    
    // 6.1.1 A1评分
    let moveInstallScore;
    if (moveInstallRate <= 60) {
        moveInstallScore = 5;
    } else if (moveInstallRate > 60 && moveInstallRate <= 70) {
        moveInstallScore = 4;
    } else if (moveInstallRate > 70 && moveInstallRate <= 80) {
        moveInstallScore = 3;
    } else if (moveInstallRate > 80 && moveInstallRate <= 90) {
        moveInstallScore = 2;
    } else if (moveInstallRate > 90 && moveInstallRate <= 100) {
        moveInstallScore = 1;
    } else {
        moveInstallScore = 0;
    }
    
    // 6.2 B1: 钻井时间利用率：公式为：钻井周期-合同钻进周期/合同钻进周期*100%
    const drillingTimeRate = contractData.drillingPeriod > 0 ? ((drillingCycleTime - contractData.drillingPeriod) / contractData.drillingPeriod) * 100 : 0;
    
    // 6.2.1 B1评分
    let drillingTimeScore;
    if (drillingTimeRate <= 1) {
        drillingTimeScore = 5;
    } else if (drillingTimeRate > 1 && drillingTimeRate <= 3) {
        drillingTimeScore = 4;
    } else if (drillingTimeRate > 3 && drillingTimeRate <= 5) {
        drillingTimeScore = 3;
    } else if (drillingTimeRate > 5 && drillingTimeRate <= 7) {
        drillingTimeScore = 2;
    } else if (drillingTimeRate > 7 && drillingTimeRate <= 10) {
        drillingTimeScore = 1;
    } else {
        drillingTimeScore = 0;
    }
    
    // 6.3 C1：完井时间利用率：公式为：完井周期-合同完井周期/合同完井周期*100%
    const completionTimeRate = contractData.wellCompletionPeriod > 0 ? ((completionCycleTime - contractData.wellCompletionPeriod) / contractData.wellCompletionPeriod) * 100 : 0;
    
    // 6.3.1 C1评分
    let completionTimeScore;
    if (completionTimeRate <= 1) {
        completionTimeScore = 5;
    } else if (completionTimeRate > 1 && completionTimeRate <= 3) {
        completionTimeScore = 4;
    } else if (completionTimeRate > 3 && completionTimeRate <= 5) {
        completionTimeScore = 3;
    } else if (completionTimeRate > 5 && completionTimeRate <= 7) {
        completionTimeScore = 2;
    } else if (completionTimeRate > 7 && completionTimeRate <= 10) {
        completionTimeScore = 1;
    } else {
        completionTimeScore = 0;
    }
    
    // 6.4 最终得分D1：A×0.125+B×0.625+C×0.25
    const finalContractScore = moveInstallScore * 0.125 + drillingTimeScore * 0.625 + completionTimeScore * 0.25;
    calculationResults.contractUtilization = finalContractScore;
    
    // 显示调试信息到网页上

}

// 显示计算结果
function displayCalculationResults() {
    // 1. 生产时间达成率（5分制）
    productionRateValue.textContent = calculationResults.productionRateScore.toFixed(1) + '分';
    const prodProgress = document.getElementById('production-rate-progress');
    if (prodProgress) {
        const prodPercent = Math.max(0, Math.min(100, (calculationResults.productionRateScore / 5) * 100));
        prodProgress.style.width = prodPercent + '%';
        prodProgress.textContent = calculationResults.productionRateScore.toFixed(1) + '分';
    }
    
    // 2. 非生产时效溢价率（4分制）
    nonProductionRateValue.textContent = calculationResults.nonProductionRate.toFixed(2) + '分';
    const nonProdProgress = document.getElementById('non-production-rate-progress');
    if (nonProdProgress) {
        const nonProdPercent = Math.max(0, Math.min(100, (calculationResults.nonProductionRate / 4) * 100));
        nonProdProgress.style.width = nonProdPercent + '%';
        nonProdProgress.textContent = calculationResults.nonProductionRate.toFixed(2) + '分';
    }
    
    // 3. 中完时间达成率（5分制）
    completionRateValue.textContent = calculationResults.completionScore.toFixed(1) + '分';
    const completionProgress = document.getElementById('completion-rate-progress');
    if (completionProgress) {
        const completionPercent = Math.max(0, Math.min(100, (calculationResults.completionScore / 5) * 100));
        completionProgress.style.width = completionPercent + '%';
        completionProgress.textContent = calculationResults.completionScore.toFixed(1) + '分';
    }
    
    // 4. 纯钻时效（5分制）
    drillingEfficiencyValue.textContent = calculationResults.drillingEfficiencyScore.toFixed(1) + '分';
    const drillingProgress = document.getElementById('drilling-efficiency-progress');
    if (drillingProgress) {
        const drillingPercent = Math.max(0, Math.min(100, (calculationResults.drillingEfficiencyScore / 5) * 100));
        drillingProgress.style.width = drillingPercent + '%';
        drillingProgress.textContent = calculationResults.drillingEfficiencyScore.toFixed(1) + '分';
    }
    
    // 5. 起下钻时效（5分制）
    trippingEfficiencyValue.textContent = calculationResults.trippingEfficiencyScore.toFixed(1) + '分';
    const trippingProgress = document.getElementById('tripping-efficiency-progress');
    if (trippingProgress) {
        const trippingPercent = Math.max(0, Math.min(100, (calculationResults.trippingEfficiencyScore / 5) * 100));
        trippingProgress.style.width = trippingPercent + '%';
        trippingProgress.textContent = calculationResults.trippingEfficiencyScore.toFixed(1) + '分';
    }
    
    // 6. 合同时间利用率（4分制）
    contractUtilizationValue.textContent = calculationResults.contractUtilization.toFixed(2) + '分';
    const contractProgress = document.getElementById('contract-utilization-progress');
    if (contractProgress) {
        const contractPercent = Math.max(0, Math.min(100, (calculationResults.contractUtilization / 4) * 100));
        contractProgress.style.width = contractPercent + '%';
        contractProgress.textContent = calculationResults.contractUtilization.toFixed(2) + '分';
    }
    
    // 7. 综合得分
    const overallScoreElement = document.getElementById('overall-score');
    const evaluationLevelElement = document.getElementById('evaluation-level');
    const evaluationDescriptionElement = document.getElementById('evaluation-description');
    const evaluationBadgeElement = document.getElementById('evaluation-badge');
    
    if (overallScoreElement && evaluationLevelElement && evaluationDescriptionElement) {
        overallScoreElement.textContent = calculationResults.overallScore.toFixed(2);
        evaluationLevelElement.textContent = calculationResults.evaluationLevel;
        evaluationDescriptionElement.textContent = calculationResults.evaluationDescription;
        
        // 设置评价等级的样式
        evaluationLevelElement.className = 'level-value';
        if (calculationResults.evaluationLevel === '优秀+') {
            evaluationLevelElement.classList.add('excellent-plus');
        } else if (calculationResults.evaluationLevel === '优秀') {
            evaluationLevelElement.classList.add('excellent');
        } else if (calculationResults.evaluationLevel === '良好+') {
            evaluationLevelElement.classList.add('good-plus');
        } else if (calculationResults.evaluationLevel === '良好') {
            evaluationLevelElement.classList.add('good');
        } else if (calculationResults.evaluationLevel === '一般') {
            evaluationLevelElement.classList.add('average');
        } else if (calculationResults.evaluationLevel === '不合格') {
            evaluationLevelElement.classList.add('poor');
        }
        
        // 更新评价徽章
        if (evaluationBadgeElement) {
            evaluationBadgeElement.textContent = calculationResults.evaluationLevel;
            evaluationBadgeElement.className = 'evaluation-badge';
            if (calculationResults.evaluationLevel === '优秀+') {
                evaluationBadgeElement.style.background = 'rgba(82, 196, 26, 0.3)';
            } else if (calculationResults.evaluationLevel === '优秀') {
                evaluationBadgeElement.style.background = 'rgba(24, 144, 255, 0.3)';
            } else if (calculationResults.evaluationLevel === '良好+') {
                evaluationBadgeElement.style.background = 'rgba(19, 194, 194, 0.3)';
            } else if (calculationResults.evaluationLevel === '良好') {
                evaluationBadgeElement.style.background = 'rgba(250, 173, 20, 0.3)';
            } else if (calculationResults.evaluationLevel === '一般') {
                evaluationBadgeElement.style.background = 'rgba(250, 140, 22, 0.3)';
            } else if (calculationResults.evaluationLevel === '不合格') {
                evaluationBadgeElement.style.background = 'rgba(245, 34, 45, 0.3)';
            }
        }
    }
    
    // 更新雷达图
    updateRadarChart();
}

// 更新雷达图
function updateRadarChart() {
    const canvas = document.getElementById('radar-chart');
    if (!canvas) return;
    
    // 根据父容器宽度自适应画布大小，适当放大（上限560px，下限420px）
    const wrapper = canvas.parentElement;
    const containerWidth = wrapper ? wrapper.clientWidth : canvas.width;
    const targetSize = Math.max(420, Math.min(containerWidth, 560));
    if (canvas.width !== targetSize || canvas.height !== targetSize) {
        canvas.width = targetSize;
        canvas.height = targetSize;
    }
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.floor(targetSize * 0.42);
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 定义六个指标
    const indicators = [
        { name: '生产时间达成率', value: calculationResults.productionRateScore * 20, max: 100 }, // 将5分制转换为100分制
        { name: '非生产时效溢价率', value: calculationResults.nonProductionRate * 25, max: 100 }, // 将4分制转换为100分制
        { name: '中完时间达成率', value: calculationResults.completionScore * 20, max: 100 }, // 将5分制转换为100分制
        { name: '纯钻时效', value: calculationResults.drillingEfficiencyScore * 20, max: 100 }, // 将5分制转换为100分制
        { name: '起下钻时效', value: calculationResults.trippingEfficiencyScore * 20, max: 100 }, // 将5分制转换为100分制
        { name: '合同时间利用率', value: calculationResults.contractUtilization * 25, max: 100 } // 将4分制转换为100分制
    ];
    
    // 绘制雷达图背景
    const levels = 5; // 5个同心圆
    const angleStep = (Math.PI * 2) / indicators.length;
    
    // 绘制网格
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    for (let level = 1; level <= levels; level++) {
        const levelRadius = (radius / levels) * level;
        ctx.beginPath();
        
        for (let i = 0; i <= indicators.length; i++) {
            const angle = angleStep * i - Math.PI / 2;
            const x = centerX + Math.cos(angle) * levelRadius;
            const y = centerY + Math.sin(angle) * levelRadius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
    }
    
    // 绘制轴线
    for (let i = 0; i < indicators.length; i++) {
        const angle = angleStep * i - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();
    }
    
    // 绘制指标名称
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    for (let i = 0; i < indicators.length; i++) {
        const angle = angleStep * i - Math.PI / 2;
        const x = centerX + Math.cos(angle) * (radius + Math.floor(targetSize * 0.05));
        const y = centerY + Math.sin(angle) * (radius + Math.floor(targetSize * 0.05));
        
        ctx.fillText(indicators[i].name, x, y);
    }
    
    // 绘制数据区域
    ctx.beginPath();
    ctx.fillStyle = 'rgba(76, 175, 80, 0.3)'; // 半透明绿色
    ctx.strokeStyle = '#4CAF50'; // 绿色边框
    ctx.lineWidth = 2;
    
    for (let i = 0; i <= indicators.length; i++) {
        const index = i % indicators.length;
        const indicator = indicators[index];
        const value = Math.min(indicator.value, indicator.max);
        const normalizedValue = (value / indicator.max) * radius;
        const angle = angleStep * index - Math.PI / 2;
        const x = centerX + Math.cos(angle) * normalizedValue;
        const y = centerY + Math.sin(angle) * normalizedValue;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.fill();
    ctx.stroke();
    
    // 绘制数据点
    ctx.fillStyle = '#4CAF50';
    
    for (let i = 0; i < indicators.length; i++) {
        const indicator = indicators[i];
        const value = Math.min(indicator.value, indicator.max);
        const normalizedValue = (value / indicator.max) * radius;
        const angle = angleStep * i - Math.PI / 2;
        const x = centerX + Math.cos(angle) * normalizedValue;
        const y = centerY + Math.sin(angle) * normalizedValue;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}