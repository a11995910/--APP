/**
 * 首页数据状态管理
 * 职责：统一管理首页 Banner、统计信息、贷款列表以及对应的加载流程。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getBanners } from '../api/banner'
import { getHomeData } from '../api/user'
import { getLoans } from '../api/loan'

/**
 * 首页默认数据结构。
 * @returns {{monthlyAmount:number, loanCount:number, nextRepayment:Object|null, hasLoan:boolean}} 默认首页数据。
 */
function createDefaultHomeData() {
    return {
        monthlyAmount: 0,
        loanCount: 0,
        nextRepayment: null,
        hasLoan: false
    }
}

/**
 * 获取本地持久化 token。
 * 说明：静默登录成功后 `setStorageSync` 是同步的，读取本地缓存比依赖页面当拍响应式更新更稳定。
 *
 * @returns {string} 当前持久化 token。
 */
function getPersistedToken() {
    return uni.getStorageSync('token') || ''
}

export const useHomeStore = defineStore('home', () => {
    const banners = ref([])
    const loanList = ref([])
    const homeData = ref(createDefaultHomeData())
    const loading = ref(false)
    const latestLoadSerial = ref(0)
    const refreshSignal = ref(0)
    const refreshReason = ref('')

    const hasLoans = computed(() => homeData.value.hasLoan || loanList.value.length > 0)

    /**
     * 重置首页贷款相关数据。
     * 说明：未登录或退出登录时需要清空，避免旧账户数据残留。
     */
    function resetLoanData() {
        loanList.value = []
        homeData.value = createDefaultHomeData()
    }

    /**
     * 标记首页需要刷新。
     * 说明：用于跨页面、跨生命周期显式通知首页在登录完成后重新拉取业务数据。
     *
     * @param {string} reason 刷新原因。
     */
    function requestRefresh(reason = 'unknown') {
        refreshSignal.value = Date.now()
        refreshReason.value = reason
    }

    /**
     * 归一化首页统计结构。
     * @param {Object} apiData 接口返回数据。
     */
    function applyHomeData(apiData = {}) {
        homeData.value = {
            monthlyAmount: apiData.monthlyAmount || 0,
            loanCount: apiData.loanCount || 0,
            nextRepayment: apiData.nextRepayment || null,
            hasLoan: Boolean(apiData.hasLoan)
        }
    }

    /**
     * 拉取 Banner 数据。
     */
    async function loadBanners() {
        try {
            const res = await getBanners()
            if (res.success) {
                banners.value = res.data || []
            }
        } catch (error) {
            void error
        }
    }

    /**
     * 拉取首页统计数据。
     */
    async function loadHomeSummary() {
        const persistedToken = getPersistedToken()

        if (!persistedToken) {
            applyHomeData()
            return
        }

        const res = await getHomeData()
        if (res.success) {
            applyHomeData(res.data)
        }
    }

    /**
     * 拉取贷款列表。
     */
    async function loadLoanList() {
        const persistedToken = getPersistedToken()

        if (!persistedToken) {
            loanList.value = []
            return
        }

        const res = await getLoans({ status: 1 })
        if (res.success) {
            loanList.value = res.data || []
        }
    }

    /**
     * 统一加载首页所有数据。
     * @param {string} trigger 触发来源。
     * @returns {Promise<void>} 加载结果。
     */
    async function loadDashboard(trigger = 'unknown') {
        const persistedToken = getPersistedToken()
        const loadSerial = Date.now()
        latestLoadSerial.value = loadSerial
        loading.value = true

        try {
            await loadBanners()

            if (!getPersistedToken()) {
                resetLoanData()
                return
            }

            await Promise.all([loadHomeSummary(), loadLoanList()])
        } catch (error) {
            void error
        } finally {
            if (latestLoadSerial.value === loadSerial) {
                loading.value = false
            }
        }
    }

    return {
        banners,
        loanList,
        homeData,
        loading,
        hasLoans,
        refreshSignal,
        refreshReason,
        resetLoanData,
        requestRefresh,
        loadDashboard
    }
})
