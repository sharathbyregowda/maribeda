import { useState, useEffect } from 'react';
import './InstallPrompt.css';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'maribeda_install_prompt';
const DISMISS_DAYS = 7;
const MIN_VISITS = 2;
const MIN_NOTES = 3;

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Detect iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);

        // Check dismissal and visit count
        const stored = localStorage.getItem(STORAGE_KEY);
        const data = stored ? JSON.parse(stored) : { dismissedAt: null, visitCount: 0 };

        // Increment visit count
        data.visitCount = (data.visitCount || 0) + 1;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        // Check if recently dismissed
        if (data.dismissedAt) {
            const dismissedDate = new Date(data.dismissedAt);
            const daysSinceDismissal = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissal < DISMISS_DAYS) {
                return;
            }
        }

        // Check note count for smart timing
        const noteCount = document.querySelectorAll('.note-card').length;
        const shouldShow = data.visitCount >= MIN_VISITS || noteCount >= MIN_NOTES;

        // For iOS, show banner if criteria met
        if (isIOSDevice && shouldShow) {
            setShowBanner(true);
            return;
        }

        // Listen for beforeinstallprompt (Android/Desktop)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            if (shouldShow) {
                setShowBanner(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Listen for successful install
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowBanner(false);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsInstalled(true);
            }
            setDeferredPrompt(null);
            setShowBanner(false);
        }
    };

    const handleDismiss = () => {
        const data = { dismissedAt: new Date().toISOString(), visitCount: 0 };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setShowBanner(false);
    };

    if (isInstalled || !showBanner) {
        return null;
    }

    return (
        <div className="install-prompt">
            <div className="install-prompt-content">
                <img src="/favicon.jpg" alt="Maribeda" className="install-prompt-icon" />
                <div className="install-prompt-text">
                    <strong>Install Maribeda</strong>
                    {isIOS ? (
                        <span>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong></span>
                    ) : (
                        <span>Get quick access from your home screen</span>
                    )}
                </div>
            </div>
            <div className="install-prompt-actions">
                {!isIOS && (
                    <button className="install-prompt-install" onClick={handleInstall}>
                        Install
                    </button>
                )}
                <button className="install-prompt-dismiss" onClick={handleDismiss}>
                    {isIOS ? 'Got it' : 'Maybe Later'}
                </button>
            </div>
        </div>
    );
}
