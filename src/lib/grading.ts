export interface GradingScale {
  id: string;
  name: string;
  scale: number;
}

export const GRADING_SYSTEMS: GradingScale[] = [
  { id: 'bangladesh_board', name: 'Bangladesh Board (SSC/HSC - GPA 5.0)', scale: 5.0 },
  { id: 'university', name: 'Standard university (GPA 4.0)', scale: 4.0 },
  { id: 'cambridge', name: 'Cambridge O/A Level (A* to U)', scale: 4.0 } // Scale represents grade points value
];

export const BANGLADESH_BOARDS = [
  'Dhaka Board',
  'Rajshahi Board',
  'Chittagong Board',
  'Comilla Board',
  'Jessore Board',
  'Sylhet Board',
  'Barisal Board',
  'Dinajpur Board',
  'Mymensingh Board',
  'Madrasah Board',
  'Technical Board'
];

export interface GradePointResult {
  label: string;
  gp: number;
  color: string;
}

export function computeGrade(mark: number, system: string, passMark: number = 33): GradePointResult {
  if (system === 'bangladesh_board') {
    if (mark < passMark) {
      return { label: 'F', gp: 0.0, color: 'text-red-600 bg-red-500/10 border-red-500/20' };
    }
    if (mark >= 80) {
      return { label: 'A+', gp: 5.0, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 font-black' };
    }
    if (mark >= 70) {
      return { label: 'A', gp: 4.0, color: 'text-teal-600 bg-teal-500/10 border-teal-500/20 font-bold' };
    }
    if (mark >= 60) {
      return { label: 'A-', gp: 3.5, color: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/20' };
    }
    if (mark >= 50) {
      return { label: 'B', gp: 3.0, color: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20' };
    }
    if (mark >= 40) {
      return { label: 'C', gp: 2.0, color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' };
    }
    return { label: 'D', gp: 1.0, color: 'text-orange-600 bg-orange-500/10 border-orange-500/20' };
  }

  if (system === 'cambridge') {
    if (mark >= 90) {
      return { label: 'A*', gp: 4.0, color: 'text-violet-600 bg-violet-500/10 border-violet-500/20 font-black' };
    }
    if (mark >= 80) {
      return { label: 'A', gp: 4.0, color: 'text-fuchsia-600 bg-fuchsia-500/10 border-fuchsia-500/20 font-bold' };
    }
    if (mark >= 75) {
      return { label: 'B', gp: 3.5, color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' };
    }
    if (mark >= 65) {
      return { label: 'C', gp: 3.0, color: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20' };
    }
    if (mark >= 50) {
      return { label: 'D', gp: 2.0, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' };
    }
    if (mark >= 40) {
      return { label: 'E', gp: 1.0, color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20' };
    }
    return { label: 'U', gp: 0.0, color: 'text-red-600 bg-red-500/10 border-red-500/20 font-bold' };
  }

  // University Scale (GPA 4.0)
  if (mark < passMark) {
    return { label: 'F', gp: 0.0, color: 'text-red-600 bg-red-500/10 border-red-500/20' };
  }
  if (mark >= 80) {
    return { label: 'A+', gp: 4.0, color: 'text-violet-600 bg-violet-500/10 border-violet-500/20 font-black' };
  }
  if (mark >= 75) {
    return { label: 'A', gp: 3.75, color: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20 font-bold' };
  }
  if (mark >= 70) {
    return { label: 'A-', gp: 3.5, color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' };
  }
  if (mark >= 65) {
    return { label: 'B+', gp: 3.25, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' };
  }
  if (mark >= 60) {
    return { label: 'B', gp: 3.0, color: 'text-green-600 bg-green-500/10 border-green-500/20' };
  }
  if (mark >= 55) {
    return { label: 'B-', gp: 2.75, color: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/20' };
  }
  if (mark >= 50) {
    return { label: 'C+', gp: 2.5, color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20' };
  }
  if (mark >= 45) {
    return { label: 'C', gp: 2.25, color: 'text-orange-600 bg-orange-500/10 border-orange-500/20' };
  }
  return { label: 'D', gp: 2.0, color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' };
}

export function calculateSummary(
  marks: Record<string, number>,
  selectedSubjects: string[],
  system: string,
  passMark: number = 33,
  subjectCredits: Record<string, number> = {}
) {
  let totalMarks = 0;
  let totalCredits = 0;
  let weightedGPAsum = 0;
  let activeCount = 0;
  let hasFail = false;

  selectedSubjects.forEach(sub => {
    const mark = marks[sub] ?? 0;
    const credits = subjectCredits[sub] ?? 3;
    const gradeRes = computeGrade(mark, system, passMark);
    
    totalMarks += mark;
    totalCredits += credits;
    weightedGPAsum += gradeRes.gp * credits;
    activeCount++;

    if (gradeRes.label === 'F' || gradeRes.label === 'U') {
      hasFail = true;
    }
  });

  const average = activeCount ? totalMarks / activeCount : 0;
  
  let gpa = totalCredits > 0 ? weightedGPAsum / totalCredits : 0.0;
  
  // Rule for Bangladesh Board SSC/HSC: If any subject is F, raw GPA is immediately 0.00
  if (system === 'bangladesh_board' && hasFail) {
    gpa = 0.00;
  }
  
  const isPass = activeCount > 0 && !hasFail;

  return { total: totalMarks, average, isPass, gpa, totalCredits };
}
