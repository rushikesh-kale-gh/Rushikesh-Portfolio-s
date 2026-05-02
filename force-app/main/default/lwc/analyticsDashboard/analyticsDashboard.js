import { LightningElement, api, track } from 'lwc';
import getAnalyticsData from '@salesforce/apex/DailyTrackerController.getAnalyticsData';
import getAllLogs        from '@salesforce/apex/DailyTrackerController.getAllLogs';
import getSummaryStats  from '@salesforce/apex/AnalyticsController.getSummaryStats';

const SVG_W = 700, SVG_H = 240, PAD_L = 44, PAD_R = 20, PAD_T = 16, PAD_B = 30;
const CHART_W = SVG_W - PAD_L - PAD_R;
const CHART_H = SVG_H - PAD_T - PAD_B;

export default class AnalyticsDashboard extends LightningElement {
    @api userAccountId;

    @track period     = 'week';
    @track chartData  = [];
    @track recentLogs = [];
    @track stats      = { avgScore:0, avgHealth:0, avgCareer:0, avgConsistency:0, streak:0, totalDays:0 };

    get svgViewBox() { return `0 0 ${SVG_W} ${SVG_H}`; }
    get svgW()       { return SVG_W; }
    get hasData()    { return this.chartData.length > 0; }
    get hasRecentLogs() { return this.recentLogs.length > 0; }

    get btnDay()   { return `period-btn${this.period==='day'  ? ' active':''}`; }
    get btnWeek()  { return `period-btn${this.period==='week' ? ' active':''}`; }
    get btnMonth() { return `period-btn${this.period==='month'? ' active':''}`; }
    get btnYear()  { return `period-btn${this.period==='year' ? ' active':''}`; }

    get yGridLines() {
        return [0,25,50,75,100].map(v => ({
            key: `g${v}`, textKey: `t${v}`,
            y:       PAD_T + CHART_H - (v / 100) * CHART_H,
            labelY:  PAD_T + CHART_H - (v / 100) * CHART_H + 4,
            label:   v
        }));
    }
    get xLabelY() { return SVG_H - 6; }

    get xLabels() {
        if (!this.chartData.length) return [];
        return this.chartData.map((d, i) => ({
            key:   `xl${i}`,
            x:     PAD_L + (i / Math.max(this.chartData.length - 1, 1)) * CHART_W,
            label: d.dateLabel
        }));
    }

    _toPoints(field) {
        if (!this.chartData.length) return '';
        return this.chartData.map((d, i) => {
            const x = PAD_L + (i / Math.max(this.chartData.length - 1, 1)) * CHART_W;
            const y = PAD_T + CHART_H - ((d[field] || 0) / 100) * CHART_H;
            return `${x},${y}`;
        }).join(' ');
    }

    get consistencyPoints() { return this._toPoints('Consistency_Score__c'); }
    get healthPoints()      { return this._toPoints('Health_Score__c'); }
    get careerPoints()      { return this._toPoints('Career_Score__c'); }

    get chartDots() {
        const dots = [];
        this.chartData.forEach((d, i) => {
            const x = PAD_L + (i / Math.max(this.chartData.length - 1, 1)) * CHART_W;
            [
                { field: 'Consistency_Score__c', color: '#6366f1' },
                { field: 'Health_Score__c',      color: '#22c55e' },
                { field: 'Career_Score__c',       color: '#ef4444' }
            ].forEach(({ field, color }) => {
                const y = PAD_T + CHART_H - ((d[field] || 0) / 100) * CHART_H;
                dots.push({ key: `${field}${i}`, x, y, color });
            });
        });
        return dots;
    }

    connectedCallback() { this.load(); }

    async load() {
        try {
            const [raw, allLogs, statsData] = await Promise.all([
                getAnalyticsData({ userAccountId: this.userAccountId, period: this.period }),
                getAllLogs({ userAccountId: this.userAccountId }),
                getSummaryStats({ userAccountId: this.userAccountId })
            ]);
            this.chartData = raw.map(d => ({
                ...d,
                dateLabel: new Date(d.Date__c).toLocaleDateString('en-US', { month:'short', day:'numeric' })
            }));
            this.recentLogs = allLogs.slice(0, 20).map(d => ({
                ...d,
                dateLabel:     new Date(d.Date__c).toLocaleDateString('en-US', { month:'short', day:'numeric', weekday:'short' }),
                hasReflection: !!d.Reflection__c,
                Score__c:      (d.Score__c  || 0).toFixed(0),
                Health_Score__c: (d.Health_Score__c || 0).toFixed(0),
                Career_Score__c: (d.Career_Score__c || 0).toFixed(0)
            }));
            this.stats = {
                avgScore:       (statsData.avgScore       || 0).toFixed(0),
                avgHealth:      (statsData.avgHealth      || 0).toFixed(0),
                avgCareer:      (statsData.avgCareer      || 0).toFixed(0),
                avgConsistency: (statsData.avgConsistency || 0).toFixed(0),
                streak:         statsData.streak   || 0,
                totalDays:      statsData.totalDays || 0
            };
        } catch(e) { console.error(e); }
    }

    setPeriod(e) {
        this.period = e.currentTarget.dataset.period;
        this.load();
    }
}
