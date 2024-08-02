/*
CLAST is an executable graphical editor for causal loop diagrams.
This tool is developed by Pieter Bots at Delft University of Technology.

This JavaScript file (clast-expression-editor.js) provides the GUI
functionality for the CLAST Expression Editor dialog.
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

// CLASS ExpressionEditor
class ExpressionEditor {
  constructor() {
    this.edited_object = null;
    this.edited_expression = null;
    // Dialog DOM elements.
    const md = UI.modals.expression;
    this.type = md.element('type');
    this.variable = md.element('variable');
    this.text = md.element('text');
    this.status = md.element('status');
    this.help = md.element('help');
    this.insert_factor = md.element('insert-factor');
    this.insert_link = md.element('insert-link');
    this.variables = md.element('variables');
    // The quick guide to CLAST expressions.
    this.help.innerHTML = `
<p><span style="font-size: 13px; font-weight: bold">CLAST expressions</span> &ndash;
<em>Move cursor over a</em> <code>symbol</code> <em>for explanation.</em>
<p>
<h4>Variables</h4>
<p>Names of factors and links must be enclosed by brackets, e.g.,
  <code>[xyz]</code> or <code>[a${UI.LINK_ARROW}b]</code>,
  to distinguish them from pre-defined variables
  (<code title="Time step number (starts at 0)">t</code>,
  <code title="Duration of 1 time step (in hours)">dt</code>,
  <code title="Simulated clock time (in hours)">now</code>,
  <code title="A random number from the uniform distribution U(0, 1)">random</code>)
  and constants
  (<code title="Mathematical constant &pi; = ${Math.PI}">pi</code>,
  <code title="Logical constant true = 1
NOTE: any non-zero value evaluates as true">true</code>,
  <code title="Logical constant false = 0">false</code>,
  <code title="Number of hours in 1 year">yr</code>,
  <code title="Number of hours in 1 week">wk</code>,
  <code title="Number of hours in 1 day">d</code>,
  <code title="Number of hours in 1 hour (1)">h</code>,
  <code title="Number of hours in 1 minute">m</code>,
  <code title="Number of hours in 1 second">s</code>).
</p>
<h4>Operators</h4>
<p><em>Monadic:</em>
  <code title="-X evaluates as minus X">-</code>, 
  <code title="not X evaluates as 1 if X equals 0 (otherwise 0)">not</code>,
  <code title="abs X evaluates as the absolute value of X">abs</code>,
  <code title="int X evaluates as the integer part of X">int</code>,
  <code title="fract X evaluates as the decimal fraction of X">fract</code>,
  <code title="round X evaluates as X rounded to the nearest integer">round</code>,
  <code title="sqrt X evaluates as the square root of X">sqrt</code>,
  <code title="ln X evaluates as the natural logarithm of X">ln</code>,
  <code title="exp X evaluates as \u{1D452} raised to the power of X">exp</code>,
  <code title="sin X evaluates as the sine of X">sin</code>,
  <code title="cos X evaluates as the cosine of X">cos</code>,
  <code title="atan X evaluates as the inverse tangent of X">atan</code>,
  <code title="max(X1;&hellip;;Xn) evaluates as the highest value of X1, &hellip;, Xn">max</code>,
  <code title="min(X1;&hellip;;Xn) evaluates as the lowest value of X1, &hellip;, Xn">min</code>,
  <code title="binomial X evaluates as a random number from the Binomial(N, p) distribution">binomial</code>,
  <code title="exponential X evaluates as a random number from the Exponential(&lambda;) distribution">exponential</code>,
  <code title="normal(X;Y) evaluates as a random number from the Normal(&mu;,&sigma;) distribution">normal</code>,
  <code title="poisson(X) evaluates as a random number from the Poisson(&lambda;) distribution">poisson</code>,
  <code title="triangular(X;Y;Z) evaluates as a random number from the Triangular(a,b,c) distribution
NOTE: When omitted, the third parameter c defaults to (a+b)/2">triangular</code>,
  <code title="weibull(X;Y) evaluates as a random number from the Weibull(&lambda;,k) distribution">weibull</code><br>

  <em>Arithmetic:</em>
  <code title="X + Y = sum of X and Y">+</code>,
  <code title="X &minus; Y = difference between X and Y">-</code>,
  <code title="X * Y = product of X and Y">*</code>,
  <code title="X / Y = division of X by Y">/</code>,
  <code title="X % Y = the remainder of X divided by Y">%</code>,
  <code title="X ^ Y = X raised to the power of Y">^</code>,
  <code title="X log Y = base X logarithm of Y">log</code><br>

  <em>Comparison:</em>
  <code title="X = Y evaluates as 1 if X equals Y (otherwise 0)">=</code>,
  <code title="X &lt;&gt; Y evaluates as 1 if X does NOT equal Y (otherwise 0)">&lt;&gt;</code>
  or <code title="Alternative notation for X &lt;&gt; Y">!=</code>, 
  <code title="X &lt; Y evaluates as 1 if X is less than Y (otherwise 0)">&lt;</code>, 
  <code title="X &lt;= Y evaluates as 1 if X is less than or equal to Y (otherwise 0)">&lt;=</code>, 
  <code title="X &gt;= Y evaluates as 1 if X is greater than or equal to Y (otherwise 0)">&gt;=</code>, 
  <code title="X &gt; Y evaluates as 1 if X is greater than Y (otherwise 0)">&gt;</code><br> 

  <em>Logical:</em>
  <code title="X and Y evaluates as 1 if X and Y are both non-zero (otherwise 0)">and</code>, 
  <code title="X or Y evaluates as 1 unless X and Y are both zero (otherwise 0)">or</code><br>

  <em>Conditional:</em>
  <code title="X ? Y : Z evaluates as Y if X is non-zero, and otherwise as Z">X ? Y : Z</code>
  (can be read as <strong>if</strong> X <strong>then</strong> Y <strong>else</strong> Z)<br>

  <em>Resolving undefined values:</em>
  <code title="X | Y evaluates as Y if X is undefined, and otherwise as X">X | Y</code>
  (can be read as <strong>if</strong> X = &#x2047; <strong>then</strong> Y <strong>else</strong> X)<br>

  <em>Grouping:</em>
  <code title="X ; Y evaluates as a group or &ldquo;tuple&rdquo; (X, Y)
NOTE: Grouping groups results in a single group, e.g., (1;2);(3;4;5) evaluates as (1;2;3;4;5)">X ; Y</code>
  (use only in combination with <code>max</code>, <code>min</code> and probabilistic operators). 
</p>
<p>
  Monadic operators take precedence over dyadic operators.
  Use parentheses to override the default evaluation precedence.
</p>`;
    // Add listeners to the GUI elements.
    md.ok.addEventListener('click', () => X_EDIT.parseExpression());
    md.cancel.addEventListener('click', () => X_EDIT.cancel());
    // NOTE: This modal also has an information button in its header.
    md.info.addEventListener(
        'click', () => X_EDIT.toggleExpressionInfo());
    // The "insert factor" button shows factors within scope (if any).
    this.insert_factor.addEventListener(
        'mouseover', (event) => X_EDIT.showVariables(event, 'factor'));
    // The "insert link" button shows links within scope (if any).
    this.insert_link.addEventListener(
        'mouseover', (event) => X_EDIT.showVariables(event, 'link'));
    this.variables.addEventListener(
        'mouseover', (event) => event.stopPropagation());
    // Ensure that list disappears when cursor moves into other controls.
    this.text.addEventListener(
        'mouseover', () => X_EDIT.hideVariables());
    this.status.addEventListener(
        'mouseover', () => X_EDIT.hideVariables());
  }

  editExpression(obj) {
    // Open the dialog for the expression associated with the factor or
    // link `obj`.
    this.edited_object = obj;
    this.edited_expression = obj.expression;
    this.variable.innerText = obj.displayName;
    this.type.innerText = (obj instanceof Link ?
        'link multiplier' : 'factor');
    this.text.value = this.edited_expression.text.trim();
    this.names = {factor: this.factorsInScope, link: this.linksInScope};
    this.in_scope = [];
    this.clearStatusBar();
    this.variables.style.display = 'none';
    this.status.title = pluralS(
        this.names.factor.length + this.names.link.length, 'variable') +
        ` within scope of this ${obj.type.toLowerCase()}`;
    UI.modals.expression.show('text');
  }
 
  cancel() {
    // Close the expression editor dialog.
    this.edited_expression = null;
    UI.modals.expression.hide();
  }

  parseExpression() {
    // @@TO DO: prepare for undo
    // Parse the contents of the expression editor.
    let xt = this.text.value.trim();
    // Remove all non-functional whitespace from variable references. 
    xt = monoSpacedVariables(xt);
    // Update the text shown in the editor, otherwise the position of
    // errors in the text may be incorrect.
    this.text.value = xt;
    const xp = new ExpressionParser(xt, this.edited_object);
    let ok;
    if(xp.error) {
      this.status.innerHTML = xp.error;
      this.status.style.backgroundColor = 'Yellow';
      SOUNDS.warning.play();
      this.text.focus();
      this.text.selectionStart = xp.pit - xp.los;
      this.text.selectionEnd = xp.pit;
      ok = false;
    } else {
      // Changing an expression invalidates model results.
      const reset = this.edited_expression.text !== xp.expr;
      this.edited_expression.text = xp.expr;
      if(reset) UI.resetModel();
      UI.modals.expression.hide();
      ok = true;
    }
    return ok;
  }
  
  clearStatusBar() {
    this.status.style.backgroundColor = UI.color.dialog_background;
    this.status.innerHTML = '&nbsp;';
  }
  
  get factorsInScope() {
    // Returns a list of names of all factors within scope.
    const o = this.edited_object;
    if(o instanceof Link) return [o.from_factor];
    const
        fis = o.inputs,
        list = [];
    for(let i = 0; i < fis.length; i++) {
      list.push(fis[i].from_factor.displayName);
    }
    return list;
  }  
  
  get linksInScope() {
    // Returns a list of names of all links within scope.
    // NOTE: Links do not have other links in scope.
    if(this.edited_object instanceof Link) return [];
    const
        lis = this.edited_object.inputs,
        list = [];
    for(let i = 0; i < lis.length; i++) {
      list.push(lis[i].displayName);
    }
    return list;
  }  
  
  showVariables(event, type) {
    // Compile list of variables in scope.
    event.preventDefault();
    event.stopPropagation();
    const
        tbl = this.variables,
        html = [];
    let offset = 37;
    if(type === 'factor') {
      this.in_scope = this.factorsInScope;
    } else {
      // Display popup list a bit more to the right.
      offset = 20;
      this.in_scope = this.linksInScope;
    }
    this.in_scope.sort((a, b) => UI.compareFullNames(a, b));
    for(let i = 0; i < this.in_scope.length; i++) {
      html.push(`<tr class="list">
          <td onclick="X_EDIT.insertVariable(${i})">${this.in_scope[i]}</td>
        </tr>`);
    }
    tbl.innerHTML = '<table>' + html.join('') + '</table>';
    this.variables.style.left = `calc(100% - ${offset}px)`;
    this.variables.style.display = 'block';
  }
  
  hideVariables() {
    const e = event || window.event;
    e.preventDefault();
    e.stopPropagation();
    // Only hide when the mouse leaves the complete list.
    if(e.target.nodeName === 'DIV' || e.target === this.text) {
      this.variables.style.display = 'none';
    }
  }
  
  insertVariable(nr) {
    // Hide variable list and insert name of selected variable.
    this.variables.style.display = 'none';
    const name = this.in_scope[nr];
    if(name) {
      let p = this.text.selectionStart;
      const
          v = this.text.value,
          tb = v.substring(0, p),
          ta = v.substring(p, v.length);
      this.text.value = `${tb}[${name}]${ta}`;
      p += name.length + 2;
      this.text.setSelectionRange(p, p);
    }
    this.text.focus();
  }
  
  toggleExpressionInfo() {
    // Show/hide information pane with information on expression notation,
    // meanwhile changing the dialog buttons: when guide is showing, only
    // display a "close" button, otherwise info, OK and cancel
    const md = UI.modals.expression;
    if(window.getComputedStyle(this.help).display !== 'none') {
      this.help.style.display = 'none';
      md.ok.style.display = 'block';
      md.cancel.style.display = 'block';
      md.info.src = 'images/info.png';
    } else {
      this.help.style.display = 'block';
      md.ok.style.display = 'none';
      md.cancel.style.display = 'none';
      md.info.src = 'images/close.png';
    }
  }
  
} // END of class ExpressionEditor
