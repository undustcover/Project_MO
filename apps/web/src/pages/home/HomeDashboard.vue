<template>
  <el-card shadow="never" class="page-card">
    <template #header><div class="card-header">主页看板</div></template>
    <div class="toolbar">
      <el-select v-model="projectId" placeholder="选择项目" filterable style="width:300px" @change="loadAll">
        <el-option v-for="p in projects" :key="p.id" :label="(p.name || p.contractNo)" :value="p.id" />
      </el-select>
      <router-link to="/home/config"><el-button class="ml8">主页配置</el-button></router-link>
    </div>
    <el-row :gutter="12">
      <el-col :span="24" v-if="showModule('overview')">
        <el-card shadow="hover">
          <div class="sub-title">立项模块</div>
          <div class="info-grid">
            <div class="info-item"><div class="info-name">项目</div><div class="info-val">{{ (project?.name || project?.contractNo || '') }}</div></div>
            <div class="info-item"><div class="info-name">合同编号</div><div class="info-val">{{ project?.contractNo || '-' }}</div></div>
            <div class="info-item"><div class="info-name">合同金额</div><div class="info-val">{{ formatMoney(project?.amountValue || 0) }} {{ project?.amountCurrency || '' }}</div></div>
            <div class="info-item"><div class="info-name">开始日期</div><div class="info-val">{{ project?.startDate || '-' }}</div></div>
            <div class="info-item"><div class="info-name">验收日期</div><div class="info-val">{{ project?.acceptanceDate || '-' }}</div></div>
            <div class="info-item"><div class="info-name">回款日期</div><div class="info-val">{{ project?.finalPaymentDate || '-' }}</div></div>
            <div class="info-item"><div class="info-name">保函释放</div><div class="info-val">{{ project?.bondReleaseDate || '-' }}</div></div>
            <div class="info-item"><div class="info-name">评审日期</div><div class="info-val">{{ project?.reviewDate || '-' }}</div></div>
          </div>
          <div class="sub-title mt12">参与单位</div>
          <el-table :data="project?.participants || []" size="small" border>
            <el-table-column prop="key" label="单位" />
            <el-table-column prop="value" label="说明" />
          </el-table>
          <div class="sub-title mt12">分包单位</div>
          <el-table :data="project?.subcontractors || []" size="small" border>
            <el-table-column prop="key" label="单位" />
            <el-table-column prop="value" label="说明" />
          </el-table>
          <div class="sub-title mt12">目标评估结果</div>
          <div class="kanban">
            <div class="kanban-item">
              <div class="kanban-name">目标总数</div>
              <div class="kanban-value">{{ goalsSummary.total }}</div>
            </div>
            <div class="kanban-item">
              <div class="kanban-name">已达成</div>
              <div class="kanban-value">{{ goalsSummary.completed }}</div>
            </div>
            <div class="kanban-item">
              <div class="kanban-name">暂不支持</div>
              <div class="kanban-value">{{ goalsSummary.unsupported }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" class="mt12" v-if="showModule('progress')">
      <el-col :span="12">
        <el-card shadow="hover" v-if="showProgressChart('radar')">
          <div class="sub-title">六维雷达图</div>
          <div ref="progressRadarRef" class="radar"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" v-if="showProgressChart('cycle')">
          <div class="sub-title">建井周期统计</div>
          <div ref="progressCyclePieRef" class="pie"></div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12" class="mt12" v-if="showModule('progress')">
      <el-col :span="12">
        <el-card shadow="hover" v-if="showProgressChart('eff')">
          <div class="sub-title">工作时效对比</div>
          <div ref="progressEffPieRef" class="pie"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" v-if="showProgressFields()">
          <div class="sub-title">时效字段</div>
          <el-table :data="progressFields" size="small" border>
            <el-table-column prop="name" label="字段" />
            <el-table-column prop="value" label="数值" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" class="mt12" v-if="showModule('cost')">
      <el-col :span="12">
        <el-card shadow="hover" v-if="showCostChart('radar')">
          <div class="sub-title">成本六维雷达图</div>
          <div ref="costRadarRef" class="radar"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" v-if="showCostChart('pie')">
          <div class="sub-title">总体成本分类分布</div>
          <div ref="costPieRef" class="pie"></div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12" class="mt12" v-if="showModule('cost') && showCostFields()">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">成本字段</div>
          <div class="kpi-grid">
            <div class="kpi"><div class="kpi-title">项目总预算</div><div class="kpi-value">{{ formatMoney(costKpis.projectTotalBudget||0) }}</div></div>
            <div class="kpi"><div class="kpi-title">项目剩余预算</div><div class="kpi-value">{{ formatMoney(costKpis.projectRemainingBudget||0) }}</div></div>
            <div class="kpi"><div class="kpi-title">项目总收入</div><div class="kpi-value">{{ formatMoney(costKpis.projectTotalRevenue||0) }}</div></div>
            <div class="kpi"><div class="kpi-title">实际成本(AC)</div><div class="kpi-value">{{ formatMoney(costKpis.AC||0) }}</div></div>
            <div class="kpi"><div class="kpi-title">成本绩效(CPI)</div><div class="kpi-value">{{ Number(costKpis.CPI||0).toFixed(2) }}</div></div>
            <div class="kpi"><div class="kpi-title">成本偏差(CV)</div><div class="kpi-value">{{ formatMoney(costKpis.CV||0) }}</div></div>
            <div class="kpi"><div class="kpi-title">完工尚需估算(ETC)</div><div class="kpi-value">{{ formatMoney(costKpis.ETC||0) }}</div></div>
            <div class="kpi"><div class="kpi-title">完工总估算(EAC)</div><div class="kpi-value">{{ formatMoney(costKpis.EAC||0) }}</div></div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" class="mt12" v-if="showModule('revenue')">
      <el-col :span="12">
        <el-card shadow="hover" v-if="showRevenueChart('radar')">
          <div class="sub-title">收入六维雷达图</div>
          <div ref="revRadarRef" class="radar"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" v-if="showRevenueChart('incomePie')">
          <div class="sub-title">收入来源分布</div>
          <div ref="revPieRef" class="pie"></div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12" class="mt12" v-if="showModule('revenue')">
      <el-col :span="12">
        <el-card shadow="hover" v-if="showRevenueChart('workPie')">
          <div class="sub-title">价值工作量圆盘</div>
          <div ref="revWorkPieRef" class="pie"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" v-if="showRevenueFields()">
          <div class="sub-title">收入字段</div>
          <el-table :data="revenueFields" size="small" border>
            <el-table-column prop="name" label="字段" />
            <el-table-column prop="value" label="数值" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" class="mt12" v-if="showModule('alerts')">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">预警模块</div>
          <div class="charts">
            <div v-if="showAlertsChart('severity')" ref="alertSevRef" class="chart"></div>
            <div v-if="showAlertsChart('type')" ref="alertTypeRef" class="chart"></div>
            <div v-if="showAlertsChart('trend')" ref="alertTrendRef" class="chart wide"></div>
          </div>
          <el-table v-if="showAlertsList()" :data="alertRecords" size="small" border class="mt12">
            <el-table-column prop="projectName" label="项目" />
            <el-table-column prop="alertTypeText" label="类型" />
            <el-table-column prop="alertItem" label="预警项" />
            <el-table-column prop="severityText" label="级别" />
            <el-table-column prop="message" label="消息" />
            <el-table-column prop="statusText" label="状态" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </el-card>
  </template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { ref, onMounted, nextTick, watch } from 'vue'
import { getProjects, getProject, getProjectGoalsSummary, getProjectHomeConfig } from '../../services/api'

const projects = ref<any[]>([])
const projectId = ref<number>()
const project = ref<any>(null)
const config = ref<any>(null)
const goalsSummary = ref<any>({ total: 0, completed: 0, unsupported: 0 })

const progressData = ref<any>(null)
const progressRadarRef = ref<HTMLDivElement | null>(null)
const progressCyclePieRef = ref<HTMLDivElement | null>(null)
const progressEffPieRef = ref<HTMLDivElement | null>(null)
let progressRadarChart: echarts.ECharts | null = null
let progressCyclePieChart: echarts.ECharts | null = null
let progressEffPieChart: echarts.ECharts | null = null
const progressFields = ref<any[]>([])

const costKpis = ref<any>({})
const costRadarRef = ref<HTMLDivElement | null>(null)
const costPieRef = ref<HTMLDivElement | null>(null)
let costRadarChart: echarts.ECharts | null = null
let costPieChart: echarts.ECharts | null = null

const revRadarRef = ref<HTMLDivElement | null>(null)
const revPieRef = ref<HTMLDivElement | null>(null)
const revWorkPieRef = ref<HTMLDivElement | null>(null)
let revRadarChart: echarts.ECharts | null = null
let revPieChart: echarts.ECharts | null = null
let revWorkPieChart: echarts.ECharts | null = null
const revenueRows = ref<any[]>([])
const revenueFields = ref<any[]>([])

const alertSevRef = ref<HTMLDivElement | null>(null)
const alertTypeRef = ref<HTMLDivElement | null>(null)
const alertTrendRef = ref<HTMLDivElement | null>(null)
const alertRecords = ref<any[]>([])

function formatMoney(v: any) { const num = Number(v || 0); return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) }
function showModule(name: 'overview'|'progress'|'cost'|'revenue'|'alerts') {
  const cfg = config.value || defaultConfig()
  return !!cfg.modules?.includes(name)
}
function defaultConfig() {
  return { modules: ['overview','progress','cost','revenue','alerts'] }
}
function showProgressChart(name: 'radar'|'cycle'|'eff') { const c = config.value?.progress?.charts; return Array.isArray(c) ? c.includes(name) : true }
function showProgressFields() { const f = config.value?.progress?.fields; return f !== false }
function showCostChart(name: 'radar'|'pie') { const c = config.value?.cost?.charts; return Array.isArray(c) ? c.includes(name) : true }
function showCostFields() { const f = config.value?.cost?.fields; return f !== false }
function showRevenueChart(name: 'radar'|'incomePie'|'workPie') { const c = config.value?.revenue?.charts; return Array.isArray(c) ? c.includes(name) : true }
function showRevenueFields() { const f = config.value?.revenue?.fields; return f !== false }
function showAlertsChart(name: 'severity'|'type'|'trend') { const c = config.value?.alerts?.charts; return Array.isArray(c) ? c.includes(name) : true }
function showAlertsList() { const f = config.value?.alerts?.list; return f !== false }

