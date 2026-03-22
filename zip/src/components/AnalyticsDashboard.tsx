import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, LineChart, Line, ComposedChart, Scatter
} from 'recharts';
import { Zap, Droplets, TrendingDown, Activity, AlertCircle, BarChart3 } from 'lucide-react';

// Mock Data for Analytics
const energyVsFlowData = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  flow: 4000 + Math.random() * 1000,
  energy: 3000 + Math.random() * 800 + (i * 10),
  efficiency: 75 + Math.random() * 10
}));

const pumpCurveData = [
  { flow: 0, head: 150, actual: null },
  { flow: 500, head: 145, actual: null },
  { flow: 1000, head: 135, actual: 132 },
  { flow: 1500, head: 120, actual: 118 },
  { flow: 2000, head: 100, actual: 95 },
  { flow: 2500, head: 75, actual: null },
  { flow: 3000, head: 45, actual: null },
];

const vfdSavingsData = [
  { month: 'Jan', vfd: 4200, cs: 5800 },
  { month: 'Feb', vfd: 3900, cs: 5400 },
  { month: 'Mar', vfd: 4500, cs: 6100 },
  { month: 'Apr', vfd: 4100, cs: 5900 },
  { month: 'May', vfd: 4800, cs: 6500 },
  { month: 'Jun', vfd: 5200, cs: 7200 },
];

const maintenanceData = [
  { name: 'Intake P1 (VFD)', hours: 4200, limit: 5000, health: 84 },
  { name: 'Intake P2 (CS)', hours: 4850, limit: 5000, health: 97 },
  { name: 'Sludge P1', hours: 2100, limit: 4000, health: 52 },
  { name: 'High Svc P1', hours: 8900, limit: 10000, health: 89 },
  { name: 'Tank 2 P1', hours: 1200, limit: 5000, health: 24 },
];

const waterQualityData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  turbidity: 0.5 + Math.random() * 0.8,
  chlorine: 1.2 + Math.random() * 0.4,
  target: 1.5
}));

interface StatCardProps {
  title: string;
  value: string | number;
  unit: string;
  trend: number;
  icon: React.ElementType;
  color: string;
}

const StatCard = ({ title, value, unit, trend, icon: Icon, color }: StatCardProps) => (
  <div className="bg-[#11141b] border border-[#2d343f] rounded-md p-4 flex flex-col gap-2">
    <div className="flex justify-between items-center text-[#94a3b8] text-xs font-bold uppercase">
      {title}
      <Icon size={16} color={color} />
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-xs text-[#94a3b8]">{unit}</span>
    </div>
    <div className={`text-xs ${trend >= 0 ? 'text-[#ff453a]' : 'text-[#32d74b]'}`}>
      {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
    </div>
  </div>
);

export default function AnalyticsDashboard() {
  return (
    <div className="flex flex-col w-full gap-4 pb-8 animate-in fade-in duration-500">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Wire-to-Water Eff" value="78.4" unit="%" trend={-2.1} icon={Activity} color="#32d74b" />
        <StatCard title="Specific Energy" value="1,120" unit="kWh/MG" trend={-4.5} icon={Zap} color="#007aff" />
        <StatCard title="Non-Revenue Water" value="12.3" unit="%" trend={-1.2} icon={Droplets} color="#bf5af2" />
        <StatCard title="Chemical Cost" value="$42.50" unit="/ MG" trend={0.8} icon={TrendingDown} color="#ff9f0a" />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Energy vs Flow */}
        <div className="bg-[#11141b] border border-[#2d343f] rounded-md p-4">
          <div className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Zap size={16} className="text-[#007aff]" />
            Specific Energy Consumption (30 Days)
          </div>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <ComposedChart data={energyVsFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d343f" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickMargin={10} />
                <YAxis yAxisId="left" stroke="#007aff" fontSize={10} tickFormatter={(v) => `${v/1000}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#32d74b" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1e26', borderColor: '#2d343f', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area yAxisId="left" type="monotone" dataKey="energy" name="Energy (kWh)" fill="#007aff" stroke="#007aff" fillOpacity={0.2} />
                <Line yAxisId="right" type="monotone" dataKey="flow" name="Flow (GPM)" stroke="#32d74b" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* VFD Savings */}
        <div className="bg-[#11141b] border border-[#2d343f] rounded-md p-4">
          <div className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <TrendingDown size={16} className="text-[#32d74b]" />
            VFD vs. Constant Speed (CS) Energy Analysis
          </div>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={vfdSavingsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d343f" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickMargin={10} />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1e26', borderColor: '#2d343f', borderRadius: '8px' }}
                  cursor={{ fill: '#1a1e26' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="cs" name="CS Pump (kWh)" fill="#ff453a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vfd" name="VFD Pump (kWh)" fill="#32d74b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pump Curve */}
        <div className="bg-[#11141b] border border-[#2d343f] rounded-md p-4">
          <div className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Activity size={16} className="text-[#bf5af2]" />
            Pump Performance Curve (Head vs. Flow)
          </div>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <ComposedChart data={pumpCurveData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d343f" />
                <XAxis dataKey="flow" type="number" stroke="#94a3b8" fontSize={10} domain={[0, 3500]} tickCount={8} name="Flow (GPM)" />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 160]} name="Head (ft)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1e26', borderColor: '#2d343f', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="head" name="Theoretical Curve" stroke="#bf5af2" strokeWidth={2} dot={false} />
                <Scatter dataKey="actual" name="Actual Operating Points" fill="#007aff" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Predictive Maintenance */}
        <div className="bg-[#11141b] border border-[#2d343f] rounded-md p-4">
          <div className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-[#ff9f0a]" />
            Predictive Maintenance (Run Hours vs Limit)
          </div>
          <div className="h-[300px] w-full flex flex-col justify-center gap-6">
            {maintenanceData.map((item) => (
              <div key={item.name} className="w-full">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-white font-bold">{item.name}</span>
                  <span className={item.health > 90 ? 'text-[#ff453a]' : 'text-[#94a3b8]'}>
                    {item.hours} / {item.limit} hrs ({item.health}%)
                  </span>
                </div>
                <div className="h-3 w-full bg-[#1a1e26] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${item.health > 90 ? 'bg-[#ff453a]' : item.health > 75 ? 'bg-[#ff9f0a]' : 'bg-[#32d74b]'}`}
                    style={{ width: `${item.health}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Water Quality Correlation */}
        <div className="bg-[#11141b] border border-[#2d343f] rounded-md p-4 lg:col-span-2">
          <div className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-[#007aff]" />
            Water Quality Correlation (Chlorine vs Turbidity)
          </div>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <ComposedChart data={waterQualityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d343f" vertical={false} />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} tickMargin={10} />
                <YAxis yAxisId="left" stroke="#007aff" fontSize={10} domain={[0, 2]} name="Chlorine" />
                <YAxis yAxisId="right" orientation="right" stroke="#ff9f0a" fontSize={10} domain={[0, 2]} name="Turbidity" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1e26', borderColor: '#2d343f', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line yAxisId="left" type="monotone" dataKey="target" name="Target Chlorine (mg/L)" stroke="#32d74b" strokeDasharray="5 5" dot={false} strokeWidth={2} />
                <Area yAxisId="left" type="monotone" dataKey="chlorine" name="Actual Chlorine (mg/L)" fill="#007aff" stroke="#007aff" fillOpacity={0.2} />
                <Line yAxisId="right" type="monotone" dataKey="turbidity" name="Turbidity (NTU)" stroke="#ff9f0a" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
