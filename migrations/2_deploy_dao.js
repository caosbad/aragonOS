var DAO = artifacts.require('DAO')
var Kernel = artifacts.require('Kernel')
var DispatcherOrgan = artifacts.require('DispatcherOrgan')
var MetaOrgan = artifacts.require('MetaOrgan')
var TokensOrgan = artifacts.require('TokensOrgan')
var ActionsOrgan = artifacts.require('ActionsOrgan')
var ApplicationOrgan = artifacts.require('ApplicationOrgan')
var VaultOrgan = artifacts.require('VaultOrgan')


const organs = [VaultOrgan, TokensOrgan, ActionsOrgan, ApplicationOrgan]

const { getNonce } = require('../test/helpers/web3')

const liveNetworks = ['kovan', 'ropsten']

module.exports = (deployer, network) => {
  let dao = {}

  const isLive = liveNetworks.indexOf(network) > -1

  let meta, dispatcher = {}

  return deployer
          .then(() => MetaOrgan.new())
          .then(m => {
            meta = m
            return DispatcherOrgan.new()
          })
          .then(d => {
            dispatcher = d

            return deployer.deploy(Kernel, dispatcher.address, meta.address)
          })
          .then(k => {
            console.log('deploying DAO with Kernel', Kernel.address)
            return deployer.deploy(DAO, Kernel.address, { gas: 4e6 })
              .then(() => {
                dao = MetaOrgan.at(DAO.address)

                const firstOrgan = 3
                let nonce = 0

                const installOrgan = (organ, i) => {
                  const n = i + firstOrgan
                  console.log('Installing', organ.constructor._json.contract_name, organ.address, 'at slot', n)
                  nonce += 1

                  const params = isLive ? { nonce } : {}
                  return dao.installOrgan(organ.address, n, params)
                }

                return getNonce(web3).then(x => {
                  nonce = x - 1
                  const installOrgans = Promise.all(organs.map((organ, i) => {
                    nonce += 1

                    const params = isLive ? { nonce } : {}
                    return organ.new(params)
                  }))
                    .then(x => Promise.all(x.map(installOrgan)))
                  return installOrgans
                })
              })
          })
}
