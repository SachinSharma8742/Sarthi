
        // Enhanced button interactions
        document.querySelectorAll('.cta-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Create ripple effect
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}px;
                    top: ${y}px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    transform: scale(0);
                    animation: ripple 0.6s ease-out;
                    pointer-events: none;
                `;
                
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);

                // Handle navigation
                const href = this.getAttribute('href');
                if (href === '#samples') {
                    console.log('Opening sample request form...');
                    // Here you would typically open a modal or navigate to samples page
                } else if (href === '#contact') {
                    console.log('Opening contact form...');
                    // Here you would typically open contact form or navigate to contact page
                }
            });
        });

      
    
        // Contact item interactions
        document.querySelectorAll('.contact-item').forEach(item => {
            item.addEventListener('click', function() {
                const text = this.querySelector('span').textContent;
                if (text.includes('@')) {
                    window.location.href = `mailto:${text}`;
                } else if (text.includes('+')) {
                    window.location.href = `tel:${text.replace(/\s/g, '')}`;
                }
            });

            item.style.cursor = 'pointer';
            item.addEventListener('mouseenter', function() {
                this.style.color = '#8B7355';
                this.style.transform = 'translateY(-1px)';
            });

            item.addEventListener('mouseleave', function() {
                this.style.color = '#666666';
                this.style.transform = 'translateY(0)';
            });
        });

        // Trust badge interactions
        document.querySelectorAll('.trust-badge').forEach(badge => {
            badge.addEventListener('click', function() {
                const badgeText = this.querySelector('span:last-child').textContent;
                console.log(`Viewing ${badgeText} certification details...`);
                
                // Add click animation
                this.style.transform = 'translateY(-2px) scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            });
        });

        // Parallax effect for floating elements
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.1;
            
            document.querySelectorAll('.floating-paper').forEach((paper, index) => {
                const speed = (index + 1) * 0.05;
                paper.style.transform = `translateY(${rate * speed}px) rotate(${scrolled * 0.01}deg)`;
            });
        });


       

        // Enhanced hover effects for buttons
        document.querySelectorAll('.cta-btn').forEach(button => {
            button.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-4px) scale(1.02)';
            });

            button.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
            });
        });

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

        // Loading animation
        window.addEventListener('load', () => {
            document.body.style.opacity = '1';
        });

     
