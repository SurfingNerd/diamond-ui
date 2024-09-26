import React from "react";
import "../styles/viewoptions.css";
import copy from "copy-to-clipboard";
import { FaCopy, FaTh } from 'react-icons/fa';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import BlockchainService from "./BlockchainService";
import { ModelDataAdapter } from "../model/modelDataAdapter";
import { TabulatorFull as Tabulator } from "tabulator-tables";
import ReactDOMServer from "react-dom/server";
import BigNumber from "bignumber.js";
import { toast } from "react-toastify";

interface ReactTabulatorViewOptionsColumnSet {
  listName: string,
  columnIds: ArrayLike<String>
}

interface ReactTabulatorViewOptionsProps {
  adapter: ModelDataAdapter;
  allListNameProp: string;
  children: any;
  dataProp: any;
  setAppDataState: any;
  blockChainService: BlockchainService,
  tabulatorColumsPreset: string,
  setTabulatorColumnPreset: any
}

interface ReactTabulatorViewOptionsState {
  customizeModalShow: boolean,
  columnsState: any[];
  dataState: any[],
  selectedColumns: any[]
}

const presets = [
  'Default',
  // 'All Pools',
]

interface PresetColsType {[key: string]: string[]}
const presetCols: PresetColsType = {
  'Default': ['Pool address', 'A', 'C', 'Miner Address', 'My Stake', 'Ordered Withdraw', 'Score']
  // 'All Pools': []
}

const copyFormatter = (cell: any) => {
    const cellValue = cell.getValue();
    const container = document.createElement("div");
    const span = document.createElement("span");
    const copyBtn = document.createElement("div");
    copyBtn.className = "copyBtn";
    const faCopyIcon = ReactDOMServer.renderToStaticMarkup(<FaCopy />);
    copyBtn.innerHTML = `${faCopyIcon}`;
    span.textContent = cellValue;
    container.appendChild(span);
    container.appendChild(copyBtn);
    return container;
};

export class ReactTabulatorViewOptions extends React.Component<ReactTabulatorViewOptionsProps, ReactTabulatorViewOptionsState> {
  notify = (msg: string) => toast(msg);

  defaultColumns = [
    { title: "Pool address", field: "stakingAddress", headerFilter: true, hozAlign: "left", formatter: (cell: any) => copyFormatter(cell)},
    { title: "Public Key", field: "miningAddress", hozAlign: "left", formatter: (cell: any) => copyFormatter(cell)},
    { 
      title: "Total Stake", 
      field: "totalStake", 
      formatter: function(cell: any) {
        const value = cell.getValue();
        const min = cell.getColumn().getDefinition().formatterParams.min;
        const max = cell.getColumn().getDefinition().formatterParams.max;
        const progress = Math.round(((value - min) / (max - min)) * 100);
        const progressBar = `<div class="progress-bar" data-max="${5 * (10 ** 22)}" data-min="0" style="display: inline-block; width: ${progress}%; background-color: rgb(45, 194, 20); height: 100%;"></div>`;
        const numericValue = `<div class="numeric-value">${BigNumber(value).dividedBy(10**18)} DMD</div>`;
        const combinedHTML = `<div class="progress-wrapper">${progressBar}${numericValue}</div>`;
        return combinedHTML;
      },
      formatterParams: { min: 0, max: 5 * (10 ** 22) }
    },
    { title: "S", headerTooltip: "Staked - has enough stake ?" , field: "isActive", formatter: "tickCross", width: 30, tooltip: true},
    { title: "A", headerTooltip: "Available - is marked as available for upcomming validator set selection", field: "isAvailable", formatter: "tickCross",  width: 30 },
    { title: "C", headerTooltip: "Current - is part of current validator set", field: "isCurrentValidator", formatter: "tickCross", width: 30 },
    { title: "E", field: "isToBeElected", headerTooltip: "to be Elected - fulfills all requirements to be elected as validator for the upcomming epoch.", formatter: "tickCross", width: 30 },
    { title: "P", field: "isPendingValidator", headerTooltip: "Pending - Validator in key generation phase that should write it's acks and parts",  formatter: "tickCross", width: 30 },
    { title: "K1", field: "isWrittenParts", headerTooltip: "Key 1 (Parts) was contributed", formatter: "tickCross", width: 30 },
    { title: "K2", field: "isWrittenAcks", headerTooltip: "Key 2 (Acks) was contributed - Node has written all keys", formatter: "tickCross", width: 30 },
    { title: "Miner Address", field: "miningAddress", headerFilter: true, hozAlign: "left", formatter: (cell: any) => copyFormatter(cell)},
    { title: "My Stake", field: "myStake", formatter: (cell:any) => ((cell.getValue() / 10**18).toFixed(2)).toString() + " DMD", formatterParams: { min: 0, max: 5 * (10 ** 22) }},
    {
      title: "Rewards",
      field: "claimableReward",
      width: 200,
      formatter: (cell:any): string | HTMLElement => {
        const rewardValue = (cell.getValue() / (10 ** 18)).toFixed(2).toString() + " DMD";
        if (parseInt((cell.getValue() / (10 ** 18)).toFixed(2)) > 0) {
          const container = document.createElement("div");
          const span = document.createElement("span");
          span.textContent = rewardValue;
          const button = document.createElement("button");
          button.textContent = "Claim";
          button.style.marginLeft = "5px";
          button.style.flexGrow = "1";
          container.appendChild(span);
          container.appendChild(button);
          return container;
        }
        return "0 DMD";
      },
    },
    { title: "Ordered Withdraw", field: "orderedWithdrawAmount", formatter: (cell:any) => ((cell.getValue() / 10**18).toFixed(2)).toString() + " DMD"},
    { title: "Score", field: "score"}
  ];

