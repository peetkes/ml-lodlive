'use strict'

var utils = require('./utils.js');

/**
 * Built-in "always on" tools
 */
// TODO: where should these live?
var _builtinTools = {
  'docInfo': '<div class="actionBox docInfo" rel="docInfo"><span class="fa fa-list"></span></div>',
  'tools': '<div class="actionBox tools" rel="tools"><span class="fa fa-cog"></span></div>'
};

/**
 * Built-in tools
 */
// TODO: where should these live?
var _builtins = {
  'expand': {
    title: 'Expand all',
    icon: 'fa fa-arrows-alt',
    handler: function(obj, inst) {
      var idx = 0;
      var elements = obj.find('.relatedBox:visible');
      var totalElements = elements.length;
      var onTo = function() {
        var elem= elements.eq(idx++);
        if (elem.length) {
          elem.click();
        }
        if (idx < totalElements) {
          window.setTimeout(onTo, 120);
        }
      };
      window.setTimeout(onTo, 120);
    }
  },
  'info': {
    title: 'More info',
    icon: 'fa fa-info-circle',
    handler: function(obj, inst) {
      // TODO: ?
    }
  },
  'rootNode': {
    title: 'Make root node',
    icon: 'fa fa-dot-circle-o',
    handler: function(obj, instance) {
      instance.context.empty();
      instance.init(obj.attr('rel'));
    }
  },
  'remove': {
    title: 'Remove this node',
    icon: 'fa fa-trash',
    handler: function(obj, inst) {
      inst.removeDoc(obj);
    }
  },
  'openPage': {
    title: 'Open in another page',
    icon: 'fa fa-external-link',
    handler: function(obj, inst) {
      window.open(obj.attr('rel'));
    }
  }
};

function LodLiveRenderer(container, context, arrows, tools, nodeIcons, refs) {
  this.container = container;
  this.context = context;
  this.arrows = arrows;
  this.tools = tools;
  this.nodeIcons = nodeIcons;
  this.refs = refs;
}

/**
 * Render a loading glyph
 *
 * @param {Element} target - a jQuery element
 * @return {Function} a function to remove the loading glyph
 */
LodLiveRenderer.prototype.loading = function loading(target) {
  var top = target.height() / 2 - 8;

  // TODO: issue #18
  // '<i class="fa fa-spinner fa-spin" style="margin-top:' + top + 'px;margin-left: 5px"/></i>'
  var loader = $('<img class="loader" style="margin-top:' + top + 'px" src="img/ajax-loader.gif"/>');

  target.append(loader);

  return function() {
    loader.remove();
  };
};

/**
 * Centers the initial box (for firstUri)
 */
LodLiveRenderer.prototype.centerBox = function(aBox) {
  var renderer = this;
  var ch = renderer.context.height();
  var cw = renderer.context.width();

  var bw = aBox.width() || 65;
  var bh = aBox.height() || 65;

  var start;

  var top = (ch - 65) / 2 + (renderer.context.scrollTop() || 0);
  var left = (cw - 65) / 2 + (renderer.context.scrollLeft() || 0);
  var props = {
    position : 'absolute',
    left : left,
    top : top,
    opacity: 0
  };

  //console.log('centering top: %s, left: %s', top, left);

  //FIXME: we don't want to assume we scroll the entire window here, since we could be just a portion of the screen or have multiples
  renderer.context.parent().scrollTop(ch / 2 - renderer.context.parent().height() / 2 + 60);
  renderer.context.parent().scrollLeft(cw / 2 - renderer.context.parent().width() / 2 + 60);

  // console.log(inst.context.parent().scrollTop());

  //window.scrollBy(cw / 2 - jwin.width() / 2 + 25, ch / 2 - jwin.height() / 2 + 65);

  aBox.css(props);
  aBox.animate({ opacity: 1}, 1000);
};

/**
 * Generate "always on" tools
 */
// TODO: rename
LodLiveRenderer.prototype.generateNodeIcons = function(anchorBox) {
  var renderer = this;

  renderer.nodeIcons.forEach(function(opts) {
    var obj;

    if (opts.builtin) {
      // TODO: throw error if not exist
      obj = jQuery(_builtinTools[opts.builtin] || '<span class="no such builtin"></span>');
    } else {  // construct custom action box
      obj = $('<div class="actionBox custom"></div>').data('action-handler', opts.handler);
      $('<span></span>').addClass(opts.icon).attr('title',opts.title).appendTo(obj);
    }
    obj.appendTo(anchorBox);
  });
};

