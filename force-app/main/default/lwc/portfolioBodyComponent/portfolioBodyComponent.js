import { LightningElement, api, track } from 'lwc';
import getIconsByContext from '@salesforce/apex/PortfolioMainClass.getIconsByContext';
import resumePDF from '@salesforce/resourceUrl/MyResume';

export default class PortfolioBodyComponent extends LightningElement {

    scrollTimeout = null;
    isScrolling = false;
    @track activeSection = 'about';
    @api profileUrl;
    @api themeOne;
    @api navEvent;
    svgIconsList;

    sections = [
        { id: 'About Me', name: 'About', indicatorClass: 'side-indicator active' },
        { id: 'Work & Experience', name: 'Experience', indicatorClass: 'side-indicator active' },
        { id: 'Projects', name: 'Projects', indicatorClass: 'side-indicator active' },
        { id: 'Certifications', name: 'Certifications', indicatorClass: 'side-indicator active' },
        { id: 'Rewards & Recognition', name: 'Rewards & Recognition', indicatorClass: 'side-indicator active' },
        { id: 'Education', name: 'Education', indicatorClass: 'side-indicator active' },
        { id: 'Resume & CL', name: 'Resume', indicatorClass: 'side-indicator active' },
        { id: 'Contact Me', name: 'Contact', indicatorClass: 'side-indicator active' }
    ];

    connectedCallback() {
        this.getIconsByContext();
    }

    dispatchCustomEvent(param1, param2) {
        this.dispatchEvent(
            new CustomEvent('updatejson', {
                detail: {
                    param1: param1,
                    param2: param2
                }
            })
        );
    }

    getIconsByContext() {
        getIconsByContext({}).then(data => {
            this.navigationIcon = data.Navigation;
            this.svgIconsList = [...data.Navigation, ...data.Menu, ...data.Generic];
        }).catch(error => {
            console.log('Error in PortfolioBodyComponent @connectedCallback-getIconsByContext: ' + JSON.stringify(error));
        });
    }

    get backgroundStyle() {
        return `background-image: url(${this.themeOne});`;
    }

    @api
    handleScrollClick(event) {
        const bubbleEvent = event?.currentTarget?.dataset?.section;
        if (bubbleEvent) {
            this.dispatchCustomEvent('clicks', 'bubble');
        }
        if (event == 'About Me' || bubbleEvent == 'About Me') {
            const childCmp = this.template.querySelector('c-portfolio-about-component');
            childCmp.scrollToElement();
            this.dispatchCustomEvent('nav', 'about');
        }
        if (event == 'Work & Experience' || bubbleEvent == 'Work & Experience') {
            const childCmp = this.template.querySelector('c-portfolio-experience-component');
            childCmp.scrollToElement();
            this.dispatchCustomEvent('nav', 'work');
        }
        if (event == 'Projects' || bubbleEvent == 'Projects') {
            const childCmp = this.template.querySelector('c-portfolio-project-component');
            childCmp.scrollToElement();
            this.dispatchCustomEvent('nav', 'project');
        }
        if (event == 'Certifications' || bubbleEvent == 'Certifications') {
            const childCmp = this.template.querySelector('c-portfolio-view-certificate-component');
            childCmp.scrollToElement();
            this.dispatchCustomEvent('nav', 'cert');
        }
        if (event == 'Rewards & Recognition' || bubbleEvent == 'Rewards & Recognition') {
            const childCmp = this.template.querySelector('c-portfolio-r-and-r-component');
            childCmp.scrollToElement();
            this.dispatchCustomEvent('nav', 'rnr');
        }
        if (event == 'Education' || bubbleEvent == 'Education') {
            const childCmp = this.template.querySelector('c-portfolio-education-component');
            childCmp.scrollToElement();
            this.dispatchCustomEvent('nav', 'education');
        }
        if (event == 'Resume & CL' || bubbleEvent == 'Resume & CL') {
            const childCmp = this.template.querySelector('c-portfolio-footer-component');
            childCmp.scrollToElement();
            this.dispatchCustomEvent('nav', 'viewResume');
        }
        if (event == 'Contact Me' || bubbleEvent == 'Contact Me') {
            const childCmp = this.template.querySelector('c-portfolio-contact-me-component');
            childCmp.scrollToElement();
            this.dispatchCustomEvent('nav', 'contact');
        }
        if (event == 'Download Resume') {
            const link = document.createElement('a');
            link.href = resumePDF;
            link.download = 'Rushikesh_Kale_Resume.pdf';
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.dispatchCustomEvent('nav', 'downloadResume');
        }
        if (event == 'Learning') {
            window.open('https://rushi7287.github.io/salesforce-dev-handbook-react/#/learningroute/lwc/1', '_blank').focus()
            this.dispatchCustomEvent('nav', 'learning');
        }
        if (event == 'LinkedIn') {
            window.open('https://www.linkedin.com/in/rushikesh-kale-3a962a382/', '_blank').focus()
            this.dispatchCustomEvent('nav', 'linkedIn');
        }
        if (event == 'GitHub') {
            window.open('https://github.com/Rushi7287', '_blank').focus()
            this.dispatchCustomEvent('nav', 'github');
        }
        if (event == 'Email Me') {
            window.open('mailto:rushikeshkale7287@gmail.com', '_blank').focus()
            this.dispatchCustomEvent('nav', 'email');
        }
        if (event == 'Trailhead') {
            window.open('https://www.salesforce.com/trailblazer', '_blank').focus()
            this.dispatchCustomEvent('nav', 'trailhead');
        }
    }

    incrementChildMetric(event) {
        let param1 = event.detail.param1;
        let param2 = event.detail.param2;
        this.dispatchCustomEvent(param1, param2);
    }

    performScroll(element) {
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - 100;
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }

    childEvent(event) {
        const element = event.detail.status;
        this.performScroll(element);
    }

    handleScroll() {
        if (this.isScrolling) {
            return;
        }
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        this.scrollTimeout = setTimeout(() => {
            this.updateActiveSection();
        }, 50);
    }

    updateActiveSection() {
        const sections = this.template.querySelectorAll('.portfolio-section');
        const scrollPosition = window.scrollY + window.innerHeight / 3;
        let newActiveSection = this.activeSection;
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            const sectionId = section.dataset.section;
            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                newActiveSection = sectionId;
            }
        });
        if (newActiveSection !== this.activeSection) {
            this.activeSection = newActiveSection;
            this.updateSectionIndicators();
        }
    }

    updateSectionIndicators() {
        this.sections = this.sections.map(section => ({
            ...section,
            indicatorClass: section.id === this.activeSection
                ? 'side-indicator active'
                : 'side-indicator'
        }));
    }

    disconnectedCallback() {
        window.removeEventListener('scroll', this.handleScroll);
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
    }
}