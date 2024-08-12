/*
CLAST is an executable graphical editor for causal loop diagrams.
This tool is developed by Pieter Bots at Delft University of Technology.

This JavaScript file (clast-model.js) defines the object classes that
represent the CLAST model and its composing entities.
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

// CLASS CLASTModel
class CLASTModel {
  constructor(name, author) {
    this.name = name;
    this.author = author;
    this.comments = '';
    this.reset();
    this.xml_header = '<?xml version="1.0" encoding="ISO-8859-1"?>';
  }

  reset() { 
    // Reset model properties to their default values.
    const d = new Date();
    this.time_created = d;
    this.last_modified = d;
    this.version = CLAST_VERSION;
    this.actors = {};
    this.factors = {};
    this.clusters = {};
    this.links = {};
    this.next_factor_number = 1;
    this.focal_cluster = null;
    this.top_cluster = this.addCluster(UI.TOP_CLUSTER_NAME, UI.NO_ACTOR);
    this.focal_cluster = this.top_cluster;
    this.actor_list = [];
    // Inferred properties of graph: paths and cycles.
    this.cycle_list = [];
    this.path_matrix = {};
    this.selected_cycle = -1;
    this.show_all_cycles = false;

    // Model settings.
    this.grid_pixels = 20;
    this.align_to_grid = true;
    this.time_scale = 1;
    this.time_unit = CONFIGURATION.default_time_unit;
    this.run_length = 10;
    this.last_zoom_factor = 1;
    
    // Diagram editor related properties.
    this.selection = [];
    // Set the indicator that the model has not been executed yet.
    this.set_up = false;
    this.solved = false;
    // t is the time step ("tick") shown.
    this.t = 0;
    // Clock time is a vector with for each "tick" the clock time in hours.
    this.clock_time = [];
    this.cleanVector(this.clock_time, 0);
  }
  
  // NOTE: A model can also be the entity for the documentation manager,
  // and hence should have the methods `type` and `displayName`.
  get type() {
    return 'Model';
  }

  get displayName() {
    return (this.name || '(no name)') +
        ' (' + (this.author || 'unknown author') + ')';
  }

  /* METHODS THAT LOOKUP ENTITIES, OR INFER PROPERTIES */

  get simulationTime() {
    // Return the simulated clock time for the current time step.
    return this.t * this.timeStepDuration;
  }
  
  get timeStepDuration() {
    // Return duration of 1 time step in hours.
    return this.time_scale * VM.time_unit_values[this.time_unit];
  }
  
  get newFactorCode() {
    // Return the next unused factor code.
    const n = this.next_factor_number;
    this.next_factor_number++;
    // Factor codes are decimal number STRINGS.
    // NOTE: Factors are numbered zero-based, but displayed as 1, 2, etc.
    return '' + (n + 1);
  }
  
  noteByID(id) {
    // NOTE: Note object identifiers have syntax #cluster name#time stamp#.
    const parts = id.split('#');
    // Check whether the identifier matches this syntax.
    if(parts.length === 4 && this.clusters.hasOwnProperty(parts[1])) {
      // If so, get the cluster.
      const c = this.clusters[parts[1]];
      // Then look in this cluster for a note having the specified identifier.
      for(let i = 0; i < c.notes.length; i++) {
        if(c.notes[i].identifier === id) return c.notes[i];
      }
    }
    return null;
  }

  factorByID(id) {
    if(this.factors.hasOwnProperty(id)) return this.factors[id];
    return null;
  }
  
  factorByCode(code) {
    for(let k in this.factors) if(this.factors.hasOwnProperty(k)) {
      const f = this.factors[k];
      if(f.code === code) return f;
    }
    return null;
  }
  
  nodeBoxByID(id) {
    if(this.factors.hasOwnProperty(id)) return this.factors[id];
    if(this.clusters.hasOwnProperty(id)) return this.clusters[id];
    return null;
  }
  
  linkByID(id) {
    if(this.links.hasOwnProperty(id)) return this.links[id];
    return null;
  }

  actorByID(id) {
    if(this.actors.hasOwnProperty(id)) return this.actors[id];
    return null;
  }
  
  namedObjectByID(id) {
    // NOTE: not only entities, but also equations are "named objects", meaning
    // that their name must be unique in a model (unlike the titles of charts
    // and experiments)
    let obj = this.nodeBoxByID(id);
    if(obj) return obj;
    return this.actorByID(id);
  }
  
  objectByID(id) {
    let obj = this.namedObjectByID(id);
    if(obj) return obj;
    obj = this.linkByID(id);
    if(obj) return obj;
    return this.noteByID(id);
  }

  objectByName(name) {
    // Looks up a named object based on its display name.
    // NOTE: Top cluster is uniquely identified by its name.
    if(name === UI.TOP_CLUSTER_NAME) {
      return this.clusters[UI.nameToID(UI.TOP_CLUSTER_NAME)];
    }
    // Other names must be converted to an ID.
    if(name.indexOf(UI.LINK_ARROW) >= 0) {
      // NOTE: Link IDs are based on factor codes, not factor names.
      const nn = name.split(UI.LINK_ARROW),
          // NOTE: recursive calls to objectByName
          ff = this.objectByName(nn[0]),
          tf = this.objectByName(nn[1]);
      if(ff && tf) return this.linkByID(UI.linkIdentifier(ff, tf));
      return null;
    }
    // No link? Then standard conversion to ID.
    return this.namedObjectByID(UI.nameToID(name));
  }
  
  setByType(type) {
    // Return a "dictionary" object with entities of the specified types
    if(type === 'Factor') return this.factors;
    if(type === 'Link') return this.links;
    if(type === 'Actor') return this.actors;
    if(type === 'Cluster') return this.clusters;
    return {};
  }
  
  get allEntities() {
    // Return a "dictionary" of all entities in the model.
    return Object.assign({},
        this.factors, this.links, this.clusters, this.actors);
  }
  
  allMatchingEntities(re) {
    // Return list of enties with a display name that matches RegExp `re`.
    // NOTE: This routine is computationally intensive as it performs
    // matches on the display names of entities while iterating over all
    // relevant entity sets.
    const
        me = [],
        res = re.toString();
        
    function scan(dict) {
      // Try to match all entities in `dict`.
      // NOTE: Ignore method identifiers.
      for(let k in dict) if(dict.hasOwnProperty(k)) {
        const
            e = dict[k],
            m = [...e.displayName.matchAll(re)];
        if(m.length > 0) {
          // If matches, ensure that the groups have identical values
          const n = parseInt(m[0][1]);
          let same = true;
          for(let i = 1; same && i < m.length; i++) {
            same = parseInt(m[i][1]) === n;
          }
          // If so, add the entity to the set.
          if(same) me.push(e);
        }
      }  
    }
    
    // Links limit the search.
    if(res.indexOf(UI.LINK_ARROW) >= 0) {
      scan(this.links);
    } else {
      scan(this.actors);
      scan(this.factors);
      scan(this.clusters);
      scan(this.links);
    }
    return me;
  }
  
  entitiesEndingOn(s, attr='') {
    // Return a list of entities (of any type) having a display name that
    // ends on string `s`.
    // NOTE: The current implementation will overlook links having a FROM
    // node that ends on `s`.
    const re = new RegExp(escapeRegex(s) + '$', 'gi');
    return this.allMatchingEntities(re, attr);
  }

  entitiesInString(s) {
    // Return a list of entities referenced in string `s`.
    if(s.indexOf('[') < 0) return [];
    const
        el = [],
        ml = [...s.matchAll(/\[(\{[^\}]+\}){0,1}([^\]]+)\]/g)];
    for(let i = 0; i < ml.length; i++) {
      const n = ml[i][2].trim();
      let sep = n.lastIndexOf('|');
      if(sep < 0) sep = n.lastIndexOf('@');
      const
          en = (sep < 0 ? n : n.substring(0, sep)).trim(),
          e = this.objectByName(en);
      if(e) addDistinct(e, el);
    }
    return el;
  }
  
  inferPrefix(obj) {
    // Return the inferred (!) prefixes of `obj` as a list
    if(obj) {
      const pl = UI.prefixesAndName(obj.displayName);
      if(pl.length > 1) {
        pl.pop();
        return pl;
      }
    }
    return [];
  }
  
  areLinked(f1, f2) {
    // Return TRUE if a link between the two factors exists (in either
    // direction).
    return f1 && f2 && (this.links[UI.linkIdentifier(f1, f2)] ||
        this.links[UI.linkIdentifier(f2, f1)]);
  }
  
  //
  //  Methods that add an entity to the model
  //

  addActor(name, node=null) {
    if(name === '') return this.actors[UI.nameToID(UI.NO_ACTOR)];
    name = UI.cleanName(name);
    const id = UI.nameToID(name);
    if(!this.actors.hasOwnProperty(id)) {
      this.actors[id] = new Actor(name);
      if(node) {
        this.actors[id].initFromXML(node);
      }
    }
    return this.actors[id];
  }

  addNote(node=null) {
    // Add a note to the focal cluster.
    let n = new Note(this.focal_cluster);
    if(node) n.initFromXML(node);
    this.focal_cluster.notes.push(n);
    return n;
  }

  addCluster(name, actor_name, node=null) {
    const actor = this.addActor(actor_name);
    name = UI.cleanName(name);
    if(!UI.validName(name)) {
      UI.warningInvalidName(name);
      return null;
    }
    const n = name + (actor.name != UI.NO_ACTOR ? ` (${actor.name})` : '');
    let c = this.namedObjectByID(UI.nameToID(n));
    if(c !== null) {
      // Preserve name uniqueness.
      if(!(c instanceof Cluster)) {
        UI.warningEntityExists(c);
        return null;
      }
      if(node) c.initFromXML(node);
      return c;
    }
    c = new Cluster(this.focal_cluster, name, actor);
    this.clusters[c.identifier] = c;
    // Do not add cluster as sub-cluster of itself (applies to TOP CLUSTER)
    if(this.focal_cluster && c !== this.focal_cluster) {
      this.focal_cluster.sub_clusters.push(c);
    }
    c.resize();
    if(node) c.initFromXML(node);
    return c;
  }

  addFactor(name, actor_name, node=null) {
    const actor = this.addActor(actor_name);
    name = UI.cleanName(name);
    if(!UI.validName(name)) {
      UI.warningInvalidName(name);
      return null;
    }
    const n = name + (actor.name != UI.NO_ACTOR ? ` (${actor.name})` : '');
    let nb = this.namedObjectByID(UI.nameToID(n));
    if(nb !== null) {
      // Preserve name uniqueness.
      if(nb instanceof Factor) return nb;
      UI.warningEntityExists(nb);
      return null;
    }
    const f = new Factor(this.top_cluster, name, actor);
    addDistinct(f, this.top_cluster.factors);
    if(node) f.initFromXML(node);
    f.setCode();
    this.factors[f.identifier] = f;
    f.resize();
    return f;
  }

  addLink(from_f, to_f, node=null) {
    // Add link between FROM and TO factor.
    let l = this.linkByID(UI.linkIdentifier(from_f, to_f));
    if(l !== null) {
      if(node) l.initFromXML(node);
      return l;
    }
    l = new Link(from_f, to_f);
    if(node) l.initFromXML(node);
    this.links[l.identifier] = l;
    from_f.outputs.push(l);
    to_f.inputs.push(l);
    return l;
  }
  
  //
  // Methods related to the model diagram layout
  //

  alignToGrid() {
    // Move all positioned model elements to the nearest grid point.
    if(!this.align_to_grid) return;
    let move = false;
    const fc = this.focal_cluster;
    // NOTE: Do not align notes to the grid. This will permit more
    // precise positioning, while aligning will not improve the layout
    // of the diagram because notes are not connected to arrows.
    // However, when notes relate to nearby nodes, preserve their relative
    // position to this node.
    for(let i = 0; i < fc.notes.length; i++) {
      const
          note = fc.notes[i],
          nbn = note.nearbyNode;
      note.nearby_pos = (nbn ? {node: nbn, oldx: nbn.x, oldy: nbn.y} : null);
    }
    for(let i = 0; i < fc.factors.length; i++) {
      move = fc.factors[i].alignToGrid() || move;
    }
    for(let i = 0; i < fc.sub_clusters.length; i++) {
      move = fc.sub_clusters[i].alignToGrid() || move;
    }
    if(move) UI.drawDiagram(this);
  }
  
  translateGraph(dx, dy) {
    // Move all entities in the focal cluster by (dx, dy) pixels.
    if(!dx && !dy) return;
    // Keep track of time last translated to prevent ultrafast movement.
    const
        now = Date.now(),
        dt = now - this.last_translation;
    if(dt < 100) return;
    this.last_translation = now;
    
    const fc = this.focal_cluster;
    for(let i = 0; i < fc.factors.length; i++) {
      fc.factors[i].x += dx;
      fc.factors[i].y += dy;
    }
    for(let i = 0; i < fc.sub_clusters.length; i++) {
      fc.sub_clusters[i].x += dx;
      fc.sub_clusters[i].y += dy;
    }
    for(let i = 0; i < fc.notes.length; i++) {
      fc.notes[i].x += dx;
      fc.notes[i].y += dy;
    }
    // NOTE: force drawing, because SVG must immediately be downloadable.
    UI.drawDiagram(this);
    // If dragging, add (dx, dy) to the properties of the top "move" UndoEdit.
    if(UI.dragged_node) UNDO_STACK.addOffset(dx, dy);
  }

  //
  // Methods related to selection 
  //
  
  select(obj) {
    obj.selected = true;
    if(this.selection.indexOf(obj) < 0) {
      this.selection.push(obj);
      UI.drawObject(obj);
    }
  }

  deselect(obj) {
    obj.selected = false;
    let i = this.selection.indexOf(obj);
    if(i >= 0) {
      this.selection.splice(i, 1);
    }
    UI.drawObject(obj);
  }

  selectList(ol) {
    // Set selection to elements in `ol`.
    // NOTE: First clear present selection without redrawing.
    this.clearSelection(false);
    for(let i = 0; i < ol.length; i++) {
      ol[i].selected = true;
      if(this.selection.indexOf(ol[i]) < 0) this.selection.push(ol[i]);
    }
    // NOTE: Does not redraw the graph -- the calling routine should do that.
  }
  
  get getSelectionPositions() {
    // Return a list of tuples [X, y] for all selected nodes
    const pl = [];
    for(let i = 0; i < this.selection.length; i++) {
      let obj = this.selection[i];
      if(!(obj instanceof Link)) pl.push([obj.x, obj.y]);
    }
    return pl;
  }

  setSelectionPositions(pl) {
    // Set position of selected nodes to the [X, Y] passed in the list.
    // NOTE: Iterate backwards over the selection ...
    for(let i = this.selection.length - 1; i >= 0; i--) {
      let obj = this.selection[i];
      if(obj instanceof Factor || obj instanceof Cluster) {
        // ... and apply [X, Y] only to nodes in the selection.
        const xy = pl.pop();
        obj.x = xy[0];
        obj.y = xy[1];
      }
    }
  }

  clearSelection(draw=true) {
    if(this.selection.length > 0) {
      for(let i = 0; i < this.selection.length; i++) {
        const obj = this.selection[i];
        obj.selected = false;
        if(draw) UI.drawObject(obj);
      }
    }
    this.selection.length = 0;
  }

  setSelection() {
    // Set selection to contain all selected entities in the focal cluster.
    // NOTE: to be called after loading a model, and after UNDO/REDO (and
    // then before drawing the diagram)
    const fc = this.focal_cluster;
    this.selection.length = 0;
    for(let i = 0; i < fc.factors.length; i++) {
      const f = fc.factors[i];
      if(f.selected) this.selection.push(f);
    }
    for(let i = 0; i < fc.sub_clusters.length; i++) {
      if(fc.sub_clusters[i].selected) {
        this.selection.push(fc.sub_clusters[i]);
      }
    }
    for(let i = 0; i < fc.notes.length; i++) if(fc.notes[i].selected) {
      this.selection.push(fc.notes[i]);
    }
    const rl = fc.relatedLinks;
    for(let i = 0; i < rl; i++) if(rl[i].selected) {
      this.selection.push(rl[i]);
    }
  }
  
  get factorInSelection() {
    // Return TRUE if current selection contains at least one factor.
    for(let i = 0; i < this.selection.length; i++) {
      if(this.selection[i] instanceof Factor) return true;
    }
    return false;
  }

  moveSelection(dx, dy){
    // Move all selected nodes unless cursor was not moved.
    // NOTE: No undo, as moves are incremental; the original positions
    // have been stored on MOUSE DOWN.
    if(dx === 0 && dy === 0) return;
    let obj,
        minx = 0,
        miny = 0;
    for(let i = 0; i < this.selection.length; i++) {
      obj = this.selection[i];
      if(!(obj instanceof Link)) {
        obj.x += dx;
        obj.y += dy;
        minx = Math.min(minx, obj.x - obj.width / 2);
        miny = Math.min(miny, obj.y - obj.height / 2);
      }
    }
    // Translate entire graph if some elements are above and/or left of
    // the paper edge.
    if(minx < 0 || miny < 0) {
      // NOTE: limit translation to 5 pixels to prevent "run-away effect"
      this.translateGraph(Math.min(5, -minx), Math.min(5, -miny));
    } else {
      UI.drawSelection(this);
    }
    this.alignToGrid();
  }
  
  get topLeftCornerOfSelection() {
    // Return the pair [X coordinate of the edge of the left-most selected node,
    // Y coordinate of the edge of the top-most selected node]
    if(this.selection.length === 0) return [0, 0];
    let minx = VM.PLUS_INFINITY,
        miny = VM.PLUS_INFINITY;
    for(let i = 0; i < this.selection.length; i++) {
      let obj = this.selection[i];
      if(!(obj instanceof Link)) {
        minx = Math.min(minx, obj.x - obj.width / 2);
        miny = Math.min(miny, obj.y - obj.height / 2);
      }
    }
    return [minx, miny];
  }
  
  eligibleFromToFactors() {
    // Return a list of factors that are visible in the focal cluster.
    const
        fc = this.focal_cluster,
        ftf = [];
    for(let i = 0; i < fc.factors.length; i++) {
      ftf.push(fc.factors[i]);
    }
    return ftf;
  }

  get selectionAsXML() {
    // Return XML for the selected entities, and also for the entities
    // referenced by their expressions.
    // NOTE: The name and actor name of the focal cluster are added as
    // attributes of the main node to permit "smart" renaming of
    // entities when PASTE would result in name conflicts.
    if(this.selection.length <= 0) return '';
    const
        fc_name = this.focal_cluster.name,
        fc_actor = this.focal_cluster.actor.name,
        entities = {
          Factor: [],
          Cluster: [],
          Link: [],
          Note: []
        },
        extras = [],
        from_tos = [],
        xml = [],
        extra_xml = [],
        ft_xml = [],
        self_xml = [],
        selected_xml = [];
    for(let i = 0; i < this.selection.length; i++) {
      const obj = this.selection[i];
      entities[obj.type].push(obj);
      if(obj instanceof Factor) self_xml.push(
          '<self name="', xmlEncoded(obj.name),
          '" actor-name="', xmlEncoded(obj.actor.name), '"></self>');
      selected_xml.push(`<sel>${xmlEncoded(obj.displayName)}</sel>`);
    }
    // Expand (sub)clusters by adding all their model entities to their
    // respective lists.
    for(let i = 0; i < entities.Cluster.length; i++) {
      const c = entities.Cluster[i];
      // All sub-clusters must be copied.
      mergeDistinct(c.allFactors, entities.Factor);
      // Likewise for all related links.
      mergeDistinct(c.relatedLinks, entities.Link);
    }
    // Only add the XML for notes in the selection.
    for(let i = 0; i < entities.Note.length; i++) {
      xml.push(entities.Note[i].asXML);
    }
    for(let i = 0; i < entities.Factor.length; i++) {
      const a = entities.Factor[i];
      xml.push(a.asXML);
    }
    // Add all links that have (implicitly via clusters) been selected
    for(let i = 0; i < entities.Link.length; i++) {
      const l = entities.Link[i];
      // NOTE: The FROM and/or TO node need not be selected; if not, put
      // them in a separate list
      if(entities.Factor.indexOf(l.from_factor) < 0) {
        addDistinct(l.from_factor, from_tos);
      }
      if(entities.Factor.indexOf(l.to_factor) < 0) {
        addDistinct(l.to_factor, from_tos);
      }
      xml.push(l.asXML);
    }
    for(let i = 0; i < from_tos.length; i++) {
      const f = from_tos[i];
      ft_xml.push('<from-to name="', xmlEncoded(f.name),
          '" actor-name="', xmlEncoded(f.actor.name), '"></from-to>');
    }
    for(let i = 0; i < extras.length; i++) {
      extra_xml.push(extras[i].asXML);
    }
    return ['<copy timestamp="', Date.now(),
        '" model-timestamp="', this.time_created.getTime(),
        '" parent-name="', xmlEncoded(fc_name),
        '" parent-actor="', xmlEncoded(fc_actor),
        '"><entities>', xml.join(''),
        '</entities><from-tos>', ft_xml.join(''),
        '</from-tos><extras>', extra_xml.join(''),
        '</extras><selection>', selected_xml.join(''),
        '</selection></copy>'].join('');
  }
  
  dropSelectionIntoCluster(c) {
    // Move all selected nodes to cluster `c`.
    let n = 0,
        rmx = c.rightMarginX,
        tlc = this.topLeftCornerOfSelection,
        dx = rmx + 50 - tlc[0],
        dy = 50 - tlc[1];
    for(let i = 0; i < this.selection.length; i++) {
      const obj = this.selection[i];
      if(obj instanceof Cluster || obj instanceof Factor) {
        obj.setCluster(c);
        obj.x += dx;
        obj.y += dy;
        n++;
      }
      // NOTE: ignore selected links, as these will be "taken along"
      // automatically.
    }
    if(n) {
      UI.notify(pluralS(n, 'node') + ' moved to cluster ' + c.displayName);
    }
    // Clear the selection WITHOUT redrawing the selected entities
    // (as these will no longer be part of the graph)
    this.clearSelection(false);
    UI.drawDiagram(this);
  }
  
  deleteSelection() {
    // Remove all selected nodes (with their associated links and constraints)
    // and selected links.
    // NOTE: This method implements the DELETE action, and hence should be
    // undoable. The UndoEdit is created by the calling routine; the methods
    // that actually delete model elements append their XML to the XML attribute
    // of this UndoEdit
    let obj,
        fc = this.focal_cluster;
    // Update the documentation manager (GUI only) if selection contains the
    // current entity.
    if(DOCUMENTATION_MANAGER) DOCUMENTATION_MANAGER.clearEntity(this.selection);
    // First delete links and constraints.
    for(let i = this.selection.length - 1; i >= 0; i--) {
      if(this.selection[i] instanceof Link) {
        obj = this.selection.splice(i, 1)[0];
        this.deleteLink(obj);
      }
    }
    // Then delete selected nodes.
    for(let i = this.selection.length - 1; i >= 0; i--) {
      obj = this.selection.splice(i, 1)[0];
      // NOTE: when deleting a selection, this selection has been made in the
      // focal cluster
      if(obj instanceof Note) {
        fc.deleteNote(obj);
      } else if(obj instanceof Factor) {
        fc.deleteFactor(obj);
      } else {
        this.deleteCluster(obj);
      }
    }
    UI.drawDiagram(this);
  }

  //
  // Methods that delete entities from the model
  //
  
  deleteFactor(node) {
    // Delete a factor and its associated links and constraints from the model.
    // First generate the XML for restoring the node, but add it later to the
    // UndoEdit so that it comes BEFORE the XML of its subelements.
    let xml = node.asXML;
    // Remove associated links
    for(let l in this.links) if(this.links.hasOwnProperty(l)) {
      l = this.links[l];
      if(l.from_node == node || l.to_node == node) this.deleteLink(l);
    }
    UI.removeShape(node.shape);
    node.parent.deleteFactor(node);
    delete this.factors[node.identifier];
    // Now insert XML for node, so that the constraints will be restored properly
    UNDO_STACK.addXML(xml);
  }

  deleteCluster(c, with_xml=true) {
    // Remove cluster `c` from model
    // NOTE: only append the cluster's XML to the UndoEdit if it is the first
    // cluster to be deleted (because this XML contains full XML of all
    // sub-clusters)
    if(with_xml) UNDO_STACK.addXML(c.asXML);
    // Then delete all of its parts (appending their XML to the UndoEdit)
    let i;
    // NOTE: Delete notes, factors and subclusters in this cluster
    // WITHOUT appending their XML, as this has already been generated as part
    // of the cluster's XML
    for(i = c.notes.length - 1; i >= 0; i--) {
      c.deleteNote(c.notes[i], false);
    }
    for(i = c.factors.length - 1; i >= 0; i--) {
      c.deleteFactor(c.factors[i], false);
    }
    for(i = c.sub_clusters.length - 1; i >= 0; i--) {
      // NOTE: Recursive call, but lower level clusters will not output undo-XML.
      this.deleteCluster(c.sub_clusters[i], false); 
    }
    // Remove the cluster from its parent's subcluster list.
    i = c.parent.sub_clusters.indexOf(c);
    if(i >= 0) c.parent.sub_clusters.splice(i, 1);
    UI.removeShape(c.shape);
    // Finally, remove the cluster from the model
    delete this.clusters[c.identifier];
  }

  deleteLink(link) {
    // Remove link from model.
    // First remove link from outputs list of its FROM node.
    let i = link.from_factor.outputs.indexOf(link);
    if(i >= 0) link.from_factor.outputs.splice(i, 1);
    // Also remove link from inputs list of its TO node.
    i = link.to_factor.inputs.indexOf(link);
    if(i >= 0) link.to_factor.inputs.splice(i, 1);
    // Finally, remove link from the model.
    UNDO_STACK.addXML(link.asXML);
    delete this.links[link.identifier];
    this.cleanUpFeedbackLinks();
  }

  cleanUpActors() {
    // Remove actors that do not occur as "owner" of any factor or
    // cluster, and update the model property `actor_list` accordingly.
    // NOTE: This actor list contains 2-tuples [id, name].
    const l = [];
    // Compile a list of all actors that are "owner" of a factor and/or
    // cluster. 
    for(let k in this.factors) if(this.factors.hasOwnProperty(k)) {
      const a = this.factors[k].actor;
      if(l.indexOf(a.identifier) < 0) l.push(a.identifier);
    }
    for(let k in this.clusters) if(this.clusters.hasOwnProperty(k)) {
      const a = this.clusters[k].actor;
      if(l.indexOf(a.identifier) < 0) l.push(a.identifier);
    }
    // Then remove actors that are NOT on this "actors in use" list
    for(let k in this.actors) if(this.actors.hasOwnProperty(k)) {
      if(l.indexOf(k) < 0) {
        const a = this.actors[k];
        // NOTE: XML for these actors must be appended to the undo because
        // actors have modeler-defined properties.
        UNDO_STACK.addXML(a.asXML);
        delete this.actors[k];
      }
    }
    // Update the sorted actor list that is used in dialogs.
    this.actor_list.length = 0;
    for(let i in this.actors) if(this.actors.hasOwnProperty(i)) {
      const a = this.actors[i];
      this.actor_list.push([a.identifier, a.displayName]);
    }
    // NOTE: sorting will automatically put "(no actor)" at the top since
    // "(" (ASCII 40) comes before "0" (ASCII 48)
    this.actor_list.sort(function(a, b) {return a[0].localeCompare(b[0]);});
  }

  makePredecessorLists() {
    // Compose for each node its list of predecessor nodes.
    // NOTE: First reset all lists, and unset the `visited` flags of links.
    for(let f in this.factors) if (this.factors.hasOwnProperty(f)) {
      this.factors[f].predecessors.length = 0;
    }
    for(let l in this.links) if(this.links.hasOwnProperty(l)) {
      this.links[l].visited = false;
    }
    // Only then compute the predecessor lists.
    for(let f in this.factors) if(this.factors.hasOwnProperty(f)) {
      this.factors[f].setPredecessors();
    }
  }

  cleanUpFeedbackLinks() {
    // Set feedback property for all links that are part of a loop,
    // and return TRUE when a change has occurred.
    this.buildPathMatrix();
    this.makePredecessorLists();
    let redraw = false;
    for(let k in this.links) if(this.links.hasOwnProperty(k)) {
      const
          l = this.links[k],
          fb = l.is_feedback;
      l.is_feedback = (l.from_factor.predecessors.indexOf(l.to_factor) >= 0);
      redraw = redraw || (fb !== l.is_feedback);
    }
    if(redraw) UI.drawDiagram(this);
  }
  
  pathAsString(c) {
    // Return cycle (= list of factors) as a human-readable string.
    return c.map((f) => f.displayName).join(UI.LINK_ARROW);
  }

  sproutPathsFrom(path) {
    // Add paths to all nodes that stem from `path`.
    const linksout = path[path.length - 1].outputs;
    for(let i = 0; i < linksout.length; i++) {
      const tf = linksout[i].to_factor;
      const tfi = path.indexOf(tf);
      // NOTE: Index = 0 indicates a cycle => add, but stop recursion.
      if(tfi <= 0) {
        // New path is existing path plus the TO factor of the link.
        const p = path.slice();
        p.push(tf);
        this.path_matrix[p[0].identifier].push(p);
        // If not in original path, recurse.
        if(tfi < 0) this.sproutPathsFrom(p);
      }
    }
  }
  
  buildPathMatrix() {
    // Build a lookup with for each factor the list of all paths from
    // this factor to some other factor.
    this.path_matrix = {};
    for(let k in this.factors) if(this.factors.hasOwnProperty(k)) {
      const linksout = this.factors[k].outputs;
      for(let j = 0 ; j < linksout.length; j++) {
        const path = [];
        path.push(this.factors[k]);
        path.push(linksout[j].to_factor);
        this.path_matrix[k] = [path];
        // NOTE: New path may be a 2-factor cycle, and then we're done.
        if(path[0] !== path[1]) this.sproutPathsFrom(path);
      }
    }
    this.cycle_list.length = 0;
    for(let k in this.path_matrix) if(this.path_matrix.hasOwnProperty(k)) {
      const pl = this.path_matrix[k];
      for(let i = 0; i < pl.length; i++) {
        const p = pl[i];
        if(p[0] === p[p.length - 1]) {
          // Path begins and ends with same factor => add cycle unless
          // identical to already recorded cycle.
          let known = false;
          for(let j = 0; j < this.cycle_list.length && !known; j++) {
            const c = this.cycle_list[j];
            known = (p.length === c.length && intersection(p, c).length === p.length);
          }
          if(!known) this.cycle_list.push(p);
        }
      }
    }
  }
  
  get cycleListStrings() {
    const cls = [];
    for(let i = 0; i < this.cycle_list.length; i++) {
      cls.push(this.pathAsString(this.cycle_list[i]));
    }
    return cls.join('\n');
  }
  
  get triggerSequence() {
    // Return a lookup of lists of factors, where seq[0] holds all
    // entry factors, seq[1] the immediate successors of these entry
    // factors, etc., and seq['NR'] the functions that can *not* be
    // reached from any entry factor.
    const
        af = this.top_cluster.allFactors,
        al = [],
        seq = [];
    let n = 0;
    for(let i = af.length - 1; i >= 0; i--) {
      const f = af[i];
      if(!f.inputs.length || (f.expression.defined && f.expression.isStatic)) {
        al.push(af.splice(i, 1)[0]);
      }
    }
    while(al.length) {
      const pl = al.slice();
      seq[n] = pl;
      n++;
      al.length = 0;
      for(let i = af.length - 1; i >= 0; i--) {
        const f = af[i];
        for(let j = 0; j < f.inputs.length; j++) {
          if(pl.indexOf(f.inputs[j].from_factor) >= 0) al.push(af.splice(i, 1)[0]);
        }
      }
    }
    if(af.length) {
      seq.unreachable = af;
    }
    return seq;
  }

  //
  // Methods for loading and saving the model
  //
  
  parseXML(data) {
    // Parse data string into XML tree
//    try {
      // NOTE: Convert %23 back to # (escaped by function saveModel)
      const xml = parseXML(data.replace(/%23/g, '#'));
      this.initFromXML(xml);
      return true;
/*
    } catch(err) {
      // Cursor is set to WAITING when loading starts
      UI.normalCursor();
      UI.alert('Error while parsing model: ' + err);
      return false;
    }
*/
  }

  initFromXML(node) {
    // Initialize a model from the XML tree with `node` as root.
    this.reset();
    this.next_factor_number = safeStrToInt(
        nodeParameterValue(node, 'next-factor-number'));
    this.last_zoom_factor = safeStrToFloat(
        nodeParameterValue(node, 'zoom'), 1);
    this.align_to_grid = nodeParameterValue(node, 'align-to-grid') === '1';
    this.time_scale = safeStrToFloat(nodeParameterValue(node, 'time-scale'), 1);
    this.time_unit = nodeParameterValue(node, 'time-unit') || 'hour';
    this.run_length = safeStrToInt(nodeParameterValue(node, 'run-length'), 10);
    this.name = xmlDecoded(nodeContentByTag(node, 'name'));
    this.author = xmlDecoded(nodeContentByTag(node, 'author'));
    this.comments = xmlDecoded(nodeContentByTag(node, 'comments'));
    this.last_modified = new Date(
        xmlDecoded(nodeContentByTag(node, 'last-saved')));
    this.version = xmlDecoded(nodeContentByTag(node, 'version'));
    this.grid_pixels = Math.max(10,
        safeStrToInt(nodeContentByTag(node, 'grid-pixels')));
    // First create all actors.
    let n = childNodeByTag(node, 'actors');
    if(n && n.childNodes) {
      for(let i = 0; i < n.childNodes.length; i++) {
        const c = n.childNodes[i];
        if(c.nodeName === 'actor') {
          const name = xmlDecoded(nodeContentByTag(c, 'name'));
          this.addActor(name, c);
        }
      }
    }
    this.focal_cluster = this.top_cluster;
    // Then create all factors -- first as nodes in the focal cluster.
    n = childNodeByTag(node, 'factors');
    if(n && n.childNodes) {
      for(let i = 0; i < n.childNodes.length; i++) {
        const c = n.childNodes[i];
        if(c.nodeName === 'factor') {
          const
              name = xmlDecoded(nodeContentByTag(c, 'name')),
              actor = xmlDecoded(nodeContentByTag(c, 'actor'));
          this.addFactor(name, actor, c);
        }
      }
    }
    // Now links can be added.
    n = childNodeByTag(node, 'links');
    if(n && n.childNodes) {
      for(let i = 0; i < n.childNodes.length; i++) {
        const c = n.childNodes[i];
        if(c.nodeName === 'link') {
          const
              fc = nodeContentByTag(c, 'from-code'),
              ff = this.factorByCode(fc),
              tc = nodeContentByTag(c, 'to-code'),
              tf = this.factorByCode(tc);
          if(ff && tf) {
            this.addLink(ff, tf, c);
          } else {
            console.log('ERROR: Failed to add link from', fc, 'to', tc);
          }
        }
      }
    }
    // Only now make cluster hierarchy.
    n = childNodeByTag(node, 'clusters');
    if(n && n.childNodes) {
      for(let i = 0; i < n.childNodes.length; i++) {
        const c = n.childNodes[i];
        if(c.nodeName === 'cluster') {
          const
              name = xmlDecoded(nodeContentByTag(c, 'name')),
              actor = xmlDecoded(nodeContentByTag(c, 'owner'));
          
          this.addCluster(name, actor, c);
        }
      }
    }
    this.focal_cluster = this.top_cluster;
    // Detect feedback links and cycles.
    this.cleanUpFeedbackLinks();
    // Recompile expressions so that they refer to the correct entities.
    this.compileExpressions();
  }

  get asXML() {
    let p = [' next-factor-number="', this.next_factor_number,
        '" zoom="', this.last_zoom_factor,
        '" run-length="', this.run_length,
        '" time-scale="', this.time_scale,
        '" time-unit="', this.time_unit,
        '"'].join('');
    if(this.align_to_grid) p += ' align-to-grid="1"';
    let xml = this.xml_header + ['<model', p, '><name>',  xmlEncoded(this.name),
        '</name><author>', xmlEncoded(this.author),
        '</author><comments>', xmlEncoded(this.comments),
        '</comments><version>',  xmlEncoded(CLAST_VERSION),
        '</version><last-saved>',  xmlEncoded(this.last_modified.toString()),
        '</last-saved><grid-pixels>', this.grid_pixels,
        '</grid-pixels><actors>'].join('');
    for(let a in this.actors) {
      // NOTE: do not to save "(no actor)"
      if(this.actors.hasOwnProperty(a) && a != UI.nameToID(UI.NO_ACTOR)) {
        xml += this.actors[a].asXML;
      }
    }
    xml += '</actors><factors>';
    for(let f in this.factors) {
      if(this.factors.hasOwnProperty(f)) xml += this.factors[f].asXML;
    }
    xml += '</factors><links>';
    for(let l in this.links) {
      if(this.links.hasOwnProperty(l)) xml += this.links[l].asXML;
    }
    // NOTE: Cluster XML defines its own subclusters.
    xml += `</links><clusters>${this.top_cluster.asXML}</clusters>`;
    return xml + '</model>';
  }
  
  get listOfAllComments() {
    const sl = [];
    sl.push('_____MODEL: ' + this.name);
    sl.push('<strong>Author:</strong> ' + this.author);
    sl.push(this.comments);
    sl.push('_____Actors');
    for(let a in this.actors) {
      if(this.actors.hasOwnProperty(a)) {
        sl.push(this.actors[a].displayName, this.actors[a].comments);
      }
    }
    sl.push('_____Factors');
    for(let f in this.factors) {
      if(this.factors.hasOwnProperty(f)) {
        sl.push(this.factors[f].displayName, this.factors[f].comments);
      }
    }
    sl.push('_____Clusters');
    for(let c in this.clusters) {
      if(this.clusters.hasOwnProperty(c)) {
        sl.push(this.clusters[c].displayName, this.clusters[c].comments);
      }
    }
    sl.push('_____Links');
    for(let l in this.links) {
      if(this.links.hasOwnProperty(l)) {
        sl.push(this.links[l].displayName, this.links[l].comments);
      }
    }
    return sl;
  }
  
  /* METHODS RELATED TO EXPRESSIONS */
  
  cleanVector(v, initial, other=VM.NOT_COMPUTED) {
    // Set an array to [0, ..., run length] of numbers initialized as
    // "not computed" to ensure that they will be evaluated "lazily"
    // NOTES:
    // (1) the first element (0) corresponds to t = 0, i.e., the model
    //     time step just prior to the time step defined by start_period.
    // (2) All vectors must be initialized with an appropriate value for
    //     element 0.
    // (3) `other` specifies value for t = 1 and beyond if vector is
    //     static and has to to be initialized to a constant (typically 0).
    v.length = this.run_length + 1;
    v.fill(other);
    v[0] = initial;
  }
  
  get allExpressions() {
    // Return list of all Expression objects in this model.
    const xl = [];
    // Each factor has an expression.
    for(let k in this.factors) if(this.factors.hasOwnProperty(k)) {
      xl.push(this.factors[k].expression);
    }
    // Each link has an expression for its multiplier.
    for(let k in this.links) if(this.links.hasOwnProperty(k)) {
      xl.push(this.links[k].expression);
    }
    return xl;
  }

  resetExpressions() {
    // Create a new vector for all expressions in the model, setting their
    // initial value (t=0) to "undefined" and for all other cycles ("ticks")
    // to "not computed".
    const ax = this.allExpressions;
    for(let i = 0; i < ax.length; i++) {
      ax[i].reset(VM.UNDEFINED);
    }
    // Initialized status vector of all factors as "undefined".
    for(let k in this.factors) if(this.factors.hasOwnProperty(k)) {
      MODEL.cleanVector(this.factors[k].status, VM.UNDEFINED);
    }
  }
  
  compileExpressions() {
    // Compile all expression attributes of all model entities
    const ax = this.allExpressions;
    for(let i = 0; i < ax.length; i++) {
      ax[i].compile();
    }
  }
  
  get factorCategories() {
    // Return object {action, context, outcome} where each property is a list
    // of factors belonging to that category.
    // @@OPTION: ignore actors that have not been checked in the actor list.
    const fc = {action: [], context: [], outcome: []};
    for(let k in this.factors) if(this.factors.hasOwnProperty(k)) {
      const f = this.factors[k];
      if(f.inputs.length) {
        if(f.outputs.length) {
          // "Internal" factors (i.e., having both inputs and outputs) are
          // considered an outcome of interest if they are "owned" by an actor.
          if(f.hasActor) fc.outcome.push(k);
        } else {
          // When not "owned", it must still be an outcome of interest or it
          // should not be part of the model. 
          fc.outcome.push(f);
        }
      } else {
        // No incoming links => action if "owned" by an actor, otherwise context.
        if(f.hasActor) {
          fc.action.push(f);
        } else {
          fc.context.push(f);
        }
      }
    }
    console.log('HERE fc', fc);
    return fc;
  }
  
  pathImpact(p, f) {
    // Return multiplier product for links on path `p` from start to factor `f`.
  }
  
  impactTable(type=1) {
    // Type 1: actions => outcomes, type 2: context => outcomes; type 3: combined.
    this.buildPathMatrix();
    const
        fc = this.factorCategories,
        tbl = {};
    if(type % 2 === 1) {
      for(let i = 0; i < fc.action.length; i++) {
        const
            pl = this.path_matrix[fc.identifier],
            impacts = [];
        for(let j = 0; j < fc.outcome.lengh; j++) {
          const o = fc.outcome[j];
          for(let pi = 0; pi < pl.length; pi ++) {
            const op = pl[pi].indexOf(o);
            if(op < 0) {
              impacts.push(0);
            } else {
              // Calculate and push link multiplier result.
              impacts.push(this.pathImpact(pl[pi], o));
            }
          }
        }
      }
    }
    if(type > 1) {
      for(let i = 0; i < fc.context.length; i++) {
        
      }
    }
    return tbl;
  }
  
} // END of class CLASTModel


