
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { AssessmentResult, GeneratedFRQ } from '../types';
import { chatWithTutor } from '../services/geminiService';
import { downloadPDF, getSubUnitsString } from '../services/pdfService';

interface Props {
  frq: GeneratedFRQ;
  result: AssessmentResult | null; // Null if user just requested solution
  onBack: () => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

type ViewMode = 'RESULTS' | 'QUESTION';

const ResultsView: React.FC<Props> = ({ frq, result, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('RESULTS');
  const [isPDFGenerating, setIsPDFGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Handle PDF download
  const handleDownloadPDF = async () => {
    setIsPDFGenerating(true);
    try {
      await downloadPDF(frq, result, messages);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsPDFGenerating(false);
    }
  };

  // Auto-scroll chat messages to bottom - use direct scrollTop to avoid viewport issues
  useEffect(() => {
    if (messages.length > 0 && chatContainerRef.current) {
      // Scroll the chat container to bottom without affecting the main content panel
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Scroll content panel to top when view mode changes or component mounts
  // Using requestAnimationFrame and longer delay to wait for KaTeX rendering
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Immediate scroll to top
    container.scrollTop = 0;

    // Force reflow to ensure scroll takes effect
    void container.offsetHeight;

    // Wait for layout and KaTeX to finish rendering, then scroll again
    const scrollToTop = () => {
      if (container) {
        container.scrollTop = 0;
        // Force another reflow
        void container.offsetHeight;
      }
    };

    // Use multiple requestAnimationFrame calls to wait for all rendering
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(scrollToTop, 300);
      });
    });
  }, [viewMode, result]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    try {
        const response = await chatWithTutor(messages, userMsg, { frq, result });
        setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (e) {
        setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
        setIsChatLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 h-full flex flex-col md:flex-row gap-6 overflow-hidden">
      {/* Left Panel: Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white rounded-xl shadow-lg border border-gray-100">
        {/* FRQ Type and Sub-Units Header */}
        <div className="px-4 pt-4 pb-2 bg-indigo-50 border-b border-indigo-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="text-lg font-bold text-indigo-900">
                AP Physics C: Mechanics FRQ - {frq.metadata.frqTypeShort}
              </h2>
              <p className="text-sm text-indigo-700">
                Topics: {getSubUnitsString(frq.metadata.selectedSubTopics, frq.metadata.actualSubTopics)}
              </p>
            </div>
            <button
              onClick={handleDownloadPDF}
              disabled={isPDFGenerating}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm text-sm font-medium"
            >
              {isPDFGenerating ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50 gap-4">
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
                onClick={() => setViewMode('RESULTS')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'RESULTS'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
                {result ? "Results & Scoring" : "Scoring Guide"}
            </button>
            <button
                onClick={() => setViewMode('QUESTION')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'QUESTION'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
                Original Question
            </button>
          </div>
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-indigo-600 font-medium">
            Start New Question
          </button>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-8" style={{ scrollBehavior: 'auto' }}>
          {viewMode === 'RESULTS' ? (
            <>
              {/* Score Summary (if graded) */}
              {result && (
                <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100 text-center animate-fade-in">
                  <div className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-1">Your Score</div>
                  <div className="text-5xl font-bold text-indigo-900 mb-2">
                    {result.score} <span className="text-2xl text-indigo-400">/ {result.maxScore}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                    <div 
                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${(result.score / result.maxScore) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-left bg-white p-4 rounded border border-indigo-100 mt-4">
                    <h4 className="font-bold text-indigo-900 mb-2">Feedback Summary</h4>
                    <div className="markdown-content text-gray-700">
                        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                            {result.feedback}
                        </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

              {/* Official Scoring Guide */}
              <div className="animate-fade-in">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center border-b pb-2">
                    <span className="mr-2">📋</span> Official Scoring Guide
                </h3>
                <div className="markdown-content text-gray-700 bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-6">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                        {frq.scoringGuide}
                    </ReactMarkdown>

                    {/* Scoring Guide Images (graphs, tables, FBDs) */}
                    {frq.scoringGuideImages && frq.scoringGuideImages.length > 0 && (
                        <div className="flex flex-wrap gap-4 justify-center py-4 bg-white rounded-lg border border-gray-300 border-dashed mt-6">
                            {frq.scoringGuideImages.map((img, idx) => (
                                <div key={idx} className="flex flex-col items-center">
                                    <img
                                        src={img}
                                        alt={`Scoring Guide Figure ${idx + 1}`}
                                        className="max-w-full h-auto max-h-96 object-contain border border-gray-300 rounded shadow-sm bg-white"
                                    />
                                    <span className="text-xs text-gray-600 mt-2 font-medium">Figure {idx + 1}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
              </div>

              {/* Point Breakdown (if graded) */}
              {result && (
                <div className="animate-fade-in">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center border-b pb-2">
                        <span className="mr-2">🔍</span> Detailed Breakdown
                    </h3>
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                        <div className="markdown-content text-gray-700">
                            <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                                {result.breakdown}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
              )}
            </>
          ) : (
            /* Question View Mode */
            <div className="animate-fade-in space-y-8">
                <div className="prose max-w-none text-gray-800">
                    <h3 className="text-xl font-bold mb-4 text-gray-900 border-b pb-2">Problem</h3>
                    <div className="markdown-content text-lg leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                            {frq.questionText}
                        </ReactMarkdown>
                    </div>
                </div>

                {frq.images && frq.images.length > 0 && (
                    <div className="flex flex-wrap gap-4 justify-center py-6 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                        {frq.images.map((img, idx) => (
                            <img key={idx} src={img} alt={`Figure ${idx + 1}`} className="max-w-full h-auto max-h-80 object-contain border border-gray-200 rounded shadow-sm bg-white" />
                        ))}
                    </div>
                )}

                <div className="space-y-6">
                    {frq.parts.map((part, idx) => (
                        <div key={idx} className="border-l-4 border-indigo-500 pl-6 py-2 bg-indigo-50/30 rounded-r-lg">
                            <div className="flex items-baseline justify-between mb-2">
                                <span className="font-bold text-lg text-indigo-900 mr-2">{part.label}</span>
                                <span className="text-sm text-gray-500 font-medium bg-white px-2 py-0.5 rounded border border-gray-200">[{part.points} points]</span>
                            </div>
                            <div className="markdown-content text-gray-800">
                                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                                    {part.text}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Chatbot */}
      <div className="w-full md:w-1/3 flex flex-col h-full bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-4 border-b border-gray-100 bg-indigo-600 rounded-t-xl shadow-sm">
            <h3 className="text-white font-semibold flex items-center">
                <span className="mr-2 text-xl">🤖</span> Physics Tutor
            </h3>
            <p className="text-indigo-100 text-xs mt-1">Ask about the concepts, solution, or your specific grade.</p>
        </div>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" style={{ scrollBehavior: 'smooth' }}>
            {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-4">
                    <span className="text-4xl mb-2">👋</span>
                    <p>Hi! I'm your physics tutor.</p>
                    <p className="text-sm mt-2">I can explain the solution, clarify physics concepts, or help you understand where you missed points.</p>
                </div>
            )}
            {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-lg text-sm markdown-content ${
                        msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-br-none' 
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                    }`}>
                        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                            {msg.text}
                        </ReactMarkdown>
                    </div>
                </div>
            ))}
            {isChatLoading && (
                <div className="flex justify-start">
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm rounded-bl-none">
                        <div className="flex space-x-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-100 rounded-b-xl">
            <div className="flex space-x-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a question..."
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-gray-50 focus:bg-white transition-colors"
                />
                <button 
                    onClick={handleSendMessage}
                    disabled={isChatLoading || !input.trim()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm font-medium"
                >
                    Send
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;