  el = React.createRef<HTMLDivElement>();

  tabulator: Tabulator | null = null;
  tableData = []; //data for table to display

  copyText(text: string): void {
    copy(text);
    this.notify(`Copied!`);
  }

  state: ReactTabulatorViewOptionsState = {
    customizeModalShow: false,
    columnsState: this.defaultColumns,
    dataState: [],
    selectedColumns: []
  }

  componentDidUpdate(prevProps: Readonly<ReactTabulatorViewOptionsProps>, prevState: Readonly<ReactTabulatorViewOptionsState>, snapshot?: any): void {
    if (prevProps.dataProp !== prevState.dataState) {
      let tabulatorCheckInterval: NodeJS.Timeout | null = setInterval(() => {
        if (this.tabulator) {
          this.tabulator.setData(this.props.dataProp);
          this.addTabRowEventListeners();
          clearInterval(tabulatorCheckInterval as NodeJS.Timeout);
          tabulatorCheckInterval = null;
        }
      }, 100);
    }
    this.addTabRowEventListeners();
  }

  componentDidMount(): void {
    let allColumns = presetCols[this.props.tabulatorColumsPreset].map(pc => {
      const matchedColumn = this.defaultColumns.find((col: any) => pc === col.title);

      if (matchedColumn) {
        return { "title": matchedColumn.title, status: true };
      } else {
        return { "title": pc, status: false };
      }
    })

    const colsData = this.getColData(allColumns);

    this.setState({
      dataState: [...this.props.dataProp],
      columnsState: [...colsData],
      selectedColumns: [...colsData]
    });

    this.initializeTabulator(this.state.dataState, [...colsData]);
  }
  
  updateColumnsPreference = () => {
    this.setState({customizeModalShow: false});
    // const showAllPools = this.props.tabulatorColumsPreset === 'Default' ? false : true;

    // if (this.props.adapter.showAllPools !== showAllPools) {
    //   this.props.adapter.showAllPools = showAllPools;
    //   this.props.adapter.refresh();
    // }

    const currColState = this.state.columnsState.map(col => col.title);

    let colsToAdd: any = [];
    let colsToRemove: any = [];

    this.state.selectedColumns.forEach(col => {
      if (currColState.includes(col.title) && !col.status) {
        colsToRemove.push(col.title);
      } else if (!currColState.includes(col.title) && col.status) {
        colsToAdd.push({title: col.title});
      }
    })

    let addedCols = this.getColData(colsToAdd).map(item => ({ ...item, status: true }));
    let removedCols = this.state.columnsState.filter(item => !colsToRemove.includes(item.title));
    let filteredColumns = [...addedCols, ...removedCols];

    let orderedCols = this.state.selectedColumns.map(item => {
      const matchingObject = filteredColumns.find(obj => obj.title === item.title);
      if (matchingObject) {return matchingObject}
      return { title: item.title, status: false };
    });
    
    orderedCols = orderedCols.filter(item => item.status !== false);
    
    this.setState({
      columnsState: [...orderedCols],
    });

    setTimeout(() => {
      this.initializeTabulator(this.state.dataState, [...orderedCols]);
      this.forceUpdate();
    }, 500);
  }

