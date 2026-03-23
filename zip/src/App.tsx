import React, { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import AnalyticsDashboard from './components/AnalyticsDashboard';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function parseNumbers(obj: unknown): unknown {
  if (typeof obj === 'string') {
    const num = Number(obj);
    return isNaN(num) || obj.trim() === '' ? obj : num;
  }
  if (Array.isArray(obj)) {
    return obj.map(parseNumbers);
  }
  if (typeof obj === 'object' && obj !== null) {
    const res: Record<string, unknown> = {};
    for (const key in obj) {
      res[key] = parseNumbers((obj as Record<string, unknown>)[key]);
    }
    return res;
  }
  return obj;
}

type PumpStatusType = { S: number; G?: number; Z?: number };

interface ScadaData {
  P1?: { F: number; M1: PumpStatusType; M2: PumpStatusType };
  P2?: { C: number; T: number };
  P3?: { H1: number; H2: number };
  P4?: { L: number; P: number; M1: PumpStatusType; M2: PumpStatusType; M3: PumpStatusType; M4: PumpStatusType };
  P5?: { L: number; M: PumpStatusType };
  P6?: { L: number; S: number; Y: number };
  P7?: { E: number; G: number; M1: PumpStatusType; M2: PumpStatusType };
  P8?: { L: number };
}

interface AlarmLog {
  id: string;
  ts: Date;
  area: string;
  desc: string;
  stat: string;
  isAlarm: boolean;
}

function useTrend(value: number | undefined) {
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const prevRef = useRef(value);

  useEffect(() => {
    if (value === undefined) return;
    const prev = prevRef.current ?? value;
    if (value > prev + 0.05) setTrend('up');
    else if (value < prev - 0.05) setTrend('down');
    else setTrend('stable');
    prevRef.current = value;
  }, [value]);

  return trend;
}

const Gatekeeper = ({ onUnlock }: { onUnlock: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="bg-[#11141b] border border-[#007aff] p-10 rounded-lg text-center w-80 shadow-[0_0_30px_rgba(0,122,255,0.2)]">
        <h2 className="text-white text-2xl font-light mb-5">
          C2i <b className="text-[#007aff] font-extrabold">SCADA</b>
        </h2>
        <input
          type="password"
          placeholder="ACCESS CODE"
          className="w-full p-3 bg-black border border-[#2d343f] rounded text-white mb-5 text-center outline-none focus:border-[#007aff]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value === 'admin') onUnlock();
          }}
        />
        <button
          className="w-full p-3 bg-[#007aff] text-white font-bold rounded hover:bg-blue-600 transition-colors"
          onClick={(e) => {
            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
            if (input.value === 'admin') onUnlock();
          }}
        >
          ACCESS SYSTEM
        </button>
      </div>
    </div>
  );
};

const Header = ({ activeTab, setActiveTab }: { activeTab: 'ops' | 'analytics', setActiveTab: (tab: 'ops' | 'analytics') => void }) => (
  <header className="flex justify-between items-center bg-[#11141b] p-3 px-5 rounded-md border border-[#2d343f] mb-3">
    <div className="flex items-center gap-3">
      <div className="text-lg font-extrabold text-white">
        C2i <b className="text-[#007aff]">SCADA</b>
      </div>
      <div className="w-2 h-2 bg-[#32d74b] rounded-full shadow-[0_0_8px_#32d74b] animate-pulse"></div>
    </div>
    <div className="font-bold tracking-[4px] text-sm text-white">WTP DEMO</div>
    <div className="flex gap-2">
      <button 
        onClick={() => setActiveTab('ops')}
        className={cn("px-3 py-1.5 rounded text-xs font-bold transition-colors", activeTab === 'ops' ? "bg-[#007aff] text-white border border-[#007aff]" : "bg-[#1a1e26] text-[#94a3b8] border border-[#2d343f] hover:text-white")}
      >
        REAL-TIME OPS
      </button>
      <button 
        onClick={() => setActiveTab('analytics')}
        className={cn("px-3 py-1.5 rounded text-xs font-bold transition-colors", activeTab === 'analytics' ? "bg-[#007aff] text-white border border-[#007aff]" : "bg-[#1a1e26] text-[#94a3b8] border border-[#2d343f] hover:text-white")}
      >
        ANALYTICS
      </button>
    </div>
  </header>
);

