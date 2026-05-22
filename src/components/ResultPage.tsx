import React, { useState, useMemo, useRef } from 'react';
import { Student, PREDEFINED_SUBJECTS, Result } from '../types';
import { useFirebase } from './FirebaseProvider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Trash2, Plus, ArrowLeft, Download, Save, CheckCircle2, XCircle, Layout as LayoutIcon, FileText, Send, MessageSquare, Mail, Phone, Share2, BookOpen, Sparkles, AlertCircle, Copy, Link, Check, ExternalLink } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { computeGrade, calculateSummary, GRADING_SYSTEMS, BANGLADESH_BOARDS } from '../lib/grading';

interface ResultPageProps {
  student: Student;
  onBack: () => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({ student, onBack }) => {
  const { user, settings } = useFirebase();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    settings?.defaultSubjects || ['Mathematics', 'English']
  );
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [exportLayout, setExportLayout] = useState<'compact' | 'detailed'>('detailed');
  const [saveToGallery, setSaveToGallery] = useState(true);
  const [galleryNotes, setGalleryNotes] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  // Professional Upgrades States
  const [gradingSystem, setGradingSystem] = useState<string>('bangladesh_board');
  const [boardName, setBoardName] = useState<string>('Dhaka Board');
  const [pdfTemplate, setPdfTemplate] = useState<'modern' | 'classic' | 'colorful'>('modern');
  const [schoolName, setSchoolName] = useState<string>('St. Mark\'s Academy');
  const [examDate, setExamDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [principalName, setPrincipalName] = useState<string>('Principal Alip Sobhan');
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  
  // AI Remarks & Suggestions
  const [aiRemarks, setAiRemarks] = useState<string>('');
  const [aiStrengths, setAiStrengths] = useState<string[]>([]);
  const [aiWeaknesses, setAiWeaknesses] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const calculateResults = useMemo(() => {
    const summary = calculateSummary(
      marks,
      selectedSubjects,
      gradingSystem,
      settings?.passMark || 33,
      settings?.subjectCredits || {}
    );
    return {
      ...summary,
      passMark: settings?.passMark || 33
    };
  }, [marks, selectedSubjects, gradingSystem, settings]);

  const generateResultSummary = () => {
    const summary = selectedSubjects.map(sub => `${sub}: ${marks[sub] || 0}`).join('\n');
    const scaleText = GRADING_SYSTEMS.find(g => g.id === gradingSystem)?.name || gradingSystem;
    return `Academic Transcript Summary - ${schoolName}\n---\nName: ${student.name}\nRoll: ${student.rollNumber}\nBoard: ${gradingSystem === 'bangladesh_board' ? boardName : 'Standard'}\nGrading Scale: ${scaleText}\n${summary}\n---\nTotal Marks: ${calculateResults.total}\nAverage Score: ${calculateResults.average.toFixed(2)}%\nGPA Earned: ${calculateResults.gpa.toFixed(2)}\nResult Evaluation: ${calculateResults.isPass ? 'PASS' : 'FAIL'}${aiRemarks ? `\n\nAI Teacher Remarks:\n${aiRemarks}` : ''}`;
  };

  const getVerificationUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}?verify=${savedDocId || 'draft'}`;
  };

  const copyLiveLink = () => {
    if (!savedDocId) {
      toast.error('Please click "Commit Record" first to generate the official database link');
      return;
    }
    navigator.clipboard.writeText(getVerificationUrl());
    toast.success('Live Verification link copied to clipboard!');
  };

  const sendToWhatsApp = () => {
    if (!student.parentPhone) {
      toast.error('Parent phone number not found');
      return;
    }
    const text = encodeURIComponent(generateResultSummary() + (savedDocId ? `\n\nVerify official online record at: ${getVerificationUrl()}` : ''));
    const phone = student.parentPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    toast.success('Result sent successfully to parent via WhatsApp');
  };

  const sendViaSMS = () => {
    if (!student.parentPhone) {
      toast.error('Parent phone number not found');
      return;
    }
    const text = encodeURIComponent(generateResultSummary() + (savedDocId ? `\nVerify official online record at: ${getVerificationUrl()}` : ''));
    window.open(`sms:${student.parentPhone}?body=${text}`, '_blank');
    toast.success('SMS handler opened successfully');
  };

  const sendViaEmail = () => {
    if (!student.parentEmail) {
      toast.error('Parent email not found');
      return;
    }
    const subject = encodeURIComponent(`Academic Progress Report - ${student.name} (${student.rollNumber})`);
    const body = encodeURIComponent(generateResultSummary() + (savedDocId ? `\n\nVerify official online record at: ${getVerificationUrl()}` : ''));
    window.open(`mailto:${student.parentEmail}?subject=${subject}&body=${body}`, '_blank');
    toast.success('Email composer opened successfully');
  };

  const generateAiInsights = async () => {
    if (selectedSubjects.length === 0) {
      toast.error('Please add subjects and record score entries before calling counseling AI');
      return;
    }
    setIsGeneratingAi(true);
    const toastId = toast.loading('Consulting academic advisor AI...');
    try {
      const response = await fetch('/api/generate-remarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: student.name,
          marks,
          average: calculateResults.average,
          gpa: calculateResults.gpa,
          isPass: calculateResults.isPass,
          gradingScale: gradingSystem === 'bangladesh_board' ? `${boardName} GPA 5.0` : gradingSystem
        })
      });

      if (!response.ok) throw new Error('AI Generation failed');
      const data = await response.json();
      
      setAiRemarks(data.remarks || '');
      setAiStrengths(data.strengths || []);
      setAiWeaknesses(data.weaknesses || []);
      setAiSuggestions(data.actionableSuggestions || []);
      
      toast.success('AI counseling notes loaded directly into PDF report card!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Consultation failed. Check your API configuration.', { id: toastId });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const getLetterGrade = (mark: number) => {
    const passMark = settings?.passMark || 33;
    return computeGrade(mark, gradingSystem, passMark);
  };

  const handleSendToParents = () => {
    if (!student.parentPhone && !student.parentEmail) {
      toast.error('No parent contact information saved');
      return;
    }
  };

  const handleMarkChange = (sub: string, val: string) => {
    const num = parseInt(val) || 0;
    setMarks(prev => ({ 
      ...prev, 
      [sub]: Math.min(100, Math.max(0, num)) 
    }));
  };

  const addSubject = (sub: string) => {
    if (!selectedSubjects.includes(sub)) {
      setSelectedSubjects([...selectedSubjects, sub]);
    }
  };

  const quickFill = (type: 'excellent' | 'pass' | 'random') => {
    const newMarks: Record<string, number> = {};
    selectedSubjects.forEach(sub => {
      if (type === 'excellent') newMarks[sub] = Math.floor(Math.random() * 10) + 85;
      else if (type === 'pass') newMarks[sub] = Math.floor(Math.random() * 10) + 40;
      else newMarks[sub] = Math.floor(Math.random() * 60) + 30;
    });
    setMarks(newMarks);
    toast.success(`${type.toUpperCase()} marks generated`);
  };

  const subjectCategories: Record<string, string[]> = {
    'Core': ['Mathematics', 'English', 'Science'],
    'Humanities': ['History', 'Geography', 'Sociology'],
    'Tech': ['Computer Science', 'Information Technology', 'Electronics'],
    'Languages': ['French', 'Spanish', 'German', 'Bengali', 'Hindi']
  };

  const removeSubject = (sub: string) => {
    setSelectedSubjects(selectedSubjects.filter(s => s !== sub));
  };

  const saveResult = async () => {
    if (!user) {
      toast.error('Please login to save results');
      return;
    }

    if (selectedSubjects.length === 0) {
      toast.error('Add at least one subject');
      return;
    }

    setIsSaving(true);
    try {
      const resultData = {
        userId: user.uid,
        rollNumber: student.rollNumber,
        studentName: student.name,
        marks: Object.fromEntries(
          Object.entries(marks).filter(([sub]) => selectedSubjects.includes(sub))
        ) as Record<string, number>,
        totalMarks: calculateResults.total,
        average: calculateResults.average,
        passMark: calculateResults.passMark,
        status: calculateResults.isPass ? 'Pass' : 'Fail',
        gpa: calculateResults.gpa,
        savedToGallery: saveToGallery,
        galleryNotes: saveToGallery ? galleryNotes : '',
        
        // Advanced specifications
        gradingScale: gradingSystem,
        boardName: gradingSystem === 'bangladesh_board' ? boardName : '',
        pdfTemplate,
        schoolName,
        examDate,
        principalName,
        aiRemarks,
        aiStrengths,
        aiWeaknesses,
        aiSuggestions
      };

      const docRef = await addDoc(collection(db, 'results'), {
        ...resultData,
        createdAt: serverTimestamp()
      });
      setSavedDocId(docRef.id);
      toast.success('Result committed successfully to Cloud Database!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save result to cloud');
    } finally {
      setIsSaving(false);
    }
  };

  const exportPDF = async () => {
    toast.loading('Generating Official Verifiable PDF Report...');
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const verificationUrl = getVerificationUrl();
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(verificationUrl)}`;
      
