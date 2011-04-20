// ube core library v1.0
// == javascript image processing
// Ian Farrell

(function(window, document, undefined) {

  //store previous 'ube' var for noConflict
  var _ube = window.ube;

  //shorthand for ube.load(), and automatically replaces elements
  var ube = function(pointer, callback) {
    return (!pointer) ? ube : ube.load(pointer, function() {
      callFunction(callback, this);
      if(pointer instanceof HTMLElement || pointer.parentElement)
        pointer.parentElement.replaceChild(this.canvas, pointer);
    });
  };

  //Image object, holds canvas element
  var Image = function() {
    extend(this, {
      backref: ube,
      renderQueue: []
    });
  };

  //add properties onto objects
  //allows for some nice expressiveness and minification
  var extend = function(object) {
    for(var i=1; i<arguments.length; i++)
      for(property in arguments[i])
        object[property] = arguments[i][property];
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

  //call a function, conditionally overriding 'this'
  var callFunction = function(func, param) {
    return (func.length) ? func(param) : func.call(param);
  };

  //define exposed ube methods
  extend(ube, {

    //load url, canvas, ube Image, or array into ube Image object(s)
    load: function(pointer, callback) {
      var image = new Image();
      if(typeof pointer === 'string')     //url
        toImage(pointer, function(img) {
          image.canvas = toCanvas(img);
          callFunction(callback, image);
        });
      else if(pointer.src)                //image
        image.canvas = toCanvas(pointer);
      else if(pointer.data) {             //imageData
        image.canvas = createCanvas(pointer.width, pointer.height);
        image.putImageData(pointer);
      }
      else if(pointer.getContext)         //canvas
        image.canvas = pointer;
      else if(pointer.length)             //array
        for(var i=0, image=[]; i<pointer.length; i++)
          image[i] = this.load(pointer[i], callback);
      if(!pointer.length && typeof pointer !== 'string' && callback)
        callFunction(callback, image);
      return image;
    },

    filters: {},
    blenders: {},

    //add filter functions to ube.filters and Image & Layer prototypes
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

    //add blender functions to ube.blenders
    addBlenders: function(blenders) {
      extend(this.blenders, blenders);
    },

    //give ube back to window, return ube
    noConflict: function() {
      window.ube = _ube;
      return ube;
    },

    //ube project info
    version: '1.1'
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
      var imageData = this.ctx().getImageData( x || 0, y || 0, width || this.width(), height || this.height());
      if(arguments.length === 0)
        this.cacheImageData(imageData);
      return imageData;
    },

    putImageData: function(imageData, x, y) {
      var imageData = this.ctx().putImageData(imageData, x || 0, y || 0);
      if(arguments.length === 0)
        this.cacheImageData(imageData);
      return imageData;
    },

    copyImageData: function(imageData) {
      imageData = imageData || this.getImageData();
       return ube.load(createCanvas(imageData.width, imageData.height), function(image) {
        image.putImageData(imageData);
      }).getImageData();
    },

    cacheImageData: function(imageData) {
      this.cachedImageData = imageData;
    },

    // apply filters in filterqueue on imageData
    filterImageData: function(imageData, filters) {
      var data = imageData.data;
      for(var i=0; i<filters.length; i++) {
        var filterName = filters[i][0],
            filterArgs = filters[i][1];
        if(ube.filters[filterName]) {
          //filter(data, [params], imageData, Image)
          value = ube.filters[filterName](data, filterArgs, imageData, this);
          value && (imageData = value, data = imageData.data);
        }
      }
      imageData.data = data;
      return imageData;
    },

    // blend layers together
    blendImageData: function(imageData1, imageData2, options) {
      var blender = options.blendmode;
      var data1 = imageData1.data;
      var data2 = imageData2.data;
      if(ube.blenders[blender])
        data = ube.blenders[blender](data1, data2);
      imageData1.data = data1;
      return imageData1;
    },

    //apply filters in renderQueue [[ image.grayscale().rgba(100).apply(); ]]
    apply: function() {
      var imageData = this.getImageData();
      imageData = this.filterImageData(imageData, this.renderQueue);
      this.putImageData(imageData);
      this.renderQueue = [];
      return this;
    },

    //apply native drawing operations
    draw: function(pointer) {
      //draw(arg) -> arg = this.ctx(), draw() -> this = this.ctx()
      callFunction(pointer, this.ctx());
      this.cacheImageData(); // clear cache
      return this;
    },

    //apply filters to specified rectangular area
    applyRect: function(x, y, width, height) {
      var imageData = this.getImageData(x, y, width, height);
      imageData = this.filterImageData(imageData, this.renderQueue);
      this.putImageData(imageData, x, y);
      this.cacheImageData(); // clear cache
      this.renderQueue = [];
      return this;
    },

    //optimized version of previous applyCustom
    applyCustom: function(pointer) {
      //create canvas, draw 'pointer', get imageData
      var canvas = createCanvas(this.width(), this.height()),
          drawImage = ube.load(canvas, function(image) {
            image.draw(pointer);
          }),
          drawImageData = drawImage.getImageData(),
          drawData = drawImageData.data;
      //loop through imageData to get rectangular dimensions
      for(var i=0, dimensions = [], len=drawData.length; i<len; i+=4) {
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
      dimensions[2] -= dimensions[0] - 1;
      dimensions[3] -= dimensions[1] - 1;
      //get imagedatas
      var drawImageData = drawImage.getImageData.apply(drawImage, dimensions),
          origImageData = this.getImageData.apply(this, dimensions),
          copyImageData = this.copyImageData(origImageData),
          procImageData = this.filterImageData(copyImageData, this.renderQueue),
          drawData = drawImageData.data,
          origData = origImageData.data,
          procData = procImageData.data;
      //apply effects to region
      for(var i=0, len=origData.length; i<len; i+=4) {
        if(drawData[i+3] !== 0) {
          var amount = drawData[i+3] / 255;
          for(var j=0; j<4; j++)
              origData[i+j] = (procData[i+j] * amount) + (origData[i+j] * (1 - amount))
        }
      }
      //reattach data, paint back pixels
      origImageData.data = origData;
      this.putImageData(origImageData, dimensions[0], dimensions[1]);
      this.cacheImageData(false); // clear cache
      this.renderQueue = [];
      return this;
    },

    layer: function(options, callback) {
      options = extend({
        blendmode: 'normal',
        opacity: 1
      }, options);
      this.apply();
      var imageData = (options.copyparent) ? this.copyImageData() : this.createImageData();
      var layer = ube.load(imageData);
      callFunction(callback, layer);
      if(options.opacity < 1)
        layer.opacity(options.opacity);
      layer.apply();
      var imageData = this.blendImageData(this.getImageData(), layer.getImageData(), options);
      this.putImageData(imageData);
      return this;
    },

  });

  //set 'ube' loose!
  return (window.ube = ube);

})(this, document);
