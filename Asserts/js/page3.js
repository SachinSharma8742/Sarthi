

        // Observe scroll reveal elements
        document.querySelectorAll('.scroll-reveal').forEach(el => {
            observer.observe(el);
        });

        // Parallax effect for image
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const imageColumn = document.querySelector('.image-column');
            const rate = scrolled * 0.1;
            
            if (imageColumn) {
                imageColumn.style.transform = `translateY(${rate}px)`;
            }
        });

        // Enhanced hover effects for stat items
        document.querySelectorAll('.stat-item').forEach(item => {
            item.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-4px) scale(1.02)';
            });

            item.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
            });
        });

    

        // A

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
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

        // Add loading animation
        window.addEventListener('load', () => {
            document.body.style.opacity = '1';
        });

        // Performance optimization for scroll events
        let ticking = false;
        function updateParallax() {
            const scrolled = window.pageYOffset;
            const imageColumn = document.querySelector('.image-column');
            const rate = scrolled * 0.05;
            
            if (imageColumn) {
                imageColumn.style.transform = `translateY(${rate}px)`;
            }
            ticking = false;
        }

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateParallax);
                ticking = true;
            }
        });
