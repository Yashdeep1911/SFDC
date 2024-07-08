import { LightningElement, api, wire, track } from 'lwc';
import { MessageContext } from 'lightning/messageService';

export default class customHtmlTableCell extends LightningElement {
  @api row;
  @api column;

  value;
  type;
  typeAttribute = {};
  cellAttribute = {};
  cellClass = "slds-grid"
  tooltipStyle;
  isCheckboxDisabled = false;
  tooltip;

  subscription = null;
  @wire(MessageContext)
  messageContext;

  @track actions = [];
  @track currentActions = [];
  @track actionPage = 0;
  showNext = false;
  showPrev = false;
  checkBoxHandler(event) {
    let message = {
      recId: this.row?.Id,
      action: "checkbox",
      value: event.target?.checked
    };
    this.dispatchEvent(
      new CustomEvent("formatted-table-cell-massaction", {
        detail: message,
        bubbles: true,
        composed: false
      })
    );
  }

  handleClick(event) {
    let clickedId = event.target.getAttribute("data-id");
    let clickedAction = event.target.getAttribute("data-action");
    let listName = event.target.getAttribute("data-list");
    let message = {
      recId: clickedId,
      action: clickedAction,
      listName: listName
    };
    this.dispatchEvent(
      new CustomEvent("formatted-table-cell-actionclick", {
        detail: message,
        bubbles: true,
        composed: true
      })
    );
  }

  handleOnselect(event) {
    let clickedId = event.target.getAttribute("data-id");
    let clickedAction = event.target.getAttribute("data-action");
    let listName = event.target.getAttribute("data-list");
    let message = {
      recId: clickedId,
      action: clickedAction,
      listName: listName
    };
    this.dispatchEvent(
      new CustomEvent("formatted-table-cell-actionclick", {
        detail: message,
        bubbles: true,
        composed: true
      })
    );
  }

  handleOnMenuClick(event) {
    let clickedId = event.target.getAttribute("data-id");
    let clickedAction = event.target.getAttribute("data-action");
    let listName = event.target.getAttribute("data-list");
    let message = {
      recId: clickedId,
      action: clickedAction,
      listName: listName
    };
    this.dispatchEvent(
      new CustomEvent("formatted-table-cell-actionclick", {
        detail: message,
        bubbles: true,
        composed: true
      })
    );
  }
  syncInProgress = false;
  get showSyncAction() {
    return this.row.state === 'SyncInProgress' || this.syncInProgress;
  }


  init(self){
    self = self || this;
    self.isCheckboxDisabled =
      self.column?.checkBoxDisabled === undefined
        ? false
        : self.row[self.column?.checkBoxDisabled];

    self.value = self.row[self.column.fieldName];
    self.type = self.column.type;
    
    if(self.isActionButtons){
      let primaryActions = [];
      let secondaryActions = [];
      let values = [];
      self.value?.forEach(action => {
        let at = {...action};
        if(at.isHighlighted){
          at['classList'] = 'slds-m-left_xx-small slds-button slds-button_icon slds-p-around_xx-small glow';
        }else{
          at['classList'] = 'slds-m-left_xx-small slds-button slds-button_icon slds-p-around_xx-small';
        }
        values.push(at);
      });
      self.value = [...values];
      self.value?.forEach(action => action.isAction && primaryActions.push(action));
      self.value?.forEach(action => !action.isAction && secondaryActions.push(action));
      self.currentActions = primaryActions;
      self.actions = [primaryActions];
      if(secondaryActions.length){
        const chunk = (arr, size) =>
          Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
            arr.slice(i * size, i * size + size)
          );
          self.actions = [...self.actions].concat(chunk(secondaryActions, primaryActions.length -1 ));
          this.showNext = true;
      }
    }
    self.tooltip = self.isStatic || self.isText || self.isNumber || self.isPercent || self.isCurrency || self.isPhone ? self.value : '';
    
