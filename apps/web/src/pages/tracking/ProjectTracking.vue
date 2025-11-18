<template>
  <el-card shadow="never" class="page-card">
    <template #header><div class="card-header">项目跟踪</div></template>
    <div class="toolbar">
      <el-upload :action="uploadUrl" :show-file-list="false" :on-success="onImportSuccess" :on-error="onImportError" accept=".xlsx,.xls" class="ml8">
        <el-button type="success">导入追踪表</el-button>
      </el-upload>
      <el-tooltip content="下载模板" placement="top">
        <a class="icon-btn ml8" href="/api/dashboard/tracking/template" download="tracking_template.xlsx" aria-label="下载模板">
          <svg class="icon" viewBox="0 0 24 24"><path d="M12 3a1 1 0 011 1v8.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L11 12.586V4a1 1 0 011-1zm-7 14a1 1 0 011-1h12a1 1 0 011 1v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2z"/></svg>
        </a>
      </el-tooltip>
      <el-button type="primary" class="ml8" @click="openFocus">重点项目</el-button>
    </div>

  <el-row :gutter="12" class="mt12">
    <el-col :span="12">
      <el-card shadow="hover">
        <div class="sub-title">钻井动用情况双圆盘</div>
        <div class="legend-bar">
          <button class="legend-btn" @click="scrollLegend('usage-inner', -1)">◀</button>
          <div class="legend-row" :id="'usage-inner'">
            <div v-for="it in usageInnerLegend" :key="it.name" class="legend-item">
              <span class="legend-dot" :style="{ background: it.color }"></span>
              <span class="legend-text">{{ it.name }}：{{ it.value }}</span>
            </div>
          </div>
          <button class="legend-btn" @click="scrollLegend('usage-inner', 1)">▶</button>
        </div>
        <div class="legend-bar">
          <button class="legend-btn" @click="scrollLegend('usage-outer', -1)">◀</button>
          <div class="legend-row" :id="'usage-outer'">
            <div v-for="it in usageOuterLegend" :key="it.name" class="legend-item">
              <span class="legend-dot" :style="{ background: it.color }"></span>
              <span class="legend-text">{{ it.name }}：{{ it.value }}</span>
            </div>
          </div>
          <button class="legend-btn" @click="scrollLegend('usage-outer', 1)">▶</button>
        </div>
        <div ref="usageRef" class="pie"></div>
      </el-card>
    </el-col>
    <el-col :span="12">
      <el-card shadow="hover">
        <div class="sub-title">执行主体圆盘</div>
        <div class="legend-bar">
          <button class="legend-btn" @click="scrollLegend('executor', -1)">◀</button>
          <div class="legend-row" :id="'executor'">
            <div v-for="it in executorLegend" :key="it.name" class="legend-item">
              <span class="legend-dot" :style="{ background: it.color }"></span>
              <span class="legend-text">{{ it.name }}：{{ it.value }}</span>
            </div>
          </div>
          <button class="legend-btn" @click="scrollLegend('executor', 1)">▶</button>
        </div>
        <div ref="executorRef" class="pie"></div>
      </el-card>
    </el-col>
  </el-row>
  <el-row :gutter="12" class="mt12">
    <el-col :span="12">
      <el-card shadow="hover">
        <div class="sub-title">钻机型号圆盘</div>
        <div class="legend-bar">
          <button class="legend-btn" @click="scrollLegend('model', -1)">◀</button>
          <div class="legend-row" :id="'model'">
            <div v-for="it in modelLegend" :key="it.name" class="legend-item">
              <span class="legend-dot" :style="{ background: it.color }"></span>
              <span class="legend-text">{{ it.name }}：{{ it.value }}</span>
            </div>
          </div>
          <button class="legend-btn" @click="scrollLegend('model', 1)">▶</button>
        </div>
        <div ref="modelRef" class="pie"></div>
      </el-card>
    </el-col>
    <el-col :span="12">
      <el-card shadow="hover">
        <div class="sub-title">业主单位圆盘</div>
        <div class="legend-bar">
          <button class="legend-btn" @click="scrollLegend('owner', -1)">◀</button>
          <div class="legend-row" :id="'owner'">
            <div v-for="it in ownerLegend" :key="it.name" class="legend-item">
              <span class="legend-dot" :style="{ background: it.color }"></span>
              <span class="legend-text">{{ it.name }}：{{ it.value }}</span>
            </div>
          </div>
          <button class="legend-btn" @click="scrollLegend('owner', 1)">▶</button>
        </div>
        <div ref="ownerRef" class="pie"></div>
      </el-card>
    </el-col>
  </el-row>
  <el-row :gutter="12" class="mt12">
    <el-col :span="12">
      <el-card shadow="hover">
        <div class="sub-title">合同占比</div>
        <div class="legend-bar">
          <button class="legend-btn" @click="scrollLegend('contract', -1)">◀</button>
          <div class="legend-row" :id="'contract'">
            <div v-for="it in contractLegend" :key="it.name" class="legend-item">
              <span class="legend-dot" :style="{ background: it.color }"></span>
              <span class="legend-text">{{ it.name }}：{{ it.value }}</span>
            </div>
          </div>
          <button class="legend-btn" @click="scrollLegend('contract', 1)">▶</button>
        </div>
        <div ref="contractRef" class="pie"></div>
      </el-card>
    </el-col>
    <el-col :span="12">
      <el-card shadow="hover">
        <div class="sub-title">钻机新旧占比</div>
        <div class="legend-bar">
          <button class="legend-btn" @click="scrollLegend('age', -1)">◀</button>
          <div class="legend-row" :id="'age'">
            <div v-for="it in ageLegend" :key="it.name" class="legend-item">
              <span class="legend-dot" :style="{ background: it.color }"></span>
              <span class="legend-text">{{ it.name }}：{{ it.value }}</span>
            </div>
          </div>
          <button class="legend-btn" @click="scrollLegend('age', 1)">▶</button>
        </div>
        <div ref="ageRef" class="pie"></div>
      </el-card>
    </el-col>
  </el-row>

    <el-row :gutter="12" class="mt12">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">45天内到期合同</div>
          <el-table :data="expiringContracts" size="small" border>
            <el-table-column prop="contractNo" label="合同编号" />
            <el-table-column prop="rigNo" label="钻机编号" />
            <el-table-column prop="teamNo" label="队伍编号" />
            <el-table-column prop="contractEndDate" label="结束日期" />
            <el-table-column label="剩余天数">
              <template #default="{ row }">{{ row.daysRemaining }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" class="mt12">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">详情列表</div>
          <el-table :data="tableRows" size="small" border height="640">
            <el-table-column prop="marketCountry" label="市场国别" />
            <el-table-column prop="indexNo" label="序号" />
            <el-table-column label="队伍编号">
              <template #default="{ row }">
                <el-popover trigger="click" placement="top" width="420">
                  <template #reference>
                    <el-link type="primary">{{ row.teamNo }}</el-link>
                  </template>
                  <div class="popover-list">
                    <div class="popover-item"><span class="k">队伍新编号</span><span class="v">{{ row.teamNewNo }}</span></div>
                    <div class="popover-item"><span class="k">钻机编号</span><span class="v">{{ row.rigNo }}</span></div>
                    <div class="popover-item"><span class="k">钻机型号</span><span class="v">{{ row.rigModel }}</span></div>
                    <div class="popover-item"><span class="k">生产厂家</span><span class="v">{{ row.manufacturer }}</span></div>
                    <div class="popover-item"><span class="k">投产日期</span><span class="v">{{ row.productionDate }}</span></div>
                  </div>
                </el-popover>
              </template>
            </el-table-column>
            <el-table-column label="执行主体">
              <template #default="{ row }">
                <el-popover trigger="click" placement="top" width="420">
                  <template #reference>
                    <el-link type="primary">{{ row.executor }}</el-link>
                  </template>
                  <div class="popover-list">
                    <div class="popover-item"><span class="k">联络人1</span><span class="v">{{ row.contact1 }}</span></div>
                    <div class="popover-item"><span class="k">联络人2</span><span class="v">{{ row.contact2 }}</span></div>
                  </div>
                </el-popover>
              </template>
            </el-table-column>
            <el-table-column label="项目名称">
              <template #default="{ row }">
                <el-popover trigger="click" placement="top" width="420">
                  <template #reference>
                    <el-link type="primary">{{ row.projectName }}</el-link>
                  </template>
                  <div class="popover-list">
                    <div class="popover-item"><span class="k">项目昵称</span><span class="v">{{ row.projectNickname }}</span></div>
                    <div class="popover-item"><span class="k">合同编号</span><span class="v">{{ row.contractNo }}</span></div>
                    <div class="popover-item"><span class="k">合同金额(万美元)</span><span class="v">{{ formatMoney(row.contractAmountUSD) }}</span></div>
                    <div class="popover-item"><span class="k">合同开始日期</span><span class="v">{{ row.contractStartDate }}</span></div>
                    <div class="popover-item"><span class="k">合同结束日期</span><span class="v">{{ row.contractEndDate }}</span></div>
                    <div class="popover-item"><span class="k">业主单位</span><span class="v">{{ row.ownerUnit }}</span></div>
                  </div>
                </el-popover>
              </template>
            </el-table-column>
            <el-table-column label="井队动态">
              <template #default="{ row }">
                <el-popover trigger="click" placement="top" width="420">
                  <template #reference>
                    <el-tag size="small">{{ row.teamStatus }}</el-tag>
                  </template>
                  <div class="popover-list">
                    <div class="popover-item"><span class="k">施工情况</span><span class="v">{{ row.constructionStatus }}</span></div>
                    <div class="popover-item"><span class="k">下轮市场</span><span class="v">{{ row.nextMarketPlan }}</span></div>
                    <div class="popover-item"><span class="k">备注说明</span><span class="v">{{ row.remark }}</span></div>
                  </div>
                </el-popover>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <template v-if="isFocused(row)">
                  <el-button size="small" type="success" disabled>重点关注</el-button>
                  <el-button size="small" type="danger" class="ml8" @click="unFocus(row)">删除重点</el-button>
                </template>
                <template v-else-if="!row.projectName">
                  <el-button size="small" disabled>设为重点</el-button>
                  <el-button size="small" type="danger" class="ml8" disabled>删除重点</el-button>
                </template>
                <template v-else>
                  <el-button size="small" type="primary" @click="markFocus(row)">设为重点</el-button>
                  <el-button size="small" type="danger" class="ml8" disabled>删除重点</el-button>
                </template>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { getProjects, getTrackingSummary, getTrackingTable, setTrackingFocus, getTrackingFocusList, deleteTrackingFocus } from '../../services/api'
