export class MapillaryService {
  #accessToken;

  constructor(accessToken) {
    this.#accessToken = accessToken;
  }

  async fetchStreetView(coordinates) {
    return coordinates;
  }
}
