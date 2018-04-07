// why does DoubleClickZoom not work as in https://openlayers.org/en/latest/examples/select-features.html

var style = new ol.style.Style({
  fill: new ol.style.Fill({
    color: "rgba(255, 255, 255, 0.6)"
  }),
  stroke: new ol.style.Stroke({
    color: "#319FD3",
    width: 1
  }),
  text: new ol.style.Text({
    font: "12px Calibri,sans-serif",
    fill: new ol.style.Fill({
      color: "#000"
    }),
    stroke: new ol.style.Stroke({
      color: "#fff",
      width: 3
    })
  })
});

var stateLayer = new ol.layer.Vector({
  source: new ol.source.Vector({
    // url: "https://openlayers.org/en/v4.6.4/examples/data/topojson/us.json",
    // something is messed with NV on this map!?
    url: "https://spencermathews.github.io/us-data/geography/states.topo.json",

    // will require work to get this one working, probably because of projection? but even this does not have names!?
    // url: "https://unpkg.com/us-atlas@1.0.2/us/10m.json",
    format: new ol.format.TopoJSON({
      layers: ["states"]
    }),
    overlaps: false
  }),
  // style: style,
  style: function(feature) {
    style.getText().setText(feature.get("name"));
    return style;
  },
  minResolution: 2000,
  maxResolution: 20000
});

var countyLayer = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: "https://openlayers.org/en/v4.6.4/examples/data/topojson/us.json",
    // will require work to get this one working, probably because of projection? but even this does not have names!?
    // url: "https://unpkg.com/us-atlas@1.0.2/us/10m.json",
    format: new ol.format.TopoJSON({
      layers: ["counties"]
    }),
    overlaps: false
  }),
  style: function(feature) {
    style.getText().setText(feature.get("name"));
    return style;
  },
  minResolution: 200,
  maxResolution: 1999
});

var map = new ol.Map({
  target: "map",
  layers: [
    new ol.layer.Tile({
      source: new ol.source.Stamen({
        layer: "toner"
      })
    }),
    stateLayer,
    countyLayer
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([-95.867, 37.963]),
    zoom: 4
  })
});

var highlightStyle = new ol.style.Style({
  stroke: new ol.style.Stroke({
    color: "#f00",
    width: 1
  }),
  fill: new ol.style.Fill({
    color: "rgba(255,0,0,0.1)"
  }),
  text: new ol.style.Text({
    font: "12px Calibri,sans-serif",
    fill: new ol.style.Fill({
      color: "#000"
    }),
    stroke: new ol.style.Stroke({
      color: "#f00",
      width: 3
    })
  })
});

// unused! would be called by displayFeatureInfo
var featureOverlay = new ol.layer.Vector({
  source: new ol.source.Vector(),
  map: map,
  style: function(feature) {
    highlightStyle.getText().setText(feature.get("name"));
    return highlightStyle;
  }
});

// unused!
var highlight;
var displayFeatureInfo = function(pixel) {
  // may need better logic with multiple layers!
  // this does not seem to pick up layers other than the feature layer!
  var feature = map.forEachFeatureAtPixel(pixel, function(feature) {
    return feature;
  });

  // unimplemented
  // note moved to select callback
  // var info = document.getElementById("info");
  // if (feature) {
  //   info.innerHTML = feature.getId() + ": " + feature.get("name");
  // } else {
  //   info.innerHTML = "&nbsp;";
  // }

  // note this is done on featureOverlay layer
  // review more examples to see if this is the best way to to it!
  if (feature !== highlight) {
    if (highlight) {
      featureOverlay.getSource().removeFeature(highlight);
    }
    if (feature) {
      featureOverlay.getSource().addFeature(feature);
    }
    highlight = feature;
  }
};

// unused!
map.on("pointermove", function(evt) {
  if (evt.dragging) {
    return;
  }
  // more verbose was probably just for example, but look into
  var pixel = map.getEventPixel(evt.originalEvent);
  // displayFeatureInfo(pixel);
  // displayFeatureInfo(evt.pixel); // why wasn't this done this way originally, seems to work!?

  // console.log("map fired pointermove");
});

// from http://openlayersbook.github.io/ch05-using-vector-layers/example-09.html
// when the user moves the mouse, get the name property
// from each feature under the mouse and display it
function onMouseMove(browserEvent) {
  var coordinate = browserEvent.coordinate;
  var pixel = map.getPixelFromCoordinate(coordinate);
  var el = document.getElementById("name");
  el.innerHTML = "";
  map.forEachFeatureAtPixel(pixel, function(feature) {
    el.innerHTML += feature.get("name") + "<br>";
  });
}
map.on("pointermove", onMouseMove);