import { useRouter } from 'vue-router'

const projects = ref<any[]>([])
const projectId = ref<number>()
const uploadUrl = ref('')

const usageRef = ref<HTMLDivElement | null>(null)
let usageChart: echarts.ECharts | null = null
const executorRef = ref<HTMLDivElement | null>(null)
let executorChart: echarts.ECharts | null = null
const modelRef = ref<HTMLDivElement | null>(null)
let modelChart: echarts.ECharts | null = null
const ownerRef = ref<HTMLDivElement | null>(null)
let ownerChart: echarts.ECharts | null = null
const contractRef = ref<HTMLDivElement | null>(null)
let contractChart: echarts.ECharts | null = null
const ageRef = ref<HTMLDivElement | null>(null)
let ageChart: echarts.ECharts | null = null

const summary = ref<any>(null)
const expiringContracts = ref<any[]>([])
const tableRows = ref<any[]>([])
const focusedByName = ref<Set<string>>(new Set())
const focusedByContract = ref<Set<string>>(new Set())
const usageOuterLegend = ref<Array<{ name: string; value: number; color: string }>>([])
const usageInnerLegend = ref<Array<{ name: string; value: number; color: string }>>([])
const executorLegend = ref<Array<{ name: string; value: number; color: string }>>([])
const modelLegend = ref<Array<{ name: string; value: number; color: string }>>([])
const ownerLegend = ref<Array<{ name: string; value: number; color: string }>>([])
const contractLegend = ref<Array<{ name: string; value: number; color: string }>>([])
const ageLegend = ref<Array<{ name: string; value: number; color: string }>>([])
const palette = ['#60a5fa', '#c084fc', '#f472b6', '#22d3ee', '#34d399', '#f59e0b', '#ef4444', '#a3e635', '#14b8a6', '#8b5cf6', '#fb7185', '#10b981']

