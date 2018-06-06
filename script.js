// why does DoubleClickZoom not work as in https://openlayers.org/en/latest/examples/select-features.html

/********************************************************************************
 * Styles
 ********************************************************************************/

var style = new ol.style.Style({
  fill: new ol.style.Fill({
    color: "rgba(255, 0, 0, 1.0)"
  }),
  stroke: new ol.style.Stroke({
    // color: "rgba(255, 0, 0, 0.6)",
    color: "#fff",
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

var highlightStyle = new ol.style.Style({
  fill: new ol.style.Fill({
    color: "rgba(255, 255, 255, 0.0)"
  }),
  stroke: new ol.style.Stroke({
    color: "#000",
    width: 1
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

// highlightStyle = style;

/********************************************************************************
 * Layers
 ********************************************************************************/

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
  style: function (feature) {
    // style.getText().setText(feature.get("name"));
    return style;
  },
  minResolution: 200,
  maxResolution: 20000
});

var countyLayer = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: "https://cdn.rawgit.com/spencermathews/us-atlas/cbd1b078/us/10m.json",
    format: new ol.format.TopoJSON({
      layers: ["counties"]
    }),
    overlaps: false
  }),
  style: function (feature) {
    // style.getText().setText(feature.get("name"));
    return style;
  },
  minResolution: 200,
  maxResolution: 20000
});

var key =
  "pk.eyJ1Ijoic21hdGhld3MiLCJhIjoiY2piMjc0eXd6Mjh5ajMzbmdxbnpmYjlsciJ9.CQrv5JFfFAKUdF2uLXe7Vw";

var mapboxLayer = new ol.layer.VectorTile({
  declutter: true,
  source: new ol.source.VectorTile({
    attributions:
      '© <a href="https://www.mapbox.com/map-feedback/">Mapbox</a> ' +
      '© <a href="https://www.openstreetmap.org/copyright">' +
      "OpenStreetMap contributors</a>",
    format: new ol.format.MVT(),
    url:
      "https://{a-d}.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6/" +
      "{z}/{x}/{y}.vector.pbf?access_token=" +
      key
  }),
  style: createMapboxStreetsV6Style(
    ol.style.Style,
    ol.style.Fill,
    ol.style.Stroke,
    ol.style.Icon,
    ol.style.Text
  )
});

/********************************************************************************
 * Map
 ********************************************************************************/

var map = new ol.Map({
  target: "map",
  layers: [
    // stateLayer,
    // countyLayer,
    new ol.layer.Tile({
      source: new ol.source.Stamen({
        layer: "toner"
      }),
      opacity: 1
    }),
    countyLayer,
    stateLayer
    // new ol.layer.Tile({
    //   source: new ol.source.Stamen({
    //     layer: "toner-hybrid"
    //   }),
    //   opacity: 1
    // })
    // mapboxLayer
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([-95.867, 37.963]),
    zoom: 4, // best guess
    minZoom: 3 // there may be a better way but this works
  })
});

// var styleJson =
//   "https://free.tilehosting.com/styles/positron/style.json?key=98iBFc9yWwYigscw6gO2";
// olms.apply(map, styleJson);

/********************************************************************************
 * old original pointermove Event
 ********************************************************************************/

var featureOverlay = new ol.layer.Vector({
  source: new ol.source.Vector(),
  map: map,
  style: function (feature) {
    highlightStyle.getText().setText(feature.get("name"));
    return highlightStyle;
  }
});

// unused!
var highlight;
var displayFeatureInfo = function (pixel) {
  // may need better logic with multiple layers!
  // this does not seem to pick up layers other than the feature layer!
  var feature = map.forEachFeatureAtPixel(pixel, function (feature) {
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

map.on("pointermove", function (evt) {
  if (evt.dragging) {
    return;
  }
  // more verbose was probably just for example, but look into
  var pixel = map.getEventPixel(evt.originalEvent);
  // displayFeatureInfo(pixel);
  // displayFeatureInfo(evt.pixel); // why wasn't this done this way originally, seems to work!?

  // console.log("map fired pointermove");
});

/********************************************************************************
 * pointermove Event
 ********************************************************************************/

// from http://openlayersbook.github.io/ch05-using-vector-layers/example-09.html
// when the user moves the mouse, get the name property
// from each feature under the mouse and display it
function onMouseMove(browserEvent) {
  var coordinate = browserEvent.coordinate;
  var pixel = map.getPixelFromCoordinate(coordinate);
  var el = document.getElementById("name");
  el.innerHTML = "";
  map.forEachFeatureAtPixel(pixel, function (feature) {
    el.innerHTML += feature.get("name") + "<br>";
  });
}
map.on("pointermove", onMouseMove);

/********************************************************************************
 * click Event
 ********************************************************************************/

// click fires ol.MapBrowserEvent
// ? where the hell is documentation for the arg to listener function?
// note: the mere presence of this event prevents the default DoubleClickZoom interaction, is there a way to preserve it? maybe raise the event again?
map.on("click", function (evt) {
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
  var feature = map.forEachFeatureAtPixel(pixel, function (feature, layer) {
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

/********************************************************************************
 * MousePosition Control
 ********************************************************************************/

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

/********************************************************************************
 * Junk
 ********************************************************************************/

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

/********************************************************************************
 * Select Interaction
 ********************************************************************************/

/* Adds pointerMove Select interation */
// what's weird is that after adding this select code (and before adding style to it) the interaction with featureOverlay improved such that after zooming to county level any mouse movement would select a county, whereas before the logic in displayFeatureInfo was incomplete and had to leave state first, note that going from county to state was fine since leaving county sufficed, I think it had something to do with the featureOverlay dominated.
var selectState = new ol.interaction.Select({
  condition: ol.events.condition.pointerMove,
  // style: highlightStyle
  // test how to manipulate style w stylefunctions
  // kind of works with us-data states.topo.json but only some states highlight text! since not all have name string? check?
  style: function (feature) {
    // highlightStyle.getText().setText(feature.get("name"));
    return highlightStyle;
  },
  layers: [stateLayer]
});
map.addInteraction(selectState);

var selectCounty = new ol.interaction.Select({
  condition: ol.events.condition.pointerMove,
  // style: highlightStyle
  // test how to manipulate style w stylefunctions
  // kind of works with us-data states.topo.json but only some states highlight text! since not all have name string? check?
  style: function (feature) {
    // highlightStyle.getText().setText(feature.get("name"));
    return highlightStyle;
  },
  layers: [countyLayer]
});
map.addInteraction(selectCounty);

// Define state select event listener, listener function is passed ol.interaction.Select.Event
selectState.on("select", selectStateListener);

/*
 * Event listener for state select interaction.
 * Expects stateStories to be populated.
 */
function selectStateListener(e) {
  // Populates #status
  document.getElementById("status").innerHTML =
    "&nbsp;" +
    e.target.getFeatures().getLength() +
    " selected features (last operation selected " +
    e.selected.length +
    " and deselected " +
    e.deselected.length +
    " features)";

  /* Gets and clears output elements */
  var info = document.getElementById("info");
  info.innerHTML = "";
  let stories = document.getElementById("stories");
  stories.innerHTML = "";

  /* Populates output elements with data from selected feature */
  var feature = e.selected[0];
  /* Conditioning on feature prevents error getting name when no features are selected.
     Conditioning on stateStories[name] catches when state has no stories.
     TODO remove redundant clearing of elements above and in else clause */
  if (feature) {
    let name = feature.get("name");
    if (stateStories[name] === undefined) {
      info.innerHTML = "0" + " stories<br>from " + name;
    } else {
      // Populates #info in sidebar
      let storyCount = stateStories[name].story_count;
      info.innerHTML = storyCount + " stories<br>from " + name; //feature.getId()

      // Populates story #preview in sidebar
      for (let preview of stateStories[name].preview) {
        let storyElement = document.createElement("div");
        storyElement.classList.add("preview");
        storyElement.innerHTML = preview + "...";
        stories.appendChild(storyElement);
      }

      // Loads county-level preview data.
      getStatePreview(name)
        .then(result => {
          console.log(result);
        })
        .catch(error => {
          console.log(error);
        });
    }
  } else {
    info.innerHTML = "&nbsp;";
  }

  // debugSelectEvent(e); // consider preserving use call() to preserve "this"
}

/*
 * 
 * @param {string} state_name - The state with the counties to style.
 */
function styleCounties(state_name) {
  /* Iterates through the counties*/
  var maxStories = 0;
  for (let county of results) {
    if (county.story_count > maxStories) {
      maxStories = county.story_count;
    }
  }
  console.log("maxStories (county):", maxStories);

  // Sets style function for the layer
  // Note this is still OK even if features have not been populated from source
  countyLayer.setStyle(function (feature) {
    let name = feature.get("name");
    // console.log(name);
    // style.getText().setText(name);
    style.getText().setText("");

    // SOMETIME find a more clever/efficient way of matching, maybe create a dict from results
    for (let county of results) {
      // set default color in case state fails to match
      style.getFill().setColor(colors[3]);
      if (name === county.name) {
        // console.log(state.name, state.story_count, maxStories);
        // is there a smarter way?
        // TODO make actual quintile/quantile
        // TODO where is Utah? make sure we match all
        if (county.story_count > 9) {
          style.getFill().setColor(colors[0]);
        } else if (county.story_count > 6) {
          style.getFill().setColor(colors[1]);
        } else if (county.story_count > 3) {
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
}

function debugSelectEvent(e) {
  console.log('\nin debugSelectEvent:');
  // debug
  /* Print the members of ol.interaction.Select.Event */
  // console.log("deselected:", e.deselected);
  console.log("mapBrowserEvent:", e.mapBrowserEvent);
  // console.log("selected:", e.selected);
  console.log("target:", e.target);
  // console.log("mapBrowserEvent:", e.mapBrowserEvent.target); // vs e.target?
  // console.log("type:", e.type);

  /* junk below */

  // console.log(stateLayer.getStyle());
  // console.log(stateLayer.getStyleFunction());
  // Note if using a style function getStyle and getStyleFunction will be same
  // otherwise getStyle returns another sort of style object
  // console.log(stateLayer.getStyle() == stateLayer.getStyleFunction());

  // OK, so you can't restyle a style function!
  // var s = stateLayer.getStyle();
  // // s.clone()!
  // console.log(s);
  // console.log(s.getFill());
  // console.log(s.getFill().getColor());

  // ? attempt to get layers
  // this block is broken for reasons unknown
  var layers = map.getLayers(); // .getArray();
  console.log("#layers:", layers.getLength());
  layers.forEach(function (layer, index) {
    console.log("layer index:", index, layer);
    // console.log(typeof layer);
    if (layer.getVisible()) {
      console.log("keys:", layer.getKeys);
      console.log("properties:", layer.getProperties());
      // console.log(layer.getOpacity());
      console.log(
        "min/maxResolution:",
        layer.getMinResolution,
        layer.getMaxResolution
      );
      // ? getVisible seems to always be true even if layer is invisible by min/maxResolution
      var source = layer.getSource();
      console.log("source:", source);
      console.log(source.getState());
      // ? why the hell are keys and properties of source empty
      console.log(source.getKeys());
      console.log(source.getProperties());
    } else {
      console.log("what?");
    }
  });

  // Styling can be done when declaring the interaction, however we want to
  // dim the existing fill, hopefull this will work...
  var features = e.target.getFeatures(); // gets a collection of features
  if (features.getLength() == 1) {
    var feature = features.item(0);
    console.log("feature id:", feature.getId()); // does not work with
    console.log(feature.getProperties());
    console.log(feature.getKeys());
    // console.log(highlightStyle.getFill());
    console.log(feature.getStyle());
    console.log(feature.getStyleFunction());
  } else {
    console.log("error feature:", feature);
  }
}

// Define county select event listener, listener function is passed ol.interaction.Select.Event
selectCounty.on("select", selectCountyListener);

/*
 * Event listener for county select interaction.
 * Expects countyStories to be populated.
 */
function selectCountyListener(e) {
  // Populates #info and #stories
  var info = document.getElementById("info");
  info.innerHTML = "";
  let stories = document.getElementById("stories");
  stories.innerHTML = "";

  var feature = e.selected[0];
  if (feature) {
    let name = feature.get("name");
    if (countyStories[name] === undefined) {
      info.innerHTML = "0" + " stories<br>from " + name;
    } else {
      let storyCount = countyStories[name].story_count;
      info.innerHTML = storyCount + " stories<br>from " + name; //feature.getId()

      for (let preview of countyStories[name].preview) {
        let storyElement = document.createElement("div");
        storyElement.classList.add("preview");
        storyElement.innerHTML = preview + "...";
        stories.appendChild(storyElement);
      }
    }
  } else {
    info.innerHTML = "&nbsp;";
  }
}

/********************************************************************************
 * Data
 ********************************************************************************/

var colors = ["#ee9231", "#fbaa39", "#fcc955", "#f4ec94", "#e4e4e4"];

/*
 * Converts an array of objects to an object with property names based on some key in the array objects.
 * 
 * from https://medium.com/dailyjs/rewriting-javascript-converting-an-array-of-objects-to-an-object-ec579cafbfc7
 * see similar trickery https://stackoverflow.com/q/14810506
 * 
 * @param {Object[]} arr
 * @param {string} keyField - The property by which to key the objects.
 */
const arrayToObject = (arr, keyField) =>
  Object.assign({}, ...arr.map(item => ({ [item[keyField]]: item })));

// Stores national (per state) summary data keyed by (full) name
var stateStories;

/* Gets state story counts via nation level preview. */
// should this come at start or end of js?
fetch("https://app.storiesofsolidarity.org/api/state/?page=1")
  .then(function (response) {
    return response.json();
  })
  .then(function (responseAsJson) {
    console.log(responseAsJson);
    // TODO deal with multiple pages
    // response has members count, next, previous, results
    var results = responseAsJson.results;
    stateStories = arrayToObject(results, "name");

    var maxStories = 0;
    for (let state of results) {
      if (state.story_count > maxStories) {
        maxStories = state.story_count;
      }
    }
    console.log("maxStories (state):", maxStories);

    // Sets style function for the layer
    // Note this is still OK even if features have not been populated from source
    stateLayer.setStyle(function (feature) {
      let name = feature.get("name");
      // console.log(name);
      // style.getText().setText(name);
      style.getText().setText("");

      // SOMETIME find a more clever/efficient way of matching, maybe create a dict from results
      for (let state of results) {
        // set default color in case state fails to match
        style.getFill().setColor(colors[3]);
        if (name === state.name) {
          // console.log(state.name, state.story_count, maxStories);
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
    // stateLayer.setStyle(undefined); // use default style
    // stateLayer.setStyle(null); // only features with style are shown
  })
  .catch(function (err) {
    console.log(err);
  });

// Stores state (per county) summary data keyed by (full) name
var countyStories;

/*
 * Retrieves county level preview for a given state.
 * @param {string} state_name - State name, probably requires first letter to be capitalized.
 * @returns {Promise} - Promise for countyStories object.
 */
function getStatePreview(state_name) {
  console.log('Fetching ' + state_name + '...');
  return fetch("https://app.storiesofsolidarity.org/api/county/?state_name=" + state_name)
    .then(function (response) {
      return response.json();
    })
    .then(function (responseAsJson) {
      console.log("getStatePreview", responseAsJson);
      // TODO deal with multiple pages
      // response has members count, next, previous, results
      var results = responseAsJson.results;
      // Strips off the " County" suffix on all the results in place.
      // Doing it not in place, or after coverting to object, may be tricky.
      results.forEach(value => {
        value.name = value.name.replace(' County', '');
      });
      countyStories = arrayToObject(results, "name");

      return countyStories;
    })
    .catch(function (err) {
      console.log(err);
    });
}

// Example of how to use source.getFeatures which may otherwise fail due to async loading
// See https://openlayers.org/en/latest/doc/faq.html#why-are-my-features-not-found-
stateLayer.getSource().on("change", onStateLayerChange);

/*
 * Callback function for when state layer source is changed.
 * Does not do anything unless source is in ready state.
 */
function onStateLayerChange(evt) {
  var source = evt.target;
  console.log("stateLayer fired change!");
  /* Checking for ready state is recommended pattern even though it seems redundant
     State appeared to be ready the first time the change event was fired! */
  if (source.getState() === "ready") {
    // Unlisten for change event since this should only happen once
    stateLayer.getSource().un("change", onStateLayerChange);

    var numFeatures = source.getFeatures().length;
    console.log("Count after change: " + numFeatures);

    // Save fips code from feature into 'fips' property and sets id to state name (from 'name' property).
    source.forEachFeature(feature => {
      try {
        // Sets a new 'fips' property on the feature with value taken from id, strip 'US' prefix. Note Puerto Rico has 6 digits and no 'US' prefix.
        feature.set('fips', feature.getId().replace(/^US/, ''));
      } catch (e) {
        // Continue even though some features e.g. 'Guam' don't have id set.
        if (e instanceof TypeError) {
          console.error(feature.get('name'), e.message);
        }
      }

      // Copy state 'name' into feature id.
      feature.setId(feature.get("name"));
    })
  }

  // Forces county source to load immediately by reducing it's maxResolution after the fact, seems to work but may not be guaranteed to.
  countyLayer.setMaxResolution(1999);
}

// note features may not be available immediately, like features
// ? how do ready state and change event relate?
// var stateSource = stateLayer.getSource();
// console.log("stateSource", stateSource);
// console.log(stateSource.getUrl());
// console.log(stateSource.getFormat());
// console.log(stateSource.getState());

// curently does not work
// Eventually want to combine this with loading of /api/state tp remove redundancy, but first need to load county layer with names.
// fetch(
//   "https://spencermathews.github.io/us-data/test/county-state_name-California-1.json"
// )
//   .then(function(response) {
//     return response.json();
//   })
//   .then(function(responseAsJson) {
//     // TODO deal with multiple pages
//     // response has members count, next, previous, results
//     var results = responseAsJson.results;
//     var maxStories = 0;
//     for (let county of results) {
//       if (county.story_count > maxStories) {
//         maxStories = county.story_count;
//       }
//     }
//     console.log("maxStories (county):", maxStories);

//     countyLayer.setStyle(function(feature) {
//       let name = feature.get("name");
//       // style.getText().setText(name);

//       // SOMETIME find a more clever/efficient way of matching, maybe create a dict from results
//       console.log(name);
//       for (let county of results) {
//         // set default color in case state fails to match
//         style.getFill().setColor(colors[3]);
//         if (name === county.name) {
//           console.log(county.name, county.story_count, maxStories);
//           // is there a smarter way?
//           // TODO make actual quintile/quantile
//           if (county.story_count > 9) {
//             style.getFill().setColor(colors[0]);
//           } else if (county.story_count > 6) {
//             style.getFill().setColor(colors[1]);
//           } else if (county.story_count > 3) {
//             style.getFill().setColor(colors[2]);
//           } else {
//             // this else may not be necessary since we set default above
//             style.getFill().setColor(colors[3]);
//           }
//           break;
//         }
//       }
//       return style;
//     });
//   })
//   .catch(function(err) {
//     console.log(err);
//   });
