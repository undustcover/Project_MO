<template>
  <el-card shadow="never" class="page-card">
    <template #header><div class="card-header">重点项目</div></template>
    <div class="toolbar">
      <el-upload :action="uploadUrl" :show-file-list="false" :on-success="onImportSuccess" :on-error="onImportError" accept=".xlsx,.xls" class="ml8">
        <el-button type="success">导入重点项目</el-button>
      </el-upload>
      <el-tooltip content="下载重点项目模板" placement="top">
        <a class="icon-btn ml8" href="/api/dashboard/tracking/focus/template" download aria-label="下载重点项目模板">
          <svg class="icon" viewBox="0 0 24 24"><path d="M12 3a1 1 0 011 1v8.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L11 12.586V4a1 1 0 011-1zm-7 14a1 1 0 011-1h12a1 1 0 011 1v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2z"/></svg>
        </a>
      </el-tooltip>
    </div>

    <el-row :gutter="12" class="mt12">
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="sub-title">重点项目列表</div>
          <el-table :data="rows" size="small" border height="640">
            <el-table-column prop="region" label="项目区域" />
            <el-table-column prop="contractNo" label="合同编号" />
            <el-table-column prop="executor" label="执行主体" />
            <el-table-column prop="rigNo" label="钻机编号" />
            <el-table-column prop="projectTerm" label="项目期限" />
            <el-table-column prop="projectName" label="项目名称" />
            <el-table-column prop="workloadCount" label="工作量（口）" />
            <el-table-column prop="realtimeProgress" label="项目实时进度" />
            <el-table-column prop="firstWellSpudTime" label="首井开钻时间" />
            <el-table-column prop="focusItems" label="重点关注事项" />
            <el-table-column prop="workValueDone" label="已完成价值工作量" />
            <el-table-column prop="expectedWorkThisYear" label="今年预计完成工作量" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getTrackingFocusList } from '../../services/api'
import { useRoute } from 'vue-router'

const route = useRoute()
const projectId = ref<number>()
const rows = ref<any[]>([])
const uploadUrl = ref('')

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
}
function onImportSuccess() { ElMessage.success('导入成功'); load() }
function onImportError(_err: any) { ElMessage.error('导入失败：请检查合同编号是否已在项目跟踪中录入') }

onMounted(async () => { await load() })
</script>

<style scoped>
.toolbar { display: flex; align-items: center }
.ml8 { margin-left: 8px }
.card-header { font-weight: 600 }
.mt12 { margin-top: 12px }
.sub-title { font-weight: 600; margin-bottom: 8px }
.icon-btn { display: inline-flex; align-items: center }
.icon { width: 18px; height: 18px; fill: currentColor }
</style>