async function loadProjects() {
  projects.value = await getProjects()
  if (projects.value.length && !projectId.value) projectId.value = projects.value[0].id
  updateUploadUrl()
}

function updateUploadUrl() {
  const u = new URL('/api/dashboard/tracking/import', window.location.origin)
  if (projectId.value) u.searchParams.set('projectId', String(projectId.value))
  uploadUrl.value = u.toString()
}

async function load() {
  if (!projectId.value) return
  updateUploadUrl()
  summary.value = await getTrackingSummary(projectId.value)
  const table = await getTrackingTable(projectId.value)
  tableRows.value = table.rows || []
  expiringContracts.value = summary.value?.expiringContracts || []
  const fl = await getTrackingFocusList(projectId.value)
  const names = new Set<string>()
  const cons = new Set<string>()
  for (const r of fl.rows || []) { const pn = String(r.projectName || '').trim(); const cn = String(r.contractNo || '').trim(); if (pn) names.add(pn); if (cn) cons.add(cn) }
  focusedByName.value = names
  focusedByContract.value = cons
  await nextTick()
  renderUsage()
  renderExecutor()
  renderModel()
  renderOwner()
  renderContract()
  renderAge()
}

function onImportSuccess(resp: any) {
  let r = resp
  try { if (typeof resp === 'string') r = JSON.parse(resp) } catch {}
  if (r && r.ok) { ElMessage.success('导入成功'); load() }
  else {
    const msg = r?.error || '导入失败'
    const det = Array.isArray(r?.details) ? r.details.slice(0, 10).map((d: any) => `第${d.row}行${d.colName}(${d.cell})：${d.reason}`).join('；') : ''
    ElMessage.error(det ? `${msg}：${det}` : msg)
  }
}
function onImportError(err: any) {
  let msg = '导入失败'
  try { const r = JSON.parse(err?.message || '{}'); msg = r?.error || msg } catch {}
  ElMessage.error(msg)
}

