"use strict";
const common_vendor = require("../../../common/vendor.js");
const api_loan = require("../../../api/loan.js");
const utils_repayment = require("../../../utils/repayment.js");
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    __expose();
    const form = common_vendor.reactive({
      loan_name: "",
      principal: "",
      annual_rate: "",
      term_months: "",
      repayment_method: utils_repayment.REPAYMENT_METHODS.EQUAL_INSTALLMENT,
      first_payment: "",
      remind_enabled: true,
      remind_day: 1,
      remind_hour: 12,
      remind_minute: 0
    });
    const showReminderPicker = common_vendor.ref(false);
    const showFirstPaymentPicker = common_vendor.ref(false);
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const years = Array.from({ length: 31 }, (_, i) => currentYear - 10 + i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);
    const firstPaymentPickerValue = common_vendor.ref([10, 0]);
    const remindPickerValue = common_vendor.ref([0, 12, 0]);
    const methodLabel = common_vendor.computed(() => utils_repayment.REPAYMENT_METHOD_LABELS[form.repayment_method]);
    const monthlyRateText = common_vendor.computed(() => {
      const rate = utils_repayment.calcMonthlyRate(form.annual_rate) * 100;
      return `${Number.isFinite(rate) ? rate.toFixed(2) : "0.00"}%`;
    });
    const monthlyPaymentText = common_vendor.computed(() => {
      var _a, _b;
      if (!isFormCalculable())
        return "0";
      const schedule = utils_repayment.calculateSchedule({
        principal: Number(form.principal),
        annualRate: Number(form.annual_rate),
        termMonths: Number(form.term_months),
        repaymentMethod: form.repayment_method
      });
      return ((_b = (_a = schedule[0]) == null ? void 0 : _a.payment) == null ? void 0 : _b.toFixed(2)) || "0";
    });
    const remindTimeText = common_vendor.computed(() => `每月${form.remind_day}日 ${pad2(form.remind_hour)}:${pad2(form.remind_minute)}`);
    function isFormCalculable() {
      return Number(form.principal) > 0 && Number(form.term_months) > 0 && Number(form.annual_rate) >= 0;
    }
    function pad2(value) {
      return String(value).padStart(2, "0");
    }
    function noop() {
    }
    function goSchedule() {
      if (!isFormCalculable()) {
        common_vendor.index.showToast({ title: "请先填写完整金额、利率和期限", icon: "none" });
        return;
      }
      if (!form.first_payment) {
        common_vendor.index.showToast({ title: "请先选择首期支付日期", icon: "none" });
        return;
      }
      const query = [
        "mode=preview",
        `principal=${encodeURIComponent(Number(form.principal))}`,
        `annual_rate=${encodeURIComponent(Number(form.annual_rate))}`,
        `term_months=${encodeURIComponent(Number(form.term_months))}`,
        `repayment_method=${encodeURIComponent(utils_repayment.normalizeRepaymentMethod(form.repayment_method))}`,
        `first_payment=${encodeURIComponent(form.first_payment)}`
      ].join("&");
      common_vendor.index.navigateTo({ url: `/pages/loan/schedule/index?${query}` });
    }
    function chooseRepaymentMethod() {
      const methods = [
        utils_repayment.REPAYMENT_METHODS.EQUAL_INSTALLMENT,
        utils_repayment.REPAYMENT_METHODS.EQUAL_PRINCIPAL,
        utils_repayment.REPAYMENT_METHODS.INTEREST_FIRST
      ];
      common_vendor.index.showActionSheet({
        itemList: methods.map((item) => utils_repayment.REPAYMENT_METHOD_LABELS[item]),
        success: ({ tapIndex }) => {
          form.repayment_method = methods[tapIndex];
        }
      });
    }
    function buildFirstPaymentPickerValue() {
      if (form.first_payment) {
        const [yearText, monthText] = form.first_payment.split("/");
        const yearIndex = years.findIndex((year) => year === Number(yearText));
        const monthIndex = months.findIndex((month) => month === Number(monthText));
        return [yearIndex >= 0 ? yearIndex : 10, monthIndex >= 0 ? monthIndex : 0];
      }
      const now = /* @__PURE__ */ new Date();
      const defaultYearIndex = years.findIndex((year) => year === now.getFullYear());
      return [defaultYearIndex >= 0 ? defaultYearIndex : 10, now.getMonth()];
    }
    function openFirstPaymentPicker() {
      firstPaymentPickerValue.value = buildFirstPaymentPickerValue();
      showFirstPaymentPicker.value = true;
    }
    function closeFirstPaymentPicker() {
      showFirstPaymentPicker.value = false;
    }
    function onFirstPaymentPickerChange(event) {
      firstPaymentPickerValue.value = event.detail.value;
    }
    function confirmFirstPaymentPicker() {
      const year = years[firstPaymentPickerValue.value[0]];
      const month = months[firstPaymentPickerValue.value[1]];
      form.first_payment = `${year}/${month}`;
      closeFirstPaymentPicker();
    }
    function onRemindCardClick() {
      if (!form.remind_enabled)
        return;
      openReminderPicker();
    }
    function onRemindToggle(event) {
      form.remind_enabled = !!event.detail.value;
      if (form.remind_enabled) {
        openReminderPicker();
      }
    }
    function openReminderPicker() {
      remindPickerValue.value = [form.remind_day - 1, form.remind_hour, form.remind_minute];
      showReminderPicker.value = true;
    }
    function closeReminderPicker() {
      showReminderPicker.value = false;
    }
    function onRemindPickerChange(event) {
      remindPickerValue.value = event.detail.value;
    }
    function confirmReminderPicker() {
      form.remind_day = days[remindPickerValue.value[0]];
      form.remind_hour = hours[remindPickerValue.value[1]];
      form.remind_minute = minutes[remindPickerValue.value[2]];
      closeReminderPicker();
    }
    async function submitForm() {
      if (!form.loan_name.trim()) {
        common_vendor.index.showToast({ title: "请输入贷款名称", icon: "none" });
        return;
      }
      if (!(Number(form.principal) > 0)) {
        common_vendor.index.showToast({ title: "请输入正确的贷款总额", icon: "none" });
        return;
      }
      if (!(Number(form.annual_rate) >= 0 && Number(form.annual_rate) <= 100)) {
        common_vendor.index.showToast({ title: "请输入0-100内的年利率", icon: "none" });
        return;
      }
      if (!(Number(form.term_months) >= 1 && Number(form.term_months) <= 360)) {
        common_vendor.index.showToast({ title: "请输入1-360的贷款期限", icon: "none" });
        return;
      }
      if (!form.first_payment) {
        common_vendor.index.showToast({ title: "请选择首期支付日期", icon: "none" });
        return;
      }
      const payload = {
        loan_name: form.loan_name.trim(),
        principal: Number(form.principal),
        annual_rate: Number(form.annual_rate),
        term_months: Number(form.term_months),
        repayment_method: utils_repayment.normalizeRepaymentMethod(form.repayment_method),
        first_payment: form.first_payment,
        remind_enabled: form.remind_enabled ? 1 : 0,
        remind_day: form.remind_day,
        remind_hour: form.remind_hour,
        remind_minute: form.remind_minute
      };
      const res = await api_loan.createLoan(payload);
      if (res.success) {
        common_vendor.index.showToast({ title: "新增成功", icon: "success" });
        setTimeout(() => common_vendor.index.navigateBack(), 400);
      }
    }
    const __returned__ = { form, showReminderPicker, showFirstPaymentPicker, currentYear, years, months, days, hours, minutes, firstPaymentPickerValue, remindPickerValue, methodLabel, monthlyRateText, monthlyPaymentText, remindTimeText, isFormCalculable, pad2, noop, goSchedule, chooseRepaymentMethod, buildFirstPaymentPickerValue, openFirstPaymentPicker, closeFirstPaymentPicker, onFirstPaymentPickerChange, confirmFirstPaymentPicker, onRemindCardClick, onRemindToggle, openReminderPicker, closeReminderPicker, onRemindPickerChange, confirmReminderPicker, submitForm, computed: common_vendor.computed, reactive: common_vendor.reactive, ref: common_vendor.ref, get createLoan() {
      return api_loan.createLoan;
    }, get REPAYMENT_METHOD_LABELS() {
      return utils_repayment.REPAYMENT_METHOD_LABELS;
    }, get REPAYMENT_METHODS() {
      return utils_repayment.REPAYMENT_METHODS;
    }, get calculateSchedule() {
      return utils_repayment.calculateSchedule;
    }, get calcMonthlyRate() {
      return utils_repayment.calcMonthlyRate;
    }, get normalizeRepaymentMethod() {
      return utils_repayment.normalizeRepaymentMethod;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $setup.form.loan_name,
    b: common_vendor.o(($event) => $setup.form.loan_name = $event.detail.value),
    c: $setup.form.principal,
    d: common_vendor.o(($event) => $setup.form.principal = $event.detail.value),
    e: common_vendor.t($setup.monthlyRateText),
    f: $setup.form.annual_rate,
    g: common_vendor.o(($event) => $setup.form.annual_rate = $event.detail.value),
    h: $setup.form.term_months,
    i: common_vendor.o(($event) => $setup.form.term_months = $event.detail.value),
    j: common_vendor.t($setup.methodLabel),
    k: common_vendor.o($setup.chooseRepaymentMethod),
    l: common_vendor.t($setup.form.first_payment || "请选择首期支付日期"),
    m: !!$setup.form.first_payment ? 1 : "",
    n: common_vendor.o($setup.openFirstPaymentPicker),
    o: common_vendor.t($setup.monthlyPaymentText),
    p: common_vendor.o($setup.goSchedule),
    q: $setup.form.remind_enabled
  }, $setup.form.remind_enabled ? {
    r: common_vendor.t($setup.remindTimeText)
  } : {}, {
    s: $setup.form.remind_enabled,
    t: common_vendor.o($setup.onRemindToggle),
    v: common_vendor.o($setup.noop),
    w: common_vendor.o($setup.onRemindCardClick),
    x: common_vendor.o($setup.submitForm),
    y: $setup.showFirstPaymentPicker
  }, $setup.showFirstPaymentPicker ? {
    z: common_vendor.o($setup.closeFirstPaymentPicker),
    A: common_vendor.o($setup.confirmFirstPaymentPicker),
    B: common_vendor.f($setup.years, (item, k0, i0) => {
      return {
        a: common_vendor.t(item),
        b: `y-${item}`
      };
    }),
    C: common_vendor.f($setup.months, (item, k0, i0) => {
      return {
        a: common_vendor.t(item),
        b: `mo-${item}`
      };
    }),
    D: $setup.firstPaymentPickerValue,
    E: common_vendor.o($setup.onFirstPaymentPickerChange),
    F: common_vendor.o($setup.noop),
    G: common_vendor.o($setup.closeFirstPaymentPicker)
  } : {}, {
    H: $setup.showReminderPicker
  }, $setup.showReminderPicker ? {
    I: common_vendor.o($setup.closeReminderPicker),
    J: common_vendor.o($setup.confirmReminderPicker),
    K: common_vendor.f($setup.days, (item, k0, i0) => {
      return {
        a: common_vendor.t(item),
        b: `d-${item}`
      };
    }),
    L: common_vendor.f($setup.hours, (item, k0, i0) => {
      return {
        a: common_vendor.t($setup.pad2(item)),
        b: `h-${item}`
      };
    }),
    M: common_vendor.f($setup.minutes, (item, k0, i0) => {
      return {
        a: common_vendor.t($setup.pad2(item)),
        b: `m-${item}`
      };
    }),
    N: $setup.remindPickerValue,
    O: common_vendor.o($setup.onRemindPickerChange),
    P: common_vendor.o($setup.noop),
    Q: common_vendor.o($setup.closeReminderPicker)
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-7fe15a7a"], ["__file", "/Users/wangjun/Documents/GitHub/金融APP/mobile/src/pages/loan/add/index.vue"]]);
wx.createPage(MiniProgramPage);
