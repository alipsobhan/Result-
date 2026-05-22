import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useFirebase } from './FirebaseProvider';
import { Result } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Trash2, Search, History as HistoryIcon, TrendingUp, Download, CheckSquare, Square, FileSpreadsheet, Activity, Users, Award, Image, ArrowUpDown, ArrowUp, ArrowDown, Bookmark, BookmarkCheck, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';

export const HistoryPage: React.FC = () => {
  const { user } = useFirebase();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<'date' | 'name' | 'grade'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
  const [editedNotesId, setEditedNotesId] = useState<string | null>(null);
  const [editedNotesValue, setEditedNotesValue] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchResults();
  }, [user]);

  const fetchResults = async () => {
    try {
      const q = query(
        collection(db, 'results'),
        where('userId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Result[];
      setResults(list);
    } catch (error) {
      console.error('History fetch error:', error);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (results.length === 0) return;
    const headers = ['Date', 'Student Name', 'Roll Number', 'Total Marks', 'Average %', 'GPA (4.0 Scale)', 'Status'];
    const csvContent = [
      headers.join(','),
      ...results.map(r => [
        new Date(r.createdAt as any).toLocaleDateString(),
        `"${r.studentName}"`,
        r.rollNumber,
        r.totalMarks,
        r.average.toFixed(2),
        r.gpa !== undefined ? r.gpa.toFixed(2) : '-',
        r.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Academic_History_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Exported');
  };

  const exportSingleResultPDF = async (result: Result) => {
    toast.loading(`Drafting Official Transcript for ${result.studentName}...`);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const element = document.createElement('div');
      element.style.padding = '40px';
      element.style.width = '800px';
      element.style.backgroundColor = 'white';

      const getGradePointForMark = (mark: number, passMark: number = 33): number => {
        if (mark < passMark) return 0.0;
        if (mark >= 80) return 4.0;
        if (mark >= 70) return 3.75;
        if (mark >= 60) return 3.25;
        if (mark >= 50) return 2.75;
        if (mark >= 40) return 2.0;
        return 1.0;
      };

      const getLetterGrade = (mark: number, passMark: number = 33): string => {
        if (mark < passMark) return 'F';
        if (mark >= 80) return 'A+';
        if (mark >= 70) return 'A';
        if (mark >= 60) return 'A-';
        if (mark >= 50) return 'B';
        if (mark >= 40) return 'C';
        return 'D';
      };

      const passMark = result.passMark ?? 33;
      const subjectsList = Object.entries(result.marks);

      element.innerHTML = `
        <div style="border: 12px double #1e3a8a; padding: 35px; font-family: 'Inter', sans-serif; min-height: 1040px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; background: #ffffff;">
          <div>
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 4px double #1e3a8a; padding-bottom: 20px; margin-bottom: 25px;">
              <div style="display: flex; align-items: center; gap: 15px;">
                <div style="width: 70px; height: 70px; background: #1e3a8a; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #fbcfe8; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                    <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
                  </svg>
                </div>
                <div>
                  <h1 style="margin: 0; color: #1e3a8a; font-size: 28px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">St. Mark's Academy</h1>
                  <p style="margin: 3px 0; color: #3b82f6; font-size: 11px; font-weight: 805; letter-spacing: 1.5px; text-transform: uppercase;">Smart Result & Academic Evaluation Registry</p>
                  <div style="font-size: 11px; color: #64748b; font-family: monospace;">TRANSCRIPT ID: SRM-${Math.random().toString(36).substr(2, 9).toUpperCase()}</div>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="background: ${result.status === 'Pass' ? '#10b981' : '#ef4444'}; color: white; padding: 12px 24px; border-radius: 12px; font-weight: 900; font-size: 22px; display: inline-block; letter-spacing: 1px;">
                  ${result.status.toUpperCase()}
                </div>
                <p style="margin: 8px 0 0 0; font-weight: bold; font-size: 13px; color: #334155;">Date: ${new Date(result.createdAt as any).toLocaleDateString()}</p>
              </div>
            </div>
            
            <!-- Student Info -->
            <div style="margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; padding: 25px; border-radius: 16px; border: 1px solid #e2e8f0;">
              <div>
                <label style="font-weight: 800; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 5px;">Student Details</label>
                <div style="font-size: 20px; font-weight: 800; color: #1e293b;">${result.studentName}</div>
                <div style="font-size: 13px; color: #475569; margin-top: 4px;">Identification Number: 2024-REG-${result.rollNumber}</div>
              </div>
              <div>
                <label style="font-weight: 800; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 5px;">Academic Session</label>
                <div style="font-size: 18px; font-weight: 800; color: #1e293b;">Roll No: ${result.rollNumber}</div>
                <div style="font-size: 13px; color: #475569; margin-top: 4px;">Educational Period: 2023-2024 (Annual)</div>
              </div>
            </div>

            <!-- Subject Performance Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 35px; font-size: 13px;">
              <thead>
                <tr style="background-color: #1e3a8a; color: #ffffff;">
                  <th style="padding: 14px 18px; text-align: left; font-weight: 800; border-top-left-radius: 8px; border-bottom-left-radius: 8px; text-transform: uppercase;">Subject</th>
                  <th style="padding: 14px 18px; text-align: center; font-weight: 800; text-transform: uppercase;">Credits</th>
                  <th style="padding: 14px 18px; text-align: center; font-weight: 800; text-transform: uppercase;">Marks</th>
                  <th style="padding: 14px 18px; text-align: center; font-weight: 800; text-transform: uppercase;">Letter Grade</th>
                  <th style="padding: 14px 18px; text-align: center; font-weight: 800; text-transform: uppercase;">Grade Point</th>
                  <th style="padding: 14px 18px; text-align: center; font-weight: 800; border-top-right-radius: 8px; border-bottom-right-radius: 8px; text-transform: uppercase;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${subjectsList.map(([sub, mark]) => {
                  const gp = getGradePointForMark(mark, passMark);
                  const isSailing = mark >= passMark;
                  const letterGrade = getLetterGrade(mark, passMark);
                  const credits = 3;

                  return `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 14px 18px; font-weight: bold; color: #1e293b;">${sub}</td>
                      <td style="padding: 14px 18px; text-align: center; font-family: monospace; font-weight: bold; color: #475569;">${credits}</td>
                      <td style="padding: 14px 18px; text-align: center; font-weight: bold; font-family: monospace; font-size: 14px; color: #1e293b;">${mark}</td>
                      <td style="padding: 14px 18px; text-align: center; font-weight: bold; color: ${isSailing ? '#1e3a8a' : '#ef4444'};">${letterGrade}</td>
                      <td style="padding: 14px 18px; text-align: center; font-family: monospace; font-weight: black; font-size: 14px; color: ${isSailing ? '#0284c7' : '#ef4444'};">${gp.toFixed(2)}</td>
                      <td style="padding: 14px 18px; text-align: center;">
                        <span style="color: ${isSailing ? '#059669' : '#dc2626'}; font-weight: 800; font-size: 11px; background: ${isSailing ? '#ecfdf5' : '#fef2f2'}; padding: 4px 10px; border-radius: 9999px; border: 1.5px solid currentColor;">
                          ${isSailing ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Bottom Footer Container -->
          <div>
            <!-- Summary Stats Panel -->
            <div style="background: #1e293b; color: white; padding: 25px 30px; border-radius: 16px; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; align-items: center; margin-bottom: 45px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              <div style="text-align: center; border-right: 1.5px solid #334155; padding: 5px 0;">
                <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; margin-bottom: 4px;">Total Marks</div>
                <div style="font-size: 26px; font-weight: 900; font-family: monospace;">${result.totalMarks.toFixed(0)}</div>
              </div>
              <div style="text-align: center; border-right: 1.5px solid #334155; padding: 5px 0;">
                <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; margin-bottom: 4px;">Average %</div>
                <div style="font-size: 26px; font-weight: 900; font-family: monospace;">${result.average.toFixed(1)}%</div>
              </div>
              <div style="text-align: center; border-right: 1.5px solid #334155; padding: 5px 0;">
                <div style="color: #38bdf8; font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; margin-bottom: 4px;">Academic GPA</div>
                <div style="font-size: 30px; font-weight: 900; color: #38bdf8; font-family: monospace;">${(result.gpa ?? 0.00).toFixed(2)}</div>
              </div>
              <div style="text-align: center; padding: 5px 0;">
                <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; margin-bottom: 4px;">Evaluation Status</div>
                <div style="font-size: 22px; font-weight: 950; color: ${result.status === 'Pass' ? '#34d399' : '#f87171'}; letter-spacing: 0.5px;">
                  ${result.status === 'Pass' ? 'PROMOTED' : 'RETAINED'}
                </div>
              </div>
            </div>

            <!-- Parent & Principal Signatures -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 120px; padding: 10px 20px;">
               <div style="text-align: center;">
                 <div style="border-top: 1.5px solid #94a3b8; padding-top: 10px; font-size: 12px; color: #475569; font-weight: 800; letter-spacing: 0.5px;">PARENT / GUARDIAN SIGNATURE</div>
               </div>
               <div style="text-align: center;">
                 <div style="border-top: 1.5px solid #94a3b8; padding-top: 10px; font-size: 12px; color: #475569; font-weight: 800; letter-spacing: 0.5px;">PRINCIPAL / CONTROLLER OF EXAMS</div>
               </div>
            </div>
            
            <!-- Standard Transcript footer notice -->
            <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1.5px solid #f1f5f9; padding-top: 15px; font-weight: bold; letter-spacing: 0.5px;">
              This Academic Statement and Transcript is an officially generated record. No physical signature is required.
              <br/>Smart Result Manager Evaluation Registry • Version 2.0 Web Premium System
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(element);
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      document.body.removeChild(element);
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`${result.rollNumber}_Academic_Report_${result.studentName.replace(/\s+/g, '_')}.pdf`);
      
      toast.dismiss();
      toast.success('Official Report PDF Exported');
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error('Export failed');
    }
  };

  const deleteResult = async (id: string) => {
    if (!confirm('Are you sure you want to delete this result?')) return;
    try {
      await deleteDoc(doc(db, 'results', id));
      setResults(results.filter(r => r.id !== id));
      setSelectedIds(selectedIds.filter(prevId => prevId !== id));
      toast.success('Result deleted');
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const toggleGalleryStatus = async (result: Result) => {
    try {
      const isSaved = !result.savedToGallery;
      await updateDoc(doc(db, 'results', result.id!), {
        savedToGallery: isSaved
      });
      setResults(prev => prev.map(r => r.id === result.id ? { ...r, savedToGallery: isSaved } : r));
      if (isSaved) {
        toast.success(`"${result.studentName}" saved to Transcript Gallery 📚`);
      } else {
        toast.info(`"${result.studentName}" removed from Gallery`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to update gallery status');
    }
  };

  const updateGalleryNotes = async (id: string, notes: string) => {
    try {
      await updateDoc(doc(db, 'results', id), {
        galleryNotes: notes
      });
      setResults(prev => prev.map(r => r.id === id ? { ...r, galleryNotes: notes } : r));
      setEditedNotesId(null);
      toast.success('Notes modified successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update notes');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(r => r.id!));
    }
  };

  const bulkExport = async () => {
    if (selectedIds.length === 0) return;
    
    toast.loading(`Exporting ${selectedIds.length} results...`);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const selectedResults = results.filter(r => selectedIds.includes(r.id!));
      
      for (let i = 0; i < selectedResults.length; i++) {
        const result = selectedResults[i];
        if (i > 0) pdf.addPage();
        
        // Create a temporary element for rendering the high-quality PDF page
        const element = document.createElement('div');
        element.style.padding = '40px';
        element.style.width = '800px';
        element.style.backgroundColor = 'white';
        element.innerHTML = `
          <div style="border: 4px solid #2563eb; padding: 30px; font-family: sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px;">
              <div>
                <h1 style="margin: 0; color: #2563eb;">SMART RESULT MANAGER</h1>
                <p style="margin: 5px 0; color: #666;">Official Academic Report</p>
              </div>
              <div style="text-align: right;">
                <h2 style="margin: 0;">${result.status.toUpperCase()}</h2>
                <p style="margin: 5px 0;">Date: ${new Date(result.createdAt as any).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div style="margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <label style="font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase;">Student Name</label>
                <div style="font-size: 18px; font-weight: bold; margin-top: 5px;">${result.studentName}</div>
              </div>
              <div>
                <label style="font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase;">Roll Number</label>
                <div style="font-size: 18px; font-weight: bold; margin-top: 5px;">${result.rollNumber}</div>
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left;">Subject</th>
                  <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">Marks Obtained</th>
                  <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">Pass Mark</th>
                  <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(result.marks).map(([sub, mark]) => `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${sub}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${mark}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${result.passMark}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; color: ${mark >= result.passMark ? 'green' : 'red'}; font-weight: bold;">
                      ${mark >= result.passMark ? 'P' : 'F'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; border-top: 2px solid #e5e7eb; padding-top: 20px;">
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
                <div style="font-size: 14px; color: #666;">Summary Statistics</div>
                <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                  <span>Total Marks:</span>
                  <span style="font-weight: bold;">${result.totalMarks}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                  <span>Average Score:</span>
                  <span style="font-weight: bold;">${result.average.toFixed(2)}%</span>
                </div>
                ${result.gpa !== undefined ? `
                <div style="display: flex; justify-content: space-between; margin-top: 10px; color: #2563eb;">
                  <span style="font-weight: bold;">GPA (4.00 Scale):</span>
                  <span style="font-weight: bold;">${result.gpa.toFixed(2)}</span>
                </div>
                ` : ''}
              </div>
              <div style="display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end;">
                <div style="border-top: 1px solid #000; width: 200px; text-align: center; margin-top: 50px; font-size: 12px;">Authorized Signature</div>
              </div>
            </div>
          </div>
        `;
        
        document.body.appendChild(element);
        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        document.body.removeChild(element);
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgWidth = pdfWidth - 20; // Margin
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      }
      
      pdf.save(`Bulk_Results_${new Date().getTime()}.pdf`);
      toast.dismiss();
      toast.success('Bulk PDF Exported');
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error('Bulk export failed');
    }
  };

  const chartsContainerRef = React.useRef<HTMLDivElement>(null);

  const exportChartsAsPNG = async () => {
    if (results.length === 0) {
      toast.error('No analytics data to export');
      return;
    }
    const toastId = toast.loading('Capturing visual analytics dashboard...');
    try {
      const element = chartsContainerRef.current;
      if (!element) {
        toast.dismiss(toastId);
        toast.error('Charts container not found');
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `Academic_Performance_Analytics_${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.dismiss(toastId);
      toast.success('Visual analytics charts exported as PNG!');
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('Failed to export charts as PNG');
    }
  };

  const filtered = results.filter(r => 
    r.rollNumber.includes(search) || r.studentName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSort = (field: 'date' | 'name' | 'grade') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  const sortedAndFiltered = [...filtered].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'date') {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt as any).getTime();
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt as any).getTime();
      comparison = dateA - dateB;
    } else if (sortField === 'name') {
      comparison = a.studentName.localeCompare(b.studentName);
    } else if (sortField === 'grade') {
      const gpaA = a.gpa ?? 0;
      const gpaB = b.gpa ?? 0;
      if (gpaA === gpaB) {
        comparison = (a.average ?? 0) - (b.average ?? 0);
      } else {
        comparison = gpaA - gpaB;
      }
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Prepare chart data (chronological)
  const chartData = [...results].reverse().map(r => ({
    name: r.studentName,
    avg: parseFloat(r.average.toFixed(1)),
    total: r.totalMarks,
    date: new Date(r.createdAt as any).toLocaleDateString()
  }));

  const stats = {
    total: results.length,
    passed: results.filter(r => r.status === 'Pass').length,
    avgScore: results.length ? results.reduce((acc, r) => acc + r.average, 0) / results.length : 0,
    passRate: results.length ? (results.filter(r => r.status === 'Pass').length / results.length) * 100 : 0
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-3xl m-6">
        <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
          <HistoryIcon className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-black italic tracking-tighter">AUTHENTICATION REQUIRED</h2>
        <p className="text-muted-foreground mt-2 max-w-sm">Secure storage of academic records is only available for authorized users. Please login to access your vault.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent italic leading-[0.9]">
            History &<br/>Analytics
          </h1>
          <p className="text-muted-foreground font-medium">Archive of all recorded student evaluations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-2 rounded-full border-primary/20 hover:bg-primary/5">
            <FileSpreadsheet className="w-4 h-4" /> CSV Export
          </Button>
          {selectedIds.length > 0 && (
            <Button onClick={bulkExport} className="gap-2 rounded-full shadow-lg shadow-primary/20 animate-in slide-in-from-right-4">
              <Download className="w-4 h-4" /> Batch Export ({selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Files', val: stats.total, icon: HistoryIcon, color: 'text-blue-500' },
          { label: 'Passed Entries', val: stats.passed, icon: Award, color: 'text-green-500' },
          { label: 'Success Rate', val: `${stats.passRate.toFixed(1)}%`, icon: Activity, color: 'text-orange-500' },
          { label: 'Avg. Rating', val: `${stats.avgScore.toFixed(1)}%`, icon: Users, color: 'text-indigo-500' }
        ].map((s, i) => (
          <Card key={i} className="glass border-2 border-primary/5 hover:border-primary/10 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{s.label}</p>
                <div className="text-2xl font-black italic mt-1">{s.val}</div>
              </div>
              <div className={`p-2 bg-muted/50 rounded-xl ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Mode Switching Tabs */}
      <div className="flex justify-center md:justify-start items-center p-1 bg-muted/30 rounded-2xl w-fit border border-primary/5 select-none self-end">
        <Button
          variant={viewMode === 'table' ? 'default' : 'ghost'}
          onClick={() => setViewMode('table')}
          className="gap-2 rounded-xl text-xs font-black uppercase tracking-wider h-9 px-6 transition-all"
        >
          <List className="w-3.5 h-3.5" /> Registry & Charts
        </Button>
        <Button
          variant={viewMode === 'gallery' ? 'default' : 'ghost'}
          onClick={() => setViewMode('gallery')}
          className="gap-2 rounded-xl text-xs font-black uppercase tracking-wider h-9 px-6 transition-all"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" /> PDF Gallery
          {results.filter(r => r.savedToGallery).length > 0 && (
            <span className="ml-1 bg-amber-500 text-white rounded-full px-2 py-0.5 text-[8px] font-black leading-none">
              {results.filter(r => r.savedToGallery).length}
            </span>
          )}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'table' ? (
          <motion.div
            key="table-pane"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Visual Analytics Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 pb-2">
              <div>
                <h2 className="text-xl font-black italic tracking-tighter flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" /> VISUAL PERFORMANCE METRICS
                </h2>
                <p className="text-xs text-muted-foreground">Interactive graphs showing student performance progression and distributions</p>
              </div>
              {chartData.length > 0 && (
                <Button 
                  onClick={exportChartsAsPNG} 
                  className="gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:opacity-90 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 cursor-pointer text-xs transition-all"
                >
                  <Image className="w-4 h-4" /> Export Charts as PNG
                </Button>
              )}
            </div>

            <div ref={chartsContainerRef} className="space-y-8 bg-background/50 p-6 rounded-3xl border border-primary/5">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Analytics Card */}
                <motion.div 
                  className="lg:col-span-4" 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Card className="glass border-2 border-primary/5 overflow-hidden w-full">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-dashed border-primary/5">
                      <div>
                        <CardTitle className="inline-flex items-center gap-2 text-xl font-black italic tracking-tighter">
                          <TrendingUp className="w-5 h-5 text-primary" /> Performance Timeline
                        </CardTitle>
                        <CardDescription>Visual trend of average percentage scores</CardDescription>
                      </div>
                      <div className="flex gap-4 text-xs font-mono">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /> SCORE</div>
                      </div>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-8 px-0">
                      {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis dataKey="name" hide />
                            <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}
                              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                              labelStyle={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}
                            />
                            <Area type="monotone" dataKey="avg" stroke="#7c3aed" strokeWidth={4} fillOpacity={1} fill="url(#colorAvg)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground border-2 border-dashed rounded-3xl mx-6">
                          ARCHIVE IS EMPTY — GENERATE RESULTS TO SEE TRENDS
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Total Marks vs Average Marks Bar Chart Card */}
                <motion.div 
                  className="lg:col-span-4" 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Card className="glass border-2 border-primary/5 overflow-hidden w-full">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-dashed border-primary/5">
                      <div>
                        <CardTitle className="inline-flex items-center gap-2 text-xl font-black italic tracking-tighter">
                          <Activity className="w-5 h-5 text-emerald-500" /> Total Marks vs Average % Analysis
                        </CardTitle>
                        <CardDescription>Comparison metric of absolute total marks and relative average percentages for all students</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="h-[320px] pt-8 px-4">
                      {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 10, right: 15, left: 15, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fontSize: 10, fontWeight: 'bold', fill: 'currentColor' }} 
                              stroke="#64748b" 
                              opacity={0.8}
                            />
                            <YAxis 
                              yAxisId="left" 
                              orientation="left" 
                              stroke="#10b981" 
                              tick={{ fontSize: 10, fontWeight: 'bold' }} 
                              axisLine={false}
                              tickLine={false}
                              label={{ value: 'Total Marks', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '10px', fontWeight: 'bold', fill: '#10b981' } }} 
                            />
                            <YAxis 
                              yAxisId="right" 
                              orientation="right" 
                              stroke="#3b82f6" 
                              tick={{ fontSize: 10, fontWeight: 'bold' }} 
                              axisLine={false}
                              tickLine={false}
                              label={{ value: 'Average %', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: '10px', fontWeight: 'bold', fill: '#3b82f6' } }} 
                            />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}
                              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                              labelStyle={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                            <Bar yAxisId="left" dataKey="total" name="Total Marks" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={45} />
                            <Bar yAxisId="right" dataKey="avg" name="Average %" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground border-2 border-dashed rounded-3xl mx-6">
                          ARCHIVE IS EMPTY — GENERATE RESULTS TO SEE COMPARISON
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>

            {/* List Card */}
            <Card className="lg:col-span-4 glass border-2 border-primary/5">
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dashed border-primary/5 pb-6">
                <div>
                  <CardTitle className="text-xl font-black italic tracking-tighter">Evaluation Register</CardTitle>
                  <CardDescription>Detailed log of all committed academic records</CardDescription>
                </div>
                <div className="relative w-full md:w-80 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    className="pl-10 h-11 border-2 border-primary/5 rounded-full focus:ring-2 focus:ring-primary focus:border-transparent transition-all" 
                    placeholder="Lookup by roll or name..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 space-y-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-muted/40 animate-pulse rounded-2xl" />)}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2 hover:bg-transparent">
                        <TableHead className="w-[40px] pl-6">
                          <Button variant="ghost" size="icon" onClick={toggleSelectAll} className="rounded-full">
                            {selectedIds.length === filtered.length && filtered.length > 0 ? 
                              <CheckSquare className="w-5 h-5 text-primary" /> : 
                              <Square className="w-5 h-5 text-muted-foreground/30" />
                            }
                          </Button>
                        </TableHead>
                        <TableHead 
                          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer select-none hover:text-primary transition-colors pr-2"
                          onClick={() => handleSort('date')}
                        >
                          <div className="flex items-center gap-1">
                            TIMESTAMP
                            {sortField === 'date' ? (
                              sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                            ) : <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer select-none hover:text-primary transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            STUDENT
                            {sortField === 'name' ? (
                              sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                            ) : <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />}
                          </div>
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">ID/ROLL</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">SCORE</TableHead>
                        <TableHead 
                          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center cursor-pointer select-none hover:text-primary transition-colors"
                          onClick={() => handleSort('grade')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            AVERAGE
                            {sortField === 'grade' ? (
                              sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                            ) : <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center cursor-pointer select-none hover:text-primary transition-colors"
                          onClick={() => handleSort('grade')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            GPA (4.0)
                            {sortField === 'grade' ? (
                              sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                            ) : <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />}
                          </div>
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">RESULT</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right pr-6">CONTROL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAndFiltered.map((result, idx) => (
                        <TableRow key={result.id} className={`${selectedIds.includes(result.id!) ? 'bg-primary/[0.03]' : ''} border-b border-primary/5 last:border-0 h-16 group transition-colors`}>
                          <TableCell className="pl-6">
                            <Button variant="ghost" size="icon" onClick={() => toggleSelect(result.id!)} className="rounded-full">
                              {selectedIds.includes(result.id!) ? 
                                <CheckSquare className="w-5 h-5 text-primary" /> : 
                                <Square className="w-5 h-5 text-muted-foreground/30" />
                              }
                            </Button>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-muted-foreground/60 font-mono">
                            {(result.createdAt as Date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-bold tracking-tight text-foreground/80">
                            <div className="flex items-center gap-2">
                              <span>{result.studentName}</span>
                              {result.savedToGallery && (
                                <BookmarkCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Saved to Gallery" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">{result.rollNumber}</TableCell>
                          <TableCell className="text-center font-black">{result.totalMarks.toFixed(0)}</TableCell>
                          <TableCell className="text-center font-black text-primary">{result.average.toFixed(1)}%</TableCell>
                          <TableCell className="text-center font-mono font-black text-violet-600">
                            {result.gpa !== undefined ? result.gpa.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                              result.status === 'Pass' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                            }`}>
                              {result.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => toggleGalleryStatus(result)} 
                                className={`opacity-0 group-hover:opacity-100 transition-opacity rounded-full ${
                                  result.savedToGallery 
                                    ? 'text-amber-500 hover:bg-amber-500/10' 
                                    : 'text-muted-foreground/35 hover:bg-muted/10'
                                }`}
                                title={result.savedToGallery ? "Remove from Transcript Gallery" : "Save to Transcript Gallery"}
                              >
                                {result.savedToGallery ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => exportSingleResultPDF(result)} 
                                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full text-primary hover:bg-primary/10"
                                title="Download PDF"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => deleteResult(result.id!)} 
                                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-destructive/10 hover:text-destructive"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {sortedAndFiltered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-24 text-muted-foreground">
                            <div className="space-y-2">
                               <HistoryIcon className="w-12 h-12 mx-auto opacity-10" />
                               <p className="font-bold tracking-tight italic">NO RECORDS ARCHIVED</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
              <CardFooter className="bg-primary/[0.02] border-t border-primary/5 py-4 px-6 flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                 <div>End of Archive</div>
                 <div>Total Records: {filtered.length}</div>
              </CardFooter>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="gallery-pane"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-black italic tracking-tighter flex items-center gap-2 text-amber-500">
                  <BookmarkCheck className="w-6 h-6 text-amber-500 fill-amber-500/10" /> PDF TRANSCRIPT GALLERY
                </h2>
                <p className="text-xs text-muted-foreground">Official student visual transcript cards stored in your persistent gallery</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  className="pl-10 h-10 border-2 border-primary/5 rounded-full" 
                  placeholder="Filter gallery cards..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {results.filter(r => r.savedToGallery).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 text-center glass rounded-3xl border-2 border-dashed border-primary/5 p-6 space-y-4">
                <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center animate-bounce">
                  <Bookmark className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black italic tracking-tight">GALLERY IS CURRENTLY VACANT</h3>
                  <p className="text-muted-foreground text-xs max-w-md mx-auto">
                    You haven't added any academic certificates to your gallery. Toggle the bookmark icon beside students in your register list, or check "Save PDF Transcript to Gallery" when committing marks.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results
                  .filter(r => r.savedToGallery)
                  .filter(r => 
                    r.studentName.toLowerCase().includes(search.toLowerCase()) || 
                    r.rollNumber.includes(search)
                  )
                  .map((res) => (
                    <motion.div
                      key={res.id}
                      className="relative rounded-3xl border-2 border-primary/5 overflow-hidden transition-all hover:border-primary/25 bg-background hover:shadow-xl hover:-translate-y-1 duration-300 flex flex-col justify-between"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Premium Diploma Ribbon border */}
                      <div className="h-3 bg-gradient-to-r from-violet-500 via-amber-400 to-indigo-600" />
                      
                      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black tracking-widest text-primary uppercase">OFFICIAL TRANSCRIPT</span>
                            <h4 className="text-lg font-black tracking-tight leading-tight uppercase text-foreground">{res.studentName}</h4>
                            <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/60 p-1.5 py-0.5 rounded-md inline-block">ROLL: {res.rollNumber}</span>
                          </div>
                          
                          {/* Mini visual seal */}
                          <div className="w-10 h-10 rounded-full border-2 border-dashed border-amber-500/50 flex items-center justify-center text-amber-500 bg-amber-500/5 select-none font-mono font-bold shrink-0">
                            <Award className="w-4 h-4" />
                          </div>
                        </div>

                        {/* Summary metrics block */}
                        <div className="grid grid-cols-3 gap-2 bg-muted/30 p-2.5 rounded-2xl text-center border border-primary/[0.03]">
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block">AVERAGE</span>
                            <div className="text-xs font-black text-rose-500 font-mono leading-none mt-1">{res.average.toFixed(1)}%</div>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block">GPA</span>
                            <div className="text-xs font-black text-violet-600 font-mono leading-none mt-1">{(res.gpa ?? 0).toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block">STATUS</span>
                            <span className={`inline-block px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase mt-1 leading-none ${
                              res.status === 'Pass' ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-600'
                            }`}>
                              {res.status}
                            </span>
                          </div>
                        </div>

                        {/* Short snapshot of marks */}
                        <div className="p-3 bg-muted/20 rounded-2xl space-y-1">
                          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Subject Breakup Match</span>
                          {Object.entries(res.marks || {}).slice(0, 3).map(([sub, mark]) => (
                            <div key={sub} className="flex justify-between items-center text-[11px] font-bold text-muted-foreground/80">
                              <span className="truncate max-w-[120px]">{sub}</span>
                              <span className={mark >= res.passMark ? 'text-green-500 font-mono' : 'text-red-500 font-bold font-mono'}>{mark}</span>
                            </div>
                          ))}
                          {Object.keys(res.marks || {}).length > 3 && (
                            <span className="text-[8px] font-black text-primary uppercase text-right block pt-1 font-mono">
                              + {Object.keys(res.marks).length - 3} OTHER SUBJECTS
                            </span>
                          )}
                        </div>

                        {/* Annotations block */}
                        <div className="pt-2 border-t border-dashed border-primary/5">
                          {editedNotesId === res.id ? (
                            <div className="space-y-2">
                              <Input 
                                value={editedNotesValue}
                                onChange={(e) => setEditedNotesValue(e.target.value)}
                                placeholder="Annotate this transcript..."
                                className="h-8 text-xs rounded-lg"
                                maxLength={100}
                                autoFocus
                              />
                              <div className="flex justify-end gap-1.5 text-[10px]">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-6 text-[10px] rounded" 
                                  onClick={() => setEditedNotesId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="h-6 text-[10px] rounded px-3" 
                                  onClick={() => updateGalleryNotes(res.id!, editedNotesValue)}
                                >
                                  Save Note
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              className="text-xs text-muted-foreground hover:bg-muted/10 p-1.5 rounded-xl cursor-edit group flex justify-between items-start transition-colors"
                              onClick={() => {
                                setEditedNotesId(res.id!);
                                setEditedNotesValue(res.galleryNotes ?? '');
                              }}
                              title="Click to modify"
                            >
                              <p className="italic font-medium line-clamp-2">
                                {res.galleryNotes ? res.galleryNotes : "Click to write a memo or feedback..."}
                              </p>
                              <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Actions in Gallery Card */}
                        <div className="flex gap-2 pt-2">
                          <Button 
                            className="flex-1 rounded-2xl h-10 gap-2 font-black text-xs shadow-md shadow-primary/10" 
                            onClick={() => exportSingleResultPDF(res)}
                          >
                            <Download className="w-3.5 h-3.5" /> Export PDF
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="rounded-2xl h-10 w-10 text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer" 
                            title="Remove from gallery"
                            onClick={() => toggleGalleryStatus(res)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
  );
};
