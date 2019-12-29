import {HistoryEvent, EventView} from './vs-model';
import * as d3 from "d3";
import * as $ from "jquery";

console.log("Script start...");

window.viewport = {
  width: 100,
  height: 100,
  axisPosition: 120,
  firstYear: 1910,
  datesExtent: [new Date("1916-01-01"), new Date("1939-12-31")],
  displayStartDate: new Date("1918-01-01"),
  scaleOffset: 0,
  scale: d3.scaleTime(),
  scaleOrig: d3.scaleTime(),
  lanes: [{id: "events", name: "Wydarzenia", x: 160, width: 400, lanes: 2}],
  zoom: d3.zoom().scaleExtent([1, 10]),
  currentZoomLevel: 1
};


export function initTimelineModule() {
  $(window).resize(refreshGraphSize);

  window.addEventListener("load", function () {
    console.log("Onload.");
    setTimeout(refreshGraphSize, 1000);
    // refreshGraphSize();
    setTimeout(initGraph, 1100);
  });

}

function initGraph() {
  //lanes
  var laneGroupSelection = d3.select("#lanes").selectAll("g.lane")
    .data(viewport.lanes)
    .enter()
    .append("g")
    .classed("lane", true);
  laneGroupSelection.append("rect").classed("lane", true).attr("x", function (lane) {
    return lane.x;
  }).attr("y", -5).attr("width", function (d) {
    return d.width;
  }).attr("height", viewport.height + 10);
  laneGroupSelection.append("text").attr("x", function (lane) {
    return lane.x + 10
  }).attr("y", 20).text(function (lane) {
    return lane.name;
  });

  console.log(viewport);
  viewport.scale = d3.scaleTime()
    .domain(viewport.datesExtent)
    .range([viewport.height, 0]);
  viewport.scaleOrig = d3.scaleTime()
    .domain(viewport.datesExtent)
    .range([viewport.height, 0]);

  // refreshTimeScale();
  updateGraphPosition();
  updateAxisLine();
  refreshTimeAxis();

  d3.select("#myChart").call(viewport.zoom.on("zoom", zoomEvent));
  d3.select("#myChart").on("click", function(d, i, node) {
    eventSelected();
    d3.event.stopPropagation();
  });

  loadDataCsv();
  // loadData();
}

function refreshGraphSize() {
  viewport.width = $('#myChart').width();
  viewport.height = $('#myChart').height();
  console.log("Refreshing size, w=" + viewport.width + " h=" + viewport.height);

  //update zoom:
  viewport.zoom.extent([[0, 0], [viewport.width, viewport.height]]);
  viewport.zoom.translateExtent([[0, 0], [viewport.width, viewport.height]]);
  updateAxisLine();
  refreshLanes();
}


function loadDataCsv() {
  d3.csv("data/dwudziestolecie.csv").then(function (data, error) {
    console.log("Loaded csv");
    console.log(data);
    let eventData = data.map(HistoryEvent.buildFromCsv);
    console.log(eventData);
    eventData = eventData.filter(ins => ins.isValid());
    console.log("After filter:");
    console.log(eventData);
    console.debug("Wrapping into event views");
    let eventViews = eventData.map(ev => new EventView(ev));
    //-> to event view.
    createEvents(eventViews);
    refreshEventView();
  });
}


function eventText(event) {
  return event.date + ": " + event.name;
}

function findLaneById(id) {
  return viewport.lanes.find(lane => lane.id === id);
}

function buildEventGroupTransformation() {
  let lane = findLaneById("events");
  let innerLaneWidth = lane.width / lane.lanes;
  return function (eventView) {
    let event = eventView.data;
    if (typeof eventView.innerLane == 'undefined') {
      eventView.innerLane = 0;
    }
    let d = new Date(event.end);
    return "translate(" + (5 + lane.x + eventView.innerLane * innerLaneWidth) + ", " + viewport.scale(d) + ")";
  };
}

