<template>
  <el-card shadow="never" class="page-card">
    <template #header><div class="card-header">收入仪表盘</div></template>
    <div class="toolbar">
      <el-select v-model="projectId" placeholder="选择项目" filterable style="width:300px" @change="load">
        <el-option v-for="p in projects" :key="p.id" :label="(p.name || p.contractNo)" :value="p.id" />
      </el-select>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" class="ml8" />
      <el-select v-model="wellNumber" placeholder="选择井号（必选）" clearable class="ml8" style="width:200px" @change="onWellChange">
        <el-option v-for="w in wells" :key="w" :label="w" :value="w" />
      </el-select>
      <el-select v-model="taskName" placeholder="选择任务名称（需先选井号）" clearable class="ml8" style="width:260px" :disabled="!wellNumber" @change="load">
        <el-option v-for="t in tasks" :key="t" :label="t" :value="t" />
      </el-select>
      <el-upload :action="uploadUrl" :show-file-list="false" :on-success="onImportSuccess" :on-error="onImportError" accept=".xlsx,.xls" class="ml8">
        <el-button type="success">导入收入</el-button>
      </el-upload>
      <el-tooltip content="下载收入模板" placement="top">
        <a class="icon-btn ml8" href="/api/dashboard/revenue/template" download aria-label="下载收入模板">
          <svg class="icon" viewBox="0 0 24 24"><path d="M12 3a1 1 0 011 1v8.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L11 12.586V4a1 1 0 011-1zm-7 14a1 1 0 011-1h12a1 1 0 011 1v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2z"/></svg>
        </a>
      </el-tooltip>
      <el-button type="primary" class="ml8" @click="exportPDF">导出PDF</el-button>
    </div>
    <el-row :gutter="12">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">项目总览</div>
          <div class="kanban">
            <div class="kanban-item">
              <div class="kanban-name">项目总收入</div>
              <div class="kanban-value">{{ formatMoney(projectTotal) }}</div>
            </div>
            <div class="kanban-item">
              <div class="kanban-name">项目利润率(%)</div>
              <div class="kanban-value">{{ Number(((projectCostTotal>0?((projectTotal - projectCostTotal)/projectCostTotal):0)*100).toFixed(2)) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12">
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">六维雷达图</div>
          <div ref="radarRef" class="radar"></div>
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
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">看板</div>
          <div class="kanban">
            <div class="kanban-item" v-for="k in kanban" :key="k.name">
              <div class="kanban-name">{{ k.name }}</div>
              <div class="kanban-value">{{ k.value }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12">
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">收入来源分布</div>
          <div ref="pieRef" class="pie"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">价值工作量圆盘</div>
          <div ref="workPieRef" class="pie"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" class="mt12">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">进度图</div>
          <div ref="progressRef" class="bar"></div>
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
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">收入列表</div>
          <el-table :data="rows" size="small" border>
            <el-table-column prop="source" label="来源" />
            <el-table-column prop="item" label="项目" />
            <el-table-column label="金额">
              <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
            </el-table-column>
            <el-table-column label="成本">
              <template #default="{ row }">{{ formatMoney(row.costTotal ?? row.taskCostUSD ?? 0) }}</template>
            </el-table-column>
            <el-table-column prop="date" label="日期" />
            <el-table-column prop="remark" label="备注" />
          </el-table>
          <div class="overall">合计：<span class="overall-score">{{ formatMoney(total) }}</span></div>
          <div class="overall">成本合计：<span class="overall-score">{{ formatMoney(aggCost) }}</span></div>
        </el-card>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getProjects } from '../../services/api'

const projects = ref<any[]>([])
const projectId = ref<number>()
const dateRange = ref<any>(null)
const uploadUrl = ref('')
const rows = ref<any[]>([])
const total = ref(0)
const pieRef = ref<HTMLDivElement | null>(null)
let pieChart: echarts.ECharts | null = null
const workPieRef = ref<HTMLDivElement | null>(null)
let workPieChart: echarts.ECharts | null = null
const progressRef = ref<HTMLDivElement | null>(null)
let progressChart: echarts.ECharts | null = null
const wells = ref<string[]>([])
const wellNumber = ref<string>('')
const tasks = ref<string[]>([])
const taskName = ref<string>('')
const radarRef = ref<HTMLDivElement | null>(null)
let radarChart: echarts.ECharts | null = null
const scores = ref({
  incomePlanRate: 0,
  workValuePlanRate: 0,
  confirmTimeDelta: 0,
  scheduleDeviationIndex: 0,
  cashIndex: 0,
  cashFlowIndex: 0
})
const scoresTable = ref<any[]>([])
const overallScore = ref(0)
const evaluationTitle = ref('')
const evaluationText = ref('')
const contractAmount = ref(0)
const kanban = ref<Array<{ name: string; value: string | number }>>([])
const openingReceivable = ref(0)
const metricsTable = ref<any[]>([])
const aggCost = ref(0)
const projectTotal = ref(0)
const projectCostTotal = ref(0)
const projectWorkValueTotal = ref(0)

async function loadProjects() {
  projects.value = await getProjects()
  if (projects.value.length && !projectId.value) projectId.value = projects.value[0].id
  const p = projects.value.find((x: any) => x.id === projectId.value)
  contractAmount.value = Number(p?.amountValue || 0)
  updateUploadUrl()
}
async function load() {
  if (!projectId.value) return
  const from = Array.isArray(dateRange.value) && dateRange.value[0] ? formatDate(dateRange.value[0]) : undefined
  const to = Array.isArray(dateRange.value) && dateRange.value[1] ? formatDate(dateRange.value[1]) : undefined
  const u = new URL('/api/dashboard/revenue/summary', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  if (from) u.searchParams.set('from', from)
  if (to) u.searchParams.set('to', to)
  if (wellNumber.value) u.searchParams.set('wellNumber', wellNumber.value)
  if (taskName.value) u.searchParams.set('taskName', taskName.value)
  const res = await fetch(u.toString())
  const data = await res.json()
  rows.value = data.rows || []
  total.value = data.total || 0
  aggCost.value = Number(data.aggregatedCost || 0)
  updateOptions()
  renderIncomePie()
  calculate()
  renderRadar()
  await calcOpeningReceivable()
  updateKanban()
  await loadProjectTotals()
  renderWorkPie()
  renderProgress()
}
function formatMoney(v: any) { const num = Number(v || 0); return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) }
async function loadProjectTotals() {
  if (!projectId.value) { projectTotal.value = 0; projectCostTotal.value = 0; projectWorkValueTotal.value = 0; return }
  const u = new URL('/api/dashboard/revenue/summary', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  const res = await fetch(u.toString())
  const data = await res.json()
  projectTotal.value = Number(data.total || 0)
  projectCostTotal.value = Number(data.aggregatedCost || 0)
  const rows0 = data.rows || []
  projectWorkValueTotal.value = rows0.reduce((s: number, r: any) => s + Number(r.totalWorkValueUSD || 0), 0)
}
function renderIncomePie() {
  if (!pieRef.value) return
  if (!pieChart) pieChart = echarts.init(pieRef.value)
  const inner = new Map<string, number>()
  const outer: Array<{ name: string; value: number }> = []
  for (const r of rows.value) {
    const wn = String(r.wellNo || '')
    const tn = String(r.taskName || r.item || '')
    const amt = Number(r.amount || 0)
    if (wn) inner.set(wn, (inner.get(wn) || 0) + amt)
    if (wn && tn) outer.push({ name: `${wn}-${tn}`, value: amt })
  }
  const innerData = Array.from(inner.entries()).map(([name, value]) => ({ name, value }))
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', confine: true },
    legend: { top: 0, type: 'scroll', textStyle: { color: '#334155', fontSize: 12 } },
    series: [
      { type: 'pie', radius: ['32%', '46%'],
        data: innerData,
        label: { color: '#0f172a', fontSize: 12 },
        labelLine: { length: 12, length2: 8 },
        itemStyle: { borderRadius: 6 }
      },
      { type: 'pie', radius: ['52%', '72%'],
        data: outer,
        label: { color: '#0f172a', fontSize: 12 },
        labelLine: { length: 14, length2: 10 },
        itemStyle: { borderRadius: 6 }
      }
    ]
  })
}
function renderWorkPie() {
  if (!workPieRef.value) return
  if (!workPieChart) workPieChart = echarts.init(workPieRef.value)
  const inner = new Map<string, number>()
  const outer: Array<{ name: string; value: number }> = []
  for (const r of rows.value) {
    const wn = String(r.wellNo || '')
    const tn = String(r.taskName || r.item || '')
    const val = Number(r.totalWorkValueUSD || 0)
    if (wn) inner.set(wn, (inner.get(wn) || 0) + val)
    if (wn && tn) outer.push({ name: `${wn}-${tn}`, value: val })
  }
  const innerData = Array.from(inner.entries()).map(([name, value]) => ({ name, value }))
  workPieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', confine: true },
    legend: { top: 0, type: 'scroll', textStyle: { color: '#334155', fontSize: 12 } },
    graphic: [{
      type: 'group', left: 'center', top: 'center', children: [
        { type: 'text', style: { text: '项目价值工作量', fill: '#334155', fontSize: 13, fontWeight: 600, textAlign: 'center' }, left: 0, top: -10 },
        { type: 'text', style: { text: formatMoney(projectWorkValueTotal.value || 0), fill: '#0f172a', fontSize: 18, fontWeight: 700, textAlign: 'center' }, left: 0, top: 12 }
      ]
    }],
    series: [
      { type: 'pie', radius: ['32%', '46%'],
        data: innerData,
        label: { color: '#0f172a', fontSize: 12 },
        labelLine: { length: 12, length2: 8 },
        itemStyle: { borderRadius: 6 }
      },
      { type: 'pie', radius: ['52%', '72%'],
        data: outer,
        label: { color: '#0f172a', fontSize: 12 },
        labelLine: { length: 14, length2: 10 },
        itemStyle: { borderRadius: 6 }
      }
    ]
  })
}
function colorFromString(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  const hue = h % 360
  const sat = 62 + (h % 18)
  const light = 48
  return `hsl(${hue}, ${sat}%, ${light}%)`
}
function hslaFromHsl(hsl: string, a: number) {
  const m = /hsl\((\d+),\s*(\d+)%\s*,\s*(\d+)%\s*\)/.exec(hsl)
  if (!m) return hsl
  const h = Number(m[1])
  const s = Number(m[2])
  const l = Number(m[3])
  return `hsla(${h}, ${s}%, ${l}%, ${Math.max(0, Math.min(1, a))})`
}
function lightenHsl(hsl: string, delta: number) {
  const m = /hsl\((\d+),\s*(\d+)%\s*,\s*(\d+)%\s*\)/.exec(hsl)
  if (!m) return hsl
  const h = Number(m[1])
  const s = Number(m[2])
  const l = Math.min(92, Number(m[3]) + delta)
  return `hsl(${h}, ${s}%, ${l}%)`
}
function derivePlanColor(hsl: string) {
  const m = /hsl\((\d+),\s*(\d+)%\s*,\s*(\d+)%\s*\)/.exec(hsl)
  if (!m) return hsl
  const h = Number(m[1])
  const s = Math.max(20, Number(m[2]) - 10)
  const l = Math.min(88, Number(m[3]) + 6)
  return `hsl(${h}, ${s}%, ${l}%)`
}
function renderProgress() {
  if (!progressRef.value) return
  if (!progressChart) progressChart = echarts.init(progressRef.value)
  const cats: string[] = []
  const planData: Array<[number, number, number, string]> = []
  const actualData: Array<[number, number, number, string]> = []
  let minTime = Number.POSITIVE_INFINITY
  let maxTime = Number.NEGATIVE_INFINITY
  const byWell = new Map<string, any[]>()
  for (const r of rows.value) {
    const wn = String(r.wellNo || '')
    const tn = String(r.taskName || r.item || '')
    const hasPlan = r.plannedStart && r.plannedEnd
    const hasActual = r.actualStart && r.actualEnd
    if (!wn || !tn) continue
    if (!hasPlan && !hasActual) continue
    if (!byWell.has(wn)) byWell.set(wn, [])
    byWell.get(wn)!.push(r)
  }
  const totalItems = Array.from(byWell.values()).reduce((s, arr) => s + arr.length, 0)
  if (!totalItems) {
    progressChart.setOption({
      tooltip: { trigger: 'item', confine: true },
      xAxis: { type: 'time' }, yAxis: { type: 'category', data: [] },
      graphic: [{ type: 'text', left: 'center', top: 'center', style: { text: '暂无数据', fill: '#94a3b8', fontSize: 16, fontWeight: 600 } }]
    })
    return
  }
  const wellRanges: Array<{ wn: string; start: number; end: number }> = []
  for (const [wn, arr] of Array.from(byWell.entries())) {
    const start = cats.length
    for (const r of arr) {
      const name = `${String(r.taskName || r.item || '')}`
      cats.push(`${wn}|||${name}`)
      const idx = cats.length - 1
      if (r.plannedStart && r.plannedEnd) {
        const s = new Date(r.plannedStart).getTime()
        const e = new Date(r.plannedEnd).getTime()
        const base = colorFromString(wn)
        const cPlan = derivePlanColor(base)
        planData.push([s, e, idx, cPlan])
        if (isFinite(s)) minTime = Math.min(minTime, s)
        if (isFinite(e)) maxTime = Math.max(maxTime, e)
      }
      if (r.actualStart && r.actualEnd) {
        const s = new Date(r.actualStart).getTime()
        const e = new Date(r.actualEnd).getTime()
        const base = colorFromString(wn)
        actualData.push([s, e, idx, base])
        if (isFinite(s)) minTime = Math.min(minTime, s)
        if (isFinite(e)) maxTime = Math.max(maxTime, e)
      }
    }
    const end = cats.length - 1
    if (end >= start) wellRanges.push({ wn, start, end })
  }
  const groupRects: Array<[number, number, number, number, string, string, string, string]> = []
  if (isFinite(minTime) && isFinite(maxTime)) {
    for (const r of wellRanges) {
      const base = colorFromString(r.wn)
      const fill = hslaFromHsl(base, 0.12)
      const stroke = hslaFromHsl(base, 0.35)
      const tagBg = hslaFromHsl(base, 0.18)
      groupRects.push([minTime, maxTime, r.start, r.end, fill, stroke, r.wn, tagBg])
    }
  }
  const renderItemGroup = (params: any, api: any) => {
    const yStart = api.value(2)
    const yEnd = api.value(3)
    const startCoord = api.coord([api.value(0), yStart])
    const endCoord = api.coord([api.value(1), yEnd])
    const band = api.size([0, 1])[1]
    const top = api.coord([api.value(0), yStart])[1] - band / 2 - 1
    const bottom = api.coord([api.value(0), yEnd])[1] + band / 2 + 1
    const height = bottom - top
    return {
      type: 'rect',
      shape: { x: startCoord[0], y: top, width: endCoord[0] - startCoord[0], height },
      style: { fill: api.value(4), stroke: api.value(5) },
      z: 0
    }
  }
  const renderItemPlan = (params: any, api: any) => {
    const categoryIndex = api.value(2)
    const start = api.coord([api.value(0), categoryIndex])
    const end = api.coord([api.value(1), categoryIndex])
    const full = Math.max(18, api.size([0, 1])[1] * 0.7)
    const lane = Math.max(10, full / 2 - 2)
    return { type: 'rect', shape: { x: start[0], y: start[1] - full / 2, width: end[0] - start[0], height: lane }, style: { fill: api.value(3), opacity: 0.9, shadowColor: 'rgba(0,0,0,0.08)', shadowBlur: 6 } }
  }
  const renderItemActual = (params: any, api: any) => {
    const categoryIndex = api.value(2)
    const start = api.coord([api.value(0), categoryIndex])
    const end = api.coord([api.value(1), categoryIndex])
    const full = Math.max(18, api.size([0, 1])[1] * 0.7)
    const lane = Math.max(10, full / 2 - 2)
    return { type: 'rect', shape: { x: start[0], y: start[1] + 2, width: end[0] - start[0], height: lane }, style: { fill: api.value(3), opacity: 1, shadowColor: 'rgba(0,0,0,0.1)', shadowBlur: 8 } }
  }
  const renderItemLabel = (params: any, api: any) => {
    const yStart = api.value(2)
    const yEnd = api.value(3)
    const startCoord = api.coord([api.value(0), yStart])
    const endCoord = api.coord([api.value(1), yEnd])
    const band = api.size([0, 1])[1]
    const top = api.coord([api.value(0), yStart])[1] - band / 2
    return {
      type: 'text',
      style: {
        text: String(api.value(6) || ''),
        x: endCoord[0] - 12,
        y: top + 10,
        textAlign: 'right',
        fontSize: 12,
        fontWeight: 700,
        fill: '#0f172a',
        backgroundColor: api.value(7),
        borderRadius: 12,
        padding: [4, 10]
      },
      z: 100
    }
  }
  const option = {
    tooltip: { trigger: 'item', confine: true, formatter: (p: any) => {
      const s = new Date(p.value[0]); const e = new Date(p.value[1]);
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      return `${p.seriesName}: ${fmt(s)} 至 ${fmt(e)}`
    } },
    legend: { top: 0, textStyle: { color: '#334155' } },
    grid: { top: 40, left: 160, right: 40, bottom: 40 },
    xAxis: { type: 'time', axisLine: { lineStyle: { color: '#94a3b8' } }, axisLabel: { color: '#334155' } },
    yAxis: { type: 'category', data: cats, axisLine: { show: false }, axisTick: { show: false },
      splitArea: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: '#334155',
        formatter: (v: string) => {
          const parts = String(v).split('|||')
          const tn = parts[1] || ''
          return `${tn}`
        }
      }
    },
    series: [
      { name: '分组', type: 'custom', renderItem: renderItemGroup, encode: { x: [0, 1], y: [2] }, data: groupRects, silent: true },
      { name: '井号', type: 'custom', renderItem: renderItemLabel, encode: { x: [0, 1], y: [2] }, data: groupRects, silent: true },
      { name: '计划', type: 'custom', renderItem: renderItemPlan, encode: { x: [0, 1], y: 2 }, data: planData, universalTransition: true },
      { name: '实际', type: 'custom', renderItem: renderItemActual, encode: { x: [0, 1], y: 2 }, data: actualData, universalTransition: true }
    ]
  } as any
  progressChart.setOption(option)
}
function onImportSuccess(res: any) { if (res?.ok) { ElMessage.success(`导入成功：${res.count} 条`); load() } else { ElMessage.error(res?.error || '导入失败') } }
function onImportError() { ElMessage.error('导入失败，请检查模板与列顺序') }
function updateUploadUrl() { uploadUrl.value = `/api/dashboard/revenue/import?projectId=${projectId.value || ''}` }
function formatDate(d: any) { const dt = new Date(d); const y = dt.getFullYear(); const m = String(dt.getMonth()+1).padStart(2,'0'); const da = String(dt.getDate()).padStart(2,'0'); return `${y}-${m}-${da}` }
function exportPDF() { window.print() }
onMounted(async () => { await loadProjects(); await load() })
function onWellChange() { taskName.value = ''; updateOptions(); load() }
function updateOptions() {
  const setW = new Set<string>()
  const setT = new Set<string>()
  for (const r of rows.value) {
    if (r.wellNo) setW.add(String(r.wellNo))
    if (String(r.wellNo || '') === String(wellNumber.value || '')) {
      if (r.taskName) setT.add(String(r.taskName))
      else if (r.item) setT.add(String(r.item))
    }
  }
  wells.value = Array.from(setW)
  tasks.value = wellNumber.value ? Array.from(setT) : []
}

