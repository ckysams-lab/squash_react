import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDocs, onSnapshot, 
  query, deleteDoc, addDoc, updateDoc 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken 
} from 'firebase/auth';
import { 
  Calendar, Trophy, ClipboardCheck, Medal, Megaphone, 
  Calculator, LogOut, Shield, User, ChevronRight, Save, Trash2, Plus, Download, RefreshCw
} from 'lucide-react';

// --- Firebase 配置 ---
// 注意：在實際部署時，請將此處替換為您的 Vercel 環境變數或實際 Config
const firebaseConfig = window.VITE_FIREBASE_CONFIG ? JSON.parse(window.VITE_FIREBASE_CONFIG) : {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'squash-management-v1';

// --- 常數定義 ---
const BADGE_AWARDS = {
  "白金章": { points: 400, icon: "💎" },
  "金章": { points: 200, icon: "🥇" },
  "銀章": { points: 100, icon: "🥈" },
  "銅章": { points: 50, icon: "🥉" },
  "無": { points: 0, icon: "" }
};

// --- 組件開始 ---
export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeMenu, setActiveMenu] = useState("📅 訓練日程表");
  const [loginForm, setLoginForm] = useState({ mode: 'student', class: '', num: '', password: '' });
  
  // 數據狀態
  const [schedules, setSchedules] = useState([]);
  const [classPlayers, setClassPlayers] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [awards, setAwards] = useState([]);

  // --- 1. 身份驗證 ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  // --- 2. 數據監聽 (Firestore Real-time) ---
  useEffect(() => {
    if (!user) return;

    const collections = [
      { name: 'schedules', setter: setSchedules },
      { name: 'class_players', setter: setClassPlayers },
      { name: 'rankings', setter: setRankings },
      { name: 'attendance_records', setter: setAttendance },
      { name: 'announcements', setter: setAnnouncements },
      { name: 'tournaments', setter: setTournaments },
      { name: 'student_awards', setter: setAwards }
    ];

    const unsubscribes = collections.map(coll => {
      return onSnapshot(
        collection(db, 'artifacts', appId, 'public', 'data', coll.name),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          coll.setter(data);
        },
        (error) => console.error(`Error fetching ${coll.name}:`, error)
      );
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  // --- 3. 處理登入 ---
  const handleLogin = () => {
    if (loginForm.mode === 'admin') {
      if (loginForm.password === "8888") {
        setIsAdmin(true);
        // 在 React 版中，我們不需要重新設置 User，只需標記 Admin 狀態
      } else {
        alert("管理員密碼錯誤");
      }
    } else {
      if (loginForm.class && loginForm.num) {
        setIsAdmin(false);
        // 使用班級+學號作為虛擬 ID
      } else {
        alert("請填寫班別及學號");
      }
    }
  };

  const getStudentId = () => `${loginForm.class.toUpperCase()}${loginForm.num.padStart(2, '0')}`;

  // --- 4. 渲染邏輯 ---
  if (!isAdmin && !loginForm.class && activeMenu !== "📢 活動公告" && activeMenu !== "🗓️ 比賽報名與賽程") {
    // 如果未登入（且不是查看公開資訊），顯示登入界面
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-3 rounded-full text-white">
              <Shield size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-6">正覺壁球管理系統</h1>
          
          <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
            <button 
              onClick={() => setLoginForm({...loginForm, mode: 'student'})}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${loginForm.mode === 'student' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
            >學生/家長</button>
            <button 
              onClick={() => setLoginForm({...loginForm, mode: 'admin'})}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${loginForm.mode === 'admin' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
            >管理員</button>
          </div>

          {loginForm.mode === 'student' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" placeholder="班別 (如 1A)" 
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={loginForm.class} onChange={e => setLoginForm({...loginForm, class: e.target.value})}
                />
                <input 
                  type="text" placeholder="學號 (如 01)" 
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={loginForm.num} onChange={e => setLoginForm({...loginForm, num: e.target.value})}
                />
              </div>
            </div>
          ) : (
            <input 
              type="password" placeholder="管理員密碼" 
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})}
            />
          )}

          <button 
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-3 rounded-lg mt-6 font-bold hover:bg-blue-700 transition"
          >登入系統</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* 側邊欄 */}
      <div className="w-full md:w-64 bg-white border-r shadow-sm p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="bg-blue-600 p-1.5 rounded-lg text-white">
            <Trophy size={20} />
          </div>
          <h2 className="font-bold text-gray-800">正覺壁球管理</h2>
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { n: "📅 訓練日程表", i: <Calendar size={18}/> },
            { n: "🏆 隊員排行榜", i: <Trophy size={18}/> },
            { n: "📝 考勤點名", i: <ClipboardCheck size={18}/> },
            { n: "🏅 學生得獎紀錄", i: <Medal size={18}/> },
            { n: "📢 活動公告", i: <Megaphone size={18}/> },
            { n: "🗓️ 比賽報名與賽程", i: <RefreshCw size={18}/> },
            ...(isAdmin ? [{ n: "💰 學費與預算核算", i: <Calculator size={18}/> }] : [])
          ].map(item => (
            <button
              key={item.n}
              onClick={() => setActiveMenu(item.n)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${activeMenu === item.n ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {item.i} {item.n}
            </button>
          ))}
        </nav>

        <div className="mt-8 pt-4 border-t px-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
              {isAdmin ? <Shield size={16}/> : <User size={16}/>}
            </div>
            <div className="text-xs">
              <p className="font-bold text-gray-800">{isAdmin ? "管理員" : `學生 ${getStudentId()}`}</p>
              <p className="text-gray-500">已登入</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full flex items-center gap-2 text-sm text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
          >
            <LogOut size={16}/> 登出系統
          </button>
        </div>
      </div>

      {/* 主內容區 */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <Header title={activeMenu} />
          <div className="mt-6">
            {activeMenu === "📅 訓練日程表" && <ScheduleModule data={schedules} isAdmin={isAdmin} />}
            {activeMenu === "🏆 隊員排行榜" && <RankingModule data={rankings} isAdmin={isAdmin} players={classPlayers} />}
            {activeMenu === "📝 考勤點名" && <AttendanceModule isAdmin={isAdmin} schedules={schedules} players={classPlayers} attendance={attendance} user={getStudentId()} />}
            {activeMenu === "🏅 學生得獎紀錄" && <AwardsModule data={awards} isAdmin={isAdmin} currentStudent={isAdmin ? "" : rankings.find(r => r.id.includes(loginForm.class))?.姓名} />}
            {activeMenu === "📢 活動公告" && <AnnouncementsModule data={announcements} isAdmin={isAdmin} />}
            {activeMenu === "🗓️ 比賽報名與賽程" && <TournamentsModule data={tournaments} isAdmin={isAdmin} />}
            {activeMenu === "💰 學費與預算核算" && <BudgetModule />}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 子模組組件 ---

function Header({ title }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
      <div className="text-xs text-gray-400">最後更新：{new Date().toLocaleDateString()}</div>
    </div>
  );
}

// 模組 1: 日程表
function ScheduleModule({ data, isAdmin }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="p-4 font-semibold text-gray-600">班級</th>
            <th className="p-4 font-semibold text-gray-600">地點</th>
            <th className="p-4 font-semibold text-gray-600">時間</th>
            <th className="p-4 font-semibold text-gray-600">具體日期</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? data.map((item, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              <td className="p-4 font-medium">{item.班級}</td>
              <td className="p-4 text-gray-600">{item.地點}</td>
              <td className="p-4 text-gray-600">{item.時間}</td>
              <td className="p-4 text-xs text-gray-500 max-w-xs">{item.具體日期}</td>
            </tr>
          )) : (
            <tr><td colSpan="4" className="p-8 text-center text-gray-400">目前沒有日程安排</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// 模組 2: 排行榜
function RankingModule({ data, isAdmin, players }) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => (b.積分 || 0) - (a.積分 || 0));
  }, [data]);

  const handleSync = async () => {
    if (!window.confirm("確定要從名單同步所有學生到排行榜嗎？(預設 100 分)")) return;
    for (const p of players) {
      const docId = `${p.年級 || 'NA'}_${p.姓名}`;
      const exists = data.find(r => r.id === docId);
      if (!exists) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rankings', docId), {
          年級: p.年級 || '-',
          班級: p.班級 || '-',
          姓名: p.姓名,
          積分: 100,
          章別: "無"
        });
      }
    }
    alert("同步完成");
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex gap-2">
          <button onClick={handleSync} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
            <RefreshCw size={16}/> 從名單同步學生
          </button>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600 w-16">排名</th>
              <th className="p-4 font-semibold text-gray-600">姓名</th>
              <th className="p-4 font-semibold text-gray-600">班級</th>
              <th className="p-4 font-semibold text-gray-600 text-right">積分</th>
              <th className="p-4 font-semibold text-gray-600">榮譽</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, idx) => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="p-4">
                  {idx < 3 ? (
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-300' : 'bg-orange-400'}`}>
                      {idx + 1}
                    </span>
                  ) : <span className="pl-3 text-gray-400">{idx + 1}</span>}
                </td>
                <td className="p-4 font-bold">{item.姓名}</td>
                <td className="p-4 text-gray-500">{item.年級} {item.班級}</td>
                <td className="p-4 text-right font-mono font-bold text-blue-600">{item.積分}</td>
                <td className="p-4">
                  {item.章別 !== "無" && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold">
                      {BADGE_AWARDS[item.章別]?.icon} {item.章別}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 模組 3: 考勤
function AttendanceModule({ isAdmin, schedules, players, attendance, user }) {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const currentClassDates = useMemo(() => {
    const sched = schedules.find(s => s.班級 === selectedClass);
    return sched ? sched.具體日期.split(",").map(d => d.trim()) : [];
  }, [selectedClass, schedules]);

  const currentPlayers = useMemo(() => {
    return players.filter(p => p.班級 === selectedClass);
  }, [selectedClass, players]);

  const currentRecord = useMemo(() => {
    return attendance.find(a => a.班級 === selectedClass && a.日期 === selectedDate);
  }, [attendance, selectedClass, selectedDate]);

  const handleSave = async (presentList) => {
    const docId = `${selectedClass}_${selectedDate}`.replace(/\//g, '-');
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attendance_records', docId), {
      班級: selectedClass,
      日期: selectedDate,
      出席人數: presentList.length,
      出席名單: presentList.join(", "),
      記錄人: user
    });
    alert("點名儲存成功");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select 
          className="p-3 border rounded-xl outline-none"
          value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
        >
          <option value="">選擇班別</option>
          {schedules.map(s => <option key={s.id} value={s.班級}>{s.班級}</option>)}
        </select>
        <select 
          className="p-3 border rounded-xl outline-none"
          value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          disabled={!selectedClass}
        >
          <option value="">選擇日期</option>
          {currentClassDates.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {selectedClass && selectedDate && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg">{selectedClass} - {selectedDate} 點名冊</h3>
            {currentRecord && <span className="text-xs text-gray-400">上次更新：{currentRecord.記錄人}</span>}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {currentPlayers.map(p => {
              const isPresent = currentRecord?.出席名單.includes(p.姓名);
              return (
                <button
                  key={p.姓名}
                  disabled={!isAdmin}
                  onClick={() => {
                    const currentList = currentRecord?.出席名單 ? currentRecord.出席名單.split(", ").filter(x => x) : [];
                    const newList = isPresent ? currentList.filter(n => n !== p.姓名) : [...currentList, p.姓名];
                    handleSave(newList);
                  }}
                  className={`p-3 rounded-xl border text-sm font-medium transition flex items-center justify-between ${isPresent ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-gray-500'}`}
                >
                  {p.姓名}
                  {isPresent && <ClipboardCheck size={14}/>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// 模組 4: 得獎紀錄
function AwardsModule({ data, isAdmin, currentStudent }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {data.sort((a, b) => new Date(b.日期) - new Date(a.日期)).map(item => {
        const isMine = currentStudent && item.學生姓名 === currentStudent;
        return (
          <div key={item.id} className={`p-6 rounded-2xl border shadow-sm transition ${isMine ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-100'}`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="inline-block bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold mb-2">🏆 {item.獎項}</span>
                <h3 className="text-xl font-bold text-gray-800">{item.比賽名稱}</h3>
                <p className="text-gray-600 mt-2 font-medium">學生：{item.學生姓名} {isMine && "⭐"}</p>
                <p className="text-sm text-gray-400 mt-1">日期：{item.日期}</p>
                {item.備註 && <p className="mt-3 text-sm italic text-gray-500 border-t pt-2">{item.備註}</p>}
              </div>
              {isAdmin && (
                <button onClick={async () => {
                  if(confirm("確定刪除？")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'student_awards', item.id));
                }} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 模組 5: 公告系統
function AnnouncementsModule({ data, isAdmin }) {
  const [newPost, setNewPost] = useState({ title: '', content: '' });

  const handlePost = async () => {
    if (!newPost.title || !newPost.content) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), {
      標題: newPost.title,
      內容: newPost.content,
      日期: new Date().toISOString().split('T')[0]
    });
    setNewPost({ title: '', content: '' });
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h3 className="font-bold">發布新公告</h3>
          <input 
            type="text" placeholder="標題" className="w-full p-2 border rounded-lg"
            value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})}
          />
          <textarea 
            placeholder="內容" className="w-full p-2 border rounded-lg h-24"
            value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})}
          />
          <button onClick={handlePost} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">發布</button>
        </div>
      )}
      <div className="space-y-4">
        {data.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-lg text-blue-600">{item.標題}</h4>
              <span className="text-xs text-gray-400">{item.日期}</span>
            </div>
            <p className="text-gray-600 whitespace-pre-wrap">{item.內容}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 模組 6: 比賽報名
function TournamentsModule({ data, isAdmin }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="p-4 font-semibold">比賽名稱</th>
            <th className="p-4 font-semibold">日期</th>
            <th className="p-4 font-semibold">截止</th>
            <th className="p-4 font-semibold">操作</th>
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={item.id} className="border-b">
              <td className="p-4 font-medium">{item.比賽名稱}</td>
              <td className="p-4 text-sm">{item.日期}</td>
              <td className="p-4 text-sm text-red-500 font-bold">{item.截止日期}</td>
              <td className="p-4">
                <a href={item.連結} target="_blank" rel="noreferrer" className="text-blue-600 flex items-center gap-1 text-sm font-bold underline">詳情 <ChevronRight size={14}/></a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 模組 7: 預算核算
function BudgetModule() {
  const [config, setConfig] = useState({
    nTeam: 1, costTeam: 2750,
    nTrain: 3, costTrain: 1350,
    nHobby: 4, costHobby: 1200,
    students: 50, fee: 250
  });

  const totalRevenue = config.students * config.fee;
  const totalExpense = (config.nTeam * config.costTeam) + (config.nTrain * config.costTrain) + (config.nHobby * config.costHobby);
  const profit = totalRevenue - totalExpense;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h3 className="font-bold border-b pb-2">支出設定 (開班數)</h3>
          <div className="grid grid-cols-1 gap-3">
            <label className="text-sm">校隊訓練班數量：<input type="number" className="ml-2 p-1 border rounded w-16" value={config.nTeam} onChange={e => setConfig({...config, nTeam: parseInt(e.target.value)})}/></label>
            <label className="text-sm">非校隊訓練班數量：<input type="number" className="ml-2 p-1 border rounded w-16" value={config.nTrain} onChange={e => setConfig({...config, nTrain: parseInt(e.target.value)})}/></label>
            <label className="text-sm">簡易運動班數量：<input type="number" className="ml-2 p-1 border rounded w-16" value={config.nHobby} onChange={e => setConfig({...config, nHobby: parseInt(e.target.value)})}/></label>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h3 className="font-bold border-b pb-2">收入設定</h3>
          <div className="grid grid-cols-1 gap-3">
            <label className="text-sm">總學生人數：<input type="number" className="ml-2 p-1 border rounded w-24" value={config.students} onChange={e => setConfig({...config, students: parseInt(e.target.value)})}/></label>
            <label className="text-sm">每人學費 ($)：<input type="number" className="ml-2 p-1 border rounded w-24" value={config.fee} onChange={e => setConfig({...config, fee: parseInt(e.target.value)})}/></label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-md">
          <p className="text-xs opacity-80 uppercase font-bold tracking-wider">總預計收入</p>
          <p className="text-3xl font-bold mt-1">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 text-white p-6 rounded-2xl shadow-md">
          <p className="text-xs opacity-80 uppercase font-bold tracking-wider">總預計支出</p>
          <p className="text-3xl font-bold mt-1">${totalExpense.toLocaleString()}</p>
        </div>
        <div className={`p-6 rounded-2xl shadow-md text-white ${profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
          <p className="text-xs opacity-80 uppercase font-bold tracking-wider">預計淨利潤</p>
          <p className="text-3xl font-bold mt-1">${profit.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