// CLASS Actor
class Actor {
  constructor(name) {
    this.name = name;
    this.comments = '';
    this.color = '#ffffff';
  }

  get type() {
    return 'Actor';
  }

  get typeLetter() {
    return 'A';
  }

  get identifier() {
    return UI.nameToID(this.name);
  }
  
  get displayName() {
    return this.name;
  }
  
  get factorCount() {
    // Return the number of factors "owned" by this actor.
    let n = 0;
    for(let k in MODEL.factors) if(MODEL.factors.hasOwnProperty(k)) {
      if(MODEL.factors[k].actor === this) n++;
    }
    return n;
  }
  
  get asXML() {
    return ['<actor color="', this.color.substring(1, 7), 
        '"><name>', xmlEncoded(this.name),
        '</name><comments>', xmlEncoded(this.comments),
        '</comments></actor>'].join('');
  }
  
  initFromXML(node) {
    this.color = '#' + (nodeParameterValue(node, 'color') || 'ffffff');
    this.comments = nodeContentByTag(node, 'documentation');
  }
  
  rename(name) {
    // Change the name of this actor
    // NOTE: Colons are prohibited in actor names to avoid confusion
    // with prefixed entities.
    name = UI.cleanName(name);
    if(name.indexOf(':') >= 0 || !UI.validName(name)) {
      UI.warn(UI.WARNING.INVALID_ACTOR_NAME);
      return null;
    }
    // Create a new actor entry
    const
        a = MODEL.addActor(name),
        old_id = this.identifier;
    // Rename the current instance.
    // NOTE: this object should persist, as many other objects refer to it
    this.name = a.name;
    // Put it in the "actor dictionary" of the model at the place of the newly
    // created instance (which should automatically be garbage-collected)
    MODEL.actors[a.identifier] = this;
    // Remove the old entry
    delete MODEL.actors[old_id];
    return this;
  }
  
} // END of class Actor


