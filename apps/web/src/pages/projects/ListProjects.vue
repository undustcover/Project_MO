<template>
  <el-card class="page-card" shadow="never">
    <template #header>
      <div class="card-header">项目列表</div>
    </template>
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索合同编号或工作量" clearable style="width:300px" />
      <el-button class="ml8" type="primary" @click="fetch">刷新</el-button>
      <el-button class="ml8" @click="$router.push('/projects/new')">新建项目</el-button>
    </div>
    <el-table :data="filtered" border>
      <el-table-column prop="name" label="项目名称" width="180" />
      <el-table-column prop="contractNo" label="合同编号" width="160" />
      <el-table-column prop="contractStart" label="开始" width="120" />
      <el-table-column prop="contractEnd" label="结束" width="120" />
      <el-table-column prop="workloadText" label="工作量" width="160" />
      <el-table-column prop="amountValue" label="合同金额" width="140" />
      <el-table-column label="操作" width="260">
        <template #default="scope">
          <div class="ops">
            <el-button size="small" type="primary" plain @click="$router.push('/projects/' + scope.row.id)">查看</el-button>
            <el-button size="small" type="success" plain @click="$router.push('/progress')">进度</el-button>
            <el-button size="small" type="warning" plain @click="openEdit(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" plain @click="confirmDelete(scope.row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="editVisible" title="编辑项目信息" width="600px">
      <el-form :model="editForm" label-width="120px">
        <el-form-item label="项目名称">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="合同编号">
          <el-input v-model="editForm.contractNo" />
        </el-form-item>
        <el-form-item label="工作量">
          <el-input v-model="editForm.workloadText" />
        </el-form-item>
        <el-form-item label="合同金额">
          <el-input-number v-model="editForm.amountValue" :min="0" :step="0.01" />
          <el-select v-model="editForm.amountCurrency" class="ml8" style="width:120px">
            <el-option label="CNY" value="CNY" />
            <el-option label="USD" value="USD" />
          </el-select>
        </el-form-item>
        <el-form-item label="开工日期">
          <el-date-picker v-model="editForm.startDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="验收合格日期">
          <el-date-picker v-model="editForm.acceptanceDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="尾款到账日期">
          <el-date-picker v-model="editForm.finalPaymentDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="保函释放日期">
          <el-date-picker v-model="editForm.bondReleaseDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="总结复盘日期">
          <el-date-picker v-model="editForm.reviewDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>

        <el-divider>参与单位</el-divider>
        <div class="kv-list">
          <div class="kv-row" v-for="(item, idx) in editForm.participants" :key="'p-'+idx">
            <el-input v-model="item.key" placeholder="键" />
            <el-input v-model="item.value" placeholder="值" class="ml8" />
            <el-button type="danger" text class="ml8" @click="removeKV(editForm.participants, idx)">删除</el-button>
          </div>
          <el-button type="primary" text @click="addKV(editForm.participants)">添加参与单位</el-button>
        </div>

        <el-divider>分包单位</el-divider>
        <div class="kv-list">
          <div class="kv-row" v-for="(item, idx) in editForm.subcontractors" :key="'s-'+idx">
            <el-input v-model="item.key" placeholder="键" />
            <el-input v-model="item.value" placeholder="值" class="ml8" />
            <el-button type="danger" text class="ml8" @click="removeKV(editForm.subcontractors, idx)">删除</el-button>
          </div>
          <el-button type="primary" text @click="addKV(editForm.subcontractors)">添加分包单位</el-button>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getProjects, updateProject, deleteProject } from '../../services/api'
import { ElMessage, ElMessageBox } from 'element-plus'
const rows = ref<any[]>([])
const keyword = ref('')
const filtered = computed(() => {
  const k = keyword.value.trim()
  if (!k) return rows.value
  return rows.value.filter(r => String(r.contractNo).includes(k) || String(r.workloadText).includes(k))
})
async function fetch() {
  const data = await getProjects()
  rows.value = Array.isArray(data) ? data : []
}
onMounted(fetch)

const editVisible = ref(false)
const editForm = ref<any>({})
let editId = 0
function openEdit(row: any) {
  editId = row.id
  editForm.value = {
    name: row.name || '',
    contractNo: row.contractNo || '',
    workloadText: row.workloadText || '',
    amountValue: row.amountValue ?? 0,
    amountCurrency: row.amountCurrency || 'CNY',
    startDate: row.startDate || '',
    acceptanceDate: row.acceptanceDate || '',
    finalPaymentDate: row.finalPaymentDate || '',
    bondReleaseDate: row.bondReleaseDate || '',
    reviewDate: row.reviewDate || '',
    participants: Array.isArray(row.participants) ? row.participants.map((x: any) => ({ key: x.key || '', value: x.value || '' })) : [],
    subcontractors: Array.isArray(row.subcontractors) ? row.subcontractors.map((x: any) => ({ key: x.key || '', value: x.value || '' })) : []
  }
  editVisible.value = true
}
async function saveEdit() {
  const payload = {
    ...editForm.value,
    startDate: editForm.value.startDate || undefined,
    acceptanceDate: editForm.value.acceptanceDate || undefined,
    finalPaymentDate: editForm.value.finalPaymentDate || undefined,
    bondReleaseDate: editForm.value.bondReleaseDate || undefined,
    reviewDate: editForm.value.reviewDate || undefined,
    participants: (editForm.value.participants || []).filter((kv: any) => kv.key || kv.value),
    subcontractors: (editForm.value.subcontractors || []).filter((kv: any) => kv.key || kv.value)
  }
  const ok = await updateProject(editId, payload)
  if (ok) {
    editVisible.value = false
    await fetch()
  }
}

function addKV(list: Array<{ key: string; value: string }>) {
  list.push({ key: '', value: '' })
}
function removeKV(list: Array<{ key: string; value: string }>, idx: number) {
  list.splice(idx, 1)
}

async function confirmDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除项目【${row.name || row.contractNo}】？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  const ok = await deleteProject(row.id)
  if (ok) {
    ElMessage.success('删除成功')
    await fetch()
  } else {
    ElMessage.error('删除失败')
  }
}
</script>

<style scoped>
.page-card { max-width: 1024px; margin: 0 auto; }
.toolbar { margin-bottom: 12px; display: flex; align-items: center; }
.ml8 { margin-left: 8px; }
.ops { display: flex; gap: 8px; }
.kv-list { padding: 8px 0; }
.kv-row { display: flex; align-items: center; margin-bottom: 8px; }
</style>