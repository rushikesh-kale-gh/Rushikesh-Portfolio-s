import { LightningElement, api, track } from 'lwc';
import getHabits   from '@salesforce/apex/DailyTrackerController.getHabits';
import getTodayLog from '@salesforce/apex/DailyTrackerController.getTodayLog';
import saveDayLog  from '@salesforce/apex/DailyTrackerController.saveDayLog';

const PW = { Low: 0.3, Medium: 0.5, High: 0.8, Critical: 1.0 };

export default class DailyReflectionModal extends LightningElement {
    @api userAccountId;

    @track reflection    = '';
    @track customNote    = '';
    @track taskLogs      = [];
    @track hasExistingLog= false;
    @track todayScore    = 0;
    @track healthScore   = 0;
    @track careerScore   = 0;
    @track consistencyScore = 0;

    get hasHabits()       { return this.taskLogs.length > 0; }
    get completedCount()  { return this.taskLogs.filter(t => t.status).length; }
    get totalCount()      { return this.taskLogs.length; }
    get todayFormatted()  { return new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }); }

    get projectedScore() {
        let num = 0, den = 0;
        this.taskLogs.forEach(t => {
            const pw = PW[t.priority] || 0.5;
            num += pw * (t.intensity / 100);
            den += pw;
        });
        return den > 0 ? Math.round((num / den) * 100) : 0;
    }

    connectedCallback() { this.load(); }

    async load() {
        try {
            const habits = await getHabits({ userAccountId: this.userAccountId });
            const res    = await getTodayLog({ userAccountId: this.userAccountId });
            const exMap  = {};
            if (res.taskLogs) res.taskLogs.forEach(tl => { exMap[tl.Habit__c] = tl; });
            if (res.dayLog) {
                this.hasExistingLog   = true;
                this.todayScore       = res.dayLog.Score__c || 0;
                this.healthScore      = res.dayLog.Health_Score__c || 0;
                this.careerScore      = res.dayLog.Career_Score__c || 0;
                this.consistencyScore = res.dayLog.Consistency_Score__c || 0;
                this.reflection       = res.dayLog.Reflection__c || '';
            }
            this.taskLogs = habits.map(h => {
                const ex = exMap[h.Id];
                return {
                    habitId:       h.Id,
                    name:          h.Name,
                    category:      h.Category__c || '',
                    priority:      h.Priority__c || 'Medium',
                    status:        ex ? ex.Status__c    : false,
                    intensity:     ex ? (ex.Intensity__c || 0) : 0,
                    categoryBadge: `cat-badge`,
                    priorityBadge: `pri-badge pri-${(h.Priority__c||'medium').toLowerCase()}`
                };
            });
        } catch(e) { console.error(e); }
    }

    handleReflection(e)  { this.reflection  = e.target.value; }
    handleCustomNote(e)  { this.customNote   = e.target.value; }

    handleCheck(e) {
        const id = e.target.dataset.id;
        this.taskLogs = this.taskLogs.map(t =>
            t.habitId === id ? { ...t, status: e.target.checked } : t
        );
    }

    handleIntensity(e) {
        const id  = e.target.dataset.id;
        const val = parseInt(e.target.value, 10);
        this.taskLogs = this.taskLogs.map(t =>
            t.habitId === id ? { ...t, intensity: val } : t
        );
    }

    async saveLog() {
        try {
            const taskData = this.taskLogs.map(t => ({
                habitId:  t.habitId,
                status:   t.status,
                intensity: t.intensity,
                priority: t.priority,
                category: t.category
            }));
            const res = await saveDayLog({
                userAccountId: this.userAccountId,
                reflection: this.reflection + (this.customNote ? `\n\nNote: ${this.customNote}` : ''),
                taskData
            });
            if (res.success) {
                this.hasExistingLog = true;
                this.todayScore     = res.score;
                await this.load();
                this.dispatchEvent(new CustomEvent('logsaved', { detail: { score: res.score } }));
            }
        } catch(e) { console.error(e); }
    }
}
