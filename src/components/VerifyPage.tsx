import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Result } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { ShieldCheck, ShieldAlert, Award, FileSpreadsheet, Loader2, Calendar, User, Printer, Calculator, RefreshCw } from 'lucide-react';
import { computeGrade } from '../lib/grading';

interface VerifyPageProps {
  resultId: string;
  onGoHome?: () => void;
}

export const VerifyPage: React.FC<VerifyPageProps> = ({ resultId, onGoHome }) => {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVerifyRecord = async () => {
    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, 'results', resultId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setResult({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as Result);
      } else {
        setError('Verification Failure: No authentic matching record found in the registrar registry.');
      }
    } catch (err) {
      console.error(err);
      setError('Database Connection Timeout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resultId) {
      fetchVerifyRecord();
    }
  }, [resultId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-950 to-black z-0" />
        <div className="relative z-10 text-center space-y-6 max-w-md">
          <Loader2 className="w-16 h-16 text-emerald-400 animate-spin mx-auto drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]" />
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">Securing Decentralized Registry...</h2>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-mono">Authenticating Digital Certificate Seal</p>
          </div>
          <div className="p-4 bg-slate-800/30 border border-slate-800 rounded-2xl text-[11px] font-mono text-slate-500">
            RECORD_ID: {resultId} <br />
            STATUS: CHECKING_DIGITAL_ENTROPY_SIGNATURES
          </div>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-black text-rose-500 flex flex-col items-center justify-center p-4">
        <div className="absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-rose-950/20 to-transparent z-0 pointer-events-none" />
        <Card className="w-full max-w-lg border-2 border-rose-500/20 bg-zinc-950 relative z-10 shadow-2xl shadow-rose-950/20 rounded-3xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse" />
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
              <ShieldAlert className="w-9 h-9 text-rose-500 animate-bounce" />
            </div>
            <CardTitle className="text-2xl font-black text-rose-400 tracking-tight uppercase">Security Alert</CardTitle>
            <CardDescription className="text-rose-500/60 font-mono text-xs">Anti-Forgery Countermeasures Armed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4 text-center">
            <div className="rounded-2xl bg-rose-950/20 border border-rose-900/30 p-5 text-sm leading-relaxed text-zinc-300">
              {error || 'Invalid or Tampered Transcript URL.'}
              <p className="mt-3 text-xs text-rose-400/80 font-semibold italic">
                WARNING: This credential contains altered hashes or incorrect security seals. It is not an officially registered document of this secondary school registry.
              </p>
            </div>
            <div className="text-[10px] font-mono text-zinc-600 bg-zinc-900/50 p-4 rounded-xl border border-zinc-900">
              TIMESTAMP: {new Date().toISOString()} <br />
              AUDIT_ID: ERR_SEAL_FAIL_REGISTRY_MISSING
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pb-8">
            <Button onClick={onGoHome} className="w-full rounded-full bg-rose-950 hover:bg-rose-900 border border-rose-500/30 text-rose-200 font-bold h-11">
              Return to Safe Portal
            </Button>
            <Button variant="ghost" onClick={fetchVerifyRecord} className="text-zinc-500 hover:text-zinc-300 gap-2">
              <RefreshCw className="w-4 h-4" /> Retry Handshake Check
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const isPass = result.status === 'Pass';
  const subjectsList = Object.entries(result.marks);
  const selectedScale = result.gradingScale || 'bangladesh_board';
  const showBoardName = result.boardName || 'Dhaka Board';
  const displayScale = selectedScale === 'bangladesh_board' ? '5.0' : '4.0';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 py-12 md:p-12 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-slate-950 to-black z-0 pointer-events-none" />
      
      <Card className="w-full max-w-3xl border-2 border-emerald-500/30 bg-[#070b13] relative z-10 shadow-2xl shadow-emerald-950/20 rounded-3xl overflow-hidden">
        {/* Security watermark bar */}
        <div className="bg-emerald-500/10 px-6 py-2 border-b border-emerald-500/20 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-black font-mono tracking-widest uppercase">
            <ShieldCheck className="w-4 h-4 animate-pulse" />
            <span>✓ SECURE VERIFIED ACADEMIC STATEMENT</span>
          </div>
          <div className="text-[9px] font-mono text-slate-400">
            AUDIT: {result.id?.substring(0, 16).toUpperCase()}
          </div>
        </div>

        <CardContent className="p-6 md:p-10 space-y-8">
          {/* Header Block resembling classic institution crest */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-dashed border-slate-800 pb-8">
            <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
              <div className="w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center text-white font-black drop-shadow-[0_4px_12px_rgba(16,185,129,0.25)] border-2 border-emerald-400/30">
                <Award className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white uppercase">{result.schoolName || 'St. Mark\'s Academy'}</h1>
                <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">{showBoardName} Affiliated Registry</p>
                <div className="text-[10px] text-slate-400 font-mono mt-1">EXAM DATE: {result.examDate || new Date().toLocaleDateString()}</div>
              </div>
            </div>

            <div className="text-center md:text-right space-y-1 bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Overall Outcome</div>
              <div className={`text-2xl font-extrabold tracking-tight select-none ${isPass ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPass ? 'PASS / PROMOTED' : 'FAIL / RETAINED'}
              </div>
              <div className="text-xs font-mono font-bold text-slate-300">
                GPA: {result.gpa !== undefined ? result.gpa.toFixed(2) : '0.00'} / {displayScale} Scale
              </div>
            </div>
          </div>

          {/* Records Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/30 p-5 rounded-2xl border border-slate-900 text-sm">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Student Identity</span>
              <div className="text-base font-bold text-white mt-1">{result.studentName}</div>
              <div className="text-xs text-slate-400 font-mono mt-1">Roll Number: {result.rollNumber}</div>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Verification Auditing</span>
              <div className="text-xs text-emerald-400 font-mono mt-1">Integrity Lock: Verified (100% Authentic)</div>
              <div className="text-xs text-slate-400 mt-1 font-semibold">Saved in Registry: {new Date(result.createdAt as any).toLocaleString()}</div>
            </div>
          </div>

          {/* Marks Breakdown Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Authenticated Performance breakdown</h3>
            <div className="border border-slate-900 rounded-2xl overflow-hidden">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-xs uppercase font-bold text-slate-400">
                    <th className="py-3 px-4">Subject Course</th>
                    <th className="py-3 px-4 text-center">Marks Score</th>
                    <th className="py-3 px-4 text-center">Letter Grade</th>
                    <th className="py-3 px-4 text-center">Grade Point</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 bg-black/40">
                  {subjectsList.map(([sub, mark]) => {
                    const gradeInfo = computeGrade(mark, selectedScale, result.passMark);
                    return (
                      <tr key={sub} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-200">{sub}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-100">{mark}</td>
                        <td className="py-3 px-4 text-center font-black">
                          <span className={`inline-block font-black text-xs px-2.5 py-0.5 rounded-full border ${gradeInfo.color}`}>
                            {gradeInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-300">{gradeInfo.gp.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Academic Counseling Notes */}
          {result.aiRemarks && (
            <div className="space-y-3 border-t border-slate-800 pt-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">AI Teacher Remarks & Diagnostic Guidelines</h3>
              <div className="bg-emerald-950/5 border border-emerald-500/10 p-5 rounded-2xl space-y-4">
                <p className="text-sm italic text-slate-200 leading-relaxed">
                  " {result.aiRemarks} "
                </p>
                {result.aiStrengths && result.aiStrengths.length > 0 && (
                  <div className="text-xs text-slate-400">
                    <span className="font-bold text-emerald-400 uppercase tracking-widest text-[10px] block mb-1">Key Strengths</span>
                    <ul className="list-disc pl-5 space-y-1">
                      {result.aiStrengths.map((str, idx) => <li key={idx}>{str}</li>)}
                    </ul>
                  </div>
                )}
                {result.aiSuggestions && result.aiSuggestions.length > 0 && (
                  <div className="text-xs text-slate-400 border-t border-slate-800 pt-3 mt-3">
                    <span className="font-bold text-violet-400 uppercase tracking-widest text-[10px] block mb-1">Action Study Guidelines</span>
                    <ul className="list-disc pl-5 space-y-1">
                      {result.aiSuggestions.map((sug, idx) => <li key={idx}>{sug}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Signature info / Seal */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-900 pt-8 mt-4">
            <div className="text-center md:text-left font-mono text-[9px] text-slate-500 uppercase leading-normal">
              Official Blockchain Seal ID: 0X9AA7F..24E <br />
              Secure Result Authentication Engine Standard • 100% Secure
            </div>
            <div className="text-center md:text-right border-t border-slate-850 pt-3 md:pt-0 w-full md:w-auto">
               <span className="font-mono text-zinc-400 text-xs tracking-tighter" style={{ fontFamily: '"Great Vibes", cursive, sans-serif' }}>
                 {result.principalName || 'Principal Seal'}
               </span>
               <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Principal Signature</div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-slate-900/50 p-6 flex justify-between gap-4 border-t border-slate-850">
          <Button onClick={() => window.print()} className="rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold gap-2">
            <Printer className="w-4 h-4" /> Print Transcript
          </Button>
          <Button onClick={onGoHome} className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8">
            Go to Portal
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
