<template>
  <el-card class="page-card" shadow="never">
    <template #header>
      <div class="card-header">项目目标设定</div>
    </template>
    <div class="tips">每个项目至少选择1个指标并设置参数</div>
    <div class="sections">
      <el-divider>进度</el-divider>
      <div class="goal-row" v-for="item in progressIndicators" :key="item.key">
        <el-checkbox v-model="item.checked">{{ item.label }}</el-checkbox>
        <el-select v-model="item.comparator" class="ml8" style="width:100px">
          <el-option label=">=" value=">=" />
          <el-option label=">" value=">" />
          <el-option label="<=" value="<=" />
          <el-option label="<" value="<" />
          <el-option label="=" value="=" />
        </el-select>
        <el-input-number v-model="item.target" :min="0" :step="item.step || 1" class="ml8" />
        <span class="ml8 unit">{{ item.unit }}</span>
        <el-input v-model="item.wellNumber" placeholder="井号(可选)" class="ml8" style="width:140px" />
        <el-input v-model="item.taskName" placeholder="任务名称(可选)" class="ml8" style="width:180px" />
      </div>

      <el-divider>成本</el-divider>
      <div class="goal-row" v-for="item in costIndicators" :key="item.key">
        <el-checkbox v-model="item.checked">{{ item.label }}</el-checkbox>
        <el-select v-model="item.comparator" class="ml8" style="width:100px">
          <el-option label=">=" value=">=" />
          <el-option label=">" value=">" />
          <el-option label="<=" value="<=" />
          <el-option label="<" value="<" />
          <el-option label="=" value="=" />
        </el-select>
        <el-input-number v-model="item.target" :min="0" :step="item.step || 1" class="ml8" />
        <span class="ml8 unit">{{ item.unit }}</span>
        <el-input v-model="item.wellNumber" placeholder="井号(可选)" class="ml8" style="width:140px" />
        <el-input v-model="item.taskName" placeholder="任务名称(可选)" class="ml8" style="width:180px" />
      </div>

      <el-divider>收入</el-divider>
      <div class="goal-row" v-for="item in revenueIndicators" :key="item.key">
        <el-checkbox v-model="item.checked">{{ item.label }}</el-checkbox>
        <el-select v-model="item.comparator" class="ml8" style="width:100px">
          <el-option label=">=" value=">=" />
          <el-option label=">" value=">" />
          <el-option label="<=" value="<=" />
          <el-option label="<" value="<" />
          <el-option label="=" value="=" />
        </el-select>
        <el-input-number v-model="item.target" :min="0" :step="item.step || 1" class="ml8" />
        <span class="ml8 unit">{{ item.unit }}</span>
        <el-input v-model="item.wellNumber" placeholder="井号(可选)" class="ml8" style="width:140px" />
        <el-input v-model="item.taskName" placeholder="任务名称(可选)" class="ml8" style="width:180px" />
      </div>

      <div class="ops">
        <el-button type="primary" @click="save">保存目标</el-button>
        <el-button @click="refreshEval">评估目标完成情况</el-button>
      </div>

      <el-divider>评估结果</el-divider>
      <div v-if="evaluation.rows.length === 0" class="empty">暂无评估结果</div>
      <el-table v-else :data="evaluation.rows" border>
        <el-table-column prop="dimensionText" label="维度" width="100" />
        <el-table-column prop="label" label="指标" width="220" />
        <el-table-column prop="comparator" label="比较" width="80" />
        <el-table-column prop="targetValueText" label="目标参数" width="140" />
        <el-table-column prop="valueText" label="当前值" width="140" />
        <el-table-column prop="statusText" label="完成情况" width="120" />
      </el-table>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getProjectGoals, setProjectGoals, evaluateProjectGoals } from '../../services/api'

const route = useRoute()
const router = useRouter()
const pid = Number(route.params.id)

type GoalItem = { key: string; label: string; unit: string; step?: number; checked: boolean; comparator: string; target: number; wellNumber?: string; taskName?: string }

const progressIndicators = ref<GoalItem[]>([
  { key: 'nonProductiveTimeRatio', label: '非生产时间占比', unit: '%', step: 0.01, checked: false, comparator: '<=', target: 0 },
  { key: 'pureDrillTimeRatio', label: '纯钻时间占比', unit: '%', step: 0.01, checked: false, comparator: '>=', target: 0 },
  { key: 'movingPeriodRatio', label: '搬安周期占比', unit: '%', step: 0.01, checked: false, comparator: '<=', target: 0 },
  { key: 'scheduleOverdueDays', label: '进度计划逾期', unit: '天', step: 1, checked: false, comparator: '<=', target: 0 }
])

