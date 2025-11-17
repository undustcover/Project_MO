// 全局变量
let projectData = null;
let charts = {};

// 注册Chart.js插件
if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
    console.log('ChartDataLabels插件已注册');
} else {
    console.error('Chart.js或ChartDataLabels插件未正确加载');
}

// 预算总成本（BAC）- 固定值
const BAC = 46248700;

// 任务成本计划数据
const taskCostPlans = {
    "钻机动迁成本计划": 7146000,
    "NNKB-009成本计划": 4342742,
    "NNKB-010成本计划": 4342742,
    "NNKB-011成本计划": 4342742,
    "APKA-015成本计划": 4342742,
    "APKA-016成本计划": 4342742,
    "APKA-017成本计划": 4342742,
    "PCCA-040成本计划": 4342742,
    "PCCA-041成本计划": 4342742,
    "PCCA-042成本计划": 4342742
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定上传按钮事件
    document.getElementById('uploadBtn').addEventListener('click', handleFileUpload);
    
    // 绑定任务选择器事件
    document.getElementById('taskSelector').addEventListener('change', updateTaskCharts);
});

// 处理文件上传
function handleFileUpload() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showStatus('请选择Excel文件', 'warning');
        return;
    }
    
    showStatus('正在读取文件...', 'info');
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // 读取第一个工作表
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // 转换为JSON格式
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // 处理数据
            processData(jsonData);
            
            // 显示成功消息
            showStatus('文件上传成功！', 'success');
            
            // 显示图表区域
            document.getElementById('chartsSection').style.display = 'block';
            
            showStatus('数据处理完成！', 'success');
            document.getElementById('overviewCards').style.display = 'block';
            
        } catch (error) {
            console.error('处理文件时出错:', error);
            showStatus('文件处理失败: ' + error.message, 'danger');
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// 处理Excel数据
function processData(rawData) {
    // 跳过标题行，从第二行开始处理
    projectData = [];
    
    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        
        // 确保行有足够的数据
        if (row.length >= 10) {
            projectData.push({
                taskName: row[0] || '', // 任务名称
                costLevel1: row[1] || '', // 成本要素组-1级名称
                costLevel2: row[2] || '', // 成本要素组-2级名称
                costLevel3: row[3] || '', // 成本要素组-3级名称
                costLevel4: row[4] || '', // 成本要素组-4级名称
                unit: row[5] || '', // 单位
                unitPrice: parseFloat(row[6]) || 0, // 单价
                quantity: parseFloat(row[7]) || 0, // 数量
                totalCost: parseFloat(row[8]) || 0, // 总成本
                ev: parseFloat(row[9]) || 0 // EV（总收入）字段，从Excel表的"总收入"字段获取
            });
        }
    }
    
    // 更新UI
    updateOverviewCards();
    updateTotalCostBarChart();
    updateBudgetConsumptionChart();
    updateTotalCostPieChart();
    updateTaskSelector();
    
    // 默认选择第一个任务
    if (projectData.length > 0) {
        const firstTask = getUniqueTasks()[0];
        document.getElementById('taskSelector').value = firstTask;
        updateTaskCharts();
    }
}

// 更新概览卡片
function updateOverviewCards() {
    // 计算任务总成本（AC）
    const AC = projectData.reduce((sum, item) => sum + item.totalCost, 0);
    
    // 计算总收入（EV）
    const EV = projectData.reduce((sum, item) => sum + item.ev, 0);
    
    // 计算总任务成本计划
    const totalTaskCostPlan = Object.values(taskCostPlans).reduce((sum, cost) => sum + cost, 0);
    
    // 计算成本偏差（所有任务总成本-任务成本计划）
    const costVariance = AC - totalTaskCostPlan;
    
    // 计算成本绩效指数（CPI=EV/AC）
    const CPI = AC > 0 ? EV / AC : 0;
    
    // 计算完工尚需估算（ETC=（BAC-EV）/CPI）
    const ETC = CPI > 0 ? (BAC - EV) / CPI : 0;
    
    // 计算完工总估算（EAC=AC+ETC）
    const EAC = AC + ETC;
    
    // 计算剩余预算
    const remainingBudget = BAC - AC;
    
    // 找出最高成本项
    const highestCostItem = findHighestCostItem();
    
    // 更新DOM
    document.getElementById('bacValue').textContent = formatCurrency(BAC);
    document.getElementById('acValue').textContent = formatCurrency(AC);
    document.getElementById('remainingBudget').textContent = formatCurrency(remainingBudget);
    
    if (highestCostItem) {
        document.getElementById('highestCostItem').textContent = highestCostItem.name;
        document.getElementById('highestCostValue').textContent = formatCurrency(highestCostItem.value);
    }
    
    // 更新新增指标
    document.getElementById('evValue').textContent = formatCurrency(EV);
    document.getElementById('costVarianceValue').textContent = formatCurrency(costVariance);
    document.getElementById('cpiValue').textContent = CPI.toFixed(2);
    document.getElementById('etcValue').textContent = formatCurrency(ETC);
    document.getElementById('eacValue').textContent = formatCurrency(EAC);
    
    // 根据CPI值设置颜色
    const cpiElement = document.getElementById('cpiCard');
    cpiElement.classList.remove('text-danger', 'text-warning', 'text-success');
    if (CPI < 0.9) {
        cpiElement.classList.add('text-danger');
    } else if (CPI >= 0.9 && CPI <= 1.0) {
        cpiElement.classList.add('text-warning');
    } else {
        cpiElement.classList.add('text-success');
    }
}

