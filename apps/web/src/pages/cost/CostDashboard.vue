<template>
  <el-card shadow="never" class="page-card">
    <template #header><div class="card-header">成本仪表盘</div></template>
    <div class="toolbar">
      <el-select v-model="projectId" placeholder="选择项目" filterable style="width:300px" @change="onProjectChange">
        <el-option v-for="p in projects" :key="p.id" :label="p.contractNo" :value="p.id" />
      </el-select>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" class="ml8" />
      <el-select v-model="taskName" placeholder="选择任务（关联井号）" clearable class="ml8" style="width:240px" :disabled="!wellNumber" @change="load">
        <el-option v-for="t in tasks" :key="t" :label="t" :value="t" />
      </el-select>
      <el-select v-model="wellNumber" placeholder="选择井号（必选）" clearable class="ml8" style="width:200px" @change="onWellChange">
        <el-option v-for="w in wellNumbers" :key="w" :label="w" :value="w" />
      </el-select>
      <el-upload :action="uploadUrl" :show-file-list="false" :on-success="onImportSuccess" :on-error="onImportError" accept=".xlsx,.xls" class="ml8">
        <el-button type="success">导入成本</el-button>
      </el-upload>
      <el-tooltip content="下载成本模板" placement="top">
        <a class="icon-btn ml8" href="/api/dashboard/cost/template" download aria-label="下载成本模板">
          <svg class="icon" viewBox="0 0 24 24"><path d="M12 3a1 1 0 011 1v8.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L11 12.586V4a1 1 0 011-1zm-7 14a1 1 0 011-1h12a1 1 0 011 1v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2z"/></svg>
        </a>
      </el-tooltip>
      <el-upload :action="budgetUploadUrl" :show-file-list="false" :on-success="onBudgetImportSuccess" :on-error="onBudgetImportError" accept=".xlsx,.xls" class="ml8">
        <el-button>导入预算</el-button>
      </el-upload>
      <el-tooltip content="下载预算模板" placement="top">
        <a class="icon-btn ml8" href="/api/dashboard/cost/budget/template" download aria-label="下载预算模板">
          <svg class="icon" viewBox="0 0 24 24"><path d="M6 2a1 1 0 011-1h8a1 1 0 011 1v2h3a1 1 0 011 1v15a2 2 0 01-2 2H6a2 2 0 01-2-2V5a1 1 0 011-1h3V2zm2 3h8V2H8v3zm0 5h8v2H8V10zm0 4h8v2H8v-2z"/></svg>
        </a>
      </el-tooltip>
      <el-button type="primary" class="ml8" @click="exportPDF">导出PDF</el-button>
      <el-button class="ml8" @click="clearCosts">清空成本</el-button>
      <el-button class="ml8" @click="clearBudget">清空预算</el-button>
      <el-button type="danger" class="ml8" @click="clearAll">清空成本+预算</el-button>
    </div>
    <el-row :gutter="12" class="mt12">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">成本KPI看板</div>
          <div class="kpi-grid">
            <div class="kpi"><div class="kpi-title">项目总预算(BAC)</div><div class="kpi-value">{{ formatMoney(kpis.projectTotalBudget||0) }} {{ kpis.currency || currency }}</div></div>
            <div class="kpi"><div class="kpi-title">任务总预算</div><div class="kpi-value">{{ formatMoney(kpis.taskTotalBudget||0) }} {{ kpis.currency || currency }}</div></div>
            <div class="kpi"><div class="kpi-title">项目剩余预算</div><div class="kpi-value">{{ formatMoney(kpis.projectRemainingBudget||0) }} {{ kpis.currency || currency }}</div></div>
            <div class="kpi"><div class="kpi-title">项目总收入</div><div class="kpi-value">{{ formatMoney(kpis.projectTotalRevenue||0) }} {{ kpis.currency || currency }}</div></div>
            <div class="kpi"><div class="kpi-title">实际成本(AC)</div><div class="kpi-value">{{ formatMoney(kpis.AC||0) }} {{ kpis.currency || currency }}</div></div>
            <div class="kpi" :class="cpiClass"><div class="kpi-title">成本绩效指数(CPI)</div><div class="kpi-value">{{ (kpis.CPI||0).toFixed(2) }}</div></div>
            <div class="kpi"><div class="kpi-title">成本偏差(CV=BAC-AC)</div><div class="kpi-value">{{ formatMoney(kpis.CV) }} {{ kpis.currency || currency }}</div></div>
            <div class="kpi"><div class="kpi-title">完工尚需估算(ETC)</div><div class="kpi-value">{{ formatMoney(kpis.ETC) }} {{ kpis.currency || currency }}</div></div>
            <div class="kpi"><div class="kpi-title">完工总估算(EAC)</div><div class="kpi-value">{{ formatMoney(kpis.EAC) }} {{ kpis.currency || currency }}</div></div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12" class="mt12">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">公式明细</div>
          <div class="formula-list">
            <div class="formula-item">
              <span class="formula-name">项目EV</span>
              <span class="formula-text">= 收入合计价值工作量 = {{ formatMoney(kpis.EV) }} {{ kpis.currency || currency }}</span>
            </div>
            <div class="formula-item">
              <span class="formula-name">项目AC</span>
              <span class="formula-text">= 项目总成本 = {{ formatMoney(kpis.AC) }} {{ kpis.currency || currency }}</span>
            </div>
            <div class="formula-item">
              <span class="formula-name">项目CPI</span>
              <span class="formula-text">= EV / AC = {{ formatMoney(kpis.EV) }} / {{ formatMoney(kpis.AC) }} = {{ (kpis.CPI||0).toFixed(2) }}</span>
            </div>
            <div class="formula-item">
              <span class="formula-name">项目CV</span>
              <span class="formula-text">= BAC − AC = {{ formatMoney(kpis.projectTotalBudget) }} − {{ formatMoney(kpis.AC) }} = {{ formatMoney(kpis.CV) }} {{ kpis.currency || currency }}</span>
            </div>
            <div class="formula-item">
              <span class="formula-name">项目ETC</span>
              <span class="formula-text">= (BAC − EV) / CPI = ({{ formatMoney(kpis.projectTotalBudget) }} − {{ formatMoney(kpis.EV) }}) / {{ (kpis.CPI||0).toFixed(2) }} = {{ formatMoney(kpis.ETC) }} {{ kpis.currency || currency }}</span>
            </div>
            <div class="formula-item">
              <span class="formula-name">项目EAC</span>
              <span class="formula-text">= BAC / CPI = {{ formatMoney(kpis.projectTotalBudget) }} / {{ (kpis.CPI||0).toFixed(2) }} = {{ formatMoney(kpis.EAC) }} {{ kpis.currency || currency }}</span>
            </div>
            <div class="formula-item">
              <span class="formula-name">项目利润率</span>
              <span class="formula-text">= (项目总收入 − 项目AC) / 项目总收入 × 100 = ({{ formatMoney(kpis.projectTotalRevenue) }} − {{ formatMoney(kpis.AC) }}) / {{ formatMoney(kpis.projectTotalRevenue) }} × 100 = {{ (((Number(kpis.projectTotalRevenue||0) - Number(kpis.AC||0)) / Number(kpis.projectTotalRevenue||1)) * 100).toFixed(2) }}%</span>
            </div>
            <div class="formula-item">
              <span class="formula-name">范围利润率</span>
              <span class="formula-text">= (范围收入 − 范围AC) / 范围收入 × 100 = ({{ formatMoney(kpis.scopeRevenue||0) }} − {{ formatMoney(kpis.scopeAC||0) }}) / {{ formatMoney(kpis.scopeRevenue||0) }} × 100 = {{ (Number(kpis.scopeRevenue||0) > 0 ? (((Number(kpis.scopeRevenue||0) - Number(kpis.scopeAC||0)) / Number(kpis.scopeRevenue||1)) * 100).toFixed(2) : '0.00') }}%</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12">
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">成本六维雷达图</div>
          <div ref="radarRef" class="pie"></div>
          <div v-if="radarError" class="radar-error">{{ radarError }}</div>
          <div class="mt12 eval-card">
            <div class="eval-header">
              <div class="sub-title">任务综合评价</div>
              <span class="rating-badge">{{ evaluationTitle }}</span>
            </div>
            <div class="overall-line">
              <div class="overall-label">综合得分</div>
              <div class="overall-score-big">{{ overallScore.toFixed(2) }}</div>
            </div>
            <div class="eval-body">
              <div class="eval-title">{{ evaluationTitle }}</div>
              <div class="eval-text">{{ evaluationText }}</div>
            </div>
            <div class="eval-standards">
              <el-tag size="small" type="success">优秀+：≥ 4.5</el-tag>
              <el-tag size="small" type="success" effect="plain">优秀：≥ 3.5</el-tag>
              <el-tag size="small" type="warning">良好+：≥ 2.5</el-tag>
              <el-tag size="small" type="warning" effect="plain">良好：≥ 1.5</el-tag>
              <el-tag size="small" type="info">一般：≥ 0.5</el-tag>
              <el-tag size="small" type="danger">不合格：< 0.5</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">评分明细</div>
          <div class="metric-list">
            <div class="metric-item" v-for="m in metricRows" :key="m.name">
              <div class="metric-head">
                <span class="metric-name">{{ m.name }}</span>
                <span class="metric-score">{{ Number(m.score || 0).toFixed(2) }}/5</span>
              </div>
              <el-progress :percentage="Math.round((Number(m.score || 0) / 5) * 100)" :stroke-width="12" :color="progressColor(Number(m.score || 0))" />
              <div class="metric-formula">{{ m.formula }}</div>
            </div>
          </div>
        </el-card>
        <el-card shadow="hover" class="mt12">
          <div class="sub-title">度量明细</div>
          <el-table :data="metricDetailRows" size="small" border>
            <el-table-column prop="name" label="维度" />
            <el-table-column prop="budget" label="预算" />
            <el-table-column prop="actual" label="实际" />
            <el-table-column prop="delta" label="差额" />
            <el-table-column prop="rate" label="达成率(%)" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12" class="mt12">
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">项目总体成本分类分布</div>
          <div ref="pieRef" class="pie"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">{{ donutTitle }}</div>
          <div ref="donutRef" class="donut"></div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12" class="mt12">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">成本列表（按井号汇总）</div>
          <el-table :data="aggRows" size="small" border @row-click="onRowClick">
            <el-table-column prop="wellNumber" label="井号" />
            <el-table-column label="总成本">
              <template #default="{ row }">{{ formatMoney(row.totalCost) }} {{ currency }}</template>
            </el-table-column>
          </el-table>
          <div class="overall">合计：<span class="overall-score">{{ formatMoney(total) }} {{ currency }}</span></div>
        </el-card>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProjects } from '../../services/api'