function progressColor(s: number) {
  if (s >= 4.5) return '#10b981'
  if (s >= 3.5) return '#22c55e'
  if (s >= 2.5) return '#f59e0b'
  if (s >= 1.5) return '#f97316'
  return '#ef4444'
}
function daysBetween(a?: string, b?: string) {
  if (!a || !b) return 0
  const da = new Date(a).getTime()
  const db = new Date(b).getTime()
  return Math.round((da - db) / (24 * 3600 * 1000))
}
function calculate() {
  const plan = rows.value.reduce((s, r) => s + Number(r.revenuePlanUSD || 0), 0)
  const confirmed = rows.value.reduce((s, r) => s + Number(r.revenueConfirmedAmountUSD || 0), 0)
  const workValue = rows.value.reduce((s, r) => s + Number(r.totalWorkValueUSD || 0), 0)
  const cash = rows.value.reduce((s, r) => s + Number(r.cashAmountUSD || 0), 0)
  const cost = Number(aggCost.value || 0)
  const n = rows.value.length || 1
  const deltaPct = plan > 0 ? ((confirmed - plan) / plan) * 100 : 0
  const s1 = (() => {
    const pos = deltaPct >= 0 ? deltaPct / 10 : Math.abs(deltaPct) / 5
    const v = 5 * (1 - Math.max(0, Math.min(1, pos)))
    return Number(v.toFixed(2))
  })()
  const ratioWV = plan > 0 ? (workValue / plan) * 100 : 0
  const s2 = (() => {
    const diff = Math.abs(ratioWV - 100) / 10
    const v = 5 * (1 - Math.max(0, Math.min(1, diff)))
    return Number(v.toFixed(2))
  })()
  const avgConfirmDelay = (() => {
    let sum = 0; let count = 0
    for (const r of rows.value) {
      if (r.revenueConfirmedDate && r.actualEnd) { sum += daysBetween(r.revenueConfirmedDate, r.actualEnd); count++ }
    }
    return count ? sum / count : 0
  })()
  const s3 = (() => {
    const t = (avgConfirmDelay - 10) / (25 - 10)
    const v = 5 * (1 - Math.max(0, Math.min(1, t)))
    return Number(v.toFixed(2))
  })()
  const avgIdx = (() => {
    let sum = 0; let count = 0
    for (const r of rows.value) {
      if (r.plannedStart && r.plannedEnd) {
        const ps = new Date(r.plannedStart).getTime()
        const pe = new Date(r.plannedEnd).getTime()
        const as = r.actualEnd ? new Date(r.actualEnd).getTime() : pe
        const planSpan = Math.max(1, Math.round((pe - ps) / (24*3600*1000)))
        const actDiff = Math.round((as - pe) / (24*3600*1000))
        const idx = ((planSpan) - (actDiff)) / (planSpan)
        sum += idx; count++
      }
    }
    return count ? (sum / count) : 0
  })()
  const s4 = (() => {
    const v = 5 * Math.max(0, Math.min(1, (avgIdx - 0.55) / (1.1 - 0.55)))
    return Number(v.toFixed(2))
  })()
  const s5a = (() => {
    const base = Number(contractAmount.value || 0)
    const rate = base > 0 ? (cash / base) : 0
    const v = 2.5 * Math.max(0, Math.min(1, rate))
    return Number(v.toFixed(2))
  })()
  const s5b = (() => {
    let sum = 0
    for (const r of rows.value) {
      const plannedCash = r.plannedEnd
      const diff = plannedCash ? (daysBetween(plannedCash, r.cashDate) - daysBetween(r.cashDate, r.actualEnd)) : 0
      sum += diff
    }
    const minV = -10 * n
    const maxV = 60 * n
    const t = (sum - minV) / (maxV - minV)
    const v = 2.5 * Math.max(0, Math.min(1, t))
    return Number(v.toFixed(2))
  })()
  const idxCF = (() => {
    const v = cost > 0 ? (1 - ((workValue - cash) / cost)) : 0
    return v
  })()
  const s6 = (() => {
    const t = (idxCF - 0.4) / (0.8 - 0.4)
    const v = 5 * Math.max(0, Math.min(1, t))
    return Number(v.toFixed(2))
  })()
  scores.value.incomePlanRate = s1
  scores.value.workValuePlanRate = s2
  scores.value.confirmTimeDelta = s3
  scores.value.scheduleDeviationIndex = s4
  scores.value.cashIndex = Number((s5a + s5b).toFixed(2))
  scores.value.cashFlowIndex = s6
  scoresTable.value = [
    { name: '收入计划完成率', score: scores.value.incomePlanRate, formula: '(确认-计划)/计划 ∈ [-5%,10%]→[5,0]' },
    { name: '价值工作量完成计划', score: scores.value.workValuePlanRate, formula: '价值工作量/收入计划 接近100%越高' },
    { name: '收入确认时间差', score: scores.value.confirmTimeDelta, formula: '确认时间-实际完成天数 ∈ [10,25]→[5,0]' },
    { name: '进度偏差指数', score: scores.value.scheduleDeviationIndex, formula: '按计划跨度与完成差线性映射 ∈[1.1,0.55]→[5,0]' },
    { name: '回款指数', score: scores.value.cashIndex, formula: 'A:收现/合同×100% [0,100]→[0,2.5]; B:时差合计映射[−10n,60n]→[0,2.5]' },
    { name: '现金流指数', score: scores.value.cashFlowIndex, formula: '1−(价值工作量−收现)/成本 ∈[40%,80%]→[0,5]' }
  ]
  overallScore.value = Number(((scores.value.incomePlanRate + scores.value.workValuePlanRate + scores.value.confirmTimeDelta + scores.value.scheduleDeviationIndex + scores.value.cashIndex + scores.value.cashFlowIndex) / 6).toFixed(2))
  updateEvaluation()
  const base = Number(contractAmount.value || 0)
  const ratePct = base > 0 ? (cash / base) * 100 : 0
  let sumCashDays = 0
  for (const r of rows.value) {
    const plannedCash = r.plannedEnd
    const diff = plannedCash ? (daysBetween(plannedCash, r.cashDate) - daysBetween(r.cashDate, r.actualEnd)) : 0
    sumCashDays += diff
  }
  metricsTable.value = [
    { name: '收入计划合计(USD)', value: formatMoney(plan) },
    { name: '已确认收入合计(USD)', value: formatMoney(confirmed) },
    { name: '价值工作量合计(USD)', value: formatMoney(workValue) },
    { name: '收现金额合计(USD)', value: formatMoney(cash) },
    { name: '成本合计(USD)', value: formatMoney(cost) },
    { name: '合同金额(USD)', value: formatMoney(base) },
    { name: '收入计划偏差(%)', value: Number(deltaPct.toFixed(2)) },
    { name: '价值工作量/计划(%)', value: Number(ratioWV.toFixed(2)) },
    { name: '平均确认时间差(天)', value: Number(avgConfirmDelay.toFixed(2)) },
    { name: '进度偏差指数均值', value: Number(avgIdx.toFixed(3)) },
    { name: '回款指数A(%)', value: Number(ratePct.toFixed(2)) },
    { name: '回款指数B累计(天)', value: sumCashDays }
  ]
}
function updateEvaluation() {
  const s = overallScore.value
  if (s >= 4.5) { evaluationTitle.value = '优秀+'; evaluationText.value = '收入执行与现金流表现极佳，计划与确认高度一致。' }
  else if (s >= 3.5) { evaluationTitle.value = '优秀'; evaluationText.value = '收入与价值工作量基本达标，确认与回款较为及时。' }
  else if (s >= 2.5) { evaluationTitle.value = '良好+'; evaluationText.value = '收入执行总体良好，需优化确认时差与现金回款。' }
  else if (s >= 1.5) { evaluationTitle.value = '良好'; evaluationText.value = '收入与现金流存在偏差，计划与实际需进一步对齐。' }
  else if (s >= 0.5) { evaluationTitle.value = '一般'; evaluationText.value = '收入确认与回款滞后，需制定改善措施。' }
  else { evaluationTitle.value = '不合格'; evaluationText.value = '收入执行与现金流明显偏弱，需紧急整改。' }
}
function renderRadar() {
  if (!radarRef.value) return
  if (!radarChart) {
    radarChart = echarts.init(radarRef.value)
    const labels = ['收入计划完成率', '价值工作量完成计划', '收入确认时间差', '进度偏差指数', '回款指数', '现金流指数']
    radarChart.setOption({
      color: ['#2f88ff'],
      tooltip: { trigger: 'item', confine: true, appendToBody: true, extraCssText: 'max-width:280px; white-space:normal; line-height:1.6;', formatter: (params: any) => {
        const vals: number[] = params.value || []
        return labels.map((l, i) => `${l}: ${Number(vals[i] || 0).toFixed(2)}`).join('<br/>')
      } },
      radar: { indicator: labels.map(l => ({ name: l, max: 5 })) },
      series: [{ type: 'radar', data: [{ value: [0,0,0,0,0,0], name: '评分' }], lineStyle: { width: 2, color: '#2f88ff' }, areaStyle: { color: 'rgba(47,136,255,0.25)' }, symbol: 'circle', symbolSize: 4 }]
    })
  }
  const raw = [
    scores.value.incomePlanRate,
    scores.value.workValuePlanRate,
    scores.value.confirmTimeDelta,
    scores.value.scheduleDeviationIndex,
    scores.value.cashIndex,
    scores.value.cashFlowIndex
  ]
  radarChart.setOption({ series: [{ data: [{ value: raw, name: '评分' }] }] })
}
function updateKanban() {
  const plan = rows.value.reduce((s, r) => s + Number(r.revenuePlanUSD || 0), 0)
  const confirmed = rows.value.reduce((s, r) => s + Number(r.revenueConfirmedAmountUSD || 0), 0)
  const workValue = rows.value.reduce((s, r) => s + Number(r.totalWorkValueUSD || 0), 0)
  const cash = rows.value.reduce((s, r) => s + Number(r.cashAmountUSD || 0), 0)
  const deltaPct = plan > 0 ? ((confirmed - plan) / plan) * 100 : 0
  let sumCashDays = 0
  let sumConfirmDays = 0
  let cntCashDays = 0
  let cntConfirmDays = 0
  for (const r of rows.value) {
    const plannedCash = r.plannedEnd
    const d1 = plannedCash ? (daysBetween(plannedCash, r.cashDate) - daysBetween(r.cashDate, r.actualEnd)) : 0
    sumCashDays += d1; cntCashDays++
    if (r.revenueConfirmedDate && r.actualEnd) { sumConfirmDays += daysBetween(r.revenueConfirmedDate, r.actualEnd); cntConfirmDays++ }
  }
  const avgCashDelta = cntCashDays ? (sumCashDays / cntCashDays) : 0
  const avgConfirmDelta = cntConfirmDays ? (sumConfirmDays / cntConfirmDays) : 0
  const cost = Number(aggCost.value || 0)
  const footageMeters = rows.value.filter(r => String(r.unit || '') === '米' && (!wellNumber.value || String(r.wellNo || '') === String(wellNumber.value || ''))).reduce((s, r) => s + Number(r.actualWorkload || 0), 0)
  kanban.value = [
    { name: '价值工作量', value: formatMoney(workValue) },
    { name: '已确认收入', value: formatMoney(confirmed) },
    { name: '开票未回款金额', value: formatMoney(cash - confirmed) },
    { name: '已收现金额', value: formatMoney(cash) },
    { name: '收入偏差(%)', value: Number(deltaPct.toFixed(2)) },
    { name: '收入确认时间差(天)', value: Number(avgConfirmDelta.toFixed(2)) },
    { name: '收现时间差(天)', value: Number(avgCashDelta.toFixed(2)) },
    { name: '百元成本收入', value: Number(((cost > 0 ? (confirmed / cost) : 0) * 100).toFixed(2)) },
    { name: '百米进尺收入', value: Number(((footageMeters > 0 ? (confirmed / footageMeters) : 0) * 100).toFixed(2)) },
    { name: '每米成本', value: formatMoney(footageMeters > 0 ? (cost / footageMeters) : 0) }
  ]
}
async function calcOpeningReceivable() {
  const from = Array.isArray(dateRange.value) && dateRange.value[0] ? formatDate(dateRange.value[0]) : undefined
  if (!projectId.value || !from) { openingReceivable.value = 0; return }
  const dt = new Date(from)
  dt.setDate(dt.getDate() - 1)
  const prev = formatDate(dt)
  const u = new URL('/api/dashboard/revenue/summary', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  u.searchParams.set('to', prev)
  const res = await fetch(u.toString())
  const data = await res.json()
  const rows0 = data.rows || []
  const confirmed0 = rows0.reduce((s: number, r: any) => s + (r.revenueConfirmedDate && r.revenueConfirmedDate <= prev ? Number(r.revenueConfirmedAmountUSD || 0) : 0), 0)
  const cash0 = rows0.reduce((s: number, r: any) => s + (r.cashDate && r.cashDate <= prev ? Number(r.cashAmountUSD || 0) : 0), 0)
  openingReceivable.value = Number((confirmed0 - cash0).toFixed(2))
}
</script>

<style scoped>
.page-card { max-width: 1100px; margin: 0 auto; }
.toolbar { margin-bottom: 12px; display: flex; align-items: center; }
.ml8 { margin-left: 8px; }
.sub-title { font-weight: 600; margin-bottom: 8px; }
.radar { width: 100%; height: 360px; }
.pie { width: 100%; height: 360px; }
.bar { width: 100%; height: 420px; }
.icon-btn { display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:8px; background:#f1f5f9; border:1px solid #e2e8f0; transition:all .2s; }
.icon { width:18px; height:18px; fill:#334155; }
.overall { margin-top: 12px; font-weight: 600; }
.overall-score { color: #2f88ff; }
.overall-rating { margin-left: 6px; font-weight: 700; color: #0f172a; }
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
.metric-list { display: flex; flex-direction: column; gap: 12px; }
.metric-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
.metric-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.metric-name { font-weight:600; color:#0f172a; }
.metric-score { font-weight:700; color:#334155; }
.metric-formula { margin-top:8px; color:#475569; font-size:12px; }
.kanban { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.kanban-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
.kanban-name { color:#334155; font-weight:600; }
.kanban-value { color:#0f172a; font-weight:700; font-size: 18px; margin-top: 6px; }
.mini-name { color:#334155; font-weight:600; }
.mini-value { color:#0f172a; font-weight:700; }
</style>
async function loadProjectTotal() {
  if (!projectId.value) { projectTotal.value = 0; return }
  const u = new URL('/api/dashboard/revenue/summary', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  const res = await fetch(u.toString())
  const data = await res.json()
  projectTotal.value = Number(data.total || 0)
}