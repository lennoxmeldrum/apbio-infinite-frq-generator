import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { GeneratedFRQ, AssessmentResult } from '../types';
import { getSubUnitsString } from '../services/pdfService';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface PrintableContentProps {
  frq: GeneratedFRQ;
  result: AssessmentResult | null;
  chatMessages: ChatMessage[];
  includeSubmissionFeedback: boolean;
  includeChatHistory: boolean;
}

const PrintableContent: React.FC<PrintableContentProps> = ({
  frq,
  result,
  chatMessages,
  includeSubmissionFeedback,
  includeChatHistory,
}) => {
  const { frqTypeShort, selectedSubTopics, actualSubTopics } = frq.metadata;
  const subUnitsText = getSubUnitsString(selectedSubTopics, actualSubTopics);

  return (
    <div style={{
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      fontSize: '11pt',
      lineHeight: '1.6',
      color: '#1f2937',
      padding: '20px',
      maxWidth: '8.5in',
      margin: '0 auto',
      backgroundColor: 'white',
    }}>
      {/* Load KaTeX CSS for math rendering */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
        crossOrigin="anonymous"
      />
      {/* Inline styles for markdown content */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .markdown-content p { margin-bottom: 1em; margin-top: 0; }
          .markdown-content ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
          .markdown-content ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
          .markdown-content li { margin-bottom: 0.5em; }
          .markdown-content strong { font-weight: 600; }
          .markdown-content em { font-style: italic; }
          .markdown-content code { background-color: #f3f4f6; padding: 0.2em 0.4em; border-radius: 0.25rem; font-family: monospace; font-size: 0.9em; }
          .markdown-content pre { background-color: #f3f4f6; padding: 1em; border-radius: 0.5rem; overflow-x: auto; margin-bottom: 1em; }
          .markdown-content table { width: 100%; border-collapse: collapse; margin-bottom: 1em; margin-top: 1em; }
          .markdown-content th, .markdown-content td { border: 1px solid #d1d5db; padding: 0.5rem; text-align: left; }
          .markdown-content th { background-color: #f9fafb; font-weight: 600; }
          .markdown-content h1, .markdown-content h2, .markdown-content h3 { margin-top: 1em; margin-bottom: 0.5em; font-weight: 600; }
          .katex-display { margin: 1em 0; overflow-x: auto; overflow-y: hidden; }
          .katex { 
            font-size: 1.1em; 
            
            /* This moves the entire math element UP relative to the text baseline */
            position: relative !important;
            top: -3px !important; /* Adjust this number (e.g., -2px or -4px) to tune alignment */
          }
          
          .katex, .katex * { font-family: 'KaTeX_Main', 'KaTeX_Math', 'Times New Roman', serif !important; }

          /* Add bottom padding to all PDF sections to prevent equation cut-off */
          [data-pdf-section] { padding-bottom: 40px !important; }

          /* ROBUST FRACTION FIX
             Instead of using borders, we use background color and specific height.
             This forces html2canvas to render a solid block rather than a hairline border.
          */
          .katex .frac-line {
            border: none !important;
            border-bottom: none !important;
            background-color: black !important;
            height: 1.2px !important;
            min-height: 1.2px !important;
            opacity: 1 !important;
            display: block !important;
            
            /* 2. POSITIONING: 'relative' moves the visual line WITHOUT moving the math around it */
            position: relative !important;
            top: 1px !important; /* Move it down 1px to fix "too high" look */
          }

          /* Adjust vertical alignment of numerator/denominator to prevent overlap */
          .katex .mfrac .vlist-t2 {
            margin-top: 0.1em !important;
          }

            /* 2. SQUARE ROOT FIX: Match the fraction line style */
          .katex .sqrt .sqrt-line {
            background-color: black !important;
            height: 1.2px !important; /* Thick enough to see */
            border: none !important;
            
            /* Push the line DOWN so it connects with the symbol */
            position: relative !important;
            top: 1px !important;
          }
        `
      }} />

      {/* Question Section */}
      <div data-pdf-section="question" style={{ marginBottom: '32px' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '18pt', fontWeight: 'bold', margin: '0 0 8px 0', color: '#111827' }}>
          AP Physics C: Mechanics FRQ - {frqTypeShort}
        </h1>
        <p style={{ fontSize: '11pt', margin: '0', color: '#6b7280' }}>
          Topics: {subUnitsText}
        </p>
      </div>
        
        <h2 style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '16px', color: '#111827', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
          Question
        </h2>
        <div className="markdown-content" style={{ fontSize: '11pt', lineHeight: '1.7' }}>
          <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
            {frq.questionText}
          </ReactMarkdown>
        </div>

        {/* Question images */}
        {frq.images && frq.images.length > 0 && (
          <div style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            {frq.images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`Figure ${idx + 1}`}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  maxHeight: '400px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  padding: '8px',
                  backgroundColor: 'white',
                }}
              />
            ))}
          </div>
        )}

        {/* Question parts */}
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {frq.parts.map((part, idx) => (
            <div
              key={idx}
              style={{
                borderLeft: '4px solid #4f46e5',
                paddingLeft: '16px',
                paddingTop: '8px',
                paddingBottom: '8px',
                backgroundColor: '#eef2ff',
                borderRadius: '0 4px 4px 0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '12pt', color: '#312e81' }}>
                  {part.label}
                </span>
                <span style={{ fontSize: '10pt', color: '#6b7280', backgroundColor: 'white', padding: '2px 8px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                  [{part.points} points]
                </span>
              </div>
              <div className="markdown-content" style={{ fontSize: '11pt', lineHeight: '1.7' }}>
                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                  {part.text}
                </ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scoring Guide Text Section */}
      <div data-pdf-section="scoring-guide" style={{ pageBreakBefore: 'always', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '16px', color: '#111827', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
          Official Scoring Guide
        </h2>
        <div className="markdown-content" style={{ fontSize: '11pt', lineHeight: '1.7' }}>
          <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
            {frq.scoringGuide}
          </ReactMarkdown>
        </div>
      </div>

      {/* Scoring Guide Images Section - NEW: Now on a separate page */}
      {frq.scoringGuideImages && frq.scoringGuideImages.length > 0 && (
        <div data-pdf-section="scoring-guide-images" style={{ pageBreakBefore: 'always', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '16px', color: '#111827', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
            Scoring Guide Diagrams
          </h2>
          {/* Changed to Flexbox column centering to avoid inline-block clipping issues */}
          <div style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
            {frq.scoringGuideImages.map((img, idx) => (
              <div key={idx} style={{ width: '100%', pageBreakInside: 'avoid', display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  maxWidth: '100%'
                }}>
                  <img
                    src={img}
                    alt={`Scoring guide figure ${idx + 1}`}
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      maxHeight: '500px',
                      display: 'block'
                    }}
                  />
                  <p style={{ fontSize: '10pt', color: '#6b7280', margin: '8px 0 0 0', fontWeight: 500 }}>
                    Figure {idx + 1}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Feedback Section */}
      {includeSubmissionFeedback && result && (
        <div data-pdf-section="feedback" style={{ pageBreakBefore: 'always', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '16px', color: '#111827', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
            Student Score & Feedback
          </h2>

          <div style={{ fontSize: '16pt', fontWeight: 'bold', marginBottom: '16px', color: '#4f46e5' }}>
            Score: {result.score} / {result.maxScore}
          </div>

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '12px', color: '#111827' }}>
            Feedback Summary:
          </h3>
          <div className="markdown-content" style={{ fontSize: '11pt', lineHeight: '1.7', marginBottom: '20px' }}>
            <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
              {result.feedback}
            </ReactMarkdown>
          </div>

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '12px', color: '#111827' }}>
            Detailed Breakdown:
          </h3>
          <div className="markdown-content" style={{ fontSize: '11pt', lineHeight: '1.7' }}>
            <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
              {result.breakdown}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Chat History Section */}
      {includeChatHistory && chatMessages.length > 0 && (
        <div data-pdf-section="chat" style={{ pageBreakBefore: 'always', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '16px', color: '#111827', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
            Tutor Conversation
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {chatMessages.map((msg, idx) => (
              <div key={idx} style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: msg.role === 'user' ? '#059669' : '#4f46e5' }}>
                  {msg.role === 'user' ? 'Student:' : 'Tutor:'}
                </div>
                <div className="markdown-content" style={{ fontSize: '11pt', lineHeight: '1.7', marginLeft: '16px' }}>
                  <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintableContent;
