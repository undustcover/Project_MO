<template>
  <el-card shadow="never" class="page-card">
    <template #header><div class="card-header">预警配置</div></template>
    <div class="toolbar">
      <el-radio-group v-model="scopeMode" class="mr8">
        <el-radio-button label="project">项目</el-radio-button>
        <el-radio-button label="global">全局</el-radio-button>
      </el-radio-group>
      <el-select v-if="scopeMode==='project'" v-model="configProjectId" placeholder="选择项目" filterable style="width:260px">
        <el-option v-for="p in projects" :key="p.id" :label="p.contractNo" :value="p.id" />
      </el-select>
      <el-button class="ml8" @click="loadConfigs">加载配置</el-button>
      <el-button class="ml8" type="warning" :disabled="!configProjectId" @click="generateFromPlan">从计划生成</el-button>
      <div class="ml8">
        <span>自动检查间隔(分钟)</span>
        <el-input-number v-model="intervalMinutes" :min="1" :max="1440" class="ml8" />
        <el-button size="small" class="ml8" @click="saveInterval">应用</el-button>
      </div>
    </div>

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

    <div class="table-footer">
      <el-button @click="loadConfigs">刷新</el-button>
      <el-button type="primary" class="ml8" @click="saveConfigs">保存所有阈值</el-button>
    </div>
  </el-card>
  </template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getProjects } from '../../services/api'

const projects = ref<any[]>([])
const scopeMode = ref<'project' | 'global'>('project')
const configProjectId = ref<number | null>(null)
const cfgList = ref<any[]>([])
const newCfg = ref<any>({ alertType: 'progress', alertItem: '', thresholdType: 'days', warningThreshold: 0, criticalThreshold: 0, isActive: true })
const intervalMinutes = ref<number>(240)

function typeText(t: string) { const map: Record<string, string> = { progress: '进度', cost: '成本', revenue: '收入' }; return map[t] || t }

async function loadProjects() { projects.value = await getProjects(); if (projects.value.length && !configProjectId.value) configProjectId.value = projects.value[0].id }
async function loadConfigs() {
  const u = new URL('/api/dashboard/alerts/configs', window.location.origin)
  if (scopeMode.value === 'project' && configProjectId.value) u.searchParams.set('projectId', String(configProjectId.value))
  const res = await fetch(u.toString())
  cfgList.value = await res.json()
}
async function saveConfigs() {
  const items = cfgList.value.map((x: any) => ({ alertType: x.alertType, alertItem: x.alertItem, thresholdType: x.thresholdType, warningThreshold: Number(x.warningThreshold || 0), criticalThreshold: Number(x.criticalThreshold || 0), isActive: !!x.isActive }))
  const u = new URL('/api/dashboard/alerts/configs', window.location.origin)
  if (scopeMode.value === 'project' && configProjectId.value != null) u.searchParams.set('projectId', String(configProjectId.value))
  const res = await fetch(u.toString(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items) })
  const data = await res.json()
  if (data?.ok) { ElMessage.success('阈值已保存') } else { ElMessage.error(data?.error || '保存失败') }
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
async function generateFromPlan() {
  if (!configProjectId.value) return
  const u = new URL('/api/dashboard/alerts/configs/generate-from-plan', window.location.origin)
  u.searchParams.set('projectId', String(configProjectId.value))
  const res = await fetch(u.toString(), { method: 'POST' })
  const data = await res.json()
  if (data?.ok) { ElMessage.success(`已生成${data.count}条配置`); await loadConfigs() } else { ElMessage.error(data?.error || '生成失败') }
}

onMounted(async () => { await loadProjects(); await loadConfigs(); await loadInterval() })
</script>

<style scoped>
.page-card { max-width: 1100px; margin: 0 auto; }
.toolbar { margin-bottom: 12px; display: flex; align-items: center; flex-wrap: wrap; }
.ops { display: flex; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
.ml8 { margin-left: 8px; }
.mr8 { margin-right: 8px; }
.table-footer { display: flex; justify-content: flex-end; margin-top: 8px; }
</style>