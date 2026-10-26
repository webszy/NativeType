// Minimal DOM for state and event tests. Layout uses fixed rectangles; visual
// placement and real editor behavior belong to the browser regression fixture.
export function installDOM(t) {
  const originals = new Map();
  const frames = new Map();
  const mutationObservers = new Set();
  const cleanup = [];
  let frameId = 0;
  let document;

  class Element {
    constructor(tag) {
      this.tagName = tag.toLowerCase();
      this.children = [];
      this.parentElement = null;
      this.dataset = {};
      this.attributes = new Map();
      this.listeners = new Map();
      this.value = '';
      this.checked = false;
      this.hidden = false;
      this.disabled = false;
      const styles = new Map();
      this.style = {
        setProperty: (name, value, priority = '') => styles.set(name, { value, priority }),
        getPropertyValue: name => styles.get(name)?.value ?? '',
        getPropertyPriority: name => styles.get(name)?.priority ?? '',
        removeProperty: name => styles.delete(name),
      };
    }
    get isConnected() { return this === document.documentElement || !!(this.parentElement ?? this.shadowHost)?.isConnected; }
    get options() { return this.children; }
    get previousElementSibling() { return this.parentElement?.children[this.parentElement.children.indexOf(this) - 1] ?? null; }
    get textContent() { return (this.text ?? '') + this.children.map(child => child.textContent).join(''); }
    set textContent(text) { this.replaceChildren(); this.text = text; }
    get innerText() { return this.textContent; }
    set innerText(text) { this.textContent = text; }
    append(...nodes) {
      for (const node of nodes) {
        node.remove();
        this.children.push(node);
        node.parentElement = this;
      }
    }
    remove() {
      if (this.parentElement) this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1);
      this.parentElement = null;
    }
    replaceChildren(...nodes) {
      for (const child of this.children) child.parentElement = null;
      this.children = [];
      this.append(...nodes);
    }
    setAttribute(name, value) { this.attributes.set(name, value); }
    getAttribute(name) {
      if (name.startsWith('data-')) return this.attributes.get(name) ?? this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())];
      if (name === 'contenteditable') return this.contentEditable;
      return this.attributes.get(name);
    }
    contains(node) {
      for (let current = node; current; current = current.parentElement) if (current === this) return true;
      return false;
    }
    matches(selector) {
      if (selector === ':popover-open') return !!this.popoverOpen;
      return selector.split(',').some(part => {
        const tag = part.trim().match(/^[a-z]+/i)?.[0];
        if (tag && tag !== this.tagName) return false;
        return [...part.matchAll(/\[([^\]=^$]+)(?:([\^$]?=)"([^"]*)")?\]/g)].every(([, name, operator, value]) => {
          const actual = this.getAttribute(name);
          if (!operator) return actual !== undefined;
          return operator === '^=' ? actual?.startsWith(value) : operator === '$=' ? actual?.endsWith(value) : actual === value;
        });
      });
    }
    closest(selector) {
      for (let current = this; current; current = current.parentElement) if (current.matches(selector)) return current;
      return null;
    }
    querySelectorAll(selector) {
      return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
    addEventListener(type, listener) {
      const listeners = this.listeners.get(type) ?? [];
      listeners.push(listener);
      this.listeners.set(type, listeners);
    }
    async fire(type) {
      await Promise.all((this.listeners.get(type) ?? []).map(listener => listener({ target: this, preventDefault() {} })));
    }
    attachShadow() {
      this.shadowRoot = new Element('shadow-root');
      this.shadowRoot.shadowHost = this;
      return this.shadowRoot;
    }
    focus() { document.activeElement = this; }
    showPopover() { this.popoverOpen = true; }
    hidePopover() { this.popoverOpen = false; }
    getBoundingClientRect() { return { top: 10, bottom: 50, left: 100, right: 500, width: 400, height: 40 }; }
  }

  document = {
    documentElement: new Element('html'),
    body: new Element('body'),
    createElement: tag => new Element(tag),
    createTreeWalker: () => ({ nextNode: () => null }),
    createRange: () => ({}),
  };
  document.documentElement.append(document.body);
  document.activeElement = document.body;
  const globals = {
    document,
    Element,
    NodeFilter: { SHOW_TEXT: 4, SHOW_ELEMENT: 1 },
    window: { innerWidth: 1280, innerHeight: 800, addEventListener() {}, removeEventListener() {} },
    location: { pathname: '/home' },
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; this.targets = new Map(); mutationObservers.add(this); }
      observe(target, options) { this.targets.set(target, options); }
      disconnect() { this.targets.clear(); mutationObservers.delete(this); }
    },
    getComputedStyle: () => ({ fontSize: '16px', lineHeight: '20px', backgroundColor: 'rgb(255, 255, 255)', boxSizing: 'border-box' }),
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
  };
  function setGlobal(key, value) {
    if (!originals.has(key)) originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  for (const [key, value] of Object.entries(globals)) setGlobal(key, value);
  t.after(() => {
    for (const listener of cleanup) listener();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return {
    document,
    setGlobal,
    onCleanup: listener => cleanup.push(listener),
    flushFrames() {
      for (const [id, callback] of [...frames]) { frames.delete(id); callback(); }
    },
    mutate(records) {
      for (const observer of [...mutationObservers]) {
        const relevant = records.filter(record => [...observer.targets].some(([target, options]) =>
          (target === record.target || (options.subtree && target.contains(record.target)))
          && options[record.type]
          && (record.type !== 'attributes' || !options.attributeFilter || options.attributeFilter.includes(record.attributeName))));
        if (relevant.length) observer.callback(relevant);
      }
    },
  };
}

export const settle = () => new Promise(resolve => setImmediate(resolve));
