class SimpleDOMMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;

  constructor(init?: number[] | Float32Array | Float64Array) {
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.e = 0;
    this.f = 0;

    if (init && init.length >= 6) {
      this.a = init[0];
      this.b = init[1];
      this.c = init[2];
      this.d = init[3];
      this.e = init[4];
      this.f = init[5];
    }
  }

  scaleSelf(scaleX = 1, scaleY = scaleX) {
    this.a *= scaleX;
    this.b *= scaleX;
    this.c *= scaleY;
    this.d *= scaleY;
    return this;
  }

  translateSelf(tx = 0, ty = 0) {
    this.e += tx;
    this.f += ty;
    return this;
  }

  multiplySelf(other: SimpleDOMMatrix) {
    const a = this.a * other.a + this.c * other.b;
    const b = this.b * other.a + this.d * other.b;
    const c = this.a * other.c + this.c * other.d;
    const d = this.b * other.c + this.d * other.d;
    const e = this.a * other.e + this.c * other.f + this.e;
    const f = this.b * other.e + this.d * other.f + this.f;

    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;

    return this;
  }

  toFloat32Array() {
    return new Float32Array([this.a, this.b, this.c, this.d, this.e, this.f]);
  }

  toFloat64Array() {
    return new Float64Array([this.a, this.b, this.c, this.d, this.e, this.f]);
  }
}

if (typeof (globalThis as { DOMMatrix?: typeof SimpleDOMMatrix }).DOMMatrix === 'undefined') {
  (globalThis as { DOMMatrix?: typeof SimpleDOMMatrix }).DOMMatrix = SimpleDOMMatrix;
}

type _EnsureModule = typeof SimpleDOMMatrix;
export {};
