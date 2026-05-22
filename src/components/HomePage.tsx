import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Student } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Plus, Search, User, BookOpen, Upload, LogIn, Filter, SortAsc, SortDesc } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { motion, AnimatePresence } from 'motion/react';

interface HomeProps {
  onSelectStudent: (student: Student) => void;
}

export const HomePage: React.FC<HomeProps> = ({ onSelectStudent }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRoll, setNewRoll] = useState('');
  const [newName, setNewName] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [newParentEmail, setNewParentEmail] = useState('');
  const [batchText, setBatchText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const q = query(collection(db, 'students'));
      const querySnapshot = await getDocs(q);
      const studentList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      setStudents(studentList);
      
      // Seed if empty
      if (studentList.length === 0) {
        const initial = [
          { rollNumber: '101', name: 'John Doe', parentPhone: '01700000101', parentEmail: 'doe@parent.com' },
          { rollNumber: '102', name: 'Jane Smith', parentPhone: '01700000102', parentEmail: 'smith@parent.com' },
          { rollNumber: '103', name: 'Alice Johnson', parentPhone: '01700000103', parentEmail: 'johnson@parent.com' },
          { rollNumber: '104', name: 'Bob Wilson', parentPhone: '01700000104', parentEmail: 'wilson@parent.com' }
        ];
        const batch = writeBatch(db);
        for (const s of initial) {
          const newDocRef = doc(collection(db, 'students'));
          batch.set(newDocRef, s);
        }
        await batch.commit();
        fetchStudents();
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoll || !newName) return;

    try {
      if (students.find(s => s.rollNumber === newRoll)) {
        toast.error('Roll number already exists');
        return;
      }

      await addDoc(collection(db, 'students'), {
        rollNumber: newRoll,
        name: newName,
        parentPhone: newParentPhone,
        parentEmail: newParentEmail
      });
      toast.success('Student added successfully');
      setNewRoll('');
      setNewName('');
      setNewParentPhone('');
      setNewParentEmail('');
      setShowAddForm(false);
      fetchStudents();
    } catch (error) {
      toast.error('Failed to add student');
    }
  };

  const handleBatchImport = async () => {
    if (!batchText.trim()) return;
    setIsImporting(true);
    
    try {
      const lines = batchText.split('\n').filter(l => l.trim().includes(','));
      if (lines.length === 0) {
        toast.error('Invalid format. Use: Roll, Name');
        return;
      }

      const batch = writeBatch(db);
      let count = 0;
      
      for (const line of lines) {
        const [roll, name, phone, email] = line.split(',').map(s => s.trim());
        if (roll && name && !students.find(s => s.rollNumber === roll)) {
          const newDocRef = doc(collection(db, 'students'));
          batch.set(newDocRef, { 
            rollNumber: roll, 
            name,
            parentPhone: phone || '',
            parentEmail: email || ''
          });
          count++;
        }
      }

      if (count > 0) {
        await batch.commit();
        toast.success(`Imported ${count} students`);
        setBatchText('');
        fetchStudents();
      } else {
        toast.error('No new students added (duplicates found)');
      }
    } catch (error) {
      toast.error('Batch import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredStudents = students
    .filter(s => s.rollNumber.includes(search) || s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const res = a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true });
      return sortOrder === 'asc' ? res : -res;
    });

  return (
    <div id="home-page" className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent italic">
            Dashboard
          </h1>
          <p className="text-muted-foreground font-medium">Select a student record to continue</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger
              render={
                <Button variant="outline" className="gap-2 rounded-full border-primary/20 hover:bg-primary/5" />
              }
            >
              <Upload className="w-4 h-4" /> Batch Import
            </DialogTrigger>
            <DialogContent className="glass sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Batch Import Students</DialogTitle>
                <DialogDescription>
                  Enter data in CSV format: <strong>Roll, Name, ParentPhone, ParentEmail</strong> (one per line)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <textarea 
                  className="w-full h-48 bg-muted/30 border rounded-xl p-4 font-mono text-xs focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="202401, Alip Sobhan, 01700000000, parent@example.com&#10;202402, John Smith, 01800000000, parent2@example.com"
                  value={batchText}
                  onChange={e => setBatchText(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button onClick={handleBatchImport} disabled={isImporting} className="rounded-full px-8">
                  {isImporting ? 'Processing...' : 'Start Import'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={() => setShowAddForm(!showAddForm)} variant={showAddForm ? 'outline' : 'default'} className="gap-2 rounded-full shadow-lg shadow-primary/20 transition-all active:scale-95">
            {showAddForm ? 'Cancel' : <><Plus className="w-4 h-4" /> Add Student</>}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="overflow-hidden"
          >
            <Card className="border-2 border-primary/20 glass overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle>Single Registration</CardTitle>
                <CardDescription>Register a specific student to the database</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddStudent} className="flex flex-col gap-4 pb-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="roll" className="text-xs uppercase font-bold text-muted-foreground">Roll Number</Label>
                      <Input id="roll" className="rounded-xl border-primary/10" value={newRoll} onChange={e => setNewRoll(e.target.value)} placeholder="e.g. 2024001" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs uppercase font-bold text-muted-foreground">Full Name</Label>
                      <Input id="name" className="rounded-xl border-primary/10" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Alip Sobhan" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs uppercase font-bold text-muted-foreground">Parent Phone</Label>
                      <Input id="phone" className="rounded-xl border-primary/10" value={newParentPhone} onChange={e => setNewParentPhone(e.target.value)} placeholder="017XXXXXXXX" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs uppercase font-bold text-muted-foreground">Parent Email</Label>
                      <Input id="email" className="rounded-xl border-primary/10" value={newParentEmail} onChange={e => setNewParentEmail(e.target.value)} placeholder="parent@mail.com" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" className="w-full md:w-auto rounded-xl px-12">Register Entry</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            className="pl-10 h-14 text-lg border-2 border-primary/5 focus:border-primary/30 transition-all rounded-2xl bg-card" 
            placeholder="Search students..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-14 w-14 rounded-2xl border-primary/5"
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
        >
          {sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-28 bg-muted/40 animate-pulse rounded-2xl border-2 border-transparent" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredStudents.map((student, idx) => (
              <motion.div
                key={student.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
              >
                <Card 
                  className="card-hover group border-2 border-transparent relative overflow-hidden" 
                  onClick={() => onSelectStudent(student)}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />
                  <CardHeader className="flex flex-row items-center gap-4 py-6">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xl group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
                      {student.rollNumber.slice(-2)}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{student.name}</CardTitle>
                      <CardDescription className="font-mono text-xs">ID: {student.rollNumber}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardFooter className="pb-6 pt-0 flex justify-between items-center">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> Record File
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-primary font-bold text-xs">
                      OPEN &rarr;
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredStudents.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-20 text-center space-y-4 border-2 border-dashed rounded-3xl"
            >
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-muted-secondary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">No Records Found</h3>
                <p className="text-muted-foreground">Try searching with a different criteria</p>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};
