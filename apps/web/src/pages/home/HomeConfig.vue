<template>
  <el-card shadow="never" class="page-card">
    <template #header><div class="card-header">主页配置</div></template>
    <div class="toolbar">
      <el-select v-model="projectId" placeholder="选择项目" filterable style="width:300px" @change="loadConfig">
        <el-option v-for="p in projects" :key="p.id" :label="(p.name || p.contractNo)" :value="p.id" />
      </el-select>
      <el-button type="primary" class="ml8" @click="save">保存配置</el-button>
      <router-link to="/home"><el-button class="ml8">返回主页</el-button></router-link>
    </div>
    <el-row :gutter="12">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">模块启用</div>
          <el-checkbox-group v-model="modules">
            <el-checkbox label="overview">立项模块</el-checkbox>
            <el-checkbox label="progress">进度模块</el-checkbox>
            <el-checkbox label="cost">成本模块</el-checkbox>
            <el-checkbox label="revenue">收入模块</el-checkbox>
            <el-checkbox label="alerts">预警模块</el-checkbox>
          </el-checkbox-group>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12" class="mt12">
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">进度模块</div>
          <el-checkbox-group v-model="progressCharts">
            <el-checkbox label="radar">六维雷达图</el-checkbox>
            <el-checkbox label="cycle">建井周期统计</el-checkbox>
            <el-checkbox label="eff">工作时效对比</el-checkbox>
          </el-checkbox-group>
          <div class="mt12">
            <el-switch v-model="progressFields" active-text="显示字段" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">成本模块</div>
          <el-checkbox-group v-model="costCharts">
            <el-checkbox label="radar">成本六维雷达图</el-checkbox>
            <el-checkbox label="pie">总体成本分类分布</el-checkbox>
          </el-checkbox-group>
          <div class="mt12">
            <el-switch v-model="costFields" active-text="显示字段" />
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12" class="mt12">
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">收入模块</div>
          <el-checkbox-group v-model="revenueCharts">
            <el-checkbox label="radar">收入六维雷达图</el-checkbox>
            <el-checkbox label="incomePie">收入来源分布</el-checkbox>
            <el-checkbox label="workPie">价值工作量圆盘</el-checkbox>
          </el-checkbox-group>
          <div class="mt12">
            <el-switch v-model="revenueFields" active-text="显示字段" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">预警模块</div>
          <el-checkbox-group v-model="alertsCharts">
            <el-checkbox label="severity">严重程度分布</el-checkbox>
            <el-checkbox label="type">类型统计</el-checkbox>
            <el-checkbox label="trend">预警趋势</el-checkbox>
          </el-checkbox-group>
          <div class="mt12">
            <el-switch v-model="alertsList" active-text="显示记录列表" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getProjects, getProjectHomeConfig, setProjectHomeConfig } from '../../services/api'
import { ElMessage } from 'element-plus'

const projects = ref<any[]>([])
const projectId = ref<number>()
const modules = ref<Array<'overview'|'progress'|'cost'|'revenue'|'alerts'>>(['overview','progress','cost','revenue','alerts'])
const progressCharts = ref<Array<'radar'|'cycle'|'eff'>>(['radar','cycle','eff'])
const costCharts = ref<Array<'radar'|'pie'>>(['radar','pie'])
const revenueCharts = ref<Array<'radar'|'incomePie'|'workPie'>>(['radar','incomePie','workPie'])
const alertsCharts = ref<Array<'severity'|'type'|'trend'>>(['severity','type','trend'])
const progressFields = ref<boolean>(true)
const costFields = ref<boolean>(true)
const revenueFields = ref<boolean>(true)
const alertsList = ref<boolean>(true)

function defaultConfig() {
  return { modules: modules.value, progress: { charts: progressCharts.value, fields: progressFields.value }, cost: { charts: costCharts.value, fields: costFields.value }, revenue: { charts: revenueCharts.value, fields: revenueFields.value }, alerts: { charts: alertsCharts.value, list: alertsList.value } }
}
async function loadProjects() { projects.value = await getProjects(); if (projects.value.length && !projectId.value) projectId.value = projects.value[0].id }
async function loadConfig() {
  if (!projectId.value) return
  const cfg = await getProjectHomeConfig(projectId.value)
  const c = cfg || defaultConfig()
  modules.value = Array.isArray(c.modules) ? c.modules : modules.value
  progressCharts.value = Array.isArray(c.progress?.charts) ? c.progress.charts : progressCharts.value
  costCharts.value = Array.isArray(c.cost?.charts) ? c.cost.charts : costCharts.value
  revenueCharts.value = Array.isArray(c.revenue?.charts) ? c.revenue.charts : revenueCharts.value
  alertsCharts.value = Array.isArray(c.alerts?.charts) ? c.alerts.charts : alertsCharts.value
  progressFields.value = !!c.progress?.fields
  costFields.value = !!c.cost?.fields
  revenueFields.value = !!c.revenue?.fields
  alertsList.value = !!c.alerts?.list
}
async function save() {
  if (!projectId.value) return
  const cfg = { modules: modules.value, progress: { charts: progressCharts.value, fields: progressFields.value }, cost: { charts: costCharts.value, fields: costFields.value }, revenue: { charts: revenueCharts.value, fields: revenueFields.value }, alerts: { charts: alertsCharts.value, list: alertsList.value } }
  const ok = await setProjectHomeConfig(projectId.value, cfg)
  if (ok) { ElMessage.success('配置已保存'); } else { ElMessage.error('保存失败') }
}
onMounted(async () => { await loadProjects(); await loadConfig() })
</script>

<style scoped>
.page-card { max-width: 1100px; margin: 0 auto; }
.toolbar { margin-bottom: 12px; display: flex; align-items: center; }
.ml8 { margin-left: 8px; }
.sub-title { font-weight: 600; margin-bottom: 8px; }
.mt12 { margin-top: 12px; }
</style>