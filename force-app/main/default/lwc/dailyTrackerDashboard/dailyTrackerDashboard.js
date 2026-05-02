import { LightningElement, track } from 'lwc';
import createUser        from '@salesforce/apex/DailyTrackerController.createUser';
import signIn            from '@salesforce/apex/DailyTrackerController.signIn';
import verifySecurityQuestion from '@salesforce/apex/DailyTrackerController.verifySecurityQuestion';
import resetPassword     from '@salesforce/apex/DailyTrackerController.resetPassword';
import getHabits         from '@salesforce/apex/DailyTrackerController.getHabits';
import saveHabitApex     from '@salesforce/apex/DailyTrackerController.saveHabit';
import deleteHabit       from '@salesforce/apex/DailyTrackerController.deleteHabit';
import getTodayLog       from '@salesforce/apex/DailyTrackerController.getTodayLog';
import saveDayLog        from '@salesforce/apex/DailyTrackerController.saveDayLog';
import getCalendarData   from '@salesforce/apex/DailyTrackerController.getCalendarData';

const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS   = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];

export default class DailyTrackerDashboard extends LightningElement {

    // ─── STATE ────────────────────────────────────────────────────────────────
    @track isLoggedIn    = false;
    @track currentUserId = null;
    @track currentUsername = '';
    @track activeTab     = '1';

    // Auth
    @track isSignInMode  = true;
    @track authUsername  = '';
    @track authPassword  = '';
    @track securityAnswer = '';
    @track authError     = '';
    @track showForgotPassword = false;
    @track securityVerified   = false;
    @track newPassword        = '';
    @track resetUserId        = null;

    // Habits
    @track habitsList     = [];
    @track showHabitForm  = false;
    @track habitId        = null;
    @track habitName      = '';
    @track habitCategory  = '';
    @track habitPriority  = 'Medium';

    // Today tasks
    @track todayTaskLogs  = [];
    @track dayLogId       = null;

    // Calendar
    @track calYear  = new Date().getFullYear();
    @track calMonth = new Date().getMonth(); // 0-based
    @track calendarDays = [];
    
    // Calendar Detail Modal
    @track showDayDetailModal = false;
    @track selectedDayDetail = {
        date: '',
        dateFormatted: '',
        score: 0,
        reflection: '',
        customNote: '',
        taskLogs: []
    };

    // Toast
    @track showToast  = false;
    @track toastMessage = '';
    @track toastType    = 'success';

    weekdays = WEEKDAYS;

    // ─── GETTERS ─────────────────────────────────────────────────────────────
    get appClass()       { return this.isLoggedIn ? 'dt-app logged-in' : 'dt-app auth-mode'; }
    get signInTabClass() { return this.isSignInMode ? 'auth-tab active' : 'auth-tab'; }
    get createTabClass() { return !this.isSignInMode ? 'auth-tab active' : 'auth-tab'; }
    get isTab1()  { return this.activeTab === '1'; }
    get isTab2()  { return this.activeTab === '2'; }
    get isTab3()  { return this.activeTab === '3'; }
    get isTab4()  { return this.activeTab === '4'; }
    get isTab5()  { return this.activeTab === '5'; }
    get tab1Class() { return `tab-btn${this.activeTab==='1'?' active':''}`; }
    get tab2Class() { return `tab-btn${this.activeTab==='2'?' active':''}`; }
    get tab3Class() { return `tab-btn${this.activeTab==='3'?' active':''}`; }
    get tab4Class() { return `tab-btn${this.activeTab==='4'?' active':''}`; }
    get tab5Class() { return `tab-btn${this.activeTab==='5'?' active':''}`; }
    get hasHabits() { return this.habitsList && this.habitsList.length > 0; }
    get habitFormTitle() { return this.habitId ? 'Edit Habit' : 'Add New Habit'; }
    get toastClass() { return `dt-toast ${this.toastType}`; }
    get calendarMonthLabel() { return `${MONTHS[this.calMonth]} ${this.calYear}`; }
    get todayFormatted() {
        return new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    }

