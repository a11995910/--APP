"use strict";
const utils_request = require("../utils/request.js");
function getLoans(params) {
  return utils_request.get("/loans", params);
}
function getLoanDetail(id) {
  return utils_request.get(`/loans/${id}`);
}
function getLoanSchedule(id) {
  return utils_request.get(`/loans/${id}/schedule`);
}
function createLoan(data) {
  return utils_request.post("/loans", data);
}
function updateLoan(id, data) {
  return utils_request.put(`/loans/${id}`, data);
}
function deleteLoan(id) {
  return utils_request.del(`/loans/${id}`);
}
exports.createLoan = createLoan;
exports.deleteLoan = deleteLoan;
exports.getLoanDetail = getLoanDetail;
exports.getLoanSchedule = getLoanSchedule;
exports.getLoans = getLoans;
exports.updateLoan = updateLoan;
