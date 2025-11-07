const state = {
    cars: [],
    filters: { brand: '', model: '', maxPrice: 200000 },
};

const els = {
    brand: () => document.getElementById('filter-brand'),
    model: () => document.getElementById('filter-model'),
    price: () => document.getElementById('filter-price'),
    priceOut: () => document.getElementById('filter-price-output'),
    clear: () => document.getElementById('clear-filters'),
    grid: () => document.getElementById('cars-grid'),
    bookingSelect: () => document.getElementById('booking-car'),
    contactForm: () => document.getElementById('contact-form'),
    bookingForm: () => document.getElementById('booking-form'),
    navToggle: () => document.querySelector('.nav-toggle'),
    navList: () => document.querySelector('.nav-list'),
    year: () => document.getElementById('year'),
    modal: () => document.getElementById('car-modal'),
    modalBody: () => document.getElementById('modal-body'),
};

async function loadCars() {
    try {
        // Try loading from API first (database), fallback to JSON file
        const API_BASE = window.location.origin.includes('3000') ? '' : 'http://localhost:3000';
        let data = [];
        
        try {
            // First attempt: Load from database via API
            const apiRes = await fetch(`${API_BASE}/api/cars/public`);
            if (apiRes.ok) {
                data = await apiRes.json();
                // Parse JSON strings if they exist
                data = data.map(car => ({
                    ...car,
                    images: typeof car.images === 'string' ? JSON.parse(car.images) : car.images,
                    specs: typeof car.specs === 'string' ? JSON.parse(car.specs) : car.specs
                }));
            } else {
                throw new Error('API not available');
            }
        } catch (apiError) {
            // Fallback: Load from static JSON file
            console.log('Loading from static JSON file (database not available)');
            const isInPages = window.location.pathname.includes('/pages/') || document.body.dataset.page;
            const carsPath = isInPages ? '../assets/data/cars.json' : 'assets/data/cars.json';
            const res = await fetch(carsPath);
            if (!res.ok) {
                throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
            }
            data = await res.json();
        }
        
        state.cars = data;
        if (els.brand()) initFilters();
        if (els.grid()) renderGrid();
        if (els.bookingSelect()) populateBookingOptions();
    } catch (e) {
        console.error('Failed to load cars', e);
    }
}

function initFilters() {
    const brands = Array.from(new Set(state.cars.map(c => c.brand))).sort();
    const models = Array.from(new Set(state.cars.map(c => c.model))).sort();

    fillSelect(els.brand(), ['All', ...brands], brands.map(b => b));
    fillSelect(els.model(), ['All', ...models], models.map(m => m));

    const maxPriceInData = Math.max(...state.cars.map(c => c.price));
    els.price().max = String(maxPriceInData);
    els.price().value = String(Math.min(200000, maxPriceInData));
    updatePriceOutput();

    els.brand().addEventListener('change', () => { state.filters.brand = els.brand().value; renderGrid(); });
    els.model().addEventListener('change', () => { state.filters.model = els.model().value; renderGrid(); });
    els.price().addEventListener('input', () => { state.filters.maxPrice = Number(els.price().value); updatePriceOutput(); renderGrid(); });
    els.clear().addEventListener('click', () => resetFilters());
}

function fillSelect(selectEl, labels, values) {
    // keep first option as default
    selectEl.innerHTML = '';
    const firstOption = document.createElement('option');
    firstOption.value = '';
    firstOption.textContent = 'All';
    selectEl.appendChild(firstOption);
    labels.slice(1).forEach((label, idx) => {
        const opt = document.createElement('option');
        opt.value = values[idx];
        opt.textContent = label;
        selectEl.appendChild(opt);
    });
}

function resetFilters() {
    state.filters = { brand: '', model: '', maxPrice: Number(els.price().max) };
    els.brand().value = '';
    els.model().value = '';
    els.price().value = els.price().max;
    updatePriceOutput();
    renderGrid();
}

function updatePriceOutput() {
    els.priceOut().textContent = `$${Number(els.price().value).toLocaleString()}`;
}

