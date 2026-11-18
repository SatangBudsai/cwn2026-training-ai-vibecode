// Page checks used in the real run (2026-11-02). Each function is passed to the Playwright MCP
// (browser_evaluate) on the matching page; they only read the page and never click.

// Pre-check · home page: logged in = no login/sign-up link at top right
() => {
  const nav = document.querySelector('header nav, nav');
  const text = nav ? nav.innerText : document.body.innerText;
  const cart = document.querySelector('a[href*="/cart"]');
  return {
    captcha: /verify|captcha/i.test(location.href),
    loginButtonVisible: /เข้าสู่ระบบ|สมัครใหม่/.test(text),
    cartBadge: cart ? cart.innerText.trim().split('\n').pop() : null,   // the account name is deliberately not returned
  };
}

// TC-SRCH-01 / TC-SRCH-02 · search results (scroll down slowly first so all cards load).
// An empty title means "not loaded yet", not "wrong product": scroll to that card and count again.
async () => {
  const WORD = /แมว|cat/i;            // TC-SRCH-02: /สุนัข|หมา|dog/i
  const items = [...document.querySelectorAll('li.shopee-search-item-result__item')];
  const title = (li) => {
    const t = li.querySelector('[class*="line-clamp-2"]');
    const img = li.querySelector('img[alt]');
    return ((t && t.textContent) || (img && img.alt) || '').trim();
  };
  for (const li of items.slice(0, 20)) {
    if (!title(li)) {
      li.scrollIntoView({ block: 'center' });
      await new Promise((r) => setTimeout(r, 2500));
    }
  }
  const top = items.slice(0, 20).map(title);
  const empty = top.filter((t) => !t).length;
  const hits = top.filter((t) => WORD.test(t)).length;
  return { count: items.length, empty, hits, ratio: hits / 20, pass: empty === 0 && items.length >= 20 && hits / 20 >= 0.8 };
}

// TC-SORT-01 · results after "ราคา: จากน้อยไปมาก": first 10 non-ad prices must not go down
() => {
  const rows = [];
  for (const li of document.querySelectorAll('li.shopee-search-item-result__item')) {
    if (rows.length === 10) break;
    if (/\bAd\b|โฆษณา/.test(li.innerText)) continue;
    const parts = li.innerText.split('\n').map((s) => s.trim()).filter(Boolean);
    const i = parts.indexOf('฿');                       // sale price is the number right after the first ฿
    rows.push({ price: Number((parts[i + 1] || '').replace(/,/g, '')), dog: /สุนัข|หมา|dog/i.test(parts[0]) });
  }
  const prices = rows.map((r) => r.price);
  return { prices, ascending: prices.every((p, i) => i === 0 || p >= prices[i - 1]), dogFood: rows.filter((r) => r.dog).length };
}

// TC-CART-01 · cart page: is the toy in a visible row, and how many rows in total.
// After removal the name stays in a hidden screen-reader message, so only visible links count.
() => ({
  toyInCart: [...document.querySelectorAll('a')].some((a) => a.offsetParent && a.textContent.includes('ซ่อนหาอัตโนมัติ')),
  selectAll: (document.body.innerText.match(/เลือกทั้งหมด \((\d+)\)/) || [])[1],
})