function formatMoney(v: any) { const num = Number(v || 0); return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) }

const projects = ref<any[]>([])
const projectId = ref<number>()
const dateRange = ref<any>(null)
const uploadUrl = ref('')
const budgetUploadUrl = ref('')
const rows = ref<any[]>([])
const aggRows = ref<any[]>([])
const total = ref(0)
const pieRef = ref<HTMLDivElement | null>(null)
let pieChart: echarts.ECharts | null = null
const radarRef = ref<HTMLDivElement | null>(null)
let radarChart: echarts.ECharts | null = null
const donutRef = ref<HTMLDivElement | null>(null)
let donutChart: echarts.ECharts | null = null
const taskName = ref('')
const tasks = ref<string[]>([])
const wellNumber = ref('')
const wellNumbers = ref<string[]>([])
const plan = ref({ budgetLabor: 0, budgetMaterials: 0, budgetEquipment: 0, budgetServices: 0, taskBudget: 0 })
const kpis = ref<any>({})
const currency = ref('')
let radarError = ref('')
const radarScores = ref<any>(null)
const metricRows = ref<any[]>([])
const metricDetailRows = ref<any[]>([])
const overallScore = ref(0)
const evaluationTitle = ref('')
const evaluationText = ref('')

const donutTitle = computed(() => `${taskName.value ? taskName.value : '任务'}量级成本圆盘与利润率`)

