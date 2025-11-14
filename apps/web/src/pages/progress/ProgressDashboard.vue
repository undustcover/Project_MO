<template>
  <el-card shadow="never" class="page-card">
    <template #header>
      <div class="card-header">进度仪表盘</div>
    </template>
    <div class="toolbar">
      <el-select v-model="projectId" placeholder="选择项目" filterable style="width:340px" @change="loadTasks">
        <el-option v-for="p in projects" :key="p.id" :label="p.contractNo + '（' + (p.workloadText||'') + '）'" :value="p.id" />
      </el-select>
      <el-select v-model="taskName" placeholder="选择任务（可选）" clearable class="ml8" style="width:260px">
        <el-option v-for="t in tasks" :key="t" :label="t" :value="t" />
      </el-select>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" class="ml8" />
      <el-upload :action="uploadUrl" :show-file-list="false" :headers="{}" :data="{}" :on-success="onImportSuccess" :on-error="onImportError" accept=".xlsx,.xls" class="ml8">
        <el-button type="success">导入Excel</el-button>
      </el-upload>
      <a class="ml8" href="/progress_template.csv" download>下载模板</a>
      <el-button type="primary" class="ml8" @click="load">刷新</el-button>
    </div>
    <el-row :gutter="12">
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">六维雷达图</div>
          <div ref="radarRef" class="radar"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
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
          <div class="sub-title">合同指标录入</div>
          <div class="form-grid">
            <el-input-number v-model="contract.productionTime" :min="0" :step="0.1" placeholder="合同生产时间(小时)" />
            <el-input-number v-model="contract.nonProductionTime" :min="0" :step="0.1" placeholder="合同非生产时间(小时)" />
            <el-input-number v-model="contract.completionTime" :min="0" :step="0.1" placeholder="合同中完时间(小时)" />
            <el-input-number v-model="contract.movingPeriod" :min="0" :step="0.1" placeholder="合同搬家周期(小时)" />
            <el-input-number v-model="contract.wellCompletionPeriod" :min="0" :step="0.1" placeholder="合同完井周期(小时)" />
            <el-input-number v-model="contract.drillingPeriod" :min="0" :step="0.1" placeholder="合同钻井周期(小时)" />
          </div>
          <el-button type="primary" class="mt12" @click="calculate">开始计算</el-button>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">评分明细</div>
          <el-table :data="scoresTable" size="small" border>
            <el-table-column prop="name" label="维度" />
            <el-table-column prop="score" label="得分(0-5)" />
          </el-table>
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
          <div class="sub-title">任务进度对比（生产/非生产时效）</div>
          <div class="dim-bar">
            <el-segmented v-model="dimension" :options="[{label:'二级时效',value:'level2'},{label:'三级时效',value:'level3'}]" />
            <div class="ml8"><el-switch v-model="stacked" active-text="堆叠" inactive-text="分组" /></div>
          </div>
          <div ref="barRef" class="bar"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">任务详细表</div>
          <el-table :data="taskRows" size="small" border>
            <el-table-column prop="wellNumber" label="井号" width="120" />
            <el-table-column prop="level2" label="二级时效" />
            <el-table-column prop="level3" label="三级时效" />
            <el-table-column prop="hours" label="小时" width="100" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getProjects, getProgressDashboard, getProgressTasks, getProgressTaskDetail } from '../../services/api'
import { getProgressTaskBreakdown } from '../../services/api'
const projects = ref<any[]>([])
const projectId = ref<number>()
const taskName = ref('')
const tasks = ref<string[]>([])
const dateRange = ref<any>(null)
const data = ref<any>(null)
const radarRef = ref<HTMLDivElement | null>(null)
const barRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null
const dimension = ref<'level2' | 'level3'>('level2')

