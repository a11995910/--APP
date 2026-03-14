"use strict";
const common_vendor = require("../common/vendor.js");
const DEFAULT_BASE_URL = "http://127.0.0.1:3000/api/v1";
let requestSerial = 0;
function getBaseUrl() {
  return common_vendor.index.getStorageSync("api_base_url") || DEFAULT_BASE_URL;
}
function getTokenFromStorage() {
  return common_vendor.index.getStorageSync("token") || "";
}
function handleUnauthorized() {
  common_vendor.index.removeStorageSync("token");
  common_vendor.index.removeStorageSync("userInfo");
  common_vendor.index.redirectTo({ url: "/pages/login/index" });
}
function isHttpSuccess(statusCode) {
  return Number(statusCode) >= 200 && Number(statusCode) < 300;
}
function normalizeResponseData(res) {
  if (res && typeof res.data === "object" && res.data !== null) {
    return res.data;
  }
  const success = isHttpSuccess(res == null ? void 0 : res.statusCode);
  return {
    success,
    code: Number((res == null ? void 0 : res.statusCode) || 500),
    message: success ? "操作成功" : "请求失败",
    data: (res == null ? void 0 : res.data) ?? null
  };
}
function request(options) {
  return new Promise((resolve, reject) => {
    const token = getTokenFromStorage();
    const baseUrl = getBaseUrl();
    const currentRequestSerial = ++requestSerial;
    const requestUrl = baseUrl + options.url;
    const requestMethod = options.method || "GET";
    console.log("[请求] 发起请求", {
      requestSerial: currentRequestSerial,
      method: requestMethod,
      url: requestUrl,
      data: options.data || null,
      hasToken: Boolean(token)
    });
    common_vendor.index.request({
      url: requestUrl,
      method: requestMethod,
      data: options.data,
      header: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
      },
      success: (res) => {
        const responseData = normalizeResponseData(res);
        console.log("[请求] 收到响应", {
          requestSerial: currentRequestSerial,
          method: requestMethod,
          url: requestUrl,
          statusCode: res.statusCode,
          success: Boolean(responseData == null ? void 0 : responseData.success),
          code: responseData == null ? void 0 : responseData.code,
          message: responseData == null ? void 0 : responseData.message
        });
        if (isHttpSuccess(res.statusCode)) {
          if (responseData.success || isHttpSuccess(responseData.code)) {
            resolve(responseData);
          } else {
            common_vendor.index.showToast({ title: responseData.message || "请求失败", icon: "none" });
            resolve(responseData);
          }
          return;
        }
        if (res.statusCode === 401) {
          console.warn("[请求] 遇到401，执行未授权处理", {
            requestSerial: currentRequestSerial,
            url: requestUrl
          });
          handleUnauthorized();
          reject(new Error("未授权"));
          return;
        }
        const errorMessage = responseData.message || `请求失败(${res.statusCode})`;
        common_vendor.index.showToast({ title: errorMessage, icon: "none" });
        reject(new Error(errorMessage));
      },
      fail: (err) => {
        console.error("[请求] 请求失败", {
          requestSerial: currentRequestSerial,
          method: requestMethod,
          url: requestUrl,
          error: err
        });
        common_vendor.index.showToast({ title: "网络错误", icon: "none" });
        reject(err);
      }
    });
  });
}
function get(url, data) {
  return request({ url, method: "GET", data });
}
function post(url, data) {
  return request({ url, method: "POST", data });
}
function put(url, data) {
  return request({ url, method: "PUT", data });
}
function del(url, data) {
  return request({ url, method: "DELETE", data });
}
exports.del = del;
exports.get = get;
exports.post = post;
exports.put = put;
