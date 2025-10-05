// Enhanced Mobile Header Controller
class MobileHeaderController {
    constructor() {
        // Get all necessary elements
        this.header = document.getElementById('mainHeader');
        this.mobileMenuToggle = document.getElementById('mobileMenuToggle');
        this.mobileMenu = document.getElementById('mobileMenu');
        this.mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
        this.mobileMenuClose = document.getElementById('mobileMenuClose');
        this.headerCtaContainer = document.getElementById('headerCtaContainer');
        this.heroSection = document.getElementById('home');
        
        // State management
        this.isMenuOpen = false;
        this.lastScrollY = 0;
        
        // Initialize
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupScrollEffect();
        this.setupSmoothScrolling();
        this.handleResize();
        this.setupHeaderCtaVisibility();
        
        // Set initial ARIA attributes
        this.setInitialARIA();
    }

    setInitialARIA() {
        if (this.mobileMenu) {
            this.mobileMenu.setAttribute('aria-hidden', 'true');
        }
        if (this.mobileMenuToggle) {
            this.mobileMenuToggle.setAttribute('aria-expanded', 'false');
        }
    }

    bindEvents() {
        // Mobile menu toggle button
        if (this.mobileMenuToggle) {
            this.mobileMenuToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMobileMenu();
            });
        }

        // Mobile menu close button - THIS IS THE KEY FIX
        if (this.mobileMenuClose) {
            this.mobileMenuClose.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Close button clicked'); // Debug log
                this.closeMobileMenu();
            });
        }

        // Mobile overlay click
        if (this.mobileMenuOverlay) {
            this.mobileMenuOverlay.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeMobileMenu();
            });
        }

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen && 
                this.mobileMenu && 
                this.mobileMenuToggle &&
                !this.mobileMenu.contains(e.target) && 
                !this.mobileMenuToggle.contains(e.target)) {
                this.closeMobileMenu();
            }
        });

        // Handle navigation clicks
        this.setupNavigationClicks();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) {
                this.closeMobileMenu();
            }
        });

        // Prevent menu from closing when clicking inside it
        if (this.mobileMenu) {
            this.mobileMenu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    setupNavigationClicks() {
        // Desktop navigation
        document.querySelectorAll('.nav-link, .dropdown-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    this.smoothScrollToSection(href.substring(1));
                    this.updateActiveNavigation(href.substring(1));
                }
            });
        });

        // Mobile navigation
        document.querySelectorAll('.mobile-nav-link, .mobile-cta-button').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    this.smoothScrollToSection(href.substring(1));
                    this.updateActiveNavigation(href.substring(1));
                    this.closeMobileMenu();
                }
            });
        });

        // Logo clicks
        document.querySelectorAll('.brand-logo').forEach(logo => {
            logo.addEventListener('click', (e) => {
                e.preventDefault();
                this.smoothScrollToSection('home');
                this.updateActiveNavigation('home');
                this.closeMobileMenu();
            });
        });

        // CTA buttons
        document.querySelectorAll('.cta-button-header, .btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const href = btn.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    this.smoothScrollToSection(href.substring(1));
                    this.updateActiveNavigation(href.substring(1));
                    this.closeMobileMenu();
                }
            });
        });
    }

    setupScrollEffect() {
        let ticking = false;
        
        const updateHeader = () => {
            const scrollY = window.scrollY;
            
            // Add/remove scrolled class
            if (scrollY > 50) {
                this.header?.classList.add('scrolled');
            } else {
                this.header?.classList.remove('scrolled');
            }
            
            // Update active navigation based on scroll position
            this.updateActiveNavigationOnScroll();
            
            this.lastScrollY = scrollY;
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(updateHeader);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        
        // Initial call
        updateHeader();
    }

    updateActiveNavigationOnScroll() {
        const sections = document.querySelectorAll('section[id]');
        const scrollPos = window.scrollY + 100; // Offset for header height

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                this.updateActiveNavigation(sectionId);
            }
        });
    }

    setupSmoothScrolling() {
        // Smooth scroll is handled by CSS scroll-behavior: smooth
        // This is just a fallback for older browsers
        if (!('scrollBehavior' in document.documentElement.style)) {
            this.loadSmoothScrollPolyfill();
        }
    }

    smoothScrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const headerHeight = this.header?.offsetHeight || 80;
            const sectionTop = section.offsetTop - headerHeight;
            
            window.scrollTo({
                top: sectionTop,
                behavior: 'smooth'
            });
        }
    }

    updateActiveNavigation(sectionId) {
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current section links
        document.querySelectorAll(`[href="#${sectionId}"]`).forEach(link => {
            if (link.classList.contains('nav-link') || link.classList.contains('mobile-nav-link')) {
                link.classList.add('active');
            }
        });
    }

    toggleMobileMenu() {
        console.log('Toggle menu called, current state:', this.isMenuOpen); // Debug log
        if (this.isMenuOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu() {
        console.log('Opening mobile menu'); // Debug log
        this.isMenuOpen = true;
        
        // Add active classes
        this.mobileMenu?.classList.add('active');
        this.mobileMenuOverlay?.classList.add('active');
        this.mobileMenuToggle?.classList.add('active');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Update ARIA attributes
        this.mobileMenu?.setAttribute('aria-hidden', 'false');
        this.mobileMenuToggle?.setAttribute('aria-expanded', 'true');
        
        // Focus management
        const firstLink = this.mobileMenu?.querySelector('.mobile-nav-link');
        if (firstLink) {
            setTimeout(() => firstLink.focus(), 100);
        }
    }

    closeMobileMenu() {
        console.log('Closing mobile menu'); // Debug log
        this.isMenuOpen = false;
        
        // Remove active classes
        this.mobileMenu?.classList.remove('active');
        this.mobileMenuOverlay?.classList.remove('active');
        this.mobileMenuToggle?.classList.remove('active');
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Update ARIA attributes
        this.mobileMenu?.setAttribute('aria-hidden', 'true');
        this.mobileMenuToggle?.setAttribute('aria-expanded', 'false');
        
        // Return focus to toggle button
        this.mobileMenuToggle?.focus();
    }

    handleResize() {
        // Close mobile menu on resize to desktop
        if (window.innerWidth > 768 && this.isMenuOpen) {
            this.closeMobileMenu();
        }
    }

    setupHeaderCtaVisibility() {
        // Initial render
        this.updateHeaderCta();

        // On scroll and resize
        window.addEventListener('scroll', () => this.updateHeaderCta(), { passive: true });
        window.addEventListener('resize', () => this.updateHeaderCta());
    }

    updateHeaderCta() {
        const isMobile = window.innerWidth <= 768;
        const heroRect = this.heroSection?.getBoundingClientRect();
        const isHeroInView = heroRect && heroRect.bottom > (this.header?.offsetHeight || 0);

        const ctaExists = !!this.headerCtaContainer.querySelector('.header-cta');

        if (!isMobile && !isHeroInView) {
            if (!ctaExists) {
                // Make CTA content inline and vertically centered
                this.headerCtaContainer.innerHTML = `
                    <div class="header-cta" style="
                        opacity:0;
                        width:0;
                        overflow:hidden;
                        transition:
                            opacity 0.5s cubic-bezier(.4,0,.2,1),
                            width 0.7s cubic-bezier(.4,0,.2,1);
                        will-change:opacity,width;
                        display:inline-block;
                        vertical-align:middle;
                    ">
                        <a href="#samples" class="cta-button-header" style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                            <span class="material-icons" style="font-size:20px;vertical-align:middle;">science</span>
                            <span style="vertical-align:middle;">Request Sample</span>
                        </a>
                    </div>
                `;
                // Fade and expand in
                requestAnimationFrame(() => {
                    const cta = this.headerCtaContainer.querySelector('.header-cta');
                    if (cta) {
                        cta.style.width = 'auto';
                        const naturalWidth = cta.offsetWidth + 'px';
                        cta.style.width = '0';
                        setTimeout(() => {
                            cta.style.width = naturalWidth;
                            cta.style.opacity = '1';
                        }, 10);
                    }
                });
                // Re-bind CTA click for smooth scroll
                const btn = this.headerCtaContainer.querySelector('.cta-button-header');
                if (btn) {
                    btn.addEventListener('click', (e) => {
                        const href = btn.getAttribute('href');
                        if (href && href.startsWith('#')) {
                            e.preventDefault();
                            this.smoothScrollToSection(href.substring(1));
                            this.updateActiveNavigation(href.substring(1));
                            this.closeMobileMenu();
                        }
                    });
                }
            }
        } else if (ctaExists) {
            // Fade and shrink out, then remove
            const cta = this.headerCtaContainer.querySelector('.header-cta');
            if (cta) {
                cta.style.opacity = '0';
                cta.style.width = '0';
                setTimeout(() => {
                    if (cta.parentNode === this.headerCtaContainer) {
                        this.headerCtaContainer.innerHTML = '';
                    }
                }, 700);
            }
        }
    }

    loadSmoothScrollPolyfill() {
        // Simple smooth scroll polyfill
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/gh/cferdinandi/smooth-scroll@15.0.0/dist/smooth-scroll.polyfills.min.js';
        document.head.appendChild(script);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing header controller'); // Debug log
    new MobileHeaderController();
});

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Close mobile menu when tab becomes hidden
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu && mobileMenu.classList.contains('active')) {
            const controller = new MobileHeaderController();
            controller.closeMobileMenu();
        }
    }
});

