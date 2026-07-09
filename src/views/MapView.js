export class MapView {
  #mapContainerId;

  constructor(mapContainerId) {
    this.#mapContainerId = mapContainerId;
  }

  render(centerCoordinates) {
    return this.#mapContainerId;
  }
}
