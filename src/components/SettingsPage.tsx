import React, { useState } from 'react';
import { useFirebase } from './FirebaseProvider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { PREDEFINED_SUBJECTS } from '../types';
import { toast } from 'sonner';
import { Settings as SettingsIcon, ShieldCheck, BookMarked } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, settings, updateSettings } = useFirebase();
  const [passMark, setPassMark] = useState(settings?.passMark || 33);
  const [selectedDefaultSubjects, setSelectedDefaultSubjects] = useState<string[]>(
    settings?.defaultSubjects || []
  );
  const [credits, setCredits] = useState<Record<string, number>>(() => {
    const initialCredits: Record<string, number> = {};
    PREDEFINED_SUBJECTS.forEach(sub => {
      initialCredits[sub] = 3;
    });
    return { ...initialCredits, ...(settings?.subjectCredits || {}) };
  });
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (settings) {
      setPassMark(settings.passMark);
      setSelectedDefaultSubjects(settings.defaultSubjects || []);
      const initialCredits: Record<string, number> = {};
      PREDEFINED_SUBJECTS.forEach(sub => {
        initialCredits[sub] = 3;
      });
      setCredits({ ...initialCredits, ...(settings.subjectCredits || {}) });
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        passMark,
        defaultSubjects: selectedDefaultSubjects,
        subjectCredits: credits
      });
      toast.success('Settings and Subject Credits updated');
    } catch (error) {
      toast.error('Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSubject = (sub: string) => {
    if (selectedDefaultSubjects.includes(sub)) {
      setSelectedDefaultSubjects(selectedDefaultSubjects.filter(s => s !== sub));
    } else {
      setSelectedDefaultSubjects([...selectedDefaultSubjects, sub]);
    }
  };

  const handleCreditChange = (sub: string, change: number) => {
    setCredits(prev => {
      const current = prev[sub] || 3;
      const newVal = Math.min(6, Math.max(1, current + change));
      return { ...prev, [sub]: newVal };
    });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-3xl m-6">
        <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
          <SettingsIcon className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-black italic tracking-tighter">RESTRICTED ACCESS</h2>
        <p className="text-muted-foreground mt-2 max-w-sm">Application configuration is restricted to authenticated administrators. Please login to continue.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent italic leading-[0.9]">
            System<br/>Configuration
          </h1>
          <p className="text-muted-foreground font-medium">Define global standards for evaluation & grading</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pass Mark Card */}
        <Card className="glass border-2 border-primary/5 hover:border-primary/10 transition-colors shadow-2xl shadow-primary/5">
          <CardHeader className="border-b border-dashed border-primary/5 pb-6">
            <CardTitle className="inline-flex items-center gap-2 text-xl font-black italic tracking-tighter">
              <ShieldCheck className="w-5 h-5 text-primary" /> PASSING THRESHOLD
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Global Academic Baseline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Standard Pass Score</Label>
                 <span className="text-3xl font-black italic text-primary">{passMark}%</span>
              </div>
              <Input 
                type="range" 
                value={passMark} 
                onChange={e => setPassMark(parseInt(e.target.value) || 0)} 
                min="0" 
                max="100"
                className="h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
              />
              <div className="grid grid-cols-5 text-[10px] font-black text-muted-foreground/30 px-1">
                 <span>0</span>
                 <span>25</span>
                 <span className="text-center">50</span>
                 <span className="text-center">75</span>
                 <span className="text-right">100</span>
              </div>
              <div className="p-4 bg-primary/[0.03] border border-primary/5 rounded-2xl flex items-start gap-3">
                 <div className="w-2 h-2 rounded-full bg-primary mt-1" />
                 <p className="text-xs text-muted-foreground leading-relaxed"> Results with subjects below <span className="font-bold text-foreground">{passMark}%</span> will be flagged as <span className="font-bold text-destructive italic underline">FAILED</span> automatically.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default Subjects Card */}
        <Card className="glass border-2 border-primary/5 hover:border-primary/10 transition-colors shadow-2xl shadow-primary/5">
          <CardHeader className="border-b border-dashed border-primary/5 pb-6">
            <CardTitle className="inline-flex items-center gap-2 text-xl font-black italic tracking-tighter">
              <BookMarked className="w-5 h-5 text-primary" /> DEFAULT CURRICULUM
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Auto-populated Coursework</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-3 scrollbar-custom">
              {PREDEFINED_SUBJECTS.map(sub => (
                <label 
                  key={sub} 
                  className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all border ${
                    selectedDefaultSubjects.includes(sub) 
                    ? 'bg-primary/5 border-primary/20 shadow-sm' 
                    : 'bg-muted/20 border-transparent hover:bg-muted/40'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedDefaultSubjects.includes(sub) 
                    ? 'bg-primary border-primary' 
                    : 'border-muted-foreground/30'
                  }`}>
                    {selectedDefaultSubjects.includes(sub) && <ShieldCheck className="w-3 h-3 text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    checked={selectedDefaultSubjects.includes(sub)} 
                    onChange={() => toggleSubject(sub)}
                    className="hidden"
                  />
                  <span className={`text-sm font-bold tracking-tight ${selectedDefaultSubjects.includes(sub) ? 'text-primary' : 'text-muted-foreground'}`}>{sub}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Credit Settings Card */}
      <Card className="glass border-2 border-primary/5 hover:border-primary/10 transition-colors shadow-2xl shadow-primary/5">
        <CardHeader className="border-b border-dashed border-primary/5 pb-6">
          <CardTitle className="inline-flex items-center gap-2 text-xl font-black italic tracking-tighter">
            <BookMarked className="w-5 h-5 text-primary" /> SUBJECT CREDIT HOURS
          </CardTitle>
          <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
            Define specific academic credit weights for GPA computation
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[380px] overflow-y-auto pr-3 scrollbar-none">
            {PREDEFINED_SUBJECTS.map(sub => {
              const isSelected = selectedDefaultSubjects.includes(sub);
              return (
                <div 
                  key={sub} 
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isSelected 
                      ? 'bg-primary/5 border-primary/20 shadow-sm' 
                      : 'bg-muted/20 border-transparent hover:bg-muted/30 opacity-80'
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className={`text-sm font-bold tracking-tight truncate ${isSelected ? 'text-primary' : 'text-foreground/80'}`}>
                      {sub}
                    </span>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black font-mono">
                      {isSelected ? 'Default Course' : 'Optional'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg border border-primary/5 hover:bg-primary/10"
                      onClick={() => handleCreditChange(sub, -1)}
                    >
                      -
                    </Button>
                    <span className="w-6 text-center text-sm font-black font-mono text-primary">
                      {credits[sub] || 3}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg border border-primary/5 hover:bg-primary/10"
                      onClick={() => handleCreditChange(sub, 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={isSaving} className="rounded-full shadow-2xl shadow-primary/30 h-14 px-12 text-sm font-black italic tracking-tight gap-2">
           {isSaving ? 'UPDATING...' : 'COMMIT CHANGES'}
        </Button>
      </div>
    </div>
  );
};
