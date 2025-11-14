<template>
  <el-card shadow="never" class="page-card">
    <template #header>
      <div class="card-header">项目详情</div>
    </template>
    <el-row :gutter="12">
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">基本信息</div>
          <div class="kv"><span class="label">合同编号</span><span class="val">{{ p?.contractNo }}</span></div>
          <div class="kv"><span class="label">合同周期</span><span class="val">{{ p?.contractStart }} ~ {{ p?.contractEnd }}</span></div>
          <div class="kv"><span class="label">工作量</span><span class="val">{{ p?.workloadText }}</span></div>
          <div class="kv"><span class="label">合同金额</span><span class="val">{{ p?.amountValue }} {{ p?.amountCurrency }}</span></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">时间节点</div>
          <div class="kv"><span class="label">开工日期</span><span class="val">{{ p?.startDate }}</span></div>
          <div class="kv"><span class="label">验收合格日期</span><span class="val">{{ p?.acceptanceDate }}</span></div>
          <div class="kv"><span class="label">尾款到账日期</span><span class="val">{{ p?.finalPaymentDate }}</span></div>
          <div class="kv"><span class="label">保函释放日期</span><span class="val">{{ p?.bondReleaseDate }}</span></div>
          <div class="kv"><span class="label">总结复盘日期</span><span class="val">{{ p?.reviewDate }}</span></div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="12" class="mt12">
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">参与单位</div>
          <el-table :data="p?.participants || []" size="small" border>
            <el-table-column prop="key" label="名称" />
            <el-table-column prop="value" label="内容" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="sub-title">分包单位</div>
          <el-table :data="p?.subcontractors || []" size="small" border>
            <el-table-column prop="key" label="名称" />
            <el-table-column prop="value" label="内容" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getProject } from '../../services/api'
const route = useRoute()
const p = ref<any>(null)
async function load() {
  const id = Number(route.params.id)
  if (!id) return
  p.value = await getProject(id)
}
onMounted(load)
</script>

<style scoped>
.page-card { max-width: 1100px; margin: 0 auto; }
.sub-title { font-weight: 600; margin-bottom: 8px; }
.kv { display: flex; justify-content: space-between; padding: 6px 0; }
.label { color: #666; }
.val { font-weight: 500; }
.mt12 { margin-top: 12px; }
</style>