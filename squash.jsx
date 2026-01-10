import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDocs, 
  onSnapshot, query, deleteDoc, writeBatch 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Trophy, Calendar, ClipboardCheck, Award, Megaphone, 
  Calculator, LogOut, User, ShieldCheck, Plus, Trash2, 
  ChevronRight, Save, Download, RefreshCw
} from 'lucide-react';

// --- Firebase 配置 ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'squash-management-v1';

// --- 常量定義 ---
const BADGE_AWARDS = {
  "白金章": { points: 400, icon: "💎" },
  "金章": { points: 200, icon: "🥇" },
  "銀章": { points: 100, icon: "🥈" },
  "銅章": { points: 50, icon: "🥉" },
  "無": { points: 0, icon: "" }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('📅 訓練日程表');
  const [loading, setLoading] = useState(true);

  // 數據狀態
  const [rankings, setRankings] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [awards, setAwards] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [classPlayers, setClassPlayers] = useState([]);

  // --- 初始化 Auth ---
  useEffect(() => {
    const init = async () => {
      await signInAnonymously(auth);
    };
    init();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        // 保持匿名登入狀態，具體身份由登入表單控制
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Firestore 實時監聽 ---
  useEffect(() => {
    if (!user) return;

    const collections = [
      { name: 'rankings', setter: setRankings },
      { name: 'schedules', setter: setSchedules },
      { name: 'attendance_records', setter: setAttendance },
      { name: 'announcements', setter: setAnnouncements },
      { name: 'student_awards', setter: setAwards },
      { name: 'tournaments', setter: setTournaments },
      { name: 'class_players', setter: setClassPlayers }
    ];

    const unsubscribes = collections.map(col => {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', col.name));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        col.setter(data);
      }, (err) => console.error(`Error loading ${col.name}:`, err));
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  // --- 登入組件 ---
  if (!user) {
    return <LoginScreen onLogin={(u, admin) => { setUser(u); setIsAdmin(admin); }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* 側邊欄 */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Trophy size={20} />
            </div>
            <h1 className="font-black tracking-tighter text-lg">正覺壁球管理</h1>
          </div>
          <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-slate-50 rounded-lg">
            {isAdmin ? <ShieldCheck className="text-green-600" size={16} /> : <User className="text-blue-600" size={16} />}
            <span className="text-xs font-bold truncate">{isAdmin ? "管理員模式" : `學生: ${user}`}</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { id: '📅 訓練日程表', icon: <Calendar size={18} /> },
            { id: '🏆 隊員排行榜', icon: <Trophy size={18} /> },
            { id: '📝 考勤點名', icon: <ClipboardCheck size={18} /> },
            { id: '🏅 學生得獎紀錄', icon: <Award size={18} /> },
            { id: '📢 活動公告', icon: <Megaphone size={18} /> },
            { id: '🗓️ 比賽報名', icon: <ChevronRight size={18} /> },
            ...(isAdmin ? [{ id: '💰 預算核算', icon: <Calculator size={18} /> }] : [])
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {item.icon}
              {item.id}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-500 font-bold text-sm hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={16} /> 登出系統
          </button>
        </div>
      </aside>

      {/* 主內容區 */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          {activeTab === '📅 訓練日程表' && <ScheduleView schedules={schedules} isAdmin={isAdmin} />}
          {activeTab === '🏆 隊員排行榜' && <RankingView rankings={rankings} classPlayers={classPlayers} isAdmin={isAdmin} />}
          {activeTab === '📝 考勤點名' && <AttendanceView attendance={attendance} classPlayers={classPlayers} schedules={schedules} isAdmin={isAdmin} userId={user} />}
          {activeTab === '🏅 學生得獎紀錄' && <AwardsView awards={awards} isAdmin={isAdmin} currentUserName={user} />}
          {activeTab === '📢 活動公告' && <AnnouncementView announcements={announcements} isAdmin={isAdmin} />}
          {activeTab === '🗓️ 比賽報名' && <TournamentView tournaments={tournaments} isAdmin={isAdmin} />}
          {activeTab === '💰 預算核算' && <FinanceView />}
        </div>
      </main>
    </div>
  );
}

// --- 子組件: 登入介面 ---
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('student');
  const [classCode, setClassCode] = useState('');
  const [studentNum, setStudentNum] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (mode === 'admin') {
      if (password === '8888') onLogin('ADMIN', true);
      else alert('管理員密碼錯誤');
    } else {
      if (classCode && studentNum) onLogin(`${classCode.toUpperCase()}${studentNum.padStart(2, '0')}`, false);
      else alert('請填寫班級及學號');
    }
  };

  return (
    <div className="min-h-screen bg-blue-600 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10">
        <div className="text-center mb-10">
          <div className="inline-block bg-blue-100 text-blue-600 p-4 rounded-3xl mb-4">
            <Trophy size={40} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter">正覺壁球管理系統</h1>
          <p className="text-slate-400 text-sm mt-2 font-medium">SQUASH TEAM PORTAL</p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
          <button onClick={() => setMode('student')} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${mode === 'student' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>學生/家長</button>
          <button onClick={() => setMode('admin')} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${mode === 'admin' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>管理員</button>
        </div>

        <div className="space-y-4">
          {mode === 'student' ? (
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="班別 (如: 1A)" className="px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 ring-blue-500" value={classCode} onChange={e => setClassCode(e.target.value)} />
              <input type="text" placeholder="學號 (如: 01)" className="px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 ring-blue-500" value={studentNum} onChange={e => setStudentNum(e.target.value)} />
            </div>
          ) : (
            <input type="password" placeholder="管理員密碼" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 ring-blue-500" value={password} onChange={e => setPassword(e.target.value)} />
          )}
          <button onClick={handleLogin} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">登入系統</button>
        </div>
      </div>
    </div>
  );
}

// --- 子組件: 排行榜 ---
function RankingView({ rankings, classPlayers, isAdmin }) {
  const [isAddingAward, setIsAddingAward] = useState(false);
  const [formData, setFormData] = useState({ name: '', grade: '', class: '', badge: '無' });

  const sortedRankings = useMemo(() => {
    return [...rankings].sort((a, b) => (b.積分 || 0) - (a.積分 || 0));
  }, [rankings]);

  const handleSync = async () => {
    if (!window.confirm('確定要從名單同步新學生嗎？（不會重複添加）')) return;
    const batch = writeBatch(db);
    classPlayers.forEach(p => {
      const exists = rankings.some(r => r.姓名 === p.姓名 && r.年級 === p.年級);
      if (!exists) {
        const newRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'rankings'), `${p.班級}_${p.姓名}`);
        batch.set(newRef, { 年級: p.年級 || '', 班級: p.班級 || '', 姓名: p.姓名, 積分: 100, 章別: '無' });
      }
    });
    await batch.commit();
    alert('同步完成');
  };

  const handleBadgeAward = async (e) => {
    e.preventDefault();
    const { name, grade, badge } = formData;
    const existing = rankings.find(r => r.姓名 === name && r.年級 === grade);
    const bonus = BADGE_AWARDS[badge]?.points || 0;

    const ref = existing 
      ? doc(db, 'artifacts', appId, 'public', 'data', 'rankings', existing.id)
      : doc(collection(db, 'artifacts', appId, 'public', 'data', 'rankings'));

    await setDoc(ref, {
      姓名: name,
      年級: grade,
      班級: formData.class || existing?.班級 || '-',
      章別: badge,
      積分: (Number(existing?.積分) || 100) + bonus
    }, { merge: true });

    setIsAddingAward(false);
    setFormData({ name: '', grade: '', class: '', badge: '無' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter">PLAYER RANKINGS</h2>
          <p className="text-slate-400 text-xs font-bold mt-1 uppercase">香港壁球總會章別加分制</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={handleSync} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-blue-600 transition-all shadow-lg"><RefreshCw size={18} /></button>
            <button onClick={() => setIsAddingAward(!isAddingAward)} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg"><Plus size={18} /> 發放獎勵</button>
          </div>
        )}
      </div>

      {isAddingAward && (
        <form onSubmit={handleBadgeAward} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <input placeholder="學生姓名" className="bg-slate-50 px-4 py-3 rounded-xl outline-none border-none text-sm font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            <input placeholder="年級 (P4)" className="bg-slate-50 px-4 py-3 rounded-xl outline-none border-none text-sm font-bold" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} required />
            <input placeholder="班別 (4A)" className="bg-slate-50 px-4 py-3 rounded-xl outline-none border-none text-sm font-bold" value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})} />
            <select className="bg-slate-50 px-4 py-3 rounded-xl outline-none border-none text-sm font-bold" value={formData.badge} onChange={e => setFormData({...formData, badge: e.target.value})}>
              {Object.keys(BADGE_AWARDS).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-black">確認發放積分</button>
        </form>
      )}

      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">排名</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">年級/班級</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">隊員姓名</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">榮譽勳章</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">積分</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sortedRankings.map((p, idx) => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${idx < 3 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{idx + 1}</div>
                </td>
                <td className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-tighter">{p.年級} {p.班級}</td>
                <td className="px-6 py-5 font-black text-slate-700">{p.姓名}</td>
                <td className="px-6 py-5">
                  {p.章別 && p.章別 !== '無' ? (
                    <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-black">
                      {BADGE_AWARDS[p.章別]?.icon} {p.章別}
                    </span>
                  ) : <span className="text-slate-300 text-xs">-</span>}
                </td>
                <td className="px-6 py-5 text-right font-black text-blue-600 text-xl tracking-tighter">{p.積分 || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- 子組件: 訓練日程 ---
function ScheduleView({ schedules, isAdmin }) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black italic tracking-tighter">TRAINING SCHEDULE</h2>
      <div className="grid gap-4">
        {schedules.length > 0 ? schedules.map(s => (
          <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-lg transition-all">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-xl">
                <Calendar size={24} />
              </div>
              <div>
                <p className="font-black text-xl text-slate-800">{s.班級 || s.訓練名稱}</p>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{s.具體日期 || s.時間}</p>
              </div>
            </div>
            <div className="bg-blue-50 px-4 py-2 rounded-full text-[10px] font-black text-blue-600 uppercase">
              {s.地點 || '校內壁球室'}
            </div>
          </div>
        )) : <p className="text-center p-20 text-slate-300 italic">暫無訓練數據</p>}
      </div>
    </div>
  );
}

// --- 子組件: 考勤點名 ---
function AttendanceView({ attendance, classPlayers, schedules, isAdmin, userId }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const classList = useMemo(() => [...new Set(schedules.map(s => s.班級))].filter(Boolean), [schedules]);
  const dateList = useMemo(() => {
    const sched = schedules.find(s => s.班級 === selectedClass);
    return sched?.具體日期 ? sched.具體日期.split(',').map(d => d.trim()) : [];
  }, [selectedClass, schedules]);

  const currentRec = useMemo(() => {
    return attendance.find(a => a.班級 === selectedClass && a.日期 === selectedDate);
  }, [attendance, selectedClass, selectedDate]);

  const handleToggleAttendance = async (name) => {
    if (!isAdmin) return;
    const presentList = currentRec?.出席名單 ? currentRec.出席名單.split(', ') : [];
    const newList = presentList.includes(name) 
      ? presentList.filter(n => n !== name)
      : [...presentList, name];

    const docId = `${selectedClass}_${selectedDate}`.replace(/\//g, '-');
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attendance_records', docId), {
      班級: selectedClass,
      日期: selectedDate,
      出席人數: newList.length,
      出席名單: newList.join(', '),
      記錄人: userId
    });
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black italic tracking-tighter">ATTENDANCE LOG</h2>
      
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-100 grid md:grid-cols-2 gap-6">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 block">選擇訓練班別</label>
          <select className="w-full bg-slate-50 px-6 py-4 rounded-2xl font-bold outline-none border-none" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">請選擇班別</option>
            {classList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 block">選擇日期</label>
          <select className="w-full bg-slate-50 px-6 py-4 rounded-2xl font-bold outline-none border-none" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
            <option value="">請選擇日期</option>
            {dateList.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {selectedClass && selectedDate && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
            <div>
              <p className="text-2xl font-black">{selectedClass}</p>
              <p className="text-xs font-bold text-slate-400 uppercase mt-1 tracking-widest">{selectedDate}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-blue-500">{currentRec?.出席人數 || 0}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase">Present</p>
            </div>
          </div>
          <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {classPlayers.filter(p => p.班級 === selectedClass).map(p => {
              const isPresent = currentRec?.出席名單?.includes(p.姓名);
              return (
                <button
                  key={p.姓名}
                  disabled={!isAdmin}
                  onClick={() => handleToggleAttendance(p.姓名)}
                  className={`px-4 py-6 rounded-[2rem] text-sm font-black transition-all border-2 flex flex-col items-center gap-3 ${
                    isPresent 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                      : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPresent ? 'bg-white/20' : 'bg-slate-100'}`}>
                    {isPresent ? <ClipboardCheck size={16} /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                  </div>
                  {p.姓名}
                </button>
              );
            })}
          </div>
          {!isAdmin && (
            <div className="p-4 bg-slate-50 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              僅供查看：當前模式下無法修改點名
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- 子組件: 得獎紀錄 ---
function AwardsView({ awards, isAdmin, currentUserName }) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', comp: '', prize: '', date: '', note: '' });

  const handleAddAward = async (e) => {
    e.preventDefault();
    const id = `award_${formData.name}_${Date.now()}`;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'student_awards', id), formData);
    setIsAdding(false);
    setFormData({ name: '', comp: '', prize: '', date: '', note: '' });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <h2 className="text-3xl font-black italic tracking-tighter">HONOR BOARD</h2>
        {isAdmin && <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2"><Plus size={18} /> 新增得獎</button>}
      </div>

      {isAdding && (
        <form onSubmit={handleAddAward} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="學生姓名" className="bg-slate-50 p-4 rounded-xl font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            <input type="date" className="bg-slate-50 p-4 rounded-xl font-bold" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
          </div>
          <input placeholder="比賽名稱" className="bg-slate-50 p-4 rounded-xl font-bold" value={formData.comp} onChange={e => setFormData({...formData, comp: e.target.value})} required />
          <input placeholder="獎項 (如: 冠軍)" className="bg-slate-50 p-4 rounded-xl font-bold" value={formData.prize} onChange={e => setFormData({...formData, prize: e.target.value})} required />
          <textarea placeholder="備註" className="bg-slate-50 p-4 rounded-xl font-bold h-24" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
          <button type="submit" className="bg-blue-600 text-white py-4 rounded-xl font-black">儲存得獎紀錄</button>
        </form>
      )}

      <div className="grid gap-4">
        {awards.sort((a,b) => b.date?.localeCompare(a.date)).map(a => {
          const isOwn = currentUserName?.includes(a.name);
          return (
            <div key={a.id} className={`p-8 rounded-[2.5rem] border-2 transition-all shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${isOwn ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-50'}`}>
              <div className="flex gap-6">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl ${isOwn ? 'bg-blue-600' : 'bg-yellow-400'}`}>🏆</div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{a.prize}</h3>
                  <p className="text-slate-400 font-bold text-sm mt-1">{a.comp}</p>
                  <p className="text-[10px] font-black text-slate-300 uppercase mt-2 tracking-widest">{a.name} • {a.date}</p>
                </div>
              </div>
              {isAdmin && <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'student_awards', a.id))} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={20}/></button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- 子組件: 公告 ---
function AnnouncementView({ announcements, isAdmin }) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });

  const handlePost = async (e) => {
    e.preventDefault();
    const id = `ann_${Date.now()}`;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', id), {
      ...formData,
      date: new Date().toISOString().split('T')[0]
    });
    setIsAdding(false);
    setFormData({ title: '', content: '' });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <h2 className="text-3xl font-black italic tracking-tighter">ANNOUNCEMENTS</h2>
        {isAdmin && <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2"><Plus size={18} /> 發布公告</button>}
      </div>

      {isAdding && (
        <form onSubmit={handlePost} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 grid gap-4">
          <input placeholder="公告標題" className="bg-slate-50 p-4 rounded-xl font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
          <textarea placeholder="公告內容" className="bg-slate-50 p-4 rounded-xl font-bold h-32" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} required />
          <button type="submit" className="bg-slate-900 text-white py-4 rounded-xl font-black">即刻發布</button>
        </form>
      )}

      <div className="space-y-6">
        {announcements.sort((a,b) => b.date?.localeCompare(a.date)).map(a => (
          <div key={a.id} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{a.date}</div>
            <h3 className="text-2xl font-black text-slate-800 mb-4 pr-24">{a.title}</h3>
            <div className="text-slate-500 font-medium leading-relaxed whitespace-pre-line">{a.content}</div>
            {isAdmin && <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', a.id))} className="mt-6 text-red-500 text-xs font-bold hover:underline">刪除公告</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 子組件: 比賽 ---
function TournamentView({ tournaments, isAdmin }) {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black italic tracking-tighter">TOURNAMENTS</h2>
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">比賽名稱</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">日期</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">截止日期</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {tournaments.map(t => (
              <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-6 font-black text-slate-800">{t.比賽名稱}</td>
                <td className="px-8 py-6 text-sm font-bold text-slate-500">{t.日期}</td>
                <td className="px-8 py-6 text-sm font-bold text-red-500 italic">{t.截止日期}</td>
                <td className="px-8 py-6 text-right">
                  <a href={t.連結} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-xs font-black hover:bg-blue-600 hover:text-white transition-all">詳情/報名</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- 子組件: 財務核算 ---
function FinanceView() {
  const [students, setStudents] = useState(50);
  const [fee, setFee] = useState(250);
  const [classes, setClasses] = useState({ team: 1, train: 3, hobby: 4 });

  const totalRevenue = students * fee;
  const totalExpense = (classes.team * 2750) + (classes.train * 1350) + (classes.hobby * 1200);
  const profit = totalRevenue - totalExpense;

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black italic tracking-tighter">FINANCIAL PREVIEW</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-600 p-10 rounded-[3rem] text-white shadow-xl shadow-blue-100">
          <p className="text-[10px] font-black opacity-60 uppercase mb-2 tracking-widest">預算總收入</p>
          <p className="text-4xl font-black">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl shadow-slate-100">
          <p className="text-[10px] font-black opacity-40 uppercase mb-2 tracking-widest">開班總支出</p>
          <p className="text-4xl font-black">${totalExpense.toLocaleString()}</p>
        </div>
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">期末預計利潤</p>
          <p className={`text-4xl font-black ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>${profit.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 space-y-10">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <h3 className="font-black text-xl flex items-center gap-3"><span className="w-2 h-2 bg-blue-600 rounded-full"></span>收入參數</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-4">預計總人數: {students} 人</label>
                <input type="range" min="10" max="150" value={students} onChange={e => setStudents(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none accent-blue-600" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">每人學費 ($)</label>
                <input type="number" value={fee} onChange={e => setFee(Number(e.target.value))} className="w-full bg-slate-50 p-4 rounded-xl font-bold" />
              </div>
            </div>
          </div>
          <div className="space-y-8">
            <h3 className="font-black text-xl flex items-center gap-3"><span className="w-2 h-2 bg-slate-900 rounded-full"></span>支出結構 (班數)</h3>
            <div className="grid grid-cols-1 gap-4">
              {[['校隊 (2750/班)', 'team'], ['訓練班 (1350/班)', 'train'], ['興趣班 (1200/班)', 'hobby']].map(([label, key]) => (
                <div key={key} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                  <span className="text-sm font-bold text-slate-600">{label}</span>
                  <input type="number" value={classes[key]} onChange={e => setClasses({...classes, [key]: Number(e.target.value)})} className="w-20 bg-white p-2 rounded-lg text-center font-black" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
