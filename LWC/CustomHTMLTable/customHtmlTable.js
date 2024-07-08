import { LightningElement, wire, api, track } from "lwc";
import { NavigationMixin } from "lightning/navigation";

export default class Cpq_genericListView extends NavigationMixin(
  LightningElement
) {
  //Send this property to set the table height
  @api tableHeight /*= "35vh"*/;

  //Send this property to enable the searchbox
  @api isSearchEnabled;

  subscription = null;

  //Set this property to populate the coloumn header data
  @api
  fieldProperties; /*[{ fieldName: "Id", width: "18%", sortable: true, type: 'text', label: "Opportunity ID" },
    { fieldName: "Name", width: "18%", sortable: false, type: 'text', label: "Name" },
    { fieldName: "StageName", width: "18%", sortable: true, type: 'text', label: "Sales Phase" },
    { fieldName: "CloseDate", width: "10%", sortable: false, type: 'date', label: "Planned/Actual Decision Date" },
    { fieldName: "G2_Approval_Date__c", width: "18%", sortable: false, type: 'date', label: "G2 Approval Date" },
    { fieldName: "Care_Renewal__c", width: "18%", sortable: true, type: 'boolean', label: "Care Renewal" }];*/

  //Set this property to populate the row header data
  @api rowData; //list of sObject

  @api massActions=[];
  @api objectname;
  @api isPortal;
  massActionRecordList = [];
  isMassDisabled= true;
  isChecked = false;

  directions = ["asc", "desc"];
  iconDirections = new Map([
    ["desc", "utility:arrowdown"],
    ["asc", "utility:arrowup"]
  ]);
  alternativeTextMap = new Map([
    ["desc", "Indicates down arrow for descending sort"],
    ["asc", "Indicates up arrow for ascending sort"]
  ]);
  alternativeText;
  sortField;
  sortDirection;
  dataCopy = [];
  columns = [];
  iconName;
  icons;

  offsetRatios = [];
  firstExecution = true;
  fieldHeaders = [];
  fieldToTypeAttributeLabelMap = {};
  searchMessage;

  
  hasMenus = true; // flag to indicate whether menu should be displayed at the end of each row
  menuButtons = []; // A list of only buttons inside the menu dropdown
  rowDataTemp = [];
  //Creates the style for setting table height
  get isHeight() {
    return (this.tableHeight
      ? "height: " + this.tableHeight + " !important;"
      : "")
      // + "overflow: hidden visible;";
  }

  //Sets the default value for enabling/disabling the searchbox
  get isSearchVisible() {
    return this.isSearchEnabled ? this.isSearchEnabled : false;
  }

  @api 
  get isActionButtonDisabled(){
    return this.isMassDisabled;
  }
  set isActionButtonDisabled(value){
    this.setAttribute('isActionButtonDisabled', value);
    this.isMassDisabled = value;
  }
  
  constructor() {
    super();
    this.template.addEventListener('formatted-table-cell-massaction', this.handleMassAction.bind(this));
  }
  disconnectedCallback(){
    this.template.removeEventListener('formatted-table-cell-massaction', this.handleMassAction.bind(this));
  }

  handleMassAction(event){
    event.stopPropagation();
    
    if (event?.detail?.action === 'checkbox') {
      event?.detail?.value && this.massActionRecordList.push(event?.detail?.recId);
      !event?.detail?.value && this.massActionRecordList.indexOf(event?.detail?.recId)!==-1 && this.massActionRecordList.splice(this.massActionRecordList.indexOf(event?.detail?.recId), 1);
      this.isChecked = this.isChecked && !!this.massActionRecordList.length;
      this.isMassDisabled = !!!this.massActionRecordList.length;
    }
    
  }
  massButtonHandler(event){
    let clickedAction = event.target.getAttribute('data-action');
    this.dispatchEvent(new CustomEvent("formatted-table-cell-mass-selections", { detail: {data : this.massActionRecordList , action : clickedAction },bubbles: true ,composed :false }));
    this.massActionRecordList = [];
  }

  allSelectHandler(event){
    this.dispatchEvent(new CustomEvent("formatted-table-cell-mass-selections", { detail:{spinner: true} ,bubbles: true ,composed :false }));
    let disabledCheckboxes = [];
    this.rowDataTemp.forEach(row => {
      if(row.checkBoxDisabled){
        disabledCheckboxes.push(row.Id);
      }
    });
    let rowDataTempCopy = this.rowDataTemp;
    this.rowDataTemp = [];
    this.massActionRecordList = [];
    let selectedValue = event.target.checked;
    this.isMassDisabled = !selectedValue;
    setTimeout(() => {
      this.rowDataTemp = rowDataTempCopy.map(row => ({...row, massSelection: selectedValue && !disabledCheckboxes.includes(row.Id), checkBoxDisabled: disabledCheckboxes.includes(row.Id)}));
      this.rowDataTemp.forEach(row => {
          selectedValue && this.massActionRecordList.push(row?.Id);
          !selectedValue && this.massActionRecordList.splice(0,this.massActionRecordList.length);
      });
      this.dispatchEvent(new CustomEvent("formatted-table-cell-mass-selections", { detail:{spinner: false} ,bubbles: true ,composed :false }));
    },0);
  }

  mouseOverHandler(event) {
    let apiname = event.currentTarget.getAttribute("title");
    this.icons.forEach((icon) => {
      if (
        icon.getAttribute("data-fieldname") === apiname &&
        apiname !== this.sortField
      ) {
        icon.setAttribute("class", "slds-show");
      }
    });
  }
  mouseOutHandler(event) {
    let apiname = event.currentTarget.getAttribute("title");
    this.icons.forEach((icon) => {
      if (
        icon.getAttribute("data-fieldname") === apiname &&
        apiname !== this.sortField
      ) {
        icon.setAttribute("class", "slds-hide");
      }
    });
  }

  sortData(fieldname, direction) {
    //Check for url typeattribute label,In case selected field is Id field with different field typeAttributes label for URL, then sort by the url label field, instead of id.
    let actualFieldRow = this.fieldProperties.filter((element) => {
      return element.typeAttributes &&
        JSON.parse(element.typeAttributes)?.label?.fieldName &&
        element.fieldName === fieldname
        ? true
        : false;
    });
    if (actualFieldRow && actualFieldRow.length > 0) {
      let actualFieldName = JSON.parse(actualFieldRow[0].typeAttributes).label
        .fieldName;
      fieldname = actualFieldName;
    }
    let parseData = JSON.parse(JSON.stringify(this.rowDataTemp));
    // cheking reverse direction
    let isReverse = direction === "asc" ? 1 : -1;
    // sorting data
    parseData.sort((x, y) => {
      x = x[fieldname] ? x[fieldname] : ""; // handling null values
      y = y[fieldname] ? y[fieldname] : "";
      //Make sort case insensetive
      if (x && y && typeof x === "string" && typeof y === "string") {
        x = x.toLowerCase();
        y = y.toLowerCase();
      }

      // sorting values based on direction
      return isReverse * ((x > y) - (y > x));
    });
    this.rowDataTemp = parseData;
  }

  connectedCallback() {
    this.rowDataTemp = this.rowData?.length ? JSON.parse(JSON.stringify(this.rowData)) : [];
    if(this.massActions.length){
      this.rowDataTemp = this.rowDataTemp.map(v => {
        if(!v.hasOwnProperty("checkBoxDisabled")){
          return {...v, massSelection: false,checkBoxDisabled: false};
        }
        else{
          return {...v, massSelection: false};
        }
      });
      this.columns.push({
        label: 'Select All',
        fieldName: 'massSelection',
        type: 'boolean',
        sortable: false,
        width: "width: 40px !important;",
        massSelector: true,
        checkBoxDisabled : 'checkBoxDisabled'
      });
    }

    //Prepare @coloumns property from field label and datatype derived from Metadata definitions,to encode the width to style translation
    this.columns.push(...this.fieldProperties.map((element) => {
      return {
        label: element.label,
        fieldName: element.fieldName,
        type: element.type,
        width: element.width ? "width: " + element.width + " !important;" : "",
        sortable: element.sortable,
        typeAttributes: element.typeAttributes,
        cellAttributes: element.cellAttributes
      };
    }));

    //prepare backup of row data property for search functionality
    this.dataCopy = this.rowDataTemp;
    //Fetch header fieldnames from public property
    this.fieldHeaders = this.fieldProperties
      .map((row) => {
        return row.fieldName;
      })
      .filter((fieldname) => {
        return fieldname !== "actions";
      }); //.filter(fieldname => {return fieldname!=="actions"});

    //Fetch field typeattribute names for the above fields from public property
    this.fieldProperties.forEach((row) => {
      if ("typeAttributes" in row) {
        let typeLabel = JSON.parse(row.typeAttributes);
        if (
          typeLabel.hasOwnProperty("label") &&
          typeLabel.label.hasOwnProperty("fieldName")
        ) {
          this.fieldToTypeAttributeLabelMap[row.fieldName] =
            typeLabel.label.fieldName;
        }
      }
    });

  }

  renderedCallback() {
    this.recalculateOffset();
    this.dispatchEvent(new CustomEvent('renderedcomplete'));
    window.addEventListener('resize', this.recalculateOffset.bind(this));
  }

  recalculateOffset() {
    //Store pointers to table and all lightning-icons in property
    let tablePointer = this.template.querySelector("table");
    this.icons = tablePointer.querySelectorAll("lightning-icon");
    //Check if overlap exists between any of the table headers, if yes, then reduce width to trigger truncation
    let actionHeaders = tablePointer.querySelectorAll(".slds-truncate");
    let tableHeaders = tablePointer.querySelectorAll("th");
    const SEPERATION_OFFSET = 20; // The minimum distance of seperation between a table header column and the text element inside it
    let numberOfColoumns = this.fieldProperties.length;
    tableHeaders.forEach((element, index) => {
      if ("offsetWidth" in actionHeaders[index] && "offsetWidth" in tableHeaders[index]) {
        if (tableHeaders[index].offsetWidth - actionHeaders[index].offsetWidth !== SEPERATION_OFFSET) {
          actionHeaders[index].style = "width: " + (tableHeaders[index].offsetWidth - SEPERATION_OFFSET) + "px !important;";
        }
      }
    });
  }

  //onClick handler to handle display of arrow icon and sort operation
  clickHandler(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    let apiname = event.currentTarget.getAttribute("title");

    //Find sorted field and direction
    if (apiname === this.sortField) {
      //Reverse sort direction after every click
      this.sortDirection =
        this.sortDirection === this.directions[0]
          ? this.directions[1]
          : this.directions[0];
    } else {
      this.sortField = apiname;
      this.sortDirection = this.directions[0]; //asc
    }

    //Set alternate text for icon based on direction
    this.alternativeText = this.alternativeTextMap.get(this.sortDirection);

    //Change sort icon based on click and direction
    this.icons.forEach((icon) => {
      if (icon.getAttribute("title") === apiname) {
        this.iconName = this.iconDirections.get(this.sortDirection);
        icon.setAttribute("class", "slds-show");
      } else {
        icon.setAttribute("class", "slds-hide");
      }
    });
    //Perform sort on coloumn
    this.sortData(apiname, this.sortDirection);
  }

  commitHandler(event) {
    this.searchMessage = "";
    let searchKey = event.target.value?.trim();
    if (searchKey) {
      if (searchKey.length >= 3) {
        //raise an event to parent
        this.dispatchEvent(new CustomEvent("search", { detail: searchKey }));
      } else {
        //Your search term must have 3 or more characters
        this.rowDataTemp = null;
        this.searchMessage = 'Your search term must have 3 or more characters.';
      }

    } else {
      this.dispatchEvent(new CustomEvent("progress"));
      setTimeout(() => {
      this.rowDataTemp = this.dataCopy;
      },0);
    }
  }
  //Search box onChange handler to handle searching of the row data based on the input search key
  searchHandler(event) {
    //console.log(event.detail.value.toLowerCase());
    event.stopPropagation();
    event.stopImmediatePropagation();

    let searchKey = event.detail.value.toLowerCase();
    var searchedResult = [];

    //Search the key on the rowDataTemp filtered by the required coloumn field headers
    if (searchKey.length > 1) {
      this.dataCopy.forEach((element) => {
        this.fieldHeaders.filter(key => { return (key in element); }).forEach((key) => {
          if (!searchedResult.includes(element)) {
            let value = this.fieldToTypeAttributeLabelMap.hasOwnProperty(key) ? element[this.fieldToTypeAttributeLabelMap[key]] : element[key];
            if (typeof value === "string" && value.toLowerCase().includes(searchKey)) {
              searchedResult.push(element);
            } else if (typeof value === "number" && (value + "").indexOf(searchKey) > -1) {
              searchedResult.push(element);
            }
          }
        });
      });
      this.rowDataTemp = searchedResult;
    } else {
      this.rowDataTemp = this.dataCopy;
    }

  }

  get allSearchMessage(){
    if(this.searchMessage){
      return this.searchMessage;
    }
    else if(!this.rowDataTemp || (this.rowDataTemp && this.rowDataTemp.length===0)){
		if(this.objectname == "opportunity") {
			if(this.isPortal) {
				return "If no Opportunities are shown, please contact your Partner Sales Manager or use Deal Registration to register a new Opportunity."
			}
			else {
				return "Create a new Opportunity or check your membership of the Opportunity team."
			}
		}
		else if(this.objectname == "quote"){
			return "No Quotes available to view, Quotes can be created in the Quote Workspace."
		}
		else {
			return "no records found."
		}
    }
    else{
      return "";
    }
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
}
