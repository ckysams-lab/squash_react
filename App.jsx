import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  DollarSign, 
  Plus, 
  Trash2, 
  UserCheck,
  Calendar as CalendarIcon,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Loader2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  query
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';

/**
 * --- Firebase 初始化 ---
 * 注意：在 Vercel 生產環境中，這些變數通常來自環境變數。
 * 此處適配環境提供的配置。
 */
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : { /* 您的 Firebase Config 備份 */ };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'squash-mgmt-app';

// --- 主要組件 ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // 財務設定狀態
  const [financeConfig, setFinanceConfig] = useState({
    nTeam: 1, costTeam: 2750,
    nTrain: 3, costTrain: 1350,
    nHobby: 4, costHobby: 1200,
    totalStudents: 50, feePerStudent: 250
  });

  // 1. Firebase 認證監聽 (遵循 Rule 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. 數據監聽 (遵循 Rule 1 & 2)
  useEffect(() => {
    if (!user) return;

    // 監聽學生名單 (路徑符合 Rule 1)
    const qStudents = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(data);
    }, (err) => console.error("Students error:", err));

    // 監聽考勤紀錄
    const qAttendance = query(collection(db, 'artifacts', appId, 'public', 'data', 'attendance'));
    const unsubAttendance = onSnapshot(qAttendance, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendance(data);
    }, (err) => console.error("Attendance error:", err));

    return () => {
      unsubStudents();
      unsubAttendance();
    };
  }, [user]);

  // --- 資料操作邏輯 ---
  const addStudent = async (name, level) => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), {
      name,
      level,
      joinDate: new Date().toISOString().split('T')[0],
      active: true,
      createdBy: user.uid
    });
  };

  const deleteStudent = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id));
  };

  const toggleAttendance = async (studentId, date) => {
    if (!user) return;
    const recordId = `${studentId}_${date}`;
    const recordRef = doc(db, 'artifacts', appId, 'public', 'data', 'attendance', recordId);
    const snap = await getDoc(recordRef);

    if (snap.exists()) {
      await deleteDoc(recordRef);
    } else {
      await setDoc(recordRef, {
        studentId,
        date,
        status: 'present',
        timestamp: new Date().toISOString()
      });
    }
  };

  // 財務計算 (Memoized)
  const financialSummary = useMemo(() => {
    const revenue = financeConfig.totalStudents * financeConfig.feePerStudent;
    const expense = (financeConfig.nTeam * financeConfig.costTeam) + 
                    (financeConfig.nTrain * financeConfig.costTrain) + 
                    (financeConfig.nHobby * financeConfig.costHobby);
    return { revenue, expense, profit: revenue - expense };
  }, [financeConfig]);

  // --- 子頁面組件 ---
  
  const Dashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-500 font-medium">總學生人數</p>
            <Users className="text-blue-500" size={20} />
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{students.length} <span className="text-sm font-normal text-slate-400">位</span></h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-500 font-medium">今日出席</p>
            <ClipboardCheck className="text-green-500" size={20} />
          </div>
          <h3 className="text-3xl font-bold text-slate-800">
            {attendance.filter(a => a.date === new Date().toISOString().split('T')[0]).length} <span className="text-sm font-normal text-slate-400">位</span>
          </h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-500 font-medium">預計盈餘</p>
            <DollarSign className="text-orange-500" size={20} />
          </div>
          <h3 className="text-3xl font-bold text-slate-800">${financialSummary.profit.toLocaleString()}</h3>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-3xl text-white shadow-xl shadow-blue-200">
        <h3 className="text-xl font-bold mb-2">歡迎回來，教練</h3>
        <p className="text-blue-100 opacity-90 mb-6 max-w-md text-sm">
          系統已連結 Firebase 實時數據庫，您的任何更改都會即時同步給其他協作人員。
        </p>
        <button 
          onClick={() => setActiveTab('attendance')}
          className="bg-white text-blue-600 px-6 py-2 rounded-full font-bold text-sm hover:bg-blue-50 transition-colors"
        >
          立即點名
        </button>
      </div>
    </div>
  );

  const StudentList = () => {
    const [newName, setNewName] = useState('');
    const [newLevel, setNewLevel] = useState('校隊');
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 bg-white border-b flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-xl text-slate-800">學員名冊</h3>
          <div className="flex w-full sm:w-auto gap-2">
            <input 
              type="text" 
              placeholder="輸入學員姓名" 
              className="flex-1 sm:w-48 px-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 ring-blue-500/20"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <select 
              className="px-4 py-2 bg-slate-50 border-none rounded-xl text-sm"
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value)}
            >
              <option>校隊</option>
              <option>非校隊</option>
              <option>簡易班</option>
            </select>
            <button 
              onClick={() => { if(newName) { addStudent(newName, newLevel); setNewName(''); } }}
              className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-slate-400 border-b">
                <th className="p-6 font-medium">姓名</th>
                <th className="p-6 font-medium">級別</th>
                <th className="p-6 font-medium">加入日期</th>
                <th className="p-6 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map(s => (
                <tr key={s.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="p-6 font-semibold text-slate-700">{s.name}</td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      s.level === '校隊' ? 'bg-purple-100 text-purple-700' : 
                      s.level === '非校隊' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {s.level}
                    </span>
                  </td>
                  <td className="p-6 text-slate-400">{s.joinDate}</td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => deleteStudent(s.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && (
            <div className="p-12 text-center text-slate-400">尚無學員資料，請由右上方新增。</div>
          )}
        </div>
      </div>
    );
  };

  const AttendanceView = () => {
    const today = new Date().toISOString().split('T')[0];
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-slate-800">每日考勤</h3>
            <p className="text-slate-500 text-sm">點擊學員卡片即可完成簽到</p>
          </div>
          <div className="bg-white border px-4 py-2 rounded-xl shadow-sm font-mono text-blue-600">
            {today}
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {students.map(s => {
            const isPresent = attendance.some(a => a.studentId === s.id && a.date === today);
            return (
              <button 
                key={s.id}
                onClick={() => toggleAttendance(s.id, today)}
                className={`p-5 rounded-2xl border-2 transition-all flex flex-col gap-3 relative overflow-hidden ${
                  isPresent 
                    ? 'border-green-500 bg-green-50 shadow-green-100 shadow-lg' 
                    : 'border-white bg-white hover:border-slate-200 shadow-sm'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPresent ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {isPresent ? <UserCheck size={20} /> : <Users size={20} />}
                </div>
                <div className="text-left">
                  <p className={`font-bold ${isPresent ? 'text-green-900' : 'text-slate-700'}`}>{s.name}</p>
                  <p className={`text-[10px] ${isPresent ? 'text-green-600' : 'text-slate-400'}`}>{s.level}</p>
                </div>
                {isPresent && (
                  <div className="absolute top-0 right-0 p-2">
                    <div className="bg-green-500 w-2 h-2 rounded-full animate-ping" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const FinancialView = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><DollarSign size={20}/></div>
            <h4 className="font-bold text-slate-800">預計支出 (開班費)</h4>
          </div>
          <div className="space-y-5">
            {[
              { label: '校隊訓練班 (班)', key: 'nTeam' },
              { label: '非校隊訓練班 (班)', key: 'nTrain' },
              { label: '簡易運動班 (班)', key: 'nHobby' }
            ].map(item => (
              <div key={item.key}>
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">{item.label}</label>
                <input 
                  type="number" 
                  className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 ring-red-500/20 transition-all" 
                  value={financeConfig[item.key]} 
                  onChange={e => setFinanceConfig({...financeConfig, [item.key]: Number(e.target.value)})}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><DollarSign size={20}/></div>
            <h4 className="font-bold text-slate-800">預計收入 (學費)</h4>
          </div>
          <div className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">預計總人數</label>
              <input 
                type="number" 
                className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 ring-green-500/20 transition-all" 
                value={financeConfig.totalStudents} 
                onChange={e => setFinanceConfig({...financeConfig, totalStudents: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">每位學員學費 ($)</label>
              <input 
                type="number" 
                className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 ring-green-500/20 transition-all" 
                value={financeConfig.feePerStudent} 
                onChange={e => setFinanceConfig({...financeConfig, feePerStudent: Number(e.target.value)})}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 text-white p-10 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <DollarSign size={160} />
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-10 relative z-10">
          <div className="text-center md:text-left">
            <p className="text-slate-400 text-sm font-medium mb-1">預計總收入</p>
            <p className="text-4xl font-bold text-green-400 font-mono">${financialSummary.revenue.toLocaleString()}</p>
          </div>
          <div className="h-12 w-px bg-slate-800 hidden md:block" />
          <div className="text-center md:text-left">
            <p className="text-slate-400 text-sm font-medium mb-1">預計總支出</p>
            <p className="text-4xl font-bold text-red-400 font-mono">${financialSummary.expense.toLocaleString()}</p>
          </div>
          <div className="h-12 w-px bg-slate-800 hidden md:block" />
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center min-w-[200px]">
            <p className="text-blue-400 text-sm font-bold mb-1 uppercase tracking-widest">淨盈餘</p>
            <p className="text-5xl font-black text-white font-mono">${financialSummary.profit.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-blue-600">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  // --- 佈局架構 ---
  const menuItems = [
    { id: 'dashboard', label: '儀表板', icon: LayoutDashboard },
    { id: 'students', label: '名單管理', icon: Users },
    { id: 'attendance', label: '每日考勤', icon: ClipboardCheck },
    { id: 'financial', label: '財務預算', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* 側邊欄 */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-8 flex flex-col h-full">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <ShieldCheck className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-800">正覺壁球</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Squash Management</p>
            </div>
          </div>
          
          <nav className="flex-1 space-y-2">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200 ${
                  activeTab === item.id 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 translate-x-1' 
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                <item.icon size={22} />
                <span className="font-bold">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-8 border-t border-slate-100">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                {user?.uid?.substring(0,1).toUpperCase() || 'C'}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">線上教練</p>
                <p className="text-[10px] text-slate-400 truncate opacity-70">ID: {user?.uid || 'Loading...'}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* 主內容區 */}
      <main className="flex-1 overflow-y-auto relative h-screen">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg" 
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-bold text-slate-800">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-400 bg-slate-50 px-4 py-2 rounded-full">
              <CalendarIcon size={16} />
              {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'students' && <StudentList />}
          {activeTab === 'attendance' && <AttendanceView />}
          {activeTab === 'financial' && <FinancialView />}
        </div>
      </main>

      {/* 手機版遮罩 */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