// click fires ol.MapBrowserEvent
// ? where the hell is documentation for the arg to listener function?
// note: the mere presence of this event prevents the default DoubleClickZoom interaction, is there a way to preserve it? maybe raise the event again?
map.on("click", function(evt) {
  // displayFeatureInfo(evt.pixel);

  console.log("map fired click");
  console.log("resolution:", map.getView().getResolution()); // debug?

  //debug...
  // evt is ol.MapBrowserEvent
  console.log("evt", typeof evt, evt);
  // evt.originalEvent is the browser event like MouseEvent
  console.log("evt.originalEvent", typeof evt.originalEvent, evt.originalEvent);

  console.log("pixel", evt.pixel);
  // map.getEventPixel() arg is browser event
  console.log(
    "map.getEventPixel(evt.originalEvent)",
    map.getEventPixel(evt.originalEvent)
  );

  var pixel = evt.pixel;

  console.log("evt.coordinate", evt.coordinate);
  console.log(
    "map.getEventCoordinate(evt.originalEvent)",
    map.getEventCoordinate(evt.originalEvent)
  );

  console.log(
    "map.getCoordinateFromPixel(evt.pixel)",
    map.getCoordinateFromPixel(evt.pixel)
  );
  console.log(
    "map.getPixelFromCoordinate(evt.coordinate)",
    map.getPixelFromCoordinate(evt.coordinate)
  );

  let x = 0;
  var feature = map.forEachFeatureAtPixel(pixel, function(feature, layer) {
    // console.log("feature:", feature); // debug
    console.log("id:", feature.getId()); // debug
    console.log("properties:", layer.getProperties());
    // console.log(layer.getSource());
    x++;
  });
  console.log(x);

  // TODO adjust for layers vs features!
  // var feature = map.forEachLayerAtPixel(pixel, function(layer, pixel) {
  //   console.log("id:", feature.getId()); // debug
  //   console.log("properties:", layer.getProperties());
  //   // console.log(layer.getSource());
  //   x++;
  // });

  console.log(map.getFeaturesAtPixel(pixel));
});

// test
// https://openlayersbook.github.io/ch09-taking-control-of-controls/example-03.html
// https://openlayers.org/en/latest/examples/mouse-position.html
// Displays lat/lon at mouse position
// ? can you actually get the value directly?
var mousePosition = new ol.control.MousePosition({
  coordinateFormat: ol.coordinate.createStringXY(2),
  // projection: "EPSG:4326", // WGS 84
  projection: "EPSG:3857" // Web Mercator
  // target: document.getElementById("myposition"),
  // undefinedHTML: "&nbsp;"
});
map.addControl(mousePosition); // can also .extend() the map controls collection e.g. in Map constructor

// //test
// map.getView().on("change:resolution", function(evt) {
//   console.log("view fired change:resolution");
//   var pixel = map.getEventPixel(evt.originalEvent);
//   displayFeatureInfo(pixel);
//   // displayFeatureInfo(evt.pixel);
// });

// //test
// map.once("moveend", function(evt) {
//   console.log("map fired moveend");
//   var pixel = map.getEventPixel(evt.originalEvent);
//   displayFeatureInfo(pixel);
//   // displayFeatureInfo(evt.pixel);
// });

/* Adds pointerMove Select interation */
// what's weird is that after adding this select code (and before adding style to it) the interaction with featureOverlay improved such that after zooming to county level any mouse movement would select a county, whereas before the logic in displayFeatureInfo was incomplete and had to leave state first, note that going from county to state was fine since leaving county sufficed, I think it had something to do with the featureOverlay dominated.
var selectPointerMove = new ol.interaction.Select({
  condition: ol.events.condition.pointerMove,
  // style: highlightStyle
  // test how to manipulate style w stylefunctions
  // kind of works with us-data states.topo.json but only some states highlight text! since not all have name string? check?
  style: function(feature) {
    highlightStyle.getText().setText(feature.get("name"));
    return highlightStyle;
  }
});
var select = selectPointerMove;

map.addInteraction(select);
select.on("select", function(e) {
  document.getElementById("status").innerHTML =
    "&nbsp;" +
    e.target.getFeatures().getLength() +
    " selected features (last operation selected " +
    e.selected.length +
    " and deselected " +
    e.deselected.length +
    " features)";

  /* Print the members of ol.interaction.Select.Event */
  console.log("deselected:", e.deselected);
  console.log("mapBrowserEvent:", e.mapBrowserEvent);
  console.log("selected:", e.selected);
  console.log("target:", e.target);
  console.log("type:", e.type);

  var feature = e.selected[0];
  var info = document.getElementById("info");
  // condition is legacy from example, can simplify
  if (feature) {
    info.innerHTML = feature.getId() + ": " + feature.get("name");
  } else {
    info.innerHTML = "&nbsp;";
  }
});

// should this come at start or end of js?
var tmp;
fetch("https://spencermathews.github.io/us-data/test/state-page-1.json")
  .then(function(response) {
    return response.json();
  })
  .then(function(responseAsJson) {
    tmp = responseAsJson;
    console.log("response:", responseAsJson);

    // TODO deal with multiple pages
    // response has members count, next, previous, results
    var results = responseAsJson.results;
    var maxStories = 0;
    for (let state of results) {
      console.log(state.story_count);
      if (state.story_count > maxStories) {
        maxStories = state.story_count;
      }
    }
    console.log("******", maxStories);

    // first 3 are correct? colors, last is just some default
    var colors = [
      "rgb(236, 145, 61)",
      "rgb(250, 200, 95)",
      "rgb(243, 235, 153)",
      "rgba(255, 255, 255, 0.6)"
    ];

    stateLayer.setStyle(function(feature) {
      let name = feature.get("name");
      style.getText().setText(name);

      // SOMETIME find a more clever/efficient way of matching, maybe create a dict from results
      console.log(name);
      for (let state of results) {
        // set default color in case state fails to match
        style.getFill().setColor(colors[3]);
        if (name === state.name) {
          console.log(state.name, state.story_count, maxStories);
          // is there a smarter way?
          // TODO make actual quintile/quantile
          // TODO where is Utah? make sure we match all
          if (state.story_count > 9) {
            style.getFill().setColor(colors[0]);
          } else if (state.story_count > 6) {
            style.getFill().setColor(colors[1]);
          } else if (state.story_count > 3) {
            style.getFill().setColor(colors[2]);
          } else {
            // this else may not be necessary since we set default above
            style.getFill().setColor(colors[3]);
          }
          break;
        }
      }
      return style;
    });
  })
  .catch(function(err) {
    console.log(err);
  });

// TODO get counties working, and reset color when we zoom in