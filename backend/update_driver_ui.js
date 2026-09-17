const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add getRemainingDays helper function
const helperInsertPos = content.indexOf('const isScheduledDateOrPast =');
const remainingDaysFunc = `  const getRemainingDays = (scheduledDateStr) => {
    if (!scheduledDateStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let targetDate;
    if (typeof scheduledDateStr === 'string' && scheduledDateStr.includes('-')) {
      const parts = scheduledDateStr.split('-');
      if (parts[0].length === 4) {
        targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        targetDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    } else {
      targetDate = new Date(scheduledDateStr);
    }
    if (isNaN(targetDate.getTime())) return 0;
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

`;

if (!content.includes('getRemainingDays')) {
  content = content.slice(0, helperInsertPos) + remainingDaysFunc + content.slice(helperInsertPos);
}

// 2. Replace the driver action card block
const oldCardBlockStart = content.indexOf('{/* Right: weight form or collected status */}');
const oldCardBlockEnd = content.indexOf(') : r.status === \'En Route\' ? (', oldCardBlockStart);

const newCardBlock = `{/* Right: weight form or collected status */}
                              <div className="w-full lg:w-96 shrink-0">
                                {r.status === 'Assigned' ? (
                                  (() => {
                                    const remainingDays = getRemainingDays(r.scheduledDate);
                                    const isReady = isScheduledDateOrPast(r.scheduledDate);
                                    return (
                                      <div className={\`p-5 rounded-2xl flex flex-col items-center justify-center gap-4 text-center border transition-all \${isReady ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-slate-900/90 border-amber-500/40 text-amber-300 shadow-xl'}\`}>
                                        <div className={\`p-3 rounded-full \${isReady ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}\`}>
                                          {isReady ? <MapPin size={32} /> : <Clock size={32} className="animate-pulse" />}
                                        </div>
                                        <div>
                                          <p className="font-bold text-base text-white">
                                            {isReady ? 'Trip Ready to Start' : \`Trip Scheduled (\${remainingDays} \${remainingDays === 1 ? 'day' : 'days'} remaining)\`}
                                          </p>
                                          <p className="text-xs text-gray-300 mt-1">
                                            {isReady ? "Navigate to the generator's location" : \`Scheduled for \${r.scheduledDate} · Starts in \${remainingDays} \${remainingDays === 1 ? 'day' : 'days'}\`}
                                          </p>
                                        </div>
                                        {isReady ? (
                                          <button 
                                            onClick={() => handleStartTrip(r.id)}
                                            className="btn-primary w-full py-3 bg-emerald-500 text-slate-950 font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 hover:bg-emerald-400"
                                          >
                                            <Navigation size={16} /> Start Trip &amp; Open Live Map
                                          </button>
                                        ) : (
                                          <button 
                                            disabled 
                                            className="w-full py-3 bg-slate-800/80 text-gray-400 font-bold text-xs tracking-wide flex items-center justify-center gap-2 rounded-xl border border-white/10 cursor-not-allowed opacity-70 shadow-inner"
                                          >
                                            <Clock size={16} className="text-amber-400" /> 🔒 Start Trip Locked (\${remainingDays} \${remainingDays === 1 ? 'day' : 'days'} remaining)
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })()
                                `;

content = content.slice(0, oldCardBlockStart) + newCardBlock + content.slice(oldCardBlockEnd);

fs.writeFileSync(filePath, content, 'utf8');
console.log('App.jsx successfully updated with getRemainingDays and UI block!');
