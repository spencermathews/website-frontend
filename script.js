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

var vectorLayer = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: "https://openlayers.org/en/v4.6.4/examples/data/topojson/us.json",
    // will require work to get this one working, probably because of projection? but even this does not have names!?
    // url: "https://unpkg.com/us-atlas@1.0.2/us/10m.json",
    format: new ol.format.TopoJSON({
      layers: ["states"]
      // layers: ["counties"]
    }),
    overlaps: false
  }),
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
      // layers: ["states"]
      layers: ["counties"]
    }),
    overlaps: false
  }),
  style: function(feature) {
    style.getText().setText(feature.get("name"));
    return style;
  },
  minResolution: 200,
  maxResolution: 2000
});

var map = new ol.Map({
  target: "map",
  layers: [
    // vectorLayer,
    new ol.layer.Tile({
      source: new ol.source.Stamen({
        layer: "toner"
      })
    }),
    vectorLayer,
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

var featureOverlay = new ol.layer.Vector({
  source: new ol.source.Vector(),
  map: map,
  style: function(feature) {
    highlightStyle.getText().setText(feature.get("name"));
    return highlightStyle;
  }
});

var highlight;
var displayFeatureInfo = function(pixel) {
  // test
  // for some reason when the featureOverlay is displayed then the foreach feature at pixel
  let x = 0;
  var feature = map.forEachFeatureAtPixel(pixel, function(feature, layer) {
    console.log("id:", feature.getId()); // debug
    console.log("properties:", layer.getProperties());
    // console.log(layer.getSource());
    x++;
  });
  console.log(x);

  // may need better logic with multiple layers!
  // this does not seem to pick up layers other than the feature layer!
  var feature = map.forEachFeatureAtPixel(pixel, function(feature) {
    return feature;
  });

  // unimplemented
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

map.on("pointermove", function(evt) {
  if (evt.dragging) {
    return;
  }
  // more verbose was probably just for example, but look into
  var pixel = map.getEventPixel(evt.originalEvent);
  displayFeatureInfo(pixel);
  // displayFeatureInfo(evt.pixel); // why wasn't this done this way originally, seems to work!?

  console.log("map fired pointermove");
});

map.on("click", function(evt) {
  displayFeatureInfo(evt.pixel);

  console.log("map fired click");
  console.log(map.getView().getResolution()); // debug?
});

// test
// https://openlayersbook.github.io/ch09-taking-control-of-controls/example-03.html
// https://openlayers.org/en/latest/examples/mouse-position.html
var mousePosition = new ol.control.MousePosition({
  coordinateFormat: ol.coordinate.createStringXY(2),
  projection: "EPSG:4326"
  // target: document.getElementById("myposition"),
  // undefinedHTML: "&nbsp;"
});
map.addControl(mousePosition); // can also .extend() the map controls collection

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