  addTabRowEventListeners = () => {
    setTimeout(() => {
      const tabRows = document.querySelectorAll('.tabulator-row');
  
      tabRows.forEach((row: any) => {
        row.addEventListener('click', this.rowClicked);

        row.addEventListener("dblclick", this.rowClicked);
      });
  
      return () => {
        tabRows.forEach((row: any) => {
          row.removeEventListener('click', this.rowClicked);
        });
      };
    }, 500);
  }

  public columnSets: Array<ReactTabulatorViewOptionsColumnSet> = [];

  static getDefaultPropsForInit() {
    const result = {
      allListNameProp: 'all'
    }

    return result;
  }

  static defaultProps = ReactTabulatorViewOptions.getDefaultPropsForInit();

  public constructor(props: ReactTabulatorViewOptionsProps) {
    super(props);
  }

  /**
   * stores the current layout in the browsers local Storage.
   */
  public storeSettings() {

  }

  /**
   * loads the current layout in the browsers local Storage.
   */
  public loadSettings() {

  }

  /**
   * resets the layout to it's original state, during design time.
   */
  public resetSettings() {

  }
  
  getColData = (titleArr: any[]): Array<any> => {
    let colsData = [];

    for (let i = 0; i < titleArr.length; i++) {
      const titleToAdd = titleArr[i].title;
      for (let j = 0; j < this.defaultColumns.length; j++) {
        const defaultCol = this.defaultColumns[j];
        if (defaultCol.title === titleToAdd) {
          const newColumn = {
            ...defaultCol,
            status: titleArr[i].status !== undefined ? titleArr[i].status : false
          };

          colsData.push(newColumn);
        }
      }
    }

    return colsData;
  };

  initializeTabulator = (data: any, columns: any) => {
    if (this.el.current) {
      this.tabulator = new Tabulator(this.el.current, {
        data: data,
        responsiveLayout: "collapse",
        columns: [...columns],
        // pagination: true,
        // paginationSize: 15,
        paginationCounter:"rows",
        columnDefaults:{
          title: "",
          tooltip:true,
          headerTooltip: true
        }
      });
  
      setInterval(() => {
        try {
          const tabPages = document.querySelectorAll('.tabulator-page');    
          tabPages.forEach((page: any) => {
            page.addEventListener('click', this.addTabRowEventListeners);
            page.addEventListener("dblclick", this.addTabRowEventListeners);
          });
        } catch(err) {}
      }, 500);

      this.addTabRowEventListeners();
    }
  }

  presetChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const selectedValue = e.target.value;
    this.props.setTabulatorColumnPreset(selectedValue);
  }

  rowClicked = (e: any) => {
    const rowStakingAddress = e.target.closest('.tabulator-row').querySelector('[tabulator-field="stakingAddress"]').textContent.trim();
    if (e.target instanceof HTMLButtonElement && e.target.textContent === "Claim") {
      const poolData = this.state.dataState.filter(data => data.stakingAddress === rowStakingAddress);
      this.props.blockChainService.claimReward(e, poolData[0]);
    } else if (e.target.parentElement.parentElement.className === "copyBtn") {
      this.copyText(e.target.parentElement.parentElement.parentElement.querySelector('span').textContent);
    } else {
      const poolData = this.state.dataState.filter(data => data.stakingAddress === rowStakingAddress);
      this.props.setAppDataState(poolData)
    }
  };

  handleOptionSelect = (e: any) => {
    e.preventDefault();

    const updatedCols = this.defaultColumns.map(item => {
      let col = this.state.selectedColumns.filter(col => col.title.toLowerCase() == item.title.toLowerCase());
      if (item.title.toLowerCase() === e.target.innerHTML.toLowerCase()) {
        if (!col.length) {
          col[0] = {title: item.title, status: false};
        }
        col[0].status = !col[0].status;
        return col[0];
      } else {
        if (!col.length) {
          col[0] = {title: item.title, status: false};
        }
        return col[0];
      }
    })

    this.setState({
      selectedColumns: updatedCols
    })
  }

  public render() {
    return (
       <div>
          <Modal show={this.state.customizeModalShow} onHide={() => this.setState({customizeModalShow: false})} animation={false} centered>
            <Modal.Header >
              <span>Add, delete and sort metrics just how you need it</span>
            </Modal.Header>
            <Modal.Body>
              <div className="customizeModalBody">
                
                <div className="presetContainer">
                  <Form.Select aria-label="Default select example" value={this.props.tabulatorColumsPreset} onChange={e => this.presetChange(e)}>
                    {
                      presets.map((item, key) => (
                        <option key={key} value={item}>{item}</option>    
                      ))
                    }
                  </Form.Select>
                </div>
              </div>

              <div className="selectableOptionContainer">
                <legend>Key Generation</legend>
                {['k1', 'p', 'k2'].map((item: any, key: number) => {
                  const selectedItem = this.state.selectedColumns.find((selectedItem) =>
                    selectedItem.title.toLowerCase() === item.toLowerCase()
                  );

                  if (selectedItem) {
                    return (
                      <React.Fragment key={key}>
                        <span className={selectedItem.status ? 'selectedOption' : ''} onClick={this.handleOptionSelect}>{selectedItem.title}</span>
                      </React.Fragment>
                    );
                  } else {
                    return (
                      <React.Fragment key={key}>
                        <span onClick={this.handleOptionSelect}>{item.toUpperCase()}</span>
                      </React.Fragment>
                    );
                  }
                })}

                <legend>Node status</legend>
                  {['s', 'a', 'c', 'e'].map((item: any, key: number) => {
                  const selectedItem = this.state.selectedColumns.find((selectedItem) =>
                    selectedItem.title.toLowerCase() === item.toLowerCase()
                  );

                  if (selectedItem) {
                    return (
                      <React.Fragment key={key}>
                        <span className={selectedItem.status ? 'selectedOption' : ''} onClick={this.handleOptionSelect}>{selectedItem.title}</span>
                      </React.Fragment>
                    );
                  } else {
                    return (
                      <React.Fragment key={key}>
                        <span onClick={this.handleOptionSelect}>{item.toUpperCase()}</span>
                      </React.Fragment>
                    );
                  }
                })}

                <legend>My Finance</legend>
                  {[
                    'Miner Address',
                    'My Stake',
                    'Rewards',
                    'Ordered Withdraw'
                  ].map((item: any, key: number) => {
                    const selectedItem = this.state.selectedColumns.find((selectedItem) =>
                      selectedItem.title.toLowerCase() === item.toLowerCase()
                    );


                    if (selectedItem) {
                      return (
                        <React.Fragment key={selectedItem.key}>
                          <span key={key} className={selectedItem.status ? 'selectedOption' : ''} onClick={this.handleOptionSelect}>{selectedItem.title}</span>
                        </React.Fragment>
                      );
                    } else {
                      return (
                        <React.Fragment key={item}>
                          <span key={key} onClick={this.handleOptionSelect}>{item}</span>
                        </React.Fragment>
                      );
                    }
                  })}
              </div>

            </Modal.Body>
            <Modal.Footer>
              <button onClick={() => this.setState({customizeModalShow: false})}>Close</button>
              <button onClick={() => this.updateColumnsPreference()}>Apply Changes</button>
            </Modal.Footer>
          </Modal>

          <div className="viewOptionsContainer">
            <button className="customiseBtn" onClick={() => this.setState({customizeModalShow: true})}>
              <FaTh style={{marginRight: '5px'}}/>
              Customize
            </button>
          </div>
          
          <div ref={this.el} className="tabulator-container" />
       </div>
    );
  }

}

ReactTabulatorViewOptions.defaultProps = ReactTabulatorViewOptions.getDefaultPropsForInit();