    // ─── AUTH HANDLERS ───────────────────────────────────────────────────────
    showSignIn()      { this.isSignInMode = true;  this.authError = ''; }
    showCreateUser()  { this.isSignInMode = false; this.authError = ''; }
    handleAuthUsername(e)   { this.authUsername   = e.target.value; }
    handleAuthPassword(e)   { this.authPassword   = e.target.value; }
    handleSecurityAnswer(e) { this.securityAnswer = e.target.value; }
    handleNewPassword(e)    { this.newPassword    = e.target.value; }

    removeClasses() {
        try {
            document.querySelectorAll('div').forEach(element => {
                if (element.classList[0] == "cCenterPanel" || element.classList[0] == "slds-col--padded") {
                    element.removeAttribute('class');
                }
            });
        } catch (error) {
            console.log('RemoveAttribute Error : ' + error);
        }
    }

    connectedCallback() {
        this.removeClasses();
        // Check sessionStorage for existing login
        const savedLogin = sessionStorage.getItem('dtLogin');
        if (savedLogin) {
            try {
                const { userId, username } = JSON.parse(savedLogin);
                this.loginSuccess(userId, username);
            } catch(e) {
                console.error('Session restore failed:', e);
            }
        }
    }

    async handleCreateUser() {
        this.authError = '';
        if (!this.authUsername || !this.authPassword || !this.securityAnswer) {
            this.authError = 'All fields are required.'; return;
        }
        try {
            const res = await createUser({ username: this.authUsername, password: this.authPassword, securityAnswer: this.securityAnswer });
            if (res.success) {
                this.loginSuccess(res.userId, res.username);
            } else {
                this.authError = res.message;
            }
        } catch(e) { this.authError = e.body?.message || 'Error creating account.'; }
    }

    async handleSignIn() {
        this.authError = '';
        try {
            const res = await signIn({ username: this.authUsername, password: this.authPassword });
            if (res.success) {
                this.loginSuccess(res.userId, res.username);
            } else {
                this.authError = res.message;
            }
        } catch(e) { this.authError = e.body?.message || 'Sign in failed.'; }
    }

    handleForgotPassword() { this.showForgotPassword = true; this.authError = ''; this.securityVerified = false; }
    cancelForgot()         { this.showForgotPassword = false; this.isSignInMode = true; this.authError = ''; }

    async handleVerifySecurity() {
        this.authError = '';
        try {
            const res = await verifySecurityQuestion({ username: this.authUsername, answer: this.securityAnswer });
            if (res.success) {
                this.securityVerified = true;
                this.resetUserId = res.userId;
            } else {
                this.authError = res.message;
            }
        } catch(e) { this.authError = e.body?.message || 'Verification failed.'; }
    }

    async handleResetPassword() {
        this.authError = '';
        if (!this.newPassword) { this.authError = 'Please enter a new password.'; return; }
        try {
            const res = await resetPassword({ userId: this.resetUserId, newPassword: this.newPassword });
            if (res.success) {
                this.showForgotPassword = false;
                this.isSignInMode = true;
                this.authPassword = this.newPassword;
                this.showToastMsg('Password reset successfully!', 'success');
            } else {
                this.authError = res.message;
            }
        } catch(e) { this.authError = e.body?.message || 'Reset failed.'; }
    }

    loginSuccess(userId, username) {
        this.currentUserId   = userId;
        this.currentUsername = username;
        this.isLoggedIn      = true;
        this.activeTab       = '1';
        // Save login to sessionStorage for persistence
        sessionStorage.setItem('dtLogin', JSON.stringify({ userId, username }));
        this.loadHabits();
        this.loadTodayTasks();
    }

    handleLogout() {
        this.isLoggedIn      = false;
        this.currentUserId   = null;
        this.currentUsername = '';
        this.authUsername    = '';
        this.authPassword    = '';
        this.activeTab       = '1';
        this.habitsList      = [];
        // Clear login from sessionStorage
        sessionStorage.removeItem('dtLogin');
    }

