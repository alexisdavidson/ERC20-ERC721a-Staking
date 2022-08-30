// var nftContract = artifacts.require("./NFT.sol");

async function estimate() {

    const nftContract = artifacts.require("../contracts/NFT.sol");

    console.log(JSON.stringify(nftContract.abi))

    // const contractAddress = "0x6e26Fa4719a8857df99ddd3024aE6b858386B44D"
    // const nftContract = new web3.eth.Contract(contract.abi, contractAddress)

    nftContract.web3.eth.getGasPrice(function(error, result){ 
        var gasPrice = Number(result);
        console.log("Gas Price is " + gasPrice + " wei"); // "10000000000000"

        var MetaCoinContract = web3.eth.contract(nftContract._json.abi);
        var contractData = MetaCoinContract.new.getData({data: nftContract._json.bytecode});
        var gas = Number(web3.eth.estimateGas({data: contractData}))


        console.log("gas estimation = " + gas + " units");
        console.log("gas cost estimation = " + (gas * gasPrice) + " wei");
        console.log("gas cost estimation = " + nftContract.web3.fromWei((gas * gasPrice), 'ether') + " ether");

    });
}

estimate()