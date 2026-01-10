import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Trophy, 
  Calendar, 
  DollarSign, 
  Bell, 
  Award, 
  Menu, 
  X, 
  ChevronRight,
  Plus,
  CheckCircle2,
  TrendingUp,
  LogOut
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';

// --- Firebase 配置 (請確保環境變數已設定) ---
const firebaseConfig = JSON.parse(window.__firebase_config || '{}');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = window.__app_id || 'squash-pro-v2';

export default function App() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // 財務狀態模擬
  const [finance, setFinance] = useState({
    studentCount: 50,
    feePerStudent: 250,
    classes: { team: 1, train: 3, hobby: 4 }
  });

  useEffect(() => {
    // 匿名登入 (照 Rule 3)
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error", err);
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // 監聽學生數據 (照 Rule 1 & 2)
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- 功能邏輯 ---
  const handleCheckIn = async (student) => {
    const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id);
    await updateDoc(studentRef, {
      points: (student.points || 0) + 1,
      lastCheckIn: new Date().toISOString()
    });
  };

  const calculateFinance = () => {
    const revenue = finance.studentCount * finance.feePerStudent;
    const expenses = (finance.classes.team * 2750) + (finance.classes.train * 1350) + (finance.classes.hobby * 1200);
    return { revenue, expenses, profit: revenue - expenses };
  };

  const { revenue, expenses, profit } = calculateFinance();

  // --- UI 組件 ---
  const SidebarLink = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        activeTab === id 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
      {activeTab === id && <ChevronRight size={16} className="ml-auto" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900">
      {/* 側邊欄 */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transition-transform duration-300 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-lg">
              <Trophy size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">正覺壁球</h1>
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarLink id="attendance" icon={CheckCircle2} label="考勤點名" />
            <SidebarLink id="ranking" icon={TrendingUp} label="積分排行" />
            <SidebarLink id="schedule" icon={Calendar} label="訓練日程" />
            <SidebarLink id="finance" icon={DollarSign} label="預算核算" />
            <SidebarLink id="awards" icon={Award} label="榮譽榜" />
          </nav>

          <div className="mt-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold truncate">{user ? '管理員模式' : '載入中...'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.uid}</p>
              </div>
              <button className="text-slate-400 hover:text-red-500 transition-colors">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* 主內容區 */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-20 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 px-8 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-blue-600 transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {activeTab === 'attendance' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-800">考勤點名</h2>
                  <p className="text-slate-500">今日訓練：{new Date().toLocaleDateString('zh-TW')}</p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-blue-100 flex items-center gap-2 font-bold transition-transform hover:scale-105">
                  <Plus size={20} /> 新增學員
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {students.map(s => (
                  <div key={s.id} className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        👤
                      </div>
                      <div className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        {s.level || '一般'}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">{s.name}</h3>
                    <div className="flex items-center gap-2 text-blue-600 mb-6 font-mono font-bold">
                      <TrendingUp size={14} />
                      {s.points || 0} Points
                    </div>
                    <button 
                      onClick={() => handleCheckIn(s)}
                      className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-all shadow-md active:scale-95"
                    >
                      點名簽到
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-black text-slate-800">預算模擬</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-100 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-2">預計總收入</p>
                  <p className="text-4xl font-black">${revenue.toLocaleString()}</p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">總支出</p>
                  <p className="text-4xl font-black text-slate-800">${expenses.toLocaleString()}</p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">純利潤</p>
                  <p className={`text-4xl font-black ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${profit.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                    收入設定
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm text-slate-500 mb-2 font-medium">本期學生人數</label>
                      <input 
                        type="range" min="1" max="200" 
                        value={finance.studentCount} 
                        onChange={(e) => setFinance({...finance, studentCount: e.target.value})}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="text-right mt-2 font-mono font-bold text-blue-600">{finance.studentCount} 人</div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-500 mb-2 font-medium">每人學費 ($)</label>
                      <input 
                        type="number" 
                        value={finance.feePerStudent} 
                        onChange={(e) => setFinance({...finance, feePerStudent: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                    開班數配置 (支出)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {['team', 'train', 'hobby'].map(type => (
                      <div key={type} className="p-4 bg-slate-50 rounded-2xl">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                          {type === 'team' ? '校隊' : type === 'train' ? '中級' : '興趣'}
                        </label>
                        <input 
                          type="number" 
                          value={finance.classes[type]} 
                          onChange={(e) => setFinance({...finance, classes: {...finance.classes, [type]: e.target.value}})}
                          className="w-full bg-transparent text-xl font-black outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ranking' && (
             <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                  <h2 className="text-2xl font-bold">積分排行榜</h2>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-full">TOP 10</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black">
                      <tr>
                        <th className="px-8 py-4 text-left">Rank</th>
                        <th className="px-8 py-4 text-left">Student</th>
                        <th className="px-8 py-4 text-left">Level</th>
                        <th className="px-8 py-4 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[...students].sort((a,b) => (b.points||0) - (a.points||0)).map((s, i) => (
                        <tr key={s.id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-8 py-6">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              i === 0 ? 'bg-amber-100 text-amber-600' : 
                              i === 1 ? 'bg-slate-100 text-slate-600' :
                              i === 2 ? 'bg-orange-100 text-orange-600' : 'text-slate-400'
                            }`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-8 py-6 font-bold text-slate-700">{s.name}</td>
                          <td className="px-8 py-6 text-slate-400 text-sm">{s.level || '校隊'}</td>
                          <td className="px-8 py-6 text-right">
                            <span className="text-lg font-black text-blue-600">{s.points || 0}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}