    // ─── TAB NAVIGATION ──────────────────────────────────────────────────────
    switchTab(e) {
        this.activeTab = e.currentTarget.dataset.tab;
        if (this.activeTab === '3') this.buildCalendar();
        if (this.activeTab === '4') this.loadTodayTasks();
        if (this.activeTab === '5') this.loadHabits();
    }

    // ─── HABITS ──────────────────────────────────────────────────────────────
    async loadHabits() {
        try {
            const raw = await getHabits({ userAccountId: this.currentUserId });
            this.habitsList = raw.map(h => ({
                ...h,
                priorityBadgeClass: `priority-badge priority-${(h.Priority__c||'medium').toLowerCase()}`
            }));
        } catch(e) { console.error(e); }
    }

    openAddHabit()  { this.habitId = null; this.habitName = ''; this.habitCategory = ''; this.habitPriority = 'Medium'; this.showHabitForm = true; }
    cancelHabit()   { this.showHabitForm = false; }
    handleHabitName(e)     { this.habitName     = e.target.value; }
    handleHabitCategory(e) { this.habitCategory = e.target.value; }
    handleHabitPriority(e) { this.habitPriority = e.target.value; }

    editHabit(e) {
        const id = e.currentTarget.dataset.id;
        const h  = this.habitsList.find(x => x.Id === id);
        if (h) {
            this.habitId       = h.Id;
            this.habitName     = h.Name;
            this.habitCategory = h.Category__c;
            this.habitPriority = h.Priority__c;
            this.showHabitForm = true;
        }
    }

    async saveHabit() {
        if (!this.habitName) { this.showToastMsg('Habit name is required.', 'error'); return; }
        try {
            await saveHabitApex({
                userAccountId: this.currentUserId,
                habitId:    this.habitId,
                name:       this.habitName,
                category:   this.habitCategory,
                priority:   this.habitPriority
            });
            this.showHabitForm = false;
            await this.loadHabits();
            this.showToastMsg('Habit saved!', 'success');
        } catch(e) { this.showToastMsg('Error saving habit.', 'error'); }
    }

    async removeHabit(e) {
        const id = e.currentTarget.dataset.id;
        try {
            await deleteHabit({ habitId: id });
            await this.loadHabits();
            this.showToastMsg('Habit removed.', 'success');
        } catch(e2) { this.showToastMsg('Error removing habit.', 'error'); }
    }

    // ─── TODAY TASKS ─────────────────────────────────────────────────────────
    async loadTodayTasks() {
        try {
            const habits = await getHabits({ userAccountId: this.currentUserId });
            const res    = await getTodayLog({ userAccountId: this.currentUserId });
            const existingMap = {};
            if (res.taskLogs) {
                res.taskLogs.forEach(tl => { existingMap[tl.Habit__c] = tl; });
            }
            if (res.dayLog) this.dayLogId = res.dayLog.Id;

            this.todayTaskLogs = habits.map(h => {
                const ex = existingMap[h.Id];
                return {
                    habitId:   h.Id,
                    name:      h.Name,
                    category:  h.Category__c,
                    priority:  h.Priority__c,
                    status:    ex ? ex.Status__c    : false,
                    intensity: ex ? ex.Intensity__c : 0
                };
            });
        } catch(e) { console.error(e); }
    }

    handleTaskUpdated(e) {
        const { habitId, status, intensity } = e.detail;
        this.todayTaskLogs = this.todayTaskLogs.map(t =>
            t.habitId === habitId ? { ...t, status, intensity } : t
        );
    }

    async saveTasksOnly() {
        await this._persistDayLog('');
    }

    async _persistDayLog(reflection) {
        try {
            const taskData = this.todayTaskLogs.map(t => ({
                habitId:   t.habitId,
                status:    t.status,
                intensity: t.intensity,
                priority:  t.priority,
                category:  t.category
            }));
            const res = await saveDayLog({ userAccountId: this.currentUserId, reflection, taskData });
            if (res.success) {
                this.showToastMsg(`Saved! Score: ${res.score}%`, 'success');
            } else {
                this.showToastMsg(res.message || 'Save failed.', 'error');
            }
        } catch(e) { this.showToastMsg('Error saving.', 'error'); }
    }

