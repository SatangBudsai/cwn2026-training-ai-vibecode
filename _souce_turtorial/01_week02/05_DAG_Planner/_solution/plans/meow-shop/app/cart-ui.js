// B08: แสดงตะกร้าใน aside#cart — ใช้ window.Cart (cart.js) และฟัง 'meow-cart-change'
(function () {
  'use strict';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function render() {
    var box = document.getElementById('cart');
    if (!box || !window.Cart) return;
    var Cart = window.Cart;
    var items = Cart.getItems();

    var title = el('h2', null, '🛒 ตะกร้าสินค้า (' + Cart.getCount() + ' ชิ้น)');
    var parts = [title];

    if (!items.length) {
      parts.push(el('p', 'cart-empty', 'ยังไม่มีสินค้าในตะกร้า'));
    } else {
      var list = el('ul', 'cart-items');
      items.forEach(function (it) {
        var li = el('li', 'cart-item');
        li.dataset.productId = String(it.id);
        var info = el('span', 'cart-name', it.product.name + ' × ' + it.qty);
        var sub = el('span', 'cart-subtotal', Cart.formatPrice(it.subtotal));
        var del = el('button', 'cart-remove', '✕');
        del.type = 'button';
        del.setAttribute('aria-label', 'ลบ ' + it.product.name + ' ออกจากตะกร้า');
        del.addEventListener('click', function () { Cart.remove(it.id); });
        li.append(info, sub, del);
        list.append(li);
      });
      parts.push(list);
      parts.push(el('p', 'cart-total', 'รวม ' + Cart.formatPrice(Cart.getTotal())));
      var clear = el('button', 'cart-clear', 'ล้างตะกร้า');
      clear.type = 'button';
      clear.addEventListener('click', function () { Cart.clear(); });
      parts.push(clear);
    }
    box.replaceChildren.apply(box, parts);
  }

  window.addEventListener('meow-cart-change', render);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once: true });
  } else {
    render();
  }
})();
