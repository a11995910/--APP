"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
if (!Math) {
  "./pages/index/index.js";
  "./pages/loan/add/index.js";
  "./pages/loan/edit/index.js";
  "./pages/loan/schedule/index.js";
  "./pages/mine/index.js";
  "./pages/login/index.js";
  "./pages/webview/index.js";
}
const _sfc_main = {
  __name: "App",
  setup(__props, { expose: __expose }) {
    __expose();
    common_vendor.onLaunch(() => {
      console.log("App Launch");
    });
    common_vendor.onShow(() => {
      console.log("App Show");
    });
    common_vendor.onHide(() => {
      console.log("App Hide");
    });
    const __returned__ = { get onLaunch() {
      return common_vendor.onLaunch;
    }, get onShow() {
      return common_vendor.onShow;
    }, get onHide() {
      return common_vendor.onHide;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
const App = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__file", "/Users/wangjun/Documents/GitHub/金融APP/mobile/src/App.vue"]]);
function createApp() {
  const app = common_vendor.createSSRApp(App);
  const pinia = common_vendor.createPinia();
  app.use(pinia);
  return { app };
}
createApp().app.mount("#app");
exports.createApp = createApp;
