import React, { useState } from 'react';
import { Student, Trainer, Schedule, DAYS, HOURS } from '../types';

interface Props {
  schedule: Schedule;
  students: Student[];
  trainers: Trainer[];
}

export default function PTSchedule({ schedule, students, trainers }: Props) {
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>(trainers[0]?.id || '');
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);

  const getStudentName = (id: string) => {
    return students.find(s => s.id === id)?.name || 'Unknown';
  };

  if (trainers.length === 0) {
    return (
      <div className="bg-zinc-900 p-8 rounded-2xl text-center text-zinc-400 border border-zinc-800">
        Vui lòng thêm Huấn luyện viên trước khi xem lịch.
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-xl border border-zinc-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div className="w-full md:w-auto">
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wide flex items-center gap-3">
            <span className="w-2 h-6 md:h-8 bg-pink-500 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.8)]"></span>
            Dashboard Lịch PT
          </h2>
          {highlightedStudentId && (
            <p className="text-sm text-pink-400 mt-2 flex items-center gap-2 flex-wrap">
              Đang xem lịch của: <span className="font-bold text-white bg-pink-500/20 px-2 py-0.5 rounded">{getStudentName(highlightedStudentId)}</span>
              <button 
                onClick={() => setHighlightedStudentId(null)}
                className="text-zinc-400 hover:text-white text-xs underline ml-2"
              >
                Bỏ chọn
              </button>
            </p>
          )}
        </div>
        
        <select
          value={selectedTrainerId}
          onChange={(e) => setSelectedTrainerId(e.target.value)}
          className="w-full md:w-auto bg-zinc-950 border border-zinc-800 text-white px-4 py-3 md:py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 font-bold"
        >
          {trainers.map(t => (
            <option key={t.id} value={t.id}>Lịch của: {t.name}</option>
          ))}
        </select>
      </div>

      <div className="md:hidden text-xs text-zinc-500 mb-2 italic">👉 Vuốt ngang để xem lịch các ngày</div>
      <div className="overflow-x-auto hide-scrollbar rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="min-w-[600px]">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr>
                <th className="border-b border-r border-zinc-800 p-3 bg-zinc-900 w-24 text-center font-bold text-zinc-400 uppercase sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">Giờ</th>
                {DAYS.map(day => (
                  <th key={day} className="border-b border-r border-zinc-800 p-3 bg-zinc-900 text-center font-bold text-zinc-300 uppercase">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(hour => (
                <tr key={hour} className="group">
                  <td className="border-b border-r border-zinc-800 p-3 text-center font-mono font-bold bg-zinc-900 text-zinc-400 group-hover:text-zinc-200 transition-colors sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                    {hour}:00
                  </td>
                  {DAYS.map(day => {
                    const slotId = `${day}-${hour}`;
                    const slotEntries = schedule[slotId] || [];
                    const trainerEntries = slotEntries.filter(e => e.trainerId === selectedTrainerId);
                    const studentIds = trainerEntries.map(e => e.studentId);
                    
                    const isHighlighted = highlightedStudentId && studentIds.includes(highlightedStudentId);
                    const isDimmed = highlightedStudentId && !studentIds.includes(highlightedStudentId);
                    
                    return (
                      <td 
                        key={slotId}
                        className={`border-b border-r border-zinc-800 p-2 text-center transition-all duration-200 align-top ${
                          isHighlighted
                            ? 'bg-pink-500/30 shadow-[inset_0_0_20px_rgba(236,72,153,0.3)] border-pink-500/50'
                            : studentIds.length > 0 
                              ? isDimmed ? 'bg-pink-900/10 opacity-40' : 'bg-pink-600/10 shadow-[inset_0_0_15px_rgba(236,72,153,0.05)]' 
                              : 'bg-transparent text-zinc-700'
                        }`}
                      >
                        {studentIds.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {studentIds.map(id => (
                              <button 
                                key={id} 
                                onClick={() => setHighlightedStudentId(id === highlightedStudentId ? null : id)}
                                className={`truncate text-xs font-bold rounded px-2 py-1 border text-left transition-colors ${
                                  highlightedStudentId === id
                                    ? 'bg-pink-500 text-white border-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.5)]'
                                    : 'text-pink-400 bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20 hover:border-pink-500/40'
                                }`}
                              >
                                {getStudentName(id)}
                              </button>
                            ))}
                          </div>
                        ) : <div className="py-1">-</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-6 flex gap-6 text-sm font-bold">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-pink-600/20 border border-pink-500/50 rounded shadow-[0_0_5px_rgba(236,72,153,0.3)]"></div>
          <span className="text-zinc-300">Đã có lịch (Tối đa 2 HV/Slot)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-zinc-950 border border-zinc-800 rounded"></div>
          <span className="text-zinc-500">Trống</span>
        </div>
      </div>
    </div>
  );
}
