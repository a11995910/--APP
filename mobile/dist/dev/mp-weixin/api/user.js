"use strict";
const utils_request = require("../utils/request.js");
function login(data) {
  return utils_request.post("/user/login", data);
}
function miniappSilentLogin(data) {
  return utils_request.post("/user/miniapp/silent-login", data);
}
function getProfile() {
  return utils_request.get("/user/profile");
}
function getHomeData() {
  return utils_request.get("/user/home");
}
exports.getHomeData = getHomeData;
exports.getProfile = getProfile;
exports.login = login;
exports.miniappSilentLogin = miniappSilentLogin;
