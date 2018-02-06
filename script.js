var map = new ol.Map({
  target: "map",
  layers: [
    // new ol.layer.Tile({
    //   source: new ol.source.OSM()
    // }),
    new ol.layer.Tile({
      source: new ol.source.Stamen({
        layer: "toner"
      })
    })
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([-95.867, 37.963]),
    zoom: 4
  })
});

// zooms to location, from https://openlayers.org/workshop/en/basics/geolocation.html
// navigator.geolocation.getCurrentPosition(function(pos) {
//   const coords = ol.proj.fromLonLat([
//     pos.coords.longitude,
//     pos.coords.latitude
//   ]);
//   map.getView().animate({ center: coords, zoom: 10 });
// });
