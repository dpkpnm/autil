// dom.js — minimal DOM utility for Autil
// Pattern: chainable $(), delegated on(), element el()

export const $ = (sel, ctx = document) => {
  const node = (sel instanceof Element || sel === document || sel === window)
    ? sel : ctx?.querySelector(sel);

  const api = {
    el: node,
    on:     (ev, fn)     => { node?.addEventListener(ev, fn); return api; },
    text:   (v)          => { if (node) node.textContent = v; return api; },
    html:   (v)          => { if (node) node.innerHTML  = v; return api; },
    cls:    (name, force)=> { node?.classList.toggle(name, force); return api; },
    toggle: (attr, force)=> { node?.toggleAttribute(attr, force); return api; },
    show:   ()           => { node?.removeAttribute('hidden'); return api; },
    hide:   ()           => { node?.setAttribute('hidden', ''); return api; },
    append: (...kids)    => { node?.append(...kids); return api; },
    attr:   (k, v) => {
      if (!node) return v === undefined ? null : api;
      if (v === undefined) return node.getAttribute(k);
      v === null ? node.removeAttribute(k) : node.setAttribute(k, v);
      return api;
    },
  };
  return api;
};

// Delegated event listener — on(document, 'click', '[data-action]', fn)
export const on = (root, event, selector, fn) =>
  root.addEventListener(event, e => {
    const t = e.target.closest(selector);
    if (t) fn(e, t);
  });

// Create element — el('div', { class: 'foo', text: 'hi' }, child1, child2)
export const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text')       node.textContent = v;
    else if (k === 'html')  node.innerHTML   = v;
    else if (k === 'class') node.className   = v;
    else                    node.setAttribute(k, v);
  }
  if (children.length) node.append(...children);
  return node;
};