    if (self.column.cellAttributes) {
      self.cellAttribute = JSON.parse(self.column.cellAttributes);
      if (self.cellAttribute.alignment) {
        switch (self.cellAttribute.alignment) {
          case "right":
            self.cellClass = "slds-grid slds-grid_align-end ";
            break;
          case "center":
            self.cellClass = "slds-grid slds-grid_align-center ";
            break;
        }
      }
      if (self.cellAttribute.altValue) {
        if (self.cellAttribute.altValue.fieldName && self.row[self.cellAttribute.altValue.fieldName]) {
          self.value = self.row[self.cellAttribute.altValue.fieldName];
          self.tooltip = self.row[self.cellAttribute.altValue.fieldName];
          if (self.cellAttribute.altValue.type) {
            self.type = self.cellAttribute.altValue.type;
          }
        }

      }

      if (self.cellAttribute.class) {
        self.cellClass += self.cellAttribute.class;
      }
      if (self.cellAttribute.tooltip) {
        if (self.cellAttribute.tooltip.fieldName) {
          self.tooltip = self.row[self.cellAttribute.tooltip.fieldName];
        } else {
          self.tooltip = self.cellAttribute.tooltip;
        }
      }
      if (
        self.cellAttribute.iconLabel &&
        self.cellAttribute.iconLabel.fieldName
      ) {
        self.cellAttribute.iconLabel =
          self.row[self.cellAttribute.iconLabel.fieldName];
      }
    }
    if (self.column.typeAttributes) {
      self.typeAttribute = JSON.parse(self.column.typeAttributes);
      let label = self.typeAttribute.label;
      if (label && label.fieldName) {
        self.typeAttribute.label = self.row[label.fieldName];
      }
      if (self.isUrl && !self.typeAttribute.target) {
        self.typeAttribute.target = "_blank";
      }
      let currencyCode = self.typeAttribute.currencyCode;
      if (currencyCode && currencyCode.fieldName) {
        self.typeAttribute.currencyCode = self.row[currencyCode.fieldName];
      }
    }
    if (self.type === "lookupurl") {
      self.value = "/" + self.value;
    }
  }
  renderedCallback() {
    let spanEle = this.template.querySelectorAll("span.tooltip");
    if (spanEle && spanEle.length > 0) {
      let leftValue = spanEle[0].offsetWidth + 12;
      this.tooltipStyle = "left: " + leftValue + "px !important;";
    }
  }

  get iconName() {
    if (this.cellAttribute && this.cellAttribute.iconName) {
      if (this.cellAttribute.iconName.fieldName) {
        return this.row[this.cellAttribute.iconName.fieldName];
      } else {
        return this.cellAttribute.iconName;
      }
    }
    return null;
  }

  get isBoolean() {
    return this.type === 'boolean';
  }

  get isButton() {
    return this.type === 'button';
  }

  get isButtonIcon() {
    return this.type === 'button-icon';
  }

  get isPhone() {
    return this.type === 'phone';
  }

  get isUrl() {
    return this.type === 'url' || this.type === 'lookupurl';
  }

  get isEmail() {
    return this.type === 'email';
  }

  get isCurrency() {
    return this.type === 'currency';
  }

  get isPercent() {
    return this.type === 'percent';
  }

  get isNumber() {
    return this.type === 'number';
  }

  get isDate() {
    return this.type === 'date';
  }

  get isText() {
    return this.type === 'text' || this.type === undefined || this.type === null || this.type === '';
  }

  get isStatic() {
    return this.type === 'static';
  }

  get iconWithTooltip() {
    return this.cellAttribute && this.cellAttribute.iconName && this.cellAttribute.iconLabel;
  }

  get cellIconLeft() {
    return this.cellAttribute && this.iconName && (!this.cellAttribute.iconPosition || (this.cellAttribute.iconPosition && this.cellAttribute.iconPosition != 'right'));
  }

  get cellIconRight() {
    return this.cellAttribute && this.cellAttribute.iconPosition && this.cellAttribute.iconPosition == 'right';
  }

  get isActionButtons() {
    return this.type === 'actionButtons';
  }

  get divStyle() {
    return this.type === 'actionButtons' ? '' : 'slds-truncate';
  }

  get getStyle() {
    return this.cellAttribute && this.cellAttribute.iconName && !this.iconName
      ? "padding-left:1.2rem;"
      : "" + (this.cellAttribute.style ? (this.cellAttribute.style.fieldName ? this.row[this.cellAttribute.style.fieldName] : this.cellAttribute.style) : '');
  }

  get getEmail() {
    return "mailto:" + this.value;
  }

  showDropDown = false;
  handleClick(event){
    this.showDropDown = true;
    document.getElementById('cars').size='3';
  }


  handlePrevClick(event){
    this.showNext = true;
    if(this.actionPage > 0 ) {
      console.log('handlePrevClick if');
      this.actionPage -= 1;
      this.currentActions = [];
      this.currentActions = [...this.actions[this.actionPage]];
      this.showPrev = this.actionPage > 0;
    }else{
      this.showPrev = false;
    }
  }

  handleNextClick(event){
    this.showPrev = true;
    if(this.actionPage < this.actions.length ) {
      this.actionPage += 1;
      this.currentActions = [];
      this.currentActions = [...this.actions[this.actionPage]];
      this.showNext = this.actionPage < this.actions.length - 1 ;
    }else{
      this.showNext = false;
    }
  }
}
