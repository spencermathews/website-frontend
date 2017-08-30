# Stories of Solidarity

A social media tool that helps workers in low wage, precarious jobs to build new forms of solidarity and mutual aid.

## Frontend 

This is a static site to pull stories from the [database](https://github.com/storiesofsolidarity/story-database) and display them visually. Provides user login capability and new story additions, sending submissions over the API to be saved in the database.

### Technologies

* [Grunt](http://gruntjs.com)
* [Backbone.js](http://backbonejs.org)
* [Bootstrap](http://getbootstrap.com)
* [D3](http://d3js.org)
* [Fontcustom](http://fontcustom.com)

### Development

We use [Bower](http://bower.io/) as our front-end package manager.

```bash
$ npm install bower -g
$ bower install
```

We use [Grunt](http://gruntjs.com/) as our task runner. Get the CLI (command line interface) and install it globally, and any other devDependencies locally.

```bash
$ npm install grunt-cli -g
$ npm install
```

Now compile and serve the site locally. This will watch for changes as you make them and reload them in the browser window.
```bash
$ grunt serve --watch
```

You may also want to run the [story-database](https://github.com/storiesofsolidarity/story-database) and [us-data](https://github.com/storiesofsolidarity/us-data) servers locally for a complete development stack. If you don't, comment out the `Solidarity.apiRoot` and `dataRoot` settings in `index.html` to use the production endpoints.

To add new icons to the custom font, put the SVG file in `/app/images/icons` and re-run `fontcustom compile` from the repository root.

### Deployment

Using GitHub Pages, build and push the resulting `dist` directory to the gh-pages branch.

```bash
$ grunt build
$ grunt buildcontrol:live
```
