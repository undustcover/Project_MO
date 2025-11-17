<template>
  <el-card shadow="never" class="page-card">
    <template #header><div class="card-header">预警中心</div></template>
    <div class="toolbar">
      <el-select v-model="projectId" placeholder="选择项目" filterable style="width:300px" @change="load">
        <el-option v-for="p in projects" :key="p.id" :label="p.contractNo" :value="p.id" />
      </el-select>
      <el-button type="primary" class="ml8" @click="newRuleVisible=true">新增规则</el-button>
      <el-button class="ml8" @click="exportPDF">导出PDF</el-button>
      <el-button type="success" class="ml8" @click="triggerCheck">触发检查</el-button>
      <el-select v-model="typeFilter" placeholder="类型" class="ml8" style="width:160px" @change="loadRecords">
        <el-option label="全部" value="" />
        <el-option label="进度" value="progress" />
        <el-option label="成本" value="cost" />
        <el-option label="收入" value="revenue" />
      </el-select>
      <el-select v-model="sevFilter" placeholder="级别" class="ml8" style="width:160px" @change="loadRecords">
        <el-option label="全部" value="" />
        <el-option label="警告" value="warning" />
        <el-option label="严重" value="critical" />
      </el-select>
      <el-date-picker v-model="range" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" class="ml8" @change="loadRecords" />
      <el-select v-model="compareProjectId" placeholder="对比项目" class="ml8" style="width:200px" @change="loadRecords">
        <el-option v-for="p in projects" :key="p.id" :label="p.contractNo" :value="p.id" />
      </el-select>
      <router-link to="/alerts/configs"><el-button class="ml8">配置页面</el-button></router-link>
    </div>
    <el-row :gutter="12">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">规则列表</div>
          <el-table :data="rules" size="small" border>
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="condition" label="条件" />
            <el-table-column prop="level" label="级别" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">预警记录</div>
          <div class="ops">
            <el-input v-model="noteText" placeholder="备注(可选)" class="mr8" style="width:260px" />
            <el-button size="small" type="primary" @click="batchResolve">批量标记已解决</el-button>
            <el-button size="small" @click="batchIgnore" class="ml8">批量忽略</el-button>
            <el-button size="small" class="ml8" @click="recordsCollapsed = !recordsCollapsed">{{ recordsCollapsed ? '展开记录' : '折叠记录' }}</el-button>
          </div>
          <el-table v-show="!recordsCollapsed" :data="pagedRecords" size="small" border height="360" @row-dblclick="openDetail" @selection-change="onSelection">
            <el-table-column type="selection" width="44" />
            <el-table-column prop="projectName" label="项目" />
            <el-table-column prop="alertTypeText" label="类型" />
            <el-table-column prop="alertItem" label="预警项" />
            <el-table-column prop="severityText" label="级别" />
            <el-table-column prop="message" label="消息" />
            <el-table-column prop="statusText" label="状态" />
            <el-table-column label="操作" width="220">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="markResolved(row)">标记已解决</el-button>
                <el-button size="small" @click="markIgnored(row)" class="ml8">忽略</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-show="!recordsCollapsed" class="table-footer">
            <el-pagination
              background
              layout="prev, pager, next, sizes, total"
              :page-size="pageSize"
              :page-sizes="[10,20,50,100]"
              :total="records.length"
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
            />
          </div>
          <div class="charts">
            <div ref="severityChart" class="chart"></div>
            <div ref="typeChart" class="chart"></div>
            <div ref="trendChart" class="chart wide"></div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">历史记录</div>
          <div class="ops">
            <el-button size="small" type="danger" @click="batchDeleteHistory">批量删除</el-button>
          </div>
          <el-table :data="historyPaged" size="small" border height="320" @selection-change="onHistorySelection">
            <el-table-column type="selection" width="44" />
            <el-table-column prop="projectName" label="项目" />
            <el-table-column prop="alertTypeText" label="类型" />
            <el-table-column prop="alertItem" label="预警项" />
            <el-table-column prop="severityText" label="级别" />
            <el-table-column prop="message" label="消息" />
            <el-table-column prop="statusText" label="状态" />
            <el-table-column label="操作" width="160">
              <template #default="{ row }">
                <el-button size="small" type="danger" @click="deleteHistory(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="table-footer">
            <el-pagination
              background
              layout="prev, pager, next, sizes, total"
              :page-size="historyPageSize"
              :page-sizes="[10,20,50,100]"
              :total="historyRecords.length"
              v-model:current-page="historyPage"
              v-model:page-size="historyPageSize"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-dialog v-model="newRuleVisible" title="新增规则" width="520">
      <el-form label-width="100px">
        <el-form-item label="名称"><el-input v-model="newRule.name" /></el-form-item>
        <el-form-item label="条件"><el-input v-model="newRule.condition" /></el-form-item>
        <el-form-item label="级别"><el-select v-model="newRule.level"><el-option label="高" value="high" /><el-option label="中" value="medium" /><el-option label="低" value="low" /></el-select></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="newRuleVisible=false">取消</el-button>
        <el-button type="primary" @click="saveRule">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="configVisible" title="预警阈值配置" size="520px">
      <div class="sub-title">当前项目配置(缺省继承全局)</div>
      <div class="ops">
        <el-radio-group v-model="scopeMode" class="mr8">
          <el-radio-button label="project">项目</el-radio-button>
          <el-radio-button label="global">全局</el-radio-button>
        </el-radio-group>
        <el-button size="small" @click="reloadScope">加载配置</el-button>
        <el-select v-if="scopeMode==='project'" v-model="configProjectId" placeholder="选择项目" filterable style="width:240px" class="ml8">
          <el-option v-for="p in projects" :key="p.id" :label="p.contractNo" :value="p.id" />
        </el-select>
        <div class="ml8">
          <span>自动检查间隔(分钟)</span>
          <el-input-number v-model="intervalMinutes" :min="1" :max="1440" class="ml8" />
          <el-button size="small" class="ml8" @click="saveInterval">应用</el-button>
        </div>
      </div>
      <el-form label-width="140px">
        <el-form-item label="进度-计划逾期(天)">
          <el-input-number v-model="cfg.progressLate.warn" :min="-999999" />
          <span class="ml8">警告</span>
          <el-input-number v-model="cfg.progressLate.crit" :min="-999999" class="ml8" />
          <span class="ml8">严重</span>
        </el-form-item>
        <el-form-item label="成本-超支(%)">
          <el-input-number v-model="cfg.costOver.warn" :min="-999999" />
          <span class="ml8">警告</span>
          <el-input-number v-model="cfg.costOver.crit" :min="-999999" class="ml8" />
          <span class="ml8">严重</span>
        </el-form-item>
        <el-form-item label="收入-确认延误(天)">
          <el-input-number v-model="cfg.revenueConfirm.warn" :min="-999999" />
          <span class="ml8">警告</span>
          <el-input-number v-model="cfg.revenueConfirm.crit" :min="-999999" class="ml8" />
          <span class="ml8">严重</span>
        </el-form-item>
        <el-form-item label="收入-收现逾期(天)">
          <el-input-number v-model="cfg.arOverdue.warn" :min="-999999" />
          <span class="ml8">警告</span>
          <el-input-number v-model="cfg.arOverdue.crit" :min="-999999" class="ml8" />
          <span class="ml8">严重</span>
        </el-form-item>
      </el-form>
      <div class="sub-title">配置列表</div>
      <div class="ops">
        <el-select v-model="newCfg.alertType" placeholder="类型" style="width:140px" class="mr8">
          <el-option label="进度" value="progress" />
          <el-option label="成本" value="cost" />
          <el-option label="收入" value="revenue" />
        </el-select>
        <el-input v-model="newCfg.alertItem" placeholder="预警项" style="width:160px" class="mr8" />
        <el-select v-model="newCfg.thresholdType" placeholder="类型单位" style="width:140px" class="mr8">
          <el-option label="天" value="days" />
          <el-option label="百分比" value="percentage" />
        </el-select>
        <el-input-number v-model="newCfg.warningThreshold" :min="-999999" class="mr8" />
        <el-input-number v-model="newCfg.criticalThreshold" :min="-999999" class="mr8" />
        <el-switch v-model="newCfg.isActive" active-text="启用" inactive-text="停用" class="mr8" />
        <el-button size="small" type="primary" @click="addConfig">新增</el-button>
      </div>
      <el-table :data="cfgList" size="small" border>
        <el-table-column label="类型">
          <template #default="{ row }">
            <el-tag>{{ typeText(row.alertType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="项">
          <template #default="{ row }">
            <el-input v-model="row.alertItem" />
          </template>
        </el-table-column>
        <el-table-column label="警告">
          <template #default="{ row }">
            <el-input-number v-model="row.warningThreshold" :min="-999999" />
          </template>
        </el-table-column>
        <el-table-column label="严重">
          <template #default="{ row }">
            <el-input-number v-model="row.criticalThreshold" :min="-999999" />
          </template>
        </el-table-column>
        <el-table-column label="类型单位">
          <template #default="{ row }">
            <el-select v-model="row.thresholdType" style="width:140px">
              <el-option label="天" value="days" />
              <el-option label="百分比" value="percentage" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="启用">
          <template #default="{ row }">
            <el-switch v-model="row.isActive" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="saveConfigRow(row)">保存</el-button>
            <el-button size="small" type="danger" class="ml8" @click="deleteConfigRow(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="configVisible=false">取消</el-button>
        <el-button type="primary" @click="saveConfigs">保存</el-button>
      </template>
    </el-drawer>

    <el-dialog v-model="detailVisible" title="预警详情" width="640">
      <pre class="detail-json">{{ detailText }}</pre>
      <template #footer>
        <el-button @click="detailVisible=false">关闭</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getProjects } from '../../services/api'
import * as echarts from 'echarts'

const projects = ref<any[]>([])
const projectId = ref<number>()
const rules = ref<any[]>([])
const events = ref<any[]>([])
const records = ref<any[]>([])
const typeFilter = ref<string>('')
const sevFilter = ref<string>('')
const selected = ref<any[]>([])
const noteText = ref('')
const configVisible = ref(false)
const cfg = ref({
  progressLate: { warn: 3, crit: 7 },
  costOver: { warn: 10, crit: 20 },
  revenueConfirm: { warn: 15, crit: 30 },
  arOverdue: { warn: 30, crit: 60 }
})
const severityChart = ref<HTMLDivElement>()
const typeChart = ref<HTMLDivElement>()
const trendChart = ref<HTMLDivElement>()
const range = ref<[Date, Date] | null>(null)
const compareProjectId = ref<number | null>(null)
const detailVisible = ref(false)
const detailText = ref('')
const newRuleVisible = ref(false)
const newRule = ref({ name: '', condition: '', level: 'medium' })
const recordsCollapsed = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return records.value.slice(start, start + pageSize.value)
})
const historyRecords = ref<any[]>([])
const historySelected = ref<any[]>([])
const historyPage = ref(1)
const historyPageSize = ref(20)
const historyPaged = computed(() => {
  const start = (historyPage.value - 1) * historyPageSize.value
  return historyRecords.value.slice(start, start + historyPageSize.value)
})
const scopeMode = ref<'project' | 'global'>('project')
const cfgList = ref<any[]>([])
const configProjectId = ref<number | null>(null)
const newCfg = ref<any>({ alertType: 'progress', alertItem: '', thresholdType: 'days', warningThreshold: 0, criticalThreshold: 0, isActive: true })
function typeText(t: string) { const map: Record<string, string> = { progress: '进度', cost: '成本', revenue: '收入' }; return map[t] || t }

