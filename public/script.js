document.addEventListener('DOMContentLoaded', function() {
  // Fix tab switching logic
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });

  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
  });

  document.querySelectorAll('.feature-card, .workflow-step, .tech-card, .impact-card, .research-card, .team-card').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
  });

  function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-target'));
    const duration = 2000;
    const increment = target / (duration / 16);
    let current = 0;

    const updateCounter = () => {
      current += increment;
      if (current < target) {
        element.textContent = Math.floor(current) + '%';
        requestAnimationFrame(updateCounter);
      } else {
        element.textContent = target + '%';
      }
    };

    updateCounter();
  }

  const impactObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const valueElement = entry.target.querySelector('.impact-value[data-target]');
        if (valueElement && !valueElement.classList.contains('animated')) {
          valueElement.classList.add('animated');
          animateCounter(valueElement);
        }
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.impact-card').forEach(card => {
    impactObserver.observe(card);
  });

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  const buttons = document.querySelectorAll('.btn');
  buttons.forEach(button => {
    button.addEventListener('click', function() {
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = '';
      }, 150);
    });
  });
});