async function loadProjects() {
  projects.value = await getProjects()
  if (projects.value.length && !projectId.value) projectId.value = projects.value[0].id
  updateUploadUrl()
  await loadTasks()
  await loadWells()
}
async function onProjectChange() {
  updateUploadUrl()
  await loadTasks()
  await loadWells()
  await load()
}
async function load() {
  if (!projectId.value) return
  const from = Array.isArray(dateRange.value) && dateRange.value[0] ? formatDate(dateRange.value[0]) : undefined
  const to = Array.isArray(dateRange.value) && dateRange.value[1] ? formatDate(dateRange.value[1]) : undefined
  const u = new URL('/api/dashboard/cost/summary', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  if (from) u.searchParams.set('from', from)
  if (to) u.searchParams.set('to', to)
  if (taskName.value) u.searchParams.set('taskName', taskName.value)
  if (wellNumber.value) u.searchParams.set('wellNumber', wellNumber.value)
  const res = await fetch(u.toString())
  const data = await res.json()
  rows.value = data.rows || []
  total.value = data.total || 0
  currency.value = data.currency || ''
  const m = new Map<string, number>()
  for (const r of rows.value) {
    const w = r.wellNumber || ''
    if (!w) continue
    m.set(w, (m.get(w) || 0) + Number(r.totalCost || 0))
  }
  aggRows.value = Array.from(m.entries()).map(([wellNumber, totalCost]) => ({ wellNumber, totalCost }))
  await loadKpis()
  renderPie(data.chart?.categories || [], data.chart?.values || [])
  await loadRadar()
}
async function loadTasks() {
  if (!projectId.value) { tasks.value = []; return }
  const u = new URL('/api/dashboard/cost/tasks', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  if (wellNumber.value) u.searchParams.set('wellNumber', wellNumber.value)
  const res = await fetch(u.toString())
  tasks.value = await res.json()
}
function onWellChange() {
  taskName.value = ''
  loadTasks()
  load()
}
async function loadWells() {
  if (!projectId.value) { wellNumbers.value = []; return }
  const u = new URL('/api/dashboard/cost/wells', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  const res = await fetch(u.toString())
  wellNumbers.value = await res.json()
}
async function loadKpis() {
  const u = new URL('/api/dashboard/cost/kpis', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  if (taskName.value) u.searchParams.set('taskName', taskName.value)
  if (wellNumber.value) u.searchParams.set('wellNumber', wellNumber.value)
  const res = await fetch(u.toString())
  kpis.value = await res.json()
}
async function loadRadar() {
  const u = new URL('/api/dashboard/cost/sixRadar', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  if (taskName.value) u.searchParams.set('taskName', taskName.value)
  if (wellNumber.value) u.searchParams.set('wellNumber', wellNumber.value)
  const res = await fetch(u.toString())
  const d = await res.json()
  if (!d?.ok) {
    radarError.value = Array.isArray(d?.missing) ? `六维图缺少数据：${d.missing.join('、')}` : '六维图数据不足'
    return
  }
  radarError.value = ''
  renderRadar([d.scores.materials, d.scores.labor, d.scores.equipment, d.scores.services, d.scores.taskTotal, d.scores.indirectRatio])
  radarScores.value = d.scores
  metricRows.value = [
    { name: '材料成本控制率', score: Number(d.scores.materials || 0), formula: '单项成本控制率：(预算 − 实际) / 预算 × 100' },
    { name: '人工成本控制率', score: Number(d.scores.labor || 0), formula: '单项成本控制率：(预算 − 实际) / 预算 × 100' },
    { name: '设备成本控制率', score: Number(d.scores.equipment || 0), formula: '单项成本控制率：(预算 − 实际) / 预算 × 100' },
    { name: '服务成本控制率', score: Number(d.scores.services || 0), formula: '单项成本控制率：(预算 − 实际) / 预算 × 100' },
    { name: '任务总成本控制率', score: Number(d.scores.taskTotal || 0), formula: '任务总成本 / 任务总预算 × 100' },
    { name: '间接成本占比', score: Number(d.scores.indirectRatio || 0), formula: '间接成本 / 直接成本 × 100' }
  ]
  overallScore.value = Number(d.overall || 0)
  updateEvaluation()
  const det = d.details || {}
  const f2 = (n: number) => formatMoney(n || 0)
  const rate = (b: number, a: number) => b > 0 ? (((b - a) / b) * 100).toFixed(2) : '0.00'
  const ratio = (a: number, b: number) => b > 0 ? ((a / b) * 100).toFixed(2) : '0.00'
  metricDetailRows.value = [
    { name: '材料', budget: f2(det.budgetMaterials), actual: f2(det.materials), delta: f2(Number(det.budgetMaterials || 0) - Number(det.materials || 0)), rate: rate(Number(det.budgetMaterials || 0), Number(det.materials || 0)) },
    { name: '人工', budget: f2(det.budgetLabor), actual: f2(det.labor), delta: f2(Number(det.budgetLabor || 0) - Number(det.labor || 0)), rate: rate(Number(det.budgetLabor || 0), Number(det.labor || 0)) },
    { name: '设备', budget: f2(det.budgetEquipment), actual: f2(det.equipment), delta: f2(Number(det.budgetEquipment || 0) - Number(det.equipment || 0)), rate: rate(Number(det.budgetEquipment || 0), Number(det.equipment || 0)) },
    { name: '服务', budget: f2(det.budgetServices), actual: f2(det.services), delta: f2(Number(det.budgetServices || 0) - Number(det.services || 0)), rate: rate(Number(det.budgetServices || 0), Number(det.services || 0)) },
    { name: '任务总计', budget: f2(det.taskBudgetSum), actual: f2(det.taskTotal), delta: f2(Number(det.taskBudgetSum || 0) - Number(det.taskTotal || 0)), rate: Number(det.taskBudgetSum || 0) > 0 ? ((Number(det.taskTotal || 0) / Number(det.taskBudgetSum || 0)) * 100).toFixed(2) : '0.00' },
    { name: '间接/直接', budget: f2(det.direct), actual: f2(det.indirect), delta: f2(Number(det.direct || 0) - Number(det.indirect || 0)), rate: ratio(Number(det.indirect || 0), Number(det.direct || 0)) }
  ]
  renderDonut(det)
}
function progressColor(s: number) {
  if (s >= 4.5) return '#10b981'
  if (s >= 3.5) return '#22c55e'
  if (s >= 2.5) return '#f59e0b'
  if (s >= 1.5) return '#f97316'
  return '#ef4444'
}
function updateEvaluation() {
  const s = overallScore.value
  if (s >= 4.5) { evaluationTitle.value = '优秀+'; evaluationText.value = '成本控制极佳，预算执行优异，间接成本占比合理。' }
  else if (s >= 3.5) { evaluationTitle.value = '优秀'; evaluationText.value = '成本管理表现优秀，个别维度仍有优化空间。' }
  else if (s >= 2.5) { evaluationTitle.value = '良好+'; evaluationText.value = '成本控制总体良好，预算与实际存在差距。' }
  else if (s >= 1.5) { evaluationTitle.value = '良好'; evaluationText.value = '成本控制基本合格，需关注关键成本项的偏差。' }
  else if (s >= 0.5) { evaluationTitle.value = '一般'; evaluationText.value = '成本偏差较大，需尽快采取管控措施。' }
  else { evaluationTitle.value = '不合格'; evaluationText.value = '成本管理失控，预算执行严重偏离，需全面整改。' }
}
function onRowClick(row: any) { if (row?.wellNumber) { wellNumber.value = row.wellNumber; onWellChange() } }
async function analyze() {
  if (!projectId.value || !taskName.value) { ElMessage.warning('请先选择任务'); return }
  const u = new URL('/api/dashboard/cost/sixRadar', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  u.searchParams.set('taskName', taskName.value)
  const res = await fetch(u.toString())
  const d = await res.json()
  renderRadar([d.scores.materials, d.scores.labor, d.scores.equipment, d.scores.services, d.scores.taskTotal, d.scores.indirectRatio])
}
function renderRadar(vals: number[] = []) {
  if (!radarRef.value) return
  if (!radarChart) radarChart = echarts.init(radarRef.value)
  const labels = ['材料控制', '人工控制', '设备控制', '服务控制', '任务总成本控制', '间接成本占比']
  const target = [3.5, 3.5, 3.5, 3.5, 3.5, 3.5]
  radarChart.setOption({
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: 'rgba(17,24,39,0.88)',
      borderColor: 'transparent',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const v: number[] = Array.isArray(params.value) ? params.value : []
        return labels.map((l, i) => `${l}: ${Number(v[i] || 0).toFixed(2)}`).join('<br/>')
      }
    },
    radar: {
      shape: 'circle',
      radius: '70%',
      splitNumber: 5,
      indicator: labels.map(l => ({ name: l, max: 5 })),
      axisName: { color: '#0f172a', fontSize: 12, lineHeight: 16 },
      axisLine: { lineStyle: { color: 'rgba(15,23,42,0.18)' } },
      splitLine: { lineStyle: { color: ['rgba(79,142,247,0.30)'], width: 1 } },
      splitArea: {
        areaStyle: {
          color: ['#f8fafc', '#f2f6fb', '#edf2f7', '#e9eef5', '#e5ebf3']
        }
      }
    },
    series: [
      {
        type: 'radar',
        name: '实际评分',
        data: [{ value: vals }],
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2, color: '#4F8EF7' },
        itemStyle: { color: '#4F8EF7', shadowColor: 'rgba(79,142,247,0.45)', shadowBlur: 10 },
        areaStyle: {
          color: new (echarts as any).graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(138,180,255,0.55)' },
            { offset: 1, color: 'rgba(79,142,247,0.20)' }
          ])
        },
        emphasis: { lineStyle: { width: 3 } },
        animationDuration: 600
      },
      {
        type: 'radar',
        name: '目标阈值',
        data: [{ value: target }],
        lineStyle: { type: 'dashed', color: '#94a3b8', width: 1 },
        itemStyle: { color: '#94a3b8' },
        areaStyle: { color: 'transparent' },
        symbol: 'none',
        animationDuration: 300
      }
    ]
  })
}
function renderPie(cats: string[] = [], vals: number[] = []) {
  if (!pieRef.value) return
  if (!pieChart) pieChart = echarts.init(pieRef.value)
  const seriesData = cats.map((c, i) => ({ name: c, value: vals[i] || 0 }))
  const revenue = Number(kpis.value?.projectTotalRevenue || 0)
  const cost = Number(kpis.value?.AC || 0)
  const marginRate = revenue > 0 ? (((revenue - cost) / revenue) * 100) : 0
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    graphic: [
      { type: 'text', left: 'center', top: '46%', style: { text: `${marginRate.toFixed(2)}%`, fill: '#0f172a', fontSize: 22, fontWeight: 700, textAlign: 'center' } },
      { type: 'text', left: 'center', top: '58%', style: { text: '利润率', fill: '#475569', fontSize: 12, fontWeight: 600, textAlign: 'center' } }
    ],
    series: [{
      type: 'pie', radius: ['40%', '65%'], data: seriesData,
      label: { formatter: '{b}\n{d}%', color: '#334155', fontSize: 12, fontWeight: 600 },
      labelLine: { length: 10, length2: 6, lineStyle: { color: '#94a3b8' } },
      itemStyle: { borderColor: '#fff', borderWidth: 2 }
    }]
  })
}
function renderDonut(det: any = {}) {
  if (!donutRef.value) return
  if (!donutChart) donutChart = echarts.init(donutRef.value)
  const inner = [
    { name: '直接成本', value: Number(det.direct || 0) },
    { name: '间接成本', value: Number(det.indirect || 0) }
  ]
  const outer = [
    { name: '材料', value: Number(det.materials || 0) },
    { name: '人工', value: Number(det.labor || 0) },
    { name: '设备', value: Number(det.equipment || 0) },
    { name: '服务', value: Number(det.services || 0) }
  ]
  const scopeRevenue = Number(kpis.value?.scopeRevenue ?? 0)
  const scopeAC = Number(kpis.value?.scopeAC ?? det.taskTotal ?? 0)
  const revenue = Number(kpis.value?.projectTotalRevenue || 0)
  const cost = Number(kpis.value?.AC || 0)
  const marginRate = (scopeRevenue > 0 ? (((scopeRevenue - scopeAC) / scopeRevenue) * 100) : (revenue > 0 ? (((revenue - cost) / revenue) * 100) : 0))
  donutChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    graphic: [
      { type: 'text', left: 'center', top: '46%', style: { text: `${marginRate.toFixed(2)}%`, textAlign: 'center', fill: '#0f172a', fontSize: 22, fontWeight: 700 } },
      { type: 'text', left: 'center', top: '58%', style: { text: '利润率', textAlign: 'center', fill: '#475569', fontSize: 12, fontWeight: 600 } }
    ],
    series: [
      {
        name: '一级',
        type: 'pie',
        radius: ['26%', '44%'],
        center: ['50%', '48%'],
        label: { position: 'inside', formatter: '{b}\n{d}%', color: '#334155', fontSize: 12, fontWeight: 600 },
        labelLine: { show: false },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        data: inner
      },
      {
        name: '二级',
        type: 'pie',
        radius: ['50%', '72%'],
        center: ['50%', '48%'],
        label: { formatter: '{b}\n{d}%', color: '#334155', fontSize: 12, fontWeight: 600 },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        data: outer
      }
    ],
    color: ['#60a5fa', '#c084fc', '#93c5fd', '#34d399', '#f59e0b', '#fb7185']
  })
}
function onImportSuccess(res: any) { if (res?.ok) { ElMessage.success(`导入成功：${res.count} 条`); load() } else { ElMessage.error(res?.error || '导入失败') } }
function onImportError() { ElMessage.error('导入失败，请检查模板与列顺序') }
function onBudgetImportSuccess(res: any) { if (res?.ok) { ElMessage.success(`预算导入成功：${res.count} 条`); load() } else { ElMessage.error(res?.error || '预算导入失败') } }
function onBudgetImportError() { ElMessage.error('预算导入失败，请检查模板与列顺序') }
function updateUploadUrl() { uploadUrl.value = `/api/dashboard/cost/import?projectId=${projectId.value || ''}`; budgetUploadUrl.value = `/api/dashboard/cost/budget/import?projectId=${projectId.value || ''}` }
function formatDate(d: any) { const dt = new Date(d); const y = dt.getFullYear(); const m = String(dt.getMonth()+1).padStart(2,'0'); const da = String(dt.getDate()).padStart(2,'0'); return `${y}-${m}-${da}` }
function exportPDF() { window.print() }
async function clearConfirm(msg: string) {
  try {
    await ElMessageBox.confirm(msg, '提示', { type: 'warning' })
    return true
  } catch { return false }
}
function buildClearUrl(path: string) {
  const u = new URL(path, window.location.origin)
  if (projectId.value) u.searchParams.set('projectId', String(projectId.value))
  return u.toString()
}
async function clearCosts() {
  const ok = await clearConfirm(projectId.value ? '确认清空当前项目的成本数据？' : '确认清空全部项目的成本数据？')
  if (!ok) return
  const url = buildClearUrl('/api/dashboard/cost/clear')
  const res = await fetch(url, { method: 'DELETE' })
  const d = await res.json()
  if (d?.ok) { ElMessage.success('已清空成本'); await load() } else { ElMessage.error(d?.error || '清空成本失败') }
}
async function clearBudget() {
  const ok = await clearConfirm(projectId.value ? '确认清空当前项目的预算数据？' : '确认清空全部项目的预算数据？')
  if (!ok) return
  const url = buildClearUrl('/api/dashboard/cost/budget/clear')
  const res = await fetch(url, { method: 'DELETE' })
  const d = await res.json()
  if (d?.ok) { ElMessage.success('已清空预算'); await load() } else { ElMessage.error(d?.error || '清空预算失败') }
}
async function clearAll() {
  const ok = await clearConfirm(projectId.value ? '确认清空当前项目的成本与预算数据？' : '确认清空全部项目的成本与预算数据？')
  if (!ok) return
  const url = buildClearUrl('/api/dashboard/cost/all/clear')
  const res = await fetch(url, { method: 'DELETE' })
  const d = await res.json()
  if (d?.ok) { ElMessage.success('已清空成本与预算'); await load() } else { ElMessage.error(d?.error || '清空失败') }
}
onMounted(async () => { await loadProjects(); await load() })
</script>

