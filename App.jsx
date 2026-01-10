import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDoc, getDocs, 
  query, onSnapshot, updateDoc, deleteDoc, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  Trophy, Users, Calendar, DollarSign, LayoutDashboard, 
  CheckCircle, Search, Bell, MoreHorizontal, ChevronRight, 
  Filter, ArrowUpRight, Check, Plus, Trash2, LogOut, UserPlus,
  Coins, TrendingUp, Download
} from 'lucide-react';

// --- Firebase 配置 ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'squash-management-v1';

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance');
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // 預算設定狀態 (對應 Python 邏輯)
  const [budgetConfig, setBudgetConfig] = useState({
    nTeam: 1, costTeamUnit: 2750,
    nTrain: 3, costTrainUnit: 1350,
    nHobby: 4, costHobbyUnit: 1200,
    totalStudents: 50,
    feePerStudent: 250
  });

  // 1. 初始化 Auth (Rule 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. 監聽 Firestore 資料 (Rule 1 & 2)
  useEffect(() => {
    if (!user) return;

    // 監聽學員資料
    const studentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'students');
    const unsubStudents = onSnapshot(studentsRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(list);
      setLoading(false);
    }, (err) => console.error(err));

    // 監聽今日點名紀錄
    const today = new Date().toISOString().split('T')[0];
    const attendanceRef = collection(db, 'artifacts', appId, 'public', 'data', 'attendance');
    const unsubAttendance = onSnapshot(attendanceRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendanceRecords(list.filter(r => r.date === today));
    });

    return () => {
      unsubStudents();
      unsubAttendance();
    };
  }, [user]);

  // --- 功能邏輯 ---

  // 點名 (儲存至 Firestore)
  const handleCheckIn = async (student) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const recordId = `${today}_${student.id}`;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'attendance', recordId);
    
    await setDoc(docRef, {
      studentId: student.id,
      studentName: student.name,
      date: today,
      timestamp: serverTimestamp(),
      status: 'present'
    });

    // 更新學員最後點名時間與積分 (範例：點名加10分)
    const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id);
    await updateDoc(studentRef, {
      lastAttended: today,
      points: (student.points || 0) + 10
    });
  };

  // 新增學員
  const addStudent = async () => {
    const name = prompt("請輸入學員姓名:");
    if (!name) return;
    const className = prompt("請輸入班級 (例如: 校隊 A 班):", "中級 B 班");
    
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), {
      name,
      class: className,
      points: 0,
      rank: students.length + 1,
      createdAt: serverTimestamp(),
      avatar: Math.random() > 0.5 ? '👦' : '👧'
    });
  };

  // 計算預算 (對應 Python 邏輯)
  const financialSummary = useMemo(() => {
    const revenue = budgetConfig.totalStudents * budgetConfig.feePerStudent;
    const expense = (budgetConfig.nTeam * budgetConfig.costTeamUnit) + 
                    (budgetConfig.nTrain * budgetConfig.costTrainUnit) + 
                    (budgetConfig.nHobby * budgetConfig.costHobbyUnit);
    return { revenue, expense, profit: revenue - expense };
  }, [budgetConfig]);

  // --- UI 元件 ---

  if (!user) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-slate-500 font-bold">正在連接安全伺服器...</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* 側邊導覽 */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Trophy size={22} />
          </div>
          <h1 className="text-lg font-black tracking-tighter">SQUASH PRO</h1>
        </div>

        <nav className="space-y-1 flex-1">
          {[
            { id: 'dashboard', label: '儀表板', icon: LayoutDashboard },
            { id: 'attendance', label: '考勤點名', icon: CheckCircle },
            { id: 'students', label: '學員管理', icon: Users },
            { id: 'finance', label: '財務預算', icon: DollarSign },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <item.icon size={18} />
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">當前用戶 UID</p>
          <p className="text-[10px] font-mono break-all text-slate-600 bg-white p-2 rounded border">{user.uid}</p>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="h-16 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded-lg w-72">
            <Search size={16} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="搜尋學員..." 
              className="bg-transparent border-none focus:outline-none text-xs w-full font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right">
                <p className="text-xs font-black text-slate-800">教練管理端</p>
                <p className="text-[10px] text-slate-400">系統在線中</p>
             </div>
             <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">A</div>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto space-y-8">
          
          {/* 切換頁面內容 */}
          {activeTab === 'attendance' && (
            <>
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">今日點名</h2>
                  <p className="text-slate-400 text-sm font-medium">點擊按鈕確認學員出席，積分將自動累計</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-6 shadow-sm">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase">已到人數</p>
                    <p className="text-xl font-black text-blue-600">{attendanceRecords.length}</p>
                  </div>
                  <div className="w-px bg-slate-100"></div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase">應到總數</p>
                    <p className="text-xl font-black text-slate-800">{students.length}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {students
                  .filter(s => s.name.includes(searchTerm))
                  .sort((a,b) => (a.name > b.name ? 1 : -1))
                  .map(student => {
                    const isPresent = attendanceRecords.some(r => r.studentId === student.id);
                    return (
                      <div key={student.id} className={`p-6 bg-white rounded-3xl border transition-all ${
                        isPresent ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100 hover:shadow-xl'
                      }`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
                            {student.avatar || '👤'}
                          </div>
                          <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-1 rounded">
                            {student.class}
                          </span>
                        </div>
                        <h3 className="text-xl font-black mb-1">{student.name}</h3>
                        <p className="text-xs text-slate-400 font-medium mb-6">積分: {student.points || 0} pts</p>
                        
                        <button 
                          onClick={() => handleCheckIn(student)}
                          disabled={isPresent}
                          className={`w-full py-3 rounded-xl font-black text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${
                            isPresent 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-slate-900 text-white hover:bg-blue-600'
                          }`}
                        >
                          {isPresent ? <><Check size={16}/> 已出席</> : '確認簽到'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </>
          )}

          {activeTab === 'students' && (
            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-2xl font-black">學員名冊</h2>
                <button 
                  onClick={addStudent}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100"
                >
                  <UserPlus size={18} /> 新增學員
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      <th className="px-8 py-4">學員</th>
                      <th className="px-8 py-4">班級</th>
                      <th className="px-8 py-4 text-center">積分排名</th>
                      <th className="px-8 py-4">最後活動</th>
                      <th className="px-8 py-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {students.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 flex items-center gap-3">
                          <span className="text-xl">{s.avatar}</span>
                          <span className="font-bold">{s.name}</span>
                        </td>
                        <td className="px-8 py-5 text-sm text-slate-500">{s.class}</td>
                        <td className="px-8 py-5 text-center">
                          <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-black">
                            {s.points || 0} pts
                          </span>
                        </td>
                        <td className="px-8 py-5 text-sm text-slate-400">{s.lastAttended || '無紀錄'}</td>
                        <td className="px-8 py-5 text-right">
                          <button 
                            onClick={async () => {
                              if(window.confirm('確定刪除此學員？')) {
                                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id));
                              }
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                    <TrendingUp className="text-blue-600" /> 收支預算核算
                  </h3>
                  <div className="grid grid-cols-2 gap-8 mb-10">
                    <div className="space-y-4">
                      <p className="text-xs font-black text-slate-400 uppercase">🏫 開班支出設定</p>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold">校隊班 ($2750/班)</label>
                          <input 
                            type="number" 
                            className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold"
                            value={budgetConfig.nTeam}
                            onChange={(e) => setBudgetConfig({...budgetConfig, nTeam: parseInt(e.target.value) || 0})}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold">訓練班 ($1350/班)</label>
                          <input 
                            type="number" 
                            className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold"
                            value={budgetConfig.nTrain}
                            onChange={(e) => setBudgetConfig({...budgetConfig, nTrain: parseInt(e.target.value) || 0})}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold">興趣班 ($1200/班)</label>
                          <input 
                            type="number" 
                            className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold"
                            value={budgetConfig.nHobby}
                            onChange={(e) => setBudgetConfig({...budgetConfig, nHobby: parseInt(e.target.value) || 0})}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs font-black text-slate-400 uppercase">💵 學費收入設定</p>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold">總學生人數</label>
                          <input 
                            type="number" 
                            className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold"
                            value={budgetConfig.totalStudents}
                            onChange={(e) => setBudgetConfig({...budgetConfig, totalStudents: parseInt(e.target.value) || 0})}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold">每人學費 ($)</label>
                          <input 
                            type="number" 
                            className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold"
                            value={budgetConfig.feePerStudent}
                            onChange={(e) => setBudgetConfig({...budgetConfig, feePerStudent: parseInt(e.target.value) || 0})}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl">
                  <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em] mb-4">預計結算報告</p>
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs font-bold opacity-70">總收入 (REVENUE)</p>
                      <p className="text-3xl font-black">${financialSummary.revenue.toLocaleString()}</p>
                    </div>
                    <div className="h-px bg-white/10"></div>
                    <div>
                      <p className="text-xs font-bold opacity-70">總支出 (EXPENSE)</p>
                      <p className="text-3xl font-black text-red-400">${financialSummary.expense.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/10 p-6 rounded-2xl">
                      <p className="text-xs font-bold opacity-70 mb-1">純利潤 (PROFIT)</p>
                      <p className={`text-4xl font-black ${financialSummary.profit >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                        ${financialSummary.profit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <button className="w-full bg-white border border-slate-200 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                  <Download size={16}/> 匯出 PDF 報表
                </button>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
             <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-100">
                      <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-white/10 rounded-xl"><Users size={24}/></div>
                        <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded">LIVE</span>
                      </div>
                      <p className="text-xs font-bold opacity-80 mb-1">本期總學生數</p>
                      <p className="text-5xl font-black">{students.length}</p>
                   </div>
                   <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle size={24}/></div>
                      </div>
                      <p className="text-xs font-black text-slate-400 uppercase mb-1">今日出席率</p>
                      <p className="text-5xl font-black text-slate-900">
                        {students.length > 0 ? ((attendanceRecords.length / students.length) * 100).toFixed(0) : 0}%
                      </p>
                   </div>
                   <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Coins size={24}/></div>
                      </div>
                      <p className="text-xs font-black text-slate-400 uppercase mb-1">預計利潤</p>
                      <p className="text-5xl font-black text-slate-900">${financialSummary.profit.toLocaleString()}</p>
                   </div>
                </div>
                
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100">
                   <h3 className="text-xl font-black mb-6">學員積分排行榜</h3>
                   <div className="space-y-4">
                      {students.sort((a,b) => (b.points || 0) - (a.points || 0)).slice(0, 5).map((s, idx) => (
                        <div key={s.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                             idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-white text-slate-400'
                           }`}>
                             {idx + 1}
                           </div>
                           <div className="text-2xl">{s.avatar}</div>
                           <div className="flex-1">
                              <p className="font-black text-slate-800">{s.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{s.class}</p>
                           </div>
                           <div className="text-right">
                              <p className="font-black text-blue-600">{s.points || 0}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Points</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;
