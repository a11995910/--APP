"use strict";
const common_vendor = require("../common/vendor.js");
const api_user = require("../api/user.js");
const USER_LOGIN_SUCCESS_EVENT = "user:login-success";
const USER_LOGOUT_EVENT = "user:logout";
const useUserStore = common_vendor.defineStore("user", () => {
  const token = common_vendor.ref(common_vendor.index.getStorageSync("token") || "");
  const userInfo = common_vendor.ref(common_vendor.index.getStorageSync("userInfo") || null);
  const isLoggedIn = common_vendor.computed(() => !!token.value);
  function persistLogin(payload) {
    var _a, _b;
    console.log("[用户状态] 持久化登录态", {
      hasToken: Boolean(payload == null ? void 0 : payload.token),
      userId: (_a = payload == null ? void 0 : payload.user) == null ? void 0 : _a.id
    });
    token.value = payload.token;
    userInfo.value = payload.user;
    common_vendor.index.setStorageSync("token", payload.token);
    common_vendor.index.setStorageSync("userInfo", payload.user);
    console.log("[用户状态] 登录态写入完成", {
      storeHasToken: Boolean(token.value),
      persistedHasToken: Boolean(common_vendor.index.getStorageSync("token")),
      persistedUserId: ((_b = common_vendor.index.getStorageSync("userInfo")) == null ? void 0 : _b.id) || null
    });
  }
  function checkLogin() {
    if (token.value) {
      api_user.getProfile().catch(() => {
        logout();
      });
    }
  }
  async function login(phone, platform = "miniapp", extra = {}) {
    var _a;
    console.log("[用户状态] 发起手机号登录", {
      platform,
      hasWechatCode: Boolean(extra == null ? void 0 : extra.wechat_code)
    });
    const res = await api_user.login({ phone, platform, ...extra });
    if (res.success) {
      persistLogin(res.data);
      common_vendor.index.$emit(USER_LOGIN_SUCCESS_EVENT, {
        source: "phoneLogin",
        user: ((_a = res.data) == null ? void 0 : _a.user) || null
      });
    }
    console.log("[用户状态] 手机号登录结果", {
      success: Boolean(res == null ? void 0 : res.success),
      message: res == null ? void 0 : res.message
    });
    return res;
  }
  async function silentLoginByMiniappOpenid() {
    console.log("[用户状态] 开始静默登录");
    return new Promise((resolve) => {
      common_vendor.index.login({
        success: async (loginRes) => {
          var _a, _b, _c, _d, _e;
          console.log("[用户状态] wx.login 成功", {
            hasCode: Boolean(loginRes == null ? void 0 : loginRes.code)
          });
          if (!loginRes.code) {
            logout();
            console.warn("[用户状态] wx.login 未返回 code，静默登录失败");
            resolve(false);
            return;
          }
          try {
            const res = await api_user.miniappSilentLogin({ code: loginRes.code });
            console.log("[用户状态] 静默登录接口响应", {
              success: Boolean(res == null ? void 0 : res.success),
              bound: Boolean((_a = res == null ? void 0 : res.data) == null ? void 0 : _a.bound),
              hasToken: Boolean((_b = res == null ? void 0 : res.data) == null ? void 0 : _b.token),
              message: res == null ? void 0 : res.message
            });
            if (res.success && ((_c = res.data) == null ? void 0 : _c.bound) && ((_d = res.data) == null ? void 0 : _d.token)) {
              persistLogin(res.data);
              common_vendor.index.$emit(USER_LOGIN_SUCCESS_EVENT, {
                source: "silentLogin",
                user: ((_e = res.data) == null ? void 0 : _e.user) || null
              });
              console.log("[用户状态] 静默登录成功，已写入 token");
              resolve(true);
              return;
            }
          } catch (error) {
            console.error("[用户状态] 静默登录接口异常", error);
          }
          logout();
          console.warn("[用户状态] 静默登录未命中绑定账号，回退手机号登录");
          resolve(false);
        },
        fail: (error) => {
          logout();
          console.error("[用户状态] wx.login 调用失败", error);
          resolve(false);
        }
      });
    });
  }
  function logout() {
    token.value = "";
    userInfo.value = null;
    common_vendor.index.removeStorageSync("token");
    common_vendor.index.removeStorageSync("userInfo");
    common_vendor.index.$emit(USER_LOGOUT_EVENT);
  }
  function updateUser(info) {
    userInfo.value = { ...userInfo.value, ...info };
    common_vendor.index.setStorageSync("userInfo", userInfo.value);
  }
  return {
    token,
    userInfo,
    isLoggedIn,
    checkLogin,
    login,
    silentLoginByMiniappOpenid,
    logout,
    updateUser
  };
});
exports.useUserStore = useUserStore;
