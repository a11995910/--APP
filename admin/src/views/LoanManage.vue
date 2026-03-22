<script setup>
/**
 * 贷款管理页面。
 * 说明：
 * 1. 默认按创建时间倒序展示。
 * 2. 支持切换为按到期日升序展示，便于优先处理即将到期与已逾期贷款。
 */
import { ref, reactive, onMounted } from 'vue'
import { getLoanList, getLoanStats } from '../api/loan'

// 表格数据
const tableData = ref([])
const loading = ref(false)
const total = ref(0)

// 搜索参数
const searchParams = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  status: '',
  sortBy: 'created_at'
})

// 统计数据
const stats = ref({
  total: 0,
  active_count: 0,
  completed_count: 0,
  total_principal: 0,
  monthly_repayment: 0
})

/**
 * 加载贷款表格数据。
 * @returns {Promise<void>} 无返回值。
 */
const loadData = async () => {
  loading.value = true
  try {
    const res = await getLoanList(searchParams)
    if (res.success) {
      tableData.value = res.data.list
      total.value = res.data.pagination.total
    }
  } finally {
    loading.value = false
  }
}

/**
 * 加载顶部统计数据。
 * @returns {Promise<void>} 无返回值。
 */
const loadStats = async () => {
  const res = await getLoanStats()
  if (res.success) {
    stats.value = res.data
  }
}

/**
 * 执行筛选搜索。
 * 行为：重置到第一页后重新拉取列表。
 */
const handleSearch = () => {
  searchParams.page = 1
  loadData()
}

/**
 * 重置搜索条件。
 * 行为：恢复默认状态与默认排序。
 */
const handleReset = () => {
  searchParams.keyword = ''
  searchParams.status = ''
  searchParams.sortBy = 'created_at'
  handleSearch()
}

/**
 * 处理分页变化。
 * @param {number} page 当前页码。
 */
const handlePageChange = (page) => {
  searchParams.page = page
  loadData()
}

/**
 * 格式化金额显示。
 * @param {number|string} val 金额值。
 * @returns {string} 千分位金额字符串。
 */
const formatMoney = (val) => {
  return Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

/**
 * 格式化日期显示。
 * 说明：统一将后端返回的 ISO 字符串格式化为 `YYYY-MM-DD`，避免后台直接展示 UTC 原始串。
 * @param {string} value 原始日期值。
 * @returns {string} 格式化后的日期字符串。
 */
const formatDate = (value) => {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10) || '-'
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

onMounted(() => {
  loadData()
  loadStats()
})
</script>

<template>
  <div class="loan-manage-page">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-row">
      <el-col :span="6">
        <div class="stat-card mini">
          <div class="stat-icon">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-title">总贷款数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card mini success">
          <div class="stat-icon">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.active_count }}</div>
            <div class="stat-title">还款中</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card mini warning">
          <div class="stat-icon">
            <el-icon><Money /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">¥{{ formatMoney(stats.total_principal) }}</div>
            <div class="stat-title">总本金</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card mini info">
          <div class="stat-icon">
            <el-icon><Wallet /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">¥{{ formatMoney(stats.monthly_repayment) }}</div>
            <div class="stat-title">月还款</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <div class="page-card">
      <h2 class="page-title">
        <el-icon><Money /></el-icon>
        贷款管理
      </h2>

      <!-- 搜索栏 -->
      <el-form class="search-form" inline>
        <el-form-item>
          <el-input
            v-model="searchParams.keyword"
            placeholder="贷款名称/手机号"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-select v-model="searchParams.status" placeholder="状态" clearable style="width: 120px">
            <el-option label="还款中" :value="1" />
            <el-option label="已结清" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="searchParams.sortBy" placeholder="排序方式" style="width: 170px">
            <el-option label="按创建时间排序" value="created_at" />
            <el-option label="按到期时间排序" value="end_date" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="loan_name" label="贷款名称" />
        <el-table-column prop="phone" label="用户手机" width="130" />
        <el-table-column prop="principal" label="本金" width="120">
          <template #default="{ row }">
            ¥{{ formatMoney(row.principal) }}
          </template>
        </el-table-column>
        <el-table-column prop="monthly_payment" label="月还款" width="120">
          <template #default="{ row }">
            ¥{{ formatMoney(row.monthly_payment) }}
          </template>
        </el-table-column>
        <el-table-column prop="payment_day" label="还款日" width="80">
          <template #default="{ row }">
            {{ row.payment_day }}日
          </template>
        </el-table-column>
        <el-table-column prop="remind_days" label="提前提醒" width="100">
          <template #default="{ row }">
            {{ row.remind_days }}天
          </template>
        </el-table-column>
        <el-table-column prop="end_date" label="到期日" width="120">
          <template #default="{ row }">
            {{ formatDate(row.end_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '还款中' : '已结清' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="searchParams.page"
          :page-size="searchParams.pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.loan-manage-page {
  min-height: 100%;
}

.stat-row {
  margin-bottom: 20px;
}

.stat-card.mini {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  height: 100%;
}

.stat-card.mini .stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 24px;
}

.stat-card.mini.success .stat-icon {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.stat-card.mini.warning .stat-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-card.mini.info .stat-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-card.mini .stat-info .stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
}

.stat-card.mini .stat-info .stat-title {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}
</style>
