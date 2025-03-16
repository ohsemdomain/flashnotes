// ui/modal.js
class ModalManager {
    constructor() {
        this.modals = {};
        this.activeModal = null;
        this.lastOpenedModal = null;
        this.setupBackdrop();

        console.log("ModalManager initialized");
    }

    setupBackdrop() {
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'modal-backdrop';
        backdrop.className = 'modal-backdrop';
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                this.closeActiveModal();
            }
        });
        document.body.appendChild(backdrop);
    }

    // Register a modal
    register(modalId, options = {}) {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) {
            console.error(`Modal with ID "${modalId}" not found.`);
            return;
        }

        // Close button functionality
        const closeButtons = modalElement.querySelectorAll('.modal-close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => this.close(modalId));
        });

        // Add to modals registry
        this.modals[modalId] = {
            element: modalElement,
            onOpen: options.onOpen || null,
            onClose: options.onClose || null
        };

        console.log(`Modal "${modalId}" registered successfully`);
    }

    // Open a modal
    open(modalId, data = {}) {
        if (!this.modals[modalId]) {
            console.error(`Modal "${modalId}" is not registered.`);
            return;
        }

        console.log(`Opening modal: ${modalId}, activeModal: ${this.activeModal}`);

        // Close any active modal first, but remember what we're opening
        const previousActiveModal = this.activeModal;

        if (previousActiveModal && previousActiveModal !== modalId) {
            // Properly close the current active modal
            this.modals[previousActiveModal].element.classList.remove('active');

            // Call onClose callback if exists
            if (this.modals[previousActiveModal].onClose) {
                this.modals[previousActiveModal].onClose();
            }
        }

        // Set new active modal
        this.activeModal = modalId;

        // Show backdrop and modal
        const backdrop = document.getElementById('modal-backdrop');
        if (backdrop) backdrop.classList.add('active');
        this.modals[modalId].element.classList.add('active');

        // Call onOpen callback if exists
        if (this.modals[modalId].onOpen) {
            this.modals[modalId].onOpen(data);
        }

        // Prevent body scrolling
        document.body.style.overflow = 'hidden';

        // Add ESC key listener
        this.escKeyListener = (e) => {
            if (e.key === 'Escape') {
                this.closeActiveModal();
            }
        };
        document.addEventListener('keydown', this.escKeyListener);
    }

    // Close a specific modal
    close(modalId) {
        if (!this.modals[modalId]) {
            console.error(`Modal "${modalId}" is not registered.`);
            return;
        }

        console.log(`Closing modal: ${modalId}`);

        // Hide modal
        this.modals[modalId].element.classList.remove('active');

        // Only hide backdrop if this is the currently active modal
        if (this.activeModal === modalId) {
            const backdrop = document.getElementById('modal-backdrop');
            if (backdrop) backdrop.classList.remove('active');

            // Reset active modal reference
            this.activeModal = null;

            // Restore body scrolling
            document.body.style.overflow = '';

            // Remove ESC key listener
            document.removeEventListener('keydown', this.escKeyListener);
        }

        // Call onClose callback if exists
        if (this.modals[modalId].onClose) {
            this.modals[modalId].onClose();
        }
    }

    // Close currently active modal
    closeActiveModal() {
        if (this.activeModal) {
            console.log(`Closing active modal: ${this.activeModal}`);

            // Store current active modal ID before clearing the reference
            const currentActiveModal = this.activeModal;

            // Clear active modal reference
            this.activeModal = null;

            // Hide the modal element
            this.modals[currentActiveModal].element.classList.remove('active');

            // Hide the backdrop
            const backdrop = document.getElementById('modal-backdrop');
            if (backdrop) backdrop.classList.remove('active');

            // Call onClose callback if exists
            if (this.modals[currentActiveModal].onClose) {
                this.modals[currentActiveModal].onClose();
            }

            // Restore body scrolling
            document.body.style.overflow = '';

            // Remove ESC key listener
            document.removeEventListener('keydown', this.escKeyListener);
        }
    }

    // Open the previous modal
    openPreviousModal(data = {}) {
        if (this.lastOpenedModal) {
            console.log(`Opening previous modal: ${this.lastOpenedModal}`);
            this.open(this.lastOpenedModal, data);
            this.lastOpenedModal = null;
        }
    }
}

// Export a singleton instance
const modalManager = new ModalManager();