// CLASS ObjectWithXYWH (any drawable object)
class ObjectWithXYWH {
  constructor(parent) {
    this.parent = parent;
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.shape = UI.createShape(this);
  }

  alignToGrid() {
    // Align this object to the grid, and return TRUE if this involved
    // a move.
    const
        ox = this.x,
        oy = this.y,
        gr = MODEL.grid_pixels;
    this.x = Math.round((this.x + 0.49999999*gr) / gr) * gr;
    this.y = Math.round((this.y + 0.49999999*gr) / gr) * gr;
    return Math.abs(this.x - ox) > VM.NEAR_ZERO ||
        Math.abs(this.y - oy) > VM.NEAR_ZERO;
  }
  
  move(dx, dy) {
    // Move this object by updating its x, y AND shape coordinates
    // (to avoid redrawing it)
    this.x += dx;
    this.y += dy;
    UI.moveShapeTo(shape, this.x, this.y);
  }
} // END of CLASS ObjectWithXYWH


// CLASS Note
class Note extends ObjectWithXYWH {
  constructor(parent) {
    super(parent);
    const dt = new Date();
    // NOTE: use timestamp in msec to generate a unique identifier
    this.timestamp = dt.getTime();
    this.contents = '';
    this.lines = [];
  }
  
  get identifier() {
    return `#${this.parent.identifier}#${this.timestamp}#`; 
  }

