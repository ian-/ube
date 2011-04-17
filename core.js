// ube core library v1.0
// == javascript image processing
// Ian Farrell

(function(window, document, undefined) {

  //store previous 'ube' var for noConflict
  var _ube = window.ube;

  //shorthand for ube.load(), and automatically replaces elements
  var ube = function(pointer, callback) {
    return ube.load(pointer, function() {
      callback && callback.call(this);
      if(pointer instanceof HTMLElement || pointer.parentElement)
        pointer.parentElement.replaceChild(this.canvas, pointer);
    });
  };

  //Image object, holds canvas element
  var Image = function() {
    this.backref = ube;
  };

  //add properties onto objects
  //allows for some nice minification
  var extend = function(object, properties) {
    for(property in properties)
      object[property] = properties[property];
    return object;
  };

  //convert url to Image object
  var toImage = function(url, callback) {
    return extend(new window.Image(), {
      onload: function() {
        callback && callback(this);
      },
      src: url
    });
  };

  //convert Image object to canvas
  var toCanvas = function(image) {
    var canvas = createCanvas(image.width, image.height);
    canvas.getContext('2d').drawImage(image, 0, 0);
    return canvas;
  };

  //create canvas of specified dimensions
  var createCanvas = function(width, height) {
    return extend(document.createElement('canvas'), {
      width: width,
      height: height
    });
  };

  //define exposed ube methods
  extend(ube, {

    //load url, canvas, ube Image, or array into ube Image object(s)
    load: function(pointer, callback) {
      var image = new Image();
      if(typeof pointer === 'string') {
        toImage(pointer, function(img) {
          image.canvas = toCanvas(img);
          callback && callback.call(image, image);
        });
      }
      else if(pointer.src)
        image.canvas = toCanvas(pointer);
      else if(pointer.getContext)
        image.canvas = pointer;
      else if(pointer.length)
        for(var i=0, image=[]; i<pointer.length; i++)
          image[i] = this.load(pointer[i], callback);
      if(!pointer.length && typeof pointer != 'string' && callback)
        callback.call(image, image);
      return image;
    },

    filters: {},

    //add filter function to ube.filters and Image prototype
    addFilters: function(filters) {
      for(filter in filters) {
        this.filters[filter] = filters[filter];
        Image.prototype[filter] = (function(filter) {
          return function() {
            var args = Array.prototype.slice.call(arguments, 0);
            this.renderQueue.push([filter, args]);
            return this;
          };
        })(filter);
      }
    },

    //give ube back to window, return ube
    noConflict: function() {
      window.ube = _ube;
      return ube;
    },

    //ube project info
    version: '1.0'
  });

  //define Image.prototype methods
  extend(Image.prototype, {

    width:  function() { return this.canvas.width; },
    height: function() { return this.canvas.height; },
    dataURL: function() { return this.canvas.toDataURL(); },
    ctx: function() { return this.canvas.getContext('2d'); },

    createImageData: function(width, height) {
      return this.ctx().createImageData(width || this.width(), height || this.height());
    },

    getImageData: function(x, y, width, height) {
      if(arguments.length === 0 && this.cachedImageData)
        return this.cachedImageData;
      else
        return this.ctx().getImageData( x || 0, y || 0, width || this.width(), height || this.height());
    },

    putImageData: function(imageData, x, y) {
      return this.ctx().putImageData(imageData, x || 0, y || 0);
    },

    copyImageData: function(imageData) {
      var image = ube.load(createCanvas(imageData.width, imageData.height), function(image) {
        image.putImageData(imageData);
      });
      return image.getImageData();
      //var canvas = createCanvas(imageData.width, imageData.height), ctx = canvas.getContext('2d');
      //ctx.putImageData(imageData, 0, 0);
      //return ctx.getImageData(0, 0, canvas.width, canvas.height);
    },

    cacheImageData: function(imageData) {
      this.cachedImageData = imageData;
    },

    //[ ['name', [arguments]], ['name, [arguments]] ]
    processImageData: function(imageData, filters) {
      var data = imageData.data;
      for(var i=0; i<filters.length; i++) {
        var filterName = filters[i][0],
            filterPrms = filters[i][1];
        if(ube.filters[filterName]) {
          //filter(data, [params], imageData, Image)
          value = ube.filters[filterName](data, filterPrms, imageData, this);
          value && (imageData = value, data = imageData.data);
        }
      }
      imageData.data = data;
      return imageData;
    },

    //Image.filter() -> renderQueue
    renderQueue: [],

    //apply filters in renderQueue [[ image.grayscale().rgba(100).apply(); ]]
    apply: function() {
      var imageData = this.getImageData();
      imageData = this.processImageData(imageData, this.renderQueue);
      this.putImageData(imageData);
      this.cacheImageData(imageData);
      this.renderQueue = [];
      return this;
    },

    //apply native drawing operations
    draw: function(pointer) {
      if(typeof pointer === 'function')
        pointer.call(this.ctx());
      else {
        var ctx = this.ctx();
        for(operation in pointer)
          if(typeof ctx[operation] === 'function')
            ctx[operation].apply(ctx, operations[operation]);
          else
            ctx[operation] = operations[operation];
      }
      return this;
    },

    //apply filters to specified rectangular area
    applyRect: function(x, y, width, height) {
      var imageData = this.getImageData(x, y, width, height);
      imageData = this.processImageData(imageData, this.renderQueue);
      this.putImageData(imageData, x, y);
      this.cacheImageData(false); // clear cache
      this.renderQueue = [];
      return this;
    },

    //optimized version of previous applyCustom
    applyCustom: function(pointer, antialias) {
      //create canvas, draw 'pointer', get imageData
      var canvas = createCanvas(this.width(), this.height()),
          drawImage = ube.load(canvas, function(image) {
            image.draw(pointer);
          }),
          drawImageData = drawImage.getImageData(),
          drawData = drawImageData.data;
      //loop through imageData to get rectangular dimensions
      var dimensions = []; // [x1, y1, x2, y2]
      for(var i=0, len=drawData.length; i<len; i+=4) {
        if(drawData[i+3] > 0) {
          var x = (i / 4) % drawImageData.width,
              y = Math.floor(i / (drawImageData.width * 4));
          if( (x < dimensions[0]) || (dimensions[0] === undefined) )
            dimensions[0] = x;
          if(dimensions[1] === undefined)
            dimensions[1] = y;
          if( (x > dimensions[2]) || (dimensions[2] === undefined) )
            dimensions[2] = x;
          if( (y > dimensions[3]) || (dimensions[3] === undefined) )
            dimensions[3] = y;
        }
      }
      //do a little cleanup
      dimensions[2] -= dimensions[0] - 1;
      dimensions[3] -= dimensions[1] - 1;
      //get imagedatas
      var drawImageData = drawImage.getImageData.apply(drawImage, dimensions),
          origImageData = this.getImageData.apply(this, dimensions),
          copyImageData = this.copyImageData(origImageData),
          procImageData = this.processImageData(copyImageData, this.renderQueue),
          drawData = drawImageData.data,
          origData = origImageData.data,
          procData = procImageData.data;
      //apply effects to region
      for(var i=0, len=origData.length; i<len; i+=4) {
        if(drawData[i+3] != 0) {
          var amount = (antialias) ? (drawData[i+3] / 255) : .5;
          for(var j=0; j<4; j++)
              origData[i+j] = (antialias) ? ((procData[i+j] * amount) + (origData[i+j] * (1 - amount))) : procData[i+j];
        }
      }
      //reattach data, paint back pixels
      origImageData.data = origData;
      this.putImageData(origImageData, dimensions[0], dimensions[1]);
      this.cacheImageData(false); // clear cache
      this.renderQueue = [];
      return this;
    },
      

  });

  //set 'ube' loose!
  return (window.ube = ube);

})(this, document);
