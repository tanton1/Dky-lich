import { Student, Trainer, Schedule, Warning, SchedulerResult, DAYS, HOURS } from '../types';

function getDayIndex(day: string): number {
  return DAYS.indexOf(day as any);
}

export function generateSchedule(students: Student[], trainers: Trainer[]): SchedulerResult {
  const schedule: Schedule = {};
  const warnings: Warning[] = [];

  if (trainers.length === 0) return { schedule, warnings };

  const MAX_STUDENTS_PER_PT = 2;
  const slotCapacity = trainers.length * MAX_STUDENTS_PER_PT;

  // Initialize schedule
  for (const day of DAYS) {
    for (const hour of HOURS) {
      schedule[`${day}-${hour}`] = [];
    }
  }

  // Sort students by least available slots first (hardest to schedule go first)
  const sortedStudents = [...students].sort(
    (a, b) => a.availableSlots.length - b.availableSlots.length
  );

  for (const student of sortedStudents) {
    const { id, sessionsPerWeek, availableSlots } = student;
    
    // Group available slots by day, filtering out full slots
    const slotsByDay: Record<string, string[]> = {};
    for (const slot of availableSlots) {
      if (schedule[slot] && schedule[slot].length < slotCapacity) {
        const day = slot.split('-')[0];
        if (!slotsByDay[day]) slotsByDay[day] = [];
        slotsByDay[day].push(slot);
      }
    }

    const availableDays = Object.keys(slotsByDay).sort((a, b) => getDayIndex(a) - getDayIndex(b));
    
    let selectedSlots: string[] = [];

    // Helper to find combinations of days
    const findDayCombinations = (days: string[], k: number): string[][] => {
      const result: string[][] = [];
      const f = (start: number, current: string[]) => {
        if (current.length === k) {
          result.push([...current]);
          return;
        }
        for (let i = start; i < days.length; i++) {
          f(i + 1, [...current, days[i]]);
        }
      };
      f(0, []);
      return result;
    };

    // Try to find a combination of days
    let bestDaysCombination: string[] | null = null;
    for (let k = Math.min(sessionsPerWeek, availableDays.length); k > 0; k--) {
      const combos = findDayCombinations(availableDays, k);
      
      // Prefer combos with gap >= 1
      const goodCombos = combos.filter(combo => {
        for (let i = 1; i < combo.length; i++) {
          if (getDayIndex(combo[i]) - getDayIndex(combo[i - 1]) < 2) {
            return false;
          }
        }
        return true;
      });

      if (goodCombos.length > 0) {
        bestDaysCombination = goodCombos[0];
        break;
      } else if (combos.length > 0) {
        bestDaysCombination = combos[0];
        break;
      }
    }

    if (bestDaysCombination) {
      for (const day of bestDaysCombination) {
        // Pick the slot with the MOST remaining capacity to leave room for others
        const slotsInDay = slotsByDay[day];
        slotsInDay.sort((a, b) => schedule[a].length - schedule[b].length);
        selectedSlots.push(slotsInDay[0]);
      }
    }

    // Assign slots to trainers
    for (const slot of selectedSlots) {
      const [day, hourStr] = slot.split('-');
      const hour = parseInt(hourStr, 10);
      const hourIndex = HOURS.indexOf(hour);

      const trainerCounts: Record<string, number> = {};
      for (const t of trainers) trainerCounts[t.id] = 0;
      for (const entry of schedule[slot]) {
        trainerCounts[entry.trainerId]++;
      }
      
      const availableTrainers = trainers.filter(t => trainerCounts[t.id] < MAX_STUDENTS_PER_PT);
      
      if (availableTrainers.length > 0) {
        // Score trainers to prioritize contiguous shifts
        const scoredTrainers = availableTrainers.map(trainer => {
          let score = 0;
          
          // Priority 1: Trainer already has 1 student in this exact slot (fill up to 2)
          if (trainerCounts[trainer.id] > 0) {
            score += 1000;
          }

          let hasClassesToday = false;
          
          for (let i = 0; i < HOURS.length; i++) {
            if (i === hourIndex) continue;
            const h = HOURS[i];
            const isTeaching = schedule[`${day}-${h}`]?.some(e => e.trainerId === trainer.id);
            if (isTeaching) {
              hasClassesToday = true;
              const diff = Math.abs(i - hourIndex);
              if (diff === 1) {
                score += 100; // Adjacent shift (liền mạch)
              } else if (diff === 2) {
                score -= 50; // 1 shift gap (nghỉ 1 ca)
              } else if (diff === 3) {
                score -= 20; // 2 shift gap (nghỉ 2 ca)
              } else {
                score -= 5; // >2 shift gap
              }
            }
          }

          // Priority 4: Trainer has no other classes today (better than having a gap)
          if (!hasClassesToday) {
            score += 10; // Slightly prefer starting a new block over creating a gap
          }

          // Penalty for total classes assigned so far to balance workload
          let totalClasses = 0;
          for (const s in schedule) {
            totalClasses += schedule[s].filter(e => e.trainerId === trainer.id).length;
          }
          score -= totalClasses * 0.1;

          return { trainer, score };
        });

        // Sort by score descending
        scoredTrainers.sort((a, b) => b.score - a.score);
        
        const bestTrainer = scoredTrainers[0].trainer;
        
        schedule[slot].push({
          studentId: id,
          trainerId: bestTrainer.id
        });
      }
    }

    // Check if we met the requested sessions
    if (selectedSlots.length < sessionsPerWeek) {
      // Find suggestions (empty slots in the global schedule)
      const suggestions: string[] = [];
      const scoredSlots: { slot: string, score: number }[] = [];

      for (const day of DAYS) {
        for (const hour of HOURS) {
          const slot = `${day}-${hour}`;
          if (schedule[slot] && schedule[slot].length < slotCapacity && !selectedSlots.includes(slot)) {
            let score = 0;
            const currentStudents = schedule[slot].length;
            
            // Priority 1: Slots that already have students (to fill up PTs and pair students)
            if (currentStudents > 0) {
              score += 10;
              // Check if there's a PT with exactly 1 student
              const trainerCounts: Record<string, number> = {};
              for (const t of trainers) trainerCounts[t.id] = 0;
              for (const entry of schedule[slot]) {
                trainerCounts[entry.trainerId]++;
              }
              const hasHalfFullPT = Object.values(trainerCounts).some(c => c === 1);
              if (hasHalfFullPT) {
                score += 5; // Extra points for pairing up a single student
              }
            } else {
              score += 1; // Empty slot
            }
            
            scoredSlots.push({ slot, score });
          }
        }
      }

      // Sort by score descending
      scoredSlots.sort((a, b) => b.score - a.score);
      
      // Take top 6 suggestions
      suggestions.push(...scoredSlots.slice(0, 6).map(s => s.slot));

      warnings.push({
        studentId: id,
        scheduled: selectedSlots.length,
        requested: sessionsPerWeek,
        suggestions
      });
    }
  }

  return { schedule, warnings };
}
