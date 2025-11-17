// 全局变量
let projectData = [];
let currentProject = '';
let currentTask = '';
let charts = {};

// CSV解析函数
function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
        throw new Error('CSV文件中没有有效数据');
    }
    
    console.log('CSV总行数:', lines.length);
    
    // 解析标题行
    const headers = parseCSVLine(lines[0]);
    console.log('CSV标题列数:', headers.length);
    console.log('CSV标题:', headers);
    
    // 解析数据行
    const data = [headers]; // 第一行是标题
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue; // 跳过空行
        
        const values = parseCSVLine(line);
        
        // 确保数据行的列数与标题行一致
        while (values.length < headers.length) {
            values.push(''); // 填充缺失的列
        }
        
        if (values.length > headers.length) {
            // 如果数据行列数多于标题行，截断多余部分
            values.length = headers.length;
        }
        
        data.push(values);
    }
    
    console.log('解析后的CSV数据行数:', data.length);
    return data;
}

// 解析CSV单行
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i+1] === '"') {
                // 转义的引号
                current += '"';
                i++; // 跳过下一个引号
            } else {
                // 开始或结束引号
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // 字段分隔符
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

// DOM元素
const fileInput = document.getElementById('excel-file');
const fileName = document.getElementById('file-name');
const loadingIndicator = document.getElementById('loading-indicator');
const noDataMessage = document.getElementById('no-data-message');
const dataVisualization = document.getElementById('data-visualization');
const projectSelect = document.getElementById('project-select');
const taskSelect = document.getElementById('task-select');

// 单个任务评价的DOM元素
const healthTaskSelect = document.getElementById('health-task-select');
const luckTaskSelect = document.getElementById('luck-task-select');

// 事件监听器
document.addEventListener('DOMContentLoaded', function() {
    fileInput.addEventListener('change', handleFileUpload);
    projectSelect.addEventListener('change', handleProjectChange);
    taskSelect.addEventListener('change', handleTaskChange);
    
    // 单个任务评价的事件监听器
    if (healthTaskSelect) {
        healthTaskSelect.addEventListener('change', handleHealthTaskChange);
    }
    if (luckTaskSelect) {
        luckTaskSelect.addEventListener('change', handleLuckTaskChange);
    }
    
    // 更新文件输入，只支持Excel文件
    fileInput.accept = '.xlsx,.xls';
    
    // 检查Chart.js是否已加载
    if (typeof Chart === 'undefined') {
        console.error('Chart.js库未加载');
        // 尝试重新加载Chart.js
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = function() {
            console.log('Chart.js库已重新加载');
        };
        script.onerror = function() {
            console.error('Chart.js库加载失败');
            alert('图表库加载失败，请检查网络连接');
        };
        document.head.appendChild(script);
    }
    
    // 检查XLSX库是否已加载
    if (typeof XLSX === 'undefined') {
        console.error('XLSX库未加载');
        // 尝试重新加载XLSX库
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = function() {
            console.log('XLSX库已重新加载');
        };
        script.onerror = function() {
            console.error('XLSX库加载失败');
            alert('Excel处理库加载失败，请检查网络连接');
        };
        document.head.appendChild(script);
    }
});

// 处理文件上传
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    fileName.textContent = file.name;
    showLoadingIndicator();

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let jsonData;
            
            // 处理Excel文件
            const data = new Uint8Array(e.target.result);
            console.log('文件大小:', data.length, '字节');
            
            // 尝试不同的读取方式
            let workbook;
            try {
                // 首先尝试使用默认方式
                workbook = XLSX.read(data, { type: 'array' });
            } catch (error1) {
                console.error('默认方式读取失败，尝试其他方式:', error1);
                try {
                    // 尝试使用base64方式
                    const base64 = btoa(String.fromCharCode(...data));
                    workbook = XLSX.read(base64, { type: 'base64' });
                } catch (error2) {
                    console.error('base64方式读取失败，尝试binary方式:', error2);
                    try {
                        // 尝试使用binary方式
                        workbook = XLSX.read(data, { type: 'binary' });
                    } catch (error3) {
                        console.error('binary方式读取失败:', error3);
                        throw new Error('无法解析Excel文件，请检查文件格式是否正确');
                    }
                }
            }
            
            // 检查工作簿是否有工作表
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('Excel文件中没有工作表');
            }
            
            console.log('工作表名称:', workbook.SheetNames);
            
            // 获取第一个工作表
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            console.log('工作表引用范围:', worksheet['!ref']);
            
            // 检查工作表是否有数据
            if (!worksheet || !worksheet['!ref']) {
                throw new Error('工作表中没有数据');
            }
            
            // 将工作表转换为JSON
            jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            console.log('成功读取Excel数据，行数:', jsonData.length);
            
            // 检查转换后的数据
            if (!jsonData || jsonData.length === 0) {
                throw new Error('无法从文件读取数据');
            }
            
            console.log('第一行（标题）:', jsonData[0]);
            
            // 处理数据
            const result = processData(jsonData);
            
            if (result === false) {
                throw new Error('数据处理失败');
            }
            
            // 显示数据可视化
            showDataVisualization();
            
            // 确保Chart.js已加载后再初始化图表
            if (typeof Chart === 'undefined') {
                console.error('Chart.js库未加载，等待加载...');
                // 等待Chart.js加载完成
                const checkChart = setInterval(() => {
                    if (typeof Chart !== 'undefined') {
                        clearInterval(checkChart);
                        console.log('Chart.js已加载，初始化图表');
                        initializeCharts();
                    }
                }, 100);
                
                // 设置超时，避免无限等待
                setTimeout(() => {
                    clearInterval(checkChart);
                    if (typeof Chart === 'undefined') {
                        console.error('Chart.js加载超时');
                        alert('图表库加载失败，请刷新页面重试');
                    }
                }, 5000);
            } else {
                // 初始化图表
                initializeCharts();
            }
            
            hideLoadingIndicator();
        } catch (error) {
            console.error('解析文件时出错:', error);
            alert(`解析文件时出错: ${error.message}。请检查文件格式是否正确`);
            hideLoadingIndicator();
        }
    };
    
    reader.onerror = function() {
        console.error('读取文件时出错');
        alert('读取文件时出错，请重试');
        hideLoadingIndicator();
    };
    
    // 只使用ArrayBuffer方式读取Excel文件
    reader.readAsArrayBuffer(file);
}

// 处理Excel数据
function processData(jsonData) {
    try {
        // 检查是否有数据
        if (!jsonData || jsonData.length < 2) {
            console.error('Excel文件中没有有效数据');
            alert('Excel文件中没有有效数据，需要至少包含标题行和一行数据');
            return false;
        }

        // 获取标题行
        const headers = jsonData[0];
        console.log('标题行:', headers);
        
        // 检查必要的列是否存在
        const requiredColumns = ['项目名称', '任务名称'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
            console.error('缺少必要的列:', missingColumns);
            alert(`Excel文件缺少必要的列: ${missingColumns.join(', ')}`);
            return false;
        }
        
        // 映射列索引
        const columnMap = {
            '项目名称': headers.indexOf('项目名称'),
            '年度': headers.indexOf('年度'),
            '任务名称': headers.indexOf('任务名称'),
            '工作分解结构描述': headers.indexOf('工作分解结构描述'),
            '计划开始时间': headers.indexOf('计划开始时间'),
            '计划完成时间': headers.indexOf('计划完成时间'),
            '实际开始时间': headers.indexOf('实际开始时间'),
            '实际完成时间': headers.indexOf('实际完成时间'),
            '实际工作量': headers.indexOf('实际工作量'),
            '单位': headers.indexOf('单位'),
            '综合单价': headers.indexOf('综合单价'),
            '附加费用': headers.indexOf('附加费用'),
            '合计价值工作量': headers.indexOf('合计价值工作量'),
            '任务成本': headers.indexOf('任务成本'),
            '收入计划': headers.indexOf('收入计划'),
            '确认收入时间': headers.indexOf('确认收入时间'),
            '已确认金额': headers.indexOf('已确认金额'),
            '收现时间': headers.indexOf('收现时间'),
            '收现金额': headers.indexOf('收现金额')
        };

        // 转换数据
        projectData = [];
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            const record = {};
            for (const [key, index] of Object.entries(columnMap)) {
                if (index !== -1 && row[index] !== undefined) {
                    record[key] = row[index];
                }
            }
            
            // 确保必要字段存在
            if (record['项目名称'] && record['任务名称']) {
                projectData.push(record);
            }
        }

        console.log('处理后的数据条数:', projectData.length);
        
        if (projectData.length === 0) {
            console.error('没有有效的数据行');
            alert('Excel文件中没有有效的数据行');
            return false;
        }

        // 填充项目选择器
        populateProjectSelector();
        
        return true;
    } catch (error) {
        console.error('处理数据时出错:', error);
        alert(`处理数据时出错: ${error.message}`);
        return false;
    }
}

// 填充项目选择器
function populateProjectSelector() {
    // 获取所有唯一项目
    const projects = [...new Set(projectData.map(item => item['项目名称']))];
    
    // 清空选择器
    projectSelect.innerHTML = '<option value="">所有项目</option>';
    
    // 添加项目选项
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        option.textContent = project;
        projectSelect.appendChild(option);
    });
}

// 处理项目变更
function handleProjectChange() {
    currentProject = projectSelect.value;
    
    // 填充任务选择器
    populateTaskSelector();
    
    // 更新数据可视化
    updateDataVisualization();
}

// 填充任务选择器
function populateTaskSelector() {
    // 获取当前项目的所有唯一任务
    const tasks = currentProject 
        ? [...new Set(projectData
            .filter(item => item['项目名称'] === currentProject)
            .map(item => item['任务名称']))]
        : [...new Set(projectData.map(item => item['任务名称']))];
    
    // 清空主任务选择器
    taskSelect.innerHTML = '<option value="">所有任务</option>';
    
    // 清空健康评价任务选择器
    if (healthTaskSelect) {
        healthTaskSelect.innerHTML = '<option value="">选择任务</option>';
    }
    
    // 清空韧性评价任务选择器
    if (luckTaskSelect) {
        luckTaskSelect.innerHTML = '<option value="">选择任务</option>';
    }
    
    // 添加任务选项到所有选择器
    tasks.forEach(task => {
        // 主任务选择器
        const option = document.createElement('option');
        option.value = task;
        option.textContent = task;
        taskSelect.appendChild(option);
        
        // 健康评价任务选择器
        if (healthTaskSelect) {
            const healthOption = document.createElement('option');
            healthOption.value = task;
            healthOption.textContent = task;
            healthTaskSelect.appendChild(healthOption);
        }
        
        // 韧性评价任务选择器
        if (luckTaskSelect) {
            const luckOption = document.createElement('option');
            luckOption.value = task;
            luckOption.textContent = task;
            luckTaskSelect.appendChild(luckOption);
        }
    });
    
    // 更新当前任务
    currentTask = taskSelect.value;
}

// 处理任务变更
function handleTaskChange() {
    currentTask = taskSelect.value;
    
    // 更新数据可视化
    updateDataVisualization();
}

// 处理健康评价任务选择变化
function handleHealthTaskChange() {
    const selectedTask = healthTaskSelect.value;
    if (!selectedTask) return;
    
    // 获取选中任务的数据
    const taskData = projectData.filter(item => item['任务名称'] === selectedTask);
    
    if (taskData.length === 0) {
        console.error('找不到选中任务的数据');
        return;
    }
    
    // 计算单个任务的健康评价
    const evaluation = calculateTaskHealthEvaluation(taskData);
    
    // 显示单个任务的健康评价
    displayTaskHealthEvaluation(evaluation);
}

