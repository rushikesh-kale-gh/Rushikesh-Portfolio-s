import { LightningElement, api } from 'lwc';

export default class TaskItem extends LightningElement {
    @api taskLog;

    get rowClass() {
        return `task-row${this.taskLog.status ? ' completed' : ''}`;
    }
    get priorityBadgeClass() {
        return `pri-badge pri-${(this.taskLog.priority||'medium').toLowerCase()}`;
    }

    handleCheck(e) {
        this.dispatchEvent(new CustomEvent('updated', {
            detail: { habitId: this.taskLog.habitId, status: e.target.checked, intensity: this.taskLog.intensity }
        }));
    }
    handleIntensity(e) {
        this.dispatchEvent(new CustomEvent('updated', {
            detail: { habitId: this.taskLog.habitId, status: this.taskLog.status, intensity: parseInt(e.target.value, 10) }
        }));
    }
}
