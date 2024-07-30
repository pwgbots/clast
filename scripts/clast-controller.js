/*
CLAST is an executable graphical editor for causal loop diagrams.
This tool is developed by Pieter Bots at Delft University of Technology.

This JavaScript file (clast-controller.js) provides the GUI controller
functionality for the CLAST model editor: buttons on the main tool bars,
the associated modal dialogs (class ModalDialog), and the related event
handler functions.
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

// CLASS ModalDialog provides basic modal dialog functionality.
class ModalDialog {
  constructor(id) {
    this.id = id;
    this.modal = document.getElementById(id + '-modal');
    this.dialog = document.getElementById(id + '-dlg');
    // NOTE: Dialog title and button properties will be `undefined` if
    // not in the header DIV child of the dialog DIV element.
    this.title = this.dialog.getElementsByClassName('dlg-title')[0];
    this.ok = this.dialog.getElementsByClassName('ok-btn')[0];
    this.cancel = this.dialog.getElementsByClassName('cancel-btn')[0];
    this.info = this.dialog.getElementsByClassName('info-btn')[0];
    this.close = this.dialog.getElementsByClassName('close-btn')[0];
    // NOTE: Reset function is called on hide() and can be redefined.
    this.reset = () => {}; 
  }
  
  element(name) {
    // Return the DOM element within this dialog that is identified by
    // `name`. In the file `index.html`, modal dialogs are defined as
    // DIV elements with id="xxx-modal", "xxx-dlg", etc., and all input
    // fields then must have id="xxx-name".
    return document.getElementById(`${this.id}-${name}`);
  }
  
  selectedOption(name) {
    // Return the selected option element of the named selector.
    const sel = document.getElementById(`${this.id}-${name}`);
    return sel.options[sel.selectedIndex];
  }

  show(name='') {
    // Make dialog visible and set focus on the name element.
    this.modal.style.display = 'block';
    if(name) this.element(name).focus();
  }
  
  hide() {
    // Make this modal dialog invisible.
    this.modal.style.display = 'none';
  }

} // END of class ModalDialog


// CLASS Controller implements the CLAST Graphical User Interface.
class Controller {
  constructor() {
    this.modals = {};
    this.buttons = {};
    // Default chart colors (12 line colors + 12 matching lighter shades)
    this.chart_colors = [
        '#2e86de', '#ff9f43', '#8395a7', '#10ac84', '#f368e0', 
        '#0abde3', '#ee5253', '#222f3e', '#01a3a4', '#341f97',
        '#974b33', '#999751',
        // Lighter shades for areas (or additional lines if > 10)
        '#54a0ff', '#feca57', '#c8d6e5', '#1dd1a1', '#ff9ff3',
        '#48dbfb', '#ff6b6b', '#576574', '#00d2d3', '#5f27cd',
        '#c86a5b', '#c2c18c'
      ];
    // SVG stroke dash arrays for line types while drawing charts or arrows
    this.sda = {
      dash: '7,3',
      dot: '2,3',
      dash_dot: '7,3,2,3',
      long_dash: '12,3',
      longer_dash: '15,3', 
      short_dash: '5,2',
      shorter_dash: '0.5,2.5',
      long_dash_dot: '10,3,2,3',
      even_dash: '6,5',
      dot_dot: '2,3,2,6'
    };
    // Error messages
    this.ERROR = {
        CREATE_FAILED: 'ERROR: failed to create a new SVG element',
        APPEND_FAILED: 'ERROR: failed to append SVG element to DOM',
      };
    this.WARNING = {
        INVALID_ACTOR_NAME: 'Invalid actor name',
      };
    this.NOTICE = {
        WORK_IN_PROGRESS: 'Planned feature -- work in progress!',
      };
    // Strings used to identify special entities
    this.TOP_CLUSTER_NAME = '(top-level cluster)';
    // Likewise, the "no actor" actor has a standard name
    this.NO_ACTOR = '(no actor)';
    // Use colon with space to separate prefixes and names of clones
    this.PREFIXER = ': ';
    // FROM->TO represented by solid right-pointing arrow with curved shaft.
    this.LINK_ARROW = '\u219D';
    
    // Identify the type of browser in which CLAST is running.
    const
        ua = window.navigator.userAgent.toLowerCase(),
        browsers = [
            ['edg', 'Edge'],
            ['opr', 'Opera'],
            ['chrome', 'Chrome'],
            ['firefox', 'Firefox'],
            ['safari', 'Safari']];
    for(let i = 0; i < browsers.length; i++) {
      const b = browsers[i];
      if(ua.indexOf(b[0]) >= 0) {
        this.browser_name = b[1];
        break;
      }
    }
    // Display version number as clickable link just below the CLAST logo.
    this.version_number = CLAST_VERSION;
    this.version_div = document.getElementById('clast-version-number');
    this.version_div.innerHTML = 'Version ' + this.version_number;
    // Initialize the "paper" for drawing the model diagram.
    this.paper = new Paper();
    // The properties below are used to avoid too frequent redrawing of
    // the SVG model diagram.
    this.busy_drawing = false;
    this.draw_requests = 0;
    this.busy_drawing_selection = false;
    this.selection_draw_requests = 0;
    // The "edited object" is set when the properties modal of the selected
    // entity is opened with double-click or Alt-click.
    this.edited_object = null;
    // Initialize mouse/cursor control properties.
    this.mouse_x = 0;
    this.mouse_y = 0;
    this.mouse_down_x = 0;
    this.mouse_down_y = 0;
    this.move_dx = 0;
    this.move_dy = 0;
    this.start_sel_x = -1;
    this.start_sel_y = -1;
    this.add_x = 0;
    this.add_y = 0;
    this.on_node = null;
    this.on_link = null;
    this.on_factor = null;
    this.on_cluster = null;
    this.on_note = null;
    this.dragged_node = null;
    this.node_to_move = null;
    this.dbl_clicked_node = null;
    this.target_cluster = null;
    this.link_under_cursor = null;
    this.deep_link_info = '';
    // When linking, keep track of the FROM and TO nodes.
    this.from_node = null;
    this.to_node = null;
    this.last_up_down_without_move = Date.now();
    // Keyboard shortcuts: Ctrl-x associates with menu button ID.
    this.shortcuts = {
      'C': 'clone', // button and Ctrl-C now copies; Alt-C clones
      'F': 'finder',
      'G': 'savediagram', // G for "Graph" (as Scalable Vector Graphics image)
      'I': 'documentation',
      'K': 'reset', // reset model and clear results from graph
      'L': 'load',
      'M': 'monitor', // Alt-M will open the model settings dialog
      // Ctrl-N will still open a new browser window.
      'P': 'diagram', // P for PNG (Portable Network Graphics image)
      'Q': 'stop',
      'R': 'solve', // runs the simulation
      'S': 'save',
      // Ctrl-T will still open a new browser tab.
      'U': 'parent',  // U for "move UP in cluster hierarchy"
      'V': 'paste',
      // Ctrl-W will still close the browser window.
      'Y': 'redo',
      'Z': 'undo',
    };

    // Initialize controller buttons.
    this.node_btns = ['factor', 'cluster', 'link', 'note'];
    this.edit_btns = ['clone', 'paste', 'delete', 'undo', 'redo'];
    this.model_btns = ['settings', 'save', 'savediagram', 'finder',
        'actors', 'monitor', 'cycle', 'solve'];
    this.other_btns = ['new', 'load', 'documentation',
        'parent', 'lift', 'solve', 'stop', 'reset', 'zoomin', 'zoomout',
        'stepback', 'stepforward', 'autosave', 'recall'];
    this.all_btns = this.node_btns.concat(
        this.edit_btns, this.model_btns, this.other_btns);

    // Add all button DOM elements as controller properties.
    for(let i = 0; i < this.all_btns.length; i++) {
      const b = this.all_btns[i];
      this.buttons[b] = document.getElementById(b + '-btn');
    }
    this.active_button = null;

    // Also identify the elements related to the focal cluster.
    this.focal_cluster = document.getElementById('focal-cluster');
    this.focal_name = document.getElementById('focal-name');
    
    // Keep track of time since last message displayed on the infoline.
    this.time_last_message = new Date('01 Jan 2001 00:00:00 GMT');
    this.message_display_time = 3000;
    this.last_message_type = '';

    // Initialize "main" modals, i.e., those that relate to the controller,
    // not to other dialog objects.
    const main_modals = ['model', 'load', 'settings', 'actors', 'actor',
        'add-node', 'edit-link', 'move', 'note', 'clone',
        'expression'];
    for(let i = 0; i < main_modals.length; i++) {
      this.modals[main_modals[i]] = new ModalDialog(main_modals[i]);
    }
    
    // Initially, no dialog being dragged or resized.
    this.dr_dialog = null;
    
    // Visible draggable dialogs are sorted by their z-index.
    this.dr_dialog_order = [];
    
    // Record of message that was overridden by more important message.
    this.old_info_line = null;
  }

  pointInViewport(rx, ry) {
    // Return paper coordinates of the cursor position if the cursor were
    // located at relative position (rx * window width, ry * window height)
    // in the browser window.
    if(this.paper) return this.paper.cursorPosition(
          window.innerWidth *rx, window.innerHeight *ry);
    // If no graphics return values for a 100x100 pixel viewport
    return [100 * rx, 100 * ry];
  }
  
  textSize(string, fsize=8, fweight=400) {
    // Returns width and height (in px) of (multi-line) string
    // If paper, use its method, which is more accurate
    if(this.paper) return this.paper.textSize(string, fsize, fweight);
    // If no paper, assume 144 px/inch, so 1 pt = 2 px
    const
        ch = fsize * 2,
        cw = fsize;
    // NOTE: Add '' in case string is a number
    const lines = ('' + string).split('\n');
    let w = 0;
    for(let i = 0; i < lines.length; i++) {
      w = Math.max(w, lines[i].length * cw);
    }
    return {width: w, height: lines.length * ch};
  }

  stringToLineArray(string, width=100, fsize=8) {
    // Return an array of strings wrapped to given width at given font
    // size while preserving newlines -- used to format text of notes.
    const
        multi = [],
        lines = string.split('\n'),
        ll = lines.length,
        // If no paper, assume 144 px/inch, so 1 pt = 2 px
        fh = (this.paper ? this.paper.font_heights[fsize] : 2 * fsize),
        scalar = fh / 2;
    for(let i = 0; i < ll; i++) {
      // NOTE: interpret two spaces as a "non-breaking" space
      const words = lines[i].replace(/  /g, '\u00A0').trim().split(/ +/);
      // Split words at '-' when wider than width
      for(let j = 0; j < words.length; j++) {
        if(words[j].length * scalar > width) {
          const sw = words[j].split('-');
          if(sw.length > 1) {
            // Replace j-th word by last fragment of split string
            words[j] = sw.pop();
            // Insert remaining fragments before
            while(sw.length > 0) words.splice(j, 0, sw.pop() + '-');
          }
        }
      }
      let line = words[0] + ' ';
      for(let j = 1; j < words.length; j++) {
        const
            l = line + words[j] + ' ',
            w = (l.length - 1) * scalar;
        if (w > width && j > 0) {
          const
              nl = line.trim(),
              nw = Math.floor(nl.length * scalar);
          multi.push(nl);
          // If width of added line exceeds the given width, adjust width
          // so that following lines fill out better
          width = Math.max(width, nw);
          line = words[j] + ' ';
        } else {
          line = l;
        }
      }
      line = line.trim();
      // NOTE: Chrome and Safari ignore empty lines in SVG text; as a workaround,
      // we add a non-breaking space to lines containing only whitespace
      if(!line) line = '\u00A0';
      multi.push(line);
    }
    return multi;  
  }
  
  sizeInBytes(n) {
    // Returns `n` as string scaled to the most appropriate unit of bytes
    n = Math.round(n);
    if(n < 1024) return n + ' B';
    let m = -1;
    while(n >= 1024) {
      m++;
      n /= 1024;
    }
    return VM.sig2Dig(n) + ' ' + 'kMGTP'.charAt(m) + 'B';
  }
  
  // Shapes are only used to draw model diagrams.
  
  createShape(mdl) {
    if(this.paper) return new Shape(mdl);
    return null;
  }
  
  moveShapeTo(shape, x, y) {
    if(shape) shape.moveTo(x, y);
  }
  
  removeShape(shape) {
    if(shape) shape.removeFromDOM();
  }

  // Methods to ensure proper naming of entities.

  cleanName(name) {
    // Returns `name` without backslashes, link arrows and leading and
    // trailing whitespace, and with all internal whitespace reduced to
    // a single space.
    name = name.replace(this.LINK_ARROW, ' ')
        .replace(/\||\\/g, ' ').trim().replace(/\s\s+/g, ' ');
    // NOTE: this may still result in a single space, which is not a name
    if(name === ' ') return '';
    return name;
  }
  
  validName(name) {
    // Returns TRUE if `name` is a valid CLAST entity name. These names
    // must not be empty strings, may not contain brackets, backslashes or
    // vertical bars, may not end with a colon, and must start with an
    // underscore, a letter or a digit.
    // These rules are enforced to avoid parsing issues with variable names.
    // NOTE: normalize to also accept letters with accents
    if(name === this.TOP_CLUSTER_NAME) return true;
    name = name.normalize('NFKD').trim();
    if(name.startsWith('$')) {
      const
          parts = name.substring(1).split(' '),
          flow = parts.shift(),
          aid = this.nameToID(parts.join(' ')),
          a = MODEL.actorByID(aid);
      return a && ['IN', 'OUT', 'FLOW'].indexOf(flow) >= 0;
    }
    return name && !name.match(/\[\\\|\]/) && !name.endsWith(':') &&
        (name.startsWith(this.BLACK_BOX) || name[0].match(/[\w]/));
  }
  
  prefixesAndName(name, key=false) {
    // Returns name split exclusively at '[non-space]: [non-space]'
    let sep = this.PREFIXER,
        space = ' ';
    if(key) {
      sep = ':_';
      space = '_';
    }
    const
        s = name.split(sep),
        pan = [s[0]];
    for(let i = 1; i < s.length; i++) {
      const j = pan.length - 1;
      if(s[i].startsWith(space) || (i > 0 && pan[j].endsWith(space))) {
        pan[j] += s[i];
      } else {
        pan.push(s[i]);
      }
    }
    return pan;
  }
  
  completePrefix(name) {
    // Returns the prefix part (including the final colon plus space),
    // or the empty string if none.
    const p = UI.prefixesAndName(name);
    p[p.length - 1] = '';
    return p.join(UI.PREFIXER);
  }
  
  sharedPrefix(n1, n2) {
    const
        pan1 = this.prefixesAndName(n1),
        pan2 = this.prefixesAndName(n2),
        l = Math.min(pan1.length - 1, pan2.length - 1),
        shared = [];
    let i = 0;
    while(i < l && ciCompare(pan1[i], pan2[i]) === 0) {
      // NOTE: if identical except for case, prefer "Abc" over "aBc" 
      shared.push(pan1[i] < pan2[i] ? pan1[i] : pan2[i]);
      i++;
    }
    return shared.join(this.PREFIXER);
  }
  
  colonPrefixedName(name, prefix) {
    // Replaces a leading colon in `name` by `prefix`.
    // If `name` identifies a link, this is applied to both node names.
    const nodes = name.split(this.LINK_ARROW);
    for(let i = 0; i < nodes.length; i++) {
      nodes[i] = nodes[i].replace(/^:\s*/, prefix)
          // NOTE: An embedded double prefix, e.g., "xxx: : yyy" indicates
          // that the second colon+space should be replaced by the prefix.
          // This "double prefix" may occur only once in an entity name,
          // hence no global regexp.
          .replace(/(\w+):\s+:\s+(\w+)/, `$1: ${prefix}$2`);
    }
    return nodes.join(this.LINK_ARROW);
  }
  
  tailNumber(name) {
    // Returns the string of digits at the end of `name`. If not there,
    // check prefixes (if any) *from right to left* for a tail number.
    // Thus, the number that is "closest" to the name part is returned.
    const pan = UI.prefixesAndName(name);
    let n = endsWithDigits(pan.pop());
    while(!n && pan.length > 0) {
      n = endsWithDigits(pan.pop());
    }
    return n;
  }
  
  compareFullNames(n1, n2, key=false) {
    // Compare full names, considering prefixes in *left-to-right* order
    // while taking into account the tailnumber for each part so that
    // "xx: yy2: nnn" comes before "xx: yy10: nnn".
    if(n1 === n2) return 0;
    if(key) {
      // NOTE: Replacing link arrows by two prefixers ensures that sort
      // will be first on FROM node, and then on TO node.
      const p2 = UI.PREFIXER + UI.PREFIXER;
      // Keys for links are not based on their names, so look up their
      // names before comparing.
      if(n1.indexOf('___') > 0 && MODEL.links[n1]) {
        n1 = MODEL.links[n1].displayName
            .replace(UI.LINK_ARROW, p2);
      }
      if(n2.indexOf('___') > 0 && MODEL.links[n2]) {
        n2 = MODEL.links[n2].displayName
            .replace(UI.LINK_ARROW, p2);
      }
      n1 = n1.toLowerCase().replaceAll(' ', '_');
      n2 = n2.toLowerCase().replaceAll(' ', '_');
    }
    const
        pan1 = UI.prefixesAndName(n1, key),
        pan2 = UI.prefixesAndName(n2, key),
        sl = Math.min(pan1.length, pan2.length);
    let i = 0;
    while(i < sl) {
      const c = compareWithTailNumbers(pan1[i], pan2[i]);
      if(c !== 0) return c;
      i++;
    }
    return pan1.length - pan2.length;
  }
  
  linkIdentifier(from, to) {
    // NOTES:
    // (1) A link ID has THREE underscores between its node IDs.
    // (2) A "deep" link can have clusters as nodes.
    const
        fid = (from instanceof Factor ? from.code : from.identifier),
        tid = (to instanceof Factor ? to.code : to.identifier);       
    return fid + '___' + tid;
  }

  nameToID(name) {
    // Return a name in lower case with link arrow replaced by three
    // underscores, and spaces converted to underscores; in this way,
    // IDs will always be valid JavaScript object properties.
    // NOTE: Links are a special case, because their IDs depend on the
    // *codes* of their nodes.
    if(name.indexOf(UI.LINK_ARROW) >= 0) {
      const obj = MODEL.objectByName(name);
      if(obj) return obj.identifier;
      // Empty string signals failure.
      return '';
    }
    // NOTE: Replace single quotes by Unicode apostrophe so that they
    // cannot interfere with JavaScript strings delimited by single quotes.
    return name.toLowerCase().replace(/\s/g, '_').replace("'", '\u2019');
  }
  
  // Methods to notify modeler
  
  notify(msg) {
    // Notifications are highlighted in blue, and sound a bell chime
    this.setMessage(msg, 'notification');
  }

  warn(msg, err=null) {
    // Warnings are highlighted in yellow, and sound a low beep
    this.setMessage(msg, 'warning', err);
  }

  alert(msg, err=null) {
    // Errors are highlighted in orange, and sound a "bloop" sound
    this.setMessage(msg, 'error', err);
  }
  
  // Alerts, parametrized warnings and notifications signalled in more than
  // one part of code
  
  warningInvalidName(n) {
    this.warn(`Invalid name "${n}"`);
    throw "ERROR";
  }
  
  warningEntityExists(e) {
    // NOTE: `e` can be NULL when an invalid name was specified when renaming
    if(e) {
      let msg = `${e.type} "${e.displayName}" already exists`;
      if(e.displayName === this.TOP_CLUSTER_NAME) {
        msg = 'System names cannot be used as entity name';
      }
      this.warn(msg);
    }
  }
  
  coloredResult(r) {
    // Return `r` as blue number, or as red code if exceptional.
    const clr = (Math.abs(r) >= -VM.ERROR ? '#a00000' : '#0000a0');
    return `<span style="color: ${clr}; font-family: monospace">${VM.sig4Dig(r)}</span>`;
  }
  
  resetModel() {
    // Reset the Virtual Machine (clears solution). 
    VM.reset();
    // Redraw model in the browser (GUI only).
    MODEL.clearSelection();
    this.clearStatusLine();
    MODEL.t = 0;
    UI.updateTimeStep();
  }

  get color() {
    // Permit shorthand "UI.color.xxx" without the ".paper" part.
    return this.paper.palette;
  }
  
  removeListeners(el) {
    // Remove all event listeners from DOM element `el`.
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    return clone;
  }
  
  addListeners() {
    // NOTE: "cc" stands for "canvas container"; this DOM element holds
    // the model diagram SVG.
    this.cc = document.getElementById('cc');
    this.cc.addEventListener('mousemove', (event) => UI.mouseMove(event));
    this.cc.addEventListener('mouseup', (event) => UI.mouseUp(event));
    this.cc.addEventListener('mousedown', (event) => UI.mouseDown(event));
    // NOTE: Responding to `mouseenter` is needed to update the cursor
    // position after closing a modal dialog.
    this.cc.addEventListener('mouseenter', (event) => UI.mouseMove(event));
    // Factors can be dragged from the Finder to add them to the focal cluster.
    this.cc.addEventListener('dragover', (event) => UI.dragOver(event));
    this.cc.addEventListener('drop', (event) => UI.drop(event));
    
    // Disable dragging on all images.
    const
        imgs = document.getElementsByTagName('img'),
        nodrag = (event) => { event.preventDefault(); return false; };
    for(let i = 0; i < imgs.length; i++) {          
      imgs[i].addEventListener('dragstart', nodrag);
    }

    // Make all buttons respond to a mouse click.
    this.buttons['new'].addEventListener('click',
        () => UI.promptForNewModel());
    this.buttons.load.addEventListener('click',
        () => FILE_MANAGER.promptToLoad());
    this.buttons.settings.addEventListener('click',
        () => UI.showSettingsDialog(MODEL));
    this.buttons.save.addEventListener('click',
        () => FILE_MANAGER.saveModel(event.shiftKey));
    this.buttons.savediagram.addEventListener('click',
        () => FILE_MANAGER.saveDiagramAsSVG(event.shiftKey));
    this.buttons.actors.addEventListener('click',
        () => ACTOR_MANAGER.showDialog());
    // NOTE: All draggable & resizable dialogs "toggle" show/hide.
    const tdf = (event) => UI.toggleDialog(event);
    this.buttons.finder.addEventListener('click', tdf);
    this.buttons.monitor.addEventListener('click', tdf);
    this.buttons.documentation.addEventListener('click', tdf);
    // Cycle button.
    this.buttons.cycle.addEventListener('click',
        () => UI.highlightCycle(event));
    // Cluster hierarchy navigation elements:
    this.focal_name.addEventListener('click',
        () => UI.showClusterPropertiesDialog(MODEL.focal_cluster));
    this.focal_name.addEventListener('mousemove',
        () => DOCUMENTATION_MANAGER.update(MODEL.focal_cluster, true));
    this.buttons.parent.addEventListener('click',
        () => UI.showParentCluster());
    this.buttons.lift.addEventListener('click',
        () => UI.moveSelectionToParentCluster());

    // Vertical tool bar buttons:
    this.buttons.clone.addEventListener('click',
        (event) => {
          if(event.altKey) {
            UI.promptForCloning();
          } else {
            UI.copySelection();
          }
        });
    this.buttons.paste.addEventListener('click',
        () => UI.pasteSelection());
    this.buttons['delete'].addEventListener('click',
        () => {
          UNDO_STACK.push('delete');
          MODEL.deleteSelection();
          UI.updateButtons();
        });
    this.buttons.undo.addEventListener('click',
        () => {
          if(UI.buttons.undo.classList.contains('enab')) {
            UNDO_STACK.undo();
            UI.updateButtons();
          }
        });
    this.buttons.redo.addEventListener('click',
        () => {
          if(UI.buttons.redo.classList.contains('enab')) {
            UNDO_STACK.redo();
            UI.updateButtons();
          }
        });
    this.buttons.solve.addEventListener('click', () => VM.solveModel());
    this.buttons.stop.addEventListener('click', () => VM.halt());
    this.buttons.reset.addEventListener('click', () => UI.resetModel());

    // Bottom-line GUI elements:
    this.buttons.zoomin.addEventListener('click', () => UI.paper.zoomIn());
    this.buttons.zoomout.addEventListener('click', () => UI.paper.zoomOut());
    this.buttons.stepback.addEventListener('click',
        (event) => UI.stepBack(event));
    this.buttons.stepforward.addEventListener('click',
        (event) => UI.stepForward(event));
    document.getElementById('prev-issue').addEventListener('click',
        () => UI.updateIssuePanel(-1));
    document.getElementById('issue-nr').addEventListener('click',
        () => UI.jumpToIssue());
    document.getElementById('next-issue').addEventListener('click',
        () => UI.updateIssuePanel(1));
    this.buttons.recall.addEventListener('click',
        // Recall button toggles the documentation dialog.
        () => UI.buttons.documentation.dispatchEvent(new Event('click')));
    this.buttons.autosave.addEventListener('click',
        // NOTE: TRUE indicates "show dialog after obtaining the model list".
        () => AUTO_SAVE.showRestoreDialog());
    this.buttons.autosave.addEventListener('mouseover',
        () => AUTO_SAVE.checkForSavedModels());

    // Make "stay active" buttons respond to Shift-click.
    const
        tbs = document.getElementsByClassName('toggle'),
        tf = (event) => UI.toggleButton(event);
    for(let i = 0; i < tbs.length; i++) {          
      tbs[i].addEventListener('click', tf);
    }

    // Add listeners to OK and CANCEL buttons on main modal dialogs.
    this.modals.model.ok.addEventListener('click',
        () => UI.createNewModel());
    this.modals.model.cancel.addEventListener('click',
        () => UI.modals.model.hide());

    this.modals.load.ok.addEventListener('click',
        () => FILE_MANAGER.loadModel());
    this.modals.load.cancel.addEventListener('click',
        () => UI.modals.load.hide());
    this.modals.load.element('autosaved-btn').addEventListener('click',
        () => AUTO_SAVE.showRestoreDialog());

    this.modals.settings.ok.addEventListener('click',
        () => UI.updateSettings(MODEL));
    // NOTE: Model Settings dialog has an information button in its header.
    this.modals.settings.info.addEventListener('click',
        () => {
            // Open the documentation manager if still closed.
            if(!DOCUMENTATION_MANAGER.visible) {
              UI.buttons.documentation.dispatchEvent(new Event('click'));
            }
            DOCUMENTATION_MANAGER.update(MODEL, true);
          });
    this.modals.settings.cancel.addEventListener('click',
        () => {
            UI.modals.settings.hide();
            // Ensure that model documentation can no longer be edited.
            DOCUMENTATION_MANAGER.clearEntity([MODEL]);
          });
    // Modals related to vertical toolbar buttons.
    this.modals['add-node'].ok.addEventListener('click',
        () => UI.addNode(''));
    this.modals['add-node'].cancel.addEventListener('click',
        () => UI.cancelAddNode());
    this.modals['add-node'].element('expression').addEventListener('click',
        () => UI.editEntityExpression());

    this.modals.note.ok.addEventListener('click',
        () => UI.addNode('note'));
    this.modals.note.cancel.addEventListener('click',
        () => UI.modals.note.hide());
    this.modals.clone.ok.addEventListener('click',
        () => UI.cloneSelection());
    this.modals.clone.cancel.addEventListener('click',
        () => UI.cancelCloneSelection());

    // EDIT LINK modal appears when a link is drawn or double-clicked.
    this.modals['edit-link'].ok.addEventListener('click',
        () => UI.updateLink());
    this.modals['edit-link'].cancel.addEventListener('click',
        () => UI.cancelEditLink());
    // The "edit" button opens the Expression Editor for the link multiplier.
    document.getElementById('edit-link-edit').addEventListener(
        'click', () => UI.editEntityExpression());

    // The MOVE dialog can appear when a factor or cluster is added.
    this.modals.move.ok.addEventListener('click',
        () => UI.moveNodeToFocalCluster());
    this.modals.move.cancel.addEventListener('click',
        () => UI.doNotMoveNode());
    
    // The PASTE dialog appears when name conflicts must be resolved.
    this.paste_modal = new ModalDialog('paste');
    this.paste_modal.ok.addEventListener('click',
        () => UI.setPasteMapping());
    this.paste_modal.cancel.addEventListener('click',
        () => UI.paste_modal.hide());
    
    // Ensure that clicking factor list modal cancels the connection.
    // NOTE: Clicking on list items generates mouse events for this modal.
    // Therefore, the connecting actions are called from this routine.
    // The necessary data is passed by the list elements.
    this.from_to_modal = document.getElementById('sub-factors-modal');
    this.from_to_modal.addEventListener('click',
        (event) => {
          // Abort making the connection only when modal is clicked, not
          //  when the list is clicked.
          if(event.target === UI.from_to_modal) {
            UI.connection_to_make.factor = '';
            UI.completeConnection();
          } else if(event.target.nodeName === 'TD') {
            // This can only occur when a sub-factor name is clicked.
            const ds = event.target.dataset;
            UI.connectFactor(ds.ft, ds.id); 
          }
        });
    
    // Make checkboxes respond to click.
    // NOTE: Checkbox-specific events must be bound AFTER this general setting.
    const
        cbs = document.getElementsByClassName('box'),
        cbf = (event) => UI.toggleBox(event);
    for(let i = 0; i < cbs.length; i++) {          
      cbs[i].addEventListener('click', cbf);
    }
    // Make infoline respond to `mouseenter`
    this.info_line = document.getElementById('info-line');
    this.info_line.addEventListener('mouseenter',
        (event) => DOCUMENTATION_MANAGER.showInfoMessages(event.shiftKey));
    // Ensure that all modal windows respond to ESCape
    // (and more in general to other special keys)
    document.addEventListener('keydown', (event) => UI.checkModals(event));
  }
  
  setLinkUnderCursor(l) {
    // Set link under cursor (if any).
    this.link_under_cursor = l;
    this.deep_link_info = '';
  }
  
  showDeepLinksUnderCursor(l) {
    // Show links represented by a thick arrow on the status line.
    const n = l.deep_links.length;
    if(n < 2) return;
    const html = [];
    for(let i = 0; i < n; i++) {
      html.push(l.deep_links[i].displayName);
    }
    this.deep_link_info = l.displayName +
        ` <em>represents ${n} links:</em> ${html.join(', ')}`;
  }
  
  updateControllerDialogs(letters) {
    if(letters.indexOf('F') >= 0) FINDER.updateDialog();
    if(letters.indexOf('I') >= 0) DOCUMENTATION_MANAGER.updateDialog();
    if(letters.indexOf('M') >= 0) MONITOR.updateDialog();
  }

  loadModelFromXML(xml) {
    // Parse `xml` and update the GUI.
    const loaded = MODEL.parseXML(xml);
    // If not a valid CLAST model, ensure that the current model is clean.
    if(!loaded) MODEL = new CLASTModel();
    this.drawDiagram(MODEL);
    if(FILE_MANAGER.last_file_extension === 'xfmv') {
      // Use the file name as model name.
      const parts = FILE_MANAGER.last_file_name.split('.');
      if(parts.length > 1) parts.pop();
      MODEL.name = parts.join('.');
      // Imported models tend to place nodes too far to the
      // left of the SVG diagram, so reposition them.
      this.paper.fitToSize();
    }
    // Reset the Virtual Machine.
    VM.reset();
    this.updateIssuePanel();
    this.updateButtons();
    // Undoable operations no longer apply!
    UNDO_STACK.clear();
    // Autosaving should start anew.
    AUTO_SAVE.setInterval();
    // Finder dialog is closed, but  may still display results for
    // previous model.
    FINDER.updateDialog();
    // Signal success or failure.
    return loaded;
  }
  
  makeFocalCluster(c) {
    const fc = MODEL.focal_cluster;
    MODEL.focal_cluster = c;
    MODEL.clearSelection(false);
    this.paper.drawModel(MODEL);
    this.updateButtons();
    // NOTE: When "moving up" in the cluster hierarchy, bring the former
    // focal cluster into view.
    if(fc.parent === MODEL.focal_cluster) {
      this.scrollIntoView(fc.shape.element.childNodes[0]);
    }
  }
  
  drawDiagram(mdl) {
    // "Queue" a draw request (to avoid redrawing too often).
    if(this.busy_drawing) {
      this.draw_requests += 1;
    } else {
      this.draw_requests = 0;
      this.busy_drawing = true;
      this.paper.drawModel(mdl);
      this.busy_drawing = false;
    }
  }

  drawSelection(mdl) {
    // "Queue" a draw request (to avoid redrawing too often)
    if(this.busy_drawing_selection) {
      this.selection_draw_requests += 1;
    } else {
      this.selection_draw_requests = 0;
      this.busy_drawing_selection = true;
      this.paper.drawSelection(mdl);
      this.busy_drawing_selection = false;
    }
  }
  
  drawObject(obj) {
    if(obj instanceof Factor) {
      this.paper.drawFactor(obj);
    } else if(obj instanceof Cluster) {
      this.paper.drawCluster(obj);
    } else if(obj instanceof Link) {
      this.paper.drawLink(obj);
    } else if(obj instanceof Note) {
      this.paper.drawNote(obj);
    }
  }
  
  clockTime(hrs, secs=true) {
    // Return real number `hrs` as dd hh:mm:ss where dd is the number of
    // days, and the seconds :ss are omitted when `secs` is FALSE.
    const sv = VM.specialValue(hrs);
    if(sv[0]) return sv[1];
    return hoursToString(hrs, secs);
  }

  updateTimeStep(t=MODEL.t) {
    // Display cycle tick `t` as the current cycle number.
    document.getElementById('step').innerText = t;
    document.getElementById('clock-time').innerHTML =
        `${this.clockTime(MODEL.simulationTime)}`;
  }
  
  stopSolving() {
    // Reset solver-related GUI elements and notify modeler.
    this.buttons.solve.classList.remove('off');
    this.buttons.stop.classList.remove('blink');
    this.buttons.stop.classList.add('off');
    // Update the time step on the status bar.
    this.updateTimeStep();
  }
  
  readyToSolve() {
    // Set Stop and Reset buttons to their initial state.
    UI.buttons.stop.classList.remove('blink');
    // Hide the reset button
    UI.buttons.reset.classList.add('off');   
  }
  
  startSolving() {
    // Hide Start button and show Stop button.
    UI.buttons.solve.classList.add('off');
    UI.buttons.stop.classList.remove('off');
  }
  
  waitToStop() {
    // Make Stop button blink to indicate "halting -- please wait".
    UI.buttons.stop.classList.add('blink');
  }
  
  readyToReset() {
    // Show the Reset button.
    UI.buttons.reset.classList.remove('off');
  }

  reset() {
    // Reset properties related to cursor position on diagram.
    this.on_node = null;
    this.on_cluster = null;
    this.on_link = null;
    this.on_factor = null;
    this.on_note = null;
    this.dragged_node = null;
    this.target_cluster = null;
    this.linking_factor = null;
    this.start_sel_x = -1;
    this.start_sel_y = -1;
  }

  updateIssuePanel(change=0) {
    const
        count = VM.issue_list.length,
        panel = document.getElementById('issue-panel');
    if(count > 0) {
      const
         prev = document.getElementById('prev-issue'),
         next = document.getElementById('next-issue'),
         nr = document.getElementById('issue-nr');
      panel.title = pluralS(count, 'issue') +
          ' occurred - click on number, \u25C1 or \u25B7 to view what and when';
      if(VM.issue_index === -1) {
        VM.issue_index = 0;
      } else if(change) {
        VM.issue_index = Math.min(VM.issue_index + change, count - 1);
      }
      nr.innerText = VM.issue_index + 1;
      if(VM.issue_index <= 0) {
        prev.classList.add('disab');
      } else {
        prev.classList.remove('disab');
      }
      if(VM.issue_index >= count - 1) {
        next.classList.add('disab');
      } else {
        next.classList.remove('disab');
      }
      panel.style.display = 'table-cell';
      if(change) UI.jumpToIssue();
    } else {
      panel.style.display = 'none';
      VM.issue_index = -1;
    }
  }
  
  jumpToIssue() {
    // Set time step to the one of the warning message for the issue
    // index, redraw the diagram if needed, and display the message
    // on the infoline.
    if(VM.issue_index >= 0) {
      const
          issue = VM.issue_list[VM.issue_index],
          po = issue.indexOf('(t='),
          pc = issue.indexOf(')', po),
          t = parseInt(issue.substring(po + 3, pc - 1));
      if(MODEL.t !== t) {
        MODEL.t = t;
        this.updateTimeStep();
        this.drawDiagram(MODEL);
      }
      this.info_line.classList.remove('error', 'notification');
      this.info_line.classList.add('warning');
      this.info_line.innerHTML = issue.substring(pc + 2);
    }
  }

  get doubleClicked() {
    // Return TRUE when a "double-click" occurred.
    const
        now = Date.now(),
        dt = now - this.last_up_down_without_move;
    this.last_up_down_without_move = now;
    // Consider click to be "double" if it occurred less than 300 ms ago
    if(dt < 300) {
      this.last_up_down_without_move = 0;
      return true;
    }
    return false;
  }
  
  hidden(id) {
    // Returns TRUE if element is not shown
    const el = document.getElementById(id);
    return window.getComputedStyle(el).display === 'none';
  }
  
  toggle(id, display='block') {
    // Hides element if shown; otherwise sets display mode
    const
        el = document.getElementById(id),
        h = window.getComputedStyle(el).display === 'none';
    el.style.display = (h ? display : 'none');
  }
  
  scrollIntoView(e) {
    // Scrolls container of DOM element `e` such that it becomes visible
    if(e) e.scrollIntoView({block: 'nearest', inline: 'nearest'});
  }

  //
  // Methods related to draggable & resizable dialogs
  //
  
  draggableDialog(d) {
    // Make dialog draggable
    const
        dlg = document.getElementById(d + '-dlg'),
        hdr = document.getElementById(d + '-hdr');
    let cx = 0,
        cy = 0;
    if(dlg && hdr) {
      // NOTE: dialogs are draggable only by their header
      hdr.onmousedown = dialogHeaderMouseDown;
      dlg.onmousedown = dialogMouseDown;
      return dlg;
    } else {
      console.log('ERROR: No draggable header element');
      return null;
    }
    
    function dialogMouseDown(e) {
      e = e || window.event;
      // NOTE: no `preventDefault` so the header will also receive it
      // Find the dialog element
      let de = e.target;
      while(de && !de.id.endsWith('-dlg')) { de = de.parentElement; }
      // Moves the dialog (`this`) to the top of the order
      const doi = UI.dr_dialog_order.indexOf(de);
      // NOTE: do not reorder when already at end of list (= at top)
      if(doi >= 0 && doi !== UI.dr_dialog_order.length - 1) {
        UI.dr_dialog_order.splice(doi, 1);
        UI.dr_dialog_order.push(de);
        UI.reorderDialogs();
      }
    }
  
    function dialogHeaderMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      // Find the dialog element
      let de = e.target;
      while(de && !de.id.endsWith('-dlg')) { de = de.parentElement; }
      // Record the affected dialog
      UI.dr_dialog = de;
      // Get the mouse cursor position at startup
      cx = e.clientX;
      cy = e.clientY;
      document.onmouseup = stopDragDialog;
      document.onmousemove = dialogDrag;
    }
  
    function dialogDrag(e) {
      e = e || window.event;
      e.preventDefault();
      // Calculate the relative movement of the mouse cursor...
      const
          dx = cx - e.clientX,
          dy = cy - e.clientY;
      // ... and record the new mouse cursor position
      cx = e.clientX;
      cy = e.clientY;
      // Move the entire dialog, but prevent it from being moved outside the window
      UI.dr_dialog.style.top = Math.min(
          window.innerHeight - 40, Math.max(0, UI.dr_dialog.offsetTop - dy)) + 'px';
      UI.dr_dialog.style.left = Math.min(
          window.innerWidth - 40,
              Math.max(-210, UI.dr_dialog.offsetLeft - dx)) + 'px';
    }
  
    function stopDragDialog() {
      // Stop moving when mouse button is released
      document.onmouseup = null;
      document.onmousemove = null;
      // Preserve position as data attributes
      UI.dr_dialog.setAttribute('data-top', UI.dr_dialog.style.top);
      UI.dr_dialog.setAttribute('data-left', UI.dr_dialog.style.left);
    }
  }
  
  resizableDialog(d, mgr=null) {
    // Make dialog resizable (similar to dragElement above)
    const
        dlg = document.getElementById(d + '-dlg'),
        rsz = document.getElementById(d + '-resize');
    let w = 0,
        h = 0,
        minw = 0,
        minh = 0,
        cx = 0,
        cy = 0;
    if(dlg && rsz) {
      if(mgr) dlg.setAttribute('data-manager', mgr);
      rsz.onmousedown = resizeMouseDown;
    } else {
      console.log('ERROR: No resizing corner element');
      return false;
    }
  
    function resizeMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      // Find the dialog element
      let de = e.target;
      while(de && !de.id.endsWith('-dlg')) { de = de.parentElement; }
      UI.dr_dialog = de;
      // Get the (min.) weight, (min.) height and mouse cursor position at startup
      const cs = window.getComputedStyle(UI.dr_dialog);
      w = parseFloat(cs.width);
      h = parseFloat(cs.height);
      minw = parseFloat(cs.minWidth);
      minh = parseFloat(cs.minHeight);
      cx = e.clientX;
      cy = e.clientY;
      document.onmouseup = stopResizeDialog;
      document.onmousemove = dialogResize;
    }
  
    function dialogResize(e) {
      e = e || window.event;
      e.preventDefault();
      // Calculate the relative mouse cursor movement
      const
          dw = e.clientX - cx,
          dh = e.clientY - cy;
      // Set the dialog's new size
      UI.dr_dialog.style.width = Math.max(minw, w + dw) + 'px';
      UI.dr_dialog.style.height = Math.max(minh, h + dh) + 'px';
      // Update the dialog if its manager has been specified
      const mgr = UI.dr_dialog.dataset.manager;
      if(mgr) window[mgr].updateDialog();
    }
  
    function stopResizeDialog() {
      // Stop moving when mouse button is released
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }
  
  toggleDialog(e) {
    // Hide dialog if visible, or show it if not, and update the
    // order of appearance so that this dialog appears on top
    e = e || window.event;
    e.preventDefault();
    e.stopImmediatePropagation();
    // Infer dialog identifier from target element
    const
        dlg = e.target.id.split('-')[0],
        tde = document.getElementById(dlg + '-dlg');
    // NOTE: manager attribute is a string, e.g. 'MONITOR' or 'CHART_MANAGER'
    let mgr = tde.dataset.manager,
        was_hidden = this.hidden(tde.id);
    if(mgr) {
      // Dialog has a manager object => let `mgr` point to it
      mgr = window[mgr];
      // Manager object attributes are more reliable than DOM element
      // style attributes, so update the visibility status
      was_hidden = !mgr.visible;
    }
    // Otherwise, toggle the dialog visibility
    this.toggle(tde.id);
    UI.buttons[dlg].classList.toggle('stay-activ');
    if(mgr) mgr.visible = was_hidden;
    let t, l;
    if(top in tde.dataset && left in tde.dataset) {
      // Open at position after last drag (recorded in DOM data attributes)
      t = tde.dataset.top;
      l = tde.dataset.left;
    } else {
      // Make dialog appear in screen center the first time it is shown
      const cs = window.getComputedStyle(tde);
      t = ((window.innerHeight - parseFloat(cs.height)) / 2) + 'px';
      l = ((window.innerWidth - parseFloat(cs.width)) / 2) + 'px';
      tde.style.top = t;
      tde.style.left = l;
    }
    if(was_hidden) {
      // Add activated dialog to "showing" list, and adjust z-indices
      this.dr_dialog_order.push(tde);
      this.reorderDialogs();
      // Update the diagram if its manager has been specified
      if(mgr) {
        mgr.updateDialog();
        if(mgr === DOCUMENTATION_MANAGER) {
          if(this.info_line.innerHTML.length === 0) {
            mgr.title.innerHTML = 'About CLAST';
            mgr.viewer.innerHTML = mgr.about_CLAST;
            mgr.edit_btn.classList.remove('enab');
            mgr.edit_btn.classList.add('disab');
          }
          UI.drawDiagram(MODEL);
        }
      }
    } else {
      const doi = this.dr_dialog_order.indexOf(tde);
      // NOTE: doi should ALWAYS be >= 0 because dialog WAS showing
      if(doi >= 0) {
        this.dr_dialog_order.splice(doi, 1);
        this.reorderDialogs();
      }
      if(mgr === DOCUMENTATION_MANAGER) {
        mgr.title.innerHTML = 'Documentation';
        UI.drawDiagram(MODEL);
      }
    }
  }
  
  reorderDialogs() {
    // Set z-index of draggable dialogs according to their order
    // (most recently shown or clicked on top)
    let z = 10;
    for(let i = 0; i < this.dr_dialog_order.length; i++) {
      this.dr_dialog_order[i].style.zIndex = z;
      z += 5;
    }
  }
  
  //
  // Node rim functionality (for factors and clusters)
  //
  
  nodeRim(fr) {
    let rim = fr,
        node = MODEL.objectByID(rim.dataset.id);
    rim.onmouseover = rimMouseOver;
    rim.onmouseout = rimMouseOut;
    rim.onmousedown = rimMouseDown;

    function rimMouseOver() {
      // Do not respond when linkins is not enabled.
      if(!UI.canLink()) return;
      // Do not respond when connecting from the same node, or from a
      // cluster containing no factors, or when a link between the nodes
      // exists (in either direction).
      if(node === UI.from_node ||
          (node instanceof Cluster && !node.factors.length) ||
          MODEL.areLinked(UI.from_node, node)) {
        UI.to_node = null;
          rim.style.cursor = 'not-allowed';
      } else {
        rim.style.cursor = 'crosshair';
        if(node === UI.from_node) {
          // Highlight node in blue when connecting *from* this node.
          rim.style.stroke = UI.color.from_rim;
        } else {
          // Otherwise, highlight in "connecting" blue.
          rim.style.stroke = UI.color.to_rim;
          UI.to_node = node;
        }
      }
      UI.deep_link_info = node.displayName;
    }

    function rimMouseOut() {
      // Do not respond when linkins is not enabled.
      if(!UI.canLink()) return;
      // De-highlight node rim unless connecting from this node.
      if(node !== UI.from_node) {
        rim.style.stroke = UI.color.transparent;
        UI.to_node = null;
      }
      UI.deep_link_info = '';
      rim.style.cursor = 'default';
    }

    function rimMouseDown(e) {
      // Do not respond when linkins is not enabled.
      if(!UI.canLink()) return;
      e = e || window.event;
      e.preventDefault();
      e.stopPropagation();
      // Only permit connecting from a factor or from a cluster having
      // sub-factors.
      if(node instanceof Factor ||
          (node instanceof Cluster && node.factors.length)) {
        UI.from_node = node;
        UI.to_node = null;
        document.onmouseup = stopMakeConnection;
        document.onmousemove = makeConnection;
        rim.style.stroke = UI.color.from_rim;
      } else {
        UI.from_node = null;
        UI.to_node = null;
      }
    }
  
    function makeConnection(e) {
      e = e || window.event;
      e.preventDefault();
      e.stopPropagation();
      UI.updateCursorPosition(e);
      // TO point is the cursor position...
      let tp = {x: UI.mouse_x, y: UI.mouse_y};
      // ... unless the cursor is over a suitable node.
      let tn = UI.to_node;
      if(tn) tp = tn.connectionPoint(UI.from_node);
      const fp = UI.from_node.connectionPoint(tp);
      UI.paper.dragLineToCursor(fp, tp);
    }
  
    function stopMakeConnection(e) {
      // Stop moving when mouse button is released
      e.preventDefault();
      e.stopPropagation();
      document.onmouseup = null;
      document.onmousemove = null;
      UI.updateCursorPosition(e);
      // Store connection data so it will not be erased by mouse events.
      const ctm = {
          fnode: UI.from_node,
          tnode: UI.to_node,
          ffact: null,
          tfact: null,
          fsub: [],
          tsub: [] 
        };
      if(ctm.fnode instanceof Cluster) {
        ctm.fsub = ctm.fnode.allFactors;
        ctm.ffact = ctm.fnode;
      } else {
        ctm.ffact = ctm.fnode;
      }
      if(ctm.tnode instanceof Cluster) {
        ctm.tsub = ctm.tnode.allFactors;
        ctm.tfact = ctm.tnode;
      } else {
        ctm.tfact = ctm.tnode;
      }
      UI.connection_to_make = ctm;
      if(ctm.fsub.length || ctm.tsub.length) {
        // Prompt modeler to specify which sub-factor to link from/to.
        UI.promptForFactors();
      } else {
        // Complete, or abort when FROM/TO data is incomplete.
        UI.completeConnection();
      }
    }
  }

  completeConnection() {
    // Terminate the connection process.
    // Always hide dashed dragline arrow.
    this.paper.hideDragLine();
    // Ensure that dragline events are reset.
    document.onmouseup = null;
    document.onmousemove = null;
    // Always hide the sub-factors list (but it may not be showing).
    this.from_to_modal.style.display = 'none';
    const ctm = this.connection_to_make;
    // Only add the connection when it is fully specified.
    if(ctm.ffact && ctm.tfact) {
      const l = MODEL.addLink(ctm.ffact, ctm.tfact);
      if(ctm.fsub.length || ctm.tsub.length) {
        // Connection with an invisible sub-factor.
        UI.notify(`Added link: ${l.displayName}`);
        UI.paper.drawModel(MODEL);
      } else {
        // Normal connection between visible factors
        // NOTE: Draw link with both nodes.
        this.drawObject(l.from_factor);
        this.drawObject(l.to_factor);
        this.drawObject(l);
      }
      MODEL.cleanUpFeedbackLinks();
    }
    // Terminate the connection process.
    this.connection_to_make = null;
    this.from_node = null;
    this.to_node = null;
  }
  
  factorTable(sub, from_to) {
    // Return HTML for table with sub-factor names.
    const
        names = [],
        html = [];
    for(let i = 0; i < sub.length; i++) {
      names.push(sub[i].displayName);
    }
    const sn = names.sort((a, b) => UI.compareFullNames(a, b));
    for(let i = 0; i < sn.length; i++) {
      const tid = this.nameToID(sn[i]);
      html.push(`<tr class="list"><td data-ft="${from_to}" data-id="${tid}">` + 
          `${sn[i]}</td></tr>`);
    }
    return html.join('');
  }

  promptForFactors() {
    // Display list of sub-factors to choose from.
    // If none is selected (mouseout without click), no connection is made.
    const ctm = this.connection_to_make;
    if(ctm) {
      const
          le = document.getElementById('sub-factors-list'),
          fe = document.getElementById('sub-factors-from'),
          te = document.getElementById('sub-factors-to'),
          tlbl = document.getElementById('sub-factors-to-lbl'),
          ftbl = document.getElementById('sub-factors-from-table'),
          ttbl = document.getElementById('sub-factors-to-table');
      let max = 0;
      tlbl.innerText = `To:`;
      if(ctm.fsub.length) {
        max = ctm.fsub.length;
        ftbl.innerHTML = this.factorTable(ctm.fsub, 'from');
        fe.style.display = 'inline-block';
      } else {
        fe.style.display = 'none';        
      }
      if(ctm.tsub.length) {
        max = Math.max(max, ctm.tsub.length);
        ttbl.innerHTML = this.factorTable(ctm.tsub, 'to');
        te.style.display = 'inline-block';
      } else {
        te.style.display = 'none';        
      }
      // Position the pop-up list.
      const
          dx = ctm.tfact.width / 2,
          dy = 0,
          zf = this.paper.zoom_factor,
          // List height depends on highest number of sub-factors.
          lh = 19 * max + 28;
      le.style.top = Math.max(this.page_y - dy / zf - lh, 45) + 'px';
      le.style.left = (this.page_x + dx / zf) + 'px';
      // Display list on top of a near-transparent DIV to prevent
      // interaction with other screen elements.
      this.from_to_modal.style.display = 'block';
    }
  }
  
  connectFactor(from_to, id) {
    // Connect to the selected sub-factor, or abort if not recognized.
    const
        ctm = this.connection_to_make,
        f = MODEL.factorByID(id);
    if(!f) {
      this.alert(`No factor with ID "${id}"`);
    } else if(from_to === 'from') {
      ctm.ffact = f;
    } else {
      ctm.tfact = f;
    }
    document.getElementById('sub-factors-' + from_to)
        .style.display = 'none';
    this.completeConnection();
  }
  
  //
  // Button functionality
  //
  
  enableButtons(btns) {
    btns = btns.trim().split(/\s+/);
    for(let i = 0; i < btns.length; i++) {
      const b = document.getElementById(btns[i] + '-btn');
      b.classList.remove('disab', 'activ');
      b.classList.add('enab');
    }
  }
  
  disableButtons(btns) {
    btns = btns.trim().split(/\s+/);
    for(let i = 0; i < btns.length; i++) {
      const b = document.getElementById(btns[i] + '-btn'); 
      b.classList.remove('enab', 'activ', 'stay-activ');
      b.classList.add('disab');
    }
  }
  
  updateButtons() {
    // Updates the buttons on the main GUI toolbars
    const
        node_btns = 'factor cluster link note ',
        edit_btns = 'clone paste delete undo redo ',
        model_btns = 'settings save savediagram finder monitor solve';
    if(MODEL === null) {
      this.disableButtons(node_btns + edit_btns + model_btns);
      return;
    }
    if(MODEL.focal_cluster === MODEL.top_cluster) {
      this.focal_cluster.style.display = 'none';
    } else {
      this.focal_name.innerHTML = MODEL.focal_cluster.displayName;
      if(MODEL.selection.length > 0) {
        this.enableButtons('lift');
      } else {
        this.disableButtons('lift');
      }
      this.focal_cluster.style.display = 'inline-block';
    }
    this.enableButtons(node_btns + model_btns);
    this.active_button = this.stayActiveButton;
    this.disableButtons(edit_btns);
    if(MODEL.selection.length > 0) this.enableButtons('clone delete');
    if(this.canPaste) this.enableButtons('paste');
    // Only allow solving when events can occur.
    if(MODEL.hasTargets) this.enableButtons('solve');
    var u = UNDO_STACK.canUndo;
    if(u) {
      this.enableButtons('undo');
      this.buttons.undo.title = u;
    } else {
      this.buttons.undo.title = 'Undo not possible';
    }
    u = UNDO_STACK.canRedo;
    if(u) {
      this.enableButtons('redo');
      this.buttons.redo.title = u;
    } else {
      this.buttons.redo.title = 'Redo not possible';
    }
  }
  
  // NOTE: Active buttons allow repeated "clicks" on the canvas
  
  get stayActive() {
    if(this.active_button) {
      return this.active_button.classList.contains('stay-activ');
    }
    return false;
  }
  
  resetActiveButton() {
    if(this.active_button) {
      this.active_button.classList.remove('activ', 'stay-activ');
    }
    this.active_button = null;
  }
  
  get stayActiveButton() {
    // Return the button that is "stay active", or NULL if none 
    const btns = ['factor', 'cluster', 'link', 'note'];
    for(let i = 0; i < btns.length; i++) {
      const b = document.getElementById(btns[i] + '-btn');
      if(b.classList.contains('stay-activ')) return b;
    }
    return null;
  }
  
  toggleButton(e) {
    if(e.target.classList.contains('disab')) return;
    let other = true;
    if(this.active_button) {
      other = (e.target !== this.active_button);
      this.resetActiveButton();
    }
    if(other && (e.target.classList.contains('enab'))) {
      if(e.target === this.buttons.link) {
        this.canLink(true);
      } else{
        e.target.classList.add(e.shiftKey ? 'stay-activ' : 'activ');
        this.active_button = e.target;
      }
    }
    // Update the "linking" state.
    this.canLink();
  }
  
  canLink(toggle=false) {
    // Return TRUE if the "link" button is active.
    const lb = this.buttons.link;
    let can = (this.active_button === lb);
    if(toggle) {
      can = !can;
      this.resetActiveButton();
      MODEL.clearSelection();
      this.on_node = false;
    }
    if(can) {
      lb.title = "Disable linking";
      lb.classList.add('stay-activ');
      this.active_button = lb;
    } else {
      lb.title = "Enable linking";
      lb.classList.remove('stay-activ');
    }
    return can;
  }

  //
  // Handlers for mouse/cursor events
  //
  
  updateCursorPosition(e) {
    // Update the cursor coordinates and display. them on the status bar.
    // NOTE: Also store the screen coordinates to facilitate pop-up lists.
    this.page_x = e.pageX - window.scrollX - document.body.scrollLeft;
    this.page_y = e.pageY - window.scrollY - document.body.scrollTop;
    const cp = this.paper.cursorPosition(e.pageX, e.pageY);
    this.mouse_x = cp[0];
    this.mouse_y = cp[1];
    document.getElementById('pos-x').innerHTML = 'X = ' + this.mouse_x;
    document.getElementById('pos-y').innerHTML = 'Y = ' + this.mouse_y;
    this.on_node = null;
    this.on_note = null;
    this.on_cluster = null;
    this.on_factor= null;
    this.on_link = null;
  }

  mouseMove(e) {
    // Responds to mouse cursor moving over CLAST diagram area.
    this.updateCursorPosition(e);
    
    // NOTE: check, as MODEL might still be undefined
    if(!MODEL) return;
    
    //console.log(e);
    const fc = MODEL.focal_cluster;
    if(fc.relatedLinks.indexOf(this.link_under_cursor) >= 0) {
      this.on_link = this.link_under_cursor;
    }
    for(let i = fc.factors.length-1; i >= 0; i--) {
      const f = fc.factors[i];
      if(f.containsPoint(this.mouse_x, this.mouse_y)) {
        this.on_node = f;
        this.on_factor = f;
        break;
      }
    }
    for(let i = fc.sub_clusters.length-1; i >= 0; i--) {
      const c = fc.sub_clusters[i];
      // NOTE: Ignore cluster that is being dragged, so that a cluster
      // it is being dragged over will be detected instead.
      if(c != this.dragged_node &&
          c.containsPoint(this.mouse_x, this.mouse_y)) {
        this.on_node = c;
        this.on_cluster = c;
        break;
      }
    }
    // Unset and redraw target cluster if cursor no longer over it.
    if(!this.on_cluster && this.target_cluster) {
      const c = this.target_cluster;
      this.target_cluster = null;
      UI.paper.drawCluster(c);
      // NOTE: Element is persistent, so semi-transparency must also be
      // undone.
      c.shape.element.setAttribute('opacity', 1);
    }
    for(let i = fc.notes.length-1; i >= 0; i--) {
      const n = fc.notes[i];
      if(n.containsPoint(this.mouse_x, this.mouse_y)) {
        this.on_note = n;
        break;
      }
    }
    if(this.start_sel_x >= 0 && this.start_sel_y >= 0) {
      // Draw selecting rectangle in red dotted lines.
      this.paper.dragRectToCursor(this.start_sel_x, this.start_sel_y,
          this.mouse_x, this.mouse_y);
    } else if(this.dragged_node) {
      if(MODEL.selection.length) {
        MODEL.moveSelection(
            this.mouse_x - this.move_dx - this.dragged_node.x,
            this.mouse_y - this.move_dy - this.dragged_node.y);
      } else {
        this.dragged_node = null;
      }
    }
    let cr = 'pointer';
    const on_entity = (this.on_factor || this.on_link || this.on_cluster);
    if(on_entity) {
      DOCUMENTATION_MANAGER.update(on_entity, e.shiftKey);
    } else if(this.on_note) {
      // When shift-moving over a note, show the model's documentation.
      DOCUMENTATION_MANAGER.update(MODEL, e.shiftKey);
    } else {
      cr = 'default';
    }
    // When dragging selection that contains a factor or cluster, change
    // cursor to indicate that selected nodes will be moved into the target.
    if(this.dragged_node) {
      if(this.on_cluster) {
        cr = 'cell';
        this.target_cluster = this.on_cluster;
        // Redraw the target cluster so it will appear on top (and
        // highlighted).
        UI.paper.drawCluster(this.target_cluster);
      } else {
        cr = 'grab';
      }
    }
    this.paper.container.style.cursor = cr;
  }

  mouseDown(e) {
    // Responds to mousedown event in model diagram area.
    // In case mouseup event occurred outside drawing area,ignore this
    // mousedown event, so that only the mouseup will be processed.
    if(this.start_sel_x >= 0 && this.start_sel_y >= 0) return;
    const cp = this.paper.cursorPosition(e.pageX, e.pageY);
    this.mouse_down_x = cp[0];
    this.mouse_down_y = cp[1];
    // De-activate "stay active" buttons if dysfunctional, or if SHIFT,
    // ALT or CTRL is pressed.
    if((e.shiftKey || e.altKey || e.ctrlKey ||
        this.on_note || this.on_factor || this.on_cluster || this.on_link) &&
            this.stayActive) {
      this.resetActiveButton();
    }
    // NOTE: Only left button is detected (browser catches right menu button).
    if(e.ctrlKey) {
      // Remove clicked item from selection
      if(MODEL.selection) {
        // NOTE: First check links -- see mouseMove() for motivation.
        if(this.on_link) {
          if(MODEL.selection.indexOf(this.on_link) >= 0) {
            MODEL.deselect(this.on_link);
          } else {
            MODEL.select(this.on_link);
          }
        } else if(this.on_factor){
          if(MODEL.selection.indexOf(this.on_factor) >= 0) {
            MODEL.deselect(this.on_factor);
          } else {
            MODEL.select(this.on_factor);
          }
        } else if(this.on_cluster){
          if(MODEL.selection.indexOf(this.on_cluster) >= 0) {
            MODEL.deselect(this.on_cluster);
          } else {
            MODEL.select(this.on_cluster);
          }
        } else if(this.on_note) {
          if(MODEL.selection.indexOf(this.on_note) >= 0) {
            MODEL.deselect(this.on_note);
          } else {
            MODEL.select(this.on_note);
          }
        }
        UI.drawDiagram(MODEL);
      }
      this.updateButtons();
      return;
    } // END IF Ctrl
  
    // Clear selection unless SHIFT pressed or mouseDown while hovering
    // over a SELECTED node or link.
    if(!(e.shiftKey ||
        (this.on_factor && MODEL.selection.indexOf(this.on_factor) >= 0) ||
        (this.on_cluster && MODEL.selection.indexOf(this.on_cluster) >= 0) ||
        (this.on_note && MODEL.selection.indexOf(this.on_note) >= 0) ||
        (this.on_link && MODEL.selection.indexOf(this.on_link) >= 0))) {
      MODEL.clearSelection();
    }
  
    // If one of the "add" sidebar buttons is active, prompt for new node.
    if(this.active_button) {
      this.add_x = this.mouse_x;
      this.add_y = this.mouse_y;
      const obj = this.active_button.id.split('-')[0];
      if(!this.stayActive) this.resetActiveButton();
      this.edited_object = null;
      if(obj === 'factor' || obj === 'cluster') {
        setTimeout(() => {
              const md = UI.modals['add-node'];
              md.element('type').innerText = obj;
              UI.showNodePropertiesDialog();
            });
      } else if(obj === 'note') {
        setTimeout(() => {
              const md = UI.modals.note;
              md.element('action').innerHTML = 'Add';
              md.element('text').value = '';
              md.show('text');
            });
      }
      return;
    }
    // ALT key pressed => open properties dialog if cursor hovers over
    // some element.
    if(e.altKey) {
      // NOTE: First check links -- see mouseMove() for motivation.
      if(this.on_link) {
        this.showLinkPropertiesDialog(this.on_link);
      } else if(this.on_factor) {
        this.showNodePropertiesDialog(this.on_factor);
      } else if(this.on_cluster) {
        this.showNodePropertiesDialog(this.on_cluster);
      } else if(this.on_note) {
        this.showNotePropertiesDialog(this.on_note);
      }
    // NOTE: First check links -- see mouseMove() for motivation.
    } else if(this.on_link) {
      MODEL.select(this.on_link);
    } else if(this.on_note) {
      this.dragged_node = this.on_note;
      this.move_dx = this.mouse_x - this.on_note.x;
      this.move_dy = this.mouse_y - this.on_note.y;
      MODEL.select(this.on_note);
      UNDO_STACK.push('move', this.dragged_node, true);
    // Cursor on node => start moving.
    } else if(this.on_node) {
      this.dragged_node = this.on_node;
      this.move_dx = this.mouse_x - this.on_node.x;
      this.move_dy = this.mouse_y - this.on_node.y;
      // NOTE: Do not select when already in selection.
      if(MODEL.selection.indexOf(this.on_node) < 0) {
        MODEL.select(this.on_node);
      }
      // Pass dragged node for UNDO.
      UNDO_STACK.push('move', this.dragged_node, true);
    } else { 
      this.dragged_node = null;
      this.start_sel_x = this.mouse_x;
      this.start_sel_y = this.mouse_y;
    }
    this.updateButtons();
  }

  mouseUp(e) {
    // Responds to mouseup event.
    const
        cp = this.paper.cursorPosition(e.pageX, e.pageY),
        d_click = this.doubleClicked;
    this.mouse_up_x = cp[0];
    this.mouse_up_y = cp[1];
    // First check whether user is selecting a rectangle.
    if(this.start_sel_x >= 0 && this.start_sel_y >= 0) {
      // Clear previous selection unless user is adding to it (by still
      // holding SHIFT button down).
      if(!e.shiftKey) MODEL.clearSelection();
      // Compute defining points of rectangle (top left and bottom right).
      const
          tlx = Math.min(this.start_sel_x, this.mouse_up_x),
          tly = Math.min(this.start_sel_y, this.mouse_up_y),
          brx = Math.max(this.start_sel_x, this.mouse_up_x),
          bry = Math.max(this.start_sel_y, this.mouse_up_y);
      // If rectangle has size greater than 2x2 pixels, select all elements
      // having their center inside the selection rectangle.
      if(brx - tlx > 2 && bry - tly > 2) {
        const
            ol = [],
            fc = MODEL.focal_cluster,
            fl = fc.factors;
        for(let i = 0; i < fl.length; i++) {
          const f = fl[i];
          if(f.x >= tlx && f.x <= brx && f.y >= tly && f.y < bry) {
            ol.push(f);
          }
        }
        for(let i = 0; i < fc.sub_clusters.length; i++) {
          const c = fc.sub_clusters[i];
          if(c.x >= tlx && c.x <= brx && c.y >= tly && c.y < bry) {
            ol.push(c);
          }
        }
        for(let i = 0; i < fc.notes.length; i++) {
          const n = fc.notes[i];
          if(n.x >= tlx && n.x <= brx && n.y >= tly && n.y < bry) {
            ol.push(n);
          }
        }
        for(let i in MODEL.links) if(MODEL.links.hasOwnProperty(i)) {
          const l = MODEL.links[i];
          // Only add a link if both its nodes are selected as well.
          if(l.inList(ol)) ol.push(l);
        }
        // Having compiled the object list, actually select them.
        MODEL.selectList(ol);
        this.paper.drawSelection(MODEL);
      }
      this.start_sel_x = -1;
      this.start_sel_y = -1;
      this.paper.hideDragRect();
    
    // Then check whether the user is moving a node (possibly part of a
    // larger selection).
    } else if(this.dragged_node) {
      // Always perform the move operation (this will do nothing if the
      // cursor did not move).
      MODEL.moveSelection(
          this.mouse_up_x - this.mouse_x, this.mouse_up_y - this.mouse_y);
      // Set cursor to pointer, as it should be on some node while dragging.
      this.paper.container.style.cursor = 'pointer';
      // NOTE: Cursor will always be over the selected node (while dragging).
      if(this.on_cluster && !this.on_cluster.selected) {
        UNDO_STACK.push('drop', this.on_cluster);
        MODEL.dropSelectionIntoCluster(this.on_cluster);
        // Redraw cluster to erase its orange "target corona".
        // NOTE: This means that the target must be set to NULL first.
        this.target_cluster = null;
        UI.paper.drawCluster(this.on_cluster);
        // Reset the rest as well.
        this.on_cluster = null;
        this.on_note = null;
        this.dragged_node = null;
      }
  
      // Check wether the cursor has been moved.
      const
          absdx = Math.abs(this.mouse_down_x - this.mouse_x),
          absdy = Math.abs(this.mouse_down_y - this.mouse_y);
      // If no *significant* move made, remove the move undo.
      if(absdx + absdy === 0) UNDO_STACK.pop('move');
      if(d_click && absdx + absdy < 3) {
        // Double-clicking opens properties dialog, except for clusters;
        // then "drill down", i.e., make the double-clicked cluster focal.
        if(this.dragged_node instanceof Cluster) {
          // NOTE: Alt-(double)click indicates "show properties"!
          if(e.altKey) {
            this.showNodePropertiesDialog(this.dragged_node);
          } else {
            this.makeFocalCluster(this.dragged_node);
          }
        } else if(this.dragged_node instanceof Factor) {
          this.showNodePropertiesDialog(this.dragged_node);
        } else {
          this.showNotePropertiesDialog(this.dragged_node);
        }
      }
      this.dragged_node = null;
    
    // Then check whether the user is clicking on a link.
    } else if(this.on_link && (e.altKey || d_click)) {
      this.showLinkPropertiesDialog(this.on_link);
    }
    this.start_sel_x = -1;
    this.start_sel_y = -1;
    this.updateButtons();
  }
  
  dragOver(e) {
    // Accept factors and clusters that are dragged from the Finder
    // if they are not already in the focal cluster.
    this.updateCursorPosition(e);
    const
        id = e.dataTransfer.getData('text'),
        obj = MODEL.factors[id] || MODEL.clusters[id];
    if(obj && obj.parent !== MODEL.focal_cluster) e.preventDefault();
  }

  drop(e) {
    // Prompt to move the object that is being dragged from the Finder
    // to the focal cluster at the cursor position.
    const
        id = e.dataTransfer.getData('text'),
        obj = MODEL.factors[id] || MODEL.clusters[id];
    if(obj && obj.parent !== MODEL.focal_cluster) {
      e.preventDefault();
      if(obj instanceof Cluster) {
        this.confirmToMoveCluster(obj.parent);
      } else {
        this.confirmToMoveFactor(obj.parent);
      }
    } else
    // NOTE: Update afterwards, as the modeler may target a precise (X, Y).
    this.updateCursorPosition(e);
  }

  //
  // Handler for keyboard events
  //
  
  checkModals(e) {
    // Respond to Escape, Enter and shortcut keys.
    const
        ttype = e.target.type,
        ttag = e.target.tagName,
        modals = document.getElementsByClassName('modal');
    // Modal dialogs: hide on ESC and move to next input on ENTER.
    let maxz = 0,
        topmod = null,
        code = e.code,
        alt = e.altKey;
    for(let i = 0; i < modals.length; i++) {
      const
          m = modals[i],
          cs = window.getComputedStyle(m),
          z = parseInt(cs.zIndex);
      if(cs.display !== 'none' && z > maxz) {
        topmod = m;
        maxz = z;
      }
    }
    // NOTE: Consider only the top modal (if any is showing).
    if(code === 'Escape') {
      e.stopImmediatePropagation();
      if(topmod) {
        if(topmod === this.from_to_modal) {
          // Abort making the connection.
          this.connection_to_make.tfact = null;
          this.completeConnection();
        }
        topmod.style.display = 'none';
      }
    } else if(code === 'Enter' && ttype !== 'textarea') {
      e.preventDefault();
      if(topmod) {
        const inp = Array.from(topmod.getElementsByTagName('input'));
        let i = inp.indexOf(e.target) + 1;
        while(i < inp.length && inp[i].disabled) i++;
        if(i < inp.length) {
          inp[i].focus();
        } else {
          const btns = topmod.getElementsByClassName('ok-btn');
          if(btns.length > 0) btns[0].dispatchEvent(new Event('click'));
        }
      } else if(this.dr_dialog_order.length > 0) {
        // Send ENTER key event to the top draggable dialog.
        const last = this.dr_dialog_order.length - 1;
        if(last >= 0) {
          const mgr = window[this.dr_dialog_order[last].dataset.manager];
          if(mgr && 'enterKey' in mgr) mgr.enterKey();
        }
      }
    } else if(code === 'Backspace' &&
        ttype !== 'text' && ttype !== 'password' && ttype !== 'textarea') {
      // Prevent backspace to be interpreted (by FireFox) as "go back in browser".
      e.preventDefault();
    } else if(ttag === 'BODY') {
      // Up and down arrow keys.
      if(code === 'ArrowUp' || code === 'ArrowDown') {
        e.preventDefault();
        // Send event to the top draggable dialog.
        const last = this.dr_dialog_order.length - 1;
        if(last >= 0) {
          const mgr = window[this.dr_dialog_order[last].dataset.manager];
          // NOTE: Pass key direction as -1 for UP and +1 for DOWN.
          if(mgr && 'upDownKey' in mgr) mgr.upDownKey(e.keyCode - 39);
        }
      }
      // End, Home, and left and right arrow keys.
      if(code === 'End') {
        e.preventDefault();
        MODEL.t = MODEL.run_length;
        UI.updateTimeStep();
        UI.drawDiagram(MODEL);
      } else if(code === 'Home') {
        e.preventDefault();
        MODEL.t = 1;
        UI.updateTimeStep();
        UI.drawDiagram(MODEL);
      } else if(code === 'ArrowLeft') {
        e.preventDefault();
        this.stepBack(e);
      } else if(code === 'ArrowRight') {
        e.preventDefault();
        this.stepForward(e);
      } else if(code === 'Insert') {
        // Toggle the "linking" state.
        this.canLink(true);
      } else if(e.ctrlKey && code === 'KeyS') {
        // Ctrl-S means: save model. Treat separately because Shift-key
        // alters the way in which the model file is saved.
        e.preventDefault();
        FILE_MANAGER.saveModel(e.shiftKey);
      } else if(alt && ['KeyC', 'KeyM'].indexOf(code) >= 0) {
        // Special shortcut keys for "clone selection" and "model settings".
        const be = new Event('click');
        if(code === 'KeyC') {
          this.buttons.clone.dispatchEvent(be);
        } else if(code === 'KeyM') {
          this.buttons.settings.dispatchEvent(be);
        }
      } else if(!e.shiftKey && !alt &&
          (!topmod || ['KeyA', 'KeyC', 'KeyV'].indexOf(code) < 0)) {
        // Interpret special keys as shortcuts unless a modal dialog is open.
        if(code === 'Delete') {
          // DEL button => delete selection.
          e.preventDefault();
          if(!topmod) {
            // Do not delete entity from model diagram when some modal
            // is showing. 
            this.buttons['delete'].dispatchEvent(new Event('click'));
          }
        } else if (code === 'Period' && (e.ctrlKey || e.metaKey)) {
          // Ctrl-. (dot) moves entire diagram to upper-left corner.
          e.preventDefault();
          this.paper.fitToSize();
          MODEL.alignToGrid();
        } else if (code >= 'KeyA' && code <= 'KeyZ' && (e.ctrlKey || e.metaKey)) {
          // ALWAYS prevent browser to do respond to Ctrl-letter commands.
          // NOTE: This cannot prevent a new tab from opening on Ctrl-T.
          e.preventDefault();
          let shortcut = code.substring(3);
          if(shortcut === 'Z' && e.shiftKey) {
            // Interpret Shift-Ctrl-Z as Ctrl-Y (redo last undone operation).
            shortcut = 'Y';
          }
          if(this.shortcuts.hasOwnProperty(shortcut)) {
            const btn = this.buttons[this.shortcuts[shortcut]];
            if(!this.hidden(btn.id) && !btn.classList.contains('disab')) {
              btn.dispatchEvent(new Event('click'));
            }
          }
        }
      }
    }
  }

  //
  // Handlers for checkbox events.
  //
  // Checkboxes may have different colors, which should be preserved
  // while (un)checking. The first item in the classlist of a checkbox
  // element will always be "box", the second item may just be "checked"
  // or "clear", but also something like "checked-same-not-changed".
  // Hence the state change operations should only affect the first part.

  toggleBox(event) {
    // Change "checked" to "clear" or vice versa.
    const el = event.target;
    if(!el.classList.contains('disab')) {
      const
          state = el.classList.item(1),
          list = state.split('-'),
          change = {clear: 'checked', checked: 'clear'};
      list[0] = change[list[0]];
      el.classList.replace(state, list.join('-'));
    }
  }
  
  setBox(id, checked) {
    // Set the box identified by `id` to the state indicated by the
    // Boolean parameter `checked`.
    const
        box = document.getElementById(id),
        state = box.classList.item(1),
        list = state.split('-');
    list[0] = (checked ? 'checked' : 'clear');
    box.classList.replace(state, list.join('-'));
  }
  
  boxChecked(id) {
    // Return TRUE if the box identified by `id` is checked.
    return document.getElementById(id).classList.item(1).startsWith('checked');
  }

  //
  // Input field validation
  // 

  validNames(nn, an='') {
    // Check whether names meet conventions; if not, warn user
    if(!UI.validName(nn) || nn.indexOf(UI.BLACK_BOX) >= 0) {
      UI.warn(`Invalid name "${nn}"`);
      return false;
    }
    if(an === '' || an === UI.NO_ACTOR) return true;
    if(!UI.validName(an)) {
      UI.warn(`Invalid actor name "${an}"`);
      return false;
    }
    return true;
  }
  
  validNumericInput(id, name) {
    // Returns number if input field with identifier `id` contains a number;
    // otherwise returns FALSE; if error, focuses on the field and shows
    // the error while specifying the name of the field
    // NOTE: accept both . and , as decimal point
    const
        inp = document.getElementById(id),
        txt = inp.value.trim().replace(',', '.');
    // NOTE: for some fields, empty strings denote default values, typically 0
    if(txt === '' && ['some field'].indexOf(name) >= 0) return 0;
    const n = parseFloat(txt);
    // NOTE: any valid number ends with a digit (e.g., 100, 100.0, 1E+2),
    // but parseFloat is more tolerant; however, CLAST should not accept
    // input such as "100x" nor even "100." 
    if(isNaN(n) || '0123456789'.indexOf(txt[txt.length - 1]) < 0) {
      this.warn(`Invalid number "${txt}" for ${name}`);
      inp.focus();
      return false;
    }
    return n;
  }

  //
  // Navigation in the cluster hierarchy.
  //
  
  showParentCluster() {
    if(MODEL.focal_cluster.parent) {
      this.makeFocalCluster(MODEL.focal_cluster.parent);
    }
  }
  
  moveSelectionToParentCluster() {
    if(MODEL.focal_cluster.parent) {
      UNDO_STACK.push('lift', MODEL.focal_cluster.parent);
      MODEL.dropSelectionIntoCluster(MODEL.focal_cluster.parent);
      this.updateButtons();
    }
  }

  //
  // Moving backwards and forwards in time.
  //
  
  stepBack(e) {
    if(e.target.classList.contains('disab')) return;
    if(MODEL.t > 0) {
      const dt = (e.shiftKey ? 10 : 1) * (e.ctrlKey || e.metaKey ? 100 : 1);
      MODEL.t = Math.max(0, MODEL.t - dt);
      UI.updateTimeStep();
      UI.drawDiagram(MODEL);
    }
  }
  
  stepForward(e) {
    if(e.target.classList.contains('disab')) return;
    if(MODEL.t < MODEL.run_length) {
      const dt = (e.shiftKey ? 10 : 1) * (e.ctrlKey || e.metaKey ? 100 : 1);
      MODEL.t = Math.min(MODEL.run_length, MODEL.t + dt);
      UI.updateTimeStep();
      UI.drawDiagram(MODEL);
    }
  }
  
  //
  // Special features that may not work in all browsers
  //
  
  copyStringToClipboard(string) {
    // Copies string to clipboard and notifies user of #lines copied
    let msg = pluralS(string.split('\n').length, 'line') +
            ' copied to clipboard',
        type = 'notification';
    if(navigator.clipboard) {
      navigator.clipboard.writeText(string).catch(
          () => UI.setMessage('Failed to copy to clipboard', 'warning'));
    } else {
      // Workaround using deprecated execCommand
      const ta = document.createElement('textarea');
      document.body.appendChild(ta);
      ta.value = string;
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    UI.setMessage(msg, type);
  }
  
  copyHtmlToClipboard(html) {
    // Copy HTML to clipboard
    function listener(event) {
      event.clipboardData.setData('text/html', html);
      event.preventDefault();
    }
    document.addEventListener('copy', listener);
    document.execCommand('copy');
    document.removeEventListener('copy', listener);
  }
  
  logHeapSize(msg='') {
    // Logs MB's of used heap memory to console (to detect memory leaks)
    // NOTE: this feature is supported only by Chrome
    if(msg) msg += ' -- ';
    if(performance.memory !== undefined) {
      console.log(msg + 'Allocated memory: ' + Math.round(
          performance.memory.usedJSHeapSize/1048576.0).toFixed(1) + ' MB');
    }
  }

  //
  // Informing the modeler via the status line
  //
  
  clearStatusLine() {
    // Clear message on the status line.
    this.info_line.innerHTML = '';
    UI.info_line.classList.remove(...UI.info_line.classList);
  }

  setMessage(msg, type=null, cause='') {
    // Display `msg` on infoline unless no type (= plain text) and some
    // info, warning or error message is already displayed.
    // Only log errors and warnings on the browser console.
    // NOTE: Optionally, the JavaScript error can be passed via `cause`.
    if(type === 'error' || type === 'warning') {
      // Add type unless message already starts with it.
      let log_msg = msg;
      const logtype = type.toUpperCase() + ':';
      if(!log_msg.startsWith(logtype)) log_msg = `${logtype} ${log_msg}`;
      // Strip HTML tags from message text unless UI is graphical
      log_msg = log_msg.replace(/<[^>]*>?/gm, '');
      console.log(log_msg);
      if(cause) console.log('Cause:', cause);
    }
    const types = ['notification', 'warning', 'error'];
    let d = new Date(),
        t = d.getTime(),
        dt = t - this.time_last_message, // Time since display
        rt = this.message_display_time - dt, // Time remaining
        mti = types.indexOf(type),
        lmti = types.indexOf(this.last_message_type);
    if(type) {
      // Only log "real" messages.
      const
          now = [d.getHours(), d.getMinutes().toString().padStart(2, '0'),
              d.getSeconds().toString().padStart(2, '0')].join(':'),
          im = {time: now, text: msg, status: type};
      DOCUMENTATION_MANAGER.addMessage(im);
    }
    if(mti === 1 && lmti === 2 && rt > 0) {
      // Queue warnings if an error message is still being displayed.
          setTimeout(() => {
          UI.info_line.innerHTML = msg;
          UI.info_line.classList.remove(...UI.info_line.classList);
          if(type) UI.info_line.classList.add(type);
          UI.updateIssuePanel();
        }, rt);      
    } else if(lmti < 0 || mti > lmti || rt <= 0) {
      // Display text only if previous message has "timed out" or was less
      // urgent than this one.
      const override = mti === 2 && lmti === 1 && rt > 0;
      this.time_last_message = t;
      this.last_message_type = type;
      if(type) {
        SOUNDS[type].play().catch(() => {
          console.log('NOTICE: Sounds will only play after first user action');
        });
      }
      if(override && !this.old_info_line) {
        // Set time-out to restore overridden warning.
        this.old_info_line = {msg: this.info_line.innerHTML, status: types[lmti]};
        setTimeout(() => {
            UI.info_line.innerHTML = UI.old_info_line.msg;
            UI.info_line.classList.add(UI.old_info_line.status);
            UI.old_info_line = null;
            UI.updateIssuePanel();
          }, this.message_display_time);
      }
      UI.info_line.classList.remove(...UI.info_line.classList);
      if(type) UI.info_line.classList.add(type);
      UI.info_line.innerHTML = msg;
    }
  }
  
  // Visual feedback for time-consuming actions
  waitingCursor() {
    document.body.className = 'waiting';
  }

  normalCursor() {
    document.body.className = '';
  }

  setProgressNeedle(fraction, color='#500080') {
    // Shows a thin purple line just above the status line to indicate progress
    const el = document.getElementById('set-up-progress-bar');
    el.style.width = Math.round(Math.max(0, Math.min(1, fraction)) * 100) + '%';
    el.style.backgroundColor = color;
  }
  
  hideStayOnTopDialogs() {
    // Hide and reset all stay-on-top dialogs (even when not showing).
    // NOTE: This routine is called when a new model is loaded.
    DOCUMENTATION_MANAGER.dialog.style.display = 'none';
    this.buttons.documentation.classList.remove('stay-activ');
    DOCUMENTATION_MANAGER.reset();
    FINDER.dialog.style.display = 'none';
    this.buttons.finder.classList.remove('stay-activ');
    FINDER.reset();
    MONITOR.dialog.style.display = 'none';
    this.buttons.monitor.classList.remove('stay-activ');
    MONITOR.reset();
    // No more visible dialogs, so clear their z-index ordering array
    this.dr_dialog_order.length = 0;
  }

  //
  // Operations that affect the current CLAST model
  //
  
  promptForNewModel() {
    // Prompt for model name and author name
    // @@TO DO: warn user if unsaved changes to current model
    this.hideStayOnTopDialogs();
    // Clear name, but not author field, as it is likely the same modeler
    this.modals.model.element('name').value = '';
    this.modals.model.show('name');
  }

  createNewModel() {
    const md = this.modals.model;
    // Create a brand new model with (optionally) specified name and author
    MODEL = new CLASTModel(
        md.element('name').value.trim(), md.element('author').value.trim());
    md.hide();
    this.updateTimeStep();
    this.drawDiagram(MODEL);
    UNDO_STACK.clear();
    VM.reset();
    this.updateButtons();
    AUTO_SAVE.setInterval();
  }
  
  addNode(type) {
    let n = null,
        nn,
        an,
        md;
    if(type === 'note') {
      md = this.modals.note;
      n = this.dbl_clicked_node;
      const editing = md.element('action').innerHTML === 'Edit';
      if(editing) {
        n = this.dbl_clicked_node;
        this.dbl_clicked_node = null;
        UNDO_STACK.push('modify', n);
        n.contents = md.element('text').value;
        n.resize();
      } else {
        n = MODEL.addNote();
        n.x = this.add_x;
        n.y = this.add_y;
        n.contents = md.element('text').value;
        n.resize();
        UNDO_STACK.push('add', n); 
      }
    } else {
      md = this.modals['add-node'];
      this.dbl_clicked_node = null;
      if(md.element('action').innerText === 'Edit') {
        if(this.updateNodeProperties()) md.hide();
        return;
      }
      nn = md.element('name').value.trim();
      an = md.element('actor').value.trim();
      if(!this.validNames(nn, an)) {
        UNDO_STACK.pop();
        return false;
      }
      type = md.element('type').innerText;
      if(type === 'factor') {
        n = MODEL.addFactor(nn, an);
        if(n) {
          // If factor, and X and Y are set, it exists; then if not in the
          // focal cluster, ask whether to move it there.
          if(n instanceof Factor && (n.x !== 0 || n.y !== 0)) {
            if(n.parent !== MODEL.focal_cluster) {
              this.confirmToMoveNode(n);
            } else {
              this.warningEntityExists(n);
            }
          } else {
            n.x = this.add_x;
            n.y = this.add_y;
            UNDO_STACK.push('add', n);
          }
        }
      } else {
        n = MODEL.addCluster(nn, an);
      }
      if(n) {
        // If cluster, and X and Y are set, it exists; then if not in the
        // focal cluster, ask whether to move it there.
        if(n instanceof Cluster && (n.x !== 0 || n.y !== 0)) {
          if(n.parent !== MODEL.focal_cluster) {
            this.confirmToMoveCluster(n);
          } else {
            this.warningEntityExists(n);
          }
        } else {
          n.x = this.add_x;
          n.y = this.add_y;
          UNDO_STACK.push('add', n);
        }
      }
    }
    if(n) {
      md.hide();
      // Select the newly added entity.
      // NOTE: If the focal cluster was selected (via the top tool bar),
      // it cannot be selected.
      if(n !== MODEL.focal_cluster) this.selectNode(n);
    }
  }
  
  selectNode(n) {
    // Make `n` the current selection, and redraw so that it appears in red
    if(n) {
      MODEL.select(n);
      UI.drawDiagram(MODEL);
      // Generate a mousemove event for the drawing canvas to update the cursor etc.
      this.cc.dispatchEvent(new Event('mousemove'));
      this.updateButtons();
    }
  }
  
  confirmToMoveNode(n) {
    // Store node `n` in global variable, and open confirm dialog
    const md = this.modals.move;
    this.node_to_move = n;
    md.element('node-name').innerHTML = n.displayName;
    md.element('from-parent').innerHTML = n.parent.displayName;
    md.element('to-parent').innerHTML = MODEL.focal_cluster.displayName;
    md.show();  
  }
  
  doNotMoveNode() {
    // Cancel the "move node to focal cluster" operation.
    this.node_to_move = null;
    this.modals.move.hide(); 
  }
  
  moveNodeToFocalCluster() {
    // Perform the "move node to focal cluster" operation.
    const n = this.node_to_move;
    this.node_to_move = null;
    this.modals.move.hide();
    // TO DO: prepare for undo -> keep track of the old parent cluster.
    n.setCluster(MODEL.focal_cluster);
    n.x = this.add_x;
    n.y = this.add_y;
    this.selectNode(n);
  }
  
  promptForCloning() {
    // Opens CLONE modal
    const n = MODEL.selection.length;
    if(n > 0) {
      const md = UI.modals.clone;
      md.element('prefix').value = '';
      md.element('actor').value = '';
      md.element('count').innerHTML = `(${pluralS(n, 'element')})`;
      md.show('prefix');
    }
  }
  
  cloneSelection() {
    const md = UI.modals.clone;
    if(MODEL.selection.length) {
      const
          p_prompt = md.element('prefix'),
          a_prompt = md.element('actor'),
          renumber = this.boxChecked('clone-renumbering'),
          actor_name = a_prompt.value.trim();
      let prefix = p_prompt.value.trim();
      // Perform basic validation of combination prefix + actor
      let msg = '';
      p_prompt.focus();
      if(!prefix && !actor_name && !(renumber && MODEL.canRenumberSelection)) {
        msg = 'Prefix and actor name cannot both be empty';
      } else if(prefix && !UI.validName(prefix)) {
        msg = `Invalid prefix "${prefix}"`;
      } else if(actor_name && !UI.validName(actor_name)) {
        msg = `Invalid actor name "${actor_name}"`;
        a_prompt.focus();
      }
      if(msg) {
        this.warn(msg);
        return;
      }
      const err = MODEL.cloneSelection(prefix, actor_name, renumber);
      if(err) {
        // Something went wrong, so do not hide the modal, but focus on
        // the DOM element returned by the model's cloning method.
        const el = md.element(err);
        if(el) {
          el.focus();
        } else {
          UI.warn(`Unexpected clone result "${err}"`);
        }
        return;
      }
    }
    md.hide();
    this.updateButtons();
  }
  
  cancelCloneSelection() {
    this.modals.clone.hide();
    this.updateButtons();
  }
  
  copySelection() {
    // Save selection as XML in local storage of the browser.
    const xml = MODEL.selectionAsXML;
    if(xml) {
      window.localStorage.setItem('CLAST-selection-XML', xml);
      this.updateButtons();
      const bn = (this.browser_name ? ` of ${this.browser_name}` : '');
      this.notify('Selection copied to local storage' + bn);
    }
  }
  
  get canPaste() {
    // Return TRUE if the browser has a recent selection-as-XML object
    // in its local storage.
    const xml = window.localStorage.getItem('CLAST-selection-XML');
    if(xml) {
      const timestamp = xml.match(/<copy timestamp="(\d+)"/);
      if(timestamp) { 
        if(Date.now() - parseInt(timestamp[1]) < 8*3600000) return true;
      }
      // Remove XML from local storage if older than 8 hours.
      window.localStorage.removeItem('CLAST-selection-XML');
    }
    return false;
  }
  
  promptForMapping(mapping) {
    // Prompt user to specify name conflict resolution strategy.
    const md = this.paste_modal;
    md.mapping = mapping;
    md.element('from-prefix').innerText = mapping.from_prefix || '';
    md.element('to-prefix').innerText = mapping.to_prefix || '';
    md.element('ftp').style.display = (mapping.from_prefix ? 'block' : 'none');
    md.element('from-actor').innerText = mapping.from_actor || '';
    md.element('to-actor').innerText = mapping.to_actor || '';
    md.element('fta').style.display = (mapping.from_actor ? 'block' : 'none');
    md.element('actor').value = mapping.actor || '';
    md.element('prefix').value = mapping.prefix || '';
    const
        tc = (mapping.top_clusters ?
            Object.keys(mapping.top_clusters).sort(ciCompare) : []),
        ft = (mapping.from_to ?
            Object.keys(mapping.from_to).sort(ciCompare) : []),
        sl = [];
    if(tc.length) {
      sl.push('<div style="font-weight: bold; margin:4px 2px 2px 2px">',
        'Names for top-level clusters:</div>');
      const sll = sl.length;
      // Add text inputs for selected cluster nodes.
      for(let i = 0; i < tc.length; i++) {
        const
            ti = mapping.top_clusters[tc[i]],
            state = (ti === tc[i] ? 'color: #e09000; ' :
                this.validName(ti) ? 'color: #0000c0; ' :
                'font-style: italic; color: red; ');
        sl.push('<div class="paste-option"><span>', tc[i], '</span> ',
            '<div class="paste-select"><input id="paste-selc-', i,
            '" type="text" style="', state, 'font-size: 12px" value="',
            ti, '"></div></div>');
      }
      // Remove header when no items were added.
      if(sl.length === sll) sl.pop();
    }
    if(ft.length) {
      sl.push('<div style="font-weight: bold; margin:4px 2px 2px 2px">',
        'Mapping of nodes to link from/to:</div>');
      const sll = sl.length;
      // Add selectors for unresolved FROM/TO nodes.
      for(let i = 0; i < ft.length; i++) {
        const ti = mapping.from_to[ft[i]];
        if(ft[i] === ti) {
          const elig = MODEL.eligibleFromToFactors();
          sl.push('<div class="paste-option"><span>', ft[i], '</span> ');
          if(elig.length) {
            sl.push('<div class="paste-select"><select id="paste-ft-', i,
              '" style="font-size: 12px">');
            for(let j = 0; j < elig.length; j++) {
              const dn = elig[j].displayName;
              sl.push('<option value="', dn, '">', dn, '</option>');
            }
            sl.push('</select></div>');
          } else {
            sl.push('<span><em>(no eligible node)</em></span');
          }
          sl.push('</div>');
        }
      }
      // Remove header when no items were added.
      if(sl.length === sll) sl.pop();
    }
    md.element('scroll-area').innerHTML = sl.join('');
    // Open dialog, which will call pasteSelection(...) on OK.
    this.paste_modal.show();
  }
  
  setPasteMapping() {
    // Update the paste mapping as specified by the modeler and then
    // proceed to paste.
    const
        md = this.paste_modal,
        mapping = Object.assign(md.mapping, {}),
        tc = (mapping.top_clusters ?
            Object.keys(mapping.top_clusters).sort(ciCompare) : []),
        ft = (mapping.from_to ?
            Object.keys(mapping.from_to).sort(ciCompare) : []);
    mapping.actor = md.element('actor').value;
    mapping.prefix = md.element('prefix').value.trim();
    mapping.increment = true;
    for(let i = 0; i < tc.length; i++) {
      const cn = md.element('selc-' + i).value.trim();
      if(this.validName(cn)) mapping.top_clusters[tc[i]] = cn;
    }
    for(let i = 0; i < ft.length; i++) if(mapping.from_to[ft[i]] === ft[i]) {
      const
          ftn = md.element('ft-' + i).value,
          fto = MODEL.objectByName(ftn);
      if(fto) mapping.from_to[ft[i]] = ftn;
    }
    this.pasteSelection(mapping);
  }
  
  pasteSelection(mapping={}) {
    // If selection has been saved as XML in local storage, test to
    // see whether PASTE would result in name conflicts, and if so,
    // open the name conflict resolution window.
    let xml = window.localStorage.getItem('CLAST-selection-XML');
    try {
      xml = parseXML(xml);
    } catch(e) {
      console.log(e);
      this.alert('Paste failed due to invalid XML');
      return;
    }

    const
        entities_node = childNodeByTag(xml, 'entities'),
        from_tos_node = childNodeByTag(xml, 'from-tos'),
        extras_node = childNodeByTag(xml, 'extras'),
        selc_node = childNodeByTag(xml, 'selected-clusters'),
        selection_node = childNodeByTag(xml, 'selection'),
        actor_names = [],
        new_entities = [],
        name_map = {},
        name_conflicts = [];
            
    // AUXILIARY FUNCTIONS
    
    function fullName(node) {
      // Return full entity name inferred from XML node data.
      if(node.nodeName === 'from-to') {
        const
            n = xmlDecoded(nodeParameterValue(node, 'name')),
            an = xmlDecoded(nodeParameterValue(node, 'actor-name'));
        if(an && an !== UI.NO_ACTOR) {
          addDistinct(an, actor_names);
          return `${n} (${an})`;
        }
        return n;
      }
      if(node.nodeName !== 'link') {
        const
            n = xmlDecoded(nodeContentByTag(node, 'name')),
            an = xmlDecoded(nodeContentByTag(node, 'actor-name'));
        if(an && an !== UI.NO_ACTOR) {
          addDistinct(an, actor_names);
          return `${n} (${an})`;
        }
        return n;
      } else {
        let fn = xmlDecoded(nodeContentByTag(node, 'from-name')),
            fa = xmlDecoded(nodeContentByTag(node, 'from-owner')),
            tn = xmlDecoded(nodeContentByTag(node, 'to-name')),
            ta = xmlDecoded(nodeContentByTag(node, 'to-owner'));
        if(fa && fa !== UI.NO_ACTOR) {
          addDistinct(fa, actor_names);
          fn = `${fn} (${fa})`;
        }
        if(ta && ta !== UI.NO_ACTOR) {
          addDistinct(ta, actor_names);
          tn = `${tn} (${ta})`;
        }
        return `${fn}${UI.LINK_ARROW}${tn}`;
      }
    }
    
    function nameAndActor(name) {
      // Return tuple [entity name, actor name] if `name` ends with a
      // parenthesized string that identifies an actor in the selection.
      const ai = name.lastIndexOf(' (');
      if(ai < 0) return [name, ''];
      let actor = name.slice(ai + 2, -1);
      // Test whether parenthesized string denotes an actor.
      if(actor_names.indexOf(actor) >= 0 || actor === mapping.actor ||
          actor === mapping.from_actor || actor === mapping.to_actor) {
        name = name.substring(0, ai);
      } else {
        actor = '';
      }
      return [name, actor];
    }

    function mappedName(n) {
      // Returns full name `n` modified according to the mapping.
      // NOTE: Links require two mappings (recursion!).
      if(n.indexOf(UI.LINK_ARROW) > 0) {
        const ft = n.split(UI.LINK_ARROW);
        return mappedName(ft[0]) + UI.LINK_ARROW + mappedName(ft[1]);
      }
      // Mapping precedence order:
      // (1) prefix inherited from cluster
      // (2) actor name inherited from cluster
      // (3) actor name specified by modeler
      // (4) prefix specified by modeler
      // (5) auto-increment tail number
      // (6) nearest eligible node
      if(mapping.from_prefix && n.startsWith(mapping.from_prefix)) {
        return n.replace(mapping.from_prefix, mapping.to_prefix);
      }
      if(mapping.from_actor) {
        const ai = n.lastIndexOf(mapping.from_actor);
        if(ai > 0) return n.substring(0, ai) + mapping.to_actor;
      }
      // NOTE: specified actor cannot override existing actor.
      if(mapping.actor && !nameAndActor(n)[1]) {
        return `${n} (${mapping.actor})`;
      }
      if(mapping.prefix) {
        return mapping.prefix + UI.PREFIXER + n;
      }
      let nr = endsWithDigits(n);
      if(mapping.increment && nr) {
        return n.replace(new RegExp(nr + '$'), parseInt(nr) + 1);
      }
      if(mapping.top_clusters && mapping.top_clusters[n]) {
        return mapping.top_clusters[n];
      }
      if(mapping.from_to && mapping.from_to[n]) {
        return mapping.from_to[n];
      }
      // No mapping => return original name.
      return n;
    }

    function nameConflicts(node) {
      // Maps names of entities defined by the child nodes of `node`
      // while detecting name conflicts.
      for(let i = 0; i < node.childNodes.length; i++) {
        const c = node.childNodes[i];
        if(c.nodeName !== 'link') {
          const
              fn = fullName(c),
              mn = mappedName(fn),
              obj = MODEL.objectByName(mn);
          // Name conflict occurs when the mapped name is already in use
          // in the target model, or when the original name is mapped onto
          // different names (this might occur due to modeler input).
          if(obj || (name_map[fn] && name_map[fn] !== mn)) {
            addDistinct(fn, name_conflicts);
          } else {
            name_map[fn] = mn;
          }
        }
      }
    }
    
    function addEntityFromNode(node) {
      // Adds entity to model based on XML node data and mapping.
      // NOTE: Do not add if an entity having this type and mapped name
      // already exists; name conflicts accross entity types may occur
      // and result in error messages.
      const
          et = node.nodeName,
          fn = fullName(node),
          mn = mappedName(fn);
      let obj;
      if(et === 'factor' && !MODEL.factorByID(UI.nameToID(mn))) {
        const
           na = nameAndActor(mn),
           new_actor = !MODEL.actorByID(UI.nameToID(na[1]));
        obj = MODEL.addFactor(na[0], na[1], node);
        if(obj) {
          obj.code = '';
          obj.setCode();
          if(new_actor) new_entities.push(obj.actor);
          new_entities.push(obj);
        }
      } else if(et === 'link') {
        const
            ft = mn.split(UI.LINK_ARROW),
            fl = MODEL.objectByName(ft[0]),
            tl = MODEL.objectByName(ft[1]);
        if(fl && tl) {
          obj = MODEL.addLink(fl, tl, node);
          if(obj) new_entities.push(obj);
        } else {
          UI.alert(`Failed to paste ${et} ${fn} as ${mn}`);
        }
      }
    }
    
    const
        mts = nodeParameterValue(xml, 'model-timestamp'),
        cn = nodeParameterValue(xml, 'parent-name'),
        ca = nodeParameterValue(xml, 'parent-actor'),
        fc = MODEL.focal_cluster,
        fcn = fc.name,
        fca = fc.actor.name,
        sp = this.sharedPrefix(cn, fcn),
        fpn = (cn === UI.TOP_CLUSTER_NAME ? '' : cn.replace(sp, '')),
        tpn = (fcn === UI.TOP_CLUSTER_NAME ? '' : fcn.replace(sp, ''));
    // Infer mapping from XML data and focal cluster name & actor name.
    mapping.shared_prefix = sp;
    mapping.from_prefix = (fpn ? sp + fpn + UI.PREFIXER : sp);
    mapping.to_prefix = (tpn ? sp + tpn + UI.PREFIXER : sp);
    mapping.from_actor = (ca === UI.NO_ACTOR ? '' : ca);
    mapping.to_actor = (fca === UI.NO_ACTOR ? '' : fca);
    // Prompt for mapping when pasting to the same model and cluster.
    if(parseInt(mts) === MODEL.time_created.getTime() &&
        ca === fca && mapping.from_prefix === mapping.to_prefix &&
        !(mapping.prefix || mapping.actor || mapping.increment)) {
      // Prompt for names of selected cluster nodes.
      if(selc_node.childNodes.length && !mapping.prefix) {
        mapping.top_clusters = {};
        for(let i = 0; i < selc_node.childNodes.length; i++) {
          const
              c = selc_node.childNodes[i],
              fn = fullName(c),
              mn = mappedName(fn);
          mapping.top_clusters[fn] = mn;
        }
      }
      this.promptForMapping(mapping);
      return;
    }
    // Also prompt if FROM and/or TO nodes are not selected, and map to
    // existing entities.
    if(from_tos_node.childNodes.length && !mapping.from_to) {
      const
          ft_map = {},
          ft_type = {};
      for(let i = 0; i < from_tos_node.childNodes.length; i++) {
        const
            c = from_tos_node.childNodes[i],
            fn = fullName(c),
            mn = mappedName(fn);
        if(MODEL.objectByName(mn)) {
          ft_map[fn] = mn;
          ft_type[fn] = (nodeParameterValue(c, 'is-data') === '1' ?
              'Data' : nodeParameterValue(c, 'type'));
        }
      }
      // Prompt only for FROM/TO nodes that map to existing nodes.
      if(Object.keys(ft_map).length) {
        mapping.from_to = ft_map;
        mapping.from_to_type = ft_type;
        this.promptForMapping(mapping);
        return;
      }
    }

    // Only check for selected entities; from-to's and extra's should be
    // used if they exist, or should be created when copying to a different
    // model.
    name_map.length = 0;
    nameConflicts(entities_node);
    if(name_conflicts.length) {
      UI.warn(pluralS(name_conflicts.length, 'name conflict'));
console.log('HERE name conflicts', name_conflicts, mapping);
      return;
    }
    
    // No conflicts => add all.
    for(let i = 0; i < extras_node.childNodes.length; i++) {
      addEntityFromNode(extras_node.childNodes[i]);
    }
    for(let i = 0; i < from_tos_node.childNodes.length; i++) {
      addEntityFromNode(from_tos_node.childNodes[i]);
    }
    for(let i = 0; i < entities_node.childNodes.length; i++) {
      addEntityFromNode(entities_node.childNodes[i]);
    }
    // Update diagram, showing newly added nodes as selection.
    MODEL.clearSelection();
    for(let i = 0; i < selection_node.childNodes.length; i++) {
      const
          n = xmlDecoded(nodeContent(selection_node.childNodes[i])),
          obj = MODEL.objectByName(mappedName(n));
      if(obj) MODEL.select(obj);
    }
    UI.drawDiagram(MODEL);
    this.paste_modal.hide();
  }
  
  //
  // Highlighting loops
  //
  
  highlightCycle(event) {
    // Highlight next cycle (if any) or all cycles when Alt-key is pressed.
    const nc = MODEL.cycle_list.length;
    if(!nc) {
      this.notify('Model appears to contain no loops');
      MODEL.show_all_cycles = false;
      MODEL.selected_cycle = -1;
      return;
    }
    if(event.altKey) {
      MODEL.show_all_cycles = !MODEL.show_all_cycles;
      MODEL.selected_cycle = -1;
    } else {
      MODEL.show_all_cycles = false;
      if(MODEL.selected_cycle < 0) {
        MODEL.selected_cycle = 0;
      } else if(event.shiftKey) {
        MODEL.selected_cycle--;
        if(MODEL.selected_cycle < 0) MODEL.selected_cycle = nc - 1;
      } else {
        MODEL.selected_cycle++;
        if(MODEL.selected_cycle >= nc) MODEL.selected_cycle = 0;        
      }
    }
    this.drawDiagram(MODEL);
  }
  
  //
  // Interaction with modal dialogs to modify model or entity properties
  //
  
  // Settings modal

  showSettingsDialog(model) {
    const md = this.modals.settings;
    md.element('name').value = model.name;
    md.element('author').value = model.author;
    md.element('grid-pixels').value = model.grid_pixels;
    md.element('cycles').value = model.run_length;
    this.setBox('settings-align-to-grid', model.align_to_grid);
    md.show('name');
  }
  
  updateSettings(model) {
    const md = this.modals.settings;
    // Valdidate inputs
    const px = this.validNumericInput('settings-grid-pixels', 'grid resolution');
    if(px === false) return false;
    const rl = this.validNumericInput('settings-cycles', 'run length');
    if(rl === false) return false;
    model.name = md.element('name').value.trim();
    // Display model name in browser unless blank
    document.title = model.name || 'CLAST';
    model.author = md.element('author').value.trim();
    // Some changes may necessitate redrawing the diagram.
    let cb = UI.boxChecked('settings-align-to-grid'),
        redraw = !model.align_to_grid && cb;
    model.align_to_grid = cb;
    model.grid_pixels = Math.floor(px);
    model.run_length = Math.max(1, Math.floor(rl));
    // Close the dialog.
    md.hide();
    // Ensure that model documentation can no longer be edited.
    DOCUMENTATION_MANAGER.clearEntity([model]);
    if(redraw) this.drawDiagram(model);
  }
  
  // Note modal

  showNotePropertiesDialog(n=null) {
    this.dbl_clicked_node = n;
    const md = this.modals.note;
    if(n) {
      md.element('action').innerHTML = 'Edit';
      const nr = n.number;
      md.element('number').innerHTML = (nr ? '#' + nr : '');
      md.element('text').value = n.contents;
    } else {
      md.element('action').innerHTML = 'Add';
    }
    md.show('text');
  }
  
  // Node modal (for factors and clusters)

  showNodePropertiesDialog(node=null) {
    // Open the node modal and set its fields to properties of `node`
    // if it is defined.
    if(node === MODEL.top_cluster) return;
    const
        md = this.modals['add-node'],
        an = md.element('actor'),
        eb = md.element('expression'),
        x = (node && node instanceof Factor ? node.expression : null);
    md.element('action').innerText = (node ? 'Edit' : 'Add');
    if(node) md.element('type').innerText = node.type.toLowerCase();
    md.element('name').value = (node ? node.name : '');
    an.value = (node && node.hasActor ? node.actor.name : '');
    // NOTE: Expression button is only shown when an existing factor is
    // edited. By default, new factors have no associated expression.
    if(node && node instanceof Factor) {
      an.style.width = '200px';
      eb.style.display = 'inline-block';
      eb.title = x.text;
    } else {
      eb.style.display = 'none';
      an.style.width = '223px';
    }
    md.show('name');
    this.edited_object = node;
  }
  
  updateNodeProperties() {
    // Updates the edited factor or cluster if all input is OK.
    // @@TO DO: prepare for undo
    const
        md = this.modals['add-node'],
        node = this.edited_object;
    // Rename object if name and/or actor have changed
    let nn = md.element('name').value.trim(),
        na = md.element('actor').value.trim(),
        nnode = node.rename(nn, na);
    // NOTE: When rename returns FALSE, a warning is already shown.
    if(nnode !== true && nnode !== false) {
      this.warningEntityExists(nnode);
      return false;
    }
    // Redraw the shape, as its appearance may have changed.
    UI.drawObject(node);
    if(node === MODEL.focal_cluster) {
      this.focal_name.innerHTML = node.displayName;
    }
    md.hide();
    this.edited_object = false;
    return true;
  }

  cancelAddNode() {
    // Not only hides the node modal, but also clears the edited object.
    const
        md = this.modals['add-node'],
        node = this.edited_object;
    if(node && node instanceof Factor) {
      // Restore orgiginal expression text.
      const x = node.expression;
      x.text = md.element('expression').title;
      x.reset();
    }
    this.edited_object = false;    
    md.hide();
  }

  editEntityExpression() {    
    X_EDIT.editExpression(this.edited_object);
  }
  
  showLinkPropertiesDialog() {
    // Show the edit link properties modal.
    if(!(this.on_link && this.on_link instanceof Link)) return;
    const
        md = this.modals['edit-link'],
        link = this.on_link,
        ln = md.element('name'),
        icon = md.element('icon'),
        lm = md.element('multiplier'),
        eb = md.element('edit'),
        x = link.expression;
    this.edited_object = this.on_link;
    ln.innerText = link.displayName;
    lm.value = x.text;
    eb.title = x.text;
    let ic = 'undefined';
    if(x.defined) {
      if(x.isStatic) {
        const r = x.result(0);
        if(Math.abs(r) > VM.NEAR_ZERO) {
          ic = (r === -1 ? 'decrease' : (r === 1 ? 'increase' : 'constant'));
        }
      } else {
        ic = 'formula';
      }
    }
    icon.src = `images/${ic}.png`;
    icon.title = `(${ic})`;
    md.show('multiplier');
  }
  
  updateLink() {
    // Checks whether expression is valid, and if so, updates the link.
     const
        md = this.modals['edit-link'],
        link = this.on_link,
        ln = md.element('name'),
        icon = md.element('icon'),
        lm = md.element('multiplier'),
        eb = md.element('edit'),
        x = link.expression;
   
    this.edited_object = false;
    md.hide();
  }
  
  cancelEditLink() {
    // Not only hides the node modal, but also clears the edited object.
    const
        md = this.modals['edit-link'],
        link = this.edited_object;
    if(link instanceof Link) {
      // Restore orgiginal expression text.
      const x = link.expression;
      x.text = md.element('edit').title;
      x.reset();
    }
    this.edited_object = false;    
    md.hide();
  }

} // END of class Controller

