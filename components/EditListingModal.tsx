
import React, { useState } from 'react';
import { Sublet, ListingStatus, Language, SubletType } from '../types';
import { translations } from '../translations';
import { WarningIcon } from './Icons';

interface EditListingModalProps {
  sublet: Sublet;
  onSave: (updated: Sublet) => void;
  onClose: () => void;
  language: Language;
}

const EditListingModal: React.FC<EditListingModalProps> = ({ sublet, onSave, onClose, language }) => {
  const t = translations[language];
  const [formData, setFormData] = useState<Sublet>({ ...sublet });
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      onSave(formData);
      setLoading(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">{t.editListingTitle}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.locationLabel}</label>
              <input 
                type="text" 
                value={formData.location} 
                onChange={e => setFormData({...formData, location: e.target.value})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.type}</label>
              <select 
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value as SubletType})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                {Object.values(SubletType).map(type => (
                  <option key={type} value={type}>{t.subletTypes[type]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Price</label>
              <input 
                type="number" 
                value={formData.price} 
                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.startDate}</label>
              <input 
                type="date" 
                value={formData.startDate} 
                onClick={(e) => e.currentTarget.showPicker?.()}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer appearance-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.endDate}</label>
              <input 
                type="date" 
                value={formData.endDate} 
                onClick={(e) => e.currentTarget.showPicker?.()}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer appearance-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.description}</label>
            <textarea 
              value={formData.originalText} 
              onChange={e => setFormData({...formData, originalText: e.target.value})}
              className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
              <div className="flex items-center gap-3">
                <WarningIcon className="w-5 h-5 text-red-500" />
                <div>
                  <h4 className="text-sm font-bold text-red-700">{t.rentedToggle}</h4>
                  <p className="text-[10px] text-red-500">This will hide the listing from the main map.</p>
                </div>
              </div>
              <button 
                onClick={() => setFormData({
                  ...formData, 
                  status: formData.status === ListingStatus.TAKEN ? ListingStatus.AVAILABLE : ListingStatus.TAKEN 
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ring-transparent
                  ${formData.status === ListingStatus.TAKEN ? 'bg-red-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.status === ListingStatus.TAKEN ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t.saveChanges}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditListingModal;
