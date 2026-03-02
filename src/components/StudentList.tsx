import React from 'react';
import { Student, Schedule, Warning } from '../types';
import { AlertTriangle, MessageSquare, Trash2, Edit2 } from 'lucide-react';

interface Props {
  students: Student[];
  schedule: Schedule;
  warnings: Warning[];
  onDelete: (id: string) => void;
  onEdit: (student: Student) => void;
}

export default function StudentList({ students, schedule, warnings, onDelete, onEdit }: Props) {
  const getStudentSchedule = (studentId: string) => {
    const slots: string[] = [];
    Object.entries(schedule).forEach(([slotId, entries]) => {
      if (entries.some(e => e.studentId === studentId)) {
        slots.push(slotId);
      }
    });
    
    // Sort slots by day then hour
    return slots.sort((a, b) => {
      const [dayA, hourA] = a.split('-');
      const [dayB, hourB] = b.split('-');
      if (dayA !== dayB) return dayA.localeCompare(dayB);
      return parseInt(hourA) - parseInt(hourB);
    });
  };

  const formatSlot = (slotId: string) => {
    const [day, hour] = slotId.split('-');
    return `${day} (${hour}h)`;
  };

  return (
    <div className="space-y-6">
      {warnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 space-y-4">
          <h3 className="text-amber-400 font-black uppercase tracking-wide flex items-center gap-2">
            <AlertTriangle size={20} />
            Cảnh báo xếp lịch
          </h3>
          <div className="space-y-3">
            {warnings.map((warning, idx) => {
              const student = students.find(s => s.id === warning.studentId);
              return (
                <div key={idx} className="bg-zinc-950/50 p-4 rounded-xl border border-amber-500/20 shadow-sm">
                  <p className="font-bold text-zinc-200">
                    ⚠️ Học viên <span className="text-amber-400">{student?.name}</span> mới xếp được {warning.scheduled}/{warning.requested} buổi.
                  </p>
                  <p className="text-sm text-zinc-400 mt-1">
                    <span className="font-bold text-zinc-300">Lý do:</span> Khung giờ rảnh của HV trùng với các lớp đã kín chỗ.
                  </p>
                  {warning.suggestions.length > 0 && (
                    <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                      <p className="text-sm text-emerald-400 mb-2">
                        <span className="font-bold uppercase tracking-wider text-xs mr-2 bg-emerald-500/20 px-2 py-1 rounded">Gợi ý tối ưu</span>
                        Chỉ cần HV thêm <strong className="text-emerald-300">MỘT TRONG CÁC</strong> giờ sau vào lịch rảnh, hệ thống sẽ xếp được thêm buổi (Ưu tiên các giờ đầu tiên để ghép lớp 2 người):
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {warning.suggestions.map((slot, i) => (
                          <span key={slot} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                            i < 2 
                              ? 'bg-emerald-500/30 text-emerald-200 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {i === 0 && '⭐ '}
                            {formatSlot(slot)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 overflow-hidden">
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-3">
            <span className="w-2 h-6 bg-pink-500 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.8)]"></span>
            Danh sách Học viên
          </h2>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {students.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 font-medium">
              Chưa có học viên nào. Hãy thêm học viên ở tab Đăng ký.
            </div>
          ) : (
            students.map(student => {
              const studentSchedule = getStudentSchedule(student.id);
              const message = `Chào ${student.name}, lịch tập tuần này của bạn là: ${studentSchedule.map(formatSlot).join(', ')}.`;
              
              return (
                <div key={student.id} className="p-6 hover:bg-zinc-800/30 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black text-zinc-100 text-xl">{student.name}</h3>
                      <p className="text-sm text-zinc-400 mt-1 font-medium">
                        Đăng ký: <span className="text-pink-400">{student.sessionsPerWeek} buổi/tuần</span> | Rảnh: <span className="text-pink-400">{student.availableSlots.length} slots</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onEdit(student)}
                        className="text-zinc-500 hover:text-pink-400 p-2 rounded-lg hover:bg-pink-500/10 transition-colors"
                        title="Sửa học viên"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => onDelete(student.id)}
                        className="text-zinc-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Xóa học viên"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  {studentSchedule.length > 0 ? (
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-start gap-3">
                      <MessageSquare size={18} className="text-pink-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                        {message}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-600 italic font-medium">Chưa được xếp lịch</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
