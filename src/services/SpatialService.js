export class SpatialService {
  calculateBuffer(geometry, distance) {
    return { geometry, distance };
  }

  isPointInPolygon(point, polygon) {
    return point === polygon;
  }
}