// 显示单个任务健康评价结果
function displayTaskHealthEvaluation(evaluation) {
    // 更新单个任务健康评价雷达图
    updateTaskHealthRadarChart(evaluation);
    
    // 更新单个任务健康评价指标详情
    updateTaskHealthIndicators(evaluation);
    
    // 更新单个任务健康评价总体评价
    updateTaskHealthOverall(evaluation);
}

// 处理韧性任务选择变化
function handleLuckTaskChange() {
    const selectedTask = luckTaskSelect.value;
    if (!selectedTask) return;
    
    // 获取选中任务的数据
    const taskData = projectData.filter(item => item['任务名称'] === selectedTask);
    
    if (taskData.length === 0) {
        console.error('找不到选中任务的数据');
        return;
    }
    
    // 计算单个任务的韧性评价
    const evaluation = calculateTaskLuckEvaluation(taskData);
    
    // 显示单个任务的韧性评价
    displayTaskLuckEvaluation(evaluation);
}

// 更新单个任务健康评价雷达图
function updateTaskHealthRadarChart(evaluation) {
    const ctx = document.getElementById('task-health-radar-chart').getContext('2d');
    
    // 如果已有图表，先销毁
    if (taskHealthRadarChart) {
        taskHealthRadarChart.destroy();
    }
    
    // 创建新的雷达图
    taskHealthRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['进度偏差指数', '成本绩效指数', '收入健康度', '现金流贴现指数', '价值效率指数', '计划校准分数', '合同完成率'],
            datasets: [{
                label: '任务健康评价',
                data: [
                    evaluation.scores.SVI,
                    evaluation.scores.CPI,
                    evaluation.scores.RHI,
                    evaluation.scores.DCFI,
                    evaluation.scores.VEI,
                    evaluation.scores.PCS,
                    evaluation.scores.CCR
                ],
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(75, 192, 192, 1)'
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.raw.toFixed(1) + '分';
                        }
                    }
                }
            },
            maintainAspectRatio: false
        }
    });
}

// 更新单个任务健康评价指标详情
function updateTaskHealthIndicators(evaluation) {
    const indicatorsContainer = document.getElementById('task-health-indicators');
    
    const indicators = [
        { key: 'SVI', name: '进度偏差指数', value: evaluation.SVI, score: evaluation.scores.SVI, unit: '', description: '反映任务进度与计划的一致性，值越接近1越好' },
        { key: 'CPI', name: '成本绩效指数', value: evaluation.CPI, score: evaluation.scores.CPI, unit: '', description: '反映任务成本控制效率，值大于1表示成本节约' },
        { key: 'RHI', name: '收入健康度', value: evaluation.RHI, score: evaluation.scores.RHI, unit: '', description: '反映任务收入确认的健康程度，值越接近1越好' },
        { key: 'DCFI', name: '现金流贴现指数', value: evaluation.DCFI, score: evaluation.scores.DCFI, unit: '', description: '反映任务现金流的健康程度，值越大越好' },
        { key: 'VEI', name: '价值效率指数', value: evaluation.VEI, score: evaluation.scores.VEI, unit: '', description: '反映任务价值创造的效率，值越大越好' },
        { key: 'PCS', name: '计划校准分数', value: evaluation.PCS, score: evaluation.scores.PCS, unit: '', description: '反映任务计划与实际执行的校准程度，值越接近1越好' },
        { key: 'CCR', name: '合同完成率', value: evaluation.CCR, score: evaluation.scores.CCR, unit: '', description: '反映合同金额的完成情况，值越接近1越好' }
    ];
    
    let indicatorsHTML = '';
    indicators.forEach(indicator => {
        const scoreClass = getScoreClass(indicator.score);
        indicatorsHTML += `
            <div class="indicator-item">
                <div class="indicator-header">
                    <h4>${indicator.name}</h4>
                    <div class="indicator-score ${scoreClass}">${indicator.score.toFixed(1)}</div>
                </div>
                <div class="indicator-value">
                    <span class="value-bar">
                        <span class="value-fill ${scoreClass}" style="width: ${indicator.score}%"></span>
                    </span>
                    <span class="value-text">${indicator.value.toFixed(3)}${indicator.unit}</span>
                </div>
                <p class="indicator-description">${indicator.description}</p>
            </div>
        `;
    });
    
    indicatorsContainer.innerHTML = indicatorsHTML;
}

// 更新单个任务健康评价总体评价
function updateTaskHealthOverall(evaluation) {
    const overallContainer = document.getElementById('task-health-overall');
    
    const scoreClass = getScoreClass(evaluation.overallScore);
    const levelColor = getLevelColor(evaluation.level);
    
    overallContainer.innerHTML = `
        <div class="overall-score">
            <div class="score-value ${scoreClass}">${evaluation.overallScore.toFixed(1)}</div>
            <div class="score-level" style="color: ${levelColor}">${evaluation.level}</div>
        </div>
        <p class="overall-description">${evaluation.description}</p>
    `;
}

// 计算单个任务的健康评价
function calculateTaskHealthEvaluation(taskData) {
    if (taskData.length === 0) {
        return {
            SVI: 0, CPI: 0, RHI: 0, DCFI: 0, VEI: 0, PCS: 0, CCR: 0,
            scores: { SVI: 0, CPI: 0, RHI: 0, DCFI: 0, VEI: 0, PCS: 0, CCR: 0 },
            overallScore: 0,
            level: '数据不足',
            description: '没有足够的数据进行健康评价'
        };
    }
    
    // 计算各项指标
    const evaluation = {
        SVI: calculateSVI(taskData),
        CPI: calculateCPI(taskData),
        RHI: calculateRHI(taskData),
        DCFI: calculateDCFI(taskData),
        VEI: calculateVEI(taskData),
        PCS: calculatePCS(taskData),
        CCR: calculateContractCompletionRate(taskData)
    };
    
    // 将指标转换为分数（0-100）
    evaluation.scores = {
        SVI: convertSVIToScore(evaluation.SVI),
        CPI: convertCPIToScore(evaluation.CPI),
        RHI: convertRHPIToScore(evaluation.RHI),
        DCFI: convertDCFIToScore(evaluation.DCFI),
        VEI: convertVEIToScore(evaluation.VEI),
        PCS: convertPCSToScore(evaluation.PCS),
        CCR: convertCCRToScore(evaluation.CCR)
    };
    
    // 计算综合分数
    evaluation.overallScore = 
        0.15 * evaluation.scores.SVI + 
        0.20 * evaluation.scores.CPI + 
        0.15 * evaluation.scores.RHI + 
        0.20 * evaluation.scores.DCFI + 
        0.15 * evaluation.scores.VEI + 
        0.10 * evaluation.scores.PCS +
        0.05 * evaluation.scores.CCR;
    
    // 确定健康等级和结论
    if (evaluation.overallScore >= 85) {
        evaluation.level = '优秀';
        evaluation.description = '任务运行卓越，保持最佳实践，总结经验推广';
    } else if (evaluation.overallScore >= 70) {
        evaluation.level = '良好';
        evaluation.description = '任务健康可控，持续监控，局部优化改进';
    } else if (evaluation.overallScore >= 55) {
        evaluation.level = '一般';
        evaluation.description = '任务存在风险，制定改进计划，重点关注薄弱环节';
    } else if (evaluation.overallScore >= 40) {
        evaluation.level = '预警';
        evaluation.description = '任务健康度不足，立即干预，调整任务策略';
    } else {
        evaluation.level = '危险';
        evaluation.description = '任务严重偏离，重大调整或考虑任务重启';
    }
    
    return evaluation;
}

// 处理韧性评价任务选择变化
function handleLuckTaskChange() {
    const selectedTask = luckTaskSelect.value;
    if (!selectedTask) return;
    
    // 获取选中任务的数据
    const taskData = projectData.filter(item => item['任务名称'] === selectedTask);
    
    if (taskData.length === 0) {
        console.error('找不到选中任务的数据');
        return;
    }
    
    // 计算单个任务的韧性评价
    const evaluation = calculateTaskLuckEvaluation(taskData);
    
    // 显示单个任务的韧性评价
    displayTaskLuckEvaluation(evaluation);
}

// 显示单个任务韧性评价结果
function displayTaskLuckEvaluation(evaluation) {
    // 更新单个任务韧性评价雷达图
    updateTaskLuckRadarChart(evaluation);
    
    // 更新单个任务韧性评价指标详情
    updateTaskLuckIndicators(evaluation);
    
    // 更新单个任务韧性评价总体评价
    updateTaskLuckOverall(evaluation);
}

// 更新单个任务韧性评价雷达图
function updateTaskLuckRadarChart(evaluation) {
    const ctx = document.getElementById('task-luck-radar-chart').getContext('2d');
    
    // 如果已有图表，先销毁
    if (taskLuckRadarChart) {
        taskLuckRadarChart.destroy();
    }
    
    // 创建新的雷达图
    taskLuckRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['回款率', '每米收入', '收入偏差', '时间波动稳定性', '工作量收入弹性', '综合绩效偏离度'],
            datasets: [{
                label: '任务韧性评价',
                data: [
                    evaluation.scores.collectionRate,
                    evaluation.scores.revenuePerMeter,
                    evaluation.scores.revenueDeviation,
                    evaluation.scores.timeStability,
                    evaluation.scores.workIncomeElasticity,
                    evaluation.scores.performanceDeviation
                ],
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(255, 159, 64, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(255, 159, 64, 1)'
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.raw.toFixed(1) + '分';
                        }
                    }
                }
            },
            maintainAspectRatio: false
        }
    });
}

// 更新单个任务韧性评价指标详情
function updateTaskLuckIndicators(evaluation) {
    const indicatorsContainer = document.getElementById('task-luck-indicators');
    
    const indicators = [
        { key: 'collectionRate', name: '回款率', value: evaluation.collectionRate, score: evaluation.scores.collectionRate, unit: '%', description: '衡量任务回款效率，值越高越好' },
        { key: 'revenuePerMeter', name: '每米收入', value: evaluation.revenuePerMeter, score: evaluation.scores.revenuePerMeter, unit: '', description: '衡量单位工作量的收入水平' },
        { key: 'revenueDeviation', name: '收入偏差', value: evaluation.revenueDeviation, score: evaluation.scores.revenueDeviation, unit: '', description: '衡量任务收入偏差情况' },
        { key: 'timeStability', name: '时间波动稳定性', value: evaluation.timeStability, score: evaluation.scores.timeStability, unit: '', description: '衡量收入确认和收现时间的稳定性' },
        { key: 'workIncomeElasticity', name: '工作量收入弹性', value: evaluation.workIncomeElasticity, score: evaluation.scores.workIncomeElasticity, unit: '', description: '衡量工作量与收入之间的关系' },
        { key: 'performanceDeviation', name: '综合绩效偏离度', value: evaluation.performanceDeviation, score: evaluation.scores.performanceDeviation, unit: '', description: '衡量任务绩效与预期的偏离程度' }
    ];
    
    let indicatorsHTML = '';
    indicators.forEach(indicator => {
        const scoreClass = getScoreClass(indicator.score);
        indicatorsHTML += `
            <div class="indicator-item">
                <div class="indicator-header">
                    <h4>${indicator.name}</h4>
                    <div class="indicator-score ${scoreClass}">${indicator.score.toFixed(1)}</div>
                </div>
                <div class="indicator-value">
                    <span class="value-bar">
                        <span class="value-fill ${scoreClass}" style="width: ${indicator.score}%"></span>
                    </span>
                    <span class="value-text">${indicator.value.toFixed(3)}${indicator.unit}</span>
                </div>
                <p class="indicator-description">${indicator.description}</p>
            </div>
        `;
    });
    
    indicatorsContainer.innerHTML = indicatorsHTML;
}

