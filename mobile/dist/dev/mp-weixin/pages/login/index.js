"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_home = require("../../stores/home.js");
const stores_user = require("../../stores/user.js");
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    __expose();
    const homeStore = stores_home.useHomeStore();
    const userStore = stores_user.useUserStore();
    const phone = common_vendor.ref("");
    const loading = common_vendor.ref(false);
    const getMiniappCode = () => new Promise((resolve) => {
      common_vendor.index.login({
        success: (res) => resolve(res.code || ""),
        fail: () => resolve("")
      });
    });
    function redirectAfterLogin() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        common_vendor.index.navigateBack();
        return;
      }
      common_vendor.index.switchTab({
        url: "/pages/index/index"
      });
    }
    const handleLogin = async () => {
      if (!/^1\d{10}$/.test(phone.value)) {
        return common_vendor.index.showToast({ title: "请输入正确的手机号", icon: "none" });
      }
      loading.value = true;
      try {
        let wechatCode = "";
        let platform = "miniapp";
        wechatCode = await getMiniappCode();
        if (!wechatCode) {
          common_vendor.index.showToast({ title: "微信登录凭证获取失败，请重试", icon: "none" });
          return;
        }
        const res = await userStore.login(phone.value, platform, {
          wechat_code: wechatCode
        });
        if (res.success) {
          homeStore.requestRefresh("phoneLoginSuccess");
          await homeStore.loadDashboard("phoneLoginSuccess");
          common_vendor.index.showToast({ title: "登录成功", icon: "success" });
          setTimeout(redirectAfterLogin, 300);
        }
      } catch (error) {
        common_vendor.index.showToast({ title: (error == null ? void 0 : error.message) || "登录失败，请重试", icon: "none" });
      } finally {
        loading.value = false;
      }
    };
    common_vendor.onShow(() => {
      if (userStore.isLoggedIn) {
        redirectAfterLogin();
      }
    });
    const __returned__ = { homeStore, userStore, phone, loading, getMiniappCode, redirectAfterLogin, handleLogin, ref: common_vendor.ref, get onShow() {
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
  return {
    a: $setup.phone,
    b: common_vendor.o(($event) => $setup.phone = $event.detail.value),
    c: common_vendor.o($setup.handleLogin),
    d: $setup.loading,
    e: !$setup.phone || $setup.phone.length !== 11
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-45258083"], ["__file", "/Users/wangjun/Documents/GitHub/金融APP/mobile/src/pages/login/index.vue"]]);
wx.createPage(MiniProgramPage);
