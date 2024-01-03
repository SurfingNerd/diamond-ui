import React, { Fragment } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { observer } from 'mobx-react';
import { reaction } from 'mobx';
import './App.css';
import 'react-tabulator/lib/styles.css';
import "react-tabulator/css/bootstrap/tabulator_bootstrap.min.css"; // use Theme(s)
import './styles/tabulator.css';
import Web3 from "web3";

import WalletConnectProvider from "@walletconnect/web3-provider";

import dmd_logo from "./logo-hor.svg";

import { ModelDataAdapter } from './model/modelDataAdapter';
import { Pool } from './model/model';
import Web3Modal from "web3modal";
import { ReactTabulatorViewOptions } from './utils/ReactTabulatorViewOptions';
import { BlockSelectorUI } from './components/block-selector-ui';
import { Tab, Tabs } from 'react-bootstrap';
import PoolDetail from './components/PoolDetail';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import GridLoader from "react-spinners/GridLoader";
import AddPool from './components/AddPool';
import RNG from './components/RNG';
import BlockchainService from './utils/BlockchainService';
import { ChevronDown, ArrowClockwise } from "react-bootstrap-icons";

interface AppProps {
  adapter: ModelDataAdapter,
}

interface AppState {
  poolsData: Pool[],
  activeTab: string,
  selectedPool: any,
  connectedAccount: string,
  tabulatorColumsPreset: string,
  showBlockSelectorInfo: boolean
}

@observer
class App extends React.Component<AppProps, AppState> {
  private blockchainService: BlockchainService;
  private examplePublicKey = '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

  constructor(props: AppProps) {
    super(props);
    this.state = {
      poolsData: [],
      activeTab: "pools-overview",
      selectedPool: undefined,
      connectedAccount: "",
      tabulatorColumsPreset: 'Default',
      showBlockSelectorInfo: false
    }
    this.blockchainService = new BlockchainService(props)
  }

  notify = (msg: string) => toast(msg);

  setAppDataState = (poolData: Pool[]) => {
    this.setState({
      selectedPool: poolData[0],
      activeTab: "pool-detail"
    })
  }

  setAppActiveTab = (tab: string) => {
    this.setState({
      activeTab: tab
    })
  }

  setSelectedPool = (pool: Pool) => {
    this.setState({
      selectedPool: pool
    })
  }

  setTabulatorColumnPreset = (preset: string) => {
    this.setState({
      tabulatorColumsPreset: preset
    })
  }

  setShowBlockSelectorInfo = () => {
    this.setState({
      showBlockSelectorInfo: !this.state.showBlockSelectorInfo
    })
  }

  refreshBlockData = (e:any) => {
    this.props.adapter.refresh();
  }

  changeTab = (e: any) => {
    this.setState({activeTab: e})
  }

