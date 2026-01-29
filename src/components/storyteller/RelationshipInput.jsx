import React, { useState, useEffect } from 'react';

const RelationshipInput = ({ sourceName, targetName, onCancel, onSubmit, onValidate, styles = {} }) => {
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [quality, setQuality] = useState(null); // { score: 0.8, verdict: 'accepted' }
    const [validationMsg, setValidationMsg] = useState('');

    const isValid = text.length >= 3;

    useEffect(() => {
        if (!text || text.length < 3) {
            setQuality(null);
            setValidationMsg('');
            return;
        }

        const timer = setTimeout(async () => {
            if (onValidate) {
                const result = await onValidate(text);
                // API returns { verdict, quality, message, suggestions }
                if (result && result.quality) {
                    setQuality({
                        score: result.quality.score,
                        verdict: result.verdict // 'accepted' or 'rejected'
                    });
                    setValidationMsg(result.message || '');
                }
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [text, onValidate]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isValid) return;
        setIsSubmitting(true);
        onSubmit(text);
    };

    return (
        <div className="relationshipModalBackdrop">
            <div className="relationshipModal" style={styles}>
                <div className="relationshipHeader">
                    <h3>Create Connection</h3>
                </div>

                <div className="relationshipFlow">
                    <span className="cardName source">{sourceName}</span>
                    <span className="arrow">→</span>
                    <span className="cardName target">{targetName}</span>
                </div>

                <form onSubmit={handleSubmit}>
                    <label>
                        How are they related?
                        <input
                            autoFocus
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="e.g. hunts, loves, emanates from..."
                            disabled={isSubmitting}
                        />
                    </label>

                    {quality && (
                        <div className={`qualityIndicator ${quality.verdict}`}>
                            {quality.verdict === 'accepted' ? '✓ Good connection' : '⚠ Weak connection'}
                            <span className="score">({quality.score})</span>
                        </div>
                    )}

                    <div className="modalActions">
                        <button type="button" className="ghost" onClick={onCancel} disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button type="submit" className="primary" disabled={!isValid || isSubmitting}>
                            {isSubmitting ? 'Linking...' : 'Create Link'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RelationshipInput;
