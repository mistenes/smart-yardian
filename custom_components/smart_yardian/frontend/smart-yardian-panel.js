const C = globalThis, R = C.ShadowRoot && (C.ShadyCSS === void 0 || C.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Z = /* @__PURE__ */ Symbol(), F = /* @__PURE__ */ new WeakMap();
let it = class {
  constructor(t, e, s) {
    if (this._$cssResult$ = !0, s !== Z) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = e;
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (R && t === void 0) {
      const s = e !== void 0 && e.length === 1;
      s && (t = F.get(e)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), s && F.set(e, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const dt = (r) => new it(typeof r == "string" ? r : r + "", void 0, Z), ct = (r, ...t) => {
  const e = r.length === 1 ? r[0] : t.reduce((s, i, a) => s + ((o) => {
    if (o._$cssResult$ === !0) return o.cssText;
    if (typeof o == "number") return o;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + o + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(i) + r[a + 1], r[0]);
  return new it(e, r, Z);
}, pt = (r, t) => {
  if (R) r.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
  else for (const e of t) {
    const s = document.createElement("style"), i = C.litNonce;
    i !== void 0 && s.setAttribute("nonce", i), s.textContent = e.cssText, r.appendChild(s);
  }
}, V = R ? (r) => r : (r) => r instanceof CSSStyleSheet ? ((t) => {
  let e = "";
  for (const s of t.cssRules) e += s.cssText;
  return dt(e);
})(r) : r;
const { is: ht, defineProperty: mt, getOwnPropertyDescriptor: ut, getOwnPropertyNames: gt, getOwnPropertySymbols: _t, getPrototypeOf: ft } = Object, N = globalThis, q = N.trustedTypes, bt = q ? q.emptyScript : "", yt = N.reactiveElementPolyfillSupport, k = (r, t) => r, O = { toAttribute(r, t) {
  switch (t) {
    case Boolean:
      r = r ? bt : null;
      break;
    case Object:
    case Array:
      r = r == null ? r : JSON.stringify(r);
  }
  return r;
}, fromAttribute(r, t) {
  let e = r;
  switch (t) {
    case Boolean:
      e = r !== null;
      break;
    case Number:
      e = r === null ? null : Number(r);
      break;
    case Object:
    case Array:
      try {
        e = JSON.parse(r);
      } catch {
        e = null;
      }
  }
  return e;
} }, rt = (r, t) => !ht(r, t), K = { attribute: !0, type: String, converter: O, reflect: !1, useDefault: !1, hasChanged: rt };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), N.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let v = class extends HTMLElement {
  static addInitializer(t) {
    this._$Ei(), (this.l ??= []).push(t);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t, e = K) {
    if (e.state && (e.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(t) && ((e = Object.create(e)).wrapped = !0), this.elementProperties.set(t, e), !e.noAccessor) {
      const s = /* @__PURE__ */ Symbol(), i = this.getPropertyDescriptor(t, s, e);
      i !== void 0 && mt(this.prototype, t, i);
    }
  }
  static getPropertyDescriptor(t, e, s) {
    const { get: i, set: a } = ut(this.prototype, t) ?? { get() {
      return this[e];
    }, set(o) {
      this[e] = o;
    } };
    return { get: i, set(o) {
      const d = i?.call(this);
      a?.call(this, o), this.requestUpdate(t, d, s);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) ?? K;
  }
  static _$Ei() {
    if (this.hasOwnProperty(k("elementProperties"))) return;
    const t = ft(this);
    t.finalize(), t.l !== void 0 && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(k("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(k("properties"))) {
      const e = this.properties, s = [...gt(e), ..._t(e)];
      for (const i of s) this.createProperty(i, e[i]);
    }
    const t = this[Symbol.metadata];
    if (t !== null) {
      const e = litPropertyMetadata.get(t);
      if (e !== void 0) for (const [s, i] of e) this.elementProperties.set(s, i);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [e, s] of this.elementProperties) {
      const i = this._$Eu(e, s);
      i !== void 0 && this._$Eh.set(i, e);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const e = [];
    if (Array.isArray(t)) {
      const s = new Set(t.flat(1 / 0).reverse());
      for (const i of s) e.unshift(V(i));
    } else t !== void 0 && e.push(V(t));
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
    return pt(t, this.constructor.elementStyles), t;
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
    const s = this.constructor.elementProperties.get(t), i = this.constructor._$Eu(t, s);
    if (i !== void 0 && s.reflect === !0) {
      const a = (s.converter?.toAttribute !== void 0 ? s.converter : O).toAttribute(e, s.type);
      this._$Em = t, a == null ? this.removeAttribute(i) : this.setAttribute(i, a), this._$Em = null;
    }
  }
  _$AK(t, e) {
    const s = this.constructor, i = s._$Eh.get(t);
    if (i !== void 0 && this._$Em !== i) {
      const a = s.getPropertyOptions(i), o = typeof a.converter == "function" ? { fromAttribute: a.converter } : a.converter?.fromAttribute !== void 0 ? a.converter : O;
      this._$Em = i;
      const d = o.fromAttribute(e, a.type);
      this[i] = d ?? this._$Ej?.get(i) ?? d, this._$Em = null;
    }
  }
  requestUpdate(t, e, s, i = !1, a) {
    if (t !== void 0) {
      const o = this.constructor;
      if (i === !1 && (a = this[t]), s ??= o.getPropertyOptions(t), !((s.hasChanged ?? rt)(a, e) || s.useDefault && s.reflect && a === this._$Ej?.get(t) && !this.hasAttribute(o._$Eu(t, s)))) return;
      this.C(t, e, s);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(t, e, { useDefault: s, reflect: i, wrapped: a }, o) {
    s && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t) && (this._$Ej.set(t, o ?? e ?? this[t]), a !== !0 || o !== void 0) || (this._$AL.has(t) || (this.hasUpdated || s || (e = void 0), this._$AL.set(t, e)), i === !0 && this._$Em !== t && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t));
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
        for (const [i, a] of this._$Ep) this[i] = a;
        this._$Ep = void 0;
      }
      const s = this.constructor.elementProperties;
      if (s.size > 0) for (const [i, a] of s) {
        const { wrapped: o } = a, d = this[i];
        o !== !0 || this._$AL.has(i) || d === void 0 || this.C(i, void 0, a, d);
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
v.elementStyles = [], v.shadowRootOptions = { mode: "open" }, v[k("elementProperties")] = /* @__PURE__ */ new Map(), v[k("finalized")] = /* @__PURE__ */ new Map(), yt?.({ ReactiveElement: v }), (N.reactiveElementVersions ??= []).push("2.1.2");
const L = globalThis, W = (r) => r, D = L.trustedTypes, Y = D ? D.createPolicy("lit-html", { createHTML: (r) => r }) : void 0, at = "$lit$", _ = `lit$${Math.random().toFixed(9).slice(2)}$`, ot = "?" + _, vt = `<${ot}>`, y = document, A = () => y.createComment(""), S = (r) => r === null || typeof r != "object" && typeof r != "function", B = Array.isArray, xt = (r) => B(r) || typeof r?.[Symbol.iterator] == "function", U = `[ 	
\f\r]`, w = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, J = /-->/g, G = />/g, f = RegExp(`>|${U}(?:([^\\s"'>=/]+)(${U}*=${U}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Q = /'/g, X = /"/g, nt = /^(?:script|style|textarea|title)$/i, $t = (r) => (t, ...e) => ({ _$litType$: r, strings: t, values: e }), l = $t(1), x = /* @__PURE__ */ Symbol.for("lit-noChange"), p = /* @__PURE__ */ Symbol.for("lit-nothing"), tt = /* @__PURE__ */ new WeakMap(), b = y.createTreeWalker(y, 129);
function lt(r, t) {
  if (!B(r) || !r.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Y !== void 0 ? Y.createHTML(t) : t;
}
const wt = (r, t) => {
  const e = r.length - 1, s = [];
  let i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = w;
  for (let d = 0; d < e; d++) {
    const n = r[d];
    let h, m, c = -1, u = 0;
    for (; u < n.length && (o.lastIndex = u, m = o.exec(n), m !== null); ) u = o.lastIndex, o === w ? m[1] === "!--" ? o = J : m[1] !== void 0 ? o = G : m[2] !== void 0 ? (nt.test(m[2]) && (i = RegExp("</" + m[2], "g")), o = f) : m[3] !== void 0 && (o = f) : o === f ? m[0] === ">" ? (o = i ?? w, c = -1) : m[1] === void 0 ? c = -2 : (c = o.lastIndex - m[2].length, h = m[1], o = m[3] === void 0 ? f : m[3] === '"' ? X : Q) : o === X || o === Q ? o = f : o === J || o === G ? o = w : (o = f, i = void 0);
    const g = o === f && r[d + 1].startsWith("/>") ? " " : "";
    a += o === w ? n + vt : c >= 0 ? (s.push(h), n.slice(0, c) + at + n.slice(c) + _ + g) : n + _ + (c === -2 ? d : g);
  }
  return [lt(r, a + (r[e] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), s];
};
class E {
  constructor({ strings: t, _$litType$: e }, s) {
    let i;
    this.parts = [];
    let a = 0, o = 0;
    const d = t.length - 1, n = this.parts, [h, m] = wt(t, e);
    if (this.el = E.createElement(h, s), b.currentNode = this.el.content, e === 2 || e === 3) {
      const c = this.el.content.firstChild;
      c.replaceWith(...c.childNodes);
    }
    for (; (i = b.nextNode()) !== null && n.length < d; ) {
      if (i.nodeType === 1) {
        if (i.hasAttributes()) for (const c of i.getAttributeNames()) if (c.endsWith(at)) {
          const u = m[o++], g = i.getAttribute(c).split(_), M = /([.?@])?(.*)/.exec(u);
          n.push({ type: 1, index: a, name: M[2], strings: g, ctor: M[1] === "." ? zt : M[1] === "?" ? At : M[1] === "@" ? St : H }), i.removeAttribute(c);
        } else c.startsWith(_) && (n.push({ type: 6, index: a }), i.removeAttribute(c));
        if (nt.test(i.tagName)) {
          const c = i.textContent.split(_), u = c.length - 1;
          if (u > 0) {
            i.textContent = D ? D.emptyScript : "";
            for (let g = 0; g < u; g++) i.append(c[g], A()), b.nextNode(), n.push({ type: 2, index: ++a });
            i.append(c[u], A());
          }
        }
      } else if (i.nodeType === 8) if (i.data === ot) n.push({ type: 2, index: a });
      else {
        let c = -1;
        for (; (c = i.data.indexOf(_, c + 1)) !== -1; ) n.push({ type: 7, index: a }), c += _.length - 1;
      }
      a++;
    }
  }
  static createElement(t, e) {
    const s = y.createElement("template");
    return s.innerHTML = t, s;
  }
}
function $(r, t, e = r, s) {
  if (t === x) return t;
  let i = s !== void 0 ? e._$Co?.[s] : e._$Cl;
  const a = S(t) ? void 0 : t._$litDirective$;
  return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(r), i._$AT(r, e, s)), s !== void 0 ? (e._$Co ??= [])[s] = i : e._$Cl = i), i !== void 0 && (t = $(r, i._$AS(r, t.values), i, s)), t;
}
class kt {
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
    const { el: { content: e }, parts: s } = this._$AD, i = (t?.creationScope ?? y).importNode(e, !0);
    b.currentNode = i;
    let a = b.nextNode(), o = 0, d = 0, n = s[0];
    for (; n !== void 0; ) {
      if (o === n.index) {
        let h;
        n.type === 2 ? h = new P(a, a.nextSibling, this, t) : n.type === 1 ? h = new n.ctor(a, n.name, n.strings, this, t) : n.type === 6 && (h = new Et(a, this, t)), this._$AV.push(h), n = s[++d];
      }
      o !== n?.index && (a = b.nextNode(), o++);
    }
    return b.currentNode = y, i;
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
  constructor(t, e, s, i) {
    this.type = 2, this._$AH = p, this._$AN = void 0, this._$AA = t, this._$AB = e, this._$AM = s, this.options = i, this._$Cv = i?.isConnected ?? !0;
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
    t = $(this, t, e), S(t) ? t === p || t == null || t === "" ? (this._$AH !== p && this._$AR(), this._$AH = p) : t !== this._$AH && t !== x && this._(t) : t._$litType$ !== void 0 ? this.$(t) : t.nodeType !== void 0 ? this.T(t) : xt(t) ? this.k(t) : this._(t);
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
  }
  _(t) {
    this._$AH !== p && S(this._$AH) ? this._$AA.nextSibling.data = t : this.T(y.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    const { values: e, _$litType$: s } = t, i = typeof s == "number" ? this._$AC(t) : (s.el === void 0 && (s.el = E.createElement(lt(s.h, s.h[0]), this.options)), s);
    if (this._$AH?._$AD === i) this._$AH.p(e);
    else {
      const a = new kt(i, this), o = a.u(this.options);
      a.p(e), this.T(o), this._$AH = a;
    }
  }
  _$AC(t) {
    let e = tt.get(t.strings);
    return e === void 0 && tt.set(t.strings, e = new E(t)), e;
  }
  k(t) {
    B(this._$AH) || (this._$AH = [], this._$AR());
    const e = this._$AH;
    let s, i = 0;
    for (const a of t) i === e.length ? e.push(s = new P(this.O(A()), this.O(A()), this, this.options)) : s = e[i], s._$AI(a), i++;
    i < e.length && (this._$AR(s && s._$AB.nextSibling, i), e.length = i);
  }
  _$AR(t = this._$AA.nextSibling, e) {
    for (this._$AP?.(!1, !0, e); t !== this._$AB; ) {
      const s = W(t).nextSibling;
      W(t).remove(), t = s;
    }
  }
  setConnected(t) {
    this._$AM === void 0 && (this._$Cv = t, this._$AP?.(t));
  }
}
class H {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, e, s, i, a) {
    this.type = 1, this._$AH = p, this._$AN = void 0, this.element = t, this.name = e, this._$AM = i, this.options = a, s.length > 2 || s[0] !== "" || s[1] !== "" ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = p;
  }
  _$AI(t, e = this, s, i) {
    const a = this.strings;
    let o = !1;
    if (a === void 0) t = $(this, t, e, 0), o = !S(t) || t !== this._$AH && t !== x, o && (this._$AH = t);
    else {
      const d = t;
      let n, h;
      for (t = a[0], n = 0; n < a.length - 1; n++) h = $(this, d[s + n], e, n), h === x && (h = this._$AH[n]), o ||= !S(h) || h !== this._$AH[n], h === p ? t = p : t !== p && (t += (h ?? "") + a[n + 1]), this._$AH[n] = h;
    }
    o && !i && this.j(t);
  }
  j(t) {
    t === p ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
  }
}
class zt extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === p ? void 0 : t;
  }
}
class At extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== p);
  }
}
class St extends H {
  constructor(t, e, s, i, a) {
    super(t, e, s, i, a), this.type = 5;
  }
  _$AI(t, e = this) {
    if ((t = $(this, t, e, 0) ?? p) === x) return;
    const s = this._$AH, i = t === p && s !== p || t.capture !== s.capture || t.once !== s.once || t.passive !== s.passive, a = t !== p && (s === p || i);
    i && this.element.removeEventListener(this.name, this, s), a && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, t) : this._$AH.handleEvent(t);
  }
}
class Et {
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
const Pt = L.litHtmlPolyfillSupport;
Pt?.(E, P), (L.litHtmlVersions ??= []).push("3.3.3");
const Mt = (r, t, e) => {
  const s = e?.renderBefore ?? t;
  let i = s._$litPart$;
  if (i === void 0) {
    const a = e?.renderBefore ?? null;
    s._$litPart$ = i = new P(t.insertBefore(A(), a), a, void 0, e ?? {});
  }
  return i._$AI(r), i;
};
const I = globalThis;
class z extends v {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t.firstChild, t;
  }
  update(t) {
    const e = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = Mt(e, this.renderRoot, this.renderOptions);
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
z._$litElement$ = !0, z.finalized = !0, I.litElementHydrateSupport?.({ LitElement: z });
const Ct = I.litElementPolyfillSupport;
Ct?.({ LitElement: z });
(I.litElementVersions ??= []).push("4.2.2");
const Dt = (r) => r.connection.sendMessagePromise({ type: "smart_yardian/summary" }), Nt = (r) => r.connection.sendMessagePromise({
  type: "smart_yardian/weather/preview"
}), et = (r, t) => r.connection.sendMessagePromise({
  type: "smart_yardian/program/save",
  program: t
}), Ht = (r, t) => r.connection.sendMessagePromise({
  type: "smart_yardian/program/delete",
  program_id: t
}), Ut = (r, t) => r.connection.sendMessagePromise({
  type: "smart_yardian/settings/update",
  settings: t
}), jt = (r, t) => r.connection.sendMessagePromise({
  type: "smart_yardian/zone_profiles/update",
  profiles: t
}), Tt = (r, t) => r.connection.sendMessagePromise({
  type: "smart_yardian/automation/set",
  enabled: t
}), Ot = (r, t) => r.connection.sendMessagePromise({
  type: "smart_yardian/run/program",
  program_id: t,
  apply_weather: !0
}), Rt = (r, t, e) => r.connection.sendMessagePromise({
  type: "smart_yardian/run/zone",
  entity_id: t,
  duration_minutes: e
}), Zt = (r) => r.connection.sendMessagePromise({ type: "smart_yardian/run/stop" }), st = (r, t) => r.connection.sendMessagePromise({
  type: "smart_yardian/pause_until",
  until: t
}), Lt = ct`
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

  .zone-row {
    min-height: 50px;
    padding: 0 12px 0 18px;
    display: grid;
    grid-template-columns: 30px minmax(120px, 1fr) 108px 80px 88px;
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
  }

  .zone-state[running] {
    color: var(--sy-green);
    font-weight: 600;
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
`, Bt = ["H", "K", "Sze", "Cs", "P", "Szo", "V"], It = ["Hé", "Ke", "Sze", "Csü", "Pén", "Szo", "Vas"], j = [
  { value: "rotator", label: "Rotátor (MP)", rate: 10 },
  { value: "mp800", label: "Rotátor MP800", rate: 20 },
  { value: "spray", label: "Spray / esőztető", rate: 40 },
  { value: "rotor", label: "Rotoros", rate: 12 },
  { value: "drip", label: "Csepegtető", rate: 12 }
], Ft = () => ({
  program_id: crypto.randomUUID(),
  name: "Új program",
  enabled: !0,
  weekdays: [0, 2, 4],
  start_time: "05:30",
  weather_adjustment: !0,
  zones: [],
  skip_next: !1
}), T = (r) => JSON.parse(JSON.stringify(r));
class Vt extends z {
  constructor() {
    super(...arguments), this.narrow = !1, this._summary = null, this._tab = "overview", this._loading = !0, this._error = "", this._draft = null, this._saving = !1, this._zoneDurations = {}, this._expandedControllers = [], this._newProgram = () => {
      this._draft = Ft(), this._tab = "programs";
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
          const e = await et(this.hass, this._draft);
          await this._load(!1), this._draft = T(e);
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
        await Ht(this.hass, this._draft.program_id), this._draft = null, await this._load(!1), this._selectFirstProgram();
      } catch (e) {
        this._error = this._errorMessage(e);
      }
    }, this._runDraft = async (t) => {
      if (this.hass)
        try {
          if (!this._summary?.programs.some(
            (s) => s.program_id === t.program_id
          )) {
            this._error = "A programot futtatás előtt mentsd el.";
            return;
          }
          await Ot(this.hass, t.program_id), await this._load(!1);
        } catch (e) {
          this._error = this._errorMessage(e);
        }
    }, this._quickToggleProgram = async (t) => {
      if (this.hass)
        try {
          await et(this.hass, { ...t, enabled: !t.enabled }), await this._load(!1);
        } catch (e) {
          this._error = this._errorMessage(e);
        }
    }, this._startZone = async (t) => {
      if (this.hass)
        try {
          await Rt(
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
          await Zt(this.hass), await this._load(!1);
        } catch (t) {
          this._error = this._errorMessage(t);
        }
    }, this._toggleAutomation = async () => {
      if (!(!this.hass || !this._summary))
        try {
          await Tt(this.hass, !this._summary.automation_enabled), await this._load(!1);
        } catch (t) {
          this._error = this._errorMessage(t);
        }
    }, this._saveSettings = async () => {
      if (!(!this.hass || !this._summary))
        try {
          await Ut(this.hass, this._summary.settings), await jt(
            this.hass,
            this._allZones().map((t) => t.profile)
          ), await this._load(!1);
        } catch (t) {
          this._error = this._errorMessage(t);
        }
    }, this._pauseDay = async () => {
      if (!this.hass) return;
      const t = new Date(Date.now() + 1440 * 60 * 1e3).toISOString();
      await st(this.hass, t), await this._load(!1);
    }, this._resume = async () => {
      this.hass && (await st(this.hass, null), await this._load(!1));
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
      _expandedControllers: { state: !0 }
    };
  }
  static {
    this.styles = Lt;
  }
  connectedCallback() {
    super.connectedCallback(), this._load(!0), this._timer = window.setInterval(() => {
      this._tab !== "settings" && this._load(!1);
    }, 5e3);
  }
  disconnectedCallback() {
    this._timer && window.clearInterval(this._timer), super.disconnectedCallback();
  }
  render() {
    return l`
      <div class="shell">
        <header class="topbar">
          <ha-icon icon="mdi:water"></ha-icon>
          <h1>Öntözés</h1>
        </header>
        <nav class="tabs" aria-label="Öntözés nézetek">
          ${this._tabButton("overview", "Áttekintés")}
          ${this._tabButton("programs", "Programok")}
          ${this._tabButton("history", "Előzmények")}
          ${this._tabButton("settings", "Beállítások")}
        </nav>
        <main class="content">
          ${this._loading && !this._summary ? l`<div class="loading">Az öntözésvezérlő betöltése…</div>` : this._error && !this._summary ? l`<div class="error">${this._error}</div>` : this._renderTab()}
        </main>
      </div>
    `;
  }
  _tabButton(t, e) {
    return l`
      <button
        class="tab"
        ?selected=${this._tab === t}
        aria-current=${this._tab === t ? "page" : p}
        @click=${() => {
      this._tab = t, t === "programs" && !this._draft && this._selectFirstProgram();
    }}
      >
        ${e}
      </button>
    `;
  }
  _renderTab() {
    if (!this._summary) return l``;
    switch (this._tab) {
      case "programs":
        return this._renderPrograms();
      case "history":
        return this._renderHistory();
      case "settings":
        return this._renderSettings();
      default:
        return this._renderOverview();
    }
  }
  _renderOverview() {
    const t = this._summary, e = t.weather, s = t.automation_enabled;
    return l`
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
        ${t.next_run ? l`
              <span>Következő:</span>
              <span class="linklike">${this._nextProgramName()}</span>
              <span>· ${this._formatRelative(t.next_run)}</span>
            ` : l`<span>Nincs következő engedélyezett program</span>`}
      </div>

      <div class="overview-grid">
        <div class="controllers">
          ${t.controllers.length ? t.controllers.map((i) => this._renderController(i)) : l`<div class="empty">Nincs konfigurált Yardian zóna.</div>`}
        </div>
        <aside class="rail">
          <div class="rail-title">
            <span>Programok</span>
            <button class="text-action" @click=${this._newProgram}>+ Hozzáadás</button>
          </div>
          ${t.programs.length ? t.programs.slice(0, 3).map((i) => this._renderRailProgram(i)) : l`<div class="empty">Még nincs program.</div>`}
          ${this._renderCompactHistory(t.history[0])}
        </aside>
      </div>

      <button class="button danger stop-all" @click=${this._stopAll}>
        <ha-icon icon="mdi:stop"></ha-icon>
        Minden leállítása
      </button>
    `;
  }
  _renderWeather(t) {
    if (!t)
      return l`
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
    return l`
      <section class="weather-band">
        <div class="weather-summary">
          <ha-icon icon=${e === 0 ? "mdi:weather-rainy" : "mdi:weather-partly-cloudy"}></ha-icon>
          <div>
            <div class="decision">Ma ${e}% · ${s}</div>
            <div class="weather-reason">${t.reason}</div>
          </div>
        </div>
        ${this._metric("mdi:weather-rainy", "Várható eső", `${t.precipitation_mm ?? 0} mm`)}
        ${this._metric("mdi:water-percent", "Esély", `${t.max_probability ?? 0}%`)}
        ${this._metric("mdi:white-balance-sunny", "Napos órák", `${t.sunny_hours ?? 0}`, "sun")}
        ${this._metric("mdi:thermometer", "Maximum", `${t.max_temperature ?? 0} °C`, "temp")}
      </section>
    `;
  }
  _metric(t, e, s, i = "") {
    return l`
      <div class="metric ${i}">
        <ha-icon icon=${t}></ha-icon>
        <span class="metric-label">${e}</span>
        <span class="metric-value">${s}</span>
      </div>
    `;
  }
  _renderController(t) {
    const s = !window.matchMedia("(max-width: 600px)").matches || this._expandedControllers.includes(t.id);
    return l`
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
              <span class=${t.available ? "online" : ""}>
                ${t.available ? "Online" : "Nem elérhető"}
              </span>
            </div>
          </div>
          <ha-icon
            class="controller-chevron"
            icon=${s ? "mdi:chevron-up" : "mdi:chevron-down"}
          ></ha-icon>
        </button>
        ${t.zones.map((i) => this._renderZone(i))}
      </section>
    `;
  }
  _renderZone(t) {
    const e = this._zoneDurations[t.entity_id] ?? 15, s = t.state === "on", i = this._summary?.active_run?.current_zone === t.entity_id, a = Number(this._summary?.active_run?.current_duration ?? e), o = this._headLabel(t.profile.head_type);
    return l`
      <div class="zone-row">
        <ha-icon icon="mdi:water"></ha-icon>
        <span class="zone-name">${t.name}</span>
        <span class="zone-state" ?running=${s}>
          ${s ? i ? `Fut · ${a} perc` : "Fut" : t.available ? `Tétlen · ${o}` : "Nem elérhető"}
        </span>
        <label class="duration">
          <input
            type="number"
            min="1"
            max="180"
            .value=${String(e)}
            aria-label="${t.name} időtartama percben"
            @change=${(d) => {
      const n = d.target;
      this._zoneDurations = {
        ...this._zoneDurations,
        [t.entity_id]: this._clampDuration(n.valueAsNumber)
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
  _renderRailProgram(t) {
    const e = this._programMinutes(t);
    return l`
      <div class="program-rail-item">
        <div class="program-line">
          <ha-icon icon=${t.start_time < "12:00" ? "mdi:weather-sunset-up" : "mdi:weather-night"}></ha-icon>
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
          <div>Kezdés: ${t.start_time}</div>
          <div>Számított öntözési idő: ${e} perc</div>
        </div>
      </div>
    `;
  }
  _renderCompactHistory(t) {
    return l`
      <div class="history-compact">
        <div class="history-compact-title">Legutóbbi események</div>
        ${t ? l`
              <div>${this._formatDateTime(t.scheduled_at)} · ${t.program_name}</div>
              <div class="history-reason">${t.reason}</div>
            ` : l`<div class="subtle">Még nincs futási előzmény.</div>`}
      </div>
    `;
  }
  _renderPrograms() {
    const t = this._summary.programs, e = this._draft;
    return l`
      <div class="page-head">
        <h2>Programok</h2>
        <button class="button primary" @click=${this._newProgram}>
          <ha-icon icon="mdi:plus"></ha-icon>
          Új program
        </button>
      </div>
      <div class="program-workspace">
        <div class="program-list">
          ${t.length ? t.map(
      (s) => l`
                  <button
                    class="program-list-item"
                    ?selected=${e?.program_id === s.program_id}
                    @click=${() => {
        this._draft = T(s);
      }}
                  >
                    <strong>${s.name}</strong>
                    <span>${s.enabled ? "Aktív" : "Kikapcsolva"}</span>
                    <span>${this._formatDays(s.weekdays)} · ${s.start_time}</span>
                    <span>${this._programMinutes(s)} perc</span>
                  </button>
                `
    ) : l`<div class="empty">Hozd létre az első öntözési programot.</div>`}
        </div>
        ${e ? this._renderProgramEditor(e) : l`<div class="empty">Válassz egy programot.</div>`}
      </div>
    `;
  }
  _renderProgramEditor(t) {
    const e = this._allZones();
    return l`
      <form class="editor" @submit=${this._saveDraft}>
        <div class="field">
          <label for="program-name">Program neve</label>
          <input
            id="program-name"
            type="text"
            maxlength="64"
            required
            .value=${t.name}
            @input=${(s) => this._patchDraft({ name: s.target.value })}
          />
        </div>
        <div class="field">
          <span class="field-label">Napok</span>
          <div class="days">
            ${Bt.map(
      (s, i) => l`
                <button
                  class="day"
                  type="button"
                  ?selected=${t.weekdays.includes(i)}
                  aria-pressed=${t.weekdays.includes(i)}
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
            .value=${t.start_time}
            @input=${(s) => this._patchDraft({ start_time: s.target.value })}
          />
        </div>
        <div class="checkline">
          <input
            id="program-enabled"
            type="checkbox"
            .checked=${t.enabled}
            @change=${(s) => this._patchDraft({ enabled: s.target.checked })}
          />
          <label for="program-enabled">Program engedélyezve</label>
        </div>
        <div class="checkline">
          <input
            id="program-weather"
            type="checkbox"
            .checked=${t.weather_adjustment}
            @change=${(s) => this._patchDraft({
      weather_adjustment: s.target.checked
    })}
          />
          <label for="program-weather">Időjárás-korrekció használata</label>
        </div>
        <div class="field">
          <span class="field-label">Zónák sorrendben</span>
          <div class="editor-zones">
            ${t.zones.map((s, i) => {
      const a = e.find((o) => o.entity_id === s.entity_id);
      return l`
                <div class="editor-zone">
                  <span>${a?.name ?? s.entity_id}</span>
                  <select
                    aria-label="${a?.name ?? s.entity_id} időtartam módja"
                    .value=${s.duration_mode}
                    @change=${(o) => this._updateDraftZone(i, {
        ...s,
        duration_mode: o.target.value
      })}
                  >
                    <option value="manual">Manuális perc</option>
                    <option value="reference">Referencia alapján</option>
                  </select>
                  ${s.duration_mode === "reference" ? l`
                        <span class="calculated-duration">
                          ≈ ${this._programZoneMinutes(t, s)} perc
                        </span>
                      ` : l`
                        <label class="editor-duration">
                          <input
                            type="number"
                            min="1"
                            max="180"
                            aria-label="${a?.name ?? s.entity_id} időtartama"
                            .value=${String(s.duration_minutes)}
                            @change=${(o) => this._updateDraftZone(i, {
        ...s,
        duration_minutes: this._clampDuration(
          o.target.valueAsNumber
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
            ${t.zones.length === 0 ? l`<div class="empty">Adj legalább egy zónát a programhoz.</div>` : p}
          </div>
        </div>
        <div class="field">
          <label for="zone-add">Zóna hozzáadása</label>
          <select id="zone-add" @change=${this._addDraftZone}>
            <option value="">Válassz zónát…</option>
            ${e.filter((s) => !t.zones.some((i) => i.entity_id === s.entity_id)).map((s) => l`<option value=${s.entity_id}>${s.name}</option>`)}
          </select>
        </div>
        ${this._error ? l`<div class="error">${this._error}</div>` : p}
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
    return l`
      <div class="page-head"><h2>Előzmények</h2></div>
      ${t.length ? l`
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
      (e) => l`
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
                        <td class="reason-cell">${e.reason}</td>
                      </tr>
                    `
    )}
                </tbody>
              </table>
            </div>
          ` : l`<div class="empty">Még nincs futási előzmény.</div>`}
    `;
  }
  _renderSettings() {
    const t = this._summary.settings;
    return l`
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
        ${this._allZones().map((e) => this._renderZoneProfile(e))}
      </section>
      ${this._error ? l`<div class="error">${this._error}</div>` : p}
    `;
  }
  _renderZoneProfile(t) {
    const e = t.profile, s = e.flow_l_min !== null && e.area_m2 !== null;
    return l`
      <div class="zone-profile-row">
        <strong>${t.name}</strong>
        <label>
          <span class="mobile-label">Fejtípus</span>
          <select
            .value=${e.head_type}
            @change=${(i) => {
      const a = i.target.value, o = j.find((d) => d.value === a);
      this._patchZoneProfile(t.entity_id, {
        head_type: a,
        reference_rate_mm_h: o?.rate ?? e.reference_rate_mm_h
      });
    }}
          >
            ${j.map(
      (i) => l`
                  <option
                    value=${i.value}
                    ?selected=${i.value === e.head_type}
                  >
                    ${i.label}
                  </option>
                `
    )}
          </select>
        </label>
        ${this._profileNumber(t, "reference_rate_mm_h", "mm/óra", 0.1)}
        ${this._profileNumber(t, "flow_l_min", "l/perc", 0.1, !0)}
        ${this._profileNumber(t, "area_m2", "m²", 0.1, !0)}
        <span class="effective-rate">
          <strong>${this._effectiveRate(e).toFixed(1)} mm/óra</strong>
          <span>${s ? "mért adatokból" : "referencia"}</span>
        </span>
      </div>
    `;
  }
  _profileNumber(t, e, s, i, a = !1) {
    const o = t.profile[e];
    return l`
      <label class="profile-number">
        <span class="mobile-label">${s}</span>
        <input
          type="number"
          min="0.1"
          step=${i}
          placeholder=${a ? "opcionális" : ""}
          .value=${o === null ? "" : String(o)}
          @change=${(d) => {
      const n = d.target;
      this._patchZoneProfile(t.entity_id, {
        [e]: n.value === "" ? null : n.valueAsNumber
      });
    }}
        />
        <span>${s}</span>
      </label>
    `;
  }
  _settingNumber(t, e, s) {
    return l`
      <label class="setting-row">
        <span>${t}</span>
        <input
          type="number"
          step="0.1"
          .value=${String(s[e])}
          @change=${(i) => this._patchSettings({
      [e]: i.target.valueAsNumber
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
      const e = await Dt(this.hass);
      this._summary = e, !this._expandedControllers.length && e.controllers[0] && (this._expandedControllers = [e.controllers[0].id]), this._error = "", !e.weather && t && (e.weather = await Nt(this.hass), this._summary = { ...e }), this._tab === "programs" && !this._draft && this._selectFirstProgram();
    } catch (e) {
      this._error = this._errorMessage(e);
    } finally {
      this._loading = !1;
    }
  }
  _selectFirstProgram() {
    const t = this._summary?.programs[0];
    this._draft = t ? T(t) : null;
  }
  _nextProgramName() {
    if (!this._summary?.next_run) return "";
    const t = new Date(this._summary.next_run);
    return this._summary.programs.find((e) => {
      const [s, i] = e.start_time.split(":").map(Number);
      return s === t.getHours() && i === t.getMinutes();
    })?.name ?? "Program";
  }
  _programMinutes(t) {
    return t.zones.reduce(
      (e, s) => e + this._programZoneMinutes(t, s),
      0
    );
  }
  _programZoneMinutes(t, e) {
    const s = this._summary?.weather;
    if (e.duration_mode !== "reference") {
      const n = t.weather_adjustment ? s?.factor ?? 1 : 1;
      return Math.max(1, Math.round(e.duration_minutes * n));
    }
    const i = this._zoneProfile(e.entity_id);
    if (!i) return e.duration_minutes;
    const a = s?.max_temperature ?? 20, o = a >= 35 ? 9 : a >= 25 ? 5.5 : a >= 20 ? 4.5 : 2.5, d = t.weather_adjustment ? s?.rain_factor ?? s?.factor ?? 1 : 1;
    return Math.max(
      1,
      Math.min(180, Math.round(o * d * 60 / this._effectiveRate(i)))
    );
  }
  _allZones() {
    return this._summary?.controllers.flatMap((t) => t.zones) ?? [];
  }
  _toggleController(t) {
    this._expandedControllers = this._expandedControllers.includes(t) ? this._expandedControllers.filter((e) => e !== t) : [...this._expandedControllers, t];
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
    this._summary && (this._summary = {
      ...this._summary,
      settings: { ...this._summary.settings, ...t }
    });
  }
  _patchZoneProfile(t, e) {
    this._summary && (this._summary = {
      ...this._summary,
      controllers: this._summary.controllers.map((s) => ({
        ...s,
        zones: s.zones.map(
          (i) => i.entity_id === t ? { ...i, profile: { ...i.profile, ...e } } : i
        )
      }))
    });
  }
  _formatDays(t) {
    return t.map((e) => It[e] ?? "").join(", ");
  }
  _zoneProfile(t) {
    return this._allZones().find((e) => e.entity_id === t)?.profile;
  }
  _effectiveRate(t) {
    return t.flow_l_min !== null && t.area_m2 !== null && t.area_m2 > 0 ? t.flow_l_min * 60 / t.area_m2 : t.reference_rate_mm_h;
  }
  _headLabel(t) {
    return j.find((e) => e.value === t)?.label ?? t;
  }
  _formatDateTime(t) {
    return new Intl.DateTimeFormat("hu-HU", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(t));
  }
  _formatRelative(t) {
    const e = new Date(t), s = /* @__PURE__ */ new Date(), i = new Date(s);
    return i.setDate(s.getDate() + 1), `${e.toDateString() === s.toDateString() ? "ma" : e.toDateString() === i.toDateString() ? "holnap" : new Intl.DateTimeFormat("hu-HU", {
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
customElements.get("smart-yardian-panel") || customElements.define("smart-yardian-panel", Vt);
export {
  Vt as SmartYardianPanel
};
//# sourceMappingURL=smart-yardian-panel.js.map
