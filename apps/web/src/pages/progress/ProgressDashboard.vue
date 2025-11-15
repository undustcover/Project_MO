<template>
  <el-card shadow="never" class="page-card">
    <template #header>
      <div class="card-header">进度仪表盘</div>
    </template>
    <div class="toolbar">
      <el-select v-model="projectId" placeholder="选择项目" filterable style="width:300px" @change="onProjectChange">
        <el-option v-for="p in projects" :key="p.id" :label="p.contractNo + '（' + (p.workloadText||'') + '）'" :value="p.id" />
      </el-select>
      <el-select v-model="wellNumber" placeholder="选择井号（可选）" clearable class="ml8" style="width:200px" @change="load">
        <el-option v-for="w in wells" :key="w" :label="w" :value="w" />
      </el-select>
      <el-select v-model="cycle" placeholder="选择周期（可选）" clearable class="ml8" style="width:260px">
        <el-option v-for="c in cycleOptions" :key="c.value" :label="c.label" :value="c.value" />
      </el-select>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" class="ml8" />
      <el-upload :action="uploadUrl" :show-file-list="false" :headers="{}" :data="{}" :on-success="onImportSuccess" :on-error="onImportError" accept=".xlsx,.xls" class="ml8">
        <el-button type="success">导入实际进度</el-button>
      </el-upload>
      <el-tooltip content="下载实际进度模板" placement="top">
        <a class="icon-btn ml8" href="/api/dashboard/progress/template" download aria-label="下载实际进度模板">
          <svg class="icon" viewBox="0 0 24 24"><path d="M12 3a1 1 0 011 1v8.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L11 12.586V4a1 1 0 011-1zm-7 14a1 1 0 011-1h12a1 1 0 011 1v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2z"/></svg>
        </a>
      </el-tooltip>
      <el-upload :action="planUploadUrl" :show-file-list="false" :headers="{}" :data="{}" :on-success="onPlanImportSuccess" :on-error="onPlanImportError" accept=".xlsx,.xls" class="ml8">
        <el-button type="warning">导入计划</el-button>
      </el-upload>
      <el-tooltip content="下载计划模板" placement="top">
        <a class="icon-btn ml8" href="/api/dashboard/progress/plan/template" download aria-label="下载计划模板">
          <svg class="icon" viewBox="0 0 24 24"><path d="M6 2a1 1 0 011-1h8a1 1 0 011 1v2h3a1 1 0 011 1v15a2 2 0 01-2 2H6a2 2 0 01-2-2V5a1 1 0 011-1h3V2zm2 3h8V2H8v3zm0 5h8v2H8V10zm0 4h8v2H8v-2z"/></svg>
        </a>
      </el-tooltip>
      <el-upload :action="contractUploadUrl" :show-file-list="false" :headers="{}" :data="{}" :on-success="onContractImportSuccess" :on-error="onContractImportError" accept=".xlsx,.xls" class="ml8">
        <el-button type="info">导入合同指标</el-button>
      </el-upload>
      <el-tooltip content="下载合同指标模板" placement="top">
        <a class="icon-btn ml8" href="/api/dashboard/progress/contract/template" download aria-label="下载合同指标模板">
          <svg class="icon" viewBox="0 0 24 24"><path d="M12 3a1 1 0 011 1v8.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L11 12.586V4a1 1 0 011-1zm-7 14a1 1 0 011-1h12a1 1 0 011 1v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2z"/></svg>
        </a>
      </el-tooltip>
      <el-button type="primary" class="ml8" @click="load">刷新</el-button>
      <el-button class="ml8" @click="exportPDF">导出PDF</el-button>
    </div>
    <el-row :gutter="12">
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">六维雷达图</div>
          <div v-show="!isLoading" ref="radarRef" class="radar"></div>
          <el-skeleton v-show="isLoading" animated :rows="6" />
          <el-card shadow="never" class="mt12">
            <div class="sub-title">项目评价</div>
            <div>{{ evaluationTitle }}</div>
            <div class="eval-text">{{ evaluationText }}</div>
            <div class="eval-standards">
              <el-tag size="small" type="success">优秀+：≥ 4.5</el-tag>
              <el-tag size="small" type="success" effect="plain">优秀：≥ 3.5</el-tag>
              <el-tag size="small" type="warning">良好+：≥ 2.5</el-tag>
              <el-tag size="small" type="warning" effect="plain">良好：≥ 1.5</el-tag>
              <el-tag size="small" type="info">一般：≥ 0.5</el-tag>
              <el-tag size="small" type="danger">不合格：< 0.5</el-tag>
            </div>
          </el-card>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">评分明细</div>
          <div class="metric-list">
            <div class="metric-item" v-for="m in scoresTable" :key="m.name">
              <div class="metric-head">
                <span class="metric-name">{{ m.name }}</span>
                <span class="metric-score">{{ Number(m.score || 0).toFixed(2) }}/5</span>
              </div>
              <el-progress :percentage="Math.round((Number(m.score || 0) / 5) * 100)" :stroke-width="12" :color="progressColor(Number(m.score || 0))" />
              <div class="metric-formula">{{ m.formula }}</div>
            </div>
          </div>
          <div class="overall">
            <span>综合得分：</span>
            <span class="overall-score">{{ overallScore.toFixed(2) }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12" class="mt12">
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">建井周期统计</div>
          <div v-show="!isLoading" ref="cyclePieRef" class="pie"></div>
          <el-skeleton v-show="isLoading" animated :rows="4" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">工作时效对比</div>
          <div v-show="!isLoading" ref="effPieRef" class="pie"></div>
          <el-skeleton v-show="isLoading" animated :rows="4" />
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12" class="mt12">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">度量明细</div>
          <el-table :data="metricsTable" size="small" border>
            <el-table-column prop="name" label="指标" />
            <el-table-column prop="value" label="数值" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12" class="mt12">
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">时效统计（三级时效-小时数）</div>
          <div ref="barRef" class="bar"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">二级时效占比</div>
          <div ref="level2PieRef" class="pie"></div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12" class="mt12">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">计划与实际对比（完成时间差）</div>
          <div ref="planBarRef" class="bar"></div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12" class="mt12">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">计划与实际列表</div>
          <el-table :data="planRows" size="small" border>
            <el-table-column prop="conditionName" label="工况名称" />
            <el-table-column prop="planStartDate" label="计划开始" width="120" />
            <el-table-column prop="planEndDate" label="计划结束" width="120" />
            <el-table-column prop="actualStartDate" label="实际开始" width="120" />
            <el-table-column prop="actualEndDate" label="实际结束" width="120" />
            <el-table-column prop="completionDeltaDays" label="完成差(天)" width="120" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { onMounted, ref, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { getProjects, getProgressDashboard } from '../../services/api'
import { getProgressWells, getProgressCycleDetail, getProgressCycleBreakdown, getProgressPlanCompare } from '../../services/api'
import { getProgressContract } from '../../services/api'
const projects = ref<any[]>([])
const projectId = ref<number>()
const wells = ref<string[]>([])
const wellNumber = ref<string>('')
const cycle = ref<'task' | 'moving' | 'drilling' | 'completion' | 'testing' | ''>('')
const cycleOptions = [
  { label: '任务周期', value: 'task' },
  { label: '搬安周期', value: 'moving' },
  { label: '钻井周期', value: 'drilling' },
  { label: '完井周期', value: 'completion' },
  { label: '测试周期', value: 'testing' }
]
const dateRange = ref<any>(null)
const data = ref<any>(null)
const radarRef = ref<HTMLDivElement | null>(null)
const barRef = ref<HTMLDivElement | null>(null)
const planBarRef = ref<HTMLDivElement | null>(null)
const cyclePieRef = ref<HTMLDivElement | null>(null)
const effPieRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null
let planBarChart: echarts.ECharts | null = null
const html2pdfReady = ref(false)
let cyclePieChart: echarts.ECharts | null = null
let effPieChart: echarts.ECharts | null = null
const level2PieRef = ref<HTMLDivElement | null>(null)
let level2PieChart: echarts.ECharts | null = null
const dimension = ref<'level2' | 'level3'>('level3')
const isLoading = ref(false)

// 提前声明，供下方度量和评分计算使用
const taskDetail = ref<any>(null)
const cycleBreakAll = ref<any>(null)

async function loadProjects() {
  projects.value = await getProjects()
  if (projects.value.length && !projectId.value) projectId.value = projects.value[0].id
}
async function onProjectChange() { await loadWells(); await load() }
async function loadWells() { wells.value = projectId.value ? await getProgressWells(projectId.value) : [] }
// 已移除任务列表，改为周期选择
async function load() {
  if (!projectId.value) return
  isLoading.value = true
  const from = Array.isArray(dateRange.value) && dateRange.value[0] ? formatDate(dateRange.value[0]) : undefined
  const to = Array.isArray(dateRange.value) && dateRange.value[1] ? formatDate(dateRange.value[1]) : undefined
  try {
    const d = await getProgressDashboard({ projectId: projectId.value, from, to, wellNumber: wellNumber.value || undefined })
    data.value = d || {
      movingCycleTime: 0,
      drillingCycleTime: 0,
      completionCycleTime: 0,
      testingCycleTime: 0,
      drillingProductionTime: 0,
      drillingNonProductionTime: 0,
      actualCompletionTime: 0,
      pureDrillingTime: 0,
      trippingTime: 0,
      footageWorkingTime: 0,
      wellBuildingCycleTime: 0
    }
    await loadCycleDetail()
    await loadCycleBreakdown()
    await loadPlanCompare()
    await loadContract()
  } finally {
    isLoading.value = false
    await nextTick()
    render()
    calculate()
  }
}
function render() {
  if (!radarRef.value || !data.value) return
  if (chart && radarRef.value && (chart as any).getDom && (chart as any).getDom() !== radarRef.value) { chart.dispose(); chart = null }
  if (!chart) chart = echarts.init(radarRef.value)
  const d = data.value
  const raw = [
    scores.value.productionRate,
    scores.value.nonProductionRate,
    scores.value.midCompletion,
    scores.value.drillingEfficiency,
    scores.value.trippingEfficiency,
    scores.value.contractUtilization
  ]
  const labels = ['生产时间达成率', '非生产时效控制率', '中完时间达成率', '纯钻时效', '起下钻时效', '合同时间利用率']
  const option = {
    color: ['#2f88ff', '#a566ff', '#ff8a00', '#00c9a7', '#ff4d4f', '#6c63ff'],
    tooltip: {
      trigger: 'item',
      confine: true,
      appendToBody: true,
      extraCssText: 'max-width:280px; white-space:normal; line-height:1.6;',
      formatter: (params: any) => {
        const vals: number[] = params.value || []
        return labels.map((l, i) => `${l}: ${Number(vals[i] || 0).toFixed(2)}`).join('<br/>')
      }
    },
    radar: {
      indicator: labels.map(l => ({ name: l, max: 5 })),
      axisName: { color: '#334155', fontSize: 12, fontWeight: 500 },
      splitLine: { lineStyle: { color: ['#e2e8f0'] } },
      splitArea: { areaStyle: { color: ['#f8fafc', '#ffffff'] } }
    },
    series: [{
      type: 'radar',
      data: [{ value: raw, name: '评分' }],
      lineStyle: { width: 2, color: '#2f88ff' },
      areaStyle: { color: 'rgba(47,136,255,0.25)' },
      symbol: 'circle',
      symbolSize: 4
    }]
  }
  chart.setOption(option)
  renderBar()
  renderCyclePie()
  renderEffPie()
  renderLevel2Pie()
}
const metricsTable = ref<any[]>([])
function updateMetricsTable() {
  const d = data.value || {}
  const td = taskDetail.value || null
  const cb = cycleBreakAll.value || null
  const isCycle = !!cycle.value
  const sumByLevel2 = (labels: string | string[]) => {
    const arr = Array.isArray(labels) ? labels : [labels]
    let sum = 0
    if (cb?.byLevel2) {
      const cats = cb.byLevel2.categories || []
      const prod = cb.byLevel2.production || []
      for (const lab of arr) {
        const i = cats.indexOf(lab)
        if (i >= 0) sum += Number(prod[i] || 0)
      }
    }
    return sum
  }
  const pickLevel3 = (label: string) => {
    if (cb?.byLevel3) {
      const cats = cb.byLevel3.categories || []
      const prod = cb.byLevel3.production || []
      const i = cats.indexOf(label)
      return i >= 0 ? Number(prod[i] || 0) : 0
    }
    return 0
  }
  let buildingVal = Number(d.wellBuildingCycleTime || 0)
  if (isCycle) {
    const mv = Number(td?.movingCycleTime || 0)
    const dv = Number(td?.drillingCycleTime || 0)
    const cv = Number(td?.completionCycleTime || 0)
    const tv = Number(td?.testingCycleTime || 0)
    if (cycle.value === 'moving') buildingVal = mv
    else if (cycle.value === 'drilling') buildingVal = dv
    else if (cycle.value === 'completion') buildingVal = cv
    else if (cycle.value === 'testing') buildingVal = tv
    else buildingVal = mv + dv + cv + tv
  }
  metricsTable.value = [
    { name: '生产时效(h)', value: isCycle ? Number(td?.totalProduction || 0) : Number(d.drillingProductionTime || 0) },
    { name: '非生产时效(h)', value: isCycle ? Number(td?.totalNonProduction || 0) : Number(d.drillingNonProductionTime || 0) },
    { name: '中完时间(h)', value: isCycle ? sumByLevel2(['固井工作时间', '电测时间']) : Number(d.actualCompletionTime || 0) },
    { name: '纯钻时间(h)', value: isCycle ? pickLevel3('纯钻') : Number(d.pureDrillingTime || 0) },
    { name: '起下钻时间(h)', value: isCycle ? pickLevel3('起下钻') : Number(d.trippingTime || 0) },
    { name: '进尺工作时间(h)', value: isCycle ? sumByLevel2('进尺工作时间') : Number(d.footageWorkingTime || 0) },
    { name: '建井周期(h)', value: buildingVal }
  ]
}
watch(data, updateMetricsTable)
watch(() => [cycleBreakAll.value, taskDetail.value, cycle.value], updateMetricsTable)
const contract = ref({ productionTime: 0, nonProductionTime: 0, completionTime: 0, movingPeriod: 0, wellCompletionPeriod: 0, drillingPeriod: 0 })
async function loadContract() {
  if (!projectId.value) { contract.value = { productionTime: 0, nonProductionTime: 0, completionTime: 0, movingPeriod: 0, wellCompletionPeriod: 0, drillingPeriod: 0 }; return }
  const d = await getProgressContract({ projectId: projectId.value, wellNumber: wellNumber.value || undefined })
  contract.value = d || { productionTime: 0, nonProductionTime: 0, completionTime: 0, movingPeriod: 0, wellCompletionPeriod: 0, drillingPeriod: 0 }
}
const scores = ref({
  productionRate: 0,
  nonProductionRate: 0,
  midCompletion: 0,
  drillingEfficiency: 0,
  trippingEfficiency: 0,
  contractUtilization: 0
})
const scoresTable = ref<any[]>([])
const overallScore = ref(0)
const evaluationTitle = ref('')
const evaluationText = ref('')
function calculate() {
  const d = data.value || {}
  const c = contract.value
  const prod = cycle.value ? Number(taskDetail.value?.totalProduction || 0) : Number(d.drillingProductionTime || 0)
  const dCycle = cycle.value ? Number(taskDetail.value?.drillingCycleTime || 0) : Number(d.drillingCycleTime || 0)
  const dNon = cycle.value ? Number(taskDetail.value?.totalNonProduction || 0) : Number(d.drillingNonProductionTime || 0)
  const comp = cycle.value ? Number(taskDetail.value?.completionCycleTime || 0) : Number(d.completionCycleTime || 0)
  const pure = (cycle.value === 'drilling' && cycleBreakAll.value?.byLevel3)
    ? (() => { const cats = cycleBreakAll.value.byLevel3.categories || []; const prodArr = cycleBreakAll.value.byLevel3.production || []; const i = cats.indexOf('纯钻'); return i>=0?Number(prodArr[i]||0):0 })()
    : Number(d.pureDrillingTime || 0)
  const trip = (cycle.value === 'drilling' && cycleBreakAll.value?.byLevel3)
    ? (() => { const cats = cycleBreakAll.value.byLevel3.categories || []; const prodArr = cycleBreakAll.value.byLevel3.production || []; const i = cats.indexOf('起下钻'); return i>=0?Number(prodArr[i]||0):0 })()
    : Number(d.trippingTime || 0)
  const footage = (cycleBreakAll.value?.byLevel2)
    ? (() => { const cats = cycleBreakAll.value.byLevel2.categories || []; const prodArr = cycleBreakAll.value.byLevel2.production || []; const i = cats.indexOf('进尺工作时间'); return i>=0?Number(prodArr[i]||0):0 })()
    : Number(d.footageWorkingTime || 0)

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
  const to2 = (n: number) => Number(n.toFixed(2))

  const prodScore = (() => {
    if (c.productionTime <= 0) return 0
    const diff = Math.abs(prod - c.productionTime) / c.productionTime
    const s = 5 * (1 - clamp(diff, 0, 1))
    return to2(s)
  })()

  const nonScore = (() => {
    const ratioA = dCycle > 0 ? (dNon / dCycle) : 0
    const a = 5 * (1 - clamp(ratioA / 0.02, 0, 1))
    const ratioB = c.nonProductionTime > 0 ? (dNon / c.nonProductionTime) : 0
    const b = 5 * (1 - clamp(ratioB / 1, 0, 1))
    return to2(a * 0.35 + b * 0.65)
  })()

  const midScore = (() => {
    if (c.completionTime <= 0) return 0
    const r = comp / c.completionTime
    const s = r <= 0.6 ? 5 : 5 * (1 - clamp((r - 0.6) / 0.5, 0, 1))
    return to2(s)
  })()

  const drillScore = (() => {
    const r = dCycle > 0 ? (pure / dCycle) : 0
    const s = 5 * clamp(r / 0.5, 0, 1)
    return to2(s)
  })()

  const tripScore = (() => {
    const r = footage > 0 ? (trip / footage) : 0
    const s = r <= 0.1 ? 5 : 5 * (1 - clamp((r - 0.1) / 0.2, 0, 1))
    return to2(s)
  })()

  const contractScore = (() => {
    const moveRate = c.movingPeriod > 0 ? ((cycle.value ? Number(taskDetail.value?.movingCycleTime || 0) : Number(d.movingCycleTime || 0)) / c.movingPeriod) : 0
    const moveS = moveRate <= 0.6 ? 5 : 5 * (1 - clamp((moveRate - 0.6) / 0.5, 0, 1))
    const dDelta = c.drillingPeriod > 0 ? clamp((dCycle - c.drillingPeriod) / c.drillingPeriod, 0, 1) : 1
    const dS = 5 * (1 - clamp(dDelta / 0.10, 0, 1))
    const cDelta = c.wellCompletionPeriod > 0 ? clamp((comp - c.wellCompletionPeriod) / c.wellCompletionPeriod, 0, 1) : 1
    const cS = 5 * (1 - clamp(cDelta / 0.10, 0, 1))
    return to2(moveS * 0.125 + dS * 0.625 + cS * 0.25)
  })()

  scores.value.productionRate = prodScore
  scores.value.nonProductionRate = nonScore
  scores.value.midCompletion = midScore
  scores.value.drillingEfficiency = drillScore
  scores.value.trippingEfficiency = tripScore
  scores.value.contractUtilization = contractScore

  scoresTable.value = [
    { name: '生产时间达成率', score: scores.value.productionRate, formula: 'score = 5 × (1 − |实际−合同|/合同)，范围[0,5]' },
    { name: '非生产时效控制率', score: scores.value.nonProductionRate, formula: 'score = 0.35×线性(非生产/周期≤2%) + 0.65×线性(非生产/合同≤100%)' },
    { name: '中完时间达成率', score: scores.value.midCompletion, formula: '线性区间: 实际/合同 ∈ [60%,110%] 映射到 [5,0]' },
    { name: '纯钻时效', score: scores.value.drillingEfficiency, formula: '线性提升: 纯钻/钻井周期 ∈ [0,50%] 映射到 [0,5]' },
    { name: '起下钻时效', score: scores.value.trippingEfficiency, formula: '线性控制: 起下钻/进尺工作时间 ∈ [10%,30%] 映射到 [5,0]' },
    { name: '合同时间利用率', score: scores.value.contractUtilization, formula: '加权线性: 搬家≤60%优，钻井/完井超合同10%线性扣分' }
  ]
  overallScore.value = Number(((scores.value.productionRate + scores.value.nonProductionRate + scores.value.midCompletion + scores.value.drillingEfficiency + scores.value.trippingEfficiency + scores.value.contractUtilization) / 6).toFixed(2))
  updateEvaluation()
  render()
}
function progressColor(s: number) {
  if (s >= 4.5) return '#10b981'
  if (s >= 3.5) return '#22c55e'
  if (s >= 2.5) return '#f59e0b'
  if (s >= 1.5) return '#f97316'
  return '#ef4444'
}
// 追加：项目评价文案生成
function updateEvaluation() {
  const s = overallScore.value
  if (s >= 4.5) {
    evaluationTitle.value = '优秀+'
    evaluationText.value = '项目管理水平非常高，整体运营效率达到巅峰状态。生产时间控制精准，非生产时间极小，关键作业效率卓越，合同时间利用率最优。项目成为行业标杆，经济效益最大化。'
  } else if (s >= 3.5) {
    evaluationTitle.value = '优秀'
    evaluationText.value = '项目管理表现优秀，大部分管理维度达到行业领先水平，但可能有个别维度未领先于行业平均。项目运营高效，仍有细节优化空间。'
  } else if (s >= 2.5) {
    evaluationTitle.value = '良好+'
    evaluationText.value = '项目管理表现良好，但距离优秀有差距。非生产时间控制或合同利用率可能表现一般。项目运营稳定，效率提升潜力大。'
  } else if (s >= 1.5) {
    evaluationTitle.value = '良好'
    evaluationText.value = '项目管理基本合格，存在生产时间偏差、非生产时间超支或关键作业效率低下等问题。项目存在运营风险，需系统性改进。'
  } else if (s >= 0.5) {
    evaluationTitle.value = '一般'
    evaluationText.value = '项目管理较差，可能存在生产时间严重超支、非生产时间失控、关键作业效率低下。运营效率低，经济效益受损。'
  } else {
    evaluationTitle.value = '不合格'
    evaluationText.value = '项目管理极差，严重偏离合同要求，运营效率极低，可能面临重大损失或违约风险。'
  }
}
onMounted(async () => {
  await loadProjects()
  await loadWells()
  await load()
  window.addEventListener('resize', () => chart && chart.resize())
  window.addEventListener('resize', () => barChart && barChart.resize())
  window.addEventListener('resize', () => cyclePieChart && cyclePieChart.resize())
  window.addEventListener('resize', () => effPieChart && effPieChart.resize())
  updateUploadUrl()
  try { await loadHtml2Pdf(); html2pdfReady.value = true } catch {}
})

const taskRows = ref<any[]>([])
async function loadCycleDetail() {
  if (!projectId.value || !cycle.value) { taskRows.value = []; taskDetail.value = null; return }
  const from = Array.isArray(dateRange.value) && dateRange.value[0] ? formatDate(dateRange.value[0]) : undefined
  const to = Array.isArray(dateRange.value) && dateRange.value[1] ? formatDate(dateRange.value[1]) : undefined
  const d = await getProgressCycleDetail({ projectId: projectId.value, cycleType: cycle.value as any, from, to, wellNumber: wellNumber.value || undefined })
  taskDetail.value = d
  taskRows.value = d?.breakdown || []
}
watch(cycle, async () => { await load(); calculate() })

function renderBar() {
  if (!barRef.value) return
  if (!barChart) barChart = echarts.init(barRef.value)
  const cats = breakdown.value.categories || []
  const prodArr = breakdown.value.production || []
  const nonArr = breakdown.value.nonProduction || []
  const totalArr = cats.map((_, i) => Number((Number(prodArr[i] || 0) + Number(nonArr[i] || 0)).toFixed(2)))
  const option = {
    color: ['#2f88ff'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params: any) => {
      const p = Array.isArray(params) ? params[0] : params
      return `${p.axisValueLabel}<br/>小时数: ${p.value}h`
    } },
    grid: { top: 30, left: 40, right: 20, bottom: 30 },
    xAxis: { type: 'category', data: cats, axisLine: { lineStyle: { color: '#94a3b8' } }, axisTick: { show: false }, axisLabel: { color: '#334155' } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#e2e8f0' } }, axisLabel: { color: '#334155' } },
    series: [
      { name: '小时(h)', type: 'bar', data: totalArr, label: { show: true, position: 'top' }, itemStyle: { color: '#2f88ff', borderRadius: [6,6,0,0] } }
    ]
  }
  barChart.setOption(option)
}
async function exportPDF() {
  try {
    chart && chart.resize()
    barChart && barChart.resize()
    cyclePieChart && cyclePieChart.resize()
    effPieChart && effPieChart.resize()
    planBarChart && planBarChart.resize()
    const content = document.querySelector('.page-card') as HTMLElement
    if (!content) throw new Error('未找到导出容器')
    if (!html2pdfReady.value) await loadHtml2Pdf()
    const mmPerPx = 0.264583
    const wmm = content.scrollWidth * mmPerPx
    const hmm = content.scrollHeight * mmPerPx
    const opt = {
      margin: 0,
      filename: '进度仪表盘.pdf',
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      pagebreak: { mode: 'none' },
      jsPDF: { unit: 'mm', format: [wmm, hmm] }
    } as any
    const tb = document.querySelector('.toolbar') as HTMLElement
    const prev = tb ? tb.style.display : ''
    if (tb) tb.style.display = 'none'
    ;(window as any).html2pdf().set(opt).from(content).save().then(() => { if (tb) tb.style.display = prev })
  } catch (e) {
    ElMessage.error('导出PDF失败，已尝试使用浏览器打印')
    window.print()
  }
}

function loadHtml2Pdf() {
  return new Promise<void>((resolve) => {
    if ((window as any).html2pdf) return resolve()
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js'
    s.onload = () => resolve()
    document.body.appendChild(s)
  })
}
function renderCyclePie() {
  if (!cyclePieRef.value) return
  if (cyclePieChart && cyclePieRef.value && (cyclePieChart as any).getDom && (cyclePieChart as any).getDom() !== cyclePieRef.value) { cyclePieChart.dispose(); cyclePieChart = null }
  if (!cyclePieChart) cyclePieChart = echarts.init(cyclePieRef.value)
  const d = data.value || {}
  const mv = Number(d.movingCycleTime || 0)
  const dv = Number(d.drillingCycleTime || 0)
  const cv = Number(d.completionCycleTime || 0)
  const tv = Number(d.testingCycleTime || 0)
  const option = {
    color: ['#00c9a7', '#2f88ff', '#a566ff', '#ff8a00'],
    tooltip: { trigger: 'item', formatter: '{b}: {c}h ({d}%)' },
    legend: { top: 0 },
    series: [{ type: 'pie', radius: ['40%', '65%'], data: [
      { name: '搬安周期', value: mv },
      { name: '钻井周期', value: dv },
      { name: '完井周期', value: cv },
      { name: '测试周期', value: tv }
    ], label: { color: '#334155' } }]
  }
  cyclePieChart.setOption(option)
}
function renderEffPie() {
  if (!effPieRef.value) return
  if (effPieChart && effPieRef.value && (effPieChart as any).getDom && (effPieChart as any).getDom() !== effPieRef.value) { effPieChart.dispose(); effPieChart = null }
  if (!effPieChart) effPieChart = echarts.init(effPieRef.value)
  const d = data.value || {}
  const prod = Number(d.drillingProductionTime || 0)
  const non = Number(d.drillingNonProductionTime || 0)
  const option = {
    color: ['#2f88ff', '#ff4d4f'],
    tooltip: { trigger: 'item', formatter: '{b}: {c}h ({d}%)' },
    legend: { top: 0 },
    series: [{ type: 'pie', radius: ['40%', '65%'], data: [
      { name: '生产时间', value: prod },
      { name: '非生产时间', value: non }
    ], label: { color: '#334155' } }]
  }
  effPieChart.setOption(option)
}

const breakdown = ref<any>({ categories: [], production: [], nonProduction: [] })
const stacked = ref<boolean>(false)
function formatDate(d: any) {
  const dt = new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const da = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}
const uploadUrl = ref('')
const planUploadUrl = ref('')
const contractUploadUrl = ref('')
function updateUploadUrl() {
  uploadUrl.value = `/api/dashboard/progress/import?projectId=${projectId.value || ''}`
  planUploadUrl.value = `/api/dashboard/progress/plan/import?projectId=${projectId.value || ''}`
  contractUploadUrl.value = `/api/dashboard/progress/contract/import?projectId=${projectId.value || ''}`
}
watch(projectId, async () => { updateUploadUrl(); await loadWells(); await load() })
watch(wellNumber, async () => { await load() })
watch(dateRange, async () => { await load() })
function onImportSuccess(res: any) {
  if (res?.ok) {
    ElMessage.success(`导入成功：${res.count} 条`)
    load()
  } else {
    ElMessage.error(res?.error || '导入失败')
  }
}
function onImportError() {
  ElMessage.error('导入失败，请检查文件格式或列顺序')
}
function onPlanImportSuccess(res: any) {
  if (res?.ok) {
    ElMessage.success(`计划导入成功：${res.count} 条`)
    load()
  } else {
    ElMessage.error(res?.error || '计划导入失败')
  }
}
function onPlanImportError() {
  ElMessage.error('计划导入失败，请检查文件格式或列顺序')
}
function onContractImportSuccess(res: any) {
  if (res?.ok) {
    ElMessage.success(`合同指标导入成功：${res.count} 条`)
    load()
  } else {
    ElMessage.error(res?.error || '合同指标导入失败')
  }
}
function onContractImportError() {
  ElMessage.error('合同指标导入失败，请检查文件格式或列顺序')
}
async function loadCycleBreakdown() {
  if (!projectId.value || !cycle.value) { breakdown.value = { categories: [], production: [], nonProduction: [] }; return }
  const from = Array.isArray(dateRange.value) && dateRange.value[0] ? formatDate(dateRange.value[0]) : undefined
  const to = Array.isArray(dateRange.value) && dateRange.value[1] ? formatDate(dateRange.value[1]) : undefined
  const d = await getProgressCycleBreakdown({ projectId: projectId.value, cycleType: cycle.value as any, from, to, wellNumber: wellNumber.value || undefined })
  cycleBreakAll.value = d || null
  const part = d?.byLevel3
  breakdown.value = part || { categories: [], production: [], nonProduction: [] }
}

function renderLevel2Pie() {
  if (!level2PieRef.value) return
  if (!level2PieChart) level2PieChart = echarts.init(level2PieRef.value)
  const d = cycleBreakAll.value || null
  const cats = d?.byLevel2?.categories || []
  const prodArr = d?.byLevel2?.production || []
  const nonArr = d?.byLevel2?.nonProduction || []
  const dataArr = cats.map((c: string, i: number) => ({ name: c, value: Number((Number(prodArr[i] || 0) + Number(nonArr[i] || 0)).toFixed(2)) }))
  const option = {
    color: ['#2f88ff', '#00c9a7', '#ff8a00', '#a566ff', '#ff4d4f', '#6c63ff', '#94a3b8'],
    tooltip: { trigger: 'item', formatter: '{b}: {c}h ({d}%)' },
    legend: { top: 0 },
    series: [{ type: 'pie', radius: ['40%', '65%'], data: dataArr, label: { color: '#334155' } }]
  }
  level2PieChart.setOption(option)
}

const planRows = ref<any[]>([])
async function loadPlanCompare() {
  if (!projectId.value) { planRows.value = []; renderPlanBar([], []); return }
  const from = Array.isArray(dateRange.value) && dateRange.value[0] ? formatDate(dateRange.value[0]) : undefined
  const to = Array.isArray(dateRange.value) && dateRange.value[1] ? formatDate(dateRange.value[1]) : undefined
  const d = await getProgressPlanCompare({ projectId: projectId.value, wellNumber: wellNumber.value || undefined, from, to })
  planRows.value = d?.rows || []
  renderPlanBar(d?.chart?.categories || [], d?.chart?.planValues || [], d?.chart?.actualValues || [])
}
function renderPlanBar(cats: string[] = [], planVals: number[] = [], actualVals: number[] = []) {
  if (!planBarRef.value) return
  if (!planBarChart) planBarChart = echarts.init(planBarRef.value)
  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params: any) => {
      const lines = params.map((p: any) => `${p.seriesName}: ${p.value} d`)
      return `${params[0]?.axisValueLabel || ''}<br/>` + lines.join('<br/>')
    } },
    legend: { data: ['计划(d)', '实际(d)'], top: 0, textStyle: { color: '#334155' } },
    grid: { top: 30, left: 40, right: 20, bottom: 60 },
    dataZoom: [{ type: 'slider', start: 0, end: 100 }],
    xAxis: { type: 'category', data: cats, axisLabel: { rotate: 24, interval: 0, color: '#334155', fontSize: 12 }, axisLine: { lineStyle: { color: '#94a3b8' } }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#e2e8f0' } }, axisLabel: { color: '#334155' } },
    series: [
      { name: '计划(d)', type: 'bar', data: planVals, barWidth: 24, label: { show: true, position: 'top', formatter: (p: any) => p.value }, itemStyle: { color: '#2f88ff', borderRadius: [6,6,0,0] }, emphasis: { focus: 'series' } },
      { name: '实际(d)', type: 'bar', data: actualVals, barWidth: 24, label: { show: true, position: 'top', formatter: (p: any) => p.value }, itemStyle: { color: '#ff8a00', borderRadius: [6,6,0,0] }, emphasis: { focus: 'series' } }
    ]
  }
  planBarChart.setOption(option)
}
</script>

