(() => {
  'use strict';

  const CITIES = ['القاهرة', 'الجيزة', 'الإسكندرية', 'طنطا', 'المنصورة', 'أسيوط', 'سوهاج', 'شرم الشيخ'];
  // بيانات توضيحية لجدول رحلات يومي؛ لا تمثل مخزون شركات نقل حقيقي.
  const TRIPS = [
    { id: 1, from: 'القاهرة', to: 'الإسكندرية', time: '07:30', duration: '٣ ساعات و١٥ دقيقة', operator: 'النيل للنقل', price: 180 },
    { id: 2, from: 'القاهرة', to: 'الإسكندرية', time: '10:00', duration: '٣ ساعات و١٠ دقائق', operator: 'مصر إكسبرس', price: 200 },
    { id: 3, from: 'القاهرة', to: 'المنصورة', time: '09:15', duration: 'ساعتان و٢٠ دقيقة', operator: 'النيل للنقل', price: 160 },
    { id: 4, from: 'الجيزة', to: 'طنطا', time: '08:00', duration: 'ساعة و٤٥ دقيقة', operator: 'دلتا باص', price: 120 },
    { id: 5, from: 'الإسكندرية', to: 'القاهرة', time: '18:30', duration: '٣ ساعات و٢٠ دقيقة', operator: 'النيل للنقل', price: 190 },
    { id: 6, from: 'القاهرة', to: 'شرم الشيخ', time: '23:00', duration: '٦ ساعات و٣٠ دقيقة', operator: 'سيناء ترافيل', price: 420 },
    { id: 7, from: 'أسيوط', to: 'القاهرة', time: '05:45', duration: '٥ ساعات و١٠ دقائق', operator: 'الصعيدية', price: 350 },
    { id: 8, from: 'المنصورة', to: 'القاهرة', time: '16:00', duration: 'ساعتان و١٥ دقيقة', operator: 'دلتا باص', price: 150 },
    { id: 9, from: 'سوهاج', to: 'القاهرة', time: '06:20', duration: '٦ ساعات', operator: 'الصعيدية', price: 380 },
    { id: 10, from: 'القاهرة', to: 'طنطا', time: '12:30', duration: 'ساعة و٤٠ دقيقة', operator: 'دلتا باص', price: 110 },
  ];
  const STORAGE_KEY = 'travelo.bookings.v2';
  const $ = (id) => document.getElementById(id);
  const fromCity = $('fromCity'), toCity = $('toCity'), tripDate = $('tripDate');
  const resultsSection = $('resultsSection'), resultsList = $('resultsList');
  const bookingsList = $('bookingsList'), seatModal = $('seatModal'), seatGrid = $('seatGrid');
  let bookings = loadBookings(), currentResults = [], currentTrip = null, selectedSeats = new Set(), lastFocused = null;

  function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function loadBookings() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data.filter((b) => b && typeof b.ref === 'string' && Number.isFinite(b.tripId) && Array.isArray(b.seats)) : [];
    } catch { return []; }
  }
  function saveBookings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings)); return true; }
    catch { return false; }
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  }
  function money(value) { return new Intl.NumberFormat('ar-EG').format(value); }
  function init() {
    for (const city of CITIES) {
      fromCity.add(new Option(city, city));
      toCity.add(new Option(city, city));
    }
    tripDate.min = localDate();
    tripDate.value = localDate();
    fromCity.value = 'القاهرة'; toCity.value = 'الإسكندرية';
    $('year').textContent = new Date().getFullYear();
    $('searchForm').addEventListener('submit', searchTrips);
    $('sortSelect').addEventListener('change', () => renderResults(sortedTrips(), Number($('passengers').value)));
    $('swapCities').addEventListener('click', () => { const from = fromCity.value; fromCity.value = toCity.value; toCity.value = from; });
    $('closeModalBtn').addEventListener('click', closeSeatModal);
    document.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeSeatModal));
    $('confirmBookingBtn').addEventListener('click', confirmBooking);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !seatModal.classList.contains('hidden')) closeSeatModal();
      if (event.key === 'Tab' && !seatModal.classList.contains('hidden')) trapFocus(event);
    });
    renderBookings();
  }
  function searchTrips(event) {
    event.preventDefault();
    const message = $('formMessage'); message.textContent = '';
    if (fromCity.value === toCity.value) { message.textContent = 'اختار مدينتين مختلفتين عشان نعرضلك الرحلات.'; return; }
    const today = localDate();
    if (!tripDate.value || tripDate.value < today) { message.textContent = 'اختار تاريخ النهارده أو تاريخ جاي.'; return; }
    currentTrip = { date: tripDate.value };
    currentResults = TRIPS.filter((trip) => trip.from === fromCity.value && trip.to === toCity.value);
    $('resultsSummary').textContent = `${fromCity.value} إلى ${toCity.value} · ${formatDate(tripDate.value)} · ${money(Number($('passengers').value))} ${Number($('passengers').value) === 1 ? 'راكب' : 'ركاب'}`;
    resultsSection.classList.remove('hidden');
    renderResults(sortedTrips(), Number($('passengers').value));
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function sortedTrips() {
    const trips = [...currentResults], sort = $('sortSelect').value;
    if (sort === 'priceAsc') trips.sort((a, b) => a.price - b.price);
    else if (sort === 'priceDesc') trips.sort((a, b) => b.price - a.price);
    else trips.sort((a, b) => a.time.localeCompare(b.time));
    return trips;
  }
  function takenSeats(tripId, date) {
    return new Set(bookings.filter((b) => b.tripId === tripId && b.date === date).flatMap((b) => b.seats));
  }
  function renderResults(trips, pax) {
    resultsList.replaceChildren();
    if (!trips.length) {
      resultsList.innerHTML = '<div class="empty-state"><strong>مفيش رحلات على الخط ده حاليًا</strong>جرّب مدينة تانية أو راجعنا بعدين.</div>';
      return;
    }
    for (const trip of trips) {
      const available = 40 - takenSeats(trip.id, currentTrip.date).size;
      const card = document.createElement('article'); card.className = 'trip-card';
      card.innerHTML = `<div><div class="trip-route">${escapeHTML(trip.from)} <span aria-hidden="true">←</span> ${escapeHTML(trip.to)}</div><div class="operator">${escapeHTML(trip.operator)}</div></div>
        <div><div class="trip-time"><span>${escapeHTML(trip.time)}</span><i></i><span>موعد المغادرة</span></div><div class="trip-duration">مدة الرحلة ${escapeHTML(trip.duration)}</div></div>
        <div class="trip-fare"><strong>${money(trip.price)} جنيه</strong><span>للمقعد · ${money(available)} مقعد متاح</span></div>
        <button class="btn primary book-btn" type="button" ${available < pax ? 'disabled' : ''}>${available < pax ? 'مقاعد غير كافية' : 'اختار مقعدك'}</button>`;
      card.querySelector('.book-btn').addEventListener('click', () => openSeatModal(trip, pax, currentTrip.date));
      resultsList.append(card);
    }
  }
  function openSeatModal(trip, pax, date) {
    currentTrip = { ...trip, pax, date };
    selectedSeats.clear(); lastFocused = document.activeElement;
    $('modalRoute').textContent = `${trip.from} ← ${trip.to}`;
    $('modalTime').textContent = `${trip.time} · ${formatDate(date)}`;
    $('modalPrice').textContent = money(trip.price);
    $('modalNeeded').textContent = `${money(pax)} ${pax === 1 ? 'مقعد' : 'مقاعد'}`;
    $('seatMessage').textContent = ''; $('totalPrice').textContent = money(0);
    seatGrid.replaceChildren();
    const taken = takenSeats(trip.id, date);
    for (let number = 1; number <= 40; number++) {
      const seat = document.createElement('button'); seat.type = 'button'; seat.className = 'seat'; seat.textContent = number; seat.setAttribute('aria-label', `مقعد ${number}`);
      if (taken.has(number)) { seat.classList.add('booked'); seat.disabled = true; seat.setAttribute('aria-label', `مقعد ${number} محجوز`); }
      else { seat.classList.add('available'); seat.addEventListener('click', () => toggleSeat(number, seat)); }
      seatGrid.append(seat);
    }
    updateTotal(); seatModal.classList.remove('hidden'); seatModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; $('closeModalBtn').focus();
  }
  function toggleSeat(number, button) {
    if (selectedSeats.has(number)) { selectedSeats.delete(number); button.classList.remove('selected'); button.classList.add('available'); button.setAttribute('aria-pressed', 'false'); }
    else if (selectedSeats.size < currentTrip.pax) { selectedSeats.add(number); button.classList.remove('available'); button.classList.add('selected'); button.setAttribute('aria-pressed', 'true'); }
    else { $('seatMessage').textContent = `ممكن تختار ${money(currentTrip.pax)} ${currentTrip.pax === 1 ? 'مقعد بس' : 'مقاعد بس'}.`; return; }
    $('seatMessage').textContent = ''; updateTotal();
  }
  function updateTotal() {
    $('totalPrice').textContent = money(selectedSeats.size * (currentTrip?.price || 0));
    $('confirmBookingBtn').disabled = !currentTrip || selectedSeats.size !== currentTrip.pax;
  }
  function closeSeatModal() {
    seatModal.classList.add('hidden'); seatModal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
    if (lastFocused?.isConnected) lastFocused.focus();
  }
  function trapFocus(event) {
    const focusable = [...seatModal.querySelectorAll('button:not(:disabled)')];
    if (!focusable.length) return;
    if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
  }
  function confirmBooking() {
    if (!currentTrip || selectedSeats.size !== currentTrip.pax) return;
    // إعادة الفحص قبل التأكيد تمنع تعارض الحجوزات المفتوحة في تبويب آخر.
    const occupied = takenSeats(currentTrip.id, currentTrip.date);
    if ([...selectedSeats].some((seat) => occupied.has(seat))) { $('seatMessage').textContent = 'اتحجز مقعد من اختياراتك في نافذة تانية. اختار مقاعد مختلفة.'; openSeatModal(currentTrip, currentTrip.pax, currentTrip.date); return; }
    const ticket = { ref: `TV${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`, tripId: currentTrip.id, from: currentTrip.from, to: currentTrip.to, time: currentTrip.time, date: currentTrip.date, operator: currentTrip.operator, seats: [...selectedSeats].sort((a, b) => a - b), pax: currentTrip.pax, price: currentTrip.price, total: selectedSeats.size * currentTrip.price };
    bookings.unshift(ticket);
    if (!saveBookings()) { bookings.shift(); $('seatMessage').textContent = 'تعذر حفظ الحجز على الجهاز. تأكد من إعدادات التخزين في المتصفح وحاول تاني.'; return; }
    closeSeatModal(); renderBookings(); renderResults(sortedTrips(), Number($('passengers').value));
    $('my-bookings').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function renderBookings() {
    $('bookingCount').textContent = money(bookings.length);
    bookingsList.replaceChildren();
    if (!bookings.length) { bookingsList.innerHTML = '<div class="empty-state"><strong>لسه مفيش حجوزات</strong>رحلاتك اللي هتحجزها هتظهر هنا.</div>'; return; }
    for (const booking of bookings) {
      const card = document.createElement('article'); card.className = 'booking-card';
      card.innerHTML = `<div class="booking-top"><div><div class="booking-ref">تذكرة ${escapeHTML(booking.ref)}</div><div class="booking-route">${escapeHTML(booking.from)} ← ${escapeHTML(booking.to)}</div></div><span class="badge">مؤكد</span></div>
        <div class="booking-meta"><span>${formatDate(booking.date)}</span><span>${escapeHTML(booking.time)}</span><span>${escapeHTML(booking.operator)}</span><span>مقاعد ${booking.seats.map(money).join('، ')}</span><span>${money(booking.total)} جنيه</span></div>
        <div class="booking-actions"><button type="button" data-print>طباعة التذكرة</button><button type="button" class="cancel" data-cancel>إلغاء الحجز</button></div>`;
      card.querySelector('[data-print]').addEventListener('click', () => { document.querySelectorAll('.booking-card').forEach((item) => item.classList.toggle('print-target', item === card)); window.print(); document.querySelectorAll('.booking-card').forEach((item) => item.classList.remove('print-target')); });
      card.querySelector('[data-cancel]').addEventListener('click', () => cancelBooking(booking.ref));
      bookingsList.append(card);
    }
  }
  function cancelBooking(ref) {
    const original = bookings;
    bookings = bookings.filter((booking) => booking.ref !== ref);
    if (!saveBookings()) { bookings = original; window.alert('تعذر إلغاء الحجز المحفوظ. حاول تاني.'); return; }
    renderBookings();
    if (currentTrip?.date) renderResults(sortedTrips(), Number($('passengers').value));
  }
  init();
})();
