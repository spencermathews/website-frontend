/*global Solidarity, Backbone, JST, d3, queue, topojson, jenks */

Solidarity.Views = Solidarity.Views || {};

// log2 polyfill for IE
Math.log2 = Math.log2 || function(x) {
    return Math.log(x) / Math.LN2;
};

(function () {
    'use strict';

    Solidarity.Views.StoryMap = Solidarity.Views.BaseView.extend({

        template: JST['app/templates/storyMap.html'],
        templateTip: JST['app/templates/storyMapTooltip.html'],
        el: '#content',
        events: {},
        dataCache: {
            us: undefined,
            counties: {},
            zips: {}
        },
        width: 1000,
        height: 600,

        initialize: function () {
            this.states = new Solidarity.Collections.States({});
            this.counties = new Solidarity.Collections.Counties({});
            this.locations = new Solidarity.Collections.Locations({});
            this.colorList = ['#E4E4E4','#F3EB99','#FAC85F','#F9A946','#EC913D'];
        },
        
        /*
         * Called by RegionManager.openView
         * ? seems to make api call every time, is there a way to optimize?
         */
        onShow: function() {
            var self = this;

            this.drawMap();
            /* Fetches state data using API */
            this.states.fetch({
                success: function(data) {
                    // do initial render
                    self.renderStoryCollection('states', data, 'g.country path.feature');
                    self.doneRendering = true;
                }
            });
        },

        mapPointToCoords: function(p) {
            // takes map point [x, y], returns [lon, lat]
            var w = this.width,
                h = this.height,
                s = this.zoom.scale();

            // translate from map center to container xy
            // then scale and invert
            return this.projection.invert([
              (w/2 - p[0])/s, (h/2 - p[1])/s
            ]);
        },

        coordsToMapPoint: function(c) {
            // takes [lon, lat], returns map point [x, y] at current scale
            var w = this.width,
                h = this.height,
                s = this.zoom.scale();

            var p = this.projection(c);
            if (p) { return [w/2 - p[0]*s, h/2 - p[1]*s]; }
            else { return null; }
            // coords not within map projection
        },

        /*
         *
         */
        drawMap: function () {
            var self = this,
                width = this.width,
                height = this.height;
            this.activeGeom = d3.select(null);
            this.hoveredGeom = d3.select(null);

            this.colorBackground = '#3F3F3F';
            this.colorUnselected = '#E4E4E4';

            // map projection, Albers US & puerto rico
            //var projection = d3.geo.albersUsaPr()
            var projection = d3.geo.orthographic()
                .scale(width) // full width of screen
                .translate([width / 2, height / 2]); // centered
            var path = d3.geo.path()
                .projection(projection);
            this.projection = projection;
            this.path = path;

            // responsive SVG
            this.svg = d3.select('#map').append('svg')
                .attr('preserveAspectRatio', 'xMinYMin meet')
                .attr('viewBox', '0 0 '+width+' '+height)
                .classed('svg-content-responsive', true)
                .on('click', stopped, true);

            this.svg.append('rect')
                .attr('class', 'background')
                .attr('width', width)
                .attr('height', height)
                .on('click', zoomReset);

            this.map = this.svg.append('g');

            // map zoom extent goes from 1-256
            var zoom = d3.behavior.zoom()
                .translate([0, 0])
                .scale(1)
                .scaleExtent([1, 256]) // 2^0 - 2^8
                .on('zoom', zoomEvent)
                .on('zoomend', saveMapStateToHash);
            this.zoom = zoom; // save to view

            // zoom slider from 1-8 (log2 scale)
            var slider = d3.selectAll('#zoom input')
                .attr('value', zoom.scaleExtent()[0])
                .on('input', zoomInput);

            d3.selectAll('#zoom .btn')
                .on('click', zoomInput);
            d3.selectAll('#reset .btn')
                .on('click', zoomReset);

            this.svg
              .call(zoom) // allow free zooming, but only when scale > 1
              .call(zoom.event);

            // load US states topojson
            if (this.us_states === undefined) {
                d3.json(Solidarity.dataRoot + 'geography/states.topo.json', function(error, us) {
                    Solidarity.log('requesting states.topo.json');
                    self.dataCache.us = us; //cache for view reload
                    drawStates(error, self.dataCache.us);
                });
            } else {
                Solidarity.log('using cached states.topo.json');
                drawStates(null, this.dataCache.us);
            }

            function zoomToBounds(d, scaleFactor) {
                if (scaleFactor === undefined) {
                    scaleFactor = 0.9;
                }

                var bounds = path.bounds(d),
                  dx = bounds[1][0] - bounds[0][0],
                  dy = bounds[1][1] - bounds[0][1],
                  x = (bounds[0][0] + bounds[1][0]) / 2,
                  y = (bounds[0][1] + bounds[1][1]) / 2,
                  scale = scaleFactor / Math.max(dx / width, dy / height),
                  translate = [width / 2 - scale * x, height / 2 - scale * y];

                self.map.transition()
                  .duration(750)
                  .call(zoom.translate(translate).scale(scale).event);
            }

            function zoomReset() {
                // reset active features to normal colors
                self.activeGeom
                  .style('fill', self.colorUnselected)
                  .classed('feature', true)
                  .classed('background', false)
                  .classed('active', false);
                self.activeGeom = d3.select(null);

                // remove existing state geometry
                d3.selectAll('g.state').remove();

                self.map.transition()
                  .duration(750)
                  .call(zoom.translate([0, 0]).scale(1)
                  .event);

                self.renderStoryCollection('states', self.states, 'g.country path.feature');
            }

            function zoomInput() {
                var e = d3.event;
                var scale = zoom.scale();
                var rescale = 1;
                var dur = 250;

                // zoom buttons have value 2^(val+incr)
                // use Math.log2 to get new scale
                if (e.type === 'input') {
                    var val = d3.select(this).property('value');
                    rescale = Math.pow(2, val);
                    dur = 0; // nix duration when user is interactive
                }

                if (e.type === 'click') {
                    var incr = 1;
                    if (d3.select(this).classed('out')) {
                      incr = incr*-1;
                    }

                    rescale = Math.pow(2, Math.log2(scale) + incr);
                }

                var extent = zoom.scaleExtent();
                var min = extent[0];
                var max = extent[1];
                if (rescale > max) { rescale = max; }
                if (rescale < min) { rescale = min; }
                
                var t = zoom.translate();
                var c = [width / 2, height / 2];
                // zoom in to viewport center
                self.map.transition()
                  .duration(dur)
                  .call(zoom.translate(
                    [c[0] + (t[0] - c[0]) / scale * rescale, 
                     c[1] + (t[1] - c[1]) / scale * rescale]) 
                    .scale(rescale)
                  .event);
            }

            function zoomEvent() {
                // cap translations to viewport dimensions
                var e = d3.event,
                    tx = Math.min(0, Math.max(e.translate[0], width - width * e.scale)),
                    ty = Math.min(0, Math.max(e.translate[1], height - height * e.scale));

                // set map transform to translate and scale
                self.map.attr('transform', 'translate(' + [tx, ty] + ')scale(' + e.scale + ')');

                // set zoom input to log-based scale
                $('#zoom input').val(Math.log2(e.scale));
                // draw border lines and circles at appropriate width
                self.map.style('stroke-width', 1.5 / e.scale + 'px');
                self.map.selectAll('g.locations circle')
                  .style('stroke-width', 1 / e.scale + 'px')
                  .attr('r', function() { return 8 / e.scale; });
            }

            /*
             *
             */
            function saveMapStateToHash() {
              // save loaded geometries like #map/state/county
              if (self.doneRendering) {
                if (self.activeGeom && self.activeGeom.length) {
                  var p = self.activeGeom[0].properties;
                  if (!p) { return; }
                  var url = 'map';
                  var p_name = p.name.replace(' ', '_');
                  if (p && p.type === 'state') {
                    url += '/' + p_name;
                  } else if (p && p.type === 'county' && p.state_name) {
                    var state_name = p.state_name.replace(' ', '_');
                    url += '/' + state_name + '/' + p_name;
                  } else {
                    url += '/' + p_name;
                  }
                }

                // save map coords like #?lat&lon&scale
                var latlng = self.mapPointToCoords(self.zoom.translate());
                url += '?lat='+latlng[1].toFixed(2) + // note order flip
                  '&lon='+latlng[0].toFixed(2)+
                  '&zoom='+self.zoom.scale().toFixed(2);

                Solidarity.routerStories.navigate(url); // DO NOT TRIGGER HERE, WE ARE NOT RELOADING
              }
            }

            function stopped() {
                if (d3.event.defaultPrevented) { d3.event.stopPropagation(); }
            }

            function geomUrl(preview) {
                var geom_name = preview.name.replace(' ', '_');

                var selected_state = d3.select('g.state');
                if (!selected_state[0][0]) { return geom_name; }
                var state_name = selected_state.attr('id').replace(' ', '_');

                if (preview.type === 'state') {
                    return state_name;
                }
                if (preview.type === 'county') {
                    return (state_name + '/' + geom_name);
                }
                if (preview.type === 'location') {
                  if (preview.zipcode) {
                    // default state/city/zip
                    var geom_city = preview.city.replace(' ', '_') || 'zip';
                    return state_name + '/' + geom_city + '/' + preview.zipcode;
                  } else {
                    // fallback to state/county
                    return state_name + '/' + geom_name;
                  }
              }
            }

            function tooltipContent(d) {
                var data = d.properties || {};
                data.story_count = data.story_count || 0;
                data.name = data.name || d.id;
                data.url = geomUrl(data);

                return self.templateTip(data);
            }

            function tooltipDirection(d) {
              switch(d.properties.name) {
                case 'Puerto Rico':
                case 'Maine':
                  return 'w';
                default:
                  return 'e';
              }
              // for most states, appear to the east
            }

            function tooltipOffset(d) {
              switch(d.properties.name) {
                case 'Alaska':
                  return [0, -50];
                case 'California':
                  return [0, -40];
                case 'Idaho':
                  return [0, -20];
                default:
                  return [0, -10];
              }
              // for most states, appear on the eastern border
            }

            // setup feature tooltips
            this.tip = d3.tip()
              .attr('id', 'd3-tip')
              .html(tooltipContent)
              .direction(tooltipDirection)
              .offset(tooltipOffset);
            this.svg.call(this.tip);
            d3.selectAll('#d3-tip').on('mouseleave', this.tip.hide);

            function setActiveGeom(d, background) {
              // reset current activeGeom colors
              if (background) {
                self.activeGeom
                  .style('fill', self.colorBackground)
                  .classed({'feature': true,
                            'background': true,
                            'active': false});
              } else {
                self.activeGeom
                  .style('fill', self.colorUnselected)
                  .classed({'feature': true,
                            'background': false,
                            'active': false});
              }

              // select new activeGeom
              self.activeGeom = d3.selectAll(d).classed('active', true);
            }
            this.setActiveGeom = _.bind(setActiveGeom, this);

            function clickState(d) {
                if (d === undefined) { Solidarity.error('clickState d is undefined'); return false; }

                Solidarity.log('clickState', d);
                setActiveGeom(d);
                
                // hide background
                d3.selectAll('path.background').style('fill', self.colorBackground);

                // remove existing state geometry
                d3.selectAll('g.state').remove();

                var scaleFactor = 0.9;
                // northeastern states needs to be zoomed out a little
                if (d.id === '25') { scaleFactor = 0.75; } //MA
                if (d.id === '36') { scaleFactor = 0.6; } //NY
                if (d.id === '09') { scaleFactor = 0.5; } //CT
                if (d.id === '44') { scaleFactor = 0.3; } //RI
                if (d.id === '11') { scaleFactor = 0.2; } //DC

                zoomToBounds(d, scaleFactor);

                // load state-specific topojson, with county boundaries
                var fn = d.properties.name.replace(' ','_');
                queue()
                    .defer(d3.json, Solidarity.dataRoot + 'geography/counties/'+fn+'.topo.json')
                    .await(drawCounties);
            }
            this.clickState = _.bind(clickState, this);

            function clickCounty(d) {
                if (d === undefined) { d = this; }
                Solidarity.log('clickCounty', d.properties.name);

                if (d === self.activeGeom[0]) {
                  // navigate to view county
                  Backbone.history.navigate('#view/'+geomUrl(d.properties), {trigger: true});
                } else {
                  // zoom to the new geom
                  d3.selectAll(d).style('fill', 'transparent');
                  zoomToBounds(d);
                  drawLocations(d);

                  setActiveGeom(d, true);
              }
            }
            this.clickCounty = _.bind(clickCounty, this);

            function clickLocation(d) {
                Solidarity.log('clickLocation', d.id);

                //navigate to view geomUrl
                Backbone.history.navigate('#view/'+geomUrl(d.properties), {trigger: true});
            }

            function drawStates(error, data) {
                Solidarity.log('drawStates', data);
                if (error) { Solidarity.error(error, 'error in drawStates'); return false; }

                var us = self.map.append('g')
                  .attr('class', 'country')
                  .attr('id', 'US');

                // get features from topojson, and set type
                var features = topojson.feature(data, data.objects.states).features;
                _.each(features, function(f) { f.properties.type = 'state'; });
                
                // merge all states for background
                us.append('path')
                  .datum(topojson.merge(data, data.objects.states.geometries))
                  .attr('class', 'background')
                  .attr('d', path);

                // add individual states as paths
                us.selectAll('path')
                  .attr('class', 'states')
                  .data(features)
                .enter().append('path')
                  .attr('d', path)
                  .attr('class', 'feature state')
                  .on('click', clickState);

                // mesh borders
                us.append('path')
                  .datum(topojson.mesh(data, data.objects.states, function(a, b) { return a !== b; }))
                  .attr('class', 'border')
                  .attr('d', path);
            }

            /*
             *
             */
            function drawCounties(error, data) {
                Solidarity.log('drawCounties', data);
                if (error) { Solidarity.error(error, 'error in drawCounties'); return false; }

                for(var geomKey in data.objects) { break; }
                var stateName = geomKey.split('.')[0];

                var state = self.map.append('g')
                  .attr('class', 'state')
                  .attr('id', stateName);

                // get features from topojson, and set type
                var features = topojson.feature(data, data.objects[geomKey]).features;
                _.each(features, function(f) { f.properties.type = 'county'; });

                var counties = state.append('g')
                  .attr('class', 'counties')
                .selectAll('path')
                  .attr('class','counties')
                  .style('fill', self.colorUnselected)
                  .data(features)
                .enter().append('path')
                  .attr('d', path)
                  .attr('class', 'feature county')
                  .on('click', clickCounty);

                // reset state background color
                state.selectAll('path.background').style('fill', self.colorBackground);

                // merge county boundaries for mesh
                state.append('path')
                  .datum(topojson.mesh(data, data.objects[geomKey]))
                  .attr('class', 'border')
                  .style('border', 'white')
                  .attr('d', path);

                // request and render counties collection for this state
                self.counties.fetch({
                  data: {state_name: stateName},
                  success: function() {
                    self.renderStoryCollection('counties', self.counties,
                      'g.state path.county',
                      'g.country path.feature');
                  }
                });
                
            }

            function drawLocations(d) {
                // draw locations for selected county

                var state = d3.selectAll('g.state');
                var stateName = state[0][0].id; // ugly hack to get id from svg element

                self.locations.queryParams = {'state_name': stateName};
                self.locations.getFirstPage({ /* ? */
                    success: function(results) {

                        var locations = state.append('g')
                          .attr('class', 'locations')
                        .selectAll('circle')
                          .data(function() {
                            // convert location model attributes to properties
                            return _.map(self.locations.models, function(d) {
                              return {
                                properties: {
                                  id: d.attributes.id,
                                  story_count: d.attributes.story_count,
                                  name: d.attributes.city || d.attributes.zipcode,
                                  city: d.attributes.city,
                                  zipcode: d.attributes.zipcode,
                                  type: 'location',
                                },
                                attributes: {lon: d.attributes.lon, lat: d.attributes.lat}
                              };
                            });
                          })

                        .enter()
                          .append('circle')
                            .attr('r', function(d) { return 1; })
                            .attr('transform', function(d) {
                              var coords = projection([d.attributes.lon, d.attributes.lat]);
                              return 'translate(' + coords + ')';
                          })
                          .on('click', clickLocation);

                        d3.selectAll('circle')
                          .sort(function(a, b) {
                            return d3.descending(b.properties.story_count,
                                                 a.properties.story_count);
                          });

                        self.renderStoryCollection('locations', self.locations,
                          'g.locations circle');
                    }
                });
            }
        },

        colorScale: function(list, key) {
            // pluck key values, and remove undefineds from list
            var data = _.reject(_.pluck(list, key), _.isUndefined);

            if (data.length === 0) {
              // no data, all grey
              Solidarity.log('no data for '+key, list);
              return d3.functor('#E4E4E4');
            }

            // compute jenks natural breaks for data
            // starting with 5 classes, decrease until 1
            var breaks = null;
            for (var i = 5; i >= 1; i--) {
              try { breaks = jenks(data, i); }
              catch(err) { continue; }

              if (breaks) { break; }
              else { continue; } // retry with fewer classes
            }
            if (breaks) {
              return d3.scale.quantile()
                  .domain(breaks.slice(1))
                  .range(this.colorList);
            } else {
              // unable to determine jenks breaks
              Solidarity.error('unable to determine jenks breaks', list, key);
              return d3.functor('#E4E4E4');
            }             
        },

        /*
         * Not called anywhere!
         */
        hoverGeometry: function(geom) {
            // save hovered geometry to map context
            this.hoveredGeom = geom;
            
        },

        /**
         * Called only internally, from onShow:, and from drawMap: by zoomReset(), drawCounties(), and drawLocations()

         * @param {string} type could be 'states', 'counties', or 'locations'
         * @param {Backbone.Collection} collection
         * @param {string} geomSelector
         * @param {string} geomUnselector
         *
         * 
         */
        renderStoryCollection: function(type, collection, geomSelector, geomUnselector) {
            // trigger render event by type
            this.trigger('render-'+type); /* See Routers.Stories.storyMap where these callbacks are defined, but I can't seem to find a callback for render-location!? */

            // extract model attributes from the backbone collection
            var stories = collection.models.map(function(s) { return s.attributes; });
            var geoms = this.map.selectAll(geomSelector).data();

            // join stories and geoms by name or id
            var geoms_joined = _.map(geoms, function(g, index) {
                if (g.properties) {
                    var s;
                    if (g.properties.name) {
                      s = _.findWhere(stories, {name: g.properties.name});  
                    } else {
                      s = _.findWhere(stories, {zipcode: g.id});
                    }
                    if (s) {
                      // pull specific items from story collection to geom
                      g.properties.story_count = s.story_count;
                      g.properties.preview = s.preview;
                    }
                }

                return g;
            });

            var story_properties = _.pluck(geoms_joined, 'properties');
            var colorFunction = this.colorScale(story_properties, 'story_count');

            var self = this;
            this.map.selectAll(geomSelector)
              .data(geoms_joined)
              .style('fill', function(d) {
                    if (d.properties === undefined) { return self.colorUnselected; }
                    return colorFunction(d.properties.story_count || 0);
            });

            if (geomUnselector) {
                // unselect
                d3.selectAll(geomUnselector)
                  .style('fill', this.colorUnselected);
                // hide background paths, so higher resolution geoms appear
                d3.selectAll(geomUnselector+'.active')
                  .attr('class', 'background')
                  .style('fill', this.colorBackground);
            }

            // show tooltip on feature hover
            var cycleInterval;
            this.map.selectAll(geomSelector)
              .on('mouseenter', function(d) {
                d3.select('.hover').classed('hover', false);
                d3.select(this).classed('hover', true);
                self.tip.show(d);

                if (d.properties.preview && d.properties.preview.length > 0) {
                  // show preview items
                  $('#d3-tip .preview li:first-child').addClass('first active');
                  $('#d3-tip .preview li:last-child').addClass('last');
                  $('#d3-tip .preview .active').fadeIn(100);
                } else {
                  $('#d3-tip .preview').hide();
                }
                // cycle through the rest every 5 seconds
                var cyclePreview = function() {
                  if($('ul.cycle .last').is(':visible')) {
                    $('ul.cycle .active').removeClass('active');
                    $('ul.cycle .first').addClass('active');
                    $('ul.cycle li:visible').fadeOut(400, function(){
                      $('ul.cycle .active').fadeIn(400);
                    });
                  } else if($('ul.cycle .active').is(':visible')) {
                      $('ul.cycle .active').removeClass('active');
                      $('ul.cycle li:visible').next('li').addClass('active');
                      $('ul.cycle .active').prev('li').fadeOut(400, function(){
                        $('ul.cycle .active').fadeIn(400);
                      });
                  }
                };
                if (d.properties.preview && d.properties.preview.length > 1) {
                  cycleInterval = setInterval(cyclePreview, 5000);
                }
              })
              .on('mouseleave', function() {
                // stop cycle interval
                clearInterval(cycleInterval); 

                // un-set hover class on geom
                // need to delay very slightly, so check happens after tooltip hides
                setTimeout(_.bind(function() {
                  if (self.tip.style('opacity') < 1) {
                    d3.select(this).classed('hover', false);
                  }
                }, this), 10);

                // don't actually hide here
                // causes tooltips to be unreachable
                // self.tip.hide();
              });

            // instead, just let tooltips overwrite on show, 
            // and hide when the mouse leaves the map rect
            d3.selectAll('rect').on('mouseleave', function(d) {
              self.tip.hide(); 
            });
        },

    });

})();
