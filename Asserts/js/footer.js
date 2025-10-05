
        // Newsletter form submission
        document.getElementById('newsletterForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const email = this.querySelector('input[type="email"]').value;
            
            // Add success animation
            const button = this.querySelector('.newsletter-btn');
            const originalText = button.textContent;
            
            button.textContent = 'Subscribed!';
            button.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = 'linear-gradient(135deg, #8B7355, #A68B5B)';
                this.reset();
            }, 2000);
            
            console.log(`Newsletter subscription: ${email}`);
        });

        // Enhanced link hover effects
        document.querySelectorAll('.footer-links a').forEach(link => {
            link.addEventListener('mouseenter', function() {
                this.style.paddingLeft = '8px';
            });
            
            link.addEventListener('mouseleave', function() {
                this.style.paddingLeft = '0';
            });
        });

        // Social media link interactions
        document.querySelectorAll('.social-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const platform = this.getAttribute('aria-label');
                console.log(`Opening ${platform} profile...`);
                
                // Add click animation
                this.style.transform = 'translateY(-3px) scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            });
        });

        // Contact link interactions
        document.querySelectorAll('.contact-info a').forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href.startsWith('tel:') || href.startsWith('mailto:')) {
                    // Allow default behavior for tel: and mailto: links
                    return;
                }
                e.preventDefault();
                console.log(`Contact action: ${href}`);
            });
        });

        // Badge interactions
        document.querySelectorAll('.badge').forEach(badge => {
            badge.addEventListener('click', function() {
                const certification = this.querySelector('span:last-child').textContent;
                console.log(`Viewing ${certification} details...`);
                
                // Add click animation
                this.style.transform = 'translateY(-2px) scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            });
        });


        // Observe footer sections
        document.querySelectorAll('.footer-brand, .footer-main, .footer-bottom').forEach(section => {
            observer.observe(section);
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

        // Enhanced newsletter input focus effects
        const newsletterInput = document.querySelector('.newsletter-input');
        newsletterInput.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
        });

        newsletterInput.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });

     