// 更新总成本条状图
function updateTotalCostBarChart() {
    const ctx = document.getElementById('totalCostBarChart').getContext('2d');
    
    // 计算任务总成本（AC）
    const AC = projectData.reduce((sum, item) => sum + item.totalCost, 0);
    
    // 按任务分组计算总成本
    const taskCosts = {};
    projectData.forEach(item => {
        if (!taskCosts[item.taskName]) {
            taskCosts[item.taskName] = 0;
        }
        taskCosts[item.taskName] += item.totalCost;
    });
    
    // 准备图表数据
    const labels = ['任务总成本 (AC)', ...Object.keys(taskCosts)];
    const data = [AC, ...Object.values(taskCosts)];
    
    // 销毁旧图表
    if (charts.totalCostBar) {
        charts.totalCostBar.destroy();
    }
    
    // 创建新图表
    charts.totalCostBar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '成本',
                data: data,
                backgroundColor: [
                    'rgba(54, 162, 235, 0.7)',
                    ...generateColors(Object.keys(taskCosts).length, 0.7)
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    ...generateColors(Object.keys(taskCosts).length, 1)
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '成本: ' + formatCurrency(context.raw);
                        }
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: function(value) {
                        return formatCurrency(value);
                    },
                    font: {
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// 更新预算消耗图
function updateBudgetConsumptionChart() {
    const ctx = document.getElementById('budgetConsumptionChart').getContext('2d');
    
    // 计算任务总成本（AC）
    const AC = projectData.reduce((sum, item) => sum + item.totalCost, 0);
    
    // 计算剩余预算
    const remainingBudget = BAC - AC;
    
    // 销毁旧图表
    if (charts.budgetConsumption) {
        charts.budgetConsumption.destroy();
    }
    
    // 创建新图表
    charts.budgetConsumption = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['预算总成本 (BAC)', '任务总成本 (AC)', '剩余预算'],
            datasets: [{
                label: '金额',
                data: [BAC, AC, remainingBudget],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + formatCurrency(context.raw);
                        }
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: function(value) {
                        return formatCurrency(value);
                    },
                    font: {
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// 更新总成本圆盘图（成本要素-2级占比）
function updateTotalCostPieChart() {
    const ctx = document.getElementById('totalCostPieChart').getContext('2d');
    
    // 按成本要素组-2级分组计算总成本
    const costLevel2Totals = {};
    projectData.forEach(item => {
        if (!costLevel2Totals[item.costLevel2]) {
            costLevel2Totals[item.costLevel2] = 0;
        }
        costLevel2Totals[item.costLevel2] += item.totalCost;
    });
    
    // 准备图表数据
    const labels = Object.keys(costLevel2Totals);
    const data = Object.values(costLevel2Totals);
    
    // 销毁旧图表
    if (charts.totalCostPie) {
        charts.totalCostPie.destroy();
    }
    
    // 创建新图表
    charts.totalCostPie = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: generateColors(labels.length, 0.7),
                borderColor: generateColors(labels.length, 1),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = formatCurrency(context.raw);
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(2);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 更新任务选择器
function updateTaskSelector() {
    const taskSelector = document.getElementById('taskSelector');
    const uniqueTasks = getUniqueTasks();
    
    // 清空选择器
    taskSelector.innerHTML = '';
    
    // 添加任务选项
    uniqueTasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task;
        option.textContent = task;
        taskSelector.appendChild(option);
    });
}

// 更新任务相关图表
function updateTaskCharts() {
    const selectedTask = document.getElementById('taskSelector').value;
    
    if (!selectedTask) {
        // 隐藏任务指标卡片
        document.getElementById('taskMetricsCards').style.display = 'none';
        return;
    }
    
    // 显示任务指标卡片
    document.getElementById('taskMetricsCards').style.display = 'block';
    
    // 更新图表标题
    document.getElementById('taskLevel1PieTitle').textContent = `${selectedTask} - 1级成本圆盘图`;
    document.getElementById('taskLevel2PieTitle').textContent = `${selectedTask} - 2级直接成本圆盘图`;
    document.getElementById('taskRadarTitle').textContent = `${selectedTask} - 成本六维雷达图`;
    
    // 更新1级成本圆盘图
    updateTaskLevel1PieChart(selectedTask);
    
    // 更新2级直接成本圆盘图
    updateTaskLevel2PieChart(selectedTask);
    
    // 更新任务指标
    updateTaskMetrics(selectedTask);
    
    // 移除自动更新雷达图和评价看板的代码
    // 用户需要点击"开始分析"按钮才会更新
}

// 更新任务指标
function updateTaskMetrics(taskName) {
    // 筛选选定任务的数据
    const taskData = projectData.filter(item => item.taskName === taskName);
    
    // 计算任务总成本（AC）
    const taskAC = taskData.reduce((sum, item) => sum + item.totalCost, 0);
    
    // 计算任务总收入（EV）
    const taskEV = taskData.reduce((sum, item) => sum + item.ev, 0);
    
    // 获取任务成本计划
    const taskCostPlan = taskCostPlans[taskName] || 0;
    
    // 计算任务成本偏差（任务总成本-任务成本计划）
    const taskCostVariance = taskAC - taskCostPlan;
    
    // 计算任务成本绩效指数（CPI=EV/AC）
    const taskCPI = taskAC > 0 ? taskEV / taskAC : 0;
    
    // 计算任务利润率（利润/成本）
    const profit = taskEV - taskAC;
    const profitMargin = taskAC > 0 ? (profit / taskAC) * 100 : 0;
    
    // 更新DOM
    document.getElementById('taskCpiValue').textContent = taskCPI.toFixed(2);
    document.getElementById('taskCostVarianceValue').textContent = formatCurrency(taskCostVariance);
    document.getElementById('taskProfitMarginValue').textContent = profitMargin.toFixed(1) + '%';
    
    // 根据CPI值设置颜色
    const cpiElement = document.getElementById('taskCpiCard');
    cpiElement.classList.remove('bg-info', 'bg-danger', 'bg-warning', 'bg-success');
    if (taskCPI < 0.9) {
        cpiElement.classList.add('bg-danger');
    } else if (taskCPI >= 0.9 && taskCPI <= 1.0) {
        cpiElement.classList.add('bg-warning');
    } else {
        cpiElement.classList.add('bg-success');
    }
}

// 更新单任务1级成本圆盘图
function updateTaskLevel1PieChart(taskName) {
    const ctx = document.getElementById('taskLevel1PieChart').getContext('2d');
    
    // 筛选选定任务的数据
    const taskData = projectData.filter(item => item.taskName === taskName);
    
    // 按成本要素组-1级分组计算总成本
    const costLevel1Totals = {};
    taskData.forEach(item => {
        if (!costLevel1Totals[item.costLevel1]) {
            costLevel1Totals[item.costLevel1] = 0;
        }
        costLevel1Totals[item.costLevel1] += item.totalCost;
    });
    
    // 准备图表数据
    const labels = Object.keys(costLevel1Totals);
    const data = Object.values(costLevel1Totals);
    
    // 销毁旧图表
    if (charts.taskLevel1Pie) {
        charts.taskLevel1Pie.destroy();
    }
    
    // 创建新图表
    charts.taskLevel1Pie = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: generateColors(labels.length, 0.7),
                borderColor: generateColors(labels.length, 1),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = formatCurrency(context.raw);
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(2);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 更新单任务2级直接成本圆盘图
function updateTaskLevel2PieChart(taskName) {
    const ctx = document.getElementById('taskLevel2PieChart').getContext('2d');
    
    // 筛选选定任务的数据
    const taskData = projectData.filter(item => 
        item.taskName === taskName && item.costLevel1 === '项目直接成本'
    );
    
    // 按成本要素组-2级分组计算总成本
    const costLevel2Totals = {};
    taskData.forEach(item => {
        if (!costLevel2Totals[item.costLevel2]) {
            costLevel2Totals[item.costLevel2] = 0;
        }
        costLevel2Totals[item.costLevel2] += item.totalCost;
    });
    
    // 准备图表数据
    const labels = Object.keys(costLevel2Totals);
    const data = Object.values(costLevel2Totals);
    
    // 销毁旧图表
    if (charts.taskLevel2Pie) {
        charts.taskLevel2Pie.destroy();
    }
    
    // 创建新图表
    charts.taskLevel2Pie = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: generateColors(labels.length, 0.7),
                borderColor: generateColors(labels.length, 1),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = formatCurrency(context.raw);
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(2);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 获取唯一任务列表
function getUniqueTasks() {
    const tasks = new Set();
    projectData.forEach(item => {
        if (item.taskName) {
            tasks.add(item.taskName);
        }
    });
    return Array.from(tasks);
}

// 找出最高成本项
function findHighestCostItem() {
    // 按成本要素组-2级分组计算总成本
    const costLevel2Totals = {};
    projectData.forEach(item => {
        if (!costLevel2Totals[item.costLevel2]) {
            costLevel2Totals[item.costLevel2] = 0;
        }
        costLevel2Totals[item.costLevel2] += item.totalCost;
    });
    
    // 找出最高成本项
    let highestItem = null;
    let highestValue = 0;
    
    for (const [name, value] of Object.entries(costLevel2Totals)) {
        if (value > highestValue) {
            highestValue = value;
            highestItem = { name, value };
        }
    }
    
    return highestItem;
}

// 生成颜色数组
function generateColors(count, alpha) {
    const colors = [];
    const baseColors = [
        `rgba(255, 99, 132, ${alpha})`,
        `rgba(54, 162, 235, ${alpha})`,
        `rgba(255, 206, 86, ${alpha})`,
        `rgba(75, 192, 192, ${alpha})`,
        `rgba(153, 102, 255, ${alpha})`,
        `rgba(255, 159, 64, ${alpha})`,
        `rgba(199, 199, 199, ${alpha})`,
        `rgba(83, 102, 255, ${alpha})`,
        `rgba(255, 99, 255, ${alpha})`,
        `rgba(99, 255, 132, ${alpha})`
    ];
    
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    
    return colors;
}

// 格式化货币
function formatCurrency(value) {
    return '¥' + value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 显示状态消息
function showStatus(message, type) {
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
    
    // 3秒后自动清除消息
    setTimeout(() => {
        statusDiv.innerHTML = '';
    }, 3000);
}

// 开始分析按钮事件监听器
document.addEventListener('DOMContentLoaded', function() {
    // 检查Chart库是否正确加载
    console.log('Chart库:', typeof Chart);
    console.log('Chart对象:', Chart);
    
    // 添加测试数据按钮
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        const testBtn = document.createElement('button');
        testBtn.className = 'btn btn-info ms-2';
        testBtn.textContent = '加载测试数据';
        testBtn.addEventListener('click', loadTestData);
        uploadBtn.parentNode.appendChild(testBtn);
    }
    
    const startAnalysisBtn = document.getElementById('startAnalysisBtn');
    if (startAnalysisBtn) {
        startAnalysisBtn.addEventListener('click', function() {
            console.log('开始分析按钮被点击');
            const selectedTask = document.getElementById('taskSelector').value;
            console.log('选中的任务:', selectedTask);
            
            // 验证是否已选择任务
            if (!selectedTask) {
                alert('请先选择一个任务！');
                return;
            }
            
            // 验证预算输入
            const materialBudget = parseFloat(document.getElementById('materialBudgetInput').value) || 0;
            const laborBudget = parseFloat(document.getElementById('laborBudgetInput').value) || 0;
            const equipmentBudget = parseFloat(document.getElementById('equipmentBudgetInput').value) || 0;
            const serviceBudget = parseFloat(document.getElementById('serviceBudgetInput').value) || 0;
            
            console.log('预算输入:', {materialBudget, laborBudget, equipmentBudget, serviceBudget});
            
            if (materialBudget <= 0 || laborBudget <= 0 || equipmentBudget <= 0 || serviceBudget <= 0) {
                alert('请输入所有成本类型的预算值！');
                return;
            }
            
            // 更新六维雷达图和评价看板
            console.log('开始更新六维雷达图和评价看板');
            updateTaskRadarChart(selectedTask);
            updateTaskEvaluation(selectedTask);
            
            // 滚动到雷达图位置
            document.getElementById('taskRadarChart').scrollIntoView({ behavior: 'smooth' });
        });
    }
});

// 加载测试数据
function loadTestData() {
    // 创建测试数据
    const testData = [
        ['任务名称', '成本类型', '预算成本', '实际成本', '完成百分比'],
        ['钻前准备', '材料成本', 1000000, 950000, 100],
        ['钻前准备', '人工成本', 500000, 520000, 100],
        ['钻前准备', '设备成本', 2000000, 1900000, 100],
        ['钻前准备', '服务成本', 300000, 280000, 100],
        ['钻井工程', '材料成本', 5000000, 4800000, 90],
        ['钻井工程', '人工成本', 3000000, 3300000, 90],
        ['钻井工程', '设备成本', 8000000, 7600000, 90],
        ['钻井工程', '服务成本', 1000000, 1050000, 90],
        ['完井工程', '材料成本', 3000000, 2700000, 80],
        ['完井工程', '人工成本', 2000000, 2100000, 80],
        ['完井工程', '设备成本', 4000000, 4200000, 80],
        ['完井工程', '服务成本', 800000, 720000, 80]
    ];
    
    // 转换为项目数据格式
    projectData = [];
    for (let i = 1; i < testData.length; i++) {
        const row = testData[i];
        projectData.push({
            '任务名称': row[0],
            '成本类型': row[1],
            '预算成本': parseFloat(row[2]),
            '实际成本': parseFloat(row[3]),
            '完成百分比': parseFloat(row[4])
        });
    }
    
    // 更新UI
    updateUI();
    
    // 显示成功消息
    document.getElementById('uploadStatus').innerHTML = 
        '<div class="alert alert-success">测试数据加载成功！</div>';
}

// 六维评分计算逻辑
function calculateDimensionScores(taskName) {
    console.log('calculateDimensionScores 被调用，任务名称:', taskName);
    console.log('projectData:', projectData);
    
    // 筛选选定任务的数据
    const taskData = projectData.filter(item => item.taskName === taskName);
    console.log('筛选后的任务数据:', taskData);
    
    // 计算各成本类型的实际成本
    const materialCost = taskData
        .filter(item => item.costLevel2 === '材料费')
        .reduce((sum, item) => sum + item.totalCost, 0);
    
    const laborCost = taskData
        .filter(item => item.costLevel2 === '人工费')
        .reduce((sum, item) => sum + item.totalCost, 0);
    
    const equipmentCost = taskData
        .filter(item => item.costLevel2 === '设备费')
        .reduce((sum, item) => sum + item.totalCost, 0);
    
    const serviceCost = taskData
        .filter(item => item.costLevel2 === '服务费')
        .reduce((sum, item) => sum + item.totalCost, 0);
    
    const directCost = taskData
        .filter(item => item.costLevel1 === '项目直接成本')
        .reduce((sum, item) => sum + item.totalCost, 0);
    
    const indirectCost = taskData
        .filter(item => item.costLevel1 === '项目间接成本')
        .reduce((sum, item) => sum + item.totalCost, 0);
    
    const totalCost = taskData.reduce((sum, item) => sum + item.totalCost, 0);
    
    console.log('计算得到的成本:', {
        materialCost, laborCost, equipmentCost, serviceCost, 
        directCost, indirectCost, totalCost
    });
    
    // 获取用户输入的预算值
    const materialBudget = parseFloat(document.getElementById('materialBudgetInput').value) || 0;
    const laborBudget = parseFloat(document.getElementById('laborBudgetInput').value) || 0;
    const equipmentBudget = parseFloat(document.getElementById('equipmentBudgetInput').value) || 0;
    const serviceBudget = parseFloat(document.getElementById('serviceBudgetInput').value) || 0;
    const totalBudget = materialBudget + laborBudget + equipmentBudget + serviceBudget;
    
    console.log('用户输入的预算:', {
        materialBudget, laborBudget, equipmentBudget, serviceBudget, totalBudget
    });
    
    // 计算各维度的控制率
    const materialControlRate = materialBudget > 0 ? ((materialBudget - materialCost) / materialBudget * 100) : 0;
    const laborControlRate = laborBudget > 0 ? ((laborBudget - laborCost) / laborBudget * 100) : 0;
    const equipmentControlRate = equipmentBudget > 0 ? ((equipmentBudget - equipmentCost) / equipmentBudget * 100) : 0;
    const serviceControlRate = serviceBudget > 0 ? ((serviceBudget - serviceCost) / serviceBudget * 100) : 0;
    const totalCostControlRate = totalBudget > 0 ? ((totalBudget - totalCost) / totalBudget * 100) : 100;
    const indirectCostRatio = directCost > 0 ? (indirectCost / directCost * 100) : 0;
    
    console.log('计算得到的控制率:', {
        materialControlRate, laborControlRate, equipmentControlRate, 
        serviceControlRate, totalCostControlRate, indirectCostRatio
    });
    
    // 计算各维度的评分
    const materialScore = calculateControlRateScore(materialControlRate);
    const laborScore = calculateControlRateScore(laborControlRate);
    const equipmentScore = calculateControlRateScore(equipmentControlRate);
    const serviceScore = calculateControlRateScore(serviceControlRate);
    const totalCostScore = calculateTotalCostScore(totalCostControlRate);
    const indirectCostScore = calculateIndirectCostScore(indirectCostRatio);
    
    console.log('计算得到的评分:', {
        materialScore, laborScore, equipmentScore, 
        serviceScore, totalCostScore, indirectCostScore
    });
    
    // 计算综合得分
    const overallScore = (materialScore + laborScore + equipmentScore + serviceScore + totalCostScore + indirectCostScore) / 6;
    
    console.log('综合得分:', overallScore);
    
    return {
        material: {
            rate: materialControlRate,
            score: materialScore
        },
        labor: {
            rate: laborControlRate,
            score: laborScore
        },
        equipment: {
            rate: equipmentControlRate,
            score: equipmentScore
        },
        service: {
            rate: serviceControlRate,
            score: serviceScore
        },
        totalCost: {
            rate: totalCostControlRate,
            score: totalCostScore
        },
        indirectCost: {
            rate: indirectCostRatio,
            score: indirectCostScore
        },
        overall: overallScore
    };
}

// 计算成本控制率评分
function calculateControlRateScore(rate) {
    // 控制率越高越好（表示节省的成本越多）
    if (rate >= 20) return 5; // 优秀+ (节省20%以上)
    if (rate >= 10) return 4; // 优秀 (节省10%-20%)
    if (rate >= 5) return 3; // 良好+ (节省5%-10%)
    if (rate >= 0) return 2; // 良好 (节省0%-5%)
    if (rate >= -5) return 1; // 一般 (超支0%-5%)
    return -0.5; // 不合格 (超支5%以上)
}

// 计算任务总成本控制率评分
function calculateTotalCostScore(rate) {
    // 控制率越高越好（表示节省的成本越多）
    if (rate >= 15) return 5; // 优秀+ (节省15%以上)
    if (rate >= 10) return 4; // 优秀 (节省10%-15%)
    if (rate >= 5) return 3; // 良好+ (节省5%-10%)
    if (rate >= 0) return 2; // 良好 (节省0%-5%)
    if (rate >= -5) return 1; // 一般 (超支0%-5%)
    return -0.5; // 不合格 (超支5%以上)
}

// 计算间接成本占比评分
function calculateIndirectCostScore(rate) {
    if (rate <= 8) return 5; // 优秀+
    if (rate <= 10) return 4; // 优秀
    if (rate <= 12) return 3; // 良好+
    if (rate <= 15) return 2; // 良好
    if (rate <= 18) return 1; // 一般
    return -0.5; // 不合格
}

// 更新六维雷达图
function updateTaskRadarChart(taskName) {
    console.log('updateTaskRadarChart 被调用，任务名称:', taskName);
    const canvas = document.getElementById('taskRadarChart');
    console.log('雷达图canvas元素:', canvas);
    
    if (!canvas) {
        console.error('找不到雷达图canvas元素');
        return;
    }
    
    const context = canvas.getContext('2d');
    
    // 计算六维评分
    const scores = calculateDimensionScores(taskName);
    console.log('计算得到的六维评分:', scores);
    
    // 准备雷达图数据
    const radarData = {
        labels: [
            '材料成本控制率',
            '人工成本控制率',
            '设备成本控制率',
            '服务成本控制率',
            '任务总成本控制率',
            '间接成本占比'
        ],
        datasets: [{
            label: taskName,
            data: [
                scores.material.score,
                scores.labor.score,
                scores.equipment.score,
                scores.service.score,
                scores.totalCost.score,
                scores.indirectCost.score
            ],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
        }]
    };
    
    // 销毁旧图表
    if (charts.taskRadar && typeof charts.taskRadar.destroy === 'function') {
        charts.taskRadar.destroy();
    }
    
    // 创建新图表
    console.log('开始创建雷达图...');
    
    try {
        charts.taskRadar = new Chart(context, {
            type: 'radar',
            data: radarData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: {
                            display: true
                        },
                        suggestedMin: -1,
                        suggestedMax: 5,
                        ticks: {
                            stepSize: 1,
                            backdropColor: 'transparent'
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
                                const dimension = context.label;
                                const score = context.raw;
                                let rating = '';
                                
                                if (score >= 4.5) rating = '优秀+';
                                else if (score >= 3.5) rating = '优秀';
                                else if (score >= 2.5) rating = '良好+';
                                else if (score >= 1.5) rating = '良好';
                                else if (score >= 0.5) rating = '一般';
                                else rating = '不合格';
                                
                                return `${dimension}: ${score.toFixed(1)}分 (${rating})`;
                            }
                        }
                    }
                }
            }
        });
        
        console.log('雷达图创建完成:', charts.taskRadar);
    } catch (error) {
        console.error('创建雷达图时出错:', error);
    }
    
    // 更新六维评分详情
    updateDimensionScores(scores);
}

// 更新六维评分详情
function updateDimensionScores(scores) {
    // 材料成本控制率
    updateScoreBar('materialScoreBar', scores.material.score, scores.material.rate);
    
    // 人工成本控制率
    updateScoreBar('laborScoreBar', scores.labor.score, scores.labor.rate);
    
    // 设备成本控制率
    updateScoreBar('equipmentScoreBar', scores.equipment.score, scores.equipment.rate);
    
    // 服务成本控制率
    updateScoreBar('serviceScoreBar', scores.service.score, scores.service.rate);
    
    // 任务总成本控制率
    updateScoreBar('totalCostScoreBar', scores.totalCost.score, scores.totalCost.rate);
    
    // 间接成本占比
    updateScoreBar('indirectCostScoreBar', scores.indirectCost.score, scores.indirectCost.rate);
}

// 更新单个评分条
function updateScoreBar(barId, score, rate) {
    const bar = document.getElementById(barId);
    if (!bar) return;
    
    // 设置宽度 - 处理可能的负分数
    let widthPercent;
    if (score < 0) {
        // 负分数时，宽度为0，但会显示特殊样式
        widthPercent = 0;
    } else {
        widthPercent = (score / 5) * 100;
    }
    bar.style.width = `${widthPercent}%`;
    
    // 设置文本
    bar.textContent = `${score.toFixed(1)}分 (${rate.toFixed(1)}%)`;
    
    // 设置颜色类
    bar.className = 'progress-bar';
    
    if (score >= 4.5) {
        bar.classList.add('score-excellent-plus');
    } else if (score >= 3.5) {
        bar.classList.add('score-excellent');
    } else if (score >= 2.5) {
        bar.classList.add('score-good-plus');
    } else if (score >= 1.5) {
        bar.classList.add('score-good');
    } else if (score >= 0.5) {
        bar.classList.add('score-average');
    } else {
        bar.classList.add('score-poor');
    }
}

// 更新任务评价看板
function updateTaskEvaluation(taskName) {
    console.log('updateTaskEvaluation 被调用，任务名称:', taskName);
    
    // 计算六维评分
    const scores = calculateDimensionScores(taskName);
    console.log('计算得到的六维评分:', scores);
    
    // 更新综合得分看板
    updateScoreBoard(scores.overall);
    
    // 更新评价等级看板
    updateGradeBoard(scores.overall);
    
    // 更新评价说明看板
    updateExplanationBoard(scores.overall);
    
    console.log('评价看板更新完成');
}

// 更新综合得分看板
function updateScoreBoard(score) {
    const scoreDisplay = document.getElementById('overallScoreDisplay');
    const scoreLabel = document.getElementById('overallScoreLabel');
    
    if (!scoreDisplay || !scoreLabel) return;
    
    // 设置得分
    scoreDisplay.textContent = score.toFixed(2);
    
    // 创建6个评分标准标签，包含分值
    const scoreStandards = [
        { min: 4.5, label: '≥4.5 优秀+', class: 'score-excellent-plus-label' },
        { min: 3.5, label: '≥3.5 优秀', class: 'score-excellent-label' },
        { min: 2.5, label: '≥2.5 良好+', class: 'score-good-plus-label' },
        { min: 1.5, label: '≥1.5 良好', class: 'score-good-label' },
        { min: 0.5, label: '≥0.5 一般', class: 'score-average-label' },
        { min: -Infinity, label: '＜0.5 不及格', class: 'score-poor-label' }
    ];
    
    // 创建标签HTML
    let labelsHTML = '<div class="score-standards-container">';
    scoreStandards.forEach(standard => {
        const isActive = score >= standard.min;
        const activeClass = isActive ? 'active' : '';
        labelsHTML += `<span class="score-standard-tag ${standard.class} ${activeClass}">${standard.label}</span>`;
    });
    labelsHTML += '</div>';
    
    // 设置标签内容
    scoreLabel.innerHTML = labelsHTML;
    scoreLabel.className = 'score-label';
}

// 更新评价等级看板
function updateGradeBoard(score) {
    const gradeDisplay = document.getElementById('overallGradeDisplay');
    const gradeLabel = document.getElementById('overallGradeLabel');
    
    if (!gradeDisplay || !gradeLabel) return;
    
    // 设置等级
    let grade = '';
    let label = '';
    let labelClass = '';
    
    if (score >= 4.5) {
        grade = 'A+';
        label = '优秀+';
        labelClass = 'score-excellent-plus-label';
    } else if (score >= 3.5) {
        grade = 'A';
        label = '优秀';
        labelClass = 'score-excellent-label';
    } else if (score >= 2.5) {
        grade = 'B+';
        label = '良好+';
        labelClass = 'score-good-plus-label';
    } else if (score >= 1.5) {
        grade = 'B';
        label = '良好';
        labelClass = 'score-good-label';
    } else if (score >= 0.5) {
        grade = 'C';
        label = '一般';
        labelClass = 'score-average-label';
    } else {
        grade = 'D';
        label = '不合格';
        labelClass = 'score-poor-label';
    }
    
    gradeDisplay.textContent = grade;
    gradeLabel.textContent = label;
    gradeLabel.className = 'grade-label ' + labelClass;
}

// 更新评价说明看板
function updateExplanationBoard(score) {
    const explanationText = document.getElementById('overallExplanationText');
    const improvementText = document.getElementById('improvementText');
    
    if (!explanationText || !improvementText) return;
    
    let explanation = '';
    let improvement = '';
    
    if (score >= 4.5) {
        explanation = '所有成本维度均表现卓越，总成本显著低于预算，各项费用控制精准，成本结构合理，体现了极高的成本管理水平。';
        improvement = '总结优秀成本管理经验，形成标准化成本控制流程；分析成本节约的关键因素，推广至其他项目；建立成本数据库，为未来项目预算提供基准；对成本控制团队给予专项奖励。';
    } else if (score >= 3.5) {
        explanation = '整体成本控制优秀，多数维度达到或优于预算目标，但在个别分项成本上仍有优化空间。';
        improvement = '识别得分相对较低的维度，制定专项改进计划；分析成本偏差原因，优化相关采购或执行流程；加强成本预警机制，防止小幅偏差扩大；与其他优秀项目对标，学习先进经验。';
    } else if (score >= 2.5) {
        explanation = '成本控制达到良好水平，主要成本指标基本达标，但在成本结构和效率方面需要进一步提升。';
        improvement = '重点关注间接成本占比和人工费效率；优化资源配置，提高人工和设备利用率；加强供应商管理，优化服务费和材料费支出；建立月度成本分析会制度，及时发现和解决问题。';
    } else if (score >= 1.5) {
        explanation = '成本控制勉强合格，多个维度存在超支或效率低下问题，需要系统性改进成本管理体系。';
        improvement = '全面审查成本控制流程，找出漏洞；重新评估预算合理性，调整后续项目预算；加强成本审批权限管理，严格控制非必要支出；开展成本管理培训，提升团队成本意识。';
    } else if (score >= 0.5) {
        explanation = '成本控制较差，多数维度严重偏离预算，存在明显的成本浪费和管理漏洞。';
        improvement = '成立成本整改专项小组，由高层直接领导；暂停非紧急支出，重新评审所有采购合同；实施严格的成本日报制度，实时监控支出；对超支严重的分项进行专项审计。';
    } else {
        explanation = '成本控制极差，全面超支，成本结构严重不合理，项目经济效益受到重大影响。';
        improvement = '启动危机管理程序，高层全面介入成本管理；重新评估项目可行性，必要时调整项目范围；更换不称职的成本管理人员；建立严格的成本控制奖惩制度。';
    }
    
    explanationText.textContent = explanation;
    improvementText.textContent = improvement;
}