const C = globalThis, R = C.ShadowRoot && (C.ShadyCSS === void 0 || C.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Z = /* @__PURE__ */ Symbol(), F = /* @__PURE__ */ new WeakMap();
let rt = class {
  constructor(t, e, i) {
    if (this._$cssResult$ = !0, i !== Z) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = e;
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (R && t === void 0) {
      const i = e !== void 0 && e.length === 1;
      i && (t = F.get(e)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), i && F.set(e, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const dt = (s) => new rt(typeof s == "string" ? s : s + "", void 0, Z), pt = (s, ...t) => {
  const e = s.length === 1 ? s[0] : t.reduce((i, r, a) => i + ((o) => {
    if (o._$cssResult$ === !0) return o.cssText;
    if (typeof o == "number") return o;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + o + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + s[a + 1], s[0]);
  return new rt(e, s, Z);
}, ct = (s, t) => {
  if (R) s.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
  else for (const e of t) {
    const i = document.createElement("style"), r = C.litNonce;
    r !== void 0 && i.setAttribute("nonce", r), i.textContent = e.cssText, s.appendChild(i);
  }
}, V = R ? (s) => s : (s) => s instanceof CSSStyleSheet ? ((t) => {
  let e = "";
  for (const i of t.cssRules) e += i.cssText;
  return dt(e);
})(s) : s;
const { is: ht, defineProperty: mt, getOwnPropertyDescriptor: ut, getOwnPropertyNames: gt, getOwnPropertySymbols: _t, getPrototypeOf: ft } = Object, N = globalThis, q = N.trustedTypes, bt = q ? q.emptyScript : "", yt = N.reactiveElementPolyfillSupport, k = (s, t) => s, O = { toAttribute(s, t) {
  switch (t) {
    case Boolean:
      s = s ? bt : null;
      break;
    case Object:
    case Array:
      s = s == null ? s : JSON.stringify(s);
  }
  return s;
}, fromAttribute(s, t) {
  let e = s;
  switch (t) {
    case Boolean:
      e = s !== null;
      break;
    case Number:
      e = s === null ? null : Number(s);
      break;
    case Object:
    case Array:
      try {
        e = JSON.parse(s);
      } catch {
        e = null;
      }
  }
  return e;
} }, st = (s, t) => !ht(s, t), K = { attribute: !0, type: String, converter: O, reflect: !1, useDefault: !1, hasChanged: st };
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
      const i = /* @__PURE__ */ Symbol(), r = this.getPropertyDescriptor(t, i, e);
      r !== void 0 && mt(this.prototype, t, r);
    }
  }
  static getPropertyDescriptor(t, e, i) {
    const { get: r, set: a } = ut(this.prototype, t) ?? { get() {
      return this[e];
    }, set(o) {
      this[e] = o;
    } };
    return { get: r, set(o) {
      const d = r?.call(this);
      a?.call(this, o), this.requestUpdate(t, d, i);
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
      const e = this.properties, i = [...gt(e), ..._t(e)];
      for (const r of i) this.createProperty(r, e[r]);
    }
    const t = this[Symbol.metadata];
    if (t !== null) {
      const e = litPropertyMetadata.get(t);
      if (e !== void 0) for (const [i, r] of e) this.elementProperties.set(i, r);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [e, i] of this.elementProperties) {
      const r = this._$Eu(e, i);
      r !== void 0 && this._$Eh.set(r, e);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const e = [];
    if (Array.isArray(t)) {
      const i = new Set(t.flat(1 / 0).reverse());
      for (const r of i) e.unshift(V(r));
    } else t !== void 0 && e.push(V(t));
    return e;
  }
  static _$Eu(t, e) {
    const i = e.attribute;
    return i === !1 ? void 0 : typeof i == "string" ? i : typeof t == "string" ? t.toLowerCase() : void 0;
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
    for (const i of e.keys()) this.hasOwnProperty(i) && (t.set(i, this[i]), delete this[i]);
    t.size > 0 && (this._$Ep = t);
  }
  createRenderRoot() {
    const t = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return ct(t, this.constructor.elementStyles), t;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((t) => t.hostConnected?.());
  }
  enableUpdating(t) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t) => t.hostDisconnected?.());
  }
  attributeChangedCallback(t, e, i) {
    this._$AK(t, i);
  }
  _$ET(t, e) {
    const i = this.constructor.elementProperties.get(t), r = this.constructor._$Eu(t, i);
    if (r !== void 0 && i.reflect === !0) {
      const a = (i.converter?.toAttribute !== void 0 ? i.converter : O).toAttribute(e, i.type);
      this._$Em = t, a == null ? this.removeAttribute(r) : this.setAttribute(r, a), this._$Em = null;
    }
  }
  _$AK(t, e) {
    const i = this.constructor, r = i._$Eh.get(t);
    if (r !== void 0 && this._$Em !== r) {
      const a = i.getPropertyOptions(r), o = typeof a.converter == "function" ? { fromAttribute: a.converter } : a.converter?.fromAttribute !== void 0 ? a.converter : O;
      this._$Em = r;
      const d = o.fromAttribute(e, a.type);
      this[r] = d ?? this._$Ej?.get(r) ?? d, this._$Em = null;
    }
  }
  requestUpdate(t, e, i, r = !1, a) {
    if (t !== void 0) {
      const o = this.constructor;
      if (r === !1 && (a = this[t]), i ??= o.getPropertyOptions(t), !((i.hasChanged ?? st)(a, e) || i.useDefault && i.reflect && a === this._$Ej?.get(t) && !this.hasAttribute(o._$Eu(t, i)))) return;
      this.C(t, e, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(t, e, { useDefault: i, reflect: r, wrapped: a }, o) {
    i && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t) && (this._$Ej.set(t, o ?? e ?? this[t]), a !== !0 || o !== void 0) || (this._$AL.has(t) || (this.hasUpdated || i || (e = void 0), this._$AL.set(t, e)), r === !0 && this._$Em !== t && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t));
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
        for (const [r, a] of this._$Ep) this[r] = a;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [r, a] of i) {
        const { wrapped: o } = a, d = this[r];
        o !== !0 || this._$AL.has(r) || d === void 0 || this.C(r, void 0, a, d);
      }
    }
    let t = !1;
    const e = this._$AL;
    try {
      t = this.shouldUpdate(e), t ? (this.willUpdate(e), this._$EO?.forEach((i) => i.hostUpdate?.()), this.update(e)) : this._$EM();
    } catch (i) {
      throw t = !1, this._$EM(), i;
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
const L = globalThis, W = (s) => s, D = L.trustedTypes, Y = D ? D.createPolicy("lit-html", { createHTML: (s) => s }) : void 0, at = "$lit$", _ = `lit$${Math.random().toFixed(9).slice(2)}$`, ot = "?" + _, vt = `<${ot}>`, y = document, A = () => y.createComment(""), S = (s) => s === null || typeof s != "object" && typeof s != "function", B = Array.isArray, xt = (s) => B(s) || typeof s?.[Symbol.iterator] == "function", T = `[ 	
\f\r]`, w = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, J = /-->/g, G = />/g, f = RegExp(`>|${T}(?:([^\\s"'>=/]+)(${T}*=${T}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Q = /'/g, X = /"/g, nt = /^(?:script|style|textarea|title)$/i, $t = (s) => (t, ...e) => ({ _$litType$: s, strings: t, values: e }), n = $t(1), x = /* @__PURE__ */ Symbol.for("lit-noChange"), c = /* @__PURE__ */ Symbol.for("lit-nothing"), tt = /* @__PURE__ */ new WeakMap(), b = y.createTreeWalker(y, 129);
function lt(s, t) {
  if (!B(s) || !s.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Y !== void 0 ? Y.createHTML(t) : t;
}
const wt = (s, t) => {
  const e = s.length - 1, i = [];
  let r, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = w;
  for (let d = 0; d < e; d++) {
    const l = s[d];
    let h, m, p = -1, u = 0;
    for (; u < l.length && (o.lastIndex = u, m = o.exec(l), m !== null); ) u = o.lastIndex, o === w ? m[1] === "!--" ? o = J : m[1] !== void 0 ? o = G : m[2] !== void 0 ? (nt.test(m[2]) && (r = RegExp("</" + m[2], "g")), o = f) : m[3] !== void 0 && (o = f) : o === f ? m[0] === ">" ? (o = r ?? w, p = -1) : m[1] === void 0 ? p = -2 : (p = o.lastIndex - m[2].length, h = m[1], o = m[3] === void 0 ? f : m[3] === '"' ? X : Q) : o === X || o === Q ? o = f : o === J || o === G ? o = w : (o = f, r = void 0);
    const g = o === f && s[d + 1].startsWith("/>") ? " " : "";
    a += o === w ? l + vt : p >= 0 ? (i.push(h), l.slice(0, p) + at + l.slice(p) + _ + g) : l + _ + (p === -2 ? d : g);
  }
  return [lt(s, a + (s[e] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), i];
};
class E {
  constructor({ strings: t, _$litType$: e }, i) {
    let r;
    this.parts = [];
    let a = 0, o = 0;
    const d = t.length - 1, l = this.parts, [h, m] = wt(t, e);
    if (this.el = E.createElement(h, i), b.currentNode = this.el.content, e === 2 || e === 3) {
      const p = this.el.content.firstChild;
      p.replaceWith(...p.childNodes);
    }
    for (; (r = b.nextNode()) !== null && l.length < d; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes()) for (const p of r.getAttributeNames()) if (p.endsWith(at)) {
          const u = m[o++], g = r.getAttribute(p).split(_), M = /([.?@])?(.*)/.exec(u);
          l.push({ type: 1, index: a, name: M[2], strings: g, ctor: M[1] === "." ? zt : M[1] === "?" ? At : M[1] === "@" ? St : H }), r.removeAttribute(p);
        } else p.startsWith(_) && (l.push({ type: 6, index: a }), r.removeAttribute(p));
        if (nt.test(r.tagName)) {
          const p = r.textContent.split(_), u = p.length - 1;
          if (u > 0) {
            r.textContent = D ? D.emptyScript : "";
            for (let g = 0; g < u; g++) r.append(p[g], A()), b.nextNode(), l.push({ type: 2, index: ++a });
            r.append(p[u], A());
          }
        }
      } else if (r.nodeType === 8) if (r.data === ot) l.push({ type: 2, index: a });
      else {
        let p = -1;
        for (; (p = r.data.indexOf(_, p + 1)) !== -1; ) l.push({ type: 7, index: a }), p += _.length - 1;
      }
      a++;
    }
  }
  static createElement(t, e) {
    const i = y.createElement("template");
    return i.innerHTML = t, i;
  }
}
function $(s, t, e = s, i) {
  if (t === x) return t;
  let r = i !== void 0 ? e._$Co?.[i] : e._$Cl;
  const a = S(t) ? void 0 : t._$litDirective$;
  return r?.constructor !== a && (r?._$AO?.(!1), a === void 0 ? r = void 0 : (r = new a(s), r._$AT(s, e, i)), i !== void 0 ? (e._$Co ??= [])[i] = r : e._$Cl = r), r !== void 0 && (t = $(s, r._$AS(s, t.values), r, i)), t;
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
    const { el: { content: e }, parts: i } = this._$AD, r = (t?.creationScope ?? y).importNode(e, !0);
    b.currentNode = r;
    let a = b.nextNode(), o = 0, d = 0, l = i[0];
    for (; l !== void 0; ) {
      if (o === l.index) {
        let h;
        l.type === 2 ? h = new P(a, a.nextSibling, this, t) : l.type === 1 ? h = new l.ctor(a, l.name, l.strings, this, t) : l.type === 6 && (h = new Et(a, this, t)), this._$AV.push(h), l = i[++d];
      }
      o !== l?.index && (a = b.nextNode(), o++);
    }
    return b.currentNode = y, r;
  }
  p(t) {
    let e = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(t, i, e), e += i.strings.length - 2) : i._$AI(t[e])), e++;
  }
}
class P {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t, e, i, r) {
    this.type = 2, this._$AH = c, this._$AN = void 0, this._$AA = t, this._$AB = e, this._$AM = i, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
    t = $(this, t, e), S(t) ? t === c || t == null || t === "" ? (this._$AH !== c && this._$AR(), this._$AH = c) : t !== this._$AH && t !== x && this._(t) : t._$litType$ !== void 0 ? this.$(t) : t.nodeType !== void 0 ? this.T(t) : xt(t) ? this.k(t) : this._(t);
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
  }
  _(t) {
    this._$AH !== c && S(this._$AH) ? this._$AA.nextSibling.data = t : this.T(y.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    const { values: e, _$litType$: i } = t, r = typeof i == "number" ? this._$AC(t) : (i.el === void 0 && (i.el = E.createElement(lt(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === r) this._$AH.p(e);
    else {
      const a = new kt(r, this), o = a.u(this.options);
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
    let i, r = 0;
    for (const a of t) r === e.length ? e.push(i = new P(this.O(A()), this.O(A()), this, this.options)) : i = e[r], i._$AI(a), r++;
    r < e.length && (this._$AR(i && i._$AB.nextSibling, r), e.length = r);
  }
  _$AR(t = this._$AA.nextSibling, e) {
    for (this._$AP?.(!1, !0, e); t !== this._$AB; ) {
      const i = W(t).nextSibling;
      W(t).remove(), t = i;
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
  constructor(t, e, i, r, a) {
    this.type = 1, this._$AH = c, this._$AN = void 0, this.element = t, this.name = e, this._$AM = r, this.options = a, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = c;
  }
  _$AI(t, e = this, i, r) {
    const a = this.strings;
    let o = !1;
    if (a === void 0) t = $(this, t, e, 0), o = !S(t) || t !== this._$AH && t !== x, o && (this._$AH = t);
    else {
      const d = t;
      let l, h;
      for (t = a[0], l = 0; l < a.length - 1; l++) h = $(this, d[i + l], e, l), h === x && (h = this._$AH[l]), o ||= !S(h) || h !== this._$AH[l], h === c ? t = c : t !== c && (t += (h ?? "") + a[l + 1]), this._$AH[l] = h;
    }
    o && !r && this.j(t);
  }
  j(t) {
    t === c ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
  }
}
class zt extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === c ? void 0 : t;
  }
}
class At extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== c);
  }
}
class St extends H {
  constructor(t, e, i, r, a) {
    super(t, e, i, r, a), this.type = 5;
  }
  _$AI(t, e = this) {
    if ((t = $(this, t, e, 0) ?? c) === x) return;
    const i = this._$AH, r = t === c && i !== c || t.capture !== i.capture || t.once !== i.once || t.passive !== i.passive, a = t !== c && (i === c || r);
    r && this.element.removeEventListener(this.name, this, i), a && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, t) : this._$AH.handleEvent(t);
  }
}
class Et {
  constructor(t, e, i) {
    this.element = t, this.type = 6, this._$AN = void 0, this._$AM = e, this.options = i;
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
const Mt = (s, t, e) => {
  const i = e?.renderBefore ?? t;
  let r = i._$litPart$;
  if (r === void 0) {
    const a = e?.renderBefore ?? null;
    i._$litPart$ = r = new P(t.insertBefore(A(), a), a, void 0, e ?? {});
  }
  return r._$AI(s), r;
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
const Dt = (s) => s.connection.sendMessagePromise({ type: "smart_yardian/summary" }), Nt = (s) => s.connection.sendMessagePromise({
  type: "smart_yardian/weather/preview"
}), et = (s, t) => s.connection.sendMessagePromise({
  type: "smart_yardian/program/save",
  program: t
}), Ht = (s, t) => s.connection.sendMessagePromise({
  type: "smart_yardian/program/delete",
  program_id: t
}), Tt = (s, t) => s.connection.sendMessagePromise({
  type: "smart_yardian/settings/update",
  settings: t
}), Ut = (s, t) => s.connection.sendMessagePromise({
  type: "smart_yardian/zone_profiles/update",
  profiles: t
}), jt = (s, t) => s.connection.sendMessagePromise({
  type: "smart_yardian/automation/set",
  enabled: t
}), Ot = (s, t) => s.connection.sendMessagePromise({
  type: "smart_yardian/run/program",
  program_id: t,
  apply_weather: !0
}), Rt = (s, t, e) => s.connection.sendMessagePromise({
  type: "smart_yardian/run/zone",
  entity_id: t,
  duration_minutes: e
}), Zt = (s) => s.connection.sendMessagePromise({ type: "smart_yardian/run/stop" }), it = (s, t) => s.connection.sendMessagePromise({
  type: "smart_yardian/pause_until",
  until: t
}), Lt = pt`
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
`, Bt = ["H", "K", "Sze", "Cs", "P", "Szo", "V"], It = ["Hé", "Ke", "Sze", "Csü", "Pén", "Szo", "Vas"], U = [
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
  temperature_condition_enabled: !1,
  temperature_condition_operator: "above",
  temperature_condition_value: 30,
  zones: [],
  skip_next: !1
}), j = (s) => JSON.parse(JSON.stringify(s));
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
          await this._load(!1), this._draft = j(e);
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
            (i) => i.program_id === t.program_id
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
          await jt(this.hass, !this._summary.automation_enabled), await this._load(!1);
        } catch (t) {
          this._error = this._errorMessage(t);
        }
    }, this._saveSettings = async () => {
      if (!(!this.hass || !this._summary))
        try {
          await Tt(this.hass, this._summary.settings), await Ut(
            this.hass,
            this._allZones().map((t) => t.profile)
          ), await this._load(!1);
        } catch (t) {
          this._error = this._errorMessage(t);
        }
    }, this._pauseDay = async () => {
      if (!this.hass) return;
      const t = new Date(Date.now() + 1440 * 60 * 1e3).toISOString();
      await it(this.hass, t), await this._load(!1);
    }, this._resume = async () => {
      this.hass && (await it(this.hass, null), await this._load(!1));
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
    return n`
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
          ${this._loading && !this._summary ? n`<div class="loading">Az öntözésvezérlő betöltése…</div>` : this._error && !this._summary ? n`<div class="error">${this._error}</div>` : this._renderTab()}
        </main>
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
      this._tab = t, t === "programs" && !this._draft && this._selectFirstProgram();
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
      case "history":
        return this._renderHistory();
      case "settings":
        return this._renderSettings();
      default:
        return this._renderOverview();
    }
  }
  _renderOverview() {
    const t = this._summary, e = t.weather, i = t.automation_enabled;
    return n`
      <section class="automation">
        <div class="automation-icon" ?off=${!i}>
          <ha-icon icon=${i ? "mdi:check" : "mdi:pause"}></ha-icon>
        </div>
        <div class="automation-copy">
          <div class="automation-title" ?off=${!i}>
            ${i ? "Automatika aktív" : "Automatika kikapcsolva"}
          </div>
          <div class="subtle">
            ${i ? "Az öntözés az időjárás figyelembevételével történik." : "Az ütemezett programok nem indulnak el."}
          </div>
        </div>
        <button
          class="toggle"
          ?on=${i}
          aria-label=${i ? "Automatika kikapcsolása" : "Automatika bekapcsolása"}
          @click=${this._toggleAutomation}
        ></button>
      </section>

      ${this._renderWeather(e)}

      <div class="next-run">
        <ha-icon icon="mdi:clock-outline"></ha-icon>
        ${t.next_run ? n`
              <span>Következő:</span>
              <span class="linklike">${this._nextProgramName()}</span>
              <span>· ${this._formatRelative(t.next_run)}</span>
            ` : n`<span>Nincs következő engedélyezett program</span>`}
      </div>

      <div class="overview-grid">
        <div class="controllers">
          ${t.controllers.length ? t.controllers.map((r) => this._renderController(r)) : n`<div class="empty">Nincs konfigurált Yardian zóna.</div>`}
        </div>
        <aside class="rail">
          <div class="rail-title">
            <span>Programok</span>
            <button class="text-action" @click=${this._newProgram}>+ Hozzáadás</button>
          </div>
          ${t.programs.length ? t.programs.slice(0, 3).map((r) => this._renderRailProgram(r)) : n`<div class="empty">Még nincs program.</div>`}
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
    const e = t.percent ?? 0, i = e === 0 ? "kihagyás" : e < 80 ? "csökkentett öntözés" : e > 120 ? "emelt öntözés" : "mérsékelt öntözés";
    return n`
      <section class="weather-band">
        <div class="weather-summary">
          <ha-icon icon=${e === 0 ? "mdi:weather-rainy" : "mdi:weather-partly-cloudy"}></ha-icon>
          <div>
            <div class="decision">Ma ${e}% · ${i}</div>
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
  _metric(t, e, i, r = "") {
    return n`
      <div class="metric ${r}">
        <ha-icon icon=${t}></ha-icon>
        <span class="metric-label">${e}</span>
        <span class="metric-value">${i}</span>
      </div>
    `;
  }
  _renderController(t) {
    const i = !window.matchMedia("(max-width: 600px)").matches || this._expandedControllers.includes(t.id);
    return n`
      <section class="controller" ?collapsed=${!i}>
        <button
          class="controller-head"
          aria-expanded=${i}
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
            icon=${i ? "mdi:chevron-up" : "mdi:chevron-down"}
          ></ha-icon>
        </button>
        ${t.zones.map((r) => this._renderZone(r))}
      </section>
    `;
  }
  _renderZone(t) {
    const e = this._zoneDurations[t.entity_id] ?? 15, i = t.state === "on", r = this._summary?.active_run?.current_zone === t.entity_id, a = Number(this._summary?.active_run?.current_duration ?? e), o = this._headLabel(t.profile.head_type);
    return n`
      <div class="zone-row">
        <ha-icon icon="mdi:water"></ha-icon>
        <span class="zone-name">${t.name}</span>
        <span class="zone-state" ?running=${i}>
          ${i ? r ? `Fut · ${a} perc` : "Fut" : t.available ? `Tétlen · ${o}` : "Nem elérhető"}
        </span>
        <label class="duration">
          <input
            type="number"
            min="1"
            max="180"
            .value=${String(e)}
            aria-label="${t.name} időtartama percben"
            @change=${(d) => {
      const l = d.target;
      this._zoneDurations = {
        ...this._zoneDurations,
        [t.entity_id]: this._clampDuration(l.valueAsNumber)
      };
    }}
          />
          <span>perc</span>
        </label>
        <button
          class="button"
          ?disabled=${!t.available || i}
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
    return n`
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
          ${t.temperature_condition_enabled ? n`<div>${this._temperatureConditionText(t)}</div>` : c}
          <div>Számított öntözési idő: ${e} perc</div>
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
  _renderPrograms() {
    const t = this._summary.programs, e = this._draft;
    return n`
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
      (i) => n`
                  <button
                    class="program-list-item"
                    ?selected=${e?.program_id === i.program_id}
                    @click=${() => {
        this._draft = j(i);
      }}
                  >
                    <strong>${i.name}</strong>
                    <span>${i.enabled ? "Aktív" : "Kikapcsolva"}</span>
                    <span>${this._formatDays(i.weekdays)} · ${i.start_time}</span>
                    <span>${this._programMinutes(i)} perc</span>
                  </button>
                `
    ) : n`<div class="empty">Hozd létre az első öntözési programot.</div>`}
        </div>
        ${e ? this._renderProgramEditor(e) : n`<div class="empty">Válassz egy programot.</div>`}
      </div>
    `;
  }
  _renderProgramEditor(t) {
    const e = this._allZones();
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
            @input=${(i) => this._patchDraft({ name: i.target.value })}
          />
        </div>
        <div class="field">
          <span class="field-label">Napok</span>
          <div class="days">
            ${Bt.map(
      (i, r) => n`
                <button
                  class="day"
                  type="button"
                  ?selected=${t.weekdays.includes(r)}
                  aria-pressed=${t.weekdays.includes(r)}
                  @click=${() => this._toggleDay(r)}
                >
                  ${i}
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
            @input=${(i) => this._patchDraft({ start_time: i.target.value })}
          />
        </div>
        <div class="checkline">
          <input
            id="program-enabled"
            type="checkbox"
            .checked=${t.enabled}
            @change=${(i) => this._patchDraft({ enabled: i.target.checked })}
          />
          <label for="program-enabled">Program engedélyezve</label>
        </div>
        <div class="checkline">
          <input
            id="program-weather"
            type="checkbox"
            .checked=${t.weather_adjustment}
            @change=${(i) => this._patchDraft({
      weather_adjustment: i.target.checked
    })}
          />
          <label for="program-weather">Időjárás-korrekció használata</label>
        </div>
        <div class="checkline">
          <input
            id="program-temperature-condition"
            type="checkbox"
            .checked=${t.temperature_condition_enabled}
            @change=${(i) => this._patchDraft({
      temperature_condition_enabled: i.target.checked
    })}
          />
          <label for="program-temperature-condition">
            Hőmérséklet-feltétel használata
          </label>
        </div>
        ${t.temperature_condition_enabled ? n`
              <div class="temperature-condition">
                <span>A következő 24 óra maximuma</span>
                <select
                  aria-label="Hőmérséklet összehasonlítása"
                  .value=${t.temperature_condition_operator}
                  @change=${(i) => this._patchDraft({
      temperature_condition_operator: i.target.value
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
                    @change=${(i) => this._patchDraft({
      temperature_condition_value: Math.max(
        -30,
        Math.min(
          60,
          i.target.valueAsNumber
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
            ${t.zones.map((i, r) => {
      const a = e.find((o) => o.entity_id === i.entity_id);
      return n`
                <div class="editor-zone">
                  <span>${a?.name ?? i.entity_id}</span>
                  <select
                    aria-label="${a?.name ?? i.entity_id} időtartam módja"
                    .value=${i.duration_mode}
                    @change=${(o) => this._updateDraftZone(r, {
        ...i,
        duration_mode: o.target.value
      })}
                  >
                    <option value="manual">Manuális perc</option>
                    <option value="reference">Referencia alapján</option>
                  </select>
                  ${i.duration_mode === "reference" ? n`
                        <span class="calculated-duration">
                          ≈ ${this._programZoneMinutes(t, i)} perc
                        </span>
                      ` : n`
                        <label class="editor-duration">
                          <input
                            type="number"
                            min="1"
                            max="180"
                            aria-label="${a?.name ?? i.entity_id} időtartama"
                            .value=${String(i.duration_minutes)}
                            @change=${(o) => this._updateDraftZone(r, {
        ...i,
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
                    @click=${() => this._removeDraftZone(r)}
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
            ${e.filter((i) => !t.zones.some((r) => r.entity_id === i.entity_id)).map((i) => n`<option value=${i.entity_id}>${i.name}</option>`)}
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
                        <td class="reason-cell">${e.reason}</td>
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
      ${this._error ? n`<div class="error">${this._error}</div>` : c}
    `;
  }
  _renderZoneProfile(t) {
    const e = t.profile, i = e.flow_l_min !== null && e.area_m2 !== null;
    return n`
      <div class="zone-profile-row">
        <strong>${t.name}</strong>
        <label>
          <span class="mobile-label">Fejtípus</span>
          <select
            .value=${e.head_type}
            @change=${(r) => {
      const a = r.target.value, o = U.find((d) => d.value === a);
      this._patchZoneProfile(t.entity_id, {
        head_type: a,
        reference_rate_mm_h: o?.rate ?? e.reference_rate_mm_h
      });
    }}
          >
            ${U.map(
      (r) => n`
                  <option
                    value=${r.value}
                    ?selected=${r.value === e.head_type}
                  >
                    ${r.label}
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
          <span>${i ? "mért adatokból" : "referencia"}</span>
        </span>
      </div>
    `;
  }
  _profileNumber(t, e, i, r, a = !1) {
    const o = t.profile[e];
    return n`
      <label class="profile-number">
        <span class="mobile-label">${i}</span>
        <input
          type="number"
          min="0.1"
          step=${r}
          placeholder=${a ? "opcionális" : ""}
          .value=${o === null ? "" : String(o)}
          @change=${(d) => {
      const l = d.target;
      this._patchZoneProfile(t.entity_id, {
        [e]: l.value === "" ? null : l.valueAsNumber
      });
    }}
        />
        <span>${i}</span>
      </label>
    `;
  }
  _settingNumber(t, e, i) {
    return n`
      <label class="setting-row">
        <span>${t}</span>
        <input
          type="number"
          step="0.1"
          .value=${String(i[e])}
          @change=${(r) => this._patchSettings({
      [e]: r.target.valueAsNumber
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
    this._draft = t ? j(t) : null;
  }
  _nextProgramName() {
    if (!this._summary?.next_run) return "";
    const t = new Date(this._summary.next_run);
    return this._summary.programs.find((e) => {
      const [i, r] = e.start_time.split(":").map(Number);
      return i === t.getHours() && r === t.getMinutes();
    })?.name ?? "Program";
  }
  _programMinutes(t) {
    return t.zones.reduce(
      (e, i) => e + this._programZoneMinutes(t, i),
      0
    );
  }
  _programZoneMinutes(t, e) {
    const i = this._summary?.weather;
    if (e.duration_mode !== "reference") {
      const l = t.weather_adjustment ? i?.factor ?? 1 : 1;
      return Math.max(1, Math.round(e.duration_minutes * l));
    }
    const r = this._zoneProfile(e.entity_id);
    if (!r) return e.duration_minutes;
    const a = i?.max_temperature ?? 20, o = a >= 35 ? 9 : a >= 25 ? 5.5 : a >= 20 ? 4.5 : 2.5, d = t.weather_adjustment ? i?.rain_factor ?? i?.factor ?? 1 : 1;
    return Math.max(
      1,
      Math.min(180, Math.round(o * d * 60 / this._effectiveRate(r)))
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
    const e = this._draft.weekdays.includes(t) ? this._draft.weekdays.filter((i) => i !== t) : [...this._draft.weekdays, t].sort();
    this._patchDraft({ weekdays: e });
  }
  _updateDraftZone(t, e) {
    if (!this._draft) return;
    const i = [...this._draft.zones];
    i[t] = e, this._patchDraft({ zones: i });
  }
  _removeDraftZone(t) {
    this._draft && this._patchDraft({
      zones: this._draft.zones.filter((e, i) => i !== t)
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
      controllers: this._summary.controllers.map((i) => ({
        ...i,
        zones: i.zones.map(
          (r) => r.entity_id === t ? { ...r, profile: { ...r.profile, ...e } } : r
        )
      }))
    });
  }
  _formatDays(t) {
    return t.map((e) => It[e] ?? "").join(", ");
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
    return U.find((e) => e.value === t)?.label ?? t;
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
    const e = new Date(t), i = /* @__PURE__ */ new Date(), r = new Date(i);
    return r.setDate(i.getDate() + 1), `${e.toDateString() === i.toDateString() ? "ma" : e.toDateString() === r.toDateString() ? "holnap" : new Intl.DateTimeFormat("hu-HU", {
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
