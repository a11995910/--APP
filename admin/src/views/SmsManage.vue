<script setup>
/**
 * 短信平台管理页面
 */
import { ref, reactive, onMounted } from 'vue'
import { getSmsConfigList, createSmsConfig, updateSmsConfig, deleteSmsConfig, getSmsStats } from '../api/sms'
import { ElMessage, ElMessageBox } from 'element-plus'

const tableData = ref([])
const loading = ref(false)
const stats = ref({ config: null, stats: { totalSent: 0, sentToday: 0, failedCount: 0 } })

const dialogVisible = ref(false)
const formLoading = ref(false)
const formRef = ref(null)
const form = reactive({ id: null, platform: '', access_key: '', access_secret: '', sign_name: '', template_code: '', balance: 0, status: 1 })
const rules = {
  platform: [{ required: true, message: '请输入平台名称' }],
  access_key: [{ required: true, message: '请输入AccessKey' }],
  access_secret: [{ required: true, message: '请输入AccessSecret' }],
  sign_name: [{ required: true, message: '请输入短信签名' }],
  template_code: [{ required: true, message: '请输入模板Code' }]
}

const loadData = async () => { loading.value = true; try { const res = await getSmsConfigList(); if (res.success) tableData.value = res.data } finally { loading.value = false } }
const loadStats = async () => { const res = await getSmsStats(); if (res.success) stats.value = res.data }
const handleAdd = () => { Object.assign(form, { id: null, platform: '阿里云', access_key: '', access_secret: '', sign_name: '', template_code: '', balance: 0, status: 1 }); dialogVisible.value = true }
const handleEdit = (row) => { Object.assign(form, { ...row, access_key: row.access_key, access_secret: '' }); dialogVisible.value = true }
const handleSubmit = async () => {
  if (!(await formRef.value.validate().catch(() => false))) return
  formLoading.value = true
  try {
    const res = form.id ? await updateSmsConfig(form.id, form) : await createSmsConfig(form)
    if (res.success) { ElMessage.success('保存成功'); dialogVisible.value = false; loadData() }
  } finally { formLoading.value = false }
}
const handleDelete = async (row) => { await ElMessageBox.confirm('确定删除？'); const res = await deleteSmsConfig(row.id); if (res.success) { ElMessage.success('删除成功'); loadData() } }

onMounted(() => { loadData(); loadStats() })
</script>

<template>
  <div>
    <el-row :gutter="20" style="margin-bottom:20px">
      <el-col :span="8"><div class="stat-card">
        <div class="stat-title">当前平台</div>
        <div class="stat-value">{{ stats.config?.platform || '未配置' }}</div>
        <div class="stat-desc">签名: {{ stats.config?.sign_name || '-' }}</div>
      </div></el-col>
      <el-col :span="8"><div class="stat-card success">
        <div class="stat-title">剩余额度</div>
        <div class="stat-value">{{ stats.config?.balance || 0 }}</div>
        <div class="stat-desc">条</div>
      </div></el-col>
      <el-col :span="8"><div class="stat-card warning">
        <div class="stat-title">累计发送</div>
        <div class="stat-value">{{ stats.stats?.totalSent || 0 }}</div>
        <div class="stat-desc">今日: {{ stats.stats?.sentToday || 0 }} 条</div>
      </div></el-col>
    </el-row>
    <div class="page-card">
      <div class="table-toolbar">
        <h2 class="page-title" style="margin:0"><el-icon><Message /></el-icon>短信配置</h2>
        <el-button type="primary" @click="handleAdd"><el-icon><Plus /></el-icon>新增配置</el-button>
      </div>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="platform" label="平台" width="120" />
        <el-table-column prop="sign_name" label="签名" width="120" />
        <el-table-column prop="template_code" label="模板Code" />
        <el-table-column prop="balance" label="余额" width="100" />
        <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag :type="row.status===1?'success':'info'" size="small">{{ row.status===1?'启用':'禁用' }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="150"><template #default="{ row }"><el-button type="primary" link @click="handleEdit(row)">编辑</el-button><el-button type="danger" link @click="handleDelete(row)">删除</el-button></template></el-table-column>
      </el-table>
    </div>
  </div>
  <el-dialog v-model="dialogVisible" title="短信配置" width="500px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="平台名称" prop="platform"><el-input v-model="form.platform" /></el-form-item>
      <el-form-item label="AccessKey" prop="access_key"><el-input v-model="form.access_key" /></el-form-item>
      <el-form-item label="AccessSecret" prop="access_secret"><el-input v-model="form.access_secret" type="password" :placeholder="form.id?'不修改请留空':''" /></el-form-item>
      <el-form-item label="短信签名" prop="sign_name"><el-input v-model="form.sign_name" /></el-form-item>
      <el-form-item label="模板Code" prop="template_code"><el-input v-model="form.template_code" /></el-form-item>
      <el-form-item label="余额"><el-input-number v-model="form.balance" :min="0" /></el-form-item>
      <el-form-item label="状态"><el-radio-group v-model="form.status"><el-radio :value="1">启用</el-radio><el-radio :value="0">禁用</el-radio></el-radio-group></el-form-item>
    </el-form>
    <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" :loading="formLoading" @click="handleSubmit">确定</el-button></template>
  </el-dialog>
</template>
