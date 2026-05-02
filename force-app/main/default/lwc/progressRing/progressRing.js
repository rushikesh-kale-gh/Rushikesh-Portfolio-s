import { LightningElement, api } from 'lwc';

export default class ProgressRing extends LightningElement {
    @api score = 0;
    @api label = '';
    @api size  = 'md'; // sm | md | lg

    get displayScore()  { return Math.round(this.score || 0); }
    get ringClass()     { return `ring-wrap ring-${this.size}`; }
    get dashOffset()    { return (263.9 * (1 - (this.score || 0) / 100)).toFixed(1); }
    get strokeStyle() {
        const s = this.score || 0;
        let color;
        if (s <= 25)       color = '#ef4444';
        else if (s <= 50)  color = '#f97316';
        else if (s <= 75)  color = '#eab308';
        else               color = '#22c55e';
        return `stroke:${color};`;
    }
}
