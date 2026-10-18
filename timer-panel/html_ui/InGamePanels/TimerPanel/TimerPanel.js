class TimerPanel extends TemplateElement {
    constructor() {
        super(...arguments);
        this.started = false;
        this.ingameUi = null;
    }
    connectedCallback() {
        super.connectedCallback();
        this.ingameUi = this.querySelector('ingame-ui');
        var root = this.querySelector('#tm-root');
        if (root && !this.started) {
            this.started = true;
            TM.mount(root);
        }
    }
    disconnectedCallback() {
        super.disconnectedCallback();
    }
}
window.customElements.define("ingamepanel-timer", TimerPanel);
checkAutoload();
