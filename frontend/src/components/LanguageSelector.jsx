import React from 'react';
import { Globe } from 'lucide-react';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'hi', name: 'Hindi (हिंदी)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'zh-CN', name: 'Chinese (简体中文)' },
  { code: 'ar', name: 'Arabic (العربية)' }
];

const LanguageSelector = ({ selected, onSelect }) => {
  return (
    <div className="w-full flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-xl mt-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-200">Target Language</h4>
          <p className="text-xs text-slate-400">Translate audio & text to</p>
        </div>
      </div>
      
      <select
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 outline-none font-medium cursor-pointer"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