const Card = ({ title, children, isTower = false, className }: { title: string; children: React.ReactNode; isTower?: boolean; className?: string }) => (
  <div
    className={cn(
      "bg-[#11141b] border border-[#2d343f] rounded-md p-3 w-[340px] flex flex-col gap-2",
      isTower && "border-t-[3px] border-t-[#007aff] bg-[#0e1117]",
      className
    )}
  >
    <div className="text-[0.7rem] font-extrabold text-[#007aff] uppercase mb-1 border-b border-[#2d343f] pb-1">
      {title}
    </div>
    {children}
  </div>
);

const SubCard = ({ label, labelColor, children, className }: { label?: React.ReactNode; labelColor?: string; children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-[#1a1e26] p-2.5 rounded border border-white/5", className)}>
    {label && <span className="text-[0.6rem] font-extrabold uppercase mb-1.5 block" style={{ color: labelColor || '#94a3b8' }}>{label}</span>}
    {children}
  </div>
);

const DataLine = ({ label, value, unit, isFault, children }: { label: string; value?: React.ReactNode; unit?: string; isFault?: boolean; children?: React.ReactNode }) => (
  <div className={cn("flex items-center justify-between mb-1 gap-2 p-1.5 rounded-sm transition-all w-full box-border", isFault ? "border border-[#ff453a] bg-[#ff453a]/10 animate-pulse shadow-[0_0_10px_rgba(255,69,58,0.3)]" : "border border-transparent")}>
    <div className="flex items-center gap-2">
      <span className="text-[#cbd5e1] text-xs w-[95px] shrink-0">{label}</span>
      {value !== undefined && (
        <div className="font-bold text-[0.95rem] text-white flex items-baseline gap-1 w-[45px] shrink-0">
          {value}
          {unit && <span className="text-[0.65rem] text-[#94a3b8]">{unit}</span>}
        </div>
      )}
    </div>
    <div className="flex-1 flex justify-end">{children}</div>
  </div>
);

const PumpStatus = ({ run, fault }: { run?: number; fault?: number }) => {
  const isR = run === 1;
  const isF = fault === 1;

  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <span
        className={cn(
          "text-[0.55rem] font-black px-1.5 py-0.5 rounded-sm uppercase border min-w-[55px] text-center",
          isR ? "text-[#32d74b] border-[#32d74b]/30 bg-[#32d74b]/5" : "text-[#94a3b8] bg-black border-transparent"
        )}
      >
        {isR ? 'RUNNING' : 'STOPPED'}
      </span>
      <span
        className={cn(
          "text-[0.55rem] font-black px-1.5 py-0.5 rounded-sm uppercase border min-w-[55px] text-center",
          isF ? "text-white bg-[#ff453a] border-[#ff453a] animate-pulse" : "text-[#94a3b8]/50 border-transparent text-[0.5rem]"
        )}
      >
        {isF ? 'FAULT' : 'NORMAL'}
      </span>
    </div>
  );
};

const TankLevel = ({
  value = 0,
  max = 100,
  height = 100,
  trend = 'stable',
  hideValue = false,
  color = '#007aff',
}: {
  value?: number;
  max?: number;
  height?: number;
  trend?: 'up' | 'down' | 'stable';
  hideValue?: boolean;
  color?: string;
}) => {
  const pct = Math.min((value / max) * 100, 100);
  const isCrit = pct < 30;

  return (
    <div className={cn("flex flex-col items-center gap-2 py-1", hideValue && "justify-center")}>
      <div
        className={cn(
          "w-[80px] border relative overflow-hidden rounded-sm shrink-0",
          isCrit ? "bg-[#ff453a]/20 border-[#ff453a] animate-pulse shadow-[0_0_15px_rgba(255,69,58,0.3)]" : "bg-black border-[#2d343f]"
        )}
        style={{ height: `${height}px` }}
      >
        <div
          className={cn(
            "absolute bottom-0 w-full transition-all duration-1000 ease-in-out",
            isCrit ? "bg-[#ff453a]" : ""
          )}
          style={{ height: `${pct}%`, backgroundColor: isCrit ? undefined : color }}
        />
      </div>
      {!hideValue && (
        <div className="flex items-center gap-1.5">
          <div className="font-bold text-[0.95rem] flex items-baseline gap-1" style={{ color }}>
            {value.toFixed(1)}
            <span className="text-[0.65rem] text-[#94a3b8]">FT</span>
          </div>
          <div
            className={cn(
              "text-sm font-bold",
              trend === 'up' ? "text-[#32d74b]" : trend === 'down' ? "text-[#ff453a]" : "text-[#94a3b8]"
            )}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '−'}
          </div>
        </div>
      )}
    </div>
  );
};

