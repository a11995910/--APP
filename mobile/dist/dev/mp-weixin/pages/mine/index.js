"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_user = require("../../stores/user.js");
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    __expose();
    const userStore = stores_user.useUserStore();
    const maskPhone = (phone) => phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : "";
    const goLogin = () => common_vendor.index.navigateTo({ url: "/pages/login/index" });
    const showAbout = () => common_vendor.index.showModal({ title: "关于我们", content: "贷款提醒助手\n帮助您管理贷款还款", showCancel: false });
    const showFeedback = () => common_vendor.index.showToast({ title: "功能开发中", icon: "none" });
    const handleLogout = () => {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定退出登录？",
        success: (res) => {
          if (res.confirm) {
            userStore.logout();
            common_vendor.index.showToast({ title: "已退出", icon: "success" });
          }
        }
      });
    };
    const __returned__ = { userStore, maskPhone, goLogin, showAbout, showFeedback, handleLogout, get useUserStore() {
      return stores_user.useUserStore;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b, _c;
  return common_vendor.e({
    a: $setup.userStore.isLoggedIn
  }, $setup.userStore.isLoggedIn ? {
    b: ((_a = $setup.userStore.userInfo) == null ? void 0 : _a.avatar) || "/static/default-avatar.png",
    c: common_vendor.t(((_b = $setup.userStore.userInfo) == null ? void 0 : _b.nickname) || "用户"),
    d: common_vendor.t($setup.maskPhone((_c = $setup.userStore.userInfo) == null ? void 0 : _c.phone))
  } : {
    e: common_vendor.o($setup.goLogin)
  }, {
    f: common_vendor.o($setup.showAbout),
    g: common_vendor.o($setup.showFeedback),
    h: $setup.userStore.isLoggedIn
  }, $setup.userStore.isLoggedIn ? {
    i: common_vendor.o($setup.handleLogout)
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-9023ef44"], ["__file", "/Users/wangjun/Documents/GitHub/金融APP/mobile/src/pages/mine/index.vue"]]);
wx.createPage(MiniProgramPage);
