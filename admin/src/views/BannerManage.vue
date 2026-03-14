<script setup>
/**
 * Banner管理页面
 * 支持图片上传功能
 */
import { ref, reactive, onMounted } from 'vue'
import { getBannerList, createBanner, updateBanner, deleteBanner, toggleBannerStatus } from '../api/banner'
import { uploadImage } from '../api/upload'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const tableData = ref([])
const loading = ref(false)
const total = ref(0)
const searchParams = reactive({ page: 1, pageSize: 10, status: '' })

const dialogVisible = ref(false)
const dialogTitle = ref('新增Banner')
const formLoading = ref(false)
const formRef = ref(null)
const form = reactive({ id: null, title: '', image_url: '', link_url: '', sort_order: 0, status: 1 })
const rules = { 
  title: [{ required: true, message: '请输入标题' }], 
  image_url: [{ required: true, message: '请上传图片' }] 
}

// 上传相关
const uploadLoading = ref(false)
const imageUrl = ref('')

const loadData = async () => {
  loading.value = true
  try {
    const res = await getBannerList(searchParams)
    if (res.success) { tableData.value = res.data.list; total.value = res.data.pagination.total }
  } finally { loading.value = false }
}

const handleAdd = () => { 
  dialogTitle.value = '新增Banner'
  Object.assign(form, { id: null, title: '', image_url: '', link_url: '', sort_order: 0, status: 1 })
  imageUrl.value = ''
  dialogVisible.value = true 
}

const handleEdit = (row) => { 
  dialogTitle.value = '编辑Banner'
  Object.assign(form, row)
  imageUrl.value = row.image_url
  dialogVisible.value = true 
}

const handleSubmit = async () => {
  if (!(await formRef.value.validate().catch(() => false))) return
  formLoading.value = true
  try {
    const res = form.id ? await updateBanner(form.id, form) : await createBanner(form)
    if (res.success) { 
      ElMessage.success(form.id ? '更新成功' : '创建成功')
      dialogVisible.value = false
      // 如果是新增，重置到第一页
      if (!form.id) {
        searchParams.page = 1
      }
      loadData() 
    }
  } finally { formLoading.value = false }
}

const handleDelete = async (row) => { 
  await ElMessageBox.confirm('确定删除？')
  const res = await deleteBanner(row.id)
  if (res.success) { ElMessage.success('删除成功'); loadData() } 
}

const handleToggle = async (row) => { 
  const res = await toggleBannerStatus(row.id)
  if (res.success) { ElMessage.success(res.message); loadData() } 
}

/**
 * 处理图片上传
 */
const handleUpload = async (options) => {
  const { file } = options
  
  // 验证文件类型
  const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
  if (!isImage) {
    ElMessage.error('只能上传 JPG/PNG/GIF/WEBP 格式的图片')
    return
  }
  
  // 验证文件大小
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB')
    return
  }
  
  uploadLoading.value = true
  try {
    const res = await uploadImage(file)
    if (res.success) {
      form.image_url = res.data.url
      imageUrl.value = res.data.url
      ElMessage.success('上传成功')
    } else {
      ElMessage.error(res.message || '上传失败')
    }
  } catch (error) {
    ElMessage.error('上传失败')
  } finally {
    uploadLoading.value = false
  }
}

onMounted(() => loadData())
</script>

<template>
  <div class="page-card">
    <h2 class="page-title"><el-icon><Picture /></el-icon>Banner管理</h2>
    <div class="table-toolbar">
      <el-select v-model="searchParams.status" placeholder="状态" clearable style="width:120px" @change="loadData">
        <el-option label="上架" :value="1" />
        <el-option label="下架" :value="0" />
      </el-select>
      <el-button type="primary" @click="handleAdd"><el-icon><Plus /></el-icon>新增</el-button>
    </div>
    <el-table :data="tableData" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="图片" width="150">
        <template #default="{ row }">
          <el-image 
            :src="row.image_url" 
            style="width:120px;height:48px;border-radius:4px" 
            fit="cover"
            loading="lazy"
          >
            <template #error>
              <div class="image-slot-error">
                <el-icon><Picture /></el-icon>
              </div>
            </template>
            <template #placeholder>
              <div class="image-slot-placeholder">
                <el-icon class="is-loading"><Loading /></el-icon>
              </div>
            </template>
          </el-image>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="sort_order" label="排序" width="80" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-switch :model-value="row.status===1" @change="handleToggle(row)" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
          <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="pagination-wrapper">
      <el-pagination 
        v-model:current-page="searchParams.page" 
        :page-size="searchParams.pageSize" 
        :total="total" 
        layout="total,prev,pager,next" 
        @current-change="loadData" 
      />
    </div>
  </div>
  
  <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" />
      </el-form-item>
      <el-form-item label="图片" prop="image_url">
        <el-upload
          class="banner-uploader"
          :show-file-list="false"
          :http-request="handleUpload"
          accept="image/jpeg,image/png,image/gif,image/webp"
        >
          <img v-if="imageUrl" :src="imageUrl" class="banner-preview" />
          <div v-else class="banner-uploader-placeholder" v-loading="uploadLoading">
            <el-icon><Plus /></el-icon>
            <span>点击上传图片</span>
          </div>
        </el-upload>
        <div class="upload-tip">支持 JPG/PNG/GIF/WEBP 格式，不超过5MB</div>
      </el-form-item>
      <el-form-item label="跳转链接">
        <el-input v-model="form.link_url" placeholder="选填，点击Banner跳转的链接" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="form.sort_order" :min="0" />
      </el-form-item>
      <el-form-item label="状态">
        <el-radio-group v-model="form.status">
          <el-radio :value="1">上架</el-radio>
          <el-radio :value="0">下架</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible=false">取消</el-button>
      <el-button type="primary" :loading="formLoading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.banner-uploader {
  width: 100%;
}

.banner-uploader :deep(.el-upload) {
  width: 100%;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.3s;
}

.banner-uploader :deep(.el-upload:hover) {
  border-color: var(--el-color-primary);
}

.banner-preview {
  width: 100%;
  height: 120px;
  object-fit: cover;
  display: block;
}

.banner-uploader-placeholder {
  width: 100%;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8c939d;
  gap: 8px;
}

.banner-uploader-placeholder .el-icon {
  font-size: 28px;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.image-slot-error,
.image-slot-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
  font-size: 20px;
}
</style>