function formatMoney(v: any) { const num = Number(v || 0); return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) }
const router = useRouter()
function openFocus() {
  const pid = projectId.value ? String(projectId.value) : ''
  router.push({ path: '/tracking/focus', query: pid ? { projectId: pid } : {} })
}
async function markFocus(row: any) {
  if (!projectId.value) return
  const payload: any = {}
  if (row?.projectName) payload.projectName = String(row.projectName)
  else if (row?.contractNo) payload.contractNo = String(row.contractNo)
  else return
  const ok = await setTrackingFocus(projectId.value, payload)
  if (ok) ElMessage.success('已设为重点关注项目')
  else ElMessage.error('设为重点失败：请检查项目名称或合同编号是否已录入')
  if (ok) {
    if (payload.projectName) focusedByName.value.add(payload.projectName)
    if (payload.contractNo) focusedByContract.value.add(payload.contractNo)
  }
}

function isFocused(row: any) {
  const pn = String(row?.projectName || '').trim()
  const cn = String(row?.contractNo || '').trim()
  return (pn && focusedByName.value.has(pn)) || (cn && focusedByContract.value.has(cn))
}

async function unFocus(row: any) {
  if (!projectId.value) return
  const payload: any = {}
  const pn = String(row?.projectName || '').trim()
  const cn = String(row?.contractNo || '').trim()
  if (pn) payload.projectName = pn; else if (cn) payload.contractNo = cn; else return
  const ok = await deleteTrackingFocus(projectId.value, payload)
  if (ok) {
    if (pn) focusedByName.value.delete(pn)
    if (cn) focusedByContract.value.delete(cn)
    ElMessage.success('已取消重点关注')
  } else {
    ElMessage.error('取消重点失败')
  }
}

