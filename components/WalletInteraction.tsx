import { Asset, AssetList } from "@chain-registry/types";
import { StdFee } from "@cosmjs/stargate";
import { useChain, useWalletClient } from "@cosmos-kit/react";
import { Button, Snackbar, Typography } from "@mui/material";
import BigNumber from "bignumber.js";
import { assets } from "chain-registry";
import { cosmos } from "juno-network";
import { useEffect, useState } from "react";
import {
  Card,
  ProgressBar,
  ProgressBarContainer,
  Root,
  TextField,
} from "../styles/styles";

const chainName = "cosmoshub";

const chainAssets: AssetList = assets.find(
  (chain) => chain.chain_name === chainName
) as AssetList;
const coin: Asset = chainAssets.assets.find(
  (asset) => asset.base === "uatom"
) as Asset;

const WalletInteraction = () => {
  const [balance, setBalance] = useState(new BigNumber(0));
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState("");

  const {
    getSigningStargateClient,
    username,
    wallet,
    address,
    status,
    getRpcEndpoint,
    connect,
    disconnect,
  } = useChain(chainName);

  useEffect(() => {
    if (address) {
      getBalance();
    } else {
      setBalance(new BigNumber(0));
      setErrorMessage("")
    }
  }, [address, status]);

  const getBalance = async () => {
    if (!address) return;

    let rpcEndpoint = await getRpcEndpoint();
    if (!rpcEndpoint) {
      console.info("No RPC endpoint — using a fallback");
      rpcEndpoint = `https://rpc.cosmos.directory/${chainName}`;
    }

    const client = await cosmos.ClientFactory.createRPCQueryClient({
      rpcEndpoint:
        typeof rpcEndpoint === "string" ? rpcEndpoint : rpcEndpoint.url,
    });

    const balance = await client.cosmos.bank.v1beta1.balance({
      address,
      denom: coin.base,
    });

    const exponent = coin.denom_units.find(
      (unit) => unit.denom === coin.display
    )?.exponent as number;
    const amount = new BigNumber(balance.balance?.amount || 0).multipliedBy(
      10 ** -exponent
    );
    setBalance(amount);
  };

  const sendTokens = async () => {
    const stargateClient = await getSigningStargateClient();
    if (!stargateClient || !address) {
      console.error("stargateClient or address undefined");
      return;
    }

    const msg = cosmos.bank.v1beta1.MessageComposer.withTypeUrl.send({
      amount: [{ denom: coin.base, amount: "1" }],
      toAddress: address,
      fromAddress: address,
    });

    const fee: StdFee = {
      amount: [{ denom: coin.base, amount: "1" }],
      gas: "86364",
    };

    try {
      const response = await stargateClient.signAndBroadcast(
        address,
        [msg],
        fee
      );

      setSuccessMessage("Transaction successful!");
      setTxHash(response.transactionHash);

      console.log(response.transactionHash);
    } catch (error) {
      const errorMsg = error || "Unknown error";
      setErrorMessage(`Transaction failed: ${errorMsg}`);

      console.error(error);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccessMessage("");
  };

  return (
    <Root>
      <Card>
        <div>
          <Typography variant="h6">Chain ID: {chainName}</Typography>
          <Typography variant="h6">Address: {address}</Typography>
          <Typography variant="h6">
            Balance: {balance.toString()} {coin.display}
          </Typography>
          <ProgressBarContainer>
            <ProgressBar
              style={{
                width: `${balance
                  .dividedBy(100)
                  .multipliedBy(100)
                  .toFixed(2)}%`,
              }}
            />
          </ProgressBarContainer>
          <TextField
            label="Recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            fullWidth
          />
          <TextField
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            fullWidth
          />
          {errorMessage && (
            <Typography color="error">{errorMessage}</Typography>
          )}
          {txHash && (
            <Typography variant="body1">Transaction Hash: {txHash}</Typography>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            {" "}
            {status === "Connecting" && (
              <button>{`Connecting ${wallet?.prettyName}`}</button>
            )}
            {status === "Connected" ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginBottom: "10px",
                }}
              >
                <span>Wallet name: {wallet?.prettyName}</span>
                <span>{username}</span>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={async () => {
                    await disconnect();
                  }}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={() => connect()}
              >
                Connect Wallet
              </Button>
            )}
            <Button variant="contained" color="primary" onClick={sendTokens}>
              Send Tokens
            </Button>
          </div>
        </div>
      </Card>
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={successMessage}
      />
    </Root>
  );
};

export default WalletInteraction;