/**
 * Generate tools for a box
 */
LodLiveRenderer.prototype.generateTools = function(container, obj, inst) {
  var renderer = this;
  var tools = container.find('.lodlive-toolbox');

  if (!tools.length) {
    tools = $('<div class="lodlive-toolbox"></div>').hide();

    renderer.tools.forEach(function(toolConfig) {
      if (toolConfig.builtin) {
        toolConfig = _builtins[toolConfig.builtin];
      }

      // TODO: throw error
      if (!toolConfig) return;

      var icon = $('<span></span>').addClass(toolConfig.icon);

      $('<div></div>')
      .addClass('innerActionBox')
      .attr('title', utils.lang(toolConfig.title))
      .append(icon)
      .appendTo(tools)
      .on('click', function() {
        toolConfig.handler.call($(this), obj, inst);
      });
    });

    var toolWrapper = $('<div class="lodlive-toolbox-wrapper"></div>').append(tools);
    container.append(toolWrapper);
  }

  return tools;
};

/**
 * Draws a line
 */
LodLiveRenderer.prototype.drawaLine = function(from, to, propertyName) {
  var renderer = this;
  var start;
  var pos1 = from.position();
  var pos2 = to.position();
  var aCanvas = $('#line-' + from.attr('id'));
  // console.debug(new Date().getTime()+'moving - '+(new Date())+" -
  // #line-" +
  // from.attr("id") + "-" + to.attr("id"))
  if (aCanvas.length == 1) {
    if (propertyName) {
      aCanvas.attr('data-propertyName-' + to.attr('id'), propertyName);
    }
    renderer.processDraw(pos1.left + from.width() / 2, pos1.top + from.height() / 2, pos2.left + to.width() / 2, pos2.top + to.height() / 2, aCanvas, to.attr('id'));
  } else {
    aCanvas = $('<canvas data-propertyName-' + to.attr('id') + '="' + propertyName + '" height="' + renderer.context.height() + '" width="' + renderer.context.width() + '" id="line-' + from.attr('id') + '"></canvas>');
    renderer.context.append(aCanvas);
    aCanvas.css({
      'position' : 'absolute',
      'zIndex' : '0',
      'top' : 0,
      'left' : 0
    });
    renderer.processDraw(pos1.left + from.width() / 2, pos1.top + from.height() / 2, pos2.left + to.width() / 2, pos2.top + to.height() / 2, aCanvas, to.attr('id'));
  }
};

LodLiveRenderer.prototype.processDraw = function(x1, y1, x2, y2, canvas, toId) {
  var renderer = this;
  var start;

  // recupero il nome della proprieta'
  var label = '';

  var lineStyle = 'standardLine';
  //FIXME:  don't use IDs
  if (renderer.context.find('#' + toId).length > 0) {

    label = canvas.attr('data-propertyName-' + toId);

    // TODO: literal regexp?
    var labeArray = label.split('\|');

    label = '\n';

    for (var o = 0; o < labeArray.length; o++) {

      if (renderer.arrows[$.trim(labeArray[o])]) {
        lineStyle = renderer.arrows[$.trim(labeArray[o])] + 'Line';
      }

      var shortKey = utils.shortenKey(labeArray[o]);
      var lastHash = shortKey.lastIndexOf('#');
      var lastSlash = shortKey.lastIndexOf('/');

      if (label.indexOf('\n' + shortKey + '\n') == -1) {
        label += shortKey + '\n';
      }
    }
  }
  //if (lineStyle === 'standardLine') { it appears they all end up back here anyway
  if (lineStyle !== 'isSameAsLine') {

    renderer.standardLine(label, x1, y1, x2, y2, canvas, toId);

  } else {
    //TODO: doesn't make sense to have these live in different files.  Should make line drawers an extensible interface
    renderer.customLines(renderer.context, lineStyle, label, x1, y1, x2, y2, canvas, toId);
  }
};

/**
 *  Draws a line
 */
