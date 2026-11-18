// B07: Render the product catalogue after deferred scripts have loaded.
(function () {
  'use strict';

  // Keep the button API shared with the cart UI, when it supplies one.
  if (typeof window.addToCart !== 'function') {
    window.addToCart = function (id) {
      return window.Cart.add(id);
    };
  }

  function renderProducts() {
    const container = document.getElementById('products');
    if (!container) return;
    if (typeof PRODUCTS === 'undefined') {
      container.textContent = 'ไม่สามารถโหลดข้อมูลสินค้าได้';
      console.error('Load products.js before shop.js and cart.js.');
      return;
    }

    const cards = document.createDocumentFragment();
    PRODUCTS.forEach(function (product) {
      const card = document.createElement('article');
      card.className = 'product-card';
      card.dataset.productId = String(product.id);

      const picture = document.createElement('div');
      picture.className = 'sprite';
      picture.setAttribute('role', 'img');
      picture.setAttribute('aria-label', product.name);
      picture.style.backgroundImage = 'url("' + product.image.file + '")';
      picture.style.backgroundSize = '300% 200%';
      picture.style.backgroundPosition = (product.image.col * 50) + '% ' +
        (product.image.row * 100) + '%';

      const name = document.createElement('h2');
      name.textContent = product.name;
      const description = document.createElement('p');
      description.textContent = product.description;
      const price = document.createElement('div');
      price.className = 'price';
      price.textContent = product.price.toLocaleString('th-TH') + ' บาท';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'add-to-cart';
      button.textContent = 'ใส่ตะกร้า';
      button.setAttribute('aria-label', 'ใส่ตะกร้า ' + product.name);
      button.addEventListener('click', function () {
        window.addToCart(product.id);
      });

      card.append(picture, name, description, price, button);
      cards.append(card);
    });
    container.replaceChildren(cards);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderProducts, { once: true });
  } else {
    renderProducts();
  }
})();
