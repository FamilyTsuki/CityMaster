export class OverpassService {
  #apiUrl;

  constructor(apiUrl) {
    this.#apiUrl = apiUrl;
  }

  async fetchStreets(bbox) {
    return bbox;
  }
}
