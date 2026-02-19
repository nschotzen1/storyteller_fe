import React, { useState, useEffect, useCallback } from 'react';

const MIN_CHARS = 10;
const VALIDATION_DEBOUNCE_MS = 500;

const RelationshipInput = ({
    sourceName,
    targetName,
    sourceImage,
    targetImage,
    onCancel,
    onSubmit,
    onValidate,
    styles = {}
}) => {
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [quality, setQuality] = useState(null);
    const [validationMsg, setValidationMsg] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [shakeError, setShakeError] = useState(false);

    const charCount = text.length;
    const isValid = charCount >= 3;
    const charProgress = Math.min((charCount / MIN_CHARS) * 100, 100);

    // Debounced validation
    useEffect(() => {
        if (!text || text.length < 3) {
            setQuality(null);
            setValidationMsg('');
            setSuggestions([]);
            return;
        }

        setIsValidating(true);
        const timer = setTimeout(async () => {
            if (onValidate) {
                try {
                    const result = await onValidate(text);
                    if (result && result.quality) {
                        setQuality({
                            score: result.quality.score,
                            verdict: result.verdict
                        });
                        setValidationMsg(result.message || '');
                        setSuggestions(result.suggestions || []);
                    }
                } catch (err) {
                    console.error('Validation error:', err);
                }
            }
            setIsValidating(false);
        }, VALIDATION_DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            setIsValidating(false);
        };
    }, [text, onValidate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isValid || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onSubmit(text);
        } catch (err) {
            setShakeError(true);
            setTimeout(() => setShakeError(false), 500);
            setIsSubmitting(false);
        }
    };

    const handleSuggestionClick = (suggestionText) => {
        setText(suggestionText);
    };

    const getCharCountColor = () => {
        if (charCount >= MIN_CHARS) return '#22c55e';
        if (charCount >= MIN_CHARS * 0.6) return '#eab308';
        return 'rgba(226, 214, 191, 0.5)';
    };

    const getQualityIcon = () => {
        if (!quality) return null;
        if (quality.verdict === 'accepted') return '✓';
        return '⚠';
    };

    return (
        <div className="relationshipModalBackdrop">
            <div className={`relationshipModal ${shakeError ? 'shake' : ''}`} style={styles}>
                {/* Header with animated connection */}
                <div className="relationshipHeader">
                    <h3>Create Connection</h3>
                    <p className="relationshipSubtitle">Forge a link in the tapestry</p>
                </div>

                {/* Visual connection between cards */}
                <div className="relationshipCardFlow">
                    <div className="relationshipCardPreview source">
                        {sourceImage ? (
                            <img src={sourceImage} alt={sourceName} />
                        ) : (
                            <span className="cardInitial">{sourceName?.[0] || 'S'}</span>
                        )}
                        <span className="cardLabel">{sourceName}</span>
                    </div>

                    <div className="connectionLine">
                        <svg className="connectionSvg" viewBox="0 0 120 40" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#c59a55" />
                                    <stop offset="50%" stopColor="#22c55e" />
                                    <stop offset="100%" stopColor="#22c55e" />
                                </linearGradient>
                            </defs>
                            <path
                                className="connectionPath"
                                d="M 10,20 Q 60,5 110,20"
                                stroke="url(#connectionGradient)"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                            />
                            <polygon
                                className="connectionArrow"
                                points="105,20 115,20 110,15"
                                fill="#22c55e"
                            />
                        </svg>
                        {isValidating && <div className="connectionPulse" />}
                    </div>

                    <div className="relationshipCardPreview target">
                        {targetImage ? (
                            <img src={targetImage} alt={targetName} />
                        ) : (
                            <span className="cardInitial">{targetName?.[0] || 'T'}</span>
                        )}
                        <span className="cardLabel">{targetName}</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <label className="relationshipInputLabel">
                        <span>How are they related?</span>
                        <div className="inputWrapper">
                            <input
                                autoFocus
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="e.g. hunts beneath the stars, emanates from..."
                                disabled={isSubmitting}
                                className={quality?.verdict === 'rejected' ? 'rejected' : ''}
                            />
                            {isValidating && <div className="inputShimmer" />}
                        </div>
                        <div className="inputMeta">
                            <span
                                className="charCounter"
                                style={{ color: getCharCountColor() }}
                            >
                                {charCount}/{MIN_CHARS}
                                {charCount >= MIN_CHARS && ' ✓'}
                            </span>
                            <div className="charProgress">
                                <div
                                    className="charProgressBar"
                                    style={{
                                        width: `${charProgress}%`,
                                        backgroundColor: getCharCountColor()
                                    }}
                                />
                            </div>
                        </div>
                    </label>

                    {/* Quality Indicator */}
                    {quality && (
                        <div className={`qualityIndicator ${quality.verdict}`}>
                            <span className="qualityIcon">{getQualityIcon()}</span>
                            <span className="qualityText">
                                {quality.verdict === 'accepted'
                                    ? 'Strong connection'
                                    : 'Needs more depth'}
                            </span>
                            <span className="qualityScore">
                                ({Math.round(quality.score * 100)}%)
                            </span>
                        </div>
                    )}

                    {/* Suggestions for rejected relationships */}
                    {quality?.verdict === 'rejected' && suggestions.length > 0 && (
                        <div className="suggestionChips">
                            <span className="suggestLabel">Try:</span>
                            {suggestions.slice(0, 3).map((s, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className="suggestionChip"
                                    onClick={() => handleSuggestionClick(s.surfaceText)}
                                >
                                    {s.surfaceText}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="modalActions">
                        <button
                            type="button"
                            className="ghost"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="primary glow"
                            disabled={!isValid || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="spinner" />
                                    Forging...
                                </>
                            ) : (
                                'Create Link'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RelationshipInput;