  get type() {
    return 'Note';
  }
  
  get parentPrefix() {
    // Return the name of the cluster containing this note, followed
    // by a colon+space, except when this cluster is the top cluster.
    if(this.parent === MODEL.top_cluster) return '';
    return this.parent.displayName + UI.PREFIXER;
  }
  
  get displayName() {
    const
        n = this.number,
        type = (n ? `Numbered note #${n}` : 'Note');
    return `${this.parentPrefix}${type} at (${this.x}, ${this.y})`;
  }
  
  get number() {
    // Returns the number of this note if specified (e.g. as #123).
    // NOTE: this only applies to notes having note fields.
    const m = this.contents.replace(/\s+/g, ' ')
        .match(/^[^\]]*#(\d+).*\[\[[^\]]+\]\]/);
    if(m) return m[1];
    return '';
  }
  
  get asXML() {
    return ['<note><timestamp>', this.timestamp,
        '</timestamp><contents>', xmlEncoded(this.contents),
        '</contents><x-coord>', this.x,
        '</x-coord><y-coord>', this.y,
        '</y-coord><width>', this.width,
        '</width><height>', this.height,
        '</height></note>'].join(''); 
  }
  
  initFromXML(node) {
    this.timestamp = safeStrToInt(nodeContentByTag(node, 'timestamp'));
    // NOTE: legacy XML does not include the timestamp
    if(!this.timestamp) {
      // for such notes, generate a 13-digit random number
      this.timestamp = Math.floor((1 + Math.random()) * 1E12);
    }
    this.contents = xmlDecoded(nodeContentByTag(node, 'contents'));
    this.x = safeStrToInt(nodeContentByTag(node, 'x-coord'));
    this.y = safeStrToInt(nodeContentByTag(node, 'y-coord'));
    this.width = safeStrToInt(nodeContentByTag(node, 'width'));
    this.height = safeStrToInt(nodeContentByTag(node, 'height'));
  }

