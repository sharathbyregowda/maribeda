import React from 'react';
import { LinkPreview } from '../types';
import { getDomain } from '../utils/urlDetector';
import './LinkPreviewCard.css';

interface LinkPreviewListProps {
    previews: LinkPreview[];
}

/**
 * Domain icon map — simple emoji-based icons for common domains
 */
function getDomainIcon(domain: string): string {
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) return '▶️';
    if (domain.includes('instagram.com')) return '📷';
    if (domain.includes('twitter.com') || domain.includes('x.com')) return '🐦';
    if (domain.includes('github.com')) return '💻';
    if (domain.includes('reddit.com')) return '💬';
    if (domain.includes('spotify.com')) return '🎵';
    if (domain.includes('medium.com')) return '📝';
    if (domain.includes('linkedin.com')) return '💼';
    if (domain.includes('tiktok.com')) return '🎬';
    if (domain.includes('pinterest.com')) return '📌';
    if (domain.includes('wikipedia.org')) return '📚';
    return '🔗';
}

/**
 * Truncate a URL for display
 */
function truncateUrl(url: string, maxLength: number = 50): string {
    try {
        const parsed = new URL(url);
        const path = parsed.pathname + parsed.search;
        const display = parsed.hostname + (path.length > 1 ? path : '');
        return display.length > maxLength ? display.slice(0, maxLength) + '…' : display;
    } catch {
        return url.length > maxLength ? url.slice(0, maxLength) + '…' : url;
    }
}

/**
 * Single link preview card
 */
function LinkPreviewCard({ preview }: { preview: LinkPreview }) {
    const hasRichData = preview.title || preview.description;

    if (!hasRichData) {
        // Minimal: just show domain + truncated URL
        return (
            <a
                className="link-preview-card link-preview-card--minimal"
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
            >
                <span className="link-preview-card-site">
                    {preview.siteName || getDomain(preview.url) || 'Link'}
                </span>
                <span className="link-preview-card-url">
                    {truncateUrl(preview.url)}
                </span>
            </a>
        );
    }

    return (
        <a
            className="link-preview-card"
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
        >
            {preview.title && (
                <span className="link-preview-card-title">{preview.title}</span>
            )}
            {preview.description && (
                <span className="link-preview-card-description">{preview.description}</span>
            )}
            <span className="link-preview-card-site">
                {preview.siteName || getDomain(preview.url) || 'Link'}
            </span>
        </a>
    );
}

/**
 * Group previews by domain and render them in groups
 */
export function LinkPreviewList({ previews }: LinkPreviewListProps) {
    if (previews.length === 0) return null;

    // Group by domain
    const groups = new Map<string, LinkPreview[]>();
    for (const preview of previews) {
        const domain = getDomain(preview.url) || 'other';
        const existing = groups.get(domain) || [];
        existing.push(preview);
        groups.set(domain, existing);
    }

    // If all previews are from the same domain, show with a domain header
    // If mixed domains, show each with its own site label
    const isSingleDomain = groups.size === 1;

    return (
        <div className="link-previews">
            {isSingleDomain ? (
                // Single domain: show header + cards
                Array.from(groups.entries()).map(([domain, domainPreviews]) => (
                    <div key={domain} className="link-preview-domain-group">
                        <div className="link-previews-header">
                            <span className="domain-icon">{getDomainIcon(domain)}</span>
                            <span>{domain} · {domainPreviews.length} {domainPreviews.length === 1 ? 'link' : 'links'}</span>
                        </div>
                        {domainPreviews.map(preview => (
                            <LinkPreviewCard key={preview.id} preview={preview} />
                        ))}
                    </div>
                ))
            ) : (
                // Mixed domains: just list all cards (each shows its own site name)
                previews.map(preview => (
                    <LinkPreviewCard key={preview.id} preview={preview} />
                ))
            )}
        </div>
    );
}

/**
 * Loading state for link previews
 */
export function LinkPreviewLoading() {
    return (
        <div className="link-previews-loading">
            <div className="link-previews-loading-dot" />
            <div className="link-previews-loading-dot" />
            <div className="link-previews-loading-dot" />
            <span>Fetching link previews…</span>
        </div>
    );
}
