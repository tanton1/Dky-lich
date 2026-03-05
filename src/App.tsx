import React, { useState, useEffect } from 'react';
import { Student, Trainer, Schedule, Warning } from './types';
import { generateSchedule } from './utils/scheduler';
import StudentForm from './components/StudentForm';
import PTSchedule from './components/PTSchedule';
import StudentList from './components/StudentList';
import TrainerList from './components/TrainerList';
import { CalendarDays, Users, UserPlus, Play, Activity, Dumbbell, RotateCcw, Trash2 } from 'lucide-react';
import { supabase } from './supabase';

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [schedule, setSchedule] = useState<Schedule>({});
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [activeTab, setActiveTab] = useState<'register' | 'dashboard' | 'students' | 'trainers'>('register');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time sync from Supabase
  useEffect(() => {
    // Initial fetch
    const fetchData = async () => {
      try {
        const [studentsRes, trainersRes, stateRes] = await Promise.all([
          supabase.from('students').select('*'),
          supabase.from('trainers').select('*'),
          supabase.from('app_state').select('*').eq('id', 'current').single()
        ]);

        if (studentsRes.data) setStudents(studentsRes.data as Student[]);
        if (trainersRes.data) setTrainers(trainersRes.data as Trainer[]);
        if (stateRes.data) {
          if (stateRes.data.schedule) setSchedule(stateRes.data.schedule);
          if (stateRes.data.warnings) setWarnings(stateRes.data.warnings);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Realtime subscriptions
    const studentsSub = supabase.channel('public:students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setStudents(prev => [...prev, payload.new as Student]);
        } else if (payload.eventType === 'UPDATE') {
          setStudents(prev => prev.map(s => s.id === payload.new.id ? payload.new as Student : s));
        } else if (payload.eventType === 'DELETE') {
          setStudents(prev => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe();

    const trainersSub = supabase.channel('public:trainers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trainers' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTrainers(prev => [...prev, payload.new as Trainer]);
        } else if (payload.eventType === 'UPDATE') {
          setTrainers(prev => prev.map(t => t.id === payload.new.id ? payload.new as Trainer : t));
        } else if (payload.eventType === 'DELETE') {
          setTrainers(prev => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();

    const stateSub = supabase.channel('public:app_state')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_state', filter: 'id=eq.current' }, (payload) => {
        if (payload.new.schedule) setSchedule(payload.new.schedule);
        if (payload.new.warnings) setWarnings(payload.new.warnings);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(studentsSub);
      supabase.removeChannel(trainersSub);
      supabase.removeChannel(stateSub);
    };
  }, []);

  const handleAddStudent = async (student: Student) => {
    try {
      const { error } = await supabase.from('students').upsert(student);
      if (error) throw error;
      
      if (editingStudent) {
        setEditingStudent(null);
        setActiveTab('students');
      } else {
        alert('Đăng ký thành công! Dữ liệu đã được lưu.');
      }
    } catch (err: any) {
      console.error('Failed to save student', err);
      alert(`Lưu dữ liệu thất bại: ${err.message || 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại mạng.'}`);
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setActiveTab('register');
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      
      // Update schedule state
      const newSchedule = { ...schedule };
      Object.keys(newSchedule).forEach(slot => {
        newSchedule[slot] = newSchedule[slot].filter(e => e.studentId !== id);
      });
      const newWarnings = warnings.filter(w => w.studentId !== id);
      
      await supabase.from('app_state').update({
        schedule: newSchedule,
        warnings: newWarnings
      }).eq('id', 'current');
    } catch (err) {
      console.error('Failed to delete student', err);
    }
  };

  const handleAddTrainer = async (name: string) => {
    try {
      const id = Date.now().toString();
      const { error } = await supabase.from('trainers').insert({ id, name });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to add trainer', err);
    }
  };

  const handleDeleteTrainer = async (id: string) => {
    try {
      const { error } = await supabase.from('trainers').delete().eq('id', id);
      if (error) throw error;
      
      // Update schedule state
      const newSchedule = { ...schedule };
      Object.keys(newSchedule).forEach(slot => {
        newSchedule[slot] = newSchedule[slot].filter(e => e.trainerId !== id);
      });
      
      await supabase.from('app_state').update({
        schedule: newSchedule
      }).eq('id', 'current');
    } catch (err) {
      console.error('Failed to delete trainer', err);
    }
  };

  const handleRunAlgorithm = async () => {
    try {
      const { schedule: newSchedule, warnings: newWarnings } = generateSchedule(students, trainers);
      
      const { error } = await supabase.from('app_state').update({
        schedule: newSchedule,
        warnings: newWarnings
      }).eq('id', 'current');
      
      if (error) throw error;
      
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Failed to run algorithm', err);
      alert('Có lỗi xảy ra khi xếp lịch!');
    }
  };

  const handleResetSchedule = async () => {
    if (window.confirm('Bạn có chắc muốn xóa kết quả xếp lịch hiện tại? Danh sách học viên và PT vẫn được giữ nguyên.')) {
      try {
        const { error } = await supabase.from('app_state').update({
          schedule: {},
          warnings: []
        }).eq('id', 'current');
        
        if (error) throw error;
      } catch (err) {
        console.error('Failed to reset schedule', err);
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('CẢNH BÁO: Bạn sẽ xóa TOÀN BỘ dữ liệu học viên, PT và lịch. Không thể hoàn tác!')) {
      try {
        // Supabase doesn't have a direct batch equivalent for multiple tables in the JS client easily,
        // so we do them sequentially or in parallel promises.
        await Promise.all([
          supabase.from('students').delete().neq('id', '0'), // Delete all
          supabase.from('trainers').delete().neq('id', '0'), // Delete all
          supabase.from('app_state').update({ schedule: {}, warnings: [] }).eq('id', 'current')
        ]);
        
        setActiveTab('register');
      } catch (err) {
        console.error('Failed to clear all', err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-pink-500 flex flex-col items-center gap-4">
          <Activity size={48} className="animate-pulse" />
          <p className="font-bold tracking-widest uppercase">Đang kết nối Supabase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-pink-500/30">
      <header className="bg-zinc-900/80 backdrop-blur-md shadow-lg border-b border-zinc-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <div className="flex items-center gap-3">
              {/* Logo Icon */}
              <div className="relative flex items-center justify-center text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]">
                <Activity size={32} strokeWidth={2.5} className="md:w-9 md:h-9" />
              </div>
              {/* Logo Text */}
              <div className="flex flex-col justify-center">
                <span className="text-2xl md:text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-fuchsia-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.6)] leading-none">
                  AURA
                </span>
                <span className="text-[9px] md:text-[10px] font-bold text-white tracking-[0.3em] mt-1 leading-none">
                  +FITNESS+
                </span>
              </div>
            </div>
            
            {/* Mobile action buttons (Reset/Clear) */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    alert("Đang kiểm tra kết nối Supabase...");
                    const { error } = await supabase.from('app_state').select('id').limit(1);
                    if (error) throw error;
                    alert("✅ Kết nối Supabase THÀNH CÔNG!");
                  } catch (err: any) {
                    console.error("Test connection failed:", err);
                    alert(`❌ Lỗi kết nối Supabase: ${err.message}`);
                  }
                }}
                className="flex items-center justify-center w-10 h-10 bg-blue-900/50 hover:bg-blue-800/50 text-blue-400 rounded-full font-bold transition-all active:scale-95 border border-blue-800/50"
                title="Kiểm tra kết nối Supabase"
              >
                <Activity size={18} />
              </button>
              <button
                onClick={handleResetSchedule}
                disabled={Object.keys(schedule).length === 0}
                className="flex items-center justify-center w-10 h-10 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-zinc-300 rounded-full font-bold transition-all active:scale-95"
                title="Xóa lịch đã xếp, giữ nguyên danh sách"
              >
                <RotateCcw size={18} />
              </button>
              <button
                onClick={handleClearAll}
                disabled={students.length === 0 && trainers.length === 0}
                className="flex items-center justify-center w-10 h-10 bg-red-950/50 hover:bg-red-900/50 text-red-400 disabled:bg-zinc-900 disabled:text-zinc-600 rounded-full font-bold transition-all active:scale-95 border border-red-900/30"
                title="Xóa toàn bộ dữ liệu"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-2">
            {/* Desktop action buttons (Reset/Clear) */}
            <div className="hidden md:flex gap-2">
              <button
                onClick={async () => {
                  try {
                    alert("Đang kiểm tra kết nối Supabase... Vui lòng đợi.");
                    
                    const { error } = await supabase.from('app_state').select('id').limit(1);
                    if (error) throw error;
                    
                    alert("✅ Kết nối Supabase THÀNH CÔNG!\n\nBạn có thể tải lại trang và thử thêm học viên.");
                  } catch (err: any) {
                    console.error("Test connection failed:", err);
                    
                    let errorMessage = err.message;
                    if (err.code) {
                      errorMessage = `[${err.code}] ${err.message}`;
                    }
                    
                    alert(`❌ Lỗi kết nối Supabase:\n\n${errorMessage}\n\nCách khắc phục:\n1. Kiểm tra lại API Key và URL.\n2. Đảm bảo đã chạy mã SQL tạo bảng.`);
                  }
                }}
                className="flex items-center gap-2 bg-blue-900/50 hover:bg-blue-800/50 text-blue-400 px-4 py-2.5 rounded-full font-bold transition-all active:scale-95 text-sm border border-blue-800/50"
                title="Kiểm tra kết nối Supabase"
              >
                <Activity size={18} />
                <span>Test Supabase</span>
              </button>
              <button
                onClick={handleResetSchedule}
                disabled={Object.keys(schedule).length === 0}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-zinc-300 px-4 py-2.5 rounded-full font-bold transition-all active:scale-95 text-sm"
                title="Xóa lịch đã xếp, giữ nguyên danh sách"
              >
                <RotateCcw size={18} />
                <span>Reset Lịch</span>
              </button>
              <button
                onClick={handleClearAll}
                disabled={students.length === 0 && trainers.length === 0}
                className="flex items-center gap-2 bg-red-950/50 hover:bg-red-900/50 text-red-400 disabled:bg-zinc-900 disabled:text-zinc-600 px-4 py-2.5 rounded-full font-bold transition-all active:scale-95 text-sm border border-red-900/30"
                title="Xóa toàn bộ dữ liệu"
              >
                <Trash2 size={18} />
                <span>Xóa Tất Cả</span>
              </button>
            </div>
            
            <button
              onClick={handleRunAlgorithm}
              disabled={students.length === 0 || trainers.length === 0}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:from-pink-500 hover:to-fuchsia-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white px-6 py-3 md:py-2.5 rounded-full font-bold shadow-[0_0_15px_rgba(236,72,153,0.4)] hover:shadow-[0_0_25px_rgba(236,72,153,0.6)] disabled:shadow-none transition-all active:scale-95 uppercase tracking-wide text-sm md:ml-2"
            >
              <Play size={18} fill="currentColor" />
              Xếp Lịch Ngay
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 bg-zinc-900/50 p-1.5 rounded-2xl mb-8 w-full max-w-2xl mx-auto sm:mx-0 border border-zinc-800/50 snap-x">
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-none snap-start min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'register' ? 'bg-zinc-800 text-pink-400 shadow-md border border-zinc-700/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <UserPlus size={18} />
            Đăng ký
          </button>
          <button
            onClick={() => setActiveTab('trainers')}
            className={`flex-none snap-start min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'trainers' ? 'bg-zinc-800 text-pink-400 shadow-md border border-zinc-700/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Dumbbell size={18} />
            PT
            {trainers.length > 0 && (
              <span className={`py-0.5 px-2 rounded-full text-xs ${activeTab === 'trainers' ? 'bg-pink-500/20 text-pink-400' : 'bg-zinc-800 text-zinc-300'}`}>
                {trainers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-none snap-start min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'dashboard' ? 'bg-zinc-800 text-pink-400 shadow-md border border-zinc-700/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <CalendarDays size={18} />
            Lịch PT
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`flex-none snap-start min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'students' ? 'bg-zinc-800 text-pink-400 shadow-md border border-zinc-700/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Users size={18} />
            Học viên
            {students.length > 0 && (
              <span className={`py-0.5 px-2 rounded-full text-xs ${activeTab === 'students' ? 'bg-pink-500/20 text-pink-400' : 'bg-zinc-800 text-zinc-300'}`}>
                {students.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="transition-all duration-300">
          {activeTab === 'register' && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <StudentForm 
                onSave={handleAddStudent} 
                initialData={editingStudent}
                onCancelEdit={() => {
                  setEditingStudent(null);
                  setActiveTab('students');
                }}
              />
            </div>
          )}

          {activeTab === 'trainers' && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <TrainerList 
                trainers={trainers}
                onAdd={handleAddTrainer}
                onDelete={handleDeleteTrainer}
              />
            </div>
          )}
          
          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <PTSchedule schedule={schedule} students={students} trainers={trainers} />
            </div>
          )}
          
          {activeTab === 'students' && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <StudentList 
                students={students} 
                schedule={schedule} 
                warnings={warnings}
                onDelete={handleDeleteStudent}
                onEdit={handleEditStudent}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