function renderUsage() {
  if (!usageRef.value) return
  if (!usageChart) usageChart = echarts.init(usageRef.value)
  const used = Number(summary.value?.statusUsage?.usedCount || 0)
  const unused = Number(summary.value?.statusUsage?.unusedCount || 0)
  const statusCounts = (summary.value?.statusUsage?.statusCounts || []).filter((x: any) => x.count > 0)
  const outer = [
    { name: `动用钻机${used}台`, value: used },
    { name: `未动用钻机${unused}台`, value: unused }
  ]
  const inner = statusCounts.map((s: any) => ({ name: `${s.status}${s.count}台`, value: s.count }))
  usageOuterLegend.value = outer.map((d, i) => ({ ...d, color: palette[i % palette.length] }))
  usageInnerLegend.value = inner.map((d, i) => ({ ...d, color: palette[i % palette.length] }))
  usageChart.setOption({
    tooltip: { trigger: 'item' },
    color: palette,
    legend: { show: false },
    series: [
      { type: 'pie', radius: ['50%', '70%'], center: ['50%', '50%'], avoidLabelOverlap: true, labelLayout: { hideOverlap: true }, labelLine: { length: 12, length2: 8 }, label: { show: true, position: 'outside', formatter: '{b}\n{c} ({d}%)', fontSize: 12 }, data: usageOuterLegend.value.map((d: any) => ({ ...d })) },
      { type: 'pie', radius: ['25%', '45%'], center: ['50%', '50%'], avoidLabelOverlap: true, labelLayout: { hideOverlap: true }, labelLine: { length: 10, length2: 6 }, label: { show: true, position: 'outside', formatter: '{b}\n{c} ({d}%)', fontSize: 12 }, data: usageInnerLegend.value.map((d: any) => ({ ...d })) }
    ]
  })
}

function renderSimplePie(chartRef: any, instRef: any, data: Array<{ name: string; count: number }>, title?: string, legendStore?: any) {
  if (!chartRef.value) return
  if (!instRef.value) {} // noop
  const chart = (instRef as any)
  if (!chart.value) chart.value = echarts.init(chartRef.value)
  const seriesData = data.map((d, i) => ({ name: d.name, value: d.count }))
  const legendData = seriesData.map((d: any, i: number) => ({ name: d.name, value: d.value, color: palette[i % palette.length] }))
  if (legendStore) legendStore.value = legendData
  chart.value.setOption({ tooltip: { trigger: 'item' }, color: palette, legend: { show: false }, series: [{ type: 'pie', radius: ['40%', '70%'], avoidLabelOverlap: true, labelLayout: { hideOverlap: true }, labelLine: { length: 12, length2: 8 }, label: { show: true, position: 'outside', formatter: '{b}\n{c} ({d}%)', fontSize: 12 }, data: legendData.map((d: any) => ({ ...d })) }] })
}

