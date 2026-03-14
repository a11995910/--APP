<script setup>
/**
 * 仪表盘页面
 */
import { ref, onMounted } from 'vue'
import { getDashboard } from '../api/admin'

// 数据
const loading = ref(true)
const stats = ref({
  users: { total: 0, miniapp_count: 0, app_count: 0, today_new: 0 },
  loans: { total: 0, active_count: 0, completed_count: 0, total_principal: 0, monthly_repayment: 0 },
  notifications: { total: 0, sent_count: 0, failed_count: 0, sms_count: 0, push_count: 0, today_count: 0 }
})

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const res = await getDashboard()
    if (res.success) {
      stats.value = res.data
    }
  } finally {
    loading.value = false
  }
}

// 格式化金额
const formatMoney = (val) => {
  return Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="dashboard-page" v-loading="loading">
    <h2 class="page-title">
      <el-icon><DataBoard /></el-icon>
      数据概览
    </h2>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-row">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-title">用户总数</div>
          <div class="stat-value">{{ stats.users.total }}</div>
          <div class="stat-desc">今日新增 {{ stats.users.today_new }} 人</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card success">
          <div class="stat-title">活跃贷款</div>
          <div class="stat-value">{{ stats.loans.active_count }}</div>
          <div class="stat-desc">总计 {{ stats.loans.total }} 笔贷款</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card warning">
          <div class="stat-title">月还款总额</div>
          <div class="stat-value">¥{{ formatMoney(stats.loans.monthly_repayment) }}</div>
          <div class="stat-desc">本金总计 ¥{{ formatMoney(stats.loans.total_principal) }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card info">
          <div class="stat-title">今日提醒</div>
          <div class="stat-value">{{ stats.notifications.today_count }}</div>
          <div class="stat-desc">累计发送 {{ stats.notifications.sent_count }} 条</div>
        </div>
      </el-col>
    </el-row>

    <!-- 详细数据 -->
    <el-row :gutter="20">
      <el-col :span="12">
        <div class="page-card">
          <h3 class="card-title">用户分布</h3>
          <div class="data-list">
            <div class="data-item">
              <span class="label">小程序用户</span>
              <span class="value">{{ stats.users.miniapp_count }}</span>
            </div>
            <div class="data-item">
              <span class="label">APP用户</span>
              <span class="value">{{ stats.users.app_count }}</span>
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="page-card">
          <h3 class="card-title">通知统计</h3>
          <div class="data-list">
            <div class="data-item">
              <span class="label">短信通知</span>
              <span class="value">{{ stats.notifications.sms_count }}</span>
            </div>
            <div class="data-item">
              <span class="label">推送通知</span>
              <span class="value">{{ stats.notifications.push_count }}</span>
            </div>
            <div class="data-item">
              <span class="label">发送成功</span>
              <span class="value success">{{ stats.notifications.sent_count }}</span>
            </div>
            <div class="data-item">
              <span class="label">发送失败</span>
              <span class="value danger">{{ stats.notifications.failed_count }}</span>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dashboard-page {
  min-height: 100%;
}

.stat-row {
  margin-bottom: 20px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.data-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.data-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.data-item .label {
  color: #606266;
  font-size: 14px;
}

.data-item .value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.data-item .value.success {
  color: var(--success-color);
}

.data-item .value.danger {
  color: var(--danger-color);
}
</style>
