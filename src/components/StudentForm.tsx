import React, { useState, useEffect } from 'react';
import { Student, DAYS, HOURS } from '../types';
import { Save, X } from 'lucide-react';

interface Props {
  onSave: (student: Student) => void;
  initialData?: Student | null;
  onCancelEdit?: () => void;
}

export default function StudentForm({ onSave, initialData, onCancelEdit }: Props) {
  const [name, setName] = useState('');
  const [sessions, setSessions] = useState(3);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setSessions(initialData.sessionsPerWeek);
      setSelectedSlots(new Set(initialData.availableSlots));
    } else {
      setName('');
      setSessions(3);
      setSelectedSlots(new Set());
    }
  }, [initialData]);

  const toggleSlot = (slot: string) => {
    const newSlots = new Set(selectedSlots);
    if (newSlots.has(slot)) {
      newSlots.delete(slot);
    } else {
      newSlots.add(slot);
    }
    setSelectedSlots(newSlots);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onSave({
      id: initialData ? initialData.id : Date.now().toString(),
      name: name.trim(),
      sessionsPerWeek: sessions,
      availableSlots: Array.from(selectedSlots)
    });

    if (!initialData) {
      setName('');
      setSessions(3);
      setSelectedSlots(new Set());
    }
  };

  return (
    <div className="bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-xl border border-zinc-800">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wide flex items-center gap-3">
            <span className="w-2 h-8 bg-pink-500 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.8)]"></span>
            {initialData ? 'Sửa Học Viên' : 'Thêm Học Viên Mới'}
          </h2>
          <p className="text-zinc-400 mt-2">Nhập thông tin và chọn các khung giờ học viên có thể tập.</p>
        </div>
        {initialData && onCancelEdit && (
          <button 
            onClick={onCancelEdit}
            className="text-zinc-500 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            title="Hủy sửa"
          >
            <X size={24} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-zinc-300 uppercase tracking-wider">Tên học viên</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none text-white placeholder-zinc-600 transition-all"
              placeholder="VD: Nguyễn Văn A"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-zinc-300 uppercase tracking-wider">Số buổi / tuần</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="6"
                value={sessions}
                onChange={(e) => setSessions(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none text-white transition-all appearance-none"
                required
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none font-medium">
                buổi
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <label className="block text-sm font-bold text-zinc-300 uppercase tracking-wider">
              Ma trận thời gian rảnh
            </label>
            <span className="text-xs text-pink-400 font-medium bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/20">
              Đã chọn: {selectedSlots.size} slots
            </span>
          </div>
          
          <div className="md:hidden text-xs text-zinc-500 italic">👉 Vuốt ngang để xem hết các ngày</div>
          
          <div className="overflow-x-auto hide-scrollbar rounded-xl border border-zinc-800 bg-zinc-950">
            <div className="min-w-[600px]">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr>
                    <th className="border-b border-r border-zinc-800 p-3 bg-zinc-900 w-20 text-center font-bold text-zinc-400 uppercase sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">Giờ</th>
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
                        const isSelected = selectedSlots.has(slotId);
                        return (
                          <td 
                            key={slotId}
                            onClick={() => toggleSlot(slotId)}
                            className={`border-b border-r border-zinc-800 p-2 text-center cursor-pointer transition-all duration-200 relative ${
                              isSelected 
                                ? 'bg-pink-600/20 text-pink-400 font-bold shadow-[inset_0_0_15px_rgba(236,72,153,0.3)]' 
                                : 'hover:bg-zinc-800 text-transparent hover:text-zinc-600'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute inset-0 border-2 border-pink-500 rounded-sm m-0.5 shadow-[0_0_10px_rgba(236,72,153,0.5)]"></div>
                            )}
                            {isSelected ? '✓' : '+'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-zinc-100 text-zinc-900 px-8 py-3.5 md:py-3 rounded-xl font-bold hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all active:scale-95 uppercase tracking-wider"
          >
            <Save size={20} />
            Lưu Học Viên
          </button>
        </div>
      </form>
    </div>
  );
}
