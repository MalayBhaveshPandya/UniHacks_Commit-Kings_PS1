import ReactMarkdown from 'react-markdown';

/**
 * Basic markdown formatted text.
 */
export default function FormattedText({ text, className = '' }) {
    if (!text) return null;

    return (
        <div className={className}>
            <ReactMarkdown
                components={{
                    // Override paragraph to not add extra margins if desired, or keep as is
                    p: ({ node, ...props }) => <p style={{ margin: 0, marginBottom: '0.5em', minHeight: '1.2em' }} {...props} />
                }}
            >
                {text}
            </ReactMarkdown>
        </div>
    );
}
