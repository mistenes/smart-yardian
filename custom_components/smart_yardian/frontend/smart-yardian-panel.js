const D = globalThis, R = D.ShadowRoot && (D.ShadyCSS === void 0 || D.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, L = /* @__PURE__ */ Symbol(), F = /* @__PURE__ */ new WeakMap();
let ie = class {
  constructor(e, t, s) {
    if (this._$cssResult$ = !0, s !== L) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (R && e === void 0) {
      const s = t !== void 0 && t.length === 1;
      s && (e = F.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), s && F.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const de = (r) => new ie(typeof r == "string" ? r : r + "", void 0, L), ce = (r, ...e) => {
  const t = r.length === 1 ? r[0] : e.reduce((s, i, a) => s + ((n) => {
    if (n._$cssResult$ === !0) return n.cssText;
    if (typeof n == "number") return n;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(i) + r[a + 1], r[0]);
  return new ie(t, r, L);
}, pe = (r, e) => {
  if (R) r.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const s = document.createElement("style"), i = D.litNonce;
    i !== void 0 && s.setAttribute("nonce", i), s.textContent = t.cssText, r.appendChild(s);
  }
}, q = R ? (r) => r : (r) => r instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const s of e.cssRules) t += s.cssText;
  return de(t);
})(r) : r;
const { is: he, defineProperty: ue, getOwnPropertyDescriptor: me, getOwnPropertyNames: ge, getOwnPropertySymbols: _e, getPrototypeOf: fe } = Object, N = globalThis, K = N.trustedTypes, be = K ? K.emptyScript : "", ve = N.reactiveElementPolyfillSupport, k = (r, e) => r, O = { toAttribute(r, e) {
  switch (e) {
    case Boolean:
      r = r ? be : null;
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
} }, re = (r, e) => !he(r, e), V = { attribute: !0, type: String, converter: O, reflect: !1, useDefault: !1, hasChanged: re };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), N.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let y = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = V) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const s = /* @__PURE__ */ Symbol(), i = this.getPropertyDescriptor(e, s, t);
      i !== void 0 && ue(this.prototype, e, i);
    }
  }
  static getPropertyDescriptor(e, t, s) {
    const { get: i, set: a } = me(this.prototype, e) ?? { get() {
      return this[t];
    }, set(n) {
      this[t] = n;
    } };
    return { get: i, set(n) {
      const d = i?.call(this);
      a?.call(this, n), this.requestUpdate(e, d, s);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? V;
  }
  static _$Ei() {
    if (this.hasOwnProperty(k("elementProperties"))) return;
    const e = fe(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(k("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(k("properties"))) {
      const t = this.properties, s = [...ge(t), ..._e(t)];
      for (const i of s) this.createProperty(i, t[i]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const t = litPropertyMetadata.get(e);
      if (t !== void 0) for (const [s, i] of t) this.elementProperties.set(s, i);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t, s] of this.elementProperties) {
      const i = this._$Eu(t, s);
      i !== void 0 && this._$Eh.set(i, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const t = [];
    if (Array.isArray(e)) {
      const s = new Set(e.flat(1 / 0).reverse());
      for (const i of s) t.unshift(q(i));
    } else e !== void 0 && t.push(q(e));
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
    return pe(e, this.constructor.elementStyles), e;
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
    const s = this.constructor.elementProperties.get(e), i = this.constructor._$Eu(e, s);
    if (i !== void 0 && s.reflect === !0) {
      const a = (s.converter?.toAttribute !== void 0 ? s.converter : O).toAttribute(t, s.type);
      this._$Em = e, a == null ? this.removeAttribute(i) : this.setAttribute(i, a), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const s = this.constructor, i = s._$Eh.get(e);
    if (i !== void 0 && this._$Em !== i) {
      const a = s.getPropertyOptions(i), n = typeof a.converter == "function" ? { fromAttribute: a.converter } : a.converter?.fromAttribute !== void 0 ? a.converter : O;
      this._$Em = i;
      const d = n.fromAttribute(t, a.type);
      this[i] = d ?? this._$Ej?.get(i) ?? d, this._$Em = null;
    }
  }
  requestUpdate(e, t, s, i = !1, a) {
    if (e !== void 0) {
      const n = this.constructor;
      if (i === !1 && (a = this[e]), s ??= n.getPropertyOptions(e), !((s.hasChanged ?? re)(a, t) || s.useDefault && s.reflect && a === this._$Ej?.get(e) && !this.hasAttribute(n._$Eu(e, s)))) return;
      this.C(e, t, s);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: s, reflect: i, wrapped: a }, n) {
    s && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, n ?? t ?? this[e]), a !== !0 || n !== void 0) || (this._$AL.has(e) || (this.hasUpdated || s || (t = void 0), this._$AL.set(e, t)), i === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        for (const [i, a] of this._$Ep) this[i] = a;
        this._$Ep = void 0;
      }
      const s = this.constructor.elementProperties;
      if (s.size > 0) for (const [i, a] of s) {
        const { wrapped: n } = a, d = this[i];
        n !== !0 || this._$AL.has(i) || d === void 0 || this.C(i, void 0, a, d);
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
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[k("elementProperties")] = /* @__PURE__ */ new Map(), y[k("finalized")] = /* @__PURE__ */ new Map(), ve?.({ ReactiveElement: y }), (N.reactiveElementVersions ??= []).push("2.1.2");
const Z = globalThis, W = (r) => r, C = Z.trustedTypes, Y = C ? C.createPolicy("lit-html", { createHTML: (r) => r }) : void 0, ae = "$lit$", _ = `lit$${Math.random().toFixed(9).slice(2)}$`, ne = "?" + _, ye = `<${ne}>`, v = document, A = () => v.createComment(""), S = (r) => r === null || typeof r != "object" && typeof r != "function", I = Array.isArray, xe = (r) => I(r) || typeof r?.[Symbol.iterator] == "function", T = `[ 	
\f\r]`, w = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, J = /-->/g, G = />/g, f = RegExp(`>|${T}(?:([^\\s"'>=/]+)(${T}*=${T}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Q = /'/g, X = /"/g, oe = /^(?:script|style|textarea|title)$/i, $e = (r) => (e, ...t) => ({ _$litType$: r, strings: e, values: t }), o = $e(1), x = /* @__PURE__ */ Symbol.for("lit-noChange"), c = /* @__PURE__ */ Symbol.for("lit-nothing"), ee = /* @__PURE__ */ new WeakMap(), b = v.createTreeWalker(v, 129);
function le(r, e) {
  if (!I(r) || !r.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Y !== void 0 ? Y.createHTML(e) : e;
}
const we = (r, e) => {
  const t = r.length - 1, s = [];
  let i, a = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", n = w;
  for (let d = 0; d < t; d++) {
    const l = r[d];
    let h, u, p = -1, m = 0;
    for (; m < l.length && (n.lastIndex = m, u = n.exec(l), u !== null); ) m = n.lastIndex, n === w ? u[1] === "!--" ? n = J : u[1] !== void 0 ? n = G : u[2] !== void 0 ? (oe.test(u[2]) && (i = RegExp("</" + u[2], "g")), n = f) : u[3] !== void 0 && (n = f) : n === f ? u[0] === ">" ? (n = i ?? w, p = -1) : u[1] === void 0 ? p = -2 : (p = n.lastIndex - u[2].length, h = u[1], n = u[3] === void 0 ? f : u[3] === '"' ? X : Q) : n === X || n === Q ? n = f : n === J || n === G ? n = w : (n = f, i = void 0);
    const g = n === f && r[d + 1].startsWith("/>") ? " " : "";
    a += n === w ? l + ye : p >= 0 ? (s.push(h), l.slice(0, p) + ae + l.slice(p) + _ + g) : l + _ + (p === -2 ? d : g);
  }
  return [le(r, a + (r[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), s];
};
class P {
  constructor({ strings: e, _$litType$: t }, s) {
    let i;
    this.parts = [];
    let a = 0, n = 0;
    const d = e.length - 1, l = this.parts, [h, u] = we(e, t);
    if (this.el = P.createElement(h, s), b.currentNode = this.el.content, t === 2 || t === 3) {
      const p = this.el.content.firstChild;
      p.replaceWith(...p.childNodes);
    }
    for (; (i = b.nextNode()) !== null && l.length < d; ) {
      if (i.nodeType === 1) {
        if (i.hasAttributes()) for (const p of i.getAttributeNames()) if (p.endsWith(ae)) {
          const m = u[n++], g = i.getAttribute(p).split(_), M = /([.?@])?(.*)/.exec(m);
          l.push({ type: 1, index: a, name: M[2], strings: g, ctor: M[1] === "." ? ze : M[1] === "?" ? Ae : M[1] === "@" ? Se : H }), i.removeAttribute(p);
        } else p.startsWith(_) && (l.push({ type: 6, index: a }), i.removeAttribute(p));
        if (oe.test(i.tagName)) {
          const p = i.textContent.split(_), m = p.length - 1;
          if (m > 0) {
            i.textContent = C ? C.emptyScript : "";
            for (let g = 0; g < m; g++) i.append(p[g], A()), b.nextNode(), l.push({ type: 2, index: ++a });
            i.append(p[m], A());
          }
        }
      } else if (i.nodeType === 8) if (i.data === ne) l.push({ type: 2, index: a });
      else {
        let p = -1;
        for (; (p = i.data.indexOf(_, p + 1)) !== -1; ) l.push({ type: 7, index: a }), p += _.length - 1;
      }
      a++;
    }
  }
  static createElement(e, t) {
    const s = v.createElement("template");
    return s.innerHTML = e, s;
  }
}
function $(r, e, t = r, s) {
  if (e === x) return e;
  let i = s !== void 0 ? t._$Co?.[s] : t._$Cl;
  const a = S(e) ? void 0 : e._$litDirective$;
  return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(r), i._$AT(r, t, s)), s !== void 0 ? (t._$Co ??= [])[s] = i : t._$Cl = i), i !== void 0 && (e = $(r, i._$AS(r, e.values), i, s)), e;
}
class ke {
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
    const { el: { content: t }, parts: s } = this._$AD, i = (e?.creationScope ?? v).importNode(t, !0);
    b.currentNode = i;
    let a = b.nextNode(), n = 0, d = 0, l = s[0];
    for (; l !== void 0; ) {
      if (n === l.index) {
        let h;
        l.type === 2 ? h = new E(a, a.nextSibling, this, e) : l.type === 1 ? h = new l.ctor(a, l.name, l.strings, this, e) : l.type === 6 && (h = new Pe(a, this, e)), this._$AV.push(h), l = s[++d];
      }
      n !== l?.index && (a = b.nextNode(), n++);
    }
    return b.currentNode = v, i;
  }
  p(e) {
    let t = 0;
    for (const s of this._$AV) s !== void 0 && (s.strings !== void 0 ? (s._$AI(e, s, t), t += s.strings.length - 2) : s._$AI(e[t])), t++;
  }
}
class E {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, t, s, i) {
    this.type = 2, this._$AH = c, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = s, this.options = i, this._$Cv = i?.isConnected ?? !0;
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
    e = $(this, e, t), S(e) ? e === c || e == null || e === "" ? (this._$AH !== c && this._$AR(), this._$AH = c) : e !== this._$AH && e !== x && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : xe(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== c && S(this._$AH) ? this._$AA.nextSibling.data = e : this.T(v.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: s } = e, i = typeof s == "number" ? this._$AC(e) : (s.el === void 0 && (s.el = P.createElement(le(s.h, s.h[0]), this.options)), s);
    if (this._$AH?._$AD === i) this._$AH.p(t);
    else {
      const a = new ke(i, this), n = a.u(this.options);
      a.p(t), this.T(n), this._$AH = a;
    }
  }
  _$AC(e) {
    let t = ee.get(e.strings);
    return t === void 0 && ee.set(e.strings, t = new P(e)), t;
  }
  k(e) {
    I(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let s, i = 0;
    for (const a of e) i === t.length ? t.push(s = new E(this.O(A()), this.O(A()), this, this.options)) : s = t[i], s._$AI(a), i++;
    i < t.length && (this._$AR(s && s._$AB.nextSibling, i), t.length = i);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const s = W(e).nextSibling;
      W(e).remove(), e = s;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class H {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, s, i, a) {
    this.type = 1, this._$AH = c, this._$AN = void 0, this.element = e, this.name = t, this._$AM = i, this.options = a, s.length > 2 || s[0] !== "" || s[1] !== "" ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = c;
  }
  _$AI(e, t = this, s, i) {
    const a = this.strings;
    let n = !1;
    if (a === void 0) e = $(this, e, t, 0), n = !S(e) || e !== this._$AH && e !== x, n && (this._$AH = e);
    else {
      const d = e;
      let l, h;
      for (e = a[0], l = 0; l < a.length - 1; l++) h = $(this, d[s + l], t, l), h === x && (h = this._$AH[l]), n ||= !S(h) || h !== this._$AH[l], h === c ? e = c : e !== c && (e += (h ?? "") + a[l + 1]), this._$AH[l] = h;
    }
    n && !i && this.j(e);
  }
  j(e) {
    e === c ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class ze extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === c ? void 0 : e;
  }
}
class Ae extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== c);
  }
}
class Se extends H {
  constructor(e, t, s, i, a) {
    super(e, t, s, i, a), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = $(this, e, t, 0) ?? c) === x) return;
    const s = this._$AH, i = e === c && s !== c || e.capture !== s.capture || e.once !== s.once || e.passive !== s.passive, a = e !== c && (s === c || i);
    i && this.element.removeEventListener(this.name, this, s), a && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class Pe {
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
const Ee = Z.litHtmlPolyfillSupport;
Ee?.(P, E), (Z.litHtmlVersions ??= []).push("3.3.3");
const Me = (r, e, t) => {
  const s = t?.renderBefore ?? e;
  let i = s._$litPart$;
  if (i === void 0) {
    const a = t?.renderBefore ?? null;
    s._$litPart$ = i = new E(e.insertBefore(A(), a), a, void 0, t ?? {});
  }
  return i._$AI(r), i;
};
const B = globalThis;
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
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Me(t, this.renderRoot, this.renderOptions);
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
z._$litElement$ = !0, z.finalized = !0, B.litElementHydrateSupport?.({ LitElement: z });
const De = B.litElementPolyfillSupport;
De?.({ LitElement: z });
(B.litElementVersions ??= []).push("4.2.2");
const Ce = (r) => r.connection.sendMessagePromise({ type: "smart_yardian/summary" }), Ne = (r) => r.connection.sendMessagePromise({
  type: "smart_yardian/weather/preview"
}), He = (r) => r.connection.sendMessagePromise({
  type: "smart_yardian/schedule/preview"
}), te = (r, e) => r.connection.sendMessagePromise({
  type: "smart_yardian/program/save",
  program: e
}), Te = (r, e) => r.connection.sendMessagePromise({
  type: "smart_yardian/program/delete",
  program_id: e
}), je = (r, e) => r.connection.sendMessagePromise({
  type: "smart_yardian/settings/update",
  settings: e
}), Ue = (r, e) => r.connection.sendMessagePromise({
  type: "smart_yardian/zone_profiles/update",
  profiles: e
}), Oe = (r, e) => r.connection.sendMessagePromise({
  type: "smart_yardian/automation/set",
  enabled: e
}), Re = (r, e) => r.connection.sendMessagePromise({
  type: "smart_yardian/run/program",
  program_id: e,
  apply_weather: !0
}), Le = (r, e, t) => r.connection.sendMessagePromise({
  type: "smart_yardian/run/zone",
  entity_id: e,
  duration_minutes: t
}), Ze = (r) => r.connection.sendMessagePromise({ type: "smart_yardian/run/stop" }), se = (r, e) => r.connection.sendMessagePromise({
  type: "smart_yardian/pause_until",
  until: e
}), Ie = (r = Date.now(), e = Math.random()) => `program-${r.toString(36)}-${Math.floor(e * 4294967296).toString(36).padStart(7, "0")}`, Be = ce`
  :host {
    --sy-blue: var(--primary-color, #1688e8);
    --sy-blue-soft: color-mix(in srgb, var(--sy-blue) 9%, white);
    --sy-green: #2e9637;
    --sy-amber: #e79a09;
    --sy-amber-soft: #fffaf0;
    --sy-red: #df2f2f;
    --sy-text: var(--primary-text-color, #20252b);
    --sy-muted: var(--secondary-text-color, #697078);
    --sy-border: var(--divider-color, #dfe3e7);
    --sy-surface: var(--card-background-color, #ffffff);
    --sy-background: var(--primary-background-color, #ffffff);
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
  }

  button {
    cursor: pointer;
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
    color: white;
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
    background: #a9afb5;
  }

  .toggle::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
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
    border: 1px solid #efb132;
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
    border-left: 1px solid #ecd7a7;
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
    border: 1px solid #bfc5ca;
    border-radius: 7px;
    background: #edf0f1;
    color: #677078;
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
    background: var(--sy-surface);
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
    background: var(--sy-surface);
    border: 1px solid var(--sy-blue);
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
  }

  .button.primary {
    color: white;
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
    opacity: 0.48;
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
    background: color-mix(in srgb, var(--sy-surface) 94%, var(--sy-text));
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
    background: var(--sy-surface);
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
    background: var(--sy-surface);
    border: 1px solid var(--sy-border);
    border-radius: 7px;
  }

  .day[selected] {
    color: white;
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
    background: var(--sy-surface);
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
    background: var(--sy-surface);
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
    background: color-mix(in srgb, var(--sy-surface) 92%, var(--sy-text));
    font-size: 12px;
    font-weight: 600;
  }

  td.reason-cell {
    min-width: 280px;
    white-space: normal;
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
    background: var(--sy-surface);
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
      minmax(150px, 1.3fr) minmax(150px, 1fr) minmax(125px, 0.8fr)
      minmax(125px, 0.8fr) minmax(110px, 0.7fr) minmax(125px, 0.8fr);
    align-items: center;
    gap: 12px;
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
    background: var(--sy-surface);
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
      border-bottom: 1px solid #ecd7a7;
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
      box-shadow: 0 2px 8px rgb(0 0 0 / 14%);
    }
  }

  @media (max-width: 600px) {
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
`, Fe = ["H", "K", "Sze", "Cs", "P", "Szo", "V"], qe = ["Hé", "Ke", "Sze", "Csü", "Pén", "Szo", "Vas"], j = [
  { value: "rotator", label: "Rotátor (MP)", rate: 10 },
  { value: "mp800", label: "Rotátor MP800", rate: 20 },
  { value: "spray", label: "Spray / esőztető", rate: 40 },
  { value: "rotor", label: "Rotoros", rate: 12 },
  { value: "drip", label: "Csepegtető", rate: 12 }
], Ke = () => ({
  program_id: Ie(),
  name: "Új program",
  enabled: !0,
  weekdays: [0, 2, 4],
  start_time: "05:30",
  weather_adjustment: !0,
  temperature_condition_enabled: !1,
  temperature_condition_operator: "above",
  temperature_condition_value: 30,
  zones: [],
  skip_next: !1
}), U = (r) => JSON.parse(JSON.stringify(r));
class Ve extends z {
  constructor() {
    super(...arguments), this.narrow = !1, this._summary = null, this._tab = "overview", this._loading = !0, this._error = "", this._draft = null, this._saving = !1, this._zoneDurations = {}, this._expandedControllers = [], this._schedulePreview = null, this._scheduleLoading = !1, this._loadSchedule = async () => {
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
      this._draft = Ke(), this._tab = "programs", this._error = "";
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
          const t = await te(this.hass, this._draft);
          await this._load(!1), this._draft = U(t);
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
        await Te(this.hass, this._draft.program_id), this._draft = null, await this._load(!1), this._selectFirstProgram();
      } catch (t) {
        this._error = this._errorMessage(t);
      }
    }, this._runDraft = async (e) => {
      if (this.hass)
        try {
          if (!this._summary?.programs.some(
            (s) => s.program_id === e.program_id
          )) {
            this._error = "A programot futtatás előtt mentsd el.";
            return;
          }
          await Re(this.hass, e.program_id), await this._load(!1);
        } catch (t) {
          this._error = this._errorMessage(t);
        }
    }, this._quickToggleProgram = async (e) => {
      if (this.hass)
        try {
          await te(this.hass, { ...e, enabled: !e.enabled }), await this._load(!1);
        } catch (t) {
          this._error = this._errorMessage(t);
        }
    }, this._startZone = async (e) => {
      if (this.hass)
        try {
          await Le(
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
          await Ze(this.hass), await this._load(!1);
        } catch (e) {
          this._error = this._errorMessage(e);
        }
    }, this._toggleAutomation = async () => {
      if (!(!this.hass || !this._summary))
        try {
          await Oe(this.hass, !this._summary.automation_enabled), await this._load(!1);
        } catch (e) {
          this._error = this._errorMessage(e);
        }
    }, this._saveSettings = async () => {
      if (!(!this.hass || !this._summary))
        try {
          await je(this.hass, this._summary.settings), await Ue(
            this.hass,
            this._allZones().map((e) => e.profile)
          ), await this._load(!1);
        } catch (e) {
          this._error = this._errorMessage(e);
        }
    }, this._pauseDay = async () => {
      if (!this.hass) return;
      const e = new Date(Date.now() + 1440 * 60 * 1e3).toISOString();
      await se(this.hass, e), await this._load(!1);
    }, this._resume = async () => {
      this.hass && (await se(this.hass, null), await this._load(!1));
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
      _scheduleLoading: { state: !0 }
    };
  }
  static {
    this.styles = Be;
  }
  connectedCallback() {
    super.connectedCallback(), this._load(!0), this._timer = window.setInterval(() => {
      this._tab !== "settings" && this._tab !== "schedule" && this._load(!1);
    }, 5e3);
  }
  disconnectedCallback() {
    this._timer && window.clearInterval(this._timer), super.disconnectedCallback();
  }
  render() {
    return o`
      <div class="shell">
        <header class="topbar">
          <ha-icon icon="mdi:water"></ha-icon>
          <h1>Öntözés</h1>
        </header>
        <nav class="tabs" aria-label="Öntözés nézetek">
          ${this._tabButton("overview", "Áttekintés")}
          ${this._tabButton("schedule", "Következő 3 nap")}
          ${this._tabButton("programs", "Programok")}
          ${this._tabButton("history", "Előzmények")}
          ${this._tabButton("settings", "Beállítások")}
        </nav>
        <main class="content">
          ${this._loading && !this._summary ? o`<div class="loading">Az öntözésvezérlő betöltése…</div>` : this._error && !this._summary ? o`<div class="error">${this._error}</div>` : this._renderTab()}
        </main>
      </div>
    `;
  }
  _tabButton(e, t) {
    return o`
      <button
        class="tab"
        ?selected=${this._tab === e}
        aria-current=${this._tab === e ? "page" : c}
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
          ${e.controllers.length ? e.controllers.map((i) => this._renderController(i)) : o`<div class="empty">Nincs konfigurált Yardian zóna.</div>`}
        </div>
        <aside class="rail">
          <div class="rail-title">
            <span>Programok</span>
            <button class="text-action" type="button" @click=${this._newProgram}>
              + Hozzáadás
            </button>
          </div>
          ${e.programs.length ? e.programs.slice(0, 3).map((i) => this._renderRailProgram(i)) : o`<div class="empty">Még nincs program.</div>`}
          ${this._renderCompactHistory(e.history[0])}
        </aside>
      </div>

      <button class="button danger stop-all" @click=${this._stopAll}>
        <ha-icon icon="mdi:stop"></ha-icon>
        Minden leállítása
      </button>
    `;
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
  _metric(e, t, s, i = "") {
    return o`
      <div class="metric ${i}">
        <ha-icon icon=${e}></ha-icon>
        <span class="metric-label">${t}</span>
        <span class="metric-value">${s}</span>
      </div>
    `;
  }
  _renderController(e) {
    const s = !window.matchMedia("(max-width: 600px)").matches || this._expandedControllers.includes(e.id), i = this._controllerStatus(e);
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
              <span class=${i.className}>
                ${i.label}
              </span>
            </div>
          </div>
          <ha-icon
            class="controller-chevron"
            icon=${s ? "mdi:chevron-up" : "mdi:chevron-down"}
          ></ha-icon>
        </button>
        ${e.zones.map((a) => this._renderZone(a))}
      </section>
    `;
  }
  _renderZone(e) {
    const t = this._zoneDurations[e.entity_id] ?? 15, s = e.state === "on", i = this._summary?.active_run?.current_zone === e.entity_id, a = Number(this._summary?.active_run?.current_duration ?? t), n = this._headLabel(e.profile.head_type), d = this._zoneIssueLabel(e);
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
          ${s ? i ? `Fut · ${a} perc` : "Fut" : e.available ? `Tétlen · ${n}` : o`Nem elérhető <small>${d}</small>`}
        </span>
        <label class="duration">
          <input
            type="number"
            min="1"
            max="180"
            .value=${String(t)}
            aria-label="${e.name} időtartama percben"
            @change=${(l) => {
      const h = l.target;
      this._zoneDurations = {
        ...this._zoneDurations,
        [e.entity_id]: this._clampDuration(h.valueAsNumber)
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
    const t = e.zone_count ?? e.zones.length, s = e.available_zone_count ?? e.zones.filter((i) => i.available).length;
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
          ${e.temperature_condition_enabled ? o`<div>${this._temperatureConditionText(e)}</div>` : c}
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
            A most elérhető előrejelzés és programbeállítások alapján
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
      (i) => this._renderScheduleProgram(i)
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
      ${this._error ? o`<div class="error">${this._error}</div>` : c}
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
                <span>${e.weather.source}</span>
              </div>
            ` : c}
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
        this._draft = U(s);
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
            ${Fe.map(
      (s, i) => o`
                <button
                  class="day"
                  type="button"
                  ?selected=${e.weekdays.includes(i)}
                  aria-pressed=${e.weekdays.includes(i)}
                  @click=${() => this._toggleDay(i)}
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
                <span>A következő 24 óra maximuma</span>
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
            ` : c}
        <div class="field">
          <span class="field-label">Zónák sorrendben</span>
          <div class="editor-zones">
            ${e.zones.map((s, i) => {
      const a = t.find((n) => n.entity_id === s.entity_id);
      return o`
                <div class="editor-zone">
                  <span>${a?.name ?? s.entity_id}</span>
                  <select
                    aria-label="${a?.name ?? s.entity_id} időtartam módja"
                    .value=${s.duration_mode}
                    @change=${(n) => this._updateDraftZone(i, {
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
                            aria-label="${a?.name ?? s.entity_id} időtartama"
                            .value=${String(s.duration_minutes)}
                            @change=${(n) => this._updateDraftZone(i, {
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
                    @click=${() => this._removeDraftZone(i)}
                  >
                    <ha-icon icon="mdi:close"></ha-icon>
                  </button>
                </div>
              `;
    })}
            ${e.zones.length === 0 ? o`<div class="empty">Adj legalább egy zónát a programhoz.</div>` : c}
          </div>
        </div>
        <div class="field">
          <label for="zone-add">Zóna hozzáadása</label>
          <select id="zone-add" @change=${this._addDraftZone}>
            <option value="">Válassz zónát…</option>
            ${t.filter((s) => !e.zones.some((i) => i.entity_id === s.entity_id)).map((s) => o`<option value=${s.entity_id}>${s.name}</option>`)}
          </select>
        </div>
        ${this._error ? o`<div class="error">${this._error}</div>` : c}
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
                        <td class="reason-cell">${t.reason}</td>
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
        <button class="button primary" @click=${this._saveSettings}>Mentés</button>
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
            <span>Aktív időjárásforrás</span>
            <strong>${this._summary.weather?.source ?? "Nincs értékelés"}</strong>
          </div>
          <div class="setting-row">
            <span>OpenWeather API-hívások ma</span>
            <strong>
              ${this._summary.openweather_quota ? `${this._summary.openweather_quota.count} / ${this._summary.openweather_quota.limit}` : "Nincs adat"}
            </strong>
          </div>
        </section>
      </div>
      <section class="settings-section zone-profiles">
        <h3>Zónák szórófeje és vízhozama</h3>
        <p class="settings-help">
          Referencia módban a program a célzott vízmennyiséget osztja a kijuttatási
          intenzitással. Ha a teljes zónavízhozam és a terület is ki van töltve,
          azok felülírják a fejtípus referenciaértékét.
        </p>
        <div class="zone-profile-head" aria-hidden="true">
          <span>Zóna</span>
          <span>Fejtípus</span>
          <span>Referencia</span>
          <span>Vízhozam</span>
          <span>Terület</span>
          <span>Aktív érték</span>
        </div>
        ${this._allZones().map((t) => this._renderZoneProfile(t))}
      </section>
      ${this._error ? o`<div class="error">${this._error}</div>` : c}
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
            @change=${(i) => {
      const a = i.target.value, n = j.find((d) => d.value === a);
      this._patchZoneProfile(e.entity_id, {
        head_type: a,
        reference_rate_mm_h: n?.rate ?? t.reference_rate_mm_h
      });
    }}
          >
            ${j.map(
      (i) => o`
                  <option
                    value=${i.value}
                    ?selected=${i.value === t.head_type}
                  >
                    ${i.label}
                  </option>
                `
    )}
          </select>
        </label>
        ${this._profileNumber(e, "reference_rate_mm_h", "mm/óra", 0.1)}
        ${this._profileNumber(e, "flow_l_min", "l/perc", 0.1, !0)}
        ${this._profileNumber(e, "area_m2", "m²", 0.1, !0)}
        <span class="effective-rate">
          <strong>${this._effectiveRate(t).toFixed(1)} mm/óra</strong>
          <span>${s ? "mért adatokból" : "referencia"}</span>
        </span>
      </div>
    `;
  }
  _profileNumber(e, t, s, i, a = !1) {
    const n = e.profile[t];
    return o`
      <label class="profile-number">
        <span class="mobile-label">${s}</span>
        <input
          type="number"
          min="0.1"
          step=${i}
          placeholder=${a ? "opcionális" : ""}
          .value=${n === null ? "" : String(n)}
          @change=${(d) => {
      const l = d.target;
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
          @change=${(i) => this._patchSettings({
      [t]: i.target.valueAsNumber
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
      const t = await Ce(this.hass);
      this._summary = t, !this._expandedControllers.length && t.controllers[0] && (this._expandedControllers = [t.controllers[0].id]), this._error = "", !t.weather && e && (t.weather = await Ne(this.hass), this._summary = { ...t }), this._tab === "programs" && !this._draft && this._selectFirstProgram();
    } catch (t) {
      this._error = this._errorMessage(t);
    } finally {
      this._loading = !1;
    }
  }
  _selectFirstProgram() {
    const e = this._summary?.programs[0];
    this._draft = e ? U(e) : null;
  }
  _nextProgramName() {
    if (!this._summary?.next_run) return "";
    const e = new Date(this._summary.next_run);
    return this._summary.programs.find((t) => {
      const [s, i] = t.start_time.split(":").map(Number);
      return s === e.getHours() && i === e.getMinutes();
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
      const l = e.weather_adjustment ? s?.factor ?? 1 : 1;
      return Math.max(1, Math.round(t.duration_minutes * l));
    }
    const i = this._zoneProfile(t.entity_id);
    if (!i) return t.duration_minutes;
    const a = s?.max_temperature ?? 20, n = a >= 35 ? 9 : a >= 25 ? 5.5 : a >= 20 ? 4.5 : 2.5, d = e.weather_adjustment ? s?.rain_factor ?? s?.factor ?? 1 : 1;
    return Math.max(
      1,
      Math.min(180, Math.round(n * d * 60 / this._effectiveRate(i)))
    );
  }
  _allZones() {
    return this._summary?.controllers.flatMap((e) => e.zones) ?? [];
  }
  _toggleController(e) {
    this._expandedControllers = this._expandedControllers.includes(e) ? this._expandedControllers.filter((t) => t !== e) : [...this._expandedControllers, e];
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
    this._summary && (this._summary = {
      ...this._summary,
      settings: { ...this._summary.settings, ...e }
    });
  }
  _patchZoneProfile(e, t) {
    this._summary && (this._summary = {
      ...this._summary,
      controllers: this._summary.controllers.map((s) => ({
        ...s,
        zones: s.zones.map(
          (i) => i.entity_id === e ? { ...i, profile: { ...i.profile, ...t } } : i
        )
      }))
    });
  }
  _formatDays(e) {
    return e.map((t) => qe[t] ?? "").join(", ");
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
    return j.find((t) => t.value === e)?.label ?? e;
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
    const t = new Date(e), s = /* @__PURE__ */ new Date(), i = new Date(s);
    return i.setDate(s.getDate() + 1), `${t.toDateString() === s.toDateString() ? "ma" : t.toDateString() === i.toDateString() ? "holnap" : new Intl.DateTimeFormat("hu-HU", {
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
customElements.get("smart-yardian-panel") || customElements.define("smart-yardian-panel", Ve);
export {
  Ve as SmartYardianPanel
};
//# sourceMappingURL=smart-yardian-panel.js.map
