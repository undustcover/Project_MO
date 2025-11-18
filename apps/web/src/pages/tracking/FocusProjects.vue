<template>
  <el-card shadow="never" class="page-card">
    <template #header><div class="card-header">重点项目</div></template>
    <div class="toolbar">
      <el-upload :action="uploadUrl" :show-file-list="false" :on-success="onImportSuccess" :on-error="onImportError" accept=".xlsx,.xls" class="ml8">
        <el-button type="success">导入重点项目</el-button>
      </el-upload>
      <el-tooltip content="下载重点项目模板" placement="top">
        <a class="icon-btn ml8" href="/api/dashboard/tracking/focus/template" download="focus_template.xlsx" aria-label="下载重点项目模板">
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
            <el-table-column prop="projectName" label="项目名称" />
            <el-table-column prop="contractNo" label="合同编号" />
            <el-table-column prop="executor" label="执行主体" />
            <el-table-column prop="rigNo" label="钻机编号" />
            <el-table-column prop="projectTerm" label="项目期限" />
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
            <el-table-column label="项目名称详情">
              <template #default="{ row }">
                <el-popover trigger="click" placement="top" width="420">
                  <template #reference>
                    <el-link type="primary">查看详情</el-link>
                  </template>
                  <div class="popover-list">
                    <div class="popover-item"><span class="k">项目昵称</span><span class="v">{{ row.projectNickname }}</span></div>
                    <div class="popover-item"><span class="k">合同编号</span><span class="v">{{ row.contractNo }}</span></div>
                    <div class="popover-item"><span class="k">合同金额(万美元)</span><span class="v">{{ row.contractAmountUSD }}</span></div>
                    <div class="popover-item"><span class="k">合同开始日期</span><span class="v">{{ row.contractStartDate }}</span></div>
                    <div class="popover-item"><span class="k">合同结束日期</span><span class="v">{{ row.contractEndDate }}</span></div>
                    <div class="popover-item"><span class="k">业主单位</span><span class="v">{{ row.ownerUnit }}</span></div>
                  </div>
                </el-popover>
              </template>
            </el-table-column>
            <el-table-column label="重点关注事项">
              <template #default="{ row }">
                <div class="popover-list">
                  <div class="popover-item"><span class="k">事项</span><span class="v">{{ row.focusItems }}</span></div>
                  <div class="popover-item"><span class="k">已完成价值工作量</span><span class="v">{{ row.workValueDone }}</span></div>
                  <div class="popover-item"><span class="k">今年预计完成工作量</span><span class="v">{{ row.expectedWorkThisYear }}</span></div>
                </div>
              </template>
            </el-table-column>
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