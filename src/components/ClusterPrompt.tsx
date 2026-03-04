import React from 'react';
import { NoteCluster } from '../utils/noteCluster';
import './ClusterPrompt.css';

interface ClusterPromptProps {
    cluster: NoteCluster;
    onShowAll: () => void;
    onJustOne: () => void;
    onDismiss: () => void;
}

export function ClusterPrompt({ cluster, onShowAll, onJustOne, onDismiss }: ClusterPromptProps) {
    const emoji = cluster.type === 'domain' ? '🔗' : cluster.type === 'time' ? '📅' : '💬';

    return (
        <div className="cluster-prompt-overlay" onClick={onDismiss}>
            <div className="cluster-prompt" onClick={e => e.stopPropagation()}>
                <div className="cluster-prompt-header">
                    <span className="cluster-prompt-emoji">{emoji}</span>
                    <span className="cluster-prompt-title">Related notes found</span>
                </div>
                <p className="cluster-prompt-message">
                    {cluster.label} — review them together?
                </p>
                <div className="cluster-prompt-actions">
                    <button className="cluster-prompt-btn cluster-prompt-btn-primary" onClick={onShowAll}>
                        Show All
                    </button>
                    <button className="cluster-prompt-btn cluster-prompt-btn-secondary" onClick={onJustOne}>
                        Just One
                    </button>
                </div>
            </div>
        </div>
    );
}