  public async connectWallet() {
    try {
      const url = this.props.adapter.url;
  
      const providerOptions = {
        walletconnect: {
          package: WalletConnectProvider,
          options: {rpc: {777012: url}}
        }
      };
  
      const web3Modal = new Web3Modal({
        network: "mainnet", // optional
        cacheProvider: false, // optional
        providerOptions // required
      });

      web3Modal.clearCachedProvider();
      const web3ModalInstance = await web3Modal.connect();

      // handle account change
      const classInstance = this;
      web3ModalInstance.on('accountsChanged', function (accounts: Array<string>) {
        if(accounts.length === 0) {
          window.location.reload();
        } else {
          classInstance.connectWallet();
        }
      })

      const provider = new Web3(web3ModalInstance)

      const chainId = 777012;
      // force user to change to DMD network
      if (web3ModalInstance.networkVersion !== chainId) {
        try {
          await web3ModalInstance.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: new Web3().utils.toHex(chainId) }]
          });
        } catch(err: any) {
          if (err.code === 4902) {
            await web3ModalInstance.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainName: 'DMD',
                  chainId: new Web3().utils.toHex(chainId),
                  nativeCurrency: { name: 'DMD', decimals: 18, symbol: 'DMD' },
                  rpcUrls: [process.env.REACT_APP_URL]
                }
              ]
            });
          } else {
            console.log("Other Error", err)
            return undefined;
          }
        }
      }

      this.setState({
        connectedAccount: 'connecting'
      });

      const { adapter } = this.props;
      await adapter.setProvider(provider);

      this.setState({
        connectedAccount: web3ModalInstance.selectedAddress
      });

      return provider;
    } catch(err) {
      console.log(err)
    }
  }

  public componentDidMount(): void {
    console.log('App component did mount.');

    const { adapter } = this.props;
    const { context } = adapter;

    adapter.registerUIElement(this);

    const data = [...context.pools];
    this.setState({poolsData: data});

    // mobx
    reaction(
      () => context.pools.slice(),
      (pools: Pool[]) => {
        this.setState({ poolsData: pools });
      }
    );
  }

  public componentWillUnmount() {
    console.log('App component will unmount.');
    this.props.adapter.unregisterUIElement(this);
  }

  public render(): JSX.Element {
    const { adapter } = this.props;
    const { context } = adapter;

    context.currentValidatorsWithoutPools.map((address: any, key: number) => (
      <div key={key} className="text-danger" title="Validators can loose their pool association when the first validators after chain launch fail to take over control. (missed out key generation ?)">Validator without a Pool Association: {address}</div>
    ));
  
    const result = (
      <div className="App">
        <div className="navbar">
          <div className="blockInfo">
              <button  onClick={this.setShowBlockSelectorInfo}>
                {context.currentBlockNumber} <ChevronDown style={{marginLeft: "2px"}}/>
              </button>
              <button onClick={this.refreshBlockData}><ArrowClockwise/></button>
          </div>

          <a href="/">
            <img src={dmd_logo} alt="logo" width="250px"/>
          </a>

          {this.state.connectedAccount ?
          this.state.connectedAccount === 'connecting' ? 
            <button className="connectWalletBtn">
              Connecting...
            </button>
          :
          (
            <button className="connectWalletBtn">
              {this.state.connectedAccount}
            </button>
          ) : (
            <button onClick={() => this.connectWallet()} className="connectWalletBtn">
              Connect Wallet
            </button>
          )
          }
        </div>

        <div>
          <BlockSelectorUI modelDataAdapter={this.props.adapter} showBlockSelectorInfo={this.state.showBlockSelectorInfo} />
          {adapter.isReadingData ? (
            <GridLoader
              color={'#254CA0'}
              loading={adapter.isReadingData}
              size={20}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          ) : (
            <Fragment>
              <Tabs
                className="mb-3"
                activeKey={this.state.activeTab}
                onSelect={this.changeTab}
              >
                <Tab eventKey="pools-overview" title="Pools">
                  <ReactTabulatorViewOptions adapter={this.props.adapter} dataProp={this.state.poolsData} tabulatorColumsPreset={this.state.tabulatorColumsPreset} setTabulatorColumnPreset={this.setTabulatorColumnPreset} setAppDataState={this.setAppDataState} blockChainService={this.blockchainService}>
                  </ReactTabulatorViewOptions>
                </Tab>

                {this.state.selectedPool ? (
                  <Tab eventKey="pool-detail" title="Pool Details">
                    <PoolDetail
                      pool={this.state.selectedPool}
                      adapter={adapter}
                    />
                  </Tab>
                ) : (
                  <></>
                )}

                <Tab eventKey="add-pool" title="Add Pool">
                  <AddPool adapter={adapter} setAppActiveTab={this.setAppActiveTab} setSelectedPool={this.setSelectedPool}/>
                </Tab>

                <Tab eventKey="rng-tab" title="RNG">
                  <RNG adapter={adapter}/>
                </Tab>
              </Tabs>
            </Fragment>
          )}
        </div>
      </div>
    );

    

    return result;
  }

}


export default App;