  setCluster(pc) {
    // Place this note into the specified cluster `pc`.
    if(this.parent) {
      // Remove this note from its current parent's note list.
      const i = this.parent.notes.indexOf(this);
      if(i >= 0) this.parent.notes.splice(i, 1);
      // Set its new parent pointer...
      this.parent = pc;
      // ... and add it to the new cluster's note list.
      if(pc.notes.indexOf(this) < 0) pc.notes.push(this);
    }
  }
  
  resize() {
    // Resizes the note; returns TRUE iff size has changed.
    let txt = this.contents;
    const
        w = this.width,
        h = this.height,
        // Minimumm note width of 10 characters.
        n = Math.max(txt.length, 10),
        fh = UI.textSize('hj').height;
    // Approximate the width to obtain a rectangle.
    // NOTE: 3:1 may seem exagerated, but characters are higher than wide,
    // and there will be more (short) lines due to newlines and wrapping.
    let tw = Math.ceil(3*Math.sqrt(n)) * fh / 2;
    this.lines = UI.stringToLineArray(txt, tw).join('\n');
    let bb = UI.textSize(this.lines, 8);
    // Aim to make the shape wider than tall.
    let nw = bb.width,
        nh = bb.height;
    while(bb.width < bb.height * 1.7) {
      tw *= 1.2;
      this.lines = UI.stringToLineArray(txt, tw).join('\n');
      bb = UI.textSize(this.lines, 8);
      // Prevent infinite loop.
      if(nw <= bb.width || nh > bb.height) break;
    }
    this.height = 1.05 * (bb.height + 6);
    this.width = bb.width + 6;
    // Boolean return value indicates whether size has changed.
    return this.width != w || this.height != h;
  }
  
  containsPoint(mpx, mpy) {
    // Returns TRUE iff given coordinates lie within the note rectangle.
    return (Math.abs(mpx - this.x) <= this.width / 2 &&
        Math.abs(mpy - this.y) <= this.height / 2);
  }

  copyPropertiesFrom(n, renumber=false) {
    // Sets properties to be identical to those of note `n`.
    this.x = n.x;
    this.y = n.y;
    let cont = n.contents;
    if(renumber) {
      // Renumbering only applies to notes having note fields; then the
      // note number must be denoted like #123, and occur before the first
      // note field.
      const m = cont.match(/^[^\]]*#(\d+).*\[\[[^\]]+\]\]/);
      if(m) {
        const nn = this.parent.nextAvailableNoteNumber(m[1]);
        cont = cont.replace(/#\d+/, `#${nn}`);
      }
    }
    this.contents = cont;
  }

} // END of class Note


// CLASS NodeBox (superclass for factors and clusters)
class NodeBox extends ObjectWithXYWH {
  constructor(parent, name, actor) {
    super(parent);
    this.name = name;
    this.actor = actor;
    this.name_lines = nameToLines(name);
    this.comments = '';
    // Factors are assigned a unique code, clusters are not.
    this.code = null;
    this.frame_width = 0;
    this.frame_height = 0;
    this.selected = false;
  }
  
  get hasActor() {
    return this.actor && (this.actor.name != UI.NO_ACTOR);
  }

  get displayName() {
    if(this.hasActor) return `${this.name} (${this.actor.name})`;
    return this.name;
  }
  
  get identifier() {
    let id = this.name;
    if(this.hasActor) id += ` (${this.actor.name})`;
    return UI.nameToID(id);
  }
  
  get numberContext() {
    // Return the string to be used to evaluate #, so for factors
    // this is their "tail number".
    return UI.tailNumber(this.name);
  }
  
