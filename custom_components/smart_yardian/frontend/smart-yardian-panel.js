const j = globalThis, W = j.ShadowRoot && (j.ShadyCSS === void 0 || j.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, K = /* @__PURE__ */ Symbol(), Y = /* @__PURE__ */ new WeakMap();
let lt = class {
  constructor(t, e, s) {
    if (this._$cssResult$ = !0, s !== K) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = e;
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (W && t === void 0) {
      const s = e !== void 0 && e.length === 1;
      s && (t = Y.get(e)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), s && Y.set(e, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const gt = (i) => new lt(typeof i == "string" ? i : i + "", void 0, K), _t = (i, ...t) => {
  const e = i.length === 1 ? i[0] : t.reduce((s, a, r) => s + ((o) => {
    if (o._$cssResult$ === !0) return o.cssText;
    if (typeof o == "number") return o;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + o + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(a) + i[r + 1], i[0]);
  return new lt(e, i, K);
}, bt = (i, t) => {
  if (W) i.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
  else for (const e of t) {
    const s = document.createElement("style"), a = j.litNonce;
    a !== void 0 && s.setAttribute("nonce", a), s.textContent = e.cssText, i.appendChild(s);
  }
}, J = W ? (i) => i : (i) => i instanceof CSSStyleSheet ? ((t) => {
  let e = "";
  for (const s of t.cssRules) e += s.cssText;
  return gt(e);
})(i) : i;
const { is: ft, defineProperty: vt, getOwnPropertyDescriptor: yt, getOwnPropertyNames: xt, getOwnPropertySymbols: $t, getPrototypeOf: wt } = Object, H = globalThis, G = H.trustedTypes, kt = G ? G.emptyScript : "", zt = H.reactiveElementPolyfillSupport, k = (i, t) => i, I = { toAttribute(i, t) {
  switch (t) {
    case Boolean:
      i = i ? kt : null;
      break;
    case Object:
    case Array:
      i = i == null ? i : JSON.stringify(i);
  }
  return i;
}, fromAttribute(i, t) {
  let e = i;
  switch (t) {
    case Boolean:
      e = i !== null;
      break;
    case Number:
      e = i === null ? null : Number(i);
      break;
    case Object:
    case Array:
      try {
        e = JSON.parse(i);
      } catch {
        e = null;
      }
  }
  return e;
} }, dt = (i, t) => !ft(i, t), X = { attribute: !0, type: String, converter: I, reflect: !1, useDefault: !1, hasChanged: dt };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), H.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let y = class extends HTMLElement {
  static addInitializer(t) {
    this._$Ei(), (this.l ??= []).push(t);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t, e = X) {
    if (e.state && (e.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(t) && ((e = Object.create(e)).wrapped = !0), this.elementProperties.set(t, e), !e.noAccessor) {
      const s = /* @__PURE__ */ Symbol(), a = this.getPropertyDescriptor(t, s, e);
      a !== void 0 && vt(this.prototype, t, a);
    }
  }
  static getPropertyDescriptor(t, e, s) {
    const { get: a, set: r } = yt(this.prototype, t) ?? { get() {
      return this[e];
    }, set(o) {
      this[e] = o;
    } };
    return { get: a, set(o) {
      const l = a?.call(this);
      r?.call(this, o), this.requestUpdate(t, l, s);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) ?? X;
  }
  static _$Ei() {
    if (this.hasOwnProperty(k("elementProperties"))) return;
    const t = wt(this);
    t.finalize(), t.l !== void 0 && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(k("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(k("properties"))) {
      const e = this.properties, s = [...xt(e), ...$t(e)];
      for (const a of s) this.createProperty(a, e[a]);
    }
    const t = this[Symbol.metadata];
    if (t !== null) {
      const e = litPropertyMetadata.get(t);
      if (e !== void 0) for (const [s, a] of e) this.elementProperties.set(s, a);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [e, s] of this.elementProperties) {
      const a = this._$Eu(e, s);
      a !== void 0 && this._$Eh.set(a, e);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const e = [];
    if (Array.isArray(t)) {
      const s = new Set(t.flat(1 / 0).reverse());
      for (const a of s) e.unshift(J(a));
    } else t !== void 0 && e.push(J(t));
    return e;
  }
  static _$Eu(t, e) {
    const s = e.attribute;
    return s === !1 ? void 0 : typeof s == "string" ? s : typeof t == "string" ? t.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t) => this.enableUpdating = t), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t) => t(this));
  }
  addController(t) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t), this.renderRoot !== void 0 && this.isConnected && t.hostConnected?.();
  }
  removeController(t) {
    this._$EO?.delete(t);
  }
  _$E_() {
    const t = /* @__PURE__ */ new Map(), e = this.constructor.elementProperties;
    for (const s of e.keys()) this.hasOwnProperty(s) && (t.set(s, this[s]), delete this[s]);
    t.size > 0 && (this._$Ep = t);
  }
  createRenderRoot() {
    const t = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return bt(t, this.constructor.elementStyles), t;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((t) => t.hostConnected?.());
  }
  enableUpdating(t) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t) => t.hostDisconnected?.());
  }
  attributeChangedCallback(t, e, s) {
    this._$AK(t, s);
  }
  _$ET(t, e) {
    const s = this.constructor.elementProperties.get(t), a = this.constructor._$Eu(t, s);
    if (a !== void 0 && s.reflect === !0) {
      const r = (s.converter?.toAttribute !== void 0 ? s.converter : I).toAttribute(e, s.type);
      this._$Em = t, r == null ? this.removeAttribute(a) : this.setAttribute(a, r), this._$Em = null;
    }
  }
  _$AK(t, e) {
    const s = this.constructor, a = s._$Eh.get(t);
    if (a !== void 0 && this._$Em !== a) {
      const r = s.getPropertyOptions(a), o = typeof r.converter == "function" ? { fromAttribute: r.converter } : r.converter?.fromAttribute !== void 0 ? r.converter : I;
      this._$Em = a;
      const l = o.fromAttribute(e, r.type);
      this[a] = l ?? this._$Ej?.get(a) ?? l, this._$Em = null;
    }
  }
  requestUpdate(t, e, s, a = !1, r) {
    if (t !== void 0) {
      const o = this.constructor;
      if (a === !1 && (r = this[t]), s ??= o.getPropertyOptions(t), !((s.hasChanged ?? dt)(r, e) || s.useDefault && s.reflect && r === this._$Ej?.get(t) && !this.hasAttribute(o._$Eu(t, s)))) return;
      this.C(t, e, s);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(t, e, { useDefault: s, reflect: a, wrapped: r }, o) {
    s && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t) && (this._$Ej.set(t, o ?? e ?? this[t]), r !== !0 || o !== void 0) || (this._$AL.has(t) || (this.hasUpdated || s || (e = void 0), this._$AL.set(t, e)), a === !0 && this._$Em !== t && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (e) {
      Promise.reject(e);
    }
    const t = this.scheduleUpdate();
    return t != null && await t, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [a, r] of this._$Ep) this[a] = r;
        this._$Ep = void 0;
      }
      const s = this.constructor.elementProperties;
      if (s.size > 0) for (const [a, r] of s) {
        const { wrapped: o } = r, l = this[a];
        o !== !0 || this._$AL.has(a) || l === void 0 || this.C(a, void 0, r, l);
      }
    }
    let t = !1;
    const e = this._$AL;
    try {
      t = this.shouldUpdate(e), t ? (this.willUpdate(e), this._$EO?.forEach((s) => s.hostUpdate?.()), this.update(e)) : this._$EM();
    } catch (s) {
      throw t = !1, this._$EM(), s;
    }
    t && this._$AE(e);
  }
  willUpdate(t) {
  }
  _$AE(t) {
    this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(t)), this.updated(t);
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
  shouldUpdate(t) {
    return !0;
  }
  update(t) {
    this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
  }
  updated(t) {
  }
  firstUpdated(t) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[k("elementProperties")] = /* @__PURE__ */ new Map(), y[k("finalized")] = /* @__PURE__ */ new Map(), zt?.({ ReactiveElement: y }), (H.reactiveElementVersions ??= []).push("2.1.2");
const q = globalThis, Q = (i) => i, N = q.trustedTypes, tt = N ? N.createPolicy("lit-html", { createHTML: (i) => i }) : void 0, ct = "$lit$", _ = `lit$${Math.random().toFixed(9).slice(2)}$`, pt = "?" + _, St = `<${pt}>`, v = document, S = () => v.createComment(""), A = (i) => i === null || typeof i != "object" && typeof i != "function", B = Array.isArray, At = (i) => B(i) || typeof i?.[Symbol.iterator] == "function", F = `[ 	
\f\r]`, w = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, et = /-->/g, st = />/g, b = RegExp(`>|${F}(?:([^\\s"'>=/]+)(${F}*=${F}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), at = /'/g, it = /"/g, ut = /^(?:script|style|textarea|title)$/i, Mt = (i) => (t, ...e) => ({ _$litType$: i, strings: t, values: e }), n = Mt(1), x = /* @__PURE__ */ Symbol.for("lit-noChange"), c = /* @__PURE__ */ Symbol.for("lit-nothing"), rt = /* @__PURE__ */ new WeakMap(), f = v.createTreeWalker(v, 129);
function ht(i, t) {
  if (!B(i) || !i.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return tt !== void 0 ? tt.createHTML(t) : t;
}
const Pt = (i, t) => {
  const e = i.length - 1, s = [];
  let a, r = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = w;
  for (let l = 0; l < e; l++) {
    const d = i[l];
    let p, h, u = -1, m = 0;
    for (; m < d.length && (o.lastIndex = m, h = o.exec(d), h !== null); ) m = o.lastIndex, o === w ? h[1] === "!--" ? o = et : h[1] !== void 0 ? o = st : h[2] !== void 0 ? (ut.test(h[2]) && (a = RegExp("</" + h[2], "g")), o = b) : h[3] !== void 0 && (o = b) : o === b ? h[0] === ">" ? (o = a ?? w, u = -1) : h[1] === void 0 ? u = -2 : (u = o.lastIndex - h[2].length, p = h[1], o = h[3] === void 0 ? b : h[3] === '"' ? it : at) : o === it || o === at ? o = b : o === et || o === st ? o = w : (o = b, a = void 0);
    const g = o === b && i[l + 1].startsWith("/>") ? " " : "";
    r += o === w ? d + St : u >= 0 ? (s.push(p), d.slice(0, u) + ct + d.slice(u) + _ + g) : d + _ + (u === -2 ? l : g);
  }
  return [ht(i, r + (i[e] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), s];
};
class M {
  constructor({ strings: t, _$litType$: e }, s) {
    let a;
    this.parts = [];
    let r = 0, o = 0;
    const l = t.length - 1, d = this.parts, [p, h] = Pt(t, e);
    if (this.el = M.createElement(p, s), f.currentNode = this.el.content, e === 2 || e === 3) {
      const u = this.el.content.firstChild;
      u.replaceWith(...u.childNodes);
    }
    for (; (a = f.nextNode()) !== null && d.length < l; ) {
      if (a.nodeType === 1) {
        if (a.hasAttributes()) for (const u of a.getAttributeNames()) if (u.endsWith(ct)) {
          const m = h[o++], g = a.getAttribute(u).split(_), D = /([.?@])?(.*)/.exec(m);
          d.push({ type: 1, index: r, name: D[2], strings: g, ctor: D[1] === "." ? Et : D[1] === "?" ? jt : D[1] === "@" ? Nt : R }), a.removeAttribute(u);
        } else u.startsWith(_) && (d.push({ type: 6, index: r }), a.removeAttribute(u));
        if (ut.test(a.tagName)) {
          const u = a.textContent.split(_), m = u.length - 1;
          if (m > 0) {
            a.textContent = N ? N.emptyScript : "";
            for (let g = 0; g < m; g++) a.append(u[g], S()), f.nextNode(), d.push({ type: 2, index: ++r });
            a.append(u[m], S());
          }
        }
      } else if (a.nodeType === 8) if (a.data === pt) d.push({ type: 2, index: r });
      else {
        let u = -1;
        for (; (u = a.data.indexOf(_, u + 1)) !== -1; ) d.push({ type: 7, index: r }), u += _.length - 1;
      }
      r++;
    }
  }
  static createElement(t, e) {
    const s = v.createElement("template");
    return s.innerHTML = t, s;
  }
}
function $(i, t, e = i, s) {
  if (t === x) return t;
  let a = s !== void 0 ? e._$Co?.[s] : e._$Cl;
  const r = A(t) ? void 0 : t._$litDirective$;
  return a?.constructor !== r && (a?._$AO?.(!1), r === void 0 ? a = void 0 : (a = new r(i), a._$AT(i, e, s)), s !== void 0 ? (e._$Co ??= [])[s] = a : e._$Cl = a), a !== void 0 && (t = $(i, a._$AS(i, t.values), a, s)), t;
}
class Dt {
  constructor(t, e) {
    this._$AV = [], this._$AN = void 0, this._$AD = t, this._$AM = e;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t) {
    const { el: { content: e }, parts: s } = this._$AD, a = (t?.creationScope ?? v).importNode(e, !0);
    f.currentNode = a;
    let r = f.nextNode(), o = 0, l = 0, d = s[0];
    for (; d !== void 0; ) {
      if (o === d.index) {
        let p;
        d.type === 2 ? p = new P(r, r.nextSibling, this, t) : d.type === 1 ? p = new d.ctor(r, d.name, d.strings, this, t) : d.type === 6 && (p = new Tt(r, this, t)), this._$AV.push(p), d = s[++l];
      }
      o !== d?.index && (r = f.nextNode(), o++);
    }
    return f.currentNode = v, a;
  }
  p(t) {
    let e = 0;
    for (const s of this._$AV) s !== void 0 && (s.strings !== void 0 ? (s._$AI(t, s, e), e += s.strings.length - 2) : s._$AI(t[e])), e++;
  }
}
class P {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t, e, s, a) {
    this.type = 2, this._$AH = c, this._$AN = void 0, this._$AA = t, this._$AB = e, this._$AM = s, this.options = a, this._$Cv = a?.isConnected ?? !0;
  }
  get parentNode() {
    let t = this._$AA.parentNode;
    const e = this._$AM;
    return e !== void 0 && t?.nodeType === 11 && (t = e.parentNode), t;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, e = this) {
    t = $(this, t, e), A(t) ? t === c || t == null || t === "" ? (this._$AH !== c && this._$AR(), this._$AH = c) : t !== this._$AH && t !== x && this._(t) : t._$litType$ !== void 0 ? this.$(t) : t.nodeType !== void 0 ? this.T(t) : At(t) ? this.k(t) : this._(t);
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
  }
  _(t) {
    this._$AH !== c && A(this._$AH) ? this._$AA.nextSibling.data = t : this.T(v.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    const { values: e, _$litType$: s } = t, a = typeof s == "number" ? this._$AC(t) : (s.el === void 0 && (s.el = M.createElement(ht(s.h, s.h[0]), this.options)), s);
    if (this._$AH?._$AD === a) this._$AH.p(e);
    else {
      const r = new Dt(a, this), o = r.u(this.options);
      r.p(e), this.T(o), this._$AH = r;
    }
  }
  _$AC(t) {
    let e = rt.get(t.strings);
    return e === void 0 && rt.set(t.strings, e = new M(t)), e;
  }
  k(t) {
    B(this._$AH) || (this._$AH = [], this._$AR());
    const e = this._$AH;
    let s, a = 0;
    for (const r of t) a === e.length ? e.push(s = new P(this.O(S()), this.O(S()), this, this.options)) : s = e[a], s._$AI(r), a++;
    a < e.length && (this._$AR(s && s._$AB.nextSibling, a), e.length = a);
  }
  _$AR(t = this._$AA.nextSibling, e) {
    for (this._$AP?.(!1, !0, e); t !== this._$AB; ) {
      const s = Q(t).nextSibling;
      Q(t).remove(), t = s;
    }
  }
  setConnected(t) {
    this._$AM === void 0 && (this._$Cv = t, this._$AP?.(t));
  }
}
class R {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, e, s, a, r) {
    this.type = 1, this._$AH = c, this._$AN = void 0, this.element = t, this.name = e, this._$AM = a, this.options = r, s.length > 2 || s[0] !== "" || s[1] !== "" ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = c;
  }
  _$AI(t, e = this, s, a) {
    const r = this.strings;
    let o = !1;
    if (r === void 0) t = $(this, t, e, 0), o = !A(t) || t !== this._$AH && t !== x, o && (this._$AH = t);
    else {
      const l = t;
      let d, p;
      for (t = r[0], d = 0; d < r.length - 1; d++) p = $(this, l[s + d], e, d), p === x && (p = this._$AH[d]), o ||= !A(p) || p !== this._$AH[d], p === c ? t = c : t !== c && (t += (p ?? "") + r[d + 1]), this._$AH[d] = p;
    }
    o && !a && this.j(t);
  }
  j(t) {
    t === c ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
  }
}
class Et extends R {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === c ? void 0 : t;
  }
}
class jt extends R {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== c);
  }
}
class Nt extends R {
  constructor(t, e, s, a, r) {
    super(t, e, s, a, r), this.type = 5;
  }
  _$AI(t, e = this) {
    if ((t = $(this, t, e, 0) ?? c) === x) return;
    const s = this._$AH, a = t === c && s !== c || t.capture !== s.capture || t.once !== s.once || t.passive !== s.passive, r = t !== c && (s === c || a);
    a && this.element.removeEventListener(this.name, this, s), r && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, t) : this._$AH.handleEvent(t);
  }
}
class Tt {
  constructor(t, e, s) {
    this.element = t, this.type = 6, this._$AN = void 0, this._$AM = e, this.options = s;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    $(this, t);
  }
}
const Ct = q.litHtmlPolyfillSupport;
Ct?.(M, P), (q.litHtmlVersions ??= []).push("3.3.3");
const Ht = (i, t, e) => {
  const s = e?.renderBefore ?? t;
  let a = s._$litPart$;
  if (a === void 0) {
    const r = e?.renderBefore ?? null;
    s._$litPart$ = a = new P(t.insertBefore(S(), r), r, void 0, e ?? {});
  }
  return a._$AI(i), a;
};
const V = globalThis;
class z extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t.firstChild, t;
  }
  update(t) {
    const e = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = Ht(e, this.renderRoot, this.renderOptions);
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
z._$litElement$ = !0, z.finalized = !0, V.litElementHydrateSupport?.({ LitElement: z });
const Rt = V.litElementPolyfillSupport;
Rt?.({ LitElement: z });
(V.litElementVersions ??= []).push("4.2.2");
const Ft = (i) => i.connection.sendMessagePromise({ type: "smart_yardian/summary" }), Zt = (i) => i.connection.sendMessagePromise({
  type: "smart_yardian/weather/preview"
}), Lt = (i) => i.connection.sendMessagePromise({
  type: "smart_yardian/weather/hourly"
}), It = (i) => i.connection.sendMessagePromise({
  type: "smart_yardian/schedule/preview"
}), U = (i, t) => i.connection.sendMessagePromise({
  type: "smart_yardian/program/save",
  program: t
}), Ut = (i, t) => i.connection.sendMessagePromise({
  type: "smart_yardian/program/delete",
  program_id: t
}), Ot = (i, t) => i.connection.sendMessagePromise({
  type: "smart_yardian/settings/update",
  settings: t
}), Wt = (i, t) => i.connection.sendMessagePromise({
  type: "smart_yardian/rain/stations",
  city: t
}), Kt = (i, t) => i.connection.sendMessagePromise({
  type: "smart_yardian/zone_profiles/update",
  profiles: t
}), qt = (i, t) => i.connection.sendMessagePromise({
  type: "smart_yardian/automation/set",
  enabled: t
}), Bt = (i, t) => i.connection.sendMessagePromise({
  type: "smart_yardian/run/program",
  program_id: t,
  apply_weather: !0
}), Vt = async (i, t) => {
  const e = await U(i, t);
  return await Bt(i, e.program_id), e;
}, Yt = (i, t, e) => i.connection.sendMessagePromise({
  type: "smart_yardian/run/manual_program",
  program: t,
  apply_weather: e
}), Jt = (i, t, e) => i.connection.sendMessagePromise({
  type: "smart_yardian/run/zone",
  entity_id: t,
  duration_minutes: e
}), Gt = (i) => i.connection.sendMessagePromise({ type: "smart_yardian/run/stop" }), Xt = (i) => i.connection.sendMessagePromise({
  type: "smart_yardian/run/skip_current_zone"
}), nt = (i, t) => i.connection.sendMessagePromise({
  type: "smart_yardian/pause_until",
  until: t
}), Qt = (i = Date.now(), t = Math.random()) => `program-${i.toString(36)}-${Math.floor(t * 4294967296).toString(36).padStart(7, "0")}`, te = (i, t) => {
  const e = Number(i);
  if (!Number.isFinite(e) || e < 0 || e > 100) return null;
  const s = t.soil_moisture_dry_percent, a = t.soil_moisture_target_percent, r = t.soil_moisture_skip_percent, o = t.soil_moisture_max_factor;
  if (e >= r) return { percent: e, factor: 0, action: "skip" };
  if (e > a)
    return {
      percent: e,
      factor: (r - e) / (r - a),
      action: "reduce"
    };
  if (e < a) {
    const l = e <= s ? o : 1 + (a - e) / (a - s) * (o - 1);
    return { percent: e, factor: l, action: "increase" };
  }
  return { percent: e, factor: 1, action: "normal" };
}, ee = _t`
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
    grid-template-columns: minmax(270px, 1fr) repeat(7, minmax(88px, auto));
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

  .metric.et ha-icon {
    color: var(--sy-blue);
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

  .manual-adjustments {
    display: grid;
    gap: 2px;
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

  .forecast-source {
    min-height: 38px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: var(--sy-muted);
    font-size: 12px;
  }

  .forecast-days {
    display: grid;
    gap: 16px;
  }

  .forecast-day {
    overflow: hidden;
    border: 1px solid var(--sy-border);
    border-radius: 8px;
  }

  .forecast-day-head {
    min-height: 46px;
    padding: 9px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--sy-border);
    background: var(--sy-surface-muted);
  }

  .forecast-day-head strong {
    text-transform: capitalize;
  }

  .forecast-day-head span {
    color: var(--sy-muted);
    font-size: 12px;
  }

  .forecast-table-head,
  .forecast-hour {
    display: grid;
    grid-template-columns: 64px minmax(150px, 1fr) 110px 110px 90px 140px;
    align-items: center;
    gap: 12px;
  }

  .forecast-table-head {
    min-height: 34px;
    padding: 0 14px;
    color: var(--sy-muted);
    border-bottom: 1px solid var(--sy-border);
    font-size: 11px;
    font-weight: 600;
  }

  .forecast-hour {
    min-height: 48px;
    padding: 7px 14px;
    border-bottom: 1px solid var(--sy-border);
  }

  .forecast-hour:last-child {
    border-bottom: 0;
  }

  .forecast-hour[raining] {
    box-shadow: inset 3px 0 0 var(--sy-blue);
    background: var(--sy-blue-soft);
  }

  .forecast-hour time {
    color: var(--sy-muted);
    font-variant-numeric: tabular-nums;
  }

  .forecast-condition {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .forecast-condition ha-icon {
    flex: 0 0 auto;
    color: var(--sy-muted);
    --mdc-icon-size: 21px;
  }

  .forecast-condition span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .forecast-metric {
    font-variant-numeric: tabular-nums;
  }

  .forecast-metric > span {
    display: none;
  }

  .forecast-hour[raining] .forecast-metric.precipitation strong,
  .forecast-hour[raining] .forecast-metric.probability strong {
    color: var(--sy-blue);
  }

  .forecast-hour[windy] .forecast-metric.wind strong {
    color: var(--sy-amber);
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
    grid-template-columns: 76px minmax(0, 1fr) auto;
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

  .schedule-status.wind_skip,
  .schedule-status.wind_unavailable,
  .schedule-status.smart_no_fit {
    color: var(--sy-red);
  }

  .schedule-reason {
    margin: 7px 0 8px 84px;
    color: var(--sy-muted);
    font-size: 12px;
    line-height: 1.4;
  }

  .schedule-weather {
    margin: 0 0 9px 84px;
    display: flex;
    flex-wrap: wrap;
    gap: 5px 12px;
    color: var(--sy-muted);
    font-size: 11px;
  }

  .schedule-plan,
  .schedule-selection-reason {
    margin: 0 0 8px 84px;
    color: var(--sy-muted);
    font-size: 11px;
    line-height: 1.4;
  }

  .schedule-plan {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .schedule-plan ha-icon {
    flex: 0 0 auto;
    --mdc-icon-size: 16px;
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

  .schedule-zone-name {
    display: grid;
    gap: 1px;
  }

  .schedule-zone-name small {
    color: var(--sy-muted);
    font-size: 10px;
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

  .schedule-mode-field {
    margin: 0 0 18px;
    padding: 0;
    border: 0;
  }

  .schedule-mode-field legend {
    margin-bottom: 7px;
    padding: 0;
    font-size: 13px;
    font-weight: 600;
  }

  .schedule-mode-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .schedule-mode-option {
    min-height: 66px;
    padding: 10px 12px;
    display: flex;
    align-items: flex-start;
    gap: 9px;
    color: var(--sy-text);
    background: var(--sy-control);
    border: 1px solid var(--sy-border);
    border-radius: 7px;
    cursor: pointer;
  }

  .schedule-mode-option[selected] {
    background: var(--sy-blue-soft);
    border-color: var(--sy-blue);
  }

  .schedule-mode-option input {
    margin: 2px 0 0;
    flex: 0 0 auto;
  }

  .schedule-mode-option span {
    display: grid;
    gap: 3px;
  }

  .schedule-mode-option strong {
    font-size: 13px;
  }

  .schedule-mode-option small,
  .field-help,
  .window-help,
  .window-capacity {
    color: var(--sy-muted);
    font-size: 12px;
    line-height: 1.4;
  }

  .watering-window {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .watering-window .field {
    margin-bottom: 8px;
  }

  .window-help {
    max-width: 70ch;
    margin: 0 0 10px;
  }

  .field-help {
    margin-top: 6px;
  }

  .window-capacity {
    margin: 0 0 18px;
  }

  .window-fit-warning {
    margin: 0 0 18px;
    padding: 10px 12px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    color: var(--sy-text);
    background: var(--sy-amber-soft);
    border: 1px solid color-mix(in srgb, var(--sy-amber) 48%, var(--sy-border));
    border-radius: 7px;
    font-size: 12px;
    line-height: 1.45;
  }

  .window-fit-warning ha-icon {
    margin-top: 1px;
    flex: 0 0 auto;
    color: var(--sy-amber);
    --mdc-icon-size: 18px;
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

  .ntfy-link-row {
    min-height: 49px;
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    align-items: center;
    gap: 16px;
    border-bottom: 1px solid var(--sy-border);
  }

  .ntfy-link-row > div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
  }

  .ntfy-link-row input {
    width: 100%;
    min-width: 0;
    height: 34px;
    padding: 5px 8px;
    color: var(--sy-text);
    background: var(--sy-control);
    border: 1px solid var(--sy-border);
    border-radius: 6px;
  }

  .ntfy-help {
    margin: 9px 0 14px;
  }

  .forecast-settings,
  .rain-station-settings {
    grid-column: 1 / -1;
  }

  .forecast-location,
  .rain-station-city,
  .rain-station-result {
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    align-items: center;
    gap: 16px;
    min-height: 49px;
    border-bottom: 1px solid var(--sy-border);
  }

  .rain-station-city > div {
    display: grid;
    grid-template-columns: minmax(180px, 1fr) auto;
    gap: 8px;
  }

  .forecast-location input,
  .rain-station-city input,
  .rain-station-result select {
    width: 100%;
    min-width: 0;
    height: 36px;
    padding: 5px 8px;
    color: var(--sy-text);
    background: var(--sy-control);
    border: 1px solid var(--sy-border);
    border-radius: 6px;
  }

  .rain-station-status,
  .rain-station-reading {
    min-height: 49px;
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr) auto;
    align-items: center;
    gap: 16px;
    border-bottom: 1px solid var(--sy-border);
  }

  .rain-station-reading > span:last-child {
    color: var(--sy-muted);
  }

  .rain-station-error {
    padding: 10px 0;
    color: var(--sy-red);
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
      grid-template-columns: repeat(2, 1fr);
    }

    .weather-summary {
      grid-column: 1 / -1;
      border-bottom: 1px solid color-mix(in srgb, var(--sy-amber) 32%, var(--sy-border));
    }

    .metric {
      min-height: 59px;
      padding: 5px 9px;
    }

    .forecast-location,
    .rain-station-city,
    .rain-station-result,
    .rain-station-status,
    .rain-station-reading {
      grid-template-columns: 1fr;
      gap: 7px;
      padding: 10px 0;
    }

    .rain-station-city > div {
      grid-template-columns: 1fr;
    }

    .rain-station-reading > span:last-child {
      justify-self: start;
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

    .forecast-table-head,
    .forecast-hour {
      grid-template-columns: 56px minmax(130px, 1fr) 100px 100px 80px;
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

    .ntfy-link-row {
      grid-template-columns: 1fr;
      align-items: stretch;
      gap: 8px;
      padding: 12px 0;
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
    .forecast-source {
      padding: 8px 0;
      align-items: flex-start;
      flex-direction: column;
      gap: 3px;
    }

    .forecast-table-head {
      display: none;
    }

    .forecast-hour {
      min-height: 104px;
      grid-template-columns: 48px minmax(0, 1fr) auto;
      grid-template-rows: auto auto auto;
      gap: 7px 10px;
    }

    .forecast-hour time {
      grid-row: 1 / 4;
      align-self: start;
      padding-top: 3px;
    }

    .forecast-condition {
      grid-column: 2;
    }

    .forecast-metric.temperature {
      grid-column: 3;
      grid-row: 1;
      text-align: right;
    }

    .forecast-metric.precipitation {
      grid-column: 2;
      grid-row: 2;
    }

    .forecast-metric.probability {
      grid-column: 3;
      grid-row: 2;
      text-align: right;
    }

    .forecast-metric.wind {
      grid-column: 2 / 4;
      grid-row: 3;
    }

    .forecast-metric > span {
      display: block;
      margin-bottom: 2px;
      color: var(--sy-muted);
      font-size: 10px;
      font-weight: 400;
    }

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
      grid-template-columns: 76px minmax(0, 1fr);
    }

    .schedule-status {
      grid-column: 2;
      text-align: left;
    }

    .schedule-reason,
    .schedule-weather,
    .schedule-plan,
    .schedule-selection-reason {
      margin-left: 84px;
    }

    .schedule-mode-options,
    .watering-window {
      grid-template-columns: 1fr;
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
`, se = ["H", "K", "Sze", "Cs", "P", "Szo", "V"], ae = ["Hé", "Ke", "Sze", "Csü", "Pén", "Szo", "Vas"], T = "02:00", C = "07:00", ot = 30, ie = 1080, Z = [
  { value: "rotator", label: "Rotátor (MP)", rate: 10 },
  { value: "mp800", label: "Rotátor MP800", rate: 20 },
  { value: "spray", label: "Spray / esőztető", rate: 40 },
  { value: "rotor", label: "Rotoros", rate: 12 },
  { value: "drip", label: "Csepegtető", rate: 12 }
], mt = () => ({
  program_id: Qt(),
  name: "Új program",
  enabled: !0,
  weekdays: [0, 2, 4],
  schedule_mode: "smart_window",
  start_time: "05:30",
  window_start_time: T,
  window_end_time: C,
  weather_adjustment: !0,
  temperature_condition_enabled: !1,
  temperature_condition_operator: "above",
  temperature_condition_value: 30,
  soil_moisture_enabled: !1,
  zones: [],
  skip_next: !1
}), O = (i) => ({
  ...i,
  schedule_mode: i.schedule_mode ?? "fixed",
  start_time: i.start_time ?? "05:30",
  window_start_time: i.window_start_time ?? T,
  window_end_time: i.window_end_time ?? C
}), E = (i) => O(JSON.parse(JSON.stringify(i))), L = () => {
  const i = /* @__PURE__ */ new Date();
  return {
    ...mt(),
    name: "Kézi öntözés",
    weekdays: [i.getDay() === 0 ? 6 : i.getDay() - 1],
    start_time: `${String(i.getHours()).padStart(2, "0")}:${String(
      i.getMinutes()
    ).padStart(2, "0")}`,
    schedule_mode: "fixed",
    enabled: !1,
    weather_adjustment: !1
  };
};
class re extends z {
  constructor() {
    super(...arguments), this.narrow = !1, this._summary = null, this._tab = "overview", this._loading = !0, this._error = "", this._draft = null, this._saving = !1, this._zoneDurations = {}, this._expandedControllers = [], this._schedulePreview = null, this._scheduleLoading = !1, this._hourlyForecast = null, this._forecastLoading = !1, this._bulkMoistureSensor = "", this._settingsSaving = !1, this._settingsSaved = !1, this._ntfyCopied = !1, this._rainStationSearching = !1, this._rainStationMatches = [], this._runExpanded = !1, this._now = Date.now(), this._manualDraft = L(), this._manualRunning = !1, this._loadSchedule = async () => {
      if (!(!this.hass || this._scheduleLoading)) {
        this._scheduleLoading = !0;
        try {
          this._schedulePreview = await It(this.hass), this._error = "";
        } catch (t) {
          this._error = this._errorMessage(t);
        } finally {
          this._scheduleLoading = !1;
        }
      }
    }, this._loadHourlyForecast = async () => {
      if (!(!this.hass || this._forecastLoading)) {
        this._forecastLoading = !0;
        try {
          this._hourlyForecast = await Lt(this.hass), this._error = "";
        } catch (t) {
          this._error = this._errorMessage(t);
        } finally {
          this._forecastLoading = !1;
        }
      }
    }, this._newProgram = () => {
      this._draft = mt(), this._tab = "programs", this._error = "";
    }, this._resetManualProgram = () => {
      this._manualDraft = L(), this._error = "";
    }, this._importManualProgram = (t) => {
      const e = t.target, s = this._summary?.programs.find(
        (r) => r.program_id === e.value
      );
      if (!s) return;
      const a = L();
      this._manualDraft = {
        ...a,
        name: `Kézi – ${s.name}`,
        weather_adjustment: s.weather_adjustment,
        soil_moisture_enabled: s.soil_moisture_enabled,
        zones: s.zones.map((r) => ({ ...r }))
      }, e.value = "";
    }, this._addManualZone = (t) => {
      const e = t.target;
      e.value && (this._patchManual({
        zones: [
          ...this._manualDraft.zones,
          {
            entity_id: e.value,
            duration_minutes: 15,
            duration_mode: "manual"
          }
        ]
      }), e.value = "");
    }, this._runManualDraft = async () => {
      if (!(!this.hass || !this._manualDraft.zones.length || this._manualRunning)) {
        this._manualRunning = !0;
        try {
          await Yt(
            this.hass,
            this._manualDraft,
            this._manualDraft.weather_adjustment
          ), this._error = "", await this._load(!1);
        } catch (t) {
          this._error = this._errorMessage(t);
        } finally {
          this._manualRunning = !1;
        }
      }
    }, this._addDraftZone = (t) => {
      if (!this._draft) return;
      const e = t.target;
      e.value && (this._patchDraft({
        zones: [
          ...this._draft.zones,
          {
            entity_id: e.value,
            duration_minutes: 15,
            duration_mode: "reference"
          }
        ]
      }), e.value = "");
    }, this._saveDraft = async (t) => {
      if (t.preventDefault(), !(!this.hass || !this._draft)) {
        if (this._draft = O(this._draft), !this._draft.weekdays.length) {
          this._error = "Legalább egy napot válassz ki.";
          return;
        }
        if (!this._draft.zones.length) {
          this._error = "Adj legalább egy zónát a programhoz.";
          return;
        }
        if (this._isSmartProgram(this._draft)) {
          if (!this._draft.window_start_time || !this._draft.window_end_time) {
            this._error = "Add meg az öntözési időablak elejét és végét.";
            return;
          }
          const e = this._windowDurationMinutes(this._draft);
          if (e === 0) {
            this._error = "Az időablak kezdete és vége nem lehet azonos.";
            return;
          }
          if (e < ot) {
            this._error = `Az öntözési időablak legalább ${ot} perces legyen.`;
            return;
          }
          if (e > ie) {
            this._error = "Az öntözési időablak legfeljebb 18 órás lehet.";
            return;
          }
        }
        this._saving = !0, this._error = "";
        try {
          const e = await U(this.hass, this._draft);
          await this._load(!1), this._draft = E(e);
        } catch (e) {
          this._error = this._errorMessage(e);
        } finally {
          this._saving = !1;
        }
      }
    }, this._deleteDraft = async () => {
      if (!this.hass || !this._draft) return;
      if (!this._summary?.programs.some(
        (e) => e.program_id === this._draft.program_id
      )) {
        this._draft = null;
        return;
      }
      try {
        await Ut(this.hass, this._draft.program_id), this._draft = null, await this._load(!1), this._selectFirstProgram();
      } catch (e) {
        this._error = this._errorMessage(e);
      }
    }, this._runDraft = async (t) => {
      if (this.hass) {
        this._saving = !0, this._error = "";
        try {
          const e = await Vt(this.hass, t);
          this._draft = E(e), await this._load(!1);
        } catch (e) {
          this._error = this._errorMessage(e);
        } finally {
          this._saving = !1;
        }
      }
    }, this._quickToggleProgram = async (t) => {
      if (this.hass)
        try {
          await U(this.hass, { ...t, enabled: !t.enabled }), await this._load(!1);
        } catch (e) {
          this._error = this._errorMessage(e);
        }
    }, this._startZone = async (t) => {
      if (this.hass)
        try {
          await Jt(
            this.hass,
            t.entity_id,
            this._zoneDurations[t.entity_id] ?? 15
          ), await this._load(!1);
        } catch (e) {
          this._error = this._errorMessage(e);
        }
    }, this._stopAll = async () => {
      if (this.hass)
        try {
          await Gt(this.hass), await this._load(!1);
        } catch (t) {
          this._error = this._errorMessage(t);
        }
    }, this._skipCurrentZone = async (t) => {
      if (t.stopPropagation(), !!this.hass)
        try {
          await Xt(this.hass), await this._load(!1);
        } catch (e) {
          this._error = this._errorMessage(e);
        }
    }, this._toggleAutomation = async () => {
      if (!(!this.hass || !this._summary))
        try {
          await qt(this.hass, !this._summary.automation_enabled), await this._load(!1);
        } catch (t) {
          this._error = this._errorMessage(t);
        }
    }, this._copyNtfyLink = async () => {
      const t = this._summary?.settings.ntfy_link;
      if (t)
        try {
          await navigator.clipboard.writeText(t), this._ntfyCopied = !0, window.setTimeout(() => {
            this._ntfyCopied = !1;
          }, 1600);
        } catch {
          this._error = "Nem sikerült automatikusan másolni. Jelöld ki a linket a mezőben.";
        }
    }, this._saveSettings = async () => {
      if (!(!this.hass || !this._summary || this._settingsSaving)) {
        this._settingsSaving = !0, this._settingsSaved = !1;
        try {
          await Ot(this.hass, this._summary.settings), await Kt(
            this.hass,
            this._allZones().map((t) => t.profile)
          ), await this._load(!1), this._settingsSaved = !0, this._error = "";
        } catch (t) {
          this._error = this._errorMessage(t);
        } finally {
          this._settingsSaving = !1;
        }
      }
    }, this._searchRainStations = async () => {
      if (!this.hass || !this._summary || this._rainStationSearching) return;
      const t = this._summary.settings.rain_station_city.trim();
      if (!(t.length < 2)) {
        this._rainStationSearching = !0;
        try {
          const e = await Wt(this.hass, t);
          if (this._rainStationMatches = e.stations, !e.stations.length) {
            this._error = `Nem található Időkép automata „${t}” közelében.`;
            return;
          }
          const s = e.stations.find(
            (a) => a.station_id === this._summary?.settings.rain_station_id
          ) ?? e.stations[0];
          if (!s) return;
          this._patchSettings({
            rain_station_id: s.station_id,
            rain_station_name: s.location
          }), this._error = "";
        } catch (e) {
          this._error = this._errorMessage(e);
        } finally {
          this._rainStationSearching = !1;
        }
      }
    }, this._pauseDay = async () => {
      if (!this.hass) return;
      const t = new Date(Date.now() + 1440 * 60 * 1e3).toISOString();
      await nt(this.hass, t), await this._load(!1);
    }, this._resume = async () => {
      this.hass && (await nt(this.hass, null), await this._load(!1));
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
      _hourlyForecast: { state: !0 },
      _forecastLoading: { state: !0 },
      _bulkMoistureSensor: { state: !0 },
      _settingsSaving: { state: !0 },
      _settingsSaved: { state: !0 },
      _ntfyCopied: { state: !0 },
      _rainStationSearching: { state: !0 },
      _rainStationMatches: { state: !0 },
      _runExpanded: { state: !0 },
      _now: { state: !0 },
      _manualDraft: { state: !0 },
      _manualRunning: { state: !0 }
    };
  }
  static {
    this.styles = ee;
  }
  connectedCallback() {
    super.connectedCallback(), this._load(!0), this._timer = window.setInterval(() => {
      this._tab !== "settings" && this._tab !== "schedule" && this._tab !== "forecast" && this._load(!1);
    }, 5e3), this._clockTimer = window.setInterval(() => {
      this._now = Date.now();
    }, 1e3);
  }
  disconnectedCallback() {
    this._timer && window.clearInterval(this._timer), this._clockTimer && window.clearInterval(this._clockTimer), super.disconnectedCallback();
  }
  render() {
    return n`
      <div class="shell" ?dark=${this.hass?.themes?.darkMode}>
        <header class="topbar">
          <ha-icon icon="mdi:water"></ha-icon>
          <h1>Öntözés</h1>
        </header>
        <nav class="tabs" aria-label="Öntözés nézetek">
          ${this._tabButton("overview", "Áttekintés")}
          ${this._tabButton("forecast", "Órás előrejelzés")}
          ${this._tabButton("schedule", "Következő 3 nap")}
          ${this._tabButton("programs", "Programok")}
          ${this._tabButton("manual", "Kézi program")}
          ${this._tabButton("history", "Előzmények")}
          ${this._tabButton("settings", "Beállítások")}
        </nav>
        <main class="content">
          ${this._loading && !this._summary ? n`<div class="loading">Az öntözésvezérlő betöltése…</div>` : this._error && !this._summary ? n`<div class="error">${this._error}</div>` : this._renderTab()}
        </main>
        ${this._summary?.active_run ? this._renderActiveRun() : c}
      </div>
    `;
  }
  _tabButton(t, e) {
    return n`
      <button
        class="tab"
        ?selected=${this._tab === t}
        aria-current=${this._tab === t ? "page" : c}
        @click=${() => {
      this._tab = t, t === "programs" && !this._draft && this._selectFirstProgram(), t === "schedule" && this._loadSchedule(), t === "forecast" && this._loadHourlyForecast();
    }}
      >
        ${e}
      </button>
    `;
  }
  _renderTab() {
    if (!this._summary) return n``;
    switch (this._tab) {
      case "programs":
        return this._renderPrograms();
      case "schedule":
        return this._renderSchedule();
      case "forecast":
        return this._renderHourlyForecast();
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
    const t = this._summary, e = t.weather, s = t.automation_enabled, a = t.next_run_plan?.scheduled_at ?? t.next_run;
    return n`
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

      ${this._renderWeather(e)}

      <div class="next-run">
        <ha-icon icon="mdi:clock-outline"></ha-icon>
        ${a ? n`
              <span>Következő:</span>
              <span class="linklike">${this._nextProgramName()}</span>
              <span>
                · ${this._formatRelative(a)}${t.next_run_plan?.planned_end_at ? `–${this._formatTime(t.next_run_plan.planned_end_at)}` : ""}
              </span>
            ` : n`<span>Nincs következő engedélyezett program</span>`}
      </div>

      <div class="overview-grid">
        <div class="controllers">
          ${t.controllers.length ? t.controllers.map((r) => this._renderController(r)) : n`<div class="empty">Nincs konfigurált Yardian zóna.</div>`}
        </div>
        <aside class="rail">
          <div class="rail-title">
            <span>Programok</span>
            <button class="text-action" type="button" @click=${this._newProgram}>
              + Hozzáadás
            </button>
          </div>
          ${t.programs.length ? t.programs.slice(0, 3).map((r) => this._renderRailProgram(r)) : n`<div class="empty">Még nincs program.</div>`}
          ${this._renderCompactHistory(t.history[0])}
        </aside>
      </div>

      ${t.active_run ? c : n`
            <button class="button danger stop-all" @click=${this._stopAll}>
              <ha-icon icon="mdi:stop"></ha-icon>
              Minden leállítása
            </button>
          `}
    `;
  }
  _renderActiveRun() {
    const t = this._summary.active_run, e = Math.max(0, t.current_index ?? 0), s = t.zones[e - 1], a = t.zones[e], r = t.zones[e + 1], o = this._remainingSeconds(t.zone_ends_at), l = t.zones.slice(e + 1).reduce((u, m) => u + m.planned_minutes * 60, 0), d = o + l, p = Math.max(1, t.total_minutes * 60), h = Math.max(
      0,
      Math.min(100, (p - d) / p * 100)
    );
    return n`
      <aside class="active-run" ?expanded=${this._runExpanded}>
        ${this._runExpanded ? n`
              <div class="active-run-detail">
                <div class="active-run-detail-head">
                  <div>
                    <span>Aktuális program</span>
                    <strong>${t.program_name}</strong>
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
                  <div><span>Aktuális kör</span><strong>${this._clock(o)}</strong></div>
                  <div><span>Program vége</span><strong>${this._clock(d)}</strong></div>
                </div>
                <div class="run-sequence">
                  ${this._runStep("Előző", s)}
                  ${this._runStep("Aktuális", a, !0)}
                  ${this._runStep("Következő", r)}
                </div>
              </div>
            ` : c}
        <button
          class="active-run-summary"
          aria-expanded=${this._runExpanded}
          @click=${() => this._runExpanded = !this._runExpanded}
        >
          <span class="run-pulse"></span>
          <span>
            <strong>${t.program_name}</strong>
            <small>${a?.name ?? "Indítás…"} · ${this._clock(o)}</small>
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
  _runStep(t, e, s = !1) {
    return n`
      <div class="run-step" ?active=${s} ?empty=${!e}>
        <span>${t}</span>
        <strong>${e?.name ?? "—"}</strong>
        <small>${e ? `${e.planned_minutes} perc` : ""}</small>
      </div>
    `;
  }
  _remainingSeconds(t) {
    return t ? Math.max(0, Math.ceil((new Date(t).getTime() - this._now) / 1e3)) : 0;
  }
  _clock(t) {
    const e = Math.floor(t / 60);
    return `${String(e).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  }
  _renderWeather(t) {
    if (!t)
      return n`
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
    const e = t.percent ?? 0, s = e === 0 ? "kihagyás" : e < 80 ? "csökkentett öntözés" : e > 120 ? "emelt öntözés" : "mérsékelt öntözés";
    return n`
      <section class="weather-band">
        <div class="weather-summary">
          <ha-icon icon=${e === 0 ? "mdi:weather-rainy" : "mdi:weather-partly-cloudy"}></ha-icon>
          <div>
            <div class="decision">Ma ${e}% · ${s}</div>
            <div class="weather-reason">${t.reason}</div>
          </div>
        </div>
        ${this._metric(
      "mdi:cup-water",
      "Elmúlt 24 óra",
      t.rain_station ? `${t.observed_precipitation_mm ?? 0} mm` : "Nincs állomás"
    )}
        ${this._metric("mdi:weather-rainy", "Várható eső", `${t.precipitation_mm ?? 0} mm`)}
        ${this._metric("mdi:water-percent", "Esély", `${t.max_probability ?? 0}%`)}
        ${this._metric("mdi:white-balance-sunny", "Napos órák", `${t.sunny_hours ?? 0}`, "sun")}
        ${this._metric(
      "mdi:water-thermometer-outline",
      "Párolgás",
      t.adjusted_et0_mm === null || t.adjusted_et0_mm === void 0 ? "nincs adat" : `${this._formatForecastNumber(t.adjusted_et0_mm)} mm`,
      "et"
    )}
        ${this._metric("mdi:weather-windy", "Szél max.", this._formatWeatherWind(t), "wind")}
        ${this._metric("mdi:thermometer", "Maximum", `${t.max_temperature ?? 0} °C`, "temp")}
      </section>
    `;
  }
  _metric(t, e, s, a = "") {
    return n`
      <div class="metric ${a}">
        <ha-icon icon=${t}></ha-icon>
        <span class="metric-label">${e}</span>
        <span class="metric-value">${s}</span>
      </div>
    `;
  }
  _renderController(t) {
    const s = !window.matchMedia("(max-width: 600px)").matches || this._expandedControllers.includes(t.id), a = this._controllerStatus(t);
    return n`
      <section class="controller" ?collapsed=${!s}>
        <button
          class="controller-head"
          aria-expanded=${s}
          @click=${() => this._toggleController(t.id)}
        >
          <div class="controller-mark"><ha-icon icon="mdi:sprinkler-variant"></ha-icon></div>
          <div>
            <div class="controller-name">${t.name}</div>
            <div class="controller-meta">
              ${t.model} ·
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
        ${t.zones.map((r) => this._renderZone(r))}
      </section>
    `;
  }
  _renderZone(t) {
    const e = this._zoneDurations[t.entity_id] ?? 15, s = t.state === "on", a = this._summary?.active_run?.current_zone === t.entity_id, r = Number(this._summary?.active_run?.current_duration ?? e), o = this._headLabel(t.profile.head_type), l = this._zoneIssueLabel(t);
    return n`
      <div class="zone-row">
        <ha-icon icon="mdi:water"></ha-icon>
        <span class="zone-name">${t.name}</span>
        <span
          class="zone-state"
          ?running=${s}
          ?unavailable=${!t.available}
          title=${t.availability_issue ?? t.entity_id}
        >
          ${s ? a ? `Fut · ${r} perc` : "Fut" : t.available ? `Tétlen · ${o}` : n`Nem elérhető <small>${l}</small>`}
        </span>
        <label class="duration">
          <input
            type="number"
            min="1"
            max="180"
            .value=${String(e)}
            aria-label="${t.name} időtartama percben"
            @change=${(d) => {
      const p = d.target;
      this._zoneDurations = {
        ...this._zoneDurations,
        [t.entity_id]: this._clampDuration(p.valueAsNumber)
      };
    }}
          />
          <span>perc</span>
        </label>
        <button
          class="button"
          ?disabled=${!t.available || s}
          @click=${() => this._startZone(t)}
        >
          <ha-icon icon="mdi:play"></ha-icon>
          Indítás
        </button>
      </div>
    `;
  }
  _controllerStatus(t) {
    const e = t.zone_count ?? t.zones.length, s = t.available_zone_count ?? t.zones.filter((a) => a.available).length;
    return e === 0 ? { label: "Nincs zóna", className: "offline" } : s === e ? { label: "Online", className: "online" } : s === 0 ? { label: "Nincs elérhető zóna", className: "offline" } : { label: `${s}/${e} zóna elérhető`, className: "partial" };
  }
  _zoneIssueLabel(t) {
    return t.state === "missing" ? "HA state hiányzik" : t.state === "unavailable" ? "HA: unavailable" : t.availability_issue ?? `HA: ${t.state}`;
  }
  _renderRailProgram(t) {
    const e = this._programMinutes(t), s = this._isSmartProgram(t);
    return n`
      <div class="program-rail-item">
        <div class="program-line">
          <ha-icon
            icon=${s ? "mdi:calendar-clock" : t.start_time < "12:00" ? "mdi:weather-sunset-up" : "mdi:weather-night"}
          ></ha-icon>
          <strong>${t.name}</strong>
          <button
            class="toggle"
            ?on=${t.enabled}
            aria-label="${t.name} engedélyezése"
            @click=${() => this._quickToggleProgram(t)}
          ></button>
        </div>
        <div class="program-details">
          <div>Napok: ${this._formatDays(t.weekdays)}</div>
          <div>
            ${s ? `Időablak: ${this._programWindowLabel(t)}` : `Kezdés: ${t.start_time}`}
          </div>
          ${t.temperature_condition_enabled ? n`<div>${this._temperatureConditionText(t)}</div>` : c}
          <div>${s ? "Jelenlegi becslés" : "Számított öntözési idő"}: ${e} perc</div>
        </div>
      </div>
    `;
  }
  _renderCompactHistory(t) {
    return n`
      <div class="history-compact">
        <div class="history-compact-title">Legutóbbi események</div>
        ${t ? n`
              <div>${this._formatDateTime(t.scheduled_at)} · ${t.program_name}</div>
              <div class="history-reason">${t.reason}</div>
            ` : n`<div class="subtle">Még nincs futási előzmény.</div>`}
      </div>
    `;
  }
  _renderHourlyForecast() {
    const t = this._hourlyForecast, e = t ? this._groupForecastDays(t.hours) : [];
    return n`
      <div class="page-head">
        <div>
          <h2>Órás előrejelzés</h2>
          <div class="subtle">
            Az öntözési döntésekhez használt, javított napbesorolású Időkép-adatok.
          </div>
        </div>
        <button
          class="button quiet"
          @click=${this._loadHourlyForecast}
          ?disabled=${this._forecastLoading}
        >
          ${this._forecastLoading ? "Frissítés…" : "Frissítés"}
        </button>
      </div>
      ${this._forecastLoading && !t ? n`<div class="loading">Időkép-előrejelzés betöltése…</div>` : t ? n`
              <div class="forecast-source">
                <span>Forrás: ${t.source}</span>
                <span>Frissítve: ${this._formatDateTime(t.generated_at)}</span>
              </div>
              <div class="forecast-days">
                ${e.map(
      (s, a) => n`
                    <section class="forecast-day">
                      <div class="forecast-day-head">
                        <strong>${this._formatForecastDate(s.date, a)}</strong>
                        <span>${s.hours.length} óra</span>
                      </div>
                      <div class="forecast-table-head" aria-hidden="true">
                        <span>Idő</span>
                        <span>Időjárás</span>
                        <span>Hőmérséklet</span>
                        <span>Csapadék</span>
                        <span>Esély</span>
                        <span>Szél</span>
                      </div>
                      ${s.hours.map((r) => this._renderForecastHour(r))}
                    </section>
                  `
    )}
              </div>
            ` : n`<div class="empty">Az órás Időkép-előrejelzés nem érhető el.</div>`}
      ${this._error ? n`<div class="error">${this._error}</div>` : c}
    `;
  }
  _renderForecastHour(t) {
    const e = t.precipitation_mm > 0 || t.precipitation_probability >= 50, s = (t.wind_speed_kmh ?? 0) >= 30 || (t.wind_gust_kmh ?? 0) >= 45;
    return n`
      <article class="forecast-hour" ?raining=${e} ?windy=${s}>
        <time>${this._formatTime(t.timestamp)}</time>
        <div class="forecast-condition">
          <ha-icon icon=${this._forecastConditionIcon(t.condition)}></ha-icon>
          <span>${this._forecastConditionLabel(t.condition)}</span>
        </div>
        <div class="forecast-metric temperature">
          <span>Hőmérséklet</span>
          <strong>${this._formatForecastNumber(t.temperature)} °C</strong>
        </div>
        <div class="forecast-metric precipitation">
          <span>Csapadék</span>
          <strong>${this._formatForecastNumber(t.precipitation_mm)} mm</strong>
        </div>
        <div class="forecast-metric probability">
          <span>Esély</span>
          <strong>${t.precipitation_probability}%</strong>
        </div>
        <div class="forecast-metric wind">
          <span>Szél</span>
          <strong>${this._formatForecastWind(t)}</strong>
        </div>
      </article>
    `;
  }
  _renderSchedule() {
    const t = this._schedulePreview;
    return n`
      <div class="page-head">
        <div>
          <h2>Következő 3 nap</h2>
          <div class="subtle">
            A rögzített programok a megadott időben, az automatikus programok
            az időablak legkedvezőbb részében futnak. A terv az előrejelzéssel
            változhat.
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
      ${this._scheduleLoading && !t ? n`<div class="loading">Háromnapos programterv számítása…</div>` : t ? n`
              <div class="schedule-days">
                ${t.days.map((e, s) => n`
                  <section class="schedule-day">
                    <div class="schedule-day-head">
                      <strong>${this._formatScheduleDate(e.date, s)}</strong>
                      <span>${e.programs.length} program</span>
                    </div>
                    ${e.programs.length ? e.programs.map(
      (a) => this._renderScheduleProgram(a)
    ) : n`
                          <div class="schedule-empty">
                            Nincs hátralévő engedélyezett program.
                          </div>
                        `}
                  </section>
                `)}
              </div>
              <div class="schedule-generated">
                Utolsó számítás: ${this._formatDateTime(t.generated_at)}
              </div>
            ` : n`<div class="empty">A háromnapos előnézet nem érhető el.</div>`}
      ${this._error ? n`<div class="error">${this._error}</div>` : c}
    `;
  }
  _renderScheduleProgram(t) {
    const e = t.status === "will_run" && t.planning_status !== "smart_waiting_forecast" && t.planning_status !== "smart_no_fit", s = this._isSmartScheduleProgram(t), a = t.selection_reason?.trim(), r = t.planning_status === "smart_no_fit" ? "smart_no_fit" : t.planning_status === "smart_waiting_forecast" ? "smart_waiting_forecast" : t.status;
    return n`
      <article class="schedule-program" ?runnable=${e}>
        <div class="schedule-program-head">
          <time>${this._scheduleProgramTime(t)}</time>
          <strong>${t.program_name}</strong>
          <span class="schedule-status ${r}">
            ${this._scheduleStatusLabel(t)}
          </span>
        </div>
        <div class="schedule-reason">${t.reason}</div>
        ${s && t.window_start_at && t.window_end_at ? n`
              <div class="schedule-plan">
                <ha-icon icon="mdi:calendar-clock"></ha-icon>
                <span>
                  Időablak:
                  ${this._formatScheduleRange(
      t.window_start_at,
      t.window_end_at
    )}
                </span>
              </div>
            ` : c}
        ${a && a !== t.reason ? n`<div class="schedule-selection-reason">${a}</div>` : c}
        ${t.weather ? n`
              <div class="schedule-weather">
                <span>${t.weather.max_temperature ?? "–"} °C max.</span>
                <span>${t.weather.precipitation_mm ?? 0} mm várható</span>
                ${t.weather.observed_precipitation_mm ? n`
                      <span>
                        ${t.weather.observed_precipitation_mm} mm mért / 24 óra
                      </span>
                    ` : c}
                ${t.weather.max_wind_speed_kmh !== null && t.weather.max_wind_speed_kmh !== void 0 ? n`
                      <span>
                        Szél: ${this._formatWeatherWind(t.weather)}
                      </span>
                    ` : c}
                ${t.weather.adjusted_et0_mm !== null && t.weather.adjusted_et0_mm !== void 0 ? n`
                      <span>
                        Párolgás:
                        ${this._formatForecastNumber(t.weather.adjusted_et0_mm)} mm
                      </span>
                    ` : c}
                <span>Forrás: ${t.weather.source}</span>
              </div>
            ` : c}
        <div class="schedule-zones">
          ${t.zones.map(
      (o) => n`
              <div>
                <span class="schedule-zone-name">
                  <span>${o.name}</span>
                  ${o.moisture_percent !== null && o.moisture_percent !== void 0 ? n`
                        <small>
                          Talaj ${this._formatForecastNumber(o.moisture_percent)}% ·
                          ${o.moisture_action === "skip" ? "kimarad" : `${Math.round((o.moisture_factor ?? 1) * 100)}% idő`}
                        </small>
                      ` : o.moisture_action === "unavailable" ? n`<small>Talaj: nincs használható szenzoradat</small>` : o.moisture_action === "not_configured" ? n`<small>Talaj: nincs szenzor rendelve</small>` : c}
                </span>
                <strong>
                  ${o.planned_minutes === null ? "nincs adat" : `${o.planned_minutes} perc`}
                </strong>
              </div>
            `
    )}
        </div>
        <div class="schedule-total">
          <span>Összesen</span>
          <strong>
            ${t.total_minutes === null ? "nem számítható" : `${t.total_minutes} perc`}
          </strong>
        </div>
      </article>
    `;
  }
  _renderManualProgram() {
    const t = this._manualDraft, e = this._allZones();
    return n`
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
      (s) => n`<option value=${s.program_id}>${s.name}</option>`
    )}
            </select>
          </label>
          <label class="field">
            <span class="field-label">Kézi program neve</span>
            <input
              type="text"
              maxlength="64"
              .value=${t.name}
              @input=${(s) => this._patchManual({
      name: s.target.value
    })}
            />
          </label>
          <div class="manual-adjustments">
            <label class="manual-weather">
              <input
                type="checkbox"
                .checked=${t.weather_adjustment}
                @change=${(s) => this._patchManual({
      weather_adjustment: s.target.checked
    })}
              />
              Időjárás-korrekció
            </label>
            <label class="manual-weather">
              <input
                type="checkbox"
                .checked=${t.soil_moisture_enabled}
                @change=${(s) => this._patchManual({
      soil_moisture_enabled: s.target.checked
    })}
              />
              Talajnedvesség-korrekció
            </label>
          </div>
        </div>
        <div class="manual-zone-list">
          ${t.zones.map((s, a) => {
      const r = e.find(
        (o) => o.entity_id === s.entity_id
      );
      return n`
              <div class="manual-zone">
                <span class="manual-zone-order">${a + 1}</span>
                <strong>${r?.name ?? s.entity_id}</strong>
                <select
                  aria-label="${r?.name ?? s.entity_id} számítási módja"
                  .value=${s.duration_mode}
                  @change=${(o) => this._updateManualZone(a, {
        ...s,
        duration_mode: o.target.value
      })}
                >
                  <option value="manual">Rögzített alapidő</option>
                  <option value="reference">Automatikusan számított</option>
                </select>
                <label class="manual-duration">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    ?disabled=${s.duration_mode === "reference"}
                    .value=${String(s.duration_minutes)}
                    @change=${(o) => this._updateManualZone(a, {
        ...s,
        duration_minutes: this._clampDuration(
          o.target.valueAsNumber
        )
      })}
                  />
                  <span>perc</span>
                </label>
                <span class="manual-calculated">
                  ${this._programZoneMinutes(t, s)} perc
                  ${this._programZoneMoistureText(t, s)}
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
                    ?disabled=${a === t.zones.length - 1}
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
          ${t.zones.length ? c : n`<div class="empty">Adj hozzá legalább egy öntözési kört.</div>`}
        </div>
        <div class="manual-add">
          <label class="field">
            <span class="field-label">Kör hozzáadása</span>
            <select @change=${this._addManualZone}>
              <option value="">Válassz zónát…</option>
              ${e.filter(
      (s) => !t.zones.some(
        (a) => a.entity_id === s.entity_id
      )
    ).map(
      (s) => n`<option value=${s.entity_id}>${s.name}</option>`
    )}
            </select>
          </label>
          <div class="manual-total">
            <span>Várható teljes idő</span>
            <strong>${this._programMinutes(t)} perc</strong>
          </div>
          <button
            class="button primary manual-start"
            ?disabled=${this._manualRunning || !t.zones.length || !!this._summary.active_run}
            @click=${this._runManualDraft}
          >
            <ha-icon icon="mdi:play"></ha-icon>
            ${this._summary.active_run ? "Már fut egy program" : this._manualRunning ? "Indítás…" : "Kézi program indítása"}
          </button>
        </div>
        ${this._error ? n`<div class="error">${this._error}</div>` : c}
      </section>
    `;
  }
  _renderPrograms() {
    const t = this._summary.programs, e = this._draft;
    return n`
      <div class="page-head">
        <h2>Programok</h2>
        <button class="button primary" type="button" @click=${this._newProgram}>
          <ha-icon icon="mdi:plus"></ha-icon>
          Új program
        </button>
      </div>
      <div class="program-workspace">
        <div class="program-list">
          ${t.length ? t.map(
      (s) => n`
                  <button
                    class="program-list-item"
                    ?selected=${e?.program_id === s.program_id}
                    @click=${() => {
        this._draft = E(s);
      }}
                  >
                    <strong>${s.name}</strong>
                    <span>${s.enabled ? "Aktív" : "Kikapcsolva"}</span>
                    <span>
                      ${this._formatDays(s.weekdays)} ·
                      ${this._isSmartProgram(s) ? `Automatikus · ${this._programWindowLabel(s)}` : `Rögzített · ${s.start_time}`}
                    </span>
                    <span>${this._programMinutes(s)} perc</span>
                  </button>
                `
    ) : n`<div class="empty">Hozd létre az első öntözési programot.</div>`}
        </div>
        ${e ? this._renderProgramEditor(e) : n`<div class="empty">Válassz egy programot.</div>`}
      </div>
    `;
  }
  _renderProgramEditor(t) {
    const e = this._allZones(), s = this._isSmartProgram(t), a = this._windowDurationMinutes(t), r = this._programMinutes(t), o = s && t.zones.length > 0 && a > 0 && r > a;
    return n`
      <form class="editor" @submit=${this._saveDraft}>
        <div class="field">
          <label for="program-name">Program neve</label>
          <input
            id="program-name"
            type="text"
            maxlength="64"
            required
            .value=${t.name}
            @input=${(l) => this._patchDraft({ name: l.target.value })}
          />
        </div>
        <div class="field">
          <span class="field-label">Napok</span>
          <div class="days">
            ${se.map(
      (l, d) => n`
                <button
                  class="day"
                  type="button"
                  ?selected=${t.weekdays.includes(d)}
                  aria-pressed=${t.weekdays.includes(d)}
                  @click=${() => this._toggleDay(d)}
                >
                  ${l}
                </button>
              `
    )}
          </div>
        </div>
        <fieldset class="schedule-mode-field">
          <legend>Indítás módja</legend>
          <div class="schedule-mode-options">
            <label class="schedule-mode-option" ?selected=${s}>
              <input
                type="radio"
                name="program-schedule-mode"
                value="smart_window"
                .checked=${s}
                @change=${(l) => {
      l.target.checked && this._patchDraft({ schedule_mode: "smart_window" });
    }}
              />
              <span>
                <strong>Automatikus időablak</strong>
                <small>A rendszer választja ki a megfelelő időpontot.</small>
              </span>
            </label>
            <label class="schedule-mode-option" ?selected=${!s}>
              <input
                type="radio"
                name="program-schedule-mode"
                value="fixed"
                .checked=${!s}
                @change=${(l) => {
      l.target.checked && this._patchDraft({ schedule_mode: "fixed" });
    }}
              />
              <span>
                <strong>Fix időpont</strong>
                <small>A program mindig a megadott kezdési időben indul.</small>
              </span>
            </label>
          </div>
        </fieldset>
        ${s ? n`
              <div class="watering-window">
                <div class="field">
                  <label for="program-window-start">Öntözhet ettől</label>
                  <input
                    id="program-window-start"
                    type="time"
                    required
                    aria-describedby="program-window-help"
                    .value=${t.window_start_time}
                    @input=${(l) => this._patchDraft({
      window_start_time: l.target.value
    })}
                  />
                </div>
                <div class="field">
                  <label for="program-window-end">Legkésőbb eddig fejezze be</label>
                  <input
                    id="program-window-end"
                    type="time"
                    required
                    aria-describedby="program-window-help"
                    .value=${t.window_end_time}
                    @input=${(l) => this._patchDraft({
      window_end_time: l.target.value
    })}
                  />
                </div>
              </div>
              <p class="window-help" id="program-window-help">
                A teljes program az időablakon belül fut le. Ha a zárási idő
                korábbi, az ablak másnap ér véget. Az időpont az előrejelzés
                változásával módosulhat.
              </p>
              ${o ? n`
                    <div class="window-fit-warning" role="status">
                      <ha-icon icon="mdi:alert-outline"></ha-icon>
                      <span>
                        A jelenlegi becslés ${r} perc, az időablak
                        ${a} perc. Ha a tényleges program nem fér
                        bele, a rendszer nem indít részleges öntözést.
                      </span>
                    </div>
                  ` : t.zones.length > 0 && a > 0 ? n`
                      <div class="window-capacity">
                        Jelenlegi becslés: ${r} perc a
                        ${a} perces időablakban.
                      </div>
                    ` : c}
            ` : n`
              <div class="field">
                <label for="program-start">Kezdés</label>
                <input
                  id="program-start"
                  type="time"
                  required
                  .value=${t.start_time}
                  @input=${(l) => this._patchDraft({
      start_time: l.target.value
    })}
                />
                <div class="field-help">
                  A szélvédelem szükség esetén ezt az indítást továbbra is
                  halaszthatja.
                </div>
              </div>
            `}
        <div class="checkline">
          <input
            id="program-enabled"
            type="checkbox"
            .checked=${t.enabled}
            @change=${(l) => this._patchDraft({ enabled: l.target.checked })}
          />
          <label for="program-enabled">Program engedélyezve</label>
        </div>
        <div class="checkline">
          <input
            id="program-weather"
            type="checkbox"
            .checked=${t.weather_adjustment}
            @change=${(l) => this._patchDraft({
      weather_adjustment: l.target.checked
    })}
          />
          <label for="program-weather">Időjárás-korrekció használata</label>
        </div>
        <div class="checkline">
          <input
            id="program-temperature-condition"
            type="checkbox"
            .checked=${t.temperature_condition_enabled}
            @change=${(l) => this._patchDraft({
      temperature_condition_enabled: l.target.checked
    })}
          />
          <label for="program-temperature-condition">
            Hőmérséklet-feltétel használata
          </label>
        </div>
        ${t.temperature_condition_enabled ? n`
              <div class="temperature-condition">
                <span>A program napjának maximuma</span>
                <select
                  aria-label="Hőmérséklet összehasonlítása"
                  .value=${t.temperature_condition_operator}
                  @change=${(l) => this._patchDraft({
      temperature_condition_operator: l.target.value
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
                    .value=${String(t.temperature_condition_value)}
                    @change=${(l) => this._patchDraft({
      temperature_condition_value: Math.max(
        -30,
        Math.min(
          60,
          l.target.valueAsNumber
        )
      )
    })}
                  />
                  <span>°C</span>
                </label>
              </div>
            ` : c}
        <div class="checkline">
          <input
            id="program-soil-moisture"
            type="checkbox"
            .checked=${t.soil_moisture_enabled}
            @change=${(l) => this._patchDraft({
      soil_moisture_enabled: l.target.checked
    })}
          />
          <label for="program-soil-moisture">
            A zónák talajnedvességmérőinek használata
          </label>
        </div>
        ${t.soil_moisture_enabled ? n`
              <div class="subtle">
                ${t.zones.filter(
      (l) => this._zoneProfile(l.entity_id)?.moisture_sensor_entity_id
    ).length}
                programzónához van érzékelő rendelve. A nedves zónák rövidebb
                ideig futnak, a kihagyási küszöb felett pedig kimaradnak.
              </div>
            ` : c}
        <div class="field">
          <span class="field-label">Zónák sorrendben</span>
          <div class="editor-zones">
            ${t.zones.map((l, d) => {
      const p = e.find((h) => h.entity_id === l.entity_id);
      return n`
                <div class="editor-zone">
                  <span>${p?.name ?? l.entity_id}</span>
                  <select
                    aria-label="${p?.name ?? l.entity_id} időtartam módja"
                    .value=${l.duration_mode}
                    @change=${(h) => this._updateDraftZone(d, {
        ...l,
        duration_mode: h.target.value
      })}
                  >
                    <option value="manual">Rögzített alapidő</option>
                    <option value="reference">Automatikusan számított</option>
                  </select>
                  ${l.duration_mode === "reference" ? n`
                        <span class="calculated-duration">
                          ≈ ${this._programZoneMinutes(t, l)} perc
                          ${this._programZoneMoistureText(t, l)}
                        </span>
                      ` : n`
                        <label class="editor-duration">
                          <input
                            type="number"
                            min="1"
                            max="180"
                            aria-label="${p?.name ?? l.entity_id} időtartama"
                            .value=${String(l.duration_minutes)}
                            @change=${(h) => this._updateDraftZone(d, {
        ...l,
        duration_minutes: this._clampDuration(
          h.target.valueAsNumber
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
                    @click=${() => this._removeDraftZone(d)}
                  >
                    <ha-icon icon="mdi:close"></ha-icon>
                  </button>
                </div>
              `;
    })}
            ${t.zones.length === 0 ? n`<div class="empty">Adj legalább egy zónát a programhoz.</div>` : c}
          </div>
        </div>
        <div class="field">
          <label for="zone-add">Zóna hozzáadása</label>
          <select id="zone-add" @change=${this._addDraftZone}>
            <option value="">Válassz zónát…</option>
            ${e.filter((l) => !t.zones.some((d) => d.entity_id === l.entity_id)).map((l) => n`<option value=${l.entity_id}>${l.name}</option>`)}
          </select>
        </div>
        ${this._error ? n`<div class="error">${this._error}</div>` : c}
        <div class="editor-actions">
          <button class="button danger" type="button" @click=${this._deleteDraft}>
            Törlés
          </button>
          <div>
            <button
              class="button quiet"
              type="button"
              @click=${() => this._runDraft(t)}
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
    const t = this._summary.history;
    return n`
      <div class="page-head"><h2>Előzmények</h2></div>
      ${t.length ? n`
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
                  ${t.map(
      (e) => n`
                      <tr>
                        <td>${this._formatDateTime(e.scheduled_at)}</td>
                        <td>${e.program_name}</td>
                        <td>
                          <span class="outcome ${e.outcome}">
                            ${this._outcomeLabel(e.outcome)}
                          </span>
                        </td>
                        <td>${Math.round(e.factor * 100)}%</td>
                        <td>${e.weather_source}</td>
                        <td class="reason-cell">
                          <div>${e.reason}</div>
                          ${e.weather ? n`
                                <div class="history-weather">
                                  Döntéskor:
                                  ${e.weather.precipitation_mm ?? 0} mm ·
                                  ${e.weather.observed_precipitation_mm ? n`
                                        ${e.weather.observed_precipitation_mm}
                                        mm mért / 24 óra ·
                                      ` : c}
                                  ${e.weather.max_probability ?? 0}% ·
                                  ${e.weather.rainy_hours ?? 0} esős óra ·
                                  ${e.weather.max_wind_speed_kmh !== null && e.weather.max_wind_speed_kmh !== void 0 ? n`
                                        ${this._formatWeatherWind(e.weather)}
                                        szél ·
                                      ` : c}
                                  ${e.weather.max_temperature ?? "–"} °C
                                  ${e.weather.adjusted_et0_mm !== null && e.weather.adjusted_et0_mm !== void 0 ? n`
                                        · ${this._formatForecastNumber(
        e.weather.adjusted_et0_mm
      )} mm párolgás
                                      ` : c}
                                  ${e.weather.evaluated_at ? n` · ${this._formatDateTime(
        e.weather.evaluated_at
      )}` : c}
                                </div>
                              ` : c}
                          ${this._historyMoistureText(e) ? n`
                                <div class="history-weather">
                                  Talajnedvesség: ${this._historyMoistureText(e)}
                                </div>
                              ` : c}
                        </td>
                      </tr>
                    `
    )}
                </tbody>
              </table>
            </div>
          ` : n`<div class="empty">Még nincs futási előzmény.</div>`}
    `;
  }
  _renderSettings() {
    const t = this._summary.settings;
    return n`
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
          ${this._settingNumber("Kihagyás ennyi csapadéktól (mm)", "rain_skip_mm", t)}
          ${this._settingNumber(
      "Kihagyási valószínűség (%)",
      "rain_skip_probability",
      t
    )}
          ${this._settingNumber(
      "Valószínűséghez tartozó minimum eső (mm)",
      "rain_skip_probability_mm",
      t
    )}
          ${this._settingNumber("Esős órák száma kihagyáshoz", "rainy_hours_skip", t)}
          ${this._settingNumber(
      "Erős csökkentés küszöbe (mm)",
      "rain_reduce_high_mm",
      t
    )}
          ${this._settingNumber(
      "Enyhe csökkentés küszöbe (mm)",
      "rain_reduce_low_mm",
      t
    )}
        </section>
        <section class="settings-section">
          <h3>Párolgás alapú számítás</h3>
          <div class="setting-row">
            <span>Hargreaves–Samani ET használata</span>
            <button
              class="toggle"
              ?on=${t.evapotranspiration_enabled}
              aria-label="Párolgás alapú számítás kapcsolása"
              @click=${() => this._patchSettings({
      evapotranspiration_enabled: !t.evapotranspiration_enabled
    })}
            ></button>
          </div>
          <p class="settings-help">
            Az Időkép napi hőmérsékleteiből és a Home Assistant helyének
            szélességi fokából számított ET0 értéket a felhőzet, a naposság és a szél
            finomítja. Az eső miatti kihagyás és a szélhalasztás ettől függetlenül
            továbbra is érvényes.
          </p>
          ${this._settingNumber("Referencia ET0 (mm/nap)", "et_reference_mm", t)}
          ${this._settingNumber("Gyep növényi együttható (Kc)", "et_crop_coefficient", t)}
        </section>
        <section class="settings-section">
          <h3>Talajnedvesség-korrekció</h3>
          <p class="settings-help">
            A programban engedélyezett, zónához rendelt százalékos szenzor
            módosítja az időjárás és ET alapján már kiszámolt időt. A célérték
            felett arányosan rövidít, a kihagyási küszöbtől pedig nem indítja el
            az adott zónát.
          </p>
          ${this._settingNumber("Száraz talaj küszöbe (%)", "soil_moisture_dry_percent", t)}
          ${this._settingNumber("Célérték (%)", "soil_moisture_target_percent", t)}
          ${this._settingNumber("Zóna kihagyása ettől (%)", "soil_moisture_skip_percent", t)}
          ${this._settingNumber("Maximális szárazsági szorzó", "soil_moisture_max_factor", t)}
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
              ?on=${t.notify_mobile}
              aria-label="Mobilértesítések kapcsolása"
              @click=${() => this._patchSettings({ notify_mobile: !t.notify_mobile })}
            ></button>
          </div>
          <div class="ntfy-link-row">
            <span>ntfy link</span>
            <div>
              <input
                readonly
                aria-label="ntfy értesítési link"
                .value=${t.ntfy_link || "Még nincs létrehozva"}
                @focus=${(e) => e.currentTarget.select()}
              />
              <button
                class="button quiet"
                ?disabled=${!t.ntfy_link}
                @click=${this._copyNtfyLink}
              >
                ${this._ntfyCopied ? "Másolva" : "Másolás"}
              </button>
            </div>
          </div>
          <p class="settings-help ntfy-help">
            Ez a topic a Home Assistant tárolójában marad, ezért HACS/frissítés
            után sem változik. Az ntfy appban erre a linkre iratkozz fel.
          </p>
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
        <section class="settings-section">
          <h3>Szélkorrekció</h3>
          <div class="setting-row">
            <span>Szél figyelése automata programnál</span>
            <button
              class="toggle"
              ?on=${t.wind_adjustment_enabled}
              aria-label="Szélkorrekció kapcsolása"
              @click=${() => this._patchSettings({
      wind_adjustment_enabled: !t.wind_adjustment_enabled
    })}
            ></button>
          </div>
          <div class="setting-row">
            <span>Erős szélben halasztás</span>
            <button
              class="toggle"
              ?on=${t.wind_delay_enabled}
              aria-label="Szél miatti halasztás kapcsolása"
              @click=${() => this._patchSettings({
      wind_delay_enabled: !t.wind_delay_enabled
    })}
            ></button>
          </div>
          ${this._settingNumber("Halasztási lépés (perc)", "wind_delay_step_minutes", t)}
          <label class="setting-row">
            <span>Halasztás legkésőbb eddig</span>
            <input
              type="time"
              .value=${t.wind_delay_until}
              @change=${(e) => this._patchSettings({
      wind_delay_until: e.target.value
    })}
            />
          </label>
          ${this._settingNumber("Sprayer szélhatár (km/h)", "wind_speed_threshold_spray", t)}
          ${this._settingNumber("Sprayer lökéshatár (km/h)", "wind_gust_threshold_spray", t)}
          ${this._settingNumber("Rotator / MP800 szélhatár (km/h)", "wind_speed_threshold_rotator", t)}
          ${this._settingNumber("Rotator / MP800 lökéshatár (km/h)", "wind_gust_threshold_rotator", t)}
          ${this._settingNumber("Rotoros szélhatár (km/h)", "wind_speed_threshold_rotor", t)}
          ${this._settingNumber("Rotoros lökéshatár (km/h)", "wind_gust_threshold_rotor", t)}
        </section>
        <section class="settings-section forecast-settings">
          <h3>Időkép előrejelzés</h3>
          <p class="settings-help">
            Ez a település adja az órás előrejelzést, a hőmérsékleti
            feltételeket és az öntözési korrekciót. Mentéskor az Időkép
            integráció újratöltődik. A lehullott csapadék automatája ettől
            külön választható.
          </p>
          <label class="forecast-location">
            <span>Előrejelzés települése</span>
            <input
              type="text"
              placeholder="például Csömör"
              .value=${t.idokep_location}
              @input=${(e) => this._patchSettings({
      idokep_location: e.target.value
    })}
            />
          </label>
        </section>
        <section class="settings-section rain-station-settings">
          <h3>Lehullott csapadék · Időkép automata</h3>
          <p class="settings-help">
            A településhez tartozó Időkép automaták elmúlt 24 órás mérése
            beleszámít az eső miatti csökkentésbe és kihagyásba. Ez közeli
            állomásadat, nem a kertben végzett mérés.
          </p>
          <label class="rain-station-city">
            <span>Település</span>
            <div>
              <input
                type="text"
                placeholder="például Csömör"
                .value=${t.rain_station_city}
                @input=${(e) => this._patchSettings({
      rain_station_city: e.target.value
    })}
              />
              <button
                class="button quiet"
                type="button"
                ?disabled=${this._rainStationSearching || t.rain_station_city.trim().length < 2}
                @click=${this._searchRainStations}
              >
                ${this._rainStationSearching ? "Keresés…" : "Automaták keresése"}
              </button>
            </div>
          </label>
          ${this._rainStationMatches.length ? n`
                <label class="rain-station-result">
                  <span>Használt automata</span>
                  <select
                    .value=${t.rain_station_id}
                    @change=${(e) => {
      const s = this._rainStationMatches.find(
        (a) => a.station_id === e.target.value
      );
      s && this._patchSettings({
        rain_station_id: s.station_id,
        rain_station_name: s.location
      });
    }}
                  >
                    ${this._rainStationMatches.map(
      (e) => n`
                        <option value=${e.station_id}>
                          ${e.location} · ${e.station_id} ·
                          ${e.measured_mm} mm
                        </option>
                      `
    )}
                  </select>
                </label>
              ` : c}
          <div class="rain-station-status">
            <span>Kiválasztva</span>
            <strong>
              ${t.rain_station_id ? `${t.rain_station_name} (${t.rain_station_id})` : "Nincs automata kiválasztva"}
            </strong>
          </div>
          ${this._summary.rain_observation ? n`
                <div class="rain-station-reading">
                  <span>Elmúlt 24 óra</span>
                  <strong>${this._summary.rain_observation.measured_mm} mm</strong>
                  <span>
                    Radarbecslés: ${this._summary.rain_observation.radar_mm} mm
                  </span>
                </div>
              ` : this._summary.rain_observation_error ? n`
                  <div class="rain-station-error">
                    ${this._summary.rain_observation_error}
                  </div>
                ` : c}
        </section>
      </div>
      <section class="settings-section zone-profiles">
        <h3>Zónák vízigénye, szórófeje és érzékelője</h3>
        <p class="settings-help">
          Referencia módban a program a célzott vízmennyiséget osztja a kijuttatási
          intenzitással. Ha a teljes zónavízhozam és a terület is ki van töltve,
          azok felülírják a fejtípus referenciaértékét. Az árnyékos terület 20%-kal
          rövidebb referenciaidőt kap. Egy talajnedvességmérő több zónához is
          hozzárendelhető. Ha a programban engedélyezed a talajnedvesség
          használatát, az aktuális százalék rövidíti vagy növeli az időt, a
          kihagyási küszöb felett pedig a zóna nem indul el.
        </p>
        <div class="moisture-bulk">
          <label>
            <span>Talajnedvességmérő minden zónához</span>
            <select
              .value=${this._bulkMoistureSensor}
              @change=${(e) => {
      this._bulkMoistureSensor = e.target.value;
    }}
            >
              <option value="">Válassz érzékelőt…</option>
              ${this._moistureSensors().map(
      (e) => n`<option value=${e.entity_id}>${e.name}</option>`
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
        ${this._allZones().map((e) => this._renderZoneProfile(e))}
        <div class="zone-profile-actions">
          ${this._settingsSaved ? n`<span class="save-success">A zónabeállítások elmentve.</span>` : n`<span>A módosítások mentés után lépnek életbe.</span>`}
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
      ${this._error ? n`<div class="error">${this._error}</div>` : c}
    `;
  }
  _renderZoneProfile(t) {
    const e = t.profile, s = e.flow_l_min !== null && e.area_m2 !== null;
    return n`
      <div class="zone-profile-row">
        <strong>${t.name}</strong>
        <label>
          <span class="mobile-label">Fejtípus</span>
          <select
            .value=${e.head_type}
            @change=${(a) => {
      const r = a.target.value, o = Z.find((l) => l.value === r);
      this._patchZoneProfile(t.entity_id, {
        head_type: r,
        reference_rate_mm_h: o?.rate ?? e.reference_rate_mm_h
      });
    }}
          >
            ${Z.map(
      (a) => n`
                  <option
                    value=${a.value}
                    ?selected=${a.value === e.head_type}
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
            .value=${e.exposure}
            @change=${(a) => this._patchZoneProfile(t.entity_id, {
      exposure: a.target.value,
      exposure_factor: a.target.value === "shady" ? 0.8 : 1
    })}
          >
            <option value="sunny" ?selected=${e.exposure === "sunny"}>
              Napos
            </option>
            <option value="shady" ?selected=${e.exposure === "shady"}>
              Árnyékos
            </option>
          </select>
        </label>
        ${this._profileNumber(t, "reference_rate_mm_h", "mm/óra", 0.1)}
        ${this._profileNumber(t, "flow_l_min", "l/perc", 0.1, !0)}
        ${this._profileNumber(t, "area_m2", "m²", 0.1, !0)}
        <label class="moisture-select">
          <span class="mobile-label">Talajnedvességmérő</span>
          <select
            .value=${e.moisture_sensor_entity_id ?? ""}
            @change=${(a) => this._patchZoneProfile(t.entity_id, {
      moisture_sensor_entity_id: a.target.value || null
    })}
          >
            <option value="">Nincs hozzárendelve</option>
            ${this._moistureSensors().map(
      (a) => n`
                <option
                  value=${a.entity_id}
                  ?selected=${a.entity_id === e.moisture_sensor_entity_id}
                >
                  ${a.name}
                </option>
              `
    )}
          </select>
          ${e.moisture_sensor_entity_id ? n`
                <span class="sensor-reading">
                  ${e.moisture_sensor_state ?? "–"}${e.moisture_sensor_unit ?? ""}
                </span>
              ` : c}
        </label>
        <span class="effective-rate">
          <strong>${this._effectiveRate(e).toFixed(1)} mm/óra</strong>
          <span>
            ${s ? "mért adatokból" : "referencia"} ·
            ${e.exposure === "shady" ? "80% árnyék" : "100% napos"}
          </span>
        </span>
      </div>
    `;
  }
  _profileNumber(t, e, s, a, r = !1) {
    const o = t.profile[e];
    return n`
      <label class="profile-number">
        <span class="mobile-label">${s}</span>
        <input
          type="number"
          min="0.1"
          step=${a}
          placeholder=${r ? "opcionális" : ""}
          .value=${o === null ? "" : String(o)}
          @change=${(l) => {
      const d = l.target;
      this._patchZoneProfile(t.entity_id, {
        [e]: d.value === "" ? null : d.valueAsNumber
      });
    }}
        />
        <span>${s}</span>
      </label>
    `;
  }
  _settingNumber(t, e, s) {
    return n`
      <label class="setting-row">
        <span>${t}</span>
        <input
          type="number"
          step="0.1"
          .value=${String(s[e])}
          @change=${(a) => this._patchSettings({
      [e]: a.target.valueAsNumber
    })}
        />
      </label>
    `;
  }
  async _load(t) {
    if (!this.hass) {
      t && (this._loading = !0);
      return;
    }
    try {
      const e = await Ft(this.hass);
      e.programs = e.programs.map(O), this._summary = e, !this._expandedControllers.length && e.controllers[0] && (this._expandedControllers = [e.controllers[0].id]), this._error = "", (t || !e.weather) && (e.weather = await Zt(this.hass), this._summary = { ...e }), this._tab === "programs" && !this._draft && this._selectFirstProgram();
    } catch (e) {
      this._error = this._errorMessage(e);
    } finally {
      this._loading = !1;
    }
  }
  _selectFirstProgram() {
    const t = this._summary?.programs[0];
    this._draft = t ? E(t) : null;
  }
  _nextProgramName() {
    if (this._summary?.next_run_plan?.program_name)
      return this._summary.next_run_plan.program_name;
    if (!this._summary?.next_run) return "";
    const t = new Date(this._summary.next_run);
    return this._summary.programs.find((e) => {
      if (this._isSmartProgram(e)) return !1;
      const [s, a] = e.start_time.split(":").map(Number);
      return s === t.getHours() && a === t.getMinutes();
    })?.name ?? "Program";
  }
  _programMinutes(t) {
    return t.zones.reduce(
      (e, s) => e + this._programZoneMinutes(t, s),
      0
    );
  }
  _programZoneMinutes(t, e) {
    const s = this._summary?.weather, a = this._programZoneMoisture(t, e), r = (m) => m <= 0 || a?.factor === 0 ? 0 : Math.max(
      1,
      Math.min(180, Math.round(m * (a?.factor ?? 1)))
    );
    if (e.duration_mode !== "reference") {
      const m = t.weather_adjustment ? s?.factor ?? 1 : 1;
      return r(
        m <= 0 ? 0 : Math.max(1, Math.round(e.duration_minutes * m))
      );
    }
    const o = this._zoneProfile(e.entity_id);
    if (!o) return e.duration_minutes;
    const l = s?.max_temperature ?? 20, d = s?.irrigation_target_mm ?? (l >= 35 ? 9 : l >= 25 ? 5.5 : l >= 20 ? 4.5 : 2.5), p = t.weather_adjustment ? s?.rain_factor ?? s?.factor ?? 1 : 1, h = o.exposure === "shady" ? 0.8 : 1, u = Math.max(
      1,
      Math.min(
        180,
        Math.round(
          d * p * h * 60 / this._effectiveRate(o)
        )
      )
    );
    return r(u);
  }
  _programZoneMoisture(t, e) {
    if (!t.soil_moisture_enabled) return null;
    const s = this._zoneProfile(e.entity_id);
    if (!s?.moisture_sensor_entity_id) return null;
    const a = this._summary?.settings;
    return a ? te(s.moisture_sensor_state, a) : null;
  }
  _programZoneMoistureText(t, e) {
    const s = this._programZoneMoisture(t, e);
    return s ? s.action === "skip" ? `· ${s.percent}% → kihagyás` : `· ${s.percent}% → ${Math.round(s.factor * 100)}%` : "";
  }
  _allZones() {
    return this._summary?.controllers.flatMap((t) => t.zones) ?? [];
  }
  _toggleController(t) {
    this._expandedControllers = this._expandedControllers.includes(t) ? this._expandedControllers.filter((e) => e !== t) : [...this._expandedControllers, t];
  }
  _patchManual(t) {
    this._manualDraft = { ...this._manualDraft, ...t };
  }
  _updateManualZone(t, e) {
    const s = [...this._manualDraft.zones];
    s[t] = e, this._patchManual({ zones: s });
  }
  _removeManualZone(t) {
    this._patchManual({
      zones: this._manualDraft.zones.filter(
        (e, s) => s !== t
      )
    });
  }
  _moveManualZone(t, e) {
    const s = t + e;
    if (s < 0 || s >= this._manualDraft.zones.length) return;
    const a = [...this._manualDraft.zones];
    [a[t], a[s]] = [a[s], a[t]], this._patchManual({ zones: a });
  }
  _patchDraft(t) {
    this._draft && (this._draft = { ...this._draft, ...t });
  }
  _toggleDay(t) {
    if (!this._draft) return;
    const e = this._draft.weekdays.includes(t) ? this._draft.weekdays.filter((s) => s !== t) : [...this._draft.weekdays, t].sort();
    this._patchDraft({ weekdays: e });
  }
  _updateDraftZone(t, e) {
    if (!this._draft) return;
    const s = [...this._draft.zones];
    s[t] = e, this._patchDraft({ zones: s });
  }
  _removeDraftZone(t) {
    this._draft && this._patchDraft({
      zones: this._draft.zones.filter((e, s) => s !== t)
    });
  }
  _patchSettings(t) {
    this._summary && (this._settingsSaved = !1, this._summary = {
      ...this._summary,
      settings: { ...this._summary.settings, ...t }
    });
  }
  _patchZoneProfile(t, e) {
    this._summary && (this._settingsSaved = !1, this._summary = {
      ...this._summary,
      controllers: this._summary.controllers.map((s) => ({
        ...s,
        zones: s.zones.map(
          (a) => a.entity_id === t ? { ...a, profile: { ...a.profile, ...e } } : a
        )
      }))
    });
  }
  _assignMoistureSensorToAll(t) {
    if (t)
      for (const e of this._allZones())
        this._patchZoneProfile(e.entity_id, {
          moisture_sensor_entity_id: t
        });
  }
  _moistureSensors() {
    return Object.entries(this.hass?.states ?? {}).filter(([t, e]) => {
      if (!t.startsWith("sensor.")) return !1;
      const s = e.attributes, a = String(s.device_class ?? "").toLowerCase(), r = String(s.friendly_name ?? t).toLowerCase();
      return a === "moisture" || r.includes("talajnedv") || r.includes("soil moisture");
    }).map(([t, e]) => ({
      entity_id: t,
      name: String(e.attributes.friendly_name ?? t)
    })).sort((t, e) => t.name.localeCompare(e.name, "hu"));
  }
  _formatDays(t) {
    return t.map((e) => ae[e] ?? "").join(", ");
  }
  _isSmartProgram(t) {
    return (t.schedule_mode ?? "fixed") === "smart_window";
  }
  _timeToMinutes(t) {
    const e = /^(\d{2}):(\d{2})$/.exec(t);
    if (!e) return null;
    const s = Number(e[1]), a = Number(e[2]);
    return s > 23 || a > 59 ? null : s * 60 + a;
  }
  _windowDurationMinutes(t) {
    const e = this._timeToMinutes(
      t.window_start_time ?? T
    ), s = this._timeToMinutes(
      t.window_end_time ?? C
    );
    return e === null || s === null || e === s ? 0 : (s - e + 1440) % 1440;
  }
  _programWindowLabel(t) {
    const e = t.window_start_time ?? T, s = t.window_end_time ?? C, a = this._timeToMinutes(e), r = this._timeToMinutes(s), o = a !== null && r !== null && r < a;
    return `${e}–${s}${o ? " (+1 nap)" : ""}`;
  }
  _historyMoistureText(t) {
    return t.zones.filter((e) => typeof e.moisture_percent == "number").map((e) => {
      const s = String(e.name ?? e.entity_id ?? "Zóna"), a = Number(e.moisture_percent), r = e.moisture_action === "skip" ? "kimaradt" : `${Math.round(Number(e.moisture_factor ?? 1) * 100)}% idő`;
      return `${s} ${this._formatForecastNumber(a)}% → ${r}`;
    }).join(" · ");
  }
  _temperatureConditionText(t) {
    return `${t.temperature_condition_operator === "above" ? "Max. hőmérséklet >" : "Max. hőmérséklet <"} ${t.temperature_condition_value} °C`;
  }
  _zoneProfile(t) {
    return this._allZones().find((e) => e.entity_id === t)?.profile;
  }
  _effectiveRate(t) {
    return t.flow_l_min !== null && t.area_m2 !== null && t.area_m2 > 0 ? t.flow_l_min * 60 / t.area_m2 : t.reference_rate_mm_h;
  }
  _headLabel(t) {
    return Z.find((e) => e.value === t)?.label ?? t;
  }
  _formatDateTime(t) {
    return new Intl.DateTimeFormat("hu-HU", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(t));
  }
  _formatTime(t) {
    return new Intl.DateTimeFormat("hu-HU", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(t));
  }
  _groupForecastDays(t) {
    const e = /* @__PURE__ */ new Map();
    for (const s of t) {
      const a = new Date(s.timestamp), r = [
        a.getFullYear(),
        String(a.getMonth() + 1).padStart(2, "0"),
        String(a.getDate()).padStart(2, "0")
      ].join("-");
      e.set(r, [...e.get(r) ?? [], s]);
    }
    return [...e].map(([s, a]) => ({
      date: s,
      hours: a
    }));
  }
  _formatForecastDate(t, e) {
    const s = new Intl.DateTimeFormat("hu-HU", {
      weekday: "long",
      month: "short",
      day: "numeric"
    }).format(/* @__PURE__ */ new Date(`${t}T12:00:00`)), a = e === 0 ? "Ma" : e === 1 ? "Holnap" : "";
    return a ? `${a} · ${s}` : s;
  }
  _formatForecastNumber(t) {
    return Number.isInteger(t) ? String(t) : t.toFixed(1);
  }
  _forecastConditionLabel(t) {
    return {
      sunny: "Napos",
      "clear-night": "Derült",
      partlycloudy: "Részben felhős",
      cloudy: "Felhős",
      rainy: "Esős",
      pouring: "Erős eső",
      "lightning-rainy": "Zivatar",
      lightning: "Villámlás",
      fog: "Ködös",
      windy: "Szeles",
      "windy-variant": "Szeles, felhős",
      hail: "Jégeső",
      snowy: "Havazás",
      "snowy-rainy": "Havas eső"
    }[t.toLowerCase()] ?? t;
  }
  _forecastConditionIcon(t) {
    return {
      sunny: "mdi:weather-sunny",
      "clear-night": "mdi:weather-night",
      partlycloudy: "mdi:weather-partly-cloudy",
      cloudy: "mdi:weather-cloudy",
      rainy: "mdi:weather-rainy",
      pouring: "mdi:weather-pouring",
      "lightning-rainy": "mdi:weather-lightning-rainy",
      lightning: "mdi:weather-lightning",
      fog: "mdi:weather-fog",
      windy: "mdi:weather-windy",
      "windy-variant": "mdi:weather-windy-variant",
      hail: "mdi:weather-hail",
      snowy: "mdi:weather-snowy",
      "snowy-rainy": "mdi:weather-snowy-rainy"
    }[t.toLowerCase()] ?? "mdi:weather-cloudy-alert";
  }
  _formatScheduleDate(t, e) {
    const s = new Intl.DateTimeFormat("hu-HU", {
      weekday: "long",
      month: "short",
      day: "numeric"
    }).format(/* @__PURE__ */ new Date(`${t}T12:00:00`));
    return `${e === 0 ? "Ma" : e === 1 ? "Holnap" : "Holnapután"} · ${s}`;
  }
  _isSmartScheduleProgram(t) {
    return t.schedule_mode === "smart_window" || t.planning_status?.startsWith("smart_") === !0;
  }
  _scheduleProgramTime(t) {
    return this._isSmartScheduleProgram(t) && !t.planned_end_at ? "Időablak" : t.planned_end_at ? this._formatScheduleRange(t.scheduled_at, t.planned_end_at) : this._formatTime(t.scheduled_at);
  }
  _formatScheduleRange(t, e) {
    const s = new Date(t), a = new Date(e), r = s.toDateString() !== a.toDateString();
    return `${this._formatTime(t)}–${this._formatTime(e)}${r ? " (+1 nap)" : ""}`;
  }
  _scheduleStatusLabel(t) {
    return t.planning_status === "smart_no_fit" ? "Nincs megfelelő időpont" : t.planning_status === "smart_waiting_forecast" ? "Előrejelzésre vár" : t.status === "will_run" && t.planning_status === "smart_planned" ? `Tervezve ${this._formatTime(t.scheduled_at)}-ra` : {
      will_run: "Lefut",
      automation_off: "Automatika kikapcsolva",
      paused: "Szünetel",
      skip_next: "Kihagyva",
      weather_unavailable: "Nincs forecast",
      condition_skip: "Feltétel nem teljesül",
      rain_skip: "Eső miatt kimarad",
      moisture_skip: "Talajnedvesség miatt kimarad",
      wind_delayed: t.weather?.delayed_until ? `Halasztva ${this._formatTime(t.weather.delayed_until)}-ra` : "Szél miatt halasztva",
      wind_skip: "Szél miatt kimarad",
      wind_unavailable: "Széladat hiányzik",
      smart_no_fit: "Nincs megfelelő időpont"
    }[t.status];
  }
  _formatWeatherWind(t) {
    const e = t.max_wind_speed_kmh, s = t.max_wind_gust_kmh;
    if (e == null) return "nincs adat";
    const a = `${this._formatForecastNumber(e)} km/h`;
    return s == null ? a : `${a} / ${this._formatForecastNumber(s)} lökés`;
  }
  _formatForecastWind(t) {
    if (t.wind_speed_kmh === null && t.wind_gust_kmh === null)
      return "nincs adat";
    const e = t.wind_bearing_deg === null ? "" : `${this._formatWindDirection(t.wind_bearing_deg)} `, s = t.wind_speed_kmh === null ? "–" : this._formatForecastNumber(t.wind_speed_kmh), a = t.wind_gust_kmh === null ? "" : ` / ${this._formatForecastNumber(t.wind_gust_kmh)}`;
    return `${e}${s}${a} km/h`;
  }
  _formatWindDirection(t) {
    const e = ["É", "ÉK", "K", "DK", "D", "DNY", "NY", "ÉNY"];
    return e[Math.round(t % 360 / 45) % e.length];
  }
  _formatRelative(t) {
    const e = new Date(t), s = /* @__PURE__ */ new Date(), a = new Date(s);
    return a.setDate(s.getDate() + 1), `${e.toDateString() === s.toDateString() ? "ma" : e.toDateString() === a.toDateString() ? "holnap" : new Intl.DateTimeFormat("hu-HU", {
      month: "short",
      day: "numeric"
    }).format(e)} ${e.toLocaleTimeString("hu-HU", {
      hour: "2-digit",
      minute: "2-digit"
    })}`;
  }
  _outcomeLabel(t) {
    return {
      completed: "Befejezve",
      skipped: "Kihagyva",
      failed: "Hiba",
      stopped: "Leállítva",
      interrupted: "Megszakítva"
    }[t] ?? t;
  }
  _clampDuration(t) {
    return Math.max(1, Math.min(180, Number.isFinite(t) ? Math.round(t) : 15));
  }
  _errorMessage(t) {
    return t instanceof Error || typeof t == "object" && t !== null && "message" in t && typeof t.message == "string" ? t.message : "A művelet nem sikerült.";
  }
}
customElements.get("smart-yardian-panel") || customElements.define("smart-yardian-panel", re);
export {
  re as SmartYardianPanel
};
//# sourceMappingURL=smart-yardian-panel.js.map
