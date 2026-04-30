import React from 'react';

const AppBootLoader = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-500 border-t-blue-400" />
        <p className="text-sm text-slate-300">جاري تحميل النظام...</p>
      </div>
    </div>
  );
};

export default AppBootLoader;
