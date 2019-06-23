
class HistoryEvent {
    constructor(id, dateRange, zoomRange, name){
        this.id=id;
        this.date=dateRange[0];
        this.dateRange=dateRange;
        this.zoomRange=zoomRange;
        this.name=name;
    }

    static buildFromCsv(csvObject) {
        return new HistoryEvent(csvObject.id, [csvObject.date_from, csvObject.date_to],
            [csvObject.zoom_min, csvObject.zoom_max]
            ,csvObject.name)
    }

    isRange() {
        return this.dateRange.length===0 && this.dateRange[1]
    }

    visibleInZoom(zoom) {
        return zoom>=this.zoomRange[0] && (!this.zoomRange[1] || zoom<=this.zoomRange[1]);
    }

}