async function loadProjects() {
  projects.value = await getProjects()
  if (projects.value.length && !projectId.value) projectId.value = projects.value[0].id
}
async function loadTasks() {
  tasks.value = projectId.value ? await getProgressTasks(projectId.value) : []
}
async function load() {
  if (!projectId.value) return
  const from = Array.isArray(dateRange.value) && dateRange.value[0] ? formatDate(dateRange.value[0]) : undefined
  const to = Array.isArray(dateRange.value) && dateRange.value[1] ? formatDate(dateRange.value[1]) : undefined
  data.value = await getProgressDashboard({ projectId: projectId.value, taskName: taskName.value || undefined, from, to })
  await loadTaskDetail()
  await loadTaskBreakdown()
  render()
}
function render() {
  if (!radarRef.value || !data.value) return
  if (!chart) chart = echarts.init(radarRef.value)
  const d = data.value
  const raw = [
    scores.productionRate,
    scores.nonProductionRate,
    scores.midCompletion,
    scores.drillingEfficiency,
    scores.trippingEfficiency,
    scores.contractUtilization
  ]
  const labels = ['生产时间达成率', '非生产时效控制率', '中完时间达成率', '纯钻时效', '起下钻时效', '合同时间利用率']
  const maxVal = Math.max(...raw, 10)
  const indicators = labels.map(() => ({ name: '', max: 5 }))
  const option = {
    tooltip: {},
    radar: {
      indicator: indicators,
      axisName: { color: '#333' },
      splitLine: { lineStyle: { color: ['#ddd'] } },
      splitArea: { areaStyle: { color: ['#f9fbff', '#fff'] } }
    },
    series: [{ type: 'radar', data: [{ value: raw, name: '评分' }] }],
    title: { text: labels.join(' / '), left: 'center', textStyle: { fontSize: 12, color: '#666' } }
  }
  chart.setOption(option)
  renderBar()
}
const metricsTable = ref<any[]>([])
watch(data, () => {
  const d = data.value || {}
  metricsTable.value = [
    { name: '生产时效(h)', value: d.drillingProductionTime || 0 },
    { name: '非生产时效(h)', value: d.drillingNonProductionTime || 0 },
    { name: '中完时间(h)', value: d.actualCompletionTime || 0 },
    { name: '纯钻时间(h)', value: d.pureDrillingTime || 0 },
    { name: '起下钻时间(h)', value: d.trippingTime || 0 },
    { name: '进尺工作时间(h)', value: d.footageWorkingTime || 0 }
  ]
})
const contract = ref({
  productionTime: 0,
  nonProductionTime: 0,
  completionTime: 0,
  movingPeriod: 0,
  wellCompletionPeriod: 0,
  drillingPeriod: 0
})
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
function calculate() {
  const d = data.value || {}
  const c = contract.value
  const prodBase = c.productionTime > 0 ? Math.abs((Number(d.drillingProductionTime || 0) - c.productionTime) / c.productionTime * 100) : 0
  scores.value.productionRate = prodBase <= 0.5 ? 5 : prodBase <= 1 ? 4 : prodBase <= 3 ? 3 : prodBase <= 5 ? 2 : prodBase <= 10 ? 1 : 0
  const ratioA = Number(d.drillingCycleTime || 0) > 0 ? (Number(d.drillingNonProductionTime || 0) / Number(d.drillingCycleTime || 0)) * 100 : 0
  const aScore = ratioA <= 0.3 ? 5 : ratioA <= 0.5 ? 4 : ratioA <= 0.8 ? 3 : ratioA <= 1.0 ? 2 : ratioA <= 2 ? 1 : 0
  const ratioB = c.nonProductionTime > 0 ? (Number(d.drillingNonProductionTime || 0) / c.nonProductionTime) * 100 : 0
  const bScore = ratioB <= 60 ? 5 : ratioB <= 70 ? 4 : ratioB < 80 ? 3 : ratioB < 90 ? 2 : ratioB <= 100 ? 1 : 0
  scores.value.nonProductionRate = Number((aScore * 0.35 + bScore * 0.65).toFixed(2))
  const midRate = c.completionTime > 0 ? (Number(d.actualCompletionTime || 0) / c.completionTime) * 100 : 0
  scores.value.midCompletion = midRate <= 60 ? 5 : midRate <= 70 ? 4 : midRate <= 80 ? 3 : midRate <= 90 ? 2 : midRate <= 100 ? 1 : 0
  const drillEff = Number(d.drillingCycleTime || 0) > 0 ? (Number(d.pureDrillingTime || 0) / Number(d.drillingCycleTime || 0)) * 100 : 0
  scores.value.drillingEfficiency = drillEff >= 50 ? 5 : drillEff >= 40 ? 4 : drillEff >= 35 ? 3 : drillEff >= 30 ? 2 : drillEff >= 20 ? 1 : 0
  const tripEff = Number(d.footageWorkingTime || 0) > 0 ? (Number(d.trippingTime || 0) / Number(d.footageWorkingTime || 0)) * 100 : 0
  scores.value.trippingEfficiency = tripEff <= 10 ? 5 : tripEff <= 15 ? 4 : tripEff <= 20 ? 3 : tripEff <= 25 ? 2 : tripEff <= 30 ? 1 : 0
  const moveRate = c.movingPeriod > 0 ? (Number(d.movingCycleTime || 0) / c.movingPeriod) * 100 : 0
  const moveScore = moveRate <= 60 ? 5 : moveRate <= 70 ? 4 : moveRate <= 80 ? 3 : moveRate <= 90 ? 2 : moveRate <= 100 ? 1 : 0
  const drillTimeRate = c.drillingPeriod > 0 ? ((Number(d.drillingCycleTime || 0) - c.drillingPeriod) / c.drillingPeriod) * 100 : 0
  const drillTimeScore = drillTimeRate <= 1 ? 5 : drillTimeRate <= 3 ? 4 : drillTimeRate <= 5 ? 3 : drillTimeRate <= 7 ? 2 : drillTimeRate <= 10 ? 1 : 0
  const compTimeRate = c.wellCompletionPeriod > 0 ? ((Number(d.completionCycleTime || 0) - c.wellCompletionPeriod) / c.wellCompletionPeriod) * 100 : 0
  const compTimeScore = compTimeRate <= 1 ? 5 : compTimeRate <= 3 ? 4 : compTimeRate <= 5 ? 3 : compTimeRate <= 7 ? 2 : compTimeRate <= 10 ? 1 : 0
  scores.value.contractUtilization = Number((moveScore * 0.125 + drillTimeScore * 0.625 + compTimeScore * 0.25).toFixed(2))
  scoresTable.value = [
    { name: '生产时间达成率', score: scores.value.productionRate },
    { name: '非生产时效控制率', score: scores.value.nonProductionRate },
    { name: '中完时间达成率', score: scores.value.midCompletion },
    { name: '纯钻时效', score: scores.value.drillingEfficiency },
    { name: '起下钻时效', score: scores.value.trippingEfficiency },
    { name: '合同时间利用率', score: scores.value.contractUtilization }
  ]
  overallScore.value = Number(((scores.value.productionRate + scores.value.nonProductionRate + scores.value.midCompletion + scores.value.drillingEfficiency + scores.value.trippingEfficiency + scores.value.contractUtilization) / 6).toFixed(2))
  render()
}
onMounted(async () => {
  await loadProjects()
  await loadTasks()
  await load()
  window.addEventListener('resize', () => chart && chart.resize())
  window.addEventListener('resize', () => barChart && barChart.resize())
  updateUploadUrl()
})

