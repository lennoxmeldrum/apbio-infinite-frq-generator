import React, { useState } from 'react';
import { Unit, FRQType, GeneratedFRQ, AssessmentResult, AppState } from './types';
import { generateFRQ, gradeSubmission } from './services/geminiService';
import { uploadFRQToStorage } from './services/storageService';
import { saveFRQToFirestore } from './services/firestoreService';
import SelectionScreen from './components/SelectionScreen';
import QuestionView from './components/QuestionView';
import ResultsView from './components/ResultsView';
import Loading from './components/Loading';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('SELECTION');
  const [currentFRQ, setCurrentFRQ] = useState<GeneratedFRQ | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("");

  const handleGenerate = async (type: FRQType, selectedUnits: Unit[], selectedSubTopics: string[]) => {
    setAppState('GENERATING');
    setLoadingMsg("Generating a unique AP Biology FRQ based on College Board standards...");
    try {
      const { frq, usage, totalCostUsd, pricingVersion } = await generateFRQ(type, selectedUnits, selectedSubTopics);
      setCurrentFRQ(frq);
      setAppState('QUESTION');

      // Persist to Firebase in the background (non-blocking). Cost
      // metadata rides along with the other fields and surfaces in
      // the ap-frq-access archive once saved.
      const persistFRQ = async () => {
        const storagePath = await uploadFRQToStorage(frq);
        await saveFRQToFirestore(frq, {
          storagePath: storagePath ?? undefined,
          usage,
          totalCostUsd,
          pricingVersion,
        });
      };

      persistFRQ().catch(err => {
        console.warn('Background persistence failed:', err);
      });
    } catch (error) {
      alert("Failed to generate question. Please try again.");
      setAppState('SELECTION');
    }
  };

  const handleSubmit = async (file: File | null) => {
    if (!currentFRQ) return;
    
    setAppState('GRADING');
    setLoadingMsg("Analyzing your response against the scoring guide...");
    
    try {
      let imageBase64: string = "";
      
      if (file) {
        imageBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // remove data url prefix for API
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.readAsDataURL(file);
        });
      }

      // Default to jpeg if type not found, though browser usually provides it.
      // For Gemini, application/pdf is valid for PDF files.
      const mimeType = file?.type || "image/jpeg";

      const gradeResult = await gradeSubmission(currentFRQ, imageBase64, mimeType);
      setResult(gradeResult);
      setAppState('RESULTS');
    } catch (error) {
      console.error(error);
      alert("Failed to grade submission. Please try again.");
      setAppState('QUESTION');
    }
  };

  const handleShowSolution = () => {
    setResult(null); // No student result, just showing solution
    setAppState('RESULTS');
  };

  const handleBack = () => {
    setAppState('SELECTION');
    setCurrentFRQ(null);
    setResult(null);
  };

  // SelectionScreen grows with its content and uses the browser scrollbar.
  // QuestionView / ResultsView / Loading are locked to the viewport so their
  // internal panels (chat, results pane, question parts) handle their own scroll.
  const isFixedViewport = appState !== 'SELECTION';

  return (
    <div className={`${isFixedViewport ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-gray-50`}>
      {appState === 'SELECTION' && <SelectionScreen onGenerate={handleGenerate} />}
      {(appState === 'GENERATING' || appState === 'GRADING') && <Loading message={loadingMsg} />}
      {appState === 'QUESTION' && currentFRQ && (
        <QuestionView 
          frq={currentFRQ} 
          onSubmit={handleSubmit} 
          onShowSolution={handleShowSolution}
          onBack={handleBack}
        />
      )}
      {appState === 'RESULTS' && currentFRQ && (
        <ResultsView 
          frq={currentFRQ} 
          result={result} 
          onBack={handleBack} 
        />
      )}
    </div>
  );
};

export default App;