LodLiveRenderer.prototype.standardLine = function(label, x1, y1, x2, y2, canvas, toId) {

  // eseguo i calcoli e scrivo la riga di connessione tra i cerchi
  var lineangle = (Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI) + 180;
  var x2bis = x1 - Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)) + 60;
  //canvas.detectPixelRatio();
  canvas.rotateCanvas({
    rotate : lineangle,
    x : x1,
    y : y1
  }).drawLine({
    strokeStyle : '#fff',
    strokeWidth : 1,
    strokeCap : 'bevel',
    x1 : x1 - 60,
    y1 : y1,
    x2 : x2bis,
    y2 : y1
  });

  if (lineangle > 90 && lineangle < 270) {
    canvas.rotateCanvas({
      rotate : 180,
      x : (x2bis + x1) / 2,
      y : (y1 + y1) / 2
    });
  }
  label = $.trim(label).replace(/\n/g, ', ');
  canvas.drawText({// inserisco l'etichetta
    fillStyle : '#606060',
    strokeStyle : '#606060',
    x : (x2bis + x1 + ((x1 + 60) > x2 ? -60 : +60)) / 2,
    y : (y1 + y1 - ((x1 + 60) > x2 ? 18 : -18)) / 2,
    text : label ,
    align : 'center',
    strokeWidth : 0.01,
    fontSize : 11,
    fontFamily : '"Open Sans",Verdana'
  }).restoreCanvas().restoreCanvas();
  //TODO:  why is this called twice?

  // ed inserisco la freccia per determinarne il verso della
  // relazione
  lineangle = Math.atan2(y2 - y1, x2 - x1);
  var angle = 0.79;
  var h = Math.abs(8 / Math.cos(angle));
  var fromx = x2 - 60 * Math.cos(lineangle);
  var fromy = y2 - 60 * Math.sin(lineangle);
  var angle1 = lineangle + Math.PI + angle;
  var topx = (x2 + Math.cos(angle1) * h) - 60 * Math.cos(lineangle);
  var topy = (y2 + Math.sin(angle1) * h) - 60 * Math.sin(lineangle);
  var angle2 = lineangle + Math.PI - angle;
  var botx = (x2 + Math.cos(angle2) * h) - 60 * Math.cos(lineangle);
  var boty = (y2 + Math.sin(angle2) * h) - 60 * Math.sin(lineangle);

  canvas.drawLine({
    strokeStyle : '#fff',
    strokeWidth : 1,
    x1 : fromx,
    y1 : fromy,
    x2 : botx,
    y2 : boty
  });
  canvas.drawLine({
    strokeStyle : '#fff',
    strokeWidth : 1,
    x1 : fromx,
    y1 : fromy,
    x2 : topx,
    y2 : topy
  });
};

/**
 * Draws a line somewhat differently, apparently
 */
LodLiveRenderer.prototype.isSameAsLine = function(label, x1, y1, x2, y2, canvas, toId) {

  // eseguo i calcoli e scrivo la riga di connessione tra i cerchi
  // calculate the angle and draw the line between nodes
  var lineangle = (Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI) + 180;
  var x2bis = x1 - Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)) + 60;
  //canvas.detectPixelRatio();
  canvas.rotateCanvas({
    rotate : lineangle,
    x : x1,
    y : y1
  }).drawLine({
    strokeStyle : '#000',
    strokeWidth : 1,
    strokeCap : 'bevel',
    x1 : x1 - 60,
    y1 : y1,
    x2 : x2bis,
    y2 : y1
  });

  if (lineangle > 90 && lineangle < 270) {
    canvas.rotateCanvas({
      rotate : 180,
      x : (x2bis + x1) / 2,
      y : (y1 + y1) / 2
    });
  }
  label = $.trim(label).replace(/\n/g, ', ');

  // inserisco l'etichetta
  // add the label
  canvas.drawText({
    fillStyle : '#000',
    strokeStyle : '#000',
    x : (x2bis + x1 + ((x1 + 60) > x2 ? -60 : +60)) / 2,
    y : (y1 + y1 - ((x1 + 60) > x2 ? 18 : -18)) / 2,
    text : ((x1 + 60) > x2 ? ' « ' : '') + label + ((x1 + 60) > x2 ? '' : ' » '),
    align : 'center',
    strokeWidth : 0.01,
    fontSize : 11,
    fontFamily : '"Open Sans",Verdana'
  }).restoreCanvas().restoreCanvas();

  // ed inserisco la freccia per determinarne il verso della relazione
  // insert the arrow to determine the direction of the relationship
  lineangle = Math.atan2(y2 - y1, x2 - x1);
  var angle = 0.79;
  var h = Math.abs(8 / Math.cos(angle));
  var fromx = x2 - 60 * Math.cos(lineangle);
  var fromy = y2 - 60 * Math.sin(lineangle);
  var angle1 = lineangle + Math.PI + angle;
  var topx = (x2 + Math.cos(angle1) * h) - 60 * Math.cos(lineangle);
  var topy = (y2 + Math.sin(angle1) * h) - 60 * Math.sin(lineangle);
  var angle2 = lineangle + Math.PI - angle;
  var botx = (x2 + Math.cos(angle2) * h) - 60 * Math.cos(lineangle);
  var boty = (y2 + Math.sin(angle2) * h) - 60 * Math.sin(lineangle);

  canvas.drawLine({
    strokeStyle : '#000',
    strokeWidth : 1,
    x1 : fromx,
    y1 : fromy,
    x2 : botx,
    y2 : boty
  });
  canvas.drawLine({
    strokeStyle : '#000',
    strokeWidth : 1,
    x1 : fromx,
    y1 : fromy,
    x2 : topx,
    y2 : topy
  });
};