const taskRows = ref<any[]>([])
const taskDetail = ref<any>(null)
async function loadTaskDetail() {
  if (!projectId.value || !taskName.value) { taskRows.value = []; taskDetail.value = null; return }
  const from = Array.isArray(dateRange.value) && dateRange.value[0] ? formatDate(dateRange.value[0]) : undefined
  const to = Array.isArray(dateRange.value) && dateRange.value[1] ? formatDate(dateRange.value[1]) : undefined
  const d = await getProgressTaskDetail({ projectId: projectId.value, taskName: taskName.value, from, to })
  taskDetail.value = d
  taskRows.value = d?.breakdown || []
}
watch(taskName, async () => { await load(); calculate() })

function renderBar() {
  if (!barRef.value) return
  if (!barChart) barChart = echarts.init(barRef.value)
  const cats = breakdown.value.categories || []
  const prodArr = breakdown.value.production || []
  const nonArr = breakdown.value.nonProduction || []
  const option = {
    tooltip: {},
    legend: { data: ['生产时效', '非生产时效'] },
    xAxis: { type: 'category', data: cats },
    yAxis: { type: 'value' },
    series: [
      { name: '生产时效', type: 'bar', data: prodArr, stack: stacked.value ? 'total' : undefined },
      { name: '非生产时效', type: 'bar', data: nonArr, stack: stacked.value ? 'total' : undefined }
    ]
  }
  barChart.setOption(option)
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
function updateUploadUrl() {
  uploadUrl.value = `/api/dashboard/progress/import?projectId=${projectId.value || ''}`
}
watch(projectId, () => { updateUploadUrl() })
function onImportSuccess(res: any) {
  if (res?.ok) {
    ElMessage.success(`导入成功：${res.count} 条`)
    load(); loadTasks()
  } else {
    ElMessage.error(res?.error || '导入失败')
  }
}
function onImportError() {
  ElMessage.error('导入失败，请检查文件格式或列顺序')
}
async function loadTaskBreakdown() {
  if (!projectId.value || !taskName.value) { breakdown.value = { categories: [], production: [], nonProduction: [] }; return }
  const from = Array.isArray(dateRange.value) && dateRange.value[0] ? formatDate(dateRange.value[0]) : undefined
  const to = Array.isArray(dateRange.value) && dateRange.value[1] ? formatDate(dateRange.value[1]) : undefined
  const d = await getProgressTaskBreakdown({ projectId: projectId.value, taskName: taskName.value, from, to })
  const part = dimension.value === 'level2' ? d?.byLevel2 : d?.byLevel3
  breakdown.value = part || { categories: [], production: [], nonProduction: [] }
}
watch(dimension, async () => { await loadTaskBreakdown(); renderBar() })
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
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.overall { margin-top: 12px; font-weight: 600; }
.overall-score { color: #409eff; }
</style>