const costIndicators = ref<GoalItem[]>([
  { key: 'costControlRate', label: '成本控制率', unit: '%', step: 0.01, checked: false, comparator: '<=', target: 0 },
  { key: 'indirectCostControlRate', label: '间接成本控制率', unit: '%', step: 0.01, checked: false, comparator: '<=', target: 0 },
  { key: 'costPerformanceScore', label: '成本绩效', unit: '分', step: 0.01, checked: false, comparator: '>=', target: 0 },
  { key: 'materialsCostAmount', label: '材料成本金额', unit: '金额', step: 0.01, checked: false, comparator: '<=', target: 0 },
  { key: 'laborCostAmount', label: '人工成本金额', unit: '金额', step: 0.01, checked: false, comparator: '<=', target: 0 },
  { key: 'equipmentCostAmount', label: '设备成本金额', unit: '金额', step: 0.01, checked: false, comparator: '<=', target: 0 },
  { key: 'servicesCostAmount', label: '服务成本金额', unit: '金额', step: 0.01, checked: false, comparator: '<=', target: 0 },
  { key: 'hundredRevenueCost', label: '百元收入成本', unit: '金额', step: 0.01, checked: false, comparator: '<=', target: 0 },
  { key: 'costOverrunSingleTask', label: '成本超支(单任务)', unit: '%', step: 0.01, checked: false, comparator: '<=', target: 0 }
])

const revenueIndicators = ref<GoalItem[]>([
  { key: 'earnedValueAmount', label: '价值工作量', unit: '金额', step: 0.01, checked: false, comparator: '>=', target: 0 },
  { key: 'projectProfitPercent', label: '项目利润', unit: '%', step: 0.01, checked: false, comparator: '>=', target: 0 }
])

const evaluation = ref<{ rows: any[] }>({ rows: [] })

async function load() {
  const data = await getProjectGoals(pid)
  if (Array.isArray(data)) {
    for (const g of data) {
      const list = g.dimension === 'progress' ? progressIndicators.value : g.dimension === 'cost' ? costIndicators.value : revenueIndicators.value
      const it = list.find(x => x.key === g.indicatorKey)
      if (it) {
        it.checked = true
        it.comparator = g.comparator || it.comparator
        it.target = Number(g.targetValue || 0)
        it.unit = g.unit || it.unit
        it.wellNumber = g.wellNumber || ''
        it.taskName = g.taskName || ''
      }
    }
  }
}

function toPayload() {
  const pick = (dimension: 'progress' | 'cost' | 'revenue', list: GoalItem[]) =>
    list.filter(x => x.checked).map(x => ({ dimension, indicatorKey: x.key, comparator: x.comparator, targetValue: x.target, unit: x.unit, wellNumber: x.wellNumber, taskName: x.taskName }))
  return [
    ...pick('progress', progressIndicators.value),
    ...pick('cost', costIndicators.value),
    ...pick('revenue', revenueIndicators.value)
  ]
}

async function save() {
  const goals = toPayload()
  if (goals.length === 0) {
    ElMessage.error('请至少选择1个指标')
    return
  }
  const ok = await setProjectGoals(pid, goals)
  if (ok) {
    ElMessage.success('已保存')
    await refreshEval()
  } else {
    ElMessage.error('保存失败')
  }
}

async function refreshEval() {
  const r = await evaluateProjectGoals(pid)
  const rows = (r.results || []).map((x: any) => {
    const byKey = [...progressIndicators.value, ...costIndicators.value, ...revenueIndicators.value]
    const it = byKey.find(i => i.key === x.indicatorKey) as any
    const label = it ? it.label : x.indicatorKey
    const dimensionText = x.dimension === 'progress' ? '进度' : x.dimension === 'cost' ? '成本' : '收入'
    const valueText = x.value == null ? '缺数据' : String(x.value)
    const targetValueText = `${x.comparator} ${x.targetValue}${x.unit || ''}`
    const statusText = x.value == null ? '无法评估' : (x.completed ? '已完成' : '未完成')
    return { ...x, label, dimensionText, valueText, targetValueText, statusText }
  })
  evaluation.value.rows = rows
}

onMounted(async () => {
  await load()
  await refreshEval()
})

</script>

<style scoped>
.page-card { max-width: 1024px; margin: 0 auto; }
.tips { margin-bottom: 8px; color: #666; }
.goal-row { display: flex; align-items: center; margin-bottom: 8px; }
.ml8 { margin-left: 8px; }
.unit { color: #888; }
.ops { margin-top: 12px; display: flex; gap: 8px; }
.empty { color: #888; }
</style>