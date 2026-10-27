// ---------------------------------------------------------
// SkpQ — shared cart helpers (per-device, localStorage-backed)
// ---------------------------------------------------------
const Cart = {
  KEY: "skpq_cart",

  get() {
    return JSON.parse(localStorage.getItem(this.KEY) || "[]");
  },

  save(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
  },

  addItem(item) {
    // item: { code, name, price, qty }
    const items = this.get();
    const existing = items.find(i => i.code === item.code);
    if (existing) {
      existing.qty += item.qty || 1;
    } else {
      items.push({ qty: 1, ...item });
    }
    this.save(items);
    return items;
  },

  removeItem(code) {
    let items = this.get();
    const item = items.find(i => i.code === code);
    if (item && item.qty > 1) {
      item.qty -= 1;
    } else {
      items = items.filter(i => i.code !== code);
    }
    this.save(items);
    return items;
  },

  total() {
    return this.get().reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  clear() {
    localStorage.removeItem(this.KEY);
  }
};

// ---------------------------------------------------------
// Theme (dark / light mode) — shared across every page.
// Uses the same 'theme' localStorage key as the dashboard page.
// Call Theme.init() on page load and Theme.toggle() on the
// dark-mode button if a page doesn't already have its own logic.
// ---------------------------------------------------------
const Theme = {
  init() {
    const saved = localStorage.getItem("theme") || 'light';
    document.documentElement.classList.toggle("dark", saved === "dark");
  },
  toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    return isDark;
  }
};

Theme.init();
