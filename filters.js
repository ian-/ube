// ube standard filters
// == javascript image manipulation
// Ian Farrell

ube.addFilters({

  invert: function(data) {
    for(var i=0, len = data.length; i < len; i+=4) {
      data[i] = 255 - data[i];
      data[i+1] = 255 - data[i+1];
      data[i+2] = 255 - data[i+2];
    }
  },

  rgba: function(data, rgba) {
    for(var i=0; i<4; i++)
      rgba[i] = (rgba[i]) ? rgba[i] : 0;
    for(var i=0; i<data.length; i++)
      data[i] += rgba[i % 4];
  },

  lighten: function(data, n) {
    n = n[0];
    this.rgba(data, [n, n, n]);
  },

  darken: function(data, n) {
    this.lighten(data, [-n[0]]);
  },

  grayscale: function(data) {
    for(var i=0, len=data.length; i<len; i+=4) {
      var sum = Math.round((data[i] + data[i+1] + data[i+2]) / 3);
        data[i] = data[i+1] = data[i+2] = sum;
    }
  },

  sepiatone : function(data, n) {
    var v = (n[0]) ? (n[0] / 100) : 1;
    this.grayscale(data); // this.grayscale(data, [n]);
    this.rgba(data, [Math.round(94 * v), Math.round(38 * v), Math.round(18 * v)]); // clean up?
  },

  monochrome: function(data, param) {
    var bits = (Math.pow(2, param[0]) - 1), x = Math.round(255 / bits);
    for(var i = 0, len = data.length; i < len; i+=4) {
      var sum = (data[i] + data[i+1] + data[i+2]) / 3;
      data[i] = data[i+1] = data[i+2] = Math.round(sum / x) * x;
    }
  },

  replace: function(data, arg) {
    var list = arg[0], replaceList = [], index = 0;
    for(item in list) {
      var orig = item.replace(/ /g, '').split(',');
      var repl = list[item].replace(/ /g, '').split(',');
      replaceList[index] = [orig, repl];
      index++;
    }
  },

  threshold: function(data, rgb) {
    var sum = (rgb[0] + rgb[1] + rgb[2]);
    for(var i=0; i<data.length; i+=4)
      data[i] = data[i+1] = data[i+2] = ((data[i] + data[i+1] + data[i+2]) < sum) ? 0 : 255;
  },

  find : function(data, arg) {
    var rgb = arg.slice(0, 3), tolerance = Math.round(arg[3] / 100 * 255) || 0;
    console.log(rgb, tolerance);
    for(var i=0, len=data.length; i<len; i+=4) {
      var match = true;
      for(var j=0; j<3; j++)
        match = match && (data[i+j] <= rgb[j] + tolerance) && (data[i+j] >= rgb[j] + tolerance);
      data[i] = data[i+1] = data[i+2] = (match) ? 0 : 255;
    }
  },

  rgbbits : function(data, n) {
    var bits = Math.round(255 / n[0]);
    for(var i=0, len=data.length; i<len; i++)
      if(i % 4 != 3)
        data[i] = Math.round(data[i] / bits) * bits;
  },

  channel: function(data, arg) {
    var channel = arg[0].toLowerCase(), map = {r:1, g:2, b:3, a:4};
    if(map[channel[0]])
      channel = map[channel[0]]-1;
    for(var i=0; i<data.length; i++) {
      var index = i % 4;
      if(index != channel && (index != 3))
        data[i] = 0;
    }
  },

  shift: function(data, arg) { // clean this shit up
    var amount = ((arg[0] < 0) ? (3 - arg[0]) : arg[0]) % 3, amount2 = (amount+1)%3, amount3 = (amount+2)%3;
    for(var i=0, len=data.length; i<len; i+=4) {
      var channels = [data[i], data[i+1], data[i+2]];
      data[i] = channels[amount];
      data[i+1] = channels[amount2];
      data[i+2] = channels[amount3];
    }
  },

  crop: function(data, coords, imageData, image) {
    imageData.data = data;
    image.putImageData(imageData);
    var imageData = image.getImageData.apply(image, coords);
    image.canvas.width = coords[2];
    image.canvas.height = coords[3];
    return imageData;
  },

});
