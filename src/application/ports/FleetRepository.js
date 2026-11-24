// Puerto (interfaz) que define qué operaciones necesita la app.
// La infraestructura (HttpFleetRepository) lo implementa.
// La capa de presentación depende de ESTO, no del fetch directo.
export class FleetRepository {
  async login(_username, _password) { throw new Error("No implementado"); }
  async changeCredentials(_current, _newUser, _newPass) { throw new Error("No implementado"); }
  async getData() { throw new Error("No implementado"); }
  async getAgenda(_date) { throw new Error("No implementado"); }
  async getCollections(_date) { throw new Error("No implementado"); }
  async getReminders(_date, _moment) { throw new Error("No implementado"); }
  async getPushPublicKey() { throw new Error("No implementado"); }
  async subscribePush(_subscription) { throw new Error("No implementado"); }
  async unsubscribePush(_endpoint) { throw new Error("No implementado"); }
  async addCar(_car) { throw new Error("No implementado"); }
  async updateCar(_id, _car) { throw new Error("No implementado"); }
  async deactivateCar(_id) { throw new Error("No implementado"); }
  async reactivateCar(_id) { throw new Error("No implementado"); }
  async addPayment(_p) { throw new Error("No implementado"); }
  async deletePayment(_id) { throw new Error("No implementado"); }
  async addExpense(_e) { throw new Error("No implementado"); }
  async deleteExpense(_id) { throw new Error("No implementado"); }
  async addDocument(_d) { throw new Error("No implementado"); }
  async deleteDocument(_id) { throw new Error("No implementado"); }
  async toggleOffDay(_carId, _date, _reason, _detail) { throw new Error("No implementado"); }
  async bulkOffDay(_date, _carIds, _reason, _detail) { throw new Error("No implementado"); }
  async clearOffDay(_date) { throw new Error("No implementado"); }
  async getCarDebtDetail(_carId, _today) { throw new Error("No implementado"); }
  async getAccountStatement(_carId, _from, _to) { throw new Error("No implementado"); }
  async getHandovers(_carId) { throw new Error("No implementado"); }
  async registerHandover(_carId, _payload) { throw new Error("No implementado"); }
  async closeHandover(_id, _date) { throw new Error("No implementado"); }
  async updateHandover(_id, _payload) { throw new Error("No implementado"); }
  async deleteHandover(_id) { throw new Error("No implementado"); }
  async createRefinance(_r) { throw new Error("No implementado"); }
  async payRefinance(_id, _amount) { throw new Error("No implementado"); }
  async cancelRefinance(_id) { throw new Error("No implementado"); }
  async saveSettings(_s) { throw new Error("No implementado"); }
  async sendWhatsApp(_payload) { throw new Error("No implementado"); }
  async getWhatsAppStatus() { throw new Error("No implementado"); }
  async syncNequi() { throw new Error("No implementado"); }
  async approvePendingPayment(_id, _payload) { throw new Error("No implementado"); }
  async dismissPendingPayment(_id) { throw new Error("No implementado"); }
  async reset() { throw new Error("No implementado"); }
}