function renderExecutor() { renderSimplePie(executorRef, { value: executorChart }, summary.value?.executorDistribution || [], undefined, executorLegend) }
function renderModel() { renderSimplePie(modelRef, { value: modelChart }, summary.value?.rigModelDistribution || [], undefined, modelLegend) }
function renderOwner() { renderSimplePie(ownerRef, { value: ownerChart }, summary.value?.ownerDistribution || [], undefined, ownerLegend) }

function renderContract() {
  if (!contractRef.value) return
  if (!contractChart) contractChart = echarts.init(contractRef.value)
  const cats = summary.value?.contractShare?.categories || []
  const vals = summary.value?.contractShare?.values || []
  const data = cats.map((c: string, i: number) => ({ name: c, value: Number(vals[i] || 0) }))
  contractLegend.value = data.map((d: any, i: number) => ({ name: d.name, value: d.value, color: palette[i % palette.length] }))
  contractChart.setOption({ tooltip: { trigger: 'item' }, color: palette, legend: { show: false }, series: [{ type: 'pie', radius: ['40%', '70%'], avoidLabelOverlap: true, labelLayout: { hideOverlap: true }, labelLine: { length: 12, length2: 8 }, label: { show: true, position: 'outside', formatter: '{b}\n{c} ({d}%)', fontSize: 12 }, data: contractLegend.value.map((d: any) => ({ ...d })) }] })
}

function renderAge() {
  if (!ageRef.value) return
  if (!ageChart) ageChart = echarts.init(ageRef.value)
  const data = (summary.value?.ageDistribution || []).map((d: any) => ({ name: d.range, value: d.count }))
  ageLegend.value = data.map((d: any, i: number) => ({ name: d.name, value: d.value, color: palette[i % palette.length] }))
  ageChart.setOption({ tooltip: { trigger: 'item' }, color: palette, legend: { show: false }, series: [{ type: 'pie', radius: ['40%', '70%'], avoidLabelOverlap: true, labelLayout: { hideOverlap: true }, labelLine: { length: 12, length2: 8 }, label: { show: true, position: 'outside', formatter: '{b}\n{c} ({d}%)', fontSize: 12 }, data: ageLegend.value.map((d: any) => ({ ...d })) }] })
}

onMounted(async () => {
  await loadProjects()
  await load()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => { window.removeEventListener('resize', onResize) })

function onResize() {
  usageChart && usageChart.resize()
  executorChart && executorChart.resize()
  modelChart && modelChart.resize()
  ownerChart && ownerChart.resize()
  contractChart && contractChart.resize()
  ageChart && ageChart.resize()
}

function scrollLegend(id: string, dir: number) {
  const el = document.getElementById(id)
  if (!el) return
  const w = el.clientWidth
  el.scrollLeft += dir * Math.max(240, Math.round(w * 0.6))
}
</script>

<style scoped>
.toolbar { display: flex; align-items: center }
.ml8 { margin-left: 8px }
.card-header { font-weight: 600 }
.pie { height: 360px }
.mt12 { margin-top: 12px }
.sub-title { font-weight: 600; margin-bottom: 8px }
.icon-btn { display: inline-flex; align-items: center }
.icon { width: 18px; height: 18px; fill: currentColor }
.legend-bar { display:flex; align-items:center; gap:8px; margin-bottom:4px }
.legend-row { display:flex; align-items:center; gap:12px; overflow:hidden; white-space:nowrap; flex:1 }
.legend-item { display:inline-flex; align-items:center; gap:6px; padding:2px 8px; border-radius:999px; background:#f1f5f9; color:#334155; font-size:12px }
.legend-dot { width:10px; height:10px; border-radius:50% }
.legend-btn { border:1px solid #e2e8f0; background:#fff; color:#334155; border-radius:6px; padding:2px 8px; cursor:pointer }
.popover-list { display:flex; flex-direction:column; gap:8px }
.popover-item { display:flex; align-items:center; justify-content:space-between; gap:12px }
.popover-item .k { color:#64748b }
.popover-item .v { color:#0f172a }
</style>