function renderGrid() {
    const grid = els.grid();
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = state.cars.filter(c => {
        const brandOk = !state.filters.brand || c.brand === state.filters.brand;
        const modelOk = !state.filters.model || c.model === state.filters.model;
        const priceOk = c.price <= state.filters.maxPrice;
        return brandOk && modelOk && priceOk;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="card" style="grid-column: 1/-1">No cars match your filters.</div>`;
        return;
    }

        filtered.forEach(car => {
        const card = document.createElement('article');
        card.className = 'car-card';
        card.setAttribute('role', 'listitem');
        // Use an <img> with loading="lazy" for better performance and to avoid forced background repaints
        // Provide a local fallback in case the car has no images or remote images fail.
        let thumb = '';
        if (car.images && car.images[0]) {
            thumb = car.images[0];
        } else {
            // local fallback image (kept in repo)
            thumb = 'assets/images/products/images-1762463495584-624652520.jpg';
        }
        card.innerHTML = `
            <div class="car-media">
                <img src="${thumb}" alt="${car.brand} ${car.model}" loading="lazy" style="width:100%; height:100%; object-fit:cover; border-radius:8px;"/>
            </div>
            <div class="car-body">
                <div class="car-title">${car.brand} ${car.model}</div>
                <div class="car-specs">
                    <span>${car.year}</span>
                    <span>${car.fuel}</span>
                    <span>${car.transmission}</span>
                    <span>${car.mileage.toLocaleString()} mi</span>
                </div>
                <div class="car-price">$${car.price.toLocaleString()}</div>
            </div>
            <div class="car-actions">
                <button class="btn btn-outline" data-view="${car.id}">View Details</button>
                <button class="btn btn-primary" data-book="${car.id}">Book Test Drive</button>
            </div>
        `;
        grid.appendChild(card);
    });

    grid.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-view');
        // If vehicle page exists, navigate there; else open modal
        const basePath = document.body.dataset.page ? '../' : '';
        if (document.body.dataset.page !== 'home' && document.body.dataset.page !== 'inventory') {
            location.href = `${basePath}pages/vehicle.html?id=${id}`;
        } else if (document.body.dataset.page === 'inventory') {
            location.href = `vehicle.html?id=${id}`;
        } else {
            openCarModal(id);
        }
    }));
    grid.querySelectorAll('[data-book]').forEach(btn => btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-book');
        if (document.body.dataset.page === 'booking' && els.bookingSelect()) {
            els.bookingSelect().value = id;
        } else {
            const basePath = document.body.dataset.page ? '../' : '';
            location.href = `${basePath}pages/booking.html${id ? `?car=${id}` : ''}`;
        }
    }));
}

function populateBookingOptions() {
    const select = els.bookingSelect();
    state.cars.forEach(car => {
        const opt = document.createElement('option');
        opt.value = car.id;
        opt.textContent = `${car.brand} ${car.model} — $${car.price.toLocaleString()}`;
        select.appendChild(opt);
    });
}

function openCarModal(id) {
    const car = state.cars.find(c => String(c.id) === String(id));
    if (!car) return;
    const body = els.modalBody();
    body.innerHTML = `
        <div style="display:grid; gap:14px">
            <h3 style="margin:0">${car.brand} ${car.model} <span style="color:var(--muted); font-weight:500">${car.year}</span></h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px">
                <div style="aspect-ratio:16/9; background:url('${car.images[0]}') center/cover; border-radius:12px"></div>
                <div style="display:grid; gap:10px">
                    <div style="display:flex; gap:10px; flex-wrap:wrap; color:var(--muted)">
                        <span>${car.fuel}</span>
                        <span>${car.transmission}</span>
                        <span>${car.mileage.toLocaleString()} mi</span>
                        <span>${car.color}</span>
                    </div>
                    <div>
                        <strong>Price:</strong> <span style="color:var(--accent)">$${car.price.toLocaleString()}</span>
                    </div>
                    <div>
                        <strong>Specifications</strong>
                        <ul style="margin:8px 0 0 18px">
                            <li>Engine: ${car.specs.engine}</li>
                            <li>Power: ${car.specs.power}</li>
                            <li>Drivetrain: ${car.specs.drivetrain}</li>
                            <li>MPG: ${car.specs.mpg}</li>
                        </ul>
                    </div>
                    <button class="btn btn-primary" data-modal-book="${car.id}">Book Test Drive</button>
                </div>
            </div>
        </div>
    `;
    const modal = els.modal();
    modal.setAttribute('aria-hidden', 'false');
    modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));
    modal.querySelector('[data-modal-book]')?.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-modal-book');
        closeModal();
        const basePath = document.body.dataset.page ? '../' : '';
        location.href = `${basePath}pages/booking.html?car=${id}`;
    });
}

function closeModal() {
    els.modal().setAttribute('aria-hidden', 'true');
}

function validateForm(form) {
    let valid = true;
    const setError = (id, msg) => {
        const el = form.querySelector(`[data-error-for="${id}"]`);
        if (el) el.textContent = msg || '';
    };
    form.querySelectorAll('input[required], textarea[required], select[required]').forEach(field => {
        const id = field.id;
        if (!field.value || (field.type === 'email' && !/.+@.+\..+/.test(field.value))) {
            setError(id, 'Please provide a valid value');
            valid = false;
        } else {
            setError(id, '');
        }
    });
    return valid;
}

function initForms() {
    const contactForm = els.contactForm();
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!validateForm(contactForm)) return;
            
            const formData = new FormData(contactForm);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                message: formData.get('message')
            };

            const successEl = document.getElementById('contact-success');
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';
                
                const res = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (res.ok) {
                    contactForm.reset();
                    if (successEl) {
                        successEl.textContent = 'Thanks! We will get back to you shortly.';
                        successEl.style.color = 'var(--success)';
                        setTimeout(() => { successEl.textContent = ''; }, 4000);
                    }
                } else {
                    throw new Error('Failed to send message');
                }
            } catch (err) {
                if (successEl) {
                    successEl.textContent = 'Failed to send message. Please try again or contact us directly.';
                    successEl.style.color = 'var(--danger)';
                    setTimeout(() => { successEl.textContent = ''; }, 4000);
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
    
    const bookingForm = els.bookingForm();
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!validateForm(bookingForm)) return;
            
            const formData = new FormData(bookingForm);
            const carId = formData.get('carId');
            const selectedCar = state.cars.find(car => car.id === carId);
            const carName = selectedCar ? `${selectedCar.brand} ${selectedCar.model}` : '';
            
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                carId: carId,
                carName: carName,
                date: formData.get('date'),
                time: formData.get('time')
            };

            const successEl = document.getElementById('booking-success');
            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Booking...';
                
                const res = await fetch('/api/booking', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (res.ok) {
                    bookingForm.reset();
                    if (successEl) {
                        successEl.textContent = 'Your test drive is booked. We will confirm by email.';
                        successEl.style.color = 'var(--success)';
                        setTimeout(() => { successEl.textContent = ''; }, 4000);
                    }
                } else {
                    throw new Error('Failed to book test drive');
                }
            } catch (err) {
                if (successEl) {
                    successEl.textContent = 'Failed to book test drive. Please try again or contact us directly.';
                    successEl.style.color = 'var(--danger)';
                    setTimeout(() => { successEl.textContent = ''; }, 4000);
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
}

function initNav() {
    const navToggle = els.navToggle();
    const navList = els.navList();
    
    if (navToggle && navList) {
        navToggle.addEventListener('click', () => {
            const expanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', String(!expanded));
            navList.classList.toggle('open');
        });
    }
    
    document.querySelectorAll('.nav-list a').forEach(a => {
        a.addEventListener('click', () => {
            if (navList) navList.classList.remove('open');
            if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
        });
    });
}

function initFooterYear() {
    const yearEl = els.year();
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    initNav();
    initForms();
    initFooterYear();
    loadCars();
    initRevealAnimations();
    
    // Fallback: show all content after 1 second if animations haven't triggered
    setTimeout(() => {
        document.querySelectorAll('.reveal:not(.in)').forEach(el => {
            el.classList.add('in');
        });
    }, 1000);
    
    // Handle car pre-selection from URL
    if (document.body.dataset.page === 'booking') {
        const params = new URLSearchParams(location.search);
        const carId = params.get('car');
        if (carId && els.bookingSelect()) {
            setTimeout(() => {
                els.bookingSelect().value = carId;
            }, 500);
        }
    }

    // Pause heavy animations while actively scrolling to avoid repaint glitches on some browsers/drivers
    // Adds class 'disable-animations-during-scroll' to <html> while user is scrolling.
    (function setupScrollAnimationPause() {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let scrollTimer = null;
        const SCROLL_CLASS = 'disable-animations-during-scroll';
        const addClass = () => document.documentElement.classList.add(SCROLL_CLASS);
        const removeClass = () => document.documentElement.classList.remove(SCROLL_CLASS);

        const onScroll = () => {
            addClass();
            if (scrollTimer) clearTimeout(scrollTimer);
            // remove class shortly after scroll stops
            scrollTimer = setTimeout(() => {
                // small delay to avoid flicker when scroll is continuous
                requestAnimationFrame(() => removeClass());
            }, 160);
        };

        // Use passive listener for performance
        window.addEventListener('scroll', onScroll, { passive: true });
        // Also listen to touchmove (mobile)
        window.addEventListener('touchmove', onScroll, { passive: true });
    })();
});

function initRevealAnimations() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    
    // Show items immediately if IntersectionObserver is not supported
    if (!('IntersectionObserver' in window)) {
        items.forEach(el => el.classList.add('in'));
        return;
    }
    
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '50px' });
    
    items.forEach(el => {
        // Show immediately if already in viewport
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 100) {
            el.classList.add('in');
        } else {
            io.observe(el);
        }
    });
}


