
import React, { useState, useRef, useEffect } from 'react';
import { parsePostWithGemini, parseImageListingWithGemini } from '../services/geminiService';
import { saveNewListing } from '../actions/listings';
import { Sublet, ListingStatus, Language, SubletType, User } from '../types';
import { PlusIcon, WarningIcon, InfoIcon, ExternalLinkIcon, HeartIcon, CameraIcon } from './Icons';
import { translations } from '../translations';
import { CITY_CENTERS } from '../constants';

interface AddListingModalProps {
  onAdd: (sublet: Sublet) => void;
  onClose: () => void;
  language: Language;
  currentUser: User;
}

const AddListingModal: React.FC<AddListingModalProps> = ({ onAdd, onClose, language, currentUser }) => {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [isReviewing, setIsReviewing] = useState(false); // Track if we are in post-extraction review
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedLink, setDetectedLink] = useState(false);
  const [groundingChunks, setGroundingChunks] = useState<any[]>([]);
  
  // Image Scan State
  const scanInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language];

  const emptyManualData = {
    location: '',
    price: '',
    type: SubletType.ENTIRE,
    city: 'Tel Aviv',
    startDate: '',
    endDate: '',
    description: '',
    amenities: [] as string[],
    images: [] as string[]
  };

  const [manualData, setManualData] = useState(emptyManualData);

  useEffect(() => {
    const trimmedText = text.trim();
    if (trimmedText.startsWith('http') && trimmedText.includes('facebook.com')) {
      setDetectedLink(true);
    } else {
      setDetectedLink(false);
    }
  }, [text]);

  const amenitiesOptions = [
    { key: 'wifi', icon: '📶', label: t.features.wifi },
    { key: 'ac', icon: '❄️', label: t.features.ac },
    { key: 'kitchen', icon: '🍳', label: t.features.kitchen },
    { key: 'workspace', icon: '💼', label: t.features.workspace },
    { key: 'petFriendly', icon: '🐾', label: t.features.petFriendly },
  ];

  const handleTabSwitch = (newMode: 'ai' | 'manual') => {
    setMode(newMode);
    if (newMode === 'manual') {
        setIsReviewing(false);
    }
    setError(null);
  };

  // Helper to resize and compress images
  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimension 1000px
          const MAX_DIM = 1000;
          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          // Compress to JPEG 70% quality
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // Process files sequentially to maintain order and prevent memory spikes
    const newImages: string[] = [];
    const filesToProcess = Array.from(files).slice(0, 10 - manualData.images.length) as File[];

    for (const file of filesToProcess) {
      try {
        const compressedBase64 = await processImage(file);
        newImages.push(compressedBase64);
      } catch (err) {
        console.error("Error processing image", err);
      }
    }

    setManualData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
  };

  const handleAutoFill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    setError(null);
    try {
        const base64 = await processImage(file);
        
        // Parse with Gemini
        const parsedData = await parseImageListingWithGemini(base64, 'image/jpeg');
        
        // Add source image to gallery if not present in extracted urls (usually not)
        const currentImages = [...manualData.images, base64];

        setManualData({
            location: parsedData.location || manualData.location,
            price: parsedData.price?.toString() || manualData.price,
            type: parsedData.type || manualData.type,
            city: parsedData.city || manualData.city,
            startDate: parsedData.startDate || manualData.startDate,
            endDate: parsedData.endDate || manualData.endDate,
            description: parsedData.location ? `Scanned from screenshot: ${parsedData.location}` : manualData.description,
            amenities: parsedData.amenities || manualData.amenities,
            images: currentImages
        });
        
        setLoading(false);
    } catch (err) {
        setError("Failed to extract details from the image. Please fill the form manually.");
        setLoading(false);
    }
    // Clear input
    e.target.value = '';
  };

  const populateFormWithParsedData = (parsedData: any, originalSource: string) => {
    setGroundingChunks(parsedData.sources || []);
    
    setManualData({
      location: parsedData.location || '',
      price: parsedData.price?.toString() || '',
      type: parsedData.type || SubletType.ENTIRE,
      city: parsedData.city || 'Tel Aviv',
      startDate: parsedData.startDate || '',
      endDate: parsedData.endDate || '',
      description: originalSource.length > 500 ? originalSource.substring(0, 500) + '...' : originalSource,
      amenities: parsedData.amenities || [],
      images: parsedData.imageUrls || []
    });
    
    setMode('manual');
    setIsReviewing(true); // Enable review mode features
    setLoading(false);
  };

  const handleTextExtract = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    
    try {
      const parsedData = await parsePostWithGemini(text);
      populateFormWithParsedData(parsedData, text);
    } catch (err) {
      setError("Extraction failed. This might be a private post or an invalid link. Try pasting the text manually.");
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!manualData.location || !manualData.price || !manualData.startDate) {
      setError("Please fill in the required fields (Location, Price, Start Date).");
      return;
    }

    setLoading(true);
    const cityCoords = CITY_CENTERS[manualData.city] || CITY_CENTERS['Tel Aviv'];

    const newSublet: Sublet = {
      id: Math.random().toString(36).substr(2, 9),
      sourceUrl: (isReviewing && detectedLink) ? text.trim() : '',
      originalText: manualData.description || `Subletting at ${manualData.location}`,
      price: Number(manualData.price),
      currency: 'NIS',
      startDate: manualData.startDate,
      endDate: manualData.endDate,
      location: manualData.location,
      city: manualData.city,
      neighborhood: manualData.location.split(',')[0],
      lat: cityCoords.lat + (Math.random() - 0.5) * 0.01,
      lng: cityCoords.lng + (Math.random() - 0.5) * 0.01,
      type: manualData.type,
      status: ListingStatus.AVAILABLE,
      createdAt: Date.now(),
      authorName: currentUser.name, // Use real user name
      amenities: manualData.amenities,
      images: manualData.images,
      ownerId: currentUser.id // Use real user ID
    };

    try {
      const result = await saveNewListing(newSublet);
      if (result.success && result.data) {
        onAdd(result.data);
        onClose();
      } else {
        setError(result.error || "Failed to save listing.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const toggleAmenity = (key: string) => {
    setManualData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(key) 
        ? prev.amenities.filter(a => a !== key) 
        : [...prev.amenities, key]
    }));
  };

  const removeImage = (index: number) => {
    setManualData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <form onSubmit={handleFormSubmit} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        <div className="bg-white px-6 pt-6 pb-2 border-b border-slate-50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100">
                <PlusIcon className="w-5 h-5 text-white" />
              </div>
              {isReviewing ? "Review & Verify" : t.addListingTitle}
            </h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 text-2xl leading-none touch-none">&times;</button>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-4">
            <button 
              type="button"
              onClick={() => handleTabSwitch('ai')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all
                ${mode === 'ai' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              {t.importFromFb}
            </button>
            <button 
              type="button"
              onClick={() => handleTabSwitch('manual')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all
                ${mode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              {t.directList}
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {mode === 'ai' && (
            <div className="space-y-6">
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Paste Facebook Link or Post Text
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste URL (e.g., https://facebook.com/groups/...) or full post text"
                  className="w-full h-56 p-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none outline-none text-sm leading-relaxed"
                />
              </div>
              
              <div className="bg-indigo-50/50 p-5 rounded-2xl flex items-start gap-4 border border-indigo-100/50">
                <div className="bg-indigo-100 p-1.5 rounded-lg">
                  <InfoIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="space-y-1">
                   <p className="text-[11px] text-indigo-700 font-bold">
                    {detectedLink 
                      ? "Direct URL detected. AI will attempt to pull the price, location, dates, and images." 
                      : "Paste text or a public link. Our AI visits the page to verify data."}
                  </p>
                  <p className="text-[9px] text-indigo-400 uppercase font-black">Powered by Gemini 3 with Google Search</p>
                </div>
              </div>
            </div>
          )}

          {mode === 'manual' && (
            <div className="space-y-8">
              {!isReviewing && (
                 <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 flex flex-col sm:flex-row items-center gap-4">
                     <div className="flex-1">
                         <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                             <CameraIcon className="w-4 h-4 text-indigo-600" />
                             {t.autoFillTitle}
                         </h3>
                         <p className="text-[10px] text-indigo-600/80 mt-1">
                             {t.autoFillDesc}
                         </p>
                     </div>
                     <button 
                        onClick={() => scanInputRef.current?.click()}
                        disabled={loading}
                        className="px-4 py-2 bg-white text-indigo-600 text-xs font-bold rounded-xl shadow-sm border border-indigo-100 hover:bg-indigo-50 transition-colors whitespace-nowrap flex items-center gap-2"
                     >
                        {loading && <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />}
                        {loading ? "Scanning..." : t.uploadAndScan}
                     </button>
                     <input 
                       type="file" 
                       ref={scanInputRef} 
                       onChange={handleAutoFill}
                       accept="image/*" 
                       className="hidden" 
                     />
                 </div>
              )}

              {isReviewing && (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center gap-3">
                   <div className="bg-amber-100 p-2 rounded-lg"><InfoIcon className="w-4 h-4 text-amber-600" /></div>
                   <p className="text-[11px] text-amber-700 font-bold">Review the extracted details below. Accuracy depends on the post's privacy settings.</p>
                </div>
              )}

              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{t.basics}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.locationLabel} *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 12 Rothschild Blvd"
                      value={manualData.location}
                      onChange={e => setManualData({...manualData, location: e.target.value})}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.type}</label>
                    <select 
                      value={manualData.type}
                      onChange={e => setManualData({...manualData, type: e.target.value as SubletType})}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                    >
                      {Object.values(SubletType).map(type => (
                        <option key={type} value={type}>{t.subletTypes[type]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.totalPrice} (ILS) *</label>
                    <input 
                      type="number" 
                      placeholder="5000"
                      value={manualData.price}
                      onChange={e => setManualData({...manualData, price: e.target.value})}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.city}</label>
                    <select 
                      value={manualData.city}
                      onChange={e => setManualData({...manualData, city: e.target.value})}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                    >
                      {Object.keys(CITY_CENTERS).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                    {isReviewing ? "Photos Extracted" : "Photos"}
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {manualData.images.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden group shadow-sm bg-slate-100">
                      <img src={img} className="w-full h-full object-cover" alt="Preview" />
                      <button 
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  {manualData.images.length < 10 && (
                    <button onClick={() => fileInputRef.current?.click()} className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all bg-slate-50/50">
                        <PlusIcon className="w-5 h-5" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Add</span>
                    </button>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
              </section>

              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{t.timeline}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.startDate} *</label>
                    <input 
                      type="date" 
                      value={manualData.startDate} 
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      onChange={e => setManualData({...manualData, startDate: e.target.value})} 
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all cursor-pointer appearance-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.endDate}</label>
                    <input 
                      type="date" 
                      value={manualData.endDate} 
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      onChange={e => setManualData({...manualData, endDate: e.target.value})} 
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all cursor-pointer appearance-none" 
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{t.details}</h3>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.description}</label>
                  <textarea 
                    placeholder="Describe your sublet..."
                    value={manualData.description}
                    onChange={e => setManualData({...manualData, description: e.target.value})}
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.selectAmenities}</label>
                  <div className="flex flex-wrap gap-2">
                    {amenitiesOptions.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => toggleAmenity(opt.key)}
                        className={`px-4 py-2.5 rounded-full text-xs font-bold border flex items-center gap-2 transition-all
                          ${manualData.amenities.includes(opt.key) 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}
                        `}
                      >
                        <span className="text-base">{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {isReviewing && groundingChunks.length > 0 && (
                <section className="space-y-3 pt-4 border-t border-slate-100">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sources Verified</h3>
                  <div className="flex flex-wrap gap-2">
                    {groundingChunks.map((chunk, idx) => (
                      chunk.web?.uri && (
                        <a key={idx} href={chunk.web.uri} target="_blank" className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all">
                          <ExternalLinkIcon className="w-3 h-3" />
                          {chunk.web.title || "Reference"}
                        </a>
                      )
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3 animate-in shake-in-1 duration-300">
              <WarningIcon className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button type="button" onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-100 touch-none">
            {t.cancel}
          </button>
          {mode === 'ai' && (
            <button
              type="button"
              onClick={handleTextExtract}
              disabled={loading || !text.trim()}
              className="flex-2 py-4 px-8 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-100 touch-none"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Verify & Extract Link"}
            </button>
          )}
          {mode === 'manual' && (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={loading}
              className="flex-2 py-4 px-8 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-100 touch-none"
            >
              {loading ? "Posting..." : (isReviewing ? "Confirm & Post" : t.postListing)}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AddListingModal;