      const boardLabel = gradingSystem === 'bangladesh_board' ? boardName : 'Academic Registry';
      const scaleLabel = GRADING_SYSTEMS.find(g => g.id === gradingSystem)?.name || gradingSystem;

      // Select styling parameters based on template selection
      let primaryColor = '#1e3b8b'; // default royal blue
      let accentColor = '#3b82f6';
      let borderStyle = '12px double #1e3a8a';
      let headerBg = '#f1f5f9';
      let isCrestRound = true;
      let signatureFont = '"Great Vibes", "Georgia", cursive, serif';

      if (pdfTemplate === 'classic') {
        primaryColor = '#7f1d1d'; // warm classic burgundy
        accentColor = '#b91c1c';
        borderStyle = '14px double #7f1d1d';
        headerBg = '#fef2f2';
        isCrestRound = false;
      } else if (pdfTemplate === 'colorful') {
        primaryColor = '#4f46e5'; // vibrant purple / indigo
        accentColor = '#06b6d4';
        borderStyle = '10px solid #4f46e5';
        headerBg = '#f5f3ff';
        isCrestRound = true;
      } else {
        // Modern Minimalist
        primaryColor = '#0f172a'; // slate
        accentColor = '#10b981'; // emerald
        borderStyle = '4px solid #334155';
        headerBg = '#f8fafc';
        isCrestRound = true;
      }

