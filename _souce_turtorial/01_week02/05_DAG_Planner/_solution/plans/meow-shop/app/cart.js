// B06: ตะกร้าสินค้า + localStorage (key 'meow-cart')
// ใช้คู่กับ products.js (ต้องโหลด products.js ก่อน cart.js) — อ่าน PRODUCTS เป็น global
// ไม่ยุ่งกับ DOM: UI ฟังเหตุการณ์ 'meow-cart-change' บน window หรือใช้ Cart.subscribe(fn)
//
// รูปแบบที่เก็บใน localStorage: JSON array [{ "id": 1, "qty": 2 }, ...]
//
// API (global: window.Cart):
//   Cart.add(id, qty = 1)      เพิ่มจำนวน (ถ้ายังไม่มีจะสร้างใหม่)
//   Cart.decrease(id, qty = 1) ลดจำนวน (เหลือ 0 จะลบออกจากตะกร้า)
//   Cart.setQty(id, qty)       ตั้งจำนวนตรง ๆ (<= 0 = ลบ)
//   Cart.remove(id)            ลบสินค้าออกจากตะกร้า
//   Cart.clear()               ล้างตะกร้า
//   Cart.getItems()            [{ id, qty, product, subtotal }]
//   Cart.getQty(id)            จำนวนของสินค้า id
//   Cart.getCount()            จำนวนชิ้นรวม
//   Cart.getTotal()            ยอดรวม (บาท)
//   Cart.load()                โหลดคืนจาก localStorage (เรียกอัตโนมัติตอนเริ่ม)
//   Cart.subscribe(fn)         fn(items, total, count) เมื่อเปลี่ยน — คืนฟังก์ชันยกเลิก
//   Cart.formatPrice(n)        '฿1,234'
(function (global) {
  'use strict';

  var STORAGE_KEY = 'meow-cart';
  var products = (typeof PRODUCTS !== 'undefined' && PRODUCTS) || global.PRODUCTS || [];
  var lines = []; // [{ id, qty }]
  var listeners = [];

  function findProduct(id) {
    id = Number(id);
    for (var i = 0; i < products.length; i++) {
      if (products[i].id === id) return products[i];
    }
    return null;
  }

  function findLine(id) {
    id = Number(id);
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].id === id) return lines[i];
    }
    return null;
  }

  function toQty(n) {
    n = Math.floor(Number(n));
    return isFinite(n) ? n : 0;
  }

  function getStorage() {
    try {
      return global.localStorage || null;
    } catch (e) {
      return null; // เช่น เปิดแบบ file:// ในบางเบราว์เซอร์ที่บล็อก storage
    }
  }

  function save() {
    var ls = getStorage();
    if (!ls) return;
    try {
      ls.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch (e) { /* โควตาเต็ม / ถูกบล็อก — ข้ามไป */ }
  }

  function load() {
    lines = [];
    var ls = getStorage();
    if (ls) {
      try {
        var data = JSON.parse(ls.getItem(STORAGE_KEY) || '[]');
        if (Array.isArray(data)) {
          data.forEach(function (row) {
            if (!row) return;
            var id = Number(row.id);
            var qty = toQty(row.qty);
            // ข้ามสินค้าที่ไม่มีใน PRODUCTS แล้ว หรือจำนวนไม่ถูกต้อง
            if (!findProduct(id) || qty <= 0) return;
            var existing = findLine(id);
            if (existing) existing.qty += qty;
            else lines.push({ id: id, qty: qty });
          });
        }
      } catch (e) {
        lines = []; // ข้อมูลเสีย — เริ่มตะกร้าใหม่
      }
    }
    notify();
    return getItems();
  }

  function getItems() {
    return lines.map(function (l) {
      var p = findProduct(l.id);
      return { id: l.id, qty: l.qty, product: p, subtotal: p.price * l.qty };
    });
  }

  function getTotal() {
    return lines.reduce(function (sum, l) {
      return sum + findProduct(l.id).price * l.qty;
    }, 0);
  }

  function getCount() {
    return lines.reduce(function (sum, l) { return sum + l.qty; }, 0);
  }

  function getQty(id) {
    var l = findLine(id);
    return l ? l.qty : 0;
  }

  function notify() {
    var items = getItems();
    var total = getTotal();
    var count = getCount();
    listeners.slice().forEach(function (fn) {
      try { fn(items, total, count); } catch (e) { console.error(e); }
    });
    if (typeof global.dispatchEvent === 'function' && typeof global.CustomEvent === 'function') {
      global.dispatchEvent(new global.CustomEvent('meow-cart-change', {
        detail: { items: items, total: total, count: count }
      }));
    }
  }

  function commit() {
    save();
    notify();
  }

  function setQty(id, qty) {
    id = Number(id);
    if (!findProduct(id)) return false;
    qty = toQty(qty);
    var l = findLine(id);
    if (qty <= 0) {
      if (l) lines.splice(lines.indexOf(l), 1);
    } else if (l) {
      l.qty = qty;
    } else {
      lines.push({ id: id, qty: qty });
    }
    commit();
    return true;
  }

  function add(id, qty) {
    qty = qty === undefined ? 1 : toQty(qty);
    if (qty <= 0) return false;
    return setQty(id, getQty(id) + qty);
  }

  function decrease(id, qty) {
    qty = qty === undefined ? 1 : toQty(qty);
    if (qty <= 0 || !findLine(id)) return false;
    return setQty(id, getQty(id) - qty);
  }

  function remove(id) {
    if (!findLine(id)) return false;
    return setQty(id, 0);
  }

  function clear() {
    lines = [];
    commit();
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    return function () {
      var i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    };
  }

  function formatPrice(n) {
    return '฿' + Number(n).toLocaleString('th-TH');
  }

  // ซิงก์ระหว่างแท็บ: แท็บอื่นแก้ตะกร้า → โหลดใหม่
  if (typeof global.addEventListener === 'function') {
    global.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY) load();
    });
  }

  var Cart = {
    STORAGE_KEY: STORAGE_KEY,
    add: add,
    decrease: decrease,
    setQty: setQty,
    remove: remove,
    clear: clear,
    getItems: getItems,
    getQty: getQty,
    getCount: getCount,
    getTotal: getTotal,
    load: load,
    subscribe: subscribe,
    formatPrice: formatPrice
  };

  load();
  global.Cart = Cart;
  if (typeof module !== 'undefined' && module.exports) module.exports = Cart;
})(typeof window !== 'undefined' ? window : globalThis);