function refreshEventView() {
  let lane = findLaneById("events");
  let itemSelection = d3.select("#events").selectAll("g.item");

  let views = itemSelection.data();
  let innerLaneCount = lane.lanes;
  let innerLaneWidth = lane.width / lane.lanes;

  let zoomLevelRounded = Math.round(viewport.currentZoomLevel);
  if (zoomLevelRounded != viewport.lastZoomLevelRounded) {
    viewport.lastZoomLevelRounded = zoomLevelRounded;
    _.forEach(views, function (v) {
      v.innerLane = 0;
    });

    const filteredEvents = _.filter(views, v => v.data.visibleInZoom(zoomLevelRounded));
    const sortedFilteredEvents = _.sortBy(filteredEvents, iv => iv.data.end);
    _.forEach(sortedFilteredEvents, function (v, i) {
      v.innerLane = i % innerLaneCount;
    });
    itemSelection.sort((a, b) => d3.descending(a.innerLane, b.innerLane) || d3.ascending(a.data.end, b.data.end));
  }


  itemSelection
    .attr("transform", buildEventGroupTransformation())

  const corner = 10;
  const xL = -(lane.x - viewport.axisPosition + 5);
  itemSelection
    .select(".filled-path")
    .attr("d", eventView => buildEventPath(eventView, xL - eventView.innerLane * innerLaneWidth, 0, corner, true));
  itemSelection
    .select(".drawn-path")
    .attr("d", eventView => buildEventPath(eventView, xL - eventView.innerLane * innerLaneWidth, 0, corner, false));

  itemSelection
    .transition()
    .duration(500)
    .attr("visibility", function (eventView) {
      return eventView.data.visibleInZoom(zoomLevelRounded) ? "visible" : "hidden";
    }).attr("opacity", function (eventView) {
    return eventView.data.visibleInZoom(zoomLevelRounded) ? 1.0 : 0.0;
  });


}


function eventSelected(d) {
  if(d) {
    console.log("Selecting event "+d.id);
    d3.select("#details-card").attr("hidden",null);
    d3.select("#details-title").text(d.data.name);
    d3.select("#details-subtitle").text(d.data.beginning);
    d3.select("#details-text").text(d.data.id);
  } else {
    console.log("Hiding the description card");
    d3.select("#details-card").attr("hidden", "true");
  }
}

//create events
function createEvents(eventViews) {
  console.log("Adding events, will add " + eventViews.length + " items.");
  // console.log(items);
  //rect with text:

  let itemSelection = d3.select("#events").selectAll("g.item").data(eventViews, item => item.id);
  buildEventGroup(itemSelection.enter());
  itemSelection.exit().remove();
  let eventItemSelection = d3.select("#events").selectAll("g.item");

  eventItemSelection.on("mouseenter", function(d, i, node) {
    d3.select(this).classed("highlight", true);
    console.log("Entered...");
    console.log(d);
  });

  eventItemSelection.on("mouseleave", function(d, i, node) {
    d3.select(this).classed("highlight", false);
    console.log("rLeaving...");
  });
  eventItemSelection.on("click", function(d, i, node) {
    console.log("Exectuing click on node "+d.id);
    eventSelected(d);
    d3.event.stopPropagation();
  }, true);



  console.log("Running wrap...");
  eventItemSelection
    .each(wrapTextRect);

  eventItemSelection
    .each(function (item, index, node) {
      item.pixelSize = parseInt(d3.select(this).select("rect").attr("height"));
    });
  // refreshEventView();
}


function eventPos(event) {
  return datePos(new Date(event.beginning));
}

function datePos(date) {
  return viewport.scale(date);
}

function buildEventPath(eventView, x0, x1, extension, closed) {
  let event = eventView.data;
  let xEv = x1 + extension;
  let resPath = `M ${x0} 0 L ${xEv} 0`;
  if (event.isRange()) {
    let dy = datePos(new Date(event.beginning)) - datePos(new Date(event.end));
    if (dy > 5) { //if it is smaller, we do not draw area, makes no sense.
      let lowerY = 0;
      if (eventView.pixelSize) {
        lowerY = eventView.pixelSize;
        resPath += ` ${closed ? "l" : "m"} 0 ${lowerY}`;
      }
      resPath += ` h ${-extension}`;
      // let xmid = (x0 + x1) *(dy<lowerY? 0.3:0.85);
      let xmid = dy > lowerY ? x0 + 10 : x1 - 10;
      let ymed = (dy + lowerY) / 2;

      // resPath += ` C ${xmed} ${lowerY} ${xmed} ${dy} ${x0} ${dy}`;
      resPath += ` C ${xmid} ${lowerY} ${xmid} ${lowerY} ${xmid} ${ymed}`;
      resPath += ` C ${xmid} ${dy} ${xmid} ${dy} ${x0} ${dy}`;
      if (closed) {
        resPath += " z";
      }
    }
  }
  return resPath;
}

function buildEventGroup(buildSelection) {
  let lane = findLaneById("events");
  let innerLane = 0;
  let innerLaneWidth = lane.width / lane.lanes;

  let groupSelection = buildSelection.append("g")
    .classed("item", true)
    .attr("transform", buildEventGroupTransformation());
  const corner = 5;
  const xL = -(lane.x - viewport.axisPosition + 5);


  groupSelection.append("path")
    .classed("filled-path", true)
    .attr("d", eventView => buildEventPath(eventView, xL, 0, corner, true));

  groupSelection.append("path")
    .classed("drawn-path", true)
    .attr("d", eventView => buildEventPath(eventView, xL, 0, corner, false));

  groupSelection.append("rect")
  // .classed("item", true)
    .attr("width", innerLaneWidth - 10)
    .attr("height", 50)
    .attr("rx", corner)
    .attr("ry", corner)
  ;

  groupSelection
    .append("text")
    .attr("y", 20)
    .attr("x", 5)
    .text(function (eventView) {
      return eventView.data.name;
    });
}