<style scoped>
.page-card { max-width: 1100px; margin: 0 auto; }
.toolbar { margin-bottom: 12px; display: flex; align-items: center; }
.ml8 { margin-left: 8px; }
.sub-title { font-weight: 600; margin-bottom: 8px; }
.radar { width: 100%; height: 360px; }
.bar { width: 100%; height: 360px; }
.dim-bar { display: flex; justify-content: flex-end; margin-bottom: 8px; }
.mt12 { margin-top: 12px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 8px; }
.overall { margin-top: 12px; font-weight: 600; }
.overall-score { color: var(--brand, #2f88ff); }
 .eval-text { margin-top: 6px; color: var(--text-muted, #666); line-height: 1.6; }
.eval-standards { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px; }
.pie { width: 100%; height: 300px; }
.icon-btn { display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:8px; background:#f1f5f9; border:1px solid #e2e8f0; transition:all .2s; }
.icon-btn:hover { background:#e2e8f0; }
.icon { width:18px; height:18px; fill:#334155; }
.el-card { border-radius: var(--radius, 12px); box-shadow: var(--shadow, 0 8px 28px rgba(15,23,42,0.08)); background: var(--card-bg, #fff); }
.page-card { border-radius:16px; background: var(--card-bg, #fff); }
.form-grid :deep(.el-input-number) { width: 100%; }
.form-grid :deep(.el-form-item__label) { white-space: normal; line-height: 1.4; }
.form-grid :deep(.el-form-item) { align-items: flex-start; }
@media print {
  @page { size: A3 landscape; margin: 10mm; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .toolbar { display: none !important; }
  .page-card { box-shadow: none; margin: 0; max-width: none; padding: 0; }
  .el-row { display: block !important; }
  .el-col { width: 100% !important; }
  .el-card { break-inside: avoid; page-break-inside: avoid; margin-bottom: 6mm; }
  .radar, .bar { height: 110mm !important; break-inside: avoid; page-break-inside: avoid; }
  .pie { height: 90mm !important; break-inside: avoid; page-break-inside: avoid; }
  .el-table { break-inside: avoid; page-break-inside: avoid; }
}
.metric-list { display: flex; flex-direction: column; gap: 12px; }
.metric-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
.metric-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.metric-name { font-weight:600; color:#0f172a; }
.metric-score { font-weight:700; color:#334155; }
.metric-formula { margin-top:8px; color:#475569; font-size:12px; }
</style>