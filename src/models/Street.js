export class Street {
  #id;
  #name;
  #geometry;

  constructor(id, name, geometry) {
    this.#id = id;
    this.#name = name;
    this.#geometry = geometry;
  }

  get id() {
    return this.#id;
  }

  get name() {
    return this.#name;
  }

  get geometry() {
    return this.#geometry;
  }
}