// 更新单个任务韧性评价总体评价
function updateTaskLuckOverall(evaluation) {
    const overallContainer = document.getElementById('task-luck-overall');
    
    const scoreClass = getScoreClass(evaluation.overallScore);
    const levelColor = getLevelColor(evaluation.level);
    
    overallContainer.innerHTML = `
        <div class="overall-score">
            <div class="score-value ${scoreClass}">${evaluation.overallScore.toFixed(1)}</div>
            <div class="score-level" style="color: ${levelColor}">${evaluation.level}</div>
        </div>
        <p class="overall-description">${evaluation.description}</p>
    `;
}

// 计算单个任务的韧性评价
function calculateTaskLuckEvaluation(taskData) {
    if (taskData.length === 0) {
        return {
            collectionRate: 0, revenuePerMeter: 0, revenueDeviation: 0,
            timeStability: 0, workIncomeElasticity: 0, performanceDeviation: 0,
            scores: { collectionRate: 0, revenuePerMeter: 0, revenueDeviation: 0, timeStability: 0, workIncomeElasticity: 0, performanceDeviation: 0 },
            overallScore: 0,
            level: '数据不足',
            description: '没有足够的数据进行韧性评价'
        };
    }
    
    // 计算各项指标
    const evaluation = {
        collectionRate: calculateCollectionRate(taskData),
        revenuePerMeter: calculateRevenuePerMeter(taskData),
        revenueDeviation: calculateRevenueDeviation(taskData),
        timeStability: calculateTimeStability(taskData),
        workIncomeElasticity: calculateWorkIncomeElasticity(taskData),
        performanceDeviation: calculatePerformanceDeviation(taskData)
    };
    
    // 将指标转换为分数（0-100）
    evaluation.scores = {
        collectionRate: convertCollectionRateToScore(evaluation.collectionRate),
        revenuePerMeter: convertRevenuePerMeterToScore(evaluation.revenuePerMeter, taskData),
        revenueDeviation: convertRevenueDeviationToScore(evaluation.revenueDeviation),
        timeStability: convertTimeStabilityToScore(evaluation.timeStability),
        workIncomeElasticity: convertWorkIncomeElasticityToScore(evaluation.workIncomeElasticity),
        performanceDeviation: convertPerformanceDeviationToScore(evaluation.performanceDeviation)
    };
    
    // 计算综合分数（各项指标权重相同）
    evaluation.overallScore = Object.values(evaluation.scores).reduce((sum, score) => sum + score, 0) / 6;
    
    // 确定韧性等级和结论
    if (evaluation.overallScore >= 80) {
        evaluation.level = '韧性极佳';
        evaluation.description = '外部环境整体有利，各维度表现超预期';
    } else if (evaluation.overallScore >= 60) {
        evaluation.level = '韧性良好';
        evaluation.description = '核心指标受外部干扰较小，整体符合预期';
    } else if (evaluation.overallScore >= 40) {
        evaluation.level = '韧性一般';
        evaluation.description = '外部因素正负影响均衡，需关注个别指标波动';
    } else if (evaluation.overallScore >= 20) {
        evaluation.level = '韧性较差';
        evaluation.description = '受客户延迟、成本上涨等外部因素拖累，多项指标不达标';
    } else {
        evaluation.level = '韧性极差';
        evaluation.description = '受重大外部风险冲击，任务运行异常';
    }
    
    return evaluation;
}

// 获取当前筛选后的数据
function getFilteredData() {
    let filtered = [...projectData];
    
    if (currentProject) {
        filtered = filtered.filter(item => item['项目名称'] === currentProject);
    }
    
    if (currentTask) {
        filtered = filtered.filter(item => item['任务名称'] === currentTask);
    }
    
    return filtered;
}

// 更新数据可视化
function updateDataVisualization() {
    const filteredData = getFilteredData();
    
    // 更新项目总体情况
    updateProjectOverview(filteredData);
    
    // 更新单任务分析
    updateTaskAnalysis(filteredData);
    
    // 更新图表
    updateCharts(filteredData);
}

// 更新项目总体情况
function updateProjectOverview(data) {
    // 计算总收入
    const totalRevenue = data.reduce((sum, item) => {
        return sum + (parseFloat(item['合计价值工作量']) || 0);
    }, 0);
    document.getElementById('total-revenue').textContent = formatCurrency(totalRevenue);
    
    // 计算各项指标
    const tcv = totalRevenue; // 合同总金额
    const ev = totalRevenue; // 价值工作量
    const rr = data.reduce((sum, item) => {
        return sum + (parseFloat(item['已确认金额']) || 0);
    }, 0); // 已确认收入
    const cc = data.reduce((sum, item) => {
        return sum + (parseFloat(item['收现金额']) || 0);
    }, 0); // 收现
    const ar = rr - cc; // 已开票未回款
    const rrp = data.reduce((sum, item) => {
        return sum + (parseFloat(item['收入计划']) || 0);
    }, 0); // 收入计划
    const collectionRate = tcv > 0 ? (cc / tcv * 100) : 0; // 回款率
    const revenueDeviation = rr - rrp; // 收入偏差
    
    // 更新DOM
    document.getElementById('tcv').textContent = formatCurrency(tcv);
    document.getElementById('ev').textContent = formatCurrency(ev);
    document.getElementById('rr').textContent = formatCurrency(rr);
    document.getElementById('ar').textContent = formatCurrency(ar);
    document.getElementById('cc').textContent = formatCurrency(cc);
    document.getElementById('rrp').textContent = formatCurrency(rrp);
    document.getElementById('collection-rate').textContent = formatPercentage(collectionRate);
    document.getElementById('revenue-deviation').textContent = formatCurrency(revenueDeviation);
}

// 更新单任务分析
function updateTaskAnalysis(data) {
    if (!currentTask || data.length === 0) {
        // 清空单任务数据
        document.getElementById('task-ev').textContent = '0';
        document.getElementById('task-rr').textContent = '0';
        document.getElementById('task-ar').textContent = '0';
        document.getElementById('task-cc').textContent = '0';
        document.getElementById('task-rrp').textContent = '0';
        document.getElementById('task-collection-rate').textContent = '0%';
        document.getElementById('task-revenue-deviation').textContent = '0';
        
        document.getElementById('revenue-confirmation-diff').textContent = '0天';
        document.getElementById('cash-collection-diff').textContent = '0天';
        document.getElementById('avg-revenue-confirmation').textContent = '0天';
        document.getElementById('avg-cash-collection').textContent = '0天';
        document.getElementById('revenue-per-meter').textContent = '0';
        document.getElementById('cost-per-meter').textContent = '0';
        
        return;
    }
    
    // 计算单任务指标
    const taskEv = data.reduce((sum, item) => {
        return sum + (parseFloat(item['合计价值工作量']) || 0);
    }, 0); // 价值工作量
    const taskRr = data.reduce((sum, item) => {
        return sum + (parseFloat(item['已确认金额']) || 0);
    }, 0); // 已确认收入
    const taskCc = data.reduce((sum, item) => {
        return sum + (parseFloat(item['收现金额']) || 0);
    }, 0); // 收现
    const taskAr = taskRr - taskCc; // 已开票未回款
    const taskRrp = data.reduce((sum, item) => {
        return sum + (parseFloat(item['收入计划']) || 0);
    }, 0); // 收入计划
    const taskTcv = taskEv; // 合同总金额
    const taskCollectionRate = taskTcv > 0 ? (taskCc / taskTcv * 100) : 0; // 回款率
    const taskRevenueDeviation = taskRr - taskRrp; // 收入偏差
    
    // 更新DOM - 卡片组1
    document.getElementById('task-ev').textContent = formatCurrency(taskEv);
    document.getElementById('task-rr').textContent = formatCurrency(taskRr);
    document.getElementById('task-ar').textContent = formatCurrency(taskAr);
    document.getElementById('task-cc').textContent = formatCurrency(taskCc);
    document.getElementById('task-rrp').textContent = formatCurrency(taskRrp);
    document.getElementById('task-collection-rate').textContent = formatPercentage(taskCollectionRate);
    document.getElementById('task-revenue-deviation').textContent = formatCurrency(taskRevenueDeviation);
    
    // 计算时间差和平均时间
    const completedTasks = data.filter(item => item['实际完成时间']);
    
    if (completedTasks.length > 0) {
        // 找出单个任务的第一行和最后一行
        // 按照原始数据顺序排列，找出第一行和最后一行
        const firstRow = completedTasks[0];
        const lastRow = completedTasks[completedTasks.length - 1];
        
        // 计算收入确认时间差：单个任务最后一行的实际完成时间与第一行确认收入时间之差
        const revenueConfirmationDiff = firstRow['确认收入时间'] && lastRow['实际完成时间'] ? 
            Math.round((parseDate(lastRow['实际完成时间']) - parseDate(firstRow['确认收入时间'])) / (1000 * 60 * 60 * 24)) : 0;
        
        // 计算收现时间差：单个任务最后一行的实际完成时间与第一行收现时间之差
        const cashCollectionDiff = firstRow['收现时间'] && lastRow['实际完成时间'] ? 
            Math.round((parseDate(lastRow['实际完成时间']) - parseDate(firstRow['收现时间'])) / (1000 * 60 * 60 * 24)) : 0;
        
        // 计算平均收入确认时间差（所有行的平均值）
        const revenueConfirmationDiffs = completedTasks.map(item => {
            const completionDate = parseDate(item['实际完成时间']);
            const confirmationDate = parseDate(item['确认收入时间']);
            return confirmationDate && completionDate ? 
                Math.round((confirmationDate - completionDate) / (1000 * 60 * 60 * 24)) : 0;
        }).filter(diff => diff >= 0);
        
        const avgRevenueConfirmation = revenueConfirmationDiffs.length > 0 ? 
            Math.round(revenueConfirmationDiffs.reduce((a, b) => a + b, 0) / revenueConfirmationDiffs.length) : 0;
        
        // 计算平均收现时间差（所有行的平均值）
        const cashCollectionDiffs = completedTasks.map(item => {
            const completionDate = parseDate(item['实际完成时间']);
            const cashCollectionDate = parseDate(item['收现时间']);
            return cashCollectionDate && completionDate ? 
                Math.round((cashCollectionDate - completionDate) / (1000 * 60 * 60 * 24)) : 0;
        }).filter(diff => diff >= 0);
        
        const avgCashCollection = cashCollectionDiffs.length > 0 ? 
            Math.round(cashCollectionDiffs.reduce((a, b) => a + b, 0) / cashCollectionDiffs.length) : 0;
        
        // 计算每米收入和成本
        const meterItems = data.filter(item => item['单位'] && item['单位'].includes('米'));
        const totalMeters = meterItems.reduce((sum, item) => {
            return sum + (parseFloat(item['实际工作量']) || 0);
        }, 0);
        
        const revenuePerMeter = totalMeters > 0 ? taskEv / totalMeters : 0;
        const totalCost = data.reduce((sum, item) => {
            return sum + (parseFloat(item['任务成本']) || 0);
        }, 0);
        const costPerMeter = totalMeters > 0 ? totalCost / totalMeters : 0;
        
        // 更新DOM - 卡片组2
        document.getElementById('revenue-confirmation-diff').textContent = `${revenueConfirmationDiff}天`;
        document.getElementById('cash-collection-diff').textContent = `${cashCollectionDiff}天`;
        document.getElementById('avg-revenue-confirmation').textContent = `${avgRevenueConfirmation}天`;
        document.getElementById('avg-cash-collection').textContent = `${avgCashCollection}天`;
        document.getElementById('revenue-per-meter').textContent = formatCurrency(revenuePerMeter);
        document.getElementById('cost-per-meter').textContent = formatCurrency(costPerMeter);
    }
}

