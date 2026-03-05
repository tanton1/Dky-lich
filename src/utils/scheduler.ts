import { Student, Trainer, Schedule, Warning, SchedulerResult, DAYS, HOURS } from '../types';

function getDayIndex(day: string): number {
  return DAYS.indexOf(day as any);
}

const MAX_STUDENTS_PER_PT = 2;

export function generateSchedule(students: Student[], trainers: Trainer[]): SchedulerResult {
  const schedule: Schedule = {};
  const warnings: Warning[] = [];

  if (trainers.length === 0) return { schedule, warnings };

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

  const studentNeeds: Record<string, number> = {};
  const studentScheduledDays: Record<string, Set<string>> = {};
  const studentScheduledSlots: Record<string, string[]> = {};

  for (const s of sortedStudents) {
    studentNeeds[s.id] = s.sessionsPerWeek;
    studentScheduledDays[s.id] = new Set();
    studentScheduledSlots[s.id] = [];
  }

  // Multi-pass scheduling: Fill PT1 completely first, then move to PT2, etc.
  for (let i = 0; i < trainers.length; i++) {
    const trainer = trainers[i];
    const isPT2AndBeyond = i >= 1; // PT2, PT3... only work from 10h onwards

    for (const student of sortedStudents) {
      if (studentNeeds[student.id] > 0) {
        scheduleStudentWithTrainer(
          student, 
          trainer, 
          isPT2AndBeyond, 
          schedule, 
          studentNeeds, 
          studentScheduledDays, 
          studentScheduledSlots
        );
      }
    }
  }

  // Generate warnings for students who couldn't get their full requested sessions
  for (const student of sortedStudents) {
    const needed = studentNeeds[student.id];
    if (needed > 0) {
      const scheduled = student.sessionsPerWeek - needed;
      const suggestions = getSuggestions(student, schedule, trainers, studentScheduledSlots[student.id]);
      warnings.push({
        studentId: student.id,
        scheduled,
        requested: student.sessionsPerWeek,
        suggestions
      });
    }
  }

  return { schedule, warnings };
}

