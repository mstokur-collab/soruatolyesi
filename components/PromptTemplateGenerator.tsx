import React from 'react';
import { PromptWizard } from './teacher_panel/PromptWizard';

export const PromptTemplateGenerator: React.FC = () => {
    return (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-red-500/30">
            <h3 className="text-xl font-bold text-red-300 mb-3">Prompt Şablon Sihirbazı</h3>
            <PromptWizard />
        </div>
    );
};
