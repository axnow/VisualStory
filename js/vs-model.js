class HistoryEvent {
    constructor(id, dateRange, zoomRange, name) {
        this.id = id;
        this.date = dateRange[0];
        this.dateRange = dateRange;
        this.zoomRange = zoomRange;
        this.name = name;
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

    beginning() {
        if (this.isRange()) {
            return this.dateRange[1];
        } else {
            return this.date;
        }
    }

    end() {
        return this.dateRange[0];
    }

    visibleInZoom(zoom) {
        return zoom >= this.zoomRange[0] && (!this.zoomRange[1] || zoom <= this.zoomRange[1]);
    }

}

//
class EventView {
    constructor(event) {
        this.id = event.id;
        this.data = event;
        this.innerLane=0;

    }


    isValid() {
        return data.isValid();
    }
}