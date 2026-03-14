"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    __expose();
    const pageUrl = common_vendor.ref("");
    const isValidHttpUrl = (url) => /^https?:\/\/.+/i.test(url);
    const initPageUrl = (options = {}) => {
      const decodedUrl = decodeURIComponent(options.url || "");
      if (!decodedUrl || !isValidHttpUrl(decodedUrl)) {
        pageUrl.value = "";
        return;
      }
      pageUrl.value = decodedUrl;
    };
    common_vendor.onLoad((options) => {
      initPageUrl(options);
    });
    const __returned__ = { pageUrl, isValidHttpUrl, initPageUrl, ref: common_vendor.ref, get onLoad() {
      return common_vendor.onLoad;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $setup.pageUrl
  }, $setup.pageUrl ? {
    b: $setup.pageUrl
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-f397c225"], ["__file", "/Users/wangjun/Documents/GitHub/金融APP/mobile/src/pages/webview/index.vue"]]);
wx.createPage(MiniProgramPage);
