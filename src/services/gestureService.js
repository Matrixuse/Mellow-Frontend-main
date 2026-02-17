// Mobile gesture controls service
class GestureService {
    constructor() {
        this.isSupported = 'ontouchstart' in window;
        this.gestureThreshold = 50; // Minimum distance for swipe
        this.tapThreshold = 300; // Maximum time for tap
        this.startX = 0;
        this.startY = 0;
        this.startTime = 0;
        this.isListening = false;
        // By default do NOT call preventDefault() during touchmove so native
        // scrolling remains available. Callers can enable preventDefault when
        // they intentionally want to lock scroll (rare).
        this.preventDefaultOnMove = false;
        this.init();
    }

    init() {
        if (this.isSupported) {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Add touch event listeners to the document
        // touchstart/end can be passive; touchmove must be non-passive if we call preventDefault()
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    }

    handleTouchStart(e) {
        if (!this.isListening) return;

        const touch = e.touches[0];
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.startTime = Date.now();
    }

    handleTouchMove(e) {
        // Prevent default scrolling during gesture detection
        if (this.isListening && e.touches && e.touches.length === 1 && this.preventDefaultOnMove) {
            try {
                if (typeof e.preventDefault === 'function') e.preventDefault();
            } catch (err) {
                // ignore - some browsers may still disallow preventDefault in passive context
            }
        }
    }

    // Configure whether touchmove should call preventDefault while listening.
    // Default is false to allow native scrolling on mobile devices.
    setPreventDefaultOnMove(enabled) {
        this.preventDefaultOnMove = !!enabled;
    }

    handleTouchEnd(e) {
        if (!this.isListening) return;

        const touch = e.changedTouches[0];
        const endX = touch.clientX;
        const endY = touch.clientY;
        const endTime = Date.now();

        const deltaX = endX - this.startX;
        const deltaY = endY - this.startY;
        const deltaTime = endTime - this.startTime;

        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

        // Determine gesture type
        if (distance > this.gestureThreshold) {
            // Swipe gesture
            if (Math.abs(angle) < 30) {
                // Horizontal swipe
                if (deltaX > 0) {
                    this.onSwipeRight?.();
                } else {
                    this.onSwipeLeft?.();
                }
            } else if (Math.abs(angle - 90) < 30 || Math.abs(angle + 90) < 30) {
                // Vertical swipe
                if (deltaY > 0) {
                    this.onSwipeDown?.();
                } else {
                    this.onSwipeUp?.();
                }
            }
        } else if (deltaTime < this.tapThreshold) {
            // Tap gesture
            this.onTap?.(endX, endY);
        }
    }

    // Enable gesture listening
    enable() {
        this.isListening = true;
    }

    // Disable gesture listening
    disable() {
        this.isListening = false;
    }

    // Set event handlers
    setEventHandlers(handlers) {
        this.onSwipeLeft = handlers.onSwipeLeft;
        this.onSwipeRight = handlers.onSwipeRight;
        this.onSwipeUp = handlers.onSwipeUp;
        this.onSwipeDown = handlers.onSwipeDown;
        this.onTap = handlers.onTap;
    }

    // Set gesture threshold
    setThreshold(threshold) {
        this.gestureThreshold = threshold;
    }

    // Set tap threshold
    setTapThreshold(threshold) {
        this.tapThreshold = threshold;
    }

    isAvailable() {
        return this.isSupported;
    }
}

// Create a singleton instance
const gestureService = new GestureService();

export default gestureService;
