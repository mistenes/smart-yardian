const C = globalThis, L = C.ShadowRoot && (C.ShadyCSS === void 0 || C.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, I = /* @__PURE__ */ Symbol(), q = /* @__PURE__ */ new WeakMap();
let re = class {
  constructor(e, t, s) {
    if (this._$cssResult$ = !0, s !== I) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (L && e === void 0) {
      const s = t !== void 0 && t.length === 1;
      s && (e = q.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), s && q.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const pe = (r) => new re(typeof r == "string" ? r : r + "", void 0, I), ue = (r, ...e) => {
  const t = r.length === 1 ? r[0] : e.reduce((s, a, i) => s + ((n) => {
    if (n._$cssResult$ === !0) return n.cssText;
    if (typeof n == "number") return n;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(a) + r[i + 1], r[0]);
  return new re(t, r, I);
}, he = (r, e) => {
  if (L) r.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const s = document.createElement("style"), a = C.litNonce;
    a !== void 0 && s.setAttribute("nonce", a), s.textContent = t.cssText, r.appendChild(s);
  }
}, V = L ? (r) => r : (r) => r instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const s of e.cssRules) t += s.cssText;
  return pe(t);
})(r) : r;
const { is: me, defineProperty: ge, getOwnPropertyDescriptor: _e, getOwnPropertyNames: ve, getOwnPropertySymbols: be, getPrototypeOf: fe } = Object, N = globalThis, W = N.trustedTypes, ye = W ? W.emptyScript : "", xe = N.reactiveElementPolyfillSupport, k = (r, e) => r, U = { toAttribute(r, e) {
  switch (e) {
    case Boolean:
      r = r ? ye : null;
      break;
    case Object:
    case Array:
      r = r == null ? r : JSON.stringify(r);
  }
  return r;
}, fromAttribute(r, e) {
  let t = r;
  switch (e) {
    case Boolean:
      t = r !== null;
      break;
    case Number:
      t = r === null ? null : Number(r);
      break;
    case Object:
    case Array:
      try {
        t = JSON.parse(r);
      } catch {
        t = null;
      }
  }
  return t;
} }, ie = (r, e) => !me(r, e), Y = { attribute: !0, type: String, converter: U, reflect: !1, useDefault: !1, hasChanged: ie };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), N.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let y = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = Y) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const s = /* @__PURE__ */ Symbol(), a = this.getPropertyDescriptor(e, s, t);
      a !== void 0 && ge(this.prototype, e, a);
    }
  }
  static getPropertyDescriptor(e, t, s) {
    const { get: a, set: i } = _e(this.prototype, e) ?? { get() {
      return this[t];
    }, set(n) {
      this[t] = n;
    } };
    return { get: a, set(n) {
      const c = a?.call(this);
      i?.call(this, n), this.requestUpdate(e, c, s);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? Y;
  }
  static _$Ei() {
    if (this.hasOwnProperty(k("elementProperties"))) return;
    const e = fe(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(k("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(k("properties"))) {
      const t = this.properties, s = [...ve(t), ...be(t)];
      for (const a of s) this.createProperty(a, t[a]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const t = litPropertyMetadata.get(e);
      if (t !== void 0) for (const [s, a] of t) this.elementProperties.set(s, a);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t, s] of this.elementProperties) {
      const a = this._$Eu(t, s);
      a !== void 0 && this._$Eh.set(a, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const t = [];
    if (Array.isArray(e)) {
      const s = new Set(e.flat(1 / 0).reverse());
      for (const a of s) t.unshift(V(a));
    } else e !== void 0 && t.push(V(e));
    return t;
  }
  static _$Eu(e, t) {
    const s = t.attribute;
    return s === !1 ? void 0 : typeof s == "string" ? s : typeof e == "string" ? e.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
  }
  addController(e) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
  }
  removeController(e) {
    this._$EO?.delete(e);
  }
  _$E_() {
    const e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
    for (const s of t.keys()) this.hasOwnProperty(s) && (e.set(s, this[s]), delete this[s]);
    e.size > 0 && (this._$Ep = e);
  }
  createRenderRoot() {
    const e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return he(e, this.constructor.elementStyles), e;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
  }
  enableUpdating(e) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((e) => e.hostDisconnected?.());
  }
  attributeChangedCallback(e, t, s) {
    this._$AK(e, s);
  }
  _$ET(e, t) {
    const s = this.constructor.elementProperties.get(e), a = this.constructor._$Eu(e, s);
    if (a !== void 0 && s.reflect === !0) {
      const i = (s.converter?.toAttribute !== void 0 ? s.converter : U).toAttribute(t, s.type);
      this._$Em = e, i == null ? this.removeAttribute(a) : this.setAttribute(a, i), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const s = this.constructor, a = s._$Eh.get(e);
    if (a !== void 0 && this._$Em !== a) {
      const i = s.getPropertyOptions(a), n = typeof i.converter == "function" ? { fromAttribute: i.converter } : i.converter?.fromAttribute !== void 0 ? i.converter : U;
      this._$Em = a;
      const c = n.fromAttribute(t, i.type);
      this[a] = c ?? this._$Ej?.get(a) ?? c, this._$Em = null;
    }
  }
  requestUpdate(e, t, s, a = !1, i) {
    if (e !== void 0) {
      const n = this.constructor;
      if (a === !1 && (i = this[e]), s ??= n.getPropertyOptions(e), !((s.hasChanged ?? ie)(i, t) || s.useDefault && s.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(n._$Eu(e, s)))) return;
      this.C(e, t, s);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: s, reflect: a, wrapped: i }, n) {
    s && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, n ?? t ?? this[e]), i !== !0 || n !== void 0) || (this._$AL.has(e) || (this.hasUpdated || s || (t = void 0), this._$AL.set(e, t)), a === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (t) {
      Promise.reject(t);
    }
    const e = this.scheduleUpdate();
    return e != null && await e, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [a, i] of this._$Ep) this[a] = i;
        this._$Ep = void 0;
      }
      const s = this.constructor.elementProperties;
      if (s.size > 0) for (const [a, i] of s) {
        const { wrapped: n } = i, c = this[a];
        n !== !0 || this._$AL.has(a) || c === void 0 || this.C(a, void 0, i, c);
      }
    }
    let e = !1;
    const t = this._$AL;
    try {
      e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((s) => s.hostUpdate?.()), this.update(t)) : this._$EM();
    } catch (s) {
      throw e = !1, this._$EM(), s;
    }
    e && this._$AE(t);
  }
  willUpdate(e) {
  }
  _$AE(e) {
    this._$EO?.forEach((t) => t.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(e) {
    return !0;
  }
  update(e) {
    this._$Eq &&= this._$Eq.forEach((t) => this._$ET(t, this[t])), this._$EM();
  }
  updated(e) {
  }
  firstUpdated(e) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[k("elementProperties")] = /* @__PURE__ */ new Map(), y[k("finalized")] = /* @__PURE__ */ new Map(), xe?.({ ReactiveElement: y }), (N.reactiveElementVersions ??= []).push("2.1.2");
const B = globalThis, J = (r) => r, j = B.trustedTypes, G = j ? j.createPolicy("lit-html", { createHTML: (r) => r }) : void 0, ne = "$lit$", _ = `lit$${Math.random().toFixed(9).slice(2)}$`, oe = "?" + _, $e = `<${oe}>`, f = document, A = () => f.createComment(""), S = (r) => r === null || typeof r != "object" && typeof r != "function", K = Array.isArray, we = (r) => K(r) || typeof r?.[Symbol.iterator] == "function", H = `[ 	
\f\r]`, w = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Q = /-->/g, X = />/g, v = RegExp(`>|${H}(?:([^\\s"'>=/]+)(${H}*=${H}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), ee = /'/g, te = /"/g, le = /^(?:script|style|textarea|title)$/i, ke = (r) => (e, ...t) => ({ _$litType$: r, strings: e, values: t }), o = ke(1), x = /* @__PURE__ */ Symbol.for("lit-noChange"), d = /* @__PURE__ */ Symbol.for("lit-nothing"), se = /* @__PURE__ */ new WeakMap(), b = f.createTreeWalker(f, 129);
function de(r, e) {
  if (!K(r) || !r.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return G !== void 0 ? G.createHTML(e) : e;
}
const ze = (r, e) => {
  const t = r.length - 1, s = [];
  let a, i = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", n = w;
  for (let c = 0; c < t; c++) {
    const l = r[c];
    let u, h, p = -1, m = 0;
    for (; m < l.length && (n.lastIndex = m, h = n.exec(l), h !== null); ) m = n.lastIndex, n === w ? h[1] === "!--" ? n = Q : h[1] !== void 0 ? n = X : h[2] !== void 0 ? (le.test(h[2]) && (a = RegExp("</" + h[2], "g")), n = v) : h[3] !== void 0 && (n = v) : n === v ? h[0] === ">" ? (n = a ?? w, p = -1) : h[1] === void 0 ? p = -2 : (p = n.lastIndex - h[2].length, u = h[1], n = h[3] === void 0 ? v : h[3] === '"' ? te : ee) : n === te || n === ee ? n = v : n === Q || n === X ? n = w : (n = v, a = void 0);
    const g = n === v && r[c + 1].startsWith("/>") ? " " : "";
    i += n === w ? l + $e : p >= 0 ? (s.push(u), l.slice(0, p) + ne + l.slice(p) + _ + g) : l + _ + (p === -2 ? c : g);
  }
  return [de(r, i + (r[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), s];
};
class M {
  constructor({ strings: e, _$litType$: t }, s) {
    let a;
    this.parts = [];
    let i = 0, n = 0;
    const c = e.length - 1, l = this.parts, [u, h] = ze(e, t);
    if (this.el = M.createElement(u, s), b.currentNode = this.el.content, t === 2 || t === 3) {
      const p = this.el.content.firstChild;
      p.replaceWith(...p.childNodes);
    }
    for (; (a = b.nextNode()) !== null && l.length < c; ) {
      if (a.nodeType === 1) {
        if (a.hasAttributes()) for (const p of a.getAttributeNames()) if (p.endsWith(ne)) {
          const m = h[n++], g = a.getAttribute(p).split(_), E = /([.?@])?(.*)/.exec(m);
          l.push({ type: 1, index: i, name: E[2], strings: g, ctor: E[1] === "." ? Se : E[1] === "?" ? Me : E[1] === "@" ? Pe : T }), a.removeAttribute(p);
        } else p.startsWith(_) && (l.push({ type: 6, index: i }), a.removeAttribute(p));
        if (le.test(a.tagName)) {
          const p = a.textContent.split(_), m = p.length - 1;
          if (m > 0) {
            a.textContent = j ? j.emptyScript : "";
            for (let g = 0; g < m; g++) a.append(p[g], A()), b.nextNode(), l.push({ type: 2, index: ++i });
            a.append(p[m], A());
          }
        }
      } else if (a.nodeType === 8) if (a.data === oe) l.push({ type: 2, index: i });
      else {
        let p = -1;
        for (; (p = a.data.indexOf(_, p + 1)) !== -1; ) l.push({ type: 7, index: i }), p += _.length - 1;
      }
      i++;
    }
  }
  static createElement(e, t) {
    const s = f.createElement("template");
    return s.innerHTML = e, s;
  }
}
function $(r, e, t = r, s) {
  if (e === x) return e;
  let a = s !== void 0 ? t._$Co?.[s] : t._$Cl;
  const i = S(e) ? void 0 : e._$litDirective$;
  return a?.constructor !== i && (a?._$AO?.(!1), i === void 0 ? a = void 0 : (a = new i(r), a._$AT(r, t, s)), s !== void 0 ? (t._$Co ??= [])[s] = a : t._$Cl = a), a !== void 0 && (e = $(r, a._$AS(r, e.values), a, s)), e;
}
class Ae {
  constructor(e, t) {
    this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(e) {
    const { el: { content: t }, parts: s } = this._$AD, a = (e?.creationScope ?? f).importNode(t, !0);
    b.currentNode = a;
    let i = b.nextNode(), n = 0, c = 0, l = s[0];
    for (; l !== void 0; ) {
      if (n === l.index) {
        let u;
        l.type === 2 ? u = new P(i, i.nextSibling, this, e) : l.type === 1 ? u = new l.ctor(i, l.name, l.strings, this, e) : l.type === 6 && (u = new Ee(i, this, e)), this._$AV.push(u), l = s[++c];
      }
      n !== l?.index && (i = b.nextNode(), n++);
    }
    return b.currentNode = f, a;
  }
  p(e) {
    let t = 0;
    for (const s of this._$AV) s !== void 0 && (s.strings !== void 0 ? (s._$AI(e, s, t), t += s.strings.length - 2) : s._$AI(e[t])), t++;
  }
}
class P {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, t, s, a) {
    this.type = 2, this._$AH = d, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = s, this.options = a, this._$Cv = a?.isConnected ?? !0;
  }
  get parentNode() {
    let e = this._$AA.parentNode;
    const t = this._$AM;
    return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(e, t = this) {
    e = $(this, e, t), S(e) ? e === d || e == null || e === "" ? (this._$AH !== d && this._$AR(), this._$AH = d) : e !== this._$AH && e !== x && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : we(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== d && S(this._$AH) ? this._$AA.nextSibling.data = e : this.T(f.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: s } = e, a = typeof s == "number" ? this._$AC(e) : (s.el === void 0 && (s.el = M.createElement(de(s.h, s.h[0]), this.options)), s);
    if (this._$AH?._$AD === a) this._$AH.p(t);
    else {
      const i = new Ae(a, this), n = i.u(this.options);
      i.p(t), this.T(n), this._$AH = i;
    }
  }
  _$AC(e) {
    let t = se.get(e.strings);
    return t === void 0 && se.set(e.strings, t = new M(e)), t;
  }
  k(e) {
    K(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let s, a = 0;
    for (const i of e) a === t.length ? t.push(s = new P(this.O(A()), this.O(A()), this, this.options)) : s = t[a], s._$AI(i), a++;
    a < t.length && (this._$AR(s && s._$AB.nextSibling, a), t.length = a);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const s = J(e).nextSibling;
      J(e).remove(), e = s;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class T {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, s, a, i) {
    this.type = 1, this._$AH = d, this._$AN = void 0, this.element = e, this.name = t, this._$AM = a, this.options = i, s.length > 2 || s[0] !== "" || s[1] !== "" ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = d;
  }
  _$AI(e, t = this, s, a) {
    const i = this.strings;
    let n = !1;
    if (i === void 0) e = $(this, e, t, 0), n = !S(e) || e !== this._$AH && e !== x, n && (this._$AH = e);
    else {
      const c = e;
      let l, u;
      for (e = i[0], l = 0; l < i.length - 1; l++) u = $(this, c[s + l], t, l), u === x && (u = this._$AH[l]), n ||= !S(u) || u !== this._$AH[l], u === d ? e = d : e !== d && (e += (u ?? "") + i[l + 1]), this._$AH[l] = u;
    }
    n && !a && this.j(e);
  }
  j(e) {
    e === d ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Se extends T {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === d ? void 0 : e;
  }
}
class Me extends T {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== d);
  }
}
class Pe extends T {
  constructor(e, t, s, a, i) {
    super(e, t, s, a, i), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = $(this, e, t, 0) ?? d) === x) return;
    const s = this._$AH, a = e === d && s !== d || e.capture !== s.capture || e.once !== s.once || e.passive !== s.passive, i = e !== d && (s === d || a);
    a && this.element.removeEventListener(this.name, this, s), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class Ee {
  constructor(e, t, s) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = s;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    $(this, e);
  }
}
const De = B.litHtmlPolyfillSupport;
De?.(M, P), (B.litHtmlVersions ??= []).push("3.3.3");
const Ce = (r, e, t) => {
  const s = t?.renderBefore ?? e;
  let a = s._$litPart$;
  if (a === void 0) {
    const i = t?.renderBefore ?? null;
    s._$litPart$ = a = new P(e.insertBefore(A(), i), i, void 0, t ?? {});
  }
  return a._$AI(r), a;
};
const F = globalThis;
class z extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ce(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return x;
  }
}
z._$litElement$ = !0, z.finalized = !0, F.litElementHydrateSupport?.({ LitElement: z });
const je = F.litElementPolyfillSupport;
je?.({ LitElement: z });
(F.litElementVersions ??= []).push("4.2.2");
const Ne = (r) => r.connection.sendMessagePromise({ type: "smart_yardian/summary" }), Te = (r) => r.connection.sendMessagePromise({
  type: "smart_yardian/weather/preview"
}), He = (r) => r.connection.sendMessagePromise({
  type: "smart_yardian/schedule/preview"
}), O = (r, e) => r.connection.sendMessagePromise({
  type: "smart_yardian/program/save",
  program: e
}), Ze = (r, e) => r.connection.sendMessagePromise({
  type: "smart_yardian/program/delete",
  program_id: e
}), Re = (r, e) => r.connection.sendMessagePromise({
  type: "smart_yardian/settings/update",
  settings: e
}), Ue = (r, e) => r.connection.sendMessagePromise({
  type: "smart_yardian/zone_profiles/update",
  profiles: e
}), Oe = (r, e) => r.connection.sendMessagePromise({
  type: "smart_yardian/automation/set",
  enabled: e
}), Le = (r, e) => r.connection.sendMessagePromise({
  type: "smart_yardian/run/program",
  program_id: e,
  apply_weather: !0
}), Ie = async (r, e) => {
  const t = await O(r, e);
  return await Le(r, t.program_id), t;
}, Be = (r, e, t) => r.connection.sendMessagePromise({
  type: "smart_yardian/run/manual_program",
  program: e,
  apply_weather: t
}), Ke = (r, e, t) => r.connection.sendMessagePromise({
  type: "smart_yardian/run/zone",
  entity_id: e,
  duration_minutes: t
}), Fe = (r) => r.connection.sendMessagePromise({ type: "smart_yardian/run/stop" }), qe = (r) => r.connection.sendMessagePromise({
  type: "smart_yardian/run/skip_current_zone"
}), ae = (r, e) => r.connection.sendMessagePromise({
  type: "smart_yardian/pause_until",
  until: e
}), Ve = (r = Date.now(), e = Math.random()) => `program-${r.toString(36)}-${Math.floor(e * 4294967296).toString(36).padStart(7, "0")}`, We = ue`
  :host {
    --sy-blue: var(--primary-color, #1688e8);
    --sy-green: var(--success-color, #2e9637);
    --sy-amber: var(--warning-color, #c98200);
    --sy-red: var(--error-color, #df2f2f);
    --sy-text: var(--primary-text-color, #20252b);
    --sy-muted: var(--secondary-text-color, #697078);
    --sy-disabled: var(--disabled-text-color, #8b9298);
    --sy-border: var(--divider-color, #dfe3e7);
    --sy-surface: var(--card-background-color, #ffffff);
    --sy-background: var(--primary-background-color, #f4f6f8);
    --sy-surface-muted: var(
      --secondary-background-color,
      color-mix(in srgb, var(--sy-surface) 94%, var(--sy-text))
    );
    --sy-control: var(--input-fill-color, var(--sy-surface));
    --sy-control-hover: color-mix(in srgb, var(--sy-blue) 7%, var(--sy-control));
    --sy-hover: color-mix(in srgb, var(--sy-text) 6%, transparent);
    --sy-blue-soft: color-mix(in srgb, var(--sy-blue) 13%, var(--sy-surface));
    --sy-green-soft: color-mix(in srgb, var(--sy-green) 13%, var(--sy-surface));
    --sy-amber-soft: color-mix(in srgb, var(--sy-amber) 13%, var(--sy-surface));
    --sy-red-soft: color-mix(in srgb, var(--sy-red) 12%, var(--sy-surface));
    --sy-on-accent: var(--text-primary-color, #ffffff);
    --sy-toggle-knob: #ffffff;
    --sy-shadow: rgb(0 0 0 / 18%);
    display: block;
    min-height: 100%;
    color: var(--sy-text);
    background: var(--sy-background);
    font-family: var(--paper-font-body1_-_font-family, sans-serif);
    font-size: 14px;
  }

  * {
    box-sizing: border-box;
  }

  button,
  input,
  select {
    font: inherit;
    color-scheme: inherit;
  }

  button {
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition:
      background-color 140ms ease,
      border-color 140ms ease,
      color 140ms ease,
      opacity 140ms ease;
  }

  input::placeholder {
    color: var(--sy-muted);
    opacity: 0.85;
  }

  input:disabled,
  select:disabled {
    cursor: not-allowed;
    color: var(--sy-disabled);
    background: var(--sy-surface-muted);
    opacity: 1;
  }

  input:not(:disabled):hover,
  select:not(:disabled):hover {
    border-color: color-mix(in srgb, var(--sy-blue) 55%, var(--sy-border));
    background: var(--sy-control-hover);
  }

  select {
    accent-color: var(--sy-blue);
  }

  input[type="checkbox"],
  input[type="radio"] {
    accent-color: var(--sy-blue);
  }

  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--sy-blue);
    outline-offset: 2px;
  }

  .shell {
    min-height: 100vh;
    background: var(--sy-surface);
    color-scheme: light;
  }

  .shell[dark] {
    --sy-control: var(--input-fill-color, var(--sy-surface-muted));
    --sy-control-hover: color-mix(in srgb, var(--sy-blue) 15%, var(--sy-control));
    --sy-hover: color-mix(in srgb, var(--sy-text) 10%, transparent);
    --sy-blue-soft: color-mix(in srgb, var(--sy-blue) 20%, var(--sy-surface));
    --sy-green-soft: color-mix(in srgb, var(--sy-green) 18%, var(--sy-surface));
    --sy-amber-soft: color-mix(in srgb, var(--sy-amber) 18%, var(--sy-surface));
    --sy-red-soft: color-mix(in srgb, var(--sy-red) 18%, var(--sy-surface));
    --sy-on-accent: #07131f;
    --sy-shadow: rgb(0 0 0 / 42%);
    color-scheme: dark;
  }

  .topbar {
    min-height: 64px;
    padding: 0 26px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid var(--sy-border);
  }

  .topbar ha-icon {
    color: var(--sy-blue);
    --mdc-icon-size: 25px;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 500;
    line-height: 1.2;
  }

  .tabs {
    height: 52px;
    padding: 0 26px;
    display: flex;
    align-items: stretch;
    gap: 32px;
    border-bottom: 1px solid var(--sy-border);
  }

  .tab {
    padding: 0;
    color: var(--sy-text);
    background: none;
    border: 0;
    border-bottom: 2px solid transparent;
    font-size: 14px;
    font-weight: 500;
  }

  .tab[selected] {
    color: var(--sy-blue);
    border-bottom-color: var(--sy-blue);
  }

  .tab:hover:not([selected]),
  .controller-head:hover,
  .program-list-item:hover:not([selected]),
  .active-run-summary:hover {
    background: var(--sy-hover);
  }

  .content {
    width: min(100%, 1280px);
    margin: 0 auto;
    padding: 24px 26px 28px;
  }

  .automation {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
  }

  .automation-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: var(--sy-on-accent);
    background: var(--sy-green);
  }

  .automation-icon[off] {
    background: var(--sy-muted);
  }

  .automation-icon ha-icon {
    --mdc-icon-size: 27px;
  }

  .automation-copy {
    flex: 1;
    min-width: 0;
  }

  .automation-title {
    color: var(--sy-green);
    font-size: 23px;
    font-weight: 500;
    line-height: 1.2;
  }

  .automation-title[off] {
    color: var(--sy-muted);
  }

  .subtle {
    margin-top: 3px;
    color: var(--sy-muted);
    font-size: 13px;
  }

  .toggle {
    position: relative;
    width: 38px;
    height: 22px;
    flex: 0 0 auto;
    padding: 0;
    border: 0;
    border-radius: 12px;
    background: var(--sy-disabled);
  }

  .toggle::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--sy-toggle-knob);
    transition: left 140ms ease;
  }

  .toggle[on] {
    background: var(--sy-blue);
  }

  .toggle[on]::after {
    left: 19px;
  }

  .weather-band {
    min-height: 92px;
    display: grid;
    grid-template-columns: minmax(270px, 1fr) repeat(4, minmax(100px, auto));
    align-items: center;
    border: 1px solid color-mix(in srgb, var(--sy-amber) 72%, var(--sy-border));
    border-radius: 8px;
    background: var(--sy-amber-soft);
    overflow: hidden;
  }

  .weather-summary {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
  }

  .weather-summary > ha-icon {
    color: var(--sy-amber);
    --mdc-icon-size: 39px;
  }

  .decision {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.25;
  }

  .weather-reason {
    margin-top: 5px;
    color: var(--sy-muted);
    line-height: 1.35;
  }

  .metric {
    min-height: 54px;
    padding: 2px 16px;
    display: grid;
    grid-template-columns: 25px auto;
    align-content: center;
    gap: 2px 9px;
    border-left: 1px solid color-mix(in srgb, var(--sy-amber) 32%, var(--sy-border));
  }

  .metric ha-icon {
    grid-row: 1 / 3;
    align-self: center;
    color: var(--sy-blue);
    --mdc-icon-size: 24px;
  }

  .metric.sun ha-icon {
    color: var(--sy-amber);
  }

  .metric.temp ha-icon {
    color: var(--sy-red);
  }

  .metric-label {
    color: var(--sy-muted);
    font-size: 12px;
    white-space: nowrap;
  }

  .metric-value {
    font-size: 18px;
    font-weight: 600;
    white-space: nowrap;
  }

  .next-run {
    min-height: 54px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--sy-text);
  }

  .next-run ha-icon {
    color: var(--sy-blue);
  }

  .linklike {
    color: var(--sy-blue);
    font-weight: 500;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 292px;
    border: 1px solid var(--sy-border);
    border-radius: 8px;
    overflow: hidden;
  }

  .controllers {
    min-width: 0;
  }

  .controller + .controller {
    border-top: 1px solid var(--sy-border);
  }

  .controller-head {
    width: 100%;
    min-height: 66px;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--sy-text);
    text-align: left;
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--sy-border);
  }

  .controller-head > div:nth-child(2) {
    flex: 1;
  }

  .controller-chevron {
    color: var(--sy-muted);
  }

  .controller-mark {
    width: 40px;
    height: 34px;
    display: grid;
    place-items: center;
    border: 1px solid var(--sy-border);
    border-radius: 7px;
    background: var(--sy-surface-muted);
    color: var(--sy-muted);
  }

  .controller-name {
    font-size: 17px;
    font-weight: 600;
  }

  .controller-meta {
    margin-top: 3px;
    color: var(--sy-muted);
    font-size: 12px;
  }

  .online {
    color: var(--sy-green);
  }

  .partial {
    color: var(--sy-amber);
    font-weight: 600;
  }

  .offline {
    color: var(--sy-red);
    font-weight: 600;
  }

  .zone-row {
    min-height: 56px;
    padding: 0 12px 0 18px;
    display: grid;
    grid-template-columns: 30px minmax(120px, 1fr) minmax(128px, 180px) 80px 88px;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid var(--sy-border);
  }

  .zone-row:last-child {
    border-bottom: 0;
  }

  .zone-row ha-icon {
    color: var(--sy-blue);
    --mdc-icon-size: 19px;
  }

  .zone-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .zone-state {
    color: var(--sy-muted);
    font-size: 12px;
    line-height: 1.25;
  }

  .zone-state[running] {
    color: var(--sy-green);
    font-weight: 600;
  }

  .zone-state[unavailable] {
    color: var(--sy-red);
    font-weight: 600;
  }

  .zone-state small {
    display: block;
    color: var(--sy-muted);
    font-weight: 500;
    margin-top: 2px;
  }

  .duration {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .duration input {
    width: 48px;
    height: 31px;
    padding: 0 6px;
    border: 1px solid var(--sy-border);
    border-radius: 6px;
    color: var(--sy-text);
    background: var(--sy-control);
    appearance: textfield;
    -moz-appearance: textfield;
  }

  .duration input::-webkit-inner-spin-button,
  .duration input::-webkit-outer-spin-button {
    margin: 0;
    appearance: none;
  }

  .duration span {
    color: var(--sy-muted);
    font-size: 12px;
  }

  .button {
    min-height: 34px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    color: var(--sy-blue);
    background: var(--sy-control);
    border: 1px solid var(--sy-blue);
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
  }

  .button.primary {
    color: var(--sy-on-accent);
    background: var(--sy-blue);
  }

  .button.danger {
    color: var(--sy-red);
    border-color: var(--sy-red);
  }

  .button.quiet {
    color: var(--sy-text);
    border-color: var(--sy-border);
  }

  .button:disabled {
    cursor: not-allowed;
    color: var(--sy-disabled);
    background: var(--sy-surface-muted);
    border-color: var(--sy-border);
    opacity: 0.72;
  }

  .button:hover:not(:disabled) {
    background: var(--sy-blue-soft);
  }

  .button.primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--sy-blue) 86%, var(--sy-text));
  }

  .button.danger:hover:not(:disabled) {
    background: var(--sy-red-soft);
  }

  .button.quiet:hover:not(:disabled) {
    background: var(--sy-hover);
    border-color: color-mix(in srgb, var(--sy-text) 24%, var(--sy-border));
  }

  .button:active:not(:disabled),
  .day:active,
  .icon-button:active,
  .text-action:active {
    transform: translateY(1px);
  }

  .rail {
    padding: 0 14px;
    border-left: 1px solid var(--sy-border);
  }

  .rail-title,
  .section-head {
    min-height: 50px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--sy-border);
    font-size: 15px;
    font-weight: 600;
  }

  .text-action {
    padding: 5px 0;
    color: var(--sy-blue);
    background: none;
    border: 0;
    font-size: 12px;
    font-weight: 600;
  }

  .text-action:hover,
  .icon-button:hover {
    color: var(--sy-blue);
  }

  .icon-button:hover {
    background: var(--sy-hover);
    border-radius: 6px;
  }

  .program-rail-item {
    padding: 14px 0;
    border-bottom: 1px solid var(--sy-border);
  }

  .program-line {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .program-line ha-icon {
    color: var(--sy-amber);
    --mdc-icon-size: 20px;
  }

  .program-line strong {
    flex: 1;
  }

  .program-details {
    margin: 9px 0 0 28px;
    color: var(--sy-muted);
    font-size: 12px;
    line-height: 1.65;
  }

  .manual-program {
    padding-top: 18px;
  }

  .manual-program-toolbar,
  .manual-add {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr) auto;
    align-items: end;
    gap: 14px;
    padding: 16px;
    border: 1px solid var(--sy-border);
    border-radius: 10px;
    background: var(--sy-surface);
  }

  .manual-weather {
    display: flex;
    min-height: 38px;
    align-items: center;
    gap: 8px;
  }

  .manual-zone-list {
    margin: 14px 0;
    border: 1px solid var(--sy-border);
    border-radius: 10px;
    overflow: hidden;
  }

  .manual-zone {
    display: grid;
    min-height: 62px;
    padding: 10px 12px;
    grid-template-columns:
      28px minmax(150px, 1fr) minmax(155px, 0.8fr)
      minmax(100px, 0.5fr) 80px auto;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid var(--sy-border);
  }

  .manual-zone:last-child {
    border-bottom: 0;
  }

  .manual-zone-order {
    display: grid;
    width: 26px;
    height: 26px;
    place-items: center;
    color: var(--sy-muted);
    background: var(--sy-blue-soft);
    border-radius: 50%;
    font-size: 12px;
    font-weight: 700;
  }

  .manual-duration {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .manual-duration input {
    width: 76px;
  }

  .manual-calculated {
    color: var(--sy-muted);
    font-size: 12px;
  }

  .manual-zone-actions {
    display: flex;
    gap: 4px;
  }

  .manual-total {
    display: grid;
    gap: 3px;
  }

  .manual-total span {
    color: var(--sy-muted);
    font-size: 12px;
  }

  .manual-total strong {
    font-size: 18px;
  }

  .manual-start {
    min-height: 40px;
  }

  .history-compact {
    padding: 14px 0 18px;
  }

  .history-compact-title {
    margin-bottom: 9px;
    font-weight: 600;
  }

  .history-reason {
    margin-top: 4px;
    color: var(--sy-red);
    font-size: 12px;
  }

  .stop-all {
    width: 100%;
    min-height: 48px;
    margin-top: 18px;
  }

  .shell:has(.active-run) .content {
    padding-bottom: 112px;
  }

  .active-run {
    position: fixed;
    z-index: 10;
    right: 0;
    bottom: 0;
    left: 0;
    max-width: 1180px;
    margin: 0 auto;
    color: var(--sy-text);
    background: var(--sy-surface);
    border: 1px solid var(--sy-border);
    border-bottom: 0;
    border-radius: 14px 14px 0 0;
    box-shadow: 0 -8px 28px var(--sy-shadow);
  }

  .active-run-summary {
    display: grid;
    width: 100%;
    min-height: 58px;
    padding: 9px 14px;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 10px;
    color: inherit;
    background: transparent;
    border: 0;
    text-align: left;
  }

  .active-run-summary > span:nth-child(2) {
    display: grid;
    min-width: 0;
    gap: 2px;
  }

  .active-run-summary strong,
  .active-run-summary small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .active-run-summary small,
  .run-progress-label {
    color: var(--sy-muted);
  }

  .run-pulse {
    width: 10px;
    height: 10px;
    background: var(--sy-green);
    border-radius: 50%;
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--sy-green) 18%, transparent);
  }

  .active-run-progress {
    height: 3px;
    background: color-mix(in srgb, var(--sy-blue) 15%, transparent);
  }

  .active-run-progress span {
    display: block;
    height: 100%;
    background: var(--sy-blue);
    transition: width 1s linear;
  }

  .active-run-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 8px 14px calc(8px + env(safe-area-inset-bottom));
  }

  .active-run-detail {
    padding: 16px 16px 8px;
    border-bottom: 1px solid var(--sy-border);
  }

  .active-run-detail-head,
  .active-run-detail-head > div {
    display: flex;
    align-items: center;
  }

  .active-run-detail-head {
    justify-content: space-between;
    gap: 12px;
  }

  .active-run-detail-head > div {
    align-items: baseline;
    gap: 8px;
  }

  .active-run-detail-head span,
  .run-countdowns span,
  .run-step > span,
  .run-step small {
    color: var(--sy-muted);
    font-size: 11px;
  }

  .run-countdowns {
    display: grid;
    margin-top: 14px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .run-countdowns > div {
    display: grid;
    gap: 3px;
    padding: 10px 12px;
    background: var(--sy-blue-soft);
    border-radius: 8px;
  }

  .run-countdowns strong {
    font-size: 22px;
    font-variant-numeric: tabular-nums;
  }

  .run-sequence {
    display: grid;
    margin-top: 12px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .run-step {
    display: grid;
    min-width: 0;
    gap: 3px;
    padding: 10px;
    border: 1px solid var(--sy-border);
    border-radius: 8px;
  }

  .run-step[active] {
    border-color: var(--sy-blue);
    background: var(--sy-blue-soft);
  }

  .run-step[empty] {
    opacity: 0.55;
  }

  .run-step strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .page-head {
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid var(--sy-border);
  }

  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .schedule-days {
    padding-top: 18px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    align-items: start;
  }

  .schedule-day {
    min-width: 0;
    border: 1px solid var(--sy-border);
    border-radius: 8px;
    overflow: hidden;
  }

  .schedule-day-head {
    min-height: 48px;
    padding: 9px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-bottom: 1px solid var(--sy-border);
    background: var(--sy-surface-muted);
  }

  .schedule-day-head strong {
    text-transform: capitalize;
  }

  .schedule-day-head span {
    color: var(--sy-muted);
    font-size: 12px;
    white-space: nowrap;
  }

  .schedule-program {
    padding: 12px;
    border-bottom: 1px solid var(--sy-border);
    box-shadow: inset 3px 0 0 var(--sy-amber);
  }

  .schedule-program[runnable] {
    box-shadow: inset 3px 0 0 var(--sy-green);
  }

  .schedule-program:last-child {
    border-bottom: 0;
  }

  .schedule-program-head {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    align-items: baseline;
    gap: 8px;
  }

  .schedule-program-head time {
    color: var(--sy-muted);
    font-size: 12px;
  }

  .schedule-status {
    color: var(--sy-amber);
    font-size: 11px;
    font-weight: 600;
    text-align: right;
  }

  .schedule-status.will_run {
    color: var(--sy-green);
  }

  .schedule-status.weather_unavailable {
    color: var(--sy-red);
  }

  .schedule-reason {
    margin: 7px 0 8px 52px;
    color: var(--sy-muted);
    font-size: 12px;
    line-height: 1.4;
  }

  .schedule-weather {
    margin: 0 0 9px 52px;
    display: flex;
    flex-wrap: wrap;
    gap: 5px 12px;
    color: var(--sy-muted);
    font-size: 11px;
  }

  .schedule-zones {
    border-top: 1px solid var(--sy-border);
  }

  .schedule-zones > div,
  .schedule-total {
    min-height: 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--sy-border);
    font-size: 12px;
  }

  .schedule-zones > div strong {
    white-space: nowrap;
  }

  .schedule-total {
    border-bottom: 0;
    font-size: 13px;
  }

  .schedule-empty {
    min-height: 100px;
    padding: 28px 14px;
    display: grid;
    place-items: center;
    color: var(--sy-muted);
    text-align: center;
    font-size: 12px;
  }

  .schedule-generated {
    margin-top: 12px;
    color: var(--sy-muted);
    font-size: 11px;
    text-align: right;
  }

  .program-workspace {
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    min-height: 620px;
    border: 1px solid var(--sy-border);
    border-radius: 8px;
    overflow: hidden;
  }

  .program-list {
    border-right: 1px solid var(--sy-border);
  }

  .program-list-item {
    width: 100%;
    padding: 14px 16px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 5px 12px;
    text-align: left;
    color: var(--sy-text);
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--sy-border);
  }

  .program-list-item[selected] {
    background: var(--sy-blue-soft);
    box-shadow: inset 3px 0 0 var(--sy-blue);
  }

  .program-list-item strong {
    font-size: 14px;
  }

  .program-list-item span {
    color: var(--sy-muted);
    font-size: 12px;
  }

  .editor {
    padding: 22px 24px 28px;
  }

  .field {
    margin-bottom: 18px;
  }

  .field label,
  .field-label {
    display: block;
    margin-bottom: 7px;
    font-size: 13px;
    font-weight: 600;
  }

  .field input[type="text"],
  .field input[type="time"],
  .field input[type="number"],
  .field select {
    width: 100%;
    min-height: 40px;
    padding: 8px 10px;
    color: var(--sy-text);
    background: var(--sy-control);
    border: 1px solid var(--sy-border);
    border-radius: 7px;
  }

  .days {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .day {
    min-width: 42px;
    height: 36px;
    color: var(--sy-text);
    background: var(--sy-control);
    border: 1px solid var(--sy-border);
    border-radius: 7px;
  }

  .day[selected] {
    color: var(--sy-on-accent);
    background: var(--sy-blue);
    border-color: var(--sy-blue);
  }

  .editor-zones {
    border: 1px solid var(--sy-border);
    border-radius: 7px;
    overflow: hidden;
  }

  .editor-zone {
    min-height: 49px;
    padding: 6px 9px;
    display: grid;
    grid-template-columns: minmax(140px, 1fr) 170px 110px 34px;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid var(--sy-border);
  }

  .editor-zone:last-child {
    border-bottom: 0;
  }

  .editor-zone select {
    min-height: 34px;
    padding: 5px 8px;
    color: var(--sy-text);
    background: var(--sy-control);
    border: 1px solid var(--sy-border);
    border-radius: 6px;
  }

  .editor-duration {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .editor-duration input {
    width: 65px;
  }

  .editor-duration span,
  .calculated-duration {
    color: var(--sy-muted);
    font-size: 12px;
  }

  .icon-button {
    width: 32px;
    height: 32px;
    padding: 0;
    color: var(--sy-muted);
    background: transparent;
    border: 0;
  }

  .icon-button ha-icon {
    --mdc-icon-size: 20px;
  }

  .checkline {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 12px 0;
  }

  .temperature-condition {
    margin: 8px 0 18px 25px;
    display: grid;
    grid-template-columns: minmax(190px, 1fr) 150px 105px;
    align-items: center;
    gap: 8px;
    color: var(--sy-muted);
    font-size: 13px;
  }

  .temperature-condition select,
  .temperature-condition input {
    width: 100%;
    min-height: 36px;
    padding: 6px 8px;
    color: var(--sy-text);
    background: var(--sy-control);
    border: 1px solid var(--sy-border);
    border-radius: 6px;
  }

  .temperature-condition label {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 6px;
  }

  .editor-actions {
    margin-top: 24px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  .editor-actions > div {
    display: flex;
    gap: 8px;
  }

  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--sy-border);
    border-radius: 8px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 12px 14px;
    text-align: left;
    border-bottom: 1px solid var(--sy-border);
    white-space: nowrap;
  }

  th {
    color: var(--sy-muted);
    background: var(--sy-surface-muted);
    font-size: 12px;
    font-weight: 600;
  }

  td.reason-cell {
    min-width: 280px;
    white-space: normal;
  }

  .history-weather {
    margin-top: 5px;
    color: var(--sy-muted);
    font-size: 11px;
    line-height: 1.4;
  }

  .outcome {
    font-weight: 600;
  }

  .outcome.completed {
    color: var(--sy-green);
  }

  .outcome.failed,
  .outcome.interrupted {
    color: var(--sy-red);
  }

  .outcome.skipped,
  .outcome.stopped {
    color: var(--sy-amber);
  }

  .settings-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 28px;
    padding-top: 20px;
  }

  .settings-section {
    margin-bottom: 24px;
  }

  .settings-section h3 {
    margin: 0 0 14px;
    padding-bottom: 9px;
    border-bottom: 1px solid var(--sy-border);
    font-size: 16px;
  }

  .setting-row {
    min-height: 49px;
    display: grid;
    grid-template-columns: 1fr 100px;
    align-items: center;
    gap: 16px;
    border-bottom: 1px solid var(--sy-border);
  }

  .setting-row input {
    width: 100%;
    height: 34px;
    padding: 5px 8px;
    color: var(--sy-text);
    background: var(--sy-control);
    border: 1px solid var(--sy-border);
    border-radius: 6px;
  }

  .zone-profiles {
    margin-top: 6px;
  }

  .settings-help {
    max-width: 850px;
    margin: -4px 0 16px;
    color: var(--sy-muted);
    line-height: 1.45;
  }

  .zone-profile-head,
  .zone-profile-row {
    display: grid;
    grid-template-columns:
      minmax(145px, 1.2fr) minmax(135px, 0.9fr) minmax(115px, 0.75fr)
      minmax(110px, 0.7fr) minmax(110px, 0.7fr) minmax(100px, 0.65fr)
      minmax(180px, 1.2fr) minmax(125px, 0.8fr);
    align-items: center;
    gap: 12px;
  }

  .moisture-bulk {
    display: flex;
    align-items: end;
    gap: 10px;
    margin: 0 0 16px;
    padding: 12px;
    border: 1px solid var(--sy-border);
    border-radius: 8px;
    background: var(--sy-surface);
  }

  .moisture-bulk label {
    display: grid;
    flex: 1;
    max-width: 460px;
    gap: 6px;
    color: var(--sy-muted);
    font-size: 12px;
  }

  .moisture-bulk select {
    height: 36px;
    padding: 5px 8px;
    color: var(--sy-text);
    background: var(--sy-control);
    border: 1px solid var(--sy-border);
    border-radius: 6px;
  }

  .zone-profile-head {
    min-height: 36px;
    color: var(--sy-muted);
    border-bottom: 1px solid var(--sy-border);
    font-size: 12px;
    font-weight: 600;
  }

  .zone-profile-row {
    min-height: 58px;
    border-bottom: 1px solid var(--sy-border);
  }

  .zone-profile-row select,
  .zone-profile-row input {
    width: 100%;
    height: 34px;
    padding: 5px 8px;
    color: var(--sy-text);
    background: var(--sy-control);
    border: 1px solid var(--sy-border);
    border-radius: 6px;
  }

  .profile-number {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 5px;
  }

  .profile-number > span:last-child,
  .effective-rate > span {
    color: var(--sy-muted);
    font-size: 11px;
  }

  .effective-rate {
    display: grid;
    gap: 2px;
  }

  .moisture-select {
    display: grid;
    gap: 3px;
  }

  .sensor-reading {
    color: var(--sy-muted);
    font-size: 11px;
  }

  .zone-profile-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 14px;
    padding-top: 16px;
    color: var(--sy-muted);
    font-size: 12px;
  }

  .save-success {
    color: var(--sy-green);
    font-weight: 600;
  }

  .mobile-label {
    display: none;
  }

  .empty,
  .loading,
  .error {
    padding: 32px;
    color: var(--sy-muted);
    text-align: center;
  }

  .error {
    color: var(--sy-red);
  }

  @media (max-width: 900px) {
    .manual-program-toolbar,
    .manual-add {
      grid-template-columns: 1fr;
      align-items: stretch;
    }

    .manual-zone {
      grid-template-columns: 28px minmax(0, 1fr) auto;
    }

    .manual-zone > select,
    .manual-duration,
    .manual-calculated {
      grid-column: 2 / -1;
    }

    .manual-zone-actions {
      grid-column: 3;
      grid-row: 1;
    }

    .content {
      padding: 18px 14px 90px;
    }

    .topbar,
    .tabs {
      padding-left: 16px;
      padding-right: 16px;
    }

    .tabs {
      gap: 22px;
      overflow-x: auto;
    }

    .weather-band {
      grid-template-columns: repeat(4, 1fr);
    }

    .weather-summary {
      grid-column: 1 / -1;
      border-bottom: 1px solid color-mix(in srgb, var(--sy-amber) 32%, var(--sy-border));
    }

    .metric {
      min-height: 59px;
      padding: 5px 9px;
    }

    .overview-grid {
      display: block;
    }

    .rail {
      border-top: 1px solid var(--sy-border);
      border-left: 0;
    }

    .program-workspace {
      grid-template-columns: 1fr;
    }

    .schedule-days {
      grid-template-columns: 1fr;
    }

    .program-list {
      max-height: 240px;
      overflow-y: auto;
      border-right: 0;
      border-bottom: 1px solid var(--sy-border);
    }

    .settings-grid {
      grid-template-columns: 1fr;
    }

    .zone-profile-head {
      display: none;
    }

    .zone-profile-row {
      padding: 14px 0;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 14px;
    }

    .zone-profile-row > strong,
    .effective-rate {
      grid-column: 1 / -1;
    }

    .moisture-bulk {
      align-items: stretch;
      flex-direction: column;
    }

    .moisture-bulk label {
      max-width: none;
    }

    .zone-profile-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .mobile-label {
      display: block;
      margin-bottom: 5px;
      color: var(--sy-muted);
      font-size: 11px;
    }

    .profile-number {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .profile-number .mobile-label {
      grid-column: 1 / -1;
    }

    .stop-all {
      position: fixed;
      z-index: 4;
      left: 14px;
      right: 14px;
      bottom: 12px;
      width: auto;
      margin: 0;
      background: var(--sy-surface);
      box-shadow: 0 2px 8px var(--sy-shadow);
    }
  }

  @media (max-width: 600px) {
    .active-run {
      width: auto;
      right: 8px;
      left: 8px;
    }

    .active-run-actions > button {
      flex: 1;
    }

    .run-sequence {
      grid-template-columns: 1fr;
    }

    .run-step {
      grid-template-columns: 70px minmax(0, 1fr) auto;
      align-items: center;
    }

    .topbar {
      min-height: 54px;
    }

    h1 {
      font-size: 20px;
    }

    .automation-title {
      font-size: 18px;
    }

    .weather-summary {
      padding: 14px;
    }

    .decision {
      font-size: 17px;
    }

    .metric {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      text-align: center;
    }

    .metric ha-icon {
      display: none;
    }

    .metric-label {
      font-size: 10px;
    }

    .metric-value {
      font-size: 14px;
    }

    .zone-row {
      min-height: 42px;
      grid-template-columns: 22px minmax(90px, 1fr) 52px 38px;
      gap: 6px;
      padding-left: 10px;
      font-size: 13px;
    }

    .controller-head {
      min-height: 58px;
    }

    .controller[collapsed] .zone-row {
      display: none;
    }

    .zone-state {
      display: none;
    }

    .duration input {
      width: 44px;
      height: 30px;
    }

    .duration span {
      display: none;
    }

    .zone-row .button {
      width: 36px;
      min-width: 36px;
      padding: 0;
      font-size: 0;
    }

    .zone-row .button ha-icon {
      --mdc-icon-size: 18px;
    }

    .editor-zone {
      grid-template-columns: minmax(0, 1fr) 34px;
      padding: 10px;
    }

    .schedule-program-head {
      grid-template-columns: 42px minmax(0, 1fr);
    }

    .schedule-status {
      grid-column: 2;
      text-align: left;
    }

    .schedule-reason,
    .schedule-weather {
      margin-left: 50px;
    }

    .temperature-condition {
      margin-left: 0;
      grid-template-columns: 1fr;
    }

    .editor-zone > select,
    .editor-zone > .editor-duration,
    .editor-zone > .calculated-duration {
      grid-column: 1 / -1;
    }

    .editor-zone > .icon-button {
      grid-column: 2;
      grid-row: 1;
    }

    .zone-profile-row {
      grid-template-columns: 1fr;
    }

    .zone-profile-row > strong,
    .effective-rate {
      grid-column: 1;
    }

    .editor {
      padding: 18px 14px;
    }

    .editor-zone {
      grid-template-columns: minmax(110px, 1fr) 70px 32px;
    }

    .editor-actions {
      align-items: stretch;
      flex-direction: column-reverse;
    }

    .editor-actions > div {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .page-head {
      align-items: flex-start;
      flex-direction: column;
      padding-bottom: 12px;
    }
  }
`, Ye = ["H", "K", "Sze", "Cs", "P", "Szo", "V"], Je = ["Hé", "Ke", "Sze", "Csü", "Pén", "Szo", "Vas"], Z = [
  { value: "rotator", label: "Rotátor (MP)", rate: 10 },
  { value: "mp800", label: "Rotátor MP800", rate: 20 },
  { value: "spray", label: "Spray / esőztető", rate: 40 },
  { value: "rotor", label: "Rotoros", rate: 12 },
  { value: "drip", label: "Csepegtető", rate: 12 }
], ce = () => ({
  program_id: Ve(),
  name: "Új program",
  enabled: !0,
  weekdays: [0, 2, 4],
  start_time: "05:30",
  weather_adjustment: !0,
  temperature_condition_enabled: !1,
  temperature_condition_operator: "above",
  temperature_condition_value: 30,
  soil_moisture_enabled: !1,
  zones: [],
  skip_next: !1
}), D = (r) => JSON.parse(JSON.stringify(r)), R = () => {
  const r = /* @__PURE__ */ new Date();
  return {
    ...ce(),
    name: "Kézi öntözés",
    weekdays: [r.getDay() === 0 ? 6 : r.getDay() - 1],
    start_time: `${String(r.getHours()).padStart(2, "0")}:${String(
      r.getMinutes()
    ).padStart(2, "0")}`,
    enabled: !1,
    weather_adjustment: !1
  };
};
class Ge extends z {
  constructor() {
    super(...arguments), this.narrow = !1, this._summary = null, this._tab = "overview", this._loading = !0, this._error = "", this._draft = null, this._saving = !1, this._zoneDurations = {}, this._expandedControllers = [], this._schedulePreview = null, this._scheduleLoading = !1, this._bulkMoistureSensor = "", this._settingsSaving = !1, this._settingsSaved = !1, this._runExpanded = !1, this._now = Date.now(), this._manualDraft = R(), this._manualRunning = !1, this._loadSchedule = async () => {
      if (!(!this.hass || this._scheduleLoading)) {
        this._scheduleLoading = !0;
        try {
          this._schedulePreview = await He(this.hass), this._error = "";
        } catch (e) {
          this._error = this._errorMessage(e);
        } finally {
          this._scheduleLoading = !1;
        }
      }
    }, this._newProgram = () => {
      this._draft = ce(), this._tab = "programs", this._error = "";
    }, this._resetManualProgram = () => {
      this._manualDraft = R(), this._error = "";
    }, this._importManualProgram = (e) => {
      const t = e.target, s = this._summary?.programs.find(
        (i) => i.program_id === t.value
      );
      if (!s) return;
      const a = R();
      this._manualDraft = {
        ...a,
        name: `Kézi – ${s.name}`,
        weather_adjustment: s.weather_adjustment,
        soil_moisture_enabled: s.soil_moisture_enabled,
        zones: s.zones.map((i) => ({ ...i }))
      }, t.value = "";
    }, this._addManualZone = (e) => {
      const t = e.target;
      t.value && (this._patchManual({
        zones: [
          ...this._manualDraft.zones,
          {
            entity_id: t.value,
            duration_minutes: 15,
            duration_mode: "manual"
          }
        ]
      }), t.value = "");
    }, this._runManualDraft = async () => {
      if (!(!this.hass || !this._manualDraft.zones.length || this._manualRunning)) {
        this._manualRunning = !0;
        try {
          await Be(
            this.hass,
            this._manualDraft,
            this._manualDraft.weather_adjustment
          ), this._error = "", await this._load(!1);
        } catch (e) {
          this._error = this._errorMessage(e);
        } finally {
          this._manualRunning = !1;
        }
      }
    }, this._addDraftZone = (e) => {
      if (!this._draft) return;
      const t = e.target;
      t.value && (this._patchDraft({
        zones: [
          ...this._draft.zones,
          {
            entity_id: t.value,
            duration_minutes: 15,
            duration_mode: "reference"
          }
        ]
      }), t.value = "");
    }, this._saveDraft = async (e) => {
      if (e.preventDefault(), !(!this.hass || !this._draft)) {
        if (!this._draft.weekdays.length) {
          this._error = "Legalább egy napot válassz ki.";
          return;
        }
        if (!this._draft.zones.length) {
          this._error = "Adj legalább egy zónát a programhoz.";
          return;
        }
        this._saving = !0, this._error = "";
        try {
          const t = await O(this.hass, this._draft);
          await this._load(!1), this._draft = D(t);
        } catch (t) {
          this._error = this._errorMessage(t);
        } finally {
          this._saving = !1;
        }
      }
    }, this._deleteDraft = async () => {
      if (!this.hass || !this._draft) return;
      if (!this._summary?.programs.some(
        (t) => t.program_id === this._draft.program_id
      )) {
        this._draft = null;
        return;
      }
      try {
        await Ze(this.hass, this._draft.program_id), this._draft = null, await this._load(!1), this._selectFirstProgram();
      } catch (t) {
        this._error = this._errorMessage(t);
      }
    }, this._runDraft = async (e) => {
      if (this.hass) {
        this._saving = !0, this._error = "";
        try {
          const t = await Ie(this.hass, e);
          this._draft = D(t), await this._load(!1);
        } catch (t) {
          this._error = this._errorMessage(t);
        } finally {
          this._saving = !1;
        }
      }
    }, this._quickToggleProgram = async (e) => {
      if (this.hass)
        try {
          await O(this.hass, { ...e, enabled: !e.enabled }), await this._load(!1);
        } catch (t) {
          this._error = this._errorMessage(t);
        }
    }, this._startZone = async (e) => {
      if (this.hass)
        try {
          await Ke(
            this.hass,
            e.entity_id,
            this._zoneDurations[e.entity_id] ?? 15
          ), await this._load(!1);
        } catch (t) {
          this._error = this._errorMessage(t);
        }
    }, this._stopAll = async () => {
      if (this.hass)
        try {
          await Fe(this.hass), await this._load(!1);
        } catch (e) {
          this._error = this._errorMessage(e);
        }
    }, this._skipCurrentZone = async (e) => {
      if (e.stopPropagation(), !!this.hass)
        try {
          await qe(this.hass), await this._load(!1);
        } catch (t) {
          this._error = this._errorMessage(t);
        }
    }, this._toggleAutomation = async () => {
      if (!(!this.hass || !this._summary))
        try {
          await Oe(this.hass, !this._summary.automation_enabled), await this._load(!1);
        } catch (e) {
          this._error = this._errorMessage(e);
        }
    }, this._saveSettings = async () => {
      if (!(!this.hass || !this._summary || this._settingsSaving)) {
        this._settingsSaving = !0, this._settingsSaved = !1;
        try {
          await Re(this.hass, this._summary.settings), await Ue(
            this.hass,
            this._allZones().map((e) => e.profile)
          ), await this._load(!1), this._settingsSaved = !0, this._error = "";
        } catch (e) {
          this._error = this._errorMessage(e);
        } finally {
          this._settingsSaving = !1;
        }
      }
    }, this._pauseDay = async () => {
      if (!this.hass) return;
      const e = new Date(Date.now() + 1440 * 60 * 1e3).toISOString();
      await ae(this.hass, e), await this._load(!1);
    }, this._resume = async () => {
      this.hass && (await ae(this.hass, null), await this._load(!1));
    };
  }
  static {
    this.properties = {
      hass: { attribute: !1 },
      narrow: { type: Boolean },
      panel: { attribute: !1 },
      _summary: { state: !0 },
      _tab: { state: !0 },
      _loading: { state: !0 },
      _error: { state: !0 },
      _draft: { state: !0 },
      _saving: { state: !0 },
      _zoneDurations: { state: !0 },
      _expandedControllers: { state: !0 },
      _schedulePreview: { state: !0 },
      _scheduleLoading: { state: !0 },
      _bulkMoistureSensor: { state: !0 },
      _settingsSaving: { state: !0 },
      _settingsSaved: { state: !0 },
      _runExpanded: { state: !0 },
      _now: { state: !0 },
      _manualDraft: { state: !0 },
      _manualRunning: { state: !0 }
    };
  }
  static {
    this.styles = We;
  }
  connectedCallback() {
    super.connectedCallback(), this._load(!0), this._timer = window.setInterval(() => {
      this._tab !== "settings" && this._tab !== "schedule" && this._load(!1);
    }, 5e3), this._clockTimer = window.setInterval(() => {
      this._now = Date.now();
    }, 1e3);
  }
  disconnectedCallback() {
    this._timer && window.clearInterval(this._timer), this._clockTimer && window.clearInterval(this._clockTimer), super.disconnectedCallback();
  }
  render() {
    return o`
      <div class="shell" ?dark=${this.hass?.themes?.darkMode}>
        <header class="topbar">
          <ha-icon icon="mdi:water"></ha-icon>
          <h1>Öntözés</h1>
        </header>
        <nav class="tabs" aria-label="Öntözés nézetek">
          ${this._tabButton("overview", "Áttekintés")}
          ${this._tabButton("schedule", "Következő 3 nap")}
          ${this._tabButton("programs", "Programok")}
          ${this._tabButton("manual", "Kézi program")}
          ${this._tabButton("history", "Előzmények")}
          ${this._tabButton("settings", "Beállítások")}
        </nav>
        <main class="content">
          ${this._loading && !this._summary ? o`<div class="loading">Az öntözésvezérlő betöltése…</div>` : this._error && !this._summary ? o`<div class="error">${this._error}</div>` : this._renderTab()}
        </main>
        ${this._summary?.active_run ? this._renderActiveRun() : d}
      </div>
    `;
  }
  _tabButton(e, t) {
    return o`
      <button
        class="tab"
        ?selected=${this._tab === e}
        aria-current=${this._tab === e ? "page" : d}
        @click=${() => {
      this._tab = e, e === "programs" && !this._draft && this._selectFirstProgram(), e === "schedule" && this._loadSchedule();
    }}
      >
        ${t}
      </button>
    `;
  }
  _renderTab() {
    if (!this._summary) return o``;
    switch (this._tab) {
      case "programs":
        return this._renderPrograms();
      case "schedule":
        return this._renderSchedule();
      case "manual":
        return this._renderManualProgram();
      case "history":
        return this._renderHistory();
      case "settings":
        return this._renderSettings();
      default:
        return this._renderOverview();
    }
  }
  _renderOverview() {
    const e = this._summary, t = e.weather, s = e.automation_enabled;
    return o`
      <section class="automation">
        <div class="automation-icon" ?off=${!s}>
          <ha-icon icon=${s ? "mdi:check" : "mdi:pause"}></ha-icon>
        </div>
        <div class="automation-copy">
          <div class="automation-title" ?off=${!s}>
            ${s ? "Automatika aktív" : "Automatika kikapcsolva"}
          </div>
          <div class="subtle">
            ${s ? "Az öntözés az időjárás figyelembevételével történik." : "Az ütemezett programok nem indulnak el."}
          </div>
        </div>
        <button
          class="toggle"
          ?on=${s}
          aria-label=${s ? "Automatika kikapcsolása" : "Automatika bekapcsolása"}
          @click=${this._toggleAutomation}
        ></button>
      </section>

      ${this._renderWeather(t)}

      <div class="next-run">
        <ha-icon icon="mdi:clock-outline"></ha-icon>
        ${e.next_run ? o`
              <span>Következő:</span>
              <span class="linklike">${this._nextProgramName()}</span>
              <span>· ${this._formatRelative(e.next_run)}</span>
            ` : o`<span>Nincs következő engedélyezett program</span>`}
      </div>

      <div class="overview-grid">
        <div class="controllers">
          ${e.controllers.length ? e.controllers.map((a) => this._renderController(a)) : o`<div class="empty">Nincs konfigurált Yardian zóna.</div>`}
        </div>
        <aside class="rail">
          <div class="rail-title">
            <span>Programok</span>
            <button class="text-action" type="button" @click=${this._newProgram}>
              + Hozzáadás
            </button>
          </div>
          ${e.programs.length ? e.programs.slice(0, 3).map((a) => this._renderRailProgram(a)) : o`<div class="empty">Még nincs program.</div>`}
          ${this._renderCompactHistory(e.history[0])}
        </aside>
      </div>

      ${e.active_run ? d : o`
            <button class="button danger stop-all" @click=${this._stopAll}>
              <ha-icon icon="mdi:stop"></ha-icon>
              Minden leállítása
            </button>
          `}
    `;
  }
  _renderActiveRun() {
    const e = this._summary.active_run, t = Math.max(0, e.current_index ?? 0), s = e.zones[t - 1], a = e.zones[t], i = e.zones[t + 1], n = this._remainingSeconds(e.zone_ends_at), c = e.zones.slice(t + 1).reduce((p, m) => p + m.planned_minutes * 60, 0), l = n + c, u = Math.max(1, e.total_minutes * 60), h = Math.max(
      0,
      Math.min(100, (u - l) / u * 100)
    );
    return o`
      <aside class="active-run" ?expanded=${this._runExpanded}>
        ${this._runExpanded ? o`
              <div class="active-run-detail">
                <div class="active-run-detail-head">
                  <div>
                    <span>Aktuális program</span>
                    <strong>${e.program_name}</strong>
                  </div>
                  <button
                    class="icon-button"
                    aria-label="Futás részleteinek bezárása"
                    @click=${() => this._runExpanded = !1}
                  >
                    <ha-icon icon="mdi:chevron-down"></ha-icon>
                  </button>
                </div>
                <div class="run-countdowns">
                  <div><span>Aktuális kör</span><strong>${this._clock(n)}</strong></div>
                  <div><span>Program vége</span><strong>${this._clock(l)}</strong></div>
                </div>
                <div class="run-sequence">
                  ${this._runStep("Előző", s)}
                  ${this._runStep("Aktuális", a, !0)}
                  ${this._runStep("Következő", i)}
                </div>
              </div>
            ` : d}
        <button
          class="active-run-summary"
          aria-expanded=${this._runExpanded}
          @click=${() => this._runExpanded = !this._runExpanded}
        >
          <span class="run-pulse"></span>
          <span>
            <strong>${e.program_name}</strong>
            <small>${a?.name ?? "Indítás…"} · ${this._clock(n)}</small>
          </span>
          <span class="run-progress-label">${Math.round(h)}%</span>
          <ha-icon icon=${this._runExpanded ? "mdi:chevron-down" : "mdi:chevron-up"}></ha-icon>
        </button>
        <div class="active-run-progress"><span style=${`width:${h}%`}></span></div>
        <div class="active-run-actions">
          <button class="button quiet" @click=${this._skipCurrentZone}>
            Aktuális kör kihagyása
          </button>
          <button class="button danger" @click=${this._stopAll}>
            <ha-icon icon="mdi:stop"></ha-icon>
            Leállítás
          </button>
        </div>
      </aside>
    `;
  }
  _runStep(e, t, s = !1) {
    return o`
      <div class="run-step" ?active=${s} ?empty=${!t}>
        <span>${e}</span>
        <strong>${t?.name ?? "—"}</strong>
        <small>${t ? `${t.planned_minutes} perc` : ""}</small>
      </div>
    `;
  }
  _remainingSeconds(e) {
    return e ? Math.max(0, Math.ceil((new Date(e).getTime() - this._now) / 1e3)) : 0;
  }
  _clock(e) {
    const t = Math.floor(e / 60);
    return `${String(t).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`;
  }
  _renderWeather(e) {
    if (!e)
      return o`
        <section class="weather-band">
          <div class="weather-summary">
            <ha-icon icon="mdi:weather-partly-cloudy"></ha-icon>
            <div>
              <div class="decision">Előrejelzés betöltése</div>
              <div class="weather-reason">Az Időkép adatainak ellenőrzése folyamatban.</div>
            </div>
          </div>
        </section>
      `;
    const t = e.percent ?? 0, s = t === 0 ? "kihagyás" : t < 80 ? "csökkentett öntözés" : t > 120 ? "emelt öntözés" : "mérsékelt öntözés";
    return o`
      <section class="weather-band">
        <div class="weather-summary">
          <ha-icon icon=${t === 0 ? "mdi:weather-rainy" : "mdi:weather-partly-cloudy"}></ha-icon>
          <div>
            <div class="decision">Ma ${t}% · ${s}</div>
            <div class="weather-reason">${e.reason}</div>
          </div>
        </div>
        ${this._metric("mdi:weather-rainy", "Várható eső", `${e.precipitation_mm ?? 0} mm`)}
        ${this._metric("mdi:water-percent", "Esély", `${e.max_probability ?? 0}%`)}
        ${this._metric("mdi:white-balance-sunny", "Napos órák", `${e.sunny_hours ?? 0}`, "sun")}
        ${this._metric("mdi:thermometer", "Maximum", `${e.max_temperature ?? 0} °C`, "temp")}
      </section>
    `;
  }
  _metric(e, t, s, a = "") {
    return o`
      <div class="metric ${a}">
        <ha-icon icon=${e}></ha-icon>
        <span class="metric-label">${t}</span>
        <span class="metric-value">${s}</span>
      </div>
    `;
  }
  _renderController(e) {
    const s = !window.matchMedia("(max-width: 600px)").matches || this._expandedControllers.includes(e.id), a = this._controllerStatus(e);
    return o`
      <section class="controller" ?collapsed=${!s}>
        <button
          class="controller-head"
          aria-expanded=${s}
          @click=${() => this._toggleController(e.id)}
        >
          <div class="controller-mark"><ha-icon icon="mdi:sprinkler-variant"></ha-icon></div>
          <div>
            <div class="controller-name">${e.name}</div>
            <div class="controller-meta">
              ${e.model} ·
              <span class=${a.className}>
                ${a.label}
              </span>
            </div>
          </div>
          <ha-icon
            class="controller-chevron"
            icon=${s ? "mdi:chevron-up" : "mdi:chevron-down"}
          ></ha-icon>
        </button>
        ${e.zones.map((i) => this._renderZone(i))}
      </section>
    `;
  }
  _renderZone(e) {
    const t = this._zoneDurations[e.entity_id] ?? 15, s = e.state === "on", a = this._summary?.active_run?.current_zone === e.entity_id, i = Number(this._summary?.active_run?.current_duration ?? t), n = this._headLabel(e.profile.head_type), c = this._zoneIssueLabel(e);
    return o`
      <div class="zone-row">
        <ha-icon icon="mdi:water"></ha-icon>
        <span class="zone-name">${e.name}</span>
        <span
          class="zone-state"
          ?running=${s}
          ?unavailable=${!e.available}
          title=${e.availability_issue ?? e.entity_id}
        >
          ${s ? a ? `Fut · ${i} perc` : "Fut" : e.available ? `Tétlen · ${n}` : o`Nem elérhető <small>${c}</small>`}
        </span>
        <label class="duration">
          <input
            type="number"
            min="1"
            max="180"
            .value=${String(t)}
            aria-label="${e.name} időtartama percben"
            @change=${(l) => {
      const u = l.target;
      this._zoneDurations = {
        ...this._zoneDurations,
        [e.entity_id]: this._clampDuration(u.valueAsNumber)
      };
    }}
          />
          <span>perc</span>
        </label>
        <button
          class="button"
          ?disabled=${!e.available || s}
          @click=${() => this._startZone(e)}
        >
          <ha-icon icon="mdi:play"></ha-icon>
          Indítás
        </button>
      </div>
    `;
  }
  _controllerStatus(e) {
    const t = e.zone_count ?? e.zones.length, s = e.available_zone_count ?? e.zones.filter((a) => a.available).length;
    return t === 0 ? { label: "Nincs zóna", className: "offline" } : s === t ? { label: "Online", className: "online" } : s === 0 ? { label: "Nincs elérhető zóna", className: "offline" } : { label: `${s}/${t} zóna elérhető`, className: "partial" };
  }
  _zoneIssueLabel(e) {
    return e.state === "missing" ? "HA state hiányzik" : e.state === "unavailable" ? "HA: unavailable" : e.availability_issue ?? `HA: ${e.state}`;
  }
  _renderRailProgram(e) {
    const t = this._programMinutes(e);
    return o`
      <div class="program-rail-item">
        <div class="program-line">
          <ha-icon icon=${e.start_time < "12:00" ? "mdi:weather-sunset-up" : "mdi:weather-night"}></ha-icon>
          <strong>${e.name}</strong>
          <button
            class="toggle"
            ?on=${e.enabled}
            aria-label="${e.name} engedélyezése"
            @click=${() => this._quickToggleProgram(e)}
          ></button>
        </div>
        <div class="program-details">
          <div>Napok: ${this._formatDays(e.weekdays)}</div>
          <div>Kezdés: ${e.start_time}</div>
          ${e.temperature_condition_enabled ? o`<div>${this._temperatureConditionText(e)}</div>` : d}
          <div>Számított öntözési idő: ${t} perc</div>
        </div>
      </div>
    `;
  }
  _renderCompactHistory(e) {
    return o`
      <div class="history-compact">
        <div class="history-compact-title">Legutóbbi események</div>
        ${e ? o`
              <div>${this._formatDateTime(e.scheduled_at)} · ${e.program_name}</div>
              <div class="history-reason">${e.reason}</div>
            ` : o`<div class="subtle">Még nincs futási előzmény.</div>`}
      </div>
    `;
  }
  _renderSchedule() {
    const e = this._schedulePreview;
    return o`
      <div class="page-head">
        <div>
          <h2>Következő 3 nap</h2>
          <div class="subtle">
            Egy napon belül minden program ugyanazt a napi előrejelzést
            használja. A számítás kizárólag az adott naptári naphoz tartozó
            Időkép-órákat veszi figyelembe.
          </div>
        </div>
        <button
          class="button quiet"
          @click=${this._loadSchedule}
          ?disabled=${this._scheduleLoading}
        >
          ${this._scheduleLoading ? "Frissítés…" : "Újraszámítás"}
        </button>
      </div>
      ${this._scheduleLoading && !e ? o`<div class="loading">Háromnapos programterv számítása…</div>` : e ? o`
              <div class="schedule-days">
                ${e.days.map((t, s) => o`
                  <section class="schedule-day">
                    <div class="schedule-day-head">
                      <strong>${this._formatScheduleDate(t.date, s)}</strong>
                      <span>${t.programs.length} program</span>
                    </div>
                    ${t.programs.length ? t.programs.map(
      (a) => this._renderScheduleProgram(a)
    ) : o`
                          <div class="schedule-empty">
                            Nincs hátralévő engedélyezett program.
                          </div>
                        `}
                  </section>
                `)}
              </div>
              <div class="schedule-generated">
                Utolsó számítás: ${this._formatDateTime(e.generated_at)}
              </div>
            ` : o`<div class="empty">A háromnapos előnézet nem érhető el.</div>`}
      ${this._error ? o`<div class="error">${this._error}</div>` : d}
    `;
  }
  _renderScheduleProgram(e) {
    const t = e.status === "will_run";
    return o`
      <article class="schedule-program" ?runnable=${t}>
        <div class="schedule-program-head">
          <time>${this._formatTime(e.scheduled_at)}</time>
          <strong>${e.program_name}</strong>
          <span class="schedule-status ${e.status}">
            ${this._scheduleStatusLabel(e.status)}
          </span>
        </div>
        <div class="schedule-reason">${e.reason}</div>
        ${e.weather ? o`
              <div class="schedule-weather">
                <span>${e.weather.max_temperature ?? "–"} °C max.</span>
                <span>${e.weather.precipitation_mm ?? 0} mm eső</span>
                <span>Forrás: ${e.weather.source}</span>
              </div>
            ` : d}
        <div class="schedule-zones">
          ${e.zones.map(
      (s) => o`
              <div>
                <span>${s.name}</span>
                <strong>
                  ${s.planned_minutes === null ? "nincs adat" : `${s.planned_minutes} perc`}
                </strong>
              </div>
            `
    )}
        </div>
        <div class="schedule-total">
          <span>Összesen</span>
          <strong>
            ${e.total_minutes === null ? "nem számítható" : `${e.total_minutes} perc`}
          </strong>
        </div>
      </article>
    `;
  }
  _renderManualProgram() {
    const e = this._manualDraft, t = this._allZones();
    return o`
      <div class="page-head">
        <div>
          <h2>Kézi program</h2>
          <div class="subtle">
            Egyszer fut le, nem módosítja a napi ütemezéseket.
          </div>
        </div>
        <button class="button quiet" @click=${this._resetManualProgram}>
          Alaphelyzet
        </button>
      </div>
      <section class="manual-program">
        <div class="manual-program-toolbar">
          <label class="field">
            <span class="field-label">Napi program betöltése</span>
            <select @change=${this._importManualProgram}>
              <option value="">Válassz programot…</option>
              ${this._summary.programs.map(
      (s) => o`<option value=${s.program_id}>${s.name}</option>`
    )}
            </select>
          </label>
          <label class="field">
            <span class="field-label">Kézi program neve</span>
            <input
              type="text"
              maxlength="64"
              .value=${e.name}
              @input=${(s) => this._patchManual({
      name: s.target.value
    })}
            />
          </label>
          <label class="manual-weather">
            <input
              type="checkbox"
              .checked=${e.weather_adjustment}
              @change=${(s) => this._patchManual({
      weather_adjustment: s.target.checked
    })}
            />
            Időjárás-korrekció
          </label>
        </div>
        <div class="manual-zone-list">
          ${e.zones.map((s, a) => {
      const i = t.find(
        (n) => n.entity_id === s.entity_id
      );
      return o`
              <div class="manual-zone">
                <span class="manual-zone-order">${a + 1}</span>
                <strong>${i?.name ?? s.entity_id}</strong>
                <select
                  aria-label="${i?.name ?? s.entity_id} számítási módja"
                  .value=${s.duration_mode}
                  @change=${(n) => this._updateManualZone(a, {
        ...s,
        duration_mode: n.target.value
      })}
                >
                  <option value="manual">Manuális perc</option>
                  <option value="reference">Referencia alapján</option>
                </select>
                <label class="manual-duration">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    ?disabled=${s.duration_mode === "reference"}
                    .value=${String(s.duration_minutes)}
                    @change=${(n) => this._updateManualZone(a, {
        ...s,
        duration_minutes: this._clampDuration(
          n.target.valueAsNumber
        )
      })}
                  />
                  <span>perc</span>
                </label>
                <span class="manual-calculated">
                  ${this._programZoneMinutes(e, s)} perc
                </span>
                <div class="manual-zone-actions">
                  <button
                    class="icon-button"
                    aria-label="Kör feljebb"
                    ?disabled=${a === 0}
                    @click=${() => this._moveManualZone(a, -1)}
                  >
                    <ha-icon icon="mdi:chevron-up"></ha-icon>
                  </button>
                  <button
                    class="icon-button"
                    aria-label="Kör lejjebb"
                    ?disabled=${a === e.zones.length - 1}
                    @click=${() => this._moveManualZone(a, 1)}
                  >
                    <ha-icon icon="mdi:chevron-down"></ha-icon>
                  </button>
                  <button
                    class="icon-button"
                    aria-label="Kör eltávolítása"
                    @click=${() => this._removeManualZone(a)}
                  >
                    <ha-icon icon="mdi:close"></ha-icon>
                  </button>
                </div>
              </div>
            `;
    })}
          ${e.zones.length ? d : o`<div class="empty">Adj hozzá legalább egy öntözési kört.</div>`}
        </div>
        <div class="manual-add">
          <label class="field">
            <span class="field-label">Kör hozzáadása</span>
            <select @change=${this._addManualZone}>
              <option value="">Válassz zónát…</option>
              ${t.filter(
      (s) => !e.zones.some(
        (a) => a.entity_id === s.entity_id
      )
    ).map(
      (s) => o`<option value=${s.entity_id}>${s.name}</option>`
    )}
            </select>
          </label>
          <div class="manual-total">
            <span>Várható teljes idő</span>
            <strong>${this._programMinutes(e)} perc</strong>
          </div>
          <button
            class="button primary manual-start"
            ?disabled=${this._manualRunning || !e.zones.length || !!this._summary.active_run}
            @click=${this._runManualDraft}
          >
            <ha-icon icon="mdi:play"></ha-icon>
            ${this._summary.active_run ? "Már fut egy program" : this._manualRunning ? "Indítás…" : "Kézi program indítása"}
          </button>
        </div>
        ${this._error ? o`<div class="error">${this._error}</div>` : d}
      </section>
    `;
  }
  _renderPrograms() {
    const e = this._summary.programs, t = this._draft;
    return o`
      <div class="page-head">
        <h2>Programok</h2>
        <button class="button primary" type="button" @click=${this._newProgram}>
          <ha-icon icon="mdi:plus"></ha-icon>
          Új program
        </button>
      </div>
      <div class="program-workspace">
        <div class="program-list">
          ${e.length ? e.map(
      (s) => o`
                  <button
                    class="program-list-item"
                    ?selected=${t?.program_id === s.program_id}
                    @click=${() => {
        this._draft = D(s);
      }}
                  >
                    <strong>${s.name}</strong>
                    <span>${s.enabled ? "Aktív" : "Kikapcsolva"}</span>
                    <span>${this._formatDays(s.weekdays)} · ${s.start_time}</span>
                    <span>${this._programMinutes(s)} perc</span>
                  </button>
                `
    ) : o`<div class="empty">Hozd létre az első öntözési programot.</div>`}
        </div>
        ${t ? this._renderProgramEditor(t) : o`<div class="empty">Válassz egy programot.</div>`}
      </div>
    `;
  }
  _renderProgramEditor(e) {
    const t = this._allZones();
    return o`
      <form class="editor" @submit=${this._saveDraft}>
        <div class="field">
          <label for="program-name">Program neve</label>
          <input
            id="program-name"
            type="text"
            maxlength="64"
            required
            .value=${e.name}
            @input=${(s) => this._patchDraft({ name: s.target.value })}
          />
        </div>
        <div class="field">
          <span class="field-label">Napok</span>
          <div class="days">
            ${Ye.map(
      (s, a) => o`
                <button
                  class="day"
                  type="button"
                  ?selected=${e.weekdays.includes(a)}
                  aria-pressed=${e.weekdays.includes(a)}
                  @click=${() => this._toggleDay(a)}
                >
                  ${s}
                </button>
              `
    )}
          </div>
        </div>
        <div class="field">
          <label for="program-start">Kezdés</label>
          <input
            id="program-start"
            type="time"
            required
            .value=${e.start_time}
            @input=${(s) => this._patchDraft({ start_time: s.target.value })}
          />
        </div>
        <div class="checkline">
          <input
            id="program-enabled"
            type="checkbox"
            .checked=${e.enabled}
            @change=${(s) => this._patchDraft({ enabled: s.target.checked })}
          />
          <label for="program-enabled">Program engedélyezve</label>
        </div>
        <div class="checkline">
          <input
            id="program-weather"
            type="checkbox"
            .checked=${e.weather_adjustment}
            @change=${(s) => this._patchDraft({
      weather_adjustment: s.target.checked
    })}
          />
          <label for="program-weather">Időjárás-korrekció használata</label>
        </div>
        <div class="checkline">
          <input
            id="program-temperature-condition"
            type="checkbox"
            .checked=${e.temperature_condition_enabled}
            @change=${(s) => this._patchDraft({
      temperature_condition_enabled: s.target.checked
    })}
          />
          <label for="program-temperature-condition">
            Hőmérséklet-feltétel használata
          </label>
        </div>
        ${e.temperature_condition_enabled ? o`
              <div class="temperature-condition">
                <span>A program napjának maximuma</span>
                <select
                  aria-label="Hőmérséklet összehasonlítása"
                  .value=${e.temperature_condition_operator}
                  @change=${(s) => this._patchDraft({
      temperature_condition_operator: s.target.value
    })}
                >
                  <option value="above">magasabb mint</option>
                  <option value="below">alacsonyabb mint</option>
                </select>
                <label>
                  <input
                    type="number"
                    min="-30"
                    max="60"
                    step="0.5"
                    aria-label="Hőmérsékleti küszöb"
                    .value=${String(e.temperature_condition_value)}
                    @change=${(s) => this._patchDraft({
      temperature_condition_value: Math.max(
        -30,
        Math.min(
          60,
          s.target.valueAsNumber
        )
      )
    })}
                  />
                  <span>°C</span>
                </label>
              </div>
            ` : d}
        <div class="checkline">
          <input
            id="program-soil-moisture"
            type="checkbox"
            .checked=${e.soil_moisture_enabled}
            @change=${(s) => this._patchDraft({
      soil_moisture_enabled: s.target.checked
    })}
          />
          <label for="program-soil-moisture">
            A zónák talajnedvességmérőinek használata
          </label>
        </div>
        ${e.soil_moisture_enabled ? o`
              <div class="subtle">
                ${e.zones.filter(
      (s) => this._zoneProfile(s.entity_id)?.moisture_sensor_entity_id
    ).length}
                programzónához van érzékelő rendelve. A kihagyási küszöböt a
                következő fejlesztési lépésben lehet majd megadni.
              </div>
            ` : d}
        <div class="field">
          <span class="field-label">Zónák sorrendben</span>
          <div class="editor-zones">
            ${e.zones.map((s, a) => {
      const i = t.find((n) => n.entity_id === s.entity_id);
      return o`
                <div class="editor-zone">
                  <span>${i?.name ?? s.entity_id}</span>
                  <select
                    aria-label="${i?.name ?? s.entity_id} időtartam módja"
                    .value=${s.duration_mode}
                    @change=${(n) => this._updateDraftZone(a, {
        ...s,
        duration_mode: n.target.value
      })}
                  >
                    <option value="manual">Manuális perc</option>
                    <option value="reference">Referencia alapján</option>
                  </select>
                  ${s.duration_mode === "reference" ? o`
                        <span class="calculated-duration">
                          ≈ ${this._programZoneMinutes(e, s)} perc
                        </span>
                      ` : o`
                        <label class="editor-duration">
                          <input
                            type="number"
                            min="1"
                            max="180"
                            aria-label="${i?.name ?? s.entity_id} időtartama"
                            .value=${String(s.duration_minutes)}
                            @change=${(n) => this._updateDraftZone(a, {
        ...s,
        duration_minutes: this._clampDuration(
          n.target.valueAsNumber
        )
      })}
                          />
                          <span>perc</span>
                        </label>
                      `}
                  <button
                    class="icon-button"
                    type="button"
                    aria-label="Zóna eltávolítása"
                    @click=${() => this._removeDraftZone(a)}
                  >
                    <ha-icon icon="mdi:close"></ha-icon>
                  </button>
                </div>
              `;
    })}
            ${e.zones.length === 0 ? o`<div class="empty">Adj legalább egy zónát a programhoz.</div>` : d}
          </div>
        </div>
        <div class="field">
          <label for="zone-add">Zóna hozzáadása</label>
          <select id="zone-add" @change=${this._addDraftZone}>
            <option value="">Válassz zónát…</option>
            ${t.filter((s) => !e.zones.some((a) => a.entity_id === s.entity_id)).map((s) => o`<option value=${s.entity_id}>${s.name}</option>`)}
          </select>
        </div>
        ${this._error ? o`<div class="error">${this._error}</div>` : d}
        <div class="editor-actions">
          <button class="button danger" type="button" @click=${this._deleteDraft}>
            Törlés
          </button>
          <div>
            <button
              class="button quiet"
              type="button"
              @click=${() => this._runDraft(e)}
              ?disabled=${this._saving}
            >
              Futtatás most
            </button>
            <button class="button primary" type="submit" ?disabled=${this._saving}>
              ${this._saving ? "Mentés…" : "Mentés"}
            </button>
          </div>
        </div>
      </form>
    `;
  }
  _renderHistory() {
    const e = this._summary.history;
    return o`
      <div class="page-head"><h2>Előzmények</h2></div>
      ${e.length ? o`
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Időpont</th>
                    <th>Program</th>
                    <th>Eredmény</th>
                    <th>Korrekció</th>
                    <th>Forrás</th>
                    <th>Indoklás</th>
                  </tr>
                </thead>
                <tbody>
                  ${e.map(
      (t) => o`
                      <tr>
                        <td>${this._formatDateTime(t.scheduled_at)}</td>
                        <td>${t.program_name}</td>
                        <td>
                          <span class="outcome ${t.outcome}">
                            ${this._outcomeLabel(t.outcome)}
                          </span>
                        </td>
                        <td>${Math.round(t.factor * 100)}%</td>
                        <td>${t.weather_source}</td>
                        <td class="reason-cell">
                          <div>${t.reason}</div>
                          ${t.weather ? o`
                                <div class="history-weather">
                                  Döntéskor:
                                  ${t.weather.precipitation_mm ?? 0} mm ·
                                  ${t.weather.max_probability ?? 0}% ·
                                  ${t.weather.rainy_hours ?? 0} esős óra ·
                                  ${t.weather.max_temperature ?? "–"} °C
                                  ${t.weather.evaluated_at ? o` · ${this._formatDateTime(
        t.weather.evaluated_at
      )}` : d}
                                </div>
                              ` : d}
                        </td>
                      </tr>
                    `
    )}
                </tbody>
              </table>
            </div>
          ` : o`<div class="empty">Még nincs futási előzmény.</div>`}
    `;
  }
  _renderSettings() {
    const e = this._summary.settings;
    return o`
      <div class="page-head">
        <div>
          <h2>Beállítások</h2>
          <div class="subtle">Zöld gyep elsődleges időjárási profil</div>
        </div>
        <button
          class="button primary"
          @click=${this._saveSettings}
          ?disabled=${this._settingsSaving}
        >
          ${this._settingsSaving ? "Mentés…" : "Beállítások mentése"}
        </button>
      </div>
      <div class="settings-grid">
        <section class="settings-section">
          <h3>Eső miatti korrekció</h3>
          ${this._settingNumber("Kihagyás ennyi csapadéktól (mm)", "rain_skip_mm", e)}
          ${this._settingNumber(
      "Kihagyási valószínűség (%)",
      "rain_skip_probability",
      e
    )}
          ${this._settingNumber(
      "Valószínűséghez tartozó minimum eső (mm)",
      "rain_skip_probability_mm",
      e
    )}
          ${this._settingNumber("Esős órák száma kihagyáshoz", "rainy_hours_skip", e)}
          ${this._settingNumber(
      "Erős csökkentés küszöbe (mm)",
      "rain_reduce_high_mm",
      e
    )}
          ${this._settingNumber(
      "Enyhe csökkentés küszöbe (mm)",
      "rain_reduce_low_mm",
      e
    )}
        </section>
        <section class="settings-section">
          <h3>Biztonság és értesítés</h3>
          <div class="setting-row">
            <span>Automatika</span>
            <button
              class="toggle"
              ?on=${this._summary.automation_enabled}
              aria-label="Automatika kapcsolása"
              @click=${this._toggleAutomation}
            ></button>
          </div>
          <div class="setting-row">
            <span>Mobilértesítések</span>
            <button
              class="toggle"
              ?on=${e.notify_mobile}
              aria-label="Mobilértesítések kapcsolása"
              @click=${() => this._patchSettings({ notify_mobile: !e.notify_mobile })}
            ></button>
          </div>
          <div class="setting-row">
            <span>Automatika szüneteltetése 24 órára</span>
            <button class="button quiet" @click=${this._pauseDay}>Szünet</button>
          </div>
          <div class="setting-row">
            <span>Szünet megszüntetése</span>
            <button class="button quiet" @click=${this._resume}>Folytatás</button>
          </div>
          <div class="setting-row">
            <span>Legutóbbi aktuális számítás forrása</span>
            <strong>${this._summary.weather?.source ?? "Nincs értékelés"}</strong>
          </div>
        </section>
      </div>
      <section class="settings-section zone-profiles">
        <h3>Zónák vízigénye, szórófeje és érzékelője</h3>
        <p class="settings-help">
          Referencia módban a program a célzott vízmennyiséget osztja a kijuttatási
          intenzitással. Ha a teljes zónavízhozam és a terület is ki van töltve,
          azok felülírják a fejtípus referenciaértékét. Az árnyékos terület 20%-kal
          rövidebb referenciaidőt kap. Egy talajnedvességmérő több zónához is
          hozzárendelhető; az automatikus kihagyási küszöb egy következő lépésben
          kapcsolható rá biztonságosan.
        </p>
        <div class="moisture-bulk">
          <label>
            <span>Talajnedvességmérő minden zónához</span>
            <select
              .value=${this._bulkMoistureSensor}
              @change=${(t) => {
      this._bulkMoistureSensor = t.target.value;
    }}
            >
              <option value="">Válassz érzékelőt…</option>
              ${this._moistureSensors().map(
      (t) => o`<option value=${t.entity_id}>${t.name}</option>`
    )}
            </select>
          </label>
          <button
            class="button quiet"
            type="button"
            ?disabled=${!this._bulkMoistureSensor}
            @click=${() => this._assignMoistureSensorToAll(this._bulkMoistureSensor)}
          >
            Hozzárendelés mindhez
          </button>
        </div>
        <div class="zone-profile-head" aria-hidden="true">
          <span>Zóna</span>
          <span>Fejtípus</span>
          <span>Terület jellege</span>
          <span>Referencia</span>
          <span>Vízhozam</span>
          <span>Terület</span>
          <span>Talajnedvesség</span>
          <span>Aktív érték</span>
        </div>
        ${this._allZones().map((t) => this._renderZoneProfile(t))}
        <div class="zone-profile-actions">
          ${this._settingsSaved ? o`<span class="save-success">A zónabeállítások elmentve.</span>` : o`<span>A módosítások mentés után lépnek életbe.</span>`}
          <button
            class="button primary"
            type="button"
            @click=${this._saveSettings}
            ?disabled=${this._settingsSaving}
          >
            ${this._settingsSaving ? "Mentés…" : "Zónabeállítások mentése"}
          </button>
        </div>
      </section>
      ${this._error ? o`<div class="error">${this._error}</div>` : d}
    `;
  }
  _renderZoneProfile(e) {
    const t = e.profile, s = t.flow_l_min !== null && t.area_m2 !== null;
    return o`
      <div class="zone-profile-row">
        <strong>${e.name}</strong>
        <label>
          <span class="mobile-label">Fejtípus</span>
          <select
            .value=${t.head_type}
            @change=${(a) => {
      const i = a.target.value, n = Z.find((c) => c.value === i);
      this._patchZoneProfile(e.entity_id, {
        head_type: i,
        reference_rate_mm_h: n?.rate ?? t.reference_rate_mm_h
      });
    }}
          >
            ${Z.map(
      (a) => o`
                  <option
                    value=${a.value}
                    ?selected=${a.value === t.head_type}
                  >
                    ${a.label}
                  </option>
                `
    )}
          </select>
        </label>
        <label>
          <span class="mobile-label">Terület jellege</span>
          <select
            .value=${t.exposure}
            @change=${(a) => this._patchZoneProfile(e.entity_id, {
      exposure: a.target.value,
      exposure_factor: a.target.value === "shady" ? 0.8 : 1
    })}
          >
            <option value="sunny" ?selected=${t.exposure === "sunny"}>
              Napos
            </option>
            <option value="shady" ?selected=${t.exposure === "shady"}>
              Árnyékos
            </option>
          </select>
        </label>
        ${this._profileNumber(e, "reference_rate_mm_h", "mm/óra", 0.1)}
        ${this._profileNumber(e, "flow_l_min", "l/perc", 0.1, !0)}
        ${this._profileNumber(e, "area_m2", "m²", 0.1, !0)}
        <label class="moisture-select">
          <span class="mobile-label">Talajnedvességmérő</span>
          <select
            .value=${t.moisture_sensor_entity_id ?? ""}
            @change=${(a) => this._patchZoneProfile(e.entity_id, {
      moisture_sensor_entity_id: a.target.value || null
    })}
          >
            <option value="">Nincs hozzárendelve</option>
            ${this._moistureSensors().map(
      (a) => o`
                <option
                  value=${a.entity_id}
                  ?selected=${a.entity_id === t.moisture_sensor_entity_id}
                >
                  ${a.name}
                </option>
              `
    )}
          </select>
          ${t.moisture_sensor_entity_id ? o`
                <span class="sensor-reading">
                  ${t.moisture_sensor_state ?? "–"}${t.moisture_sensor_unit ?? ""}
                </span>
              ` : d}
        </label>
        <span class="effective-rate">
          <strong>${this._effectiveRate(t).toFixed(1)} mm/óra</strong>
          <span>
            ${s ? "mért adatokból" : "referencia"} ·
            ${t.exposure === "shady" ? "80% árnyék" : "100% napos"}
          </span>
        </span>
      </div>
    `;
  }
  _profileNumber(e, t, s, a, i = !1) {
    const n = e.profile[t];
    return o`
      <label class="profile-number">
        <span class="mobile-label">${s}</span>
        <input
          type="number"
          min="0.1"
          step=${a}
          placeholder=${i ? "opcionális" : ""}
          .value=${n === null ? "" : String(n)}
          @change=${(c) => {
      const l = c.target;
      this._patchZoneProfile(e.entity_id, {
        [t]: l.value === "" ? null : l.valueAsNumber
      });
    }}
        />
        <span>${s}</span>
      </label>
    `;
  }
  _settingNumber(e, t, s) {
    return o`
      <label class="setting-row">
        <span>${e}</span>
        <input
          type="number"
          step="0.1"
          .value=${String(s[t])}
          @change=${(a) => this._patchSettings({
      [t]: a.target.valueAsNumber
    })}
        />
      </label>
    `;
  }
  async _load(e) {
    if (!this.hass) {
      e && (this._loading = !0);
      return;
    }
    try {
      const t = await Ne(this.hass);
      this._summary = t, !this._expandedControllers.length && t.controllers[0] && (this._expandedControllers = [t.controllers[0].id]), this._error = "", (e || !t.weather) && (t.weather = await Te(this.hass), this._summary = { ...t }), this._tab === "programs" && !this._draft && this._selectFirstProgram();
    } catch (t) {
      this._error = this._errorMessage(t);
    } finally {
      this._loading = !1;
    }
  }
  _selectFirstProgram() {
    const e = this._summary?.programs[0];
    this._draft = e ? D(e) : null;
  }
  _nextProgramName() {
    if (!this._summary?.next_run) return "";
    const e = new Date(this._summary.next_run);
    return this._summary.programs.find((t) => {
      const [s, a] = t.start_time.split(":").map(Number);
      return s === e.getHours() && a === e.getMinutes();
    })?.name ?? "Program";
  }
  _programMinutes(e) {
    return e.zones.reduce(
      (t, s) => t + this._programZoneMinutes(e, s),
      0
    );
  }
  _programZoneMinutes(e, t) {
    const s = this._summary?.weather;
    if (t.duration_mode !== "reference") {
      const u = e.weather_adjustment ? s?.factor ?? 1 : 1;
      return Math.max(1, Math.round(t.duration_minutes * u));
    }
    const a = this._zoneProfile(t.entity_id);
    if (!a) return t.duration_minutes;
    const i = s?.max_temperature ?? 20, n = i >= 35 ? 9 : i >= 25 ? 5.5 : i >= 20 ? 4.5 : 2.5, c = e.weather_adjustment ? s?.rain_factor ?? s?.factor ?? 1 : 1, l = a.exposure === "shady" ? 0.8 : 1;
    return Math.max(
      1,
      Math.min(
        180,
        Math.round(
          n * c * l * 60 / this._effectiveRate(a)
        )
      )
    );
  }
  _allZones() {
    return this._summary?.controllers.flatMap((e) => e.zones) ?? [];
  }
  _toggleController(e) {
    this._expandedControllers = this._expandedControllers.includes(e) ? this._expandedControllers.filter((t) => t !== e) : [...this._expandedControllers, e];
  }
  _patchManual(e) {
    this._manualDraft = { ...this._manualDraft, ...e };
  }
  _updateManualZone(e, t) {
    const s = [...this._manualDraft.zones];
    s[e] = t, this._patchManual({ zones: s });
  }
  _removeManualZone(e) {
    this._patchManual({
      zones: this._manualDraft.zones.filter(
        (t, s) => s !== e
      )
    });
  }
  _moveManualZone(e, t) {
    const s = e + t;
    if (s < 0 || s >= this._manualDraft.zones.length) return;
    const a = [...this._manualDraft.zones];
    [a[e], a[s]] = [a[s], a[e]], this._patchManual({ zones: a });
  }
  _patchDraft(e) {
    this._draft && (this._draft = { ...this._draft, ...e });
  }
  _toggleDay(e) {
    if (!this._draft) return;
    const t = this._draft.weekdays.includes(e) ? this._draft.weekdays.filter((s) => s !== e) : [...this._draft.weekdays, e].sort();
    this._patchDraft({ weekdays: t });
  }
  _updateDraftZone(e, t) {
    if (!this._draft) return;
    const s = [...this._draft.zones];
    s[e] = t, this._patchDraft({ zones: s });
  }
  _removeDraftZone(e) {
    this._draft && this._patchDraft({
      zones: this._draft.zones.filter((t, s) => s !== e)
    });
  }
  _patchSettings(e) {
    this._summary && (this._settingsSaved = !1, this._summary = {
      ...this._summary,
      settings: { ...this._summary.settings, ...e }
    });
  }
  _patchZoneProfile(e, t) {
    this._summary && (this._settingsSaved = !1, this._summary = {
      ...this._summary,
      controllers: this._summary.controllers.map((s) => ({
        ...s,
        zones: s.zones.map(
          (a) => a.entity_id === e ? { ...a, profile: { ...a.profile, ...t } } : a
        )
      }))
    });
  }
  _assignMoistureSensorToAll(e) {
    if (e)
      for (const t of this._allZones())
        this._patchZoneProfile(t.entity_id, {
          moisture_sensor_entity_id: e
        });
  }
  _moistureSensors() {
    return Object.entries(this.hass?.states ?? {}).filter(([e, t]) => {
      if (!e.startsWith("sensor.")) return !1;
      const s = t.attributes, a = String(s.device_class ?? "").toLowerCase(), i = String(s.friendly_name ?? e).toLowerCase();
      return a === "moisture" || i.includes("talajnedv") || i.includes("soil moisture");
    }).map(([e, t]) => ({
      entity_id: e,
      name: String(t.attributes.friendly_name ?? e)
    })).sort((e, t) => e.name.localeCompare(t.name, "hu"));
  }
  _formatDays(e) {
    return e.map((t) => Je[t] ?? "").join(", ");
  }
  _temperatureConditionText(e) {
    return `${e.temperature_condition_operator === "above" ? "Max. hőmérséklet >" : "Max. hőmérséklet <"} ${e.temperature_condition_value} °C`;
  }
  _zoneProfile(e) {
    return this._allZones().find((t) => t.entity_id === e)?.profile;
  }
  _effectiveRate(e) {
    return e.flow_l_min !== null && e.area_m2 !== null && e.area_m2 > 0 ? e.flow_l_min * 60 / e.area_m2 : e.reference_rate_mm_h;
  }
  _headLabel(e) {
    return Z.find((t) => t.value === e)?.label ?? e;
  }
  _formatDateTime(e) {
    return new Intl.DateTimeFormat("hu-HU", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(e));
  }
  _formatTime(e) {
    return new Intl.DateTimeFormat("hu-HU", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(e));
  }
  _formatScheduleDate(e, t) {
    const s = new Intl.DateTimeFormat("hu-HU", {
      weekday: "long",
      month: "short",
      day: "numeric"
    }).format(/* @__PURE__ */ new Date(`${e}T12:00:00`));
    return `${t === 0 ? "Ma" : t === 1 ? "Holnap" : "Holnapután"} · ${s}`;
  }
  _scheduleStatusLabel(e) {
    return {
      will_run: "Lefut",
      automation_off: "Automatika kikapcsolva",
      paused: "Szünetel",
      skip_next: "Kihagyva",
      weather_unavailable: "Nincs forecast",
      condition_skip: "Feltétel nem teljesül",
      rain_skip: "Eső miatt kimarad"
    }[e];
  }
  _formatRelative(e) {
    const t = new Date(e), s = /* @__PURE__ */ new Date(), a = new Date(s);
    return a.setDate(s.getDate() + 1), `${t.toDateString() === s.toDateString() ? "ma" : t.toDateString() === a.toDateString() ? "holnap" : new Intl.DateTimeFormat("hu-HU", {
      month: "short",
      day: "numeric"
    }).format(t)} ${t.toLocaleTimeString("hu-HU", {
      hour: "2-digit",
      minute: "2-digit"
    })}`;
  }
  _outcomeLabel(e) {
    return {
      completed: "Befejezve",
      skipped: "Kihagyva",
      failed: "Hiba",
      stopped: "Leállítva",
      interrupted: "Megszakítva"
    }[e] ?? e;
  }
  _clampDuration(e) {
    return Math.max(1, Math.min(180, Number.isFinite(e) ? Math.round(e) : 15));
  }
  _errorMessage(e) {
    return e instanceof Error || typeof e == "object" && e !== null && "message" in e && typeof e.message == "string" ? e.message : "A művelet nem sikerült.";
  }
}
customElements.get("smart-yardian-panel") || customElements.define("smart-yardian-panel", Ge);
export {
  Ge as SmartYardianPanel
};
//# sourceMappingURL=smart-yardian-panel.js.map
