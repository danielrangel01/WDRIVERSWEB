// Entidad de dominio Car. Lógica pura, sin React ni HTTP.
export class Car {
  constructor({ id, plate, name = "", rate = 0, startDate = null, active = true }) {
    this.id = id;
    this.plate = plate;
    this.name = name;
    this.rate = rate;
    this.startDate = startDate;
    this.active = active;
  }

  get label() {
    return this.name ? `${this.plate} · ${this.name}` : this.plate;
  }

  get hasStart() {
    return !!this.startDate;
  }

  static fromApi(dto) {
    return new Car(dto);
  }
}
