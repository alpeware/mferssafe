// (c) 2024 WCNFT
// Base Safe Migration
//

const mainnetChainId = 8453
const testnetChainId = 84532
const mfersSafe = '0x21130E908bba2d41B63fbca7caA131285b8724F8'
const safeL2 = '0xfb1bffC9d739B8D520DaF37dF666da4C687191EA'

const safeProxyUrl = 'https://api.basescan.org/api?module=contract&action=getabi&address=0x69f4D1788e39c87893C980c06EdF4b7f686e2938'

const [abiProxy, abiMigration, byteCodeMigration] = await Promise.all([
  fetch(safeProxyUrl).then(e => e.json()).then(e => JSON.parse(e.result)),
  fetch('SafeToL2Migration.abi.json').then(e => e.json()),
  fetch('SafeToL2Migration.bytecode.txt').then(e => e.text()).then(e => e.trim())
])

const fromHex = (s) => parseInt(s, 16)
const toHex = (n) => n.toString(16)

const getAccounts = async (provider) =>
    provider.send('eth_requestAccounts', [])

const getNetwork = async (provider) =>
    provider.send('eth_chainId', [])

const getSigner = async (provider) =>
    provider.getSigner()

const getSignature = async (provider, msg, from) =>
    provider.send('personal_sign', [msg, from])

const switchNetwork = async (provider, chainId) =>
    provider.send('wallet_switchEthereumChain', [{ chainId: `0x${toHex(chainId)}` }])

const createContract = (abi, bytecode, signer) =>
    new ethers.ContractFactory(abi, bytecode, signer)

const getContract = (address, abi, provider) =>
    new ethers.Contract(address, abi, provider)

const deploy = async (contract) => contract.deploy()

// setup
const provider = new ethers.providers.Web3Provider(window.ethereum, "any")

document.querySelector('.mm').addEventListener('click', async (e) => {
  try {
    const accounts = await getAccounts(provider)
    await switchNetwork(provider, testnetChainId)
    const chainId = await getNetwork(provider)
    document.querySelector('.account').innerHTML = `Connected as <b>${accounts[0]}</b> on chain <b>${fromHex(chainId)}</b>`
    Array.from(document.querySelectorAll('button'))
        .map(e => e.disabled = false)
  } catch (ex) {
    console.error(ex)
    document.querySelector('.account').innerHTML = `Unable to connect: ${ex}`
  }
})

document.querySelector('.deploy').addEventListener('click', async (e) => {
  try {
    const signer = await getSigner(provider)
    const contract = await deploy(createContract(abiMigration, byteCodeMigration, signer))
    document.querySelector('.contract').innerHTML = `Waiting for confirmation...`

    await contract.deployTransaction.wait()
    const { address } = contract
    document.querySelector('.contract').innerHTML = `Deployed contract to <b>${address}</b>`
  } catch (ex) {
    console.error(ex)
    document.querySelector('.contract').innerHTML = `Unable to deploy: ${ex}`
  }
})

document.querySelector('.sign').addEventListener('click', async (e) => {
  try {
    const signer = await getSigner(provider)
    const safeContract = getContract(mfersSafe, abiProxy, provider)

    const migrationContractAddress = document.querySelector('.migrationContract').value
    const migrationContract = getContract(migrationContractAddress, abiMigration, provider)
    const callData = migrationContract.interface.encodeFunctionData('migrateToL2', [ safeL2 ])
    console.log(callData)

    const transaction = {
      to: migrationContractAddress,
      value: 0,
      data: callData,
      operation: 1,
      safeTxGas: 0,
      baseGas: 0,
      gasPrice: 0,
      gasToken: ethers.constants.AddressZero,
      refundReceiver: ethers.constants.AddressZero,
      nonce: 0
    }
    const {
      to,
      value,
      data,
      operation,
      safeTxGas,
      baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
      nonce
    } = transaction
    const transactionData = await safeContract.encodeTransactionData(
      to,
      value,
      data,
      operation,
      safeTxGas,
      baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
      nonce)
    console.log(transactionData)
    document.querySelector('.data').innerHTML = `<p>Transaction data: <pre>${transactionData}</pre></p>`

    const transactionHash = await safeContract.getTransactionHash(
      to,
      value,
      data,
      operation,
      safeTxGas,
      baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
      nonce)
    console.log(transactionHash)
    document.querySelector('.hash').innerHTML = `<p>Transaction hash: <pre>${transactionHash}</pre></p>`

    const from = await signer.getAddress()
    const s = await getSignature(provider, transactionHash, from)
    console.log(s)

    // adapt last byte for safe personal signatures
    //const signature = s.slice(0, -2) + (parseInt(s.slice(-2), 16) + 4).toString(16)
    const signature = s

    document.querySelector('.signature').innerHTML = `
      <h2>3. Copy Signature</h2>
      <p>Signature:</p>
      <p><textarea class="signed" cols="100" rows="10">${from}:\n${signature}</textarea></p>
      `

    document.querySelector('.signed').focus()

    //const check = await safeContract.checkSignatures(transactionHash, transactionData, signature)
  } catch (ex) {
    console.error(ex)
    document.querySelector('.signature').innerHTML = `Unable to sign: ${ex}`
  }
})

document.querySelector('.mm').disabled = false

Object.assign($, { provider, getSigner, abiProxy })