function refreshLanes() {
  d3.selectAll("g.lane").select("rect").attr("height", viewport.height + 10);
}


function updateGraphPosition() {

}


function refreshTimeAxis() {
  //test code:
  var years = [];
  for (var y = 1918; y < 1940; y++) {
    years.push(y);
  }
  // d3.selectAll(".timeAxisTick").data([]).remove();
  var buildTransformFunc = function (year) {
    return "translate(" + viewport.axisPosition + ", " + viewport.scale(new Date(year, 0, 1)) + ")";
  }
  var yearsSelection = d3.select("#mainGroup").selectAll(".timeAxisTick").data(years);
  yearsSelection.transition().duration(100).attr("transform", buildTransformFunc);

  var groups = yearsSelection.enter().append("g");
  groups.attr("transform", buildTransformFunc)
    .classed("timeAxisTick", true);
  groups.append("circle")
    .attr("r", 4);
  groups.append("text")
    .attr("text-anchor", "end")
    .attr("dx", "-10")
    .attr("dominant-baseline", "middle")
    .text(function (year) {
      return "" + year;
    });

  yearsSelection.exit().remove();
}

function updateAxisLine() {
  d3.select("#timeAxis")
    .attr("x1", viewport.axisPosition)
    .attr("y1", 0)
    .attr("x2", viewport.axisPosition)
    .attr("y2", viewport.height);
}


//event handling
function moveForward() {
  // console.log("Moving forward...");
  viewport.displayStartDate.setDate(viewport.displayStartDate.getDate() + 100);
  // console.log(viewport.displayStartDate);
  updateGraphPosition();
}

function moveBackward() {
  // console.log("Moving backward...");
  viewport.displayStartDate.setDate(viewport.displayStartDate.getDate() - 100);
  // console.log(viewport.displayStartDate);
  updateGraphPosition();
}

function zoomEvent(event) {
  // console.log(d3.event.transform);
  var t = d3.event.transform;
  viewport.scale = t.rescaleY(viewport.scaleOrig);
  viewport.currentZoomLevel = t.k;
  // viewport.yearSize = Math.round(d3.event.transform.k);
  refreshTimeAxis();
  refreshEventView();

  //update event list:

}


function wrapTextRect(d, i) {
  var NS = "http://www.w3.org/2000/svg";
  // console.log("Applying text wrap...");
  // console.log(d);
  // console.log(i);
  //group selection:
  let groupSelection = d3.select(this);

  var myRect = groupSelection.select("rect").node();
  var myText = groupSelection.select("text").node();
  groupSelection.select("text").text("");

  var padding = 10
  var width = +myRect.getAttribute("width") - padding
  // var width=100;

  var x = +myRect.getAttribute("x")
  // var x = 10;
  var y = +myRect.getAttribute("y")
  // var y=10;
  var fontSize = 15;
  var text = d.data.name;

  var words = text.split(' ');
  let text_element = groupSelection.select("text").node();
  var tspan_element = document.createElementNS(NS, "tspan");   // Create first tspan element
  var text_node = document.createTextNode(words[0]);           // Create text in tspan element
  tspan_element.setAttribute("x", x + padding);
  tspan_element.setAttribute("y", y + padding + fontSize);
  tspan_element.appendChild(text_node);                           // Add tspan element to DOM
  text_element.appendChild(tspan_element);                        // Add text to tspan element

  for (var i = 1; i < words.length; i++) {
    var len = tspan_element.firstChild.data.length            // Find number of letters in string
    tspan_element.firstChild.data += " " + words[i];            // Add next word

    if (tspan_element.getComputedTextLength() > width - padding) {
      tspan_element.firstChild.data = tspan_element.firstChild.data.slice(0, len);    // Remove added word

      var tspan_element = document.createElementNS(NS, "tspan");       // Create new tspan element
      tspan_element.setAttribute("x", x + padding);
      tspan_element.setAttribute("dy", fontSize);
      text_node = document.createTextNode(words[i]);
      tspan_element.appendChild(text_node);
      text_element.appendChild(tspan_element);
    }
  }
  //
  var height = text_element.getBBox().height + 2 * padding; //-- get height plus padding
  myRect.setAttribute('height', height); //-- change rect height
  // showSourceSVG()
}
