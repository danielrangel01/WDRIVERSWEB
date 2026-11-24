import { FleetRepository } from "../../application/ports/FleetRepository.js";
import { HttpClient } from "./HttpClient.js";
import { TokenStorage } from "../storage/TokenStorage.js";

// Implementa el puerto FleetRepository hablando con la API REST del backend.
export class HttpFleetRepository extends FleetRepository {
  constructor() {
    super();
    this.http = new HttpClient();
  }

  async login(username, password) {
    const r = await this.http.request("/api/auth/login", { method: "POST", body: { username, password }, auth: false });
    if (r.token) TokenStorage.set(r.token);
    return r;
  }
  changeCredentials(currentPassword, newUsername, newPassword) {
    return this.http.request("/api/auth/change", { method: "POST", body: { currentPassword, newUsername, newPassword } });
  }

  getData() { return this.http.request("/api/data"); }

  getAgenda(date) {
    const q = date ? `?date=${encodeURIComponent(date)}` : "";
    return this.http.request(`/api/agenda${q}`);
  }

  getCollections(date) {
    const q = date ? `?date=${encodeURIComponent(date)}` : "";
    return this.http.request(`/api/collections${q}`);
  }

  getReminders(date, moment) {
    const qs = new URLSearchParams();
    if (date) qs.set("date", date);
    if (moment) qs.set("moment", moment);
    const q = qs.toString();
    return this.http.request(`/api/reminders${q ? `?${q}` : ""}`);
  }

  getPushPublicKey() { return this.http.request("/api/push/public-key"); }
  subscribePush(subscription) { return this.http.request("/api/push/subscribe", { method: "POST", body: { subscription } }); }
  unsubscribePush(endpoint) { return this.http.request("/api/push/unsubscribe", { method: "POST", body: { endpoint } }); }

  addCar(car) { return this.http.request("/api/cars", { method: "POST", body: car }); }
  updateCar(id, car) { return this.http.request(`/api/cars/${id}`, { method: "PUT", body: car }); }
  deactivateCar(id) { return this.http.request(`/api/cars/${id}`, { method: "DELETE" }); }
  reactivateCar(id) { return this.http.request(`/api/cars/${id}/reactivate`, { method: "POST" }); }

  addPayment(p) { return this.http.request("/api/payments", { method: "POST", body: p }); }
  deletePayment(id) { return this.http.request(`/api/payments/${id}`, { method: "DELETE" }); }

  addExpense(e) { return this.http.request("/api/expenses", { method: "POST", body: e }); }
  deleteExpense(id) { return this.http.request(`/api/expenses/${id}`, { method: "DELETE" }); }

  addDocument(d) { return this.http.request("/api/documents", { method: "POST", body: d }); }
  deleteDocument(id) { return this.http.request(`/api/documents/${id}`, { method: "DELETE" }); }

  toggleOffDay(carId, date, reason, detail) { return this.http.request("/api/offdays/toggle", { method: "POST", body: { carId, date, reason, detail } }); }
  bulkOffDay(date, carIds, reason, detail) { return this.http.request("/api/offdays/bulk", { method: "POST", body: { date, carIds, reason, detail } }); }
  clearOffDay(date) { return this.http.request(`/api/offdays/${date}`, { method: "DELETE" }); }

  getCarDebtDetail(carId, today) {
    const q = today ? `?today=${encodeURIComponent(today)}` : "";
    return this.http.request(`/api/cars/${carId}/debt-detail${q}`);
  }

  getAccountStatement(carId, from, to) {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const q = qs.toString();
    return this.http.request(`/api/cars/${carId}/statement${q ? `?${q}` : ""}`);
  }

  getHandovers(carId) {
    if (carId) return this.http.request(`/api/cars/${carId}/handovers`);
    return this.http.request("/api/handovers");
  }
  registerHandover(carId, payload) { return this.http.request(`/api/cars/${carId}/handover`, { method: "POST", body: payload }); }
  closeHandover(id, date) { return this.http.request(`/api/handovers/${id}/close`, { method: "POST", body: { date } }); }
  updateHandover(id, payload) { return this.http.request(`/api/handovers/${id}`, { method: "PUT", body: payload }); }
  deleteHandover(id) { return this.http.request(`/api/handovers/${id}`, { method: "DELETE" }); }

  createRefinance(r) { return this.http.request("/api/refinances", { method: "POST", body: r }); }
  payRefinance(id, amount) { return this.http.request(`/api/refinances/${id}/pay`, { method: "POST", body: { amount } }); }
  cancelRefinance(id) { return this.http.request(`/api/refinances/${id}`, { method: "DELETE" }); }

  saveSettings(s) { return this.http.request("/api/settings", { method: "PUT", body: s }); }

  sendWhatsApp(payload) { return this.http.request("/api/whatsapp/send", { method: "POST", body: payload }); }
  getWhatsAppStatus() { return this.http.request("/api/whatsapp/status"); }

  getTelegramStatus() { return this.http.request("/api/telegram/status"); }
  sendTelegramTest(to) { return this.http.request("/api/telegram/test", { method: "POST", body: { to } }); }
  setupTelegram(url) { return this.http.request("/api/telegram/setup", { method: "POST", body: { url } }); }

  syncNequi() { return this.http.request("/api/nequi/sync", { method: "POST" }); }
  approvePendingPayment(id, p) { return this.http.request(`/api/nequi/pending/${id}/approve`, { method: "POST", body: p }); }
  dismissPendingPayment(id) { return this.http.request(`/api/nequi/pending/${id}`, { method: "DELETE" }); }

  reset() { return this.http.request("/api/reset", { method: "POST" }); }
}