      // Create a temporary element for rendering the high-quality PDF page
      const element = document.createElement('div');
      element.style.padding = '40px';
      element.style.width = '800px';
      element.style.backgroundColor = 'white';
      element.innerHTML = `
        <div style="border: ${borderStyle}; padding: 35px; font-family: 'Inter', system-ui, sans-serif; min-height: 1040px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; background: #ffffff; position: relative;">
          
          <!-- Background Watermark security layer -->
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 85px; font-weight: 900; color: rgba(16, 185, 129, 0.05); font-family: monospace; text-transform: uppercase; pointer-events: none; z-index: 0; text-align: center; width: 100%;">
            OFFICIAL TRANSCRIPT<br/>VERIFIED SECURE
          </div>

          <div style="position: relative; z-index: 1;">
            <!-- Header section -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 4px double ${primaryColor}; padding-bottom: 20px; margin-bottom: 25px;">
              <div style="display: flex; align-items: center; gap: 15px;">
                <div style="width: 70px; height: 70px; background: ${primaryColor}; border-radius: ${isCrestRound ? '50%' : '12px'}; display: flex; align-items: center; justify-content: center; border: 3px solid #fbcfe8; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                    <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
                  </svg>
                </div>
                <div>
                  <h1 style="margin: 0; color: ${primaryColor}; font-size: 26px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">${schoolName}</h1>
                  <p style="margin: 3px 0; color: ${accentColor}; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">${boardLabel}</p>
                  <div style="font-size: 9px; color: #64748b; font-family: monospace; text-transform: uppercase; tracking: 0.5px;">SECURE TRACE ID: SRM-${savedDocId ? savedDocId.substring(0, 12).toUpperCase() : 'DRAFT-DURING-PREVIEW'}</div>
                </div>
              </div>
              
              <div style="text-align: right; display: flex; align-items: center; gap: 20px;">
                <div style="text-align: right;">
                  <div style="background: ${calculateResults.isPass ? '#10b981' : '#ef4444'}; color: white; padding: 10px 22px; border-radius: 12px; font-weight: 900; font-size: 20px; display: inline-block; letter-spacing: 1px;">
                    ${calculateResults.isPass ? 'PASS' : 'FAIL'}
                  </div>
                  <p style="margin: 6px 0 0 0; font-weight: bold; font-size: 12px; color: #334155;">Exam Date: ${examDate}</p>
                </div>
                <!-- Embedded high-resolution QR verification block -->
                <div style="text-align: center; border: 1.5px solid #e2e8f0; padding: 4px; bg: #fff; border-radius: 8px;">
                  <img src="${qrCodeUrl}" style="width: 55px; height: 55px; display: block;" crossOrigin="anonymous" />
                  <span style="font-size: 7px; color: #64748b; font-family: monospace; display: block; margin-top: 1px; font-weight: bold;">SCAN SECURE</span>
                </div>
              </div>
            </div>
            
            <!-- Student General Info segment -->
            <div style="margin-bottom: 25px; display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; background: ${headerBg}; padding: 20px; border-radius: 16px; border: 1.5px solid ${primaryColor}20;">
              <div>
                <label style="font-weight: 905; color: ${primaryColor}; font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; display: block; margin-bottom: 4px;">Enrolled Student Details (শিক্ষার্থীর বিবরণ):</label>
                <div style="font-size: 19px; font-weight: 900; color: #0f172a;">Name: ${student.name}</div>
                <div style="font-size: 12px; color: #334155; margin-top: 4px; font-weight: 600;">Identification Hash: 2024-REG-${student.rollNumber}</div>
                ${student.parentEmail ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Parent Email: ${student.parentEmail}</div>` : ''}
              </div>
              <div style="border-left: 2px dashed ${primaryColor}20; padding-left: 20px;">
                <label style="font-weight: 905; color: ${primaryColor}; font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; display: block; margin-bottom: 4px;">Academic evaluation period:</label>
                <div style="font-size: 17px; font-weight: 900; color: #0f172a;">Roll No: ${student.rollNumber}</div>
                <div style="font-size: 11px; color: #475569; margin-top: 2px; font-weight: bold;">Grading Scale: <span style="color: ${accentColor}; font-family: monospace;">${scaleLabel}</span></div>
                ${student.parentPhone ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Parent Phone: ${student.parentPhone}</div>` : ''}
              </div>
            </div>

            <!-- Subject breakdown table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px;">
              <thead>
                <tr style="background-color: ${primaryColor}; color: #ffffff;">
                  <th style="padding: 12px 15px; text-align: left; font-weight: 800; border-top-left-radius: 8px; border-bottom-left-radius: 8px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Subject (বিষয়)</th>
                  <th style="padding: 12px 15px; text-align: center; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Credits</th>
                  <th style="padding: 12px 15px; text-align: center; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Marks Score</th>
                  <th style="padding: 12px 15px; text-align: center; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Letter Grade</th>
                  <th style="padding: 12px 15px; text-align: center; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Grade Point</th>
                  <th style="padding: 12px 15px; text-align: center; font-weight: 800; border-top-right-radius: 8px; border-bottom-right-radius: 8px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Outcome</th>
                </tr>
              </thead>
              <tbody>
                ${selectedSubjects.map(sub => {
                  const mark = marks[sub] || 0;
                  const credits = settings?.subjectCredits?.[sub] ?? 3;
                  const gradeData = getLetterGrade(mark);
                  const isSailing = mark >= calculateResults.passMark;

                  return `
                    <tr style="border-bottom: 1.5px solid #e2e8f0;">
                      <td style="padding: 12px 15px; font-weight: bold; color: #0f172a;">${sub}</td>
                      <td style="padding: 12px 15px; text-align: center; font-family: monospace; font-weight: bold; color: #475569;">${credits}</td>
                      <td style="padding: 12px 15px; text-align: center; font-weight: bold; font-family: monospace; font-size: 14px; color: #0f172a;">${mark}</td>
                      <td style="padding: 12px 15px; text-align: center; font-weight: 900;"><span style="color: ${isSailing ? primaryColor : '#dc2626'}; border: 1px solid currentColor; padding: 2px 8px; border-radius: 6px; background: ${isSailing ? primaryColor + '05' : '#fef2f2'}; font-size: 11px;">${gradeData.label}</span></td>
                      <td style="padding: 12px 15px; text-align: center; font-family: monospace; font-weight: black; font-size: 14px; color: ${isSailing ? accentColor : '#dc2626'};">${gradeData.gp.toFixed(2)}</td>
                      <td style="padding: 12px 15px; text-align: center;">
                        <span style="color: ${isSailing ? '#059669' : '#dc2626'}; font-weight: bold; font-size: 10px; background: ${isSailing ? '#ecfdf5' : '#fef2f2'}; padding: 3px 8px; border-radius: 9999px; border: 1px solid currentColor;">
                          ${isSailing ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <!-- AI-Driven Insights directly nested inside visual certificate -->
            ${aiRemarks ? `
              <div style="background: #faf5ff; border: 1.5px solid #d8b4fe; border-radius: 12px; padding: 15px; margin-bottom: 25px;">
                <h4 style="margin: 0 0 6px 0; color: #7c3aed; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">🧠 AI Counselor diagnostic opinion & guidelines (পরামর্শদাতা মন্তব্য)</h4>
                <p style="margin: 0; font-size: 11.5px; line-height: 1.5; color: #4b5563; font-style: italic;">
                  "${aiRemarks}"
                </p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px; border-top: 1px solid #f3e8ff; pt: 8px;">
                  ${aiStrengths && aiStrengths.length > 0 ? `
                    <div>
                      <span style="font-weight: 900; font-size: 9px; color: #a21caf; text-transform: uppercase;">Core Strength Fields</span>
                      <ul style="margin: 4px 0 0 0; padding-left: 15px; font-size: 10px; color: #4b5563; line-height: 1.4;">
                        ${aiStrengths.slice(0, 3).map(str => `<li>${str}</li>`).join('')}
                      </ul>
                    </div>
                  ` : ''}
                  ${aiSuggestions && aiSuggestions.length > 0 ? `
                    <div>
                      <span style="font-weight: 900; font-size: 9px; color: #4f46e5; text-transform: uppercase;">Study Guidelines Actions</span>
                      <ul style="margin: 4px 0 0 0; padding-left: 15px; font-size: 10px; color: #4b5563; line-height: 1.4;">
                        ${aiSuggestions.slice(0, 3).map(sug => `<li>${sug}</li>`).join('')}
                      </ul>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Summary bottom segment -->
          <div>
            <!-- Metrics board bar -->
            <div style="background: ${primaryColor}; color: white; padding: 18px 24px; border-radius: 16px; display: grid; grid-template-columns: 1fr 1fr 1.2fr 1fr; gap: 15px; align-items: center; margin-bottom: 30px;">
              <div style="text-align: center; border-right: 1.5px dashed rgba(255,255,255,0.2); padding: 2px 0;">
                <div style="color: rgba(255,255,255,0.7); font-size: 10px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Grand Total</div>
                <div style="font-size: 22px; font-weight: 900; font-family: monospace; margin-top: 2px;">${calculateResults.total.toFixed(0)}</div>
              </div>
              <div style="text-align: center; border-right: 1.5px dashed rgba(255,255,255,0.2); padding: 2px 0;">
                <div style="color: rgba(255,255,255,0.7); font-size: 10px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Average %</div>
                <div style="font-size: 22px; font-weight: 900; font-family: monospace; margin-top: 2px;">${calculateResults.average.toFixed(1)}%</div>
              </div>
              <div style="text-align: center; border-right: 1.5px dashed rgba(255,255,255,0.2); padding: 2px 0;">
                <div style="color: #38bdf8; font-size: 10px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">EVALUATION GPA</div>
                <div style="font-size: 26px; font-weight: 900; color: #38bdf8; font-family: monospace; margin-top: 1px;">${calculateResults.gpa.toFixed(2)}</div>
              </div>
              <div style="text-align: center; padding: 2px 0;">
                <div style="color: rgba(255,255,255,0.7); font-size: 10px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">STATUS</div>
                <div style="font-size: 18px; font-weight: 950; color: ${calculateResults.isPass ? '#34d399' : '#f87171'}; letter-spacing: 0.5px; margin-top: 2px;">
                  ${calculateResults.isPass ? 'PROMOTED' : 'RETAINED'}
                </div>
              </div>
            </div>

            <!-- Signature controls -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 120px; padding: 10px 20px;">
               <div style="text-align: center; border-top: 1.5px solid #cbd5e1; padding-top: 10px;">
                 <span style="font-size: 12px; color: #64748b; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase;">Guardian Verification</span>
               </div>
               <div style="text-align: center; border-top: 1.5px solid #cbd5e1; padding-top: 10px;">
                 <span style="font-family: ${signatureFont}; font-size: 22px; color: ${primaryColor}; font-weight: 600; display: block; margin-top: -8px; margin-bottom: 2px; text-transform: capitalize; font-style: italic;">
                   ${principalName}
                 </span>
                 <span style="font-size: 11px; color: #475569; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; display: block;">Principal Signature Seal</span>
               </div>
            </div>
            
            <!-- Dynamic Verification Footer instructions -->
            <div style="margin-top: 30px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1.5px solid #f1f5f9; padding-top: 12px; font-weight: bold; letter-spacing: 0.5px;">
              Digital QR Audit Seal verified 100% genuine. Scan QR Code or visit: ${window.location.origin} to authenticate ledger logs online.
              <br/>Official Blockchain Signature Encrypted • Smart Result Evaluation Matrix v2.0
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(element);
      
      // Delay slightly for any dynamically generated QR Code images to download and render inside html2canvas
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, allowTaint: true });
      const imgData = canvas.toDataURL('image/png');
      document.body.removeChild(element);
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`SRM_${student.rollNumber}_Transcript_${student.name.replace(/\s+/g, '_')}.pdf`);
      
      toast.dismiss();
      toast.success('Professional Verified Transcript PDF Saved!');
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error('Could not compile visual template. Check networks.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Manage Results</h1>
          <p className="text-muted-foreground">{student.name} (Roll: {student.rollNumber})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Professional Personalization Panel */}
          <Card className="glass border-2 border-primary/10 overflow-hidden shadow-md shadow-primary/5 rounded-3xl">
            <CardHeader className="bg-primary/5 border-b border-primary/5">
              <CardTitle className="text-base flex items-center gap-2 font-black tracking-tight text-foreground">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                Transcript customizer & Board scales
              </CardTitle>
              <CardDescription className="text-xs">Select curriculum boards, configure signatures, dates, design templates, and call counselor AI</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6 text-foreground">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* School Name */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">School / Institution Name</Label>
                  <Input 
                    value={schoolName} 
                    onChange={e => setSchoolName(e.target.value)} 
                    placeholder="Enter Institution Name"
                    className="rounded-xl border-primary/10 focus:border-primary font-bold text-sm h-10"
                  />
                </div>

                {/* Principal Name */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Principal Handwriting signature name</Label>
                  <Input 
                    value={principalName} 
                    onChange={e => setPrincipalName(e.target.value)} 
                    placeholder="Principal Signature Name"
                    className="rounded-xl border-primary/10 focus:border-primary font-bold text-sm h-10"
                  />
                </div>

                {/* Exam Date */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">calendar Exam Date</Label>
                  <Input 
                    type="date"
                    value={examDate} 
                    onChange={e => setExamDate(e.target.value)} 
                    className="rounded-xl border-primary/10 focus:border-primary font-bold text-sm h-10"
                  />
                </div>

                {/* PDF Design Template */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">PDF design Theme template</Label>
                  <Select value={pdfTemplate} onValueChange={(val: any) => setPdfTemplate(val)}>
                    <SelectTrigger className="rounded-xl border-primary/10 font-bold text-sm h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      <SelectItem value="modern" className="text-xs font-semibold">Modern Minimal (Sleek Slate Theme)</SelectItem>
                      <SelectItem value="classic" className="text-xs font-semibold">Academic Classic (Royal Burgundy)</SelectItem>
                      <SelectItem value="colorful" className="text-xs font-semibold">Creative Gradient (Indigo-Cyan theme)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Grading System Selection */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Secondary Grading Scale criteria</Label>
                  <Select value={gradingSystem} onValueChange={setGradingSystem}>
                    <SelectTrigger className="rounded-xl border-primary/10 font-bold text-sm h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      {GRADING_SYSTEMS.map(g => (
                        <SelectItem key={g.id} value={g.id} className="text-xs font-semibold">{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Board Selection */}
                {gradingSystem === 'bangladesh_board' && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bangladesh Education Board selection</Label>
                    <Select value={boardName} onValueChange={setBoardName}>
                      <SelectTrigger className="rounded-xl border-primary/10 font-bold text-sm h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass">
                        {BANGLADESH_BOARDS.map(bn => (
                          <SelectItem key={bn} value={bn} className="text-xs font-semibold">{bn}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Gemini AI Consultation Panel */}
              <div className="border-t border-dashed border-primary/15 pt-6 mt-2">
                <div className="bg-primary/5 hover:bg-primary/10 transition-all border border-primary/5 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                      <h4 className="text-xs font-black uppercase tracking-tight text-foreground">AI Teacher comments & Counseling Planner</h4>
                    </div>
                    <p className="text-[10px] text-muted-foreground max-w-lg">
                      Generate individual diagnostic reviews, strengths mapping, and structural study plans using Gemini Pro instantly.
                    </p>
                  </div>
                  <Button 
                    onClick={generateAiInsights} 
                    disabled={isGeneratingAi || selectedSubjects.length === 0}
                    className="shadow-sm shadow-primary/20 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl gap-2 w-full md:w-auto shrink-0 h-9 text-xs py-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isGeneratingAi ? 'Analyzing Record...' : 'Consult Gemini AI'}
                  </Button>
                </div>

                {aiRemarks && (
                  <div className="mt-4 p-4 border border-indigo-500/10 bg-indigo-500/5 rounded-2xl space-y-3">
                    <div className="text-[9px] text-muted-foreground flex justify-between items-center">
                      <span className="font-bold text-indigo-400 tracking-wider uppercase">Preview of AI Counseling recommendations</span>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setAiRemarks('');
                        setAiStrengths([]);
                        setAiWeaknesses([]);
                        setAiSuggestions([]);
                      }} className="h-5 text-[8px] text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full px-2 py-0">Reset Comments</Button>
                    </div>
                    <p className="text-[11px] leading-relaxed italic text-foreground border-l-2 border-indigo-500/30 pl-3">
                      "{aiRemarks}"
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-2 border-primary/5">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-black italic tracking-tighter">Academic Evaluation</CardTitle>
                <CardDescription>Configure subjects and record evaluation scores</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select onValueChange={addSubject}>
                  <SelectTrigger className="w-[180px] rounded-full">
                    <SelectValue placeholder="Add Subject" />
                  </SelectTrigger>
                  <SelectContent className="glass">
                    {PREDEFINED_SUBJECTS.filter(s => !selectedSubjects.includes(s)).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setSelectedSubjects([])} className="rounded-full h-10 px-4 hover:bg-destructive/5 hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2 pb-4 border-b border-dashed">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-full mb-1">Quick Add Groups</span>
                {Object.entries(subjectCategories).map(([cat, subs]) => (
                  <Button 
                    key={cat} 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[10px] uppercase font-bold rounded-full border border-primary/10 hover:bg-primary/5"
                    onClick={() => {
                      const newSubs = Array.from(new Set([...selectedSubjects, ...subs.filter(s => PREDEFINED_SUBJECTS.includes(s))]));
                      setSelectedSubjects(newSubs);
                    }}
                  >
                    + {cat}
                  </Button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Subject Records</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] font-black italic" onClick={() => quickFill('excellent')}>Excellent Fill</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] font-black italic" onClick={() => quickFill('pass')}>Standard Fill</Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="uppercase text-[10px] font-bold tracking-widest text-[#64748b]/80">Entry (Subject & Credits)</TableHead>
                    <TableHead className="w-[140px] uppercase text-[10px] font-bold tracking-widest text-center text-[#64748b]/80">Score (0-100)</TableHead>
                    <TableHead className="w-[140px] uppercase text-[10px] font-bold tracking-widest text-center text-[#64748b]/80">Letter & GP</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {selectedSubjects.map((sub, idx) => (
                      <motion.tr 
                        key={sub}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10, scale: 0.9 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group border-b border-primary/5 last:border-0"
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm tracking-tight">{sub}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black font-mono">
                              {settings?.subjectCredits?.[sub] ?? 3} Credit Hours
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 justify-center">
                            <Input 
                              type="number" 
                              min="0" 
                              max="100" 
                              variant="ghost"
                              value={marks[sub] ?? ''} 
                              onChange={e => handleMarkChange(sub, e.target.value)}
                              className="h-10 w-24 text-center font-black bg-muted/20 border-none focus:ring-2 focus:ring-primary rounded-xl"
                            />
                            <div className={`w-2 h-2 rounded-full ${(marks[sub] || 0) >= calculateResults.passMark ? 'bg-green-500' : 'bg-destructive'}`} />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const info = getLetterGrade(marks[sub] || 0);
                            const gp = info.gp;
                            return (
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className={`inline-flex items-center justify-center font-black text-xs px-2.5 py-1 rounded-full border border-current select-none min-w-[36px] ${info.color}`}>
                                  {info.label}
                                </span>
                                <span className="text-[10px] font-bold font-mono text-muted-foreground">
                                  GP: {gp.toFixed(2)}
                                </span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeSubject(sub)} className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {selectedSubjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-2xl m-4">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="font-bold tracking-tight">No subjects added to evaluation</p>
                        <p className="text-xs">Use the selector or quick groups above</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex flex-col gap-6 border-t border-primary/5 p-6 bg-primary/[0.02]">
              {/* PDF Gallery Toggle block */}
              <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4 border-b border-dashed border-primary/5 pb-4">
                <div 
                  className="flex items-center gap-3 cursor-pointer select-none group" 
                  onClick={() => setSaveToGallery(!saveToGallery)}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all border ${
                    saveToGallery 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'border-muted-foreground/30 hover:border-primary/50 bg-background'
                  }`}>
                    {saveToGallery && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-tight group-hover:text-primary transition-colors">Save PDF Transcript to Gallery</span>
                    <p className="text-[10px] text-muted-foreground">Persist an official visual transcript card in your visual library</p>
                  </div>
                </div>

                {saveToGallery && (
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Input 
                      placeholder="Add short annotation / note (optional)..." 
                      value={galleryNotes}
                      onChange={e => setGalleryNotes(e.target.value)}
                      className="h-8 max-w-[280px] text-xs rounded-xl focus:ring-1 focus:ring-primary border-primary/10"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between w-full flex-wrap gap-4">
                <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-full">
                  <Button 
                    variant={exportLayout === 'detailed' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setExportLayout('detailed')}
                    className="gap-2 h-8 rounded-full px-4 text-xs font-bold"
                  >
                    <FileText className="w-3.5 h-3.5" /> Detailed Report
                  </Button>
                  <Button 
                    variant={exportLayout === 'compact' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setExportLayout('compact')}
                    className="gap-2 h-8 rounded-full px-4 text-xs font-bold"
                  >
                    <LayoutIcon className="w-3.5 h-3.5" /> Basic Sheet
                  </Button>
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="default" className="rounded-full shadow-lg shadow-green-500/20 bg-green-600 hover:bg-green-700 gap-2 px-6" />
                      }
                    >
                      <Send className="w-4 h-4" /> Send to Parents
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="glass" align="end">
                      <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Channel</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={sendToWhatsApp} className="gap-2 focus:bg-green-500/10 focus:text-green-600 cursor-pointer">
                        <MessageSquare className="w-4 h-4" /> WhatsApp Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={sendViaSMS} className="gap-2 focus:bg-blue-500/10 focus:text-blue-600 cursor-pointer">
                        <Phone className="w-4 h-4" /> Direct SMS
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={sendViaEmail} className="gap-2 focus:bg-indigo-500/10 focus:text-indigo-600 cursor-pointer">
                        <Mail className="w-4 h-4" /> Parent Email
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="outline" onClick={exportPDF} disabled={selectedSubjects.length === 0} className="rounded-full shadow-sm hover:shadow-md transition-shadow">
                    <Download className="w-4 h-4 mr-2" /> PDF Export
                  </Button>
                  <Button onClick={saveResult} disabled={isSaving || selectedSubjects.length === 0} className="rounded-full shadow-lg shadow-primary/20 px-8">
                    <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Processing...' : 'Commit Record'}
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Live Calculation Preview */}
        <div className="space-y-6">
          <Card className="sticky top-6 overflow-hidden border-2 border-primary/20" ref={resultRef}>
            <div className={`h-2 w-full ${calculateResults.isPass ? 'bg-green-500' : 'bg-red-500'}`} />
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Result Preview</CardTitle>
                  <CardDescription>Academic Session 2024</CardDescription>
                </div>
                {calculateResults.isPass ? 
                  <CheckCircle2 className="w-8 h-8 text-green-500" /> : 
                  <XCircle className="w-8 h-8 text-red-500" />
                }
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-6 border rounded-xl bg-muted/30">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Status</div>
                <div className={`text-5xl font-black ${calculateResults.isPass ? 'text-green-600' : 'text-red-600'}`}>
                  {calculateResults.isPass ? 'PASS' : 'FAIL'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Required: {calculateResults.passMark} per subject</div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-muted/50 rounded-xl text-center">
                  <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Total Marks</div>
                  <div className="text-lg font-black tracking-tight">{calculateResults.total.toFixed(0)}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-xl text-center">
                  <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Average</div>
                  <div className="text-lg font-black tracking-tight">{calculateResults.average.toFixed(1)}%</div>
                </div>
                <div className="p-3 bg-primary/10 border border-primary/10 rounded-xl text-center shadow-sm">
                  <div className="text-[9px] font-bold text-primary uppercase tracking-wider">
                    {gradingSystem === 'bangladesh_board' ? 'GPA (5.0)' : gradingSystem === 'gce_o_level' ? 'O/A Level' : 'GPA (4.0)'}
                  </div>
                  <div className="text-lg font-black tracking-tight text-primary font-mono">{calculateResults.gpa.toFixed(2)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase">Subjects Breakup</Label>
                {selectedSubjects.map(sub => {
                  const credit = settings?.subjectCredits?.[sub] ?? 3;
                  const gp = getLetterGrade(marks[sub] || 0).gp;
                  return (
                    <div key={sub} className="flex justify-between text-xs py-1.5 border-b border-dashed items-center">
                      <div className="flex flex-col">
                        <span className="font-semibold">{sub}</span>
                        <span className="text-[10px] text-muted-foreground">{credit} Credits</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          gp > 0 ? "bg-primary/5 text-primary border-primary/20 font-black" : "bg-destructive/5 text-destructive border-destructive/20"
                        }`}>
                          GP: {gp.toFixed(2)}
                        </span>
                        <span className={marks[sub] < calculateResults.passMark ? 'text-red-500 font-bold font-mono' : 'font-semibold font-mono'}>
                          {marks[sub] ?? 0}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 text-[10px] flex flex-col items-start gap-3">
              <div className="w-full flex justify-between items-center pb-2 border-b border-primary/5">
                <div className="font-bold uppercase tracking-wider">Student Identity</div>
                <div className="font-mono font-bold">{student.rollNumber}</div>
              </div>
              <div className="space-y-1 w-full pt-1 border-b border-primary/5 pb-2">
                <div className="flex items-center gap-2 opacity-80">
                   <Phone className="w-3.5 h-3.5 text-green-500" /> <span className="font-semibold">{student.parentPhone || 'No Phone Saved'}</span>
                </div>
                <div className="flex items-center gap-2 opacity-80">
                   <Mail className="w-3.5 h-3.5 text-indigo-500" /> <span className="font-semibold">{student.parentEmail || 'No Email Saved'}</span>
                </div>
              </div>
              <Button 
                onClick={exportPDF} 
                disabled={selectedSubjects.length === 0} 
                className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-black tracking-tight flex items-center justify-center gap-2 py-5 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 cursor-pointer mt-1"
              >
                <Download className="w-4 h-4" /> Download Report PDF (ডাউনলোড পিডিএফ)
              </Button>
              <div className="pt-1 text-[8px] uppercase tracking-widest opacity-40 w-full text-center">Generated: {new Date().toLocaleDateString()}</div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};
