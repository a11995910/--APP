"use strict";
const common_vendor = require("../common/vendor.js");
const api_banner = require("../api/banner.js");
const api_user = require("../api/user.js");
const api_loan = require("../api/loan.js");
const stores_user = require("./user.js");
function createDefaultHomeData() {
  return {
    monthlyAmount: 0,
    loanCount: 0,
    nextRepayment: null,
    hasLoan: false
  };
}
function getPersistedToken() {
  return common_vendor.index.getStorageSync("token") || "";
}
const useHomeStore = common_vendor.defineStore("home", () => {
  const banners = common_vendor.ref([]);
  const loanList = common_vendor.ref([]);
  const homeData = common_vendor.ref(createDefaultHomeData());
  const loading = common_vendor.ref(false);
  const latestLoadSerial = common_vendor.ref(0);
  const refreshSignal = common_vendor.ref(0);
  const refreshReason = common_vendor.ref("");
  const hasLoans = common_vendor.computed(() => homeData.value.hasLoan || loanList.value.length > 0);
  function resetLoanData() {
    loanList.value = [];
    homeData.value = createDefaultHomeData();
  }
  function requestRefresh(reason = "unknown") {
    refreshSignal.value = Date.now();
    refreshReason.value = reason;
    console.log("[首页数据] 标记首页刷新信号", {
      reason,
      refreshSignal: refreshSignal.value
    });
  }
  function applyHomeData(apiData = {}) {
    homeData.value = {
      monthlyAmount: apiData.monthlyAmount || 0,
      loanCount: apiData.loanCount || 0,
      nextRepayment: apiData.nextRepayment || null,
      hasLoan: Boolean(apiData.hasLoan)
    };
  }
  async function loadBanners() {
    console.log("[首页数据] 开始请求 Banner");
    try {
      const res = await api_banner.getBanners();
      console.log("[首页数据] Banner 请求完成", {
        success: Boolean(res == null ? void 0 : res.success),
        size: Array.isArray(res == null ? void 0 : res.data) ? res.data.length : 0
      });
      if (res.success) {
        banners.value = res.data || [];
      }
    } catch (error) {
      console.error("[首页数据] Banner 请求失败", error);
    }
  }
  async function loadHomeSummary() {
    var _a, _b;
    stores_user.useUserStore();
    const persistedToken = getPersistedToken();
    console.log("[首页数据] 开始请求首页统计", {
      hasToken: Boolean(persistedToken)
    });
    if (!persistedToken) {
      console.warn("[首页数据] 当前无 token，跳过首页统计请求");
      applyHomeData();
      return;
    }
    try {
      const res = await api_user.getHomeData();
      console.log("[首页数据] 首页统计请求完成", {
        success: Boolean(res == null ? void 0 : res.success),
        message: res == null ? void 0 : res.message,
        monthlyAmount: (_a = res == null ? void 0 : res.data) == null ? void 0 : _a.monthlyAmount,
        loanCount: (_b = res == null ? void 0 : res.data) == null ? void 0 : _b.loanCount
      });
      if (res.success) {
        applyHomeData(res.data);
      }
    } catch (error) {
      console.error("[首页数据] 首页统计请求失败", error);
      throw error;
    }
  }
  async function loadLoanList() {
    stores_user.useUserStore();
    const persistedToken = getPersistedToken();
    console.log("[首页数据] 开始请求贷款列表", {
      hasToken: Boolean(persistedToken)
    });
    if (!persistedToken) {
      console.warn("[首页数据] 当前无 token，跳过贷款列表请求");
      loanList.value = [];
      return;
    }
    try {
      const res = await api_loan.getLoans({ status: 1 });
      console.log("[首页数据] 贷款列表请求完成", {
        success: Boolean(res == null ? void 0 : res.success),
        message: res == null ? void 0 : res.message,
        size: Array.isArray(res == null ? void 0 : res.data) ? res.data.length : 0
      });
      if (res.success) {
        loanList.value = res.data || [];
      }
    } catch (error) {
      console.error("[首页数据] 贷款列表请求失败", error);
      throw error;
    }
  }
  async function loadDashboard(trigger = "unknown") {
    var _a;
    const userStore = stores_user.useUserStore();
    const persistedToken = getPersistedToken();
    const loadSerial = Date.now();
    latestLoadSerial.value = loadSerial;
    loading.value = true;
    console.log("[首页数据] 开始刷新首页数据", {
      trigger,
      loadSerial,
      hasToken: Boolean(persistedToken),
      userId: ((_a = userStore.userInfo) == null ? void 0 : _a.id) || null
    });
    try {
      await loadBanners();
      console.log("[首页数据] Banner 阶段结束，准备检查 token 并决定是否继续请求业务数据", {
        loadSerial,
        persistedHasTokenAfterBanner: Boolean(getPersistedToken())
      });
      if (!getPersistedToken()) {
        resetLoanData();
        console.log("[首页数据] 无 token，仅刷新 Banner 并清空贷款数据", {
          loadSerial
        });
        return;
      }
      console.log("[首页数据] token 可用，开始并行请求首页统计与贷款列表", {
        loadSerial
      });
      await Promise.all([loadHomeSummary(), loadLoanList()]);
      console.log("[首页数据] 首页数据刷新完成", {
        loadSerial,
        hasLoans: hasLoans.value,
        loanListSize: loanList.value.length,
        monthlyAmount: homeData.value.monthlyAmount
      });
    } catch (error) {
      console.error("[首页数据] 首页数据刷新失败", {
        loadSerial,
        trigger,
        error
      });
    } finally {
      if (latestLoadSerial.value === loadSerial) {
        loading.value = false;
        console.log("[首页数据] 结束首页加载态", { loadSerial });
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
  };
});
exports.useHomeStore = useHomeStore;
