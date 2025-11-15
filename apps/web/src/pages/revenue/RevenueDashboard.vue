<template>
  <el-card shadow="never" class="page-card">
    <template #header><div class="card-header">收入仪表盘</div></template>
    <div class="toolbar">
      <el-select v-model="projectId" placeholder="选择项目" filterable style="width:300px" @change="load">
        <el-option v-for="p in projects" :key="p.id" :label="p.contractNo" :value="p.id" />
      </el-select>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" class="ml8" />
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
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">收入来源分布</div>
          <div ref="pieRef" class="pie"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">收入列表</div>
          <el-table :data="rows" size="small" border>
            <el-table-column prop="source" label="来源" />
            <el-table-column prop="item" label="项目" />
            <el-table-column prop="amount" label="金额" />
            <el-table-column prop="date" label="日期" />
            <el-table-column prop="remark" label="备注" />
          </el-table>
          <div class="overall">合计：<span class="overall-score">{{ total.toFixed(2) }}</span></div>
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

async function loadProjects() {
  projects.value = await getProjects()
  if (projects.value.length && !projectId.value) projectId.value = projects.value[0].id
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
  const res = await fetch(u.toString())
  const data = await res.json()
  rows.value = data.rows || []
  total.value = data.total || 0
  renderPie(data.chart?.categories || [], data.chart?.values || [])
}
function renderPie(cats: string[] = [], vals: number[] = []) {
  if (!pieRef.value) return
  if (!pieChart) pieChart = echarts.init(pieRef.value)
  const seriesData = cats.map((c, i) => ({ name: c, value: vals[i] || 0 }))
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{ type: 'pie', radius: ['40%', '65%'], data: seriesData }]
  })
}
function onImportSuccess(res: any) { if (res?.ok) { ElMessage.success(`导入成功：${res.count} 条`); load() } else { ElMessage.error(res?.error || '导入失败') } }
function onImportError() { ElMessage.error('导入失败，请检查模板与列顺序') }
function updateUploadUrl() { uploadUrl.value = `/api/dashboard/revenue/import?projectId=${projectId.value || ''}` }
function formatDate(d: any) { const dt = new Date(d); const y = dt.getFullYear(); const m = String(dt.getMonth()+1).padStart(2,'0'); const da = String(dt.getDate()).padStart(2,'0'); return `${y}-${m}-${da}` }
function exportPDF() { window.print() }
onMounted(async () => { await loadProjects(); await load() })
</script>

<style scoped>
.page-card { max-width: 1100px; margin: 0 auto; }
.toolbar { margin-bottom: 12px; display: flex; align-items: center; }
.ml8 { margin-left: 8px; }
.sub-title { font-weight: 600; margin-bottom: 8px; }
.pie { width: 100%; height: 360px; }
.icon-btn { display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:8px; background:#f1f5f9; border:1px solid #e2e8f0; transition:all .2s; }
.icon { width:18px; height:18px; fill:#334155; }
.overall { margin-top: 12px; font-weight: 600; }
.overall-score { color: #2f88ff; }
</style>