/**
 *  Invokes a line drawing method
 */
LodLiveRenderer.prototype.customLines = function(context, method) {
  console.log('customLines', method);
  if (this[method]) {
    return this[method].apply(this, Array.prototype.slice.call(arguments, 2));
  }
};

LodLiveRenderer.prototype.msg = function(msg, action, type, endpoint, inverse) {
  var renderer = this;
  var msgPanel = renderer.container.find('.lodlive-message-container')
  var msgs;

  if (!msg) msg = '';

  switch(action) {
    case 'init':
      if (!msgPanel.length) {
        msgPanel = $('<div class="lodlive-message-container"></div>');
        renderer.container.append(msgPanel);
      }
      break;

    default:
      msgPanel.hide();
  }

  msgPanel.empty();
  msg = msg.replace(/http:\/\/.+~~/g, '');
  msg = msg.replace(/nodeID:\/\/.+~~/g, '');
  msg = msg.replace(/_:\/\/.+~~/g, '');
  msg = utils.breakLines(msg);
  msg = msg.replace(/\|/g, '<br />');

  msgs = msg.split(' \n ');

  if (type === 'fullInfo') {
    msgPanel.append('<div class="endpoint">' + endpoint + '</div>');
    // why 2?
    if (msgs.length === 2) {
      msgPanel.append('<div class="from upperline">' + (msgs[0].length > 200 ? msgs[0].substring(0, 200) + '...' : msgs[0]) + '</div>');
      msgPanel.append('<div class="from upperline">'+ msgs[1] + '</div>');
    } else {
      msgPanel.append('<div class="from upperline">' + msgs[0] + '</div>');
    }
  } else {
    if (msgs.length === 2) {
      msgPanel.append('<div class="from">' + msgs[0] + '</div>');
      if (inverse) {
        msgPanel.append('<div class="separ inverse sprite"></div>');
      } else {
        msgPanel.append('<div class="separ sprite"></div>');
      }

      msgPanel.append('<div class="from">' + msgs[1] + '</div>');
    } else {
      msgPanel.append('<div class="from">' + msgs[0] + '</div>');
    }
  }

  msgPanel.show();
};

LodLiveRenderer.prototype.errorBox = function(destBox) {
  var renderer = this;

  destBox.children('.box').addClass('errorBox');
  destBox.children('.box').html('');
  var jResult = $('<div class="boxTitle"><span>' + utils.lang('endpointNotAvailable') + '</span></div>');
  destBox.children('.box').append(jResult);
  destBox.children('.box').hover(function() {
    renderer.msg(utils.lang('endpointNotAvailableOrSLow'), 'show', 'fullInfo', destBox.attr('data-endpoint'));
  }, function() {
    renderer.msg(null, 'hide');
  });
};

var rendererFactory = {
  create: function(container, context, arrows, tools, nodeIcons, refs) {
    return new LodLiveRenderer(container, context, arrows, tools, nodeIcons, refs);
  }
};


module.exports = rendererFactory;

// temporary, for testing
if (!window.LodLiveRenderer) {
  window.LodLiveRenderer = LodLiveRenderer;
}
if (!window.rendererFactory) {
  window.rendererFactory = rendererFactory;
}
