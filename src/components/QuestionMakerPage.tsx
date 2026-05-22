import React, { useState, useEffect } from "react";
import { useFirebase } from "./FirebaseProvider";
import { QuestionPaper, MCQQuestion, CQQuestion, ShortQuestion } from "../types";
import { 
  db, 
  auth 
} from "../lib/firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";
import { 
  BookOpen, 
  Brain, 
  Sparkles, 
  HelpCircle, 
  FileText, 
  Globe, 
  Download, 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2, 
  History, 
  Clock, 
  Plus, 
  Check, 
  Layers, 
  Wifi, 
  WifiOff, 
  Save, 
  AlertTriangle,
  FileDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

// Translations for Bangla and English interface
const TRANSLATIONS = {
  English: {
    title: "AI Question Paper Generator",
    subtitle: "Create high-quality exam papers in seconds with AI or completely offline.",
    subject: "Subject",
    subjects: {
      Math: "Mathematics",
      English: "English Language",
      Science: "General Science"
    },
    difficulty: "Difficulty Level",
    difficulties: {
      Easy: "Easy",
      Medium: "Medium",
      Hard: "Hard"
    },
    qType: "Question Format",
    qTypes: {
      MCQ: "Multiple Choice Questions (MCQ)",
      CQ: "Creative Questions (সৃজনশীল CQ)",
      Short: "Short Answer Questions"
    },
    lang: "Paper Language",
    languages: {
      Bangla: "Bangla (বাংলা)",
      English: "English"
    },
    topicName: "Specific Topic / Chapter (Optional)",
    topicPlaceholder: "e.g., Algebra, Photosynthesis, Tense...",
    generateBtn: "AI Auto-Generate Question Paper",
    generating: "AI generating exam paper...",
    timerOption: "Set Exam Countdown Timer",
    duration: "Timer Duration (Minutes)",
    saveBtn: "Save Paper to Cloud",
    history: "Your Generated Papers",
    noHistory: "No papers saved yet. Generate or create one!",
    offlineMode: "Offline Workspace",
    offlineActive: "Local Editor Active (Basic Features)",
    onlineActive: "Cloud Synchronized",
    manualAdd: "Manually Design Question",
    enterTitle: "Question Paper Title",
    unnamed: "Untitled Exam",
    addQ: "Add Question Item",
    clear: "Clear Workspace",
    timeRemaining: "Time Remaining",
    minutes: "min",
    printBtn: "Export & Print (PDF)",
    correctAns: "Correct Choice",
    sampleAns: "Target Answer",
    scenario: "Scenario/Stimulus (উদ্দীপক)",
    subQs: "Sub-questions",
    deleteSuccess: "Question paper deleted successfully.",
    saveSuccess: "Saved to your academic archive.",
    offlineSaveSuccess: "Saved locally (Offline Mode).",
    genSuccess: "Exam paper generated successfully by Gemini!",
    genError: "Could not generate questions. Using local creator.",
    unauthenticatedError: "Please login with Google to unlock Cloud archive saves.",
  },
  Bangla: {
    title: "এআই প্রশ্ন সংকলক",
    subtitle: "এআই দিয়ে বা অফলাইনে মুহূর্তের মধ্যে আকর্ষণীয় পরীক্ষার প্রশ্নপত্র তৈরি করুন।",
    subject: "বিষয় নির্বাচন",
    subjects: {
      Math: "গণিত",
      English: "ইংরেজি",
      Science: "বিজ্ঞান"
    },
    difficulty: "কাঠিন্য স্তর",
    difficulties: {
      Easy: "সহজ (Easy)",
      Medium: "মধ্যম (Medium)",
      Hard: "কঠিন (Hard)"
    },
    qType: "প্রশ্নের ধরন",
    qTypes: {
      MCQ: "বহুনির্বাচনী প্রশ্ন (MCQ)",
      CQ: "সৃজনশীল প্রশ্ন (CQ)",
      Short: "সংক্ষিপ্ত বা এক কথায় উত্তর"
    },
    lang: "প্রশ্নের ভাষা",
    languages: {
      Bangla: "বাংলা",
      English: "English"
    },
    topicName: "নির্দিষ্ট অধ্যায় বা টপিক (ঐচ্ছিক)",
    topicPlaceholder: "যেমন: বীজগণিত, সালোকসংশ্লেষণ, Tense...",
    generateBtn: "এআই দিয়ে স্বয়ংক্রিয় প্রশ্নপত্র তৈরি করুন",
    generating: "প্রশ্নপত্র তৈরি হচ্ছে, অপেক্ষা করুন...",
    timerOption: "পরীক্ষার জন্য সময়সীমা (Timer) নির্ধারণ করুন",
    duration: "সময়কাল (মিনিট)",
    saveBtn: "ক্লাউডে সংরক্ষণ করুন",
    history: "আপনার সংরক্ষিত প্রশ্নপত্রসমূহ",
    noHistory: "এখনো কোনো প্রশ্নপত্র তৈরি করা হয়নি। নতুন একটি তৈরি করুন!",
    offlineMode: "অফলাইন মোড",
    offlineActive: "অফলাইন এডিটর সক্রিয় (বেসিক ফিচারস)",
    onlineActive: "ক্লাউড সিঙ্ক সক্রিয় রয়েছে",
    manualAdd: "নিজে প্রশ্ন ক্রিয়েট করুন",
    enterTitle: "প্রশ্নপত্রের শিরোনাম (Title) লিখুন",
    unnamed: "নামহীন প্রশ্নপত্র",
    addQ: "প্রশ্ন যুক্ত করুন",
    clear: "সব মুছে ফেলুন",
    timeRemaining: "বাকি সময়",
    minutes: "মিনিট",
    printBtn: "পিডিএফ প্রিন্ট করুন (PDF Export)",
    correctAns: "সঠিক উত্তর",
    sampleAns: "নমুনা উত্তর",
    scenario: "উদ্দীপক / অনুচ্ছেদ",
    subQs: "সৃজনশীল প্রশ্নসমূহ",
    deleteSuccess: "প্রশ্নপত্রটি সফলভাবে ডিলিট করা হয়েছে।",
    saveSuccess: "আপনার প্রশ্ন আর্কাইভ অ্যাকাউন্টে সেভ করা হয়েছে।",
    offlineSaveSuccess: "অফলাইনে লোকাল স্টোরেজে সেভ করা হয়েছে।",
    genSuccess: "জেমিনি এআই সফলভাবে স্ট্যান্ডার্ড প্রশ্ন তৈরি করেছে!",
    genError: "এআই প্রশ্ন জেনারেট করা যায়নি। অফলাইন মোডে তৈরি করুন।",
    unauthenticatedError: "ক্লাউড সেভ সক্রিয় করতে দয়া করে উপরে গুগল দিয়ে লগইন করুন।",
  }
};

interface FirestoreErrorInfo {
  error: string;
  operationType: string;
  path: string | null;
  authInfo: any;
}

export default function QuestionMakerPage() {
  const { user, login } = useFirebase();

  // Settings / State
  const [uiLang, setUiLang] = useState<"Bangla" | "English">("Bangla");
  const t = uiLang === "Bangla" ? TRANSLATIONS.Bangla : TRANSLATIONS.English;

  // Question Maker Params
  const [subject, setSubject] = useState<"Math" | "English" | "Science">("Math");
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>("Medium");
  const [type, setType] = useState<'MCQ' | 'CQ' | 'Short'>("MCQ");
  const [language, setLanguage] = useState<'Bangla' | 'English'>("Bangla");
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerDuration, setTimerDuration] = useState(30);

  // Connection/Network State
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Active Question Paper Workspace
  const [activePaper, setActivePaper] = useState<QuestionPaper | null>(null);

  // Manual Editor inputs
  const [manualQuestions, setManualQuestions] = useState<any[]>([]);
  const [mcqInput, setMcqInput] = useState<{ questionText: string; options: string[]; correctAnswer: string }>({
    questionText: "",
    options: ["", "", "", ""],
    correctAnswer: ""
  });
  const [cqInput, setCqInput] = useState<{ scenario: string; subQuestions: string[] }>({
    scenario: "",
    subQuestions: ["", "", "", ""]
  });
  const [shortInput, setShortInput] = useState<{ questionText: string; sampleAnswer: string }>({
    questionText: "",
    sampleAnswer: ""
  });

  // Saved Papers History from Firestore
  const [history, setHistory] = useState<QuestionPaper[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);

  // Active Countdown Timer details
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Error logging helpers
  const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified
      },
      operationType,
      path
    };
    console.error('Firestore Error Details:', JSON.stringify(errInfo));
    toast.error(`Database Error: ${errInfo.error}`);
  };

  // Timer Ticker Loop
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && remainingSeconds !== null && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (remainingSeconds === 0) {
      setIsTimerRunning(false);
      toast.info(uiLang === "Bangla" ? "সময় শেষ! আপনার পরীক্ষা শেষ দয়া করে খাতা সাবমিট করুন।" : "Time is up! Please submit your answer sheet.");
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, remainingSeconds, uiLang]);

  // Load History from Firestore or LocalStorage
  const fetchHistory = async () => {
    if (!user) {
      // offline history
      const local = localStorage.getItem("local_question_papers");
      if (local) {
        setHistory(JSON.parse(local));
      } else {
        setHistory([]);
      }
      return;
    }

    setIsHistoryLoading(true);
    const pathName = "questionPapers";
    try {
      const q = query(
        collection(db, pathName),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const papers: QuestionPaper[] = [];
      snapshot.forEach(docSnap => {
        const item = docSnap.data();
        papers.push({
          id: docSnap.id,
          userId: item.userId,
          title: item.title,
          subject: item.subject,
          difficulty: item.difficulty,
          type: item.type,
          language: item.language,
          timerEnabled: item.timerEnabled,
          timerDuration: item.timerDuration,
          questions: item.questions,
          createdAt: item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt)
        });
      });
      setHistory(papers);
    } catch (e) {
      handleFirestoreError(e, "list", pathName);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  // Trigger Gemini AI generation
  const handleAutoGenerate = async () => {
    if (isOfflineMode) {
      toast.error(uiLang === "Bangla" ? "আপনি এখন অফলাইন মোডে আছেন। স্বয়ংক্রিয় এআই এর জন্য জেনারেটর সক্রিয় করুন।" : "You are in Offline Mode. Switch to Cloud Active for Gemini API.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          difficulty,
          type,
          language,
          topic
        })
      });

      if (!res.ok) {
        const errObj = await res.json();
        throw new Error(errObj.error || "Generation endpoint returned status " + res.status);
      }

      const rawResult = await res.json();
      
      const newPaper: QuestionPaper = {
        userId: user?.uid || "anonymous",
        title: rawResult.title || title || `${t.subjects[subject]} - ${t.difficulties[difficulty]} (${t.qTypes[type]})`,
        subject,
        difficulty,
        type,
        language,
        timerEnabled,
        timerDuration,
        questions: rawResult.questions || [],
        createdAt: new Date()
      };

      setActivePaper(newPaper);
      setManualQuestions(rawResult.questions || []);
      
      // Stop any running timer and setup new timer if checked
      setIsTimerRunning(false);
      if (timerEnabled) {
        setRemainingSeconds(timerDuration * 60);
      } else {
        setRemainingSeconds(null);
      }

      toast.success(t.genSuccess);
    } catch (err: any) {
      console.error(err);
      toast.error(`${t.genError}: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Cloud Save or Offline Save
  const handleSaveToMyArchive = async () => {
    if (!activePaper) {
      toast.error(uiLang === "Bangla" ? "সংরক্ষণ করার মত কোনো কোশ্চেন পেপার নেই!" : "No question paper active to save!");
      return;
    }

    const currentPaper = {
      ...activePaper,
      title: title || activePaper.title || t.unnamed,
      questions: manualQuestions,
      timerEnabled,
      timerDuration
    };

    if (!user) {
      // Local Save
      const local = localStorage.getItem("local_question_papers");
      const currentList: QuestionPaper[] = local ? JSON.parse(local) : [];
      const updatedList = [
        { ...currentPaper, id: "local_" + Date.now(), createdAt: new Date() },
        ...currentList
      ];
      localStorage.setItem("local_question_papers", JSON.stringify(updatedList));
      setHistory(updatedList);
      toast.success(t.offlineSaveSuccess);
      return;
    }

    // Cloud Save to Firestore
    const pathName = "questionPapers";
    try {
      const docPayload = {
        userId: user.uid,
        title: currentPaper.title,
        subject: currentPaper.subject,
        difficulty: currentPaper.difficulty,
        type: currentPaper.type,
        language: currentPaper.language,
        timerEnabled: currentPaper.timerEnabled,
        timerDuration: currentPaper.timerDuration,
        questions: currentPaper.questions,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, pathName), docPayload);
      toast.success(t.saveSuccess);
      fetchHistory();
    } catch (e) {
      handleFirestoreError(e, "create", pathName);
    }
  };

  // Delete Paper
  const handleDeletePaper = async (id: string) => {
    if (!user || id.startsWith("local_")) {
      const local = localStorage.getItem("local_question_papers");
      if (local) {
        const currentList: QuestionPaper[] = JSON.parse(local);
        const filtered = currentList.filter(p => p.id !== id);
        localStorage.setItem("local_question_papers", JSON.stringify(filtered));
        setHistory(filtered);
        setSelectedPaperIds(prev => prev.filter(item => item !== id));
        toast.success(t.deleteSuccess);
      }
      return;
    }

    const pathName = `questionPapers/${id}`;
    try {
      await deleteDoc(doc(db, "questionPapers", id));
      toast.success(t.deleteSuccess);
      setSelectedPaperIds(prev => prev.filter(item => item !== id));
      fetchHistory();
    } catch (e) {
      handleFirestoreError(e, "delete", pathName);
    }
  };

  // Toggle individual paper selection
  const handleToggleSelectPaper = (id: string) => {
    setSelectedPaperIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Toggle select all papers in the history
  const handleToggleSelectAll = () => {
    if (selectedPaperIds.length === history.length) {
      setSelectedPaperIds([]);
    } else {
      setSelectedPaperIds(history.map(paper => paper.id!).filter(Boolean));
    }
  };

  // Delete all selected papers simultaneously
  const handleDeleteMultiplePapers = async () => {
    if (selectedPaperIds.length === 0) return;

    const localIds = selectedPaperIds.filter(id => id.startsWith("local_"));
    const cloudIds = selectedPaperIds.filter(id => !id.startsWith("local_"));

    let deletedSome = false;

    // Local Storage deletes
    if (localIds.length > 0) {
      const local = localStorage.getItem("local_question_papers");
      if (local) {
        const currentList: QuestionPaper[] = JSON.parse(local);
        const filtered = currentList.filter(p => !selectedPaperIds.includes(p.id!));
        localStorage.setItem("local_question_papers", JSON.stringify(filtered));
        setHistory(filtered);
        deletedSome = true;
      }
    }

    // Firestore/Cloud deletes
    if (cloudIds.length > 0 && user) {
      try {
        await Promise.all(
          cloudIds.map(async (id) => {
            await deleteDoc(doc(db, "questionPapers", id));
          })
        );
        deletedSome = true;
      } catch (e) {
        handleFirestoreError(e, "delete", "questionPapers/multiple");
      }
    }

    if (deletedSome) {
      toast.success(uiLang === "Bangla" ? `নির্বাচিত ${selectedPaperIds.length}টি প্রশ্নপত্র সফলভাবে মুছে ফেলা হয়েছে।` : `Successfully deleted ${selectedPaperIds.length} selected question papers.`);
      setSelectedPaperIds([]);
      fetchHistory();
    }
  };

  // Load a historic generated paper
  const handleLoadPaper = (paper: QuestionPaper) => {
    setActivePaper(paper);
    setTitle(paper.title);
    setSubject(paper.subject as any);
    setDifficulty(paper.difficulty);
    setType(paper.type);
    setLanguage(paper.language);
    setTimerEnabled(paper.timerEnabled);
    setTimerDuration(paper.timerDuration);
    setManualQuestions(paper.questions);

    setIsTimerRunning(false);
    if (paper.timerEnabled) {
      setRemainingSeconds(paper.timerDuration * 60);
    } else {
      setRemainingSeconds(null);
    }
    toast.info(uiLang === "Bangla" ? `প্রশ্নের পেপার বোঝাই করা হয়েছে: ${paper.title}` : `Loaded: ${paper.title}`);
  };

  // Manual Question Creator actions
  const handleAddManualMCQ = () => {
    if (!mcqInput.questionText.trim()) return;
    const item: MCQQuestion = {
      id: "q_" + Date.now(),
      questionText: mcqInput.questionText,
      options: [...mcqInput.options],
      correctAnswer: mcqInput.correctAnswer || mcqInput.options[0]
    };

    setManualQuestions(prev => [...prev, item]);
    setMcqInput({
      questionText: "",
      options: ["", "", "", ""],
      correctAnswer: ""
    });
    initFallbackActivePaper();
    toast.success(uiLang === "Bangla" ? "MCQ প্রশ্ন যুক্ত হয়েছে।" : "MCQ added.");
  };

  const handleAddManualCQ = () => {
    if (!cqInput.scenario.trim()) return;
    const item: CQQuestion = {
      id: "q_" + Date.now(),
      scenario: cqInput.scenario,
      subQuestions: cqInput.subQuestions.filter(q => q.trim() !== "")
    };

    setManualQuestions(prev => [...prev, item]);
    setCqInput({
      scenario: "",
      subQuestions: ["", "", "", ""]
    });
    initFallbackActivePaper();
    toast.success(uiLang === "Bangla" ? "সৃজনশীল প্রশ্ন উদ্দীপকসহ যুক্ত হয়েছে।" : "Creative question added.");
  };

  const handleAddManualShort = () => {
    if (!shortInput.questionText.trim()) return;
    const item: ShortQuestion = {
      id: "q_" + Date.now(),
      questionText: shortInput.questionText,
      sampleAnswer: shortInput.sampleAnswer
    };

    setManualQuestions(prev => [...prev, item]);
    setShortInput({
      questionText: "",
      sampleAnswer: ""
    });
    initFallbackActivePaper();
    toast.success(uiLang === "Bangla" ? "সংক্ষিপ্ত প্রশ্ন যুক্ত হয়েছে।" : "Short question added.");
  };

  const initFallbackActivePaper = () => {
    if (!activePaper) {
      setActivePaper({
        userId: user?.uid || "anonymous",
        title: title || t.unnamed,
        subject,
        difficulty,
        type,
        language,
        timerEnabled,
        timerDuration,
        questions: [],
        createdAt: new Date()
      });
    }
  };

  const clearWorkspace = () => {
    setActivePaper(null);
    setManualQuestions([]);
    setIsTimerRunning(false);
    setRemainingSeconds(null);
  };

  // Timer play state toggles
  const toggleTimer = () => {
    if (remainingSeconds === null) {
      setRemainingSeconds(timerDuration * 60);
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setRemainingSeconds(timerDuration * 60);
  };

  // HTML custom export print preview trigger
  const triggerPrintPdf = () => {
    window.print();
  };

  const formatTimerValue = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto print:bg-white print:text-black print:p-0 pb-12">
      
      {/* Upper Interface Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between glass p-4 rounded-3xl border border-primary/10 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-primary to-violet-500 rounded-2xl text-primary-foreground shadow-md shadow-primary/20">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
            <p className="text-xs text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>

        {/* Global Action toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Offline indicator/override */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOfflineMode(prev => !prev)}
            className={`gap-1.5 rounded-full ${isOfflineMode ? "border-amber-500/30 bg-amber-500/5 text-amber-500" : "border-emerald-500/30 bg-emerald-500/5 text-emerald-500"}`}
          >
            {isOfflineMode ? (
              <>
                <WifiOff className="w-4 h-4" />
                <span>{t.offlineActive}</span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                <span>{t.onlineActive}</span>
              </>
            )}
          </Button>

          {/* Interface Language switch */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setUiLang(prev => prev === "Bangla" ? "English" : "Bangla")}
            className="rounded-full gap-1.5 font-bold"
          >
            <Globe className="w-4 h-4 text-primary" />
            <span>{uiLang === "Bangla" ? "English UI" : "বাংলা ইন্টারফেস"}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column options & manual editor (print:hidden) */}
        <div className="lg:col-span-4 space-y-6 print:hidden">
          <Card className="glass border-primary/10 rounded-3xl overflow-hidden shadow-md">
            <CardHeader className="bg-primary/5 pb-4 border-b border-primary/5">
              <CardTitle className="text-sm font-black tracking-wider uppercase text-primary/80 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500 animate-bounce" />
                {t.generateBtn}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              
              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">{t.subject}</label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-xl">
                  {(["Math", "English", "Science"] as const).map(sub => (
                    <button
                      key={sub}
                      onClick={() => setSubject(sub)}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${subject === sub ? "bg-background text-primary shadow-sm" : "hover:bg-background/40 text-muted-foreground"}`}
                    >
                      {t.subjects[sub]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">{t.difficulty}</label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-xl">
                  {(["Easy", "Medium", "Hard"] as const).map(diff => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${difficulty === diff ? "bg-background text-primary shadow-sm" : "hover:bg-background/40 text-muted-foreground"}`}
                    >
                      {t.difficulties[diff]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">{t.lang}</label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-xl">
                  {(["Bangla", "English"] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${language === lang ? "bg-background text-primary shadow-sm" : "hover:bg-background/40 text-muted-foreground"}`}
                    >
                      {t.languages[lang]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Format */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">{t.qType}</label>
                <div className="flex flex-col gap-1.5">
                  {(["MCQ", "CQ", "Short"] as const).map(qForm => (
                    <button
                      key={qForm}
                      onClick={() => setType(qForm)}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all border text-left ${type === qForm ? "bg-primary/5 border-primary/40 text-primary" : "border-border/60 hover:bg-muted"}`}
                    >
                      <Layers className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span>{t.qTypes[qForm]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific topic / keyword */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                  <span>{t.topicName}</span>
                </label>
                <Input
                  className="rounded-xl border-primary/10 focus:border-primary/30"
                  placeholder={t.topicPlaceholder}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              {/* Timer Switch */}
              <div className="pt-2 border-t border-border/60 space-y-3">
                <button
                  onClick={() => setTimerEnabled(prev => !prev)}
                  className={`flex items-center gap-2.5 text-xs font-bold w-full p-2.5 rounded-xl border text-left transition-all ${timerEnabled ? "border-primary/40 bg-primary/5 text-primary" : "border-border/60 hover:bg-muted"}`}
                >
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{t.timerOption}</span>
                </button>

                {timerEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex items-center gap-3 pl-2"
                  >
                    <span className="text-xs text-muted-foreground">{t.duration}:</span>
                    <Input
                      type="number"
                      className="w-20 rounded-lg text-center"
                      min={5}
                      max={180}
                      value={timerDuration}
                      onChange={(e) => setTimerDuration(parseInt(e.target.value) || 30)}
                    />
                  </motion.div>
                )}
              </div>

              {/* Action Trigger */}
              <Button
                onClick={handleAutoGenerate}
                disabled={isGenerating}
                className="w-full rounded-2xl bg-gradient-to-r from-primary to-violet-600 hover:from-primary/95 hover:to-violet-750 text-white font-black py-5 shadow-lg shadow-violet-500/10 gap-2 mt-2"
              >
                {isGenerating ? (
                  <>
                    <Brain className="w-5 h-5 animate-spin" />
                    <span>{t.generating}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>{t.generateBtn}</span>
                  </>
                )}
              </Button>

            </CardContent>
          </Card>

          {/* Manual Designer panel */}
          <Card className="glass border-primary/10 rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="bg-amber-500/5 pb-4 border-b border-amber-500/5">
              <CardTitle className="text-xs font-black tracking-wider uppercase text-amber-600 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {t.manualAdd} ({t.qTypes[type]})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground">{t.enterTitle}</label>
                <Input
                  className="rounded-xl border-primary/10"
                  placeholder={t.unnamed}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {type === "MCQ" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-bold">Question Text</label>
                    <Input
                      placeholder="e.g., What is 12 x 12?"
                      value={mcqInput.questionText}
                      onChange={(e) => setMcqInput(prev => ({ ...prev, questionText: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-bold">Options (4 choices)</label>
                    {mcqInput.options.map((opt, oIdx) => (
                      <Input
                        key={oIdx}
                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                        value={opt}
                        onChange={(e) => {
                          const updated = [...mcqInput.options];
                          updated[oIdx] = e.target.value;
                          setMcqInput(prev => ({ ...prev, options: updated }));
                        }}
                        className="rounded-lg h-9 text-xs"
                      />
                    ))}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-bold">{t.correctAns}</label>
                    <select
                      value={mcqInput.correctAnswer}
                      onChange={(e) => setMcqInput(prev => ({ ...prev, correctAnswer: e.target.value }))}
                      className="w-full p-2 bg-background border border-primary/10 rounded-xl text-xs"
                    >
                      <option value="">Select correct choice</option>
                      {mcqInput.options.map((opt, idx) => (
                        <option key={idx} value={opt}>
                          Option {String.fromCharCode(65 + idx)}: {opt || "(unwritten)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={handleAddManualMCQ} size="sm" variant="outline" className="w-full rounded-xl border-amber-500/20 hover:bg-amber-500/5 text-amber-600 text-xs">
                    <Plus className="w-4 h-4 mr-1" /> {t.addQ}
                  </Button>
                </div>
              )}

              {type === "CQ" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-bold">{t.scenario}</label>
                    <textarea
                      placeholder="উদ্দীপকটি এখানে লিখুন..."
                      value={cqInput.scenario}
                      onChange={(e) => setCqInput(prev => ({ ...prev, scenario: e.target.value }))}
                      className="w-full p-2.5 bg-background border border-primary/10 rounded-xl text-xs h-20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-bold">{t.subQs}</label>
                    {cqInput.subQuestions.map((sub, sIdx) => (
                      <Input
                        key={sIdx}
                        placeholder={uiLang === "Bangla" ? `${["ক", "খ", "গ", "ঘ"][sIdx]}) প্রশ্ন লিখুন` : `${["a", "b", "c", "d"][sIdx]}) Enter Question`}
                        value={sub}
                        onChange={(e) => {
                          const updated = [...cqInput.subQuestions];
                          updated[sIdx] = e.target.value;
                          setCqInput(prev => ({ ...prev, subQuestions: updated }));
                        }}
                        className="rounded-lg h-9 text-xs"
                      />
                    ))}
                  </div>
                  <Button onClick={handleAddManualCQ} size="sm" variant="outline" className="w-full rounded-xl border-amber-500/20 hover:bg-amber-500/5 text-amber-600 text-xs">
                    <Plus className="w-4 h-4 mr-1" /> {t.addQ}
                  </Button>
                </div>
              )}

              {type === "Short" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-bold font-mono">Question Text</label>
                    <Input
                      placeholder="e.g., Define Newton's First Law."
                      value={shortInput.questionText}
                      onChange={(e) => setShortInput(prev => ({ ...prev, questionText: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-bold">{t.sampleAns}</label>
                    <Input
                      placeholder="Expected core answer..."
                      value={shortInput.sampleAnswer}
                      onChange={(e) => setShortInput(prev => ({ ...prev, sampleAnswer: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                  <Button onClick={handleAddManualShort} size="sm" variant="outline" className="w-full rounded-xl border-amber-500/20 hover:bg-amber-500/5 text-amber-600 text-xs">
                    <Plus className="w-4 h-4 mr-1" /> {t.addQ}
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* Right column active workspace */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Practice/Countdown Timer Bar (print:hidden) */}
          {activePaper && (timerEnabled || remainingSeconds !== null) && (
            <div className="glass p-4 rounded-3xl border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm print:hidden">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{t.timeRemaining}</h3>
                  <p className="text-xs text-muted-foreground">{activePaper.title || t.unnamed}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className={`text-2xl font-black font-mono tracking-wider ${remainingSeconds !== null && remainingSeconds < 60 ? "text-destructive animate-pulse" : "text-primary"}`}>
                  {remainingSeconds !== null ? formatTimerValue(remainingSeconds) : "00:00"}
                </span>

                <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleTimer}
                    className="h-8 w-8 rounded-lg"
                  >
                    {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-500" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={resetTimer}
                    className="h-8 w-8 rounded-lg"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Active Question paper review board */}
          {activePaper ? (
            <div className="space-y-6">
              
              {/* Dynamic Actions for the Workspace */}
              <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSaveToMyArchive}
                    className="gap-1.5 rounded-full bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                    variant="outline"
                  >
                    <Save className="w-4 h-4" />
                    <span>{t.saveBtn}</span>
                  </Button>
                  <Button
                    onClick={triggerPrintPdf}
                    className="gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                    variant="outline"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t.printBtn}</span>
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  onClick={clearWorkspace}
                  className="rounded-full gap-1 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t.clear}</span>
                </Button>
              </div>

              {/* PDF & Exam View board styled to match beautiful curriculum paper */}
              <div 
                id="exam-printable-surface" 
                className="bg-card print:bg-white text-card-foreground print:text-black border border-primary/10 print:border-none p-8 md:p-12 rounded-3xl shadow-md space-y-8 font-sans transition-all duration-300 relative print:p-0"
              >
                {/* Official Board Exam Header Design */}
                <div className="text-center border-b-2 border-primary/20 pb-6 space-y-2 relative">
                  <div className="absolute top-0 right-0 text-right opacity-80 print:opacity-100 font-mono text-xs">
                    {timerEnabled && (
                      <p className="font-bold">
                        {uiLang === "Bangla" ? `সময়: ${timerDuration} মিনিট` : `Time Allowed: ${timerDuration} Min`}
                      </p>
                    )}
                    <p className="font-bold">
                      {uiLang === "Bangla" ? "পূর্ণমান: ১০০" : "Full Marks: 100"}
                    </p>
                  </div>

                  <p className="text-xs uppercase tracking-widest font-extrabold text-primary/60 print:text-gray-500 font-mono">
                    {uiLang === "Bangla" ? "বার্ষিক / অর্ধবার্ষিক পরীক্ষা মূল্যায়ন" : "Annual Assessment / Evaluative Exam"}
                  </p>
                  <h2 className="text-2xl font-black tracking-tight select-all">
                    {title || activePaper.title || t.unnamed}
                  </h2>
                  <div className="flex flex-wrap items-center justify-center gap-x-6 text-xs text-muted-foreground print:text-gray-700 italic">
                    <span>{t.subject}: {t.subjects[activePaper.subject as "Math" | "English" | "Science"] || activePaper.subject}</span>
                    <span>{t.difficulty}: {t.difficulties[activePaper.difficulty] || activePaper.difficulty}</span>
                    <span>{t.lang}: {activePaper.language}</span>
                  </div>
                </div>

                {/* Candidate information labels mimicking standard assessment paper */}
                <div className="grid grid-cols-2 gap-4 border border-dashed border-border/60 p-4 rounded-xl text-xs print:text-gray-900 print:bg-gray-50">
                  <p className="font-mono"><strong>Student Name:</strong> ___________________________</p>
                  <p className="font-mono"><strong>Roll / ID:</strong> ___________________________</p>
                </div>

                {/* Question List Rendering */}
                <div className="space-y-8">
                  {manualQuestions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground space-y-2">
                      <HelpCircle className="w-12 h-12 stroke-1 text-primary/30 mx-auto" />
                      <p className="text-sm">{uiLang === "Bangla" ? "কোনো প্রশ্ন আইটেম নেই। ম্যানুয়ালি লিখুন বা এআই দিয়ে জেনারেট করুন।" : "This assessment is empty. Generate content or write manually."}</p>
                    </div>
                  ) : (
                    manualQuestions.map((q, idx) => (
                      <div key={q.id || idx} className="space-y-4 break-inside-avoid">
                        
                        {/* MCQ layout */}
                        {activePaper.type === "MCQ" && (
                          <div className="space-y-2.5">
                            <h4 className="font-bold text-sm md:text-base text-card-foreground">
                              {idx + 1}. {q.questionText}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                              {q.options?.map((opt: string, optIdx: number) => {
                                const optLetter = String.fromCharCode(65 + optIdx);
                                return (
                                  <div 
                                    key={optIdx} 
                                    className="flex items-center gap-2 text-sm border border-border/30 px-3 py-2 rounded-xl bg-muted/30 print:bg-white print:border-gray-300"
                                  >
                                    <span className="font-black text-[11px] font-mono bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center print:border print:border-gray-500">
                                      {optLetter}
                                    </span>
                                    <span>{opt}</span>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Answer key for Teachers */}
                            <p className="text-[11px] font-bold text-emerald-500 font-mono pl-4 print:hidden flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>{t.correctAns}: {q.correctAnswer}</span>
                            </p>
                          </div>
                        )}

                        {/* CQ layout */}
                        {activePaper.type === "CQ" && (
                          <div className="space-y-3">
                            <div className="border-l-4 border-primary/20 pl-4 py-1 italic bg-muted/10 print:bg-gray-50 text-sm md:text-base leading-relaxed">
                              <p className="font-black text-xs uppercase text-primary tracking-widest mb-1 print:text-gray-900">{t.scenario}</p>
                              {q.scenario}
                            </div>
                            <div className="pl-4 space-y-2 text-sm">
                              {q.subQuestions?.map((sub: string, subIdx: number) => {
                                const subSymbol = uiLang === "Bangla" ? ["ক", "খ", "গ", "ঘ"][subIdx] : ["a", "b", "c", "d"][subIdx];
                                return (
                                  <p key={subIdx} className="text-card-foreground">
                                    <strong>{subSymbol})</strong> {sub}
                                    <span className="float-right text-xs text-muted-foreground font-mono print:text-gray-500">({subIdx + 1} Mark)</span>
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Short Question Layout */}
                        {activePaper.type === "Short" && (
                          <div className="space-y-2">
                            <h4 className="font-bold text-sm md:text-base text-card-foreground">
                              {idx + 1}. {q.questionText}
                            </h4>
                            {/* Line spacing to write answer */}
                            <div className="pl-4 pt-1 pb-3 text-muted-foreground font-mono text-[11px] border-b border-dashed border-border/80 print:border-gray-400">
                              Answer: __________________________________________________________________________________
                            </div>
                            
                            {/* Target sample answer for teachers review */}
                            <p className="text-[11px] font-bold text-pink-500 font-mono pl-4 print:hidden">
                              {t.sampleAns}: {q.sampleAnswer}
                            </p>
                          </div>
                        )}

                      </div>
                    ))
                  )}
                </div>

                {/* Print Footer */}
                <div className="border-t border-dashed border-border/60 pt-6 flex justify-between text-[11px] text-muted-foreground font-mono print:text-gray-500">
                  <span>Generated with Smart Question Maker &copy; 2026</span>
                  <span>Signature of Invigilator: __________________</span>
                </div>

              </div>

            </div>
          ) : (
            <div className="glass p-12 text-center rounded-3xl border border-dashed border-primary/20 space-y-4">
              <div className="p-4 bg-primary/5 rounded-full w-20 h-20 flex items-center justify-center mx-auto text-primary">
                <Brain className="w-10 h-10 stroke-1 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black">{uiLang === "Bangla" ? "পরীক্ষা সংগ্রাহক বোর্ড খালি" : "Question Board Empty"}</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {uiLang === "Bangla" ? "বাম পাশে বিষয়, প্রশ্নের ধরন এবং স্তর নির্বাচন করে এআই জেনারেটর বা অফলাইন এডিটরের মাধ্যমে প্রশ্ন যুক্ত করুন।" : "Choose subject parameters on the left and utilize the AI Auto-Generator or local manual creator to populate questions."}
                </p>
              </div>
            </div>
          )}

          {/* Archive/History Section (print:hidden) */}
          <Card className="glass border-primary/10 rounded-3xl overflow-hidden shadow-sm print:hidden">
            <CardHeader className="bg-muted pb-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-sm font-black tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                {t.history}
              </CardTitle>
              {history.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={handleToggleSelectAll}
                    className="h-7 px-2.5 text-[11px] font-bold rounded-lg border-primary/20 text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all cursor-pointer"
                  >
                    {selectedPaperIds.length === history.length
                      ? (uiLang === "Bangla" ? "সব নির্বাচন বাতিল" : "Deselect All")
                      : (uiLang === "Bangla" ? "সব নির্বাচন করুন" : "Select All")}
                  </Button>
                  {selectedPaperIds.length > 0 && (
                    <Button
                      variant="destructive"
                      onClick={handleDeleteMultiplePapers}
                      className="h-7 px-2.5 text-[11px] font-black rounded-lg gap-1 shadow-sm transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        {uiLang === "Bangla" 
                          ? `${selectedPaperIds.length}টি মুছুন` 
                          : `Delete (${selectedPaperIds.length})`}
                      </span>
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {isHistoryLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                  Loading papers archived under your profile...
                </div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {t.noHistory}
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {history.map(paper => (
                    <div 
                      key={paper.id} 
                      className={`p-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-all select-none ${selectedPaperIds.includes(paper.id!) ? "bg-primary/5 border-l-2 border-primary" : ""}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Bullet selection Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedPaperIds.includes(paper.id!)}
                          onChange={() => handleToggleSelectPaper(paper.id!)}
                          className="h-4.5 w-4.5 rounded border-muted-foreground/30 accent-primary text-primary focus:ring-primary cursor-pointer shrink-0"
                        />

                        <div className="p-2.5 bg-primary/5 rounded-xl text-primary shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold tracking-tight truncate">{paper.title}</p>
                          <div className="flex gap-2 text-[10px] text-muted-foreground font-mono mt-0.5 flex-wrap">
                            <span>{t.subjects[paper.subject as "Math" | "English" | "Science"] || paper.subject}</span>
                            <span>&bull;</span>
                            <span>{t.difficulties[paper.difficulty] || paper.difficulty}</span>
                            <span>&bull;</span>
                            <span>{t.qTypes[paper.type]}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleLoadPaper(paper)}
                          className="h-8 rounded-lg text-primary hover:bg-primary/10 gap-1 text-xs px-2.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-primary" />
                          <span>Load</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeletePaper(paper.id!)}
                          className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}
