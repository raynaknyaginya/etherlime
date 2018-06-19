const ethers = require('ethers');
const colors = require('../utils/colors');
const Wallet = ethers.Wallet;

class Deployer {

	/**
	 * 
	 * Instantiates new deployer. You probably should not use this class directly but use something inheriting this
	 * 
	 * @param {*} wallet ethers.Wallet instance
	 * @param {*} provider ethers.provider instance
	 * @param {*} defaultOverrides [Optional] default deployment overrides
	 */
	constructor(wallet, provider, defaultOverrides) {
		if (!(wallet instanceof Wallet)) {
			throw new Error('Passed wallet is not instance of ethers Wallet');
		}

		this.wallet = wallet;
		this.provider = provider;
		this.wallet.provider = provider;

		this.defaultOverrides = defaultOverrides;
	}

	/**
	 * 
	 * Use this function to deploy a contract.
	 * 
	 * @return DeploymentResult object
	 * 
	 * @param {*} contract the contract object to be deployed. Must have at least abi and bytecode fields. For now use the .json file generated from truffle compile
	 */
	async deploy(contract) {

		const deploymentArguments = Array.prototype.slice.call(arguments);
		deploymentArguments.splice(0, 1);

		this._preValidateArguments(contract, deploymentArguments);

		const deployTransaction = this._prepareDeployTransaction(contract, deploymentArguments);

		const transaction = await this._sendDeployTransaction(this._overrideDeployTransactionConfig(deployTransaction));

		await this._waitForDeployTransaction(transaction);

		const transactionReceipt = await this._getTransactionReceipt(transaction);

		this._postValidateTransaction(contract, transaction, transactionReceipt)

		const deploymentResult = this._generateDeploymentResult(contract, transaction, transactionReceipt);

		return deploymentResult;

	}

	/**
	 * 
	 * Override for custom pre-send validation
	 *
	 * @param {*} contract the contract to be deployed
	 * @param {*} deploymentArguments the deployment arguments
	 */
	_preValidateArguments(contract, deploymentArguments) {
		const deployContractStart = `\nDeploying contract: ${colors.colorName(contract.contractName)}`;
		const argumentsEnd = (deploymentArguments.length == 0) ? '' : ` with arguments: ${colors.colorParams(deploymentArguments)}`;

		console.log(`${deployContractStart}${argumentsEnd}`);
	}

	/**
	 * 
	 * Override this to include custom logic for deploy transaction generation
	 * 
	 * @param {*} contract the contract to be deployed
 	 * @param {*} deploymentArguments the arguments to this contract
	 */
	_prepareDeployTransaction(contract, deploymentArguments) {
		return ethers.Contract.getDeployTransaction(contract.bytecode, contract.abi, ...deploymentArguments);
	}

	/**
	 * 
	 * Override this for custom deploy transaction configuration
	 * 
	 * @param {*} deployTransaction the transaction that is to be overridden
	 */
	_overrideDeployTransactionConfig(deployTransaction) {
		if (this.defaultOverrides === undefined) {
			return deployTransaction;
		}

		if (this.defaultOverrides.gasPrice > 0) {
			deployTransaction.gasPrice = this.defaultOverrides.gasPrice;
		}

		if (this.defaultOverrides.gasLimit > 0) {
			deployTransaction.gasLimit = this.defaultOverrides.gasLimit;
		}

		return deployTransaction;

	}

	/**
	 * 
	 * Override this to include custom logic for sending the deploy transaction
	 * 
	 * @param {*} deployTransaction the transaction that is to be sent
	 */
	_sendDeployTransaction(deployTransaction) {
		return this.wallet.sendTransaction(deployTransaction);
	}

	/**
	 * 
	 * Override this to include custom logic for waiting for deployed transaction. For example you could trigger mined block for testrpc/ganache-cli
	 * 
	 * @param {*} transaction The sent transaction object to be waited for
	 */
	async _waitForDeployTransaction(transaction) {
		console.log(`Waiting for transaction to be included in block and mined: ${colors.colorTransactionHash(transaction.hash)}`);
		await this.provider.waitForTransaction(transaction.hash);
	}

	/**
	 * 
	 * Override this to include custom receipt getting logic
	 * 
	 * @param {*} transaction the already mined transaction
	 */
	_getTransactionReceipt(transaction) {
		return this.provider.getTransactionReceipt(transaction.hash);
	}

	/**
	 * 
	 * @param {*} contract the contract being deployed
	 * @param {*} transaction the transaction object being sent
	 * @param {*} transactionReceipt the transaction receipt
	 */
	_postValidateTransaction(contract, transaction, transactionReceipt) {
		if (transactionReceipt.status === 0) {
			throw new Error(`Transaction ${colors.colorTransactionHash(transactionReceipt.transactionHash)} ${colors.colorFailure('failed')}. Please check etherscan for better reason explanation.`);
		}
	}

	/**
	 * 
	 * Override this for custom deployment result objects
	 * 
	 * @param {*} contract the contract that has been deployed
	 * @param {*} transaction the transaction object that was sent
	 * @param {*} transactionReceipt the transaction receipt
	 */
	_generateDeploymentResult(contract, transaction, transactionReceipt) {
		console.log(`Contract ${colors.colorName(contract.contractName)} deployed at address: ${colors.colorAddress(transactionReceipt.contractAddress)}`);
		return transactionReceipt.contractAddress
	}

}

module.exports = Deployer;