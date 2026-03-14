<script setup>
/**
 * 用户管理页面
 */
import { ref, reactive, onMounted } from 'vue'
import { getUserList, updateUserStatus, getUserDetail } from '../api/user'
import { ElMessage, ElMessageBox } from 'element-plus'

// 表格数据
const tableData = ref([])
const loading = ref(false)
const total = ref(0)

// 搜索参数
const searchParams = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  platform: '',
  status: ''
})

// 详情弹窗
const detailVisible = ref(false)
const detailLoading = ref(false)
const currentUser = ref(null)

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const res = await getUserList(searchParams)
    if (res.success) {
      tableData.value = res.data.list
      total.value = res.data.pagination.total
    }
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  searchParams.page = 1
  loadData()
}

// 重置
const handleReset = () => {
  searchParams.keyword = ''
  searchParams.platform = ''
  searchParams.status = ''
  handleSearch()
}

// 分页变化
const handlePageChange = (page) => {
  searchParams.page = page
  loadData()
}

// 查看详情
const handleView = async (row) => {
  detailVisible.value = true
  detailLoading.value = true
  try {
    const res = await getUserDetail(row.id)
    if (res.success) {
      currentUser.value = res.data
    }
  } finally {
    detailLoading.value = false
  }
}

// 切换状态
const handleToggleStatus = async (row) => {
  const newStatus = row.status === 1 ? 0 : 1
  const action = newStatus === 1 ? '启用' : '禁用'
  
  try {
    await ElMessageBox.confirm(`确定要${action}该用户吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const res = await updateUserStatus(row.id, newStatus)
    if (res.success) {
      ElMessage.success(`${action}成功`)
      loadData()
    }
  } catch {
    // 用户取消
  }
}

// 格式化平台
const formatPlatform = (val) => {
  return val === 'miniapp' ? '小程序' : 'APP'
}

// 格式化通知类型
const formatNotifyType = (val) => {
  const map = { sms: '短信', push: '推送', both: '短信+推送' }
  return map[val] || val
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="user-manage-page">
    <div class="page-card">
      <h2 class="page-title">
        <el-icon><User /></el-icon>
        用户管理
      </h2>

      <!-- 搜索栏 -->
      <el-form class="search-form" inline>
        <el-form-item>
          <el-input
            v-model="searchParams.keyword"
            placeholder="手机号/昵称"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-select v-model="searchParams.platform" placeholder="平台" clearable style="width: 120px">
            <el-option label="小程序" value="miniapp" />
            <el-option label="APP" value="app" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="searchParams.status" placeholder="状态" clearable style="width: 120px">
            <el-option label="正常" :value="1" />
            <el-option label="禁用" :value="0" />
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
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="nickname" label="昵称" />
        <el-table-column prop="platform" label="平台" width="100">
          <template #default="{ row }">
            <el-tag :type="row.platform === 'miniapp' ? 'success' : 'primary'" size="small">
              {{ formatPlatform(row.platform) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="notify_type" label="通知方式" width="120">
          <template #default="{ row }">
            {{ formatNotifyType(row.notify_type) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间" width="170" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">详情</el-button>
            <el-button 
              :type="row.status === 1 ? 'danger' : 'success'" 
              link 
              size="small" 
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
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

    <!-- 用户详情弹窗 -->
    <el-dialog v-model="detailVisible" title="用户详情" width="600px">
      <div v-loading="detailLoading">
        <template v-if="currentUser">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="用户ID">{{ currentUser.id }}</el-descriptions-item>
            <el-descriptions-item label="手机号">{{ currentUser.phone }}</el-descriptions-item>
            <el-descriptions-item label="昵称">{{ currentUser.nickname }}</el-descriptions-item>
            <el-descriptions-item label="平台">{{ formatPlatform(currentUser.platform) }}</el-descriptions-item>
            <el-descriptions-item label="微信OpenID">{{ currentUser.wechat_openid || '-' }}</el-descriptions-item>
            <el-descriptions-item label="通知方式">{{ formatNotifyType(currentUser.notify_type) }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="currentUser.status === 1 ? 'success' : 'danger'" size="small">
                {{ currentUser.status === 1 ? '正常' : '禁用' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="注册时间">{{ currentUser.created_at }}</el-descriptions-item>
          </el-descriptions>

          <h4 style="margin: 20px 0 12px;">贷款信息</h4>
          <el-table :data="currentUser.loans" size="small" max-height="200">
            <el-table-column prop="loan_name" label="贷款名称" />
            <el-table-column prop="monthly_payment" label="月还款额" />
            <el-table-column prop="payment_day" label="还款日" width="80" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? '还款中' : '已结清' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>

          <h4 style="margin: 20px 0 12px;">通知统计</h4>
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="总通知数">{{ currentUser.notifyStats?.total || 0 }}</el-descriptions-item>
            <el-descriptions-item label="发送成功">{{ currentUser.notifyStats?.sent_count || 0 }}</el-descriptions-item>
            <el-descriptions-item label="发送失败">{{ currentUser.notifyStats?.failed_count || 0 }}</el-descriptions-item>
          </el-descriptions>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.user-manage-page {
  min-height: 100%;
}
</style>
