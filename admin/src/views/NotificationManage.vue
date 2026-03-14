<script setup>
/**
 * 通知管理页面
 */
import { ref, reactive, onMounted } from 'vue'
import { getNotificationList, getNotificationStats } from '../api/notification'

const tableData = ref([])
const loading = ref(false)
const total = ref(0)
const searchParams = reactive({ page: 1, pageSize: 20, notifyType: '', status: '' })
const stats = ref({ total: 0, sent_count: 0, failed_count: 0, today_count: 0 })

const loadData = async () => {
  loading.value = true
  try {
    const res = await getNotificationList(searchParams)
    if (res.success) { tableData.value = res.data.list; total.value = res.data.pagination.total }
  } finally { loading.value = false }
}

const loadStats = async () => { const res = await getNotificationStats(); if (res.success) stats.value = res.data }
const handleSearch = () => { searchParams.page = 1; loadData() }
const handleReset = () => { searchParams.notifyType = ''; searchParams.status = ''; handleSearch() }

onMounted(() => { loadData(); loadStats() })
</script>

<template>
  <div>
    <el-row :gutter="20" style="margin-bottom:20px">
      <el-col :span="6"><div class="stat-card mini"><div class="stat-info"><div class="stat-value">{{ stats.total }}</div><div class="stat-title">总通知</div></div></div></el-col>
      <el-col :span="6"><div class="stat-card mini success"><div class="stat-info"><div class="stat-value">{{ stats.sent_count }}</div><div class="stat-title">发送成功</div></div></div></el-col>
      <el-col :span="6"><div class="stat-card mini warning"><div class="stat-info"><div class="stat-value">{{ stats.failed_count }}</div><div class="stat-title">发送失败</div></div></div></el-col>
      <el-col :span="6"><div class="stat-card mini info"><div class="stat-info"><div class="stat-value">{{ stats.today_count }}</div><div class="stat-title">今日发送</div></div></div></el-col>
    </el-row>
    <div class="page-card">
      <h2 class="page-title"><el-icon><Bell /></el-icon>通知管理</h2>
      <el-form class="search-form" inline>
        <el-form-item><el-select v-model="searchParams.notifyType" placeholder="类型" clearable style="width:120px"><el-option label="短信" value="sms" /><el-option label="推送" value="push" /></el-select></el-form-item>
        <el-form-item><el-select v-model="searchParams.status" placeholder="状态" clearable style="width:120px"><el-option label="已发送" value="sent" /><el-option label="失败" value="failed" /><el-option label="待发送" value="pending" /></el-select></el-form-item>
        <el-form-item><el-button type="primary" @click="handleSearch">搜索</el-button><el-button @click="handleReset">重置</el-button></el-form-item>
      </el-form>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="loan_name" label="贷款名称" />
        <el-table-column prop="notify_type" label="类型" width="80"><template #default="{ row }"><el-tag :type="row.notify_type==='sms'?'success':'primary'" size="small">{{ row.notify_type==='sms'?'短信':'推送' }}</el-tag></template></el-table-column>
        <el-table-column prop="content" label="内容" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status==='sent'?'success':row.status==='failed'?'danger':'info'" size="small">{{ row.status==='sent'?'已发送':row.status==='failed'?'失败':'待发送' }}</el-tag></template></el-table-column>
        <el-table-column prop="send_time" label="发送时间" width="170" />
      </el-table>
      <div class="pagination-wrapper"><el-pagination v-model:current-page="searchParams.page" :page-size="searchParams.pageSize" :total="total" layout="total,prev,pager,next" @current-change="loadData" /></div>
    </div>
  </div>
</template>

<style scoped>
.stat-card.mini { display:flex; padding:20px; background:#fff; border-radius:12px; box-shadow:0 2px 12px rgba(0,0,0,0.05) }
.stat-card.mini .stat-value { font-size:24px; font-weight:700; color:#303133 }
.stat-card.mini .stat-title { font-size:13px; color:#909399; margin-top:4px }
.stat-card.mini.success .stat-value { color:#67c23a }
.stat-card.mini.warning .stat-value { color:#f56c6c }
.stat-card.mini.info .stat-value { color:#409eff }
</style>
