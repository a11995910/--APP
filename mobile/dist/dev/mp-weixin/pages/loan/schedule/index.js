"use strict";
const common_vendor = require("../../../common/vendor.js");
const api_loan = require("../../../api/loan.js");
const utils_repayment = require("../../../utils/repayment.js");
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    __expose();
    const loaded = common_vendor.ref(false);
    const summary = common_vendor.ref({
      principal: 0,
      totalInterest: 0
    });
    const schedule = common_vendor.ref([]);
    function parseFirstPayment(firstPayment) {
      const now = /* @__PURE__ */ new Date();
      const [yearText, monthText] = String(firstPayment || "").split("/");
      const year = Number(yearText) || now.getFullYear();
      const month = Number(monthText) || now.getMonth() + 1;
      return { year, month };
    }
    function buildPeriodLabel(startYear, startMonth, offset) {
      const totalMonth = startYear * 12 + (startMonth - 1) + offset;
      const year = Math.floor(totalMonth / 12);
      const month = totalMonth % 12 + 1;
      return `${year}/${month}`;
    }
    function formatMoney(value) {
      return Number(value || 0).toFixed(2);
    }
    async function loadSchedule(id) {
      const res = await api_loan.getLoanSchedule(id);
      if (res.success) {
        summary.value = res.data.summary || { principal: 0, totalInterest: 0 };
        schedule.value = res.data.schedule || [];
        loaded.value = true;
      }
    }
    function loadPreviewSchedule(options) {
      const principal = Number(options.principal || 0);
      const annualRate = Number(options.annual_rate || 0);
      const termMonths = Number(options.term_months || 0);
      const repaymentMethod = utils_repayment.normalizeRepaymentMethod(options.repayment_method);
      const firstPayment = options.first_payment || "";
      if (!(principal > 0 && termMonths > 0)) {
        common_vendor.index.showToast({ title: "预览参数不完整", icon: "none" });
        return;
      }
      const rawSchedule = utils_repayment.calculateSchedule({
        principal,
        annualRate,
        termMonths,
        repaymentMethod
      });
      const firstDate = parseFirstPayment(firstPayment);
      schedule.value = rawSchedule.map((item, index) => ({
        ...item,
        periodLabel: buildPeriodLabel(firstDate.year, firstDate.month, index),
        is_current: index === 0
      }));
      summary.value = {
        principal,
        totalInterest: utils_repayment.getTotalInterest(rawSchedule)
      };
      loaded.value = true;
    }
    common_vendor.onLoad((options) => {
      if (options.mode === "preview") {
        loadPreviewSchedule(options);
        return;
      }
      loadSchedule(options.id);
    });
    const __returned__ = { loaded, summary, schedule, parseFirstPayment, buildPeriodLabel, formatMoney, loadSchedule, loadPreviewSchedule, ref: common_vendor.ref, get onLoad() {
      return common_vendor.onLoad;
    }, get getLoanSchedule() {
      return api_loan.getLoanSchedule;
    }, get calculateSchedule() {
      return utils_repayment.calculateSchedule;
    }, get getTotalInterest() {
      return utils_repayment.getTotalInterest;
    }, get normalizeRepaymentMethod() {
      return utils_repayment.normalizeRepaymentMethod;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $setup.loaded
  }, $setup.loaded ? {
    b: common_vendor.t($setup.formatMoney($setup.summary.principal)),
    c: common_vendor.t($setup.formatMoney($setup.summary.totalInterest)),
    d: common_vendor.f($setup.schedule, (item, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(item.periodLabel),
        b: item.is_current
      }, item.is_current ? {} : {}, {
        c: common_vendor.t($setup.formatMoney(item.payment)),
        d: common_vendor.t($setup.formatMoney(item.balance)),
        e: item.period,
        f: item.is_current ? 1 : ""
      });
    })
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-5617d974"], ["__file", "/Users/wangjun/Documents/GitHub/金融APP/mobile/src/pages/loan/schedule/index.vue"]]);
wx.createPage(MiniProgramPage);
