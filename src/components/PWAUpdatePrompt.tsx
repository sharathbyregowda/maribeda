import { useRegisterSW } from 'virtual:pwa-register/react';
import './PWAUpdatePrompt.css';

export function PWAUpdatePrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered:', r);
        },
        onRegisterError(error) {
            console.log('SW registration error:', error);
        },
    });

    const handleUpdate = () => {
        updateServiceWorker(true);
    };

    const handleDismiss = () => {
        setNeedRefresh(false);
    };

    if (!needRefresh) {
        return null;
    }

    return (
        <div className="pwa-update-prompt">
            <div className="pwa-update-content">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>New version available!</span>
            </div>
            <div className="pwa-update-actions">
                <button className="pwa-update-btn" onClick={handleUpdate}>
                    Update Now
                </button>
                <button className="pwa-dismiss-btn" onClick={handleDismiss}>
                    Later
                </button>
            </div>
        </div>
    );
}
