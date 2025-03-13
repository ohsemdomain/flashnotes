// modal.js
class ModalManager {
    constructor() {
        this.modals = {};
        this.activeModal = null;
        this.lastOpenedModal = null;
        this.setupBackdrop();
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
    }

    // Open a modal
    open(modalId, data = {}) {
        if (!this.modals[modalId]) {
            console.error(`Modal "${modalId}" is not registered.`);
            return;
        }

        // Store last opened modal
        if (this.activeModal) {
            this.lastOpenedModal = this.activeModal;
        }

        // Close any active modal first
        if (this.activeModal) {
            this.closeActiveModal();
        }

        // Show backdrop and modal
        document.getElementById('modal-backdrop').classList.add('active');
        this.modals[modalId].element.classList.add('active');
        this.activeModal = modalId;

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

        // Hide modal
        this.modals[modalId].element.classList.remove('active');
        document.getElementById('modal-backdrop').classList.remove('active');

        // Call onClose callback if exists
        if (this.modals[modalId].onClose) {
            this.modals[modalId].onClose();
        }

        // Reset active modal
        this.activeModal = null;

        // Restore body scrolling
        document.body.style.overflow = '';

        // Remove ESC key listener
        document.removeEventListener('keydown', this.escKeyListener);
    }

    // Close currently active modal
    closeActiveModal() {
        if (this.activeModal) {
            this.close(this.activeModal);
        }
    }

    // Open the previous modal
    openPreviousModal(data = {}) {
        if (this.lastOpenedModal) {
            this.open(this.lastOpenedModal, data);
            this.lastOpenedModal = null;
        }
    }
}

// Export a singleton instance
const modalManager = new ModalManager();