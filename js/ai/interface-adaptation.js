/**
 * 🤖 IMITATION INTERFACE ADAPTATION (DEMO)
 * Цей скрипт імітує роботу AI, автоматично перемикаючи режими адаптації 
 * для демонстрації можливостей інтерфейсу.
 */

(function() {
  console.log("🚀 AI Adaptation Demo started...");

  const states = [
    { name: "Стандартний режим", class: "" },
    { name: "Посилений фокус (для тремору/клавіатури)", class: "focus-thick" },
    { name: "Підсвічування елементів (для кращої орієнтації)", class: "a11y-hover-glow" },
    { name: "Акцентований клік (візуальний відгук)", class: "a11y-emphasize-click" },
    { name: "Примусове підкреслення посилань", class: "underline-links" },
    { name: "Режим читання (чистий інтерфейс)", class: "a11y-reading-ruler a11y-declutter" }
  ];

  let currentIndex = 0;

  function showNotification(text) {
    const toast = document.getElementById('ai-indicator');
    if (toast) {
      const textEl = toast.querySelector('.ai-text');
      if (textEl) textEl.textContent = "Demo: " + text;
      toast.hidden = false;
      toast.classList.add('show');
      
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { toast.hidden = true; }, 300);
      }, 3000);
    } else {
      console.log("AI Adaptation Demo: " + text);
    }
  }

  function nextState() {
    // Знімаємо всі класи демонстрації
    states.forEach(s => {
      if (s.class) {
        s.class.split(' ').forEach(c => document.body.classList.remove(c));
      }
    });

    // Переходимо до наступного
    currentIndex = (currentIndex + 1) % states.length;
    const currentState = states[currentIndex];

    // Додаємо новий клас
    if (currentState.class) {
      currentState.class.split(' ').forEach(c => document.body.classList.add(c));
    }

    showNotification(currentState.name);
  }

  // Запускаємо цикл кожні 5 секунд
  setInterval(nextState, 5000);
  
  // Початкове повідомлення
  setTimeout(() => showNotification("Авто-демонстрація активована"), 1000);

})();