  rename(name, actor_name='') {
    // Change the name and/or actor name of this node (factor or cluster).
    // NOTE: Return TRUE if rename was successful, FALSE on error, and
    // a factor or cluster if such entity having the new name already
    // exists.
    name = UI.cleanName(name);
    if(!UI.validName(name)) {
      UI.warningInvalidName(name);
      return false;
    }
    // Check whether a non-node entity has this name.
    const nne = MODEL.namedObjectByID(UI.nameToID(name));
    if(nne && nne !== this) {
      UI.warningEntityExists(nne);
      return false;
    }
    // Compose the full name.
    if(actor_name === '') actor_name = UI.NO_ACTOR;
    // Check whether the actor name does not refer to a non-actor entity.
    const ane = MODEL.namedObjectByID(UI.nameToID(actor_name));
    if(ane && !(ane instanceof Actor)) {
      UI.warningEntityExists(ane);
      return false;      
    }
    let fn = name;
    if(actor_name != UI.NO_ACTOR) fn += ` (${actor_name})`;
    // Get the ID (derived from the full name) and check if MODEL already
    // contains another entity with this ID.
    const
        old_id = this.identifier,
        new_id = UI.nameToID(fn),
        n = MODEL.nodeBoxByID(new_id);
    // If so, do NOT rename, but return this object instead.
    // NOTE: If entity with this name is THIS entity, it typically means
    // a cosmetic name change (upper/lower case) which SHOULD be performed.
    if(n && n !== this) return n;
    // Otherwise, if IDs differ, add this object under its new key, and
    // remove its old entry.
    if(old_id != new_id) {
      if(this instanceof Factor) {
        MODEL.factors[new_id] = this;
        delete MODEL.factors[old_id];
      } else if(this instanceof Cluster) {
        MODEL.clusters[new_id] = this;
        delete MODEL.clusters[old_id];
      } else {
        // NOTE: This should never happen => report an error.
        UI.alert('Can only rename factors and clusters');
        return false;
      }
    }
    // Change this object's name and actor.
    this.actor = MODEL.addActor(actor_name);
    this.name = name;
    // Update actor list in case some actor name is no longer used.
    MODEL.cleanUpActors();
    // NOTE: Renaming may affect the node's display size.
    if(this.resize()) UI.drawSelection(MODEL);
    // NOTE: Only TRUE indicates a successful (cosmetic) name change.
    return true;
  }
  
  resize() {
    // Resizes this node; returns TRUE iff size has changed.
    // Therefore, keep track of original width and height.
    const
        ow = this.width,
        oh = this.height,
        an = (this.hasActor ? this.actor.name : ''),
        ratio = (this instanceof Cluster ? 0.4 : 0.5);
    this.name_lines = nameToLines(this.name, an, ratio);
    this.bbox = UI.textSize(this.name_lines + '\n' + an, 10);
    if(this instanceof Factor) {
      this.frame_width = this.bbox.width + 6;
      this.width = Math.max(CONFIGURATION.min_factor_width - 40,
          UI.textSize(an).width * 1.5, this.frame_width) + 40;
      this.height = this.bbox.height + 20;
    } else {
      this.frame_width = Math.max(50, this.bbox.width, this.bbox.height,
          UI.textSize(an).width) + 7;
      this.width = Math.max(CONFIGURATION.min_cluster_width,
          this.frame_width + 20);
      this.height = Math.max(this.bbox.height + 20,
          this.width * 0.75);
    }
    return this.width != ow || this.height != oh;
  }

  get nextAvailableNumberName() {
    // Returns node name ending with the first number > its present number,
    // provided that the name ends with a number; otherwise an empty string
    const nc = this.numberContext;
    if(!nc) return '';
    const
        base = this.name.slice(0, -nc.length),
        aname = (this.hasActor ? ` (${this.actor.name})` : '');
    let n = parseInt(nc),
        nn,
        e = this;
    while(e) {
      n++;
      nn = base + n;
      e = MODEL.objectByName(nn + aname);
    }
    return nn;
  }
  
} // END of class NodeBox


// CLASS Cluster
class Cluster extends NodeBox {
  constructor(cluster, name, actor) {
    super(cluster, name, actor);
    this.factors = [];
    this.sub_clusters = [];
    this.notes = [];
  }

  get type() {
    return 'Cluster';
  }

  get typeLetter() {
    return 'C';
  }

  get infoLineName() {
    const
        afl = this.allFactors.length,
        extra = `<span class="extra">(${pluralS(afl, 'factor')})</span>`;
    return `<em>Cluster:</em> ${this.displayName}${extra}`;
  }

  get nestingLevel() {
    // Return the "depth" of this cluster in the cluster hierarchy
    if(this.parent) return this.parent.nestingLevel + 1; // recursion!
    return 0;
  }
  
  get rightMarginX() {
    // Return the horizontal position 50px right of the edge of the
    // right-most node in the diagram for this cluster.
    let max = 0;
    for(let i = 0; i < this.notes.length; i++) {
      const n = this.notes[i];
      max = Math.max(max, n.x + n.width / 2);
    }
    for(let i = 0; i < this.sub_clusters.length; i++) {
      const c = this.sub_clusters[i];
      max = Math.max(max, c.x + c.width / 2);
    }
    for(let i = 0; i < this.factors.length; i++) {
      const f = this.factors[i];
      max = Math.max(max, f.x + f.width / 2);
    }
    return max;
  }
  
  containsPoint(mpx, mpy) {
    // Returns TRUE iff given coordinates lie within the cluster rectangle.
    return (Math.abs(mpx - this.x) <= this.width / 2 &&
        Math.abs(mpy - this.y) <= this.height / 2);
  }
  
  connectionPoint(p, tail) {
    const
        dx = p.x - this.x,
        dy = p.y - this.y,
        hw = this.width / 2,
        hh = this.height / 2,
        pi = Math.PI,
        cp = {};
    let dydx,
        angle;
    if(Math.abs(dx) < VM.NEAR_ZERO) {
      dydx = 10000;
      angle = (dy >= 0 ? 0.5 : 1.5) * pi;
    } else {
      dydx = dy / dx;
      // For TAIL factors, transform the angle such that it "lingers"
      // around the horizontal.
      if(tail) {
        dydx /= Math.pow(Math.abs(dx), 0.15);
      } else {
        dydx *= Math.pow(Math.abs(dy), 0.15);
      }
      angle = Math.atan(dydx);
      if(dx < 0) angle += pi;
    }
    cp.fcos = Math.cos(angle);
    cp.fsin = Math.sin(angle);
    const
        // Euclidean distance from other center point MINUS half width
        // of this node and the other node (if known).
        onhw = (p.hasOwnProperty('width') ? p.width / 2 : 0),
        onhh = (p.hasOwnProperty('height') ? p.height / 2 : 0),
        ed = Math.sqrt(dx*dx + dy*dy) -
            Math.abs(cp.fcos) * (hw + onhw) -
            Math.abs(cp.fsin) * (hh + onhh),
        // Use one fourth of this Euclidean distance for the control
        // point (relative to the connection point). 
        cpm = Math.max(5, ed / 4),
        // Relative connection point: assume point on ellipse that
        // circumscribes the rectangle.
        r = Math.sqrt(hw*hw + hh*hh),
        // Then cut off at the rim of the rectangle.
        adx = Math.min(hw, Math.abs(r * cp.fcos)),
        ady = Math.min(hh, Math.abs(r * cp.fsin)),
        sdx = Math.sign(dx),
        sdy = Math.sign(dy);
    cp.x = this.x + sdx * adx;
    cp.y = this.y + sdy * ady;
    // FROM node control points align with the line from the center.
    cp.fcx = cp.x + cpm * cp.fcos;
    cp.fcy = cp.y + cpm * cp.fsin;
    // TO node control points are orthogonal to the rim of the rectangle,
    // or at the true angle near the corners.
    if(adx / hw > 0.9 && ady / hh > 0.9) {
      const atan = Math.atan(dydx);
      cp.tcos = Math.cos(atan) * sdx;
      cp.tsin = Math.sin(atan) * sdx;
    } else if(Math.abs(dydx) < 1) {
      // Horizontal arrow.
      cp.tcos = sdx;
      cp.tsin = 0;
    } else {
      // Vertical arrow.
      cp.tcos = 0;
      cp.tsin = sdy;
    }
    cp.tcx = cp.x + cpm * cp.tcos;
    cp.tcy = cp.y + cpm * cp.tsin;
    return cp;
  }

  get asXML() {
    let xml;
    const cmnts = xmlEncoded(this.comments);
    xml = ['<cluster><name>', xmlEncoded(this.name),
        '</name><owner>', xmlEncoded(this.actor.name),
        '</owner><x-coord>', this.x,
        '</x-coord><y-coord>', this.y,
        '</y-coord><comments>', cmnts,
        '</comments><factor-codes>'].join('');
    for(let i = 0; i < this.factors.length; i++) {
      xml += `<factor-code>${this.factors[i].code}</factor-code>`;
    }
    xml += '</factor-codes><notes>';
    for(let i = 0; i < this.notes.length; i++) {
      xml += this.notes[i].asXML;
    }
    xml += '</notes>';
    xml += '<sub-clusters>';
    // NOTE: recursive call will capture entire sub-cluster hierarchy.
    for(let i = 0; i < this.sub_clusters.length; i++ ) {
      xml += this.sub_clusters[i].asXML;
    }
    xml += '</sub-clusters>';
    return xml + '</cluster>';
  }
  
  initFromXML(node) {
    this.x = safeStrToInt(nodeContentByTag(node, 'x-coord'));
    this.y = safeStrToInt(nodeContentByTag(node, 'y-coord'));
    this.comments = xmlDecoded(nodeContentByTag(node, 'comments'));
    let n = childNodeByTag(node, 'sub-clusters'),
        c,
        name,
        actor;
    if(n && n.childNodes) {
      for(let i = 0; i < n.childNodes.length; i++) {
        c = n.childNodes[i];
        if(c.nodeName === 'cluster') {
          // Refocus on this cluster because addCluster may change focus
          // if it contains subclusters.
          MODEL.focal_cluster = this;
          // NOTE: addCluster will then cause recursion by calling the method
          // `initFromXML` again
          name = xmlDecoded(nodeContentByTag(c, 'name'));
          actor = xmlDecoded(nodeContentByTag(c, 'owner'));
          MODEL.addCluster(name, actor, c);
        }
      }
    }
    n = childNodeByTag(node, 'factor-codes');
    if(n && n.childNodes) {
      for(let i = 0; i < n.childNodes.length; i++) {
        c = n.childNodes[i];
        if(c.nodeName === 'factor-code') {
          const f = MODEL.factorByCode(nodeContent(c));
          if(f) f.setCluster(this);
        }
      }
    }
    n = childNodeByTag(node, 'notes');
    if(n && n.childNodes) {
      let note;
      for(let i = 0; i < n.childNodes.length; i++) {
        c = n.childNodes[i];
        if(c.nodeName === 'note') {
          note = new Note(this);
          note.initFromXML(c);
          this.notes.push(note);
        }
      }
    }
  }
  