// Add CSS for smooth scrolling
document.documentElement.style.scrollBehavior = 'smooth';

// Smooth header opacity based on hero-section visibility
(function() {
    const header = document.getElementById('mainHeader');
    const hero = document.getElementById('home');
    const minOpacity = 0.7;
    const maxOpacity = 1;

    function updateHeaderOpacity() {
        if (!header || !hero) return;
        const heroRect = hero.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;

        if (heroRect.bottom <= 0) {
            // Hero-section is out of view (scrolled past)
            header.style.opacity = maxOpacity;
        } else if (heroRect.top < windowHeight && heroRect.bottom > 0) {
            // Hero-section is partially in view
            // Calculate how much of hero is visible (0 = not visible, 1 = fully visible)
            const visible = Math.max(0, Math.min(1, heroRect.bottom / heroRect.height));
            // Interpolate opacity
            header.style.opacity = minOpacity + (maxOpacity - minOpacity) * (1 - visible);
        } else {
            // Hero-section is fully in view
            header.style.opacity = minOpacity;
        }
    }

    window.addEventListener('scroll', updateHeaderOpacity, { passive: true });
    window.addEventListener('resize', updateHeaderOpacity);
    document.addEventListener('DOMContentLoaded', updateHeaderOpacity);
})();

// Force scroll to top on page load to avoid starting at footer due to hash
window.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash) {
        window.scrollTo(0, 0);
        // Optionally, remove the hash so it doesn't jump again
        history.replaceState(null, '', window.location.pathname + window.location.search);
    }
});