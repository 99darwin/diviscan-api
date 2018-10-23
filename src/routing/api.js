const 
    RpcClient   = require('divid-rpc'), 
    config      = require('../config'),
    _           = require('lodash'),
    fetch       = require('node-fetch'),
    PORT        = 1337

module.exports = (app) => {

    get = (url) => {
        return new Promise((resolve, reject) => {
            fetch(url)
            .then(response => {
                if (!response.ok) { throw response }
                response.json()
            })
            .then(data => resolve(data))
            .catch(err => reject(err))
        }) 
    }
    
    const rpc = new RpcClient(config.config)

    // Current block count
    app.get('/blockcount', (req, res) => {
        rpc.getBlockCount((err, response) => {
            if (err) {
                console.log(err)
                if (err.code === -5) {
                    res.json({'error': 'Invalid transaction'})
                }
            } else {
                res.json(response)
            }
        })
    })

    app.get('/best-block-addresses', (req, res) => {
        let addressArray = []
        let count = 0
        rpc.getBestBlockHash((err, response) => {
            if (err) {
                console.log(err)
            } else {
                rpc.getBlock(response.result, (err, resp) => {
                    if (err) {
                        console.log(err)
                    } else {
                        let txid = resp.result.tx
                        txid.forEach(tx => {
                            rpc.getRawTransaction(tx, 1, (err, result) => {
                                if (err) {
                                    console.log(err)
                                } else {
                                    let vout = result.result.vout
                                    vout.forEach(script => {
                                        script.scriptPubKey.addresses ? addressArray.push(script.scriptPubKey.addresses) : null
                                        count++
                                        console.log('count',count)
                                        console.log('vout length',vout.length)
                                    })
                                    if (count === vout.length + 1) {
                                        res.json({addressArray})
                                    }
                                }
                            })
                        })
                       
                    }
                })
            }
        })
    })

    app.get('/block/:hash', (req, res) => {
        let hash = req.params.hash
        rpc.getBlock(hash, (err, response) => {
            if (err) {
                console.log(err)
                if (err.code === -5) {
                    res.json({'error': 'Invalid transaction'})
                }
            } else {
                res.json(response)
            }
        })
    })

    // Verbose info about the ecosystem
    app.get('/info', (req, res) => {
        rpc.getInfo((err, response) => {
            if (err) {
                console.log(err)
                if (err.code === -5) {
                    res.json({'error': 'Invalid transaction'})
                }
            } else {
                res.json(response)
            }
        })
    })

    // Check transaction details 
    app.get('/tx/:txid', (req, res) => {
        let txid = req.params.txid
        rpc.getRawTransaction(txid, 1, (err, response) => {
            if (err) {
                if (err.code === -5) {
                    res.json({'error': 'Invalid transaction'})
                }
            } else {
                res.json(response.result)
            }
        })
    })

    // Get latest blocks
    app.get('/recent', (req, res) => {
        rpc.getChainTips((err, response) => {
            if (err) {
                res.json({'error': err})
            } else { 
                response.result.forEach(hash => {
                    if (hash.status === 'active') {
                        rpc.getBlock(hash.hash, (err, ret) => {
                            if (err) {
                                res.json({'error': err})
                            } else {
                                rpc.getBlock(ret.result.previousblockhash, (err, resp) => {
                                    if (err) {
                                        res.json({'error': err})
                                    } else {
                                        res.json({
                                            'active_block': ret.result,
                                            'previous_block': resp.result
                                        })
                                    }
                                })
                            }
                        })
                    }
                })
            }
        })
    })

    // Get total number of connected peers
    app.get('/connectioncount', (req, res) => {
        rpc.getConnectionCount((err, response) => {
            if (err) {
                console.log(err)
                if (err.code === -5) {
                    res.json({'error': 'Invalid transaction'})
                }
            } else {
                res.json(response)
            }
        })
    })

    // Get masternode information
    app.get('/masternodes', (req, res) => {
        let 
            copper = 0,
            silver = 0,
            gold = 0,
            platinum = 0,
            diamond = 0
        let rewardArr = []
        let count = 0
        rpc.listMasternodes((err, response) => {
            if (err) {
                console.log(err)
            } else {
                response.result.forEach(tier => {
                    let layer = tier.tier
                    switch (layer) {
                        case 'COPPER':
                            copper++
                            break
                        case 'SILVER':
                            silver++
                            break
                        case 'GOLD':
                            gold++
                            break
                        case 'PLATINUM':
                            platinum++
                            break
                        case 'DIAMOND':
                            diamond++
                            break
                    }
                    let balanceObj = {
                        "addresses": [tier.addr]
                    }
                    rpc.getAddressBalance(balanceObj, (err, ret) => {
                        count++  
                        if (err) {
                            console.log(err)
                        } else {
                            let amountReceived = ret.result.received
                            let layer = tier.tier
                            let address = tier.addr
                            rewardArr.push({
                                address: address,
                                amountReceived: amountReceived / 100000000,
                                layer: layer
                            })
                            if (count === response.result.length) {
                                let uniqRewards = _.uniq(rewardArr)
                                res.json({
                                    'num_masternodes': response.result.length,
                                    'layers': {
                                        'copper': copper,
                                        'silver': silver,
                                        'gold': gold,
                                        'platinum': platinum,
                                        'diamond': diamond
                                    },
                                    uniqRewards,
                                    'masternode_list': response.result,
                                })
                            } 
                        }
                    }) 
                })
                
            }
        })
    })

    app.get('/masternode-rewards', (req, res) => {
        let rewardArr = []
        let count = 0
        rpc.listMasternodes((err, response) => {
            if (err) {
                console.log(err)
            } else {
                console.log(`response length ${response.result.length}`)
                response.result.forEach(mn => {
                    let balanceObj = {
                        "addresses": [mn.addr]
                    }
                    rpc.getAddressBalance(balanceObj, (err, ret) => {
                        count++  
                        if (err) {
                            console.log(err)
                        } else {
                            let amountReceived = ret.result.received
                            let layer = mn.tier
                            let address = mn.addr
                            rewardArr.push({
                                address: address,
                                amountReceived: amountReceived / 100000000,
                                layer: layer
                            })
                            if (count == response.result.length) {
                                console.log(`rewardArr length ${rewardArr.length}`)
                                console.log(_.uniq(rewardArr))
                                let uniqRewards = _.uniq(rewardArr)
                                res.json({
                                    uniqRewards
                                })
                                rewardArr = []
                            } 
                        }
                    })                                     
                })
                
            }
        })
    })

    // when the client calls the url get all information for the address in question
    app.get('/address/:address', (req, res) => {
        // create addresstxid object from params
        let reqAddress = req.params.address
        let addressObj = {
            "addresses": [reqAddress],
            "start": 0,
            "end": 10000000000000000000
        }
        let balanceObj = {
            "addresses": [reqAddress]
        }
        // we will push the tx info into this array so we don't resend the headers, causing a network error
        let transactionInfo = []
        // set count so we can check if the loop has completed later on 
        let count = 0
        // call address txid rpc function
        rpc.getAddressTxids(addressObj, (err, result) => {
            if (err) { console.log('txid err:',err) }
            else {
                // set up an array to check against the count
                let txidArray = []
                // take each result from getaddresstxids 
                result.result.forEach(txid => {
                    // push the txids into the txid array from above
                    txidArray.push(txid)
                    // call getrawtransaction on each txid
                    rpc.getRawTransaction(txid, 1, (err, ret) => {
                        if (err) {
                            console.log('raw tx err:',err)
                        } else {
                            // push each transaction response into the transaction info array
                            transactionInfo.push(ret)
                            // check if the count is equal to the length of the txid array minus one (because arrays start at 0)
                            if (count === txidArray.length - 1) {
                                // Get address balance 
                                rpc.getAddressBalance(balanceObj, (err, resp) => {
                                    if (err) {
                                        console.log(err)
                                    } else {
                                        rpc.getAddressDeltas(balanceObj, (err, r) => {
                                            if (err) { console.log(err) }
                                            else {
                                                // send the object to the client
                                                res.json({
                                                    transaction_info: transactionInfo, 
                                                    balance_info: resp.result,
                                                    deltas: r.result
                                                })
                                                transactionInfo = []
                                                txidArray = []
                                            }
                                        })
                                        
                                    }
                                })
                            }
                        }
                        // increment the count each time
                        count++
                    })
                })
            }
        })
    })

    // Last 10 blocks
    app.get('/latest-blocks', (req, res) => {
        let blockArray = []
        let blockInfo = []
        rpc.getBestBlockHash((err, ret) => {
            if (err) {
                res.json({'error': err})
            } else {
                rpc.getBlock(ret.result, (err, bestblock) => {
                    if (err) {
                        res.json({'error': err})
                    } else {
                        blockArray.push(bestblock.result.hash)
                        rpc.getBlock(bestblock.result.previousblockhash, (err, blocktwo) => {
                            if (err) {
                                res.json({'error': err})
                            } else {
                                blockArray.push(blocktwo.result.hash)
                                rpc.getBlock(blocktwo.result.previousblockhash, (err, blockthree) => {
                                    if (err) {
                                        res.json({'error': err})
                                    } else {
                                        blockArray.push(blockthree.result.hash)
                                        rpc.getBlock(blockthree.result.previousblockhash, (err, blockfour) => {
                                            if (err) {
                                                res.json({'error': err})
                                            } else {
                                                blockArray.push(blockfour.result.hash)
                                                rpc.getBlock(blockfour.result.previousblockhash, (err, blockfive) => {
                                                    if (err) {
                                                        res.json({'error': err})
                                                    } else {
                                                        blockArray.push(blockfive.result.hash)
                                                        for (let i = 0; i < blockArray.length; i++) {
                                                            rpc.getBlock(blockArray[i], (err, finalres) => {
                                                                if (err) {
                                                                    res.json({'error': err})
                                                                } else {
                                                                    blockInfo.push(finalres.result)
                                                                    if (blockInfo.length === blockArray.length) {
                                                                        res.json(blockInfo)
                                                                    }
                                                                }
                                                            })
                                                        }
                                                        
                                                    }
                                                })
                                            }
                                        })
                                    }
                                })
                            }
                        })
                    }
                })
            }
        })
    })

    // Get address utxos
    app.get('/address_utxos/:address', (req, res) => {
        let addr = req.params.address
        rpc.getAddressUtxos(addr, (err, result) => {
            if (err) {
                res.json({'error': err})
            } else {
                res.json(result)
            }
        })
    })

    app.get('/blockheight/:index', (req, res) => {
        let blockHeight = req.params.index
        rpc.getBlockHash(blockHeight, (err, response) => {
            if (err) {
                res.json({'error': err})
            } else {
                rpc.getBlock(response.result, (err, ret) => {
                    if (err) {
                        res.json({'error': err})
                    } else {
                        res.json(ret.result)
                    }
                })
            }
        })
    })

    app.get('/allblocks', (req, res) => {
        let blockHash = 0
        let transactionArray = []
        let addressArray = []
        let returnArray = []
        let blockHeight = 36523
        let count = 10001
        let delay = 0

        getCurrentBlock = () => {
            rpc.getBlockCount((err, result) => {
                if (err) {
                    console.log('block count error:',err)
                } else {
                    console.log(result)
                    blockHeight = result.result
                }
            })
        }

        getAllBlocks = () => {
            console.log(`count: ${count} blockHeight: ${blockHeight}`)
            batchCall = () => {
                rpc.getBlockHash(count)
            }
            if (count < blockHeight) {
                count++
                console.log('allblocks should be called again')
                rpc.batch(batchCall, (err, hashes) => {
                    if (err) {
                        console.error('get block hash error:',err)
                    }
                    blockHash = hashes
                    console.log('getAllBlocks(): hashes:', blockHash)
                    if (hashes) {
                        getTransactionsByBlock()
                    }
                })
            } else if (count === blockHeight) {
                console.log('allblocks shouldnt be called here')
                returnObject()
            }
        }
        setTimeout(getAllBlocks, delay)

        getTransactionsByBlock = () => {
            if (blockHash) {
                batchCall = () => {
                    if (blockHash[0] !== undefined) {
                        rpc.getBlock(blockHash[0].result)
                    }
                }
                rpc.batch(batchCall, (err, txinfo) => {
                    console.log('getTransactionsByBlock(): txinfo:', txinfo)
                    if (err) {
                        console.log('transaction block err:',err)
                    } else if (txinfo !== undefined) {
                        if (txinfo[0] !== undefined && txinfo[0].result !== null) {
                            transactionArray = txinfo[0].result.tx
                                console.log(`getTransactionsByBlock(): transactionArray: ${transactionArray} transactionArray.length: ${transactionArray.length}`)
                                getAddressesFromTx()
                        } 
                    }
                })
            }
            
        }

        getAddressesFromTx = () => {
            let transactionId = 0
            transactionArray.forEach(transaction => {
                transactionId = transaction
                console.log(`getAddressesFromTx(): transactionId: ${transactionId}`)
            })
            batchCall = () => {
                rpc.getRawTransaction(transactionId, 1)
            }
            rpc.batch(batchCall, (err, transactionInfo) => {
                console.log('getAddressesFromTx(): transactionInfo:',transactionInfo)
                if (err) {
                    console.log('raw tx error:',err)
                }
                if (transactionInfo !== undefined) {
                    let txInfo = transactionInfo[0].result
                    if (txInfo !== null && txInfo) {
                        txInfo.vout.forEach(output => {
                            if (output !== undefined) {
                                if (output.scriptPubKey.type === 'pubkeyhash') {
                                    let addressInfo = output.scriptPubKey.addresses
                                    if (addressInfo !== undefined) {
                                        addressInfo.forEach(address => {
                                            addressArray = [address]
                                            console.log('getAddressesFromTx(): addressInfo:', addressInfo)
                                            console.log(`getAddressesFromTx(): addressArray.length: ${addressArray.length}`)
                                            console.log('getAddressesFromTx(): addressArray:',addressArray)
                                        })
                                    }
                                }
                            }
                        })
                        getBalanceFromAddress()
                    }
                }
            })
        }

        getBalanceFromAddress = () => {
            console.log(`getBalanceFromAddress(): addressArray: ${addressArray}`)
            let balanceObj = {
                addresses: addressArray
            }
            console.log('getBalanceFromAddress(): balanceObj:',balanceObj)
            batchCall = () => {
                rpc.getAddressBalance(balanceObj)
            }
            rpc.batch(batchCall, (err, balance) => {
                if (err) {
                    console.log('address balance error:',err)
                } else if (balance !== undefined && balance[0].result.balance > 0) {
                    let resObject = 
                    {
                        'query_address': addressArray,
                        'balance': balance[0].result
                    }
                    returnArray.push(resObject)
                    console.log('balance > 0 resObject:',resObject)
                    console.log(`returnArray.length ${returnArray.length} addressArray.length: ${addressArray.length}`)
                    setTimeout(getAllBlocks, delay)
                } else {
                    console.log('balance:',balance)
                    let resObject = 
                    {
                        'query_address': addressArray,
                        'balance': balance[0].result
                    }
                    console.log('balance === 0 resObject:',resObject)
                    returnArray.push(resObject)
                    setTimeout(getAllBlocks, delay)
                }
            })
        }

        returnObject = () => {
            if (count === blockHeight) {
                res.json(returnArray)
            }
        }
    })

    app.get('/decode-raw-tx/:hex', (req, res) => {
        let hex = req.params.hex
        rpc.decodeRawTransaction(hex, (err, response) => {
            if (err) {
                res.json(err)
            } else {
                res.json(response.result)
            }
        })
    })

    app.get('/list-transactions/:account?', (req, res) => {
        let count = 0
        let addresses = []
        let account = req.params.account ? req.params.account : ''
        rpc.listTransactions(account, 10000000, (err, response) => {
            if (err) {
                console.log('list transactions error:',err)
            } else {
                let list = response.result
                list.forEach(transaction => {
                    addresses.push(transaction.address)
                    console.log(transaction)
                    count++
                })
                if (count === addresses.length) {
                    res.json({
                        addresses
                    })
                }
            }
        })
    })

    app.get('/richlist', (req, res) => {
        Promise.all([
            get(`https://api.diviproject.org/list-transactions`),
            get(`https://api.diviproject.org/info`)
        ]).then(([{addresses}, {info}]) => {
            res.json({
                addresses,
                info
            })
        }).catch(err => console.log(err))
    })

    app.get('/unique-balances', (req, res) => {
        let uniqAddressArray = []
        let balanceArray = []
            for (let i = 0; i < addresses.length; i++) {
                if (addresses[i] !== undefined) {
                    uniqAddressArray.push(addresses[i])
                }
            }
            let uniqAddresses = _.uniq(uniqAddressArray)
            uniqAddresses.forEach(uniqAddress => {
                let newBalanceObj = {
                    "addresses": [uniqAddress]
                }
                rpc.getAddressBalance(newBalanceObj, (err, resp) => {
                    step++
                    if (err) {
                        // console.log('get address balance error:',err)
                    } else {
                        balanceArray.push({
                            'address': uniqAddress,
                            'balance': resp.result.balance / 100000000
                        })
                    }
                })
            })
            res.json(balanceArray)
        })
}

/**
 * getUniqueBalances = () => {
 *      let uniqAddressArray = []
        let balanceArray = []
            for (let i = 0; i < addresses.length; i++) {
                if (addresses[i] !== undefined) {
                    uniqAddressArray.push(addresses[i])
                }
            }
            let uniqAddresses = _.uniq(uniqAddressArray)
            uniqAddresses.forEach(uniqAddress => {
                let newBalanceObj = {
                    "addresses": [uniqAddress]
                }
                rpc.getAddressBalance(newBalanceObj, (err, resp) => {
                    step++
                    if (err) {
                        // console.log('get address balance error:',err)
                    } else {
                        balanceArray.push({
                            'address': uniqAddress,
                            'balance': resp.result.balance / 100000000
                        })
                    }
                })
            })
        }
 */