import React, { useState } from 'react';
import { useFirebase } from './components/FirebaseProvider';
import { useTheme } from './components/ThemeProvider';
import { HomePage } from './components/HomePage';
import { ResultPage } from './components/ResultPage';
import { HistoryPage } from './components/HistoryPage';
import { SettingsPage } from './components/SettingsPage';
import { VerifyPage } from './components/VerifyPage';
import QuestionMakerPage from './components/QuestionMakerPage';
import { Student } from './types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { Home, History, Settings as SettingsIcon, LogIn, LogOut, User as UserIcon, Calculator, Sun, Moon, Laptop, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './components/ui/dropdown-menu';

export default function App() {
  const { user, loading, login, logout } = useFirebase();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [verifyId, setVerifyId] = useState<string | null>(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    return params.get('verify') || null;
  });

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setActiveTab('manage');
  };

  const clearSelection = () => {
    setSelectedStudent(null);
    setActiveTab('home');
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center flex-col gap-4 bg-background">
        <Calculator className="w-16 h-16 text-primary animate-bounce p-3 bg-primary/10 rounded-2xl" />
        <p className="text-muted-foreground animate-pulse font-bold tracking-tight">Smart Result Manager</p>
      </div>
    );
  }

  if (verifyId) {
    return (
      <VerifyPage
        resultId={verifyId}
        onGoHome={() => {
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname);
          }
          setVerifyId(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 md:pb-0 md:pt-16 selection:bg-primary selection:text-primary-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b glass z-40 hidden md:flex items-center px-6">
        <div className="flex items-center gap-3 font-black text-xl tracking-tighter cursor-pointer" onClick={clearSelection}>
          <div className="p-1.5 bg-primary rounded-lg text-primary-foreground">
            <Calculator className="w-5 h-5" />
          </div>
          <span>SMART RESULT</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="rounded-full" />
              }
            >
              {theme === 'light' ? <Sun className="w-5 h-5" /> : theme === 'dark' ? <Moon className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass">
              <DropdownMenuItem onClick={() => setTheme('light')} className="gap-2"><Sun className="w-4 h-4" /> Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')} className="gap-2"><Moon className="w-4 h-4" /> Dark</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')} className="gap-2"><Laptop className="w-4 h-4" /> System</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <div className="flex items-center gap-3 pl-3 border-l ml-1">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold leading-none">{user.displayName}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{user.email}</p>
              </div>
              <Button variant="secondary" size="icon" className="rounded-full h-8 w-8" onClick={() => logout()}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={login} className="gap-2 shadow-lg shadow-primary/20 rounded-full px-6">
              <LogIn className="w-4 h-4" /> Login
            </Button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <HomePage onSelectStudent={handleSelectStudent} />
            </motion.div>
          )}

          {activeTab === 'manage' && selectedStudent && (
            <motion.div
              key="manage"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
            >
              <ResultPage student={selectedStudent} onBack={clearSelection} />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <HistoryPage />
            </motion.div>
          )}

          {activeTab === 'questions' && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <QuestionMakerPage />
            </motion.div>
          )}

          {(activeTab === 'settings' || activeTab === 'account') && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <SettingsPage />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 glass flex items-center justify-around z-50 md:hidden px-4 pb-4 pt-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className={`flex-col h-full flex-1 rounded-2xl gap-1 px-1 transition-all ${activeTab === 'home' ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}
          onClick={() => { setActiveTab('home'); setSelectedStudent(null); }}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Home</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`flex-col h-full flex-1 rounded-2xl gap-1 px-1 transition-all ${activeTab === 'history' ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('history')}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">History</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`flex-col h-full flex-1 rounded-2xl gap-1 px-1 transition-all ${activeTab === 'questions' ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('questions')}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Questions</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`flex-col h-full flex-1 rounded-2xl gap-1 px-1 transition-all ${activeTab === 'settings' ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('settings')}
        >
          <SettingsIcon className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Settings</span>
        </Button>
      </nav>

      {/* Desktop Sidebar Navigation */}
      <nav className="fixed left-0 top-16 bottom-0 w-20 border-r glass hidden md:flex flex-col items-center py-8 gap-8 z-40">
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-12 w-12 rounded-2xl transition-all ${activeTab === 'home' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-muted-foreground'}`}
          onClick={() => { setActiveTab('home'); setSelectedStudent(null); }}
        >
          <Home className="w-5 h-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-12 w-12 rounded-2xl transition-all ${activeTab === 'history' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-muted-foreground'}`}
          onClick={() => setActiveTab('history')}
        >
          <History className="w-5 h-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-12 w-12 rounded-2xl transition-all ${activeTab === 'questions' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-muted-foreground'}`}
          onClick={() => setActiveTab('questions')}
        >
          <BookOpen className="w-5 h-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-12 w-12 rounded-2xl transition-all ${activeTab === 'settings' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-muted-foreground'}`}
          onClick={() => setActiveTab('settings')}
        >
          <SettingsIcon className="w-5 h-5" />
        </Button>
        
        <div className="mt-auto pb-4">
           {user ? (
             <Button variant="ghost" size="icon" className="rounded-full text-destructive hover:bg-destructive/10" onClick={() => logout()}>
               <LogOut className="w-5 h-5" />
             </Button>
           ) : (
             <Button variant="ghost" size="icon" className="rounded-full text-primary hover:bg-primary/10" onClick={login}>
               <LogIn className="w-5 h-5" />
             </Button>
           )}
        </div>
      </nav>
    </div>
  );
}
