/*
CLAST is an executable graphical editor for causal loop diagrams.
This tool is developed by Pieter Bots at Delft University of Technology.

This JavaScript file (clast-finder.js) provides the GUI functionality
for the CLAST "finder": the draggable/resizable dialog for listing
model entities based on their name, and locating where they occur in the
model.
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

// CLASS Finder provides the finder dialog functionality
class Finder {
  constructor() {
    this.dialog = UI.draggableDialog('finder');
    UI.resizableDialog('finder', 'FINDER');
    this.close_btn = document.getElementById('finder-close-btn');
    // Make toolbar buttons responsive.
    this.close_btn.addEventListener('click', (e) => UI.toggleDialog(e));
    this.filter_input = document.getElementById('finder-filter-text');
    this.filter_input.addEventListener('input', () => FINDER.changeFilter());
    this.entity_table = document.getElementById('finder-table');
    this.item_table = document.getElementById('finder-item-table');
    this.expression_table = document.getElementById('finder-expression-table');
        
    // Set own properties.
    this.entities = [];
    this.filtered_types = [];
    this.reset();
  }

  reset() {
    this.entities.length = 0;
    this.filtered_types.length = 0;
    this.selected_entity = null;
    this.filter_input.value = '';
    this.filter_string = '';
    this.filter_pattern = null;
    this.entity_types = VM.entity_letters;
    this.find_links = true;
    this.last_time_clicked = 0;
    this.clicked_object = null;
  }
  
  doubleClicked(obj) {
    const
        now = Date.now(),
        dt = now - this.last_time_clicked;
    this.last_time_clicked = now;
    if(obj === this.clicked_object) {
      // Consider click to be "double" if it occurred less than 300 ms ago.
      if(dt < 300) {
        this.last_time_clicked = 0;
        return true;
      }
    }
    this.clicked_object = obj;
    return false;
  }
  
  enterKey() {
    // Open "edit properties" dialog for the selected entity.
    const srl = this.entity_table.getElementsByClassName('sel-set');
    if(srl.length > 0) {
      const r = this.entity_table.rows[srl[0].rowIndex];
      if(r) {
        const e = new Event('click');
        e.altKey = true;
        r.dispatchEvent(e);
      }
    }
  }
  
  upDownKey(dir) {
    // Select row above or below the selected one (if possible).
    const srl = this.entity_table.getElementsByClassName('sel-set');
    if(srl.length > 0) {
      const r = this.entity_table.rows[srl[0].rowIndex + dir];
      if(r) {
        UI.scrollIntoView(r);
        r.dispatchEvent(new Event('click'));
      }
    }
  }
  
  updateDialog() {
    const
        el = [],
        enl = [],
        se = this.selected_entity,
        et = this.entity_types,
        fp = this.filter_pattern && this.filter_pattern.length > 0;
    let imgs = '';
    this.entities.length = 0;
    this.filtered_types.length = 0;
    // No list unless a pattern OR a specified SUB-set of entity types.
    if(fp || et && et !== VM.entity_letters) {
      if(et.indexOf('F') >= 0) {
        imgs += '<img src="images/factor.png">';
        for(let k in MODEL.factors) if(MODEL.factors.hasOwnProperty(k)) {
          if((!fp || patternMatch(
              MODEL.factors[k].displayName, this.filter_pattern))) {
            enl.push(k);
            this.entities.push(MODEL.factors[k]);
            addDistinct('F', this.filtered_types);
          }
        }
      }
      if(et.indexOf('C') >= 0) {
        imgs += '<img src="images/cluster.png">';
        for(let k in MODEL.clusters) if(MODEL.clusters.hasOwnProperty(k)) {
          if(!fp || patternMatch(
              MODEL.clusters[k].displayName, this.filter_pattern)) {
            enl.push(k);
            this.entities.push(MODEL.clusters[k]);
            addDistinct('C', this.filtered_types);
          }
        }
      }
      if(et.indexOf('L') >= 0) {
        imgs += '<img src="images/link.png">';
        for(let k in MODEL.links) if(MODEL.links.hasOwnProperty(k)) {
          const
              l = MODEL.links[k],
              ldn = l.displayName;
          if(!fp || patternMatch(ldn, this.filter_pattern)) {
            enl.push(k);
            this.entities.push(l);
            addDistinct('L', this.filtered_types);
          }
        }
      }
      if(et.indexOf('A') >= 0) {
        imgs += '<img src="images/actor.png">';
        for(let k in MODEL.actors) if(MODEL.actors.hasOwnProperty(k)) {
          if(!fp || patternMatch(MODEL.actors[k].name, this.filter_pattern)) {
            enl.push(k);
            this.entities.push(MODEL.actors[k]);
            addDistinct('A', this.filtered_types);
          }
        }
      }
      enl.sort((a, b) => UI.compareFullNames(a, b, true));
    }
    document.getElementById('finder-entity-imgs').innerHTML = imgs;
    let seid = 'etr';
    for(let i = 0; i < enl.length; i++) {
      const e = MODEL.objectByID(enl[i]);
      if(e === se) seid += i;
      el.push(['<tr id="etr', i, '" class="dataset',
          (e === se ? ' sel-set' : ''), '" onclick="FINDER.selectEntity(\'',
          enl[i], '\', event.altKey);" onmouseover="FINDER.showInfo(\'', enl[i],
          '\', event.shiftKey);"><td draggable="true" ',
          'ondragstart="FINDER.drag(event);"><img class="finder" src="images/',
          e.type.toLowerCase(), '.png">', e.displayName,
          '</td></tr>'].join(''));
    }
    // NOTE: Reset `selected_entity` if not in the new list.
    if(seid === 'etr') this.selected_entity = null;
    this.entity_table.innerHTML = el.join('');
    UI.scrollIntoView(document.getElementById(seid));
    document.getElementById('finder-count').innerHTML = pluralS(
        el.length, 'entity', 'entities');
    this.updateRightPane();
  }
  
  updateRightPane() {
    const
        se = this.selected_entity,
        occ = [], // list with occurrences
        xol = [], // list with identifier of "expression owning" entities
        el = []; // list of HTML elements (table rows) to be added
    let hdr = '(no entity selected)';
    if(se) {
      hdr = `<em>${se.type}:</em> <strong>${se.displayName}</strong>`;
      // Make occurrence list.
      if(se instanceof Cluster) {
        // Clusters "occur" in their parent cluster.
        if(se.parent) occ.push(se.parent.identifier);
      } else if(se instanceof Factor) {
        // Factors "occur" in their parent cluster.
        occ.push(se.parent.identifier);
      } else if(se instanceof Actor) {
        // Actors "occur" in factors and clusters for which they are the
        // "owner".
        for(let k in MODEL.factors) if(MODEL.factors.hasOwnProperty(k)) {
          const f = MODEL.factors[k];
          if(f.actor === se) occ.push(f.identifier);
        }
        for(let k in MODEL.clusters) if(MODEL.clusters.hasOwnProperty(k)) {
          const c = MODEL.clusters[k];
          if(c.actor === se) occ.push(c.identifier);
        }
      } else if(se instanceof Link) {
        // Links "occur" in the parent of their FROM and TO factors.
        const c = MODEL.inferParentCluster(se);
        if(c) occ.push(c.identifier);
      }
      // Now also look for occurrences of entity references in expressions.
      const
          raw = escapeRegex(se.displayName),
          re = new RegExp(
              '\\[\\s*!?' + raw.replace(/\s+/g, '\\s+') + '\\s*[\\|\\@\\]]'),
          ax = MODEL.allExpressions;
      for(let i = 0; i < ax.length; i++) {
        const x = ax[i];
        if(re.test(x.text)) xol.push(x.object);
      }
    }
    document.getElementById('finder-item-header').innerHTML = hdr;
    occ.sort(compareSelectors);
    for(let i = 0; i < occ.length; i++) {
      const e = MODEL.objectByID(occ[i]);
      el.push(['<tr id="eotr', i, '" class="dataset" onclick="FINDER.reveal(\'',
          occ[i], '\');" onmouseover="FINDER.showInfo(\'',
          occ[i], '\', event.shiftKey);"><td><img class="finder" src="images/',
          e.type.toLowerCase(), '.png">', e.displayName,
          '</td></tr>'].join(''));
    }
    this.item_table.innerHTML = el.join('');
    // Clear the table row list.
    el.length = 0;
    // Now fill it with entity+attribute having a matching expression.
    for(let i = 0; i < xol.length; i++) {
      const
          id = xol[i],
          e = MODEL.objectByID(id);
      let img = e.type.toLowerCase(),
          // NOTE: A small left-pointing triangle denotes that the right-hand
          // part has the left hand part as its attribute.
          cs = '',
          td = '</td><td>&#x25C2;</td><td style="width:95%">' +
              e.displayName;
      el.push(['<tr id="eoxtr', i,
          '" class="dataset" onclick="FINDER.revealExpression(\'', id,
          '\', \'', attr, '\', event.shiftKey, event.altKey);"><td', cs, '>',
          '<img class="finder" src="images/', img, '.png">', td, '</td></tr>'
          ].join(''));
    }
    this.expression_table.innerHTML = el.join('');
    document.getElementById('finder-expression-hdr').innerHTML =
        pluralS(el.length, 'expression');
  }
  
  drag(ev) {
    // Start dragging the selected entity.
    let t = ev.target;
    while(t && t.nodeName !== 'TD') t = t.parentNode;
    ev.dataTransfer.setData('text', MODEL.objectByName(t.innerText).identifier);
    ev.dataTransfer.setDragImage(t, 25, 20);
  }
  
  changeFilter() {
    // Filter expression can start with 1+ entity letters plus `?` to
    // look only for the entity types denoted by these letters.
    let ft = this.filter_input.value,
        et = VM.entity_letters;
    if(/^(\*|[AFLS]+)\?/i.test(ft)) {
      ft = ft.split('?');
      // NOTE: *? denotes "all entity types except constraints".
      et = (ft[0] === '*' ? 'AFLS' : ft[0].toUpperCase());
      ft = ft.slice(1).join('=');
    }
    this.filter_string = ft;
    this.filter_pattern = patternList(ft);
    this.entity_types = et;
    this.updateDialog();
  }
  
  showInfo(id, shift) {
    // Display documentation for the entity identified by `id`.
    const e = MODEL.objectByID(id);
    if(e) DOCUMENTATION_MANAGER.update(e, shift);
  }
  
  selectEntity(id, alt=false) {
    // Look up entity, select it in the left pane, and update the right
    // pane. Open the "edit properties" modal dialog on double-click
    // and Alt-click if the entity is editable.
    const obj = MODEL.objectByID(id);
    this.selected_entity = obj;
    this.updateDialog();
    if(!obj) return;
    if(alt || this.doubleClicked(obj)) {
      if(obj instanceof Cluster && obj !== MODEL.top_cluster) {
        UI.showClusterPropertiesDialog(obj);
      } else if(obj instanceof Factor) {
        UI.showFactorPropertiesDialog(obj);
      } else if(obj instanceof Link) {
        UI.showLinkPropertiesDialog(obj);
      } else if(obj instanceof Actor) {
        ACTOR_MANAGER.showEditActorDialog(obj.name);
      } else if(obj instanceof Note) {
        obj.showNotePropertiesDialog();
      }
    }
  }
  
  reveal(id) {
    // Show selected occurrence.
    const
        se = this.selected_entity,
        obj = (se ? MODEL.objectByID(id) : null);
    if(!obj) console.log('Cannot reveal ID', id);
    if(obj instanceof Factor) {
      // @@TO DO: iterate through list of clusters containing this factor.
    } else if(obj instanceof Link) {
    } else if(obj.parent) {
      // Make parent cluster focal...
      UI.makeFocalCluster(obj.parent);
      // ... and select the entity.
      MODEL.select(obj);
      UI.scrollIntoView(obj.shape.element.childNodes[0]);
    }
    // NOTE: Return the object to save a second lookup by revealExpression.
    return obj;
  }
  
  revealExpression(id, attr, shift=false, alt=false) {
    const obj = this.reveal(id);
    if(!obj) return;
    shift = shift || this.doubleClicked(obj);
    if(attr && (shift || alt)) {
      if(obj instanceof Factor) {
        // NOTE: the second argument makes the dialog focus on the specified
        // attribute input field; the third makes it open the expression editor
        // as if modeler clicked on edit expression button
        UI.showFactorPropertiesDialog(obj, attr, alt);
      } else if(obj instanceof Link) {
        UI.showLinkPropertiesDialog(obj, attr, alt);
      }
    }
  }
  
} // END of class Finder
