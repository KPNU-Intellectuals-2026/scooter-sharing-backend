/**
 * Advanced Adaptive Navigation Module
 * Features: Burger Menu, Desktop Menu, Keyboard Navigation (Arrow keys), Focus Trap.
 */
export function initAdaptiveNav({ onFilter, initialFilter = 'all' } = {}) {
  const desktop = document.getElementById('nav-filters');
  const mobile = document.getElementById('mobile-menu'); // Or use a new ID if preferred
  const burger = document.getElementById('menu-toggle');
  const backdrop = document.getElementById('backdrop');
  
  let releaseTrap = null;

  function getFocusable(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.hasAttribute('hidden') && el.getClientRects().length > 0);
  }

  function trapFocus(container) {
    function onKeydown(e) {
      if (e.key !== 'Tab') return;
      const items = getFocusable(container);
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    container.addEventListener('keydown', onKeydown);
    return () => container.removeEventListener('keydown', onKeydown);
  }

  function openMobileMenu() {
    if (!mobile || !burger) return;
    
    mobile.hidden = false;
    burger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('dialog-open');
    
    if (backdrop) {
      backdrop.hidden = false;
      backdrop.setAttribute('aria-hidden', 'false');
    }

    releaseTrap?.();
    releaseTrap = trapFocus(mobile);
    
    setTimeout(() => {
      getFocusable(mobile)[0]?.focus();
    }, 100);
  }

  function closeMobileMenu({ restoreFocus = true } = {}) {
    if (!mobile || !burger) return;
    
    mobile.hidden = true;
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('dialog-open');
    
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.setAttribute('aria-hidden', 'true');
    }

    releaseTrap?.();
    releaseTrap = null;
    
    if (restoreFocus) burger.focus();
  }

  function handleArrowKeys(e, container, orientation = 'horizontal') {
    const items = getFocusable(container);
    const currentIndex = items.indexOf(document.activeElement);
    
    if (currentIndex === -1) return;

    let nextIndex;
    if (orientation === 'horizontal') {
      if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % items.length;
      else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + items.length) % items.length;
      else if (e.key === 'Home') nextIndex = 0;
      else if (e.key === 'End') nextIndex = items.length - 1;
    } else {
      if (e.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
      else if (e.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
      else if (e.key === 'Home') nextIndex = 0;
      else if (e.key === 'End') nextIndex = items.length - 1;
    }

    if (nextIndex !== undefined) {
      e.preventDefault();
      items[nextIndex].focus();
    }
  }

  function setActive(container, filter) {
    if (!container) return;

    container.querySelectorAll('[data-filter]').forEach(a => {
      const isActive = a.getAttribute('data-filter') === filter;
      a.classList.toggle('active', isActive);

      if (a.tagName === 'BUTTON') {
        a.setAttribute('aria-pressed', String(isActive));
      }
      
      if (isActive) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });
  }

  function applyFilter(filter) {
    setActive(desktop, filter);
    setActive(mobile, filter);
    onFilter?.(filter);
    
    if (mobile && !mobile.hidden) {
      closeMobileMenu({ restoreFocus: true });
    }
  }

  function onClick(e) {
    const a = e.target.closest('[data-filter]');
    if (!a) return;
    if (a.tagName === 'A') e.preventDefault();
    const filter = a.getAttribute('data-filter') || 'all';
    applyFilter(filter);
  }

  // Event Listeners
  desktop?.addEventListener('click', onClick);
  mobile?.addEventListener('click', onClick);

  desktop?.addEventListener('keydown', (e) => {
    if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
      handleArrowKeys(e, desktop, 'horizontal');
    }
  });

  mobile?.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      handleArrowKeys(e, mobile, 'vertical');
    }
  });

  if (burger && mobile) {
    burger.addEventListener('click', () => {
      const expanded = burger.getAttribute('aria-expanded') === 'true';
      if (expanded) closeMobileMenu({ restoreFocus: true });
      else openMobileMenu();
    });

    backdrop?.addEventListener('click', () => {
      if (!mobile.hidden) closeMobileMenu({ restoreFocus: true });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !mobile.hidden) {
        closeMobileMenu({ restoreFocus: true });
      }
    });
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > 700 && mobile && !mobile.hidden) {
      closeMobileMenu({ restoreFocus: false });
    }
  });

  applyFilter(initialFilter);
}