function scheduleStudentWithTrainer(
  student: Student,
  trainer: Trainer,
  isPT2AndBeyond: boolean,
  schedule: Schedule,
  studentNeeds: Record<string, number>,
  studentScheduledDays: Record<string, Set<string>>,
  studentScheduledSlots: Record<string, string[]>
) {
  let needed = studentNeeds[student.id];
  if (needed <= 0) return;

  const scheduledDays = studentScheduledDays[student.id];
  const scheduledSlots = studentScheduledSlots[student.id];

  // Find available slots for THIS specific trainer
  const slotsByDay: Record<string, string[]> = {};
  for (const slot of student.availableSlots) {
    const [day, hourStr] = slot.split('-');
    const hour = parseInt(hourStr, 10);
    
    // Rule: PT2 and beyond only work from 10h onwards
    if (isPT2AndBeyond && hour < 10) continue; 
    
    // Rule: Max 1 session per day per student
    if (scheduledDays.has(day)) continue; 

    // Check if this trainer has capacity in this slot
    const count = schedule[slot].filter(e => e.trainerId === trainer.id).length;
    if (count < MAX_STUDENTS_PER_PT) {
      if (!slotsByDay[day]) slotsByDay[day] = [];
      slotsByDay[day].push(slot);
    }
  }

  const availableDays = Object.keys(slotsByDay).sort((a, b) => getDayIndex(a) - getDayIndex(b));
  if (availableDays.length === 0) return;

  let bestDaysCombination: string[] | null = null;
  
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

  // Try to find the best combination of days to fulfill the remaining needed sessions
  for (let k = Math.min(needed, availableDays.length); k > 0; k--) {
    const combos = findDayCombinations(availableDays, k);
    
    // Sort combos by least gap violations (prefer days that are at least 1 day apart)
    combos.sort((a, b) => {
      const getViolations = (combo: string[]) => {
        const allDays = [...Array.from(scheduledDays), ...combo].sort((d1, d2) => getDayIndex(d1) - getDayIndex(d2));
        let v = 0;
        for (let i = 1; i < allDays.length; i++) {
          if (getDayIndex(allDays[i]) - getDayIndex(allDays[i - 1]) < 2) v++;
        }
        return v;
      };
      return getViolations(a) - getViolations(b);
    });

    // Prefer combos with 0 violations
    const goodCombos = combos.filter(combo => {
      const allDays = [...Array.from(scheduledDays), ...combo].sort((d1, d2) => getDayIndex(d1) - getDayIndex(d2));
      for (let i = 1; i < allDays.length; i++) {
        if (getDayIndex(allDays[i]) - getDayIndex(allDays[i - 1]) < 2) return false;
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
      const slotsInDay = slotsByDay[day];
      let bestSlot = slotsInDay[0];
      let bestSlotScore = -99999;

      // Score each slot in the day to find the most optimal one for the trainer
      for (const slot of slotsInDay) {
        const hour = parseInt(slot.split('-')[1], 10);
        const hourIndex = HOURS.indexOf(hour);
        let slotScore = 0;
        
        const count = schedule[slot].filter(e => e.trainerId === trainer.id).length;
        if (count === 1) slotScore += 200; // Prioritize pairing students (filling a slot to 2/2)

        // Contiguous shift logic for the trainer
        let hasClassesToday = false;
        for (let i = 0; i < HOURS.length; i++) {
          if (i === hourIndex) continue;
          const h = HOURS[i];
          const isTeaching = schedule[`${day}-${h}`]?.some(e => e.trainerId === trainer.id);
          if (isTeaching) {
            hasClassesToday = true;
            const diff = Math.abs(i - hourIndex);
            if (diff === 1) slotScore += 100; // Contiguous shift (liền mạch)
            else if (diff === 2) slotScore -= 50; // 1 shift gap (nghỉ 1 ca)
            else if (diff === 3) slotScore -= 20; // 2 shift gap (nghỉ 2 ca)
            else slotScore -= 5;
          }
        }
        if (!hasClassesToday) slotScore += 10; // First class of the day is better than creating a gap

        if (slotScore > bestSlotScore) {
          bestSlotScore = slotScore;
          bestSlot = slot;
        }
      }

      // Assign the best slot
      schedule[bestSlot].push({ studentId: student.id, trainerId: trainer.id });
      scheduledDays.add(day);
      scheduledSlots.push(bestSlot);
      needed--;
    }
    studentNeeds[student.id] = needed;
  }
}

function getSuggestions(
  student: Student,
  schedule: Schedule,
  trainers: Trainer[],
  scheduledSlots: string[]
): string[] {
  const suggestions: string[] = [];
  const scoredSlots: { slot: string, score: number }[] = [];

  for (const day of DAYS) {
    for (const hour of HOURS) {
      const slot = `${day}-${hour}`;
      if (scheduledSlots.includes(slot)) continue;

      let capacity = 0;
      let hasHalfFullPT = false;
      let currentStudents = 0;

      for (let i = 0; i < trainers.length; i++) {
        const t = trainers[i];
        if (i >= 1 && hour < 10) continue; // PT2+ only works from 10h
        capacity += MAX_STUDENTS_PER_PT;
        
        const count = schedule[slot].filter(e => e.trainerId === t.id).length;
        currentStudents += count;
        if (count === 1) hasHalfFullPT = true;
      }

      if (currentStudents < capacity) {
        let score = 0;
        if (currentStudents > 0) {
          score += 10;
          if (hasHalfFullPT) score += 5;
        } else {
          score += 1;
        }
        scoredSlots.push({ slot, score });
      }
    }
  }

  scoredSlots.sort((a, b) => b.score - a.score);
  suggestions.push(...scoredSlots.slice(0, 6).map(s => s.slot));
  return suggestions;
}
