(async function () {
  const { api, LANDING } = App;
  const r = await api('GET', '/api/me');
  if (!r.ok || !r.data) { location.replace('/login'); return; }
  location.replace(LANDING[r.data.role] || '/login');
})();
