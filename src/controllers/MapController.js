export class MapController {
  #model;
  #view;

  constructor(model, view) {
    this.#model = model;
    this.#view = view;
  }
}
