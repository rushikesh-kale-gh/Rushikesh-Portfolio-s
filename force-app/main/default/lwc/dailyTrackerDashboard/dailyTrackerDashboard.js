import { LightningElement, track } from 'lwc';
import getDailyLog from '@salesforce/apex/DailyTrackerController.getDailyLog';
import saveDailyLog from '@salesforce/apex/DailyTrackerController.saveDailyLog';
import getTasksForDate from '@salesforce/apex/DailyTrackerController.getTasksForDate';
import saveTaskLog from '@salesforce/apex/DailyTrackerController.saveTaskLog';
import getUserTasks from '@salesforce/apex/DailyTrackerController.getUserTasks';
import createTask from '@salesforce/apex/DailyTrackerController.createTask';
import deleteTask from '@salesforce/apex/DailyTrackerController.deleteTask';
import getLogsDateRange from '@salesforce/apex/DailyTrackerController.getLogsDateRange';
import getCalendarData from '@salesforce/apex/DailyTrackerController.getCalendarData';

export default class DailyTrackerDashboard extends LightningElement {
    @track isLoggedIn = false;
    @track currentUsername = '';
    @track currentUserId = '';
    @track todayDateLabel = '';
    
    @track activeTab = 'reflection';
    @track isTabActive = { reflection: true, logs: false, calendar: false, tasks: false, habits: false };
    
    @track dayLogScore = 0;
    @track healthScore = 0;
    @track careerScore = 0;
    @track disciplineScore = 0;
    
    @track reflectionText = '';
    @track reflectionSaved = false;
    
    @track analyticsRange = 'week';
    @track analyticsData = [];
    
    @track currentMonth = new Date().getMonth() + 1;
    @track currentYear = new Date().getFullYear();
    @track calendarMonthYear = '';
    @track calendarDays = [];
    
    @track todayTasks = [];
    @track userHabits = [];
    @track noTasks = false;
    @track noHabits = false;
    
    @track newHabitName = '';
    @track newHabitCategory = '';
    @track newHabitPriority = '';
    @track newHabitTarget = '';
    
    @track showToast = false;
    @track toastMessage = '';
    @track toastType = 'success';
    
    connectedCallback() {
        this.updateDateLabel();
        this.loadTasks();
        this.loadCalendar();
    }
    
    handleLoginSuccess(event) {
        this.currentUserId = event.detail.userId;
        this.currentUsername = event.detail.username;
        this.isLoggedIn = true;
        this.loadDailyLog();
        this.loadTasks();
    }
    
    handleAccountCreated(event) {
        this.currentUserId = event.detail.userId;
        this.currentUsername = event.detail.username;
        this.isLoggedIn = true;
        this.loadDailyLog();
    }
    
    loadDailyLog() {
        getDailyLog({ userAccountId: this.currentUserId, logDate: new Date() })
            .then((result) => {
                if (result.found) {
                    this.dayLogScore = result.score || 0;
                    this.healthScore = result.healthScore || 0;
                    this.careerScore = result.careerScore || 0;
                    this.disciplineScore = result.disciplineScore || 0;
                    this.reflectionText = result.reflection || '';
                } else {
                    this.dayLogScore = 0;
                    this.healthScore = 0;
                    this.careerScore = 0;
                    this.disciplineScore = 0;
                }
            })
            .catch((error) => console.error('Error loading daily log:', error));
    }
    
    loadTasks() {
        getUserTasks({ userAccountId: this.currentUserId })
            .then((result) => {
                this.userHabits = result || [];
                this.noHabits = this.userHabits.length === 0;
                
                // Load today's tasks
                getTasksForDate({ userAccountId: this.currentUserId, logDate: new Date() })
                    .then((tasks) => {
                        this.todayTasks = tasks || [];
                        this.noTasks = this.todayTasks.length === 0;
                    });
            })
            .catch((error) => console.error('Error loading tasks:', error));
    }
    
    loadCalendar() {
        getCalendarData({ userAccountId: this.currentUserId, year: this.currentYear, month: this.currentMonth })
            .then((result) => {
                this.calendarDays = result || [];
                this.updateCalendarLabel();
            })
            .catch((error) => console.error('Error loading calendar:', error));
    }
    
    updateDateLabel() {
        const today = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        this.todayDateLabel = today.toLocaleDateString('en-US', options);
    }
    
    updateCalendarLabel() {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        this.calendarMonthYear = `${monthNames[this.currentMonth - 1]} ${this.currentYear}`;
    }
    
    selectTab(event) {
        const tabName = event.target.dataset.tab;
        this.activeTab = tabName;
        this.isTabActive = { reflection: false, logs: false, calendar: false, tasks: false, habits: false };
        this.isTabActive[tabName] = true;
        
        if (tabName === 'logs') {
            this.loadAnalytics();
        } else if (tabName === 'calendar') {
            this.loadCalendar();
        }
    }
    
