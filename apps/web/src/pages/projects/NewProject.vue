<template>
  <el-card class="page-card" shadow="never">
    <template #header>
      <div class="card-header">新建项目</div>
    </template>
    <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
      <el-divider>项目信息</el-divider>
      <el-form-item label="项目名称" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-divider>基本信息</el-divider>
      <el-form-item label="合同编号" prop="contractNo">
        <el-input v-model="form.contractNo" />
      </el-form-item>
      <el-form-item label="合同周期" prop="contractRange">
        <el-date-picker v-model="form.contractRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" />
      </el-form-item>
      <el-form-item label="工作量" prop="workloadText">
        <el-input v-model="form.workloadText" />
      </el-form-item>
      <el-form-item label="合同金额" prop="amountValue">
        <el-input-number v-model="form.amountValue" :min="0" :step="0.01" />
        <el-select v-model="form.amountCurrency" class="ml8" style="width:120px">
          <el-option label="CNY" value="CNY" />
          <el-option label="USD" value="USD" />
        </el-select>
      </el-form-item>

      <el-divider>时间节点</el-divider>
      <el-form-item label="开工日期" prop="startDate">
        <el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" />
      </el-form-item>
      <el-form-item label="验收合格日期" prop="acceptanceDate">
        <el-date-picker v-model="form.acceptanceDate" type="date" value-format="YYYY-MM-DD" />
      </el-form-item>
      <el-form-item label="尾款到账日期" prop="finalPaymentDate">
        <el-date-picker v-model="form.finalPaymentDate" type="date" value-format="YYYY-MM-DD" />
      </el-form-item>
      <el-form-item label="保函释放日期" prop="bondReleaseDate">
        <el-date-picker v-model="form.bondReleaseDate" type="date" value-format="YYYY-MM-DD" />
      </el-form-item>
      <el-form-item label="总结复盘日期" prop="reviewDate">
        <el-date-picker v-model="form.reviewDate" type="date" value-format="YYYY-MM-DD" />
      </el-form-item>

      <el-divider>参与单位</el-divider>
      <div class="kv-list">
        <div class="kv-row" v-for="(item, idx) in form.participants" :key="'p-'+idx">
          <el-input v-model="item.key" placeholder="键" />
          <el-input v-model="item.value" placeholder="值" class="ml8" />
          <el-button type="danger" text class="ml8" @click="removeKV(form.participants, idx)">删除</el-button>
        </div>
        <el-button type="primary" text @click="addKV(form.participants)">添加参与单位</el-button>
      </div>

      <el-divider>分包单位</el-divider>
      <div class="kv-list">
        <div class="kv-row" v-for="(item, idx) in form.subcontractors" :key="'s-'+idx">
          <el-input v-model="item.key" placeholder="键" />
          <el-input v-model="item.value" placeholder="值" class="ml8" />
          <el-button type="danger" text class="ml8" @click="removeKV(form.subcontractors, idx)">删除</el-button>
        </div>
        <el-button type="primary" text @click="addKV(form.subcontractors)">添加分包单位</el-button>
      </div>

      <el-form-item>
        <el-button type="primary" @click="submit">提交</el-button>
        <el-button @click="reset">重置</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createProject } from '../../services/api'
const formRef = ref()
const form = ref({
  name: '',
  contractNo: '',
  contractRange: [],
  workloadText: '',
  amountValue: 0,
  amountCurrency: 'CNY',
  startDate: '',
  acceptanceDate: '',
  finalPaymentDate: '',
  bondReleaseDate: '',
  reviewDate: '',
  participants: [{ key: '运营主体', value: '' }, { key: '项目长', value: '' }],
  subcontractors: [] as Array<{ key: string; value: string }>
})
const rules = {
  name: [{ required: true, message: '必填' }],
  contractNo: [{ required: true, message: '必填' }],
  contractRange: [{ type: 'array', required: true, message: '请选择合同周期' }],
  amountValue: [{ required: true, message: '必填' }]
}
function addKV(list: Array<{ key: string; value: string }>) {
  list.push({ key: '', value: '' })
}
function removeKV(list: Array<{ key: string; value: string }>, idx: number) {
  list.splice(idx, 1)
}
async function submit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  const payload = {
    name: form.value.name,
    contractNo: form.value.contractNo,
    contractStart: form.value.contractRange?.[0] || undefined,
    contractEnd: form.value.contractRange?.[1] || undefined,
    workloadText: form.value.workloadText,
    amountValue: form.value.amountValue,
    amountCurrency: form.value.amountCurrency,
    startDate: form.value.startDate || undefined,
    acceptanceDate: form.value.acceptanceDate || undefined,
    finalPaymentDate: form.value.finalPaymentDate || undefined,
    bondReleaseDate: form.value.bondReleaseDate || undefined,
    reviewDate: form.value.reviewDate || undefined,
    participants: form.value.participants,
    subcontractors: form.value.subcontractors
  }
  const res = await createProject(payload)
  if (res.ok) {
    ElMessage.success('提交成功')
  } else {
    const msg = typeof res.body === 'string' ? res.body : (res.body?.message || '')
    ElMessage.error(`提交失败${res.status ? '（'+res.status+'）' : ''}${msg ? '：'+msg : ''}`)
  }
}
function reset() {
  formRef.value.resetFields()
}
</script>

<style scoped>
.page-card { max-width: 980px; margin: 0 auto; }
.kv-list { padding: 8px 0; }
.kv-row { display: flex; align-items: center; margin-bottom: 8px; }
.ml8 { margin-left: 8px; }
</style>