export class GameController {
  #model;
  #view;

  constructor(model, view) {
    this.#model = model;
    this.#view = view;
  }

  startGame() {
    this.#view.render(this.#model);
  }
}