  containsCluster(c) {
    while(c && c !== this) c = c.parent;
    return c !== null;
  }

  setCluster(c) {
    // Place this cluster into the specified cluster `c`.
    // NOTE: cluster = NULL for the top cluster; this should never be altered.
    // NOTE: cluster cannot have itself as parent.
    if(this.parent && c !== this) {
      // Remove this cluster from its current parent's sub-cluster list
      const i = this.parent.sub_clusters.indexOf(this);
      if(i >= 0) this.parent.sub_clusters.splice(i, 1);
      // Set its new parent cluster pointer...
      this.parent = c;
      // ... and add it to the new parent cluster's sub-cluster list
      if(c.sub_clusters.indexOf(this) < 0) c.sub_clusters.push(this);
    }
  }
  
  containsFactor(f) {
    // Return the subcluster of this cluster that contains factor `f`,
    // or NULL if `f` does not occur in this cluster.
    if(f.parent === this) return this;
    for(let i = 0; i < this.sub_clusters.length; i++) {
      if(this.sub_clusters[i].containsFactor(f)) {
        return this.sub_clusters[i]; // recursion!
      }
    }
    return null;
  }

  get relatedLinks() {
    const
        af = this.allFactors,
        rl = [];
    for(let k in MODEL.links) if(MODEL.links.hasOwnProperty(k)) {
      const l = MODEL.links[k];
      if(af.indexOf(l.from_factor) >= 0 || af.indexOf(l.to_factor) >= 0) {
        rl.push(l);
      }
    }
    return rl;
  }
  
  get visibleLinks() {
    // Links are visible when they connect factors that have a position
    // in this cluster.
    const vl = [];
    for(let k in MODEL.links) if(MODEL.links.hasOwnProperty(k)) {
      const l = MODEL.links[k];
      if(l.from_factor.parent === this && l.to_factor.parent === this) {
        vl.push(l);
      }
    }
    return vl;
  }
  
  get deepVisibleLinks() {
    // Links are "deep" when they connect connect from/to a factor in
    // a sub-cluster of this cluster.
    // The data is stored as instances of class Link having the visible
    // clusters as FROM and TO plus a list of constituing links. When
    // drawn, this list signals "this is a deep link" when it is non-empty.
    const
        la = this.allFactors,
        nla = {},
        dvl = {};
    // Create lookup with per sub-cluster the list of its factors. 
    for(let i = 0; i < this.sub_clusters.length; i++) {
      const sc = this.sub_clusters[i];
      nla[sc.identifier] = sc.allFactors;
    }
    // Peruse all links in the model.
    for(let k in MODEL.links) if(MODEL.links.hasOwnProperty(k)) {
      const
          l = MODEL.links[k],
          ff = l.from_factor,
          tf = l.to_factor;
      let vff = null,
          vtf = null,
          deep = false;
      if(la.indexOf(ff) >= 0 && la.indexOf(tf) >= 0) {
        // Link `l` connects two factors in this cluster.
        // Now determine the visible nodes for this link.
        if(ff.parent === this) {
          // FROM factor is visible in this cluster.
          vff = ff;
        } else {
          // Find cluster that contains the FROM factor.
          for(let k in nla) if(nla.hasOwnProperty(k)) {
            if(nla[k].indexOf(ff) >= 0) {
              vff = MODEL.clusters[k];
              break;
            }
          }
          // If found, it is a "deep" link.
          if(vff) deep = true;
        }
        // Do likewise for the TO factor.
        if(tf.parent === this) {
          // TO factor is visible in this cluster.
          vtf = tf;
        } else {
          // Find cluster that contains the TO factor.
          for(let k in nla) if(nla.hasOwnProperty(k)) {
            if(nla[k].indexOf(tf) >= 0) {
              vtf = MODEL.clusters[k];
              break;
            }
          }
          // If found, it is a "deep" link.
          if(vtf) deep = true;
        }
        if(deep) {
          if(!vff || !vtf) {
            // This anomaly should not occur => throw exception.
            throw 'ERROR: link node(s) not found for ' + l.displayName;
          }
          if(vff !== vtf) {
            // Two *different* nodes found, and at least one is a cluster.
            const dlid = UI.linkIdentifier(vff, vtf);
            let dl = dvl[dlid];
            if(!dl) {
              // Create a new virtual link and add link to its set.
              dl = new Link(vff, vtf);
              dvl[dlid] = dl;
            }
            dl.deep_links.push(l);
          }
        }
      }
    }
    return dvl;
  }

  get hiddenIO() {
    // Return list pair {in, out} with input and output links of this cluster
    // that are not showing in the diagram.
    const
        af = this.allFactors,
        apf = this.parent.allFactors,
        io = {in: [], out: []};
    for(let k in MODEL.links) if(MODEL.links.hasOwnProperty(k)) {
      const
          l = MODEL.links[k],
          fi = af.indexOf(l.from_factor),
          fpi = apf.indexOf(l.from_factor),
          ti = af.indexOf(l.to_factor),
          tpi = apf.indexOf(l.to_factor);
      if(fi >= 0 && tpi < 0) {
        io.out.push(l);
      } else if(ti >= 0 && fpi < 0) {
        io.in.push(l);
      }
    }
    return io;
  }

  containsLink(l) {
    // Returns TRUE iff link `l` is related to some factor in this cluster.
    return this.relatedLinks.indexOf(l) >= 0;
  }
  
  get allFactors() {
    // Return the set of all factors positioned in this cluster or one or
    // more of its subclusters.
    let facts = [];
    for(let i = 0; i < this.factors.length; i++) {
      addDistinct(this.factors[i], facts);
    }
    for(let i = 0; i < this.sub_clusters.length; i++) {
      mergeDistinct(this.sub_clusters[i].allFactors, facts); // recursion!
    }
    return facts;
  }
  
  get allNotes() {
    // Return the set of all notes in this cluster and its subclusters.
    let notes = this.notes.slice();
    for(let i = 0; i < this.sub_clusters.length; i++) {
      notes = notes.concat(this.sub_clusters[i].allNotes); // recursion!
    }
    return notes;
  }

  nextAvailableNoteNumber(n) {
    // Return the first integer greater than `n` that is not already in
    // use by a note of this cluster.
    let nn = parseInt(n) + 1;
    const nrs = [];
    for(let i = 0; i < this.notes.length; i++) {
      const nr = this.notes[i].number;
      if(nr) nrs.push(parseInt(nr));
    }
    while(nrs.indexOf(nn) >= 0) nn++;
    return nn;
  }

  deleteNote(n, with_xml=true) {
    // Remove note `n` from this cluster's note list.
    let i = this.notes.indexOf(n);
    if(i >= 0) {
      if(with_xml) UNDO_STACK.addXML(n.asXML);
      this.notes.splice(i, 1);
    }
    return i > -1;
  }

}  // END of class Cluster


// CLASS Factor
class Factor extends NodeBox {
  constructor(cluster, name, actor) {
    super(cluster, name, actor);
    this.expression = new Expression(this, '');
    // Keep track of incoming and outgoing links.
    this.inputs = [];
    this.outputs = [];
    this.predecessors = [];
    // The `visited` property is used when detecting cycles.
    this.visited = false;
    // Factors have a status vector containing either -1, 0, +1
    // an error code, or "not computed".
    this.status = [];
  }

  setCode() {
    // Factors are assigned a unique number code.
    if(!this.code) this.code = MODEL.newFactorCode;
  }

  get type() {
    return 'Factor';
  }
  
  get typeLetter() {
    return 'F';
  }
  
  containsPoint(x, y) {
    // Return TRUE if (x, y) lies within the ellipsis.
    const
        rx = (x - this.x) / this.width * 2,
        ry = (y - this.y) / this.height * 2;
    return rx * rx + ry * ry < 0.95;
  }
  
  connectionPoint(p, tail) {
    const
        hw = this.width / 2,
        hh = this.height / 2,
        hwr = hw / hh,
        pi = Math.PI,
        dx = p.x - this.x,
        dy = p.y - this.y,
        cp = {};
    let dydx = 0,
        angle,
        atan;
    // For near-vertical line, treat angles as special case.
    if(Math.abs(dx) < 0.5) {
      angle = (dy >= 0 ? 0.5 : 1.5) * pi;
      atan = angle;
    } else if(Math.abs(dy) < 0.5) {
      angle = (dx >= 0 ? 0 : pi);
      atan = angle;
    } else {
      dydx = dy / dx;
      // For TAIL factors, transform the angle such that it "lingers"
      // around the horizontal.
      if(tail) {
        dydx /= Math.pow(Math.abs(dx), 0.25);
      } else {
        dydx *= Math.pow(Math.abs(dy), 0.25);
      }
      angle = Math.atan(dydx);
      if(dx < 0) angle += pi;
      // Compute the angle that is orthogonal to the tangent line on the
      // rim of an ellipse at the point where a line departing from the
      // ellipse center under `angle` intersects with the rim.
      atan = Math.atan(hwr * dydx);
      if(dx < 0) atan += pi;
    }
    // Calculate the point on the ellipse for this factor.
    const
        // Euclidean distance from other center point MINUS half width
        // of this node and the other node (if known).
        onhw = (p.hasOwnProperty('width') ? p.width / 2 : 0),
        onhh = (p.hasOwnProperty('height') ? p.height / 2 : 0),
        ed = Math.sqrt(dx*dx + dy*dy) -
            Math.abs(Math.cos(angle)) * (hw + onhw) -
            Math.abs(Math.sin(angle)) * (hh + onhh),
        // Use one fourth of this Euclidean distance for the control
        // point (relative to the connection point). 
        cpm = Math.max(5, ed / 4),
        epx = Math.sign(dx) * hw * hh / Math.sqrt(hh*hh + hw*hw*dydx*dydx),
        epy = Math.sign(dy) * Math.sqrt(1 - (epx / hw) * (epx / hw)) * hh; 
    cp.x = this.x + epx;
    cp.y = this.y + epy;
    cp.fcos = Math.cos(angle);
    cp.fsin = Math.sin(angle);
    // FROM node control points align with the line from the center.
    cp.fcx = cp.x + cpm * cp.fcos;
    cp.fcy = cp.y + cpm * cp.fsin;
    // TO node control points are orthogonal to the tangent line of
    // the TO ellipse.
    cp.tcos = Math.cos(atan);
    cp.tsin = Math.sin(atan);
    cp.tcx = cp.x + cpm * cp.tcos;
    cp.tcy = cp.y + cpm * cp.tsin;
    return cp;
  }
  
