/*
CLAST is an executable graphical editor for causal loop diagrams.
This tool is developed by Pieter Bots at Delft University of Technology.

This JavaScript file (clast-paper.js) provides the SVG diagram-drawing
functionality for the CLAST model editor.
*/

/*
Copyright (c) 2024 Delft University of Technology

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// CLASS Shape
// A shape is a group of one or more SVG elements with a time-based ID
// number, and typically represents an entity in a CLAST model diagram.
class Shape {
  constructor() {
    this.id = randomID();
    if(UI.paper) {
      // Create a new SVG element, but do not add it to the main SVG object.
      this.element = UI.paper.newSVGElement('svg');
      this.element.id = this.id;
    }
  }
  
  clear() {
    // Remove all composing elements from this shape's SVG object.
    UI.paper.clearSVGElement(this.element);
  }

  appendToDOM() {
    // Append this shape's SVG element to the main SVG object.
    const el = document.getElementById(this.id);
    // Replace existing element, if it exists.
    if(el) UI.paper.svg.removeChild(el);
    // Add the new version.
    UI.paper.svg.appendChild(this.element);
  }
  
  removeFromDOM() {
    // Remove this shape's SVG element from the main SVG object.
    const el = document.getElementById(this.id);
    if(el) UI.paper.svg.removeChild(el);
    this.element = null;
  }

  addPath(path, attrs) {
    // Append a path to the SVG element for this shape.
    const el = UI.paper.newSVGElement('path');
    el.setAttribute('d', path.join(''));
    UI.paper.addSVGAttributes(el, attrs);
    this.element.appendChild(el);
    return el;
  }
  
  addNumber(x, y, number, attrs) {
    // Append SVG for a numeric string centered at (x, y).
    // NOTES:
    // (1) A numeric string is scaled to a fixed width per character
    //     (0.65*font size).
    // (2) If anchor is not "middle", x is taken as the border to align
    //     against.
    // (3) Calling routines may pass a number instead of a string, so
    //     "lines" is forced to a string.
    number = '' + number;
    // Assume default font size and weight unless specified.
    const
        size = (attrs.hasOwnProperty('font-size') ?
            attrs['font-size'] : 8),
        weight = (attrs.hasOwnProperty('font-weight') ?
            attrs['font-weight'] : 400),
        fh = UI.paper.font_heights[size],
        el = UI.paper.newSVGElement('text');
    el.setAttribute('x', x);
    el.setAttribute('y', y + 0.35*fh);
    el.setAttribute('textLength',
        UI.paper.numberSize(number, size, weight).width);
    el.textContent = number;
    UI.paper.addSVGAttributes(el, attrs);
    this.element.appendChild(el);
    return el;
  }

  addText(x, y, lines, attrs) {
    // Append SVG for a (multi)string centered at (x, y).
    // NOTES:
    // (1) If anchor is not "middle", x is taken as the border to align
    //     against.
    // (2) Calling routines may pass a number, a string or an array.
    if(!Array.isArray(lines)) {
      // Force `lines` into a string, and then split it at newlines.
      lines = ('' + lines).split('\n');
    }
    // Assume default font size unless specified.
    const size = (attrs.hasOwnProperty('font-size') ? attrs['font-size'] : 8);
    // Vertically align text such that y is at its center.
    // NOTE: Subtract 30% of 1 line height more, or the text is consistently
    // too low.
    const
        fh = UI.paper.font_heights[size],
        cy = y - (lines.length + 0.3) * fh/2,
        el = UI.paper.newSVGElement('text');
    el.setAttribute('x', x);
    el.setAttribute('y', cy);
    UI.paper.addSVGAttributes(el, attrs);
    for(let i = 0; i < lines.length; i++) {
      const ts = UI.paper.newSVGElement('tspan');
      ts.setAttribute('x', x);
      ts.setAttribute('dy', fh);
      ts.setAttribute('pointer-events', 'inherit');
      // NOTE: Non-breaking space must now (inside a TSPAN) be converted
      // to normal spaces, or they will be rendered as '&nbsp;' and this
      // will cause the SVG to break when it is inserted as picture into
      // an MS Word document.
      ts.textContent = lines[i].replaceAll('\u00A0', ' ');
      el.appendChild(ts);
    }
    this.element.appendChild(el);
    return el;
  }

  addRect(x, y, w, h, attrs) {
    // Add a rectangle with center point (x, y), width w, and height h.
    // NOTE: For a "roundbox", pass the corner radii rx and ry.
    const el = UI.paper.newSVGElement('rect');
    el.setAttribute('x', x - w/2);
    el.setAttribute('y', y - h/2);
    el.setAttribute('width', Math.max(0, w));
    el.setAttribute('height', Math.max(0, h));
    UI.paper.addSVGAttributes(el, attrs);
    this.element.appendChild(el);
    return el;
  }

  addCircle(x, y, r, attrs) {
    // Add a circle with center point (x, y) and radius r.
    const el = UI.paper.newSVGElement('circle');
    el.setAttribute('cx', x);
    el.setAttribute('cy', y);
    el.setAttribute('r', r);
    UI.paper.addSVGAttributes(el, attrs);
    this.element.appendChild(el);
    return el;
  }

  addEllipse(x, y, rx, ry, attrs) {
    // Add an ellipse with center point (x, y), and specified radii and
    // attributes.
    const el = UI.paper.newSVGElement('ellipse');
    el.setAttribute('cx', x);
    el.setAttribute('cy', y);
    el.setAttribute('rx', rx);
    el.setAttribute('ry', ry);
    UI.paper.addSVGAttributes(el, attrs);
    this.element.appendChild(el);
    return el;
  }

  addSVG(x, y, attrs) {
    // Add an SVG subelement with top-left (x, y) and specified attributes.
    const el = UI.paper.newSVGElement('svg');
    el.setAttribute('x', x);
    el.setAttribute('y', y);
    UI.paper.addSVGAttributes(el, attrs);
    this.element.appendChild(el);
    return el;
  }
  
  moveTo(x, y) {
    const el = document.getElementById(this.id);
    if(el) {
      el.setAttribute('x', x);
      el.setAttribute('y', y);
    }
  }
  
} // END of class Shape


// CLASS Paper (the SVG diagram)
class Paper {
  constructor() {
    this.svg = document.getElementById('svg-root');
    this.container = document.getElementById('cc');
    this.height = 100;
    this.width = 200;
    this.zoom_factor = 1;
    this.zoom_label = document.getElementById('zoom');
    // Deep links are drawn but not model entities that will be redrawn,
    // so maintain a lookup object to clear their shapes when the model
    // is redrawn.
    this.drawn_deep_links = {};
    // Initialize colors used when drawing the model diagram
    this.palette = {
      // Selected model elements are bright red
      select: '#ff0000',    
      // Nodes have dark gray rim...
      rim: '#606070',
      // ...except when connecting.
      connecting: '#00b0ff',
      // Transparent for connecting rims.
      transparent: 'rgba(255, 255, 255, 0.01)',
      // Semi-transparent shades of blue when connecting,
      from_rim: 'rgba(120, 0, 240, 0.1)',
      to_rim: 'rgba(0, 196, 240, 0.15)',
      // Font colors for entities.
      actor_font: '#40a0e0', // medium blue
      active_rim: '#40b040', // middle green
      active_fill: '#80ffff',
      value_fill: '#d0f0ff',
      // All notes have thin gray rim, similar to other model diagram
      // elements, that turns red when a note is selected.
      note_rim: '#909090',  // medium gray
      note_font: '#2060a0', // medium dark gray-blue
      // Notes are semi-transparent yellow (will have opacity 0.5).
      note_fill: '#ffff80',
      note_band: '#ffd860',  
      // Computation errors in expressions are signalled by displaying
      // the result in bright red, typically the general error symbol (X).
      VM_error: '#e80000',
      // Background color of GUI dialogs.
      dialog_background: '#f4f8ff',
      cycle: ['#f09800', '#18c8e8', '#8060b0', '#009878',
              '#d05028', '#5878d0', '#987070', '#c0d800']
    };
    // Standard SVG URL
    this.svg_url = 'http://www.w3.org/2000/svg';
    this.clear();
  }
  
  get opaqueSVG() {
    // Return SVG as string with nodes and arrows 100% opaque.
    // NOTE: The semi-transparent ovals behind rates on links have
    // opacity 0.8 and hence are not affected.
    return this.svg.outerHTML.replaceAll(' opacity="0.9"', ' opacity="1"');
  }
  
  clear() {
    // First, clear the entire SVG
    this.clearSVGElement(this.svg);
    // Set default style properties
    this.svg.setAttribute('font-family', this.font_name);
    this.svg.setAttribute('font-size', 8);
    this.svg.setAttribute('text-anchor', 'middle');
    this.svg.setAttribute('alignment-baseline', 'middle');
    // Add marker definitions
    const
        defs = this.newSVGElement('defs'),
        // Standard arrow tips: solid triangle
        tri = 'M0,0 L5,5 L0,10 z',
        // Wedge arrow tips have no baseline
        wedge = 'M1,2 L6,5 L1,8',
        // link arrows have a flat, "chevron-style" tip
        chev = 'M0,0 L10,5 L0,10 L4,5 z',
        // Feedback arrows are hollow and have hole in their baseline
        fbt = 'M0,3L0,0L10,5L0,10L0,7L1.5,7L1.5,8.5L8.5,5L1.5,1.5L1.5,3z';

    // NOTE: standard SVG elements are defined as properties of this paper
    this.size_box = '__c_o_m_p_u_t_e__b_b_o_x__ID*';
    this.drag_line = '__d_r_a_g__l_i_n_e__ID*';
    this.drag_rect = '__d_r_a_g__r_e_c_t__ID*';
    let id = 't_r_i_a_n_g_l_e__t_i_p__ID*';
    this.triangle = `url(#${id})`;
    this.addMarker(defs, id, tri, 8, this.palette.rim);
    id = 'a_c_t_i_v_e__t_r_i_a_n_g_l_e__t_i_p__ID*';
    this.active_triangle = `url(#${id})`;
    this.addMarker(defs, id, tri, 8, this.palette.active_process);
    id = 'a_c_t_i_v_e__r_e_v__t_r_i__t_i_p__ID*';
    this.active_reversed_triangle = `url(#${id})`;
    this.addMarker(defs, id, tri, 8, this.palette.compound_flow);
    id = 'i_n_a_c_t_i_v_e__t_r_i_a_n_g_l_e__t_i_p__ID';
    this.inactive_triangle = `url(#${id})`;
    this.addMarker(defs, id, tri, 8, 'silver');
    id = 'o_p_e_n__t_r_i_a_n_g_l_e__t_i_p__ID*';
    this.open_triangle = `url(#${id})`;
    this.addMarker(defs, id, tri, 7.5, 'white');
    id = 's_e_l_e_c_t_e_d__t_r_i_a_n_g_l_e__t_i_p__ID*';
    this.selected_triangle = `url(#${id})`;
    this.addMarker(defs, id, tri, 7.5, this.palette.select);
    id = 'w_h_i_t_e__t_r_i_a_n_g_l_e__t_i_p__ID*';
    this.white_triangle = `url(#${id})`;
    this.addMarker(defs, id, tri, 9.5, 'white');
    id = 'c_o_n_g_e_s_t_e_d__t_r_i_a_n_g_l_e__t_i_p__ID*';
    this.congested_triangle = `url(#${id})`;
    this.addMarker(defs, id, tri, 7.5, this.palette.at_process_ub_arrow);
    id = 'd_o_u_b_l_e__t_r_i_a_n_g_l_e__t_i_p__ID*';
    this.double_triangle = `url(#${id})`;
    this.addMarker(defs, id, tri, 12, this.palette.rim);
    id = 'a_c_t_i_v_e__d_b_l__t_r_i__t_i_p__ID*';
    this.active_double_triangle = `url(#${id})`;
    this.addMarker(defs, id, tri, 12, this.palette.active_process);
    id = 'i_n_a_c_t_i_v_e__d_b_l__t_r_i__t_i_p__ID*';
    this.inactive_double_triangle = `url(#${id})`;
    this.addMarker(defs, id, tri, 12, 'silver');
    id = 'f_e_e_d_b_a_c_k__t_r_i_a_n_g_l_e__t_i_p__ID*';
    this.feedback_triangle = `url(#${id})`;
    this.addMarker(defs, id, fbt, 10, this.palette.rim);
    id = 'c_h_e_v_r_o_n__t_i_p__ID*';
    this.chevron = `url(#${id})`;
    this.addMarker(defs, id, chev, 8, this.palette.rim);
    id = 's_e_l_e_c_t_e_d__c_h_e_v_r_o_n__t_i_p__ID*';
    this.selected_chevron = `url(#${id})`;
    this.addMarker(defs, id, chev, 10, this.palette.select);
    id = 'c_o_n_n_e_c_t_i_n_g__c_h_e_v_r_o_n__t_i_p__ID*';
    this.connecting_chevron = `url(#${id})`;
    this.addMarker(defs, id, chev, 10, this.palette.connecting);
    id = 'g_r_e_e_n__c_h_e_v_r_o_n__t_i_p__ID*';
    this.green_chevron = `url(#${id})`;
    this.addMarker(defs, id, chev, 8, this.palette.active_rim);
    id = 'd_e_e_p__c_h_e_v_r_o_n__t_i_p__ID*';
    this.deep_chevron = `url(#${id})`;
    this.addMarker(defs, id, chev, 10, 'rgb(128, 128, 144)');
    id = 'o_p_e_n__w_e_d_g_e__t_i_p__ID*';
    this.open_wedge = `url(#${id})`;
    this.addMarker(defs, id, wedge, 11, this.palette.rim);
    id = 's_e_l_e_c_t_e_d__o_p_e_n__w_e_d_g_e__t_i_p__ID*';
    this.selected_open_wedge = `url(#${id})`;
    this.addMarker(defs, id, wedge, 13, this.palette.select);
    id = 'f_e_e_d_b_a_c_k__o_p_e_n__w_e_d_g_e__t_i_p__ID*';
    this.feedback_wedge = `url(#${id})`;
    this.addMarker(defs, id, wedge, 11, 'rgb(0, 0, 0)');
    id = 'd_e_e_p__o_p_e_n__w_e_d_g_e__t_i_p__ID*';
    this.deep_open_wedge = `url(#${id})`;
    this.addMarker(defs, id, wedge, 14, 'rgb(128, 128, 144)');
    id = 'r__b__g_r_a_d_i_e_n_t__ID*';
    this.red_blue_gradient = `url(#${id})`;
    this.addGradient(defs, id, 'rgb(255,176,176)', 'rgb(176,176,255)');
    id = 't_e_x_t__s_h_a_d_o_w__ID*';
    this.text_shadow_filter = `filter: url(#${id})`;
    this.addShadowFilter(defs, id, 'rgb(255,255,255)', 2);
    id = 'd_o_c_u_m_e_n_t_e_d__ID*';
    this.documented_filter = `filter: url(#${id})`;
    this.addShadowFilter(defs, id, 'rgb(50,120,255)', 2);
    id = 't_a_r_g_e_t__ID*';
    this.target_filter = `filter: url(#${id})`;
    this.addShadowFilter(defs, id, 'rgb(250,125,0)', 8);
    id = 'a_c_t_i_v_a_t_e_d__ID*';
    this.activated_filter = `filter: url(#${id})`;
    this.addShadowFilter(defs, id, 'rgb(0,255,0)', 12);
    id = 'a_c_t_i_v_e__l_i_n_k__ID*';
    this.active_link_filter = `filter: url(#${id}); opacity: 1`;
    this.addShadowFilter(defs, id, 'rgb(0,255,0)', 10);
    this.svg.appendChild(defs);
    this.changeFont(CONFIGURATION.default_font_name);
    // Dash patterns for highlighting cycles.
    this.cycle_sda = {
        1: ['none'],
        2: ['20,20', '0,20,20,0'],
        3: ['20,40', '0,20,20,20', '0,40,20,0'],
        4: ['15,45', '0,15,15,30', '0,30,15,15', '0,45,15,0'],
        5: ['12,48', '0,12,12,36', '0,24,12,24', '0,36,12,12', '0,48,12,0'],
        6: ['10,50', '0,10,10,40', '0,20,10,30', '0,30,10,20', '0,40,10,10',
            '0,50,10,0'],
        7: ['9,54', '0,9,9,45', '0,18,9,36', '0,27,9,27', '0,36,9,18',
            '0,45,9,9', '0,54,9,0'],
        8: ['8,56', '0,8,8,48', '0,16,8,40', '0,24,8,32', '0,32,8,24',
            '0,40,8,16', '0,48,8,8', '0,56,8,0'],
        9: ['7,56', '0,7,7,49', '0,14,7,42', '0,21,7,35', '0,28,7,28',
            '0,35,7,21', '0,42,7,14', '0,49,7,7', '0,56,7,0']
      };
  }

  newSVGElement(type) {
    // Creates and returns a new SVG element of the specified type
    const el = document.createElementNS(this.svg_url, type);
    if(!el) throw UI.ERROR.CREATE_FAILED;
    // NOTE: by default, SVG elements should not respond to any mouse events!
    el.setAttribute('pointer-events', 'none');
    return el;
  }
  
  clearSVGElement(el) {
    // Clear all sub-nodes of the specified SVG node.
    if(el) while(el.lastChild) el.removeChild(el.lastChild);
  }
  
  addSVGAttributes(el, obj) {
    // Add attributes specified by `obj` to (SVG) element `el`.
    for(let prop in obj) {
      if(obj.hasOwnProperty(prop)) el.setAttribute(prop, obj[prop]);
    }
  }
  
  addMarker(defs, mid, mpath, msize, mcolor) {
    // Defines SVG for markers used to draw arrows and bound lines
    const marker = this.newSVGElement('marker');
    let shape = null;
    this.addSVGAttributes(marker,
        {id: mid, viewBox: '0,0 10,10', markerWidth: msize, markerHeight: msize,
            refX: 5, refY: 5, orient: 'auto-start-reverse',
            markerUnits: 'userSpaceOnUse', fill: mcolor});
    if(mpath == 'ellipse') {
      shape = this.newSVGElement('ellipse');
      this.addSVGAttributes(shape,
          {cx: 5, cy: 5, rx: 4, ry: 4, stroke: 'none'});
    } else {
      shape = this.newSVGElement('path');
      if(mid.indexOf('w_e_d_g_e') > 0) {
        shape.setAttribute('fill', 'none');
        shape.setAttribute('stroke', mcolor);
      }
      shape.setAttribute('d', mpath);
    }
    shape.setAttribute('stroke-linecap', 'round');
    marker.appendChild(shape);
    defs.appendChild(marker);
  }
  
  addGradient(defs, gid, color1, color2) {
    const gradient = this.newSVGElement('linearGradient');
    this.addSVGAttributes(gradient,
        {id: gid, x1: '0%', y1: '0%', x2: '100%', y2: '0%'});
    let stop = this.newSVGElement('stop');
    this.addSVGAttributes(stop,
        {offset: '0%', style: 'stop-color:' + color1 + ';stop-opacity:1'});
    gradient.appendChild(stop);
    stop = this.newSVGElement('stop');
    this.addSVGAttributes(stop,
        {offset: '100%', style:'stop-color:' + color2 + ';stop-opacity:1'});
    gradient.appendChild(stop);
    defs.appendChild(gradient);
  }
  
  addShadowFilter(defs, fid, color, radius) {
    // Defines SVG for filters used to highlight elements
    const filter = this.newSVGElement('filter');
    this.addSVGAttributes(filter, {id: fid, filterUnits: 'userSpaceOnUse'});
    const sub = this.newSVGElement('feDropShadow');
    this.addSVGAttributes(sub,
        {dx:0, dy:0, 'flood-color': color, 'stdDeviation': radius});
    filter.appendChild(sub);
    defs.appendChild(filter);
  }
  
  addShadowFilter2(defs, fid, color, radius) {
    // Defines SVG for more InkScape compatible filters used to highlight elements
    const filter = this.newSVGElement('filter');
    this.addSVGAttributes(filter, {id: fid, filterUnits: 'userSpaceOnUse'});
    let sub = this.newSVGElement('feGaussianBlur');
    this.addSVGAttributes(sub, {'in': 'SourceAlpha', 'stdDeviation': radius});
    filter.appendChild(sub);
    sub = this.newSVGElement('feOffset');
    this.addSVGAttributes(sub, {dx: 0, dy: 0, result: 'offsetblur'});
    filter.appendChild(sub);
    sub = this.newSVGElement('feFlood');
    this.addSVGAttributes(sub, {'flood-color': color, 'flood-opacity': 1});
    filter.appendChild(sub);
    sub = this.newSVGElement('feComposite');
    this.addSVGAttributes(sub, {in2: 'offsetblur', operator: 'in'});
    filter.appendChild(sub);
    const merge = this.newSVGElement('feMerge');
    sub = this.newSVGElement('feMergeNode');
    merge.appendChild(sub);
    sub = this.newSVGElement('feMergeNode');
    this.addSVGAttributes(sub, {'in': 'SourceGraphic'});
    merge.appendChild(sub);
    filter.appendChild(merge);
    defs.appendChild(filter);
  }
  
  changeFont(fn) {
    // For efficiency, this computes for all integer font sizes up to 16 the
    // height (in pixels) of a string, and also the relative font weight factors 
    // (relative to the normal font weight 400)
    this.font_name = fn;
    this.font_heights = [0];
    this.weight_factors = [0];
    // Get the SVG element used for text size computation
    const el = this.getSizingElement();
    // Set the (new) font name
    el.style.fontFamily = this.font_name;
    el.style.fontWeight = 400;
    // Calculate height and average widths for font sizes 1, 2, ... 16 px
    for(let i = 1; i <= 16; i++) {
      el.style.fontSize = i + 'px';
      // Use characters that probably affect height the most
      el.textContent = '[hq_|';
      this.font_heights.push(el.getBBox().height);
    }
    // Approximate how the font weight will impact string length relative
    // to normal. NOTE: only for 8px font, as this is the default size
    el.style.fontSize = '8px';
    // NOTE: Use a sample of most frequently used characters (digits!)
    // to estimate width change
    el.textContent = '0123456789%+-=<>.';
    const w400 = el.getBBox().width;
    for(let i = 1; i < 10; i++) {
      el.style.fontWeight = 100*i;
      this.weight_factors.push(el.getBBox().width / w400);
    }
  }

  numberSize(number, fsize=8, fweight=400) {
    // Returns the boundingbox {width: ..., height: ...} of a numeric
    // string (in pixels)
    // NOTE: this routine is about 500x faster than textSize because it
    // does not use the DOM tree
    // NOTE: using parseInt makes this function robust to font sizes passed
    // as strings (e.g., "10px")
    fsize = parseInt(fsize);
    // NOTE: 'number' may indeed be a number, so concatenate with '' to force
    // it to become a string
    const
        ns = '' + number,
        fh = this.font_heights[fsize],
        fw = fh / 2;
    let w = 0, m = 0;
    // Approximate the width of the Unicode characters representing
    // special values
    if(ns === '\u2047') {
      w = 8; // undefined (??)
    } else if(ns === '\u25A6' || ns === '\u2BBF' || ns === '\u26A0') {
      w = 6; // computing, not computed, warning sign
    } else {
      // Assume that number has been rendered with fixed spacing
      // (cf. addNumber method of class Shape)
      w = ns.length * fw;
      // Decimal point and minus sign are narrower
      if(ns.indexOf('.') >= 0) w -= 0.6 * fw;
      if(ns.startsWith('-')) w -= 0.55 * fw;
      // Add approximate extra length for =, % and special Unicode characters
      if(ns.indexOf('=') >= 0) {
        w += 0.2 * fw;
      } else {
        // LE, GE, undefined (??), or INF are a bit wider
        m = ns.match(/%|\u2264|\u2265|\u2047|\u221E/g);
        if(m) {
          w += m.length * 0.25 * fw;
        }
        // Ellipsis (may occur between process bounds) is much wider
        m = ns.match(/\u2026/g);
        if(m) w += m.length * 0.6 * fw;
      }
    }
    // adjust for font weight
    return {width: w * this.weight_factors[Math.round(fweight / 100)],
        height: fh};
  }
  
  textSize(string, fsize=8, fweight=400) {
    // Returns the boundingbox {width: ..., height: ...} of a string (in pixels) 
    // NOTE: uses the invisible SVG element that is defined specifically
    // for text size computation
    // NOTE: text size calculation tends to slightly underestimate the
    // length of the string as it is actually rendered, as font sizes
    // appear to be rounded to the nearest available size.
    const el = this.getSizingElement();
    // Accept numbers and strings as font sizes -- NOTE: fractions are ignored!
    el.style.fontSize = parseInt(fsize) + 'px';
    el.style.fontWeight = fweight;
    el.style.fontFamily = this.font_name;
    let w = 0,
        h = 0;
    // Consider the separate lines of the string
    const
        lines = ('' + string).split('\n'),  // Add '' in case string is a number
        ll = lines.length;
    for(let i = 0; i < ll; i++) {
      el.textContent = lines[i];
      const bb = el.getBBox();
      w = Math.max(w, bb.width);
      h += bb.height;
    }
    return {width: w, height: h};
  }
  
  removeInvisibleSVG() {
    // Removes SVG elements used by the user interface (not part of the model)
    let el = document.getElementById(this.size_box);
    if(el) this.svg.removeChild(el);
    el = document.getElementById(this.drag_line);
    if(el) this.svg.removeChild(el);
    el = document.getElementById(this.drag_rect);
    if(el) this.svg.removeChild(el);
  }

  getSizingElement() {
    // Returns the SVG sizing element, or creates it if not found
    let el = document.getElementById(this.size_box);
    // Create it if not found
    if(!el) {
      // Append an invisible text element to the SVG
      el = document.createElementNS(this.svg_url, 'text');
      if(!el) throw UI.ERROR.CREATE_FAILED;
      el.id = this.size_box;
      el.style.opacity = 0;
      this.svg.appendChild(el);
    }
    return el;
  }

  fitToSize(margin=30) {
    // Adjust the dimensions of the main SVG to fit the graph plus 15px margin
    // all around
    this.removeInvisibleSVG();
    const
        bb = this.svg.getBBox(),
        w = bb.width + margin,
        h = bb.height + margin;
    if(w !== this.width || h !== this.height) {
      MODEL.translateGraph(-bb.x + margin / 2, -bb.y + margin);
      this.width = w;
      this.height = h;
      this.svg.setAttribute('width', this.width);
      this.svg.setAttribute('height', this.height);
      this.zoom_factor = 1;
      this.zoom_label.innerHTML = Math.round(100 / this.zoom_factor) + '%';
      this.extend(margin);
    }
  }

  extend(margin=30) {
    // Adjust the paper size to fit all objects WITHOUT changing the origin (0, 0)
    // NOTE: keep a minimum page size to keep the scrolling more "natural"
    this.removeInvisibleSVG();
    const
        bb = this.svg.getBBox(),
        // Let `w` and `h` be the actual width and height in pixels
        w = bb.x + bb.width + margin,
        h = bb.y + bb.height + margin,
        // Let `ccw` and `cch` be the size of the scrollable area
        ccw = w / this.zoom_factor,
        cch = h / this.zoom_factor;
    if(this.zoom_factor >= 1) {
      this.width = w;
      this.height = h;
      this.svg.setAttribute('width', this.width);
      this.svg.setAttribute('height', this.height);
      // Reduce the image by making the view box larger than the paper
      const
          zw = w * this.zoom_factor,
          zh = h * this.zoom_factor;
      this.svg.setAttribute('viewBox', ['0 0', zw, zh].join(' '));
    } else {
      // Enlarge the image by making paper larger than the viewbox...
      this.svg.setAttribute('width', ccw / this.zoom_factor);
      this.svg.setAttribute('height', cch / this.zoom_factor);
      this.svg.setAttribute('viewBox', ['0 0', ccw, cch].join(' '));
    }
    // ... while making the scrollable area smaller (if ZF > 1)
    // c.q. larger (if ZF < 1)
    this.container.style.width = (this.width / this.zoom_factor) + 'px';
    this.container.style.height = (this.height / this.zoom_factor) + 'px';
  }
  
  //
  // ZOOM functionality
  //

  doZoom(z) {
    this.zoom_factor *= Math.sqrt(z);
    document.getElementById('zoom').innerHTML =
        Math.round(100 / this.zoom_factor) + '%';
    this.extend();
  }
  
  zoomIn() {
    if(UI.buttons.zoomin && !UI.buttons.zoomin.classList.contains('disab')) {
      // Enlarging graph by more than 200% would seem not functional
      if(this.zoom_factor > 0.55) this.doZoom(0.5);
    }
  }
  
  zoomOut() {
    if(UI.buttons.zoomout && !UI.buttons.zoomout.classList.contains('disab')) {
      // Reducing graph by to less than 25% would seem not functional.
      if(this.zoom_factor <= 4) this.doZoom(2);
    }
  }
  
  cursorPosition(x, y) {
    // Return [x, y] in diagram coordinates.
    const
        rect = this.container.getBoundingClientRect(),
        top = rect.top + window.scrollY + document.body.scrollTop, 
        left = rect.left + window.scrollX + document.body.scrollLeft;
    x = Math.max(0, Math.floor((x - left) * this.zoom_factor));
    y = Math.max(0, Math.floor((y - top) * this.zoom_factor));
    return [x, y];
  }

  //
  // Metods for visual feedback while linking or selecting
  //

  dragLineToCursor(p1, p2) {
    // NOTE: Does not remove element; only updates path and opacity.
    let el = document.getElementById(this.drag_line);
    // Create it if not found
    if(!el) {
      el = this.newSVGElement('path');
      el.id = this.drag_line;
      el.style.opacity = 0;
      el.style.fill = 'none';
      el.style.stroke = UI.color.connecting;
      el.style.strokeWidth = 1.5;
      el.style.strokeDasharray = UI.sda.dash;
      el.style.strokeLinecap = 'round';
      el.style.markerEnd = this.connecting_chevron;
      this.svg.appendChild(el);
    }
    const
        // Control points shoud make the curve stand out, so use 25% of
        // the Euclidean distance between the end points as "stretch".
        dx = p2.x - p1.x,
        dy = p2.y - p1.y,
        ed = Math.max(0, (Math.sqrt(dx*dx + dy*dy) - 50) / 6);
    let angle;
    if(Math.abs(dx) < VM.NEAR_ZERO) {
      angle = (dy >= 0 ? 0.5 : 1.5) * Math.PI;
    } else {
      angle = Math.atan(dy / dx);
      if(dx < 0) angle += Math.PI;
    }
    const
        cosa = Math.cos(angle),
        sina = Math.sin(angle),
        fcx = p1.x + 15 * cosa,
        fcy = p1.y + (15 + ed) * sina,
        tcx = p2.x - (15 + ed) * cosa,
        tcy = p2.y - 15 * sina;
    // Subtract a few pixels to accomodate the wedge.
    p2.x -= 5 * cosa;
    p2.y -= 5 * sina;
    el.setAttribute('d',
        `M${p1.x},${p1.y}C${fcx},${fcy},${tcx},${tcy},${p2.x},${p2.y}`);
    el.style.opacity = 1;
    this.adjustPaperSize(p2.x, p2.y);
    UI.scrollIntoView(el);
  }
  
  adjustPaperSize(x, y) {
    if(this.zoom_factor < 1) return;
    const
        w = parseFloat(this.svg.getAttribute('width')),
        h = parseFloat(this.svg.getAttribute('height'));
    if(x <= w && y <= h) return;
    if(x > w) {
      this.svg.setAttribute('width', x);
      this.width = x;
      this.container.style.width = (x / this.zoom_factor) + 'px';
    }
    if(y > h) {
      this.svg.setAttribute('height', y);
      this.height = y;
      this.container.style.height = (y / this.zoom_factor) + 'px';
    }
    this.svg.setAttribute('viewBox',
        ['0 0', this.width * this.zoom_factor,
            this.height * this.zoom_factor].join(' '));
  }
  
  hideDragLine() {
    const el = document.getElementById(this.drag_line);
    if(el) el.style.opacity = 0;
  }

  dragRectToCursor(ox, oy, dx, dy) {
    // NOTE: does not remove element; only updates path and opacity
    let el = document.getElementById(this.drag_rect);
    // Create it if not found
    if(!el) {
      el = this.newSVGElement('rect');
      el.id = this.drag_rect;
      el.style.opacity = 0;
      el.style.fill = 'none';
      el.style.stroke = 'red';
      el.style.strokeWidth = 1.5;
      el.style.strokeDasharray = UI.sda.dash;
      el.setAttribute('rx', 0);
      el.setAttribute('ry', 0);
      this.svg.appendChild(el);
    }
    let lx = Math.min(ox, dx),
        ty = Math.min(oy, dy),
        rx = Math.max(ox, dx),
        by = Math.max(oy, dy);
    el.setAttribute('x', lx);
    el.setAttribute('y', ty);
    el.setAttribute('width', rx - lx);
    el.setAttribute('height', by - ty);
    el.style.opacity = 1;
    this.adjustPaperSize(rx, by);
  }
  
  hideDragRect() {
    const el = document.getElementById(this.drag_rect);
    if(el) { el.style.opacity = 0; }
  }
  
  //
  //  Auxiliary methods used while drawing shapes
  //
  
  arc(r, srad, erad) {
    // Return SVG path code for an arc having radius `r`, start angle `srad`,
    // and end angle `erad`.
    return 'a' + [r, r, 0, 0, 1, r * Math.cos(erad) - r * Math.cos(srad),
        r * Math.sin(erad) - r * Math.sin(srad)].join(',');
  }

  bezierPoint(a, b, c, d, t) {
    // Return the point on a cubic Bezier curve from `a` to `d` with control
    // points `b` and `c`, and `t` indicating the relative distance from `a`
    // as a fraction between 0 and 1.
    // NOTE: The four points must be represented as lists [x, y]
    function interPoint(a, b, t) {
      // Local function that performs linear interpolation between two points
      // `a` = [x1, y1] and `b` = [x2, y2] when parameter `t` indicates
      // the relative distance from `a` as a fraction between 0 and 1
      return  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    // Calculate the Bezier points
    const ab = interPoint(a, b, t),
          bc = interPoint(b, c, t),
          cd = interPoint(c, d, t);
    return interPoint(interPoint(ab, bc, t), interPoint(bc, cd, t), t);
  }
  
  bezierPointAtDistanceFromHead(a, b, c, d, ed) {
    // Return the fraction t (cf. function above) for wich the Bezier curve
    // point lies at Euclidean distance `ed` from end point `d`.
    const
        dx = d[0] - a[0],
        dy = d[1] - a[1],
        ed_ad = Math.sqrt(dx*dx + dy*dy);
    if(ed_ad < ed) {
      const r = ed_ad / ed;
      return [d[0] - dx * r, d[1] - dy * r];
    }
    return this.bezierPoint(a, b, c, d, 1 - ed / ed_ad);
  }

  //
  // Diagram-drawing method draws the diagram for the focal cluster
  //
  
  removeDeepLinkShapes() {
    // Remove shapes of "deep link" objects from the paper.
    for(let k in this.drawn_deep_links) {
      if(this.drawn_deep_links.hasOwnProperty(k)) {
        this.drawn_deep_links[k].shape.removeFromDOM();
      }
    }
    this.drawn_deep_links = {};
  }
  
  comprisingDeepLink(l) {
    // Return drawn deep link that comprises `l`.
    for(let k in this.drawn_deep_links) {
      if(this.drawn_deep_links.hasOwnProperty(k)) {
        const dl = this.drawn_deep_links[k];
        for(let i = 0; i < dl.deep_links.length; i++) {
          if(dl.deep_links[i] === l) return dl;
        }
      }
    }
    return null;
  }
  
  drawModel(mdl) {
    // Draw the diagram for the focal cluster.
    this.clear();
    // Prepare to draw all elements in the focal cluster.
    const
        fc = mdl.focal_cluster,
        vl = fc.visibleLinks,
        dvl = fc.deepVisibleLinks;
    // NOTE: The "deep visible links" are "virtual" link objects that
    // will be recognized as such by the link drawing routine. The are
    // drawn first because their lines will be thicker.
    for(let k in dvl) if(dvl.hasOwnProperty(k)) {
      this.drawLink(dvl[k]);
    }
    for(let i = 0; i < vl.length; i++) {
      this.drawLink(vl[i]);
    }
    for(let i = 0; i < fc.sub_clusters.length; i++) {
      this.drawCluster(fc.sub_clusters[i]);
    }
    for(let i = 0; i < fc.factors.length; i++) {
      this.drawFactor(fc.factors[i]);
    }
    // Draw notes last, as they are semi-transparent, and can be quite small.
    for(let i = 0; i < fc.notes.length; i++) {
      this.drawNote(fc.notes[i]);
    }
    // Resize paper if necessary.
    this.extend();
    // Display model name in browser.
    document.title = mdl.name || 'CLAST';
  }
  
  drawSelection(mdl, dx=0, dy=0) {
    // NOTE: Clear this global, as Bezier curves move from under the cursor.
    // without a mouseout event.
    this.link_under_cursor = null;
        // Draw the selected entities and associated links.
    for(let i = 0; i < mdl.selection.length; i++) {
      const obj = mdl.selection[i];
      // Links are drawn separately, so do not draw those contained in
      // the selection .
      if(!(obj instanceof Link)) UI.drawObject(obj, dx, dy);
    }
    // First redraw all deep links that are visible in the focal cluster.
    this.removeDeepLinkShapes();
    const dvl = mdl.focal_cluster.deepVisibleLinks;
    for(let k in dvl) if(dvl.hasOwnProperty(k)) {
      this.drawLink(dvl[k], dx, dy);
    }
    // Then also redraw all links that are visible in the focal cluster.
    const vl = mdl.focal_cluster.visibleLinks;
    for(let i = 0; i < vl.length; i++) {
      this.drawLink(vl[i], dx, dy);
    }
    this.extend(); 
  }
  
  drawLink(l, dx=0, dy=0) {
    // Draws link `l` on the paper.
    let stroke_color,
        stroke_width,
        chev,
        ady;
    // Clear previous drawing.
    l.shape.clear();
    const
        // Link is dashed when its multiplier is undefined.
        sda = (l.expression.defined ? 'none' : UI.sda.dash),
        vn = l.visibleNodes,
        activated = false,
        active_color = this.palette.rim; // @@@@@@@@@ TO DO!
    // Double-check: do not draw unless both nodes are visible.
    if(!vn[0] || !vn[1]) {
      const cdl = this.comprisingDeepLink(l);
      if(cdl) l = cdl;
    }
    if(l.selected || l.containsSelected) {
      // Draw arrow line thick and in red.
      stroke_color = this.palette.select;
      stroke_width = 1.75;
      chev = this.selected_open_wedge;
      ady = 4;
    } else {
      stroke_width = 1.25;
      if(activated || active_color !== this.palette.rim) {
        if(activated) {
          stroke_color = '#60b060';
        } else {
          stroke_color = active_color;
        }
        // NOTE: Only one shade of green for the chevron tip.
        chev = this.green_chevron;
      } else if(l.is_feedback || l.containsFeedback) {
        stroke_color = 'black';
        chev = this.feedback_wedge;
      } else {
        stroke_color = this.palette.rim;
        chev = this.open_wedge;
      }
      ady = 3;
    }
    const
        ff = l.from_factor,
        tf = l.to_factor;
    const
        fp = ff.connectionPoint(tf, true),
        tp = tf.connectionPoint(ff, false);
    // Declare variables for the arrow point coordinates.
    const
        x1 = fp.x,
        y1 = fp.y,
        // NOTE: Subtract some pixels because chevron *centers* on
        // the end point.
        x2 = tp.x + 2 * tp.tcos,
        y2 = tp.y + 2 * tp.tsin,
        fcx = fp.fcx,
        fcy = fp.fcy,
        tcx = tp.tcx,
        tcy = tp.tcy,
        path = [`M${x1},${y1}C${fcx},${fcy},${tcx},${tcy},${x2},${y2}`];
        
    // For feedback links, add (multi-color) thick lines.
    if(l.is_feedback) {
      const
          cn = l.cycleNumbers,
          n = cn.length;
      for(let i = 0; i < n; i++) {
        const
            str = this.palette.cycle[cn[i] % 8],
            opa = Math.min(1, 0.4 + Math.floor(cn[i] / 8) * 0.25),
            sda = this.cycle_sda[n][i];
        l.shape.addPath(path, {fill: 'none', stroke: str, opacity: opa,
            'stroke-width': 7, 'stroke-dasharray': sda});
      }
    }
    // Draw a thick but near-transparent line so that the mouse
    // events is triggered sooner.
    const
        le = l.shape.addPath(path, {fill: 'none', stroke: 'white',
            'stroke-width': 9, 'stroke-linecap': 'round', opacity: 0.01}),
        ndl = l.deep_links.length,
        luc = (ndl === 1 ? l.deep_links[0] : l),
        // Permit selecting a single deep link...
        sluc = (ndl < 2 ?
            () => { UI.setLinkUnderCursor(luc); } :
            // ... and make multiple deep links appear on the status line.
            () => { UI.showDeepLinksUnderCursor(l); });
    le.setAttribute('pointer-events', 'auto');
    le.addEventListener('mouseover', sluc);
    le.addEventListener('mouseout',
        () => { UI.setLinkUnderCursor(null); });
/*
    // Display control points (for testing & debugging).
    l.shape.addCircle(fcx, fcy, 2, {fill: 'red'});
    l.shape.addCircle(tcx, tcy, 2, {fill: 'blue'});
    // Also connect center points by a silver line.
    l.shape.addPath([`M${ff.x},${ff.y}L${tf.x},${tf.y}`],
        {fill: 'none', stroke: 'silver'});
*/
    // Add shape to list of drawn deep links if applicable.
    if(ndl) this.drawn_deep_links[l.identifier] = l;
    // Then draw the line in its appropriate style.
    let opac = 1;
    if(ndl > 1) {
      // NOTE: Deep links representing multiple links cannot be selected,
      // so they are always depicted in gray.
      stroke_width = 2.5;
      stroke_color = (activated ? '#60b060' : '#808090');
      chev = this.deep_open_wedge;
      opac = 0.75;
    }
    const tl = l.shape.addPath(
        [`M${x1},${y1}C${fcx},${fcy},${tcx},${tcy},${x2},${y2}`],
        {fill: 'none', stroke: stroke_color, 'stroke-width': stroke_width,
            'stroke-dasharray': sda, 'stroke-linecap': 'round',
            'marker-end': chev, opacity: opac});
    if(activated) {
      // Highlight arrow if FROM factor was "activated" in the previous
      // cycle.
      tl.setAttribute('style', this.active_link_filter);
    }
    if(l.expression.defined && (l.expression.isStatic || MODEL.solved)) {
      // When possible, show sign of link multiplier, and also its value
      // if this is not 1 or -1.
      const
          r = l.expression.result(MODEL.t),
          sign = '-0+'.charAt(Math.sign(r) + 1),
          bp = this.bezierPointAtDistanceFromHead(
                [x1, y1], [fcx, fcy], [tcx, tcy], [x2, y2], 15);
      l.shape.addCircle(bp[0], bp[1], 5, {stroke: stroke_color,
          'stroke-width': 0.6, fill: 'white'});
      l.shape.addText(bp[0], bp[1] - 1, sign,
          {'font-size': 10, 'font-weight': 700, fill: 'black'});
      if(Math.abs(Math.abs(r) - 1) > VM.NEAR_ZERO) {
        const
            s = VM.sig4Dig(r),
            nbb = this.numberSize(s, 9),
            bw = nbb.width + 4,
            bh = nbb.height + 2,
            bp = this.bezierPoint(
                  [x1, y1], [fcx, fcy], [tcx, tcy], [x2, y2], 0.8);
        l.shape.addRect(bp[0], bp[1], bw, bh,
            {stroke: '#80a0ff', 'stroke-width': 0.5, fill: '#d0f0ff'});
        l.shape.addNumber(bp[0], bp[1], s, {'font-size': 9,
            'fill': (r <= VM.ERROR || r >= VM.EXCEPTION ?
                this.palette.VM_error : '#0000a0')});
      }
    }
    // Highlight shape if it has comments.
    l.shape.element.setAttribute('style',
        (DOCUMENTATION_MANAGER.visible && l.comments ?
            this.documented_filter : ''));
    l.shape.appendToDOM();
  }

  drawCluster(clstr, dx=0, dy=0) {
    // Clear previous drawing
    clstr.shape.clear();
    // NOTE: Do not draw cluster unless it is a node in the focal cluster.
    if(MODEL.focal_cluster.sub_clusters.indexOf(clstr) < 0) return;
    let stroke_color = this.palette.rim,
        stroke_width = 1.5,
        fill_color = 'white',
        font_color = 'black';
    if(clstr.selected) {
      stroke_color = this.palette.select;
      stroke_width = 2.5;
    }
    let w = clstr.width,
        h = clstr.height;
    // Clusters are displayed as dash-rimmed rectangles.
    const
        x = clstr.x + dx,
        y = clstr.y + dy;
    // Draw frame.
    clstr.shape.addRect(x, y, w, h,
        {fill: fill_color, stroke: stroke_color,
            'stroke-width': stroke_width, 'stroke-dasharray': UI.sda.dot});
    // Add overlay with rim to permit linking to this cluster.
    const rim = clstr.shape.addRect(x, y, w, h,
        {stroke: this.palette.transparent, 'stroke-width': 9,
            fill: this.palette.transparent, 'pointer-events': 'auto',
            'data-id': clstr.identifier});
    UI.nodeRim(rim);
    // Draw text.
    const
        lcnt = clstr.name_lines.split('\n').length,
        cy = (clstr.hasActor ? y - 11 / (lcnt + 1) : y);
    clstr.shape.addText(x, cy, clstr.name_lines,
        {fill: (clstr.allFactors.length ? font_color : 'silver'),
            'font-size': 11});
    if(clstr.hasActor) {
      const
          th = lcnt * this.font_heights[11],
          anl = UI.stringToLineArray(clstr.actor.name, hw * 0.85, 11),
          format = {'font-size': 11, fill: this.palette.actor_font,
                  'font-style': 'italic'};
      let any = cy + th/2 + 7;
      for(let i = 0; i < anl.length; i++) {
        clstr.shape.addText(x, any, anl[i], format);
        any += 11;
      }
    }
    if(clstr === UI.target_cluster) {
      // Highlight cluster if it is the drop target for the selection.
      clstr.shape.element.childNodes[0].setAttribute('style',
          this.target_filter);
      clstr.shape.element.childNodes[1].setAttribute('style',
          this.target_filter);
    } else if(DOCUMENTATION_MANAGER.visible && clstr.comments) {
      // Highlight shape if it has comments.
      clstr.shape.element.childNodes[0].setAttribute('style',
          this.documented_filter);
      clstr.shape.element.childNodes[1].setAttribute('style',
          this.documented_filter);
    } else {
      // No highlighting.
      clstr.shape.element.childNodes[0].setAttribute('style', '');
      clstr.shape.element.childNodes[1].setAttribute('style', '');
    }
    clstr.shape.element.setAttribute('opacity', 0.9);
    clstr.shape.appendToDOM();    
  }
  
  drawFactor(fact, dx=0, dy=0) {
    // Clear previous drawing.
    fact.shape.clear();
    // Do not draw factor unless in focal cluster.
    if(fact.parent !== MODEL.focal_cluster) return;
    // Set local constants and variables.
    const
        x = fact.x + dx,
        y = fact.y + dy,
        hw = fact.width / 2,
        hh = fact.height / 2,
        active = fact.isActive(MODEL.t);
    let stroke_width = 1,
        stroke_color = this.palette.rim,
        fill_color = 'white';
    // Active states have a dark green rim.
    if(active) {
      stroke_width = 1.5;
      stroke_color = fact.activeColor(MODEL.t);
    }
    // Being selected overrules special border properties except SDA
    if(fact.selected) {
      stroke_color = this.palette.select;
      stroke_width = 2.5;
    }
    // Draw frame using colors as defined above.
    fact.shape.addEllipse(x, y, hw, hh, {fill: fill_color,
        stroke: stroke_color, 'stroke-width': stroke_width});
    // Add actor color inner rim.
    fact.shape.addEllipse(x, y, hw - 2.5, hh - 2.5,
        {stroke: fact.actor.color, 'stroke-width': 4, fill: 'none',
            'pointer-events': 'auto', 'data-id': fact.identifier});
    // Add near-invisible "connector" rim.
    const rim = fact.shape.addEllipse(x, y, hw, hh,
        {stroke: this.palette.transparent, 'stroke-width': 9,
            fill: this.palette.transparent,
            'pointer-events': 'auto', 'data-id': fact.identifier});
    UI.nodeRim(rim);
    // Always draw factor name plus actor name (if any).
    const
        th = fact.name_lines.split('\n').length * this.font_heights[10] / 2,
        cy = (fact.hasActor ? y - 6 : y);
    fact.shape.addText(x, cy, fact.name_lines, {'font-size': 10});
    if(fact.hasActor) {
      fact.shape.addText(x, cy + th + 6, fact.actor.name,
          {'font-size': 10, fill: this.palette.actor_font,
              'font-style': 'italic'});
    }
    if(fact.expression.defined) {
      let r = '';
      if(fact.expression.isStatic) {
        r = VM.sig4Dig(fact.expression.result(0));
        // Display lock symbol on the left.
        fact.shape.addText(x - hw + 8, y, '\u{1F512}',
            {'font-size': 9, fill: 'black'});
      } else {
        if(MODEL.solved) r = VM.sig4Dig(fact.expression.result(MODEL.t));
      }
      if(r) fact.shape.addText(x + hw - 3, y + 1, r,
          {'font-size': 8, fill: 'gray', 'text-anchor': 'end'});
    }
    // Highlight shape if needed.
    let filter = '';
    if(fact.activated(MODEL.t)) {
      filter = this.activated_filter;
    } else if(DOCUMENTATION_MANAGER.visible && fact.comments) {
      filter = this.documented_filter;
    }
    fact.shape.element.firstChild.setAttribute('style', filter);
    // Make shape slightly transparent.
    fact.shape.element.setAttribute('opacity', 0.9);
    fact.shape.appendToDOM();    
  }
  
  drawNote(note, dx=0, dy=0) {
    // NOTE: call resize if text contains fields, as text determines size
    note.resize();
    const
        x = note.x + dx,
        y = note.y + dy,
        w = note.width,
        h = note.height;
    let stroke_color, stroke_width;
    if(note.selected) {
      stroke_color = this.palette.select;
      stroke_width = 1.6;
    } else {
      stroke_color = this.palette.note_rim;
      stroke_width = 0.6;
    }
    note.shape.clear();
    note.shape.addRect(x, y, w, h,
        {fill: this.palette.note_fill, opacity: 0.75, stroke: stroke_color,
            'stroke-width': stroke_width, rx: 4, ry: 4});
    note.shape.addRect(x, y, w-2, h-2,
        {fill: 'none', stroke: this.palette.note_band, 'stroke-width': 1.5,
            rx: 3, ry: 3});
    note.shape.addText(x - w/2 + 4, y, note.lines,
        {fill: this.palette.note_font, 'text-anchor': 'start'});
    note.shape.appendToDOM();
  }
  
} // END of class Paper