async function loadProjects() { projects.value = await getProjects(); if (projects.value.length && !projectId.value) projectId.value = projects.value[0].id }
async function load() {
  if (!projectId.value) return
  const u = new URL('/api/dashboard/alerts', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  const res = await fetch(u.toString())
  const data = await res.json()
  rules.value = data.rules || []
  events.value = data.events || []
  await loadRecords()
  await loadHistory()
}
async function saveRule() {
  const u = new URL('/api/dashboard/alerts/rules', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  const res = await fetch(u.toString(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRule.value) })
  const data = await res.json()
  if (data?.ok) { ElMessage.success('规则已保存'); newRuleVisible.value = false; await load() } else { ElMessage.error(data?.error || '保存失败') }
}
function exportPDF() { window.print() }
async function loadRecords() {
  if (!projectId.value) return
  const u = new URL('/api/dashboard/alerts/records', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  u.searchParams.set('status', 'active')
  if (typeFilter.value) u.searchParams.set('type', typeFilter.value)
  if (sevFilter.value) u.searchParams.set('severity', sevFilter.value)
  if (range.value) { u.searchParams.set('from', formatDate(range.value[0])); u.searchParams.set('to', formatDate(range.value[1])) }
  const res = await fetch(u.toString())
  const arr = await res.json()
  records.value = arr.filter((r: any) => {
    const okType = !typeFilter.value || r.alertType === typeFilter.value
    const okSev = !sevFilter.value || r.severity === sevFilter.value
    return okType && okSev
  })
  await nextTick()
  const compareData = await loadCompare()
  renderCharts(compareData)
}
async function loadHistory() {
  if (!projectId.value) return
  const u1 = new URL('/api/dashboard/alerts/records', window.location.origin)
  u1.searchParams.set('projectId', String(projectId.value))
  u1.searchParams.set('status', 'resolved')
  const u2 = new URL('/api/dashboard/alerts/records', window.location.origin)
  u2.searchParams.set('projectId', String(projectId.value))
  u2.searchParams.set('status', 'ignored')
  const [r1, r2] = await Promise.all([fetch(u1.toString()), fetch(u2.toString())])
  const [a1, a2] = await Promise.all([r1.json(), r2.json()])
  historyRecords.value = [...a1, ...a2]
}
function formatDate(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day} 00:00:00` }
async function loadCompare() {
  if (!compareProjectId.value || compareProjectId.value === projectId.value) return null
  const u = new URL('/api/dashboard/alerts/records', window.location.origin)
  u.searchParams.set('projectId', String(compareProjectId.value))
  u.searchParams.set('status', 'active')
  if (typeFilter.value) u.searchParams.set('type', typeFilter.value)
  if (sevFilter.value) u.searchParams.set('severity', sevFilter.value)
  if (range.value) { u.searchParams.set('from', formatDate(range.value[0])); u.searchParams.set('to', formatDate(range.value[1])) }
  const res = await fetch(u.toString())
  return await res.json()
}
async function triggerCheck() {
  if (!projectId.value) return
  const u = new URL('/api/dashboard/alerts/check', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  const res = await fetch(u.toString(), { method: 'POST' })
  const data = await res.json()
  if (data?.ok) { ElMessage.success(`已生成${data.created}条预警`); await loadRecords() } else { ElMessage.error(data?.error || '触发失败') }
}
async function deleteHistory(row: any) {
  const u = new URL(`/api/dashboard/alerts/records/${row.id}`, window.location.origin)
  const res = await fetch(u.toString(), { method: 'DELETE' })
  const data = await res.json()
  if (data?.ok) { ElMessage.success('已删除'); await loadHistory() } else { ElMessage.error(data?.error || '删除失败') }
}
async function markResolved(row: any) {
  const u = new URL(`/api/dashboard/alerts/records/${row.id}/status`, window.location.origin)
  const res = await fetch(u.toString(), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'resolved', note: noteText.value || undefined }) })
  const data = await res.json()
  if (data?.ok) { ElMessage.success('已标记为已解决'); await loadRecords(); await loadHistory() } else { ElMessage.error(data?.error || '操作失败') }
}
async function markIgnored(row: any) {
  const u = new URL(`/api/dashboard/alerts/records/${row.id}/status`, window.location.origin)
  const res = await fetch(u.toString(), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ignored', note: noteText.value || undefined }) })
  const data = await res.json()
  if (data?.ok) { ElMessage.success('已忽略'); await loadRecords(); await loadHistory() } else { ElMessage.error(data?.error || '操作失败') }
}
function onSelection(rows: any[]) { selected.value = rows }
async function batchResolve() { for (const r of selected.value) await markResolved(r) }
async function batchIgnore() { for (const r of selected.value) await markIgnored(r) }
function openDetail(row: any) { detailText.value = JSON.stringify(row, null, 2); detailVisible.value = true }
function openConfigs() { configVisible.value = true; if (projectId.value) configProjectId.value = projectId.value; loadConfigs() }
function onHistorySelection(rows: any[]) { historySelected.value = rows }
async function batchDeleteHistory() { for (const r of historySelected.value) await deleteHistory(r) }
async function loadConfigs() {
  const u = new URL('/api/dashboard/alerts/configs', window.location.origin)
  if (scopeMode.value === 'project' && configProjectId.value) u.searchParams.set('projectId', String(configProjectId.value))
  const res = await fetch(u.toString())
  const arr = await res.json()
  cfgList.value = arr
  const find = (t: string, i: string) => arr.find((x: any) => x.alertType === t && x.alertItem === i)
  const p = find('progress', '计划逾期'); const c = find('cost', '成本超支'); const r1 = find('revenue', '收入确认延误'); const r2 = find('revenue', '应收账款逾期')
  if (p) cfg.value.progressLate = { warn: Number(p.warningThreshold || 3), crit: Number(p.criticalThreshold || 7) }
  if (c) cfg.value.costOver = { warn: Number(c.warningThreshold || 10), crit: Number(c.criticalThreshold || 20) }
  if (r1) cfg.value.revenueConfirm = { warn: Number(r1.warningThreshold || 15), crit: Number(r1.criticalThreshold || 30) }
  if (r2) cfg.value.arOverdue = { warn: Number(r2.warningThreshold || 30), crit: Number(r2.criticalThreshold || 60) }
}
async function saveConfigs() {
  const items = [
    { alertType: 'progress', alertItem: '计划逾期', thresholdType: 'days', warningThreshold: cfg.value.progressLate.warn, criticalThreshold: cfg.value.progressLate.crit },
    { alertType: 'cost', alertItem: '成本超支', thresholdType: 'percentage', warningThreshold: cfg.value.costOver.warn, criticalThreshold: cfg.value.costOver.crit },
    { alertType: 'revenue', alertItem: '收入确认延误', thresholdType: 'days', warningThreshold: cfg.value.revenueConfirm.warn, criticalThreshold: cfg.value.revenueConfirm.crit },
    { alertType: 'revenue', alertItem: '应收账款逾期', thresholdType: 'days', warningThreshold: cfg.value.arOverdue.warn, criticalThreshold: cfg.value.arOverdue.crit }
  ]
  const u = new URL('/api/dashboard/alerts/configs', window.location.origin)
  if (scopeMode.value === 'project' && configProjectId.value != null) u.searchParams.set('projectId', String(configProjectId.value))
  const res = await fetch(u.toString(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items) })
  const data = await res.json()
  if (data?.ok) { ElMessage.success('阈值已保存'); configVisible.value = false } else { ElMessage.error(data?.error || '保存失败') }
}
function reloadScope() { loadConfigs() }
const intervalMinutes = ref<number>(240)
async function loadInterval() {
  const res = await fetch('/api/dashboard/alerts/scheduler/interval')
  const data = await res.json()
  if (data?.intervalMinutes != null) intervalMinutes.value = Number(data.intervalMinutes)
}
async function saveInterval() {
  const res = await fetch('/api/dashboard/alerts/scheduler/interval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minutes: intervalMinutes.value }) })
  const data = await res.json()
  if (data?.ok) ElMessage.success('自动检查间隔已更新')
}
async function addConfig() {
  const u = new URL('/api/dashboard/alerts/configs/item', window.location.origin)
  if (scopeMode.value === 'project' && configProjectId.value != null) u.searchParams.set('projectId', String(configProjectId.value))
  const res = await fetch(u.toString(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCfg.value) })
  const data = await res.json()
  if (data?.ok) { ElMessage.success('已新增'); await loadConfigs() } else { ElMessage.error(data?.error || '新增失败') }
}
async function saveConfigRow(row: any) {
  const u = new URL(`/api/dashboard/alerts/configs/${row.id}`, window.location.origin)
  const body = { alertItem: row.alertItem, thresholdType: row.thresholdType, warningThreshold: row.warningThreshold, criticalThreshold: row.criticalThreshold, isActive: !!row.isActive }
  const res = await fetch(u.toString(), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json()
  if (data?.ok) { ElMessage.success('已保存') } else { ElMessage.error(data?.error || '保存失败') }
}
async function deleteConfigRow(row: any) {
  const u = new URL(`/api/dashboard/alerts/configs/${row.id}`, window.location.origin)
  const res = await fetch(u.toString(), { method: 'DELETE' })
  const data = await res.json()
  if (data?.ok) { ElMessage.success('已删除'); await loadConfigs() } else { ElMessage.error(data?.error || '删除失败') }
}
function renderCharts(compareData: any[] | null) {
  const sevCount: Record<string, number> = {}
  const typeCount: Record<string, number> = {}
  const dateCount: Record<string, number> = {}
  for (const r of records.value) {
    const s = r.severity || 'unknown'; sevCount[s] = (sevCount[s] || 0) + 1
    const t = r.alertType || 'unknown'; typeCount[t] = (typeCount[t] || 0) + 1
    const d = String(r.createdAt || '').slice(0, 10); if (d) dateCount[d] = (dateCount[d] || 0) + 1
  }
  const sevKeys = Object.keys(sevCount)
  const sev = sevKeys.map(k => ({ name: (k === 'warning' ? '警告' : k === 'critical' ? '严重' : '未知'), value: sevCount[k] }))
  const typeKeys = Object.keys(typeCount)
  const types = typeKeys.map(k => typeText(k))
  const typeVals = typeKeys.map(k => typeCount[k])
  const dates = Object.keys(dateCount).sort()
  const dateVals = dates.map(k => dateCount[k])
  if (severityChart.value) {
    const chart = echarts.init(severityChart.value)
    chart.setOption({ title: { text: '严重程度分布' }, tooltip: {}, series: [{ type: 'pie', data: sev }] })
  }
  if (typeChart.value) {
    const chart = echarts.init(typeChart.value)
    chart.setOption({ title: { text: '类型统计' }, tooltip: {}, xAxis: { type: 'category', data: types }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: typeVals }] })
  }
  if (trendChart.value) {
    const chart = echarts.init(trendChart.value)
    const series: any[] = [{ name: '当前项目', type: 'line', data: dateVals }]
    if (compareData) {
      const m: Record<string, number> = {}
      for (const r of compareData) { const d = String(r.createdAt || '').slice(0,10); if (d) m[d] = (m[d] || 0) + 1 }
      const vals = dates.map(k => m[k] || 0)
      series.push({ name: '对比项目', type: 'line', data: vals })
    }
    chart.setOption({ title: { text: '预警趋势' }, tooltip: {}, legend: {}, xAxis: { type: 'category', data: dates }, yAxis: { type: 'value' }, series })
  }
}
onMounted(async () => { await loadProjects(); await load() })
onMounted(async () => { await loadInterval() })
onMounted(async () => { await loadHistory() })
</script>

<style scoped>
.page-card { max-width: 1100px; margin: 0 auto; }
.toolbar { margin-bottom: 12px; display: flex; align-items: center; }
.ml8 { margin-left: 8px; }
.sub-title { font-weight: 600; margin-bottom: 8px; }
.ops { display: flex; align-items: center; margin-bottom: 8px; }
.mr8 { margin-right: 8px; }
.charts { display: flex; gap: 12px; margin-top: 12px; }
.chart { width: 300px; height: 220px; }
.chart.wide { width: 620px; }
.detail-json { white-space: pre-wrap; font-size: 12px; background: #f7f7f7; padding: 12px; border-radius: 8px; }
.table-footer { display: flex; justify-content: flex-end; margin-top: 8px; }
</style>