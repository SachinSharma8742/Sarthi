
        class TestimonialCarousel {
            constructor() {
                this.carousel = document.getElementById('carouselWrapper');
                this.slides = document.querySelectorAll('.testimonial-slide');
                this.dots = document.querySelectorAll('.dot6');
                this.prevBtn = document.getElementById('prevBtn6');
                this.nextBtn = document.getElementById('nextBtn6');
                
                this.currentIndex = 0;
                this.autoScrollInterval = null;
                
                this.init();
            }

            init() {
                this.bindEvents();
                this.startAutoScroll();
                this.updateCarousel();
            }

            bindEvents() {
                this.nextBtn.addEventListener('click', () => {
                    this.nextSlide();
                    this.resetAutoScroll();
                });

                this.prevBtn.addEventListener('click', () => {
                    this.prevSlide();
                    this.resetAutoScroll();
                });

                this.dots.forEach((dot, index) => {
                    dot.addEventListener('click', () => {
                        this.goToSlide(index);
                        this.resetAutoScroll();
                    });
                });

                // Pause auto-scroll on hover
                this.carousel.parentElement.addEventListener('mouseenter', () => {
                    this.stopAutoScroll();
                });

                this.carousel.parentElement.addEventListener('mouseleave', () => {
                    this.startAutoScroll();
                });

                // Keyboard navigation
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowLeft') {
                        this.prevSlide();
                        this.resetAutoScroll();
                    } else if (e.key === 'ArrowRight') {
                        this.nextSlide();
                        this.resetAutoScroll();
                    }
                });
            }

            updateCarousel() {
                const translateX = -this.currentIndex * 100;
                this.carousel.style.transform = `translateX(${translateX}%)`;

                // Update dots
                this.dots.forEach((dot, index) => {
                    dot.classList.toggle('active', index === this.currentIndex);
                });
            }

            nextSlide() {
                this.currentIndex = (this.currentIndex + 1) % this.slides.length;
                this.updateCarousel();
            }

            prevSlide() {
                this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
                this.updateCarousel();
            }

            goToSlide(index) {
                this.currentIndex = index;
                this.updateCarousel();
            }

            startAutoScroll() {
                this.stopAutoScroll();
                this.autoScrollInterval = setInterval(() => {
                    this.nextSlide();
                }, 6000);
            }

            stopAutoScroll() {
                if (this.autoScrollInterval) {
                    clearInterval(this.autoScrollInterval);
                    this.autoScrollInterval = null;
                }
            }

            resetAutoScroll() {
                this.stopAutoScroll();
                this.startAutoScroll();
            }
        }

        // Initialize carousel when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            new TestimonialCarousel();
        });

        // Client spotlight rotation
        const spotlights = [
            "Studio Spotlight: Lumière Studio used our ColorPop series for their luxury candle launch, resulting in a 40% increase in premium packaging inquiries.",
            "Client Success: ArcPrint reduced their project turnaround time by 30% using our consistent, high-quality paper stocks.",
            "Designer Feature: Megha Kumar's wedding invitations won the 2023 Design Excellence Award using our textured premium series."
        ];

        let currentSpotlight = 0;
        const spotlightElement = document.querySelector('.spotlight-text');

        function rotateSpotlight() {
            spotlightElement.style.opacity = '0';
            setTimeout(() => {
                currentSpotlight = (currentSpotlight + 1) % spotlights.length;
                const [highlight, ...rest] = spotlights[currentSpotlight].split(': ');
                spotlightElement.innerHTML = `<span class="spotlight-highlight">${highlight}:</span> ${rest.join(': ')}`;
                spotlightElement.style.opacity = '1';
            }, 300);
        }

        // Rotate spotlight every 8 seconds
        setInterval(rotateSpotlight, 8000);

        // Logo interactions
        document.querySelectorAll('.client-logo').forEach(logo => {
            logo.addEventListener('click', function() {
                const companyName = this.querySelector('span').textContent;
                console.log(`Viewing ${companyName} case study...`);
                
                // Add click animation
                this.style.transform = 'translateY(-5px) scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 200);
            });
        });

        // CTA button interaction
        document.querySelector('.cta-button').addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Opening testimonial submission form...');
            
            // Add click animation
            this.style.transform = 'translateY(-2px) scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });

        // Intersection Observer for scroll animations
 

        

        // Observe animated elements
        document.querySelectorAll('.section-header, .client-spotlight, .testimonials-carousel, .client-logos, .cta-section').forEach(el => {
            observer.observe(el);
        });
