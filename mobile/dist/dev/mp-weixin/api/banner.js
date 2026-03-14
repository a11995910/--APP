"use strict";
const utils_request = require("../utils/request.js");
function getBanners() {
  return utils_request.get("/banners");
}
exports.getBanners = getBanners;