    handleLogSaved(e) {
        this.showToastMsg(`Daily log saved! Score: ${e.detail.score}%`, 'success');
    }

    // ─── CALENDAR ────────────────────────────────────────────────────────────
    prevMonth() { if (this.calMonth === 0) { this.calMonth = 11; this.calYear--; } else { this.calMonth--; } this.buildCalendar(); }
    nextMonth() { if (this.calMonth === 11) { this.calMonth = 0; this.calYear++; } else { this.calMonth++; } this.buildCalendar(); }

    async buildCalendar() {
        try {
            const logs = await getCalendarData({ userAccountId: this.currentUserId, year: this.calYear, month: this.calMonth + 1 });
            const scoreMap = {};
            logs.forEach(dl => { scoreMap[dl.Date__c] = dl.Score__c || 0; });

            const firstDay  = new Date(this.calYear, this.calMonth, 1).getDay();
            const daysInMon = new Date(this.calYear, this.calMonth + 1, 0).getDate();
            const cells = [];

            for (let i = 0; i < firstDay; i++) {
                cells.push({ key: `e${i}`, dateNum: '', hasLog: false, cellClass: 'cal-cell empty', bgStyle: '', scoreLabel: '' });
            }
            for (let d = 1; d <= daysInMon; d++) {
                const dateStr = `${this.calYear}-${String(this.calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const hasLog  = scoreMap.hasOwnProperty(dateStr);
                const score   = hasLog ? scoreMap[dateStr] : 0;
                let bg = '';
                if (hasLog) {
                    if (score <= 25)       bg = 'rgba(239,68,68,0.25)';
                    else if (score <= 50)  bg = 'rgba(249,115,22,0.25)';
                    else if (score <= 75)  bg = 'rgba(234,179,8,0.25)';
                    else                   bg = 'rgba(34,197,94,0.25)';
                }
                const today = new Date();
                const isToday = d === today.getDate() && this.calMonth === today.getMonth() && this.calYear === today.getFullYear();
                cells.push({
                    key: dateStr,
                    dateNum: d,
                    hasLog,
                    score,
                    dateStr,
                    scoreLabel: hasLog ? `${Math.round(score)}%` : '',
                    cellClass: `cal-cell${hasLog ? ' has-log' : ''}${isToday ? ' today' : ''}`,
                    bgStyle:   bg ? `background:${bg};` : '',
                    isClickable: hasLog
                });
            }
            this.calendarDays = cells;
        } catch(e) { console.error(e); }
    }

    // ─── CALENDAR DETAIL MODAL ────────────────────────────────────────────────
    async handleCalendarDayClick(e) {
        const dateStr = e.currentTarget.dataset.datestr;
        if (!dateStr) return;
        
        try {
            const res = await getTodayLog({ userAccountId: this.currentUserId, date: dateStr });
            if (res.dayLog) {
                const dayLog = res.dayLog;
                const taskLogs = res.taskLogs || [];
                this.selectedDayDetail = {
                    date: dateStr,
                    dateFormatted: new Date(dateStr).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }),
                    score: dayLog.Score__c || 0,
                    reflection: dayLog.Reflection__c || '',
                    customNote: dayLog.Custom_Note__c || '',
                    taskLogs: taskLogs.map(tl => ({
                        name: tl.Habit_Name__c || 'Unknown',
                        status: tl.Status__c ? '✓' : '✗',
                        intensity: tl.Intensity__c || 0,
                        category: tl.Category__c || ''
                    }))
                };
                this.showDayDetailModal = true;
            }
        } catch(e) { 
            this.showToastMsg('Failed to load day details', 'error');
            console.error(e);
        }
    }

    closeDayDetailModal() {
        this.showDayDetailModal = false;
    }

    stopPropagation(e) {
        e.stopPropagation();
    }

    // ─── TOAST ───────────────────────────────────────────────────────────────
    showToastMsg(msg, type) {
        this.toastMessage = msg;
        this.toastType    = type;
        this.showToast    = true;
        setTimeout(() => { this.showToast = false; }, 3000);
    }
}