async function loadProjects() {
  projects.value = await getProjects()
  if (projects.value.length && !projectId.value) projectId.value = projects.value[0].id
}
async function loadAll() {
  if (!projectId.value) return
  config.value = await getProjectHomeConfig(projectId.value) || defaultConfig()
  project.value = await getProject(projectId.value)
  goalsSummary.value = await getProjectGoalsSummary(projectId.value)
  progressData.value = null
  costKpis.value = {}
  revenueRows.value = []
  alertRecords.value = []
  await Promise.all([
    loadProgress(),
    loadCost(),
    loadRevenue(),
    loadAlerts()
  ])
  await nextTick()
  renderProgress()
  renderCost()
  renderRevenue()
  renderAlerts()
}

async function loadProgress() {
  const u = new URL('/api/dashboard/progress', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  const res = await fetch(u.toString())
  const d = await res.json()
  progressData.value = d || {}
  const vals = {
    production: Number(d.drillingProductionTime || 0),
    nonProduction: Number(d.drillingNonProductionTime || 0),
    completion: Number(d.actualCompletionTime || 0),
    pureDrilling: Number(d.pureDrillingTime || 0),
    tripping: Number(d.trippingTime || 0),
    footage: Number(d.footageWorkingTime || 0),
    wellCycle: Number(d.wellBuildingCycleTime || 0)
  }
  progressFields.value = [
    { name: '生成时效(h)', value: vals.production },
    { name: '非生产时效(h)', value: vals.nonProduction },
    { name: '中完时间(h)', value: vals.completion },
    { name: '纯钻时间(h)', value: vals.pureDrilling },
    { name: '起下钻时间(h)', value: vals.tripping },
    { name: '进尺工作时间(h)', value: vals.footage },
    { name: '建井周期(h)', value: vals.wellCycle }
  ]
}
async function loadCost() {
  const uK = new URL('/api/dashboard/cost/kpis', window.location.origin)
  uK.searchParams.set('projectId', String(projectId.value))
  const rK = await fetch(uK.toString())
  costKpis.value = await rK.json()
}
async function loadRevenue() {
  const u = new URL('/api/dashboard/revenue/summary', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  const res = await fetch(u.toString())
  const d = await res.json()
  revenueRows.value = d?.rows || []
  const total = Number(d?.total || 0)
  const aggCost = Number(d?.aggregatedCost || 0)
  const workValue = revenueRows.value.reduce((s: number, r: any) => s + Number(r.totalWorkValueUSD || 0), 0)
  const cash = revenueRows.value.reduce((s: number, r: any) => s + Number(r.cashAmountUSD || 0), 0)
  const footageMeters = revenueRows.value.filter(r => String(r.unit || '') === '米').reduce((s: number, r: any) => s + Number(r.actualWorkload || 0), 0)
  revenueFields.value = [
    { name: '项目总收入(USD)', value: formatMoney(total) },
    { name: '项目利润率(%)', value: Number(((total>0?((total - aggCost)/total):0)*100).toFixed(2)) },
    { name: '价值工作量(USD)', value: formatMoney(workValue) },
    { name: '开票未回款金额(USD)', value: formatMoney(Math.max(0, cash - total)) },
    { name: '已收现金额(USD)', value: formatMoney(cash) },
    { name: '百元成本收入', value: Number(((aggCost>0?(total/aggCost):0)*100).toFixed(2)) },
    { name: '每米成本(USD)', value: formatMoney(footageMeters>0 ? (aggCost/footageMeters) : 0) },
    { name: '每米进尺收入(USD)', value: formatMoney(footageMeters>0 ? (total/footageMeters) : 0) }
  ]
}
async function loadAlerts() {
  const u = new URL('/api/dashboard/alerts/records', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  u.searchParams.set('status', 'active')
  const res = await fetch(u.toString())
  alertRecords.value = await res.json()
}

function renderProgress() {
  if (progressRadarRef.value && !progressRadarChart) progressRadarChart = echarts.init(progressRadarRef.value)
  if (progressCyclePieRef.value && !progressCyclePieChart) progressCyclePieChart = echarts.init(progressCyclePieRef.value)
  if (progressEffPieRef.value && !progressEffPieChart) progressEffPieChart = echarts.init(progressEffPieRef.value)
  const d = progressData.value || {}
  const labels = ['生产时间达成率','非生产时效控制率','中完时间达成率','纯钻时效','起下钻时效','合同时间利用率']
  const vals = [0,0,0,0,0,0]
  const radarEmpty = vals.every(v => Number(v) === 0)
  progressRadarChart?.setOption({
    tooltip:{ trigger:'item' },
    radar:{ indicator: labels.map(l=>({ name:l, max:5 })) },
    series:[{ type:'radar', data:[{ value: vals }] }],
    graphic: radarEmpty ? [{ type:'text', left:'center', top:'center', style:{ text:'暂无数据', fill:'#94a3b8', fontSize:16, fontWeight:600 } }] : []
  })
  const mv = Number(d.movingCycleTime||0), dv = Number(d.drillingCycleTime||0), cv = Number(d.completionCycleTime||0), tv = Number(d.testingCycleTime||0)
  const cycleTotal = mv + dv + cv + tv
  progressCyclePieChart?.setOption({
    tooltip:{ trigger:'item', formatter:'{b}: {c}h ({d}%)' }, legend:{ top:0 },
    series:[{ type:'pie', radius:['40%','65%'], data:[{ name:'搬安周期', value: mv },{ name:'钻井周期', value: dv },{ name:'完井周期', value: cv },{ name:'测试周期', value: tv }] }],
    graphic: cycleTotal === 0 ? [{ type:'text', left:'center', top:'center', style:{ text:'暂无数据', fill:'#94a3b8', fontSize:16, fontWeight:600 } }] : []
  })
  const prod = Number(d.drillingProductionTime||0), non = Number(d.drillingNonProductionTime||0)
  const effTotal = prod + non
  progressEffPieChart?.setOption({
    tooltip:{ trigger:'item', formatter:'{b}: {c}h ({d}%)' }, legend:{ top:0 },
    series:[{ type:'pie', radius:['40%','65%'], data:[{ name:'生产时间', value: prod },{ name:'非生产时间', value: non }] }],
    graphic: effTotal === 0 ? [{ type:'text', left:'center', top:'center', style:{ text:'暂无数据', fill:'#94a3b8', fontSize:16, fontWeight:600 } }] : []
  })
}
function renderCost() {
  if (costRadarRef.value && !costRadarChart) costRadarChart = echarts.init(costRadarRef.value)
  if (costPieRef.value && !costPieChart) costPieChart = echarts.init(costPieRef.value)
  const uRadar = new URL('/api/dashboard/cost/sixRadar', window.location.origin)
  uRadar.searchParams.set('projectId', String(projectId.value))
  fetch(uRadar.toString()).then(r=>r.json()).then(d=>{
    const labels = ['材料控制','人工控制','设备控制','服务控制','任务总成本控制','间接成本占比']
    if (!d?.ok) {
      costRadarChart?.setOption({ tooltip:{ trigger:'item' }, radar:{ indicator: labels.map(l=>({ name:l, max:5 })) }, series:[{ type:'radar', data:[{ value:[0,0,0,0,0,0] }] }], graphic:[{ type:'text', left:'center', top:'center', style:{ text:'数据不足', fill:'#94a3b8', fontSize:16, fontWeight:600 } }] })
      return
    }
    const vals = [d.scores.materials, d.scores.labor, d.scores.equipment, d.scores.services, d.scores.taskTotal, d.scores.indirectRatio]
    const empty = vals.every(v => Number(v||0) === 0)
    costRadarChart?.setOption({ tooltip:{ trigger:'item' }, radar:{ indicator: labels.map(l=>({ name:l, max:5 })) }, series:[{ type:'radar', data:[{ value: vals }] }], graphic: empty ? [{ type:'text', left:'center', top:'center', style:{ text:'暂无数据', fill:'#94a3b8', fontSize:16, fontWeight:600 } }] : [] })
  })
  const uSum = new URL('/api/dashboard/cost/summary', window.location.origin)
  uSum.searchParams.set('projectId', String(projectId.value))
  fetch(uSum.toString()).then(r=>r.json()).then(d=>{
    const cats = d?.chart?.categories || []
    const vals = d?.chart?.values || []
    const seriesData = cats.map((c: string, i: number) => ({ name: c, value: vals[i] || 0 }))
    const total = vals.reduce((s:number,v:number)=>s+Number(v||0),0)
    costPieChart?.setOption({ tooltip:{ trigger:'item', formatter:'{b}: {c} ({d}%)' }, series:[{ type:'pie', radius:['40%','65%'], data: seriesData }], graphic: total === 0 ? [{ type:'text', left:'center', top:'center', style:{ text:'暂无数据', fill:'#94a3b8', fontSize:16, fontWeight:600 } }] : [] })
  })
}
function renderRevenue() {
  if (revRadarRef.value && !revRadarChart) revRadarChart = echarts.init(revRadarRef.value)
  const labels = ['收入计划完成率','价值工作量完成计划','收入确认时间差','进度偏差指数','回款指数','现金流指数']
  revRadarChart?.setOption({ tooltip:{ trigger:'item' }, radar:{ indicator: labels.map(l=>({ name:l, max:5 })) }, series:[{ type:'radar', data:[{ value:[0,0,0,0,0,0] }] }], graphic:[{ type:'text', left:'center', top:'center', style:{ text:'暂无数据', fill:'#94a3b8', fontSize:16, fontWeight:600 } }] })
  if (revPieRef.value && !revPieChart) revPieChart = echarts.init(revPieRef.value)
  if (revWorkPieRef.value && !revWorkPieChart) revWorkPieChart = echarts.init(revWorkPieRef.value)
  const inner = new Map<string, number>()
  const outer: Array<{ name: string; value: number }> = []
  for (const r of revenueRows.value) {
    const wn = String(r.wellNo || '')
    const tn = String(r.taskName || r.item || '')
    const amt = Number(r.amount || 0)
    if (wn) inner.set(wn, (inner.get(wn) || 0) + amt)
    if (wn && tn) outer.push({ name: `${wn}-${tn}`, value: amt })
  }
  const innerData = Array.from(inner.entries()).map(([name, value]) => ({ name, value }))
  const totalIncome = innerData.reduce((s:number, d:any)=>s+Number(d.value||0),0)
  revPieChart?.setOption({ tooltip:{ trigger:'item', formatter:'{b}: {c} ({d}%)' }, legend:{ top:0, type:'scroll' }, series:[{ type:'pie', radius:['32%','46%'], data: innerData },{ type:'pie', radius:['52%','72%'], data: outer }], graphic: totalIncome === 0 ? [{ type:'text', left:'center', top:'center', style:{ text:'暂无数据', fill:'#94a3b8', fontSize:16, fontWeight:600 } }] : [] })
  const inner2 = new Map<string, number>()
  const outer2: Array<{ name: string; value: number }> = []
  for (const r of revenueRows.value) {
    const wn = String(r.wellNo || '')
    const tn = String(r.taskName || r.item || '')
    const val = Number(r.totalWorkValueUSD || 0)
    if (wn) inner2.set(wn, (inner2.get(wn) || 0) + val)
    if (wn && tn) outer2.push({ name: `${wn}-${tn}`, value: val })
  }
  const innerData2 = Array.from(inner2.entries()).map(([name, value]) => ({ name, value }))
  const totalWork = innerData2.reduce((s:number, d:any)=>s+Number(d.value||0),0)
  revWorkPieChart?.setOption({ tooltip:{ trigger:'item', formatter:'{b}: {c} ({d}%)' }, legend:{ top:0, type:'scroll' }, series:[{ type:'pie', radius:['32%','46%'], data: innerData2 },{ type:'pie', radius:['52%','72%'], data: outer2 }], graphic: totalWork === 0 ? [{ type:'text', left:'center', top:'center', style:{ text:'暂无数据', fill:'#94a3b8', fontSize:16, fontWeight:600 } }] : [] })
}
function renderAlerts() {
  if (alertSevRef.value) {
    const chart = echarts.init(alertSevRef.value)
    const sevCount: Record<string, number> = {}
    const typeCount: Record<string, number> = {}
    const dateCount: Record<string, number> = {}
    for (const r of alertRecords.value) {
      const s = r.severity || 'unknown'; sevCount[s] = (sevCount[s] || 0) + 1
      const t = r.alertType || 'unknown'; typeCount[t] = (typeCount[t] || 0) + 1
      const d = String(r.createdAt || '').slice(0, 10); if (d) dateCount[d] = (dateCount[d] || 0) + 1
    }
    const sevKeys = Object.keys(sevCount)
    const sev = sevKeys.map(k => ({ name: (k === 'warning' ? '警告' : k === 'critical' ? '严重' : '未知'), value: sevCount[k] }))
    chart.setOption({ title: { text: '严重程度分布' }, tooltip: {}, series: [{ type: 'pie', data: sev }] })
  }
  if (alertTypeRef.value) {
    const chart = echarts.init(alertTypeRef.value)
    const typeCount: Record<string, number> = {}
    for (const r of alertRecords.value) { const t = r.alertType || 'unknown'; typeCount[t] = (typeCount[t] || 0) + 1 }
    const keys = Object.keys(typeCount)
    const types = keys.map(k => ({ progress:'进度', cost:'成本', revenue:'收入' } as any)[k] || k)
    const vals = keys.map(k => typeCount[k])
    chart.setOption({ title: { text: '类型统计' }, tooltip: {}, xAxis: { type: 'category', data: types }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: vals }] })
  }
  if (alertTrendRef.value) {
    const chart = echarts.init(alertTrendRef.value)
    const dateCount: Record<string, number> = {}
    for (const r of alertRecords.value) { const d = String(r.createdAt || '').slice(0, 10); if (d) dateCount[d] = (dateCount[d] || 0) + 1 }
    const dates = Object.keys(dateCount).sort()
    const vals = dates.map(k => dateCount[k])
    chart.setOption({ title: { text: '预警趋势' }, tooltip: {}, xAxis: { type: 'category', data: dates }, yAxis: { type: 'value' }, series: [{ type: 'line', data: vals }] })
  }
}

onMounted(async () => { await loadProjects(); await loadAll() })
watch(projectId, async () => { await loadAll() })
</script>

<style scoped>
.page-card { max-width: 1100px; margin: 0 auto; }
.toolbar { margin-bottom: 12px; display: flex; align-items: center; }
.ml8 { margin-left: 8px; }
.sub-title { font-weight: 600; margin-bottom: 8px; }
.radar { width: 100%; height: 320px; }
.pie { width: 100%; height: 320px; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
.kpi-title { font-size: 12px; color: #475569; }
.kpi-value { font-size: 18px; font-weight: 700; color: #0f172a; }
.info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.info-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
.info-name { color: #475569; font-weight: 600; }
.info-val { color: #0f172a; font-weight: 700; margin-top: 4px; }
.kanban { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.kanban-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
.kanban-name { color:#334155; font-weight:600; }
.kanban-value { color:#0f172a; font-weight:700; font-size: 18px; margin-top: 6px; }
.charts { display: flex; gap: 12px; margin-top: 12px; }
.chart { width: 300px; height: 220px; }
.chart.wide { width: 620px; }
.mt12 { margin-top: 12px; }
</style>