    getTabClass(tabName) {
        return `tab-btn ${this.activeTab === tabName ? 'active' : ''}`;
    }
    
    updateReflectionText(event) {
        this.reflectionText = event.target.value;
        this.reflectionSaved = false;
    }
    
    saveReflection() {
        saveDailyLog({ userAccountId: this.currentUserId, logDate: new Date(), reflection: this.reflectionText })
            .then(() => {
                this.reflectionSaved = true;
                this.showToastMessage('Reflection saved!', 'success');
                setTimeout(() => { this.reflectionSaved = false; }, 3000);
            })
            .catch((error) => this.showToastMessage('Error saving reflection', 'error'));
    }
    
    changeAnalyticsRange(event) {
        this.analyticsRange = event.target.value;
        this.loadAnalytics();
    }
    
    loadAnalytics() {
        const today = new Date();
        let startDate = new Date(today);
        
        if (this.analyticsRange === 'week') {
            startDate.setDate(today.getDate() - 7);
        } else if (this.analyticsRange === 'month') {
            startDate.setDate(today.getDate() - 30);
        }
        
        getLogsDateRange({ userAccountId: this.currentUserId, startDate: startDate, endDate: today })
            .then((result) => {
                this.analyticsData = result || [];
            })
            .catch((error) => console.error('Error loading analytics:', error));
    }
    
    prevMonth() {
        this.currentMonth--;
        if (this.currentMonth < 1) {
            this.currentMonth = 12;
            this.currentYear--;
        }
        this.loadCalendar();
    }
    
    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 12) {
            this.currentMonth = 1;
            this.currentYear++;
        }
        this.loadCalendar();
    }
    
    getDayClass(day) {
        let classStr = 'calendar-day';
        if (day.color === 'green') classStr += ' green';
        else if (day.color === 'yellow') classStr += ' yellow';
        else if (day.color === 'orange') classStr += ' orange';
        else if (day.color === 'red') classStr += ' red';
        else classStr += ' gray';
        return classStr;
    }
    
    toggleTask(event) {
        const taskId = event.target.dataset.taskid;
        const task = this.todayTasks.find(t => t.id === taskId);
        if (task) {
            task.completed = event.target.checked;
        }
    }
    
    updateIntensity(event) {
        const taskId = event.target.dataset.taskid;
        const task = this.todayTasks.find(t => t.id === taskId);
        if (task) {
            task.intensity = parseInt(event.target.value);
        }
    }
    
    updateNewHabitName(event) {
        this.newHabitName = event.target.value;
    }
    
    updateNewHabitCategory(event) {
        this.newHabitCategory = event.target.value;
    }
    
    updateNewHabitPriority(event) {
        this.newHabitPriority = event.target.value;
    }
    
    addHabit() {
        if (!this.newHabitName || !this.newHabitCategory || !this.newHabitPriority) {
            this.showToastMessage('Please fill all fields', 'error');
            return;
        }
        
        createTask({
            userAccountId: this.currentUserId,
            taskName: this.newHabitName,
            category: this.newHabitCategory,
            priority: this.newHabitPriority,
            targetQuantity: this.newHabitTarget ? parseInt(this.newHabitTarget) : null
        })
            .then(() => {
                this.newHabitName = '';
                this.newHabitCategory = '';
                this.newHabitPriority = '';
                this.newHabitTarget = '';
                this.loadTasks();
                this.showToastMessage('Habit added!', 'success');
            })
            .catch((error) => this.showToastMessage('Error adding habit', 'error'));
    }
    
    deleteHabit(event) {
        const habitId = event.target.dataset.habitid;
        deleteTask({ taskId: habitId })
            .then(() => {
                this.loadTasks();
                this.showToastMessage('Habit deleted', 'success');
            })
            .catch((error) => this.showToastMessage('Error deleting habit', 'error'));
    }
    
    handleLogout() {
        this.isLoggedIn = false;
        this.currentUserId = '';
        this.currentUsername = '';
    }
    
    showToastMessage(message, type) {
        this.toastMessage = message;
        this.toastType = type;
        this.showToast = true;
        setTimeout(() => { this.showToast = false; }, 3000);
    }
    
    getToastClass() {
        return `toast ${this.toastType}`;
    }
    
    getCategoryStyle(category) {
        const colors = {
            'Health': 'background-color: #34C759; color: white;',
            'Career': 'background-color: #0A84FF; color: white;',
            'Discipline': 'background-color: #FF9F0A; color: white;'
        };
        return colors[category] || 'background-color: #6c757d; color: white;';
    }
}
