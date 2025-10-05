
        class PaperSlider {
            constructor() {
                this.slider = document.getElementById('sliderWrapper');
                this.cards = document.querySelectorAll('.paper-card');
                this.prevBtn = document.getElementById('prevBtn');
                this.nextBtn = document.getElementById('nextBtn');
                this.dotsContainer = document.getElementById('dotsContainer');
                
                this.currentIndex = 0;
                this.cardWidth = 350; // 320px + 30px gap
                this.visibleCards = this.getVisibleCards();
                this.maxIndex = Math.max(0, this.cards.length - this.visibleCards);
                this.autoScrollInterval = null;
                this.isTransitioning = false;
                
                this.init();
            }

            getVisibleCards() {
                const width = window.innerWidth;
                if (width <= 480) return 1;
                if (width <= 768) return 2;
                if (width <= 1024) return 3;
                return 4;
            }

            init() {
                this.createDots();
                this.updateSlider();
                this.bindEvents();
                this.startAutoScroll();
                this.setupTouchEvents();
            }

            createDots() {
                this.dotsContainer.innerHTML = '';
                const totalDots = this.maxIndex + 1;
                
                for (let i = 0; i < totalDots; i++) {
                    const dot = document.createElement('div');
                    dot.className = 'dot';
                    if (i === 0) dot.classList.add('active');
                    dot.addEventListener('click', () => this.goToSlide(i));
                    this.dotsContainer.appendChild(dot);
                }
            }

            updateSlider() {
                if (this.isTransitioning) return;
                
                const translateX = -this.currentIndex * this.cardWidth;
                this.slider.style.transform = `translateX(${translateX}px)`;
                
                // Update dots
                document.querySelectorAll('.dot').forEach((dot, index) => {
                    dot.classList.toggle('active', index === this.currentIndex);
                });

                // Update navigation buttons
                this.prevBtn.disabled = this.currentIndex === 0;
                this.nextBtn.disabled = this.currentIndex >= this.maxIndex;
            }

            goToSlide(index) {
                if (this.isTransitioning) return;
                
                this.currentIndex = Math.max(0, Math.min(index, this.maxIndex));
                this.updateSlider();
                this.resetAutoScroll();
            }

            nextSlide() {
                if (this.currentIndex >= this.maxIndex) {
                    this.currentIndex = 0; // Loop back to start
                } else {
                    this.currentIndex++;
                }
                this.updateSlider();
            }

            prevSlide() {
                if (this.currentIndex <= 0) {
                    this.currentIndex = this.maxIndex; // Loop to end
                } else {
                    this.currentIndex--;
                }
                this.updateSlider();
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

                // Pause auto-scroll on hover
                this.slider.parentElement.addEventListener('mouseenter', () => {
                    this.stopAutoScroll();
                });

                this.slider.parentElement.addEventListener('mouseleave', () => {
                    this.startAutoScroll();
                });

                // Handle window resize
                window.addEventListener('resize', () => {
                    this.visibleCards = this.getVisibleCards();
                    this.maxIndex = Math.max(0, this.cards.length - this.visibleCards);
                    this.currentIndex = Math.min(this.currentIndex, this.maxIndex);
                    this.createDots();
                    this.updateSlider();
                });

                // Card click events
                this.cards.forEach((card, index) => {
                    card.addEventListener('click', () => {
                        // Add click animation
                        card.style.transform = 'translateY(-8px) scale(0.98)';
                        setTimeout(() => {
                            card.style.transform = '';
                        }, 150);
                        
                        console.log(`Clicked on paper: ${card.querySelector('.paper-name').textContent}`);
                    });
                });
            }

            setupTouchEvents() {
                let startX = 0;
                let currentX = 0;
                let isDragging = false;

                this.slider.addEventListener('touchstart', (e) => {
                    startX = e.touches[0].clientX;
                    isDragging = true;
                    this.stopAutoScroll();
                });

                this.slider.addEventListener('touchmove', (e) => {
                    if (!isDragging) return;
                    currentX = e.touches[0].clientX;
                    const diffX = startX - currentX;
                    
                    // Add resistance at boundaries
                    let resistance = 1;
                    if ((this.currentIndex === 0 && diffX < 0) || 
                        (this.currentIndex >= this.maxIndex && diffX > 0)) {
                        resistance = 0.3;
                    }
                    
                    const translateX = -this.currentIndex * this.cardWidth - (diffX * resistance);
                    this.slider.style.transform = `translateX(${translateX}px)`;
                });

                this.slider.addEventListener('touchend', () => {
                    if (!isDragging) return;
                    isDragging = false;
                    
                    const diffX = startX - currentX;
                    const threshold = 50;
                    
                    if (Math.abs(diffX) > threshold) {
                        if (diffX > 0 && this.currentIndex < this.maxIndex) {
                            this.nextSlide();
                        } else if (diffX < 0 && this.currentIndex > 0) {
                            this.prevSlide();
                        } else {
                            this.updateSlider(); // Snap back
                        }
                    } else {
                        this.updateSlider(); // Snap back
                    }
                    
                    this.startAutoScroll();
                });
            }

            startAutoScroll() {
                this.stopAutoScroll();
                this.autoScrollInterval = setInterval(() => {
                    this.nextSlide();
                }, 5000);
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

        // Initialize slider when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            new PaperSlider();
        });

    

        // Observe section elements
        document.querySelectorAll('.section-header, .slider-container').forEach(el => {
            observer.observe(el);
        });
