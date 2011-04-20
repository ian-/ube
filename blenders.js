// ube standard layer blend modes
// == javascript image manipulation
// Ian Farrell

ube.addBlenders({

  normal: function(data1, data2) {
    for(var i=0, len=data1.length; i<len; i++)
      data1[i] += data2[i];
    return data1;
  },

  subtract: function(data1, data2) {
    for(var i=0, len=data1.length; i<len; i++)
      if(i % 4 != 3)
        data1[i] -= data2[i];
    return data1;
  },

  multiply: function(data1, data2) {
    for(var i=0, len=data1.length; i<len; i++)
      if(i % 4 != 3)
        data1[i] = data1[i] * data2[i] / 255;
    return data1;
  },

  screen: function(data1, data2) {
    for(var i=0, len=data1.length; i<len; i++)
      data1[i] = 255 - ((255 - data1[i]) * (255 - data2[i]) / 255);
    return data1;
  }

  

});