  get infoLineName() {
    let extra = '';
    const x = this.expression;
    if(x.defined) {
      if(MODEL.solved || x.isStatic) {
        const r = VM.sig4Dig(x.result(MODEL.t));
        extra += ` = <span style="color: blue">${r}</span>`;
      }
      extra += `<code style="color: gray"> &#x225C; ${x.text}</code>`;
    }
    return `<em>Factor:</em> ${this.displayName}${extra}`;
  }

  get hiddenIO() {
    // Return list pair {in, out} with input and output links of this factor
    // that are not showing in the diagram.
    const
        af = this.parent.allFactors,
        io = {in: [], out: []};
    for(let i = 0; i < this.inputs.length; i++) {
      const
          l = this.inputs[i],
          fi = af.indexOf(l.from_factor);
      if(fi < 0) io.in.push(l);
    }
    for(let i = 0; i < this.outputs.length; i++) {
      const
          l = this.outputs[i],
          ti = af.indexOf(l.to_factor);
      if(ti < 0) io.out.push(l);
    }
    return io;
  }

  get allInputsAreFeedback() {
    // Return TRUE if all input links of this factor are feedback links.
    // NOTE: This is used to determine whether a factor is an implicit entry.
    for(let i = 0; i < this.inputs.length; i++) {
      if(!this.inputs[i].is_feedback) return false;
    }
    return true;
  }

  setCluster(c) {
    // Place this factor into the specified cluster `c`.
    if(this.parent && c !== this) {
      // Remove this factor from its current parent's factor list.
      const i = this.parent.factors.indexOf(this);
      if(i >= 0) this.parent.factors.splice(i, 1);
      // Set its new parent cluster pointer...
      this.parent = c;
      // ... and add it to the new parent cluster's sub-cluster list
      if(c.factors.indexOf(this) < 0) c.factors.push(this);
    }
  }
  
  setPredecessors() {
    // Recursive function to create list of all factors that precede
    // this one.
    for(let i = 0; i < this.inputs.length; i++) {
      const
          l = this.inputs[i],
          v = l.visited,
          ff = l.from_factor;
      l.visited = true;
      // Add the FROM factor as predecessor (if new).
      if(this.predecessors.indexOf(ff) < 0) this.predecessors.push(ff);
      // Recurse if FROM factor was not visited yet.
      if(!v) ff.setPredecessors();
      // Then also add all predecessors of the FROM factor (if new).
      for(let j = 0; j < ff.predecessors.length; j++) {
        const f = ff.predecessors[j];
        if(this.predecessors.indexOf(f) < 0) this.predecessors.push(f);
      }
    }
    return this.predecessors;
  }
  
  get asXML() {
    let xml = ['<factor code="', this.code,
        '"><name>', xmlEncoded(this.name),
        '</name><actor>', xmlEncoded(this.actor.name),
        '</actor><comments>', xmlEncoded(this.comments),
        '</comments><x-coord>', this.x,
        '</x-coord><y-coord>', this.y,
        '</y-coord><expression>', this.expression.text,
        '</expression></factor>'].join('');
    return xml;
  }

  initFromXML(node) {
    this.code = nodeParameterValue(node, 'code');
    this.comments = xmlDecoded(nodeContentByTag(node, 'comments'));
    this.x = safeStrToInt(nodeContentByTag(node, 'x-coord'));
    this.y = safeStrToInt(nodeContentByTag(node, 'y-coord'));
    this.expression.text = xmlDecoded(nodeContentByTag(node, 'expression'));
    this.resize();
  }

  copyPropertiesFrom(f) {
    // Set properties to be identical to those of factor `f`
    this.x = f.x;
    this.y = f.y;
    this.comments = f.comments;
    this.expression.text = f.expression.text;
  }
  
  isActive(t) {
    if(!MODEL.solved) return false;
    const s = (t < 0 ? VM.UNDEFINED : this.status[t]);
    return s !== VM.UNDEFINED && s !== 0;
  }

  changed(t) {
    if(!MODEL.solved) return 0;
    const s = (t < 0 ? VM.UNDEFINED : this.status[t]);
    if(s !== VM.UNDEFINED) {
      if(t <= 0) return Math.sign(s);
      return Math.sign(s - this.status[t - 1]);
    }
    return 0;
  }
  
  updateStatus(t) {
    // Set value for this factor. If no expression is specified, this value
    // is inferred from the incoming links; otherwise it is the expression
    // result for time step `t`.
    let s = VM.UNDEFINED;
    if(this.expression.defined) {
      s = this.expression.result(t);
    } else {
      s = 0;
      for(let i = 0; i < this.inputs.length; i++) {
        const l = this.inputs[i];
        if(l.expression.defined) {
          const r = l.expression.result(t);
          if(r <= VM.ERROR) {
            s = r;
          } else if(r < VM.EXCEPTION) {
            // NOTE: Treat exceptions as if the link multiplier is undefined.
            const
                ff = l.from_factor,
                fs = ff.status[t],
                fx = ff.expression,
                fr = (fs && fs !== VM.UNDEFINED ? fs : (fx.defined ? fx.result(t) : 0)); 
            if(fr <= VM.ERROR) {
              s = fr;
            } else if(fr < VM.EXCEPTION) {
              // Add sign of result, so each link contributes either -1, 0 or +1.
              s += Math.sign(r * fr);
            }
          }
        }
      }
      // Normalize result to either -1, 0 or +1.
      if(s > VM.ERROR) s = Math.sign(s);
    }
    // Update the status vector for time step `t`.
    this.status[t] = s;
  }
  
  get variablesInScope() {
    // Returns a list of names of all variables within scope of this factor.
    const
        fis = this.inputs,
        list = [];
    for(let i = 0; i < fis.length; i++) {
      list.push(fis[i], fis[i].from_factor);
    }
    return list.sort();
  }

} // END of class Factor


// CLASS Link
class Link {
  constructor (from_f, to_f) {
    this.comments = '';
    this.from_factor = from_f;
    this.to_factor = to_f;
    // Link multiplier (undefined => not shown in diagram).
    this.expression = new Expression(this, '1');
    // Other properties are used for drawing, editing, etc.
    this.from_x = 0;
    this.from_y = 0;
    this.to_x = 0;
    this.to_y = 0;
    this.is_feedback = false;
    this.visited = false;
    this.selected = false;
    // Deep links are inferred when drawing the links of a diagram.
    // When not empty, this indicates that this link is a "virtual
    // container" for multiple "real" links. Moreover, the FROM and/or
    // TO factors will then be clusters.
    this.deep_links = [];
    // For drawing, a link has its own shape (mouse responsive).
    this.shape = UI.createShape(this);
  }

  get type() {
    return 'Link';
  }

  get typeLetter() {
    return 'L';
  }

  get displayName() {
    return this.from_factor.displayName + UI.LINK_ARROW +
        this.to_factor.displayName;
  }

  get identifier() {
    // NOTE: link IDs are based on the factor codes rather than IDs,
    // as this prevents problems when factors are renamed.
    return UI.linkIdentifier(this.from_factor, this.to_factor);
  }

  get asXML() {
    const
        ff = this.from_factor,
        tf = this.to_factor;
    return ['<link><from-code>', ff.code,
      '</from-code><to-code>', tf.code,
      '</to-code><comments>', xmlEncoded(this.comments),
      '</comments><expression>', xmlEncoded(this.expression.text),
      '</expression></link>'].join('');
  }

  initFromXML(node) {
    this.comments = xmlDecoded(nodeContentByTag(node, 'comments'));
    this.expression.text = xmlDecoded(nodeContentByTag(node, 'expression'));
  }

  copyPropertiesFrom(l) {
    // Set properties to be identical to those of link `l`
    this.comments = l.comments;
    this.expression.text = l.expression.text;
  }
  
  get visibleNodes() {
    // Returns tuple [from, to] where TRUE indicates that this node is
    // visible in the focal cluster.
    const fc = MODEL.focal_cluster;
    return [this.from_factor.parent === fc, this.to_factor.parent === fc];
  }
  
  get containsSelected() {
    // Returns TRUE if this is a "deep link" comprising only a selected
    // link.
    return (this.deep_links.length === 1 && this.deep_links[0].selected);
  }
  
  get containsFeedback() {
    // Returns TRUE if this is a "deep link" comprising a feedback link.
    for(let i = 0; i < this.deep_links.length; i++) {
      if(this.deep_links[i].is_feedback) return true;
    }
    return false;
  }
  
  get cycleNumbers() {
    // Return list of indices in the cycle list if link is part of
    // such a cycle.
    // NOTE: Limit cycle set if modeler is viewing cycles selectively.
    const cn = [];
    for(let i = 0; i < MODEL.cycle_list.length; i++) {
      if(MODEL.show_all_cycles || i === MODEL.selected_cycle) {
        const
            c = MODEL.cycle_list[i],
            ffi = c.indexOf(this.from_factor);
        if(ffi >= 0 && c.lastIndexOf(this.to_factor) === ffi + 1) cn.push(i);
      }
    }
    return cn;
  }
  
  inList(list) {
    // Return TRUE iff both the FROM node and the TO node of this link
    // are elements of `list`.
    // NOTE: This method used in diafram-controller.js to see which links
    // are to be included when the modeler performs a "rectangular area
    // selection".
    const
        f_in = list.indexOf(this.from_factor) >= 0,
        t_in = list.indexOf(this.to_factor) >= 0;
    return f_in && t_in;
  }
  
  get variablesInScope() {
    // Returns a list of names of all variables within scope of this link.
    // NOTE: This will always be only the FROM factor.
    return [this.from_factor];
  }

} // END of class Link