const MiniChart = ({ data, lines = [{ key: 'value', color: '#007aff' }] }: { data: Record<string, unknown>[]; lines?: { key: string; color: string }[] }) => (
  <div className="mt-2 bg-black rounded p-1.5">
    <div className="flex gap-1 mb-1">
      <button className="text-[0.55rem] bg-[#007aff] border border-[#2d343f] text-white px-1.5 py-0.5 rounded-sm cursor-pointer">
        1H
      </button>
      <button className="text-[0.55rem] bg-[#1a1e26] border border-[#2d343f] text-white px-1.5 py-0.5 rounded-sm cursor-pointer">
        24H
      </button>
    </div>
    <div className="h-[60px] w-full min-w-0">
      <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
        <LineChart data={data || []}>
          <YAxis domain={['auto', 'auto']} hide />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<'ops' | 'analytics'>('ops');
  const [data, setData] = useState<ScadaData>({});
  const [logs, setLogs] = useState<AlarmLog[]>([]);
  const [alarms, setAlarms] = useState<Set<string>>(new Set());
  const [chartData, setChartData] = useState<Record<string, Record<string, unknown>[]>>({
    P5L: [], P4L: [], P6L: [], P7: [], P8L: []
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  const alarmsRef = useRef<Set<string>>(new Set());

  const trendP5 = useTrend(data.P5?.L);
  const trendP4 = useTrend(data.P4?.L);
  const trendP6 = useTrend(data.P6?.L);
  const trendP7E = useTrend(data.P7?.E);
  const trendP7G = useTrend(data.P7?.G);
  const trendP8 = useTrend(data.P8?.L);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!unlocked) return;

    const addLog = (area: string, desc: string, stat: string, isAlarm: boolean) => {
      setLogs((prev) => {
        const newLog = { id: Math.random().toString(), ts: new Date(), area, desc, stat, isAlarm };
        return [newLog, ...prev].slice(0, 50);
      });
    };

    const checkPumpAlarm = (isFault: boolean, area: string, desc: string) => {
      const key = `${area}: ${desc}`;
      const hasAlarm = alarmsRef.current.has(key);

      if (isFault && !hasAlarm) {
        alarmsRef.current.add(key);
        setAlarms(new Set(alarmsRef.current));
        addLog(area, desc, "CRITICAL FAULT", true);
      } else if (!isFault && hasAlarm) {
        alarmsRef.current.delete(key);
        setAlarms(new Set(alarmsRef.current));
      }
    };

    const checkLevelAlarm = (val: number, max: number, area: string, desc: string) => {
      const pct = Math.min((val / max) * 100, 100);
      const key = `${area}: ${desc}`;
      const hasAlarm = alarmsRef.current.has(key);

      if (pct < 30 && !hasAlarm) {
        alarmsRef.current.add(key);
        setAlarms(new Set(alarmsRef.current));
        addLog(area, desc, `LOW LEVEL ALERT: ${val.toFixed(1)} FT`, true);
      } else if (pct >= 30 && hasAlarm) {
        alarmsRef.current.delete(key);
        setAlarms(new Set(alarmsRef.current));
      }
    };

    const checkPressureAlarm = (val: number, area: string, desc: string) => {
      const key = `${area}: ${desc}`;
      const hasAlarm = alarmsRef.current.has(key);

      if ((val < 40 || val > 90) && !hasAlarm) {
        alarmsRef.current.add(key);
        setAlarms(new Set(alarmsRef.current));
        addLog(area, desc, `PRESSURE ALERT: ${val.toFixed(1)} PSI`, true);
      } else if (val >= 40 && val <= 90 && hasAlarm) {
        alarmsRef.current.delete(key);
        setAlarms(new Set(alarmsRef.current));
      }
    };

    const client = mqtt.connect('wss://c2i-scada:lW7asQrsdBNd5YNu@c2i-scada.cloud.shiftr.io', {
      clientId: `C2i_Station_${Math.random().toString(16).slice(2, 8)}`,
    });

    client.on('connect', () => {
      client.subscribe('#');
    });

    client.on('message', (topic, message) => {
      try {
        let raw = message.toString();
        if (raw.startsWith('"')) raw = raw.slice(1, -1).replace(/\\"/g, '"');
        const d = parseNumbers(JSON.parse(raw)) as ScadaData;

        if (d.P1) {
          checkPumpAlarm(d.P1.M1?.G === 1, 'Area 1', 'Raw1Pump1');
          checkPumpAlarm(d.P1.M2?.G === 1, 'Area 1', 'Raw1Pump2');
        }
        if (d.P5) {
          checkLevelAlarm(d.P5.L, 15, 'Area 4', 'SludgeLevel');
          if (d.P5.M) checkPumpAlarm(d.P5.M.G === 1, 'Area 4', 'SludgePump');
        }
        if (d.P4) {
          checkLevelAlarm(d.P4.L, 30, 'Area 5', 'ClearwellLevel');
          if (d.P4.P !== undefined) checkPressureAlarm(d.P4.P, 'Area 5', 'HSPS Pressure');
          const p4 = d.P4;
          ['M1', 'M2', 'M3', 'M4'].forEach((m) => {
            if (p4[m as keyof typeof p4]) {
              checkPumpAlarm(p4[m as keyof typeof p4].G === 1, 'Area 5', `HSPS_Pump${m.slice(1)}`);
            }
          });
        }
        if (d.P6) {
          checkLevelAlarm(d.P6.L, 50, 'Area 6', 'Tank1_level');
          if (d.P6.S !== undefined) checkPressureAlarm(d.P6.S, 'Area 6', 'Suction Pressure');
          if (d.P6.Y !== undefined) checkPressureAlarm(d.P6.Y, 'Area 6', 'System Pressure');
        }
        if (d.P7) {
          checkLevelAlarm(d.P7.E, 150, 'Area 7', 'Tank2_ElevTank');
          checkLevelAlarm(d.P7.G, 50, 'Area 7', 'Tank2_Groundtank');
          if (d.P7.M1) checkPumpAlarm(d.P7.M1.G === 1, 'Area 7', 'Tank2_Pump1');
          if (d.P7.M2) checkPumpAlarm(d.P7.M2.G === 1, 'Area 7', 'Tank2_Pump2');
        }
        if (d.P8) checkLevelAlarm(d.P8.L, 100, 'Area 8', 'Tank3_Level');

        setData((prev) => {
          const newData = { ...prev, ...d };
          const time = new Date().toLocaleTimeString();
          setChartData((prevChart) => {
            const newChart = { ...prevChart };
            const updateTank = (key: string, val: number | undefined) => {
              if (val !== undefined) {
                newChart[key] = [...(newChart[key] || []), { time, value: val }].slice(-20);
              }
            };
            const updateTankMulti = (key: string, vals: Record<string, number | undefined>) => {
              if (Object.values(vals).some(v => v !== undefined)) {
                newChart[key] = [...(newChart[key] || []), { time, ...vals }].slice(-20);
              }
            };
            updateTank('P5L', d.P5?.L);
            updateTank('P4L', d.P4?.L);
            updateTank('P6L', d.P6?.L);
            updateTankMulti('P7', { E: d.P7?.E, G: d.P7?.G });
            updateTank('P8L', d.P8?.L);
            return newChart;
          });
          return newData;
        });
      } catch (e) {
        console.error(e);
      }
    });

    return () => {
      client.end();
    };
  }, [unlocked]);

  return (
    <div className="min-h-screen bg-[#050608] text-white p-2.5 font-sans text-[13px]">
      {!unlocked && <Gatekeeper onUnlock={() => setUnlocked(true)} />}

      {unlocked && (
        <div className="flex flex-col max-w-[1400px] mx-auto">
          <Header activeTab={activeTab} setActiveTab={setActiveTab} />

          {activeTab === 'ops' ? (
            <>
              <div className="flex flex-col gap-4 pb-5 items-center w-full">
                {/* Top Row */}
            <div className="flex flex-wrap justify-center gap-4 items-stretch w-full">
              {/* Area 1 */}
            <Card title="Area 1: Raw Water Intake">
              <SubCard label="Flow Sensor">
                <DataLine label="Raw1Flow" value={data.P1?.F?.toFixed(1) ?? '0.0'} unit="GPM" />
              </SubCard>
              <SubCard label="Intake Pumps">
                <DataLine label="Pump 1" value={Math.round(data.P1?.M1?.Z ?? 0)} unit="%" isFault={data.P1?.M1?.G === 1}>
                  <PumpStatus run={data.P1?.M1?.S} fault={data.P1?.M1?.G} />
                </DataLine>
                <DataLine label="Pump 2" value="CS" isFault={data.P1?.M2?.G === 1}>
                  <PumpStatus run={data.P1?.M2?.S} fault={data.P1?.M2?.G} />
                </DataLine>
              </SubCard>
            </Card>

            {/* Area 2 */}
            <Card title="Area 2: MCP">
              <SubCard label="MCP_Chlorine">
                <DataLine label="Residual" value={data.P2?.C?.toFixed(2) ?? '0.00'} unit="mg/L" />
              </SubCard>
              <SubCard label="MCP_Turbidity" className="flex-1">
                <DataLine label="Raw Water" value={data.P2?.T?.toFixed(2) ?? '0.00'} unit="NTU" />
              </SubCard>
            </Card>

            {/* Area 3 */}
            <Card title="Area 3: Filter Hall">
              <SubCard label="Filter 1">
                <DataLine label="Hours Since" value={data.P3?.H1?.toFixed(1) ?? '0.0'} unit="HRS" />
              </SubCard>
              <SubCard label="Filter 2" className="flex-1">
                <DataLine label="Hours Since" value={data.P3?.H2?.toFixed(1) ?? '0.0'} unit="HRS" />
              </SubCard>
            </Card>
            </div>

            {/* Middle Row */}
            <div className="flex flex-wrap justify-center gap-4 items-stretch w-full">
            {/* Area 4 */}
            <Card title="Area 4: Sludge">
              <SubCard label="SludgeLevel" labelColor="#007aff" className="flex-1 flex flex-col justify-between">
                <div>
                  <TankLevel value={data.P5?.L} max={15} trend={trendP5} color="#007aff" />
                </div>
                <MiniChart data={chartData.P5L} />
              </SubCard>
              <SubCard label="Sludge Pumps">
                <DataLine label="Pump 1" value="CS" isFault={data.P5?.M?.G === 1}>
                  <PumpStatus run={data.P5?.M?.S} fault={data.P5?.M?.G} />
                </DataLine>
              </SubCard>
            </Card>

            {/* Area 5 - Clearwell */}
            <Card title="Area 5: Clearwell">
              <SubCard label="ClearwellLevel" labelColor="#007aff" className="flex-1 flex flex-col justify-between">
                <div>
                  <TankLevel value={data.P4?.L} max={30} trend={trendP4} color="#007aff" />
                </div>
                <MiniChart data={chartData.P4L} />
              </SubCard>
            </Card>

            {/* Area 5 - HSPS */}
            <Card title="Area 5: HSPS">
              <SubCard label="HSPS Pressure">
                <DataLine label="Pressure" value={data.P4?.P?.toFixed(1) ?? '0.0'} unit="PSI" isFault={data.P4?.P !== undefined && (data.P4.P < 40 || data.P4.P > 90)} />
              </SubCard>
              <SubCard label="High Service Pumps" className="flex-1">
                <DataLine label="Pump 1" value={Math.round(data.P4?.M1?.Z ?? 0)} unit="%" isFault={data.P4?.M1?.G === 1}>
                  <PumpStatus run={data.P4?.M1?.S} fault={data.P4?.M1?.G} />
                </DataLine>
                <DataLine label="Pump 2" value={Math.round(data.P4?.M2?.Z ?? 0)} unit="%" isFault={data.P4?.M2?.G === 1}>
                  <PumpStatus run={data.P4?.M2?.S} fault={data.P4?.M2?.G} />
                </DataLine>
                <DataLine label="Pump 3" value={Math.round(data.P4?.M3?.Z ?? 0)} unit="%" isFault={data.P4?.M3?.G === 1}>
                  <PumpStatus run={data.P4?.M3?.S} fault={data.P4?.M3?.G} />
                </DataLine>
                <DataLine label="Pump 4" value={Math.round(data.P4?.M4?.Z ?? 0)} unit="%" isFault={data.P4?.M4?.G === 1}>
                  <PumpStatus run={data.P4?.M4?.S} fault={data.P4?.M4?.G} />
                </DataLine>
              </SubCard>
            </Card>
            </div>

            {/* Bottom Row */}
            <div className="flex flex-wrap justify-center gap-4 items-stretch w-full">
            {/* Area 6 */}
            <Card title="Area 6: Water Tower 1" isTower>
              <SubCard label="Level Tracking" labelColor="#007aff" className="flex-1 flex flex-col justify-between">
                <div>
                  <TankLevel value={data.P6?.L} max={50} trend={trendP6} color="#007aff" />
                </div>
                <MiniChart data={chartData.P6L} />
              </SubCard>
              <SubCard>
                <DataLine label="Suction Pres." value={data.P6?.S ?? 0} unit="PSI" isFault={data.P6?.S !== undefined && (data.P6.S < 40 || data.P6.S > 90)} />
                <DataLine label="System Pres." value={data.P6?.Y ?? 0} unit="PSI" isFault={data.P6?.Y !== undefined && (data.P6.Y < 40 || data.P6.Y > 90)} />
              </SubCard>
            </Card>

            {/* Area 7 */}
            <Card title="Area 7: Water Tower 2" isTower>
              <div className="flex gap-2">
                <SubCard label="Elevated" labelColor="#007aff" className="flex-1">
                  <div className="flex justify-center">
                    <TankLevel
                      value={data.P7?.E}
                      max={150}
                      trend={trendP7E}
                      color="#007aff"
                    />
                  </div>
                </SubCard>
                <SubCard label="Ground" labelColor="#bf5af2" className="flex-1">
                  <div className="flex justify-center">
                    <TankLevel
                      value={data.P7?.G}
                      max={50}
                      trend={trendP7G}
                      color="#bf5af2"
                    />
                  </div>
                </SubCard>
              </div>
              <SubCard label="Level History">
                <MiniChart 
                  data={chartData.P7} 
                  lines={[
                    { key: 'E', color: '#007aff' },
                    { key: 'G', color: '#bf5af2' }
                  ]} 
                />
              </SubCard>
              <SubCard label="Tank 2 Pumps">
                <DataLine label="Pump 1" value="CS" isFault={data.P7?.M1?.G === 1}>
                  <PumpStatus run={data.P7?.M1?.S} fault={data.P7?.M1?.G} />
                </DataLine>
                <DataLine label="Pump 2" value="CS" isFault={data.P7?.M2?.G === 1}>
                  <PumpStatus run={data.P7?.M2?.S} fault={data.P7?.M2?.G} />
                </DataLine>
              </SubCard>
            </Card>

            {/* Area 8 */}
            <Card title="Area 8: Water Tower 3" isTower>
              <SubCard label="Tank 3 Level" labelColor="#007aff" className="flex-1 flex flex-col justify-between">
                <div>
                  <TankLevel value={data.P8?.L} max={100} trend={trendP8} color="#007aff" />
                </div>
                <MiniChart data={chartData.P8L} />
              </SubCard>
            </Card>
            </div>
          </div>
          </>
          ) : (
            <AnalyticsDashboard />
          )}

          <div className="bg-[#11141b] border border-[#2d343f] rounded-md h-[260px] flex flex-col overflow-hidden mt-2">
            <div className="bg-[#1a1e26] px-4 py-2 text-[0.65rem] font-extrabold flex justify-between text-[#94a3b8]">
              <span>OPERATIONAL HISTORIAN & AUDIT TRAIL</span>
              <span>{currentTime.toLocaleString()}</span>
            </div>

            {alarms.size > 0 && (
              <div className="bg-[#ff453a]/10 border-b border-[#ff453a]">
                {Array.from(alarms).map((a) => (
                  <div key={a} className="text-[#ff453a] font-bold text-xs px-5 py-1.5">
                    ALARM: {a} - CHECK ASSET
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              <table className="w-full border-collapse text-xs text-left">
                <thead className="bg-[#1a1e26] text-[#94a3b8] sticky top-0">
                  <tr>
                    <th className="p-2.5 px-4 font-semibold">TIMESTAMP</th>
                    <th className="p-2.5 px-4 font-semibold">AREA</th>
                    <th className="p-2.5 px-4 font-semibold">DESCRIPTION</th>
                    <th className="p-2.5 px-4 font-semibold">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className={cn(
                        "border-b border-[#1a1e26]",
                        log.isAlarm && "text-[#ff453a] font-bold bg-[#ff453a]/5"
                      )}
                    >
                      <td className="p-2 px-4">{log.ts.toLocaleTimeString()}</td>
                      <td className="p-2 px-4">{log.area}</td>
                      <td className="p-2 px-4">{log.desc}</td>
                      <td className="p-2 px-4">{log.stat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
