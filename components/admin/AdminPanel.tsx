import React from 'react';
import { PromptTemplateGenerator } from '../PromptTemplateGenerator';

const AdminPanel: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-400">Geliştirici Admin Paneli</h2>
        <p className="text-sm text-slate-400">Bu alandaki araçlar uygulamanın genel davranışını etkileyebilir.</p>
      </div>
      
      <PromptTemplateGenerator />

      {/* Gelecekteki admin araçları buraya eklenebilir */}
      {/* 
      <div className="bg-slate-800/50 p-4 rounded-xl border border-red-500/30">
        <h3 className="text-xl font-bold text-red-300 mb-3">Diğer Admin Araçları</h3>
        <p className="text-slate-400">Örn: Kullanıcı yönetimi, global duyurular vb.</p>
      </div> 
      */}
    </div>
  );
};

export default AdminPanel;