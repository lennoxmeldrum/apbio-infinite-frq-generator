
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { GeneratedFRQ } from '../types';

interface Props {
  frq: GeneratedFRQ;
  onSubmit: (file: File) => void;
  onShowSolution: () => void;
  onBack: () => void;
}

const QuestionView: React.FC<Props> = ({ frq, onSubmit, onShowSolution, onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!file) {
        alert("Please upload a file (Image or PDF) of your work.");
        return;
    }
    setIsSubmitting(true);
    onSubmit(file);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="text-gray-500 hover:text-indigo-600 flex items-center transition-colors">
          ← Start Over
        </button>
        <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
          Total Points: {frq.maxPoints}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto mb-6 pr-2">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 space-y-8">
          {/* Main Scenario */}
          <div className="prose max-w-none text-gray-800">
            <h3 className="text-xl font-bold mb-4 text-gray-900 border-b pb-2">Problem</h3>
            <div className="markdown-content text-lg leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                    {frq.questionText}
                </ReactMarkdown>
            </div>
          </div>

          {/* Images */}
          {frq.images && frq.images.length > 0 && (
            <div className="flex flex-wrap gap-4 justify-center py-6 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
              {frq.images.map((img, idx) => (
                <img key={idx} src={img} alt={`Figure ${idx + 1}`} className="max-w-full h-auto max-h-80 object-contain border border-gray-200 rounded shadow-sm bg-white" />
              ))}
            </div>
          )}

          {/* Question Parts */}
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
      </div>

      {/* Submission Area */}
      <div className="bg-white p-6 rounded-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-gray-100 mt-auto">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <span className="bg-indigo-600 w-2 h-6 mr-2 rounded-full"></span>
            Submit Your Response
        </h3>
        
        <div className="flex flex-col space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Work (Image or PDF)</label>
                <div className="flex items-center space-x-2">
                    <label className="cursor-pointer bg-gray-50 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-100 hover:border-gray-400 transition w-full text-center flex items-center justify-center border-dashed border-2">
                        <span className="mr-2 text-xl">📄</span>
                        <span className="font-medium">{file ? file.name : "Choose File (JPG, PNG, PDF)"}</span>
                        <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                    </label>
                    {file && <button onClick={() => setFile(null)} className="text-red-500 text-sm hover:underline px-2">Remove</button>}
                </div>
                <p className="text-xs text-gray-500 mt-2 pl-1">
                    Please upload a clear picture or scan of your handwritten solution. PDF files are also supported.
                </p>
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition shadow disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                    {isSubmitting ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyzing Response...
                        </>
                    ) : "Submit for Grading"}
                </button>
                <button
                    onClick={onShowSolution}
                    className="flex-1 bg-white text-indigo-600 border border-indigo-600 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition"
                >
                    Show Solution Only
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionView;
