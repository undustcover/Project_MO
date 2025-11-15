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
      <el-table-column prop="contractNo" label="合同编号" width="160" />
      <el-table-column prop="contractStart" label="开始" width="120" />
      <el-table-column prop="contractEnd" label="结束" width="120" />
      <el-table-column prop="workloadText" label="工作量" width="160" />
      <el-table-column prop="amountValue" label="合同金额" width="140" />
      <el-table-column label="操作" width="160">
        <template #default="scope">
          <el-button text type="primary" @click="$router.push('/projects/' + scope.row.id)">查看</el-button>
          <el-button text @click="$router.push('/progress')">进度</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getProjects } from '../../services/api'
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
</script>

<style scoped>
.page-card { max-width: 1024px; margin: 0 auto; }
.toolbar { margin-bottom: 12px; display: flex; align-items: center; }
.ml8 { margin-left: 8px; }
</style>