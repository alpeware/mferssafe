// (c) 2024 WCNFT
// Base Safe Migration
//

const mainnetChainId = 8453
const testnetChainId = 84532

const mfersSafe = '0x21130E908bba2d41B63fbca7caA131285b8724F8'
const safeL2 = '0xfb1bffC9d739B8D520DaF37dF666da4C687191EA'
const immutableFactory = '0x0000000000FFe8B47B3e2130213B802212439497'
const migrationContractAddress = '0xEDDf646Ff40C3E125b3353FF31e1b4Dba32417B2'

const flattenedMigration = 'https://gist.github.com/alpeware/e55809599bb73d7bfc7537753a89207b'

const [abiFactory, abiProxy, abiMigration, byteCodeMigration] = await Promise.all([
  fetch('Factory.abi.json').then(e => e.json()).then(e => JSON.parse(e.result)),
  fetch('SafeProxy.abi.json').then(e => e.json()).then(e => JSON.parse(e.result)),
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
let provider

document.querySelector('.mm').addEventListener('click', async (e) => {
  try {
    provider = new ethers.providers.Web3Provider(window.ethereum, "any")
  } catch (ex) {
    console.error(ex)
    document.querySelector('.account').innerHTML = `Unable to detect MetaMask: <pre>${JSON.stringify(ex, null, 2)}</pre>`
    return
  }
  try {
    const accounts = await getAccounts(provider)
    await switchNetwork(provider, mainnetChainId)
    const chainId = await getNetwork(provider)
    document.querySelector('.account').innerHTML = `Connected as <b>${accounts[0]}</b> on chain <b>${fromHex(chainId)}</b>`
    Array.from(document.querySelectorAll('button'))
        .map(e => e.disabled = false)
  } catch (ex) {
    console.error(ex)
    document.querySelector('.account').innerHTML = `Unable to connect: <pre>${JSON.stringify(ex, null, 2)}</pre>`
  }
})

document.querySelector('.deploy').addEventListener('click', async (e) => {
  try {
    const signer = await getSigner(provider)
    const factory = getContract(immutableFactory, abiFactory, signer)
    document.querySelector('.contract').innerHTML = `Waiting for confirmation...`

    const address = await factory.findCreate2Address(ethers.constants.HashZero, byteCodeMigration)
    console.log(address)

    const tx = await factory.safeCreate2(ethers.constants.HashZero, byteCodeMigration)
    await tx.wait()
    console.log(tx)
    const { data } = tx

    document.querySelector('.contract').innerHTML = `Deployed contract to <b>${address}</b>`
  } catch (ex) {
    console.error(ex)
    document.querySelector('.contract').innerHTML = `Unable to deploy: <pre>${JSON.stringify(ex, null, 2)}</pre>`
  }
})

document.querySelector('.sign').addEventListener('click', async (e) => {
  try {
    const signer = await getSigner(provider)
    const safeContract = getContract(mfersSafe, abiProxy, provider)

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
    const signature = await getSignature(provider, transactionHash, from)
    console.log(signature)

    document.querySelector('.signature').innerHTML = `
      <h2>3. Copy Signature</h2>
      <p>Signature:</p>
      <p><textarea class="signed" cols="100" rows="10">${from}:\n${signature}</textarea></p>
      `

    document.querySelector('.signed').focus()
  } catch (ex) {
    console.error(ex)
    document.querySelector('.signature').innerHTML = `Unable to sign: <pre>${JSON.stringify(ex, null, 2)}</pre>`
  }
})

document.querySelector('.exec').addEventListener('click', async (e) => {
  try {
    const signer = await getSigner(provider)
    const safeContract = getContract(mfersSafe, abiProxy, signer)

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


    const signatures = '0x' + Array.from(document.querySelectorAll('textarea.signature'))
        .map(e => e.value)
        .filter(e => e.trim() !== '')
        .map(e => e.split(':').map(f => f.trim()))
        // adapt last byte for safe personal signatures
        .map(([a, s]) => [a, s.slice(0, -2) + (parseInt(s.slice(-2), 16) + 4).toString(16)])
        // sort by address
        .sort(([a, e], [b, f]) => a.localeCompare(b))
        .map(e => e[1].slice(2)).join('')
    console.log(signatures)

    document.querySelector('.data').innerHTML = `<p>Transaction data: <pre>${transactionData}</pre></p>`
    document.querySelector('.hash').innerHTML = `<p>Transaction hash: <pre>${transactionHash}</pre></p>`
    document.querySelector('.signatures').innerHTML = `<p>Transaction signatures: <pre>${signatures}</pre></p>`

    const check = await safeContract.checkSignatures(transactionHash, transactionData, signatures)
    console.log(check)

    const exec = await safeContract.execTransaction(
      to,
      value,
      data,
      operation,
      safeTxGas,
      baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
      signatures)
    console.log(exec)

  } catch (ex) {
    console.error(ex)
    document.querySelector('.signatures').innerHTML = `Error: <pre>${JSON.stringify(ex, null, 2)}</pre>`
  }
})
document.querySelector('.mm').disabled = false

Object.assign($, { provider, getSigner, abiProxy })