<style scoped>
.page-card { max-width: 1100px; margin: 0 auto; }
.toolbar { margin-bottom: 12px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.toolbar .el-select { min-width: 220px; }
.toolbar .el-date-editor { min-width: 280px; }
.ml8 { margin-left: 8px; }
.sub-title { font-weight: 600; margin-bottom: 8px; }
.pie { width: 100%; height: 360px; }
.donut { width: 100%; height: 360px; }
.icon-btn { display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:8px; background:#f1f5f9; border:1px solid #e2e8f0; transition:all .2s; }
.icon { width:18px; height:18px; fill:#334155; }
.overall { margin-top: 12px; font-weight: 600; }
.overall-score { color: #2f88ff; }
.radar-error { margin-top: 8px; color: #ff4d4f; }
.eval-title { margin-top: 6px; font-weight: 700; color: #0f172a; }
.eval-standards { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px; }
.eval-card { background: linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%); border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06); }
.eval-header { display: flex; align-items: center; justify-content: space-between; }
.rating-badge { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #e6f4ff; color: #1d4ed8; font-weight: 700; border: 1px solid #bfdbfe; }
.overall-line { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding: 10px 12px; border-radius: 12px; background: #ffffff; border: 1px solid #e2e8f0; }
.overall-label { color: #475569; font-weight: 600; }
.overall-score-big { font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px; }
.eval-body { margin-top: 8px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.18); }
.eval-text { margin-top: 4px; color: #475569; line-height: 1.7; }
.metric-notes { margin-top: 8px; color: #475569; font-size: 12px; line-height: 1.6; }
.metric-list { display: flex; flex-direction: column; gap: 12px; }
.metric-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
.metric-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.metric-name { font-weight:600; color:#0f172a; }
.metric-score { font-weight:700; color:#334155; }
.metric-formula { margin-top:8px; color:#475569; font-size:12px; }
.formula-list { display:flex; flex-direction:column; gap:8px; }
.formula-item { display:flex; gap:8px; align-items:center; font-size:13px; color:#334155; }
.formula-name { min-width:96px; font-weight:600; color:#0f172a; }
.mt12 { margin-top: 12px; }
.kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
.kpi-title { font-size: 12px; color: #475569; }
.kpi-value { font-size: 20px; font-weight: 700; color: #0f172a; }
.kpi.warning .kpi-value { color: #ff8a00; }
.kpi.danger .kpi-value { color: #ff4d4f; }
</style>