"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_home = require("../../stores/home.js");
const stores_user = require("../../stores/user.js");
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    __expose();
    const userStore = stores_user.useUserStore();
    const homeStore = stores_home.useHomeStore();
    const authLoading = common_vendor.ref(false);
    const loadingText = common_vendor.ref("首页加载中...");
    const banners = common_vendor.computed(() => homeStore.banners);
    const loanList = common_vendor.computed(() => homeStore.loanList);
    const homeData = common_vendor.computed(() => homeStore.homeData);
    const pageLoading = common_vendor.computed(() => homeStore.loading || authLoading.value);
    const hasLoans = common_vendor.computed(() => homeStore.hasLoans);
    const currentMonth = common_vendor.computed(() => {
      const now = /* @__PURE__ */ new Date();
      return `${now.getFullYear()}年${now.getMonth() + 1}月`;
    });
    const getPersistedToken = () => common_vendor.index.getStorageSync("token") || "";
    const formatMoney = (val) => Number(val || 0).toFixed(2);
    const refreshPage = async (trigger = "unknown") => {
      console.log("[首页] 开始刷新页面数据", {
        trigger,
        hasToken: Boolean(getPersistedToken()),
        isLoggedIn: userStore.isLoggedIn
      });
      try {
        common_vendor.index.showNavigationBarLoading();
        loadingText.value = "首页数据加载中...";
        await homeStore.loadDashboard(trigger);
        console.log("[首页] 页面数据刷新完成", {
          trigger,
          hasLoans: homeStore.hasLoans,
          loanListSize: homeStore.loanList.length,
          monthlyAmount: homeStore.homeData.monthlyAmount
        });
      } catch (error) {
        console.error("[首页] 页面数据刷新失败", {
          trigger,
          error
        });
      } finally {
        common_vendor.index.hideNavigationBarLoading();
        console.log("[首页] 结束加载态", { trigger });
      }
    };
    const onBannerClick = (item) => {
      if (!item.link_url) {
        return;
      }
      common_vendor.index.navigateTo({
        url: `/pages/webview/index?url=${encodeURIComponent(item.link_url)}`
      });
    };
    const goAddLoan = () => common_vendor.index.navigateTo({ url: "/pages/loan/add/index" });
    const goLoanDetail = (id) => common_vendor.index.navigateTo({ url: `/pages/loan/edit/index?id=${id}` });
    const goLoanSchedule = (id) => common_vendor.index.navigateTo({ url: `/pages/loan/schedule/index?id=${id}` });
    const ensureLoginThenRefresh = async (trigger = "unknown") => {
      const persistedToken = getPersistedToken();
      console.log("[首页] 检测登录态并准备拉取首页数据", {
        trigger,
        hasToken: Boolean(persistedToken)
      });
      if (persistedToken) {
        console.log("[首页] 发现本地已有 token，直接进入首页数据请求", {
          trigger
        });
        await refreshPage(`${trigger}:hasToken`);
        return;
      }
      if (authLoading.value) {
        console.log("[首页] 静默登录进行中，忽略重复触发", { trigger });
        return;
      }
      authLoading.value = true;
      loadingText.value = "正在登录中...";
      common_vendor.index.showNavigationBarLoading();
      console.log("[首页] 当前未登录，开始静默登录", { trigger });
      try {
        const success = await userStore.silentLoginByMiniappOpenid();
        const latestToken = getPersistedToken();
        console.log("[首页] 静默登录回调完成", {
          trigger,
          success,
          hasToken: Boolean(latestToken)
        });
        if (success && latestToken) {
          console.log("[首页] 静默登录成功，进入 then 回调并再次请求首页数据", {
            trigger
          });
          await refreshPage(`${trigger}:silentLoginThen`);
          console.log("[首页] 静默登录后的首页数据请求已执行完毕", {
            trigger
          });
          return;
        }
        common_vendor.index.reLaunch({
          url: "/pages/login/index",
          success: () => {
            console.log("[首页] 静默登录未命中绑定账号，跳转登录页");
          },
          fail: (error) => {
            console.error("[首页] 跳转登录页失败", error);
          }
        });
      } finally {
        authLoading.value = false;
        common_vendor.index.hideNavigationBarLoading();
      }
    };
    common_vendor.onMounted(() => {
      console.log("[首页] onMounted 触发");
      ensureLoginThenRefresh("onMounted");
    });
    common_vendor.onShow(() => {
      console.log("[首页] onShow 触发");
      ensureLoginThenRefresh("onShow");
    });
    const __returned__ = { userStore, homeStore, authLoading, loadingText, banners, loanList, homeData, pageLoading, hasLoans, currentMonth, getPersistedToken, formatMoney, refreshPage, onBannerClick, goAddLoan, goLoanDetail, goLoanSchedule, ensureLoginThenRefresh, ref: common_vendor.ref, computed: common_vendor.computed, onMounted: common_vendor.onMounted, get onShow() {
      return common_vendor.onShow;
    }, get useHomeStore() {
      return stores_home.useHomeStore;
    }, get useUserStore() {
      return stores_user.useUserStore;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.f($setup.banners, (item, k0, i0) => {
      return {
        a: item.image_url,
        b: common_vendor.o(($event) => $setup.onBannerClick(item), item.id),
        c: item.id
      };
    }),
    b: common_vendor.t($setup.currentMonth),
    c: $setup.hasLoans
  }, $setup.hasLoans ? common_vendor.e({
    d: common_vendor.t($setup.formatMoney($setup.homeData.monthlyAmount)),
    e: common_vendor.t($setup.homeData.nextRepayment ? $setup.homeData.nextRepayment.daysRemaining : "--"),
    f: $setup.homeData.nextRepayment
  }, $setup.homeData.nextRepayment ? {
    g: common_vendor.t($setup.homeData.nextRepayment.loanName),
    h: common_vendor.t($setup.formatMoney($setup.homeData.nextRepayment.amount))
  } : {}) : {
    i: common_vendor.o($setup.goAddLoan)
  }, {
    j: common_vendor.o($setup.goAddLoan),
    k: $setup.loanList.length > 0
  }, $setup.loanList.length > 0 ? {
    l: common_vendor.f($setup.loanList, (loan, k0, i0) => {
      return {
        a: common_vendor.t(loan.loan_name),
        b: common_vendor.t($setup.formatMoney(loan.current_payment_amount)),
        c: common_vendor.t($setup.formatMoney(loan.principal)),
        d: common_vendor.t($setup.formatMoney(loan.remaining_amount)),
        e: common_vendor.t(loan.remind_time_text),
        f: common_vendor.t(loan.repayment_method_label),
        g: common_vendor.t(loan.first_payment),
        h: common_vendor.o(($event) => $setup.goLoanDetail(loan.id), loan.id),
        i: common_vendor.o(($event) => $setup.goLoanSchedule(loan.id), loan.id),
        j: loan.id
      };
    })
  } : {}, {
    m: $setup.loanList.length > 0
  }, $setup.loanList.length > 0 ? {} : {}, {
    n: $setup.pageLoading
  }, $setup.pageLoading ? {
    o: common_vendor.t($setup.loadingText)
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-83a5a03c"], ["__file", "/Users/wangjun/Documents/GitHub/金融APP/mobile/src/pages/index/index.vue"]]);
wx.createPage(MiniProgramPage);
