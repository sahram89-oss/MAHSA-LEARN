import React, { useState, useEffect } from 'react';
import { Course, Slide } from '../types';
import Button from './Button';
import { X, CheckCircle, AlertCircle, Play, ChevronRight, RotateCcw, Loader2, RefreshCw } from 'lucide-react';

interface CoursePlayerProps {
  course: Course;
  onClose: () => void;
  onComplete: (courseId: string, xp: number) => void;
  onQuizAttempt?: (courseId: string, slideId: string, question: string, answer: string, isCorrect: boolean) => void;
}

const XP_PER_SLIDE = 50;

const CoursePlayer: React.FC<CoursePlayerProps> = ({ course, onClose, onComplete, onQuizAttempt }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoKey, setVideoKey] = useState(0); 
  
  const [failedSlides, setFailedSlides] = useState<Set<string>>(new Set());
  const [sessionXp, setSessionXp] = useState(0);

  const slide = course.slides[currentSlideIndex];
  const progress = ((currentSlideIndex + 1) / course.slides.length) * 100;
  const isLastSlide = currentSlideIndex === course.slides.length - 1;

  useEffect(() => {
    if (slide.type === 'video') {
      setIsVideoLoading(true);
    }
  }, [currentSlideIndex, slide.type]);

  const calculateSlideXp = (s: Slide) => {
    if (s.type === 'quiz' && failedSlides.has(s.id)) return 0;
    return XP_PER_SLIDE;
  };

  const handleNext = () => {
    const earnedForThisSlide = calculateSlideXp(slide);
    const newTotalXp = sessionXp + earnedForThisSlide;

    if (isLastSlide) {
      onComplete(course.id, newTotalXp);
    } else {
      setSessionXp(newTotalXp);
      setCurrentSlideIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerChecked(false);
      setIsCorrect(false);
    }
  };

  const handleRetry = () => {
    setIsAnswerChecked(false);
    setSelectedOption(null);
    setIsCorrect(false);
  };

  const reloadVideo = () => {
    setIsVideoLoading(true);
    setVideoKey(prev => prev + 1);
  };

  const handleQuizSubmit = () => {
    if (selectedOption === null || !slide.quizData) return;
    const correct = selectedOption === slide.quizData.correctIndex;
    setIsCorrect(correct);
    setIsAnswerChecked(true);
    if (!correct) setFailedSlides(prev => new Set(prev).add(slide.id));
    if (onQuizAttempt) {
      onQuizAttempt(course.id, slide.id, slide.quizData.question, slide.quizData.options[selectedOption], correct);
    }
  };

  const renderContent = () => {
    switch (slide.type) {
      case 'intro':
      case 'summary':
        return (
          <div className="flex flex-col items-center text-center p-4">
             {slide.image && <img src={slide.image} alt={slide.title} className="w-full h-56 object-cover rounded-2xl shadow-md mb-6"/>}
             <h2 className="text-2xl font-bold text-mahsa-navy mb-4">{slide.title}</h2>
             <p className="text-lg text-slate-600 leading-relaxed">{slide.content}</p>
          </div>
        );
      case 'video':
        return (
          <div className="flex flex-col items-center w-full">
            <div className="flex justify-between items-center w-full px-4 mb-4">
               <h2 className="text-xl font-bold text-mahsa-navy">{slide.title}</h2>
               <button onClick={reloadVideo} className="p-2 text-slate-400 hover:text-mahsa-teal transition-colors" title="Reload Video">
                 <RefreshCw size={18} className={isVideoLoading ? 'animate-spin' : ''} />
               </button>
            </div>
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg relative">
              {isVideoLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10 text-white">
                  <Loader2 className="animate-spin text-mahsa-teal mb-2" size={32} />
                  <span className="text-xs text-slate-400">Loading Video...</span>
                </div>
              )}
              <iframe 
                key={videoKey}
                src={slide.content} 
                title={slide.title}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowFullScreen
                onLoad={() => setIsVideoLoading(false)}
              ></iframe>
            </div>
            <p className="mt-6 px-4 text-slate-600 text-center text-sm">Watch carefully to proceed. If issues persist, try reloading.</p>
          </div>
        );
      case 'quiz':
        const isFailed = failedSlides.has(slide.id);
        return (
          <div className="flex flex-col w-full px-2">
             <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold text-mahsa-navy">{slide.quizData?.question}</h2>
                <div className={`${isFailed ? 'bg-slate-100 text-slate-500' : 'bg-orange-100 text-orange-600'} px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ml-2 transition-colors`}>
                  {isFailed ? '0 XP (Retry)' : `${XP_PER_SLIDE} XP`}
                </div>
             </div>
             <div className="space-y-3">
               {slide.quizData?.options.map((option, idx) => {
                 let btnClass = "w-full p-4 text-left rounded-xl border-2 transition-all font-medium flex justify-between items-center ";
                 if (isAnswerChecked) {
                   if (idx === slide.quizData?.correctIndex) btnClass += "border-green-500 bg-green-50 text-green-700";
                   else if (idx === selectedOption) btnClass += "border-red-500 bg-red-50 text-red-700";
                   else btnClass += "border-transparent bg-slate-50 text-slate-400";
                 } else {
                    if (selectedOption === idx) btnClass += "border-mahsa-teal bg-cyan-50 text-mahsa-navy shadow-sm";
                    else btnClass += "border-slate-100 bg-white hover:border-blue-200 text-slate-700 hover:bg-slate-50";
                 }
                 return (
                   <button key={idx} onClick={() => !isAnswerChecked && setSelectedOption(idx)} className={btnClass} disabled={isAnswerChecked}>
                     <span>{option}</span>
                     {isAnswerChecked && idx === slide.quizData?.correctIndex && <CheckCircle size={20} className="text-green-500" />}
                     {isAnswerChecked && idx === selectedOption && idx !== slide.quizData?.correctIndex && <AlertCircle size={20} className="text-red-500" />}
                   </button>
                 );
               })}
             </div>
             {isAnswerChecked && (
               <div className={`mt-6 p-4 rounded-xl border ${isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'} flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                 <div className="mt-0.5">{isCorrect ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}</div>
                 <div>
                    <p className="font-bold text-sm">{isCorrect ? "Correct!" : "Incorrect"}</p>
                    <p className="text-sm opacity-90">{isCorrect ? (isFailed ? "Good job fixing it." : "Great job! Earned 50 XP.") : "Try again to proceed."}</p>
                 </div>
               </div>
             )}
          </div>
        );
      default: return null;
    }
  };

  const showQuizCheckBtn = slide.type === 'quiz' && !isAnswerChecked;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col max-w-[450px] mx-auto animate-in slide-in-from-bottom duration-300">
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 bg-white">
        <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-500"><X size={24} /></button>
        <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-mahsa-teal transition-all duration-500" style={{ width: `${progress}%` }}/>
        </div>
        <span className="text-xs font-semibold text-slate-400 w-8 text-right">{currentSlideIndex + 1}/{course.slides.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-6 flex flex-col">{renderContent()}</div>
      <div className="p-6 border-t border-slate-100 bg-white">
        {showQuizCheckBtn ? (
           <Button fullWidth onClick={handleQuizSubmit} disabled={selectedOption === null} variant="secondary">Check Answer</Button>
        ) : (
           <div className="w-full">
             {slide.type === 'quiz' && !isCorrect ? (
                <Button fullWidth onClick={handleRetry} variant="outline" className="flex items-center justify-center gap-2"><RotateCcw size={18} /> Try Again</Button>
             ) : (
                <Button fullWidth onClick={handleNext} variant={isLastSlide ? "secondary" : "primary"} className="flex items-center justify-center gap-2">
                  {isLastSlide ? "Finish Module" : "Continue"}
                  {!isLastSlide && <ChevronRight size={20} />}
                </Button>
             )}
           </div>
        )}
      </div>
    </div>
  );
};

export default CoursePlayer;