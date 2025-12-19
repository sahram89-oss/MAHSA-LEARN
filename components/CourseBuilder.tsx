import React, { useState } from 'react';
import { Slide, Course, SlideType } from '../types';
import Button from './Button';
import Input from './Input';
import CoursePlayer from './CoursePlayer';
import { Plus, Trash2, Save, X, ChevronLeft, Image, Video, HelpCircle, FileText, CheckCircle2, Pencil, GripVertical, Eye, ChevronDown, LayoutTemplate, Code } from 'lucide-react';

interface CourseBuilderProps {
  initialCourse?: Course;
  availableCategories: string[];
  onSave: (courseData: Omit<Course, 'id'>) => void;
  onCancel: () => void;
}

type BuilderMode = 'overview' | 'add-slide';

const CourseBuilder: React.FC<CourseBuilderProps> = ({ onSave, onCancel, initialCourse, availableCategories }) => {
  // Course Basic Info
  const [title, setTitle] = useState(initialCourse?.title || '');
  const [category, setCategory] = useState(initialCourse?.category || '');
  const [slides, setSlides] = useState<Slide[]>(initialCourse?.slides || []);
  
  // Logic to determine initial state of category mode
  const [isNewCategoryMode, setIsNewCategoryMode] = useState(() => {
    if (availableCategories.length === 0) return true;
    if (initialCourse?.category && !availableCategories.includes(initialCourse.category)) return true;
    return false;
  });

  // Slide Builder State
  const [mode, setMode] = useState<BuilderMode>('overview');
  const [activeSlideType, setActiveSlideType] = useState<SlideType | null>(null);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  
  // Drag and Drop State
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  
  // Temporary Form State for new Slide
  const [slideTitle, setSlideTitle] = useState('');
  const [slideContent, setSlideContent] = useState('');
  const [slideImage, setSlideImage] = useState('');
  
  // Quiz Specific State
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState<string[]>(['', '']);
  const [quizCorrectIdx, setQuizCorrectIdx] = useState(0);

  // Preview State
  const [isPreviewing, setIsPreviewing] = useState(false);

  const resetSlideForm = () => {
    setSlideTitle('');
    setSlideContent('');
    setSlideImage('');
    setQuizQuestion('');
    setQuizOptions(['', '']);
    setQuizCorrectIdx(0);
    setActiveSlideType(null);
    setEditingSlideId(null);
    setMode('overview');
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '___NEW___') {
        setCategory(''); // Clear for new input
        setIsNewCategoryMode(true);
    } else {
        setCategory(val);
    }
  };

  /**
   * REFINED helper for YouTube Embeds
   * 1. If user pastes full <iframe>, we extract the src and keep it AS IS.
   * 2. This ensures whatever parameters YouTube generated (rel, si, etc) are preserved.
   * 3. Removed 'origin' parameter which causes most 'Configuration Error' (153) issues.
   */
  const getEmbedUrl = (input: string) => {
    if (!input) return '';
    
    let url = input.trim();

    // 1. If user pasted a full iframe code, extract the src attribute and keep it exactly as provided
    if (url.toLowerCase().startsWith('<iframe')) {
      const srcMatch = url.match(/src=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        // We use the URL exactly as YouTube provided it in the embed code
        return srcMatch[1];
      }
    }
    
    // 2. If it's a standard link, convert to a clean embed format
    // Removed all extra parameters like 'origin' and 'enablejsapi' that cause security rejections
    const youtubeRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]{11}).*/;
    const match = url.match(youtubeRegExp);

    if (match && match[2]) {
      const videoId = match[2];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    return url;
  };

  const handleSaveSlide = () => {
    if (!activeSlideType) return;
    
    // Process content based on type
    let finalContent = slideContent;
    if (activeSlideType === 'video') {
       finalContent = getEmbedUrl(slideContent);
    }

    const newSlide: Slide = {
      id: editingSlideId || `s-${Date.now()}`,
      type: activeSlideType,
      title: activeSlideType === 'quiz' ? 'Quiz Challenge' : slideTitle,
      content: finalContent,
      image: slideImage || undefined,
    };

    if (activeSlideType === 'quiz') {
      newSlide.quizData = {
        question: quizQuestion,
        options: quizOptions.filter(o => o.trim() !== ''),
        correctIndex: quizCorrectIdx
      };
      newSlide.title = "Knowledge Check";
    }

    if (editingSlideId) {
      setSlides(slides.map(s => s.id === editingSlideId ? newSlide : s));
    } else {
      setSlides([...slides, newSlide]);
    }
    
    resetSlideForm();
  };

  const handleEditSlide = (slide: Slide) => {
    setEditingSlideId(slide.id);
    setActiveSlideType(slide.type);
    setSlideTitle(slide.title);
    setSlideContent(slide.content || '');
    setSlideImage(slide.image || '');
    if (slide.type === 'quiz' && slide.quizData) {
      setQuizQuestion(slide.quizData.question);
      setQuizOptions([...slide.quizData.options]);
      setQuizCorrectIdx(slide.quizData.correctIndex);
    }
    setMode('add-slide');
  };

  const removeSlide = (id: string) => {
    setSlides(slides.filter(s => s.id !== id));
  };

  const handleSaveCourse = () => {
    if (!title || !category || slides.length === 0) return;
    onSave({
      title,
      category,
      slides,
      durationMinutes: slides.length * 2,
      xpReward: slides.length * 50
    });
  };

  const handlePreview = () => {
    if (!title || !category || slides.length === 0) return; 
    setIsPreviewing(true);
  };

  const getPreviewCourse = (): Course => ({
      id: 'preview-temp',
      title: title || 'Untitled Course',
      category: category || 'Uncategorized',
      slides: slides,
      xpReward: slides.length * 50,
      durationMinutes: slides.length * 2
  });

  const getSlideTypeStyles = (type: SlideType) => {
    switch (type) {
      case 'intro': return { icon: <FileText size={18} />, bg: 'bg-blue-100', text: 'text-blue-600', label: 'Content' };
      case 'video': return { icon: <Video size={18} />, bg: 'bg-purple-100', text: 'text-purple-600', label: 'Video' };
      case 'quiz': return { icon: <HelpCircle size={18} />, bg: 'bg-orange-100', text: 'text-orange-600', label: 'Quiz' };
      case 'summary': return { icon: <LayoutTemplate size={18} />, bg: 'bg-emerald-100', text: 'text-emerald-600', label: 'Summary' };
      default: return { icon: <FileText size={18} />, bg: 'bg-slate-100', text: 'text-slate-600', label: 'Unknown' };
    }
  };

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === dropIndex) return;
    const newSlides = [...slides];
    const [draggedItem] = newSlides.splice(draggedIdx, 1);
    newSlides.splice(dropIndex, 0, draggedItem);
    setSlides(newSlides);
    setDraggedIdx(null);
  };

  const renderSlideTypeSelection = () => (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <button 
        onClick={() => { setActiveSlideType('intro'); setMode('add-slide'); }}
        className="flex flex-col items-center justify-center p-4 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors group"
      >
        <div className="p-2 bg-white rounded-full mb-2 shadow-sm group-hover:scale-110 transition-transform">
           <FileText className="text-blue-600" size={20} />
        </div>
        <span className="text-xs font-bold text-slate-700">Text/Image</span>
      </button>
      <button 
        onClick={() => { setActiveSlideType('video'); setMode('add-slide'); }}
        className="flex flex-col items-center justify-center p-4 bg-purple-50 border border-purple-100 rounded-xl hover:bg-purple-100 transition-colors group"
      >
        <div className="p-2 bg-white rounded-full mb-2 shadow-sm group-hover:scale-110 transition-transform">
          <Video className="text-purple-600" size={20} />
        </div>
        <span className="text-xs font-bold text-slate-700">Video</span>
      </button>
      <button 
        onClick={() => { setActiveSlideType('quiz'); setMode('add-slide'); }}
        className="flex flex-col items-center justify-center p-4 bg-orange-50 border border-orange-100 rounded-xl hover:bg-orange-100 transition-colors group"
      >
        <div className="p-2 bg-white rounded-full mb-2 shadow-sm group-hover:scale-110 transition-transform">
           <HelpCircle className="text-orange-600" size={20} />
        </div>
        <span className="text-xs font-bold text-slate-700">Quiz</span>
      </button>
    </div>
  );

  const renderSlideForm = () => {
    return (
      <div className="animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={resetSlideForm} className="p-2 hover:bg-slate-100 rounded-full">
            <ChevronLeft size={24} className="text-slate-500" />
          </button>
          <h3 className="font-bold text-lg text-slate-800">
            {editingSlideId ? 'Edit Slide' : 'Add New Slide'}
          </h3>
        </div>

        <div className="space-y-4">
          {activeSlideType !== 'quiz' && (
             <Input 
                label="Slide Title" 
                value={slideTitle} 
                onChange={e => setSlideTitle(e.target.value)} 
                placeholder="e.g. Introduction to Protocol"
              />
          )}

          {activeSlideType === 'intro' && (
            <>
               <div className="flex flex-col gap-1 mb-4">
                  <label className="text-sm font-medium text-slate-600 ml-1">Content / Body Text</label>
                  <textarea 
                    className="p-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-mahsa-teal min-h-[120px]"
                    value={slideContent}
                    onChange={e => setSlideContent(e.target.value)}
                    placeholder="Enter the educational content here..."
                  />
               </div>
               <Input 
                label="Image URL (Optional)" 
                value={slideImage} 
                onChange={e => setSlideImage(e.target.value)} 
                placeholder="https://..."
              />
            </>
          )}

          {activeSlideType === 'video' && (
            <div className="space-y-4">
               <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-600 ml-1 flex items-center gap-2">
                    <Code size={14} className="text-mahsa-teal" /> Video URL or Embed Code
                  </label>
                  <textarea 
                    className="p-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-mahsa-teal min-h-[100px] text-sm font-mono"
                    value={slideContent}
                    onChange={e => setSlideContent(e.target.value)}
                    placeholder={`Paste the <iframe ...> code here`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 px-1">
                    Paste the full <b>&lt;iframe&gt;</b> code from YouTube (Share > Embed).
                  </p>
               </div>
            </div>
          )}

          {activeSlideType === 'quiz' && (
            <>
               <div className="flex flex-col gap-1 mb-4">
                  <label className="text-sm font-medium text-slate-600 ml-1">Question</label>
                  <textarea 
                    className="p-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-mahsa-teal min-h-[80px]"
                    value={quizQuestion}
                    onChange={e => setQuizQuestion(e.target.value)}
                    placeholder="Ask a question..."
                  />
               </div>
               
               <div className="space-y-3">
                 <label className="text-sm font-medium text-slate-600 ml-1">Options (Select correct answer)</label>
                 {quizOptions.map((opt, idx) => (
                   <div key={idx} className="flex items-center gap-2">
                     <button 
                       onClick={() => setQuizCorrectIdx(idx)}
                       className={`p-2 rounded-full border-2 ${quizCorrectIdx === idx ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                     >
                       {quizCorrectIdx === idx ? <CheckCircle2 size={16} className="text-green-600"/> : <div className="w-4 h-4" />}
                     </button>
                     <input 
                        className="flex-1 p-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-mahsa-teal"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...quizOptions];
                          newOpts[idx] = e.target.value;
                          setQuizOptions(newOpts);
                        }}
                        placeholder={`Option ${idx + 1}`}
                     />
                     {idx > 1 && (
                       <button onClick={() => setQuizOptions(quizOptions.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                         <Trash2 size={18} />
                       </button>
                     )}
                   </div>
                 ))}
                 {quizOptions.length < 4 && (
                   <button 
                    onClick={() => setQuizOptions([...quizOptions, ''])}
                    className="text-sm text-mahsa-teal font-semibold ml-9"
                   >
                     + Add Option
                   </button>
                 )}
               </div>
            </>
          )}

          <Button fullWidth onClick={handleSaveSlide} className="mt-8">
            {editingSlideId ? 'Update Slide' : 'Add Slide'}
          </Button>
        </div>
      </div>
    );
  };

  if (isPreviewing) {
    return (
      <CoursePlayer 
        course={getPreviewCourse()} 
        onClose={() => setIsPreviewing(false)} 
        onComplete={() => setIsPreviewing(false)} 
      />
    );
  }

  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="bg-white px-4 py-4 border-b border-slate-100 flex justify-between items-center shadow-sm">
        <h2 className="text-lg font-bold text-mahsa-navy">
          {initialCourse ? 'Edit Course' : 'Create New Course'}
        </h2>
        <button onClick={onCancel} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        {mode === 'overview' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Course Details</h3>
              <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Sharp Object Safety" />
              <div className="flex flex-col gap-1 mb-4">
                <label className="text-sm font-medium text-slate-600 ml-1">Category</label>
                {!isNewCategoryMode && availableCategories.length > 0 ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select 
                        value={category} 
                        onChange={handleCategoryChange}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-mahsa-teal"
                      >
                         <option value="" disabled>Select a category</option>
                         {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                         <option value="___NEW___" className="font-bold text-mahsa-teal">+ Create New Category</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input 
                      className="flex-1 p-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-mahsa-teal"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      placeholder="e.g. Infection Control"
                      autoFocus={isNewCategoryMode}
                    />
                    {availableCategories.length > 0 && (
                      <button 
                        onClick={() => setIsNewCategoryMode(false)}
                        className="p-3 text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                        title="Select existing"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Course Content ({slides.length})</h3>
              {slides.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
                  <p className="text-slate-400 text-sm">No slides added yet.</p>
                </div>
              )}
              <div className="space-y-3 mb-6">
                {slides.map((s, i) => {
                  const style = getSlideTypeStyles(s.type);
                  return (
                  <div 
                    key={s.id} 
                    draggable
                    onDragStart={(e) => onDragStart(e, i)}
                    onDragOver={(e) => onDragOver(e, i)}
                    onDrop={(e) => onDrop(e, i)}
                    className={`group bg-white p-3 pr-2 rounded-xl border flex items-center justify-between shadow-sm transition-all hover:shadow-md cursor-move ${draggedIdx === i ? 'opacity-50 border-mahsa-teal border-dashed' : 'border-slate-100'}`}
                  >
                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                      <div className="text-slate-300 cursor-grab px-1"><GripVertical size={20} /></div>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${style.bg} ${style.text}`}>{style.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                           <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">#{i + 1}</span>
                           <span className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}>{style.label}</span>
                        </div>
                        <p className="font-semibold text-slate-800 text-sm truncate pr-2">{s.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 pl-2 border-l border-slate-100">
                      <button onClick={() => handleEditSlide(s)} className="p-2 text-slate-400 hover:text-mahsa-teal hover:bg-cyan-50 rounded-lg transition-colors"><Pencil size={18} /></button>
                      <button onClick={() => removeSlide(s.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </div>
                  );
                })}
              </div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Add New Slide</h3>
              {renderSlideTypeSelection()}
            </div>
          </div>
        ) : (
          renderSlideForm()
        )}
      </div>

      {mode === 'overview' && (
        <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
          <Button variant="outline" className="flex-1 flex items-center justify-center gap-2" onClick={handlePreview} disabled={!title || !category || slides.length === 0}>
             <Eye size={20} /> Preview
          </Button>
          <Button className="flex-[2] flex items-center justify-center gap-2" onClick={handleSaveCourse} disabled={!title || !category || slides.length === 0}>
            <Save size={20} /> {initialCourse ? 'Update' : 'Publish'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CourseBuilder;