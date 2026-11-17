import React from 'react';
import { PlaySquare, Calculator, GraduationCap, ChevronRight } from 'lucide-react';
import { CategoryId } from '../types/poker';

interface TrainingCategoriesProps {
  onSelectCategory: (cat: CategoryId) => void;
}

export const TrainingCategories: React.FC<TrainingCategoriesProps> = ({ onSelectCategory }) => {
  const categories = [
    {
      id: 'simulator' as CategoryId,
      title: 'Simulator',
      icon: PlaySquare
    },
    {
      id: 'math' as CategoryId,
      title: 'Math',
      icon: Calculator
    },
    {
      id: 'fundamentals' as CategoryId,
      title: 'Fundamentals',
      icon: GraduationCap
    }
  ];

  return (
    <div className="space-y-2">
      <div className="mb-2">
        <h2 className="text-base font-bold text-white tracking-tight">Training</h2>
      </div>

      <div className="space-y-2">
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="w-full bg-[#121929] hover:bg-[#162035] border border-slate-800/90 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#175eff]/15 text-[#175eff] shrink-0">
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white tracking-wide">{cat.title}</h3>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