// 初始化图表
function initializeCharts() {
    // 确保Chart.js已加载
    if (typeof Chart === 'undefined') {
        console.error('Chart.js库未加载，无法初始化图表');
        return;
    }
    
    // 销毁现有图表
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    
    // 初始化工作时间圆饼图
    const workTimeCtx = document.getElementById('work-time-pie-chart');
    if (!workTimeCtx) {
        console.error('找不到work-time-pie-chart元素');
        return;
    }
    
    charts.workTimePie = new Chart(workTimeCtx.getContext('2d'), {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', 
                    '#1abc9c', '#34495e', '#f1c40f', '#e67e22', '#95a5a6'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
    
    // 初始化收入占比圆饼图
    const revenueCtx = document.getElementById('revenue-pie-chart');
    if (!revenueCtx) {
        console.error('找不到revenue-pie-chart元素');
        return;
    }
    
    charts.revenuePie = new Chart(revenueCtx.getContext('2d'), {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', 
                    '#1abc9c', '#34495e', '#f1c40f', '#e67e22', '#95a5a6'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
    
    // 初始化甘特图
    const ganttCtx = document.getElementById('gantt-chart');
    if (!ganttCtx) {
        console.error('找不到gantt-chart元素');
        return;
    }
    
    charts.gantt = new Chart(ganttCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: '计划进度',
                    data: [],
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1,
                    barPercentage: 0.6
                },
                {
                    label: '实际进度',
                    data: [],
                    backgroundColor: 'rgba(46, 204, 113, 0.7)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1,
                    barPercentage: 0.6
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '时间轴'
                    },
                    ticks: {
                        callback: function(value) {
                            // 这个回调函数将在updateCharts中动态设置
                            return value;
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const data = context.raw;
                            if (data && Array.isArray(data) && data.length === 2) {
                                // 计算实际日期
                                const minDate = new Date(context.chart.options.minDate || Date.now());
                                const startDate = new Date(minDate);
                                startDate.setDate(minDate.getDate() + data[0]);
                                const endDate = new Date(minDate);
                                endDate.setDate(minDate.getDate() + data[1]);
                                
                                return `${label}: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
    
    console.log('图表初始化完成');
}

// 更新图表
function updateCharts(data) {
    if (!currentTask || data.length === 0) {
        // 清空图表数据
        charts.workTimePie.data.labels = [];
        charts.workTimePie.data.datasets[0].data = [];
        charts.workTimePie.update();
        
        charts.revenuePie.data.labels = [];
        charts.revenuePie.data.datasets[0].data = [];
        charts.revenuePie.update();
        
        charts.gantt.data.labels = [];
        charts.gantt.data.datasets[0].data = [];
        charts.gantt.data.datasets[1].data = [];
        charts.gantt.update();
        
        return;
    }
    
    // 更新工作时间圆饼图
    const workBreakdown = {};
    data.forEach(item => {
        const description = item['工作分解结构描述'] || '未描述';
        const actualStart = parseDate(item['实际开始时间']);
        const actualEnd = parseDate(item['实际完成时间']);
        
        // 计算实际工作天数
        let workDays = 0;
        if (actualStart && actualEnd) {
            workDays = Math.ceil((actualEnd - actualStart) / (1000 * 60 * 60 * 24)) + 1; // 包含开始和结束当天
        } else {
            // 如果没有实际时间，尝试使用计划时间
            const planStart = parseDate(item['计划开始时间']);
            const planEnd = parseDate(item['计划完成时间']);
            if (planStart && planEnd) {
                workDays = Math.ceil((planEnd - planStart) / (1000 * 60 * 60 * 24)) + 1;
            }
        }
        
        if (workBreakdown[description]) {
            workBreakdown[description] += workDays;
        } else {
            workBreakdown[description] = workDays;
        }
    });
    
    // 处理圆饼图数据：如果项目过多，合并小项目为"其他"
    const maxItems = 8; // 最多显示8个项目
    let workLabels = Object.keys(workBreakdown);
    let workValues = Object.values(workBreakdown);
    
    if (workLabels.length > maxItems) {
        // 按值排序，取前maxItems-1个，其余合并为"其他"
        const sortedItems = workLabels.map((label, index) => ({
            label: label,
            value: workValues[index]
        })).sort((a, b) => b.value - a.value);
        
        const topItems = sortedItems.slice(0, maxItems - 1);
        const otherValue = sortedItems.slice(maxItems - 1).reduce((sum, item) => sum + item.value, 0);
        
        workLabels = topItems.map(item => item.label);
        workValues = topItems.map(item => item.value);
        
        if (otherValue > 0) {
            workLabels.push('其他');
            workValues.push(otherValue);
        }
    }
    
    charts.workTimePie.data.labels = workLabels;
    charts.workTimePie.data.datasets[0].data = workValues;
    charts.workTimePie.update();
    
    // 更新收入占比圆饼图
    const revenueBreakdown = {};
    data.forEach(item => {
        const description = item['工作分解结构描述'] || '未描述';
        const revenue = parseFloat(item['合计价值工作量']) || 0;
        
        if (revenueBreakdown[description]) {
            revenueBreakdown[description] += revenue;
        } else {
            revenueBreakdown[description] = revenue;
        }
    });
    
    // 处理圆饼图数据：如果项目过多，合并小项目为"其他"
    let revenueLabels = Object.keys(revenueBreakdown);
    let revenueValues = Object.values(revenueBreakdown);
    
    if (revenueLabels.length > maxItems) {
        // 按值排序，取前maxItems-1个，其余合并为"其他"
        const sortedItems = revenueLabels.map((label, index) => ({
            label: label,
            value: revenueValues[index]
        })).sort((a, b) => b.value - a.value);
        
        const topItems = sortedItems.slice(0, maxItems - 1);
        const otherValue = sortedItems.slice(maxItems - 1).reduce((sum, item) => sum + item.value, 0);
        
        revenueLabels = topItems.map(item => item.label);
        revenueValues = topItems.map(item => item.value);
        
        if (otherValue > 0) {
            revenueLabels.push('其他');
            revenueValues.push(otherValue);
        }
    }
    
    charts.revenuePie.data.labels = revenueLabels;
    charts.revenuePie.data.datasets[0].data = revenueValues;
    charts.revenuePie.update();
    
    // 更新甘特图
    const ganttData = [];
    const planData = [];
    const actualData = [];
    
    // 找出所有任务的最早和最晚日期，用于设置时间轴范围
    let minDate = null;
    let maxDate = null;
    
    data.forEach(item => {
        const planStart = parseDate(item['计划开始时间']);
        const planEnd = parseDate(item['计划完成时间']);
        const actualStart = parseDate(item['实际开始时间']);
        const actualEnd = parseDate(item['实际完成时间']);
        
        // 更新最小和最大日期
        [planStart, planEnd, actualStart, actualEnd].forEach(date => {
            if (date) {
                if (!minDate || date < minDate) minDate = date;
                if (!maxDate || date > maxDate) maxDate = date;
            }
        });
    });
    
    // 如果没有找到任何日期，则不更新图表
    if (!minDate || !maxDate) {
        charts.gantt.data.labels = [];
        charts.gantt.data.datasets[0].data = [];
        charts.gantt.data.datasets[1].data = [];
        charts.gantt.update();
        return;
    }
    
    // 为每个任务创建甘特图数据
    data.forEach(item => {
        const description = item['工作分解结构描述'] || '未描述';
        const planStart = parseDate(item['计划开始时间']);
        const planEnd = parseDate(item['计划完成时间']);
        const actualStart = parseDate(item['实际开始时间']);
        const actualEnd = parseDate(item['实际完成时间']);
        
        ganttData.push(description);
        
        // 计算计划进度的开始和结束位置（相对于最小日期的天数）
        if (planStart && planEnd) {
            const planStartDays = Math.ceil((planStart - minDate) / (1000 * 60 * 60 * 24));
            const planDuration = Math.ceil((planEnd - planStart) / (1000 * 60 * 60 * 24)) + 1; // 包含开始和结束当天
            planData.push([planStartDays, planStartDays + planDuration]);
        } else {
            planData.push([0, 0]); // 无数据时的占位符
        }
        
        // 计算实际进度的开始和结束位置（相对于最小日期的天数）
        if (actualStart && actualEnd) {
            const actualStartDays = Math.ceil((actualStart - minDate) / (1000 * 60 * 60 * 24));
            const actualDuration = Math.ceil((actualEnd - actualStart) / (1000 * 60 * 60 * 24)) + 1; // 包含开始和结束当天
            actualData.push([actualStartDays, actualStartDays + actualDuration]);
        } else {
            actualData.push([0, 0]); // 无数据时的占位符
        }
    });
    
    // 更新甘特图数据
    charts.gantt.data.labels = ganttData;
    charts.gantt.data.datasets[0].data = planData;
    charts.gantt.data.datasets[1].data = actualData;
    
    // 更新甘特图x轴配置为时间轴
    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
    const dayLabels = [];
    for (let i = 0; i <= totalDays; i += Math.ceil(totalDays / 10)) { // 最多显示10个刻度
        const currentDate = new Date(minDate);
        currentDate.setDate(minDate.getDate() + i);
        // 添加年份到日期标签中
        dayLabels.push(`${currentDate.getFullYear()}/${currentDate.getMonth() + 1}/${currentDate.getDate()}`);
    }
    
    // 保存最小日期到图表选项中，供工具提示使用
    charts.gantt.options.minDate = minDate;
    
    charts.gantt.options.scales.x = {
        beginAtZero: true,
        title: {
            display: true,
            text: '时间轴'
        },
        ticks: {
            callback: function(value) {
                // 根据值返回对应的日期标签
                const index = Math.floor(value / (totalDays / 10));
                return dayLabels[index] || '';
            }
        }
    };
    
    charts.gantt.update();
}

// 辅助函数：格式化货币
function formatCurrency(value) {
    if (isNaN(value)) return '0';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value);
}

// 辅助函数：格式化百分比
function formatPercentage(value) {
    if (isNaN(value)) return '0%';
    return `${value.toFixed(2)}%`;
}

// 辅助函数：解析日期
function parseDate(dateString) {
    if (!dateString) return null;
    
    // 如果是数字，可能是Excel日期格式
    if (typeof dateString === 'number') {
        // Excel日期是从1900年1月1日开始计算的天数
        // 但Excel错误地将1900年视为闰年，所以在计算时需要调整
        const excelEpoch = new Date(1900, 0, 1); // 1900年1月1日
        const daysSinceEpoch = dateString - 1; // 减1是因为Excel将1900年1月1日计为第1天
        
        // 创建新日期
        const resultDate = new Date(excelEpoch);
        resultDate.setDate(excelEpoch.getDate() + daysSinceEpoch);
        
        // 如果日期早于1900年3月1日，需要额外减1天（因为Excel错误地将1900年视为闰年）
        if (dateString <= 60) {
            resultDate.setDate(resultDate.getDate() - 1);
        }
        
        return resultDate;
    }
    
    // 确保dateString是字符串类型
    if (typeof dateString !== 'string') {
        // 如果不是字符串或数字，尝试转换为字符串
        try {
            dateString = String(dateString);
        } catch (e) {
            console.error('无法将日期转换为字符串:', e);
            return null;
        }
    }
    
    // 尝试匹配Excel日期数字格式（如45926）
    const numericMatch = dateString.match(/^\d+$/);
    if (numericMatch) {
        const numericValue = parseInt(dateString);
        // 使用上面的数字日期处理逻辑
        return parseDate(numericValue);
    }
    
    // 尝试不同的日期格式
    const formats = [
        /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/, // yyyy-mm-dd 或 yyyy/mm/dd
        /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/, // mm-dd-yyyy 或 mm/dd/yyyy
    ];
    
    for (const format of formats) {
        const match = dateString.match(format);
        if (match) {
            let year, month, day;
            
            if (format === formats[0]) { // yyyy-mm-dd
                year = parseInt(match[1]);
                month = parseInt(match[2]) - 1; // 月份从0开始
                day = parseInt(match[3]);
            } else { // mm-dd-yyyy
                year = parseInt(match[3]);
                month = parseInt(match[1]) - 1;
                day = parseInt(match[2]);
            }
            
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
    }
    
    // 尝试直接解析
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
}

// 显示加载指示器
function showLoadingIndicator() {
    loadingIndicator.classList.remove('hidden');
    noDataMessage.classList.add('hidden');
    dataVisualization.classList.add('hidden');
}

// 隐藏加载指示器
function hideLoadingIndicator() {
    loadingIndicator.classList.add('hidden');
}

// 显示数据可视化
function showDataVisualization() {
    noDataMessage.classList.add('hidden');
    dataVisualization.classList.remove('hidden');
    
    // 检查Chart.js是否已加载
    if (typeof Chart === 'undefined') {
        console.error('Chart.js库未加载，无法初始化图表');
        return;
    }
    
    // 初始化图表
    initializeCharts();
    
    // 初始化项目评估
    initializeProjectEvaluation();
}

// 项目评估相关变量
let healthRadarChart = null;
let luckRadarChart = null;

// 单个任务评价的图表变量
let taskHealthRadarChart = null;
let taskLuckRadarChart = null;

// 初始化项目评估
function initializeProjectEvaluation() {
    // 确保有数据
    if (!projectData || projectData.length === 0) {
        console.error('没有项目数据，无法进行评估');
        return;
    }
    
    // 计算健康评价
    const healthEvaluation = calculateHealthEvaluation();
    displayHealthEvaluation(healthEvaluation);
    
    // 计算韧性评价
    const luckEvaluation = calculateLuckEvaluation();
    displayLuckEvaluation(luckEvaluation);
}

// 计算项目健康评价
function calculateHealthEvaluation() {
    // 获取当前项目或所有项目的数据
    const data = currentProject ? 
        projectData.filter(item => item['项目名称'] === currentProject) : 
        projectData;
    
    if (data.length === 0) {
        return {
            SVI: 0, CPI: 0, RHI: 0, DCFI: 0, VEI: 0, PCS: 0, CCR: 0,
            scores: { SVI: 0, CPI: 0, RHI: 0, DCFI: 0, VEI: 0, PCS: 0, CCR: 0 },
            overallScore: 0,
            level: '数据不足',
            description: '没有足够的数据进行健康评价'
        };
    }
    
    // 计算各项指标
    const evaluation = {
        SVI: calculateSVI(data),
        CPI: calculateCPI(data),
        RHI: calculateRHI(data),
        DCFI: calculateDCFI(data),
        VEI: calculateVEI(data),
        PCS: calculatePCS(data),
        CCR: calculateContractCompletionRate(data) // 添加合同完成率
    };
    
    // 将指标转换为分数（0-100）
    evaluation.scores = {
        SVI: convertSVIToScore(evaluation.SVI),
        CPI: convertCPIToScore(evaluation.CPI),
        RHI: convertRHPIToScore(evaluation.RHI),
        DCFI: convertDCFIToScore(evaluation.DCFI),
        VEI: convertVEIToScore(evaluation.VEI),
        PCS: convertPCSToScore(evaluation.PCS),
        CCR: convertCCRToScore(evaluation.CCR) // 添加合同完成率分数
    };
    
    // 计算综合分数
    evaluation.overallScore = 
        0.15 * evaluation.scores.SVI + 
        0.20 * evaluation.scores.CPI + 
        0.15 * evaluation.scores.RHI + 
        0.20 * evaluation.scores.DCFI + 
        0.15 * evaluation.scores.VEI + 
        0.10 * evaluation.scores.PCS + 
        0.05 * evaluation.scores.CCR; // 添加合同完成率权重
    
    // 确定健康等级和结论
    if (evaluation.overallScore >= 85) {
        evaluation.level = '优秀';
        evaluation.description = '项目运行卓越，保持最佳实践，总结经验推广';
    } else if (evaluation.overallScore >= 70) {
        evaluation.level = '良好';
        evaluation.description = '项目健康可控，持续监控，局部优化改进';
    } else if (evaluation.overallScore >= 55) {
        evaluation.level = '一般';
        evaluation.description = '项目存在风险，制定改进计划，重点关注薄弱环节';
    } else if (evaluation.overallScore >= 40) {
        evaluation.level = '预警';
        evaluation.description = '项目健康度不足，立即干预，调整项目策略';
    } else {
        evaluation.level = '危险';
        evaluation.description = '项目严重偏离，重大调整或考虑项目重启';
    }
    
    return evaluation;
}

// 指标转换函数 - 将原始指标值转换为0-100的分数

// 回款率转换
function convertCollectionRateToScore(collectionRate) {
    if (collectionRate >= 0.90) return 100;
    if (collectionRate >= 0.75) return 85;
    if (collectionRate >= 0.60) return 70;
    if (collectionRate >= 0.40) return 55;
    return 40;
}

// 每米收入转换
function convertRevenuePerMeterToScore(revenuePerMeter, data) {
    // 根据行业标准调整阈值
    const industryAverage = 800; // 行业平均值
    const ratio = revenuePerMeter / industryAverage;
    
    if (ratio >= 1.25) return 100;
    if (ratio >= 1.0) return 85;
    if (ratio >= 0.75) return 70;
    if (ratio >= 0.5) return 55;
    return 40;
}

// 收入偏差转换
function convertRevenueDeviationToScore(revenueDeviation) {
    if (revenueDeviation >= 0) return 100;
    if (revenueDeviation >= -1000) return 85;
    if (revenueDeviation >= -5000) return 70;
    if (revenueDeviation >= -10000) return 55;
    return 40;
}

// 时间波动稳定性转换
function convertTimeStabilityToScore(timeStability) {
    if (timeStability >= 0.80) return 100;
    if (timeStability >= 0.60) return 85;
    if (timeStability >= 0.40) return 70;
    if (timeStability >= 0.20) return 55;
    return 40;
}

// 工作量收入弹性转换
function convertWorkIncomeElasticityToScore(workIncomeElasticity) {
    if (workIncomeElasticity >= 1.50) return 100;
    if (workIncomeElasticity >= 1.00) return 85;
    if (workIncomeElasticity >= 0.50) return 70;
    if (workIncomeElasticity >= 0.20) return 55;
    return 40;
}

// 综合绩效偏离度转换
function convertPerformanceDeviationToScore(performanceDeviation) {
    if (performanceDeviation >= 0.80) return 100;
    if (performanceDeviation >= 0.60) return 85;
    if (performanceDeviation >= 0.40) return 70;
    if (performanceDeviation >= 0.20) return 55;
    return 40;
}

// 健康评价指标转换函数 - 将原始指标值转换为0-100的分数

// 进度偏差指数转换
function convertSVIToScore(SVI) {
    if (SVI >= 0.95) return 100;
    if (SVI >= 0.85) return 85;
    if (SVI >= 0.70) return 70;
    if (SVI >= 0.50) return 55;
    return 40;
}

// 成本绩效指数转换
function convertCPIToScore(CPI) {
    if (CPI >= 1.20) return 100;
    if (CPI >= 1.00) return 85;
    if (CPI >= 0.80) return 70;
    if (CPI >= 0.60) return 55;
    return 40;
}

// 收入健康度转换
function convertRHPIToScore(RHI) {
    if (RHI >= 0.90) return 100;
    if (RHI >= 0.75) return 85;
    if (RHI >= 0.60) return 70;
    if (RHI >= 0.40) return 55;
    return 40;
}

// 现金流贴现指数转换
function convertDCFIToScore(DCFI) {
    if (DCFI >= 0.30) return 100;
    if (DCFI >= 0.15) return 85;
    if (DCFI >= 0.00) return 70;
    if (DCFI >= -0.15) return 55;
    return 40;
}

// 价值效率指数转换
function convertVEIToScore(VEI) {
    // 价值效率指数通常在0-10之间，调整阈值以适应实际数据范围
    if (VEI >= 5.0) return 100;
    if (VEI >= 3.0) return 85;
    if (VEI >= 1.0) return 70;
    if (VEI >= 0.5) return 55;
    return 40;
}

// 计划校准分数转换
function convertPCSToScore(PCS) {
    if (PCS >= 0.90) return 100;
    if (PCS >= 0.75) return 85;
    if (PCS >= 0.60) return 70;
    if (PCS >= 0.40) return 55;
    return 40;
}

// 合同完成率转换
function convertCCRToScore(CCR) {
    if (CCR >= 0.95) return 100;
    if (CCR >= 0.85) return 85;
    if (CCR >= 0.70) return 70;
    if (CCR >= 0.50) return 55;
    return 40;
}

// 健康评价指标计算函数

// 计算进度偏差指数 (SVI)
function calculateSVI(data) {
    let totalPlannedDays = 0;
    let totalActualDays = 0;
    let validTasks = 0;
    
    data.forEach(item => {
        const planStart = parseDate(item['计划开始时间']);
        const planEnd = parseDate(item['计划完成时间']);
        const actualStart = parseDate(item['实际开始时间']);
        const actualEnd = parseDate(item['实际完成时间']);
        
        // 确保所有日期都存在
        if (planStart && planEnd && actualStart && actualEnd) {
            const plannedDays = (planEnd - planStart) / (1000 * 60 * 60 * 24);
            const actualDays = (actualEnd - actualStart) / (1000 * 60 * 60 * 24);
            
            totalPlannedDays += plannedDays;
            totalActualDays += actualDays;
            validTasks++;
        }
    });
    
    if (validTasks === 0 || totalPlannedDays === 0) return 0;
    
    // SVI = (实际天数 - 计划天数) / 计划天数 * 100
    // 这样结果是一个百分比，正值表示进度延迟，负值表示进度提前
    const svi = ((totalActualDays - totalPlannedDays) / totalPlannedDays) * 100;
    
    // 限制在合理范围内
    return Math.max(-100, Math.min(100, svi));
}

// 计算成本绩效指数 (CPI)
function calculateCPI(data) {
    let totalEV = 0;
    let totalCost = 0;
    
    data.forEach(item => {
        const ev = parseFloat(item['合计价值工作量']) || 0;
        const cost = parseFloat(item['任务成本']) || 0;
        
        totalEV += ev;
        totalCost += cost;
    });
    
    if (totalCost === 0) return 0;
    return totalEV / totalCost;
}

// 计算收入健康度 (RHI)
function calculateRHI(data) {
    let totalRR = 0;
    let totalRRP = 0;
    let totalCC = 0;
    
    data.forEach(item => {
        const rr = parseFloat(item['已确认金额']) || 0;
        const rrp = parseFloat(item['收入计划']) || 0;
        const cc = parseFloat(item['收现金额']) || 0;
        
        totalRR += rr;
        totalRRP += rrp;
        totalCC += cc;
    });
    
    if (totalRRP === 0 || totalRR === 0) return 0;
    const revenueAchievementRate = totalRR / totalRRP;
    const collectionEfficiency = totalCC / totalRR;
    
    return revenueAchievementRate * collectionEfficiency;
}

// 计算现金流贴现指数 (DCFI)
function calculateDCFI(data) {
    const discountRate = 0.08; // 年贴现率8%
    let totalPV = 0;
    let totalCost = 0;
    
    // 找到项目开始时间
    let projectStartDate = null;
    data.forEach(item => {
        const startDate = parseDate(item['实际开始时间']);
        if (startDate && (!projectStartDate || startDate < projectStartDate)) {
            projectStartDate = startDate;
        }
    });
    
    if (!projectStartDate) return 0;
    
    data.forEach(item => {
        const cost = parseFloat(item['任务成本']) || 0;
        const cc = parseFloat(item['收现金额']) || 0;
        const ccDate = parseDate(item['收现时间']);
        
        totalCost += cost;
        
        if (ccDate) {
            const years = (ccDate - projectStartDate) / (1000 * 60 * 60 * 24 * 365);
            const cf = cc - cost;
            const pv = cf / Math.pow(1 + discountRate, years);
            totalPV += pv;
        }
    });
    
    if (totalCost === 0) return 0;
    return totalPV / totalCost;
}

// 计算价值效率指数 (VEI)
function calculateVEI(data) {
    let totalEV = 0;
    let totalWorkload = 0;
    const revenuePerUnitValues = [];
    
    data.forEach(item => {
        const ev = parseFloat(item['合计价值工作量']) || 0;
        const workload = parseFloat(item['实际工作量']) || 0;
        const unit = item['单位'] || '';
        
        totalEV += ev;
        
        if (workload > 0) {
            const revenuePerUnit = ev / workload;
            revenuePerUnitValues.push(revenuePerUnit);
        }
        
        totalWorkload += workload;
    });
    
    if (totalWorkload === 0) return 0;
    
    // 基础效率 = 总价值工作量 / 总工作量
    const basicEfficiency = totalEV / totalWorkload;
    
    // 计算变异系数
    if (revenuePerUnitValues.length < 2) return basicEfficiency;
    
    const mean = revenuePerUnitValues.reduce((sum, val) => sum + val, 0) / revenuePerUnitValues.length;
    const variance = revenuePerUnitValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / revenuePerUnitValues.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean === 0 ? 0 : stdDev / mean;
    
    // VEI = 基础效率 / (1 + 变异系数)
    // 这样当效率值差异大时，VEI会降低
    const vei = basicEfficiency / (1 + cv);
    
    // 限制在合理范围内，避免极端值
    return Math.max(0, Math.min(100, vei));
}

// 计算计划校准分数 (PCS)
function calculatePCS(data) {
    let totalTimeError = 0;
    let totalRevenueError = 0;
    let validTasks = 0;
    
    data.forEach(item => {
        const planStart = parseDate(item['计划开始时间']);
        const planEnd = parseDate(item['计划完成时间']);
        const actualStart = parseDate(item['实际开始时间']);
        const actualEnd = parseDate(item['实际完成时间']);
        const rrp = parseFloat(item['收入计划']) || 0;
        const rr = parseFloat(item['已确认金额']) || 0;
        
        // 确保所有日期都存在
        if (planStart && planEnd && actualStart && actualEnd) {
            validTasks++;
            
            // 计算计划工期
            const plannedDuration = (planEnd - planStart) / (1000 * 60 * 60 * 24);
            
            // 计算实际工期
            const actualDuration = (actualEnd - actualStart) / (1000 * 60 * 60 * 24);
            
            // 时间误差（避免除以0）
            const timeError = plannedDuration > 0 ? Math.abs(actualDuration - plannedDuration) / plannedDuration : 0;
            totalTimeError += timeError;
            
            // 收入误差（避免除以0）
            const revenueError = rrp > 0 ? Math.abs(rr - rrp) / rrp : 0;
            totalRevenueError += revenueError;
        }
    });
    
    if (validTasks === 0) return 0;
    
    const avgTimeError = totalTimeError / validTasks;
    const avgRevenueError = totalRevenueError / validTasks;
    
    // 计算欧氏距离，权重：时间60%，收入40%
    const euclideanDistance = Math.sqrt(0.6 * Math.pow(avgTimeError, 2) + 0.4 * Math.pow(avgRevenueError, 2));
    
    // PCS = 1 - 欧氏距离，确保结果在0-1之间
    const pcs = Math.max(0, Math.min(1, 1 - euclideanDistance));
    
    // 转换为0-100分
    return pcs * 100;
}

// 韧性评价指标计算函数

// 计算回款率
function calculateCollectionRate(data) {
    let totalCC = 0;
    let totalRRP = 0; // 使用收入计划作为分母，因为数据中没有合同总金额（TCV）字段
    
    data.forEach(item => {
        const cc = parseFloat(item['收现金额']) || 0;
        const rrp = parseFloat(item['收入计划']) || 0;
        
        totalCC += cc;
        totalRRP += rrp;
    });
    
    if (totalRRP === 0) return 0;
    return totalCC / totalRRP;
}

// 计算合同完成率
function calculateContractCompletionRate(data) {
    // 合同总金额（TCV）为46248700，这是用户提供的值
    const TCV = 46248700;
    
    let totalConfirmedRevenue = 0;
    
    data.forEach(item => {
        const rr = parseFloat(item['已确认金额']) || 0;
        totalConfirmedRevenue += rr;
    });
    
    if (TCV === 0) return 0;
    return totalConfirmedRevenue / TCV;
}

// 计算每米收入
function calculateRevenuePerMeter(data) {
    let totalRevenue = 0;
    let totalMeters = 0;
    
    data.forEach(item => {
        const ev = parseFloat(item['合计价值工作量']) || 0;
        const workload = parseFloat(item['实际工作量']) || 0;
        const unit = item['单位'] || '';
        
        if (unit === '米' && workload > 0) {
            totalRevenue += ev;
            totalMeters += workload;
        }
    });
    
    if (totalMeters === 0) return 0;
    return totalRevenue / totalMeters;
}

// 计算收入偏差
function calculateRevenueDeviation(data) {
    let totalRevenueDeviation = 0;
    let totalRRP = 0; // 收入计划总额，用于计算相对偏差
    
    data.forEach(item => {
        const rr = parseFloat(item['已确认金额']) || 0;
        const rrp = parseFloat(item['收入计划']) || 0;
        
        // 计算每个任务的收入偏差（已确认金额 - 收入计划）
        const revenueDeviation = rr - rrp;
        totalRevenueDeviation += revenueDeviation;
        totalRRP += rrp;
    });
    
    // 返回相对偏差（偏差总额 / 收入计划总额）
    if (totalRRP === 0) return 0;
    return totalRevenueDeviation / totalRRP;
}

// 计算时间波动稳定性指数
function calculateTimeStability(data) {
    const revenueTimeDiffs = [];
    const cashTimeDiffs = [];
    
    data.forEach(item => {
        // 计算实际收入确认时间差（实际完成时间 - 确认收入时间）
        const actualEnd = parseDate(item['实际完成时间']);
        const revenueConfirmTime = parseDate(item['确认收入时间']);
        
        if (actualEnd && revenueConfirmTime) {
            const revenueTimeDiff = (actualEnd - revenueConfirmTime) / (1000 * 60 * 60 * 24); // 转换为天数
            revenueTimeDiffs.push(revenueTimeDiff);
        }
        
        // 计算实际收现时间差（实际完成时间 - 收现时间）
        const cashTime = parseDate(item['收现时间']);
        
        if (actualEnd && cashTime) {
            const cashTimeDiff = (actualEnd - cashTime) / (1000 * 60 * 60 * 24); // 转换为天数
            cashTimeDiffs.push(cashTimeDiff);
        }
    });
    
    // 计算离散系数
    const calculateCV = (values) => {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        if (mean === 0) {
            // 如果均值为0，使用标准差作为离散度量
            const variance = values.reduce((sum, val) => sum + Math.pow(val, 2), 0) / values.length;
            const stdDev = Math.sqrt(variance);
            return stdDev;
        }
        
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        return stdDev / mean;
    };
    
    const revenueCV = calculateCV(revenueTimeDiffs);
    const cashCV = calculateCV(cashTimeDiffs);
    
    // 如果没有有效数据，返回中等稳定性
    if (revenueTimeDiffs.length === 0 && cashTimeDiffs.length === 0) {
        return 0.5; // 中等稳定性
    }
    
    // 稳定性指数 = 1 - 离散系数（值越大越稳定）
    return 1 - (0.5 * revenueCV + 0.5 * cashCV);
}

// 计算工作量收入弹性指数
function calculateWorkIncomeElasticity(data) {
    // 由于缺乏历史数据，这里使用简化计算
    // 在实际应用中，应该使用历史同类任务数据进行比较
    
    let totalWorkload = 0;
    let totalRevenue = 0;
    let validTasks = 0;
    const unitRevenues = []; // 存储每个任务的单位收入
    
    data.forEach(item => {
        const workload = parseFloat(item['实际工作量']) || 0;
        const revenue = parseFloat(item['合计价值工作量']) || 0;
        
        if (workload > 0) {
            const unitRevenue = revenue / workload;
            unitRevenues.push(unitRevenue);
            
            totalWorkload += workload;
            totalRevenue += revenue;
            validTasks++;
        }
    });
    
    if (validTasks === 0 || totalWorkload === 0) return 0;
    
    // 计算平均单位收入
    const avgUnitRevenue = totalRevenue / totalWorkload;
    
    // 计算单位收入的变异系数
    if (unitRevenues.length < 2) {
        // 如果只有一个有效任务，直接返回平均单位收入
        return Math.min(avgUnitRevenue, 100);
    }
    
    const mean = unitRevenues.reduce((sum, val) => sum + val, 0) / unitRevenues.length;
    const variance = unitRevenues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / unitRevenues.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean === 0 ? 0 : stdDev / mean;
    
    // 弹性指数 = 平均单位收入 / (1 + 变异系数)
    // 这样当单位收入差异大时，弹性指数会降低
    const elasticity = avgUnitRevenue / (1 + cv);
    
    // 限制最大值，避免极端情况
    return Math.min(elasticity, 100);
}

// 根据项目名称推断工作量单位
function inferUnitFromProject(projectName) {
    if (!projectName) return '个';
    
    // 根据项目名称中的关键词推断单位
    if (projectName.includes('道路') || projectName.includes('管线') || projectName.includes('铺设')) {
        return '米';
    } else if (projectName.includes('系统') || projectName.includes('平台') || projectName.includes('软件')) {
        return '个';
    }
    
    return '个'; // 默认单位
}

// 工作量单位转换函数
function convertWorkload(value, fromUnit, toUnit) {
    // 简化的单位转换逻辑，实际应用中可能需要更复杂的转换表
    if (fromUnit === toUnit) return value;
    
    // 示例转换规则
    if (fromUnit === '千米' && toUnit === '米') return value * 1000;
    if (fromUnit === '米' && toUnit === '千米') return value / 1000;
    if (fromUnit === '万美元' && toUnit === '美元') return value * 10000;
            if (fromUnit === '美元' && toUnit === '万美元') return value / 10000;
    
    // 默认情况，不进行转换
    return value;
}

// 计算综合绩效偏离度指数
function calculatePerformanceDeviation(data) {
    let totalProgressDeviation = 0;
    let totalCostDeviation = 0;
    let totalRevenueDeviation = 0;
    let validTasks = 0;
    
    data.forEach(item => {
        const planStart = parseDate(item['计划开始时间']);
        const planEnd = parseDate(item['计划完成时间']);
        const actualStart = parseDate(item['实际开始时间']);
        const actualEnd = parseDate(item['实际完成时间']);
        const cost = parseFloat(item['任务成本']) || 0;
        const plannedCost = cost; // 假设计划成本等于实际成本，因为数据中没有计划成本字段
        const rrp = parseFloat(item['收入计划']) || 0;
        const rr = parseFloat(item['已确认金额']) || 0;
        
        // 确保所有日期都存在
        if (planStart && planEnd && actualStart && actualEnd) {
            validTasks++;
            
            // 进度偏差率 - 使用实际工期与计划工期的偏差
            const plannedDuration = (planEnd - planStart) / (1000 * 60 * 60 * 24);
            const actualDuration = (actualEnd - actualStart) / (1000 * 60 * 60 * 24);
            const progressDeviation = plannedDuration > 0 ? Math.abs(actualDuration - plannedDuration) / plannedDuration : 0;
            totalProgressDeviation += progressDeviation;
            
            // 成本偏差率
            const costDeviation = plannedCost > 0 ? Math.abs(cost - plannedCost) / plannedCost : 0;
            totalCostDeviation += costDeviation;
            
            // 收入偏差率
            const revenueDeviation = rrp > 0 ? Math.abs(rr - rrp) / rrp : 0;
            totalRevenueDeviation += revenueDeviation;
        }
    });
    
    if (validTasks === 0) return 0;
    
    // 计算平均偏差率
    const avgProgressDeviation = totalProgressDeviation / validTasks;
    const avgCostDeviation = totalCostDeviation / validTasks;
    const avgRevenueDeviation = totalRevenueDeviation / validTasks;
    
    // 行业最大偏差率（经验值0.5）
    const maxDeviationRate = 0.5;
    
    // 标准化偏差（限制在0-1范围内）
    const normalizedProgress = Math.min(1, avgProgressDeviation / maxDeviationRate);
    const normalizedCost = Math.min(1, avgCostDeviation / maxDeviationRate);
    const normalizedRevenue = Math.min(1, avgRevenueDeviation / maxDeviationRate);
    
    // 欧氏距离
    const euclideanDistance = Math.sqrt(
        Math.pow(normalizedProgress, 2) + 
        Math.pow(normalizedCost, 2) + 
        Math.pow(normalizedRevenue, 2)
    );
    
    // 返回偏离度指数，确保在0-100范围内
    const deviationIndex = Math.max(0, 100 * (1 - euclideanDistance / Math.sqrt(3)));
    
    // 修复显示问题：确保返回值是数字，不是字符串
    return parseFloat(deviationIndex.toFixed(3));
}

// 显示健康评价结果
function displayHealthEvaluation(evaluation) {
    // 更新健康评价雷达图
    updateHealthRadarChart(evaluation);
    
    // 更新健康评价指标详情
    updateHealthIndicators(evaluation);
    
    // 更新健康评价总体评价
    updateHealthOverall(evaluation);
}

// 更新健康评价雷达图
function updateHealthRadarChart(evaluation) {
    const ctx = document.getElementById('health-radar-chart').getContext('2d');
    
    // 如果已有图表，先销毁
    if (healthRadarChart) {
        healthRadarChart.destroy();
    }
    
    // 创建新的雷达图
    healthRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['进度偏差指数', '成本绩效指数', '收入健康度', '现金流贴现指数', '价值效率指数', '计划校准分数', '合同完成率'],
            datasets: [{
                label: '项目健康评价',
                data: [
                    evaluation.scores.SVI,
                    evaluation.scores.CPI,
                    evaluation.scores.RHI,
                    evaluation.scores.DCFI,
                    evaluation.scores.VEI,
                    evaluation.scores.PCS,
                    evaluation.scores.CCR
                ],
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.raw.toFixed(1) + '分';
                        }
                    }
                }
            }
        }
    });
}

// 更新健康评价指标详情
function updateHealthIndicators(evaluation) {
    const indicatorsContainer = document.getElementById('health-indicators');
    
    // 创建指标HTML
    const indicatorsHTML = `
        <div class="indicator-item">
            <div class="indicator-header">
                <h4>进度偏差指数 (SVI)</h4>
                <div class="indicator-score ${getScoreClass(evaluation.scores.SVI)}">${evaluation.scores.SVI.toFixed(1)}</div>
            </div>
            <div class="indicator-description">衡量项目进度执行情况</div>
            <div class="indicator-formula">公式: (计划总工期 - 延误总工期) / 计划总工期</div>
            <div class="indicator-details">
                <span class="detail-item">优秀: ≥0.95</span>
                <span class="detail-item">良好: 0.85-0.94</span>
                <span class="detail-item">一般: 0.70-0.84</span>
                <span class="detail-item">较差: 0.50-0.69</span>
                <span class="detail-item">危险: &lt;0.50</span>
            </div>
            <div class="indicator-value">当前值: ${evaluation.SVI.toFixed(3)}</div>
        </div>
        
        <div class="indicator-item">
            <div class="indicator-header">
                <h4>成本绩效指数 (CPI)</h4>
                <div class="indicator-score ${getScoreClass(evaluation.scores.CPI)}">${evaluation.scores.CPI.toFixed(1)}</div>
            </div>
            <div class="indicator-description">衡量项目成本控制效果</div>
            <div class="indicator-formula">公式: 总价值工作量 / 总任务成本</div>
            <div class="indicator-details">
                <span class="detail-item">优秀: ≥1.20</span>
                <span class="detail-item">良好: 1.00-1.19</span>
                <span class="detail-item">一般: 0.80-0.99</span>
                <span class="detail-item">较差: 0.60-0.79</span>
                <span class="detail-item">危险: &lt;0.60</span>
            </div>
            <div class="indicator-value">当前值: ${evaluation.CPI.toFixed(3)}</div>
        </div>
        
        <div class="indicator-item">
            <div class="indicator-header">
                <h4>收入健康度 (RHI)</h4>
                <div class="indicator-score ${getScoreClass(evaluation.scores.RHI)}">${evaluation.scores.RHI.toFixed(1)}</div>
            </div>
            <div class="indicator-description">衡量项目收入实现和回款效率</div>
            <div class="indicator-formula">公式: 收入达成率 × 回款效率</div>
            <div class="indicator-details">
                <span class="detail-item">优秀: ≥0.90</span>
                <span class="detail-item">良好: 0.75-0.89</span>
                <span class="detail-item">一般: 0.60-0.74</span>
                <span class="detail-item">较差: 0.40-0.59</span>
                <span class="detail-item">危险: &lt;0.40</span>
            </div>
            <div class="indicator-value">当前值: ${evaluation.RHI.toFixed(3)}</div>
        </div>
        
        <div class="indicator-item">
            <div class="indicator-header">
                <h4>现金流贴现指数 (DCFI)</h4>
                <div class="indicator-score ${getScoreClass(evaluation.scores.DCFI)}">${evaluation.scores.DCFI.toFixed(1)}</div>
            </div>
            <div class="indicator-description">衡量项目现金流的时间价值</div>
            <div class="indicator-formula">公式: 总现值 / 总成本</div>
            <div class="indicator-details">
                <span class="detail-item">优秀: ≥0.30</span>
                <span class="detail-item">良好: 0.15-0.29</span>
                <span class="detail-item">一般: 0.00-0.14</span>
                <span class="detail-item">较差: -0.15--0.01</span>
                <span class="detail-item">危险: &lt;-0.15</span>
            </div>
            <div class="indicator-value">当前值: ${evaluation.DCFI.toFixed(3)}</div>
        </div>
        
        <div class="indicator-item">
            <div class="indicator-header">
                <h4>价值效率指数 (VEI)</h4>
                <div class="indicator-score ${getScoreClass(evaluation.scores.VEI)}">${evaluation.scores.VEI.toFixed(1)}</div>
            </div>
            <div class="indicator-description">衡量项目价值创造效率</div>
            <div class="indicator-formula">公式: 基础效率 / (1 + 变异系数)</div>
            <div class="indicator-details">
                <span class="detail-item">优秀: ≥1.50</span>
                <span class="detail-item">良好: 1.00-1.49</span>
                <span class="detail-item">一般: 0.50-0.99</span>
                <span class="detail-item">较差: 0.20-0.49</span>
                <span class="detail-item">危险: &lt;0.20</span>
            </div>
            <div class="indicator-value">当前值: ${evaluation.VEI.toFixed(3)}</div>
        </div>
        
        <div class="indicator-item">
            <div class="indicator-header">
                <h4>计划校准分数 (PCS)</h4>
                <div class="indicator-score ${getScoreClass(evaluation.scores.PCS)}">${evaluation.scores.PCS.toFixed(1)}</div>
            </div>
            <div class="indicator-description">衡量项目计划与实际执行的吻合度</div>
            <div class="indicator-formula">公式: 1 - √(0.6×时间误差² + 0.4×收入误差²)</div>
            <div class="indicator-details">
                <span class="detail-item">优秀: ≥0.90</span>
                <span class="detail-item">良好: 0.75-0.89</span>
                <span class="detail-item">一般: 0.60-0.74</span>
                <span class="detail-item">较差: 0.40-0.59</span>
                <span class="detail-item">危险: &lt;0.40</span>
            </div>
            <div class="indicator-value">当前值: ${evaluation.PCS.toFixed(3)}</div>
        </div>
        
        <div class="indicator-item">
            <div class="indicator-header">
                <h4>合同完成率 (CCR)</h4>
                <div class="indicator-score ${getScoreClass(evaluation.scores.CCR)}">${evaluation.scores.CCR.toFixed(1)}</div>
            </div>
            <div class="indicator-description">衡量项目合同金额的完成情况</div>
            <div class="indicator-formula">公式: 已确认收入 / 合同总金额(TCV)</div>
            <div class="indicator-details">
                <span class="detail-item">优秀: ≥0.95</span>
                <span class="detail-item">良好: 0.85-0.94</span>
                <span class="detail-item">一般: 0.70-0.84</span>
                <span class="detail-item">较差: 0.50-0.69</span>
                <span class="detail-item">危险: &lt;0.50</span>
            </div>
            <div class="indicator-value">当前值: ${evaluation.CCR.toFixed(3)}</div>
            <div class="indicator-tcv">合同总金额(TCV): $46,248,700</div>
        </div>
    `;
    
    indicatorsContainer.innerHTML = indicatorsHTML;
}

// 更新健康评价总体评价
function updateHealthOverall(evaluation) {
    const overallContainer = document.getElementById('health-overall');
    
    // 创建总体评价HTML
    const overallHTML = `
        <div class="overall-score" style="color: ${getLevelColor(evaluation.level)}">
            <div class="score-value">${evaluation.overallScore.toFixed(1)}</div>
            <div class="score-level">${evaluation.level}</div>
        </div>
        <div class="overall-description">${evaluation.description}</div>
    `;
    
    overallContainer.innerHTML = overallHTML;
}

// 显示韧性评价结果
function displayLuckEvaluation(evaluation) {
    // 更新韧性评价雷达图
    updateLuckRadarChart(evaluation);
    
    // 更新韧性评价指标详情
    updateLuckIndicators(evaluation);
    
    // 更新韧性评价总体评价
    updateLuckOverall(evaluation);
}

// 更新韧性评价雷达图
function updateLuckRadarChart(evaluation) {
    const ctx = document.getElementById('luck-radar-chart').getContext('2d');
    
    // 如果已有图表，先销毁
    if (luckRadarChart) {
        luckRadarChart.destroy();
    }
    
    // 创建新的雷达图
    luckRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['回款率', '每米收入', '收入偏差', '时间波动稳定性', '工作量收入弹性', '综合绩效偏离度'],
            datasets: [{
                label: '项目韧性评价',
                data: [
                    evaluation.scores.collectionRate,
                    evaluation.scores.revenuePerMeter,
                    evaluation.scores.revenueDeviation,
                    evaluation.scores.timeStability,
                    evaluation.scores.workIncomeElasticity,
                    evaluation.scores.performanceDeviation
                ],
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(255, 99, 132, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.raw.toFixed(1) + '分';
                        }
                    }
                }
            }
        }
    });
}

// 更新韧性评价指标详情
function updateLuckIndicators(evaluation) {
    const indicatorsContainer = document.getElementById('luck-indicators');
    
    // 创建指标HTML
    const indicatorsHTML = `
        <div class="indicator-item">
            <div class="indicator-header">
                <h4>回款率</h4>
                <div class="indicator-score ${getScoreClass(evaluation.scores.collectionRate)}">${evaluation.scores.collectionRate.toFixed(1)}</div>
            </div>
            <div class="indicator-description">衡量项目回款效率</div>
            <div class="indicator-formula">公式: 总收现金额 / 总合同金额</div>
            <div class="indicator-details">
                <span class="detail-item">优秀: ≥0.90</span>
                <span class="detail-item">良好: 0.75-0.89</span>
                <span class="detail-item">一般: 0.60-0.74</span>
                <span class="detail-item">较差: 0.40-0.59</span>
                <span class="detail-item">危险: &lt;0.40</span>
            </div>
            <div class="indicator-value">当前值: ${evaluation.collectionRate.toFixed(3)}</div>
        </div>
        
        <div class="indicator-item">
            <div class="indicator-header">
                <h4>每米收入</h4>
                <div class="indicator-score ${getScoreClass(evaluation.scores.revenuePerMeter)}">${evaluation.scores.revenuePerMeter.toFixed(1)}</div>
            </div>
            <div class="indicator-description">衡量单位工作量的收入水平</div>
            <div class="indicator-formula">公式: 总收入 / 总工作量(米)</div>
            <div class="indicator-details">
                <span class="detail-item">优秀: ≥1000</span>
                <span class="detail-item">良好: 800-999</span>
                <span class="detail-item">一般: 600-799</span>
                <span class="detail-item">较差: 400-599</span>
                <span class="detail-item">危险: &lt;400</span>
            </div>
            <div class="indicator-value">当前值: ${evaluation.revenuePerMeter.toFixed(2)}</div>
        </div>
        
        <div class="indicator-item">
            <div class="indicator-header">
                <h4>收入偏差</h4>
                <div class="indicator-score ${getScoreClass(evaluation.scores.revenueDeviation)}">${evaluation.scores.revenueDeviation.toFixed(1)}</div>
            </div>
            <div class="indicator-description">衡量项目收入偏差情况</div>
            <div class="indicator-formula">公式: Σ(收入偏差(RevCV))</div>
            <div class="indicator-details">
                <span class="detail-item">优秀: ≥0</span>
                <span class="detail-item">良好: -1000-0</span>
                <span class="detail-item">一般: -5000--1001</span>
                <span class="detail-item">较差: -10000--5001</span>
                <span class="detail-item">危险: &lt;-10000</span>
            </div>
            <div class="indicator-value">当前值: ${evaluation.revenueDeviation.toFixed(2)}</div>
        </div>
        
        <div class="indicator-item">
            <div class="indicator-header">
                <h4>时间波动稳定性指数</h4>
                <div class="indicator-score ${getScoreClass(evaluation.scores.timeStability)}">${evaluation.scores.timeStability.toFixed(1)}</div>
            </div>
            <div class="indicator-description">衡量收入确认和收现时间的稳定性</div>
            <div class="indicator-formula">公式: 1 - (0.5×收入时间差CV + 0.5×收现时间差CV)</div>
            <div class="indicator-details">
                <span class="detail-item">优秀: ≥0.80</span>
                <span class="detail-item">良好: 0.60-0.79</span>
                <span class="detail-item">一般: 0.40-0.59</span>
                <span class="detail-item">较差: 0.20-0.39</span>
                <span class="detail-item">危险: &lt;0.20</span>
            </div>
            <div class="indicator-value">当前值: ${evaluation.timeStability.toFixed(3)}</div>
        </div>
        
        <div class="indicator-item">
            <div class="indicator-header">
                <h4>工作量收入弹性指数</h4>
                <div class="indicator-score ${getScoreClass(evaluation.scores.workIncomeElasticity)}">${evaluation.scores.workIncomeElasticity.toFixed(1)}</div>
            </div>
            <div class="indicator-description">衡量工作量与收入之间的关系</div>
            <div class="indicator-formula">公式: 总收入 / 总工作量</div>
            <div class="indicator-details">
                <span class="detail-item">优秀: ≥1.50</span>
                <span class="detail-item">良好: 1.00-1.49</span>
                <span class="detail-item">一般: 0.50-0.99</span>
                <span class="detail-item">较差: 0.20-0.49</span>
                <span class="detail-item">危险: &lt;0.20</span>
            </div>
            <div class="indicator-value">当前值: ${evaluation.workIncomeElasticity.toFixed(3)}</div>
        </div>
        
        <div class="indicator-item">
            <div class="indicator-header">
                <h4>综合绩效偏离度指数</h4>
                <div class="indicator-score ${getScoreClass(evaluation.scores.performanceDeviation)}">${evaluation.scores.performanceDeviation.toFixed(1)}</div>
            </div>
            <div class="indicator-description">衡量项目绩效与预期的偏离程度</div>
            <div class="indicator-formula">公式: 1 - 欧氏距离/√3</div>
            <div class="indicator-details">
                <span class="detail-item">优秀: ≥0.80</span>
                <span class="detail-item">良好: 0.60-0.79</span>
                <span class="detail-item">一般: 0.40-0.59</span>
                <span class="detail-item">较差: 0.20-0.39</span>
                <span class="detail-item">危险: &lt;0.20</span>
            </div>
            <div class="indicator-value">当前值: ${evaluation.performanceDeviation.toFixed(3)}</div>
        </div>
    `;
    
    indicatorsContainer.innerHTML = indicatorsHTML;
}

// 更新韧性评价总体评价
function updateLuckOverall(evaluation) {
    const overallContainer = document.getElementById('luck-overall');
    
    // 创建总体评价HTML
    const overallHTML = `
        <div class="overall-score" style="color: ${getLevelColor(evaluation.level)}">
            <div class="score-value">${evaluation.overallScore.toFixed(1)}</div>
            <div class="score-level">${evaluation.level}</div>
        </div>
        <div class="overall-description">${evaluation.description}</div>
    `;
    
    overallContainer.innerHTML = overallHTML;
}

// 根据分数获取样式类
function getScoreClass(score) {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 55) return 'average';
    if (score >= 40) return 'poor';
    return 'danger';
}

// 根据等级获取颜色
function getLevelColor(level) {
    switch (level) {
        case '优秀':
        case '韧性极佳':
            return '#4CAF50';
        case '良好':
        case '韧性良好':
            return '#8BC34A';
        case '一般':
        case '韧性一般':
            return '#FFC107';
        case '预警':
        case '韧性较差':
            return '#FF9800';
        case '危险':
        case '韧性极差':
            return '#F44336';
        default:
            return '#9E9E9E';
    }
}

// 计算项目韧性评价
function calculateLuckEvaluation() {
    // 获取当前项目或所有项目的数据
    const data = currentProject ? 
        projectData.filter(item => item['项目名称'] === currentProject) : 
        projectData;
    
    if (data.length === 0) {
        return {
            collectionRate: 0, revenuePerMeter: 0, revenueDeviation: 0,
            timeStability: 0, workIncomeElasticity: 0, performanceDeviation: 0,
            scores: { collectionRate: 0, revenuePerMeter: 0, revenueDeviation: 0, timeStability: 0, workIncomeElasticity: 0, performanceDeviation: 0 },
            overallScore: 0,
            level: '数据不足',
            description: '没有足够的数据进行韧性评价'
        };
    }
    
    // 计算各项指标
    const evaluation = {
        collectionRate: calculateCollectionRate(data),
        revenuePerMeter: calculateRevenuePerMeter(data),
        revenueDeviation: calculateRevenueDeviation(data),
        timeStability: calculateTimeStability(data),
        workIncomeElasticity: calculateWorkIncomeElasticity(data),
        performanceDeviation: calculatePerformanceDeviation(data)
    };
    
    // 将指标转换为分数（0-100）
    evaluation.scores = {
        collectionRate: convertCollectionRateToScore(evaluation.collectionRate),
        revenuePerMeter: convertRevenuePerMeterToScore(evaluation.revenuePerMeter, data),
        revenueDeviation: convertRevenueDeviationToScore(evaluation.revenueDeviation),
        timeStability: convertTimeStabilityToScore(evaluation.timeStability),
        workIncomeElasticity: convertWorkIncomeElasticityToScore(evaluation.workIncomeElasticity),
        performanceDeviation: convertPerformanceDeviationToScore(evaluation.performanceDeviation)
    };
    
    // 计算综合分数（各项指标权重相同）
    evaluation.overallScore = Object.values(evaluation.scores).reduce((sum, score) => sum + score, 0) / 6;
    
    // 确定韧性等级和结论
    if (evaluation.overallScore >= 80) {
        evaluation.level = '韧性极佳';
        evaluation.description = '外部环境整体有利，各维度表现超预期';
    } else if (evaluation.overallScore >= 60) {
        evaluation.level = '韧性良好';
        evaluation.description = '核心指标受外部干扰较小，整体符合预期';
    } else if (evaluation.overallScore >= 40) {
        evaluation.level = '韧性一般';
        evaluation.description = '外部因素正负影响均衡，需关注个别指标波动';
    } else if (evaluation.overallScore >= 20) {
        evaluation.level = '韧性较差';
        evaluation.description = '受客户延迟、成本上涨等外部因素拖累，多项指标不达标';
    } else {
        evaluation.level = '韧性极差';
        evaluation.description = '受重大外部风险冲击，项目运行异常';
    }
    
    return evaluation;
}