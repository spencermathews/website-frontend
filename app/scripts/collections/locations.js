/*global Solidarity, Backbone*/

Solidarity.Collections = Solidarity.Collections || {};

(function () {
    'use strict';

    Solidarity.Collections.States = Solidarity.Collections.BaseCollection.extend({
        model: Solidarity.Models.State,
        url: Solidarity.apiRoot + 'state/',
    });

    Solidarity.Collections.Counties = Solidarity.Collections.BaseCollection.extend({
        model: Solidarity.Models.County,
        url: Solidarity.apiRoot + 'county/',
        state: {
            pageSize: 100, // increase default pageSize
        },
    });

    Solidarity.Collections.Zipcodes = Solidarity.Collections.BaseCollection.extend({
        model: Solidarity.Models.Zipcode,
        url: Solidarity.apiRoot + 'zipcode/',
    });


})();
