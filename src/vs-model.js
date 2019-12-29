export class HistoryEvent {
  constructor(id, dateRange, zoomRange, name, description, wikipediaId, pictureName) {
    this.id = id;
    this.date = dateRange[0];
    if (dateRange.length === 2 && dateRange[1]) {
      this.dateRange = dateRange;
    } else {
      this.dateRange = dateRange.slice(0, 1);
    }
    this.zoomRange = zoomRange;
    this.name = name;
    this.description = description;
    this.wikipediaId = wikipediaId;
    this.pictureName = pictureName;
  }

  static buildFromCsv(csvObject) {
    return new HistoryEvent(csvObject.id, [csvObject.date_from, csvObject.date_to],
      [csvObject.zoom_min, csvObject.zoom_max]
      , csvObject.name)
  }

  isValid() {
    return this.name && this.date && this.id && this.zoomRange[0];
  }

  isRange() {
    return this.dateRange.length === 2 && this.dateRange[1]
  }

  get beginning() {
    return this.dateRange[0];
  }

  get end() {
    if (this.isRange()) {
      return this.dateRange[1];
    } else {
      return this.date;
    }
  }



  visibleInZoom(zoom) {
    return zoom >= this.zoomRange[0] && (!this.zoomRange[1] || zoom <= this.zoomRange[1]);
  }

}

export class EventView {
  constructor(event) {
    this.id = event.id;
    this.data = event;
    this.innerLane = 0;

  }


  isValid() {
    return data.isValid();
  }
}
