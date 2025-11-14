<template>
  <el-card shadow="never" class="page-card">
    <template #header><div class="card-header">预警中心</div></template>
    <div class="toolbar">
      <el-select v-model="projectId" placeholder="选择项目" filterable style="width:300px" @change="load">
        <el-option v-for="p in projects" :key="p.id" :label="p.contractNo" :value="p.id" />
      </el-select>
      <el-button type="primary" class="ml8" @click="newRuleVisible=true">新增规则</el-button>
      <el-button class="ml8" @click="exportPDF">导出PDF</el-button>
    </div>
    <el-row :gutter="12">
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">规则列表</div>
          <el-table :data="rules" size="small" border>
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="condition" label="条件" />
            <el-table-column prop="level" label="级别" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">预警事件</div>
          <el-table :data="events" size="small" border>
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="level" label="级别" />
            <el-table-column prop="date" label="日期" />
            <el-table-column prop="detail" label="详情" />
          </el-table>
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
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getProjects } from '../../services/api'

const projects = ref<any[]>([])
const projectId = ref<number>()
const rules = ref<any[]>([])
const events = ref<any[]>([])
const newRuleVisible = ref(false)
const newRule = ref({ name: '', condition: '', level: 'medium' })

async function loadProjects() { projects.value = await getProjects(); if (projects.value.length && !projectId.value) projectId.value = projects.value[0].id }
async function load() {
  if (!projectId.value) return
  const u = new URL('/api/dashboard/alerts', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  const res = await fetch(u.toString())
  const data = await res.json()
  rules.value = data.rules || []
  events.value = data.events || []
}
async function saveRule() {
  const u = new URL('/api/dashboard/alerts/rules', window.location.origin)
  u.searchParams.set('projectId', String(projectId.value))
  const res = await fetch(u.toString(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRule.value) })
  const data = await res.json()
  if (data?.ok) { ElMessage.success('规则已保存'); newRuleVisible.value = false; await load() } else { ElMessage.error(data?.error || '保存失败') }
}
function exportPDF() { window.print() }
onMounted(async () => { await loadProjects(); await load() })
</script>

<style scoped>
.page-card { max-width: 1100px; margin: 0 auto; }
.toolbar { margin-bottom: 12px; display: flex; align-items: center; }
.ml8 { margin-left: 8px; }
.sub-title { font-weight: 600; margin-bottom: 8px; }
</style>