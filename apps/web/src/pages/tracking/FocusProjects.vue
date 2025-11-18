<template>
  <el-card shadow="never" class="page-card">
    <template #header><div class="card-header">重点项目</div></template>
    <div class="toolbar">
      <el-upload :action="uploadUrl" :show-file-list="false" :on-success="onImportSuccess" :on-error="onImportError" accept=".xlsx,.xls" class="ml8">
        <el-button type="success">导入重点项目</el-button>
      </el-upload>
      <el-tooltip content="下载重点项目模板" placement="top">
        <a class="icon-btn ml8" :href="focusTemplateUrl" download="focus_template.xlsx" aria-label="下载重点项目模板">
          <svg class="icon" viewBox="0 0 24 24"><path d="M12 3a1 1 0 011 1v8.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L11 12.586V4a1 1 0 011-1zm-7 14a1 1 0 011-1h12a1 1 0 011 1v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2z"/></svg>
        </a>
      </el-tooltip>
    </div>
    <el-row :gutter="12" class="mt12">
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">项目区域占比</div>
          <div ref="regionRef" class="pie"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">执行主体占比</div>
          <div ref="executorRef" class="pie"></div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12" class="mt12">
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">开钻年度占比</div>
          <div ref="spudYearRef" class="pie"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">业主单位占比</div>
          <div ref="ownerRef" class="pie"></div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12" class="mt12">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">合同金额占比</div>
          <div ref="amountRef" class="pie"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" class="mt12">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">重点项目列表</div>
          <el-table :data="rows" size="small" border height="640">
            <el-table-column prop="region" label="项目区域" />
            <el-table-column label="项目名称">
              <template #default="{ row }">
                <el-popover trigger="click" placement="top" width="420">
                  <template #reference>
                    <el-link type="primary">{{ row.projectName }}</el-link>
                  </template>
                  <div class="popover-list">
                    <div class="popover-item"><span class="k">合同编号</span><span class="v">{{ displayText(row.contractNo) }}</span></div>
                    <div class="popover-item"><span class="k">合同金额(万美元)</span><span class="v">{{ displayAmount(row.contractAmountUSD) }}</span></div>
                    <div class="popover-item"><span class="k">合同开始日期</span><span class="v">{{ displayText(row.contractStartDate) }}</span></div>
                    <div class="popover-item"><span class="k">合同结束日期</span><span class="v">{{ displayText(row.contractEndDate) }}</span></div>
                    <div class="popover-item"><span class="k">业主单位</span><span class="v">{{ displayText(row.ownerUnit) }}</span></div>
                  </div>
                </el-popover>
              </template>
            </el-table-column>
            <el-table-column prop="executor" label="执行主体" />
            <el-table-column prop="projectTerm" label="项目期限" />
            <el-table-column label="开钻详情">
              <template #default="{ row }">
                <el-popover trigger="click" placement="top" width="360">
                  <template #reference>
                    <el-link type="primary">查看详情</el-link>
                  </template>
                  <div class="popover-list">
                    <div class="popover-item"><span class="k">预计开钻时间</span><span class="v">{{ row.estimatedSpudDate }}</span></div>
                    <div class="popover-item"><span class="k">首井开钻时间</span><span class="v">{{ row.firstWellSpudTime }}</span></div>
                  </div>
                </el-popover>
              </template>
            </el-table-column>
            <el-table-column label="市场国别">
              <template #default="{ row }">{{ row.region }}</template>
            </el-table-column>
            <el-table-column label="队伍编号">
              <template #default="{ row }">
                <el-popover trigger="click" placement="top" width="420">
                  <template #reference>
                    <el-link type="primary">{{ row.rigNo }}</el-link>
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
            <el-table-column label="重点关注事项">
              <template #default="{ row }">
                <el-popover trigger="click" placement="top" width="420">
                  <template #reference>
                    <el-link type="primary">查看详情</el-link>
                  </template>
                  <div class="popover-list">
                    <div class="popover-item"><span class="k">事项</span><span class="v">{{ row.focusItems }}</span></div>
                    <div class="popover-item"><span class="k">已完成价值工作量</span><span class="v">{{ row.workValueDone }}</span></div>
                    <div class="popover-item"><span class="k">今年预计完成工作量</span><span class="v">{{ row.expectedWorkThisYear }}</span></div>
                  </div>
                </el-popover>
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
import { ref, onMounted, computed, nextTick, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { getTrackingFocusList } from '../../services/api'
import { useRoute } from 'vue-router'

const route = useRoute()
const projectId = ref<number>()
const rows = ref<any[]>([])
const uploadUrl = ref('')
const focusTemplateUrl = computed(() => {
  const u = new URL('/api/dashboard/tracking/focus/template', window.location.origin)
  if (projectId.value) u.searchParams.set('projectId', String(projectId.value))
  return u.toString()
})

const regionRef = ref<HTMLDivElement | null>(null)
let regionChart: echarts.ECharts | null = null
const executorRef = ref<HTMLDivElement | null>(null)
let executorChart: echarts.ECharts | null = null
const spudYearRef = ref<HTMLDivElement | null>(null)
let spudYearChart: echarts.ECharts | null = null
const ownerRef = ref<HTMLDivElement | null>(null)
let ownerChart: echarts.ECharts | null = null
const amountRef = ref<HTMLDivElement | null>(null)
let amountChart: echarts.ECharts | null = null
const palette = ['#60a5fa', '#c084fc', '#f472b6', '#22d3ee', '#34d399', '#f59e0b', '#ef4444', '#a3e635', '#14b8a6', '#8b5cf6', '#fb7185', '#10b981']

function updateUploadUrl() {
  const u = new URL('/api/dashboard/tracking/focus/import', window.location.origin)
  if (projectId.value) u.searchParams.set('projectId', String(projectId.value))
  uploadUrl.value = u.toString()
}
async function load() {
  projectId.value = Number(route.query.projectId || '') || undefined
  if (!projectId.value) return
  updateUploadUrl()
  const data = await getTrackingFocusList(projectId.value)
  rows.value = data.rows || []
  await nextTick()
  renderRegion()
  renderExecutor()
  renderSpudYear()
  renderOwner()
  renderAmount()
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

onMounted(async () => { await load(); window.addEventListener('resize', onResize) })
onBeforeUnmount(() => { window.removeEventListener('resize', onResize) })

function groupCount(arr: any[], pick: (r: any) => string) {
  const m = new Map<string, number>()
  for (const r of arr) {
    const k = String(pick(r) || '').trim() || '未录入信息'
    m.set(k, (m.get(k) || 0) + 1)
  }
  return Array.from(m.entries()).map(([name, value]) => ({ name, value }))
}

function renderSimplePie(refEl: any, inst: any, data: Array<{ name: string; value: number }>) {
  if (!refEl.value) return
  if (!inst.value) inst.value = echarts.init(refEl.value)
  inst.value.setOption({ tooltip: { trigger: 'item' }, color: palette, legend: { show: false }, series: [{ type: 'pie', radius: ['40%', '70%'], avoidLabelOverlap: true, labelLayout: { hideOverlap: true }, labelLine: { length: 12, length2: 8 }, label: { show: true, position: 'outside', formatter: '{b}\n{c} ({d}%)', fontSize: 12 }, data }] })
}

function renderRegion() { const data = groupCount(rows.value, r => r.region); renderSimplePie(regionRef, { value: regionChart }, data) }
function renderExecutor() { const data = groupCount(rows.value, r => r.executor); renderSimplePie(executorRef, { value: executorChart }, data) }
function renderOwner() { const data = groupCount(rows.value, r => r.ownerUnit); renderSimplePie(ownerRef, { value: ownerChart }, data) }

function renderAmount() {
  if (!amountRef.value) return
  if (!amountChart) amountChart = echarts.init(amountRef.value)
  const buckets = [
    { name: '2000万以下', value: 0 },
    { name: '2000-5000万', value: 0 },
    { name: '5000万-1亿', value: 0 },
    { name: '1亿以上', value: 0 }
  ]
  for (const r of rows.value) {
    const v = r.contractAmountUSD != null && r.contractAmountUSD !== '' ? Number(r.contractAmountUSD) : NaN
    if (!isNaN(v)) {
      if (v < 2000) buckets[0].value++
      else if (v < 5000) buckets[1].value++
      else if (v < 10000) buckets[2].value++
      else buckets[3].value++
    }
  }
  const data = buckets
  amountChart.setOption({
    tooltip: { trigger: 'item' },
    color: palette,
    legend: { show: false },
    series: [{ type: 'pie', radius: ['40%', '70%'], avoidLabelOverlap: true, labelLayout: { hideOverlap: true }, labelLine: { length: 12, length2: 8 }, label: { show: true, position: 'outside', formatter: '{b}\n{c} ({d}%)', fontSize: 12 }, data }]
  })
}

function renderSpudYear() {
  const years: Record<string, number> = {}
  const takeYear = (s: any) => { const str = String(s || '').trim(); if (!str) return null; const m = str.match(/^(\d{4})/) || str.match(/\b(\d{4})\b/); return m ? m[1] : null }
  for (const r of rows.value) {
    const y1 = takeYear(r.estimatedSpudDate)
    const y2 = takeYear(r.firstWellSpudTime)
    if (y1) years[y1] = (years[y1] || 0) + 1
    if (y2) years[y2] = (years[y2] || 0) + 1
  }
  const data = Object.keys(years).length ? Object.entries(years).map(([name, value]) => ({ name, value })) : [{ name: '未录入信息', value: rows.value.length || 0 }]
  renderSimplePie(spudYearRef, { value: spudYearChart }, data)
}

function onResize() { regionChart && regionChart.resize(); executorChart && executorChart.resize(); spudYearChart && spudYearChart.resize(); ownerChart && ownerChart.resize(); amountChart && amountChart.resize() }

function displayText(v: any) { const s = String(v ?? '').trim(); return s ? s : '未录入信息' }
function displayAmount(v: any) { const n = v != null && v !== '' ? Number(v) : NaN; return isNaN(n) ? '未录入信息' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) }
</script>

<style scoped>
.toolbar { display: flex; align-items: center }
.ml8 { margin-left: 8px }
.card-header { font-weight: 600 }
.mt12 { margin-top: 12px }
.sub-title { font-weight: 600; margin-bottom: 8px }
.icon-btn { display: inline-flex; align-items: center }
.icon { width: 18px; height: 18px; fill: currentColor }
.pie { height: 360px }
.popover-list { display:flex; flex-direction:column; gap:8px }
.popover-item { display:flex; align-items:center; justify-content:space-between; gap:12px }
.popover-item .k { color:#64748b }
.popover-item .v { color:#0f172a }
.popover-item .k::after { content:'：'; margin:0 6px; color:#64748b }
</style>